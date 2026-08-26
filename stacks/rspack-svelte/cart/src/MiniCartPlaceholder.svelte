<script lang="ts">
  import { CHROME } from '@mf-eval/contracts/testids';
  import styles from './panel.module.scss';

  /**
   * The header cart, SERVER-RENDERED, styled by a CSS Module rather than utilities.
   *
   * It holds no user data — a real count in the HTML would make every response user-specific
   * and unshareable by a CDN. The `cart.mini` behaviour fills the two values in place, so there
   * is no second render and no framework on the page.
   *
   * It deliberately does NOT import `./styles.css`. That import pulls cart's whole utility
   * bundle, and because this badge is in the header it would appear on EVERY page of the site —
   * 19.9 kB of stylesheet measured at 0% used on /faq in the React stack. A CSS Module carries
   * its own styles, so the component is self-contained. See docs/css.md.
   */
</script>

<a
  href="/cart"
  data-testid={CHROME.miniCart}
  data-behavior="cart.mini"
  data-behavior-when="immediate"
  aria-hidden="true"
  class={styles.panel}
>
  <span class={styles.label}>Cart</span>
  <span data-testid={CHROME.cartCount} class={styles.value}>&nbsp;</span>
  <span data-testid={CHROME.cartTotal} class={styles.total}>&nbsp;</span>
</a>
