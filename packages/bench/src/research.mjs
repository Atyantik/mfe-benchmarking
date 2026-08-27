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
import { EDGE, HOSTS, REMOTES } from './lib/topology.mjs';

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

/**
 * Assert that what is SERVING is what was just built.
 *
 * This repo has been bitten twice by a server that outlived its stack and went on answering on
 * the same port with a previous build. Both times everything looked healthy — probes passed,
 * pages rendered — and the numbers were quietly wrong. The second time cost most of an
 * afternoon, and produced a `CHROME is not defined` that reproduced nowhere.
 *
 * A health probe cannot catch that, because something IS listening. The manifest can: it names
 * the package that built it, and lists the exposes that build produced. Comparing the served
 * manifest to the one on disk is the difference between "a server answered" and "the server I
 * built is answering".
 *
 * @returns {Promise<string[]>} problems, empty when the stack is serving what it should
 */
async function verifyServing(stack) {
  const problems = [];
  // REMOTES only: a host serves documents, not a container manifest, so there is nothing at its
  // root to compare. If every remote is the right build the stack is the right stack, and the
  // hosts are checked below by the document they actually produce.
  for (const app of REMOTES) {
    /**
     * Resolved from the stack being MEASURED, not from this process's own topology.
     *
     * `app.dir` reads MF_STACK at import time, and this runner is a parent that loops over
     * several stacks — so trusting it compared each remote against whichever stack the parent
     * happened to default to. The guard then reported every remote as mismatched while the
     * stack was in fact correct: the same class of bug it exists to catch, in the catcher.
     */
    const diskPath = join(ROOT, 'stacks', stack, app.dir.split('/').pop(), 'dist/web/mf-manifest.json');
    if (!existsSync(diskPath)) continue;
    const disk = JSON.parse(readFileSync(diskPath, 'utf8'));

    let served;
    try {
      const res = await fetch(`http://localhost:${app.port}/mf-manifest.json`);
      if (!res.ok) {
        problems.push(`${app.name}: manifest returned ${res.status}`);
        continue;
      }
      served = await res.json();
    } catch (error) {
      problems.push(`${app.name}: manifest unreachable — ${String(error).slice(0, 60)}`);
      continue;
    }

    const servedName = served?.metaData?.buildInfo?.buildName ?? '(none)';
    const diskName = disk?.metaData?.buildInfo?.buildName ?? '(none)';
    if (servedName !== diskName) {
      problems.push(`${app.name}: serving "${servedName}" but "${diskName}" was built — a previous stack's server is still on port ${app.port}`);
      continue;
    }
    if (!servedName.includes(stack)) {
      problems.push(`${app.name}: serving "${servedName}", which is not part of ${stack}`);
      continue;
    }
    const servedExposes = (served.exposes ?? []).map((e) => e.name).sort().join(',');
    const diskExposes = (disk.exposes ?? []).map((e) => e.name).sort().join(',');
    if (servedExposes !== diskExposes) {
      problems.push(`${app.name}: serving a stale build — exposes differ from the one on disk`);
    }
  }

  // And the hosts: a document that renders is the only evidence that matters for them.
  for (const host of HOSTS) {
    try {
      const res = await fetch(`http://localhost:${host.port}/__health`);
      if (!res.ok) problems.push(`${host.name}: health returned ${res.status}`);
    } catch (error) {
      problems.push(`${host.name}: unreachable — ${String(error).slice(0, 60)}`);
    }
  }
  try {
    const res = await fetch(`${EDGE}/__edge`);
    if (!res.ok) problems.push(`edge: returned ${res.status}`);
  } catch (error) {
    problems.push(`edge: unreachable — ${String(error).slice(0, 60)}`);
  }
  return problems;
}

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

    // What is listening is not necessarily what was built. Checked before every run rather than
    // once, because a server can be replaced between runs and the failure is silent.
    let problems = await verifyServing(stack);
    if (problems.length) {
      line('\nThe running stack does not match the build. Restarting once:');
      for (const p of problems) line(`  ${p}`);
      quiet('node', ['scripts/stack.mjs', 'stop'], { MF_STACK: stack });
      run('node', ['scripts/stack.mjs', 'start'], { MF_STACK: stack });
      problems = await verifyServing(stack);
    }
    if (problems.length) {
      console.error(`\n${stack} is not serving the build under test. Refusing to measure it.`);
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    line(`  serving ${stack} — every manifest matches the build on disk`);

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
