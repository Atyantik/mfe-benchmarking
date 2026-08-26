<script lang="ts">
  import { Container } from '@mf-eval/design-svelte';

  let { host, CATEGORIES }: { host: string; CATEGORIES: readonly { id: string; name: string }[] } = $props();
  const inAccount = $derived(host === 'my-account');
</script>

<nav aria-label="Primary" class="border-b border-line bg-card">
  <Container>
    <ul class="-mx-2 flex items-center gap-1 overflow-x-auto text-[length:var(--fs-md)]">
      <li>
        <a href="/product" class="inline-block whitespace-nowrap px-3 py-3 font-medium text-ink-800 hover:text-brand-700">
          All products
        </a>
      </li>
      {#each CATEGORIES as c (c.id)}
        <li>
          <a
            href={`/product?category=${c.id}`}
            class="inline-block whitespace-nowrap px-3 py-3 text-ink-600 hover:text-brand-700"
          >{c.name}</a>
        </li>
      {/each}
      <li class="ml-auto">
        <a href="/faq" class="inline-block whitespace-nowrap px-3 py-3 text-ink-600 hover:text-brand-700">Support</a>
      </li>
      <li>
        <a
          href="/my-account"
          aria-current={inAccount ? 'true' : undefined}
          class={inAccount
            ? 'inline-block whitespace-nowrap border-b-2 border-brand-700 px-3 py-3 font-medium text-brand-700'
            : 'inline-block whitespace-nowrap px-3 py-3 text-ink-600 hover:text-brand-700'}
        >My account</a>
      </li>
    </ul>
  </Container>
</nav>
