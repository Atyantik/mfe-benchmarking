/**
 * The behaviour scanner — the only client code that runs on every page.
 *
 * It walks the document for `[data-behavior]`, waits for each element's declared moment,
 * then fetches that one behaviour from the remote that owns it and attaches it. Nothing is
 * loaded for a behaviour the page does not use, and nothing is loaded early for one the
 * visitor may never reach.
 *
 * A behaviour that fails to load or throws is contained: the server-rendered markup it was
 * enhancing is still there and still works. That is the whole benefit of enhancing rather
 * than hydrating — the failure mode is "less interactive", not "blank".
 */
import {
  ACTION_EVENTS,
  DEFAULT_STRATEGY,
  HINT_EVENTS,
  type Behavior,
  type BehaviorStrategy,
} from './index.ts';

/** Resolves `product.gallery` to the module that exports it. */
export type BehaviorResolver = (name: string) => Promise<{ default: Behavior } | Behavior>;

const attached = new WeakSet<HTMLElement>();

function strategyOf(el: HTMLElement): BehaviorStrategy {
  const raw = el.getAttribute('data-behavior-when');
  return (raw as BehaviorStrategy | null) ?? DEFAULT_STRATEGY;
}

/**
 * Rebuild an event so it can be dispatched again.
 *
 * An `Event` that has already been dispatched cannot be re-dispatched, but every event
 * interface accepts an existing event as its own init dictionary — so the constructor is
 * enough to reproduce the click, modifier keys and all.
 */
function cloneEvent(event: Event): Event {
  try {
    const Ctor = event.constructor as new (type: string, init: Event) => Event;
    return new Ctor(event.type, event);
  } catch {
    return new Event(event.type, { bubbles: true, cancelable: true });
  }
}

/**
 * Resolve when the element's moment arrives. Never rejects.
 *
 * Resolves to a `release` callback that the caller MUST invoke once the behaviour has
 * attached. That is how a held interaction is handed over rather than lost.
 */
type Release = () => void;
// Nothing was held, so there is nothing to hand back.
const noRelease: Release = () => {
  /* no interaction was intercepted */
};

function waitFor(el: HTMLElement, strategy: BehaviorStrategy): Promise<Release> {
  if (strategy === 'immediate') return Promise.resolve(noRelease);

  if (strategy === 'visible') {
    if (typeof IntersectionObserver !== 'function') return Promise.resolve(noRelease);
    return new Promise((resolve) => {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            resolve(noRelease);
          }
        },
        // Start slightly before it scrolls in, so the behaviour is ready on arrival.
        { rootMargin: '200px' },
      );
      io.observe(el);
    });
  }

  if (strategy === 'interaction') {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const held: Event[] = [];

      // Handing the interaction over: stop listening, let the browser do what the visitor
      // originally asked for, and let the now-attached behaviour see it.
      const release: Release = () => {
        controller.abort();
        for (const event of held.splice(0)) event.target?.dispatchEvent(cloneEvent(event));
      };

      let resolved = false;
      const fire = () => {
        if (resolved) return;
        resolved = true;
        resolve(release);
      };

      // Hints only start the download. They are passive and untouched.
      for (const type of HINT_EVENTS) {
        el.addEventListener(type, fire, { signal: controller.signal, passive: true, capture: true });
      }

      // Actions are held. Capture phase, so the event is intercepted before it reaches the
      // control and before it does anything the visitor would then have to undo.
      for (const type of ACTION_EVENTS) {
        el.addEventListener(
          type,
          (event: Event) => {
            // A non-cancelable event cannot be held, so holding it would only delay it into
            // a state the DOM has already moved past. Let it go and load anyway.
            if (event.cancelable) {
              event.preventDefault();
              event.stopPropagation();
              held.push(event);
            }
            fire();
          },
          { signal: controller.signal, capture: true },
        );
      }
    });
  }

  if (strategy.startsWith('media:')) {
    const query = strategy.slice('media:'.length);
    if (typeof matchMedia !== 'function') return Promise.resolve(noRelease);
    const mql = matchMedia(query);
    if (mql.matches) return Promise.resolve(noRelease);
    return new Promise((resolve) => {
      mql.addEventListener('change', function once(event) {
        if (event.matches) {
          mql.removeEventListener('change', once);
          resolve(noRelease);
        }
      });
    });
  }

  // idle
  return new Promise((resolve) => {
    const ric = globalThis.requestIdleCallback;
    if (typeof ric === 'function') ric(() => { resolve(noRelease); }, { timeout: 2000 });
    else setTimeout(() => { resolve(noRelease); }, 1);
  });
}

/**
 * Timing marks, one set per behaviour instance.
 *
 * Four phases, because "it took 40 ms" is not an actionable number — waiting for an idle
 * callback, downloading a chunk and running setup are three different problems with three
 * different fixes, and only the last one is the author's.
 *
 *   scan     the element was found in the document
 *   due      the declared moment arrived (idle fired, it scrolled into view, it was clicked)
 *   loaded   the module finished downloading, parsing and evaluating
 *   attached setup returned; the enhancement is live
 *
 * The bench reads these back with `performance.getEntriesByType`, so the names are a
 * contract. `packages/bench/src/behaviors.mjs` is the consumer.
 */
export const BEHAVIOR_MARK = {
  scan: (name: string, i: number) => `mf:behavior:${name}#${i}:scan`,
  due: (name: string, i: number) => `mf:behavior:${name}#${i}:due`,
  loaded: (name: string, i: number) => `mf:behavior:${name}#${i}:loaded`,
  attached: (name: string, i: number) => `mf:behavior:${name}#${i}:attached`,
  failed: (name: string, i: number) => `mf:behavior:${name}#${i}:failed`,
} as const;

/** Phase durations, so the timeline shows spans rather than only instants. */
const PHASES = [
  ['wait', 'scan', 'due'],
  ['fetch', 'due', 'loaded'],
  ['attach', 'loaded', 'attached'],
  ['total', 'scan', 'attached'],
] as const;

const mark = (name: string) => {
  try {
    performance.mark(name);
  } catch {
    // Measurement must never break the page.
  }
};

function measurePhases(name: string, index: number): void {
  for (const [phase, from, to] of PHASES) {
    try {
      performance.measure(`mf:behavior:${name}#${index}:${phase}`, {
        start: BEHAVIOR_MARK[from](name, index),
        end: BEHAVIOR_MARK[to](name, index),
      });
    } catch {
      // A missing endpoint means that phase never happened. Not worth reporting.
    }
  }
}

/**
 * Instances of the same behaviour on one page are numbered in document order.
 *
 * The filter panel and the sort bar are both `product.autosubmit`, and averaging them would
 * hide that one of them is slow. They are separate attachments, so they get separate marks.
 */
const instanceCount = new Map<string, number>();

async function activate(el: HTMLElement, resolve: BehaviorResolver): Promise<void> {
  const name = el.getAttribute('data-behavior');
  if (!name || attached.has(el)) return;
  attached.add(el);

  const index = instanceCount.get(name) ?? 0;
  instanceCount.set(name, index + 1);
  el.setAttribute('data-behavior-instance', String(index));
  el.setAttribute('data-behavior-state', 'waiting');
  mark(BEHAVIOR_MARK.scan(name, index));

  const release = await waitFor(el, strategyOf(el));
  mark(BEHAVIOR_MARK.due(name, index));
  el.setAttribute('data-behavior-state', 'loading');

  try {
    const mod = await resolve(name);
    mark(BEHAVIOR_MARK.loaded(name, index));
    const behavior = 'default' in mod ? mod.default : mod;
    const teardown = behavior.attach(el);
    // Behaviours outlive the scan; teardown exists for tests and for islands that unmount.
    (el as HTMLElement & { __mfTeardown?: () => void }).__mfTeardown = teardown;
    el.setAttribute('data-behavior-state', 'ready');
    mark(BEHAVIOR_MARK.attached(name, index));
    measurePhases(name, index);
  } catch (error) {
    // The markup underneath is server-rendered and still works. Say what broke, then stop.
    el.setAttribute('data-behavior-state', 'failed');
    mark(BEHAVIOR_MARK.failed(name, index));
    console.error(`[behavior] ${name} failed to attach`, error);
  } finally {
    // Whether it attached or failed, the visitor's interaction is theirs — never dropped on
    // the floor. On failure this replays into plain server-rendered markup, which is exactly
    // the no-JS path and still works.
    release();
  }
}

/**
 * Scan a root and activate everything under it.
 *
 * Safe to call more than once — already-attached elements are skipped — so it can run again
 * after a personalized island renders new markup.
 */
export function scanBehaviors(root: ParentNode, resolve: BehaviorResolver): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-behavior]')) {
    void activate(el, resolve);
  }
}
