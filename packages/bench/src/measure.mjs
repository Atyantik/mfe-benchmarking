/**
 * Measurement harness — packages/bench, contract defined in the mf-bench skill.
 *
 * Loads each route in a cold browser context and records what the browser ACTUALLY
 * fetched, attributed by owner. Byte counts are gzip-of-body, not raw transfer: the
 * local static servers do not compress, and raw bytes would flatter nobody consistently.
 * gzip -9 of the response body is what a CDN would put on the wire.
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');

export const VARIANTS = [
  { id: 'spa', label: 'SPA (react-router, one client tree)', base: 'http://localhost:3100' },
  { id: 'mpa', label: 'MPA (no client router, islands)', base: 'http://localhost:3200' },
];

export const ROUTES = ['/', '/faq', '/faq/contact', '/product', '/product/p-0001'];

const REMOTE_PORTS = { 3100: 'host', 3200: 'host', 3101: 'faq', 3102: 'product', 3103: 'cart' };

/** Attribute a response to a cost centre. "The bundle is big" is not an actionable finding. */
function classify(url, body) {
  if (/\.css(\?|$)/.test(url)) return 'css';
  const text = body.toString('utf8');
  // Content sniffing rather than filename guessing — chunk ids are not stable.
  if (text.includes('react-stack-bottom-frame') || text.includes('__reactContainer')) return 'framework';
  if (text.includes('createBrowserRouter') || text.includes('unstable_HistoryRouter') || text.includes('RouterProvider')) return 'framework';
  if (/remoteEntry\.js/.test(url)) return 'mf-runtime';
  if (text.includes('__webpack_require__.federation') || text.includes('initializeSharing')) return 'mf-runtime';
  return 'app';
}

function ownerOf(url) {
  const port = new URL(url).port;
  return REMOTE_PORTS[port] ?? 'other';
}

async function measureRoute(browser, variant, route) {
  // Fresh context per route: a cold visitor, no warm cache carrying costs between pages.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const responses = [];
  page.on('response', async (res) => {
    const req = res.request();
    try {
      const body = await res.body();
      responses.push({
        url: res.url(),
        type: req.resourceType(),
        status: res.status(),
        raw: body.length,
        gzip: gzipSync(body, { level: 9 }).length,
        bucket: req.resourceType() === 'document' ? 'html' : classify(res.url(), body),
        owner: ownerOf(res.url()),
        start: req.timing()?.startTime ?? 0,
      });
    } catch { /* redirects and aborted requests have no body */ }
  });

  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    window.__long = 0;
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__long += Math.max(0, e.duration - 50);
      }).observe({ type: 'longtask', buffered: true });
    } catch { /* not supported */ }
  });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  await page.goto(variant.base + route, { waitUntil: 'networkidle' });

  const timings = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const marks = Object.fromEntries(
      performance.getEntriesByType('mark').map((m) => [m.name, Number(m.startTime.toFixed(1))]),
    );
    return {
      ttfb: Number((nav?.responseStart ?? 0).toFixed(1)),
      domContentLoaded: Number((nav?.domContentLoadedEventEnd ?? 0).toFixed(1)),
      fcp: Number((fcp?.startTime ?? 0).toFixed(1)),
      lcp: Number((window.__lcp ?? 0).toFixed(1)),
      blockingMs: Number((window.__long ?? 0).toFixed(1)),
      marks,
    };
  });

  const hydrationMs =
    timings.marks['mf:shell:hydrate:end'] && timings.marks['mf:shell:hydrate:start']
      ? Number((timings.marks['mf:shell:hydrate:end'] - timings.marks['mf:shell:hydrate:start']).toFixed(1))
      : null;

  const byBucket = {};
  const byOwner = {};
  for (const r of responses) {
    byBucket[r.bucket] = (byBucket[r.bucket] ?? 0) + r.gzip;
    byOwner[r.owner] = (byOwner[r.owner] ?? 0) + r.gzip;
  }

  const scripts = responses.filter((r) => r.type === 'script');
  await ctx.close();

  return {
    route,
    totalGzip: responses.reduce((s, r) => s + r.gzip, 0),
    jsGzip: scripts.reduce((s, r) => s + r.gzip, 0),
    cssGzip: responses.filter((r) => r.bucket === 'css').reduce((s, r) => s + r.gzip, 0),
    htmlGzip: responses.filter((r) => r.bucket === 'html').reduce((s, r) => s + r.gzip, 0),
    requests: responses.length,
    scriptRequests: scripts.length,
    byBucket,
    byOwner,
    timings: { ...timings, hydrationMs },
    pageErrors: consoleErrors,
  };
}

export async function run() {
  const browser = await chromium.launch();
  const CONFIG = process.env.MF_CONFIG ?? 'baseline';
  const results = { generatedAt: new Date().toISOString(), specVersion: 1, config: CONFIG, variants: {} };

  for (const variant of VARIANTS) {
    const routes = [];
    for (const route of ROUTES) {
      process.stdout.write(`  ${variant.id.padEnd(4)} ${route.padEnd(18)}`);
      const r = await measureRoute(browser, variant, route);
      console.log(
        `${String(r.totalGzip).padStart(8)} B gz  js=${String(r.jsGzip).padStart(7)}  req=${String(r.requests).padStart(3)}`,
      );
      routes.push(r);
    }
  results.variants[variant.id] = { label: variant.label, routes };
  }

  await browser.close();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `spa-vs-mpa.${CONFIG}.json`), `${JSON.stringify(results, null, 2)}\n`);
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\nmeasuring (cold context per route, gzip -9 of body)\n');
  await run();
  console.log(`\nwrote results/spa-vs-mpa.${process.env.MF_CONFIG ?? 'baseline'}.json`);
}
