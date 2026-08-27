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
 *
 * **Measured under a device profile, not on the machine running the bench.** Lighthouse mobile
 * by default: 4x CPU slowdown, Slow 4G, four cores, a 512 MB heap cap. Without CPU throttling
 * every stack reports a TBT of zero on a modern workstation; without NETWORK throttling a
 * difference in transfer size costs nothing at all, which is how two stacks whose heaviest page
 * differs by 31.6% both reported the same LCP to the millisecond. See lib/profile.mjs.
 *
 * **CPU was throttled 4x by default.** Without it every stack reports TBT of zero on a
 * developer machine, every long task disappears, and the comparison that matters most —
 * which stack blocks the main thread — produces identical numbers for all of them.
 * Lighthouse simulates a mid-range mobile for exactly this reason. `MF_PROFILE=desktop`
 * measures an unthrottled machine instead; the two are not comparable and are labelled as such.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { DOCUMENT_ROUTES, EDGE, VITALS_BUDGET, ZONE_WALK } from './lib/topology.mjs';
import { PROFILE, applyProfile, contextOptions, launchOptions, profileBanner } from './lib/profile.mjs';
import { signedInContext } from './lib/signin.mjs';
import { CHROME } from '../../contracts/src/testids.ts';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');
const RUNS = Number(process.env.MF_RUNS ?? 3);
/** Kept as the label the checks and report use; the value now comes from the profile. */
const CPU_THROTTLE = PROFILE.cpuThrottle;

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

  // Long tasks, for Total Blocking Time. web-vitals does not compute TBT — it is a lab-only
  // metric with no field equivalent — so it is collected here and summed below.
  window.__longTasks = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__longTasks.push({ start: e.startTime, duration: e.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
`;

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
function heading(text) {
  console.log(`\n--- ${text} ${'-'.repeat(Math.max(0, 72 - text.length))}`);
}
const note = (text) => console.log(`        ${text}`);
const fmt = (name, v) =>
  name === 'CLS' ? v.toFixed(4) : name === 'longTasks' ? String(v) : `${Math.round(v)} ms`;
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
  const ctx = signedIn
    ? await signedInContext(browser, contextOptions())
    : await browser.newContext(contextOptions());
  const page = await ctx.newPage();
  await page.addInitScript(`${WEB_VITALS_IIFE}\n${COLLECT}`);

  // CPU, network and core count, all through one session. Applied per page rather than per
  // browser: emulation attaches to a session, so a page opened later would measure an
  // unthrottled machine while reporting the profile's name.
  const cdp = await applyProfile(ctx, page);
  // Chrome's own performance counters: script evaluation, layout and style recalculation.
  await cdp.send('Performance.enable');
  return { ctx, page, cdp };
}

/** Total Blocking Time: the blocking portion of every long task after FCP. */
function totalBlockingTime(longTasks, fcp) {
  return longTasks
    .filter((t) => t.start + t.duration > fcp)
    .reduce((sum, t) => {
      // Only the part of the task that falls after FCP counts, and only the part beyond 50 ms
      // blocks — that is Lighthouse's definition, and deviating from it makes the number
      // incomparable to every tool anyone already uses.
      const blockingStart = Math.max(t.start, fcp);
      const effective = t.duration - (blockingStart - t.start);
      return sum + Math.max(0, effective - 50);
    }, 0);
}

/** Chrome's own counters, in milliseconds. */
async function chromeMetrics(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const get = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
  return {
    scriptMs: get('ScriptDuration') * 1000,
    layoutMs: get('LayoutDuration') * 1000,
    styleMs: get('RecalcStyleDuration') * 1000,
    /**
     * Total main-thread busy time — the closest single number to "browser CPU".
     *
     * Script, layout and style are the three largest CATEGORIES of that work, but they do not
     * sum to it: parsing, compositing, GC and event dispatch are all main-thread and in none of
     * them. Reporting only the categories understates the total by whatever is left over, which
     * is exactly the kind of quiet gap this repo exists to close.
     */
    taskMs: get('TaskDuration') * 1000,
    /** What the document is holding in the browser, not the server. */
    jsHeapMb: get('JSHeapUsedSize') / (1024 * 1024),
    /**
     * EVERY node — elements, text and comments.
     *
     * Not a conformance metric, and the first report generated from it explained why: Svelte
     * emits anchor comments around every block, so `/cart` read 456 nodes against React's 259
     * and looked like a 76% DOM divergence. The element counts were 137 and 136.
     *
     * Kept because it is a real cost — the browser walks these — but `domElements` is the
     * figure that says whether two stacks rendered the same document.
     */
    domNodes: get('Nodes'),
  };
}

/**
 * One document route.
 *
 * The interaction is deliberate: INP is undefined without one, and a suite that reports "INP
 * 0" for a page nobody clicked is reporting that it did not measure INP.
 */
async function measureDocument(browser, route) {
  const { ctx, page, cdp } = await newPage(browser);
  await page.goto(EDGE + route.path, { waitUntil: 'networkidle' });

  // A real interaction, because INP is undefined without one and a suite reporting "INP 0"
  // for a page nobody touched is reporting that it did not measure INP. The search field is
  // on every page via chrome and focusing it is something visitors actually do.
  const search = page.locator(`[data-testid="${CHROME.search}"]`).first();
  if (await search.count()) {
    await search.click();
    await search.type('breaker', { delay: 30 });
  } else {
    await page.locator('#main').first().click({ position: { x: 10, y: 10 } });
  }
  await page.keyboard.press('Tab');
  await page.waitForTimeout(600);

  const raw = await page.evaluate(() => window.__vitals);
  const longTasks = await page.evaluate(() => window.__longTasks ?? []);
  const chrome = await chromeMetrics(cdp);
  /**
   * BODY elements only — the figure that says whether two stacks rendered the same document.
   *
   * Two refinements, each from a false alarm this metric raised on itself:
   *
   * Not CDP's `Nodes`, which counts text and comment nodes. Svelte emits anchor comments around
   * every block, so that reads 76% higher on a page whose element structure is identical.
   *
   * Not the whole document either. Counting `<head>` put stylesheet and preload links into a
   * structural metric, and the entire remaining difference between the two stacks — one element
   * on two routes — turned out to be a single `<link>`, which is chunking rather than
   * structure. `headLinks` is reported separately, because it is a real cost and a real
   * difference; it just is not this one.
   */
  const { elementCount, headLinks } = await page.evaluate(() => ({
    elementCount: document.body.querySelectorAll('*').length,
    headLinks: document.head.querySelectorAll('link').length,
  }));
  await ctx.close();

  const navs = finalise(raw);
  const metrics = navs[0]?.metrics ?? {};
  const fcp = metrics.FCP?.value ?? 0;
  return {
    ...metrics,
    TBT: { value: totalBlockingTime(longTasks, fcp) },
    longTasks: { value: longTasks.length },
    longestTask: { value: Math.max(0, ...longTasks.map((t) => t.duration)) },
    scriptMs: { value: chrome.scriptMs },
    layoutMs: { value: chrome.layoutMs },
    styleMs: { value: chrome.styleMs },
    taskMs: { value: chrome.taskMs },
    jsHeapMb: { value: chrome.jsHeapMb },
    domNodes: { value: chrome.domNodes },
    domElements: { value: elementCount },
    headLinks: { value: headLinks },
  };
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
const browser = await chromium.launch(launchOptions());

heading('1. document navigations - the indexed half of the site');
console.log(`        ${profileBanner()}`);
console.log('        route                    LCP        CLS       INP       TBT     script      FCP');
const documentResults = {};
for (const route of DOCUMENT_ROUTES) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) runs.push(await measureDocument(browser, route));
  const merged = {};
  for (const name of ['LCP', 'CLS', 'INP', 'TBT', 'FCP', 'TTFB', 'taskMs', 'scriptMs', 'layoutMs', 'styleMs', 'jsHeapMb', 'domNodes', 'domElements', 'headLinks', 'longTasks', 'longestTask']) {
    const values = runs.map((r) => r[name]?.value).filter((v) => typeof v === 'number');
    if (values.length) merged[name] = { value: median(values), samples: values.length };
  }
  documentResults[route.path] = merged;
  console.log(
    `        ${route.path.padEnd(22)} ` +
      ['LCP', 'CLS', 'INP', 'TBT', 'scriptMs', 'FCP']
        .map((n) => (merged[n] ? fmt(n, merged[n].value) : '-').padStart(9))
        .join(' '),
  );
}
console.log('');
for (const metric of ['LCP', 'CLS', 'INP', 'TTFB']) {
  const limit = VITALS_BUDGET.document[metric];
  /** A waiver raises the bar for one route and names why, in the output, every run. */
  const limitFor = (route) => VITALS_BUDGET.waivers?.[route.path]?.[metric]?.limit ?? limit;
  const over = DOCUMENT_ROUTES.filter(
    (r) => (documentResults[r.path][metric]?.value ?? 0) > limitFor(r),
  );
  const waived = DOCUMENT_ROUTES.filter((r) => {
    const value = documentResults[r.path][metric]?.value ?? 0;
    return value > limit && value <= limitFor(r);
  });
  const worst = Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path][metric]?.value ?? 0));
  check(
    'document',
    `${metric} within the good threshold (${fmt(metric, limit)}) on every indexed route`,
    over.length === 0,
    over.length
      ? over.map((r) => `${r.path} ${fmt(metric, documentResults[r.path][metric].value)}`).join(', ')
      : `worst ${fmt(metric, worst)}`,
  );
  // Said out loud whether or not anything failed: a waived route is over the threshold, and a
  // reader who only sees a green line has been told the wrong thing.
  for (const r of waived) {
    const w = VITALS_BUDGET.waivers[r.path][metric];
    note(`${r.path} ${metric} ${fmt(metric, documentResults[r.path][metric].value)} is OVER ${fmt(metric, limit)}, waived to ${fmt(metric, w.limit)}`);
    note(`  reason: ${w.reason}`);
  }
}
{
  /**
   * Browser CPU, budgeted rather than merely printed.
   *
   * `taskMs` is TOTAL main-thread busy time for the navigation. TBT only counts the blocking
   * portion of long tasks after first paint, so a stack can hold TBT at zero — as both of
   * these do — while still asking the main thread to do materially different amounts of work.
   * That difference is invisible in every Core Web Vital and is exactly what a framework
   * comparison is about.
   *
   * Script, layout and style are its largest categories and do not sum to it: parsing,
   * compositing, GC and event dispatch are main-thread work in none of them.
   */
  for (const [metric, limit] of Object.entries(VITALS_BUDGET.cpu)) {
    const over = DOCUMENT_ROUTES.filter((r) => (documentResults[r.path][metric]?.value ?? 0) > limit);
    const worst = Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path][metric]?.value ?? 0));
    check(
      'cpu',
      `${metric} under ${limit} on every route at ${CPU_THROTTLE}x throttling`,
      over.length === 0,
      over.length
        ? over.map((r) => `${r.path} ${documentResults[r.path][metric].value.toFixed(1)}`).join(', ')
        : `worst ${worst.toFixed(1)}`,
    );
  }
  const busiest = DOCUMENT_ROUTES
    .map((r) => [r.path, documentResults[r.path].taskMs?.value ?? 0])
    .sort((a, b) => b[1] - a[1])[0];
  note(`busiest main thread: ${busiest[0]} at ${busiest[1].toFixed(1)} ms of task time`);
}

{
  /**
   * TBT is the lab proxy Google uses for INP, and the only metric here that reflects how much
   * JavaScript a stack makes the main thread chew through. It is the number most likely to
   * differ between bundlers and frameworks, which is why it is budgeted rather than merely
   * printed.
   */
  const limit = VITALS_BUDGET.document.TBT;
  const over = DOCUMENT_ROUTES.filter((r) => (documentResults[r.path].TBT?.value ?? 0) > limit);
  check('document', `TBT stays under ${limit} ms at ${CPU_THROTTLE}x CPU throttling`, over.length === 0,
    over.length
      ? over.map((r) => `${r.path} ${Math.round(documentResults[r.path].TBT.value)} ms`).join(', ')
      : `worst ${Math.round(Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path].TBT?.value ?? 0)))} ms`);

  /**
   * A long task and a TBT of zero look contradictory and are not.
   *
   * TBT only counts blocking time AFTER first contentful paint, because before it the visitor
   * is looking at nothing and has nothing to interact with. On these pages the one long task
   * is the bundle evaluating, and it finishes before the first paint — so it blocks nothing a
   * visitor could have done. Lighthouse draws the line in the same place; saying so here
   * saves the next person concluding the measurement is broken.
   */
  const longest = Math.round(Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path].longestTask?.value ?? 0)));
  const worstScript = Math.round(Math.max(0, ...DOCUMENT_ROUTES.map((r) => documentResults[r.path].scriptMs?.value ?? 0)));
  note(`longest single task: ${longest} ms — TBT is ${
    longest > 50 ? 'still zero because it completes BEFORE first paint, which TBT excludes' : 'zero because nothing exceeded 50 ms'
  }`);
  note(`script evaluation, worst route: ${worstScript} ms of main-thread work`);
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
      profile: PROFILE.id,
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
