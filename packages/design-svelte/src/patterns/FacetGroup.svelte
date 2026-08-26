<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx } from '../cx.ts';
  let { title, children, scroll = false }: { title: string; children: Snippet; scroll?: boolean } =
    $props();
</script>

<fieldset class="border-b border-line py-4 last:border-0">
  <legend class="mb-2 text-[length:var(--fs-sm)] font-semibold text-ink-800">{title}</legend>
  <div class={cx('flex flex-col gap-1.5', scroll && 'max-h-56 overflow-y-auto pr-1')}>
    {@render children()}
  </div>
</fieldset>
