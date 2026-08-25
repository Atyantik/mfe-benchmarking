/**
 * The test-id contract — one name for every testable element, shared by every stack.
 *
 * This exists because of a specific question: when there is a `vite-solid` stack beside the
 * `rspack-react` one, do the acceptance suites run against both without being rewritten?
 * They only do if "the add-to-cart button" has ONE name that both stacks emit, rather than
 * each stack inventing its own and each suite hard-coding whichever it found first.
 *
 * So the ids live here, in the framework-agnostic contracts package — the same place the
 * route descriptors and the cart store live, and for the same reason. A Solid or Vue
 * implementation imports these strings and is testable by the existing suites on day one.
 *
 * It also closes a hole that cost real time. `Card` silently dropped every prop it was
 * given, so three federated widgets rendered perfectly while every test reported them
 * missing — a whole afternoon of "the widget is broken" when the widget was fine and the id
 * never reached the DOM. `packages/bench/src/contract.mjs` now asserts the contract against
 * the running site, so a dropped id fails immediately and says which one.
 *
 * Rules:
 *   - An id is a CONTRACT, not a label. Renaming one is a breaking change for every stack.
 *   - Parametric ids are built by the functions here, never by string concatenation at the
 *     call site, so the shape cannot drift.
 *   - If an element is worth asserting on, it is worth naming here. If it is not, it does
 *     not need an id.
 */

/** Site chrome. Present on every page of every host, so every stack must emit these. */
export const CHROME = {
  search: 'site-search',
  accountLink: 'account-link',
  accountLabel: 'account-label',
  cartCount: 'cart-count',
  cartTotal: 'cart-total',
  /**
   * The header cart, server-rendered and enhanced by a behaviour.
   *
   * There is no separate placeholder id any more: the markup the server emits IS the cart,
   * with its two values left empty for the client to fill. It stopped being an island so that
   * pages showing only a badge would stop shipping react-dom.
   */
  miniCart: 'mini-cart',
} as const;

/** Catalogue and product detail. */
export const CATALOGUE = {
  filterForm: 'filter-form',
  applyFilters: 'apply-filters',
  sortForm: 'sort-form',
  sortSelect: 'sort-select',
  applySort: 'apply-sort',
  resultCount: 'result-count',
  gallery: 'gallery',
  galleryMain: 'gallery-main',
  galleryThumbs: 'gallery-thumbs',
  productLink: (id: string) => `link-${id}`,
  productImage: (id: string) => `image-${id}`,
  addToCart: (id: string) => `add-${id}`,
  facet: (name: string, value: string) => `facet-${name}-${value}`,
  galleryThumb: (index: number) => `gallery-thumb-${index}`,
} as const;

/** Sign-in. The gate between the storefront and the account application. */
export const AUTH = {
  form: 'login-form',
  email: 'login-email',
  password: 'login-password',
  submit: 'login-submit',
  error: 'login-error',
  signOut: 'sign-out',
} as const;

/** The account application, including the widgets other teams contribute to it. */
export const ACCOUNT = {
  app: 'account-app',
  viewer: 'frame-viewer',
  widgets: 'account-widgets',
  nav: (routeId: string) => `nav-${routeId}`,
  page: (routeId: string) => `page-${routeId}`,
  skeleton: (routeId: string) => `skeleton-${routeId}`,
  orderLink: (id: string) => `order-link-${id}`,
  backToOrders: 'back-to-orders',
  seeAllOrders: 'see-all-orders',
  ordersList: 'orders-list',
  ordersEmpty: 'orders-empty',
  filter: (status: string) => `filter-${status}`,
  loadError: 'load-error',
} as const;

/** Widgets contributed into the account area by other applications. */
export const WIDGET = {
  cart: 'widget-account-cart',
  cartPlaceholder: 'placeholder-account-cart',
  cartLink: 'widget-cart-link',
  recommended: 'widget-account-recommended',
  recommendedPlaceholder: 'placeholder-account-recommended',
  support: 'widget-account-support',
  supportPlaceholder: 'placeholder-account-support',
} as const;

/** The home page and the media primitives. */
export const HOME = {
  heroVideo: 'hero-video',
  heroFeaturedImage: 'hero-featured-image',
  categoryImage: (id: string) => `category-image-${id}`,
} as const;

/**
 * What each route MUST contain, checked against the running site.
 *
 * Anonymous routes are checked signed out; the rest signed in. A stack that satisfies this
 * table is testable by every existing suite without a line of suite code changing — which is
 * the entire point of writing the table down.
 *
 * `clientOnly` ids appear after hydration rather than in the server HTML; the checker waits
 * for them instead of reading the document.
 */
export interface RouteContract {
  path: string;
  /** Present in the SERVER-rendered HTML. */
  server: string[];
  /** Present after the client has done its work. */
  clientOnly?: string[];
  /** Requires a session. */
  authenticated?: boolean;
}

export const ROUTE_CONTRACT: RouteContract[] = [
  {
    path: '/',
    server: [CHROME.search, CHROME.accountLink, CHROME.miniCart, CHROME.cartCount, HOME.heroVideo],
    clientOnly: [CHROME.cartTotal],
  },
  {
    path: '/product',
    server: [
      CHROME.search,
      CATALOGUE.filterForm,
      CATALOGUE.applyFilters,
      CATALOGUE.sortForm,
      CATALOGUE.sortSelect,
      CATALOGUE.productLink('p-0001'),
      CATALOGUE.addToCart('p-0001'),
      CATALOGUE.facet('category', 'circuit-protection'),
    ],
    clientOnly: [CHROME.cartCount],
  },
  {
    path: '/product/p-0001',
    server: [CATALOGUE.gallery, CATALOGUE.galleryMain, CATALOGUE.galleryThumb(0)],
    clientOnly: [CHROME.cartCount],
  },
  {
    path: '/login',
    server: [AUTH.form, AUTH.email, AUTH.password, AUTH.submit],
  },
  {
    path: '/my-account',
    authenticated: true,
    server: [ACCOUNT.app, ACCOUNT.nav('account.orders'), ACCOUNT.skeleton('account.overview')],
    clientOnly: [
      ACCOUNT.page('account.overview'),
      ACCOUNT.widgets,
      WIDGET.cart,
      WIDGET.recommended,
      WIDGET.support,
      AUTH.signOut,
    ],
  },
  {
    path: '/my-account/orders',
    authenticated: true,
    server: [ACCOUNT.app, ACCOUNT.skeleton('account.orders')],
    clientOnly: [ACCOUNT.page('account.orders'), ACCOUNT.ordersList, ACCOUNT.orderLink('o-0001')],
  },
  {
    path: '/my-account/profile',
    authenticated: true,
    server: [ACCOUNT.app, ACCOUNT.skeleton('account.profile')],
    clientOnly: [ACCOUNT.page('account.profile')],
  },
];

/**
 * Every FIXED id the contract names — the parametric ones are functions and have no single
 * value to list. Used for a quick "is this string spoken for" check.
 */
const fixedIds = (group: Record<string, unknown>): string[] =>
  Object.values(group).filter((value): value is string => typeof value === 'string');

export const ALL_TESTIDS: readonly string[] = Object.freeze([
  ...fixedIds(CHROME),
  ...fixedIds(CATALOGUE),
  ...fixedIds(AUTH),
  ...fixedIds(ACCOUNT),
  ...fixedIds(WIDGET),
  ...fixedIds(HOME),
]);
