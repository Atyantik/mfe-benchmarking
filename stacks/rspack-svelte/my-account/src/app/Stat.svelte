<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  let { label, value, sub }: { label: string; value: string; sub?: string } = $props();
</script>

<Card class="flex min-h-[6.5rem] flex-col justify-center gap-1 p-5">
  <p class="text-[length:var(--fs-xs)] font-medium uppercase tracking-[0.08em] text-ink-500">{label}</p>
  <p class="text-[length:var(--fs-2xl)] font-semibold tabular-nums text-ink-900">{value}</p>
  {#if sub}<p class="text-[length:var(--fs-sm)] text-ink-500">{sub}</p>{/if}
</Card>
