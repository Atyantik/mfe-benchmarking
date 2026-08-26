<script lang="ts">
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  import type { Product } from '@mf-eval/contracts/fixtures';
  import styles from './panel.module.scss';

  /**
   * Availability and lead time, styled by a CSS Module.
   *
   * Its `panel.module.scss` has the same file name and the same class names as the cart team's,
   * and both render on this page. Nothing coordinates them — no prefix convention, no shared
   * stylesheet, no review that catches the overlap. See docs/css.md.
   */
  let { product }: { product: Product } = $props();
</script>

<div class={styles.panel} data-testid={CATALOGUE.stockPanel}>
  <div class={styles.row}>
    <span class={styles.label}>Availability</span>
    <span class={styles.value} data-testid={CATALOGUE.stockAvailability}>
      {product.availability === 'in-stock' ? 'In stock' : product.availability === 'low' ? 'Low stock' : 'Backorder'}
    </span>
  </div>
  <div class={styles.row}>
    <span class={styles.label}>Lead time</span>
    <span class={styles.value} data-testid={CATALOGUE.stockLead}>{product.leadTimeDays} days</span>
  </div>
</div>
