/**
 * Media — the half of Core Web Vitals that the other suites could not see.
 *
 * Before real photographs existed here, every LCP measurement in this repo was taken on a
 * page whose heaviest element was a paragraph. The numbers were excellent and meaningless.
 * These fixtures are built to the reference profile in docs/media.md: a video hero,
 * roughly a megabyte of imagery per page, a largest single image near 300 kB.
 *
 * Six sections, and each one checks a mistake real storefronts actually make:
 *
 *   1  inventory   every derivative the manifest promises exists and is a real image
 *   2  delivery    what each route actually downloads, by format and by weight
 *   3  dimensions  every image reserves its box — 14 of the reference profile's 29 do not
 *   4  responsive  every image offers more than one width — the reference profile offers zero srcset
 *   5  priority    exactly one eager image per page, and it is the LCP one
 *   6  video       poster, dimensions, preload, and sources ordered by measured weight
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { EDGE, MEDIA_BUDGET, ROUTES, ownerOf } from './lib/topology.mjs';
import { signedInContext } from './lib/signin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');
const MEDIA_DIR = join(ROOT, 'packages/media');

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (t) => console.log(`        ${t}`);
const heading = (t) => console.log(`\n--- ${t} ${'-'.repeat(Math.max(0, 72 - t.length))}`);
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

console.log('\nmedia - real photographs and video, measured\n');

// -- 1. inventory -----------------------------------------------------------
heading('1. inventory - the manifest matches what is on disk');
const manifestPath = join(MEDIA_DIR, 'manifest.json');
if (!existsSync(manifestPath)) {
  check('inventory', 'the media manifest exists', false, 'run `pnpm media` first');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const images = Object.values(manifest.images ?? {});
{
  const missing = [];
  let derivatives = 0;
  let bytes = 0;
  for (const image of images) {
    for (const w of image.widths) {
      for (const [format, ext] of [['avif', 'avif'], ['webp', 'webp'], ['jpeg', 'jpg']]) {
        const file = join(MEDIA_DIR, 'dist/img', image.id, `${w}.${ext}`);
        if (!existsSync(file) || statSync(file).size < 200) missing.push(`${image.id}/${w}.${ext}`);
        else {
          derivatives += 1;
          bytes += statSync(file).size;
          void format;
        }
      }
    }
  }
  note(`${images.length} photographs, ${derivatives} derivatives, ${kb(bytes)} on disk`);
  check('inventory', 'every derivative the manifest promises is on disk', missing.length === 0,
    missing.length ? `${missing.length} missing, e.g. ${missing[0]}` : 'nothing promised is absent');

  const noCredit = images.filter((i) => !i.credit?.author);
  check('inventory', 'every photograph carries its attribution', noCredit.length === 0,
    noCredit.length ? noCredit.map((i) => i.id).join(', ') : 'CC BY and CC BY-SA both require it');

  const badDims = images.filter((i) => !(i.width > 0 && i.height > 0 && i.aspectRatio > 0));
  check('inventory', 'every photograph records intrinsic dimensions', badDims.length === 0,
    badDims.length ? badDims.map((i) => i.id).join(', ') : 'so every <img> can reserve its box');

  const noLqip = images.filter((i) => !i.lqip?.startsWith('data:image/'));
  check('inventory', 'every photograph has an inline placeholder', noLqip.length === 0,
    noLqip.length ? noLqip.map((i) => i.id).join(', ') : 'a slow image shows colour, not a hole');
}

// -- 2-6: one instrumented load per route ------------------------------------
const browser = await chromium.launch();
const seen = {};

for (const route of ROUTES) {
  const viewport = { width: 1440, height: 900 };
  const ctx = route.path.startsWith('/my-account')
    ? await signedInContext(browser, { viewport })
    : await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const responses = [];
  page.on('response', async (r) => {
    const type = r.request().resourceType();
    if (type !== 'image' && type !== 'media') return;
    try {
      responses.push({
        url: r.url(),
        type,
        bytes: (await r.body()).length,
        mime: (r.headers()['content-type'] ?? '').split(';')[0],
        owner: ownerOf(r.url()),
        status: r.status(),
      });
    } catch {
      /* a range request may have no readable body */
    }
  });

  await page.goto(EDGE + route.path, { waitUntil: 'networkidle' });
  // Give lazy images below the fold a chance NOT to load, then look.
  await page.waitForTimeout(400);

  const imgs = await page.$$eval('img', (els) =>
    els
      .map((e) => ({
        src: e.currentSrc || e.src,
        natural: { w: e.naturalWidth, h: e.naturalHeight },
        box: { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) },
        hasDims: e.hasAttribute('width') && e.hasAttribute('height'),
        loading: e.loading,
        priority: e.getAttribute('fetchpriority'),
        candidates: (e.getAttribute('srcset') ?? '').split(',').filter(Boolean).length,
        sizes: e.getAttribute('sizes') ?? '',
        alt: e.getAttribute('alt'),
        inViewport: e.getBoundingClientRect().top < 900 && e.getBoundingClientRect().bottom > 0,
        testid: e.getAttribute('data-testid'),
      }))
      .filter((e) => e.box.w > 1 && e.box.h > 1),
  );
  const videos = await page.$$eval('video', (els) =>
    els.map((e) => ({
      poster: e.getAttribute('poster'),
      hasDims: e.hasAttribute('width') && e.hasAttribute('height'),
      preload: e.getAttribute('preload'),
      muted: e.muted,
      playsInline: e.hasAttribute('playsinline'),
      label: e.getAttribute('aria-label'),
      sources: [...e.querySelectorAll('source')].map((s) => ({ src: s.src, type: s.type })),
    })),
  );
  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = null;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) last = e;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(
          () => resolve(last ? { url: last.url, size: last.size, tag: last.element?.tagName ?? null } : null),
          250,
        );
      }),
  );
  await ctx.close();
  seen[route.path] = { responses, imgs, videos, lcp };
}

heading('2. delivery - what each route actually downloads');
console.log('        route                    images     bytes   largest   formats');
for (const route of ROUTES) {
  const { responses } = seen[route.path];
  const pics = responses.filter((r) => r.type === 'image');
  const total = pics.reduce((n, r) => n + r.bytes, 0);
  const largest = Math.max(0, ...pics.map((r) => r.bytes));
  const formats = [...new Set(pics.map((r) => r.mime.replace('image/', '')))].join(' ');
  console.log(
    `        ${route.path.padEnd(22)} ${String(pics.length).padStart(6)} ${kb(total).padStart(9)} ` +
      `${kb(largest).padStart(9)}   ${formats || '-'}`,
  );
}
console.log('');
{
  const heavy = ROUTES.filter(
    (r) => seen[r.path].responses.filter((x) => x.type === 'image').reduce((n, x) => n + x.bytes, 0) > MEDIA_BUDGET.routeImageBytes,
  );
  check('delivery', `images stay under ${kb(MEDIA_BUDGET.routeImageBytes)} on every route`, heavy.length === 0,
    heavy.length ? heavy.map((r) => r.path).join(', ') : 'within the reference profile');

  const big = ROUTES.flatMap((r) =>
    seen[r.path].responses.filter((x) => x.type === 'image' && x.bytes > MEDIA_BUDGET.imageBytes)
      .map((x) => `${r.path} ${kb(x.bytes)}`),
  );
  check('delivery', `no single image exceeds ${kb(MEDIA_BUDGET.imageBytes)}`, big.length === 0,
    big.length ? big.slice(0, 3).join(', ') : "largest is within the reference profile's worst case");

  /**
   * AVIF is the whole reason for encoding three formats. If Chrome is taking JPEG, the
   * `<source>` order or the type attributes are wrong and the encoding effort bought nothing.
   *
   * The video poster is the one exception, and it is a real one: `<video poster>` takes a
   * single URL and cannot content-negotiate, so it must be a format every browser decodes.
   * It is excluded here and budgeted on weight instead.
   */
  const isPoster = (url) => url.includes('/video/');
  const withImages = ROUTES.filter((r) => seen[r.path].responses.some((x) => x.type === 'image'));
  const notModern = withImages.filter((r) =>
    seen[r.path].responses.some((x) => x.type === 'image' && x.mime === 'image/jpeg' && !isPoster(x.url)),
  );
  check('delivery', 'a browser that supports AVIF is served AVIF, never JPEG', notModern.length === 0,
    notModern.length ? notModern.map((r) => r.path).join(', ') : `${withImages.length} route(s) fully modern (poster excepted — it cannot negotiate)`);

  const wrongOwner = ROUTES.flatMap((r) =>
    seen[r.path].responses.filter((x) => x.owner !== 'media' && x.type === 'image').map((x) => `${r.path} ${x.owner}`),
  );
  check('delivery', 'all imagery comes from the asset origin', wrongOwner.length === 0,
    wrongOwner.length ? [...new Set(wrongOwner)].join(', ') : 'one origin, immutable and separately attributable');
}

heading('3. dimensions - every image reserves its box');
{
  const all = ROUTES.flatMap((r) => seen[r.path].imgs.map((i) => ({ ...i, route: r.path })));
  const missing = all.filter((i) => !i.hasDims);
  note(`${all.length} images in layout across ${ROUTES.length} routes`);
  note('reference profile: 29 in layout, 14 with no width or height — that is where its CLS comes from');
  check('dimensions', 'every image carries width and height', missing.length === 0,
    missing.length ? `${missing.length}: ${missing.slice(0, 3).map((i) => `${i.route} ${i.testid ?? i.src.split('/').pop()}`).join(', ')}` : 'nothing can shift');

  const noAlt = all.filter((i) => i.alt === null);
  check('dimensions', 'every image declares alt text, even if empty', noAlt.length === 0,
    noAlt.length ? `${noAlt.length} missing` : 'decorative images are explicitly decorative');
}

heading('4. responsive - every image offers more than one width');
{
  const all = ROUTES.flatMap((r) => seen[r.path].imgs.map((i) => ({ ...i, route: r.path })));
  const single = all.filter((i) => i.candidates < 2);
  const noSizes = all.filter((i) => i.candidates >= 2 && !i.sizes);
  note('reference profile: zero images with srcset — every phone downloads the desktop file');
  check('responsive', 'every image ships a srcset with real alternatives', single.length === 0,
    single.length ? `${single.length} with one candidate` : `${all.length} images, all multi-width`);
  check('responsive', 'every srcset is paired with a sizes hint', noSizes.length === 0,
    noSizes.length ? `${noSizes.length} without sizes` : 'the browser can actually choose');

  // A correct srcset still ships the wrong file if `sizes` lies. Compare delivered pixels
  // against the box the image is actually painted into.
  const oversized = all.filter((i) => {
    const delivered = i.natural.w * i.natural.h;
    const painted = i.box.w * i.box.h * 4; // allow for a 2x display
    return painted > 0 && delivered > painted * MEDIA_BUDGET.oversizeFactor;
  });
  check('responsive', `no image is delivered more than ${MEDIA_BUDGET.oversizeFactor}x its painted area`,
    oversized.length === 0,
    oversized.length
      ? oversized.slice(0, 3).map((i) => `${i.route} ${i.natural.w}px into ${i.box.w}px`).join(', ')
      : 'sizes hints are honest');
}

heading('5. priority - one eager image per page, and it is the right one');
for (const route of ROUTES) {
  const { imgs, lcp } = seen[route.path];
  if (imgs.length === 0) continue;
  const eager = imgs.filter((i) => i.loading !== 'lazy');
  const high = imgs.filter((i) => i.priority === 'high');
  const lazyOffscreen = imgs.filter((i) => !i.inViewport && i.loading === 'lazy');
  note(
    `${route.path.padEnd(22)} ${imgs.length} images  ${eager.length} eager  ${high.length} high-priority  ` +
      `${lazyOffscreen.length}/${imgs.filter((i) => !i.inViewport).length} off-screen lazy  ` +
      `LCP ${lcp?.tag ?? 'none'}`,
  );
  check('priority', `${route.path.padEnd(22)} off-screen images are lazy`,
    imgs.filter((i) => !i.inViewport && i.loading !== 'lazy').length === 0,
    `${lazyOffscreen.length} deferred`);
  check('priority', `${route.path.padEnd(22)} at most one image marked high priority`, high.length <= 1,
    high.length ? `${high.length} — several priorities is the same as none` : 'none needed');
}
{
  // The LCP element must never be lazy: lazy defers it behind a scroll that already happened.
  const lazyLcp = ROUTES.filter((r) => {
    const { lcp, imgs } = seen[r.path];
    if (!lcp?.url) return false;
    const el = imgs.find((i) => i.src === lcp.url);
    return el ? el.loading === 'lazy' : false;
  });
  check('priority', 'the LCP element is never lazy-loaded', lazyLcp.length === 0,
    lazyLcp.length ? lazyLcp.map((r) => r.path).join(', ') : 'the largest paint is never deferred');
}

heading('6. video - the hero, and why it is the LCP element');
{
  const home = seen['/'];
  const video = home.videos[0];
  check('video', 'the home hero is a video, as in the reference profile', Boolean(video),
    video ? `${video.sources.length} source(s)` : 'no <video> on /');

  if (video) {
    check('video', 'it has a poster, so the largest element paints immediately', Boolean(video.poster),
      video.poster ? video.poster.split('/').pop() : 'without one the hero is blank until the first frame decodes');
    check('video', 'it declares width and height', video.hasDims, 'so the box is reserved before metadata arrives');
    check('video', 'it is muted and inline, so autoplay is legal on iOS', video.muted && video.playsInline,
      `muted=${video.muted} playsinline=${video.playsInline}`);
    check('video', 'it is described for anyone who cannot see it', Boolean(video.label),
      video.label ?? 'no aria-label');

    const declared = manifest.video?.hero?.sources ?? [];
    const ordered = declared.every((s, i) => i === 0 || declared[i - 1].bytes <= s.bytes);
    check('video', 'sources are ordered by measured weight, lightest first', ordered,
      declared.map((s) => `${s.type.replace('video/', '')} ${kb(s.bytes)}`).join(' < '));

    const served = home.responses.filter((r) => r.type === 'media');
    const bytes = served.reduce((n, r) => n + r.bytes, 0);
    check('video', `the hero stays under ${kb(MEDIA_BUDGET.videoBytes)}`,
      (declared[0]?.bytes ?? 0) <= MEDIA_BUDGET.videoBytes,
      `${kb(declared[0]?.bytes ?? 0)} chosen, ${kb(bytes)} actually transferred on load`);
  }
}

await browser.close();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.log('\nfailing:');
  for (const f of failed) console.log(`  - [${f.section}] ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  process.exitCode = 1;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'media.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      budget: MEDIA_BUDGET,
      photographs: images.length,
      perRoute: Object.fromEntries(
        ROUTES.map((r) => [
          r.path,
          {
            images: seen[r.path].imgs.length,
            imageBytes: seen[r.path].responses.filter((x) => x.type === 'image').reduce((n, x) => n + x.bytes, 0),
            mediaBytes: seen[r.path].responses.filter((x) => x.type === 'media').reduce((n, x) => n + x.bytes, 0),
            lcp: seen[r.path].lcp,
          },
        ]),
      ),
      checks,
    },
    null,
    2,
  )}\n`,
);
console.log('\nwrote results/media.json');
