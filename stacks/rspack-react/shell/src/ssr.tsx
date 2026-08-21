/**
 * The server render.
 *
 * Reached only through the async boundary in entry.server.tsx — this module statically
 * imports React and other shared deps, so importing it from the entry directly would
 * trip MF's synchronous share resolution (docs/spike-rspack-ssr.md § trap 4).
 */
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { createCartStore, serializeCartState, CART_STATE_GLOBAL } from '@mf-eval/contracts';

import { App } from './App';
import { buildPreloadPlan, renderPreloadTags } from './assets';
import { readCartCookie } from './cart-cookie';
import { fetchRegistry } from './registry-client';
import { loadRemotes } from './remotes';
import { buildRoutes, resolveLazyRoutes } from './router';

export interface RenderInput {
  url: string;
  cookie?: string | null;
  cohort: string;
  /** Client bundle URL, injected by the server which knows the built filename. */
  clientScript: string;
  shellStyles: string[];
}

export interface RenderOutput {
  html: string;
  status: number;
  /** True when the registry was unreachable and a stale snapshot was used. */
  degraded: boolean;
  failures: { name: string; error: string }[];
  ssrMs: number;
}

/** Which exposes each render touched, so we preload those and not everything. */
const USED_EXPOSES: Record<string, string[]> = {
  faq: ['./routes'],
  product: ['./routes'],
  cart: ['./MiniCart', './CartDrawer'],
};

export async function renderApp(input: RenderInput): Promise<RenderOutput> {
  const started = performance.now();

  // The server consumes NODE manifests; the browser will consume WEB manifests. They
  // are different artifacts and must never share a URL.
  const { registry: nodeRegistry, stale } = await fetchRegistry('node', input.cohort);
  const { routes: remoteRoutes, slots, failures } = await loadRemotes(nodeRegistry.remotes);

  // Per request. A module-global store would leak one user's cart into another user's
  // response — the sharpest correctness trap in this architecture.
  const store = createCartStore(readCartCookie(input.cookie));

  const routes = buildRoutes(remoteRoutes);
  // Must happen BEFORE createStaticHandler — see resolveLazyRoutes for why.
  await resolveLazyRoutes(routes, input.url);
  const handler = createStaticHandler(routes);
  const request = new Request(input.url, {
    headers: input.cookie ? { cookie: input.cookie } : undefined,
  });
  const context = await handler.query(request);

  if (context instanceof Response) {
    // A loader redirected or threw a Response — hand it back untouched.
    return {
      html: '',
      status: context.status,
      degraded: stale,
      failures,
      ssrMs: performance.now() - started,
    };
  }

  const router = createStaticRouter(routes, context);
  const appHtml = renderToString(
    <App store={store} slots={slots}>
      <StaticRouterProvider router={router} context={context} />
    </App>,
  );

  // Preload from the WEB registry so the browser does not rediscover the chain.
  const { registry: webRegistry } = await fetchRegistry('web', input.cohort);
  const plan = await buildPreloadPlan(webRegistry.remotes, USED_EXPOSES);

  const bootstrap = {
    // Pinned so the client loads EXACTLY what the server rendered against. Re-querying
    // the registry could return a newer set and hydrate against a different build.
    registry: webRegistry,
    cohort: input.cohort,
    cart: JSON.parse(serializeCartState(store.getSnapshot())),
  };

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Reference Store</title>` +
    input.shellStyles.map((href) => `<link rel="stylesheet" href="${href}">`).join('') +
    renderPreloadTags(plan) +
    `</head><body><div id="root">${appHtml}</div>` +
    `<script>window.${CART_STATE_GLOBAL}=${jsonScript(bootstrap)}</script>` +
    `<script src="${input.clientScript}" defer></script>` +
    `</body></html>`;

  return {
    html,
    status: context.statusCode ?? 200,
    degraded: stale,
    failures,
    ssrMs: performance.now() - started,
  };
}

/** `</script>` inside JSON would close the tag early and inject markup. */
function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
