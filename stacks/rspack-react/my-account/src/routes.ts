import type { ZoneRoute } from '@mf-eval/zone-router';

/**
 * The zone's route table. CLIENT-SIDE only.
 *
 * The edge sends every `/my-account/*` request to this host, and the shell never sees these
 * paths — so adding a route here is a deploy of this app alone. That is the same
 * independence a document remote gets from its route descriptors, at a coarser grain: the
 * storefront knows the prefix and nothing else.
 *
 * `id` doubles as the chunk name, so each route's JavaScript is attributable in the bench
 * exactly the way a document route's is.
 */
export interface PageModule {
  Page: React.ComponentType<{ params: Record<string, string> }>;
  title: (params: Record<string, string>) => string;
}

export const ROUTES: readonly ZoneRoute<PageModule>[] = [
  {
    id: 'account.overview',
    path: '',
    load: () => import(/* webpackChunkName: "account-overview" */ './app/Overview'),
  },
  {
    id: 'account.orders',
    path: 'orders',
    load: () => import(/* webpackChunkName: "account-orders" */ './app/Orders'),
  },
  {
    id: 'account.order',
    path: 'orders/:id',
    load: () => import(/* webpackChunkName: "account-order" */ './app/OrderDetail'),
  },
  {
    id: 'account.profile',
    path: 'profile',
    load: () => import(/* webpackChunkName: "account-profile" */ './app/Profile'),
  },
];

export const BASE_PATH = '/my-account';
