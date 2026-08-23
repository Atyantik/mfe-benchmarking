import './styles.css';

/**
 * What the SERVER renders where the cart goes.
 *
 * Deliberately holds no user data: a real count in the HTML would make every response
 * user-specific and unshareable by a CDN, and a crawler has no use for it. Its only job is
 * to reserve the exact box the live component will occupy, so mounting shifts nothing.
 */
export default function MiniCartPlaceholder() {
  return (
    <span
      data-testid="mini-cart-placeholder"
      aria-hidden="true"
      className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-card px-3 opacity-45"
    >
      <span className="text-[length:var(--fs-md)] font-medium text-ink-800">Cart</span>
      <span className="min-w-6 rounded-full bg-ink-200 px-1.5 py-0.5 text-center text-[length:var(--fs-2xs)]">&nbsp;</span>
      <span className="min-w-[5.5ch] text-right text-[length:var(--fs-md)] tabular-nums">&nbsp;</span>
    </span>
  );
}
