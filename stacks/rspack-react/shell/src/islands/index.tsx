import { createRoot } from 'react-dom/client';
import { CartProvider, SlotProvider } from '@mf-eval/react-contracts';
import { MARKS, getCartStore, mark, type RegistryResponse } from '@mf-eval/contracts';
import { loadRemotes } from '@mf-eval/shell-kit';

/**
 * React island mounting, in its own chunk.
 *
 * This file is the ONLY thing on the storefront that imports react-dom, and it is imported
 * dynamically — so a page with no islands never downloads it. That split is the whole point:
 * before it, every page paid 55 kB gzip of react-dom whether or not anything mounted, because
 * the client entry referenced it statically.
 *
 * What remains an island is genuinely stateful UI: the cart drawer and the cart page. The
 * header badge is not, and became a behaviour (cart/src/behaviors/mini.ts).
 */
export async function mountIslands(boot: {
  registry: RegistryResponse;
  personalized: { slot: string }[];
}): Promise<void> {
  // The same instance the header badge behaviour uses. One cart, two rendering mechanisms.
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
    const Live = slots[spec.slot as 'cart.drawer' | 'cart.page'];
    if (!el || !Live) continue;
    mark(MARKS.remoteHydrateStart(spec.slot));
    createRoot(el).render(
      <CartProvider store={store}>
        <SlotProvider slots={slots}>
          <Live />
        </SlotProvider>
      </CartProvider>,
    );
    mark(MARKS.remoteHydrateEnd(spec.slot));
  }
  mark(MARKS.shellHydrateEnd);
}
