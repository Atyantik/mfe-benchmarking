<script lang="ts">
  import { Badge, ButtonLink, Card, Container, HeroVideo, MediaCredit, Picture } from '@mf-eval/design-svelte';
  import { MEDIA, imageForProduct } from '@mf-eval/media';
  import { HERO, PRODUCTS } from '@mf-eval/contracts/fixtures';
  import { HOME } from '@mf-eval/contracts/testids';

  const first = PRODUCTS[0];
</script>

<div class="border-b border-line bg-card">
  <Container class="grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-16">
    <div>
      <p class="mb-3 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.16em] text-brand-700">
        {HERO.eyebrow}
      </p>
      <h1 class="max-w-[18ch] text-[length:var(--fs-3xl)] leading-[1.1] sm:text-[length:var(--fs-4xl)]">
        {HERO.title}
      </h1>
      <p class="mt-4 max-w-prose text-[length:var(--fs-lg)] text-ink-600">{HERO.body}</p>
      <div class="mt-7 flex flex-wrap gap-3">
        <ButtonLink href={HERO.primaryCta.href} size="lg">{HERO.primaryCta.label}</ButtonLink>
        <ButtonLink href={HERO.secondaryCta.href} tone="secondary" size="lg">
          {HERO.secondaryCta.label}
        </ButtonLink>
      </div>
      <dl class="mt-9 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
        {#each HERO.stats as s (s.label)}
          <div>
            <dt class="text-[length:var(--fs-xs)] uppercase tracking-wide text-ink-500">{s.label}</dt>
            <dd class="text-[length:var(--fs-2xl)] font-semibold tabular-nums text-ink-900">{s.value}</dd>
          </div>
        {/each}
      </dl>
    </div>
    <div>
      <!-- The largest element on the page, and deliberately a video — the reference profile's
           hero is one too, and a benchmark whose heaviest element is a paragraph is not
           measuring a real page. The poster carries the paint; the video follows. -->
      {#if MEDIA.video.hero}
        <HeroVideo
          video={MEDIA.video.hero}
          label="Assembly line at an industrial automation facility"
          class="rounded-lg shadow-e2"
          data-testid={HOME.heroVideo}
        />
        <MediaCredit image={MEDIA.video.hero} />
      {/if}
      {#if first}
        <Card class="mt-5 flex gap-4 overflow-hidden p-4">
          <Picture
            image={imageForProduct(first.id, first.family)}
            alt=""
            sizes="8rem"
            class="w-32 shrink-0 rounded-md"
            data-testid={HOME.heroFeaturedImage}
          />
          <div class="min-w-0">
            <Badge tone="brand">Featured range</Badge>
            <h2 class="mt-2 text-[length:var(--fs-md)] leading-snug">
              <a href={`/product/${first.id}`} class="hover:text-brand-700">{first.name}</a>
            </h2>
            <p class="mt-1 font-mono text-[length:var(--fs-xs)] text-ink-500">{first.sku}</p>
          </div>
        </Card>
      {/if}
    </div>
  </Container>
</div>
