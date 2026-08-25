/**
 * Developer experience, as numbers.
 *
 * Every other suite measures what a visitor receives. This one measures what an ENGINEER
 * receives, and at 500 developers it is the metric with the largest absolute cost: a
 * twenty-second rebuild, hit forty times a day, by eight teams, is not a papercut. It is the
 * dominant term.
 *
 * It also happens to be the axis where the stacks under comparison differ most. Bundler
 * marketing is almost entirely about this number, which is a good reason to measure it here
 * rather than believe it.
 *
 * Seven sections:
 *
 *   1  cold        a fresh clone: no dist, no bundler cache
 *   2  warm        dist removed, bundler cache intact — the `git clean` case
 *   3  incremental one file touched, one app rebuilt — the inner loop
 *   4  startup     how long until every server answers
 *   5  unblocked   clone to a rendering page, end to end — the headline number
 *   6  loop        edit a source file, see it in a browser
 *   7  gates       lint, typecheck, test
 *
 * Everything here is REPORTED. Two budgets in this repo had to be rewritten because they
 * encoded a threshold that passed on a laptop and failed in CI for identical code, and build
 * time is more hardware-sensitive than anything that mistake was made on before. The
 * thresholds that do exist are catastrophe detectors — an order of magnitude out, not a
 * regression of a few percent — and every number is archived with the CPU it was taken on.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { EDGE, HOSTS, REMOTES, STACK } from './lib/topology.mjs';
import { provenance } from './lib/provenance.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');
const APPS = [...REMOTES, ...HOSTS];

/** Catastrophe detectors, not regression gates. See the header. */
const LIMITS = {
  coldBuildS: 600,
  warmBuildS: 300,
  incrementalS: 120,
  startupS: 120,
  unblockedS: 900,
};

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (text) => console.log(`        ${text}`);
const heading = (text) =>
  console.log(`\n--- ${text} ${'-'.repeat(Math.max(0, 72 - text.length))}`);
const s = (ms) => `${(ms / 1000).toFixed(2)}s`;

/** Run a command, return wall-clock milliseconds and whether it succeeded. */
function timed(command, args, options = {}) {
  const started = performance.now();
  const run = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    env: { ...process.env, ...options.env },
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return {
    ms: performance.now() - started,
    ok: run.status === 0,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
  };
}

const buildEnv = { MF_OPTIMIZE: '1' };
const buildApp = (app) => timed('pnpm', ['run', 'build'], { cwd: join(ROOT, app.dir), env: buildEnv });
const stack = (verb) => timed('node', ['scripts/stack.mjs', verb]);

const clearDist = () => {
  for (const app of APPS) rmSync(join(ROOT, app.dir, 'dist'), { recursive: true, force: true });
};
const clearCache = () => {
  for (const app of APPS) {
    rmSync(join(ROOT, app.dir, 'node_modules/.cache'), { recursive: true, force: true });
    rmSync(join(ROOT, app.dir, '.rsbuild'), { recursive: true, force: true });
  }
};

const results = { stack: STACK, apps: {} };

// ---------------------------------------------------------------------------

heading('1. cold build - a fresh clone, no dist and no bundler cache');

/**
 * The number a new joiner experiences once, and CI experiences on every run.
 *
 * Measured per app rather than only in aggregate, because the interesting comparison between
 * stacks is not the total — it is whether the cost is spread evenly or concentrated in the
 * host that has to bundle everything.
 */
stack('stop');
clearDist();
clearCache();

let coldTotal = 0;
for (const app of APPS) {
  const run = buildApp(app);
  coldTotal += run.ms;
  results.apps[app.name] = { coldMs: Math.round(run.ms), ok: run.ok };
  note(`${app.name.padEnd(12)} ${s(run.ms).padStart(8)}${run.ok ? '' : '   FAILED'}`);
  if (!run.ok) note(`  ${run.stderr.trim().split('\n').slice(-3).join(' / ').slice(0, 160)}`);
}
results.coldMs = Math.round(coldTotal);
const coldFailures = APPS.filter((a) => !results.apps[a.name].ok);
check('cold', 'every app builds from a clean tree', coldFailures.length === 0,
  coldFailures.map((a) => a.name).join(', ') || `${APPS.length} apps`);
check('cold', `a cold build finishes inside ${LIMITS.coldBuildS}s`,
  coldTotal / 1000 < LIMITS.coldBuildS, `${s(coldTotal)} for ${APPS.length} apps, sequential`);
note(`slowest: ${APPS.map((a) => [a.name, results.apps[a.name].coldMs]).sort((x, y) => y[1] - x[1])[0].join(' at ')} ms`);

// ---------------------------------------------------------------------------

heading('2. warm build - dist removed, bundler cache intact');

clearDist();
let warmTotal = 0;
for (const app of APPS) {
  const run = buildApp(app);
  warmTotal += run.ms;
  results.apps[app.name].warmMs = Math.round(run.ms);
  note(`${app.name.padEnd(12)} ${s(run.ms).padStart(8)}`);
}
results.warmMs = Math.round(warmTotal);
check('warm', `a warm build finishes inside ${LIMITS.warmBuildS}s`,
  warmTotal / 1000 < LIMITS.warmBuildS, `${s(warmTotal)}`);
const cacheSaving = coldTotal > 0 ? 1 - warmTotal / coldTotal : 0;
note(`the bundler cache is worth ${(cacheSaving * 100).toFixed(0)}% of a cold build here`);
results.cacheSaving = Number(cacheSaving.toFixed(3));

// ---------------------------------------------------------------------------

heading('3. incremental - one file touched, one app rebuilt');

/**
 * The inner loop, and the only one of these numbers a developer meets more than once a day.
 *
 * The file is touched rather than edited so the measurement is repeatable and leaves no
 * change behind; the bundler's cache keys are content-based, so a real edit is measured in §6
 * where the result is observed in a browser.
 */
const subject = REMOTES.find((r) => r.name === 'product');
const touchTarget = join(ROOT, subject.dir, 'src/List.tsx');
const rebuilds = [];
for (let i = 0; i < 3; i += 1) {
  const now = new Date();
  utimesSync(touchTarget, now, now);
  const run = buildApp(subject);
  rebuilds.push(run.ms);
  note(`rebuild ${i + 1}  ${s(run.ms).padStart(8)}${run.ok ? '' : '   FAILED'}`);
}
const medianRebuild = [...rebuilds].sort((a, b) => a - b)[1];
results.incrementalMs = Math.round(medianRebuild);
check('incremental', `one app rebuilds inside ${LIMITS.incrementalS}s`,
  medianRebuild / 1000 < LIMITS.incrementalS, `${s(medianRebuild)} median of 3, ${subject.name}`);

// ---------------------------------------------------------------------------

heading('4. startup - every server answering');

stack('stop');
const startup = stack('start');
results.startupMs = Math.round(startup.ms);
check('startup', `the stack is healthy inside ${LIMITS.startupS}s`,
  startup.ok && startup.ms / 1000 < LIMITS.startupS,
  `${s(startup.ms)} for ${APPS.length + 3} processes`);

// ---------------------------------------------------------------------------

heading('5. unblocked - clone to a page a developer can look at');

/**
 * The headline. Everything a developer must wait through before the application exists on
 * their machine, in the order they must wait through it.
 *
 * There is no watch mode in this stack — `pnpm dev` serves BUILT artefacts — so "available to
 * develop on" is genuinely build-then-serve. That is a finding, not an omission, and §6
 * measures what it costs per edit.
 */
const unblockedMs = coldTotal + startup.ms;
results.unblockedMs = Math.round(unblockedMs);
{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const started = performance.now();
  await page.goto(`${EDGE}/product/p-0001`, { waitUntil: 'networkidle' });
  const rendered = await page.locator('[data-testid="stock-panel"]').isVisible();
  const firstPageMs = performance.now() - started;
  await browser.close();
  results.firstPageMs = Math.round(firstPageMs);
  check('unblocked', 'the first page renders once the stack is up', rendered, s(firstPageMs));
  note(`cold build ${s(coldTotal)} + startup ${s(startup.ms)} + first page ${s(firstPageMs)}`);
  check('unblocked', `a developer is unblocked inside ${LIMITS.unblockedS}s from a clean tree`,
    (unblockedMs + firstPageMs) / 1000 < LIMITS.unblockedS, s(unblockedMs + firstPageMs));
}

// ---------------------------------------------------------------------------

heading('6. loop - edit a source file, see it in a browser');

/**
 * The measurement that decides whether a stack is pleasant to work in.
 *
 * A real edit, a real rebuild, a real restart, and the change confirmed in a real browser —
 * because a rebuild that finishes without the page updating is not a completed loop, and only
 * the browser can tell you which happened.
 */
{
  const file = join(ROOT, subject.dir, 'src/StockPanel.tsx');
  const original = readFileSync(file, 'utf8');
  const marker = `DX-LOOP-${Date.now()}`;
  try {
    writeFileSync(file, original.replace('Availability</span>', `${marker}</span>`));
    const started = performance.now();
    const rebuild = buildApp(subject);
    stack('stop');
    const restart = stack('start');

    const browser = await chromium.launch();
    const page = await browser.newPage();
    let seen = false;
    try {
      await page.goto(`${EDGE}/product/p-0001`, { waitUntil: 'domcontentloaded' });
      seen = (await page.content()).includes(marker);
    } catch {
      /* reported as not seen */
    }
    const loopMs = performance.now() - started;
    await browser.close();

    results.loop = {
      totalMs: Math.round(loopMs),
      rebuildMs: Math.round(rebuild.ms),
      restartMs: Math.round(restart.ms),
      seen,
    };
    note(`rebuild ${s(rebuild.ms)} + restart ${s(restart.ms)} = ${s(loopMs)} to see the change`);
    check('loop', 'an edit reaches the browser', seen, seen ? `${s(loopMs)} end to end` : 'change never appeared');
    /**
     * Stated as a check so it appears in every archived run rather than only in prose: this
     * stack has no hot update path, and the comparison against one that does is the point.
     */
    check('loop', 'the edit-to-browser loop is a full rebuild and restart', true,
      `no watch mode or HMR in this stack — ${s(loopMs)} per edit`);
  } finally {
    writeFileSync(file, original);
    buildApp(subject);
    stack('stop');
    stack('start');
  }
}

// ---------------------------------------------------------------------------

heading('7. gates - what runs before a commit');

for (const [name, args] of [['lint', ['lint']], ['typecheck', ['typecheck']], ['test', ['test']]]) {
  const run = timed('pnpm', args);
  results[`${name}Ms`] = Math.round(run.ms);
  note(`${name.padEnd(12)} ${s(run.ms).padStart(8)}${run.ok ? '' : '   FAILED'}`);
  check('gates', `${name} passes`, run.ok, s(run.ms));
}
const gateTotal = results.lintMs + results.typecheckMs + results.testMs;
results.gatesMs = gateTotal;
note(`a full \`pnpm check\` is roughly ${s(gateTotal + warmTotal)} including the build`);

// ---------------------------------------------------------------------------

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.log('\nfailing:');
  for (const f of failed) console.log(`  - [${f.section}] ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  process.exitCode = 1;
}

console.log('\nsummary');
console.log(`  cold build      ${s(results.coldMs)}`);
console.log(`  warm build      ${s(results.warmMs)}`);
console.log(`  incremental     ${s(results.incrementalMs)}   (one app, median of 3)`);
console.log(`  startup         ${s(results.startupMs)}`);
console.log(`  edit -> browser ${s(results.loop.totalMs)}   (no HMR in this stack)`);
console.log(`  gates           ${s(results.gatesMs)}   lint + typecheck + test`);

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'dx.json'),
  `${JSON.stringify({ ...provenance(), limits: LIMITS, ...results, checks }, null, 2)}\n`,
);
console.log('\nwrote results/dx.json');
