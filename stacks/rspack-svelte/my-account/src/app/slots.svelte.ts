import type { SlotName } from '@mf-eval/svelte-contracts';
import { SLOT_SOURCES } from '@mf-eval/shell-kit';
import { loadRemote } from '@module-federation/enhanced/runtime';
import type { CartStore } from '@mf-eval/contracts';

/**
 * A remote's widget arrives as a MOUNT FUNCTION, never as a component.
 *
 * A Svelte 5 component closes over the `svelte/internal/client` instance that compiled it, and
 * federation cannot share that instance. Rendering another remote's component inside this
 * application's tree fails as `Cannot read properties of null (reading 'nodes')` — the wrong
 * runtime is asked to render it. Only a DOM node and plain data may cross the boundary.
 *
 * See docs/svelte-federation.md. The React stack has no equivalent because react-dom really is
 * a shared singleton there.
 */
export type SlotMounter = (target: HTMLElement, props: { store: CartStore }) => () => void;

/**
 * The account host renders a NAME. Which remote answers to it, and which version is deployed,
 * is resolved at runtime — so the cart team can ship a new basket widget without this
 * application rebuilding.
 *
 * Loaded per ROUTE, not per page load: open the Profile tab and none of the three overview
 * widgets is fetched. `packages/bench/src/widgets.mjs` fails the build if that stops being true.
 */
const cache = new Map<SlotName, SlotMounter>();
const inFlight = new Map<SlotName, Promise<SlotMounter | null>>();

export const cachedSlot = (name: SlotName): SlotMounter | null => cache.get(name) ?? null;

export async function resolveSlot(name: SlotName): Promise<SlotMounter | null> {
  const cached = cache.get(name);
  if (cached) return cached;
  const pending = inFlight.get(name);
  if (pending) return pending;

  const source = SLOT_SOURCES.find((s) => s.slot === name);
  if (!source) {
    // A slot name with no entry in the table is a wiring bug, not an empty region.
    console.error(`[slot] ${name} has no source. Known: ${SLOT_SOURCES.map((s) => s.slot).join(', ')}`);
    return null;
  }
  if (!source.module) {
    // Behaviour-enhanced: the server renders the markup and a behaviour fills it, so there is
    // no component to mount here. Asking for one is a category error, not a missing module.
    console.error(`[slot] ${name} is enhanced by a behaviour and has no mountable component`);
    return null;
  }

  const load = loadRemote<{ default: SlotMounter }>(source.module)
    .then((mod) => {
      const mounter = mod?.default ?? null;
      if (mounter) cache.set(name, mounter);
      return mounter;
    })
    .catch((error: unknown) => {
      // Contained, but never silent. A widget that fails leaves its skeleton and the rest of
      // the page working — and says which team's module did not arrive, because a slot that
      // fails quietly is indistinguishable from a slot nobody filled.
      console.error(`[slot] ${name} failed to load from ${source.module}`, error);
      return null;
    })
    .finally(() => inFlight.delete(name));

  inFlight.set(name, load);
  return load;
}

/**
 * The height of every account widget region, owned HERE.
 *
 * A placeholder that merely agrees with its widget about height drifts the first time either
 * team edits one — and the drift is a layout shift that only appears once the widget loads,
 * which is after every screenshot anyone takes.
 */
export const SLOT_BOX = 'h-[13rem] overflow-hidden';
