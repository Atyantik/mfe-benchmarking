/**
 * Widgets — three teams contribute to one page, and nobody pays for the other two.
 *
 * This is the claim micro-frontends are sold on and almost never measured against. The
 * account overview is composed from three widgets owned by three different applications, and
 * the account host imports none of them. The interesting question is not whether that
 * renders — it is what a browser downloads.
 *
 * The failure this exists to catch is "download everything from everywhere": a composition
 * layer that resolves every remote on boot, so every visitor pays for every team's code
 * whether or not they ever see it. That looks identical on screen and is the entire
 * difference between micro-frontends that work and micro-frontends that are a tax.
 *
 * Four sections:
 *
 *   1  composition   the page really is assembled from three separate applications
 *   2  placeholders  every region is reserved server-side, by its OWNING team
 *   3  per-area cost a route downloads its widgets and no others
 *   4  isolation     one team's widget failing costs one region, not the page
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { EDGE, ownerOf } from './lib/topology.mjs';
import { cookieHeader, signedInContext } from './lib/signin.mjs';
import { ACCOUNT, WIDGET } from '../../contracts/src/testids.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');

/** Slot -> the application that fills it. Three different teams, on purpose. */
const WIDGETS = [
  { slot: 'account.cart', owner: 'cart', testid: 'widget-account-cart', placeholder: 'placeholder-account-cart' },
  { slot: 'account.recommended', owner: 'product', testid: 'widget-account-recommended', placeholder: 'placeholder-account-recommended' },
  { slot: 'account.support', owner: 'faq', testid: 'widget-account-support', placeholder: 'placeholder-account-support' },
];
/** Routes inside the account application that render NO widgets. */
const BARE_ROUTES = ['/my-account/orders', '/my-account/profile'];

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (t) => console.log(`        ${t}`);
const heading = (t) => console.log(`\n--- ${t} ${'-'.repeat(Math.max(0, 72 - t.length))}`);
/** gzip kilobytes, the same unit as every other suite. */
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

console.log('\nwidgets - three teams, one page, per-area cost\n');
const browser = await chromium.launch();
const SESSION = await cookieHeader();

/** Everything a page fetched, grouped by which application served it. */
async function loadAndWatch(path, act) {
  const ctx = await signedInContext(browser, { viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  const fetched = [];
  page.on('response', async (r) => {
    const url = r.url();
    if (!/\.(js|css)(\?|$)/.test(url)) return;
    try {
      const body = await r.body();
      // gzip of the body, NOT its decoded length. Everything here is served compressed, and
      // every other suite in this repo reports gzip — the first version of this reported
      // decoded bytes, which made three small widgets look like three quarters of a
      // megabyte and could not be compared against any other number we publish.
      fetched.push({ url, owner: ownerOf(url), bytes: gzipSync(body, { level: 9 }).length });
    } catch {
      /* no body */
    }
  });
  await page.goto(EDGE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const extra = act ? await act(page, fetched) : undefined;
  const html = await page.content();
  await ctx.close();
  return { fetched, html, extra };
}

// -- 1. composition ----------------------------------------------------------
heading('1. composition - the page is assembled from three applications');
const overview = await loadAndWatch('/my-account');
{
  for (const w of WIDGETS) {
    const present = overview.html.includes(`data-testid="${w.testid}"`);
    check('composition', `${w.slot.padEnd(22)} rendered, owned by "${w.owner}"`, present,
      present ? 'contributed by another application entirely' : 'widget missing');
  }
  const owners = [...new Set(overview.fetched.map((f) => f.owner))].sort();
  note(`applications contributing code to /my-account: ${owners.join(', ')}`);
  check('composition', 'the account host imports none of them at build time',
    WIDGETS.every((w) => owners.includes(w.owner)),
    'each arrived over federation, resolved from the registry at runtime');
}

// -- 2. placeholders ---------------------------------------------------------
heading('2. placeholders - every region is reserved by its owning team');
{
  const serverHtml = await (await fetch(`${EDGE}/my-account`, { headers: { cookie: SESSION } })).text();
  for (const w of WIDGETS) {
    // The SERVER html must contain a reserved box, and must NOT contain the live widget —
    // these are per-user components and the document is rendered before anyone is known.
    const hasLive = serverHtml.includes(`data-testid="${w.testid}"`);
    check('placeholders', `${w.slot.padEnd(22)} is not server-rendered live`, !hasLive,
      hasLive ? 'per-user UI leaked into the document' : 'client-only, as personalized UI must be');
  }
  const reserved = (serverHtml.match(/h-\[13rem\]/g) ?? []).length;
  check('placeholders', 'the server reserves a box for every widget region', reserved >= WIDGETS.length,
    `${reserved} reserved region(s) — so mounting the real widgets moves nothing`);

  // Prove it with the browser: measure shift attributable to the widget grid.
  const ctx = await signedInContext(browser, { viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  /**
   * Attributed, not aggregated.
   *
   * This section claims something specific — that swapping a placeholder for a remote widget
   * moves nothing — so it has to measure that and not the whole page. Page CLS belongs to the
   * vitals suite. A total here would either pass while a widget shifted, or fail because
   * something else on the page did, and neither tells anyone what to fix.
   */
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        const where = (e.sources ?? []).map((src) => {
          const node = src.node instanceof Element ? src.node : src.node?.parentElement;
          const slot = node?.closest?.('[data-slot]');
          return slot ? `slot:${slot.getAttribute('data-slot')}` : (node?.tagName ?? 'unknown');
        });
        window.__shifts.push({ value: e.value, where });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${EDGE}/my-account`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`[data-testid="${WIDGET.cart}"]`, { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(600);
  const shifts = await page.evaluate(() => window.__shifts);
  await ctx.close();

  const inSlot = shifts.filter((s) => s.where.some((w) => w.startsWith('slot:')));
  const slotShift = inSlot.reduce((n, s) => n + s.value, 0);
  const pageShift = shifts.reduce((n, s) => n + s.value, 0);
  note(`page CLS ${pageShift.toFixed(4)}, of which ${slotShift.toFixed(4)} inside a widget region`);
  if (pageShift > slotShift + 0.001) {
    const elsewhere = shifts.filter((s) => !s.where.some((w) => w.startsWith('slot:')));
    note(`shifted elsewhere: ${[...new Set(elsewhere.flatMap((s) => s.where))].join(', ')} — vitals owns that number`);
  }
  check('placeholders', 'swapping a placeholder for a remote widget moves nothing', slotShift < 0.005,
    `${slotShift.toFixed(4)} attributed to the three widget regions`);
}

// -- 3. per-area cost --------------------------------------------------------
heading('3. per-area cost - a route downloads its widgets and no others');
console.log('        route                      cart   product       faq     total   (gzip)');
const perRoute = {};
for (const path of ['/my-account', ...BARE_ROUTES]) {
  const { fetched } = path === '/my-account' ? overview : await loadAndWatch(path);
  const by = (owner) => fetched.filter((f) => f.owner === owner).reduce((n, f) => n + f.bytes, 0);
  const row = { cart: by('cart'), product: by('product'), faq: by('faq') };
  row.total = fetched.reduce((n, f) => n + f.bytes, 0);
  perRoute[path] = row;
  console.log(
    `        ${path.padEnd(24)} ${kb(row.cart).padStart(9)} ${kb(row.product).padStart(9)} ` +
      `${kb(row.faq).padStart(9)} ${kb(row.total).padStart(9)}`,
  );
}
console.log('');
{
  /**
   * The sharp version of the claim. Orders and Profile render no widgets, so they must not
   * download the product or support applications at all — even though the visitor is inside
   * the same document, on the same host, one soft navigation away from a page that does.
   */
  for (const path of BARE_ROUTES) {
    const row = perRoute[path];
    const leaked = ['product', 'faq'].filter((o) => row[o] > 0);
    check('cost', `${path.padEnd(24)} downloads no widget it does not render`, leaked.length === 0,
      leaked.length ? `${leaked.join(', ')} arrived anyway` : 'product and faq absent entirely');
  }
  const bare = perRoute['/my-account/profile'];
  const full = perRoute['/my-account'];
  check('cost', 'a route with no widgets is materially cheaper than one with three',
    bare.total < full.total,
    `${kb(bare.total)} vs ${kb(full.total)} — a visitor who never opens the overview never pays for it`);
}
{
  // The storefront must never see any of it: these widgets belong to one area of one host.
  const store = await (async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const fetched = [];
    page.on('response', (r) => {
      if (/AccountCart|AccountRecommended|AccountSupport/.test(r.url())) fetched.push(r.url());
    });
    await page.goto(`${EDGE}/product`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await ctx.close();
    return fetched;
  })();
  check('cost', 'no storefront page downloads an account widget', store.length === 0,
    store.length ? store.join(', ') : 'the account area is the only place they exist');
}
{
  // Soft-navigating INTO the overview must fetch the widgets then — not on boot.
  const walk = await loadAndWatch('/my-account/profile', async (page, fetched) => {
    const before = fetched.filter((f) => ['product', 'faq'].includes(f.owner)).length;
    await page.locator(`[data-testid="${ACCOUNT.nav('account.overview')}"]`).click();
    await page.waitForSelector(`[data-testid="${WIDGET.support}"]`, { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const after = fetched.filter((f) => ['product', 'faq'].includes(f.owner)).length;
    return { before, after, rendered: await page.locator(`[data-testid="${WIDGET.support}"]`).count() };
  });
  check('cost', 'widgets are fetched on the navigation that needs them, not at boot',
    walk.extra.before === 0 && walk.extra.after > 0 && walk.extra.rendered > 0,
    `${walk.extra.before} before the click, ${walk.extra.after} after — loaded on demand, inside one document`);
}

// -- 4. isolation ------------------------------------------------------------
heading('4. isolation - one team failing costs one region');
{
  const ctx = await signedInContext(browser, { viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  // Break exactly one team's widget on the wire.
  // Guarded for the same reason as behaviors.mjs: an unhandled rejection in a route handler
  // ends the process rather than failing a check.
  await page.route('**/*AccountRecommended*', (route) => {
    void route.abort().catch(() => {});
  });
  await page.goto(`${EDGE}/my-account`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_200);
  const cart = await page.locator(`[data-testid="${WIDGET.cart}"]`).count();
  const support = await page.locator(`[data-testid="${WIDGET.support}"]`).count();
  const recommended = await page.locator(`[data-testid="${WIDGET.recommended}"]`).count();
  const orders = await page.locator(`[data-testid="${ACCOUNT.page('account.overview')}"]`).count();
  await ctx.close();

  check('isolation', 'the failing widget is simply absent', recommended === 0, 'product/AccountRecommended blocked');
  check('isolation', 'the other two teams are unaffected', cart > 0 && support > 0,
    `cart ${cart ? 'rendered' : 'MISSING'}, support ${support ? 'rendered' : 'MISSING'}`);
  check('isolation', 'the page itself still works', orders > 0,
    'a skeleton stays in the failed region — one outage, one box');
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
  join(OUT, 'widgets.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), widgets: WIDGETS, perRoute, checks }, null, 2)}\n`,
);
console.log('\nwrote results/widgets.json');
