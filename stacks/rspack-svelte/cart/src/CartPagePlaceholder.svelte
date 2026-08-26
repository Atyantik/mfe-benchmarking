<script lang="ts">
  import { CART } from '@mf-eval/contracts/testids';
  import { Breadcrumbs, Card, Container } from '@mf-eval/design-svelte';
  import './styles.css';

  /**
   * The whole /cart page is personalized, so the SERVER renders only its skeleton: the chrome
   * a crawler and a first paint need, with the per-user part reserved but empty. This keeps
   * even the cart route shared-cacheable — the HTML is identical for everyone.
   */
</script>

<Container>
  <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
  <h1 class="text-[length:var(--fs-2xl)]">Your cart</h1>
  <div
    data-testid={CART.pagePlaceholder}
    aria-hidden="true"
    class="mt-6 grid gap-6 opacity-45 lg:grid-cols-[minmax(0,1fr)_20rem]"
  >
    <Card class="min-h-[16rem] p-4"><p class="text-[length:var(--fs-sm)]">&nbsp;</p></Card>
    <Card class="h-fit min-h-[12rem] p-5"><p class="text-[length:var(--fs-sm)]">&nbsp;</p></Card>
  </div>
</Container>
