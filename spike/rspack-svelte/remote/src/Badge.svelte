<script>
  // Svelte 5 runes. The question is not whether this compiles — it is whether the reactivity
  // still works after the component has crossed a Module Federation boundary, which requires
  // this component and its host to be running the same copy of the Svelte runtime.
  let { label = 'Cart' } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<button data-testid="svelte-badge" onclick={() => count++}>
  {label}: <span data-testid="svelte-count">{count}</span>
  (doubled <span data-testid="svelte-doubled">{doubled}</span>)
</button>

<style>
  button { font: inherit; padding: 0.25rem 0.75rem; border-radius: 999px; }
</style>
