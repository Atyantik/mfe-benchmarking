import './styles.css';
import { Breadcrumbs, Card, Container } from '@mf-eval/design';

/**
 * The whole /cart page is personalized, so the SERVER renders only its skeleton: the
 * chrome a crawler and a first paint need, with the per-user part reserved but empty.
 *
 * This keeps even the cart route shared-cacheable — the HTML is identical for everyone.
 */
export default function CartPagePlaceholder() {
  return (
    <Container>
      <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
      <h1 className="text-[length:var(--fs-2xl)]">Your cart</h1>
      <div
        data-testid="cart-page-placeholder"
        aria-hidden="true"
        className="mt-6 grid gap-6 opacity-45 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <Card className="min-h-[16rem] p-4">
          <p className="text-[length:var(--fs-sm)]">&nbsp;</p>
        </Card>
        <Card className="h-fit min-h-[12rem] p-5">
          <p className="text-[length:var(--fs-sm)]">&nbsp;</p>
        </Card>
      </div>
    </Container>
  );
}
