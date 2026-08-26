<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import Bar from './Bar.svelte';
  import Rows from './Rows.svelte';
</script>

<div class="flex flex-col gap-6" data-testid={ACCOUNT.skeleton('account.order')}>
  <Card class="min-h-[9rem] p-5">
    <div class="flex flex-col gap-3">
      <Bar class="h-5 w-[45%]" />
      <Bar class="h-3 w-[30%]" />
    </div>
  </Card>
  <Rows n={3} />
</div>
