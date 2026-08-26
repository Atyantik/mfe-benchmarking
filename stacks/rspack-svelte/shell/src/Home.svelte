<script lang="ts">
  import {
    Badge,
    ButtonLink,
    Card,
    Container,
    Picture,
    ProductCard,
    Section,
    SectionHeader,
  } from '@mf-eval/design-svelte';
  import { imageForProduct, imagesFor } from '@mf-eval/media';
  import { CATEGORIES, INDUSTRIES, PRODUCTS, RESOURCES } from '@mf-eval/contracts/fixtures';
  import { HOME } from '@mf-eval/contracts/testids';
  import Hero from './Hero.svelte';

  /**
   * Home — owned and rendered by the shell, no federation involved.
   *
   * It is also the experimental control: the difference between this page and a federated one,
   * with content held comparable, is what federation itself costs (docs/decision-log.md D8).
   */
  // Deterministic, not random — the same four products every render, on server and client.
  const popular = PRODUCTS.filter((p) => p.availability === 'in-stock').slice(0, 4);
</script>

<Hero />

<Section>
  <Container>
    <SectionHeader eyebrow="Catalogue" title="Browse by category">
      {#snippet action()}
        <ButtonLink href="/product" tone="secondary" size="sm">View all 60 products</ButtonLink>
      {/snippet}
    </SectionHeader>
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each CATEGORIES as c (c.id)}
        {@const count = PRODUCTS.filter((p) => p.categoryId === c.id).length}
        <Card as="li" class="group relative flex gap-4 p-4 transition-shadow hover:shadow-e2">
          <Picture
            image={imagesFor(c.family)[0] ?? imageForProduct(c.id, c.family)}
            alt=""
            sizes="7rem"
            class="w-28 shrink-0 rounded-md"
            data-testid={HOME.categoryImage(c.id)}
          />
          <div class="flex flex-col">
            <h3 class="text-[length:var(--fs-md)]">
              <a href={`/product?category=${c.id}`} class="after:absolute after:inset-0 group-hover:text-brand-700">
                {c.name}
              </a>
            </h3>
            <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">{c.blurb}</p>
            <p class="mt-auto pt-2 text-[length:var(--fs-xs)] tabular-nums text-ink-500">{count} products</p>
          </div>
        </Card>
      {/each}
    </ul>
  </Container>
</Section>

<Section tone="card" class="border-y border-line">
  <Container>
    <SectionHeader eyebrow="From stock" title="Ready to despatch" />
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each popular as p (p.id)}
        <ProductCard product={p} href={`/product/${p.id}`} />
      {/each}
    </ul>
  </Container>
</Section>

<Section>
  <Container class="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
    <div>
      <SectionHeader eyebrow="Applications" title="Specified for demanding environments" />
      <ul class="grid gap-3 sm:grid-cols-2">
        {#each INDUSTRIES as i (i.name)}
          <Card as="li" class="p-4">
            <h3 class="text-[length:var(--fs-md)]">{i.name}</h3>
            <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">{i.note}</p>
          </Card>
        {/each}
      </ul>
    </div>
    <div>
      <SectionHeader eyebrow="Resources" title="Technical reading" />
      <ul class="flex flex-col gap-3">
        {#each RESOURCES as r (r.title)}
          <Card as="li" class="group relative p-4">
            <Badge tone="info">{r.kind}</Badge>
            <h3 class="mt-2 text-[length:var(--fs-md)]">
              <a href={r.href} class="after:absolute after:inset-0 group-hover:text-brand-700">{r.title}</a>
            </h3>
            <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">{r.body}</p>
          </Card>
        {/each}
      </ul>
    </div>
  </Container>
</Section>

<Section tone="inverse" class="mt-4">
  <Container class="flex flex-wrap items-center justify-between gap-6">
    <div class="max-w-xl">
      <h2 class="text-[length:var(--fs-2xl)] text-[var(--t-invert)]">Not sure which part fits the duty?</h2>
      <p class="mt-2 text-[length:var(--fs-base)] text-brand-100">
        Send the load, supply characteristics and enclosure constraints. An applications engineer
        replies with two or three candidate part numbers and the reasoning — usually within one
        working day.
      </p>
    </div>
    <ButtonLink href="/faq/contact" tone="secondary" size="lg">Contact an engineer</ButtonLink>
  </Container>
</Section>
