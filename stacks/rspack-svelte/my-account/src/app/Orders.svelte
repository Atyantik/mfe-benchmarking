<script lang="ts">
  import { Button, Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import { STATUS_LABEL, type Order, type OrderStatus } from '../data.ts';
  import { fetchOrders } from './api.ts';
  import { Resource } from './async.svelte.ts';
  import Failed from './Failed.svelte';
  import OrderRow from './OrderRow.svelte';
  import Panel from './Panel.svelte';
  import OrdersSkeleton from '../skeletons/Orders.svelte';

  const FILTERS: (OrderStatus | 'all')[] = ['all', 'processing', 'in-transit', 'delivered', 'cancelled'];

  const orders = new Resource<{ orders: Order[] }>(fetchOrders);

  /**
   * Filtering is local state, not a URL parameter.
   *
   * This is the one place a zone earns its keep: the list is already in memory, so narrowing it
   * is instant and costs no request. On the storefront the same feature is a server round trip
   * through the URL, because those pages must be linkable and indexed. Neither answer is wrong;
   * they are answers to different questions.
   */
  let filter = $state<OrderStatus | 'all'>('all');
</script>

{#if orders.current.state === 'loading'}
  <OrdersSkeleton />
{:else if orders.current.state === 'error'}
  <Failed what="your orders" />
{:else}
  {@const all = orders.current.data.orders}
  {@const shown = filter === 'all' ? all : all.filter((o) => o.status === filter)}
  <div class="flex flex-col gap-5" data-testid={ACCOUNT.page('account.orders')}>
    <Panel title={`Orders (${all.length})`}>
      {#snippet children()}
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <!-- A filter chip is still a button, so it is the design system's Button with a pill
               radius — not a hand-rolled control that drifts from every other one. -->
          {#each FILTERS as f (f)}
            <Button
              type="button"
              size="sm"
              tone={filter === f ? 'primary' : 'secondary'}
              data-testid={ACCOUNT.filter(f)}
              aria-pressed={filter === f}
              onclick={() => { filter = f; }}
              class="rounded-full"
            >{f === 'all' ? 'All' : STATUS_LABEL[f]}</Button>
          {/each}
        </div>
      {/snippet}
    </Panel>

    {#if shown.length === 0}
      <Card class="p-6" data-testid={ACCOUNT.ordersEmpty}>
        <p class="text-[length:var(--fs-md)] text-ink-700">No orders with that status.</p>
      </Card>
    {:else}
      <ul class="flex flex-col gap-3" data-testid={ACCOUNT.ordersList}>
        {#each shown as order (order.id)}
          <OrderRow {order} />
        {/each}
      </ul>
    {/if}
  </div>
{/if}
