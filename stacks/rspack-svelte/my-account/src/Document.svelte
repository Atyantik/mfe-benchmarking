<script lang="ts">
  import type { Component } from 'svelte';
  import { provideSlots, type SlotName } from '@mf-eval/svelte-contracts';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import Frame, { type FrameViewer } from './Frame.svelte';
  import Login from './Login.svelte';

  /**
   * The server-rendered document tree for this host.
   *
   * Svelte context can only be established inside a component, so the slot registry arrives as
   * props here rather than as a `<SlotProvider>` wrapper. Chrome remains a SIBLING of the
   * content for the same reason as on the storefront — a wrapper would put this host's markup
   * inside `[data-owner="chrome"]`.
   */
  let {
    slots,
    onUse,
    Chrome,
    login,
    viewer,
    activeId,
    Skeleton,
  }: {
    slots: Partial<Record<SlotName, unknown>>;
    onUse?: (name: SlotName) => void;
    Chrome: { Header: Component; Footer: Component } | null;
    login?: { next: string; error?: string; email?: string } | undefined;
    viewer: FrameViewer | null;
    activeId: string;
    Skeleton: Component | null;
  } = $props();

  // See App.svelte in the storefront: a slot value in this stack is a mount function, not a
  // component, and shell-kit keeps the registry opaque on purpose.
  provideSlots({ slots: slots as Parameters<typeof provideSlots>[0]['slots'], onUse });
</script>

<div class="flex min-h-screen flex-col bg-page">
  {#if Chrome}<Chrome.Header host="my-account" {viewer} />{/if}
  <main id="main" class="flex-1">
    {#if login}
      <Login next={login.next} error={login.error} email={login.email} />
    {:else}
      <!-- The client takes over this whole element: the sidebar's active state changes on every
           soft navigation, so the frame belongs to the application, not to the server render
           that seeded it. -->
      <div id="account-frame">
        <Frame {activeId} {viewer}>
          {#snippet children()}
            {#if Skeleton}
              <Skeleton />
            {:else}
              <p class="text-[length:var(--fs-md)] text-ink-700" data-testid={ACCOUNT.notFound}>
                That account page does not exist.
              </p>
            {/if}
          {/snippet}
        </Frame>
      </div>
    {/if}
  </main>
  {#if Chrome}<Chrome.Footer />{/if}
</div>
