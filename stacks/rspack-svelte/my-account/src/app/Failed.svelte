<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  let { what }: { what: string } = $props();
</script>

<Card class="p-5" data-testid={ACCOUNT.loadError}>
  <p class="text-[length:var(--fs-md)] font-medium text-ink-900">Could not load {what}.</p>
  <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">
    The rest of your account still works.
    <a href="/my-account" class="text-brand-700 underline">Back to overview</a>.
  </p>
</Card>
