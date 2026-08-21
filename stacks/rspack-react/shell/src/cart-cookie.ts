import { deserializeCartState, EMPTY_CART, type CartState } from '@mf-eval/contracts';

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
