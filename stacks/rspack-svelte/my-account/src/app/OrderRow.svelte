<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import { day, money, type Order } from '../data.ts';
  import StatusPill from './StatusPill.svelte';

  let { order }: { order: Order } = $props();
</script>

<Card as="li" class="relative flex flex-wrap items-center gap-4 p-4">
  <div class="min-w-[12rem] flex-1">
    <a
      href={`/my-account/orders/${order.id}`}
      data-testid={ACCOUNT.orderLink(order.id)}
      class="text-[length:var(--fs-md)] font-medium text-ink-900 after:absolute after:inset-0 hover:text-brand-700"
    >{order.reference}</a>
    <p class="mt-0.5 text-[length:var(--fs-sm)] text-ink-500">
      {day(order.placedAt)} · {order.lines.length} line{order.lines.length === 1 ? '' : 's'} · {order.poNumber}
    </p>
  </div>
  <StatusPill status={order.status} />
  <p class="w-24 text-right text-[length:var(--fs-md)] font-semibold tabular-nums text-ink-900">
    {money(order.total)}
  </p>
</Card>
