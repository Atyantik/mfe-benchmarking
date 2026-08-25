import type { PageProps, RouteLoaderArgs } from '@mf-eval/contracts';
import {
  CATEGORIES,
  PRODUCTS,
  RANGE_NAMES,
  categoryById,
  type Availability,
  type Product,
} from '@mf-eval/contracts/fixtures';
import { CATALOGUE } from '@mf-eval/contracts/testids';
import {
  Breadcrumbs,
  Button,
  Card,
  Container,
  EmptyState,
  FacetGroup,
  FacetOption,
  Pagination,
  ProductCard,
  ButtonLink,
  Select,
} from '@mf-eval/design';

const PAGE_SIZE = 12;

const SORTS = {
  relevance: { label: 'Relevance', compare: () => 0 },
  'price-asc': { label: 'Price: low to high', compare: (a: Product, b: Product) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', compare: (a: Product, b: Product) => b.price - a.price },
  name: { label: 'Name A–Z', compare: (a: Product, b: Product) => a.name.localeCompare(b.name) },
} as const;
type SortKey = keyof typeof SORTS;

const AVAILABILITY_LABELS: Record<Availability, string> = {
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
 * shareable, linkable, indexable, and correct with JavaScript switched off. The filter
 * panel is a plain <form method="get"> — submitting it navigates.
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
    return query
      .toLowerCase()
      .split(/\s+/)
      .every((term) => haystack.includes(term));
  };

  // Facet counts are computed against everything EXCEPT the facet being counted, so a
  // count never reads as zero for an option the visitor can still usefully tick.
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

export function Component({ data }: PageProps<ListData>) {
  const onlyCategory = data.selected.category.length === 1 ? data.selected.category[0] : undefined;
  const single = onlyCategory ? categoryById(onlyCategory) : undefined;
  const title = single ? single.name : 'All products';

  return (
    <Container>
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/product' },
          ...(single ? [{ label: single.name }] : []),
        ]}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[length:var(--fs-2xl)]">{title}</h1>
          <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">
            {single ? single.blurb : 'Circuit protection, automation, power continuity, sensing and metering.'}
          </p>
        </div>
        <p
          data-testid={CATALOGUE.resultCount}
          className="text-[length:var(--fs-sm)] tabular-nums text-ink-500"
        >
          <strong className="font-semibold text-ink-800">{data.total}</strong> product
          {data.total === 1 ? '' : 's'}
          {data.query ? <> matching “{data.query}”</> : null}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <Filters data={data} />

        <div>
          <SortBar data={data} />

          {data.products.length === 0 ? (
            <EmptyState
              title="No products match those filters"
              body="Try removing a filter, or search by part number or range."
              action={<ButtonLink href="/product" tone="secondary">Clear all filters</ButtonLink>}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  href={`/product/${p.id}`}
                  // One LCP candidate, three above-the-fold images. Marking all three
                  // priority made them race each other; marking none eager deferred them
                  // behind a scroll that had already happened.
                  priority={i === 0}
                  eager={i < 3}
                  action={
                    <Button
                      type="button"
                      tone="secondary"
                      size="sm"
                      className="relative z-10 w-full"
                      data-testid={`add-${p.id}`}
                      data-add-id={p.id}
                      data-add-name={p.name}
                      data-add-price={p.price}
                    >
                      Add to cart
                    </Button>
                  }
                />
              ))}
            </ul>
          )}

          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            hrefFor={(p) => `/product?${data.queryString ? `${data.queryString}&` : ''}page=${p}`}
          />
        </div>
      </div>
    </Container>
  );
}

/**
 * The filter panel is a GET form. No JavaScript: ticking boxes and pressing Apply
 * navigates to a new URL, which is also what makes every filtered view linkable.
 */
function Filters({ data }: { data: ListData }) {
  return (
    <Card as="div" className="h-fit p-4 lg:sticky lg:top-4">
      <form
        method="get"
        action="/product"
        data-behavior="product.autosubmit"
        data-behavior-when="immediate"
        data-testid="filter-form"
      >
        {data.query ? <input type="hidden" name="q" value={data.query} /> : null}
        {data.sort !== 'relevance' ? <input type="hidden" name="sort" value={data.sort} /> : null}

        <div className="flex items-center justify-between">
          <h2 className="text-[length:var(--fs-md)] font-semibold text-ink-900">Filter</h2>
          <a href="/product" className="text-[length:var(--fs-xs)] text-brand-700 hover:underline">
            Clear
          </a>
        </div>

        <FacetGroup title="Category">
          {CATEGORIES.map((c) => (
            <FacetOption
              key={c.id}
              name="category"
              value={c.id}
              label={c.name}
              count={data.counts.category[c.id] ?? 0}
              checked={data.selected.category.includes(c.id)}
            />
          ))}
        </FacetGroup>

        <FacetGroup title="Availability">
          {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => (
            <FacetOption
              key={a}
              name="availability"
              value={a}
              label={AVAILABILITY_LABELS[a]}
              count={data.counts.availability[a] ?? 0}
              checked={data.selected.availability.includes(a)}
            />
          ))}
        </FacetGroup>

        {/* Ranges are the longest facet by far; scrolling it keeps the panel a sane height
            and keeps the controls below it reachable. */}
        <FacetGroup title="Range" scroll>
          {RANGE_NAMES.map((r) => (
            <FacetOption
              key={r}
              name="range"
              value={r}
              label={r}
              count={data.counts.range[r] ?? 0}
              checked={data.selected.range.includes(r)}
            />
          ))}
        </FacetGroup>

        {/* The no-JS path. CSS hides it when scripting is available, so the enhanced page
            never has to move it. */}
        <Button type="submit" data-fallback-only data-testid="apply-filters" className="mt-4 w-full">
          Apply filters
        </Button>
      </form>
    </Card>
  );
}

function SortBar({ data }: { data: ListData }) {
  return (
    <form
      method="get"
      action="/product"
      data-behavior="product.autosubmit"
      data-behavior-when="immediate"
      data-testid="sort-form"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2"
    >
      {data.query ? <input type="hidden" name="q" value={data.query} /> : null}
      {data.selected.category.map((c) => <input key={c} type="hidden" name="category" value={c} />)}
      {data.selected.availability.map((a) => <input key={a} type="hidden" name="availability" value={a} />)}
      {data.selected.range.map((r) => <input key={r} type="hidden" name="range" value={r} />)}

      <p className="text-[length:var(--fs-sm)] tabular-nums text-ink-500">
        Page {data.page} of {data.pageCount}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-[length:var(--fs-sm)] text-ink-600">Sort by</label>
        <Select
          id="sort"
          name="sort"
          defaultValue={data.sort}
          data-testid="sort-select"
          className="w-auto"
          options={(Object.keys(SORTS) as SortKey[]).map((k) => ({ value: k, label: SORTS[k].label }))}
        />
        <Button type="submit" tone="secondary" size="sm" data-fallback-only data-testid="apply-sort">
          Apply
        </Button>
      </div>
    </form>
  );
}
