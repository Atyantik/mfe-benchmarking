<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { WIDGET } from '@mf-eval/contracts/testids';
  /**
   * Reserves the exact box the live widget will occupy. Server-rendered, identical for
   * everyone, same height as the real thing — so mounting the live component moves nothing.
   */
</script>

<Card class="flex size-full flex-col overflow-hidden p-5" data-testid={WIDGET.cartPlaceholder}>
  <div class="h-4 w-24 rounded bg-sunken" aria-hidden="true"></div>
  <div class="mt-4 flex-1 space-y-2" aria-hidden="true">
    <div class="h-3 w-full rounded bg-sunken"></div>
    <div class="h-3 w-4/5 rounded bg-sunken"></div>
  </div>
  <div class="mt-3 h-3 w-28 rounded bg-sunken" aria-hidden="true"></div>
</Card>
