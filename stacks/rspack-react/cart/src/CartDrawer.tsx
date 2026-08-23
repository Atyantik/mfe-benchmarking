import { useCart } from '@mf-eval/react-contracts';
import { formatPrice } from '@mf-eval/contracts/fixtures';
import styles from './cart.module.css';

/** Client-only, like MiniCart. Owned by the cart team, rendered on the product team's page. */
export default function CartDrawer() {
  const cart = useCart();
  return (
    <aside className={styles.drawer} data-testid="cart-drawer">
      <h2>Your cart</h2>
      {cart.items.length === 0 ? (
        <p data-testid="cart-empty">Nothing in the cart yet.</p>
      ) : (
        <>
          {cart.items.map((item, i) => (
            <div className={styles.row} key={`${item.id}-${i}`} data-testid="cart-row">
              <span>{item.name}</span>
              <span>{formatPrice(item.price)}</span>
            </div>
          ))}
          <div className={`${styles.row} ${styles['total-row']}`}>
            <span>Total</span>
            <span data-testid="cart-drawer-total">{formatPrice(cart.totalCents)}</span>
          </div>
        </>
      )}
    </aside>
  );
}
