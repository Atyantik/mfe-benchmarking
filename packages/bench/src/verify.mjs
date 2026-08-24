/**
 * Acceptance check.
 *
 * The architecture under test:
 *
 *   SSR  — anything for SEO / answer engines / Core Web Vitals. Identical for every
 *          visitor, therefore shared-cacheable.
 *   CSR  — anything personalized. Never in the HTML, recreated on the client from a
 *          cookie, mounted into a server-rendered placeholder that reserves its box.
 *
 * So the assertions are not "does it work" but "is the split actually held":
 *   - no per-user data in the HTML (two different carts must produce identical bytes)
 *   - the personalized region has a placeholder, and swapping it in costs zero CLS
 *   - page content is never hydrated, yet remains interactive
 */
import { chromium } from 'playwright';

import { EDGE as BASE } from './lib/topology.mjs';

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch();

console.log('\n— SSR: everything that needs to be indexed —');
for (const [path, needle] of [
  ['/', 'Reference Store'],
  ['/faq', 'Support centre'],
  ['/faq/contact', 'Talk to an engineer'],
  ['/product', 'add-p-0001'],
  ['/cart', 'cart-page-placeholder'],
  ['/product/p-0001', 'Technical specification'],
]) {
  const html = await (await fetch(BASE + path)).text();
  record(`server HTML of ${path} contains indexable content`, html.includes(needle));
}

console.log('\n— the HTML carries no personalization, so a CDN can share it —');
{
  // Two visitors with very different carts must receive byte-identical documents.
  const emptyCart = await (await fetch(`${BASE}/product`)).text();
  const fullCart = await (
    await fetch(`${BASE}/product`, {
      headers: {
        cookie:
          'mf_cart=' +
          encodeURIComponent(JSON.stringify({ items: [{ id: 'p-0001', name: 'x', price: 999 }] })),
      },
    })
  ).text();
  record('response is byte-identical regardless of the visitor\'s cart', emptyCart === fullCart,
    `${emptyCart.length} vs ${fullCart.length} bytes`);
  record('no cart count appears in the server HTML', !/data-testid="cart-count"/.test(emptyCart));
  record('a reserved placeholder is rendered instead',
    /data-testid="mini-cart-placeholder"/.test(emptyCart));
}

console.log('\n— pages that need no personalization ship no JS at all —');
for (const path of ['/faq', '/faq/contact']) {
  const html = await (await fetch(BASE + path)).text();
  // The cart lives in the header on every page, so every page currently has one
  // personalized region. What must never appear is page-content JS.
  record(`${path} references no route-content script`,
    !/faq-index\.[a-f0-9]+\.js|faq-contact\.[a-f0-9]+\.js/.test(html),
    'page content is server-rendered and never hydrated');
}

console.log('\n— mounting personalized UI costs zero layout shift —');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${BASE}/product`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="cart-count"]', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => window.__cls);
  record('cumulative layout shift is zero', cls === 0, `CLS = ${cls}`);
  record('live cart replaced the placeholder',
    (await page.locator('[data-testid="cart-count"]').count()) === 1);
  await ctx.close();
}

console.log('\n— client-owned cart, recreated from a cookie —');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(`${BASE}/product`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="cart-count"]');
  record('cart starts empty', (await page.textContent('[data-testid="cart-count"]')) === '0');

  // The 200-row table is inert server HTML; a delegated listener makes it work.
  await page.click('[data-testid="add-p-0001"]');
  await page.click('[data-testid="add-p-0002"]');
  await page.waitForFunction(
    () => document.querySelector('[data-testid="cart-count"]')?.textContent === '2',
    null, { timeout: 5000 },
  ).catch(() => {});
  record('adding from never-hydrated markup updates the cart',
    (await page.textContent('[data-testid="cart-count"]')) === '2');

  const cookies = await ctx.cookies();
  record('state persisted to a cookie', cookies.some((c) => c.name === 'mf_cart'));

  // Full document load — the SPA never has to survive this.
  await page.click('[data-testid="link-p-0001"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="cart-count"]');
  record('cart survives a full document load, recreated from the cookie',
    (await page.textContent('[data-testid="cart-count"]')) === '2',
    `badge=${await page.textContent('[data-testid="cart-count"]')}`);

  await page.click('[data-testid="add-to-cart"]');
  await page.waitForFunction(
    () => document.querySelector('[data-testid="cart-count"]')?.textContent === '3',
    null, { timeout: 5000 },
  ).catch(() => {});
  record('detail page adds to the same cart',
    (await page.textContent('[data-testid="cart-count"]')) === '3');
  record('cart drawer renders the three items',
    (await page.locator('[data-testid="cart-row"]').count()) === 3);

  record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  await ctx.close();
}

console.log('\n— navigation is a real document load, by design —');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle' });
  await page.click('a[href="/product"]');
  await page.waitForLoadState('networkidle');
  record('link click performs a document navigation',
    await page.evaluate(() => performance.getEntriesByType('navigation')[0].type === 'navigate'));
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('failing:');
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
  process.exitCode = 1;
}
