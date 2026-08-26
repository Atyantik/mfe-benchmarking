<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { WIDGET } from '@mf-eval/contracts/testids';
  /** Reserves the live widget's exact box. Owned by the product team, beside the widget. */
</script>

<Card class="flex size-full flex-col overflow-hidden p-5" data-testid={WIDGET.recommendedPlaceholder}>
  <div class="h-4 w-36 rounded bg-sunken" aria-hidden="true"></div>
  <div class="mt-4 flex-1 space-y-3" aria-hidden="true">
    {#each [0, 1, 2] as i (i)}
      <div class="flex items-center gap-3">
        <div class="size-10 shrink-0 rounded bg-sunken"></div>
        <div class="h-3 flex-1 rounded bg-sunken"></div>
      </div>
    {/each}
  </div>
</Card>
