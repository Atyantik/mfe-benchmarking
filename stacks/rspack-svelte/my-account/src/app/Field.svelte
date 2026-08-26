<script lang="ts">
  let { label, value }: { label: string; value: string } = $props();
</script>

<div class="flex flex-col gap-1">
  <dt class="text-[length:var(--fs-xs)] font-medium uppercase tracking-[0.08em] text-ink-500">{label}</dt>
  <dd class="text-[length:var(--fs-md)] text-ink-900">{value}</dd>
</div>
