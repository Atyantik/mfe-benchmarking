import { Card } from '@mf-eval/design';

import { day, money, type Order } from '../data';
import { fetchOrder } from './api';
import { Failed, Panel, StatusPill } from './parts';
import { SKELETONS } from '../skeletons';
import { useData } from './useData';

export const title = (params: Record<string, string>) => `Order ${params.id ?? ''} · My account`;

export function Page({ params }: { params: Record<string, string> }) {
  const id = params.id ?? '';
  const result = useData<Order>(() => fetchOrder(id), [id]);

  const Skeleton = SKELETONS['account.order'];
  if (result.state === 'loading') return Skeleton ? <Skeleton /> : null;
  if (result.state === 'error') return <Failed what={`order ${id}`} />;
  const order = result.data;

  return (
    <div className="flex flex-col gap-6" data-testid="page-account.order">
      <a href="/my-account/orders" data-testid="back-to-orders" className="text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline">
        &larr; All orders
      </a>

      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-[length:var(--fs-xl)] font-semibold tracking-tight text-ink-900">
            {order.reference}
          </h2>
          <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">
            Placed {day(order.placedAt)} · {order.poNumber}
          </p>
          <p className="mt-3 max-w-sm text-[length:var(--fs-sm)] text-ink-600">
            Ship to {order.shipTo}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill status={order.status} />
          <p className="text-[length:var(--fs-2xl)] font-semibold tabular-nums text-ink-900">
            {money(order.total)}
          </p>
        </div>
      </Card>

      <Panel title={`Lines (${order.lines.length})`}>
        <ul className="flex flex-col gap-3">
          {order.lines.map((line) => (
            <Card as="li" key={line.productId} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[14rem] flex-1">
                <a
                  href={`/product/${line.productId}`}
                  data-testid={`line-product-${line.productId}`}
                  className="text-[length:var(--fs-md)] font-medium text-ink-900 hover:text-brand-700"
                >
                  {line.name}
                </a>
                <p className="mt-0.5 text-[length:var(--fs-sm)] text-ink-500">{line.sku}</p>
              </div>
              <p className="text-[length:var(--fs-sm)] tabular-nums text-ink-600">
                {line.qty} &times; {money(line.unitPrice)}
              </p>
              <p className="w-24 text-right text-[length:var(--fs-md)] font-semibold tabular-nums text-ink-900">
                {money(line.qty * line.unitPrice)}
              </p>
            </Card>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
