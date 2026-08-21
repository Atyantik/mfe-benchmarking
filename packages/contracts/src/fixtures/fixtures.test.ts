/**
 * Fixture drift guard.
 *
 * If any of these fail, the fixture data changed — which means every number in
 * results/ was produced against different input and is no longer comparable.
 * Fix the fixture, or bump SPEC_VERSION in spec/reference-app.md and re-run everything.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';

import {
  DESCRIPTION_LEN,
  FAQ,
  FAQ_ANSWER_LEN,
  FAQ_COUNT,
  HOME_CARDS,
  HOME_CARD_COUNT,
  HOME_CARD_LEN,
  HOME_INTRO,
  HOME_INTRO_LEN,
  NAME_LEN,
  PRODUCTS,
  PRODUCT_COUNT,
  SKU_LEN,
  formatPrice,
  productById,
} from './index.ts';

test('product count and field widths are exact', () => {
  assert.equal(PRODUCTS.length, PRODUCT_COUNT);
  for (const p of PRODUCTS) {
    assert.equal(p.name.length, NAME_LEN, `name width for ${p.id}`);
    assert.equal(p.sku.length, SKU_LEN, `sku width for ${p.id}`);
    assert.equal(p.description.length, DESCRIPTION_LEN, `description width for ${p.id}`);
    assert.ok(Number.isInteger(p.price), `price must be integer cents for ${p.id}`);
    assert.ok(p.price >= 100 && p.price <= 99999, `price range for ${p.id}`);
  }
});

test('product ids are stable and unique', () => {
  assert.equal(PRODUCTS[0]?.id, 'p-0001');
  assert.equal(PRODUCTS[PRODUCT_COUNT - 1]?.id, 'p-0200');
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCT_COUNT);
  assert.equal(productById('p-0001')?.id, 'p-0001');
  assert.equal(productById('nope'), undefined);
});

test('faq and home fixtures are exact', () => {
  assert.equal(FAQ.length, FAQ_COUNT);
  for (const f of FAQ) {
    assert.equal(f.answer.length, FAQ_ANSWER_LEN);
    assert.ok(f.question.endsWith('?'));
  }
  assert.equal(HOME_CARDS.length, HOME_CARD_COUNT);
  for (const c of HOME_CARDS) assert.equal(c.blurb.length, HOME_CARD_LEN);
  assert.equal(HOME_INTRO.length, HOME_INTRO_LEN);
});

test('fixture content is pinned by hash and byte size', () => {
  const json = JSON.stringify({ PRODUCTS, FAQ, HOME_CARDS, HOME_INTRO });
  const bytes = Buffer.byteLength(JSON.stringify(PRODUCTS), 'utf8');
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
  // A hash catches reordering that preserves byte count; the byte count is what
  // every stack actually transfers. Pin both.
  assert.equal(bytes, EXPECTED_PRODUCT_BYTES, 'product payload size drifted');
  assert.equal(hash, EXPECTED_FIXTURE_HASH, 'fixture content drifted');
});

test('price formatting is locale-independent', () => {
  assert.equal(formatPrice(100), '$1.00');
  assert.equal(formatPrice(99999), '$999.99');
  assert.equal(formatPrice(1005), '$10.05');
});

// Pinned values. Changing these is changing the experiment — bump SPEC_VERSION.
const EXPECTED_PRODUCT_BYTES = 100_385;
const EXPECTED_FIXTURE_HASH = '8b5922cd8cd3c3a1';
