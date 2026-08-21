import { Link, useLoaderData } from 'react-router';
import { useCartActions } from '@mf-eval/react-contracts';
import { formatPrice, PRODUCTS, type Product } from '@mf-eval/contracts/fixtures';
import styles from './product.module.css';

/**
 * Server loader. Runs on the server during SSR and on client-side navigation.
 * Returns the full fixture — spec/reference-app.md pins this at exactly 200 rows.
 * No network, no DB, no artificial latency: we are measuring rendering, not I/O.
 */
export function loader(): { products: readonly Product[] } {
  return { products: PRODUCTS };
}

export function Component() {
  const { products } = useLoaderData() as { products: readonly Product[] };
  const { add } = useCartActions();
  return (
    <>
      <h1>Products</h1>
      <table className={styles.table}>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} data-product-id={p.id}>
              <td>
                <Link to={`/product/${p.id}`} data-testid={`link-${p.id}`}>{p.name}</Link>
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
