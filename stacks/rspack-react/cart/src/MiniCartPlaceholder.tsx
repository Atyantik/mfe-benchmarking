import styles from './cart.module.css';

/**
 * What the SERVER renders where the cart goes.
 *
 * Deliberately contains no user data. The cart is personalized, so putting a real count
 * in the HTML would make every response user-specific and unshareable by a CDN — and a
 * crawler has no use for it either. The server's job here is to reserve the exact box the
 * live component will occupy so that mounting it shifts nothing.
 */
export default function MiniCartPlaceholder() {
  return (
    <button type="button" className={`${styles.button} ${styles.placeholder}`} data-testid="mini-cart-placeholder" aria-hidden="true">
      <span>Cart</span>
      <span className={styles.badge}>&nbsp;</span>
      <span className={styles.total}>&nbsp;</span>
    </button>
  );
}
