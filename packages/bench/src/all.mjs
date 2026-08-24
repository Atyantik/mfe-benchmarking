/**
 * The whole bench, one command, one verdict.
 *
 * Six suites used to be six commands whose output nobody read to the end, and whose exit
 * codes nobody aggregated — so a run could be "green" because the failing suite was the one
 * you forgot to run. This runs them in dependency order, keeps each suite's own output, and
 * prints a single table at the end.
 *
 * Order matters. Topology and budgets are cheap and catch the things that would make every
 * later number meaningless, so they run first: there is no point measuring Core Web Vitals
 * on a site whose second host is not being served.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EDGE, HOSTS, REMOTES } from './lib/topology.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const SUITES = [
  { id: 'budget', file: 'budget.mjs', needsStack: false, what: 'build output against per-app budgets' },
  { id: 'hosts', file: 'hosts.mjs', needsStack: true, what: 'two hosts, one origin, shared chrome, the zone' },
  { id: 'verify', file: 'verify.mjs', needsStack: true, what: 'SSR, no-JS, personalization, cache-shareability' },
  { id: 'independence', file: 'independence.mjs', needsStack: true, what: 'registry-driven deploy, canary, failure isolation' },
  { id: 'contamination', file: 'cross-contamination.mjs', needsStack: true, what: 'no page fetches another team\'s code' },
  { id: 'contract', file: 'contract.mjs', needsStack: true, node: ['--experimental-strip-types'], what: 'every stack emits the same test ids' },
  { id: 'auth', file: 'auth.mjs', needsStack: true, what: 'the login journey, and what it costs the cache' },
  { id: 'widgets', file: 'widgets.mjs', needsStack: true, what: 'three teams on one page, and per-area cost' },
  { id: 'media', file: 'media.mjs', needsStack: true, what: 'real photographs and video: weight, formats, priority' },
  { id: 'behaviors', file: 'behaviors.mjs', needsStack: true, what: 'the client interactivity layer, end to end' },
  { id: 'vitals', file: 'vitals.mjs', needsStack: true, what: 'Core Web Vitals, documents and soft navigations' },
  { id: 'a11y', file: 'a11y.mjs', needsStack: true, what: 'axe-core, WCAG 2.1 A and AA, every route' },
];

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const selected = only.length ? SUITES.filter((s) => only.includes(s.id)) : SUITES;

console.log('\n' + '='.repeat(78));
console.log(`bench — ${selected.length} suite(s) against ${EDGE}`);
console.log(`${HOSTS.length} hosts (${HOSTS.map((h) => h.name).join(', ')})  ·  ` +
  `${REMOTES.length} remotes (${REMOTES.map((r) => r.name).join(', ')})`);
console.log('='.repeat(78));

// A stack that is not up produces a wall of timeouts that reads like a hundred failures.
// Say it once, clearly, instead.
if (selected.some((s) => s.needsStack)) {
  const up = await fetch(`${EDGE}/__edge`).then((r) => r.ok, () => false);
  if (!up) {
    console.error(`\nThe stack is not answering at ${EDGE}.`);
    console.error('Start it with `pnpm dev`, then run this again.');
    process.exit(2);
  }
}

const results = [];
for (const suite of selected) {
  console.log(`\n${'='.repeat(78)}\n${suite.id.toUpperCase()} — ${suite.what}\n${'='.repeat(78)}`);
  const started = Date.now();
  const run = spawnSync(process.execPath, [...(suite.node ?? []), join(HERE, suite.file)], {
    stdio: 'inherit',
    env: process.env,
  });
  results.push({
    ...suite,
    ok: run.status === 0,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  });
}

console.log(`\n${'='.repeat(78)}\nSUMMARY\n${'='.repeat(78)}`);
for (const r of results) {
  console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.id.padEnd(15)} ${String(r.seconds).padStart(6)}s   ${r.what}`);
}

const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  console.log(`${failed.length} of ${results.length} suite(s) failed: ${failed.map((f) => f.id).join(', ')}`);
  console.log('Scroll up for the failing checks — each one names what broke and where.');
  process.exitCode = 1;
} else {
  console.log(`all ${results.length} suite(s) green`);
}
console.log('Reports in results/: vitals.json, hosts.json, media.json, auth.json, behaviors.site.json\n');
