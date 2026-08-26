<script lang="ts">
  import { Card } from '@mf-eval/design-svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import type { Profile as ProfileData } from '../data.ts';
  import { fetchProfile } from './api.ts';
  import { Resource } from './async.svelte.ts';
  import Failed from './Failed.svelte';
  import Field from './Field.svelte';
  import Panel from './Panel.svelte';
  import ProfileSkeleton from '../skeletons/Profile.svelte';


  /**
   * Route params, part of the contract every zone page is rendered with.
   *
   * Declared even where unread: component props are contravariant, so a page that declares no
   * props is not assignable to "a page the router can render". Saying it explicitly is more
   * honest than widening the router's type until the mismatch disappears.
   */
  let { params: _params }: { params?: Record<string, string> } = $props();

  const profile = new Resource<ProfileData>(fetchProfile);
</script>

{#if profile.current.state === 'loading'}
  <ProfileSkeleton />
{:else if profile.current.state === 'error'}
  <Failed what="your profile" />
{:else}
  {@const p = profile.current.data}
  <div class="flex flex-col gap-6" data-testid={ACCOUNT.page('account.profile')}>
    <Panel title="Profile">
      {#snippet children()}
        <Card class="p-5">
          <dl class="grid gap-5 sm:grid-cols-2">
            <Field label="Name" value={p.name} />
            <Field label="Email" value={p.email} />
            <Field label="Company" value={p.company} />
            <Field label="Account number" value={p.accountNumber} />
            <Field label="Phone" value={p.phone} />
            <Field label="Contact preference" value={p.contactPreference === 'email' ? 'Email' : 'Phone'} />
          </dl>
        </Card>
      {/snippet}
    </Panel>

    <Panel title="Addresses">
      {#snippet children()}
        <div class="grid gap-4 sm:grid-cols-2">
          <Card class="p-5"><dl class="flex flex-col gap-1"><Field label="Billing" value={p.billingAddress} /></dl></Card>
          <Card class="p-5"><dl class="flex flex-col gap-1"><Field label="Delivery" value={p.deliveryAddress} /></dl></Card>
        </div>
      {/snippet}
    </Panel>
  </div>
{/if}
