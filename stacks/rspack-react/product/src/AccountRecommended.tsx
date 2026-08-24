import { Card, Picture } from '@mf-eval/design';
import { PRODUCTS } from '@mf-eval/contracts/fixtures';
import { imageForProduct } from '@mf-eval/media';

/**
 * The product team's contribution to the account overview.
 *
 * Recommendations belong to whoever owns the catalogue, so this ships on the product team's
 * schedule and appears in the account area without the account team deploying anything.
 *
 * Client-only because a real version would be personalized. It is loaded ONLY on the route
 * that renders the slot — open the account area's Profile tab and none of this is fetched.
 */
const PICKS = PRODUCTS.slice(6, 9);

export default function AccountRecommended() {
  return (
    <Card className="flex size-full flex-col overflow-hidden p-5" data-testid="widget-account-recommended">
      <h3 className="text-[length:var(--fs-md)] font-semibold text-ink-900">Recommended for you</h3>
      <ul className="mt-3 flex-1 space-y-3">
        {PICKS.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Picture
              image={imageForProduct(p.id, p.family)}
              alt=""
              sizes="2.5rem"
              className="w-10 shrink-0 rounded"
            />
            <a
              href={`/product/${p.id}`}
              data-testid={`recommended-${p.id}`}
              className="truncate text-[length:var(--fs-sm)] text-ink-700 hover:text-brand-700"
            >
              {p.name}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
