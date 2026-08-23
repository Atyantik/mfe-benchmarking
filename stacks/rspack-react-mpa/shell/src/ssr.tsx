/**
 * MPA server render.
 *
 * Differences from the SPA shell, and ONLY these — everything else (registry, remote
 * loading, asset injection, cart cookie) is the identical @mf-eval/shell-kit code, so a
 * comparison between the two measures the navigation model and nothing else:
 *
 *   1. No router. A 64-line matcher runs on the server; the browser gets none of it.
 *   2. Interactivity is islands. Only routes marked `interactive` hydrate, and only
 *      that subtree — not the document.
 *   3. A page with no interactive island emits NO client script at all. Zero JS.
 */
import { renderToString } from 'react-dom/server';
import { CartProvider, SlotProvider } from '@mf-eval/react-contracts';
import {
  createCartStore,
  serializeCartState,
  CART_STATE_GLOBAL,
  type RouteDescriptor,
} from '@mf-eval/contracts';
import {
  buildPreloadPlan,
  fetchRegistry,
  loadRemotes,
  readCartCookie,
  renderPreloadTags,
  routeOwner,
  SLOT_SOURCES,
  type UsedExposes,
} from '@mf-eval/shell-kit';

import { Layout } from './Layout';
import * as Home from './Home';
import { matchDescriptors } from './match';

export interface RenderInput {
  url: string;
  cookie?: string | null;
  cohort: string;
  clientScript: string;
  shellStyles: string[];
}

export interface RenderOutput {
  html: string;
  status: number;
  degraded: boolean;
  failures: { name: string; error: string }[];
  ssrMs: number;
  /** Reported so the bench can prove a zero-JS page really shipped zero JS. */
  islandCount: number;
}

interface IslandSpec {
  kind: 'route' | 'slot';
  remote?: string;
  route?: string;
  slot?: string;
  props?: unknown;
}

export async function renderApp(input: RenderInput): Promise<RenderOutput> {
  const started = performance.now();

  const { registry: nodeRegistry, stale } = await fetchRegistry('node', input.cohort);
  const { routes: remoteRoutes, slots, failures } = await loadRemotes(nodeRegistry.remotes);

  // Per request — a module-global store would leak one user's cart into another's response.
  const store = createCartStore(readCartCookie(input.cookie));

  const pathname = new URL(input.url).pathname;
  const match = pathname === '/' ? null : matchDescriptors(remoteRoutes, pathname);

  let pageNode: React.ReactNode;
  let status = 200;
  const islands: IslandSpec[] = [];
  let owner: string | undefined;
  let routeChunks: string[] = [];

  if (pathname === '/') {
    pageNode = <Home.Component />;
  } else if (!match) {
    status = 404;
    pageNode = <h1>Not found</h1>;
  } else {
    for (const r of match.chain) owner ??= routeOwner.get(r as object);
    routeChunks = match.chain.map((r) => r.id).filter(Boolean).map((id) => (id as string).replace(/\./g, '-'));

    const mod = (await match.leaf.lazy?.()) as
      | {
          Component?: React.ComponentType<{ data: unknown; params: Record<string, string | undefined> }>;
          loader?: RouteDescriptor['loader'];
        }
      | undefined;
    const Page = mod?.Component;
    // The loader is exported by the lazy MODULE, not declared on the descriptor — that
    // is React Router's convention and the remotes follow it, so the MPA shell has to
    // look in the same place rather than only at the descriptor.
    const loader = mod?.loader ?? match.leaf.loader;
    if (!Page) {
      status = 500;
      pageNode = <h1>Route has no component</h1>;
    } else {
      let data: unknown = null;
      try {
        data = (await loader?.({ params: match.params, request: new Request(input.url) })) ?? null;
      } catch (err) {
        if (err instanceof Response) {
          return { html: '', status: err.status, degraded: stale, failures, ssrMs: performance.now() - started, islandCount: 0 };
        }
        throw err;
      }

      const page = <Page data={data} params={match.params} />;
      if (match.leaf.interactive) {
        islands.push({ kind: 'route', remote: owner, route: match.leaf.id, props: { data, params: match.params } });
        pageNode = <div data-island-index={islands.length - 1}>{page}</div>;
      } else {
        // Static route: rendered, never hydrated, its JS never referenced.
        pageNode = page;
      }
    }
  }

  // The header cart only needs to be live on pages where the cart can change.
  const interactivePage = islands.length > 0;
  const MiniCart = slots['cart.mini'];
  let miniCartNode: React.ReactNode = MiniCart ? <MiniCart /> : null;
  if (MiniCart && interactivePage) {
    islands.push({ kind: 'slot', slot: 'cart.mini' });
    miniCartNode = <div data-island-index={islands.length - 1}><MiniCart /></div>;
  }

  // MiniCart is rendered directly rather than through <Slot>, so the Slot recorder never
  // sees it. Record it explicitly or the header renders unstyled.
  const usedSlots = new Set<string>();
  if (MiniCart) usedSlots.add('cart.mini');
  const appHtml = renderToString(
    <CartProvider store={store}>
      <SlotProvider slots={slots} onUse={(n) => usedSlots.add(n)}>
        <Layout miniCart={miniCartNode}>{pageNode}</Layout>
      </SlotProvider>
    </CartProvider>,
  );

  const { registry: webRegistry } = await fetchRegistry('web', input.cohort);
  const needs: UsedExposes = {};
  if (owner) needs[owner] = { exposes: ['./routes'], routeChunks };
  for (const src of SLOT_SOURCES) {
    if (!usedSlots.has(src.slot)) continue;
    const need = (needs[src.remote] ??= { exposes: [], routeChunks: [] });
    if (!need.exposes.includes(src.expose)) need.exposes.push(src.expose);
  }
  // No router means no route table to build, so remotes that do not appear on THIS page
  // are never touched. In the SPA shell every route remote's descriptor is on the
  // critical path of every page; here it is not. That is the structural difference.
  const plan = await buildPreloadPlan(webRegistry.remotes, needs);

  const bootstrap = {
    registry: webRegistry,
    cohort: input.cohort,
    cart: JSON.parse(serializeCartState(store.getSnapshot())),
    islands,
  };

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Reference Store</title>` +
    input.shellStyles.map((href) => `<link rel="stylesheet" href="${href}">`).join('') +
    // No islands => no script will ever run on this page, so preloading one is a forced
    // download of something that cannot execute. Stylesheets still matter.
    renderPreloadTags(islands.length > 0 ? plan : { styles: plan.styles, scripts: [] }) +
    // Make the next document ready before the click lands. Pure browser feature: this is
    // what buys back the "SPA feels faster" argument without shipping a router.
    `<script type="speculationrules">${JSON.stringify({
      prerender: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }],
    })}</script>` +
    `</head><body><div id="root">${appHtml}</div>` +
    (islands.length > 0
      ? `<script>window.${CART_STATE_GLOBAL}=${jsonScript(bootstrap)}</script>` +
        `<script src="${input.clientScript}" defer></script>`
      : // Nothing on this page is interactive, so nothing is shipped. Not deferred,
        // not async — absent.
        '') +
    `</body></html>`;

  return { html, status, degraded: stale, failures, ssrMs: performance.now() - started, islandCount: islands.length };
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
