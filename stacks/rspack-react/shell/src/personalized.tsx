import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import { CartProvider, SlotProvider } from '@mf-eval/react-contracts';
import {
  CART_STATE_GLOBAL,
  MARKS,
  createCartStore,
  mark,
  type RegistryResponse,
} from '@mf-eval/contracts';
import { CART_COOKIE, cartCookieValue, loadRemotes, primeRegistry, readCartCookie } from '@mf-eval/shell-kit';

interface Bootstrap {
  registry: RegistryResponse;
  cohort: string;
  personalized: { slot: string }[];
}

/**
 * Client-side rendering of PERSONALIZED regions only.
 *
 * Everything the server rendered — page content, chrome, links — is left untouched. This
 * file exists solely to replace reserved placeholder boxes with live, per-user UI.
 *
 * `createRoot`, not `hydrateRoot`: the server deliberately rendered a placeholder, so
 * there is no matching tree to hydrate. Claiming otherwise would be a mismatch by
 * construction. The placeholder reserves the same box, so the swap costs no layout shift.
 */
async function start(): Promise<void> {
  const boot = (window as unknown as Record<string, Bootstrap>)[CART_STATE_GLOBAL];
  if (!boot?.personalized?.length) return;

  primeRegistry('web', boot.cohort, boot.registry);

  // State is recreated from the cookie — the client owns it, the server never sees it in
  // a render, and it survives a full document load without any server involvement.
  const store = createCartStore(readCartCookie(document.cookie));
  store.subscribe(() => {
    document.cookie = `${CART_COOKIE}=${cartCookieValue(store.getSnapshot())}; path=/; SameSite=Lax; Max-Age=2592000`;
  });

  // Only the remotes that own a personalized region on THIS page.
  const wanted = new Set(boot.personalized.map((p) => p.slot.split('.')[0]));
  const entries = boot.registry.remotes.filter((r) => wanted.has(r.name));
  // Only the slots this page actually rendered.
  const { slots } = await loadRemotes(entries, 'live', boot.personalized.map((p) => p.slot));

  mark(MARKS.shellHydrateStart);
  for (const spec of boot.personalized) {
    const el = document.querySelector<HTMLElement>(`[data-personalized="${spec.slot}"]`);
    const Live = slots[spec.slot as 'cart.mini' | 'cart.drawer'] as ComponentType | undefined;
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

  /**
   * Add-to-cart by event delegation on inert server-rendered markup.
   *
   * The product page is never hydrated — a 200-row table costs nothing to make
   * interactive this way, where hydrating it would pull the framework across the whole
   * list. Price and name come from the markup because the cart is client-owned state;
   * a real checkout re-prices server-side from the id.
   */
  document.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-add-id]');
    if (!target) return;
    const id = target.dataset['addId'];
    const name = target.dataset['addName'];
    const price = Number(target.dataset['addPrice']);
    if (!id || !name || Number.isNaN(price)) return;
    store.add({ id, name, price });
  });
}

void start();
