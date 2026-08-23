import './styles.css';

/** Reserves the drawer's box. No user data, for the same reasons as MiniCartPlaceholder. */
export default function CartDrawerPlaceholder() {
  return (
    <aside
      data-testid="cart-drawer-placeholder"
      aria-hidden="true"
      className="min-h-[7.5rem] rounded-lg border border-line bg-card p-4 opacity-45 shadow-e1"
    >
      <h2 className="text-[length:var(--fs-md)]">Your cart</h2>
      <p className="mt-2 text-[length:var(--fs-sm)]">&nbsp;</p>
    </aside>
  );
}
