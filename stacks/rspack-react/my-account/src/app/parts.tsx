import type { ReactNode } from 'react';
import { Card } from '@mf-eval/design';

import { STATUS_LABEL, day, money, type Order } from '../data';

/** Shared inside the zone only. If the storefront ever needs one, it moves to @mf-eval/design. */

export function StatusPill({ status }: { status: Order['status'] }) {
  const tone =
    status === 'delivered'
      ? 'bg-ok-soft text-ok'
      : status === 'in-transit'
        ? 'bg-info-soft text-info'
        : status === 'processing'
          ? 'bg-warn-soft text-warn'
          : 'bg-sunken text-ink-500';
  return (
    <span
      // `data-status`, not a test id. An id that names a CATEGORY matches eight elements on
      // the orders page, so any selector using it is ambiguous — which the contract checker
      // caught. Tests scope to a row by its order id, then read the state from here.
      data-status={status}
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[length:var(--fs-xs)] font-medium ${tone}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function OrderRow({ order }: { order: Order }) {
  return (
    <Card as="li" className="relative flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-[12rem] flex-1">
        <a
          href={`/my-account/orders/${order.id}`}
          data-testid={`order-link-${order.id}`}
          className="text-[length:var(--fs-md)] font-medium text-ink-900 after:absolute after:inset-0 hover:text-brand-700"
        >
          {order.reference}
        </a>
        <p className="mt-0.5 text-[length:var(--fs-sm)] text-ink-500">
          {day(order.placedAt)} · {order.lines.length} line{order.lines.length === 1 ? '' : 's'} · {order.poNumber}
        </p>
      </div>
      <StatusPill status={order.status} />
      <p className="w-24 text-right text-[length:var(--fs-md)] font-semibold tabular-nums text-ink-900">
        {money(order.total)}
      </p>
    </Card>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-[length:var(--fs-lg)] font-semibold tracking-tight text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Failed({ what }: { what: string }) {
  return (
    <Card className="p-5" data-testid="load-error">
      <p className="text-[length:var(--fs-md)] font-medium text-ink-900">Could not load {what}.</p>
      <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">
        The rest of your account still works. <a href="/my-account" className="text-brand-700 underline">Back to overview</a>.
      </p>
    </Card>
  );
}
