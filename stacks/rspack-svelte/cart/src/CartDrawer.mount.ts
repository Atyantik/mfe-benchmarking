/**
 * A MOUNT FUNCTION, not a component. This is the load-bearing difference in the Svelte stack.
 *
 * A Svelte 5 component is not a portable value: it is a closure over the `svelte/internal/client`
 * instance that compiled it. Federation cannot share that instance — sharing it hangs the
 * container permanently (docs/svelte-federation.md) — so every remote has its own copy, and a
 * component object handed across the boundary is rendered by the WRONG runtime.
 *
 * It fails as `Cannot read properties of null (reading 'nodes')` from inside Svelte, naming
 * neither the remote nor the boundary it crossed.
 *
 * Exposing a function keeps the component on its own side: the remote mounts it with its own
 * runtime, and only a DOM node and plain data cross. The React stack does not need this because
 * react-dom is a genuine singleton there, which is exactly the asymmetry this repo exists to
 * measure rather than assert.
 */
import { mount, unmount } from 'svelte';
import type { CartStore } from '@mf-eval/contracts';
import CartRoot from './CartRoot.svelte';
import Body from './CartDrawer.svelte';

export default function mountWidget(target: HTMLElement, props: { store: CartStore }) {
  const app = mount(CartRoot, { target, props: { store: props.store, Body } });
  return () => {
    void unmount(app);
  };
}
