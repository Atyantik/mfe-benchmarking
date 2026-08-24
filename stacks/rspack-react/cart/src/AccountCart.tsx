import { Card, Price } from '@mf-eval/design';
import { useCart } from '@mf-eval/react-contracts';

/**
 * The cart team's contribution to the account overview.
 *
 * It lives here because the cart team owns cart state and cart UI — the account host renders
 * a named slot and knows nothing about this file, this component or which version of it is
 * deployed. That is the whole point: three teams contribute to one page and the page depends
 * on none of them.
 *
 * Per-user, so it is client-only and the server renders the placeholder beside it.
 */
export default function AccountCart() {
  const cart = useCart();
  const total = cart.items.reduce((n, i) => n + i.price, 0);

  return (
    <Card className="flex size-full flex-col overflow-hidden p-5" data-testid="widget-account-cart">
      <h3 className="text-[length:var(--fs-md)] font-semibold text-ink-900">Your basket</h3>
      {cart.items.length === 0 ? (
        <p className="mt-2 flex-1 text-[length:var(--fs-sm)] text-ink-500">
          Nothing in your basket yet.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex-1 space-y-2">
            {cart.items.slice(0, 3).map((item, i) => (
              <li key={`${item.id}-${i}`} className="flex justify-between gap-3 text-[length:var(--fs-sm)]">
                <span className="truncate text-ink-700">{item.name}</span>
                <Price cents={item.price} size="sm" />
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-line pt-2 text-[length:var(--fs-sm)] font-semibold">
            <span>{cart.items.length} item{cart.items.length === 1 ? '' : 's'}</span>
            <Price cents={total} size="sm" />
          </p>
        </>
      )}
      <a
        href="/cart"
        data-testid="widget-cart-link"
        className="mt-3 text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline"
      >
        Go to basket
      </a>
    </Card>
  );
}
