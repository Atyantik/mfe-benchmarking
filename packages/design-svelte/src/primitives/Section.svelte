<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx } from '../cx.ts';

  type Tone = 'page' | 'card' | 'sunken' | 'inverse';
  let { children, class: klass, tone = 'page' }: { children: Snippet; class?: string; tone?: Tone } =
    $props();

  const tones: Record<Tone, string> = {
    page: '',
    card: 'bg-card',
    sunken: 'bg-sunken',
    inverse: 'bg-[var(--s-inverse)] text-[var(--t-invert)]',
  };
</script>

<section class={cx('py-10 sm:py-14', tones[tone], klass)}>{@render children()}</section>
