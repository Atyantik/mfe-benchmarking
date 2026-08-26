<script lang="ts">
  import { useCart } from '@mf-eval/svelte-contracts';
  import { formatPrice, productById } from '@mf-eval/contracts/fixtures';
  import { CART } from '@mf-eval/contracts/testids';
  import {
    Breadcrumbs,
    Button,
    ButtonLink,
    Card,
    Container,
    EmptyState,
    Price,
    ProductThumb,
  } from '@mf-eval/design-svelte';
  import SummaryRow from './SummaryRow.svelte';
  import './styles.css';

  /**
   * The cart page — client-rendered in full.
   *
   * Nothing here is useful to a crawler and all of it is per-user, so none of it belongs in the
   * HTML. The server rendered CartPagePlaceholder; this replaces it in the same box.
   */
  const SHIPPING_CENTS = 1850;
  const VAT_RATE = 0.2;

  const cart = useCart();
  const vat = $derived(Math.round(cart.current.totalCents * VAT_RATE));
  const total = $derived(cart.current.totalCents + vat + SHIPPING_CENTS);
</script>

{#if cart.current.items.length === 0}
  <Container>
    <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
    <h1 class="mb-6 text-[length:var(--fs-2xl)]">Your cart</h1>
    <EmptyState
      title="Your cart is empty"
      body="Browse the catalogue, or search by part number if you already know what you need."
    >
      {#snippet action()}
        <ButtonLink href="/product">Browse the catalogue</ButtonLink>
      {/snippet}
    </EmptyState>
  </Container>
{:else}
  <Container>
    <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-[length:var(--fs-2xl)]">Your cart</h1>
      <p class="text-[length:var(--fs-sm)] tabular-nums text-ink-500">
        {cart.current.count} line{cart.current.count === 1 ? '' : 's'}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <ul class="divide-y divide-[var(--color-line)]">
          {#each cart.current.items as item, i (`${item.id}-${i}`)}
            {@const product = productById(item.id)}
            <li data-testid={CART.row} class="flex gap-4 p-4">
              {#if product}
                <a href={`/product/${product.id}`} class="w-24 shrink-0">
                  <ProductThumb family={product.family} id={product.id} />
                </a>
              {/if}
              <div class="min-w-0 flex-1">
                <h2 class="text-[length:var(--fs-md)] leading-snug">
                  <a href={`/product/${item.id}`} class="hover:text-brand-700">{item.name}</a>
                </h2>
                {#if product}
                  <p class="mt-0.5 font-mono text-[length:var(--fs-xs)] text-ink-500">{product.sku}</p>
                {/if}
                <p class="mt-2 text-[length:var(--fs-sm)] text-ink-500">Quantity 1</p>
              </div>
              <div class="text-right"><Price cents={item.price} size="sm" /></div>
            </li>
          {/each}
        </ul>
        <div class="flex justify-between border-t border-line p-4">
          <Button tone="ghost" size="sm" type="button" onclick={() => cart.clear()} data-testid={CART.clear}>
            Clear cart
          </Button>
          <ButtonLink tone="secondary" size="sm" href="/product">Continue shopping</ButtonLink>
        </div>
      </Card>

      <Card class="h-fit p-5 lg:sticky lg:top-4">
        <h2 class="text-[length:var(--fs-md)]">Order summary</h2>
        <dl class="mt-4 flex flex-col gap-2 text-[length:var(--fs-md)]">
          <SummaryRow label="Subtotal" value={formatPrice(cart.current.totalCents)} />
          <SummaryRow label="Delivery" value={formatPrice(SHIPPING_CENTS)} />
          <SummaryRow label="VAT (20%)" value={formatPrice(vat)} />
        </dl>
        <div class="mt-4 flex justify-between border-t border-line pt-3">
          <span class="font-semibold text-ink-900">Total</span>
          <Price cents={total} />
        </div>
        <Button size="lg" class="mt-5 w-full" type="button">Proceed to checkout</Button>
        <p class="mt-3 text-[length:var(--fs-xs)] text-ink-500">
          Trade accounts see contract pricing and 30-day terms at checkout.
        </p>
      </Card>
    </div>
  </Container>
{/if}
