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
