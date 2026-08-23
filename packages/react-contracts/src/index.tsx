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
  // Bound explicitly. createCartStore returns closures rather than prototype methods, so
  // passing them bare is safe — but saying so in code beats asking every reader to verify
  // it, and it keeps the store's shape free to change.
  const subscribe = useCallback((fn: () => void) => store.subscribe(fn), [store]);
  const snapshot = useCallback(() => store.getSnapshot(), [store]);
  // Third argument is the server snapshot; the store is per request, so it is the same one.
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function useCartActions(): { add: (item: CartItem) => void; clear: () => void } {
  const store = useCartStore();
  const add = useCallback((item: CartItem) => { store.add(item); }, [store]);
  const clear = useCallback(() => { store.clear(); }, [store]);
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
export type SlotName = 'cart.drawer' | 'cart.mini' | 'cart.page';

interface SlotRegistry {
  slots: Partial<Record<SlotName, ComponentType>>;
  /**
   * Called during render for each slot that is actually filled.
   *
   * The server uses this to know which remote components a page really rendered, so it
   * can inject exactly their CSS and nothing else. Guessing statically would be wrong:
   * MiniCart is on every page, CartDrawer only on product detail.
   */
  onUse?: ((name: SlotName) => void) | undefined;
}

const SlotContext = createContext<SlotRegistry>({ slots: {} });

export function SlotProvider({
  slots,
  onUse,
  children,
}: {
  slots: Partial<Record<SlotName, ComponentType>>;
  onUse?: ((name: SlotName) => void) | undefined;
  children: ReactNode;
}) {
  return <SlotContext.Provider value={{ slots, onUse }}>{children}</SlotContext.Provider>;
}

/**
 * Renders whatever the shell put in this slot. An unfilled slot renders `fallback`
 * (default: nothing) rather than throwing — a remote being unavailable must degrade
 * the page, not break it.
 */
export function Slot({ name, fallback = null }: { name: SlotName; fallback?: ReactNode }) {
  const { slots, onUse } = useContext(SlotContext);
  const Filled = slots[name];
  if (!Filled) return <>{fallback}</>;
  // Safe during renderToString (single pass). On the client it is a no-op — no onUse.
  onUse?.(name);
  // The wrapper is the anchor the client mounts into. Marking it here rather than at each
  // call site means a personalized slot placed anywhere in any remote's tree is findable,
  // without the shell needing to know where it ended up.
  // data-owner scopes the providing remote's stylesheet to this subtree; data-personalized
  // is the anchor the client mounts into.
  return (
    <div data-personalized={name} data-owner={name.split('.')[0]}>
      <Filled />
    </div>
  );
}

export { EMPTY_CART };
export type { CartItem, CartState, CartStore };
