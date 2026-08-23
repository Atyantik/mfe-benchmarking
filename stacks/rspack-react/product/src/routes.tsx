import type { RouteDescriptor } from '@mf-eval/contracts';

/**
 * The product team owns /product/* outright. Adding /product/:id/reviews tomorrow is
 * a product deploy — the shell never enumerates these paths (docs/topology.md § Rule 1).
 */
export const routes: RouteDescriptor[] = [
  {
    path: 'product',
    children: [
      {
        id: 'product.list',
        // Cart state is a server-owned cookie, so this page needs no client JS at all.
        interactive: false,
        index: true,
        lazy: () => import(/* webpackChunkName: "product-list" */ './List'),
      },
      {
        id: 'product.detail',
        // Cart state is a server-owned cookie, so this page needs no client JS at all.
        interactive: false,
        path: ':id',
        lazy: () => import(/* webpackChunkName: "product-detail" */ './Detail'),
      },
    ],
  },
];
