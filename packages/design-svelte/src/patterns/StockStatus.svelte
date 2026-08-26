<script lang="ts">
  import Badge from '../primitives/Badge.svelte';
  import type { Availability } from './types.ts';
  let { status, leadTimeDays }: { status: Availability; leadTimeDays: number } = $props();
</script>

{#if status === 'in-stock'}
  <Badge tone="ok">In stock · ships in {leadTimeDays}d</Badge>
{:else if status === 'low'}
  <Badge tone="warn">Low stock · {leadTimeDays}d</Badge>
{:else}
  <Badge tone="neutral">Backorder · {leadTimeDays}d</Badge>
{/if}
