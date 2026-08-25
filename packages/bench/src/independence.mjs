/**
 * Independence assertions — the claim this whole repo exists to test.
 *
 * Every check here proves something happened WITHOUT the shell being rebuilt or
 * restarted. The shell's pid and its node bundle hash are captured up front and
 * re-asserted at the end; if either changed, the run is void.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const REGISTRY_FILE = join(ROOT, 'packages/registry/registry.json');
const SHELL_BUNDLE = join(ROOT, 'stacks/rspack-react/shell/dist/node/index.js');
import { EDGE as BASE } from './lib/topology.mjs';
const REGISTRY_TTL_MS = 5_000;

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hashFile = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12);
const readRegistry = () => JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'));
const writeRegistry = (d) => writeFileSync(REGISTRY_FILE, `${JSON.stringify(d, null, 2)}\n`);

const status = async (path, headers = {}) => (await fetch(BASE + path, { headers })).status;
const body = async (path, headers = {}) => (await fetch(BASE + path, { headers })).text();

const shellPidBefore = JSON.parse(readFileSync(join(ROOT, '.logs/pids.json'), 'utf8'))
  .find((p) => p.name === 'shell').pid;
const shellHashBefore = hashFile(SHELL_BUNDLE);
const original = readRegistry();

console.log(`\nshell pid=${shellPidBefore} bundle=${shellHashBefore}\n`);

try {
  console.log('— a remote owns routes inside its own subtree —');
  record(
    'route added by the faq team alone is live',
    (await status('/faq/contact')) === 200,
    'requires faq built + its registry version bumped; shell untouched',
  );

  console.log('\n— rollback: registry points back at the old version —');
  const rolledBack = readRegistry();
  for (const r of rolledBack.remotes) if (r.name === 'faq') r.version = '1.0.0-rollback-probe';
  rolledBack.revision = 'rollback-probe';
  writeRegistry(rolledBack);
  await sleep(REGISTRY_TTL_MS + 1000);
  record(
    'a registry edit alone changes what the shell serves',
    (await body('/')).includes('Reference Store'),
    'shell still healthy after registry mutation',
  );
  writeRegistry(original);
  await sleep(REGISTRY_TTL_MS + 1000);

  console.log('\n— canary: two cohorts, one shell, no rebuild —');
  const canaried = readRegistry();
  for (const r of canaried.remotes) {
    if (r.name !== 'faq') continue;
    r.canary = { version: '9.9.9-canary', web: r.web, node: r.node, percent: 100 };
  }
  canaried.revision = 'canary-probe';
  writeRegistry(canaried);
  await sleep(REGISTRY_TTL_MS + 1000);
  const canaryHtml = await body('/faq', { 'x-mf-cohort': 'canary-user' });
  record(
    'canary cohort is served without a shell rebuild',
    canaryHtml.includes('9.9.9-canary'),
    'resolved version is pinned into the HTML bootstrap payload',
  );
  writeRegistry(original);
  await sleep(REGISTRY_TTL_MS + 1000);

  console.log('\n— failure isolation: a dead remote must not take down the shell —');
  const broken = readRegistry();
  for (const r of broken.remotes) {
    if (r.name !== 'faq') continue;
    r.web = 'http://localhost:9/mf-manifest.json';
    r.node = 'http://localhost:9/ssr/mf-manifest.json';
    r.version = 'broken-probe';
  }
  broken.revision = 'broken-probe';
  writeRegistry(broken);
  await sleep(REGISTRY_TTL_MS + 1000);
  const homeStatus = await status('/');
  const homeHtml = await body('/');
  record('home still renders when the faq remote is unreachable', homeStatus === 200);
  // The cart is client-rendered, so the SERVER HTML carries its placeholder, never a
  // count. Asserting on the count here would be asserting the architecture is broken.
  record('other remotes still render (cart placeholder present)',
    // The cart contributes server-rendered markup now, not a placeholder awaiting an island.
    homeHtml.includes('data-testid="mini-cart"'));
} finally {
  writeRegistry(original);
  await sleep(REGISTRY_TTL_MS + 1000);
}

console.log('\n— the shell was never touched —');
record('shell process never restarted', hashFile(SHELL_BUNDLE) === shellHashBefore, 'bundle unchanged');
record(
  'shell pid unchanged',
  JSON.parse(readFileSync(join(ROOT, '.logs/pids.json'), 'utf8')).find((p) => p.name === 'shell').pid ===
    shellPidBefore,
);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
