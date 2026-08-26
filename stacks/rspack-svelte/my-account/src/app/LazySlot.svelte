<script lang="ts">
  import type { SlotName } from '@mf-eval/svelte-contracts';
  import { useCart } from '@mf-eval/svelte-contracts';
  import { SLOT_BOX, cachedSlot, resolveSlot } from './slots.svelte.ts';

  let { name }: { name: SlotName } = $props();

  const cart = useCart();
  let host = $state<HTMLElement | null>(null);
  let filled = $state(false);

  /**
   * The widget is mounted BY THE REMOTE, into a node this application owns.
   *
   * Nothing else works: a Svelte component cannot be rendered by a runtime other than the one
   * that compiled it, and federation cannot share Svelte's runtime. So the boundary carries a
   * DOM node and a store, and the remote does its own mounting on the far side.
   */
  $effect(() => {
    const target = host;
    const wanted = name;
    if (!target) return;

    let live = true;
    let teardown: (() => void) | undefined;

    const attach = (mounter: ReturnType<typeof cachedSlot>) => {
      if (!live || !mounter) return;
      target.textContent = '';
      teardown = mounter(target, { store: cart.store });
      filled = true;
    };

    const hit = cachedSlot(wanted);
    if (hit) attach(hit);
    else void resolveSlot(wanted).then(attach);

    return () => {
      live = false;
      teardown?.();
      filled = false;
    };
  });
</script>

<!--
  The box is reserved by the caller's grid and by SLOT_BOX, so swapping the skeleton for the
  real widget moves nothing. A widget that fails to load leaves the skeleton in place — one
  team's outage costs one region, not the page.
-->
<div class={SLOT_BOX} data-slot={name}>
  <div bind:this={host} class="size-full">
    {#if !filled}
      <div class="size-full rounded-lg border border-line bg-card p-5" aria-hidden="true">
        <div class="h-4 w-24 rounded bg-sunken"></div>
        <div class="mt-4 space-y-2">
          <div class="h-3 w-full rounded bg-sunken"></div>
          <div class="h-3 w-4/5 rounded bg-sunken"></div>
        </div>
      </div>
    {/if}
  </div>
</div>
