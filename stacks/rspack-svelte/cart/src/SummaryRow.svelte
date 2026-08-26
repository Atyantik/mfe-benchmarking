<script lang="ts">
  let { label, value }: { label: string; value: string } = $props();
</script>

<div class="flex justify-between">
  <dt class="text-ink-500">{label}</dt>
  <dd class="tabular-nums text-ink-800">{value}</dd>
</div>
