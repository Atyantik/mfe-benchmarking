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
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `\n            ${detail}` : ''}`);
};

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

    await page.goto(variant.base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await ctx.close();

    // The document itself is served by the shell; registry calls are server-side only.
    const assets = requests.filter(
      (r) => r.type !== 'document' && r.owner !== 'registry' && r.owner !== 'edge',
    );
    // An origin the topology does not name counts as an intruder, not as 'other'. That is
    // the difference between a check that notices a new host and one that ignores it.
    const intruders = assets.filter((r) => isUnknownOwner(r.owner) || !allowed.includes(r.owner));

    const byOwner = {};
    for (const a of assets) byOwner[a.owner] = (byOwner[a.owner] ?? 0) + 1;

    const summary = Object.entries(byOwner)
      .map(([o, n]) => `${o}:${n}`)
      .join('  ');

    record(
      `${variant.id} ${route.padEnd(16)} loads nothing from a non-participating remote`,
      intruders.length === 0,
      intruders.length
        ? `${intruders.length} intruding request(s) — ${[...new Set(intruders.map((i) => i.owner))].join(', ')}\n            ` +
          intruders.slice(0, 4).map((i) => `${i.owner}: ${i.url.split('/').slice(-1)[0]}`).join('\n            ')
        : `requests by owner — ${summary}`,
    );
  }
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
