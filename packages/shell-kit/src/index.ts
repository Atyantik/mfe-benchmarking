/**
 * Infrastructure shared by every shell variant: registry resolution, runtime remote
 * loading, per-route asset injection, cart cookie transport.
 *
 * It lives outside the shell so that a second shell — another framework, another
 * renderer — runs IDENTICAL infrastructure rather than a re-implementation of it. Any
 * measurement comparing the two would otherwise be reading the drift between two copies.
 *
 * Build-time code, bundled into each shell. NOT a shared runtime singleton.
 */
export * from './registry-client.ts';
export * from './remotes.ts';
export * from './assets.ts';
// The cart cookie moved to @mf-eval/contracts, beside the store it encodes. Re-exported
// here because every host reads it and this is where they already look.
export { CART_COOKIE, cartCookieValue, readCartCookie } from '@mf-eval/contracts';
export * from './chrome.ts';
