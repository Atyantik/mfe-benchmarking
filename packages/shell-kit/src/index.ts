/**
 * Infrastructure shared by every shell variant: registry resolution, runtime remote
 * loading, per-route asset injection, cart cookie transport.
 *
 * This package exists so the SPA and MPA shells run IDENTICAL infrastructure. If each
 * shell had its own copy, any comparison between them would be measuring the drift
 * between two implementations rather than the navigation model — which is the only
 * variable the comparison is allowed to have.
 *
 * Build-time code, bundled into each shell. NOT a shared runtime singleton.
 */
export * from './registry-client.ts';
export * from './remotes.ts';
export * from './assets.ts';
export * from './cart-cookie.ts';
