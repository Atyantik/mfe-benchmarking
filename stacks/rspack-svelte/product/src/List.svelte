<script lang="ts">
  import { categoryById } from '@mf-eval/contracts/fixtures';
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  import {
    Breadcrumbs,
    Button,
    ButtonLink,
    Container,
    EmptyState,
    Pagination,
    ProductCard,
  } from '@mf-eval/design-svelte';
  import Filters from './Filters.svelte';
  import SortBar from './SortBar.svelte';
  import type { ListData } from './list-data.ts';

  let { data }: { data: ListData } = $props();

  const onlyCategory = $derived(data.selected.category.length === 1 ? data.selected.category[0] : undefined);
  const single = $derived(onlyCategory ? categoryById(onlyCategory) : undefined);
  const title = $derived(single ? single.name : 'All products');
  const hrefFor = (p: number) => `/product?${data.queryString ? `${data.queryString}&` : ''}page=${p}`;
</script>

<Container>
  <Breadcrumbs
    trail={[
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/product' },
      ...(single ? [{ label: single.name }] : []),
    ]}
  />

  <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="text-[length:var(--fs-2xl)]">{title}</h1>
      <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">
        {single ? single.blurb : 'Circuit protection, automation, power continuity, sensing and metering.'}
      </p>
    </div>
    <p data-testid={CATALOGUE.resultCount} class="text-[length:var(--fs-sm)] tabular-nums text-ink-500">
      <strong class="font-semibold text-ink-800">{data.total}</strong> product{data.total === 1 ? '' : 's'}{#if data.query} matching “{data.query}”{/if}
    </p>
  </div>

  <div class="grid gap-8 lg:grid-cols-[16rem_1fr]">
    <Filters {data} />

    <div>
      <SortBar {data} />

      {#if data.products.length === 0}
        <EmptyState
          title="No products match those filters"
          body="Try removing a filter, or search by part number or range."
        >
          {#snippet action()}
            <ButtonLink href="/product" tone="secondary">Clear all filters</ButtonLink>
          {/snippet}
        </EmptyState>
      {:else}
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {#each data.products as p, i (p.id)}
            <!-- One LCP candidate, three above-the-fold images. Marking all three priority made
                 them race each other; marking none eager deferred them behind a scroll that had
                 already happened. -->
            <ProductCard product={p} href={`/product/${p.id}`} priority={i === 0} eager={i < 3}>
              {#snippet action()}
                <Button
                  type="button"
                  tone="secondary"
                  size="sm"
                  class="relative z-10 w-full"
                  data-testid={CATALOGUE.addToCart(p.id)}
                  data-add-id={p.id}
                  data-add-name={p.name}
                  data-add-price={p.price}
                >Add to cart</Button>
              {/snippet}
            </ProductCard>
          {/each}
        </ul>
      {/if}

      <Pagination page={data.page} pageCount={data.pageCount} {hrefFor} />
    </div>
  </div>
</Container>
