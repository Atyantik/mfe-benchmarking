<script lang="ts">
  let { rows }: { rows: { label: string; value: string }[] } = $props();
</script>

<table class="w-full text-[length:var(--fs-md)]">
  <tbody>
    {#each rows as row (row.label)}
      <tr class="border-b border-line last:border-0">
        <th scope="row" class="w-2/5 py-2.5 pr-4 text-left font-medium text-ink-500">{row.label}</th>
        <td class="py-2.5 text-ink-800 tabular-nums">{row.value}</td>
      </tr>
    {/each}
  </tbody>
</table>
