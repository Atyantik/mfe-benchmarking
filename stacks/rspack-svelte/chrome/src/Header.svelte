<script lang="ts">
  import { Slot } from '@mf-eval/svelte-contracts';
  import { CHROME } from '@mf-eval/contracts/testids';
  import { CATEGORIES } from '@mf-eval/contracts/fixtures';
  import { Container, inputClass } from '@mf-eval/design-svelte';
  import UtilityBar from './UtilityBar.svelte';
  import PrimaryNav from './PrimaryNav.svelte';
  import './styles.css';

  /**
   * Site header — one remote, rendered by EVERY host.
   *
   * Loaded SERVER-SIDE only. The markup is static, so it is rendered into the HTML and never
   * hydrated — a second host consuming it costs the browser nothing beyond this file's CSS.
   *
   * Header and Footer are exposed SEPARATELY rather than as one Layout that wraps the page.
   * A wrapper would put every host's page content inside `[data-owner="chrome"]`, and chrome's
   * scoped stylesheet would then match markup belonging to other teams — reintroducing exactly
   * the cross-remote CSS bleed the scoping exists to prevent.
   */
  export interface Viewer {
    name: string;
    initial: string;
  }

  let { host = 'storefront', viewer = null }: {
    host?: 'storefront' | 'my-account';
    viewer?: Viewer | null;
  } = $props();
</script>

<div data-owner="chrome">
  <UtilityBar />

  <header class="border-b border-line bg-card">
    <Container class="flex h-16 items-center gap-4">
      <a href="/" class="flex shrink-0 items-center gap-2.5" aria-label="Northgate Industrial — home">
        <svg viewBox="0 0 32 32" class="size-8" aria-hidden="true">
          <rect width="32" height="32" rx="5" fill="var(--color-brand-700)" />
          <path
            d="M9 23V9l7 7 7-7v14"
            fill="none"
            stroke="var(--color-card)"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="text-[length:var(--fs-lg)] font-semibold tracking-tight text-ink-900"
          >Northgate<span class="font-normal text-ink-500"> Industrial</span></span>
      </a>

      <form action="/product" method="get" role="search" class="ml-auto hidden w-full max-w-md lg:block">
        <label for="site-search" class="sr-only">Search products</label>
        <div class="relative">
          <input
            id="site-search"
            type="search"
            name="q"
            data-testid={CHROME.search}
            placeholder="Search by part number, range or rating"
            class={`${inputClass} h-10 pl-9`}
          />
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
          >
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M13.5 13.5L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      </form>

      <div class="ml-auto flex items-center gap-2 lg:ml-0">
        <!--
          With a viewer, this is rendered signed-in on the server and needs no behaviour.
          Without one the markup is neutral — "My account" is correct for both states, so there
          is no flash of anything wrong — and the behaviour refines it on the client from a
          readable cookie, leaving the response byte-identical for every visitor.
        -->
        <a
          href="/my-account"
          data-testid={CHROME.accountLink}
          data-signed-in={viewer ? 'true' : undefined}
          data-behavior={viewer ? undefined : 'chrome.account'}
          data-behavior-when={viewer ? undefined : 'idle'}
          class="hidden min-w-[8.5rem] items-center gap-2 rounded-md px-2.5 py-2 text-[length:var(--fs-sm)] font-medium text-ink-700 hover:bg-sunken hover:text-brand-700 sm:inline-flex"
        >
          <span
            data-account-initial
            aria-hidden="true"
            class="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-[length:var(--fs-xs)] font-semibold text-ink-600"
          >
            {#if viewer}
              {viewer.initial}
            {:else}
              <svg viewBox="0 0 20 20" class="size-3.5">
                <circle cx="10" cy="6.5" r="3.2" fill="none" stroke="currentColor" stroke-width="2" />
                <path
                  d="M3.8 17c.7-3.2 3.2-5 6.2-5s5.5 1.8 6.2 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            {/if}
          </span>
          <span data-account-label data-testid={CHROME.accountLabel}
            >{viewer ? (viewer.name.split(' ')[0] ?? viewer.name) : 'My account'}</span>
        </a>
        <!-- Personalized: the server renders a reserved placeholder, the client mounts the live
             component into the same box. Never in the HTML, never cached. -->
        <Slot name="cart.mini" />
      </div>
    </Container>
  </header>

  <PrimaryNav {host} {CATEGORIES} />
</div>
