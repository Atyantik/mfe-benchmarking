<script lang="ts">
  import { CATEGORIES, RANGE_NAMES, type Availability } from '@mf-eval/contracts/fixtures';
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  import { Button, Card, FacetGroup, FacetOption } from '@mf-eval/design-svelte';
  import { AVAILABILITY_LABELS, type ListData } from './list-data.ts';

  /**
   * The filter panel is a GET form. No JavaScript: ticking boxes and pressing Apply navigates
   * to a new URL, which is also what makes every filtered view linkable.
   */
  let { data }: { data: ListData } = $props();
</script>

<Card as="div" class="h-fit p-4 lg:sticky lg:top-4">
  <form
    method="get"
    action="/product"
    data-behavior="product.autosubmit"
    data-behavior-when="immediate"
    data-testid={CATALOGUE.filterForm}
  >
    {#if data.query}<input type="hidden" name="q" value={data.query} />{/if}
    {#if data.sort !== 'relevance'}<input type="hidden" name="sort" value={data.sort} />{/if}

    <div class="flex items-center justify-between">
      <h2 class="text-[length:var(--fs-md)] font-semibold text-ink-900">Filter</h2>
      <a href="/product" class="text-[length:var(--fs-xs)] text-brand-700 hover:underline">Clear</a>
    </div>

    <FacetGroup title="Category">
      {#each CATEGORIES as c (c.id)}
        <FacetOption
          name="category"
          value={c.id}
          label={c.name}
          count={data.counts.category[c.id] ?? 0}
          checked={data.selected.category.includes(c.id)}
        />
      {/each}
    </FacetGroup>

    <FacetGroup title="Availability">
      {#each Object.keys(AVAILABILITY_LABELS) as Availability[] as a (a)}
        <FacetOption
          name="availability"
          value={a}
          label={AVAILABILITY_LABELS[a]}
          count={data.counts.availability[a] ?? 0}
          checked={data.selected.availability.includes(a)}
        />
      {/each}
    </FacetGroup>

    <!-- Ranges are the longest facet by far; scrolling it keeps the panel a sane height and
         keeps the controls below it reachable. -->
    <FacetGroup title="Range" scroll>
      {#each RANGE_NAMES as r (r)}
        <FacetOption
          name="range"
          value={r}
          label={r}
          count={data.counts.range[r] ?? 0}
          checked={data.selected.range.includes(r)}
        />
      {/each}
    </FacetGroup>

    <!-- The no-JS path. CSS hides it when scripting is available, so the enhanced page never
         has to move it. -->
    <Button type="submit" data-fallback-only data-testid={CATALOGUE.applyFilters} class="mt-4 w-full">
      Apply filters
    </Button>
  </form>
</Card>
