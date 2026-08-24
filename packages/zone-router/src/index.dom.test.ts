/**
 * The zone router.
 *
 * Platform code, so its bugs are everyone's bugs — and the interesting ones are all about
 * what it must NOT do. Every case below is a way a click-interceptor breaks a site:
 * swallowing a link out of the zone, stealing a middle-click, or intercepting a download.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createZoneRouter, matchZoneRoute, type ZoneRoute } from './index.ts';

const ROUTES: ZoneRoute<string>[] = [
  { id: 'overview', path: '', load: () => Promise.resolve('overview') },
  { id: 'orders', path: 'orders', load: () => Promise.resolve('orders') },
  { id: 'order', path: 'orders/:id', load: () => Promise.resolve('order') },
  { id: 'new', path: 'orders/new', load: () => Promise.resolve('new') },
  { id: 'profile', path: 'profile', load: () => Promise.resolve('profile') },
];
const BASE = '/my-account';
const match = (p: string) => matchZoneRoute(ROUTES, BASE, p);

describe('matchZoneRoute', () => {
  it('matches the index at the base path itself', () => {
    expect(match('/my-account')?.route.id).toBe('overview');
    expect(match('/my-account/')?.route.id).toBe('overview');
  });

  it('matches a named child and captures dynamic segments', () => {
    expect(match('/my-account/orders')?.route.id).toBe('orders');
    const detail = match('/my-account/orders/o-0001');
    expect(detail?.route.id).toBe('order');
    expect(detail?.params).toEqual({ id: 'o-0001' });
  });

  it('prefers a literal segment over a dynamic one', () => {
    // `new` is a real route; `:id` must not claim it first.
    expect(match('/my-account/orders/new')?.route.id).toBe('new');
  });

  it('returns null outside the zone — that is what makes a link out a document load', () => {
    expect(match('/product')).toBeNull();
    expect(match('/')).toBeNull();
    // A prefix that merely starts with the same characters is not inside the zone.
    expect(match('/my-accountant')).toBeNull();
  });

  it('does not let a dynamic segment swallow a deeper path', () => {
    expect(match('/my-account/orders/o-0001/lines')).toBeNull();
  });

  it('decodes dynamic segments', () => {
    expect(match('/my-account/orders/a%20b')?.params).toEqual({ id: 'a b' });
  });
});

describe('createZoneRouter', () => {
  let router: ReturnType<typeof createZoneRouter<string>>;

  beforeEach(() => {
    history.replaceState(null, '', '/my-account');
    document.body.innerHTML = '';
    router = createZoneRouter({ basePath: BASE, routes: ROUTES });
  });

  const click = (html: string, init: MouseEventInit = {}) => {
    document.body.innerHTML = html;
    const a = document.querySelector('a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    a.dispatchEvent(event);
    return event;
  };

  it('intercepts a link INTO the zone and routes without a navigation', () => {
    const seen = vi.fn();
    router.subscribe(seen);
    const event = click('<a href="/my-account/orders">Orders</a>');
    expect(event.defaultPrevented).toBe(true);
    expect(location.pathname).toBe('/my-account/orders');
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ route: expect.objectContaining({ id: 'orders' }) }));
    router.stop();
  });

  it('leaves a link OUT of the zone entirely alone', () => {
    const event = click('<a href="/product">Products</a>');
    expect(event.defaultPrevented).toBe(false);
    expect(location.pathname).toBe('/my-account');
    router.stop();
  });

  it('leaves modified clicks to the browser', () => {
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }]) {
      history.replaceState(null, '', '/my-account');
      const event = click('<a href="/my-account/orders">Orders</a>', init);
      expect(event.defaultPrevented, JSON.stringify(init)).toBe(false);
      expect(location.pathname).toBe('/my-account');
    }
    router.stop();
  });

  it('leaves downloads, new tabs and opt-outs alone', () => {
    for (const html of [
      '<a href="/my-account/orders" download>Export</a>',
      '<a href="/my-account/orders" target="_blank">New tab</a>',
      '<a href="/my-account/orders" data-no-zone>Opt out</a>',
    ]) {
      history.replaceState(null, '', '/my-account');
      expect(click(html).defaultPrevented, html).toBe(false);
    }
    router.stop();
  });

  it('leaves cross-origin and hash links alone', () => {
    expect(click('<a href="https://example.com/my-account/orders">Away</a>').defaultPrevented).toBe(false);
    expect(click('<a href="#section">Jump</a>').defaultPrevented).toBe(false);
    router.stop();
  });

  it('responds to back and forward', () => {
    const seen: (string | undefined)[] = [];
    router.subscribe((m) => seen.push(m?.route.id));
    click('<a href="/my-account/orders">Orders</a>');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(seen.at(-1)).toBe('orders');
    router.stop();
  });

  it('stops listening after stop(), so a torn-down zone cannot capture clicks', () => {
    router.stop();
    const event = click('<a href="/my-account/orders">Orders</a>');
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not push a duplicate entry for the current URL', () => {
    const before = history.length;
    click('<a href="/my-account">Overview</a>');
    expect(history.length).toBe(before);
    router.stop();
  });
});
