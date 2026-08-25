import { createCartStore, deserializeCartState, EMPTY_CART, type CartState, type CartStore } from './index.ts';

/**
 * The cart cookie, next to the store it encodes.
 *
 * It used to live in shell-kit, which is host infrastructure — so the only way for the cart
 * team's own code to read its own cookie was to depend on the shell's package. Here it is in
 * the shared singleton every side already has, and costs nothing extra to import.
 */
export const CART_COOKIE = 'mf_cart';

/**
 * Cart state round-trips through a cookie so the badge is already correct in the
 * server-rendered HTML on a reload — spec/reference-app.md § Interaction script step 9.
 * Without this the count would only appear after hydration, which is exactly the
 * failure mode this study is meant to catch.
 */
export function readCartCookie(cookieHeader: string | null | undefined): CartState {
  if (!cookieHeader) return EMPTY_CART;
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CART_COOKIE}=`));
  if (!match) return EMPTY_CART;
  try {
    return deserializeCartState(JSON.parse(decodeURIComponent(match.slice(CART_COOKIE.length + 1))));
  } catch {
    return EMPTY_CART;
  }
}

export function cartCookieValue(state: CartState): string {
  return encodeURIComponent(JSON.stringify({ items: state.items }));
}

/**
 * The one cart store on the client, shared by everything that touches the cart.
 *
 * There must be exactly one. The header badge is a behaviour and the drawer is a React
 * island — two entirely different mechanisms, in two different bundles, owned by the same
 * team — and when each built its own store from the cookie they diverged the moment anything
 * was added: the badge counted up and the drawer stayed empty, because neither knew the
 * other existed.
 *
 * A module-level singleton is safe here for the same reason the React context is: this
 * package is a shared MF singleton, so every remote and both hosts resolve the same instance.
 * On the server it is never called — cart state is client-only (docs/decision-log.md D12) —
 * and a per-request store would be a correctness bug there, which is why this throws rather
 * than quietly returning one.
 */
let clientStore: CartStore | null = null;

export function getCartStore(): CartStore {
  if (typeof document === 'undefined') {
    throw new Error(
      '[mf-eval] getCartStore() is client-only. The server must never hold cart state — see D12.',
    );
  }
  if (clientStore) return clientStore;

  clientStore = createCartStore(readCartCookie(document.cookie));
  // One writer, so the cookie cannot be written twice per change by two subscribers.
  clientStore.subscribe(() => {
    const value = cartCookieValue(clientStore?.getSnapshot() ?? EMPTY_CART);
    document.cookie = `${CART_COOKIE}=${value}; path=/; SameSite=Lax; Max-Age=2592000`;
  });
  return clientStore;
}
