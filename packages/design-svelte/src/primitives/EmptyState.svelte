<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, body, action }: { title: string; body: string; action?: Snippet } = $props();
</script>

<div class="rounded-lg border border-dashed border-line-strong bg-card px-6 py-14 text-center">
  <h3 class="mb-1 text-[length:var(--fs-lg)]">{title}</h3>
  <p class="mx-auto mb-5 max-w-prose text-[length:var(--fs-md)] text-ink-500">{body}</p>
  {#if action}{@render action()}{/if}
</div>
