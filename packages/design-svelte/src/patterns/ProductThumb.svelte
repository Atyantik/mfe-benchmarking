<script lang="ts">
  import { cx } from '../cx.ts';
  import { variantOf, type ProductFamily } from './types.ts';

  /**
   * Deterministic line-art product imagery, drawn from the product id.
   *
   * Schematic silhouettes — the visual language of a datasheet rather than a marketing shot.
   * Identical geometry to the React stack's, because a difference here would show up as a
   * difference in bytes and in pixels, and neither would be the thing under test.
   */
  let { family, id, class: klass, label }: { family: ProductFamily; id: string; class?: string; label?: string } =
    $props();

  const v = variantOf(id);
</script>

<div class={cx('relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-md bg-sunken', klass)}>
  <svg
    viewBox="0 0 120 90"
    role={label ? 'img' : 'presentation'}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    class="h-full w-full"
  >
    <defs>
      <pattern id={`grid-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M6 0H0V6" fill="none" stroke="var(--color-ink-200)" stroke-width=".4" />
      </pattern>
    </defs>
    <rect width="120" height="90" fill={`url(#grid-${id})`} />
    <g fill="none" stroke="var(--color-brand-700)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
      {#if family === 'breaker'}
        <rect x="42" y="20" width="36" height="50" rx="2" fill="var(--color-card)" />
        <rect x="52" y="28" width="16" height="12" rx="1" fill="var(--color-brand-100)" />
        <path d="M60 40v10M52 62h16" />
        {#each Array.from({ length: 3 + v(3) }, (_, i) => i) as i (i)}
          <path d={`M46 ${50 + i * 4}h28`} stroke-width=".8" />
        {/each}
        <path d="M48 20v-8M72 20v-8M48 70v8M72 70v8" />
      {:else if family === 'controller'}
        <rect x="26" y="26" width="68" height="38" rx="2" fill="var(--color-card)" />
        <rect x="32" y="32" width="22" height="14" rx="1" fill="var(--color-brand-100)" />
        {#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
          <circle cx={62 + i * 5} cy={38} r="1.6" fill="var(--color-brand-600)" stroke="none" />
        {/each}
        <path d="M32 54h56" stroke-width=".8" />
        {#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
          <path d={`M${30 + i * 8} 64v6`} />
        {/each}
      {:else if family === 'ups'}
        <rect x="34" y="16" width="52" height="58" rx="3" fill="var(--color-card)" />
        <rect x="42" y="24" width="36" height="16" rx="1" fill="var(--color-brand-100)" />
        <path d="M58 28l-5 8h6l-4 7" stroke="var(--color-brand-700)" stroke-width="1.4" />
        {#each Array.from({ length: 2 + v(2) }, (_, i) => i) as i (i)}
          <circle cx={48 + i * 12} cy={56} r="4" />
        {/each}
        <path d="M42 68h36" stroke-width=".8" />
      {:else if family === 'sensor'}
        <circle cx="60" cy="42" r="18" fill="var(--color-card)" />
        <circle cx="60" cy="42" r="9" fill="var(--color-brand-100)" />
        <circle cx="60" cy="42" r="3" fill="var(--color-brand-600)" stroke="none" />
        <path d="M60 60v14M52 74h16" />
        {#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
          <path d={`M${84 + i * 5} ${34 - i * 2}a${10 + i * 5} ${10 + i * 5} 0 0 1 0 ${20 + i * 4}`} stroke-width=".9" />
        {/each}
      {:else if family === 'meter'}
        <rect x="36" y="22" width="48" height="46" rx="2" fill="var(--color-card)" />
        <rect x="43" y="30" width="34" height="18" rx="1" fill="var(--color-brand-100)" />
        <path d="M47 40h6l3-5 4 10 3-5h9" stroke-width="1.2" />
        {#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
          <rect x={43 + i * 9} y="54" width="6" height="6" rx="1" stroke-width=".9" />
        {/each}
      {/if}
    </g>
  </svg>
</div>
