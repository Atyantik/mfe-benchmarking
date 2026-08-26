<script lang="ts">
  import { inputClass } from '../cx.ts';
  let { options, ...rest }: { options: { value: string; label: string }[] } & Record<string, unknown> =
    $props();
</script>

<select class={inputClass} {...rest}>
  {#each options as o (o.value)}
    <option value={o.value}>{o.label}</option>
  {/each}
</select>
