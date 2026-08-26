<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Native disclosure. Works with JavaScript switched off, and ships none. */
  let { question, children, open = false }: { question: string; children: Snippet; open?: boolean } =
    $props();
</script>

<details {open} class="group border-b border-line last:border-0">
  <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink-800 marker:hidden hover:text-brand-700">
    <span>{question}</span>
    <span aria-hidden="true" class="shrink-0 text-ink-500 transition-transform group-open:rotate-45">+</span>
  </summary>
  <div class="pb-5 pr-8 text-ink-600">{@render children()}</div>
</details>
