import './styles.css';
import { useCart, useCartActions } from '@mf-eval/react-contracts';
import { formatPrice, productById } from '@mf-eval/contracts/fixtures';
import {
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  Container,
  EmptyState,
  Price,
  ProductThumb,
} from '@mf-eval/design';

const SHIPPING_CENTS = 1850;
const VAT_RATE = 0.2;

/**
 * The cart page — client-rendered in full.
 *
 * Nothing here is useful to a crawler and all of it is per-user, so none of it belongs in
 * the HTML. The server rendered CartPagePlaceholder; this replaces it in the same box.
 */
export default function CartPage() {
  const cart = useCart();
  const { clear } = useCartActions();

  if (cart.items.length === 0) {
    return (
      <Container>
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
        <h1 className="mb-6 text-[length:var(--fs-2xl)]">Your cart</h1>
        <EmptyState
          title="Your cart is empty"
          body="Browse the catalogue, or search by part number if you already know what you need."
          action={<ButtonLink href="/product">Browse the catalogue</ButtonLink>}
        />
      </Container>
    );
  }

  const vat = Math.round(cart.totalCents * VAT_RATE);
  const total = cart.totalCents + vat + SHIPPING_CENTS;

  return (
    <Container>
      <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[length:var(--fs-2xl)]">Your cart</h1>
        <p className="text-[length:var(--fs-sm)] tabular-nums text-ink-500">
          {cart.count} line{cart.count === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <ul className="divide-y divide-[var(--color-line)]">
            {cart.items.map((item, i) => {
              const product = productById(item.id);
              return (
                <li key={`${item.id}-${i}`} data-testid="cart-row" className="flex gap-4 p-4">
                  {product ? (
                    <a href={`/product/${product.id}`} className="w-24 shrink-0">
                      <ProductThumb family={product.family} id={product.id} />
                    </a>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[length:var(--fs-md)] leading-snug">
                      <a href={`/product/${item.id}`} className="hover:text-brand-700">{item.name}</a>
                    </h2>
                    {product ? (
                      <p className="mt-0.5 font-mono text-[length:var(--fs-xs)] text-ink-500">{product.sku}</p>
                    ) : null}
                    <p className="mt-2 text-[length:var(--fs-sm)] text-ink-500">Quantity 1</p>
                  </div>
                  <div className="text-right">
                    <Price cents={item.price} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between border-t border-line p-4">
            <Button tone="ghost" size="sm" type="button" onClick={clear} data-testid="clear-cart">
              Clear cart
            </Button>
            <ButtonLink tone="secondary" size="sm" href="/product">Continue shopping</ButtonLink>
          </div>
        </Card>

        <Card className="h-fit p-5 lg:sticky lg:top-4">
          <h2 className="text-[length:var(--fs-md)]">Order summary</h2>
          <dl className="mt-4 flex flex-col gap-2 text-[length:var(--fs-md)]">
            <Row label="Subtotal" value={formatPrice(cart.totalCents)} />
            <Row label="Delivery" value={formatPrice(SHIPPING_CENTS)} />
            <Row label="VAT (20%)" value={formatPrice(vat)} />
          </dl>
          <div className="mt-4 flex justify-between border-t border-line pt-3">
            <span className="font-semibold text-ink-900">Total</span>
            <Price cents={total} />
          </div>
          <Button size="lg" className="mt-5 w-full" type="button">Proceed to checkout</Button>
          <p className="mt-3 text-[length:var(--fs-xs)] text-ink-500">
            Trade accounts see contract pricing and 30-day terms at checkout.
          </p>
        </Card>
      </div>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="tabular-nums text-ink-800">{value}</dd>
    </div>
  );
}
