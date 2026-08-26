<script lang="ts">
  import { Card, Price } from '@mf-eval/design-svelte';
  import { useCart } from '@mf-eval/svelte-contracts';
  import { WIDGET } from '@mf-eval/contracts/testids';

  /**
   * The cart team's contribution to the account overview.
   *
   * It lives here because the cart team owns cart state and cart UI — the account host renders
   * a named slot and knows nothing about this file or which version of it is deployed. Three
   * teams contribute to one page and the page depends on none of them.
   */
  const cart = useCart();
  const total = $derived(cart.current.items.reduce((n, i) => n + i.price, 0));
</script>

<Card class="flex size-full flex-col overflow-hidden p-5" data-testid={WIDGET.cart}>
  <h3 class="text-[length:var(--fs-md)] font-semibold text-ink-900">Your basket</h3>
  {#if cart.current.items.length === 0}
    <p class="mt-2 flex-1 text-[length:var(--fs-sm)] text-ink-500">Nothing in your basket yet.</p>
  {:else}
    <ul class="mt-3 flex-1 space-y-2">
      {#each cart.current.items.slice(0, 3) as item, i (`${item.id}-${i}`)}
        <li class="flex justify-between gap-3 text-[length:var(--fs-sm)]">
          <span class="truncate text-ink-700">{item.name}</span>
          <Price cents={item.price} size="sm" />
        </li>
      {/each}
    </ul>
    <p class="mt-3 flex justify-between border-t border-line pt-2 text-[length:var(--fs-sm)] font-semibold">
      <span>{cart.current.items.length} item{cart.current.items.length === 1 ? '' : 's'}</span>
      <Price cents={total} size="sm" />
    </p>
  {/if}
  <a href="/cart" data-testid={WIDGET.cartLink} class="mt-3 text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline">
    Go to basket
  </a>
</Card>
