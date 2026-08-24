/**
 * Warm-navigation cost.
 *
 * Every other measurement here uses a cold context per route — a first-time visitor.
 * That is the right worst case, but it is NOT what a session looks like: the cart bundle
 * and the MF runtime are the same URL on every page, so after the first navigation they
 * come from cache and the only new bytes are the document and the route's own CSS.
 *
 * Reporting only the cold number overstates the per-page cost of everything shared.
 */
import { chromium } from 'playwright';

import { EDGE as BASE } from './lib/topology.mjs';
const JOURNEY = ['/', '/faq', '/product', '/product/p-0001', '/faq/contact'];

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

console.log('\none session, five pages, cache allowed to do its job\n');
console.log('  page                 over the wire   from cache   new requests');

for (const route of JOURNEY) {
  let wire = 0;
  let cached = 0;
  let fresh = 0;
  page.removeAllListeners('response');
  page.on('response', async (res) => {
    if (res.request().resourceType() === 'document') return;
    try {
      const body = await res.body();
      // A response served from the HTTP cache reports fromServiceWorker=false and has
      // no timing; the reliable signal here is status 304 or a zero-length transfer.
      const sizes = await res.request().sizes();
      if (sizes.responseBodySize === 0 && body.length > 0) {
        cached += body.length;
      } else {
        wire += sizes.responseBodySize || body.length;
        fresh += 1;
      }
    } catch { /* ignore */ }
  });
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  console.log(
    `  ${route.padEnd(20)} ${String(wire).padStart(9)} B  ${String(cached).padStart(10)} B  ${String(fresh).padStart(8)}`,
  );
}

await browser.close();
