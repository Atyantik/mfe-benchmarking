/**
 * @mf-eval/zone-router — client routing inside ONE host's URL prefix.
 *
 * The site is MPA. A zone is the exception: one host owns a prefix (`/my-account`) and
 * routes inside it without a document load, because it is an application rather than a
 * set of documents (docs/navigation-zones.md, decision D14).
 *
 * This is platform code, not one team's code. Eight teams writing eight click-interceptors
 * would produce eight subtly different answers to "what counts as an internal link", and
 * the wrong answer either breaks navigation out of the zone or silently stops the browser
 * measuring the navigation at all.
 *
 * It is deliberately not React Router. This repo measured that at 59 kB gzip with 12% of it
 * executed, to do what the 120 lines below do — and the zone already pays for a framework
 * and the federation runtime, so the router is the one cost still worth refusing.
 *
 * Two rules it exists to enforce:
 *
 *  1. A link OUT of the zone is never intercepted. Crossing a host boundary is a real
 *     document navigation; there is nothing to soft-navigate to.
 *  2. Every navigation must paint. Chrome only records a `soft-navigation` entry when a
 *     user action changes the URL AND produces a contentful paint, so a route that swaps
 *     nothing is invisible to Core Web Vitals. See docs/constraints.md §14.
 */

export interface ZoneRoute<T = unknown> {
  /** Stable id, also the chunk name — same convention as a document route descriptor. */
  id: string;
  /** Relative to basePath. `''` is the index. Segments may be dynamic: `orders/:id`. */
  path: string;
  load: () => Promise<T>;
}

export interface ZoneMatch<T = unknown> {
  route: ZoneRoute<T>;
  params: Record<string, string>;
  pathname: string;
}

const clean = (p: string) => p.replace(/\/+/g, '/').replace(/\/$/, '');

/** Literal segments beat dynamic ones, so `orders/new` never resolves to `orders/:id`. */
function specificity(route: ZoneRoute<never>): number {
  return route.path.split('/').filter((s) => s.startsWith(':')).length;
}

export function matchZoneRoute<T>(
  routes: readonly ZoneRoute<T>[],
  basePath: string,
  pathname: string,
): ZoneMatch<T> | null {
  const base = clean(basePath);
  const full = clean(pathname);
  if (full !== base && !full.startsWith(`${base}/`)) return null;
  const rest = full.slice(base.length).replace(/^\//, '');
  const parts = rest === '' ? [] : rest.split('/');

  for (const route of [...routes].sort((a, b) => specificity(a as never) - specificity(b as never))) {
    const want = route.path === '' ? [] : route.path.split('/');
    if (want.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (const [i, segment] of want.entries()) {
      const actual = parts[i] ?? '';
      if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(actual);
      else if (segment !== actual) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params, pathname: full };
  }
  return null;
}

export interface ZoneRouter<T> {
  readonly basePath: string;
  current(): ZoneMatch<T> | null;
  subscribe(fn: (match: ZoneMatch<T> | null) => void): () => void;
  /** Programmatic navigation. Same rules as a click. */
  navigate(to: string, options?: { replace?: boolean }): void;
  stop(): void;
}

export function createZoneRouter<T>(options: {
  basePath: string;
  routes: readonly ZoneRoute<T>[];
}): ZoneRouter<T> {
  const { basePath, routes } = options;
  const listeners = new Set<(m: ZoneMatch<T> | null) => void>();
  let match = matchZoneRoute(routes, basePath, location.pathname);

  const emit = () => {
    match = matchZoneRoute(routes, basePath, location.pathname);
    for (const fn of listeners) fn(match);
  };

  const go = (url: string, replace = false) => {
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    emit();
  };

  const onClick = (event: MouseEvent) => {
    // Everything the browser treats as "not a plain left click" stays the browser's.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as Element | null)?.closest('a');
    if (!anchor) return;
    // download, target=_blank, rel=external, mailto: — all real navigations.
    if (anchor.hasAttribute('download') || anchor.hasAttribute('data-no-zone')) return;
    if (anchor.target && anchor.target !== '_self') return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    // Rule 1: out of the zone is a document load. Do not touch it.
    if (!matchZoneRoute(routes, basePath, url.pathname)) return;

    event.preventDefault();
    if (url.href === location.href) return;
    go(url.pathname + url.search + url.hash);
  };

  const onPop = () => { emit(); };

  document.addEventListener('click', onClick);
  window.addEventListener('popstate', onPop);

  return {
    basePath,
    current: () => match,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    navigate(to, opts) { go(to, opts?.replace); },
    stop() {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
      listeners.clear();
    },
  };
}
