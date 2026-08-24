import {
  ButtonLink,
  Card,
  Container,
  Section,
  SectionHeader,
  Badge,
} from '@mf-eval/design';
import { HeroVideo, MediaCredit, Picture, ProductCard } from '@mf-eval/design';
import { MEDIA, imageForProduct, imagesFor } from '@mf-eval/media';
import {
  CATEGORIES,
  HERO,
  INDUSTRIES,
  PRODUCTS,
  RESOURCES,
} from '@mf-eval/contracts/fixtures';

/**
 * Home — owned and rendered by the shell, no federation involved.
 *
 * It is also the experimental control: the difference between this page and a federated
 * one, with content held comparable, is what federation itself costs
 * (docs/decision-log.md D8).
 */
export function Component() {
  // Deterministic, not random — the same four products every render, on server and client.
  const popular = PRODUCTS.filter((p) => p.availability === 'in-stock').slice(0, 4);

  return (
    <>
      <Hero />

      <Section>
        <Container>
          <SectionHeader
            eyebrow="Catalogue"
            title="Browse by category"
            action={
              <ButtonLink href="/product" tone="secondary" size="sm">
                View all 60 products
              </ButtonLink>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const count = PRODUCTS.filter((p) => p.categoryId === c.id).length;
              return (
                <Card as="li" key={c.id} className="group relative flex gap-4 p-4 transition-shadow hover:shadow-e2">
                  <Picture
                    image={imagesFor(c.family)[0] ?? imageForProduct(c.id, c.family)}
                    alt=""
                    sizes="7rem"
                    className="w-28 shrink-0 rounded-md"
                    data-testid={`category-image-${c.id}`}
                  />
                  <div className="flex flex-col">
                    <h3 className="text-[length:var(--fs-md)]">
                      <a href={`/product?category=${c.id}`} className="after:absolute after:inset-0 group-hover:text-brand-700">
                        {c.name}
                      </a>
                    </h3>
                    <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">{c.blurb}</p>
                    <p className="mt-auto pt-2 text-[length:var(--fs-xs)] tabular-nums text-ink-500">
                      {count} products
                    </p>
                  </div>
                </Card>
              );
            })}
          </ul>
        </Container>
      </Section>

      <Section tone="card" className="border-y border-line">
        <Container>
          <SectionHeader eyebrow="From stock" title="Ready to despatch" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                href={`/product/${p.id}`}
              />
            ))}
          </ul>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeader eyebrow="Applications" title="Specified for demanding environments" />
            <ul className="grid gap-3 sm:grid-cols-2">
              {INDUSTRIES.map((i) => (
                <Card as="li" key={i.name} className="p-4">
                  <h3 className="text-[length:var(--fs-md)]">{i.name}</h3>
                  <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">{i.note}</p>
                </Card>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow="Resources" title="Technical reading" />
            <ul className="flex flex-col gap-3">
              {RESOURCES.map((r) => (
                <Card as="li" key={r.title} className="group relative p-4">
                  <Badge tone="info">{r.kind}</Badge>
                  <h3 className="mt-2 text-[length:var(--fs-md)]">
                    <a href={r.href} className="after:absolute after:inset-0 group-hover:text-brand-700">
                      {r.title}
                    </a>
                  </h3>
                  <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">{r.body}</p>
                </Card>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section tone="inverse" className="mt-4">
        <Container className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-[length:var(--fs-2xl)] text-[var(--t-invert)]">
              Not sure which part fits the duty?
            </h2>
            <p className="mt-2 text-[length:var(--fs-base)] text-brand-100">
              Send the load, supply characteristics and enclosure constraints. An applications
              engineer replies with two or three candidate part numbers and the reasoning —
              usually within one working day.
            </p>
          </div>
          <ButtonLink href="/faq/contact" tone="secondary" size="lg">
            Contact an engineer
          </ButtonLink>
        </Container>
      </Section>
    </>
  );
}

function Hero() {
  const [first] = PRODUCTS;
  return (
    <div className="border-b border-line bg-card">
      <Container className="grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div>
          <p className="mb-3 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {HERO.eyebrow}
          </p>
          <h1 className="max-w-[18ch] text-[length:var(--fs-3xl)] leading-[1.1] sm:text-[length:var(--fs-4xl)]">
            {HERO.title}
          </h1>
          <p className="mt-4 max-w-prose text-[length:var(--fs-lg)] text-ink-600">{HERO.body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={HERO.primaryCta.href} size="lg">{HERO.primaryCta.label}</ButtonLink>
            <ButtonLink href={HERO.secondaryCta.href} tone="secondary" size="lg">
              {HERO.secondaryCta.label}
            </ButtonLink>
          </div>
          <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
            {HERO.stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[length:var(--fs-xs)] uppercase tracking-wide text-ink-500">{s.label}</dt>
                <dd className="text-[length:var(--fs-2xl)] font-semibold tabular-nums text-ink-900">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          {/* The largest element on the page, and deliberately a video — the reference
              profile's hero is one too, and a benchmark whose heaviest element is a paragraph
              is not measuring a real page. The poster carries the paint; the video follows. */}
          {MEDIA.video.hero ? (
            <>
              <HeroVideo
                video={MEDIA.video.hero}
                label="Assembly line at an industrial automation facility"
                className="rounded-lg shadow-e2"
                data-testid="hero-video"
              />
              <MediaCredit image={MEDIA.video.hero} />
            </>
          ) : null}
          {first ? (
            <Card className="mt-5 flex gap-4 overflow-hidden p-4">
              <Picture
                image={imageForProduct(first.id, first.family)}
                alt=""
                sizes="8rem"
                className="w-32 shrink-0 rounded-md"
                data-testid="hero-featured-image"
              />
              <div className="min-w-0">
                <Badge tone="brand">Featured range</Badge>
                <h2 className="mt-2 text-[length:var(--fs-md)] leading-snug">
                  <a href={`/product/${first.id}`} className="hover:text-brand-700">{first.name}</a>
                </h2>
                <p className="mt-1 font-mono text-[length:var(--fs-xs)] text-ink-500">{first.sku}</p>
              </div>
            </Card>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
