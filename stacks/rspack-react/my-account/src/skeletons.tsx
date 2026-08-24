import type { ReactElement } from 'react';
import { Card } from '@mf-eval/design';

/**
 * What the SERVER renders where per-user content will go.
 *
 * These exist for one measurable reason: they reserve the box. The client replaces a
 * skeleton with real content of the same height, so mounting costs no layout shift — the
 * same contract the cart placeholder has, at page scale (docs/decision-log.md D12).
 *
 * They are also the LCP element of every account page, which is worth being honest about.
 * An authenticated page is not indexed, so LCP here is a user-experience number rather than
 * an SEO one, and optimising it further would be theatre. The number that matters in a zone
 * is time to USEFUL content — the fetch and the interaction — not this.
 */
function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-sunken ${className}`} aria-hidden="true" />;
}

function Rows({ n }: { n: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }, (_, i) => (
        <Card key={i} className="flex min-h-[5.5rem] items-center gap-4 p-4">
          <div className="flex flex-1 flex-col gap-2">
            <Bar className="h-[0.9rem] w-[35%]" />
            <Bar className="h-3 w-[55%]" />
          </div>
          <Bar className="h-[0.9rem] w-16" />
        </Card>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="skeleton-account.overview">
      {/* The greeting block. It was missing, and its absence was the whole of this page's
          layout shift: the real content is three lines taller than the skeleton, so the
          footer moved every time the data arrived. A skeleton that omits a block does not
          reserve less space — it reserves the wrong space. */}
      <div className="flex flex-col gap-2">
        <Bar className="h-4 w-28" />
        <Bar className="h-6 w-72" />
        <Bar className="h-3 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex min-h-[6.5rem] flex-col gap-3 p-5">
            <Bar className="h-3 w-[60%]" />
            <Bar className="h-6 w-[40%]" />
          </Card>
        ))}
      </div>
      {/* The three widget regions other teams fill. Reserved server-side at the same size,
          so the page does not move when they arrive — or when they do not. */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="h-[13rem] overflow-hidden p-5">
            <Bar className="h-4 w-24" />
            <div className="mt-4 space-y-2">
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-4/5" />
            </div>
          </Card>
        ))}
      </div>
      <Rows n={4} />
    </div>
  );
}

export const SKELETONS: Record<string, () => ReactElement> = {
  'account.overview': OverviewSkeleton,
  'account.orders': () => (
    <div className="flex flex-col gap-3" data-testid="skeleton-account.orders">
      <Rows n={8} />
    </div>
  ),
  'account.order': () => (
    <div className="flex flex-col gap-6" data-testid="skeleton-account.order">
      <Card className="min-h-[9rem] p-5">
        <div className="flex flex-col gap-3">
          <Bar className="h-5 w-[45%]" />
          <Bar className="h-3 w-[30%]" />
        </div>
      </Card>
      <Rows n={3} />
    </div>
  ),
  'account.profile': () => (
    <div className="flex flex-col gap-6" data-testid="skeleton-account.profile">
      <Card className="min-h-[16rem] p-5">
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bar className="h-2.5 w-[25%]" />
              <Bar className="h-4 w-[70%]" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  ),
};

/** Anything unrecognised still gets a reserved box rather than a collapsing layout. */
export const FALLBACK_SKELETON = OverviewSkeleton;
