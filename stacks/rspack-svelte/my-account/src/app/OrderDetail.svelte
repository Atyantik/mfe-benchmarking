<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import { day, money, type Order } from '../data.ts';
  import { fetchOrder } from './api.ts';
  import { Resource } from './async.svelte.ts';
  import Failed from './Failed.svelte';
  import Panel from './Panel.svelte';
  import StatusPill from './StatusPill.svelte';
  import OrderSkeleton from '../skeletons/Order.svelte';

  let { params }: { params?: Record<string, string> } = $props();
  const id = $derived(params?.id ?? '');

  // The rune tracks `id` because the closure reads it — no dependency array to keep in step.
  const order = new Resource<Order>(() => fetchOrder(id));
</script>

{#if order.current.state === 'loading'}
  <OrderSkeleton />
{:else if order.current.state === 'error'}
  <Failed what={`order ${id}`} />
{:else}
  {@const o = order.current.data}
  <div class="flex flex-col gap-6" data-testid={ACCOUNT.page('account.order')}>
    <a
      href="/my-account/orders"
      data-testid={ACCOUNT.backToOrders}
      class="text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline"
    >&larr; All orders</a>

    <Card class="flex flex-wrap items-start justify-between gap-4 p-5">
      <div>
        <h2 class="text-[length:var(--fs-xl)] font-semibold tracking-tight text-ink-900">{o.reference}</h2>
        <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">Placed {day(o.placedAt)} · {o.poNumber}</p>
        <p class="mt-3 max-w-sm text-[length:var(--fs-sm)] text-ink-600">Ship to {o.shipTo}</p>
      </div>
      <div class="flex flex-col items-end gap-2">
        <StatusPill status={o.status} />
        <p class="text-[length:var(--fs-2xl)] font-semibold tabular-nums text-ink-900">{money(o.total)}</p>
      </div>
    </Card>

    <Panel title={`Lines (${o.lines.length})`}>
      {#snippet children()}
        <ul class="flex flex-col gap-3">
          {#each o.lines as line (line.productId)}
            <Card as="li" class="flex flex-wrap items-center gap-4 p-4">
              <div class="min-w-[14rem] flex-1">
                <a
                  href={`/product/${line.productId}`}
                  data-testid={ACCOUNT.lineProduct(line.productId)}
                  class="text-[length:var(--fs-md)] font-medium text-ink-900 hover:text-brand-700"
                >{line.name}</a>
                <p class="mt-0.5 text-[length:var(--fs-sm)] text-ink-500">{line.sku}</p>
              </div>
              <p class="text-[length:var(--fs-sm)] tabular-nums text-ink-600">
                {line.qty} &times; {money(line.unitPrice)}
              </p>
              <p class="w-24 text-right text-[length:var(--fs-md)] font-semibold tabular-nums text-ink-900">
                {money(line.qty * line.unitPrice)}
              </p>
            </Card>
          {/each}
        </ul>
      {/snippet}
    </Panel>
  </div>
{/if}
