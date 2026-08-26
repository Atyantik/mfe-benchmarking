/**
 * my-account server render.
 *
 * This host is a ZONE: client-routed inside `/my-account/*` (docs/navigation-zones.md). What
 * the server does is therefore narrower than on the storefront, and the boundary is the same
 * one D12 draws everywhere else:
 *
 *   SERVER  chrome, the account frame, and a correctly-sized skeleton for the route.
 *           Identical for every visitor, so the document stays shared-cacheable and the first
 *           paint has a real element instead of an empty box.
 *
 *   CLIENT  everything per-user, and every navigation after the first.
 *
 * It never server-renders an order. Doing so would make every response user-specific, destroy
 * shared caching, and put personalization on the TTFB path — the exact mistake already reversed
 * once for the cart.
 */
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { CART_STATE_GLOBAL } from '@mf-eval/contracts';
import type { SlotName } from '@mf-eval/svelte-contracts';
import {
  buildPreloadPlan,
  CHROME_EXPOSES,
  CHROME_REMOTE,
  fetchRegistry,
  loadChrome,
  loadRemotes,
  renderPreloadTags,
  SLOT_SOURCES,
  type UsedExposes,
} from '@mf-eval/shell-kit';
import { matchZoneRoute } from '@mf-eval/zone-router';

import Document from './Document.svelte';
import { BASE_PATH, ROUTES } from './routes.ts';
import { FALLBACK_SKELETON, SKELETONS } from './skeletons/index.ts';

export interface RenderInput {
  url: string;
  cohort: string;
  clientScript: string;
  shellStyles: string[];
  /**
   * The sign-in page, when the visitor is being asked to authenticate.
   *
   * Gating happens in the server before render is called — a redirect is cheaper than a render,
   * and it keeps "who may see this" in one place rather than scattered through components.
   */
  login?: { next: string; error?: string | undefined; email?: string | undefined };
  /**
   * Who is signed in, read from the request.
   *
   * The account host's documents are private by definition — behind a login, never indexed,
   * never shared between two people — so there is nothing to protect by pretending not to know.
   * Rendering the name server-side puts it in the first paint instead of a beat later, and it
   * tells the SPA who it is serving without the client re-deriving it from a cookie.
   *
   * The storefront does NOT do this, and must not: its documents are shared by a CDN across
   * every visitor. Same architecture, opposite decision, because the caching model differs.
   */
  viewer?: { name: string; initial: string; accountNumber: string } | null;
}

export interface RenderOutput {
  html: string;
  status: number;
  degraded: boolean;
  failures: { name: string; error: string }[];
  ssrMs: number;
  routeId: string | null;
  /** True when this response contains data specific to one visitor. Drives cache policy. */
  personalized: boolean;
}

const TITLES: Record<string, string> = {
  'account.overview': 'Overview',
  'account.orders': 'Orders',
  'account.order': 'Order',
  'account.profile': 'Profile & addresses',
};

export async function renderApp(input: RenderInput): Promise<RenderOutput> {
  const started = performance.now();

  const { registry: nodeRegistry, stale } = await fetchRegistry('node', input.cohort);
  const [{ slots, failures }, Chrome] = await Promise.all([
    // 'placeholder' — the server never renders the live cart, here or anywhere.
    loadRemotes(nodeRegistry.remotes, { variant: 'placeholder', routes: false }),
    loadChrome<Component>(nodeRegistry.remotes),
  ]);
  if (!Chrome) failures.push({ name: CHROME_REMOTE, error: 'chrome unavailable' });

  const pathname = new URL(input.url).pathname;
  const match = input.login ? null : matchZoneRoute(ROUTES, BASE_PATH, pathname);
  const routeId = match?.route.id ?? null;
  const status = input.login ? 200 : match ? 200 : 404;

  // The skeleton the client will replace. Same markup the client renders while loading, so the
  // handover is invisible and costs no layout shift.
  const Skeleton = routeId ? (SKELETONS[routeId] ?? FALLBACK_SKELETON) : null;

  const usedSlots = new Set<string>();
  const rendered = render(Document, {
    props: {
      slots,
      onUse: (n: SlotName) => usedSlots.add(n),
      Chrome,
      login: input.login,
      viewer: input.viewer ?? null,
      activeId: routeId ?? 'account.overview',
      Skeleton,
    },
  });
  const appHtml = rendered.body;

  /**
   * Behaviours this page rendered, read back out of the markup — the same mechanism the
   * storefront uses. Without it the shared header's signed-in label never attaches HERE, which
   * is the one page where a visitor most expects to see their own name.
   */
  const behaviors = [
    ...new Set([...appHtml.matchAll(/data-behavior="([^"]+)"/g)].flatMap((m) => m[1] ?? [])),
  ];

  const { registry: webRegistry } = await fetchRegistry('web', input.cohort);
  const needs: UsedExposes = {};
  const want = (remote: string, expose: string, runsOnClient: boolean) => {
    const need = (needs[remote] ??= {
      exposes: [],
      routeChunks: [],
      clientExposes: [],
    }) as Required<UsedExposes[string]>;
    if (!need.exposes.includes(expose)) need.exposes.push(expose);
    if (runsOnClient && !need.clientExposes.includes(expose)) need.clientExposes.push(expose);
  };
  // Chrome: CSS only for the header markup itself, which is never hydrated on either host.
  if (Chrome) for (const expose of CHROME_EXPOSES) want(CHROME_REMOTE, expose, false);
  // Behaviours ARE client code, and are the one thing chrome ships to the browser.
  for (const name of behaviors) {
    const [remote, file] = name.split('.');
    if (!remote || !file) continue;
    want(remote, `./behaviors/${file}`, true);
  }
  for (const src of SLOT_SOURCES) {
    if (!usedSlots.has(src.slot)) continue;
    // The placeholder is server markup (CSS only); the live component is client code. A
    // behaviour-enhanced slot has no live component, and claiming one would preload a module
    // that does not exist.
    want(src.remote, src.placeholderExpose, false);
    if (src.expose) want(src.remote, src.expose, true);
  }
  const plan = await buildPreloadPlan(webRegistry.remotes, needs);

  // See the storefront's ssr.ts: a behaviour-enhanced slot is not an island.
  const mountable = new Set(SLOT_SOURCES.filter((s) => s.module).map((s) => s.slot));
  const personalized = [...usedSlots].filter((s) => mountable.has(s as never)).map((slot) => ({ slot }));
  // The SPA is handed the viewer directly, so it knows who it is serving on its first render
  // rather than parsing a cookie and re-rendering.
  const bootstrap = {
    registry: webRegistry,
    cohort: input.cohort,
    personalized,
    behaviors,
    viewer: input.viewer ?? null,
  };
  const title = input.login
    ? 'Sign in · Northgate Industrial'
    : routeId
      ? `${TITLES[routeId] ?? 'My account'} · Northgate Industrial`
      : 'My account · Northgate Industrial';

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    // Authenticated, per-user, and of no use to a crawler. Said explicitly rather than left to
    // a robots.txt that nobody reviews.
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>${title}</title>` +
    rendered.head +
    input.shellStyles.map((href) => `<link rel="stylesheet" href="${href}">`).join('') +
    renderPreloadTags(plan) +
    `</head><body><div id="root">${appHtml}</div>` +
    `<script>window.${CART_STATE_GLOBAL}=${jsonScript(bootstrap)}</script>` +
    // Unlike a storefront page, this script is NOT optional: the zone's content is its job.
    (__MF_ESM__
      ? `<script type="module" src="${input.clientScript}"></script>`
      : `<script src="${input.clientScript}" defer></script>`) +
    `</body></html>`;

  return {
    html,
    status,
    degraded: stale,
    failures,
    ssrMs: performance.now() - started,
    routeId: input.login ? 'account.login' : routeId,
    personalized: Boolean(input.viewer),
  };
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
