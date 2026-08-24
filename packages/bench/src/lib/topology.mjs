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
    dir: 'stacks/rspack-react/shell',
    budgetKey: 'shell',
  },
  {
    name: 'my-account',
    port: 3120,
    prefix: '/my-account',
    nav: 'zone',
    dir: 'stacks/rspack-react/my-account',
    budgetKey: 'my-account',
  },
];

/**
 * Federated producers. `client` says whether a remote's JAVASCRIPT is ever expected to run
 * in the browser — chrome's never is, which is what makes a shared header affordable.
 */
export const REMOTES = [
  { name: 'chrome', port: 3104, kind: 'component', client: false, dir: 'stacks/rspack-react/chrome' },
  { name: 'faq', port: 3101, kind: 'route', client: false, dir: 'stacks/rspack-react/faq' },
  { name: 'product', port: 3102, kind: 'route', client: 'behaviors', dir: 'stacks/rspack-react/product' },
  { name: 'cart', port: 3103, kind: 'route+component', client: true, dir: 'stacks/rspack-react/cart' },
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
  const port = Number(new URL(url).port || (new URL(url).protocol === 'https:' ? 443 : 80));
  return OWNER_BY_PORT.get(port) ?? `unknown:${port}`;
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
    { click: 'nav-account.orders', expect: 'page-account.orders', path: '/my-account/orders' },
    { click: 'order-link-o-0001', expect: 'page-account.order', path: '/my-account/orders/o-0001' },
    { click: 'back-to-orders', expect: 'page-account.orders', path: '/my-account/orders' },
    { click: 'nav-account.profile', expect: 'page-account.profile', path: '/my-account/profile' },
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
  document: { LCP: 2500, CLS: 0.1, INP: 200, TTFB: 800, FCP: 1800 },
  soft: { LCP: 1200, CLS: 0.02, INP: 200 },
};
