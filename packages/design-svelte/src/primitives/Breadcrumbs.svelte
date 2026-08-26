<script lang="ts">
  let { trail }: { trail: { label: string; href?: string }[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="py-3">
  <ol class="flex flex-wrap items-center gap-1 text-[length:var(--fs-xs)] text-ink-500">
    {#each trail as step, i (step.label)}
      <li class="flex items-center gap-1">
        {#if i > 0}<span aria-hidden="true" class="text-ink-300">/</span>{/if}
        {#if step.href && i < trail.length - 1}
          <a href={step.href} class="hover:text-brand-700 hover:underline">{step.label}</a>
        {:else}
          <span aria-current="page" class="font-medium text-ink-700">{step.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
