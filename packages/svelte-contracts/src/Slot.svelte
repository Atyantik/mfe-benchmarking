<script lang="ts">
  import { useSlots, type SlotName } from './slots.svelte.ts';

  let { name, children }: { name: SlotName; children?: import('svelte').Snippet } = $props();

  const { slots, onUse } = useSlots();
  const Filled = slots[name];
  // Safe during a server render (single pass). On the client there is no onUse.
  if (Filled) onUse?.(name);
  const owner = name.split('.')[0];
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
