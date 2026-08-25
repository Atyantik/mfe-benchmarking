/**
 * Frozen fixture data — spec/reference-app.md § Fixture data.
 *
 * Deterministic by construction (seeded PRNG, no dates, no Math.random). Two stacks that
 * render different data cannot be compared, so drift is guarded by a content hash in
 * fixtures.test.ts.
 */
export * from './catalog.ts';
export * from './content.ts';

export { mulberry32, SEED } from './rng.ts';

// Re-exported for compatibility. Import it from '@mf-eval/contracts' instead: reaching
// through the fixtures barrel pulls the whole catalogue in with it.
export { formatPrice } from '../money.ts';
