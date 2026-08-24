import { useState } from 'react';
import { Button, Card } from '@mf-eval/design';

import { STATUS_LABEL, type Order, type OrderStatus } from '../data';
import { fetchOrders } from './api';
import { Failed, OrderRow, Panel } from './parts';
import { SKELETONS } from '../skeletons';
import { useData } from './useData';

export const title = () => 'Orders · My account';

const FILTERS: (OrderStatus | 'all')[] = ['all', 'processing', 'in-transit', 'delivered', 'cancelled'];

export function Page() {
  const result = useData<{ orders: Order[] }>(fetchOrders, []);
  /**
   * Filtering is local state, not a URL parameter.
   *
   * This is the one place a zone earns its keep: the list is already in memory, so
   * narrowing it is instant and costs no request. On the storefront the same feature is a
   * server round trip through the URL, because those pages must be linkable and indexed.
   * Neither answer is wrong; they are answers to different questions.
   */
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const Skeleton = SKELETONS['account.orders'];
  if (result.state === 'loading') return Skeleton ? <Skeleton /> : null;
  if (result.state === 'error') return <Failed what="your orders" />;

  const orders = result.data.orders;
  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="flex flex-col gap-5" data-testid="page-account.orders">
      <Panel title={`Orders (${orders.length})`}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {/* A filter chip is still a button, so it is the design system's Button with a
              pill radius — not a hand-rolled control that drifts from every other one. */}
          {FILTERS.map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              tone={filter === f ? 'primary' : 'secondary'}
              data-testid={`filter-${f}`}
              aria-pressed={filter === f}
              onClick={() => { setFilter(f); }}
              className="rounded-full"
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
            </Button>
          ))}
        </div>
      </Panel>

      {shown.length === 0 ? (
        <Card className="p-6" data-testid="orders-empty">
          <p className="text-[length:var(--fs-md)] text-ink-700">No orders with that status.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="orders-list">
          {shown.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
