import type { PageProps } from '@mf-eval/contracts';
import { formatPrice, PRODUCTS, type Product } from '@mf-eval/contracts/fixtures';
import styles from './product.module.css';

export interface ListData {
  products: readonly Product[];
}

/**
 * Server loader. Returns the full fixture — the spec pins this at exactly 200 rows.
 * No network, no DB, no artificial latency: we measure rendering, not I/O.
 */
export function loader(): ListData {
  return { products: PRODUCTS };
}

/**
 * This page is pure SSR and is NEVER hydrated — its markup is identical for every
 * visitor, which is what keeps it indexable and shared-cacheable.
 *
 * The Add buttons are inert HTML carrying data attributes. A small delegated listener
 * in the cart island picks the clicks up, so adding to the cart costs no React
 * reconciliation of a 200-row table and no framework code for this remote at all.
 */
export function Component({ data }: PageProps<ListData>) {
  return (
    <>
      <h1>Products</h1>
      <table className={styles.table}>
        <tbody>
            {data.products.map((p) => (
              <tr key={p.id} data-product-id={p.id}>
                <td>
                  <a href={`/product/${p.id}`} data-testid={`link-${p.id}`}>{p.name}</a>
                </td>
                <td>{p.sku}</td>
                <td className={styles.price}>{formatPrice(p.price)}</td>
                <td>
                  <button
                    type="button"
                    className={styles.add}
                    data-testid={`add-${p.id}`}
                    data-add-id={p.id}
                    data-add-name={p.name}
                    data-add-price={p.price}
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
