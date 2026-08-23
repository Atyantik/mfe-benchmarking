/**
 * MPA server render.
 *
 * The rule that decides what happens where:
 *
 *   Anything that must be indexed, quoted by an answer engine, or counted toward Core
 *   Web Vitals is SERVER-RENDERED — page content, chrome, copy, links.
 *
 *   Anything personalized is CLIENT-RENDERED — the cart. It is per-user, so putting it in
 *   the HTML would make every response user-specific and unshareable by a CDN, and it is
 *   worthless to a crawler. Its state is recreated on the client from a cookie.
 *
 *   Personalized regions still get a SERVER-RENDERED PLACEHOLDER reserving their exact
 *   box, so mounting the live component moves nothing and CLS stays at zero.
 *
 * There is no client router and no route hydration. Page content is rendered once, on the
 * server, and never touched again.
 */
import { renderToString } from 'react-dom/server';
import { SlotProvider } from '@mf-eval/react-contracts';
import { CART_STATE_GLOBAL, type RouteDescriptor } from '@mf-eval/contracts';
import {
  buildPreloadPlan,
  fetchRegistry,
  loadRemotes,
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
  /** Personalized regions on this page — the only reason any JS is sent. */
  personalizedCount: number;
}

export async function renderApp(input: RenderInput): Promise<RenderOutput> {
  const started = performance.now();

  const { registry: nodeRegistry, stale } = await fetchRegistry('node', input.cohort);
  // 'placeholder' — the server never loads the live personalized components.
  const { routes: remoteRoutes, slots, failures } = await loadRemotes(
    nodeRegistry.remotes,
    'placeholder',
  );

  const pathname = new URL(input.url).pathname;
  const match = pathname === '/' ? null : matchDescriptors(remoteRoutes, pathname);

  let pageNode: React.ReactNode;
  let status = 200;
  let owner: string | undefined;
  let routeChunks: string[] = [];

  if (pathname === '/') {
    pageNode = <Home.Component />;
  } else if (!match) {
    status = 404;
    pageNode = <h1>Not found</h1>;
  } else {
    for (const r of match.chain) owner ??= routeOwner.get(r);
    routeChunks = match.chain
      .flatMap((r) => (r.id ? [r.id.replace(/\./g, '-')] : []));

    const mod = (await match.leaf.lazy?.()) as
      | {
          Component?: React.ComponentType<{
            data: unknown;
            params: Record<string, string | undefined>;
          }>;
          loader?: RouteDescriptor['loader'];
        }
      | undefined;
    const Page = mod?.Component;
    // The loader is exported by the lazy MODULE, not declared on the descriptor — React
    // Router's convention, which the remotes follow, so we look in the same place.
    const loader = mod?.loader ?? match.leaf.loader;

    if (!Page) {
      status = 500;
      pageNode = <h1>Route has no component</h1>;
    } else {
      let data: unknown;
      try {
        data = (await loader?.({ params: match.params, request: new Request(input.url) })) ?? null;
      } catch (err) {
        if (err instanceof Response) {
          return {
            html: '',
            status: err.status,
            degraded: stale,
            failures,
            ssrMs: performance.now() - started,
            personalizedCount: 0,
          };
        }
        throw err;
      }
      // Rendered once, server-side, never hydrated. `data-owner` is what the remote's
      // scoped stylesheet hangs off — without it the remote's CSS matches nothing.
      pageNode = (
        <div data-owner={owner}>
          <Page data={data} params={match.params} />
        </div>
      );
    }
  }

  // Which personalized regions this page actually rendered is OBSERVED during the render,
  // not declared up front: the header cart is on every page, the drawer only on detail.
  const usedSlots = new Set<string>();
  const appHtml = renderToString(
    <SlotProvider slots={slots} onUse={(n) => usedSlots.add(n)}>
      <Layout>{pageNode}</Layout>
    </SlotProvider>,
  );
  const personalized = [...usedSlots].map((slot) => ({ slot }));

  const { registry: webRegistry } = await fetchRegistry('web', input.cohort);
  const needs: UsedExposes = {};
  // scriptsNeeded: false — this page's content is server-rendered and never hydrated, so
  // its component JS can never run in the browser. Ship its CSS, not its code.
  if (owner) needs[owner] = { exposes: ['./routes'], routeChunks, scriptsNeeded: false };
  for (const src of SLOT_SOURCES) {
    if (!usedSlots.has(src.slot)) continue;
    const need = (needs[src.remote] ??= { exposes: [], routeChunks: [] });
    // Placeholder for the paint the server already produced; live component for the mount
    // the client is about to perform. Both are genuinely needed on this page.
    for (const e of [src.placeholderExpose, src.expose]) {
      if (!need.exposes.includes(e)) need.exposes.push(e);
    }
  }
  const plan = await buildPreloadPlan(webRegistry.remotes, needs);

  // No cart data here. The client recreates it from the cookie, which is why this HTML is
  // byte-identical for every visitor and can sit in a shared cache.
  const bootstrap = { registry: webRegistry, cohort: input.cohort, personalized };

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Reference Store</title>` +
    input.shellStyles.map((href) => `<link rel="stylesheet" href="${href}">`).join('') +
    // No personalized region means no script will ever execute on this page, so warming
    // one would be a forced download of something that cannot run. Stylesheets still matter.
    renderPreloadTags(
      personalized.length > 0 ? plan : { styles: plan.styles, scripts: [], modules: [] },
    ) +
    `</head><body><div id="root">${appHtml}</div>` +
    (personalized.length > 0
      ? `<script>window.${CART_STATE_GLOBAL}=${jsonScript(bootstrap)}</script>` +
        // A module script is deferred by default, so `defer` is redundant on that path
        // and invalid-looking; a classic script still needs it.
        (__MF_ESM__
          ? `<script type="module" src="${input.clientScript}"></script>`
          : `<script src="${input.clientScript}" defer></script>`)
      : '') +
    `</body></html>`;

  return {
    html,
    status,
    degraded: stale,
    failures,
    ssrMs: performance.now() - started,
    personalizedCount: personalized.length,
  };
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
