/**
 * The server render.
 *
 * Reached only through the async boundary in entry.server.tsx — this module statically
 * imports React and other shared deps, so importing it from the entry directly would
 * trip MF's synchronous share resolution (docs/spike-rspack-ssr.md § trap 4).
 */
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, matchRoutes, StaticRouterProvider } from 'react-router';
import { createCartStore, serializeCartState, CART_STATE_GLOBAL } from '@mf-eval/contracts';

import { App } from './App';
import { buildPreloadPlan, renderPreloadTags, type UsedExposes } from '@mf-eval/shell-kit';
import { readCartCookie } from '@mf-eval/shell-kit';
import { fetchRegistry } from '@mf-eval/shell-kit';
import { loadRemotes, routeOwner, SLOT_SOURCES } from '@mf-eval/shell-kit';
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

export async function renderApp(input: RenderInput): Promise<RenderOutput> {
  const started = performance.now();

  // The server consumes NODE manifests; the browser will consume WEB manifests. They
  // are different artifacts and must never share a URL.
  const { registry: nodeRegistry, stale } = await fetchRegistry('node', input.cohort);
  const { routes: remoteRoutes, slots, failures } = await loadRemotes(nodeRegistry.remotes);
  for (const e of nodeRegistry.remotes) if (e.kind === 'route') allRouteOwners.add(e.name);

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

  // Observe, do not guess. Which slots render depends on the page: MiniCart is on every
  // page, CartDrawer only on product detail.
  const usedSlots = new Set<string>();
  const appHtml = renderToString(
    <App store={store} slots={slots} onSlotUse={(n) => usedSlots.add(n)}>
      <StaticRouterProvider router={router} context={context} />
    </App>,
  );

  // Preload from the WEB registry so the browser does not rediscover the chain.
  const { registry: webRegistry } = await fetchRegistry('web', input.cohort);
  const plan = await buildPreloadPlan(
    webRegistry.remotes,
    computeNeeds(routes, input.url, usedSlots),
  );

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

/**
 * Exactly what this render needs from each remote — no more.
 *
 * Every route remote contributes its `./routes` descriptor because the shell merges all
 * of them into one router on every page (a structural cost of this topology). But the
 * page CONTENT is attributed per route via the chunk name, so /faq pulls faq-index.css
 * and neither faq-contact.css nor anything at all from product.
 */
function computeNeeds(
  routes: Parameters<typeof matchRoutes>[0],
  url: string,
  usedSlots: Set<string>,
): UsedExposes {
  const needs: UsedExposes = {};

  // Every route remote ships its descriptor on every page — the shell merges all of
  // them into one router. That is a real structural cost of this topology, and it is
  // why these are tiny modules that must never import a page component.
  for (const owner of allRouteOwners) {
    needs[owner] = { exposes: ['./routes'], routeChunks: [] };
  }

  // matchRoutes returns the whole chain: [shell layout, remote top-level, leaf].
  // The owner is recorded on the remote's top-level descriptor; the id is on the leaf.
  const matches = matchRoutes(routes, new URL(url).pathname) ?? [];
  let owner: string | undefined;
  const chunks: string[] = [];
  for (const m of matches) {
    owner ??= routeOwner.get(m.route as object);
    const id = (m.route as { id?: string }).id;
    if (id) chunks.push(id.replace(/\./g, '-'));
  }
  if (owner) {
    needs[owner] = { exposes: ['./routes'], routeChunks: chunks };
  }

  for (const src of SLOT_SOURCES) {
    if (!usedSlots.has(src.slot)) continue;
    const need = (needs[src.remote] ??= { exposes: [], routeChunks: [] });
    if (!need.exposes.includes(src.expose)) need.exposes.push(src.expose);
  }

  return needs;
}

/** Populated as remotes load; route remotes always contribute their descriptor. */
const allRouteOwners = new Set<string>();

/** `</script>` inside JSON would close the tag early and inject markup. */
function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
