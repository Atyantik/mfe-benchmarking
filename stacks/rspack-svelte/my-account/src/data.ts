/**
 * Account data — owned by this host, served by its own API.
 *
 * Deliberately NOT in `@mf-eval/contracts`. Orders are this team's domain: nobody else
 * renders them, and putting the shape in a shared package would mean every schema change
 * is a coordinated release. Contracts holds what crosses a boundary; this does not.
 *
 * Everything here is per-user, which is why none of it is ever server-rendered
 * (docs/decision-log.md D12). The server sends a skeleton; the client fetches this.
 */
import { PRODUCTS } from '@mf-eval/contracts/fixtures';

export type OrderStatus = 'delivered' | 'in-transit' | 'processing' | 'cancelled';

export interface OrderLine {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  reference: string;
  placedAt: string;
  status: OrderStatus;
  total: number;
  lines: OrderLine[];
  shipTo: string;
  poNumber: string;
}

export interface AccountSummary {
  name: string;
  company: string;
  accountNumber: string;
  openOrders: number;
  inTransit: number;
  creditUsed: number;
  creditLimit: number;
  recent: Order[];
}

export interface Profile {
  name: string;
  email: string;
  company: string;
  accountNumber: string;
  phone: string;
  billingAddress: string;
  deliveryAddress: string;
  contactPreference: 'email' | 'phone';
}

const STATUSES: OrderStatus[] = ['delivered', 'delivered', 'in-transit', 'processing', 'cancelled'];
const SITES = [
  'Bay 4, Trafford Park, Manchester M17 1AB',
  'Unit 12, Kirkby Industrial Estate, Liverpool L33 7XR',
  'Plot 9, Wrexham Industrial Estate, Wrexham LL13 9UT',
] as const;

/** Indexing a readonly tuple at a computed position still widens to `| undefined`. */
const siteAt = (index: number): string => SITES[index % SITES.length] ?? SITES[0];

/** Deterministic, so the same order id always renders the same order. */
function seeded(n: number): () => number {
  let s = (n * 0x9e3779b1) >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

function buildOrder(index: number): Order {
  const rand = seeded(index + 1);
  const lineCount = 1 + Math.floor(rand() * 3);
  const lines: OrderLine[] = [];
  for (let i = 0; i < lineCount; i += 1) {
    const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
    if (!product) continue;
    lines.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: 1 + Math.floor(rand() * 4),
      unitPrice: product.price,
    });
  }
  const total = lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
  // Fixed epoch, not Date.now(): a fixture that drifts with the clock makes every
  // screenshot and every assertion time-dependent.
  const placed = new Date(Date.UTC(2026, 6, 2) - index * 86_400_000 * 3);
  return {
    id: `o-${String(index + 1).padStart(4, '0')}`,
    reference: `NG-${String(48_210 - index * 7)}`,
    placedAt: placed.toISOString(),
    status: STATUSES[index % STATUSES.length] ?? 'processing',
    total,
    lines,
    shipTo: siteAt(index),
    poNumber: `PO-${String(9100 + index * 13)}`,
  };
}

export const ORDERS: readonly Order[] = Object.freeze(
  Array.from({ length: 18 }, (_, i) => buildOrder(i)),
);

export const PROFILE: Profile = Object.freeze({
  name: 'Dana Whitfield',
  email: 'd.whitfield@harlowcontrols.example',
  company: 'Harlow Controls Ltd',
  accountNumber: 'NG-448120',
  phone: '+44 161 496 0118',
  billingAddress: 'Harlow Controls Ltd, 22 Ashburn Way, Salford M50 2GT',
  deliveryAddress: SITES[0],
  contactPreference: 'email',
});

export function summary(): AccountSummary {
  return {
    name: PROFILE.name,
    company: PROFILE.company,
    accountNumber: PROFILE.accountNumber,
    openOrders: ORDERS.filter((o) => o.status === 'processing').length,
    inTransit: ORDERS.filter((o) => o.status === 'in-transit').length,
    creditUsed: 38_450,
    creditLimit: 75_000,
    recent: ORDERS.slice(0, 4),
  };
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  delivered: 'Delivered',
  'in-transit': 'In transit',
  processing: 'Processing',
  cancelled: 'Cancelled',
};

export const money = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

export const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
