<script lang="ts">
  import { formatPrice } from '@mf-eval/contracts';
  import { useCart } from '@mf-eval/svelte-contracts';
  import { CART } from '@mf-eval/contracts/testids';
  import { ButtonLink } from '@mf-eval/design-svelte';
  import './styles.css';

  /**
   * Client-only. Owned by the cart team, rendered on the product team's page.
   *
   * `useCart()` reads the framework-agnostic store through this stack's binding. The store
   * itself is shared as a singleton and backed by a cookie, which is what lets cart state
   * survive a boundary that Svelte's own reactivity cannot cross — see
   * docs/svelte-federation.md.
   */
  const cart = useCart();
</script>

<aside data-testid={CART.drawer} class="min-h-[7.5rem] rounded-lg border border-line bg-card p-4 shadow-e1">
  <h2 class="text-[length:var(--fs-md)]">Your cart</h2>
  {#if cart.current.items.length === 0}
    <p data-testid={CART.empty} class="mt-2 text-[length:var(--fs-sm)] text-ink-500">
      Nothing in the cart yet.
    </p>
  {:else}
    <ul class="mt-3 flex flex-col gap-1.5">
      {#each cart.current.items.slice(0, 4) as item, i (`${item.id}-${i}`)}
        <li data-testid={CART.row} class="flex justify-between gap-3 text-[length:var(--fs-sm)]">
          <span class="truncate text-ink-700">{item.name}</span>
          <span class="shrink-0 tabular-nums text-ink-800">{formatPrice(item.price)}</span>
        </li>
      {/each}
    </ul>
    {#if cart.current.items.length > 4}
      <p class="mt-1 text-[length:var(--fs-xs)] text-ink-500">+{cart.current.items.length - 4} more</p>
    {/if}
    <div class="mt-3 flex justify-between border-t border-line pt-2 text-[length:var(--fs-md)] font-semibold">
      <span>Total</span>
      <span data-testid={CART.drawerTotal} class="tabular-nums">{formatPrice(cart.current.totalCents)}</span>
    </div>
    <ButtonLink href="/cart" size="sm" class="mt-3 w-full">View cart</ButtonLink>
  {/if}
</aside>
