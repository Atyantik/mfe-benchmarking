import { useEffect, useState, type ComponentType } from 'react';
import type { SlotName } from '@mf-eval/react-contracts';
import { SLOT_SOURCES } from '@mf-eval/shell-kit';
import { loadRemote } from '@module-federation/enhanced/runtime';

/**
 * A region of this page that another team fills.
 *
 * The account host renders a NAME. Which remote answers to it, and which version of that
 * remote is deployed, is resolved at runtime — so the cart team can ship a new basket widget
 * without this application rebuilding, and this file has no import of theirs to go stale.
 *
 * Loaded per ROUTE, not per page load, and that is the property worth stating plainly: open
 * the Profile tab of this same application and none of these three widgets is fetched. A
 * visitor who never opens the overview never pays for any of it. "Download everything from
 * everywhere on boot" is the failure mode this exists to avoid, and
 * `packages/bench/src/widgets.mjs` fails the build if it comes back.
 *
 * Resolved modules are cached, so returning to the overview costs nothing.
 */
const cache = new Map<SlotName, ComponentType>();
const inFlight = new Map<SlotName, Promise<ComponentType | null>>();

async function resolveSlot(name: SlotName): Promise<ComponentType | null> {
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

  const load = loadRemote<{ default: ComponentType }>(source.module)
    .then((mod) => {
      const Component = mod?.default ?? null;
      if (Component) cache.set(name, Component);
      return Component;
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
 * The box is reserved by the caller's grid and by the widget's own min-height, so swapping
 * the skeleton for the real component moves nothing. A widget that fails to load leaves the
 * skeleton in place — one team's outage costs one region, not the page.
 */
function SlotSkeleton() {
  return (
    <div className="size-full rounded-lg border border-line bg-card p-5" aria-hidden="true">
      <div className="h-4 w-24 rounded bg-sunken" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-sunken" />
        <div className="h-3 w-4/5 rounded bg-sunken" />
      </div>
    </div>
  );
}

/**
 * The height of every account widget region, owned HERE.
 *
 * A placeholder that merely agrees with its widget about height drifts the first time either
 * team edits one — and the drift is a layout shift that only appears once the widget loads,
 * which is after every screenshot anyone takes. Fixing the box on the host side makes the
 * two impossible to disagree.
 */
const SLOT_BOX = 'h-[13rem] overflow-hidden';

export function LazySlot({ name }: { name: SlotName }) {
  const [Component, setComponent] = useState<ComponentType | null>(() => cache.get(name) ?? null);

  useEffect(() => {
    if (cache.has(name)) {
      setComponent(() => cache.get(name) ?? null);
      return;
    }
    let live = true;
    void resolveSlot(name).then((C) => {
      if (live && C) setComponent(() => C);
    });
    return () => {
      live = false;
    };
  }, [name]);

  return (
    <div className={SLOT_BOX} data-slot={name}>
      {Component ? <Component /> : <SlotSkeleton />}
    </div>
  );
}
