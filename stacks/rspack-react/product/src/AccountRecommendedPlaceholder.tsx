import { Card } from '@mf-eval/design';

/** Reserves the live widget's exact box. Owned by the product team, beside the widget. */
export default function AccountRecommendedPlaceholder() {
  return (
    <Card className="flex size-full flex-col overflow-hidden p-5" data-testid="placeholder-account-recommended">
      <div className="h-4 w-36 rounded bg-sunken" aria-hidden="true" />
      <div className="mt-4 flex-1 space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded bg-sunken" />
            <div className="h-3 flex-1 rounded bg-sunken" />
          </div>
        ))}
      </div>
    </Card>
  );
}
