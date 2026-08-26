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
 * `mount`, not `hydrate`. The server deliberately rendered a skeleton, so there is no matching
 * tree to hydrate and claiming otherwise would be a mismatch by construction.
 */
import { mount } from 'svelte';
import { CART_STATE_GLOBAL, getCartStore, mark, MARKS, type CartStore, type RegistryResponse } from '@mf-eval/contracts';
import { loadRemotes, primeRegistry, register, SLOT_SOURCES } from '@mf-eval/shell-kit';
import { scanBehaviors } from '@mf-eval/behaviors/runtime';
import { loadRemote } from '@module-federation/enhanced/runtime';

import ZoneRoot from './ZoneRoot.svelte';

/** See app/slots.svelte.ts: a remote's live component crosses the boundary as a mounter. */
type SlotMounter = (target: HTMLElement, props: { store: CartStore }) => () => void;

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

async function start(): Promise<void> {
  const boot = (window as unknown as Partial<Record<string, Bootstrap>>)[CART_STATE_GLOBAL];
  if (!boot) return;

  primeRegistry('web', boot.cohort, boot.registry);

  // The shared client store: the header badge behaviour and the account's cart widget are
  // looking at the same instance, and it persists itself.
  const store = getCartStore();

  /**
   * Register every remote that COULD fill a slot in this application, plus whoever owns a
   * behaviour in the markup.
   *
   * Registering is not loading. It tells the federation runtime where a remote lives; not a
   * byte is fetched until a route actually renders that slot. Doing it up front is what lets a
   * soft navigation to the overview resolve its three widgets without a registry round trip
   * first — and the bench asserts that the Profile route still downloads none of them.
   */
  const slotOwnerNames = new Set(SLOT_SOURCES.map((s) => s.remote));
  const owners = new Set([
    ...boot.personalized.map((p) => p.slot.split('.')[0] ?? ''),
    ...boot.behaviors.map((n) => n.split('.')[0] ?? ''),
    ...slotOwnerNames,
  ]);
  const entries = boot.registry.remotes.filter((r) => owners.has(r.name));
  register(entries);

  // Behaviours first: they enhance markup already on screen, and the header's signed-in label
  // is the first thing a visitor looks at after signing in.
  scanBehaviors(document, resolveBehavior);

  mark(MARKS.shellHydrateStart);

  // The zone application first: it is the reason the visitor is here, and the cart is chrome.
  // Mounting them in the other order would put a widget ahead of the page. The server rendered
  // the Frame around a skeleton inside #account-frame; the client owns that element from here,
  // because the sidebar's active state changes on every navigation.
  const frameRoot = document.getElementById('account-frame');
  if (frameRoot) {
    frameRoot.textContent = '';
    mount(ZoneRoot, { target: frameRoot, props: { store, viewer: boot.viewer } });
  }

  if (boot.personalized.length === 0) {
    mark(MARKS.shellHydrateEnd);
    return;
  }
  const slotOwners = new Set(boot.personalized.map((p) => p.slot.split('.')[0] ?? ''));
  const { slots } = await loadRemotes(
    entries.filter((r) => slotOwners.has(r.name)),
    { variant: 'live', onlySlots: boot.personalized.map((p) => p.slot) },
  );
  for (const spec of boot.personalized) {
    const el = document.querySelector<HTMLElement>(`[data-personalized="${spec.slot}"]`);
    const mountWidget = (slots as Record<string, unknown>)[spec.slot] as SlotMounter | undefined;
    if (!el || typeof mountWidget !== 'function') continue;
    el.textContent = '';
    mountWidget(el, { store });
  }
  mark(MARKS.shellHydrateEnd);
}

void start();
