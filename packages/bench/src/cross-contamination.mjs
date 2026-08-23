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

const VARIANTS = [
  { id: 'spa', base: 'http://localhost:3100' },
  { id: 'mpa', base: 'http://localhost:3200' },
];

const PORT_OWNER = { 3100: 'shell', 3200: 'shell', 3101: 'faq', 3102: 'product', 3103: 'cart', 4000: 'registry' };

/**
 * Who is allowed to appear on each route.
 *
 * `cart` is on every page by design — the shell's header mounts its MiniCart, so it is a
 * participant everywhere, not contamination.
 */
const ALLOWED = {
  '/': ['shell', 'cart'],
  '/faq': ['shell', 'cart', 'faq'],
  '/faq/contact': ['shell', 'cart', 'faq'],
  '/product': ['shell', 'cart', 'product'],
  '/product/p-0001': ['shell', 'cart', 'product'],
};

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `\n            ${detail}` : ''}`);
};

const browser = await chromium.launch();

for (const variant of VARIANTS) {
  console.log(`\n${'─'.repeat(76)}\n${variant.id.toUpperCase()}  ${variant.base}\n${'─'.repeat(76)}`);

  for (const [route, allowed] of Object.entries(ALLOWED)) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Every request, regardless of whether it ends up executing.
    const requests = [];
    page.on('request', (r) => {
      const owner = PORT_OWNER[new URL(r.url()).port] ?? 'other';
      requests.push({ url: r.url(), owner, type: r.resourceType() });
    });

    await page.goto(variant.base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await ctx.close();

    // The document itself is served by the shell; registry calls are server-side only.
    const assets = requests.filter((r) => r.type !== 'document' && r.owner !== 'registry');
    const intruders = assets.filter((r) => !allowed.includes(r.owner));

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
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const hits = [];
    page.on('request', (r) => {
      if ((PORT_OWNER[new URL(r.url()).port] ?? '') === forbidden) hits.push(r.url());
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
