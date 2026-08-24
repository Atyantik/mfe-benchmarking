/**
 * Account fixtures.
 *
 * The zone renders these on the client after a fetch, so nothing about them is visible in
 * server HTML — which means a mistake here shows up as a wrong number on a dashboard rather
 * than as a broken page. The determinism check matters most: the whole bench walks to
 * `o-0001` and asserts what it finds.
 */
import { describe, expect, it } from 'vitest';

import { ORDERS, PROFILE, summary } from './data';

describe('orders', () => {
  it('is deterministic — the same id always yields the same order', () => {
    const first = ORDERS.find((o) => o.id === 'o-0001');
    expect(first).toBeDefined();
    expect(first?.reference).toBe('NG-48210');
    expect(first?.lines.length).toBeGreaterThan(0);
  });

  it('does not drift with the clock', () => {
    // A fixture seeded from Date.now() makes every screenshot and assertion time-dependent.
    const dates = ORDERS.map((o) => o.placedAt);
    expect(new Set(dates).size).toBe(ORDERS.length);
    expect(dates[0]).toBe(new Date(Date.UTC(2026, 6, 2)).toISOString());
  });

  it('totals each order from its own lines', () => {
    for (const order of ORDERS) {
      const expected = order.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
      expect(order.total).toBe(expected);
    }
  });

  it('gives every order a status the UI knows how to render', () => {
    const known = new Set(['delivered', 'in-transit', 'processing', 'cancelled']);
    expect(ORDERS.every((o) => known.has(o.status))).toBe(true);
  });
});

describe('summary', () => {
  it('counts open and in-transit orders from the same source as the list', () => {
    const s = summary();
    expect(s.openOrders).toBe(ORDERS.filter((o) => o.status === 'processing').length);
    expect(s.inTransit).toBe(ORDERS.filter((o) => o.status === 'in-transit').length);
  });

  it('shows the four most recent orders, newest first', () => {
    const s = summary();
    expect(s.recent).toHaveLength(4);
    const times = s.recent.map((o) => Date.parse(o.placedAt));
    expect([...times]).toEqual([...times].sort((a, b) => b - a));
  });

  it('carries the profile identity, so the two views cannot disagree', () => {
    expect(summary().accountNumber).toBe(PROFILE.accountNumber);
    expect(summary().name).toBe(PROFILE.name);
  });
});
