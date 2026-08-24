import { createRoot } from 'react-dom/client';
import { CartProvider, SlotProvider } from '@mf-eval/react-contracts';
import {
  CART_STATE_GLOBAL,
  MARKS,
  createCartStore,
  mark,
  type RegistryResponse,
} from '@mf-eval/contracts';
import { scanBehaviors } from '@mf-eval/behaviors/runtime';
import { loadRemote } from '@module-federation/enhanced/runtime';
import {
  CART_COOKIE,
  cartCookieValue,
  loadRemotes,
  primeRegistry,
  readCartCookie,
  register,
} from '@mf-eval/shell-kit';

interface Bootstrap {
  registry: RegistryResponse;
  cohort: string;
  personalized: { slot: string }[];
  behaviors: string[];
}

/**
 * `product.gallery` lives at `product/behaviors/gallery`.
 *
 * The name is the address — no manifest, no registry of behaviours, nothing for an author
 * to keep in sync. Federation resolves the remote; the file name does the rest.
 */
const resolveBehavior = (name: string) => {
  const [remote, file] = name.split('.');
  if (!remote || !file) throw new Error(`Behaviour "${name}" must be named "<remote>.<file>".`);
  return loadRemote(`${remote}/behaviors/${file}`) as Promise<never>;
};

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
  // The server only emits this script when there is something personalized to mount, but
  // a cached document paired with a newer bundle could still land here without it.
  const boot = (window as unknown as Partial<Record<string, Bootstrap>>)[CART_STATE_GLOBAL];
  if (!boot) return;

  primeRegistry('web', boot.cohort, boot.registry);

  // Register ONLY the remotes this page will actually pull from — the owners of its
  // behaviours and of its personalized regions. Registering the whole registry would let a
  // stray import reach a remote this page has no business loading, which is precisely the
  // cross-contamination the bench checks for.
  const ownerOf = (qualified: string) => qualified.split('.')[0] ?? '';
  const owners = new Set([
    ...boot.behaviors.map(ownerOf),
    ...boot.personalized.map((p) => ownerOf(p.slot)),
  ]);
  register(boot.registry.remotes.filter((r) => owners.has(r.name)));

  // Behaviours first, and independently of the cart: they enhance markup that is already on
  // screen, and a page may have behaviours without any personalized region at all.
  scanBehaviors(document, resolveBehavior);

  if (boot.personalized.length === 0) return;

  // State is recreated from the cookie — the client owns it, the server never sees it in
  // a render, and it survives a full document load without any server involvement.
  const store = createCartStore(readCartCookie(document.cookie));
  store.subscribe(() => {
    document.cookie = `${CART_COOKIE}=${cartCookieValue(store.getSnapshot())}; path=/; SameSite=Lax; Max-Age=2592000`;
  });

  // Only the remotes that own a personalized region on THIS page, and only the slots this
  // page actually rendered.
  const wanted = new Set(boot.personalized.map((p) => ownerOf(p.slot)));
  const entries = boot.registry.remotes.filter((r) => wanted.has(r.name));
  const { slots } = await loadRemotes(entries, {
    variant: 'live',
    onlySlots: boot.personalized.map((p) => p.slot),
    // routes stays off: there is no client router, so a descriptor here is dead weight.
  });

  mark(MARKS.shellHydrateStart);
  for (const spec of boot.personalized) {
    const el = document.querySelector<HTMLElement>(`[data-personalized="${spec.slot}"]`);
    const Live = slots[spec.slot as 'cart.mini' | 'cart.drawer'];
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
    const id = target.dataset.addId;
    const name = target.dataset.addName;
    const price = Number(target.dataset.addPrice);
    if (!id || !name || Number.isNaN(price)) return;
    store.add({ id, name, price });
  });
}

void start();
