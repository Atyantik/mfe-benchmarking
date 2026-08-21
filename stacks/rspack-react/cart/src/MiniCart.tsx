import { useCart } from '@mf-eval/react-contracts';
import { formatPrice } from '@mf-eval/contracts/fixtures';
import styles from './cart.module.css';

/**
 * Owned by the cart team, rendered inside the SHELL's header.
 *
 * The badge count must be correct in the server-rendered HTML, not just after
 * hydration — that is the assertion that proves cross-remote state survives SSR
 * (spec/reference-app.md § Interaction script, step 9).
 */
export default function MiniCart() {
  const cart = useCart();
  return (
    <button type="button" className={styles.button} data-testid="mini-cart">
      <span>Cart</span>
      <span className={styles.badge} data-testid="cart-count">{cart.count}</span>
      <span data-testid="cart-total">{formatPrice(cart.totalCents)}</span>
    </button>
  );
}
