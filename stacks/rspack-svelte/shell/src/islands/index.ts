import { MARKS, getCartStore, mark, type CartStore, type RegistryResponse } from '@mf-eval/contracts';
import { loadRemotes } from '@mf-eval/shell-kit';

/**
 * A remote's island arrives as a MOUNT FUNCTION, never as a component.
 *
 * A Svelte 5 component closes over the `svelte/internal/client` instance that compiled it, and
 * federation cannot share that instance (docs/svelte-federation.md). Only a DOM node and plain
 * data may cross the boundary; the remote mounts its own component with its own runtime.
 */
type SlotMounter = (target: HTMLElement, props: { store: CartStore }) => () => void;

/**
 * Svelte island mounting, in its own chunk.
 *
 * This file is the only thing on the storefront that reaches for a remote's live components,
 * and it is imported dynamically — so a page with no islands never downloads any of it. That
 * split is the whole point: without it every page would pay a runtime it never uses.
 *
 * Note what is NOT here: Svelte itself. Because each remote mounts its own component, the
 * storefront host ships no Svelte client runtime at all — the remote brings its own. That is a
 * consequence of the boundary, not a decision, and it is worth measuring rather than assuming.
 *
 * What remains an island is genuinely stateful UI: the cart drawer and the cart page. The
 * header badge is not, and is a behaviour (cart/src/behaviors/mini.ts).
 */
export async function mountIslands(boot: {
  registry: RegistryResponse;
  personalized: { slot: string }[];
}): Promise<void> {
  // The same instance the header badge behaviour uses. One cart, two rendering mechanisms —
  // and, in this stack, two reactive graphs that cannot see each other, which is exactly why
  // the store is framework-agnostic and cookie-backed.
  const store = getCartStore();

  const wanted = new Set(boot.personalized.map((p) => p.slot.split('.')[0] ?? ''));
  const entries = boot.registry.remotes.filter((r) => wanted.has(r.name));
  const { slots } = await loadRemotes(entries, {
    variant: 'live',
    onlySlots: boot.personalized.map((p) => p.slot),
  });

  mark(MARKS.shellHydrateStart);
  for (const spec of boot.personalized) {
    const el = document.querySelector<HTMLElement>(`[data-personalized="${spec.slot}"]`);
    const mountWidget = (slots as Record<string, unknown>)[spec.slot] as SlotMounter | undefined;
    if (!el || typeof mountWidget !== 'function') continue;
    mark(MARKS.remoteHydrateStart(spec.slot));
    // The server rendered a placeholder into this box; replace it rather than hydrating it.
    // The two markups are deliberately different — one reserves space, the other shows data.
    el.textContent = '';
    mountWidget(el, { store });
    mark(MARKS.remoteHydrateEnd(spec.slot));
  }
  mark(MARKS.shellHydrateEnd);
}
