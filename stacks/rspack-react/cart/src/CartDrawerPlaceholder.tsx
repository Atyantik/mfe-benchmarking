import styles from './cart.module.css';

/** Reserves the drawer's box. No user data, for the same reasons as MiniCartPlaceholder. */
export default function CartDrawerPlaceholder() {
  return (
    <aside className={`${styles.drawer} ${styles.placeholder}`} data-testid="cart-drawer-placeholder" aria-hidden="true">
      <h2>Your cart</h2>
      <p>&nbsp;</p>
    </aside>
  );
}
