<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx } from '../cx.ts';
  let { children, class: klass }: { children: Snippet; class?: string } = $props();
</script>

<div class={cx('mx-auto w-full max-w-[80rem] px-4 sm:px-6', klass)}>{@render children()}</div>
