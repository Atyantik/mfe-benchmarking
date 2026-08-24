/**
 * @mf-eval/behaviors — client interactivity without hydration.
 *
 * The server already rendered the markup. A behaviour's job is to attach to it, not to
 * re-render it, which is why nothing here takes props and nothing is serialized into the
 * document. State that must survive lives in the DOM, a cookie, or the URL.
 *
 * A behaviour is a few hundred bytes of plain TypeScript. There is no framework, no virtual
 * DOM and no reconciliation — for a gallery or a scroll-spy those would cost more than the
 * feature. Genuinely stateful, personalized UI is an island instead (docs/interactivity.md),
 * and that is a decision made in review, not by reflex.
 *
 * Everything a behaviour subscribes to is torn down automatically. Teardown is the part
 * people forget, so it is not left to them.
 */

export interface BehaviorContext {
  /**
   * Add a listener that is removed automatically when the behaviour is torn down.
   *
   * The first overload is the one that fires in practice, and it types the event properly —
   * a 'click' handler receives a MouseEvent, not a bare Event — so the common case needs no
   * cast. The second exists for custom events.
   */
  on<K extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    type: K,
    handler: (event: GlobalEventHandlersEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  on(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void;
  /** Register an observer (Intersection/Mutation/Resize) to be disconnected on teardown. */
  observe<T extends { disconnect: () => void }>(observer: T): T;
  /** Register arbitrary cleanup. */
  cleanup(fn: () => void): void;
  /** Aborted on teardown — pass to fetch(), or to your own listeners. */
  readonly signal: AbortSignal;
  /** True when the visitor asked for less motion. Respect it. */
  readonly reducedMotion: boolean;
}

/**
 * Everything a behaviour sets up is unwound through `ctx`, so setup returns nothing.
 *
 * A returned teardown function would be a second way to express the same thing, and two ways
 * means one of them gets forgotten — usually in the behaviour that needed it most.
 */
export type BehaviorSetup = (root: HTMLElement, ctx: BehaviorContext) => void;

export interface Behavior {
  readonly name: string;
  /** Attach to one element. Returns a teardown. */
  attach(root: HTMLElement): () => void;
}

/**
 * Define a behaviour.
 *
 * ```ts
 * export default defineBehavior('product.gallery', (root, ctx) => {
 *   const main = root.querySelector('[data-gallery-main]');
 *   for (const thumb of root.querySelectorAll('[data-gallery-thumb]')) {
 *     ctx.on(thumb, 'click', () => { ... });
 *   }
 * });
 * ```
 *
 * The name must match the `data-behavior` attribute on the element, and its second part
 * must match the file name — `product.gallery` lives in `src/behaviors/gallery.ts`. That
 * pairing is what lets the build expose it and the shell find it without a registry.
 */
export function defineBehavior(name: string, setup: BehaviorSetup): Behavior {
  return {
    name,
    attach(root) {
      const controller = new AbortController();
      const disposers: (() => void)[] = [];

      const ctx: BehaviorContext = {
        signal: controller.signal,
        reducedMotion:
          typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
        on(target: EventTarget, type: string, handler: (event: never) => void, options?: AddEventListenerOptions) {
          // The abort signal removes the listener; no bookkeeping for the author to get wrong.
          target.addEventListener(type, handler as EventListener, {
            ...options,
            signal: controller.signal,
          });
        },
        observe(observer) {
          disposers.push(() => {
            observer.disconnect();
          });
          return observer;
        },
        cleanup(fn) {
          disposers.push(fn);
        },
      };

      setup(root, ctx);

      return () => {
        controller.abort();
        for (const dispose of disposers.splice(0).reverse()) {
          try {
            dispose();
          } catch {
            // Teardown must not throw — a half-cleaned page is worse than a leaked listener.
          }
        }
      };
    },
  };
}

/**
 * When a behaviour should attach, declared per element with `data-behavior-when`.
 *
 * `idle` is the default and the right answer for most things: the page is already complete
 * and usable, so the enhancement can wait for a quiet moment.
 */
export type BehaviorStrategy =
  | 'immediate'
  | 'idle'
  | 'visible'
  | 'interaction'
  | `media:${string}`;

export const DEFAULT_STRATEGY: BehaviorStrategy = 'idle';

/**
 * Events that mean "someone is reaching for this", but that DO nothing on their own.
 *
 * They start the download early and are then left completely alone — no preventing, no
 * buffering — because hover and focus must never feel different just because a behaviour
 * happens to be loading.
 */
export const HINT_EVENTS = ['pointerenter', 'pointerdown', 'touchstart', 'focusin'] as const;

/**
 * Events that ARE the interaction — the ones a behaviour would have handled had it been
 * loaded already.
 *
 * These are held: prevented and buffered while the module downloads, then replayed once it
 * has attached. Without that, `interaction` swallows the exact click that triggered it, and
 * every behaviour using it appears to ignore the first attempt — the failure is invisible in
 * code review and reads to a user as a broken control.
 */
export const ACTION_EVENTS = ['click', 'keydown', 'submit'] as const;
