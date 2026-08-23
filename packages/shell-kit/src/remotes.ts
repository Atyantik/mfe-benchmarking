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
  type SlotName,
} from '@mf-eval/contracts';
import type { ComponentType } from 'react';

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
    slot: 'cart.drawer',
    remote: 'cart',
    module: 'cart/CartDrawer',
    expose: './CartDrawer',
    placeholderModule: 'cart/CartDrawerPlaceholder',
    placeholderExpose: './CartDrawerPlaceholder',
  },
];

/**
 * Maps a merged top-level route descriptor back to the remote that supplied it, so a
 * render can report which remote actually owns the current URL. WeakMap rather than a
 * property on the descriptor: React Router owns those objects, and we should not add
 * fields to something we hand to a library.
 */
export const routeOwner = new WeakMap<object, string>();

/**
 * `variant` decides which half of a personalized slot is loaded.
 *
 * The server takes 'placeholder' — it must not render per-user content, or every
 * response becomes user-specific and unshareable by a CDN, and a crawler gets data it
 * has no use for. The client takes 'live'.
 */
export async function loadRemotes(
  entries: RegistryEntry[],
  variant: 'live' | 'placeholder' = 'live',
  onlySlots?: readonly string[],
): Promise<LoadedRemotes> {
  register(entries);

  const failures: { name: string; error: string }[] = [];
  const routes: RouteDescriptor[] = [];
  const slots: Partial<Record<SlotName, ComponentType>> = {};

  const routeEntries = entries.filter((e) => e.kind === 'route');
  const componentNames = new Set(entries.filter((e) => e.kind === 'component').map((e) => e.name));

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
    // `onlySlots` matters: without it the client pulls every slot a component remote
    // offers, so a page with just a header cart also downloads the drawer it will never
    // show — component code AND its stylesheet.
    ...SLOT_SOURCES.filter(
      (s) => componentNames.has(s.remote) && (!onlySlots || onlySlots.includes(s.slot)),
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
