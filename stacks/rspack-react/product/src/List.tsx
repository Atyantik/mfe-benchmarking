import { useCartActions } from '@mf-eval/react-contracts';
import type { PageProps } from '@mf-eval/contracts';
import { formatPrice, PRODUCTS, type Product } from '@mf-eval/contracts/fixtures';
import styles from './product.module.css';

export interface ListData {
  products: readonly Product[];
}

/**
 * Server loader. Returns the full fixture — spec pins this at exactly 200 rows.
 * No network, no DB, no artificial latency: we measure rendering, not I/O.
 */
export function loader(): ListData {
  return { products: PRODUCTS };
}

/**
 * Data comes in as props, never from the host's router. See PageProps — this is what
 * lets the identical remote render under both the SPA and the MPA shell.
 */
export function Component({ data }: PageProps<ListData>) {
  const { add } = useCartActions();
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
                  onClick={() => add({ id: p.id, name: p.name, price: p.price })}
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
