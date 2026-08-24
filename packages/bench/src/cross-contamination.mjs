/**
 * Cross-contamination check: does a page fetch ANYTHING from a remote it does not render?
 *
 * This looks at the NETWORK, not at coverage. Coverage only sees what executed, so an
 * asset that is preloaded and never runs is invisible to it — which is exactly the kind
 * of waste we care about. Every request is counted, whatever its fate.
 *
 * The question in plain terms: on /product, is anything from the faq team downloaded?
 * On /faq, is anything from the product team downloaded?
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { EDGE, ROUTES, isUnknownOwner, ownerOf } from './lib/topology.mjs';
import { signedInContext } from './lib/signin.mjs';

const VARIANTS = [{ id: 'site', base: EDGE }];

/**
 * Who is allowed to appear on each route, read from the topology rather than restated here.
 *
 * This list used to live in this file, alongside its own port map. Both went stale the day
 * the site grew a second host and a chrome remote, and neither failed: an undeclared origin
 * fell through to 'other' and was simply not compared against anything.
 */
const ALLOWED = Object.fromEntries(ROUTES.map((r) => [r.path, r.owners]));

const results = [];
const leakage = {};
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `\n            ${detail}` : ''}`);
};
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const browser = await chromium.launch();

for (const variant of VARIANTS) {
  console.log(`\n${'─'.repeat(76)}\n${variant.id.toUpperCase()}  ${variant.base}\n${'─'.repeat(76)}`);

  for (const [route, allowed] of Object.entries(ALLOWED)) {
    // The account routes are gated; arriving anonymously would measure the login page.
    const ctx = route.startsWith('/my-account')
      ? await signedInContext(browser)
      : await browser.newContext();
    const page = await ctx.newPage();

    // Every request, regardless of whether it ends up executing.
    const requests = [];
    page.on('request', (r) => {
      const owner = ownerOf(r.url());
      requests.push({ url: r.url(), owner, type: r.resourceType() });
    });
    /**
     * Bytes, not just names.
     *
     * A pass/fail says "clean today". A number says how clean, and turns a slow drift into
     * something visible before it becomes a violation — which matters most when a second
     * stack is being compared against this one and the question is not "did it leak" but
     * "which leaks less".
     */
    const weighed = new Map();
    page.on('response', async (r) => {
      try {
        weighed.set(r.url(), gzipSync(await r.body(), { level: 9 }).length);
      } catch {
        /* redirects and preflights have no body */
      }
    });

    await page.goto(variant.base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await ctx.close();
    for (const r of requests) r.bytes = weighed.get(r.url) ?? 0;

    // The document itself is served by the shell; registry calls are server-side only.
    const assets = requests.filter(
      (r) => r.type !== 'document' && r.owner !== 'registry' && r.owner !== 'edge',
    );
    // An origin the topology does not name counts as an intruder, not as 'other'. That is
    // the difference between a check that notices a new host and one that ignores it.
    const intruders = assets.filter((r) => isUnknownOwner(r.owner) || !allowed.includes(r.owner));

    const byOwner = {};
    for (const a of assets) byOwner[a.owner] = (byOwner[a.owner] ?? 0) + 1;

    const bytesByOwner = {};
    for (const a of assets) bytesByOwner[a.owner] = (bytesByOwner[a.owner] ?? 0) + (a.bytes ?? 0);
    const leakedBytes = intruders.reduce((n, i) => n + (i.bytes ?? 0), 0);
    const totalBytes = assets.reduce((n, a) => n + (a.bytes ?? 0), 0);

    leakage[route] = {
      requests: assets.length,
      totalBytesGzip: totalBytes,
      leakedRequests: intruders.length,
      leakedBytesGzip: leakedBytes,
      byOwner: bytesByOwner,
    };

    const summary = Object.entries(byOwner)
      .map(([o, n]) => `${o}:${n} (${kb(bytesByOwner[o] ?? 0)})`)
      .join('  ');

    record(
      `${variant.id} ${route.padEnd(16)} loads nothing from a non-participating remote`,
      intruders.length === 0,
      intruders.length
        ? `${intruders.length} intruding request(s), ${kb(leakedBytes)} — ${[...new Set(intruders.map((i) => i.owner))].join(', ')}\n            ` +
          intruders.slice(0, 4).map((i) => `${i.owner}: ${i.url.split('/').slice(-1)[0]} ${kb(i.bytes ?? 0)}`).join('\n            ')
        : `${summary}`,
    );
  }
}

/**
 * Leakage as a NUMBER, not only as a verdict.
 *
 * The pass/fail above answers "did anything leak today". This answers "how much, and from
 * whom" — which is the form the question takes once there is a second stack to compare
 * against, and the form that makes a slow drift visible before it becomes a violation.
 * Recorded to `results/leakage.json` so two runs can be diffed.
 */
console.log(`\n${'─'.repeat(76)}\nleakage, measured\n${'─'.repeat(76)}`);
console.log('  route              requests   total gzip   leaked   from');
for (const [route, l] of Object.entries(leakage)) {
  const owners = Object.entries(l.byOwner)
    .sort((a, b) => b[1] - a[1])
    .map(([o, b]) => `${o} ${kb(b)}`)
    .join('  ');
  console.log(
    `  ${route.padEnd(18)} ${String(l.requests).padStart(8)} ${kb(l.totalBytesGzip).padStart(12)} ` +
      `${kb(l.leakedBytesGzip).padStart(8)}   ${owners}`,
  );
}
{
  const total = Object.values(leakage).reduce((n, l) => n + l.leakedBytesGzip, 0);
  record(
    'total foreign code across every route is zero bytes',
    total === 0,
    total === 0
      ? `${Object.keys(leakage).length} routes, ${kb(Object.values(leakage).reduce((n, l) => n + l.totalBytesGzip, 0))} of legitimate assets, none of it foreign`
      : `${kb(total)} of code reached pages that do not use it`,
  );
}

// The specific pairing the question is about, stated as its own assertion.
console.log(`\n${'─'.repeat(76)}\nthe direct question\n${'─'.repeat(76)}`);
for (const variant of VARIANTS) {
  for (const [route, forbidden] of [
    ['/faq', 'product'],
    ['/faq/contact', 'product'],
    ['/product', 'faq'],
    ['/product/p-0001', 'faq'],
  ]) {
    // The account routes are gated; arriving anonymously would measure the login page.
    const ctx = route.startsWith('/my-account')
      ? await signedInContext(browser)
      : await browser.newContext();
    const page = await ctx.newPage();
    const hits = [];
    page.on('request', (r) => {
      if (ownerOf(r.url()) === forbidden) hits.push(r.url());
    });
    await page.goto(variant.base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await ctx.close();
    record(
      `${variant.id} ${route.padEnd(16)} fetches NOTHING from "${forbidden}"`,
      hits.length === 0,
      hits.length ? hits.map((h) => '  ' + h.replace(/^https?:\/\//, '')).join('\n            ') : 'zero requests',
    );
  }
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('\nfailing:');
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exitCode = 1;
}

mkdirSync(join(ROOT, 'results'), { recursive: true });
writeFileSync(
  join(ROOT, 'results', 'leakage.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), perRoute: leakage }, null, 2)}\n`,
);
console.log('\nwrote results/leakage.json');
