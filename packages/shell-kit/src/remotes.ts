/**
 * Runtime remote loading. The shell has NO `remotes` block in its build config —
 * everything here is resolved from the registry at request time.
 */
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import {
  MARKS,
  mark,
  type RegistryEntry,
  type RouteDescriptor,
} from '@mf-eval/contracts';
import type { ComponentType } from 'react';
import type { SlotName } from '@mf-eval/react-contracts';

export interface LoadedRemotes {
  routes: RouteDescriptor[];
  slots: Partial<Record<SlotName, ComponentType>>;
  /** Remotes that failed. A dead remote degrades its routes, it does not break the page. */
  failures: { name: string; error: string }[];
}

let registeredKey = '';

/**
 * Register the resolved remote set, but only when it actually changed.
 *
 * `force: true` overwrites already-registered remotes and DROPS their module cache.
 * MF warns about it because it is genuinely risky. Doing it per request would churn
 * the cache on every render, spam the log, and contaminate the RSS-over-N-swaps
 * measurement that exists to detect PR #4824's leak. Keyed on the resolved set so a
 * real redeploy still forces a refresh.
 */
export function register(entries: RegistryEntry[]): void {
  const key = entries.map((e) => `${e.name}@${e.version}=${e.entry}`).join('|');
  if (key === registeredKey) return;
  registerRemotes(
    entries.map((e) => ({ name: e.name, entry: e.entry })),
    { force: registeredKey !== '' },
  );
  registeredKey = key;
}

async function loadOne<T>(remote: string, id: string): Promise<T> {
  mark(MARKS.remoteLoadStart(remote));
  try {
    return (await loadRemote<T>(id)) as T;
  } finally {
    mark(MARKS.remoteLoadEnd(remote));
  }
}

/** Which exposed components fill which slot. Owned by the shell, not by the remotes. */
export interface SlotSource {
  slot: SlotName;
  remote: string;
  /** Live component — client only. Personalized, never server-rendered. */
  module: string;
  expose: string;
  /** Reserved-size stand-in the SERVER renders, so mounting the live one shifts nothing. */
  placeholderModule: string;
  placeholderExpose: string;
}

export const SLOT_SOURCES: SlotSource[] = [
  {
    slot: 'cart.mini',
    remote: 'cart',
    module: 'cart/MiniCart',
    expose: './MiniCart',
    placeholderModule: 'cart/MiniCartPlaceholder',
    placeholderExpose: './MiniCartPlaceholder',
  },
  {
    slot: 'cart.page',
    remote: 'cart',
    module: 'cart/CartPage',
    expose: './CartPage',
    placeholderModule: 'cart/CartPagePlaceholder',
    placeholderExpose: './CartPagePlaceholder',
  },
  {
    slot: 'cart.drawer',
    remote: 'cart',
    module: 'cart/CartDrawer',
    expose: './CartDrawer',
    placeholderModule: 'cart/CartDrawerPlaceholder',
    placeholderExpose: './CartDrawerPlaceholder',
  },
  // --- the account overview, composed from three different teams -------------
  //
  // The account host renders three regions and owns none of them. Each is a widget from the
  // team that owns that domain, with a placeholder from the same team reserving the exact
  // box. Nothing here is loaded on any page that does not render the slot — which is the
  // property worth proving, and the one `pnpm --filter @mf-eval/bench widgets` measures.
  {
    slot: 'account.cart',
    remote: 'cart',
    module: 'cart/AccountCart',
    expose: './AccountCart',
    placeholderModule: 'cart/AccountCartPlaceholder',
    placeholderExpose: './AccountCartPlaceholder',
  },
  {
    slot: 'account.recommended',
    remote: 'product',
    module: 'product/AccountRecommended',
    expose: './AccountRecommended',
    placeholderModule: 'product/AccountRecommendedPlaceholder',
    placeholderExpose: './AccountRecommendedPlaceholder',
  },
  {
    slot: 'account.support',
    remote: 'faq',
    module: 'faq/AccountSupport',
    expose: './AccountSupport',
    placeholderModule: 'faq/AccountSupportPlaceholder',
    placeholderExpose: './AccountSupportPlaceholder',
  },
];

/**
 * Maps a merged top-level route descriptor back to the remote that supplied it, so a
 * render can report which remote actually owns the current URL. WeakMap rather than a
 * property on the descriptor: React Router owns those objects, and we should not add
 * fields to something we hand to a library.
 */
export const routeOwner = new WeakMap<object, string>();

export interface LoadOptions {
  /**
   * Which half of a personalized slot to load.
   *
   * The server takes 'placeholder' — it must not render per-user content, or every
   * response becomes user-specific and unshareable by a CDN, and a crawler gets data it
   * has no use for. The client takes 'live'.
   */
  variant?: 'live' | 'placeholder';
  /**
   * Restrict to the slots this page actually rendered. Without it the client pulls every
   * slot a component remote offers, so a page showing only the header cart also downloads
   * the drawer it will never open — component code AND its stylesheet.
   */
  onlySlots?: readonly string[];
  /**
   * Whether to load route descriptors. TRUE only on the server.
   *
   * There is no client router, so a descriptor in the browser is a module that is fetched,
   * parsed and then never read. It is easy to miss because it is small and because the cart
   * is registered as a route remote (it owns /cart) while being loaded on every page for
   * its header widget — so the client was pulling /cart's descriptor on every page view.
   */
  routes?: boolean;
}

export async function loadRemotes(
  entries: RegistryEntry[],
  options: LoadOptions = {},
): Promise<LoadedRemotes> {
  const { variant = 'live', onlySlots, routes: wantRoutes = false } = options;
  register(entries);

  const failures: { name: string; error: string }[] = [];
  const routes: RouteDescriptor[] = [];
  const slots: Partial<Record<SlotName, ComponentType>> = {};

  const routeEntries = wantRoutes ? entries.filter((e) => e.kind === 'route') : [];
  // A remote can be BOTH a route owner and a component provider — the cart owns /cart and
  // also supplies the header widget. So slot loading keys off SLOT_SOURCES, not `kind`.
  const providerNames = new Set(entries.map((e) => e.name));

  await Promise.all([
    ...routeEntries.map(async (entry) => {
      try {
        const mod = await loadOne<{ routes: RouteDescriptor[] }>(entry.name, `${entry.name}/routes`);
        for (const r of mod.routes) routeOwner.set(r, entry.name);
        routes.push(...mod.routes);
      } catch (err) {
        failures.push({ name: entry.name, error: String(err) });
      }
    }),
    ...SLOT_SOURCES.filter(
      (s) => providerNames.has(s.remote) && (!onlySlots || onlySlots.includes(s.slot)),
    ).map(async (s) => {
      const id = variant === 'live' ? s.module : s.placeholderModule;
      try {
        const mod = await loadOne<{ default: ComponentType }>(s.remote, id);
        slots[s.slot] = mod.default;
      } catch (err) {
        failures.push({ name: id, error: String(err) });
      }
    }),
  ]);

  // Deterministic order regardless of which remote resolved first — otherwise the
  // server and client could build routers with different route precedence.
  routes.sort((a, b) => (a.path ?? '').localeCompare(b.path ?? ''));
  mark(MARKS.routesMerge);

  return { routes, slots, failures };
}
