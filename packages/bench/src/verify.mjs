/**
 * Phase 1 acceptance check — spec/reference-app.md § Interaction script.
 *
 * This is the gate, not a demo. Order matters; do not reorder. A failed assertion
 * outranks any good number (see the mf-bench skill).
 */
import { chromium } from 'playwright';

const BASE = process.env.MF_BASE ?? 'http://localhost:3100';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
const hydrationWarnings = [];
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') consoleErrors.push(t);
  if (/hydrat|did not match|did not expect|mismatch/i.test(t)) hydrationWarnings.push(t);
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const badge = () => page.textContent('[data-testid="cart-count"]');
const settle = (p) => page.goto(BASE + p, { waitUntil: 'networkidle' });

console.log('\n— SSR content (raw HTML, before any JS runs) —');
for (const [path, needle] of [
  ['/', 'Reference Store'],
  ['/faq', 'Frequently Asked Questions'],
  ['/product', 'add-p-0001'],
  ['/product/p-0001', 'cart-drawer'],
]) {
  const html = await (await fetch(BASE + path)).text();
  // The assertion that proves we avoided the Bridge trap: real content in the document,
  // not a loading placeholder.
  record(`server HTML of ${path} contains real content`, html.includes(needle), needle);
}

console.log('\n— cold loads + hydration —');
for (const path of ['/', '/faq', '/product']) {
  const res = await settle(path);
  record(`cold load ${path}`, res?.status() === 200, `status ${res?.status()}`);
}

const marks = await page.evaluate(() =>
  performance.getEntriesByType('mark').map((m) => m.name),
);
record(
  'shell hydration marks emitted',
  marks.includes('mf:shell:hydrate:start') && marks.includes('mf:shell:hydrate:end'),
);
record(
  'remote load marks emitted for all three remotes',
  ['faq', 'product', 'cart'].every((n) => marks.includes(`mf:remote:${n}:load:end`)),
  marks.filter((m) => m.includes(':remote:')).length + ' remote marks',
);

console.log('\n— cross-remote state: product page drives cart in shell header —');
await page.click('[data-testid="add-p-0001"]');
await page.click('[data-testid="add-p-0002"]');
await page
  .waitForFunction(() => document.querySelector('[data-testid="cart-count"]')?.textContent === '2', null, { timeout: 5000 })
  .catch(() => {});
record('two adds update the header badge', (await badge()) === '2', `badge=${await badge()}`);

console.log('\n— client-side navigation —');
const navIdBefore = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.startTime ?? -1);
await page.click('[data-testid="link-p-0001"]');
await page.waitForSelector('[data-testid="add-to-cart"]', { timeout: 10000 });
const navIdAfter = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.startTime ?? -1);
record('navigating to detail was a soft navigation (no document reload)', navIdBefore === navIdAfter);

await page.click('[data-testid="add-to-cart"]');
await page
  .waitForFunction(() => document.querySelector('[data-testid="cart-count"]')?.textContent === '3', null, { timeout: 5000 })
  .catch(() => {});
record('third add reflected in header badge', (await badge()) === '3', `badge=${await badge()}`);

const drawerRows = await page.locator('[data-testid="cart-row"]').count();
record('cart drawer (cart remote) inside product page shows 3 rows', drawerRows === 3, `rows=${drawerRows}`);

await page.click('a[href="/faq"]');
await page.waitForSelector('section[data-faq-id]', { timeout: 10000 });
record('soft navigation to /faq renders remote content', true);

console.log('\n— SSR correctness of cross-remote state (the hard one) —');
const cookies = await ctx.cookies();
const cartCookie = cookies.find((c) => c.name === 'mf_cart');
record('cart persisted to cookie for the next server render', Boolean(cartCookie));

const reloaded = await fetch(`${BASE}/product/p-0001`, {
  headers: cartCookie ? { cookie: `mf_cart=${cartCookie.value}` } : {},
});
const reloadedHtml = await reloaded.text();
const ssrBadge = /data-testid="cart-count"[^>]*>(\d+)</.exec(reloadedHtml)?.[1];
// This is the gate: the count must be right in the HTML itself, not only after hydration.
record('badge is correct in SERVER-RENDERED HTML on reload', ssrBadge === '3', `ssr badge=${ssrBadge}`);

console.log('\n— cleanliness —');
record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
record('no hydration mismatch warnings', hydrationWarnings.length === 0, hydrationWarnings.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('failed:');
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
  process.exitCode = 1;
}
