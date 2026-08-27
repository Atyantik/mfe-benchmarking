/**
 * Freeze one bench run into a dated, committed, comparable record.
 *
 * `results/*.json` is working output: every run overwrites it, and it is gitignored. That is
 * correct for iterating and useless for the thing this repo exists to do, which is compare an
 * implementation against another one measured weeks later. A number you cannot retrieve is a
 * number you did not take.
 *
 * So a completed run is archived to:
 *
 *     results/runs/<stack>/<timestamp>/
 *         manifest.json     provenance + per-suite verdicts + headline metrics
 *         summary.md        the same, readable without a JSON viewer
 *         <suite>.json      every raw report, exactly as the suite wrote it
 *
 * and `results/runs/<stack>/latest.json` points at the most recent one, so "compare against
 * the current baseline" is a path and not an archaeology exercise.
 *
 * The raw reports are kept alongside the summary deliberately. Headline metrics are chosen
 * today for questions we know about; the raw reports answer the ones we do not, and they are
 * small enough that discarding them would be a false economy.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { provenance } from './lib/provenance.mjs';
import { parameters } from './lib/parameters.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = join(ROOT, 'results');

const kb = (bytes) => Number((bytes / 1024).toFixed(2));
const read = (file) => {
  try {
    return JSON.parse(readFileSync(join(RESULTS, file), 'utf8'));
  } catch {
    return null;
  }
};

/** Count a suite's own pass/fail, for suites that record a `checks` array. */
function tally(report) {
  if (!Array.isArray(report?.checks)) return null;
  const passed = report.checks.filter((c) => c.ok).length;
  return { passed, total: report.checks.length, failed: report.checks.length - passed };
}

/**
 * The numbers a comparison actually turns on.
 *
 * Deliberately a small, flat, stable set. A future stack's run is compared against this
 * object, so every key added here is a promise to keep producing it — which is why the raw
 * reports are archived too, rather than growing this until it is a second copy of them.
 */
function headline() {
  const vitals = read('vitals.json');
  const ssr = read('ssr.json');
  const leakage = read('leakage.json');
  const css = read('css.site.json');
  const behaviors = read('behaviors.site.json');
  const widgets = read('widgets.json');
  const contract = read('contract.json');
  const dx = read('dx.json');

  const perRoute = {};
  for (const [route, data] of Object.entries(leakage?.perRoute ?? {})) {
    perRoute[route] = {
      requests: data.requests,
      totalKbGzip: kb(data.totalBytesGzip),
      leakedKbGzip: kb(data.leakedBytesGzip),
      byOwnerKbGzip: Object.fromEntries(
        Object.entries(data.byOwner ?? {}).map(([owner, bytes]) => [owner, kb(bytes)]),
      ),
    };
  }
  for (const entry of css?.delivery ?? []) {
    if (perRoute[entry.route]) {
      perRoute[entry.route].cssKbGzip = kb(entry.gzipTotal);
      perRoute[entry.route].cssSheets = entry.sheets.length;
    }
  }

  const documents = {};
  for (const [route, metrics] of Object.entries(vitals?.documents ?? {})) {
    documents[route] = Object.fromEntries(
      [
        'LCP',
        'CLS',
        'INP',
        'TBT',
        'FCP',
        'TTFB',
        // Browser CPU. `taskMs` is total main-thread busy time; the other three are its
        // largest categories and do not sum to it.
        'taskMs',
        'scriptMs',
        'layoutMs',
        'styleMs',
        'jsHeapMb',
        'domNodes',
        'domElements',
        'headLinks',
        'longTasks',
      ].map((key) => [
        key,
        metrics[key]?.value ?? null,
      ]),
    );
  }

  const server = {};
  for (const [route, data] of Object.entries(ssr?.routes ?? {})) {
    server[route] = {
      rps: data.run?.rps ?? null,
      p50Ms: data.run?.p50 ?? null,
      p99Ms: data.run?.p99 ?? null,
      // Server CPU, in full rather than one derived figure: user vs system time is how you
      // tell rendering apart from socket and GC work.
      cpuPerRequestMs: data.metrics?.cpu?.perRequestMs ?? null,
      cpuUserMs: data.metrics?.cpu?.userMs ?? null,
      cpuSystemMs: data.metrics?.cpu?.systemMs ?? null,
      coresUsed: data.metrics?.cpu?.coresUsed ?? null,
      rssMb: data.metrics?.memory?.rssMb ?? null,
      heapUsedMb: data.metrics?.memory?.heapUsedMb ?? null,
      eventLoopUtilization: data.metrics?.eventLoop?.utilization ?? null,
      gcPauseMs: data.metrics?.gc?.totalPauseMs ?? null,
    };
  }

  return {
    perRoute,
    documents,
    softNavigations: vitals?.soft ?? null,
    server,
    sustainedHeap: ssr?.sustained
      ? {
          perRequestKb: ssr.sustained.perRequestKb,
          monotonic: ssr.sustained.monotonic,
          samples: ssr.sustained.samples,
        }
      : null,
    behaviors: Object.fromEntries(
      Object.entries(behaviors?.inventory ?? {}).map(([name, b]) => [
        name,
        { gzip: b.gzip ?? null, brotli: b.brotli ?? null },
      ]),
    ),
    widgets: widgets?.widgets ?? null,
    cssModules: css
      ? {
          modules: css.sources?.length ?? 0,
          identifiers: css.identifiers?.length ?? 0,
          wouldHaveCollided: css.wouldHaveCollidedWithoutAppName?.length ?? 0,
          coverageRatio: css.coverage?.ratio ?? null,
        }
      : null,
    testIds: contract ? { routes: contract.routes?.length ?? null } : null,
    /**
     * Developer experience. At eight teams this is the metric with the largest absolute cost,
     * and it is the axis the stacks under comparison differ on most.
     */
    dx: dx
      ? {
          coldBuildMs: dx.coldMs,
          warmBuildMs: dx.warmMs,
          cacheSaving: dx.cacheSaving,
          incrementalMs: dx.incrementalMs,
          startupMs: dx.startupMs,
          unblockedMs: dx.unblockedMs,
          editToBrowserMs: dx.loop?.totalMs ?? null,
          hasHotUpdate: false,
          lintMs: dx.lintMs,
          typecheckMs: dx.typecheckMs,
          testMs: dx.testMs,
          perApp: dx.apps ?? null,
        }
      : null,
  };
}

const meta = provenance();
// A filesystem-safe, sortable timestamp. Colons are legal on POSIX and a hazard everywhere else.
const stamp = meta.generatedAt.replace(/[:.]/g, '-').replace('Z', 'Z');
const runDir = join(RESULTS, 'runs', meta.stack, stamp);
mkdirSync(runDir, { recursive: true });

const reports = existsSync(RESULTS)
  ? readdirSync(RESULTS).filter((f) => f.endsWith('.json') && !f.startsWith('runs'))
  : [];
const suites = {};
for (const file of reports) {
  copyFileSync(join(RESULTS, file), join(runDir, file));
  const report = read(file);
  suites[file.replace(/\.(site|baseline)?\.?json$/, '')] = {
    file,
    generatedAt: report?.generatedAt ?? null,
    ...(tally(report) ?? {}),
  };
}

/**
 * Each suite's own budgets, lifted from the report it wrote.
 *
 * Read back rather than restated: a suite is the authority on its own thresholds, and a second
 * copy here would describe whatever the thresholds were when someone last updated this file.
 */
const suiteLimits = {};
for (const [name, entry] of Object.entries(suites)) {
  const report = read(entry.file);
  const limits = report?.limits ?? report?.budget ?? report?.LIMITS;
  if (limits) suiteLimits[name] = limits;
}

const manifest = {
  ...meta,
  /**
   * Everything that shaped this run, so the report can declare its own conditions.
   *
   * A report which does not say what connection it measured over cannot be reproduced and
   * cannot be argued with — "LCP 2.6 s" means nothing without it.
   */
  parameters: parameters(meta.stack, suiteLimits),
  suites,
  headline: headline(),
};
writeFileSync(join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// ---------------------------------------------------------------------------
// summary.md — the same record, readable
// ---------------------------------------------------------------------------

const totals = Object.values(suites).reduce(
  (acc, s) => ({
    passed: acc.passed + (s.passed ?? 0),
    total: acc.total + (s.total ?? 0),
  }),
  { passed: 0, total: 0 },
);

const h = manifest.headline;
const row = (cells) => `| ${cells.join(' | ')} |`;
const num = (value, digits = 2) =>
  value === null || value === undefined ? '—' : Number(value).toFixed(digits);

const lines = [
  `# Bench run — ${meta.stack} — ${meta.generatedAt}`,
  '',
  `**SPEC_VERSION ${meta.specVersion}** · catalog \`${meta.catalogHash}\` · commit \`${meta.git.shortCommit}\`` +
    `${meta.git.dirty ? ' *(working tree dirty)*' : ''}`,
  '',
  `${totals.passed}/${totals.total} checks passed across ${Object.keys(suites).length} reports.`,
  '',
  '> Compare only against runs with the **same SPEC_VERSION**. A different spec is a different',
  '> application, however similar the numbers look.',
  '',
  '## Environment',
  '',
  row(['', '']),
  row(['---', '---']),
  row(['Node', meta.runtime.node]),
  row(['Platform', meta.runtime.platform]),
  row(['CPU', `${meta.machine.cpu} (${meta.machine.cores} cores)`]),
  row(['Memory', `${meta.machine.memoryGb} GB`]),
  row(['CI', meta.machine.ci ? 'yes' : 'no']),
  '',
  '## Suites',
  '',
  row(['suite', 'checks', 'report']),
  row(['---', '---:', '---']),
  ...Object.entries(suites).map(([name, s]) =>
    row([name, s.total ? `${s.passed}/${s.total}` : '—', `\`${s.file}\``]),
  ),
  '',
  '## Per-route weight (gzip)',
  '',
  row(['route', 'requests', 'total kB', 'CSS kB', 'sheets', 'leaked kB']),
  row(['---', '---:', '---:', '---:', '---:', '---:']),
  ...Object.entries(h.perRoute).map(([route, r]) =>
    row([
      `\`${route}\``,
      String(r.requests),
      num(r.totalKbGzip),
      num(r.cssKbGzip),
      String(r.cssSheets ?? '—'),
      num(r.leakedKbGzip),
    ]),
  ),
  '',
  '## Core Web Vitals — document navigations',
  '',
  row(['route', 'LCP', 'CLS', 'INP', 'TBT', 'FCP', 'TTFB', 'long tasks']),
  row(['---', '---:', '---:', '---:', '---:', '---:', '---:', '---:']),
  ...Object.entries(h.documents).map(([route, m]) =>
    row([
      `\`${route}\``,
      num(m.LCP, 0),
      num(m.CLS, 3),
      num(m.INP, 0),
      num(m.TBT, 0),
      num(m.FCP, 0),
      num(m.TTFB, 1),
      num(m.longTasks, 0),
    ]),
  ),
  '',
  '## Server cost',
  '',
  row(['route', 'req/s', 'p50 ms', 'p99 ms', 'CPU ms/req']),
  row(['---', '---:', '---:', '---:', '---:']),
  ...Object.entries(h.server).map(([route, s]) =>
    row([`\`${route}\``, num(s.rps, 0), num(s.p50Ms, 0), num(s.p99Ms, 0), num(s.cpuPerRequestMs, 3)]),
  ),
  '',
  ...(h.sustainedHeap
    ? [
        `Sustained heap: **${num(h.sustainedHeap.perRequestKb, 2)} kB retained per request**` +
          `${h.sustainedHeap.monotonic ? ' (monotonic)' : ' (not a trend)'}, measured after a forced collection.`,
        '',
      ]
    : []),
  '## Behaviours (gzip bytes)',
  '',
  row(['behaviour', 'gzip', 'brotli']),
  row(['---', '---:', '---:']),
  ...Object.entries(h.behaviors).map(([name, b]) =>
    row([`\`${name}\``, String(b.gzip ?? '—'), String(b.brotli ?? '—')]),
  ),
  '',
  ...(h.dx
    ? [
        '## Developer experience',
        '',
        '> Wall-clock, on the CPU recorded above. Build time is the most hardware-sensitive',
        '> number in this file — compare across stacks only on the same machine.',
        '',
        row(['', 'seconds']),
        row(['---', '---:']),
        row(['Cold build (no dist, no cache)', num(h.dx.coldBuildMs / 1000)]),
        row(['Warm build (cache intact)', num(h.dx.warmBuildMs / 1000)]),
        row(['Bundler cache saving', `${num((h.dx.cacheSaving ?? 0) * 100, 0)}%`]),
        row(['Incremental (one app)', num(h.dx.incrementalMs / 1000)]),
        row(['Stack startup', num(h.dx.startupMs / 1000)]),
        row(['**Clean tree to a rendering page**', `**${num(h.dx.unblockedMs / 1000)}**`]),
        row(['**Edit to browser**', `**${num(h.dx.editToBrowserMs / 1000)}**`]),
        row(['Lint', num(h.dx.lintMs / 1000)]),
        row(['Typecheck', num(h.dx.typecheckMs / 1000)]),
        row(['Test', num(h.dx.testMs / 1000)]),
        '',
        `Hot update: **${h.dx.hasHotUpdate ? 'yes' : 'no'}**. ` +
          (h.dx.hasHotUpdate
            ? ''
            : 'This stack has no watch mode — `pnpm dev` serves built artefacts, so every edit ' +
              'costs a full rebuild and restart. That is the number above, and it is the one a ' +
              'stack with hot updates should be compared against.'),
        '',
        ...(h.dx.perApp
          ? [
              row(['app', 'cold s', 'warm s']),
              row(['---', '---:', '---:']),
              ...Object.entries(h.dx.perApp).map(([name, a]) =>
                row([name, num((a.coldMs ?? 0) / 1000), num((a.warmMs ?? 0) / 1000)]),
              ),
              '',
            ]
          : []),
      ]
    : []),
  ...(h.cssModules
    ? [
        '## CSS Modules',
        '',
        `${h.cssModules.modules} module(s), ${h.cssModules.identifiers} emitted identifier(s), ` +
          `${h.cssModules.wouldHaveCollided} of which would collide under a bare \`[local]-[hash]\`. ` +
          `Page CSS coverage ${num((h.cssModules.coverageRatio ?? 0) * 100, 0)}%.`,
        '',
      ]
    : []),
  '## Raw reports',
  '',
  'Every suite\'s own output is archived beside this file, unmodified. The headline metrics',
  'above answer the questions we have today; the raw reports answer the ones we do not.',
  '',
];

writeFileSync(join(runDir, 'summary.md'), `${lines.join('\n')}\n`);

// A stable pointer to the newest run, so comparisons target a path rather than a search.
writeFileSync(
  join(RESULTS, 'runs', meta.stack, 'latest.json'),
  `${JSON.stringify({ stack: meta.stack, generatedAt: meta.generatedAt, specVersion: meta.specVersion, dir: `results/runs/${meta.stack}/${stamp}` }, null, 2)}\n`,
);

console.log(`\narchived ${reports.length} report(s) -> results/runs/${meta.stack}/${stamp}/`);
console.log(`  ${totals.passed}/${totals.total} checks · SPEC_VERSION ${meta.specVersion} · catalog ${meta.catalogHash}`);
