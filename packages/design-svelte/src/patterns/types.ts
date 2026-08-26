export type ProductFamily = 'breaker' | 'controller' | 'ups' | 'sensor' | 'meter';
export type Availability = 'in-stock' | 'low' | 'backorder';

export interface ProductCardData {
  id: string;
  name: string;
  sku: string;
  range: string;
  family: ProductFamily;
  price: number;
  availability: Availability;
  leadTimeDays: number;
}

/** Stable hash -> per-product variation. Same id always yields the same drawing, which keeps
 *  a server render and any later client render identical. */
export function variantOf(id: string): (n: number) => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (n: number) => (h >>> 0) % n;
}
