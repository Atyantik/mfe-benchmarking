import { useLoaderData } from 'react-router';
import { Slot, useCartActions } from '@mf-eval/react-contracts';
import { formatPrice, productById, type Product } from '@mf-eval/contracts/fixtures';
import type { RouteLoaderArgs } from '@mf-eval/contracts';
import styles from './product.module.css';

export function loader({ params }: RouteLoaderArgs): { product: Product } {
  const product = productById(params['id'] ?? '');
  if (!product) throw new Response('Not found', { status: 404 });
  return { product };
}

export function Component() {
  const { product } = useLoaderData() as { product: Product };
  const { add } = useCartActions();
  return (
    <div className={styles.detail}>
      <h1>{product.name}</h1>
      <p className={styles.price} data-testid="detail-price">{formatPrice(product.price)}</p>
      <p data-testid="detail-description">{product.description}</p>
      <button
        type="button"
        className={styles.add}
        data-testid="add-to-cart"
        onClick={() => add({ id: product.id, name: product.name, price: product.price })}
      >
        Add to cart
      </button>
      {/* Filled by the shell from the cart remote. Product knows nothing about cart. */}
      <Slot name="cart.drawer" />
    </div>
  );
}
