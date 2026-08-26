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
 *   - Every id must be a valid CSS identifier fragment. `facet()` interpolated raw fixture
 *     values and emitted `facet-range-Acti9 iC60` — a `data-testid` containing spaces, which
 *     survives `[data-testid="..."]` but breaks the moment anyone writes an unquoted selector
 *     or builds one by concatenation. `slug()` closes that at the single point where those
 *     ids are made.
 *   - Parametric ids are built by the functions here, never by string concatenation at the
 *     call site, so the shape cannot drift.
 *   - If an element is worth asserting on, it is worth naming here. If it is not, it does
 *     not need an id.
 */

/**
 * Fixture values become id fragments, and fixture values contain spaces, dots and slashes.
 *
 * Applied inside the parametric builders rather than at their call sites, so no stack can
 * forget it and no two stacks can disagree about how a value is spelled in a selector.
 */
const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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
  productLink: (id: string) => `link-${slug(id)}`,
  productImage: (id: string) => `image-${slug(id)}`,
  /**
   * Add-to-cart, wherever it appears.
   *
   * The detail page used to emit a bare `add-to-cart` while the list emitted `add-p-0001` for
   * the identical action, so a suite written against one surface silently did not apply to the
   * other. One name, parameterised by product, for both.
   */
  addToCart: (id: string) => `add-${slug(id)}`,
  facet: (name: string, value: string) => `facet-${slug(name)}-${slug(value)}`,
  galleryThumb: (index: number) => `gallery-thumb-${index}`,
  /**
   * Availability and lead time on the detail page.
   *
   * Styled by a CSS Module whose class names collide, on purpose, with the cart team's. It is
   * named here because `packages/bench/src/css.mjs` addresses it by id, and a stack that
   * renames it silently would turn that whole suite into a no-op.
   */
  stockPanel: 'stock-panel',
  stockAvailability: 'stock-availability',
  stockLead: 'stock-lead',
} as const;

/**
 * The cart's own surfaces — the drawer and the cart page.
 *
 * None of these had a contract entry. They are the most stateful UI on the site, which makes
 * them the surfaces a second stack is most likely to name differently.
 */
export const CART = {
  drawer: 'cart-drawer',
  drawerPlaceholder: 'cart-drawer-placeholder',
  drawerTotal: 'cart-drawer-total',
  pagePlaceholder: 'cart-page-placeholder',
  row: 'cart-row',
  clear: 'clear-cart',
  empty: 'cart-empty',
} as const;

/** The support centre and its contact form. */
export const SUPPORT = {
  search: 'faq-search',
  contactForm: 'contact-form',
  contactName: 'contact-name',
  contactEmail: 'contact-email',
  contactCompany: 'contact-company',
  contactPhone: 'contact-phone',
  contactArea: 'contact-area',
  contactDetail: 'contact-detail',
  contactDrawings: 'contact-drawings',
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
  filter: (status: string) => `filter-${slug(status)}`,
  loadError: 'load-error',
  /** One line item on an order detail page. */
  lineProduct: (id: string) => `line-product-${slug(id)}`,
  /** A zone URL with no matching route — the SPA's own 404, not the edge's. */
  notFound: 'zone-404',
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
  supportLink: 'widget-support-link',
  /** One recommended product inside the recommendations widget. */
  recommendedItem: (id: string) => `recommended-${slug(id)}`,
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
    server: [
      CHROME.search,
      CHROME.accountLink,
      CHROME.accountLabel,
      CHROME.miniCart,
      CHROME.cartCount,
      HOME.heroVideo,
    ],
    clientOnly: [CHROME.cartTotal],
  },
  {
    path: '/product',
    server: [
      CHROME.search,
      CATALOGUE.resultCount,
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
    server: [
      CATALOGUE.gallery,
      CATALOGUE.galleryMain,
      CATALOGUE.galleryThumb(0),
      CATALOGUE.stockPanel,
      CATALOGUE.stockAvailability,
      CATALOGUE.stockLead,
    ],
    clientOnly: [CHROME.cartCount],
  },
  {
    /**
     * The support centre and the contact form.
     *
     * Neither route was in this table, so neither was ever checked — which is why nine ids,
     * including the whole contact form, sat outside the contract without anything noticing.
     */
    path: '/faq',
    server: [CHROME.search, SUPPORT.search, CHROME.miniCart],
    clientOnly: [CHROME.cartCount],
  },
  {
    path: '/faq/contact',
    server: [
      SUPPORT.contactForm,
      SUPPORT.contactName,
      SUPPORT.contactEmail,
      SUPPORT.contactCompany,
      SUPPORT.contactPhone,
      SUPPORT.contactArea,
      SUPPORT.contactDetail,
      SUPPORT.contactDrawings,
    ],
  },
  {
    path: '/cart',
    server: [CHROME.search, CHROME.miniCart],
    clientOnly: [CHROME.cartCount, CHROME.cartTotal],
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
  ...fixedIds(CART),
  ...fixedIds(SUPPORT),
  ...fixedIds(AUTH),
  ...fixedIds(ACCOUNT),
  ...fixedIds(WIDGET),
  ...fixedIds(HOME),
]);

/**
 * The parametric families, as patterns.
 *
 * `ALL_TESTIDS` can only list the FIXED ids; the builders above produce an unbounded set. To
 * ask "is this id spoken for" of anything the site actually emits, both halves are needed —
 * so each builder has a matching pattern here, and `isContractId()` is the only thing that
 * should ever be asked that question.
 *
 * Keep this in step with the builders. A builder without a pattern makes every id it produces
 * look like drift; a pattern without a builder lets real drift through.
 */
export const TESTID_PATTERNS: readonly RegExp[] = Object.freeze([
  /^link-[a-z0-9-]+$/,
  /^image-[a-z0-9-]+$/,
  /^add-[a-z0-9-]+$/,
  /^facet-[a-z0-9-]+-[a-z0-9-]+$/,
  /^gallery-thumb-\d+$/,
  /^nav-[a-z0-9.]+$/,
  /^page-[a-z0-9.]+$/,
  /^skeleton-[a-z0-9.]+$/,
  /^order-link-[a-z0-9-]+$/,
  /^filter-[a-z0-9-]+$/,
  /^category-image-[a-z0-9-]+$/,
  /^recommended-[a-z0-9-]+$/,
  /^line-product-[a-z0-9-]+$/,
]);

/**
 * Is this id part of the contract?
 *
 * The question `contract.mjs` asks of every `data-testid` the running site emits. An id that
 * is neither a named constant nor a member of a parametric family is drift: a name one stack
 * invented, which the shared suites cannot know about and the next stack will spell
 * differently. Nine such ids existed here before this function did, including two surfaces
 * with no contract entry at all and a whole contact form.
 */
export function isContractId(id: string): boolean {
  return ALL_TESTIDS.includes(id) || TESTID_PATTERNS.some((pattern) => pattern.test(id));
}

/**
 * Ids that are correct to be absent from a healthy run.
 *
 * Error and empty states, and the placeholders a client-rendered region shows before its
 * module arrives. `contract.mjs` asserts every OTHER named id is emitted somewhere, which is
 * how a name that no longer matches any element gets found; without this list that check
 * would have to be switched off entirely.
 */
export const CONDITIONAL_TESTIDS: readonly string[] = Object.freeze([
  AUTH.error,
  ACCOUNT.ordersEmpty,
  ACCOUNT.loadError,
  ACCOUNT.backToOrders,
  WIDGET.cartPlaceholder,
  WIDGET.recommendedPlaceholder,
  WIDGET.supportPlaceholder,
  CART.empty,
  CART.row,
  CART.clear,
  CART.drawer,
  CART.drawerTotal,
  CART.drawerPlaceholder,
  CART.pagePlaceholder,
  ACCOUNT.notFound,
  ACCOUNT.seeAllOrders,
]);
