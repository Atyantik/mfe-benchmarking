<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import Bar from './Bar.svelte';
  import Rows from './Rows.svelte';

  /**
   * What the SERVER renders where per-user content will go.
   *
   * These exist for one measurable reason: they reserve the box. The client replaces a skeleton
   * with real content of the same height, so mounting costs no layout shift — the same contract
   * the cart placeholder has, at page scale (docs/decision-log.md D12).
   *
   * Also the overview's fallback: anything unrecognised still gets a reserved box rather than a
   * collapsing layout.
   */
</script>

<div class="flex flex-col gap-6" data-testid={ACCOUNT.skeleton('account.overview')}>
  <!-- The greeting block. It was missing in an earlier version, and its absence was the whole
       of this page's layout shift: the real content is three lines taller, so the footer moved
       every time the data arrived. A skeleton that omits a block does not reserve less space —
       it reserves the wrong space. -->
  <div class="flex flex-col gap-2">
    <Bar class="h-4 w-28" />
    <Bar class="h-6 w-72" />
    <Bar class="h-3 w-40" />
  </div>
  <div class="grid gap-4 sm:grid-cols-3">
    {#each [0, 1, 2] as i (i)}
      <Card class="flex min-h-[6.5rem] flex-col gap-3 p-5">
        <Bar class="h-3 w-[60%]" />
        <Bar class="h-6 w-[40%]" />
      </Card>
    {/each}
  </div>
  <!-- The three widget regions other teams fill. Reserved server-side at the same size, so the
       page does not move when they arrive — or when they do not. -->
  <div class="grid gap-4 lg:grid-cols-3">
    {#each [0, 1, 2] as i (i)}
      <Card class="h-[13rem] overflow-hidden p-5">
        <Bar class="h-4 w-24" />
        <div class="mt-4 space-y-2">
          <Bar class="h-3 w-full" />
          <Bar class="h-3 w-4/5" />
        </div>
      </Card>
    {/each}
  </div>
  <Rows n={4} />
</div>
