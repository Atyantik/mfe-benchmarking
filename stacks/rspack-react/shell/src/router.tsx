import { matchRoutes, useLoaderData, useParams, type RouteObject } from 'react-router';
import type { RouteDescriptor } from '@mf-eval/contracts';
import * as Layout from './Layout';
import * as Home from './Home';
import { routeOwner } from '@mf-eval/shell-kit';

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
        ...remoteRoutes.map(adapt),
      ],
    },
  ];
}

/**
 * Bridge the router to the remote's prop-based contract.
 *
 * Remotes take data as props and never import react-router — otherwise a remote could
 * only be consumed by a host on the same router version, and the SAME remote could not
 * also be rendered by the MPA shell (which has no router at all). Adapting here keeps
 * that coupling inside the shell, where it belongs.
 */
function adapt(descriptor: RouteDescriptor): RouteObject {
  const { lazy, children, ...rest } = descriptor;
  const out = { ...rest } as RouteObject;
  // Adapting produces a NEW object, so the descriptor -> owning-remote mapping must be
  // carried across or per-route asset attribution silently stops working: matchRoutes
  // returns adapted objects, and a WeakMap keyed on the originals never hits.
  const owner = routeOwner.get(descriptor as object);
  if (owner) routeOwner.set(out as object, owner);
  if (children) (out as { children?: RouteObject[] }).children = children.map(adapt);
  if (typeof lazy === 'function') {
    (out as { lazy?: () => Promise<unknown> }).lazy = async () => {
      const mod = (await lazy()) as { Component?: React.ComponentType<never> };
      const Page = mod.Component;
      if (!Page) return mod;
      const Adapted = () => {
        const data = useLoaderData();
        const params = useParams();
        return <Page {...({ data, params } as never)} />;
      };
      return { ...mod, Component: Adapted };
    };
  }
  return out;
}

/**
 * Resolve `lazy` on the routes that match this URL, in place.
 *
 * Required for SSR *and* for hydration. `createStaticHandler` converts the route array
 * into its OWN internal data-route copy, so any `lazy` it resolves is invisible to the
 * array we later hand to `createStaticRouter`. The result is a tree whose matched route
 * has no Component, and React Router renders a HydrateFallback — an empty page, whose
 * only clue is one console line about a missing HydrateFallback.
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
