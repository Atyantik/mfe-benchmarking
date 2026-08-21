import { matchRoutes, type RouteObject } from 'react-router';
import type { RouteDescriptor } from '@mf-eval/contracts';
import * as Layout from './Layout';
import * as Home from './Home';

/**
 * ONE router for the whole site. This is the decision that makes SSR possible at all:
 * a remote shipping its own router would be Bridge-shaped, and Bridge cannot
 * server-render (docs/constraints.md §1).
 *
 * Remotes contribute descriptors; the shell owns the tree they hang from.
 */
export function buildRoutes(remoteRoutes: RouteDescriptor[]): RouteObject[] {
  return [
    {
      path: '/',
      Component: Layout.Component,
      ErrorBoundary: Layout.ErrorBoundary,
      children: [
        { index: true, Component: Home.Component },
        ...(remoteRoutes as RouteObject[]),
      ],
    },
  ];
}

/**
 * Resolve `lazy` on the routes that match this URL, in place.
 *
 * Required for SSR. `createStaticHandler` converts the route array into its OWN
 * internal data-route copy, so any `lazy` it resolves is invisible to the array we
 * later hand to `createStaticRouter`. The result is a tree whose matched route still
 * has no Component, and React Router renders a HydrateFallback — i.e. an empty page,
 * with the only clue being a console line about a missing HydrateFallback.
 *
 * Resolving only MATCHED routes keeps this O(depth), not O(site).
 */
export async function resolveLazyRoutes(routes: RouteObject[], url: string): Promise<void> {
  const matches = matchRoutes(routes, new URL(url).pathname) ?? [];
  await Promise.all(
    matches.map(async ({ route }) => {
      const lazy = (route as RouteObject & { lazy?: () => Promise<unknown> }).lazy;
      if (typeof lazy !== 'function') return;
      const mod = (await lazy()) as Partial<RouteObject>;
      Object.assign(route, mod);
      delete (route as { lazy?: unknown }).lazy;
    }),
  );
}
