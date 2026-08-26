<script lang="ts">
  import { provideCart, provideSlots } from '@mf-eval/svelte-contracts';
  import type { CartStore } from '@mf-eval/contracts';

  /**
   * The context carrier for a mounted island.
   *
   * Svelte context can only be set from inside a component during initialisation, so an island
   * cannot be mounted directly — it is wrapped in this, which establishes the cart and slot
   * contexts and then renders it. The React stack nests two providers around the component for
   * the same reason; this is the same shape, expressed once.
   */
  let { store, slots, Live }: {
    store: CartStore;
    slots: Record<string, unknown>;
    Live: import('svelte').Component;
  } = $props();

  provideCart(store);
  provideSlots({ slots });
</script>

<Live />
