/**
 * @mf-eval/svelte-contracts — the Svelte binding layer over @mf-eval/contracts.
 *
 * The mirror of `@mf-eval/react-contracts`, and it exists for the same reason: the contract
 * package must stay framework-agnostic so every stack reuses it verbatim, but the binding
 * that carries it through a component tree has *identity*. A Svelte context key is a module
 * -level symbol; the shell's provider and a remote's consumer only meet if both resolve the
 * same module instance. So this package is `shared: { singleton: true }`, exactly like the
 * React one.
 *
 * What is NOT shared, and cannot be, is `svelte/internal/client` — sharing it hangs the
 * container permanently (docs/svelte-federation.md). Every Svelte remote therefore has its own
 * reactive graph, which is precisely why the cart lives in a framework-agnostic store with a
 * cookie behind it rather than in framework state. The architecture was already shaped for
 * this; the Svelte stack is what proves it was worth doing.
 */
import { getContext, setContext } from 'svelte';
import { EMPTY_CART, type CartItem, type CartState, type CartStore } from '@mf-eval/contracts';

const CART_KEY = Symbol.for('mf-eval.cart');

/**
 * A reactive view over the framework-agnostic store.
 *
 * `CartStore.subscribe` is React-shaped — the listener takes no value and the caller re-reads
 * `getSnapshot()`. Svelte's own store contract passes the value in, so this is an adapter and
 * not a store: it bridges one convention to a rune without either side knowing about the other.
 */
export class CartView {
  #store: CartStore;
  current = $state<CartState>(EMPTY_CART);

  constructor(store: CartStore) {
    this.#store = store;
    this.current = store.getSnapshot();
    // On the server this fires zero times and the initial snapshot is the whole story, which
    // is correct: an SSR pass is a single synchronous render.
    store.subscribe(() => {
      this.current = this.#store.getSnapshot();
    });
  }

  add(item: CartItem) {
    this.#store.add(item);
  }

  clear() {
    this.#store.clear();
  }
}

/** Called once by each host, high in the tree. */
export function provideCart(store: CartStore): CartView {
  const view = new CartView(store);
  setContext(CART_KEY, view);
  return view;
}

export function useCart(): CartView {
  const view = getContext<CartView | undefined>(CART_KEY);
  if (!view) {
    // A remote rendering outside the provider means the shared singleton broke — usually two
    // copies of this package, i.e. a `shared` misconfiguration.
    throw new Error(
      '[mf-eval] No cart context found. @mf-eval/svelte-contracts must be shared as a singleton.',
    );
  }
  return view;
}

export { EMPTY_CART };
export type { CartItem, CartState, CartStore };
