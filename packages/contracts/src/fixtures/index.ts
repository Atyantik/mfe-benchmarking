/**
 * Frozen fixture data — spec/reference-app.md § Fixture data.
 *
 * Every stack renders exactly this. Sizes are asserted in packages/contracts/src/fixtures/
 * fixtures.test.ts; if an assertion fails the data drifted and results are no longer
 * comparable across stacks.
 */
import { mulberry32, SEED, token, words } from './rng.ts';

export const PRODUCT_COUNT = 200;
export const FAQ_COUNT = 24;
export const HOME_CARD_COUNT = 6;

export const NAME_LEN = 24;
export const SKU_LEN = 12;
export const DESCRIPTION_LEN = 400;
export const FAQ_ANSWER_LEN = 320;
export const HOME_INTRO_LEN = 240;
export const HOME_CARD_LEN = 80;

export interface Product {
  id: string;
  name: string;
  sku: string;
  /** Integer cents, 100–99999. Never a float — float formatting differs across engines. */
  price: number;
  description: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export interface HomeCard {
  id: string;
  title: string;
  blurb: string;
  price: number;
}

function buildProducts(): Product[] {
  const rng = mulberry32(SEED);
  const out: Product[] = [];
  for (let i = 1; i <= PRODUCT_COUNT; i += 1) {
    out.push({
      id: `p-${String(i).padStart(4, '0')}`,
      name: words(rng, NAME_LEN),
      sku: token(rng, SKU_LEN),
      price: 100 + Math.floor(rng() * 99900),
      description: words(rng, DESCRIPTION_LEN),
    });
  }
  return out;
}

function buildFaq(): FaqEntry[] {
  // Separate stream so adding a product never shifts FAQ content.
  const rng = mulberry32(SEED ^ 0x1111);
  const out: FaqEntry[] = [];
  for (let i = 1; i <= FAQ_COUNT; i += 1) {
    out.push({
      id: `q-${String(i).padStart(2, '0')}`,
      question: `${words(rng, 40)}?`,
      answer: words(rng, FAQ_ANSWER_LEN),
    });
  }
  return out;
}

function buildHomeCards(): HomeCard[] {
  const rng = mulberry32(SEED ^ 0x2222);
  const out: HomeCard[] = [];
  for (let i = 1; i <= HOME_CARD_COUNT; i += 1) {
    out.push({
      id: `c-${i}`,
      title: words(rng, 18),
      blurb: words(rng, HOME_CARD_LEN),
      price: 100 + Math.floor(rng() * 99900),
    });
  }
  return out;
}

export const PRODUCTS: readonly Product[] = Object.freeze(buildProducts());
export const FAQ: readonly FaqEntry[] = Object.freeze(buildFaq());
export const HOME_CARDS: readonly HomeCard[] = Object.freeze(buildHomeCards());
export const HOME_INTRO: string = words(mulberry32(SEED ^ 0x3333), HOME_INTRO_LEN);

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Cents → a fixed string. Intl would vary by ICU build; this must not. */
export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
