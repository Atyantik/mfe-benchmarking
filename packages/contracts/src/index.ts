/**
 * @mf-eval/contracts — the ONLY thing remotes are allowed to share.
 *
 * Rules (docs/topology.md § Rule 2):
 *  - types and a store interface; no UI, no business logic
 *  - shared as a singleton, so keep it tiny — a breaking change here is a
 *    coordinated release across every repo
 *  - no remote imports another remote's internals
 */

export type { Product, FaqEntry, HomeCard } from './fixtures/index.ts';

// ---------------------------------------------------------------------------
// Route descriptors
// ---------------------------------------------------------------------------

/**
 * How a remote's subtree hydrates. Build-time switch per remote —
 * spec/reference-app.md § Hydration modes.
 */
export type HydrationMode = 'off' | 'deferred-idle' | 'deferred-visible' | 'full';

/**
 * What a ROUTE remote exposes as `./routes`.
 *
 * Deliberately structural rather than importing react-router's RouteObject: the
 * contract package is shared as a singleton by every remote, and pulling a router
 * into it would make the router part of the shared surface. The shell maps these
 * onto its own router.
 *
 * `lazy` must resolve to a module exporting `Component` (and optionally `loader`).
 * Never statically import the page component here — the descriptor module is loaded
 * before first render, so a static import puts every page in the critical path.
 */
export interface RouteDescriptor {
  /**
   * Stable route id, e.g. "faq.index". MUST equal the webpackChunkName given to this
   * route's dynamic import, with dots replaced by dashes ("faq-index").
   *
   * Why this exists: MF's manifest lists assets per EXPOSE, not per route, so a remote
   * exposing `./routes` reports every route's CSS/JS in one flat `async` list. Without a
   * per-route key the shell cannot tell which stylesheet belongs to the page it just
   * rendered, and /faq would download /faq/contact's CSS. Naming the chunk after the
   * route id makes the flat list attributable again.
   */
  id?: string;
  path?: string;
  index?: boolean;
  lazy?: () => Promise<unknown>;
  loader?: (args: RouteLoaderArgs) => unknown | Promise<unknown>;
  children?: RouteDescriptor[];
  /** Defaults to the owning remote's build-time mode when omitted. */
  hydration?: HydrationMode;
}

export interface RouteLoaderArgs {
  params: Record<string, string | undefined>;
  request: Request;
}

/** The shape a route remote must default-export from its `./routes` expose. */
export interface RoutesModule {
  routes: RouteDescriptor[];
}

// ---------------------------------------------------------------------------
// Cart store — cross-remote coordination
// ---------------------------------------------------------------------------

export interface CartItem {
  id: string;
  name: string;
  /** Integer cents. */
  price: number;
}

export interface CartState {
  items: readonly CartItem[];
  count: number;
  totalCents: number;
}

export interface CartStore {
  /**
   * MUST return a referentially stable value between mutations —
   * React's useSyncExternalStore will loop forever otherwise.
   */
  getSnapshot(): CartState;
  subscribe(listener: () => void): () => void;
  add(item: CartItem): void;
  clear(): void;
}

export const EMPTY_CART: CartState = Object.freeze({
  items: Object.freeze([]) as readonly CartItem[],
  count: 0,
  totalCents: 0,
});

/**
 * Create a cart store.
 *
 * On the server this MUST be called per request. A module-global store would leak
 * one user's cart into another user's response — the sharpest correctness trap in
 * this architecture (docs/topology.md § Rule 2).
 */
export function createCartStore(initial: CartState = EMPTY_CART): CartStore {
  let state: CartState = initial;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const l of listeners) l();
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add(item) {
      const items = [...state.items, item];
      state = {
        items,
        count: items.length,
        totalCents: items.reduce((sum, i) => sum + i.price, 0),
      };
      emit();
    },
    clear() {
      state = EMPTY_CART;
      emit();
    },
  };
}

/** Key used to hand server cart state to the client. */
export const CART_STATE_GLOBAL = '__MF_EVAL_CART__';

export function serializeCartState(state: CartState): string {
  // `</script>` inside JSON would close the tag early and inject markup.
  return JSON.stringify(state).replace(/</g, '\\u003c');
}

export function deserializeCartState(raw: unknown): CartState {
  if (!raw || typeof raw !== 'object') return EMPTY_CART;
  const candidate = raw as Partial<CartState>;
  if (!Array.isArray(candidate.items)) return EMPTY_CART;
  const items = candidate.items as CartItem[];
  return {
    items,
    count: items.length,
    totalCents: items.reduce((sum, i) => sum + (i?.price ?? 0), 0),
  };
}

// ---------------------------------------------------------------------------
// Performance marks — spec/reference-app.md § Performance marks
// ---------------------------------------------------------------------------

/** A missing mark is a failed bench run, not a zero. Always use these helpers. */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(name);
    } catch {
      /* measurement must never break the app */
    }
  }
}

export const MARKS = {
  shellHydrateStart: 'mf:shell:hydrate:start',
  shellHydrateEnd: 'mf:shell:hydrate:end',
  registryFetchStart: 'mf:registry:fetch:start',
  registryFetchEnd: 'mf:registry:fetch:end',
  routesMerge: 'mf:routes:merge',
  remoteLoadStart: (name: string) => `mf:remote:${name}:load:start`,
  remoteLoadEnd: (name: string) => `mf:remote:${name}:load:end`,
  remoteHydrateStart: (name: string) => `mf:remote:${name}:hydrate:start`,
  remoteHydrateEnd: (name: string) => `mf:remote:${name}:hydrate:end`,
} as const;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  /** MF container name, e.g. "product". */
  name: string;
  /** Absolute URL of mf-manifest.json for the consuming environment. */
  entry: string;
  version: string;
  /** 'route' contributes to the router; 'component' is mounted directly. */
  kind: 'route' | 'component';
}

export interface RegistryResponse {
  remotes: RegistryEntry[];
  /** Lets the client verify it resolved the same set the server rendered against. */
  revision: string;
}
