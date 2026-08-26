<script lang="ts">
  import { CATEGORIES } from '@mf-eval/contracts/fixtures';
  import { Container } from '@mf-eval/design-svelte';
  import './styles.css';

  /** Site footer. Exposed separately from the header — see Header.svelte for why. */
  const columns = [
    { title: 'Products', links: CATEGORIES.map((c) => ({ label: c.name, href: `/product?category=${c.id}` })) },
    {
      title: 'Support',
      links: [
        { label: 'Support centre', href: '/faq' },
        { label: 'Ordering & accounts', href: '/faq#ordering' },
        { label: 'Delivery & lead times', href: '/faq#delivery' },
        { label: 'Warranty & returns', href: '/faq#warranty' },
        { label: 'Contact an engineer', href: '/faq/contact' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Northgate', href: '/' },
        { label: 'Industries served', href: '/' },
        { label: 'Sustainability', href: '/' },
        { label: 'Careers', href: '/' },
      ],
    },
  ];
</script>

<footer data-owner="chrome" class="mt-16 border-t border-line bg-card">
  <Container class="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
    <div>
      <p class="mb-2 text-[length:var(--fs-md)] font-semibold text-ink-900">Northgate Industrial</p>
      <p class="max-w-xs text-[length:var(--fs-sm)] text-ink-500">
        Electrical distribution, automation and power continuity equipment, stocked and
        supported for industrial and commercial projects.
      </p>
    </div>
    {#each columns as col (col.title)}
      <div>
        <h2 class="mb-3 text-[length:var(--fs-sm)] font-semibold uppercase tracking-[0.1em] text-ink-800">
          {col.title}
        </h2>
        <ul class="flex flex-col gap-2 text-[length:var(--fs-sm)] text-ink-500">
          {#each col.links as l (l.label)}
            <li><a href={l.href} class="hover:text-brand-700 hover:underline">{l.label}</a></li>
          {/each}
        </ul>
      </div>
    {/each}
  </Container>
  <div class="border-t border-line">
    <Container class="flex flex-wrap items-center justify-between gap-3 py-4 text-[length:var(--fs-xs)] text-ink-500">
      <p>© 2026 Northgate Industrial. A reference application, not a real supplier.</p>
      <p>Built as a Module Federation evaluation harness.</p>
    </Container>
  </div>
</footer>
