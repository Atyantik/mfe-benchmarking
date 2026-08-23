import './styles.css';
import { useCart } from '@mf-eval/react-contracts';
import { formatPrice } from '@mf-eval/contracts/fixtures';

/**
 * Client-only. Mounts into the box MiniCartPlaceholder reserved, from state the client
 * recreated out of the cookie. Never server-rendered — see the placeholder.
 */
export default function MiniCart() {
  const cart = useCart();
  return (
    <a
      href="/cart"
      data-testid="mini-cart"
      className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-card px-3 hover:border-brand-600"
    >
      <span className="text-[length:var(--fs-md)] font-medium text-ink-800">Cart</span>
      <span
        data-testid="cart-count"
        className="min-w-6 rounded-full bg-brand-700 px-1.5 py-0.5 text-center text-[length:var(--fs-2xs)] font-semibold tabular-nums text-white"
      >
        {cart.count}
      </span>
      <span data-testid="cart-total" className="min-w-[5.5ch] text-right text-[length:var(--fs-md)] tabular-nums text-ink-800">
        {formatPrice(cart.totalCents)}
      </span>
    </a>
  );
}
