import './styles.css';

/**
 * The header cart, SERVER-RENDERED.
 *
 * It holds no user data — a real count in the HTML would make every response user-specific
 * and unshareable by a CDN, and a crawler has no use for it. What changed is that this is no
 * longer a placeholder waiting to be replaced: the `cart.mini` behaviour fills these two
 * values in place, so there is no second render and no framework on the page.
 *
 * Still named `MiniCartPlaceholder` because that is the slot contract every host resolves.
 * Renaming it would be a breaking change for a cosmetic gain.
 */
export default function MiniCartPlaceholder() {
  return (
    <a
      href="/cart"
      data-testid="mini-cart"
      data-behavior="cart.mini"
      data-behavior-when="immediate"
      aria-hidden="true"
      className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-card px-3 hover:border-brand-600 aria-hidden:opacity-45"
    >
      <span className="text-[length:var(--fs-md)] font-medium text-ink-800">Cart</span>
      <span
        data-testid="cart-count"
        className="min-w-6 rounded-full bg-brand-700 px-1.5 py-0.5 text-center text-[length:var(--fs-2xs)] font-semibold tabular-nums text-white"
      >
        &nbsp;
      </span>
      <span
        data-testid="cart-total"
        className="min-w-[5.5ch] text-right text-[length:var(--fs-md)] tabular-nums text-ink-800"
      >
        &nbsp;
      </span>
    </a>
  );
}
