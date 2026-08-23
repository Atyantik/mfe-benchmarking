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
        interactive: true,
        index: true,
        lazy: () => import(/* webpackChunkName: "product-list" */ './List'),
      },
      {
        id: 'product.detail',
        interactive: true,
        path: ':id',
        lazy: () => import(/* webpackChunkName: "product-detail" */ './Detail'),
      },
    ],
  },
];
