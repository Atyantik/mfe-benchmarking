<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, hint, children }: { label: string; hint?: string; children: Snippet } = $props();
</script>

<label class="block">
  <span class="mb-1.5 block text-[length:var(--fs-sm)] font-medium text-ink-700">{label}</span>
  {@render children()}
  {#if hint}<span class="mt-1 block text-[length:var(--fs-xs)] text-ink-500">{hint}</span>{/if}
</label>
