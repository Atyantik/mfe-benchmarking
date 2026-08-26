<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { SUPPORT_CHANNELS } from '@mf-eval/contracts/fixtures';
  import { WIDGET } from '@mf-eval/contracts/testids';

  /**
   * The support team's contribution to the account overview.
   *
   * Third team, third widget, same page — and the account host still depends on none of them.
   * Adding a fourth is a registry entry and a slot, not a change to anyone's build config.
   */
</script>

<Card class="flex size-full flex-col overflow-hidden p-5" data-testid={WIDGET.support}>
  <h3 class="text-[length:var(--fs-md)] font-semibold text-ink-900">Support</h3>
  <p class="mt-2 text-[length:var(--fs-sm)] text-ink-500">No open requests on this account.</p>
  <ul class="mt-3 flex-1 space-y-2">
    {#each SUPPORT_CHANNELS.slice(0, 2) as ch (ch.name)}
      <li class="text-[length:var(--fs-sm)]">
        <span class="font-medium text-ink-800">{ch.name}</span>
        <span class="text-ink-500"> · {ch.detail}</span>
      </li>
    {/each}
  </ul>
  <a
    href="/faq/contact"
    data-testid={WIDGET.supportLink}
    class="mt-3 text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline"
  >Contact an engineer</a>
</Card>
