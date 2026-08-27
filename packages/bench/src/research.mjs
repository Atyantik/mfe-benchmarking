/**
 * The research command: every stack, every suite, N times, with statistics.
 *
 *     pnpm research                     # 3 runs of each stack, then the report
 *     MF_RUNS=5 pnpm research           # more samples
 *     MF_STACKS=rspack-svelte pnpm research
 *
 * Why this exists rather than "run the bench a few times and eyeball it": a single run of this
 * bench once produced "Svelte serves 7-11% more requests per second", and a second run of the
 * identical builds produced -11% to -14% on the same routes. Both numbers were real. The
 * conclusion drawn from the first was not, and nothing in the tooling made that visible.
 *
 * So this command owns the whole loop — build, restart, measure, repeat, aggregate — and the
 * report it produces states, per metric, whether the sample supports a comparison at all.
 *
 * It is deliberately one command. Anything a person has to remember to do three times is
 * something they will do twice and then compare.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { provenance } from './lib/provenance.mjs';
import { compare, flatten, summarise } from './lib/stats.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const RESULTS = join(ROOT, 'results');

const RUNS = Number(process.env.MF_RUNS ?? 3);
const STACKS = (process.env.MF_STACKS ?? 'rspack-react,rspack-svelte').split(',').filter(Boolean);

const run = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });

const quiet = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', env: { ...process.env, ...env } });

const line = (text = '') => console.log(text);
const rule = (text) => {
  line(`\n${'='.repeat(78)}`);
  line(text);
  line('='.repeat(78));
};

/** Runs archived for a stack, newest first. */
function archivedRuns(stack) {
  const dir = join(RESULTS, 'runs', stack);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith('20'))
    .sort()
    .reverse()
    .map((name) => join(dir, name));
}

// ---------------------------------------------------------------------------
// 1. measure
// ---------------------------------------------------------------------------

rule(`research — ${RUNS} run(s) of each of ${STACKS.length} stack(s)`);
line(`stacks: ${STACKS.join(', ')}`);
line('Each run is a full build, a fresh stack, and all 16 suites. This takes a while.');

const before = Object.fromEntries(STACKS.map((s) => [s, new Set(archivedRuns(s))]));

for (const stack of STACKS) {
  rule(`${stack} — build`);
  // MF_OPTIMIZE is the measured configuration; stating it here rather than inheriting it
  // means a shell that forgot to export it cannot silently change what was measured.
  const built = run('pnpm', ['-r', '--filter', `./stacks/${stack}/*`, 'build'], {
    MF_STACK: stack,
    MF_OPTIMIZE: '1',
  });
  if (built.status !== 0) {
    console.error(`\n${stack} failed to build — stopping rather than measuring a stale dist.`);
    process.exit(1);
  }

  for (let i = 1; i <= RUNS; i += 1) {
    rule(`${stack} — run ${i} of ${RUNS}`);
    // A fresh stack per run. A server left over from the previous iteration would serve a
    // warmed process and a filled cache, which is a different measurement wearing the same
    // name.
    quiet('node', ['scripts/stack.mjs', 'stop'], { MF_STACK: stack });
    const started = run('node', ['scripts/stack.mjs', 'start'], { MF_STACK: stack });
    if (started.status !== 0) {
      console.error(`\n${stack} did not start — stopping.`);
      process.exit(1);
    }
    const bench = run(process.execPath, [join(HERE, 'all.mjs')], { MF_STACK: stack });
    if (bench.status !== 0) {
      console.error(`\n${stack} run ${i} had failing checks. Not archived, and not averaged.`);
      console.error('A baseline is a run that passed; fix the failure and start again.');
      process.exit(1);
    }
  }
  quiet('node', ['scripts/stack.mjs', 'stop'], { MF_STACK: stack });
}

// ---------------------------------------------------------------------------
// 2. aggregate
// ---------------------------------------------------------------------------

rule('aggregating');

const stacks = {};
for (const stack of STACKS) {
  const fresh = archivedRuns(stack).filter((dir) => !before[stack].has(dir)).slice(0, RUNS);
  if (fresh.length === 0) {
    console.error(`No new archived runs for ${stack}.`);
    process.exit(1);
  }
  const manifests = fresh.map((dir) => JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')));
  const flat = manifests.map((m) => flatten(m.headline));
  // Every path any run produced. A metric missing from one run is summarised from the rest and
  // its `n` says so, rather than being dropped or silently treated as zero.
  const paths = [...new Set(flat.flatMap((f) => Object.keys(f)))].sort();

  const metrics = {};
  for (const path of paths) {
    const summary = summarise(flat.map((f) => f[path]));
    if (summary) metrics[path] = summary;
  }

  stacks[stack] = {
    runs: fresh.map((dir, i) => ({
      dir: dir.replace(`${ROOT}/`, ''),
      generatedAt: manifests[i].generatedAt,
      checks: Object.values(manifests[i].suites).reduce(
        (acc, s) => ({ passed: acc.passed + (s.passed ?? 0), total: acc.total + (s.total ?? 0) }),
        { passed: 0, total: 0 },
      ),
    })),
    provenance: {
      specVersion: manifests[0].specVersion,
      catalogHash: manifests[0].catalogHash,
      git: manifests[0].git,
      runtime: manifests[0].runtime,
      machine: manifests[0].machine,
    },
    metrics,
  };
  line(`  ${stack}: ${fresh.length} run(s), ${Object.keys(metrics).length} metrics`);
}

/** Stack-to-stack comparison, only where both measured the same path. */
const [baseName, ...others] = STACKS;
const comparisons = {};
for (const other of others) {
  const a = stacks[baseName].metrics;
  const b = stacks[other].metrics;
  const rows = {};
  for (const path of Object.keys(a)) {
    if (!b[path]) continue;
    const c = compare(a[path], b[path]);
    if (c) rows[path] = { ...c, base: a[path], other: b[path] };
  }
  comparisons[`${baseName} vs ${other}`] = rows;
}

const meta = provenance();
const stamp = meta.generatedAt.replace(/[:.]/g, '-');
const outDir = join(RESULTS, 'research', stamp);
mkdirSync(outDir, { recursive: true });

const dataset = {
  generatedAt: meta.generatedAt,
  runsPerStack: RUNS,
  stacks,
  comparisons,
  machine: meta.machine,
  runtime: meta.runtime,
};
writeFileSync(join(outDir, 'dataset.json'), `${JSON.stringify(dataset, null, 2)}\n`);

// The report is written by a separate module so it can be regenerated from a dataset without
// re-measuring — which is what makes a formatting change cheap and a re-run deliberate.
const report = spawnSync(process.execPath, [join(HERE, 'report.mjs'), join(outDir, 'dataset.json')], {
  stdio: 'inherit',
  env: process.env,
});

rule('done');
line(`dataset:  results/research/${stamp}/dataset.json`);
if (report.status === 0) line(`report:   results/research/${stamp}/report.md`);
line('');
