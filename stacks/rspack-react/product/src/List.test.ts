/**
 * Catalogue loader.
 *
 * All of the filtering, counting, sorting and pagination happens here, on the server, from
 * the URL — which is what makes every result view linkable and correct without JavaScript.
 * It is also the most logic in the app, so it gets the most tests.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@mf-eval/contracts/fixtures';

import { loader } from './List';

const load = (query = '') =>
  loader({ params: {}, request: new Request(`http://x/product${query}`) });

describe('catalogue loader', () => {
  it('paginates rather than shipping the whole catalogue', () => {
    const data = load();
    expect(data.total).toBe(PRODUCTS.length);
    expect(data.products).toHaveLength(12);
    expect(data.pageCount).toBe(5);
  });

  it('filters by category', () => {
    const data = load('?category=power-continuity');
    expect(data.total).toBe(12);
    expect(data.products.every((p) => p.categoryId === 'power-continuity')).toBe(true);
  });

  it('treats multiple values of one facet as OR', () => {
    const data = load('?category=power-continuity&category=circuit-protection');
    expect(data.total).toBe(24);
  });

  it('treats different facets as AND', () => {
    const data = load('?category=power-continuity&availability=in-stock');
    expect(
      data.products.every((p) => p.categoryId === 'power-continuity' && p.availability === 'in-stock'),
    ).toBe(true);
    expect(data.total).toBeLessThan(12);
  });

  it('searches across name, sku, range and summary', () => {
    const bySku = load(`?q=${PRODUCTS[0]!.sku}`);
    expect(bySku.total).toBe(1);
    expect(bySku.products[0]?.id).toBe(PRODUCTS[0]!.id);

    // Multiple terms narrow rather than widen.
    const twoTerms = load('?q=galaxy+ups');
    expect(twoTerms.total).toBeGreaterThan(0);
    expect(twoTerms.products.every((p) => /galaxy/i.test(`${p.name} ${p.range}`))).toBe(true);
  });

  it('counts each facet against the OTHER facets, not itself', () => {
    // With one category selected, the category counts must still show what the visitor
    // would get by selecting a different one — otherwise every unselected option reads
    // zero and the panel looks broken.
    const data = load('?category=power-continuity');
    expect(data.counts.category['circuit-protection']).toBe(12);
    // Availability counts, though, are scoped to the selected category.
    const inCategory = PRODUCTS.filter((p) => p.categoryId === 'power-continuity');
    const inStock = inCategory.filter((p) => p.availability === 'in-stock').length;
    expect(data.counts.availability['in-stock']).toBe(inStock);
  });

  it('sorts by price in both directions', () => {
    const asc = load('?sort=price-asc').products.map((p) => p.price);
    const desc = load('?sort=price-desc').products.map((p) => p.price);
    expect([...asc]).toEqual([...asc].sort((a, b) => a - b));
    expect([...desc]).toEqual([...desc].sort((a, b) => b - a));
  });

  it('clamps a page beyond the end instead of returning nothing', () => {
    const data = load('?page=999');
    expect(data.page).toBe(data.pageCount);
    expect(data.products.length).toBeGreaterThan(0);
  });

  it('carries filters into pagination links but drops the page', () => {
    const data = load('?category=power-continuity&sort=name&page=2');
    expect(data.queryString).toContain('category=power-continuity');
    expect(data.queryString).toContain('sort=name');
    expect(data.queryString).not.toContain('page=');
  });

  it('falls back to a safe sort when given nonsense', () => {
    expect(load('?sort=drop-tables').sort).toBe('relevance');
  });

  it('returns an empty page rather than throwing when nothing matches', () => {
    const data = load('?q=zzzzznotathing');
    expect(data.total).toBe(0);
    expect(data.products).toEqual([]);
    expect(data.pageCount).toBe(1);
  });
});
