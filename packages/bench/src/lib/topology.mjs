import { ACCOUNT } from '../../../contracts/src/testids.ts';

/**
 * The topology, in one place.
 *
 * Every suite used to carry its own `{ 3100: 'shell', 3101: 'faq', ... }` map — four copies
 * of the same knowledge. When the site grew a second host and a chrome remote, all four went
 * stale at once and every one of them kept passing: an unrecognised origin fell through to
 * `'other'`, so assets from two whole applications were being attributed to nothing and
 * every isolation claim was quietly weaker than it read.
 *
 * That is the failure mode this file exists to remove. Adding a host, a remote or a route is
 * ONE edit here, and an origin nobody declared is a hard failure rather than a shrug.
 */

/**
 * Which implementation the suites are pointed at.
 *
 * The whole purpose of this repo is to run the SAME suites against `vite-solid`,
 * `rspack-preact` and whatever comes next, and compare. That only works if the stack is a
 * parameter. It was a constant — every app directory below read `stacks/rspack-react/...`,
 * along with the shell bundle path in `independence.mjs` — which meant a second stack could
 * not be measured without editing the measurement code, and code edited per stack is code
 * that measures the edit.
 *
 * Directory layout is therefore part of the frozen spec: `stacks/<stack>/<dir>`, with the
 * same `dir` names in every stack. See `docs/porting-a-stack.md`.
 */
export const STACK = process.env.MF_STACK ?? 'rspack-react';

/** Resolve an app's source directory within the stack under measurement. */
export const appDir = (name) => `stacks/${STACK}/${name}`;

/** The public origin. Both hosts are behind it; a browser never sees anything else. */
export const EDGE = process.env.MF_BASE ?? 'http://localhost:3100';

/**
 * Applications that serve documents. Each owns a URL prefix at the edge.
 *
 * `nav` is the navigation model, and it decides how the page is MEASURED:
 * a document host reports one set of Core Web Vitals per navigation; a zone host reports
 * one per soft navigation, which is a different measurement and must never be averaged with
 * the first (docs/constraints.md §14).
 */
export const HOSTS = [
  {
    name: 'storefront',
    port: 3110,
    prefix: '/',
    nav: 'document',
    dir: appDir('shell'),
    budgetKey: 'shell',
  },
  {
    name: 'my-account',
    port: 3120,
    prefix: '/my-account',
    /**
     * Every prefix the edge routes here, not just the zone's own.
     *
     * Sign-in belongs to whoever owns sessions, so `/login` and `/logout` are this host's
     * too. Listing only `/my-account` made asset attribution blame the storefront for the
     * login page — the routing table exists in two places, and the `hosts` suite now asserts
     * they agree rather than trusting that they do.
     */
    prefixes: ['/my-account', '/login', '/logout'],
    nav: 'zone',
    dir: appDir('my-account'),
    budgetKey: 'my-account',
  },
];

/**
 * Federated producers. `client` says whether a remote's JAVASCRIPT is ever expected to run
 * in the browser — chrome's never is, which is what makes a shared header affordable.
 */
export const REMOTES = [
  { name: 'chrome', port: 3104, kind: 'component', client: false, dir: appDir('chrome') },
  { name: 'faq', port: 3101, kind: 'route', client: false, dir: appDir('faq') },
  { name: 'product', port: 3102, kind: 'route', client: 'behaviors', dir: appDir('product') },
  { name: 'cart', port: 3103, kind: 'route+component', client: true, dir: appDir('cart') },
];

export const REGISTRY = { name: 'registry', port: 4000 };

/**
 * The asset origin — a stand-in for a DAM or image CDN, on its own port so media bytes are
 * attributable on their own rather than mixed into whichever app referenced them.
 */
export const MEDIA = { name: 'media', port: 3105, dir: 'packages/media' };

/** port -> logical owner. Built from the declarations above, never hand-written. */
const OWNER_BY_PORT = new Map([
  [Number(new URL(EDGE).port), 'edge'],
  [REGISTRY.port, REGISTRY.name],
  [MEDIA.port, MEDIA.name],
  ...HOSTS.map((h) => [h.port, h.name]),
  ...REMOTES.map((r) => [r.port, r.name]),
]);

/**
 * Who served this URL.
 *
 * Returns `unknown:<port>` rather than a friendly `'other'`, because a suite that cannot
 * name an origin has found something the topology does not describe — which is exactly the
 * condition that made four stale maps invisible. Callers treat it as a failure.
 */
export function ownerOf(url) {
  const parsed = new URL(url);
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
  const owner = OWNER_BY_PORT.get(port);
  if (owner === undefined) return `unknown:${port}`;
  if (owner !== 'edge') return owner;

  /**
   * The edge is a router, not an owner.
   *
   * The storefront serves its own assets THROUGH the edge (its public origin is the edge, so
   * that is what its HTML points at), which meant every storefront script and stylesheet was
   * attributed to "edge" — and the waste audit then reported react-dom as FOREIGN on every
   * page of the site. The bytes were right and the blame was wrong, which is worse than a
   * missing number: it names the wrong team.
   *
   * Resolve by prefix, the same rule the edge itself routes on.
   */
  const zone = HOSTS.find((h) =>
    (h.prefixes ?? [h.prefix]).some(
      (prefix) =>
        prefix !== '/' && (parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)),
    ),
  );
  return zone?.name ?? HOSTS.find((h) => h.prefix === '/')?.name ?? 'edge';
}

export const isUnknownOwner = (owner) => owner.startsWith('unknown:');

/**
 * Every route the site serves, with the remotes that may legitimately contribute to it.
 *
 * `owners` is an allow-list: anything else appearing in the network log on that route is
 * contamination. `chrome` is on every route because the header is; `cart` is on every route
 * because the header cart is.
 */
export const ROUTES = [
  { path: '/', host: 'storefront', owners: ['storefront', 'chrome', 'cart', 'media'], indexable: true },
  { path: '/faq', host: 'storefront', owners: ['storefront', 'chrome', 'cart', 'faq'], indexable: true },
  { path: '/faq/contact', host: 'storefront', owners: ['storefront', 'chrome', 'cart', 'faq'], indexable: true },
  { path: '/product', host: 'storefront', owners: ['storefront', 'chrome', 'cart', 'product', 'media'], indexable: true },
  { path: '/product/p-0001', host: 'storefront', owners: ['storefront', 'chrome', 'cart', 'product', 'media'], indexable: true },
  { path: '/cart', host: 'storefront', owners: ['storefront', 'chrome', 'cart', 'media'], indexable: true },
  { path: '/login', host: 'my-account', owners: ['my-account', 'chrome', 'cart'], indexable: false, anonymous: true },
  // Three teams contribute widgets to the overview, so their code belongs here — as widget
  // exposes, never as route modules. `widgets.mjs` checks the difference.
  { path: '/my-account', host: 'my-account', owners: ['my-account', 'chrome', 'cart', 'media', 'product', 'faq'], indexable: false },
  { path: '/my-account/orders', host: 'my-account', owners: ['my-account', 'chrome', 'cart', 'media'], indexable: false },
  { path: '/my-account/profile', host: 'my-account', owners: ['my-account', 'chrome', 'cart'], indexable: false },
];

export const routesOf = (hostName) => ROUTES.filter((r) => r.host === hostName);
export const hostOf = (name) => HOSTS.find((h) => h.name === name);
export const remoteOf = (name) => REMOTES.find((r) => r.name === name);

/** Document routes only — the set that reports one navigation's worth of vitals. */
export const DOCUMENT_ROUTES = ROUTES.filter((r) => hostOf(r.host).nav === 'document');
/** Zone entry points. Everything past these is a soft navigation. */
export const ZONE_ROUTES = ROUTES.filter((r) => hostOf(r.host).nav === 'zone');

/**
 * A scripted walk through the zone, used to measure per-soft-navigation vitals.
 *
 * Each step must produce a URL change AND a contentful paint, or Chrome records no
 * `soft-navigation` entry and the step is invisible — which would make an unmeasured zone
 * look like a fast one.
 */
/**
 * The credentials the harness signs in with.
 *
 * Authentication is simulated, but the FLOW is not: a gate, a redirect with a `next`, a POST,
 * an HttpOnly cookie and a 303. Every one of those affects a measurement, so every one of
 * them is real.
 */
export const LOGIN = {
  path: '/login',
  email: 'd.whitfield@harlowcontrols.example',
  password: 'demo1234',
  sessionCookie: 'mf_session',
  userCookie: 'mf_user',
  /** Pages behind the gate. Reaching any of them anonymously must redirect. */
  gated: ['/my-account', '/my-account/orders', '/my-account/profile'],
};

/** Media budgets, set from the reference profile in docs/media.md. */
export const MEDIA_BUDGET = {
  /** Largest single image on any route. The reference profile's worst is 295 kB. */
  imageBytes: 300_000,
  /** All images on one route. The reference home page ships 976 kB across 77 requests. */
  routeImageBytes: 1_100_000,
  /** The hero video. In the reference profile it is 881 kB and is the LCP element. */
  videoBytes: 950_000,
  /** How much bigger than its rendered box an image may be delivered, by area. */
  oversizeFactor: 2.5,
};

export const ZONE_WALK = {
  start: '/my-account',
  steps: [
    { click: ACCOUNT.nav('account.orders'), expect: ACCOUNT.page('account.orders'), path: '/my-account/orders' },
    { click: ACCOUNT.orderLink('o-0001'), expect: ACCOUNT.page('account.order'), path: '/my-account/orders/o-0001' },
    { click: ACCOUNT.backToOrders, expect: ACCOUNT.page('account.orders'), path: '/my-account/orders' },
    { click: ACCOUNT.nav('account.profile'), expect: ACCOUNT.page('account.profile'), path: '/my-account/profile' },
  ],
};

/**
 * Core Web Vitals budgets.
 *
 * Documents are held to Google's "good" thresholds because those pages are indexed and the
 * numbers carry ranking weight. Zone navigations are held to a stricter LCP and the same
 * INP for a different reason: an authenticated page is not ranked, so these are USER
 * budgets. INP is what a visitor feels; LCP is cheap here only because the element is a
 * skeleton, which is why it is budgeted tightly rather than generously (decision D14).
 */
export const VITALS_BUDGET = {
  // TBT is measured at 4x CPU throttling. Google calls under 200 ms good in that simulated
  // environment; it is the lab proxy for INP and the metric most sensitive to how much
  // JavaScript a stack asks the main thread to run.
  document: { LCP: 2500, CLS: 0.1, INP: 200, TBT: 300, TTFB: 800, FCP: 1800 },
  soft: { LCP: 1200, CLS: 0.02, INP: 200 },
};
