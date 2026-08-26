import type { RouteLoaderArgs } from '@mf-eval/contracts';
import { PRODUCTS, productById, type Product } from '@mf-eval/contracts/fixtures';

export { default as Component } from './Detail.svelte';

export interface DetailData {
  product: Product;
  related: Product[];
}

export function loader({ params }: RouteLoaderArgs): DetailData {
  const product = productById(params.id ?? '');
  if (!product) throw new Response('Not found', { status: 404 });
  const related = PRODUCTS.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  return { product, related };
}
