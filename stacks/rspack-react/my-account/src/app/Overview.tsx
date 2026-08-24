import { Card } from '@mf-eval/design';

import { money, type AccountSummary } from '../data';
import { fetchSummary } from './api';
import { Failed, OrderRow, Panel } from './parts';
import { LazySlot } from './LazySlot';
import { FALLBACK_SKELETON as FallbackSkeleton } from '../skeletons';
import { useData } from './useData';

export const title = () => 'Overview · My account';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex min-h-[6.5rem] flex-col justify-center gap-1 p-5">
      <p className="text-[length:var(--fs-xs)] font-medium uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p className="text-[length:var(--fs-2xl)] font-semibold tabular-nums text-ink-900">{value}</p>
      {sub ? <p className="text-[length:var(--fs-sm)] text-ink-500">{sub}</p> : null}
    </Card>
  );
}

export function Page() {
  const result = useData<AccountSummary>(fetchSummary, []);
  // The skeleton stays on screen while loading. It is the same markup the server sent, so
  // nothing moves and the route still has something painted at every moment.
  if (result.state === 'loading') return <FallbackSkeleton />;
  if (result.state === 'error') return <Failed what="your account summary" />;
  const s = result.data;

  return (
    <div className="flex flex-col gap-8" data-testid="page-account.overview">
      <div>
        <p className="text-[length:var(--fs-md)] text-ink-500">Welcome back,</p>
        <p className="text-[length:var(--fs-xl)] font-semibold tracking-tight text-ink-900">
          {s.name} · {s.company}
        </p>
        <p className="text-[length:var(--fs-sm)] text-ink-500">Account {s.accountNumber}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open orders" value={String(s.openOrders)} sub="Awaiting despatch" />
        <Stat label="In transit" value={String(s.inTransit)} sub="On the way to site" />
        <Stat
          label="Credit used"
          value={money(s.creditUsed)}
          sub={`of ${money(s.creditLimit)} limit`}
        />
      </div>

      {/* Three regions, three different teams, and this file imports none of them.
          Each is a named slot: the account host renders the name, the shell-kit slot table
          says who fills it, and federation does the rest. Nothing here is downloaded on any
          page that does not render these slots — including the other routes of this very
          application. */}
      <div className="grid gap-4 lg:grid-cols-3" data-testid="account-widgets">
        <LazySlot name="account.cart" />
        <LazySlot name="account.recommended" />
        <LazySlot name="account.support" />
      </div>

      <Panel
        title="Recent orders"
        action={
          <a href="/my-account/orders" data-testid="see-all-orders" className="text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline">
            See all orders
          </a>
        }
      >
        <ul className="flex flex-col gap-3">
          {s.recent.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
