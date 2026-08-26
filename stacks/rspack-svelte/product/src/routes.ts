// The remote's stylesheet belongs to this expose. Imported here rather than in the client
// entry so it appears in ./routes' manifest assets — the shell injects a remote's CSS only
// when that remote actually renders the page.
import './styles.css';

import type { RouteDescriptor } from '@mf-eval/contracts';

/**
 * The product team owns /product/* outright. Adding /product/:id/reviews tomorrow is a product
 * deploy — the shell never enumerates these paths (docs/topology.md § Rule 1).
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
        lazy: () => import(/* webpackChunkName: "product-list" */ './List.route.ts'),
      },
      {
        id: 'product.detail',
        interactive: false,
        path: ':id',
        lazy: () => import(/* webpackChunkName: "product-detail" */ './Detail.route.ts'),
      },
    ],
  },
];
