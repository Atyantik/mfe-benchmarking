import { Card } from '@mf-eval/design';

/**
 * Reserves the exact box the live widget will occupy.
 *
 * Server-rendered, identical for everyone, and the same height as the real thing — so
 * mounting the live component moves nothing. Owned by the cart team alongside the widget,
 * because a placeholder that drifts from its component is a layout shift waiting to happen.
 */
export default function AccountCartPlaceholder() {
  return (
    <Card className="flex size-full flex-col overflow-hidden p-5" data-testid="placeholder-account-cart">
      <div className="h-4 w-24 rounded bg-sunken" aria-hidden="true" />
      <div className="mt-4 flex-1 space-y-2" aria-hidden="true">
        <div className="h-3 w-full rounded bg-sunken" />
        <div className="h-3 w-4/5 rounded bg-sunken" />
      </div>
      <div className="mt-3 h-3 w-28 rounded bg-sunken" aria-hidden="true" />
    </Card>
  );
}
