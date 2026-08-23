/**
 * Fixture drift guard.
 *
 * If these fail the catalogue changed, which means every number in results/ was produced
 * against different input and is no longer comparable. Fix the fixture, or bump
 * SPEC_VERSION in spec/reference-app.md and re-run everything.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';

import {
  CATEGORIES,
  FAQ_TOPICS,
  PRODUCTS,
  RANGE_NAMES,
  categoryById,
  formatPrice,
  productById,
  productsInCategory,
} from './index.ts';

test('catalogue shape is exact', () => {
  assert.equal(CATEGORIES.length, 5);
  assert.equal(PRODUCTS.length, 60, '5 categories x 12 products');
  for (const c of CATEGORIES) {
    assert.equal(productsInCategory(c.id).length, 12, `${c.id} product count`);
  }
});

test('every product is complete and well-formed', () => {
  for (const p of PRODUCTS) {
    assert.match(p.id, /^p-\d{4}$/);
    assert.ok(p.name.length > 10, `name too short: ${p.name}`);
    assert.ok(p.sku.length >= 8, `sku too short: ${p.sku}`);
    assert.ok(Number.isInteger(p.price) && p.price >= 4900, `price: ${p.price}`);
    assert.equal(p.specs.length, 10, 'five family specs + five common');
    assert.equal(p.documents.length, 4);
    assert.ok(p.applications.length >= 1 && p.applications.length <= 3);
    assert.ok(categoryById(p.categoryId), `orphan category ${p.categoryId}`);
    assert.ok(['in-stock', 'low', 'backorder'].includes(p.availability));
    assert.ok(p.leadTimeDays >= 1);
  }
});

test('ids are unique and lookups work', () => {
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
  assert.equal(new Set(PRODUCTS.map((p) => p.sku)).size, PRODUCTS.length, 'SKUs must be unique');
  assert.equal(productById('p-0001')?.id, 'p-0001');
  assert.equal(productById('nope'), undefined);
  assert.ok(RANGE_NAMES.length >= 8);
});

test('support content is present and substantial', () => {
  assert.equal(FAQ_TOPICS.length, 4);
  const all = FAQ_TOPICS.flatMap((t) => t.entries);
  assert.ok(all.length >= 14, `only ${all.length} entries`);
  assert.equal(new Set(all.map((e) => e.id)).size, all.length);
  for (const e of all) {
    assert.ok(e.question.endsWith('?'), e.question);
    assert.ok(e.answer.length > 120, `answer too thin: ${e.question}`);
  }
});

test('price formatting is locale-independent', () => {
  assert.equal(formatPrice(4900), '$49.00');
  assert.equal(formatPrice(123456), '$1,234.56');
  assert.equal(formatPrice(100), '$1.00');
});

test('catalogue content is pinned by hash', () => {
  const json = JSON.stringify({ PRODUCTS, CATEGORIES, FAQ_TOPICS });
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
  const bytes = Buffer.byteLength(JSON.stringify(PRODUCTS), 'utf8');
  assert.equal(hash, EXPECTED_HASH, 'catalogue content drifted');
  assert.equal(bytes, EXPECTED_BYTES, 'catalogue payload size drifted');
});

// Pinned. Changing these is changing the experiment — bump SPEC_VERSION.
const EXPECTED_HASH = '911288f511d88db8';
const EXPECTED_BYTES = 89_841;
