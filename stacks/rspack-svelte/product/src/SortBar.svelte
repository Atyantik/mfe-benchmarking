<script lang="ts">
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  import { Button, Select } from '@mf-eval/design-svelte';
  import { SORTS, type ListData, type SortKey } from './list-data.ts';

  let { data }: { data: ListData } = $props();
  const options = (Object.keys(SORTS) as SortKey[]).map((k) => ({ value: k, label: SORTS[k].label }));
</script>

<form
  method="get"
  action="/product"
  data-behavior="product.autosubmit"
  data-behavior-when="immediate"
  data-testid={CATALOGUE.sortForm}
  class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2"
>
  {#if data.query}<input type="hidden" name="q" value={data.query} />{/if}
  {#each data.selected.category as c (c)}<input type="hidden" name="category" value={c} />{/each}
  {#each data.selected.availability as a (a)}<input type="hidden" name="availability" value={a} />{/each}
  {#each data.selected.range as r (r)}<input type="hidden" name="range" value={r} />{/each}

  <p class="text-[length:var(--fs-sm)] tabular-nums text-ink-500">Page {data.page} of {data.pageCount}</p>
  <div class="flex items-center gap-2">
    <label for="sort" class="text-[length:var(--fs-sm)] text-ink-600">Sort by</label>
    <Select id="sort" name="sort" value={data.sort} data-testid={CATALOGUE.sortSelect} class="w-auto" {options} />
    <Button type="submit" tone="secondary" size="sm" data-fallback-only data-testid={CATALOGUE.applySort}>
      Apply
    </Button>
  </div>
</form>
