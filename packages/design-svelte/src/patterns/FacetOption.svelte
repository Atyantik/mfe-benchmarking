<script lang="ts">
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  let { name, value, label, count, checked }: {
    name: string; value: string; label: string; count: number; checked: boolean;
  } = $props();
</script>

<label class="flex cursor-pointer items-center gap-2 text-[length:var(--fs-md)] text-ink-700 hover:text-brand-700">
  <input
    type="checkbox"
    {name}
    {value}
    {checked}
    data-testid={CATALOGUE.facet(name, value)}
    class="size-4 accent-[var(--color-brand-700)]"
  />
  <span class="flex-1">{label}</span>
  <span class="tabular-nums text-[length:var(--fs-xs)] text-ink-500">{count}</span>
</label>
