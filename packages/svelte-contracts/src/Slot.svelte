<script lang="ts">
  import { useSlots, type SlotName } from './slots.svelte.ts';

  let { name, children }: { name: SlotName; children?: import('svelte').Snippet } = $props();

  // The registry itself is context and never changes; what it is INDEXED by is a prop, so the
  // lookup and everything derived from it must be reactive. A plain `const` here captures the
  // first slot name only — invisible in a single server render, wrong on the client.
  const { slots, onUse } = useSlots();
  const Filled = $derived(slots[name]);
  const owner = $derived(name.split('.')[0]);

  /**
   * Reported during RENDER, not from an effect.
   *
   * `$effect` does not run during server rendering, and `onUse` exists precisely so the SERVER
   * can know which remote components a page actually rendered and inject exactly their CSS.
   * Putting it in an effect silences a warning and breaks per-route stylesheet injection — the
   * page then either misses a remote's CSS or ships every remote's.
   *
   * Safe here: a server render is a single synchronous pass, and on the client `onUse` is
   * undefined, so this is a no-op there.
   */
  if (slots[name]) onUse?.(name);
</script>

{#if Filled}
  <!--
    The wrapper is the anchor the client mounts into. Marking it here rather than at each call
    site means a personalized slot placed anywhere in any remote's tree is findable, without the
    shell needing to know where it ended up. `data-owner` scopes the providing remote's
    stylesheet to this subtree.
  -->
  <div data-personalized={name} data-owner={owner}>
    <Filled />
  </div>
{:else if children}
  <!-- An unfilled slot degrades the page rather than breaking it. -->
  {@render children()}
{/if}
