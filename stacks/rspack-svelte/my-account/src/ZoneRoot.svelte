<script lang="ts">
  import { provideCart } from '@mf-eval/svelte-contracts';
  import type { CartStore } from '@mf-eval/contracts';
  import type { FrameViewer } from './Frame.svelte';
  import ZoneApp from './ZoneApp.svelte';

  /**
   * Carries the cart context around the zone application.
   *
   * The cart team's widget reads cart state through the shared contract, exactly as its header
   * sibling does. Providing the store here is what lets a remote render per-user UI without
   * this application knowing anything about carts — and context can only be established from
   * inside a component, which is why this file exists at all.
   */
  let { store, viewer }: { store: CartStore; viewer: FrameViewer | null } = $props();

  // Set once at initialisation; the store instance is a process-wide singleton and never
  // changes identity for the life of this component.
  // svelte-ignore state_referenced_locally
  provideCart(store);
</script>

<ZoneApp {viewer} />
