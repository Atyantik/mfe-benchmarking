/**
 * Colour contrast, checked at the token level.
 *
 * axe found this on all ten routes at once: `ink-500` read as 4.61 against white and 4.08
 * against `sunken` — a pass on the background anyone would check by hand, a fail on the two
 * they would not. It had been in the palette since the palette was written.
 *
 * A browser test would have caught it too, eventually, on whichever page happened to be
 * audited. Checking the TOKENS catches it once, in milliseconds, before any page exists —
 * and it names the token rather than a CSS selector nobody can trace back to a decision.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./theme-map.css', import.meta.url)), 'utf8');

/**
 * Resolve a token to a literal colour, following `var()` indirection.
 *
 * The semantic surfaces are aliases — `--color-page: var(--color-ink-50)` — so a resolver
 * that only understood hex silently found nothing and every test failed for the wrong
 * reason. Following the reference is the difference between checking the palette and
 * checking a regex.
 */
function token(name: string, depth = 0): string {
  if (depth > 5) throw new Error(`--color-${name} resolves in a loop`);
  const match = new RegExp(`--color-${name}:\\s*([^;]+);`, 'i').exec(css);
  const value = match?.[1]?.trim();
  if (!value) throw new Error(`token --color-${name} not found`);
  if (value.startsWith('#')) return value;
  const alias = /var\(--color-([a-z0-9-]+)\)/i.exec(value);
  if (alias?.[1]) return token(alias[1], depth + 1);
  throw new Error(`--color-${name} is "${value}", which is neither hex nor a var()`);
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** Every surface this site paints text on. A token must clear the WORST of them. */
const SURFACES = ['card', 'page', 'sunken'] as const;

describe('text colours meet WCAG AA on every surface', () => {
  // 4.5:1 is the AA threshold for body text.
  for (const name of ['ink-900', 'ink-800', 'ink-700', 'ink-600', 'ink-500', 'brand-700']) {
    it(`${name} is readable on card, page and sunken`, () => {
      for (const surface of SURFACES) {
        const ratio = contrast(token(name), token(surface));
        expect(ratio, `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe('non-text colours meet the 3:1 threshold', () => {
  // Icons, borders and disabled states are held to 3.0, not 4.5. `ink-400` lives here, and
  // the rule that keeps it honest is that no readable text may use it.
  for (const name of ['ink-400', 'line-strong']) {
    it(`${name} is distinguishable on every surface`, () => {
      for (const surface of SURFACES) {
        const ratio = contrast(token(name), token(surface));
        expect(ratio, `${name} on ${surface}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
