<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { WIDGET } from '@mf-eval/contracts/testids';
  /** Reserves the live widget's exact box. Owned by the support team, beside the widget. */
</script>

<Card class="flex size-full flex-col overflow-hidden p-5" data-testid={WIDGET.supportPlaceholder}>
  <div class="h-4 w-20 rounded bg-sunken" aria-hidden="true"></div>
  <div class="mt-4 flex-1 space-y-2" aria-hidden="true">
    <div class="h-3 w-full rounded bg-sunken"></div>
    <div class="h-3 w-3/4 rounded bg-sunken"></div>
  </div>
  <div class="mt-3 h-3 w-32 rounded bg-sunken" aria-hidden="true"></div>
</Card>
