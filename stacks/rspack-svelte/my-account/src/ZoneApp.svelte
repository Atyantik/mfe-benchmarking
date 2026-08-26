<script lang="ts">
  import type { Component } from 'svelte';
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import { createZoneRouter, type ZoneMatch } from '@mf-eval/zone-router';
  import Frame, { type FrameViewer } from './Frame.svelte';
  import { BASE_PATH, ROUTES, type PageModule } from './routes.ts';
  import { FALLBACK_SKELETON, SKELETONS } from './skeletons/index.ts';

  let { viewer }: { viewer: FrameViewer | null } = $props();

  const router = createZoneRouter<PageModule>({ basePath: BASE_PATH, routes: ROUTES });

  /** Modules are cached, so returning to a route is instant and produces no request. */
  const loaded = new Map<string, PageModule>();

  /**
   * Route and module are ONE piece of state, never two.
   *
   * Held separately they disagree for exactly one render: the router publishes the new match
   * synchronously, but the new module arrives asynchronously — so the OUTGOING page renders
   * once with the INCOMING route's params. That is not cosmetic. In the React stack it sent
   * `fetchOrder('')` on every navigation away from an order detail, which the API answered
   * with a 404.
   *
   * Found by asserting that a zone walk produces no 4xx, which is why that assertion is part
   * of the bench rather than something a person remembers to look at.
   */
  let view = $state<{ match: ZoneMatch<PageModule> | null; module: PageModule | null }>({
    match: router.current(),
    module: null,
  });

  const apply = (match: ZoneMatch<PageModule> | null) => {
    if (!match) {
      view = { match: null, module: null };
      return;
    }
    const cached = loaded.get(match.route.id);
    if (cached) {
      view = { match, module: cached };
      return;
    }
    // Show the skeleton for the route being ENTERED while its chunk arrives, rather than
    // holding the previous page on screen. Chrome needs a contentful paint before it will
    // record the soft navigation at all (docs/constraints.md §14); keeping the old page up
    // means the paint — and therefore the measurement — never happens.
    view = { match, module: null };
    void match.route.load().then((mod) => {
      loaded.set(match.route.id, mod);
      // Discard a module that arrives after the visitor has moved on again.
      if (view.match?.pathname === match.pathname) view = { match, module: mod };
    });
  };

  $effect(() => {
    apply(router.current());
    return router.subscribe(apply);
  });

  // The title has to move with the route, or every soft navigation looks like the same page to
  // a screen reader, to the history menu, and to anything reading the document.
  $effect(() => {
    const { match, module } = view;
    if (module && match) document.title = `${module.title(match.params)} · Northgate Industrial`;
  });

  // An order detail is still "Orders" as far as the sidebar is concerned.
  const activeId = $derived(
    view.match ? (view.match.route.id === 'account.order' ? 'account.orders' : view.match.route.id) : 'account.overview',
  );
  const Body = $derived(view.module?.Page ?? null);
  const Skeleton = $derived<Component>(
    view.match ? (SKELETONS[view.match.route.id] ?? FALLBACK_SKELETON) : FALLBACK_SKELETON,
  );
</script>

{#if !view.match}
  <Frame activeId="account.overview" {viewer}>
    {#snippet children()}
      <p class="text-[length:var(--fs-md)] text-ink-700" data-testid={ACCOUNT.notFound}>
        That account page does not exist.
      </p>
    {/snippet}
  </Frame>
{:else}
  <Frame {activeId} {viewer}>
    {#snippet children()}
      {#if Body}
        <Body params={view.match.params} />
      {:else}
        <Skeleton />
      {/if}
    {/snippet}
  </Frame>
{/if}
