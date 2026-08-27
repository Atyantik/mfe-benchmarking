/**
 * Turn a research dataset into a report a stranger can act on.
 *
 *     node packages/bench/src/report.mjs results/research/<stamp>/dataset.json
 *
 * Regenerating a report never re-measures. Formatting is cheap and measurement is expensive, so
 * the two are separate commands — and a report can be rebuilt from a dataset months later
 * without pretending to have run anything.
 *
 * What the format is trying to achieve: every number appears with all of its samples, its
 * dispersion, and a statement of whether the sample supports the comparison being drawn from
 * it. A report that prints only means invites exactly the error this repo already made once.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe } from './lib/dictionary.mjs';
import { renderHtml } from './lib/report-html.mjs';
import { renderPlain } from './lib/report-plain.mjs';

const datasetPath = process.argv[2];
if (!datasetPath) {
  console.error('usage: node report.mjs <dataset.json>');
  process.exit(2);
}
const data = JSON.parse(readFileSync(datasetPath, 'utf8'));
const outDir = dirname(datasetPath);

const STACKS = Object.keys(data.stacks);
const [BASE, OTHER] = STACKS;

const fmt = (value, unit) => {
  if (value === null || value === undefined) return '—';
  if (unit === 'ratio') return value.toFixed(3);
  if (unit === 'score') return value.toFixed(4);
  if (unit === 'count' || unit === 'cores') return Number(value.toFixed(2)).toString();
  if (unit === 'bytes') return Math.round(value).toString();
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(3);
};

/** Every metric path, grouped by the section of the report it belongs in. */
const SECTIONS = [
  { id: 'weight', title: 'Page weight', test: (p) => p.startsWith('perRoute.') && !p.includes('byOwner') },
  { id: 'owners', title: 'Weight by owning application', test: (p) => p.includes('byOwnerKbGzip') },
  { id: 'vitals', title: 'Core Web Vitals', test: (p) => /^documents\..*\.(LCP|CLS|INP|TBT|FCP|TTFB)$/.test(p) },
  { id: 'browsercpu', title: 'Browser processor and memory', test: (p) => /^documents\..*\.(taskMs|scriptMs|layoutMs|styleMs|jsHeapMb|domNodes|longTasks)$/.test(p) },
  { id: 'soft', title: 'Soft navigations', test: (p) => p.startsWith('softNavigations.') },
  { id: 'server', title: 'Server cost', test: (p) => p.startsWith('server.') || p.startsWith('sustainedHeap.') },
  { id: 'dx', title: 'Developer experience', test: (p) => p.startsWith('dx.') },
  { id: 'composition', title: 'Composition and styling', test: (p) => /^(behaviors|widgets|cssModules|testIds)\./.test(p) },
];

const allPaths = [...new Set(STACKS.flatMap((s) => Object.keys(data.stacks[s].metrics)))].sort();
const sectionOf = (p) => SECTIONS.find((s) => s.test(p))?.id ?? 'other';

// ---------------------------------------------------------------------------

const L = [];
const w = (line = '') => L.push(line);

const prov = data.stacks[BASE].provenance;

w('# Module Federation under two frameworks');
w('');
w('**A measured comparison of the same application implemented in React and in Svelte.**');
w('');
w(`Generated ${data.generatedAt} · ${data.runsPerStack} independent runs of each stack · ` +
  `SPEC_VERSION ${prov.specVersion} · catalog \`${prov.catalogHash}\``);
w('');
w('---');
w('');

// ---- 1. what this is ------------------------------------------------------
w('## 1. What this report is');
w('');
w('One application — ten routes, two host applications, four federated remotes — implemented');
w('twice against a frozen specification, and measured by the same sixteen suites. Neither');
w('implementation is a demo written to flatter its framework: both satisfy the same DOM');
w('structure, the same fixture data, the same test-id contract and the same accessibility');
w('standard, and both must pass every check before any number here is recorded.');
w('');
w(`Every figure is the mean of **${data.runsPerStack} independent runs**, each a full rebuild against a`);
w('freshly started stack. Every figure is printed with all of its samples and its dispersion,');
w('and each is labelled with whether the sample supports a comparison at all.');
w('');
w('> **Why dispersion is printed everywhere.** An earlier version of this comparison reported');
w('> that one stack served 7–11% more requests per second, on the strength of a single run. A');
w('> second run of the identical builds gave −11% to −14% on the same routes. Both measurements');
w('> were correct; the conclusion was not. Nothing in the tooling had made that visible, and');
w('> this report format is the response.');
w('');

// ---- 2. environment -------------------------------------------------------
w('## 2. Environment and provenance');
w('');
w('| | |');
w('|---|---|');
w(`| **Measurement profile** | **${prov.profile?.label ?? 'unknown'}** |`);
w(`| Profile detail | ${prov.profile?.describe ?? '—'} |`);
w(`| Machine | ${data.machine.cpu}, ${data.machine.cores} cores, ${data.machine.memoryGb} GB |`);
w(`| Platform | ${data.runtime.platform} |`);
w(`| Node | ${data.runtime.node} (V8 ${data.runtime.v8}) |`);
w(`| CI | ${data.machine.ci ? 'yes' : 'no — a developer workstation'} |`);
w(`| Spec version | ${prov.specVersion} |`);
w(`| Dependency catalog | \`${prov.catalogHash}\` |`);
w(`| Commit | \`${prov.git.shortCommit}\` on \`${prov.git.branch}\`${prov.git.dirty ? ' *(working tree dirty)*' : ''} |`);
w(`| Runs per stack | ${data.runsPerStack} |`);
w('');
w('Both stacks were measured on the same machine, from the same commit, against the same');
w('dependency catalog, minutes apart. **Results from different SPEC_VERSIONs or different');
w('catalog hashes describe different applications and must never be compared.**');
w('');
for (const stack of STACKS) {
  const s = data.stacks[stack];
  w(`**${stack}** — ${s.runs.map((r) => `${r.checks.passed}/${r.checks.total}`).join(', ')} checks per run:`);
  w('');
  for (const r of s.runs) w(`- \`${r.dir}\` — ${r.generatedAt}`);
  w('');
}

// ---- 3. parameters --------------------------------------------------------
w('## 3. Parameters');
w('');
w('Everything that shaped these numbers, read from the objects that shaped them rather than');
w('restated here — a hand-maintained list drifts from the run it claims to describe.');
w('');
{
  const par = data.stacks[BASE].parameters;
  if (par) {
    const n = par.profile.network;
    w('### 3.1 Measurement profile');
    w('');
    w('The conditions the browser measurements were taken under. **The most consequential entry');
    w('in this report**: on an unthrottled localhost bytes are free, and every route reports the');
    w('same Largest Contentful Paint regardless of what it transfers.');
    w('');
    w('| | |');
    w('|---|---|');
    w(`| Profile | \`${par.profile.id}\` — ${par.profile.label} |`);
    w(`| CPU throttling | ${par.profile.cpuThrottleRate > 1 ? `${par.profile.cpuThrottleRate}x slowdown` : 'none'} |`);
    w(`| Network — download | ${n ? `${n.downloadKbps} Kbps` : 'unthrottled'} |`);
    w(`| Network — upload | ${n ? `${n.uploadKbps} Kbps` : 'unthrottled'} |`);
    w(`| Network — round trip | ${n ? `${n.latencyMs} ms` : 'none'} |`);
    w(`| navigator.hardwareConcurrency | ${par.profile.hardwareConcurrency ?? 'host default'} |`);
    w(`| V8 heap ceiling | ${par.profile.v8HeapCapMb ? `${par.profile.v8HeapCapMb} MB` : 'host default'} |`);
    w(`| Viewport | ${typeof par.profile.viewport === 'string' ? par.profile.viewport : `${par.profile.viewport.width}x${par.profile.viewport.height}`} |`);
    w(`| Profiles available | ${par.profile.available.join(', ')} |`);
    w('');

    w('### 3.2 Toolchain');
    w('');
    w('| | |');
    w('|---|---|');
    for (const [k, v] of Object.entries(par.toolchain)) w(`| ${k} | \`${v ?? 'unresolved'}\` |`);
    w('');

    if (Object.keys(par.environment).length) {
      w('### 3.3 Environment');
      w('');
      w('Every `MF_*` variable in effect, so a run started with an unusual flag says so.');
      w('');
      w('| | |');
      w('|---|---|');
      for (const [k, v] of Object.entries(par.environment)) w(`| \`${k}\` | \`${v}\` |`);
      w('');
    }

    w('### 3.4 Topology');
    w('');
    w(`${par.topology.hosts.length} host applications, ${par.topology.remotes.length} federated remotes, ${par.topology.routeCount} routes behind one origin.`);
    w('');
    w('| application | role | port |');
    w('|---|---|---:|');
    for (const h of par.topology.hosts) w(`| ${h.name} | host, ${h.navigation} navigation, serves \`${h.prefix}\` | ${h.port} |`);
    for (const r of par.topology.remotes) w(`| ${r.name} | remote, ${r.kind} | ${r.port} |`);
    w('');

    if (Object.keys(par.sharedDependencies).length) {
      w('### 3.5 Shared dependencies');
      w('');
      w('Read from the manifests the build emitted, so this is what was actually shared rather');
      w('than what the configuration asked for.');
      w('');
      w('| module | version | singleton | requiredVersion |');
      w('|---|---:|---|---:|');
      for (const [name, d] of Object.entries(par.sharedDependencies))
        w(`| \`${name}\` | ${d.version ?? '—'} | ${d.singleton ? 'yes' : 'no'} | ${d.requiredVersion ?? 'false'} |`);
      w('');
      if (OTHER && data.stacks[OTHER].parameters) {
        w(`**${OTHER}** shares: ${Object.keys(data.stacks[OTHER].parameters.sharedDependencies ?? {}).map((x) => `\`${x}\``).join(', ') || '—'}.`);
        w('The two lists differ on purpose, and the difference is itself a result.');
        w('');
      }
    }

    w('### 3.6 Budgets');
    w('');
    const vb = par.budgets.vitals ?? {};
    w('| metric | document | soft navigation |');
    w('|---|---:|---:|');
    for (const k of Object.keys(vb.document ?? {})) w(`| ${k} | ${vb.document[k]} | ${vb.soft?.[k] ?? '—'} |`);
    for (const k of Object.keys(vb.cpu ?? {})) w(`| ${k} | ${vb.cpu[k]} | — |`);
    w('');
    for (const [route, metrics] of Object.entries(vb.waivers ?? {}))
      for (const [metric, waiver] of Object.entries(metrics)) {
        w(`> **Waiver — a waiver is not a pass.** \`${route}\` **${metric}** is over the`);
        w(`> ${vb.document?.[metric]} threshold and raised to ${waiver.limit}. ${waiver.reason}`);
        w('');
      }
  }
}

// ---- 4. method ------------------------------------------------------------
w('## 4. Method');
w('');
w('Each run performs, in order:');
w('');
w('1. **Build** every application in the stack from a clean `dist`, in the measured');
w('   configuration (`MF_OPTIMIZE=1`).');
w('2. **Start** nine processes — a runtime registry, a media origin, four federated remotes,');
w('   two host applications and an edge router — and wait for every health probe.');
w('3. **Run all sixteen suites** against that stack. A run with any failing check is discarded');
w('   rather than averaged: a baseline is a run that passed.');
w('4. **Archive** every raw suite report alongside a manifest carrying the provenance above.');
w('5. **Stop** the stack. The next run starts from a cold process and an empty cache, because a');
w('   warm server is a different measurement wearing the same name.');
w('');
w('Browser measurements are taken in headless Chromium at **4× CPU throttling**, matching');
w("Lighthouse's mid-range-mobile simulation. Without throttling every stack reports a Total");
w('Blocking Time of zero on a modern workstation and the metric stops discriminating.');
w('');
w('Core Web Vitals are collected with the `web-vitals` library itself, injected into the page,');
w('so the laboratory and the field cannot disagree about what counts as an LCP candidate.');
w('Server figures are collected in-process by each host — `process.cpuUsage()`,');
w('`performance.eventLoopUtilization()`, `v8.getHeapStatistics()` and a GC observer — because');
w('they do not exist anywhere else.');
w('');

// ---- 4. summary of findings ----------------------------------------------
w('## 5. Findings');
w('');
if (OTHER) {
  const rows = data.comparisons[`${BASE} vs ${OTHER}`] ?? {};
  const resolvable = Object.entries(rows).filter(([, r]) => r.resolvable);
  const notable = resolvable
    .filter(([p]) => describe(p).label)
    .sort((a, b) => Math.abs(b[1].deltaPct) - Math.abs(a[1].deltaPct))
    .slice(0, 12);

  w(`Of ${Object.keys(rows).length} metrics measured on both stacks, **${resolvable.length} show a`);
  w(`difference larger than the measurement spread**. The rest are either identical by`);
  w('construction or too noisy to separate at this sample size.');
  w('');
  w('The twelve largest resolvable differences:');
  w('');
  w(`| metric | route or item | ${BASE} | ${OTHER} | change |`);
  w('|---|---|---:|---:|---:|');
  for (const [path, r] of notable) {
    const d = describe(path);
    // The subject is whatever sits between the family and the leaf — a route, or a route and
    // an owner. Joining the whole middle keeps `/my-account` and its owning app together
    // instead of printing a path fragment nobody can read.
    const parts = path.split('.');
    const subject = parts.length > 2 ? parts.slice(1, -1).join(' · ').replace(/ · byOwnerKbGzip/, '') : '—';
    const sign = r.deltaPct > 0 ? '+' : '';
    w(`| ${d.label} | \`${subject}\` | ${fmt(r.base.mean, d.unit)} | ${fmt(r.other.mean, d.unit)} | ${sign}${r.deltaPct.toFixed(1)}% |`);
  }
  w('');
  w(`Units are in the metric tables below. A positive change means ${OTHER} is higher, which is`);
  w('better for some metrics and worse for others — each table states which.');
  w('');
}

// ---- 5. results -----------------------------------------------------------
w('## 6. Results');
w('');
w('Every table below prints each run, the mean, the standard deviation, the coefficient of');
w('variation, and a stability class. **The stability class is the one to read first**: it is');
w('computed from the data rather than asserted, and it decides whether a difference between');
w('two columns is something you may act on.');
w('');
w('| class | meaning |');
w('|---|---|');
w('| `deterministic` | spread under 0.5%. Byte and node counts. A difference of any size is real. |');
w('| `stable` | spread under 3%. Main-thread times, CPU per request. A difference larger than the spread is real. |');
w('| `variable` | spread under 10%. Build times, latency tails. Directionally useful; small differences are not. |');
w('| `unstable` | spread of 10% or more. **Not comparable at this sample size.** |');
w('');

for (const section of SECTIONS) {
  const paths = allPaths.filter((p) => sectionOf(p) === section.id);
  if (paths.length === 0) continue;

  w(`### 6.${SECTIONS.indexOf(section) + 1} ${section.title}`);
  w('');

  // Describe the instruments used in this section once, rather than per row.
  const seen = new Map();
  for (const p of paths) {
    const d = describe(p);
    if (d.label && !seen.has(d.label)) seen.set(d.label, d);
  }
  for (const [label, d] of seen) {
    w(`**${label}** — ${d.how} *Instrument: ${d.instrument}.*` + (d.caveat ? ` *Caveat: ${d.caveat}*` : ''));
    w('');
  }

  for (const stack of STACKS) {
    const metrics = data.stacks[stack].metrics;
    const present = paths.filter((p) => metrics[p]);
    if (present.length === 0) continue;
    w(`<details${section.id === 'weight' || section.id === 'dx' ? ' open' : ''}><summary><strong>${stack}</strong> — ${present.length} metrics</summary>`);
    w('');
    w('| metric | ' + Array.from({ length: data.runsPerStack }, (_, i) => `run ${i + 1}`).join(' | ') + ' | mean | sd | cv% | class |');
    w('|---|' + '---:|'.repeat(data.runsPerStack) + '---:|---:|---:|---|');
    for (const p of present) {
      const m = metrics[p];
      const d = describe(p);
      const runs = m.runs.map((v) => fmt(v, d.unit));
      while (runs.length < data.runsPerStack) runs.push('—');
      w(`| \`${p}\`${d.unit ? ` (${d.unit})` : ''} | ${runs.join(' | ')} | **${fmt(m.mean, d.unit)}** | ${fmt(m.stdev, d.unit)} | ${m.cvPct.toFixed(2)} | \`${m.stability}\` |`);
    }
    w('');
    w('</details>');
    w('');
  }

  if (OTHER) {
    const rows = data.comparisons[`${BASE} vs ${OTHER}`] ?? {};
    const here = paths.filter((p) => rows[p]);
    if (here.length) {
      w(`**${BASE} vs ${OTHER}**`);
      w('');
      w(`| metric | ${BASE} mean | ${OTHER} mean | change | resolvable? |`);
      w('|---|---:|---:|---:|---|');
      for (const p of here) {
        const r = rows[p];
        const d = describe(p);
        const sign = r.deltaPct > 0 ? '+' : '';
        const verdict = r.resolvable
          ? (d.lowerIsBetter === (r.deltaPct < 0) ? `yes — ${OTHER} better` : `yes — ${BASE} better`)
          : 'no — within noise';
        w(`| \`${p}\` | ${fmt(r.base.mean, d.unit)} | ${fmt(r.other.mean, d.unit)} | ${sign}${r.deltaPct.toFixed(1)}% | ${verdict} |`);
      }
      w('');
    }
  }
}

// ---- 6. threats -----------------------------------------------------------
w('## 7. Threats to validity');
w('');
w('Stated plainly, because a report that hides its limits is marketing.');
w('');
w(`- **Sample size.** ${data.runsPerStack} runs. Standard deviations from three samples are coarse, and`);
w('  the `unstable` class exists precisely because some metrics need more.');
w('- **One machine, not CI.** Build times and throughput are the most hardware-sensitive figures');
w('  here and are comparable only on identical hardware. Byte counts are not affected.');
w('- **Localhost.** There is no network. TTFB measures server render time, and transfer sizes are');
w('  what a browser would fetch rather than what it would experience over a real connection.');
w('- **One bundler.** Both stacks are built with Rspack, so every difference here is a framework');
w('  difference. A Vite comparison would be a different axis and is not built.');
w('- **A port, not two independent designs.** The second implementation reproduces the first');
w('  DOM node for node, because that is what makes the byte comparison meaningful. An idiomatic');
w('  team might build parts of it differently.');
w('- **Synthetic interaction.** Each route receives one scripted interaction so INP is defined.');
w('  A real session would produce a different distribution.');
w('');

// ---- 7. reproduce ---------------------------------------------------------
w('## 8. Reproducing this');
w('');
w('```bash');
w('pnpm install');
w('pnpm media                 # fetch the image and video fixtures once');
w(`MF_RUNS=${data.runsPerStack} pnpm research      # every stack, every suite, ${data.runsPerStack} times, then this report`);
w('```');
w('');
w('The raw suite reports for every run are archived beside this file, unmodified. The headline');
w('metrics above answer the questions this report was written to answer; the raw reports answer');
w('the ones it was not.');
w('');

const md = L.join('\n');
writeFileSync(join(outDir, 'report.md'), `${md}\n`);
console.log(`\nwrote ${join(outDir, 'report.md')} (${(md.length / 1024).toFixed(1)} kB)`);

/**
 * The same dataset as a page.
 *
 * The markdown is the archival record — it lives in git and reviews cleanly. This is what gets
 * sent to someone who has to make a decision from it, and it exists beside rather than instead
 * of the markdown for that reason.
 */
const html = renderHtml(data);
writeFileSync(join(outDir, 'report.html'), `${html}\n`);
console.log(`wrote ${join(outDir, 'report.html')} (${(html.length / 1024).toFixed(1)} kB)`);

/**
 * And a third rendering, for a reader who does not have the vocabulary.
 *
 * Not a summary and not simplified numbers — the same dataset with every metric given a plain
 * title, a sentence on what it is, a sentence on why it matters, what a good value looks like,
 * and its own chart. The audience for a benchmark is rarely only the people who built it.
 */
const plain = renderPlain(data);
writeFileSync(join(outDir, 'report-plain.html'), `${plain}\n`);
console.log(`wrote ${join(outDir, 'report-plain.html')} (${(plain.length / 1024).toFixed(1)} kB)`);
