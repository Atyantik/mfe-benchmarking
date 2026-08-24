/**
 * Core Web Vitals — the north star, measured rather than asserted.
 *
 * Two things make this different from the byte and waste suites:
 *
 * 1. **It uses `web-vitals` itself**, the library RUM uses, injected into the page. Vitals
 *    are full of details that are easy to get subtly wrong by hand — which layout shifts
 *    count, how INP picks its interaction, what LCP does after a click. Reimplementing that
 *    produces numbers that look right and disagree with the field. Here the lab and the
 *    field run the same code.
 *
 * 2. **It measures both navigation models.** A document route reports one set of vitals per
 *    navigation. A zone route reports one per SOFT navigation — `reportSoftNavs: true`, the
 *    v6 feature that exists because Chrome 151 shipped the Soft Navigations API
 *    (docs/constraints.md §14). They are different measurements and are never averaged:
 *    the storefront's numbers carry ranking weight, the account area's do not, and mixing
 *    them would hide a slow zone inside a fast site.
 *
 * `reportAllChanges: true` because this is a lab: CLS and INP would otherwise only report
 * when the page is hidden, and the last report is the final value either way.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { DOCUMENT_ROUTES, EDGE, VITALS_BUDGET, ZONE_WALK } from './lib/topology.mjs';
import { signedInContext } from './lib/signin.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');
const RUNS = Number(process.env.MF_RUNS ?? 3);

/**
 * The real library, inlined so the page needs no network to be measured.
 *
 * Resolved through the module entry rather than `package.json`, which the package's
 * `exports` map deliberately does not expose.
 */
const WEB_VITALS_IIFE = readFileSync(
  join(dirname(require.resolve('web-vitals')), 'web-vitals.attribution.iife.js'),
  'utf8',
);

/**
 * The library and the collector are ONE init script on purpose.
 *
 * Playwright wraps each init script in a function, so the bundle's top-level
 * `var webVitals = ...` becomes function-scoped and never reaches `window`. Registered as
 * two scripts, the collector throws on the first line that touches `webVitals` and every
 * metric silently comes back empty — which reads exactly like a fast page.
 */
const COLLECT = `
  window.__vitals = [];
  const opts = { reportAllChanges: true, reportSoftNavs: true };
  const push = (m) => {
    window.__vitals.push({
      name: m.name,
      value: m.value,
      rating: m.rating,
      navigationType: m.navigationType,
      navigationId: m.navigationId,
      // Attribution is what turns "CLS is 0.12" into a filename and a selector.
      target: m.attribution?.largestShiftTarget ?? m.attribution?.interactionTarget ??
              m.attribution?.element ?? null,
    });
  };
  webVitals.onLCP(push, opts);
  webVitals.onCLS(push, opts);
  webVitals.onINP(push, opts);
  webVitals.onFCP(push, opts);
  webVitals.onTTFB(push, opts);
`;

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
function heading(text) {
  console.log(`\n--- ${text} ${'-'.repeat(Math.max(0, 72 - text.length))}`);
}
const fmt = (name, v) => (name === 'CLS' ? v.toFixed(4) : `${Math.round(v)} ms`);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Last report per (navigationId, metric) is the final value for that navigation. */
function finalise(raw) {
  const byNav = new Map();
  for (const m of raw) {
    const key = m.navigationId ?? 0;
    if (!byNav.has(key)) byNav.set(key, { navigationId: key, type: m.navigationType, metrics: {} });
    byNav.get(key).metrics[m.name] = { value: m.value, rating: m.rating, target: m.target };
  }
  return [...byNav.values()].sort((a, b) => a.navigationId - b.navigationId);
}

async function newPage(browser, { signedIn = false } = {}) {
  // The account area is gated. Measuring it means arriving with a session, or measuring the
  // login page by accident and calling it a dashboard.
  const ctx = signedIn ? await signedInContext(browser) : await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(`${WEB_VITALS_IIFE}\n${COLLECT}`);
  return { ctx, page };
}

/**
 * One document route.
 *
 * The interaction is deliberate: INP is undefined without one, and a suite that reports "INP
 * 0" for a page nobody clicked is reporting that it did not measure INP.
 */
async function measureDocument(browser, route) {
  const { ctx, page } = await newPage(browser);
  await page.goto(EDGE + route.path, { waitUntil: 'networkidle' });

  // A real interaction, because INP is undefined without one and a suite reporting "INP 0"
  // for a page nobody touched is reporting that it did not measure INP. The search field is
  // on every page via chrome and focusing it is something visitors actually do.
  const search = page.locator('[data-testid="site-search"]').first();
  if (await search.count()) {
    await search.click();
    await search.type('breaker', { delay: 30 });
  } else {
    await page.locator('#main').first().click({ position: { x: 10, y: 10 } });
  }
  await page.keyboard.press('Tab');
  await page.waitForTimeout(600);

  const raw = await page.evaluate(() => window.__vitals);
  await ctx.close();
  const navs = finalise(raw);
  return navs[0]?.metrics ?? {};
}

/** One walk through the zone, returning one set of vitals per soft navigation. */
async function measureZone(browser) {
  const { ctx, page } = await newPage(browser, { signedIn: true });
  await page.goto(EDGE + ZONE_WALK.start, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid^="page-account"]', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(300);

  const visited = [];
  for (const step of ZONE_WALK.steps) {
    const before = page.url();
    await page.locator(`[data-testid="${step.click}"]`).first().click();
    await page
      .waitForFunction((u) => location.href !== u, before, { timeout: 6_000 })
      .catch(() => {});
    await page.waitForSelector(`[data-testid="${step.expect}"]`, { timeout: 6_000 }).catch(() => {});
    await page.waitForTimeout(400);
    visited.push(step.path);
  }
  await page.waitForTimeout(400);

  const raw = await page.evaluate(() => window.__vitals);
  const softNavCount = await page.evaluate(
    () => performance.getEntriesByType('soft-navigation').length,
  );
  await ctx.close();
  return { navs: finalise(raw), visited, softNavCount };
}

// ---------------------------------------------------------------------------

console.log(`\ncore web vitals - measured with web-vitals, ${RUNS} runs, median reported\n`);
const browser = await chromium.launch();

heading('1. document navigations - the indexed half of the site');
console.log('        route                    LCP        CLS       INP       FCP      TTFB');
const documentResults = {};
for (const route of DOCUMENT_ROUTES) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) runs.push(await measureDocument(browser, route));
  const merged = {};
  for (const name of ['LCP', 'CLS', 'INP', 'FCP', 'TTFB']) {
    const values = runs.map((r) => r[name]?.value).filter((v) => typeof v === 'number');
    if (values.length) merged[name] = { value: median(values), samples: values.length };
  }
  documentResults[route.path] = merged;
  console.log(
    `        ${route.path.padEnd(22)} ` +
      ['LCP', 'CLS', 'INP', 'FCP', 'TTFB']
        .map((n) => (merged[n] ? fmt(n, merged[n].value) : '-').padStart(9))
        .join(' '),
  );
}
console.log('');
for (const metric of ['LCP', 'CLS', 'INP', 'TTFB']) {
  const limit = VITALS_BUDGET.document[metric];
  const over = DOCUMENT_ROUTES.filter((r) => (documentResults[r.path][metric]?.value ?? 0) > limit);
  const worst = Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path][metric]?.value ?? 0));
  check(
    'document',
    `${metric} within the good threshold (${fmt(metric, limit)}) on every indexed route`,
    over.length === 0,
    over.length
      ? over.map((r) => `${r.path} ${fmt(metric, documentResults[r.path][metric].value)}`).join(', ')
      : `worst ${fmt(metric, worst)}`,
  );
}
{
  const missing = DOCUMENT_ROUTES.filter((r) => documentResults[r.path].INP === undefined);
  check(
    'document',
    'INP was actually measured, not merely absent',
    missing.length === 0,
    missing.length
      ? `no interaction recorded on ${missing.map((r) => r.path).join(', ')}`
      : 'every route had a rated interaction',
  );
}

heading('2. soft navigations - the client-routed half');
const zoneRuns = [];
for (let i = 0; i < RUNS; i += 1) zoneRuns.push(await measureZone(browser));
const first = zoneRuns[0];

console.log(`        ${ZONE_WALK.steps.length} steps, soft-navigation entries seen: ` +
  zoneRuns.map((r) => r.softNavCount).join(', '));
console.log('        navigation                          type              LCP       CLS       INP');
const softRows = [];
for (const [i, nav] of first.navs.entries()) {
  const label = i === 0 ? ZONE_WALK.start : (first.visited[i - 1] ?? `nav ${i}`);
  // Median the same ordinal navigation across runs, so one slow run cannot set the number.
  const at = (run, name) => run.navs[i]?.metrics[name]?.value;
  const row = { index: i, label, type: nav.type, metrics: {} };
  for (const name of ['LCP', 'CLS', 'INP']) {
    const values = zoneRuns.map((r) => at(r, name)).filter((v) => typeof v === 'number');
    if (values.length) row.metrics[name] = { value: median(values), samples: values.length };
  }
  softRows.push(row);
  console.log(
    `        ${label.padEnd(35)} ${String(nav.type).padEnd(16)} ` +
      ['LCP', 'CLS', 'INP'].map((n) => (row.metrics[n] ? fmt(n, row.metrics[n].value) : '-').padStart(9)).join(' '),
  );
}
console.log('');
{
  const expected = ZONE_WALK.steps.length;
  const seen = Math.min(...zoneRuns.map((r) => r.softNavCount));
  check(
    'soft',
    'every zone route change is recorded as a soft navigation',
    seen >= expected,
    `${seen}/${expected} — a step that paints nothing is invisible to Core Web Vitals`,
  );
  const softOnly = softRows.filter((r) => r.type === 'soft-navigation');
  check(
    'soft',
    'web-vitals attributes metrics to each soft navigation separately',
    softOnly.length >= expected,
    `${softOnly.length} navigation(s) reported independently`,
  );
  for (const metric of ['LCP', 'CLS', 'INP']) {
    const limit = VITALS_BUDGET.soft[metric];
    const over = softOnly.filter((r) => (r.metrics[metric]?.value ?? 0) > limit);
    const worst = Math.max(0, ...softOnly.map((r) => r.metrics[metric]?.value ?? 0));
    check(
      'soft',
      `${metric} within ${fmt(metric, limit)} on every soft navigation`,
      over.length === 0,
      over.length
        ? over.map((r) => `${r.label} ${fmt(metric, r.metrics[metric].value)}`).join(', ')
        : `worst ${fmt(metric, worst)}`,
    );
  }
}

heading('3. the two models are reported separately, never averaged');
{
  const docLcp = Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path].LCP?.value ?? 0));
  const softLcp = Math.max(0, ...softRows.filter((r) => r.type === 'soft-navigation').map((r) => r.metrics.LCP?.value ?? 0));
  console.log(`        worst document LCP ${fmt('LCP', docLcp)}   worst soft-navigation LCP ${fmt('LCP', softLcp)}`);
  console.log('        Reported apart on purpose: the storefront is indexed and these numbers');
  console.log('        carry ranking weight; the account area is not, and its numbers are a user');
  console.log('        budget. One blended average would let a slow zone hide inside a fast site.');
  check(
    'reporting',
    'zone vitals are held to their own budget, not the document one',
    VITALS_BUDGET.soft.LCP !== VITALS_BUDGET.document.LCP,
    `document LCP ${fmt('LCP', VITALS_BUDGET.document.LCP)} vs soft ${fmt('LCP', VITALS_BUDGET.soft.LCP)}`,
  );
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
  join(OUT, 'vitals.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      runs: RUNS,
      library: 'web-vitals@6 (attribution build, reportSoftNavs)',
      budget: VITALS_BUDGET,
      documents: documentResults,
      soft: softRows,
      softNavEntriesPerRun: zoneRuns.map((r) => r.softNavCount),
      checks,
    },
    null,
    2,
  )}\n`,
);
console.log('\nwrote results/vitals.json');
