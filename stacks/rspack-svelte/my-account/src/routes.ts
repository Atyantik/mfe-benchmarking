import type { Component } from 'svelte';
import type { ZoneRoute } from '@mf-eval/zone-router';

/**
 * The zone's route table. CLIENT-SIDE only.
 *
 * The edge sends every `/my-account/*` request to this host, and the shell never sees these
 * paths — so adding a route here is a deploy of this app alone.
 *
 * `id` doubles as the chunk name, so each route's JavaScript is attributable in the bench
 * exactly the way a document route's is.
 */
export interface PageModule {
  /**
   * A route component is HANDED params and may ignore them.
   *
   * Every page declares `params`, including the three that never read it. Component props are
   * contravariant, so a page declaring no props is not assignable to "a page the router can
   * render" — and widening the router's type until that stops mattering would be a type
   * describing itself rather than the application.
   */
  Page: Component<{ params?: Record<string, string> }>;
  title: (params: Record<string, string>) => string;
}

export const ROUTES: readonly ZoneRoute<PageModule>[] = [
  {
    id: 'account.overview',
    path: '',
    load: () => import(/* webpackChunkName: "account-overview" */ './app/Overview.route.ts'),
  },
  {
    id: 'account.orders',
    path: 'orders',
    load: () => import(/* webpackChunkName: "account-orders" */ './app/Orders.route.ts'),
  },
  {
    id: 'account.order',
    path: 'orders/:id',
    load: () => import(/* webpackChunkName: "account-order" */ './app/OrderDetail.route.ts'),
  },
  {
    id: 'account.profile',
    path: 'profile',
    load: () => import(/* webpackChunkName: "account-profile" */ './app/Profile.route.ts'),
  },
];

export const BASE_PATH = '/my-account';
