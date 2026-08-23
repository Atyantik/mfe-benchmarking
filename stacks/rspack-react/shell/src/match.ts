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
 * ~40 lines replaces react-router on the client entirely — 59.3 kB gzip in the SPA
 * build. It runs on the server only; the browser never needs it, because in an MPA the
 * server has already decided what the page is.
 */
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
    for (const route of candidates) {
      const own = (route.path ?? '').split('/').filter(Boolean);
      if (own.length > rest.length) continue;

      const nextParams = { ...params };
      let ok = true;
      for (let i = 0; i < own.length; i += 1) {
        const pattern = own[i] as string;
        const actual = rest[i] as string;
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
