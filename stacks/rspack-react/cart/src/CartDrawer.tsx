import { formatPrice } from '@mf-eval/contracts';
import './styles.css';
import { useCart } from '@mf-eval/react-contracts';
import { ButtonLink } from '@mf-eval/design';

/** Client-only. Owned by the cart team, rendered on the product team's page. */
export default function CartDrawer() {
  const cart = useCart();
  return (
    <aside
      data-testid="cart-drawer"
      className="min-h-[7.5rem] rounded-lg border border-line bg-card p-4 shadow-e1"
    >
      <h2 className="text-[length:var(--fs-md)]">Your cart</h2>
      {cart.items.length === 0 ? (
        <p data-testid="cart-empty" className="mt-2 text-[length:var(--fs-sm)] text-ink-500">
          Nothing in the cart yet.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-1.5">
            {cart.items.slice(0, 4).map((item, i) => (
              <li
                key={`${item.id}-${i}`}
                data-testid="cart-row"
                className="flex justify-between gap-3 text-[length:var(--fs-sm)]"
              >
                <span className="truncate text-ink-700">{item.name}</span>
                <span className="shrink-0 tabular-nums text-ink-800">{formatPrice(item.price)}</span>
              </li>
            ))}
          </ul>
          {cart.items.length > 4 ? (
            <p className="mt-1 text-[length:var(--fs-xs)] text-ink-500">
              +{cart.items.length - 4} more
            </p>
          ) : null}
          <div className="mt-3 flex justify-between border-t border-line pt-2 text-[length:var(--fs-md)] font-semibold">
            <span>Total</span>
            <span data-testid="cart-drawer-total" className="tabular-nums">
              {formatPrice(cart.totalCents)}
            </span>
          </div>
          <ButtonLink href="/cart" size="sm" className="mt-3 w-full">View cart</ButtonLink>
        </>
      )}
    </aside>
  );
}
