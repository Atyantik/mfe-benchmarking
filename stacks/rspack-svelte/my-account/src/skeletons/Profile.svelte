<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import Bar from './Bar.svelte';
</script>

<div class="flex flex-col gap-6" data-testid={ACCOUNT.skeleton('account.profile')}>
  <Card class="min-h-[16rem] p-5">
    <div class="flex flex-col gap-4">
      {#each [0, 1, 2, 3, 4] as i (i)}
        <div class="flex flex-col gap-2">
          <Bar class="h-2.5 w-[25%]" />
          <Bar class="h-4 w-[70%]" />
        </div>
      {/each}
    </div>
  </Card>
</div>
