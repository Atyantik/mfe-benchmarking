import { useCart } from '@mf-eval/react-contracts';
import { formatPrice } from '@mf-eval/contracts/fixtures';
import styles from './cart.module.css';

/**
 * Client-only. Mounts into the box MiniCartPlaceholder reserved, reading state the
 * client recreated from the cookie. Never server-rendered — see the placeholder.
 */
export default function MiniCart() {
  const cart = useCart();
  return (
    <button type="button" className={styles.button} data-testid="mini-cart">
      <span>Cart</span>
      <span className={styles.badge} data-testid="cart-count">{cart.count}</span>
      <span className={styles.total} data-testid="cart-total">{formatPrice(cart.totalCents)}</span>
    </button>
  );
}
