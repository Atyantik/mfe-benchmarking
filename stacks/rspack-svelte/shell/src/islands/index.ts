import { mount } from 'svelte';
import { MARKS, getCartStore, mark, type RegistryResponse } from '@mf-eval/contracts';
import { loadRemotes } from '@mf-eval/shell-kit';
import Island from './Island.svelte';

/**
 * Svelte island mounting, in its own chunk.
 *
 * This file is the ONLY thing on the storefront that imports Svelte's client runtime, and it
 * is imported dynamically — so a page with no islands never downloads it. That split is the
 * whole point: without it every page would pay the runtime whether or not anything mounted.
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
    const Live = (slots as Record<string, unknown>)[spec.slot];
    if (!el || !Live) continue;
    mark(MARKS.remoteHydrateStart(spec.slot));
    // The server rendered a placeholder into this box; replace it rather than hydrating it.
    // The two markups are deliberately different — one reserves space, the other shows data.
    el.textContent = '';
    mount(Island, {
      target: el,
      props: { store, slots: slots as Record<string, unknown>, Live: Live as never },
    });
    mark(MARKS.remoteHydrateEnd(spec.slot));
  }
  mark(MARKS.shellHydrateEnd);
}
