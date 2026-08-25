import styles from './panel.module.scss';

/**
 * The header cart, SERVER-RENDERED, styled by a CSS Module rather than utilities.
 *
 * It holds no user data — a real count in the HTML would make every response user-specific
 * and unshareable by a CDN. The `cart.mini` behaviour fills the two values in place, so there
 * is no second render and no framework on the page.
 *
 * `panel.module.scss` shares its file name, class names and Sass variable names with the
 * product team's module, which renders on the same page. That is the experiment: see
 * docs/css.md and `packages/bench/src/css.mjs`.
 *
 * It deliberately does NOT import `./styles.css`, which every other component in this app
 * does. That import pulls cart's whole utility bundle, and because this badge is in the
 * header it appears on EVERY page of the site — 19.9 kB of stylesheet that measured 0% used
 * on /faq. A CSS Module carries its own styles, so the component is self-contained and its
 * CSS is delivered only where it renders. `css.mjs` §8 fails the build if that stops being
 * true, for this or any other stylesheet.
 */
export default function MiniCartPlaceholder() {
  return (
    <a
      href="/cart"
      data-testid="mini-cart"
      data-behavior="cart.mini"
      data-behavior-when="immediate"
      aria-hidden="true"
      className={styles.panel}
    >
      <span className={styles.label}>Cart</span>
      <span data-testid="cart-count" className={styles.value}>
        &nbsp;
      </span>
      <span data-testid="cart-total" className={styles.total}>
        &nbsp;
      </span>
    </a>
  );
}
