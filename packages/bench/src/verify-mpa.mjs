/**
 * MPA acceptance check.
 *
 * Same reference app, same remotes, same spec — but the correctness claims differ from
 * the SPA's, so they get their own assertions rather than a fudged shared suite:
 *
 *   - a static route must ship ZERO javascript (not "a little", zero)
 *   - navigation is a full document load, and that is the intended behaviour
 *   - cart state must survive a full document load, which the SPA never has to do
 *   - interactivity still works, via island hydration rather than a document-wide tree
 */
import { chromium } from 'playwright';

const BASE = process.env.MF_MPA_BASE ?? 'http://localhost:3200';

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
const hydrationWarnings = [];
const scriptRequests = [];
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') consoleErrors.push(t);
  if (/hydrat|did not match|did not expect|mismatch/i.test(t)) hydrationWarnings.push(t);
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('request', (r) => {
  if (r.resourceType() === 'script') scriptRequests.push(r.url());
});

const badge = () => page.textContent('[data-testid="cart-count"]');

console.log('\n— SSR content —');
for (const [path, needle] of [
  ['/', 'Reference Store'],
  ['/faq', 'Frequently Asked Questions'],
  ['/faq/contact', 'Contact the FAQ team'],
  ['/product', 'add-p-0001'],
  ['/product/p-0001', 'cart-drawer'],
]) {
  const html = await (await fetch(BASE + path)).text();
  record(`server HTML of ${path} contains real content`, html.includes(needle));
}

console.log('\n— the zero-JS claim, measured not assumed —');
for (const path of ['/', '/faq', '/faq/contact']) {
  scriptRequests.length = 0;
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const html = await (await fetch(BASE + path)).text();
  const islands = (await fetch(BASE + path)).headers ? null : null;
  record(
    `${path} ships zero script requests`,
    scriptRequests.length === 0,
    scriptRequests.length ? scriptRequests.join(', ') : '0 scripts',
  );
  // Preload counts too: <link rel=preload as=script> forces a download even when nothing
  // will execute it, so a page that "has no script tag" can still cost script bytes.
  record(`${path} emits no script preloads`, !/as="script"/.test(html));
}

console.log('\n— pages are still styled without any JS —');
{
  const styled = await page.evaluate(() => {
    const el = document.querySelector('footer');
    return el ? getComputedStyle(el).borderTopStyle : 'none';
  });
  record('CSS applied on a zero-JS page', styled === 'solid', `footer border-top: ${styled}`);
}

console.log('\n— interactivity via islands —');
await page.goto(`${BASE}/product`, { waitUntil: 'networkidle' });
await page.click('[data-testid="add-p-0001"]');
await page.click('[data-testid="add-p-0002"]');
await page
  .waitForFunction(() => document.querySelector('[data-testid="cart-count"]')?.textContent === '2', null, { timeout: 5000 })
  .catch(() => {});
record('add-to-cart works on an interactive route', (await badge()) === '2', `badge=${await badge()}`);
record(
  'the header cart island reacts to a click in the page island',
  (await badge()) === '2',
  'two separate React roots sharing one store',
);

console.log('\n— navigation is a full document load, by design —');
const navBefore = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
await page.click('[data-testid="link-p-0001"]');
await page.waitForLoadState('networkidle');
const isNewDocument = await page.evaluate(
  () => performance.getEntriesByType('navigation')[0].type === 'navigate',
);
record('clicking a link performs a real navigation', isNewDocument);

console.log('\n— cart survives a full document load —');
record('badge preserved across navigation', (await badge()) === '2', `badge=${await badge()}`);
await page.click('[data-testid="add-to-cart"]');
await page
  .waitForFunction(() => document.querySelector('[data-testid="cart-count"]')?.textContent === '3', null, { timeout: 5000 })
  .catch(() => {});
record('add on detail page updates header', (await badge()) === '3', `badge=${await badge()}`);

const cookies = await ctx.cookies();
const cartCookie = cookies.find((c) => c.name === 'mf_cart');
const reloaded = await fetch(`${BASE}/product/p-0001`, {
  headers: cartCookie ? { cookie: `mf_cart=${cartCookie.value}` } : {},
});
const ssrBadge = /data-testid="cart-count"[^>]*>(\d+)</.exec(await reloaded.text())?.[1];
record('badge correct in SERVER-RENDERED HTML', ssrBadge === '3', `ssr badge=${ssrBadge}`);

console.log('\n— cleanliness —');
record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
record('no hydration mismatch warnings', hydrationWarnings.length === 0, hydrationWarnings.slice(0, 2).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('failed:');
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
  process.exitCode = 1;
}
