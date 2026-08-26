<script lang="ts">
  import { Card, Picture } from '@mf-eval/design-svelte';
  import { PRODUCTS } from '@mf-eval/contracts/fixtures';
  import { imageForProduct } from '@mf-eval/media';
  import { WIDGET } from '@mf-eval/contracts/testids';

  /**
   * The product team's contribution to the account overview.
   *
   * Recommendations belong to whoever owns the catalogue, so this ships on the product team's
   * schedule and appears in the account area without the account team deploying anything.
   * Loaded ONLY on the route that renders the slot — open Profile and none of this is fetched.
   */
  const PICKS = PRODUCTS.slice(6, 9);
</script>

<Card class="flex size-full flex-col overflow-hidden p-5" data-testid={WIDGET.recommended}>
  <h3 class="text-[length:var(--fs-md)] font-semibold text-ink-900">Recommended for you</h3>
  <ul class="mt-3 flex-1 space-y-3">
    {#each PICKS as p (p.id)}
      <li class="flex items-center gap-3">
        <Picture image={imageForProduct(p.id, p.family)} alt="" sizes="2.5rem" class="w-10 shrink-0 rounded" />
        <a
          href={`/product/${p.id}`}
          data-testid={WIDGET.recommendedItem(p.id)}
          class="truncate text-[length:var(--fs-sm)] text-ink-700 hover:text-brand-700"
        >{p.name}</a>
      </li>
    {/each}
  </ul>
</Card>
