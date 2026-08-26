/**
 * Slots — how one remote renders another remote's UI without depending on it.
 *
 * The product team needs the cart drawer on its page. It must NOT declare `cart` as a
 * build-time remote — that would put a second app in product's build config and recreate
 * exactly the coupling this repo exists to remove.
 *
 * Instead the SHELL, which already resolves every remote from the registry, fills named
 * slots. Product renders `<Slot name="cart.drawer" />` and knows nothing about which remote,
 * or which version of it, supplies the component.
 *
 * `SlotName` is duplicated from the React binding deliberately rather than imported from it:
 * the two stacks must not depend on each other, and the shared vocabulary that DOES belong in
 * one place is the test-id contract, which both import from `@mf-eval/contracts`.
 */
import { getContext, setContext } from 'svelte';
import type { Component } from 'svelte';

export type { SlotName } from '@mf-eval/contracts/slots';
import type { SlotName } from '@mf-eval/contracts/slots';

export interface SlotRegistry {
  slots: Partial<Record<SlotName, Component<Record<string, unknown>>>>;
  /**
   * Called during render for each slot that is actually filled, so the server knows which
   * remote components a page really rendered and can inject exactly their CSS. Guessing
   * statically would be wrong: the mini cart is on every page, the drawer only on detail.
   */
  onUse?: ((name: SlotName) => void) | undefined;
}

const SLOT_KEY = Symbol.for('mf-eval.slots');

export function provideSlots(registry: SlotRegistry): void {
  setContext(SLOT_KEY, registry);
}

export function useSlots(): SlotRegistry {
  return getContext<SlotRegistry | undefined>(SLOT_KEY) ?? { slots: {} };
}
