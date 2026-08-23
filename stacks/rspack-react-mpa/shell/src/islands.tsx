import { hydrateRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import { CartProvider, SlotProvider } from '@mf-eval/react-contracts';
import {
  CART_STATE_GLOBAL,
  MARKS,
  createCartStore,
  deserializeCartState,
  mark,
  type RegistryResponse,
  type RouteDescriptor,
} from '@mf-eval/contracts';
import { CART_COOKIE, cartCookieValue, loadRemotes, primeRegistry } from '@mf-eval/shell-kit';

interface IslandSpec {
  kind: 'route' | 'slot';
  remote?: string;
  route?: string;
  slot?: string;
  props?: { data: unknown; params: Record<string, string | undefined> };
}

interface Bootstrap {
  registry: RegistryResponse;
  cohort: string;
  cart: unknown;
  islands: IslandSpec[];
}

/**
 * Island hydration.
 *
 * Each interactive region becomes its OWN React root. There is no document-wide tree, no
 * router, and no reconciliation of anything static. A page with no islands never loads
 * this file — the server does not emit the script tag at all.
 */
async function start(): Promise<void> {
  const boot = (window as unknown as Record<string, Bootstrap>)[CART_STATE_GLOBAL];
  if (!boot?.islands?.length) return;

  primeRegistry('web', boot.cohort, boot.registry);

  // Only the remotes this page actually uses — not every remote in the registry.
  const needed = new Set(boot.islands.map((i) => i.remote ?? 'cart'));
  const entries = boot.registry.remotes.filter((r) => needed.has(r.name) || r.kind === 'component');
  const { routes, slots } = await loadRemotes(entries);

  // One store shared by every island on the page, so the header badge reacts to a click
  // in the page body even though they are separate React roots.
  const store = createCartStore(deserializeCartState(boot.cart));
  store.subscribe(() => {
    document.cookie = `${CART_COOKIE}=${cartCookieValue(store.getSnapshot())}; path=/; SameSite=Lax`;
  });

  const findRoute = (list: RouteDescriptor[], id: string): RouteDescriptor | undefined => {
    for (const r of list) {
      if (r.id === id) return r;
      const found = r.children ? findRoute(r.children, id) : undefined;
      if (found) return found;
    }
    return undefined;
  };

  mark(MARKS.shellHydrateStart);
  await Promise.all(
    boot.islands.map(async (spec, index) => {
      const el = document.querySelector<HTMLElement>(`[data-island-index="${index}"]`);
      if (!el) return;

      let Node: ComponentType<never> | undefined;
      let props: Record<string, unknown> = {};

      if (spec.kind === 'route' && spec.route) {
        const descriptor = findRoute(routes, spec.route);
        const mod = (await descriptor?.lazy?.()) as { Component?: ComponentType<never> } | undefined;
        Node = mod?.Component;
        props = { data: spec.props?.data ?? null, params: spec.props?.params ?? {} };
      } else if (spec.kind === 'slot' && spec.slot) {
        Node = slots[spec.slot as 'cart.mini' | 'cart.drawer'] as ComponentType<never> | undefined;
      }
      if (!Node) return;

      mark(MARKS.remoteHydrateStart(spec.remote ?? spec.slot ?? 'island'));
      hydrateRoot(
        el,
        <CartProvider store={store}>
          <SlotProvider slots={slots}>
            <Node {...(props as never)} />
          </SlotProvider>
        </CartProvider>,
      );
      mark(MARKS.remoteHydrateEnd(spec.remote ?? spec.slot ?? 'island'));
    }),
  );
  mark(MARKS.shellHydrateEnd);
}

void start();
