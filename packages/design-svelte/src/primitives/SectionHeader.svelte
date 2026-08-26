<script lang="ts">
  import type { Snippet } from 'svelte';
  let { eyebrow, title, action }: { eyebrow?: string; title: string; action?: Snippet } = $props();
</script>

<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
  <div>
    {#if eyebrow}
      <p class="mb-1 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-brand-700">
        {eyebrow}
      </p>
    {/if}
    <h2 class="text-[length:var(--fs-2xl)] leading-tight">{title}</h2>
  </div>
  {#if action}{@render action()}{/if}
</div>
