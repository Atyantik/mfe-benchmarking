/**
 * @mf-eval/react-contracts — the React binding layer over @mf-eval/contracts.
 *
 * Why this is a separate package: @mf-eval/contracts must stay framework-agnostic so
 * the Preact/Solid/Svelte/Vue stacks can reuse it verbatim. But a React context object
 * has *identity* — the shell's provider and a remote's consumer only connect if both
 * resolve the exact same module instance. So this package is `shared: { singleton: true }`
 * exactly like react itself.
 *
 * This is what lets `product` update `cart` without either one importing the other
 * (docs/topology.md § Rule 2). Both depend on the contract; neither depends on a remote.
 */
import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';
import { EMPTY_CART, type CartItem, type CartState, type CartStore } from '@mf-eval/contracts';

const CartContext = createContext<CartStore | null>(null);

export function CartProvider({ store, children }: { store: CartStore; children: ReactNode }) {
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}

export function useCartStore(): CartStore {
  const store = useContext(CartContext);
  if (!store) {
    // A remote rendering outside the shell's provider means the shared singleton broke —
    // usually two copies of this package, i.e. a `shared` misconfiguration.
    throw new Error(
      '[mf-eval] No CartProvider found. @mf-eval/react-contracts must be shared as a singleton.',
    );
  }
  return store;
}

/** Subscribes to cart state. Safe during SSR: the server snapshot is the same store. */
export function useCart(): CartState {
  const store = useCartStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    // Server snapshot. The store is created per request, so this is correct per user.
    store.getSnapshot,
  );
}

export function useCartActions(): { add: (item: CartItem) => void; clear: () => void } {
  const store = useCartStore();
  const add = useCallback((item: CartItem) => store.add(item), [store]);
  const clear = useCallback(() => store.clear(), [store]);
  return { add, clear };
}

// ---------------------------------------------------------------------------
// Slots — how one remote renders another remote's UI without depending on it
// ---------------------------------------------------------------------------

/**
 * The product team needs the cart drawer on its page. It must NOT declare `cart` as a
 * build-time remote — that would put a second app in product's build config and
 * recreate exactly the coupling this repo exists to remove.
 *
 * Instead the SHELL, which already resolves every remote from the registry, fills
 * named slots. Product renders <Slot name="cart.drawer" /> and knows nothing about
 * which remote (or which version of it) supplies the component.
 */
export type SlotName = 'cart.drawer' | 'cart.mini';

const SlotContext = createContext<Partial<Record<SlotName, ComponentType>>>({});

export function SlotProvider({
  slots,
  children,
}: {
  slots: Partial<Record<SlotName, ComponentType>>;
  children: ReactNode;
}) {
  return <SlotContext.Provider value={slots}>{children}</SlotContext.Provider>;
}

/**
 * Renders whatever the shell put in this slot. An unfilled slot renders `fallback`
 * (default: nothing) rather than throwing — a remote being unavailable must degrade
 * the page, not break it.
 */
export function Slot({ name, fallback = null }: { name: SlotName; fallback?: ReactNode }) {
  const slots = useContext(SlotContext);
  const Filled = slots[name];
  if (!Filled) return <>{fallback}</>;
  return <Filled />;
}

export { EMPTY_CART };
export type { CartItem, CartState, CartStore };
