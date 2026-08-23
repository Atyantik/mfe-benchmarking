/**
 * Waste audit — "is this page loading anything that does not belong to it?"
 *
 * Byte totals cannot answer that. Chrome's precise coverage can: it reports which byte
 * ranges of every script and stylesheet actually EXECUTED. A file that downloads and
 * never runs is pure waste, no matter how well it compresses.
 *
 * Verdicts:
 *   dead      0% executed — downloaded for nothing. This is the number that matters.
 *   thin      under 25% executed — mostly carried, barely used.
 *   used      25%+ executed.
 *
 * "Foreign" marks an asset served by a remote that contributes nothing visible to the
 * page being audited — e.g. the product remote on /faq.
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');

const VARIANTS = [{ id: 'site', base: 'http://localhost:3100' }];
const ROUTES = ['/', '/faq', '/faq/contact', '/product', '/product/p-0001'];
const PORT_OWNER = { 3100: 'shell', 3101: 'faq', 3102: 'product', 3103: 'cart' };

/** Which remotes legitimately contribute to each route. Anything else is foreign. */
const EXPECTED_OWNERS = {
  '/': new Set(['shell', 'cart']),
  '/faq': new Set(['shell', 'cart', 'faq']),
  '/faq/contact': new Set(['shell', 'cart', 'faq']),
  '/product': new Set(['shell', 'cart', 'product']),
  '/product/p-0001': new Set(['shell', 'cart', 'product']),
};

const ownerOf = (url) => PORT_OWNER[new URL(url).port] ?? 'other';
const shortName = (url) => url.split('/').slice(-1)[0].slice(0, 44);

/** CSS coverage: flat used ranges. */
function usedCssBytes(ranges) {
  return (ranges ?? []).reduce((sum, r) => sum + (r.end - r.start), 0);
}

function mergeRanges(list) {
  if (list.length === 0) return [];
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0].slice()];
  for (const [s, e] of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/**
 * JS coverage, computed with V8's actual semantics.
 *
 * V8 ranges are NESTED, and a child range with count 0 carves a hole out of its parent.
 * Summing only the count>0 ranges therefore reports ~100% for every file that merely
 * got evaluated — the outermost function range spans the whole script. The real figure
 * is: union(count > 0) MINUS union(count === 0).
 *
 * This distinction is the whole point of the audit. Without it a 60 kB library that ran
 * three functions looks fully used.
 */
function usedJsBytes(entry) {
  const hit = [];
  const miss = [];
  for (const fn of entry.functions ?? []) {
    for (const r of fn.ranges ?? []) {
      (r.count > 0 ? hit : miss).push([r.startOffset, r.endOffset]);
    }
  }
  const covered = mergeRanges(hit);
  const holes = mergeRanges(miss);
  let total = 0;
  for (const [cs, ce] of covered) {
    let cursor = cs;
    for (const [hs, he] of holes) {
      if (he <= cursor || hs >= ce) continue;
      if (hs > cursor) total += Math.min(hs, ce) - cursor;
      cursor = Math.max(cursor, Math.min(he, ce));
    }
    if (cursor < ce) total += ce - cursor;
  }
  return total;
}

async function auditRoute(browser, variant, route) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const transferred = new Map();
  page.on('response', async (res) => {
    try {
      const body = await res.body();
      transferred.set(res.url(), { raw: body.length, gzip: gzipSync(body, { level: 9 }).length });
    } catch { /* no body */ }
  });

  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  await page.coverage.startCSSCoverage({ resetOnNavigation: false });
  await page.goto(variant.base + route, { waitUntil: 'networkidle' });
  // Give idle-scheduled work a chance to run before judging anything dead.
  await page.waitForTimeout(400);
  const js = await page.coverage.stopJSCoverage();
  const css = await page.coverage.stopCSSCoverage();
  await ctx.close();

  const expected = EXPECTED_OWNERS[route] ?? new Set();
  const assets = [];

  const tagged = [...js.map((e) => ({ e, kind: 'js' })), ...css.map((e) => ({ e, kind: 'css' }))];
  for (const { e: entry, kind } of tagged) {
    // Inline <script> blocks report the document's URL; they are shell glue, not assets.
    if (!entry.url || entry.url.startsWith('data:')) continue;
    if (kind === 'js' && !/\.js(\?|$)/.test(entry.url)) continue;
    const total = (kind === 'js' ? entry.source?.length : entry.text?.length) ?? 0;
    if (total === 0) continue;
    const used = kind === 'js' ? usedJsBytes(entry) : usedCssBytes(entry.ranges);
    const pct = total ? (used / total) * 100 : 0;
    const owner = ownerOf(entry.url);
    const t = transferred.get(entry.url);
    assets.push({
      url: entry.url,
      name: shortName(entry.url),
      owner,
      kind,
      totalBytes: total,
      usedBytes: used,
      usedPct: Number(pct.toFixed(1)),
      gzip: t?.gzip ?? null,
      foreign: !expected.has(owner),
      verdict: pct === 0 ? 'dead' : pct < 25 ? 'thin' : 'used',
    });
  }

  assets.sort((a, b) => (b.gzip ?? 0) - (a.gzip ?? 0));

  const sum = (pred) => assets.filter(pred).reduce((s, a) => s + (a.gzip ?? 0), 0);
  return {
    route,
    assets,
    totals: {
      allGzip: sum(() => true),
      deadGzip: sum((a) => a.verdict === 'dead'),
      thinGzip: sum((a) => a.verdict === 'thin'),
      foreignGzip: sum((a) => a.foreign),
    },
  };
}

const browser = await chromium.launch();
const report = { generatedAt: new Date().toISOString(), config: process.env.MF_CONFIG ?? 'baseline', variants: {} };

for (const variant of VARIANTS) {
  console.log(`\n${'='.repeat(78)}\n${variant.id.toUpperCase()}  ${variant.base}\n${'='.repeat(78)}`);
  const routes = [];
  for (const route of ROUTES) {
    const r = await auditRoute(browser, variant, route);
    routes.push(r);
    const t = r.totals;
    console.log(`\n${route}`);
    if (r.assets.length === 0) {
      console.log('   (no scripts or stylesheets executed — nothing to audit)');
    }
    for (const a of r.assets) {
      const flag = a.foreign ? ' FOREIGN' : '';
      console.log(
        `   ${a.verdict.padEnd(5)} ${String(a.usedPct).padStart(5)}% used  ` +
        `${String(a.gzip ?? 0).padStart(7)} gz  ${a.owner.padEnd(8)} ${a.name}${flag}`,
      );
    }
    console.log(
      `   -> total ${t.allGzip.toLocaleString()} gz | dead ${t.deadGzip.toLocaleString()} | ` +
      `thin ${t.thinGzip.toLocaleString()} | foreign ${t.foreignGzip.toLocaleString()}`,
    );
  }
  report.variants[variant.id] = routes;
}

await browser.close();
mkdirSync(OUT, { recursive: true });
const file = join(OUT, `waste-audit.${report.config}.json`);
writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nwrote ${file.replace(ROOT + '/', '')}`);
