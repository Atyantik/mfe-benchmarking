<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx, BUTTON_BASE, BUTTON_TONES, BUTTON_SIZES, type ButtonTone, type ButtonSize } from '../cx.ts';

  let {
    tone = 'primary',
    size = 'md',
    class: klass,
    children,
    ...rest
  }: { tone?: ButtonTone; size?: ButtonSize; class?: string; children: Snippet } & Record<string, unknown> =
    $props();
</script>

<a class={cx(BUTTON_BASE, BUTTON_TONES[tone], BUTTON_SIZES[size], klass)} {...rest}>
  {@render children()}
</a>
