<script lang="ts">
  import { cx } from '../cx.ts';
  let { cents, size = 'md', suffix }: { cents: number; size?: 'sm' | 'md' | 'lg'; suffix?: string } =
    $props();

  const sizes = {
    sm: 'text-[length:var(--fs-md)]',
    md: 'text-[length:var(--fs-lg)]',
    lg: 'text-[length:var(--fs-2xl)]',
  } as const;
  const dollars = $derived(Math.floor(cents / 100).toLocaleString('en-US'));
  const rest = $derived(String(cents % 100).padStart(2, '0'));
</script>

<span class={cx('font-semibold tabular-nums text-ink-900', sizes[size])}>${dollars}<span
    class="text-[0.75em] align-baseline">.{rest}</span>{#if suffix}<span
      class="ml-1 text-[length:var(--fs-xs)] font-normal text-ink-500">{suffix}</span>{/if}</span>
