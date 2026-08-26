<script lang="ts">
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import { money, type AccountSummary } from '../data.ts';
  import { fetchSummary } from './api.ts';
  import { Resource } from './async.svelte.ts';
  import Failed from './Failed.svelte';
  import LazySlot from './LazySlot.svelte';
  import OrderRow from './OrderRow.svelte';
  import Panel from './Panel.svelte';
  import Stat from './Stat.svelte';
  import FallbackSkeleton from '../skeletons/Fallback.svelte';

  const summary = new Resource<AccountSummary>(fetchSummary);
</script>

{#if summary.current.state === 'loading'}
  <!-- The skeleton stays on screen while loading. It is the same markup the server sent, so
       nothing moves and the route still has something painted at every moment. -->
  <FallbackSkeleton />
{:else if summary.current.state === 'error'}
  <Failed what="your account summary" />
{:else}
  {@const s = summary.current.data}
  <div class="flex flex-col gap-8" data-testid={ACCOUNT.page('account.overview')}>
    <div>
      <p class="text-[length:var(--fs-md)] text-ink-500">Welcome back,</p>
      <p class="text-[length:var(--fs-xl)] font-semibold tracking-tight text-ink-900">
        {s.name} · {s.company}
      </p>
      <p class="text-[length:var(--fs-sm)] text-ink-500">Account {s.accountNumber}</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Stat label="Open orders" value={String(s.openOrders)} sub="Awaiting despatch" />
      <Stat label="In transit" value={String(s.inTransit)} sub="On the way to site" />
      <Stat label="Credit used" value={money(s.creditUsed)} sub={`of ${money(s.creditLimit)} limit`} />
    </div>

    <!-- Three regions, three different teams, and this file imports none of them. Each is a
         named slot: the account host renders the name, the shell-kit slot table says who fills
         it, and federation does the rest. Nothing here is downloaded on any page that does not
         render these slots — including the other routes of this very application. -->
    <div class="grid gap-4 lg:grid-cols-3" data-testid={ACCOUNT.widgets}>
      <LazySlot name="account.cart" />
      <LazySlot name="account.recommended" />
      <LazySlot name="account.support" />
    </div>

    <Panel title="Recent orders">
      {#snippet action()}
        <a
          href="/my-account/orders"
          data-testid={ACCOUNT.seeAllOrders}
          class="text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline"
        >See all orders</a>
      {/snippet}
      {#snippet children()}
        <ul class="flex flex-col gap-3">
          {#each s.recent as order (order.id)}
            <OrderRow {order} />
          {/each}
        </ul>
      {/snippet}
    </Panel>
  </div>
{/if}
