import styles from './panel.module.scss';
import type { Product } from '@mf-eval/contracts/fixtures';

/**
 * Availability and lead time, styled by a CSS Module.
 *
 * Its `panel.module.scss` has the same file name and the same class names as the cart team's,
 * and both render on this page. Nothing coordinates them — no prefix convention, no shared
 * stylesheet, no review that catches the overlap. The boundary either holds or it does not,
 * and `packages/bench/src/css.mjs` decides which.
 */
export function StockPanel({ product }: { product: Product }) {
  return (
    <div className={styles.panel} data-testid="stock-panel">
      <div className={styles.row}>
        <span className={styles.label}>Availability</span>
        <span className={styles.value} data-testid="stock-availability">
          {product.availability === 'in-stock'
            ? 'In stock'
            : product.availability === 'low'
              ? 'Low stock'
              : 'Backorder'}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Lead time</span>
        <span className={styles.value} data-testid="stock-lead">
          {product.leadTimeDays} days
        </span>
      </div>
    </div>
  );
}
