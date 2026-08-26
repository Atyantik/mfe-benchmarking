import type { RouteLoaderArgs } from '@mf-eval/contracts';
import { PRODUCTS, type Availability, type Product } from '@mf-eval/contracts/fixtures';

export const PAGE_SIZE = 12;

export const SORTS = {
  relevance: { label: 'Relevance', compare: () => 0 },
  'price-asc': { label: 'Price: low to high', compare: (a: Product, b: Product) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', compare: (a: Product, b: Product) => b.price - a.price },
  name: { label: 'Name A–Z', compare: (a: Product, b: Product) => a.name.localeCompare(b.name) },
} as const;
export type SortKey = keyof typeof SORTS;

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  'in-stock': 'In stock',
  low: 'Low stock',
  backorder: 'Backorder',
};

export interface ListData {
  products: Product[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
  sort: SortKey;
  selected: { category: string[]; availability: string[]; range: string[] };
  counts: {
    category: Record<string, number>;
    availability: Record<string, number>;
    range: Record<string, number>;
  };
  queryString: string;
}

/**
 * Faceted search, entirely on the server.
 *
 * Filters, sort and pagination are all URL state, so every result view is a real address:
 * shareable, linkable, indexable, and correct with JavaScript switched off. The filter panel is
 * a plain <form method="get"> — submitting it navigates.
 */
export function loader({ request }: RouteLoaderArgs): ListData {
  const url = new URL(request.url);
  const params = url.searchParams;

  const category = params.getAll('category').filter(Boolean);
  const availability = params.getAll('availability').filter(Boolean);
  const range = params.getAll('range').filter(Boolean);
  const query = (params.get('q') ?? '').trim();
  const sort: SortKey = (params.get('sort') as SortKey) in SORTS ? (params.get('sort') as SortKey) : 'relevance';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const matchesText = (p: Product) => {
    if (!query) return true;
    const haystack = `${p.name} ${p.sku} ${p.range} ${p.summary}`.toLowerCase();
    return query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
  };

  // Facet counts are computed against everything EXCEPT the facet being counted, so a count
  // never reads as zero for an option the visitor can still usefully tick.
  const base = PRODUCTS.filter(matchesText);
  const byCategory = (p: Product) => category.length === 0 || category.includes(p.categoryId);
  const byAvailability = (p: Product) => availability.length === 0 || availability.includes(p.availability);
  const byRange = (p: Product) => range.length === 0 || range.includes(p.range);

  const count = (items: Product[], key: (p: Product) => string) =>
    items.reduce<Record<string, number>>((acc, p) => {
      const k = key(p);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const counts = {
    category: count(base.filter(byAvailability).filter(byRange), (p) => p.categoryId),
    availability: count(base.filter(byCategory).filter(byRange), (p) => p.availability),
    range: count(base.filter(byCategory).filter(byAvailability), (p) => p.range),
  };

  const filtered = base.filter(byCategory).filter(byAvailability).filter(byRange);
  const sorted = sort === 'relevance' ? filtered : [...filtered].sort(SORTS[sort].compare);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const carry = new URLSearchParams();
  for (const [k, v] of params) if (k !== 'page') carry.append(k, v);

  return {
    products: sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    total: sorted.length,
    page: safePage,
    pageCount,
    query,
    sort,
    selected: { category, availability, range },
    counts,
    queryString: carry.toString(),
  };
}
