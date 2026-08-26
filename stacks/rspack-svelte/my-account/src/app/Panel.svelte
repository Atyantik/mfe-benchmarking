<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Shared inside the zone only. If the storefront ever needs one, it moves to the design system. */
  let { title, children, action }: { title: string; children: Snippet; action?: Snippet } = $props();
</script>

<section>
  <div class="mb-3 flex items-center justify-between gap-4">
    <h2 class="text-[length:var(--fs-lg)] font-semibold tracking-tight text-ink-900">{title}</h2>
    {#if action}{@render action()}{/if}
  </div>
  {@render children()}
</section>
