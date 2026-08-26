<script lang="ts">
  import { provideSlots, type SlotName } from '@mf-eval/svelte-contracts';
  import type { Component } from 'svelte';
  import Home from './Home.svelte';

  /**
   * The whole document tree, as one component.
   *
   * Svelte context can only be established from inside a component, so the slot registry that
   * the React stack passes as a `<SlotProvider>` wrapper becomes props on this. Everything else
   * is the same shape: the page frame belongs to the HOST, and chrome contributes a header and
   * a footer as SIBLINGS of the content — never a wrapper. A wrapper would put every host's
   * page content inside `[data-owner="chrome"]` and chrome's scoped stylesheet would then match
   * other teams' markup.
   */
  let {
    slots,
    onUse,
    Chrome,
    Page,
    data,
    params,
    owner,
    variant,
  }: {
    slots: Partial<Record<SlotName, unknown>>;
    onUse?: (name: SlotName) => void;
    Chrome: { Header: Component; Footer: Component } | null;
    Page?: Component | undefined;
    data?: unknown;
    params?: Record<string, string | undefined>;
    owner?: string | undefined;
    variant: 'home' | 'route' | 'not-found' | 'no-component';
  } = $props();

  // `provideSlots` types its registry as components because the React-shaped Slot renders one.
  // In this stack a slot value is whatever the remote exposed — a mount function — so the cast
  // is where the two descriptions meet. shell-kit deliberately keeps it opaque; see
  // packages/shell-kit/src/remotes.ts.
  provideSlots({ slots: slots as Parameters<typeof provideSlots>[0]['slots'], onUse });
</script>

<div class="flex min-h-screen flex-col bg-page">
  {#if Chrome}<Chrome.Header host="storefront" />{/if}
  <main id="main" class="flex-1">
    {#if variant === 'home'}
      <Home />
    {:else if variant === 'not-found'}
      <h1>Not found</h1>
    {:else if variant === 'no-component'}
      <h1>Route has no component</h1>
    {:else if Page}
      <!-- `data-owner` is what the remote's scoped stylesheet hangs off — without it the
           remote's CSS matches nothing. -->
      <div data-owner={owner}>
        <Page {data} {params} />
      </div>
    {/if}
  </main>
  {#if Chrome}<Chrome.Footer />{/if}
</div>
