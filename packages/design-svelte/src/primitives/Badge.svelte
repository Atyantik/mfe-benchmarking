<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx } from '../cx.ts';

  type BadgeTone = 'neutral' | 'ok' | 'warn' | 'alert' | 'info' | 'brand';
  let { tone = 'neutral', children }: { tone?: BadgeTone; children: Snippet } = $props();

  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    ok: 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]',
    warn: 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]',
    alert: 'bg-[var(--color-alert-soft)] text-[var(--color-alert)]',
    info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
    brand: 'bg-brand-100 text-brand-800',
  };
</script>

<span
  class={cx(
    'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide',
    tones[tone],
  )}
>{@render children()}</span>
