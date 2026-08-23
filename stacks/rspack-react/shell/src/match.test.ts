/**
 * Route matching.
 *
 * This 60-line matcher replaced a client router that cost 59 kB gzip and executed 12% of
 * itself. It runs on every request, so it is worth knowing precisely what it does — most
 * of these cases are ones that broke while it was being written.
 */
import { describe, expect, it } from 'vitest';
import type { RouteDescriptor } from '@mf-eval/contracts';

import { matchDescriptors } from './match';

const routes: RouteDescriptor[] = [
  {
    path: 'faq',
    children: [
      { id: 'faq.index', index: true },
      { id: 'faq.contact', path: 'contact' },
    ],
  },
  {
    path: 'product',
    children: [
      { id: 'product.list', index: true },
      { id: 'product.detail', path: ':id' },
    ],
  },
  { id: 'cart.page', path: 'cart' },
];

const leafOf = (pathname: string) => matchDescriptors(routes, pathname)?.leaf.id;

describe('matchDescriptors', () => {
  it('matches an index child when the subtree path is exact', () => {
    expect(leafOf('/faq')).toBe('faq.index');
    expect(leafOf('/product')).toBe('product.list');
  });

  it('matches a named child below the subtree', () => {
    expect(leafOf('/faq/contact')).toBe('faq.contact');
  });

  it('captures dynamic segments', () => {
    const match = matchDescriptors(routes, '/product/p-0013');
    expect(match?.leaf.id).toBe('product.detail');
    expect(match?.params).toEqual({ id: 'p-0013' });
  });

  it('matches a top-level route with no children', () => {
    expect(leafOf('/cart')).toBe('cart.page');
  });

  it('returns the whole chain, so the owning remote can be identified', () => {
    const match = matchDescriptors(routes, '/product/p-0001');
    expect(match?.chain.map((r) => r.path ?? (r.index ? '(index)' : '?'))).toEqual([
      'product',
      ':id',
    ]);
  });

  it('does not match unknown paths', () => {
    expect(matchDescriptors(routes, '/nope')).toBeNull();
    expect(matchDescriptors(routes, '/faq/nope')).toBeNull();
    // A dynamic segment must not swallow a deeper path than it declares.
    expect(matchDescriptors(routes, '/product/p-0013/reviews')).toBeNull();
  });

  it('ignores trailing and repeated slashes', () => {
    expect(leafOf('/faq/')).toBe('faq.index');
    expect(leafOf('//faq//contact//')).toBe('faq.contact');
  });

  it('prefers a literal segment over a dynamic one', () => {
    const withBoth: RouteDescriptor[] = [
      {
        path: 'product',
        children: [
          { id: 'product.detail', path: ':id' },
          { id: 'product.new', path: 'new' },
        ],
      },
    ];
    // `new` is a real page; a dynamic segment must not claim it first.
    expect(matchDescriptors(withBoth, '/product/new')?.leaf.id).toBe('product.new');
  });
});
