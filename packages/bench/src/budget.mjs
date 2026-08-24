/**
 * Performance budgets, enforced.
 *
 * A budget that is only written down is a wish. This reads each app's budget.json, measures
 * what the app actually built, and exits non-zero on a breach — so the cost of a change is
 * visible in the pull request that causes it rather than in a report three weeks later.
 *
 * Raising a budget is deliberate: it is a committed, reviewed diff with a reason attached.
 */
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HOSTS, REMOTES } from './lib/topology.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Every file under `dir`, recursively. */
function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;

/**
 * Measure one app's browser output, split by who actually pays for it.
 *
 * Summing everything in dist/web measures the wrong thing. A remote builds three kinds of
 * JavaScript and a visitor pays for only one of them:
 *
 *   own       — named chunks: routes, behaviours, exposed modules. The app's actual code,
 *               and the only part a team controls day to day. This is what gets budgeted.
 *   container — remoteEntry.js. Module Federation machinery, near-identical in every
 *               remote. Budgeted separately so a jump is visible, but it is architecture,
 *               not something the app team wrote.
 *   fallback  — numerically-named chunks holding shared dependencies (React and friends).
 *               Every remote emits its own copy; the share scope executes exactly one, the
 *               host's. Counting these against an app would be charging it for bytes no
 *               visitor ever downloads — coverage measurement confirmed they never run.
 *
 * A remote's standalone `static/js/index.*` entry is excluded too: remotes are never loaded
 * on their own, so nothing ever requests it.
 */
const NAMED_CHUNK = /\/(?!index\.)[a-z][a-z0-9-]*\.[a-f0-9]{6,}\.js$/i;
const EXPOSE_CHUNK = /__federation_expose_/;
/** `__federation_expose_behaviors__gallery.<hash>.js` — one file per behaviour. */
const BEHAVIOUR_CHUNK = /__federation_expose_behaviors__([a-z0-9-]+)\.[a-f0-9]+\.js$/;

function classify(rel) {
  if (rel === 'remoteEntry.js') return 'container';
  if (EXPOSE_CHUNK.test(rel)) return 'own';
  if (/static\/js\/index\.[a-f0-9]+\.js$/.test(rel)) return 'entry';
  if (NAMED_CHUNK.test(`/${rel.split('/').pop()}`)) return 'own';
  return 'fallback';
}

function measure(appDir, { isHost }) {
  const web = join(appDir, 'dist/web');
  if (!existsSync(web)) return null;

  const files = walk(web);
  const js = files.filter((f) => extname(f) === '.js');
  const css = files.filter((f) => extname(f) === '.css');

  const byFile = Object.fromEntries([...js, ...css].map((f) => [f.slice(web.length + 1), gz(f)]));

  let own = 0;
  let container = 0;
  for (const f of js) {
    const rel = f.slice(web.length + 1);
    const kind = classify(rel);
    // The host IS loaded standalone, so everything it builds is a real delivery cost.
    if (isHost) own += gz(f);
    else if (kind === 'own') own += gz(f);
    else if (kind === 'container') container += gz(f);
  }

  const ownFiles = js.filter((f) => isHost || classify(f.slice(web.length + 1)) === 'own');

  // Behaviours are budgeted individually, not as a total. They load per page and on demand,
  // so ten cheap ones across the app cost a visitor nothing while one expensive one costs
  // every visitor to that page — a sum would hide exactly the case that matters.
  const behaviors = {};
  for (const f of js) {
    const match = BEHAVIOUR_CHUNK.exec(f);
    if (match) behaviors[match[1]] = gz(f);
  }

  return {
    ownJsGzip: own,
    containerJsGzip: container,
    cssGzip: css.reduce((n, f) => n + gz(f), 0),
    largestJsGzip: ownFiles.length ? Math.max(...ownFiles.map(gz)) : 0,
    behaviors,
    byFile,
  };
}

const fmt = (n) => `${(n / 1024).toFixed(1)} kB`;

export function checkApp(appDir, name, isHost = name === 'shell') {
  const budgetFile = join(appDir, 'budget.json');
  if (!existsSync(budgetFile)) {
    return { name, skipped: 'no budget.json' };
  }
  const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
  const actual = measure(appDir, { isHost });
  if (!actual) return { name, skipped: 'not built' };

  const checks = [];
  const add = (label, value, limit) => {
    if (typeof limit !== 'number') return;
    checks.push({ label, value, limit, ok: value <= limit });
  };

  add('own js', actual.ownJsGzip, budget.ownJsGzip);
  // A host produces no remoteEntry — nothing federates into it — so the container budget
  // is not "met", it is not applicable. Printing 0.0 kB against a limit invites someone to
  // read it as a win.
  if (!isHost) add('mf container', actual.containerJsGzip, budget.containerJsGzip);
  add('css', actual.cssGzip, budget.cssGzip);
  add('largest own chunk', actual.largestJsGzip, budget.largestJsGzip);

  // Every behaviour is checked, including ones added after the budget was written — the
  // point is that a new behaviour cannot arrive unmeasured.
  for (const [name, size] of Object.entries(actual.behaviors)) {
    add(`behavior ${name}`, size, budget.behaviorJsGzip);
  }

  for (const [pattern, limit] of Object.entries(budget.files ?? {})) {
    const match = Object.entries(actual.byFile).find(([f]) => f.includes(pattern));
    add(`file ~ ${pattern}`, match ? match[1] : 0, limit);
  }

  return { name, checks, actual };
}

/**
 * Every app, from the topology — hosts and remotes alike.
 *
 * Hardcoding the list here is how chrome and my-account went unbudgeted for their first
 * day of existence: `pnpm budget` reported "all budgets met" while two applications were
 * not being measured at all.
 */
const APPS = [
  ...HOSTS.map((h) => [h.budgetKey, h.dir, { isHost: true }]),
  ...REMOTES.map((r) => [r.name, r.dir, { isHost: false }]),
];

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\nbudgets (gzip)\n');
  let failed = 0;
  let skipped = 0;

  for (const [name, rel, meta] of APPS) {
    const result = checkApp(join(ROOT, rel), name, meta.isHost);
    if (result.skipped) {
      console.log(`  ${name.padEnd(11)} skipped — ${result.skipped}`);
      skipped += 1;
      continue;
    }
    for (const c of result.checks) {
      const head = `${c.ok ? '  ok  ' : '  OVER'}  ${name.padEnd(11)}`;
      const headroom = c.ok ? `${fmt(c.limit - c.value)} spare` : `${fmt(c.value - c.limit)} over`;
      console.log(`${head}${c.label.padEnd(26)} ${fmt(c.value).padStart(9)} / ${fmt(c.limit).padStart(9)}   ${headroom}`);
      if (!c.ok) failed += 1;
    }
  }

  if (skipped) console.log(`\n${skipped} app(s) not built — run \`pnpm build\` first.`);
  if (failed) {
    console.log(`\n${failed} budget(s) exceeded.`);
    console.log('Either make it smaller, or raise the budget in that app\'s budget.json and say why.');
    process.exitCode = 1;
  } else {
    console.log('\nall budgets met');
  }
}
