<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  import { imageForProduct } from '@mf-eval/media';
  import Card from '../primitives/Card.svelte';
  import Picture from '../media/Picture.svelte';
  import Price from './Price.svelte';
  import StockStatus from './StockStatus.svelte';
  import type { ProductCardData } from './types.ts';

  let {
    product,
    href,
    action,
    priority = false,
    eager = false,
  }: {
    product: ProductCardData;
    href: string;
    action?: Snippet;
    /** The single LCP candidate on this page. At most one card in a grid. */
    priority?: boolean;
    /** Above the fold, but not the LCP element — eager, without claiming high priority. */
    eager?: boolean;
  } = $props();

  const image = $derived(imageForProduct(product.id, product.family));
</script>

<!--
  `relative` is load-bearing: the title uses a stretched-link overlay (after:absolute inset-0)
  to make the whole card clickable. Without a positioned ancestor that overlay resolves against
  the page and covers the entire grid, swallowing every click including other cards' buttons.
-->
<Card as="li" class="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-e2">
  <a {href} class="block p-3 pb-0" tabindex={-1} aria-hidden="true">
    <Picture
      {image}
      alt=""
      sizes="(min-width: 64rem) 22rem, (min-width: 40rem) 45vw, 92vw"
      {priority}
      {eager}
      class="rounded-md"
      data-testid={CATALOGUE.productImage(product.id)}
    />
  </a>
  <div class="flex flex-1 flex-col gap-2 p-4">
    <p class="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-brand-700">
      {product.range}
    </p>
    <h3 class="text-[length:var(--fs-md)] leading-snug">
      <a
        {href}
        data-testid={CATALOGUE.productLink(product.id)}
        class="after:absolute after:inset-0 group-hover:text-brand-700"
      >{product.name}</a>
    </h3>
    <p class="font-mono text-[length:var(--fs-xs)] text-ink-500">{product.sku}</p>
    <div class="mt-auto flex items-center justify-between gap-2 pt-2">
      <Price cents={product.price} size="sm" />
      <StockStatus status={product.availability} leadTimeDays={product.leadTimeDays} />
    </div>
    {#if action}<div class="pt-1">{@render action()}</div>{/if}
  </div>
</Card>
