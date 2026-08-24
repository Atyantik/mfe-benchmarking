import { Card } from '@mf-eval/design';

/** Reserves the live widget's exact box. Owned by the support team, beside the widget. */
export default function AccountSupportPlaceholder() {
  return (
    <Card className="flex size-full flex-col overflow-hidden p-5" data-testid="placeholder-account-support">
      <div className="h-4 w-20 rounded bg-sunken" aria-hidden="true" />
      <div className="mt-4 flex-1 space-y-2" aria-hidden="true">
        <div className="h-3 w-full rounded bg-sunken" />
        <div className="h-3 w-3/4 rounded bg-sunken" />
      </div>
      <div className="mt-3 h-3 w-32 rounded bg-sunken" aria-hidden="true" />
    </Card>
  );
}
