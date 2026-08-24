/**
 * The test-id contract, checked against the running site.
 *
 * The question this answers: when a `vite-solid` stack exists beside `rspack-react`, will
 * the acceptance suites run against it unchanged? They will if every stack emits the same
 * ids, and that is only true if something checks.
 *
 * It is also the check that would have saved an afternoon. `Card` silently dropped every
 * prop it received, so three federated widgets rendered perfectly while every test reported
 * them missing. Nothing failed at the point of the mistake; the id simply never reached the
 * DOM. This fails there, and names the id.
 *
 * Run it against any stack: `MF_BASE=http://localhost:4100 pnpm --filter @mf-eval/bench contract`
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { ROUTE_CONTRACT, ALL_TESTIDS } from '../../contracts/src/testids.ts';
import { EDGE } from './lib/topology.mjs';
import { cookieHeader, signedInContext } from './lib/signin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (t) => console.log(`        ${t}`);
const heading = (t) => console.log(`\n--- ${t} ${'-'.repeat(Math.max(0, 72 - t.length))}`);

console.log(`\ntest-id contract - the same suites must run against any stack\n`);
note(`${ALL_TESTIDS.length} fixed ids named, ${ROUTE_CONTRACT.length} routes under contract`);
note(`target: ${EDGE}`);

const browser = await chromium.launch();
const SESSION = await cookieHeader();
const results = {};

heading('1. server-rendered ids - present before any script runs');
for (const route of ROUTE_CONTRACT) {
  const html = await (
    await fetch(EDGE + route.path, { headers: route.authenticated ? { cookie: SESSION } : {} })
  ).text();
  const missing = route.server.filter((id) => !html.includes(`data-testid="${id}"`));
  results[route.path] = { missingServer: missing, missingClient: [] };
  check(
    'server',
    `${route.path.padEnd(24)} emits its ${route.server.length} server id(s)`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : route.server.join(' '),
  );
}

heading('2. client-rendered ids - present once the page has done its work');
for (const route of ROUTE_CONTRACT) {
  if (!route.clientOnly?.length) continue;
  const ctx = route.authenticated ? await signedInContext(browser) : await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(EDGE + route.path, { waitUntil: 'networkidle' });
  const missing = [];
  for (const id of route.clientOnly) {
    const found = await page
      .waitForSelector(`[data-testid="${id}"]`, { timeout: 6_000, state: 'attached' })
      .then(() => true, () => false);
    if (!found) missing.push(id);
  }
  await ctx.close();
  results[route.path].missingClient = missing;
  check(
    'client',
    `${route.path.padEnd(24)} mounts its ${route.clientOnly.length} client id(s)`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : route.clientOnly.join(' '),
  );
}

heading('3. uniqueness - an id identifies one thing');
{
  const duplicates = [];
  for (const route of ROUTE_CONTRACT) {
    /**
     * Anonymous routes are visited anonymously.
     *
     * Re-using one signed-in page for every route quietly measured the wrong document:
     * `/login` redirects to the account area when a session exists, so the "duplicate ids on
     * /login" it reported were the account page's.
     */
    const ctx = route.authenticated ? await signedInContext(browser) : await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(EDGE + route.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const dupes = await page.evaluate(() => {
      const counts = new Map();
      for (const el of document.querySelectorAll('[data-testid]')) {
        const id = el.getAttribute('data-testid');
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return [...counts.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
    });
    if (dupes.length) duplicates.push(`${route.path}: ${dupes.join(', ')}`);
    await ctx.close();
  }
  check(
    'uniqueness',
    'no id appears twice on a page',
    duplicates.length === 0,
    duplicates.length
      ? duplicates.slice(0, 3).join(' | ')
      : 'every id resolves to exactly one element, so a selector cannot be ambiguous',
  );
}

await browser.close();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.log('\nfailing:');
  for (const f of failed) console.log(`  - [${f.section}] ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  console.log('\nA missing id is not a missing feature. Check the element renders, then check');
  console.log('the component it renders through actually forwards the prop.');
  process.exitCode = 1;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'contract.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), target: EDGE, routes: results, checks }, null, 2)}\n`,
);
console.log('\nwrote results/contract.json');
