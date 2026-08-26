<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import Bar from './Bar.svelte';
  let { n }: { n: number } = $props();
</script>

<div class="flex flex-col gap-3">
  {#each Array.from({ length: n }, (_, i) => i) as i (i)}
    <Card class="flex min-h-[5.5rem] items-center gap-4 p-4">
      <div class="flex flex-1 flex-col gap-2">
        <Bar class="h-[0.9rem] w-[35%]" />
        <Bar class="h-3 w-[55%]" />
      </div>
      <Bar class="h-[0.9rem] w-16" />
    </Card>
  {/each}
</div>
