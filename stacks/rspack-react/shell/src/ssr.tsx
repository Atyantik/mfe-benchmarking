import type { ComponentType } from 'react';
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
  CHROME_EXPOSES,
  CHROME_REMOTE,
  fetchRegistry,
  loadChrome,
  loadRemotes,
  renderPreloadTags,
  routeOwner,
  SLOT_SOURCES,
  type UsedExposes,
} from '@mf-eval/shell-kit';

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
  /** Personalized regions on this page. */
  personalizedCount: number;
  /** Behaviours attached to server-rendered markup on this page. */
  behaviorCount: number;
}

export async function renderApp(input: RenderInput): Promise<RenderOutput> {
  const started = performance.now();

  const { registry: nodeRegistry, stale } = await fetchRegistry('node', input.cohort);
  // 'placeholder' — the server never loads the live personalized components.
  const [{ routes: remoteRoutes, slots, failures }, Chrome] = await Promise.all([
    loadRemotes(nodeRegistry.remotes, { variant: 'placeholder', routes: true }),
    loadChrome<ComponentType<Record<string, unknown>>>(nodeRegistry.remotes),
  ]);
  if (!Chrome) failures.push({ name: CHROME_REMOTE, error: 'chrome unavailable' });

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
            behaviorCount: 0,
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
  // The page frame belongs to the HOST; chrome contributes a header and a footer as
  // siblings of the content. That keeps every remote's markup — and therefore its scoped
  // stylesheet — inside its own subtree.
  const appHtml = renderToString(
    <SlotProvider slots={slots} onUse={(n) => usedSlots.add(n)}>
      <div className="flex min-h-screen flex-col bg-page">
        {Chrome ? <Chrome.Header host="storefront" /> : null}
        <main id="main" className="flex-1">
          {pageNode}
        </main>
        {Chrome ? <Chrome.Footer /> : null}
      </div>
    </SlotProvider>,
  );
  // Only slots with a live component count as "personalized" for the client: a
  // behaviour-enhanced slot needs no mount, and listing it would make the shell load react-dom
  // on every page that shows a cart badge — which is exactly what this change removes.
  const mountable = new Set(SLOT_SOURCES.filter((s) => s.module).map((s) => s.slot));
  const personalized = [...usedSlots].filter((s) => mountable.has(s as never)).map((slot) => ({ slot }));

  // Which behaviours this page actually rendered, read back out of the markup.
  //
  // Scanning the HTML rather than asking components to declare themselves means an author
  // adds `data-behavior` and is done — there is no second place to register it, and so no
  // second place to forget.
  const behaviors = [
    ...new Set([...appHtml.matchAll(/data-behavior="([^"]+)"/g)].flatMap((m) => m[1] ?? [])),
  ];

  const { registry: webRegistry } = await fetchRegistry('web', input.cohort);
  const needs: UsedExposes = {};

  // A behaviour is named `<remote>.<file>` and lives at `<remote>/behaviors/<file>`, so the
  // markup alone is enough to work out which chunk to warm — and only for this page.
  const needFor = (remote: string): Required<UsedExposes[string]> =>
    (needs[remote] ??= { exposes: [], routeChunks: [], clientExposes: [] }) as Required<
      UsedExposes[string]
    >;
  const want = (remote: string, expose: string, runsOnClient: boolean) => {
    const need = needFor(remote);
    if (!need.exposes.includes(expose)) need.exposes.push(expose);
    if (runsOnClient && !need.clientExposes.includes(expose)) need.clientExposes.push(expose);
  };

  for (const name of behaviors) {
    const [remote, file] = name.split('.');
    if (!remote || !file) continue;
    // A behaviour is the one thing a route remote ships that DOES run in the browser.
    want(remote, `./behaviors/${file}`, true);
  }
  // The page's own code is absent from clientExposes: it is server-rendered and never
  // hydrated, so it can never execute. Ship its CSS, not its code.
  if (owner) {
    want(owner, './routes', false);
    const need = needFor(owner);
    for (const chunk of routeChunks) {
      if (!need.routeChunks.includes(chunk)) need.routeChunks.push(chunk);
    }
  }
  // Chrome is on every page. Its CSS is needed because the server-rendered header uses
  // it; its JS never is, because that header is never hydrated.
  if (Chrome) for (const expose of CHROME_EXPOSES) want(CHROME_REMOTE, expose, false);
  for (const src of SLOT_SOURCES) {
    if (!usedSlots.has(src.slot)) continue;
    // Placeholder for the paint the server already produced; live component for the mount
    // the client is about to perform. Both are genuinely needed on this page.
    // The placeholder is server markup (CSS only); the live component is client code. A
    // behaviour-enhanced slot has no live component, and claiming one would preload a module
    // that does not exist.
    want(src.remote, src.placeholderExpose, false);
    if (src.expose) want(src.remote, src.expose, true);
  }
  const plan = await buildPreloadPlan(webRegistry.remotes, needs);

  // A page with neither a personalized region nor a behaviour gets no script at all —
  // not deferred, not async, absent.
  const needsClient = personalized.length > 0 || behaviors.length > 0;

  // No cart data here. The client recreates it from the cookie, which is why this HTML is
  // byte-identical for every visitor and can sit in a shared cache.
  const bootstrap = { registry: webRegistry, cohort: input.cohort, personalized, behaviors };

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Reference Store</title>` +
    input.shellStyles.map((href) => `<link rel="stylesheet" href="${href}">`).join('') +
    // No personalized region means no script will ever execute on this page, so warming
    // one would be a forced download of something that cannot run. Stylesheets still matter.
    renderPreloadTags(
      needsClient ? plan : { styles: plan.styles, scripts: [], modules: [] },
    ) +
    `</head><body><div id="root">${appHtml}</div>` +
    (needsClient
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
    behaviorCount: behaviors.length,
  };
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
