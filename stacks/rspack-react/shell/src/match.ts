import type { RouteDescriptor } from '@mf-eval/contracts';

export interface DescriptorMatch {
  /** Root-to-leaf chain of matched descriptors. */
  chain: RouteDescriptor[];
  leaf: RouteDescriptor;
  params: Record<string, string | undefined>;
}

/**
 * Route matching without a router library.
 *
 * ~40 lines instead of a router library. It runs on the SERVER only — the browser never
 * needs route matching, because by the time a document is delivered the server has
 * already decided what the page is. Measured before it was removed, a client router cost
 * 59.3 kB gzip on every page and executed 12% of itself.
 */
/** How many `:param` segments a route declares. Fewer is more specific. */
function dynamicSegments(route: RouteDescriptor): number {
  return (route.path ?? '').split('/').filter((s) => s.startsWith(':')).length;
}

export function matchDescriptors(
  routes: RouteDescriptor[],
  pathname: string,
): DescriptorMatch | null {
  const segments = pathname.split('/').filter(Boolean);

  const walk = (
    candidates: RouteDescriptor[],
    rest: string[],
    chain: RouteDescriptor[],
    params: Record<string, string | undefined>,
  ): DescriptorMatch | null => {
    // Literal segments before dynamic ones, regardless of declaration order. Otherwise
    // /product/new renders the detail page for a product called "new" — and which one
    // wins would depend on the order a remote happened to list its routes in.
    const ordered = [...candidates].sort(
      (a, b) => dynamicSegments(a) - dynamicSegments(b),
    );
    for (const route of ordered) {
      const own = (route.path ?? '').split('/').filter(Boolean);
      if (own.length > rest.length) continue;

      const nextParams = { ...params };
      let ok = true;
      for (const [i, pattern] of own.entries()) {
        const actual = rest[i];
        if (actual === undefined) { ok = false; break; }
        if (pattern.startsWith(':')) nextParams[pattern.slice(1)] = actual;
        else if (pattern !== actual) { ok = false; break; }
      }
      if (!ok) continue;

      const remaining = rest.slice(own.length);
      const nextChain = [...chain, route];

      if (route.children?.length) {
        const child = walk(route.children, remaining, nextChain, nextParams);
        if (child) return child;
        continue;
      }
      if (remaining.length === 0 && (route.index || own.length > 0)) {
        return { chain: nextChain, leaf: route, params: nextParams };
      }
    }
    // An `index` child consumes zero segments.
    if (rest.length === 0) {
      const index = candidates.find((r) => r.index);
      if (index) return { chain: [...chain, index], leaf: index, params };
    }
    return null;
  };

  return walk(routes, segments, [], {});
}
