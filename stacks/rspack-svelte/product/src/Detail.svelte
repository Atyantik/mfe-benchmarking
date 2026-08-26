<script lang="ts">
  import { Slot } from '@mf-eval/svelte-contracts';
  import { categoryById } from '@mf-eval/contracts/fixtures';
  import { galleryFor, imageForProduct } from '@mf-eval/media';
  import { CATALOGUE } from '@mf-eval/contracts/testids';
  import {
    Badge,
    Breadcrumbs,
    Button,
    Card,
    Container,
    ImageButton,
    MediaCredit,
    Picture,
    Price,
    ProductCard,
    SectionHeader,
    SpecTable,
    StockStatus,
  } from '@mf-eval/design-svelte';
  import StockPanel from './StockPanel.svelte';
  import type { DetailData } from './Detail.route.ts';

  let { data }: { data: DetailData } = $props();

  const product = $derived(data.product);
  const related = $derived(data.related);
  const gallery = $derived(galleryFor(product.id, product.family));
  const category = $derived(categoryById(product.categoryId));
  const hero = $derived(gallery[0] ?? imageForProduct(product.id, product.family));
</script>

<Container>
  <Breadcrumbs
    trail={[
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/product' },
      ...(category ? [{ label: category.name, href: `/product?category=${category.id}` }] : []),
      { label: product.sku },
    ]}
  />

  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div>
      <div class="grid gap-6 sm:grid-cols-[18rem_1fr]">
        <!-- A real gallery: the main image is this page's LCP element, so it is the one image
             marked priority. The thumbnails are lazy, and the whole thing works without
             JavaScript — the behaviour only swaps which one is large. -->
        <div
          data-behavior="product.gallery"
          data-behavior-when="visible"
          data-testid={CATALOGUE.gallery}
          class="flex flex-col gap-3"
        >
          <Card class="p-3">
            <Picture
              image={hero}
              alt={product.name}
              sizes="(min-width: 40rem) 18rem, 92vw"
              priority
              class="rounded-md"
              data-testid={CATALOGUE.galleryMain}
            />
          </Card>
          {#if gallery.length > 1}
            <ul class="grid grid-cols-4 gap-2" data-testid={CATALOGUE.galleryThumbs}>
              {#each gallery.slice(0, 4) as img, i (img.id)}
                <li>
                  <ImageButton
                    data-gallery-thumb
                    data-gallery-id={img.id}
                    data-testid={CATALOGUE.galleryThumb(i)}
                    aria-label={`View image ${i + 1} of ${Math.min(gallery.length, 4)}`}
                    aria-pressed={i === 0}
                  >
                    <Picture image={img} alt="" sizes="5rem" />
                  </ImageButton>
                </li>
              {/each}
            </ul>
          {/if}
          <MediaCredit image={hero} />
          <!-- Same class names as the cart badge in the header above, from a different
               application. See docs/css.md. -->
          <StockPanel {product} />
        </div>
        <div>
          <p class="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-brand-700">
            {product.range}
          </p>
          <h1 class="mt-1 text-[length:var(--fs-2xl)] leading-tight">{product.name}</h1>
          <dl class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[length:var(--fs-sm)]">
            <div class="flex gap-2">
              <dt class="text-ink-500">Part number</dt>
              <dd class="font-mono text-ink-800">{product.sku}</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-ink-500">Category</dt>
              <dd class="text-ink-800">{category?.name}</dd>
            </div>
          </dl>
          <p class="mt-4 max-w-prose text-[length:var(--fs-base)] text-ink-600">{product.description}</p>
          <ul class="mt-4 flex flex-wrap gap-1.5">
            {#each product.applications as a (a)}
              <li><Badge>{a}</Badge></li>
            {/each}
          </ul>
        </div>
      </div>

      <section class="mt-10" aria-labelledby="specs">
        <h2 id="specs" class="mb-3 text-[length:var(--fs-lg)]">Technical specification</h2>
        <Card class="px-4 py-1"><SpecTable rows={product.specs} /></Card>
      </section>

      <section class="mt-10" aria-labelledby="docs">
        <h2 id="docs" class="mb-3 text-[length:var(--fs-lg)]">Documents</h2>
        <Card>
          <ul class="divide-y divide-[var(--s-border)]">
            {#each product.documents as doc (doc.name)}
              <li class="flex items-center justify-between gap-4 px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate text-[length:var(--fs-md)] text-ink-800">{doc.name}</p>
                  <p class="text-[length:var(--fs-xs)] text-ink-500">
                    {doc.kind} · {(doc.sizeKb / 1024).toFixed(1)} MB · PDF
                  </p>
                </div>
                <Button tone="ghost" size="sm" type="button">Download</Button>
              </li>
            {/each}
          </ul>
        </Card>
      </section>
    </div>

    <!-- Buy panel. Sticky on desktop — the decision the page exists to support. -->
    <aside class="lg:sticky lg:top-4 lg:h-fit">
      <Card class="p-5">
        <Price cents={product.price} size="lg" suffix="ex. VAT" />
        <div class="mt-3">
          <StockStatus status={product.availability} leadTimeDays={product.leadTimeDays} />
        </div>
        <Button
          type="button"
          size="lg"
          class="mt-5 w-full"
          data-testid={CATALOGUE.addToCart(product.id)}
          data-add-id={product.id}
          data-add-name={product.name}
          data-add-price={product.price}
        >Add to cart</Button>
        <p class="mt-3 text-[length:var(--fs-xs)] text-ink-500">
          Despatch cut-off 15:00. Trade accounts see contract pricing at checkout.
        </p>
        <hr class="my-4 border-line" />
        <ul class="flex flex-col gap-2 text-[length:var(--fs-sm)] text-ink-600">
          <li>Warranty {product.specs.find((s) => s.label === 'Warranty')?.value}</li>
          <li>{product.specs.find((s) => s.label === 'Certifications')?.value}</li>
          <li><a href="/faq#delivery" class="text-brand-700 hover:underline">Delivery &amp; lead times</a></li>
        </ul>
      </Card>

      <!-- Personalized — the cart team's drawer, filled by the shell. Product knows nothing
           about the cart remote. -->
      <div class="mt-4"><Slot name="cart.drawer" /></div>
    </aside>
  </div>

  {#if related.length > 0}
    <section class="mt-14" aria-labelledby="related">
      <SectionHeader eyebrow="Same category" title="Related products" />
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each related as p (p.id)}
          <ProductCard product={p} href={`/product/${p.id}`} />
        {/each}
      </ul>
    </section>
  {/if}
</Container>
