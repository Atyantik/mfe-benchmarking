import { Slot } from '@mf-eval/react-contracts';
import type { PageProps, RouteLoaderArgs } from '@mf-eval/contracts';
import { PRODUCTS, categoryById, productById, type Product } from '@mf-eval/contracts/fixtures';
import { galleryFor, imageForProduct } from '@mf-eval/media';
import { StockPanel } from './StockPanel';
import { CATALOGUE } from '@mf-eval/contracts/testids';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Container,
  Price,
  ProductCard,
  ImageButton,
  MediaCredit,
  Picture,
  SectionHeader,
  SpecTable,
  StockStatus,
} from '@mf-eval/design';

export interface DetailData {
  product: Product;
  related: Product[];
}

export function loader({ params }: RouteLoaderArgs): DetailData {
  const product = productById(params.id ?? '');
  if (!product) throw new Response('Not found', { status: 404 });
  const related = PRODUCTS.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  return { product, related };
}

export function Component({ data }: PageProps<DetailData>) {
  const { product, related } = data;
  const gallery = galleryFor(product.id, product.family);
  const category = categoryById(product.categoryId);

  return (
    <Container>
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/product' },
          ...(category ? [{ label: category.name, href: `/product?category=${category.id}` }] : []),
          { label: product.sku },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="grid gap-6 sm:grid-cols-[18rem_1fr]">
            {/* A real gallery: the main image is this page's LCP element, so it is the one
                image marked priority. The thumbnails are lazy, and the whole thing works
                without JavaScript — the behaviour only swaps which one is large. */}
            <div
              data-behavior="product.gallery"
              data-behavior-when="visible"
              data-testid="gallery"
              className="flex flex-col gap-3"
            >
              <Card className="p-3">
                <Picture
                  image={gallery[0] ?? imageForProduct(product.id, product.family)}
                  alt={product.name}
                  sizes="(min-width: 40rem) 18rem, 92vw"
                  priority
                  className="rounded-md"
                  data-testid="gallery-main"
                />
              </Card>
              {gallery.length > 1 ? (
                <ul className="grid grid-cols-4 gap-2" data-testid="gallery-thumbs">
                  {gallery.slice(0, 4).map((img, i) => (
                    <li key={img.id}>
                      <ImageButton
                        data-gallery-thumb
                        data-gallery-id={img.id}
                        data-testid={`gallery-thumb-${i}`}
                        aria-label={`View image ${i + 1} of ${Math.min(gallery.length, 4)}`}
                        aria-pressed={i === 0}
                      >
                        <Picture image={img} alt="" sizes="5rem" />
                      </ImageButton>
                    </li>
                  ))}
                </ul>
              ) : null}
              <MediaCredit image={gallery[0] ?? imageForProduct(product.id, product.family)} />
              {/* Same class names as the cart badge in the header above, from a different
                  application. See docs/css.md. */}
              <StockPanel product={product} />
            </div>
            <div>
              <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-brand-700">
                {product.range}
              </p>
              <h1 className="mt-1 text-[length:var(--fs-2xl)] leading-tight">{product.name}</h1>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[length:var(--fs-sm)]">
                <div className="flex gap-2">
                  <dt className="text-ink-500">Part number</dt>
                  <dd className="font-mono text-ink-800">{product.sku}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-500">Category</dt>
                  <dd className="text-ink-800">{category?.name}</dd>
                </div>
              </dl>
              <p className="mt-4 max-w-prose text-[length:var(--fs-base)] text-ink-600">
                {product.description}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {product.applications.map((a) => (
                  <li key={a}><Badge>{a}</Badge></li>
                ))}
              </ul>
            </div>
          </div>

          <section className="mt-10" aria-labelledby="specs">
            <h2 id="specs" className="mb-3 text-[length:var(--fs-lg)]">Technical specification</h2>
            <Card className="px-4 py-1">
              <SpecTable rows={product.specs} />
            </Card>
          </section>

          <section className="mt-10" aria-labelledby="docs">
            <h2 id="docs" className="mb-3 text-[length:var(--fs-lg)]">Documents</h2>
            <Card>
              <ul className="divide-y divide-[var(--s-border)]">
                {product.documents.map((doc) => (
                  <li key={doc.name} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[length:var(--fs-md)] text-ink-800">{doc.name}</p>
                      <p className="text-[length:var(--fs-xs)] text-ink-500">
                        {doc.kind} · {(doc.sizeKb / 1024).toFixed(1)} MB · PDF
                      </p>
                    </div>
                    <Button tone="ghost" size="sm" type="button">Download</Button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>

        {/* Buy panel. Sticky on desktop — the decision the page exists to support. */}
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <Card className="p-5">
            <Price cents={product.price} size="lg" suffix="ex. VAT" />
            <div className="mt-3">
              <StockStatus status={product.availability} leadTimeDays={product.leadTimeDays} />
            </div>
            <Button
              type="button"
              size="lg"
              className="mt-5 w-full"
              data-testid={CATALOGUE.addToCart(product.id)}
              data-add-id={product.id}
              data-add-name={product.name}
              data-add-price={product.price}
            >
              Add to cart
            </Button>
            <p className="mt-3 text-[length:var(--fs-xs)] text-ink-500">
              Despatch cut-off 15:00. Trade accounts see contract pricing at checkout.
            </p>
            <hr className="my-4 border-line" />
            <ul className="flex flex-col gap-2 text-[length:var(--fs-sm)] text-ink-600">
              <li>Warranty {product.specs.find((s) => s.label === 'Warranty')?.value}</li>
              <li>{product.specs.find((s) => s.label === 'Certifications')?.value}</li>
              <li><a href="/faq#delivery" className="text-brand-700 hover:underline">Delivery &amp; lead times</a></li>
            </ul>
          </Card>

          {/* Personalized — the cart team's drawer, filled by the shell. Product knows
              nothing about the cart remote. */}
          <div className="mt-4">
            <Slot name="cart.drawer" />
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-14" aria-labelledby="related">
          <SectionHeader eyebrow="Same category" title="Related products" />
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} href={`/product/${p.id}`} />
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
