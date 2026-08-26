<script lang="ts">
  /** Exists because its absence was pushing apps toward a bare <input>, which is how a design
      system starts drifting. */
  let { label, hint, ...rest }: { label: string; hint?: string } & Record<string, unknown> = $props();
</script>

<label class="flex cursor-pointer items-start gap-2 text-[length:var(--fs-sm)] text-ink-600">
  <input type="checkbox" class="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-700)]" {...rest} />
  <span>
    {label}
    {#if hint}<span class="mt-0.5 block text-[length:var(--fs-xs)] text-ink-500">{hint}</span>{/if}
  </span>
</label>
