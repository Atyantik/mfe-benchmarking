/**
 * Deterministic PRNG. Every stack must generate byte-identical fixture data or the
 * cross-stack byte comparison is measuring the data, not the technology.
 *
 * Never use Math.random(), Date.now(), or anything environment-dependent in fixtures.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED = 0x5eed;

const WORDS = [
  'alloy', 'beacon', 'cinder', 'drift', 'ember', 'fathom', 'gable', 'harbor',
  'ingot', 'jetty', 'kindle', 'lumen', 'mantle', 'nimbus', 'onyx', 'pivot',
  'quarry', 'ridge', 'summit', 'tundra', 'umber', 'vertex', 'willow', 'zephyr',
] as const;

/** A word sequence of exactly `length` characters, deterministic for a given rng. */
export function words(rng: () => number, length: number): string {
  let out = '';
  while (out.length < length) {
    const w = WORDS[Math.floor(rng() * WORDS.length)] as string;
    out += (out ? ' ' : '') + w;
  }
  return out.slice(0, length);
}

/** Uppercase alphanumeric token of exactly `length` characters. */
export function token(rng: () => number, length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return out;
}
