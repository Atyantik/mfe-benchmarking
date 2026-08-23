import { Slot } from '@mf-eval/react-contracts';
import type { PageProps, RouteLoaderArgs } from '@mf-eval/contracts';
import { formatPrice, productById, type Product } from '@mf-eval/contracts/fixtures';
import styles from './product.module.css';

export interface DetailData {
  product: Product;
}

export function loader({ params }: RouteLoaderArgs): DetailData {
  const product = productById(params['id'] ?? '');
  if (!product) throw new Response('Not found', { status: 404 });
  return { product };
}

export function Component({ data }: PageProps<DetailData>) {
  const { product } = data;
  return (
    <div className={styles.detail}>
      <h1>{product.name}</h1>
      <p className={styles.price} data-testid="detail-price">{formatPrice(product.price)}</p>
      <p data-testid="detail-description">{product.description}</p>
      {/* Inert markup; the cart island's delegated listener handles it. See List.tsx. */}
      <button
        type="button"
        className={styles.add}
        data-testid="add-to-cart"
        data-add-id={product.id}
        data-add-name={product.name}
        data-add-price={product.price}
      >
        Add to cart
      </button>
      {/* Filled by the shell from the cart remote. Product knows nothing about cart. */}
      <Slot name="cart.drawer" />
    </div>
  );
}
