/**
 * The zone's client half — the only client router on the site.
 *
 * Two jobs, and they are separate on purpose:
 *
 *  1. Mount the account application into the box the server reserved, and route inside
 *     `/my-account/*` without document loads.
 *  2. Mount the cart, exactly the way the storefront does. It is the same remote, the same
 *     cookie and the same island — a visitor who adds to their cart and then opens their
 *     account must not find it empty.
 *
 * `createRoot`, not `hydrateRoot`. The server deliberately rendered a skeleton, so there is
 * no matching tree to hydrate and claiming otherwise would be a mismatch by construction.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { CartProvider, SlotProvider } from '@mf-eval/react-contracts';
import {
  CART_STATE_GLOBAL,
  createCartStore,
  mark,
  MARKS,
  type RegistryResponse,
} from '@mf-eval/contracts';
import {
  CART_COOKIE,
  cartCookieValue,
  loadRemotes,
  primeRegistry,
  readCartCookie,
  register,
  SLOT_SOURCES,
} from '@mf-eval/shell-kit';
import { createZoneRouter, type ZoneMatch } from '@mf-eval/zone-router';
import { scanBehaviors } from '@mf-eval/behaviors/runtime';
import { loadRemote } from '@module-federation/enhanced/runtime';

import { Frame } from './Frame';
import { BASE_PATH, ROUTES, type PageModule } from './routes';
import { FALLBACK_SKELETON, SKELETONS } from './skeletons';

interface Bootstrap {
  registry: RegistryResponse;
  cohort: string;
  personalized: { slot: string }[];
  behaviors: string[];
  /** Handed over by the server, which already knew. No cookie parsing, no re-render. */
  viewer: { name: string; initial: string; accountNumber: string } | null;
}

/** `chrome.account` lives at `chrome/behaviors/account`. The name is the address. */
const resolveBehavior = (name: string) => {
  const [remote, file] = name.split('.');
  if (!remote || !file) throw new Error(`Behaviour "${name}" must be named "<remote>.<file>".`);
  return loadRemote(`${remote}/behaviors/${file}`) as Promise<never>;
};

const router = createZoneRouter<PageModule>({ basePath: BASE_PATH, routes: ROUTES });

/** Modules are cached, so returning to a route is instant and produces no request. */
const loaded = new Map<string, PageModule>();

/**
 * Route and module are ONE piece of state, never two.
 *
 * Held separately they disagree for exactly one render: the router publishes the new match
 * synchronously, but the new module arrives in an effect — so the OUTGOING page renders once
 * with the INCOMING route's params. That is not cosmetic. It sent `fetchOrder('')` on every
 * navigation away from an order detail, which the API answered with a 404, and a page whose
 * loading state depended on those params would have rendered someone else's route.
 *
 * Found by asserting that a zone walk produces no 4xx, which is why that assertion is now
 * part of the bench rather than something a person remembers to look at.
 */
interface View {
  match: ZoneMatch<PageModule> | null;
  module: PageModule | null;
}

function ZoneApp({ viewer }: { viewer: Bootstrap['viewer'] }) {
  const [view, setView] = useState<View>(() => ({ match: router.current(), module: null }));

  useEffect(() => {
    const apply = (match: ZoneMatch<PageModule> | null) => {
      if (!match) {
        setView({ match: null, module: null });
        return;
      }
      const cached = loaded.get(match.route.id);
      if (cached) {
        setView({ match, module: cached });
        return;
      }
      // Show the skeleton for the route being ENTERED while its chunk arrives, rather than
      // holding the previous page on screen. Chrome needs a contentful paint before it will
      // record the soft navigation at all (docs/constraints.md §14); keeping the old page up
      // means the paint — and therefore the measurement — never happens.
      setView({ match, module: null });
      void match.route.load().then((mod) => {
        loaded.set(match.route.id, mod);
        // Discard a module that arrives after the visitor has moved on again.
        setView((cur) => (cur.match?.pathname === match.pathname ? { match, module: mod } : cur));
      });
    };
    apply(router.current());
    return router.subscribe(apply);
  }, []);

  const { match, module } = view;

  // The title has to move with the route, or every soft navigation looks like the same page
  // to a screen reader, to the history menu, and to anything reading the document.
  useEffect(() => {
    if (module && match) document.title = `${module.title(match.params)} · Northgate Industrial`;
  }, [module, match]);

  if (!match) {
    return (
      <Frame activeId="account.overview" viewer={viewer}>
        <p className="text-[length:var(--fs-md)] text-ink-700" data-testid="zone-404">
          That account page does not exist.
        </p>
      </Frame>
    );
  }

  // An order detail is still "Orders" as far as the sidebar is concerned.
  const activeId = match.route.id === 'account.order' ? 'account.orders' : match.route.id;
  const Body: ComponentType<{ params: Record<string, string> }> | null = module?.Page ?? null;
  const Skeleton = SKELETONS[match.route.id] ?? FALLBACK_SKELETON;

  return (
    <Frame activeId={activeId} viewer={viewer}>
      {Body ? <Body params={match.params} /> : Skeleton()}
    </Frame>
  );
}

async function start(): Promise<void> {
  const boot = (window as unknown as Partial<Record<string, Bootstrap>>)[CART_STATE_GLOBAL];
  if (!boot) return;

  primeRegistry('web', boot.cohort, boot.registry);

  const store = createCartStore(readCartCookie(document.cookie));
  store.subscribe(() => {
    document.cookie = `${CART_COOKIE}=${cartCookieValue(store.getSnapshot())}; path=/; SameSite=Lax; Max-Age=2592000`;
  });

  // Only the remotes this page pulls from: whoever owns a personalized region, plus whoever
  // owns a behaviour in the markup. The account application is this host's own code and is
  // not federated at all.
  /**
   * Register every remote that COULD fill a slot in this application, plus whoever owns a
   * behaviour in the markup.
   *
   * Registering is not loading. It tells the federation runtime where a remote lives; not a
   * byte is fetched until a route actually renders that slot. Doing it up front is what lets
   * a soft navigation to the overview resolve its three widgets without a registry round
   * trip first — and the bench asserts that the Profile route still downloads none of them.
   */
  const slotOwnerNames = new Set(SLOT_SOURCES.map((s) => s.remote));
  const owners = new Set([
    ...boot.personalized.map((p) => p.slot.split('.')[0] ?? ''),
    ...boot.behaviors.map((n) => n.split('.')[0] ?? ''),
    ...slotOwnerNames,
  ]);
  const entries = boot.registry.remotes.filter((r) => owners.has(r.name));
  register(entries);

  // Behaviours first: they enhance markup already on screen, and the header's signed-in
  // label is the first thing a visitor looks at after signing in.
  scanBehaviors(document, resolveBehavior);

  mark(MARKS.shellHydrateStart);

  // The zone application first: it is the reason the visitor is here, and the cart is
  // chrome. Mounting them in the other order would put a widget ahead of the page.
  // The server rendered <Frame> around a skeleton inside #account-frame; the client owns
  // that element from here, because the sidebar's active state changes on every navigation.
  const frameRoot = document.getElementById('account-frame');
  if (frameRoot) {
    // The cart team's widget reads cart state through the shared contract, exactly as its
    // header sibling does. Providing the store here is what lets a remote render per-user UI
    // without this application knowing anything about carts.
    createRoot(frameRoot).render(
      <CartProvider store={store}>
        <ZoneApp viewer={boot.viewer} />
      </CartProvider>,
    );
  }

  if (boot.personalized.length === 0) return;
  const slotOwners = new Set(boot.personalized.map((p) => p.slot.split('.')[0] ?? ''));
  const { slots } = await loadRemotes(
    entries.filter((r) => slotOwners.has(r.name)),
    { variant: 'live', onlySlots: boot.personalized.map((p) => p.slot) },
  );
  for (const spec of boot.personalized) {
    const el = document.querySelector<HTMLElement>(`[data-personalized="${spec.slot}"]`);
    const Live = slots[spec.slot as 'cart.mini' | 'cart.drawer'];
    if (!el || !Live) continue;
    createRoot(el).render(
      <CartProvider store={store}>
        <SlotProvider slots={slots}>
          <Live />
        </SlotProvider>
      </CartProvider>,
    );
  }
  mark(MARKS.shellHydrateEnd);
}

void start();
