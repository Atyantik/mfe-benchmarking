<script lang="ts">
  import type { Component } from 'svelte';
  import { provideCart } from '@mf-eval/svelte-contracts';
  import type { CartStore } from '@mf-eval/contracts';

  /** Establishes the cart context on the REMOTE's side of the boundary. */
  let { store, Body }: { store: CartStore; Body: Component } = $props();

  // svelte-ignore state_referenced_locally
  provideCart(store);
</script>

<Body />
