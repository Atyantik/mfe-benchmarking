/**
 * The research report as a page.
 *
 * Same dataset and same statistics as the markdown, presented for reading rather than for
 * diffing. The markdown is the archival record — it lives in git and reviews cleanly; this is
 * what gets sent to someone who has to make a decision from it.
 *
 * The design carries one idea: no number appears without its dispersion and its stability
 * class, and the class is a visual chip rather than a column you have to look up. A reader
 * skimming should be unable to mistake an unstable metric for a settled one.
 */
import { describe } from './dictionary.mjs';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmt = (value, unit) => {
  if (value === null || value === undefined) return '—';
  if (unit === 'ratio') return value.toFixed(3);
  if (unit === 'score') return value.toFixed(4);
  if (unit === 'count' || unit === 'cores') return Number(value.toFixed(2)).toString();
  if (unit === 'bytes') return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(3);
};

const SECTIONS = [
  { id: 'weight', title: 'Page weight', test: (p) => p.startsWith('perRoute.') && !p.includes('byOwner'),
    blurb: 'What a cold navigation costs to deliver, per route.' },
  { id: 'owners', title: 'Weight by owning application', test: (p) => p.includes('byOwnerKbGzip'),
    blurb: 'The same bytes, read as a bill of materials per team — which is where a federated architecture is either paying for itself or not.' },
  { id: 'vitals', title: 'Core Web Vitals', test: (p) => /^documents\..*\.(LCP|CLS|INP|TBT|FCP|TTFB)$/.test(p),
    blurb: 'Measured with the library real-user monitoring uses, at 4× CPU throttling.' },
  { id: 'browsercpu', title: 'Browser processor and memory', test: (p) => /^documents\..*\.(taskMs|scriptMs|layoutMs|styleMs|jsHeapMb|domNodes|domElements|longTasks)$/.test(p),
    blurb: 'What the page costs to run rather than to deliver — the half the Core Web Vitals do not show.' },
  { id: 'soft', title: 'Soft navigations', test: (p) => p.startsWith('softNavigations.'),
    blurb: 'Client-side navigation inside the single-page zone, measured separately because it is a different measurement.' },
  { id: 'server', title: 'Server cost', test: (p) => p.startsWith('server.') || p.startsWith('sustainedHeap.'),
    blurb: 'In-process CPU, memory, event loop and garbage collection under sustained load.' },
  { id: 'dx', title: 'Developer experience', test: (p) => p.startsWith('dx.'),
    blurb: 'Wall-clock cost to an engineer. At scale this is the largest absolute number in the report.' },
  { id: 'composition', title: 'Composition and styling', test: (p) => /^(behaviors|widgets|cssModules|testIds)\./.test(p),
    blurb: 'What the architecture itself costs: behaviours, contributed widgets, and CSS isolation.' },
];

const CLASS_HELP = {
  deterministic: 'Reproduces exactly. Any difference is real.',
  stable: 'Spread under 3%. A difference larger than the spread is real.',
  variable: 'Spread under 10%. Directionally useful; small differences are not.',
  unstable: 'Spread of 10% or more. Not comparable at this sample size.',
};

export function renderHtml(data) {
  const stacks = Object.keys(data.stacks);
  const [BASE, OTHER] = stacks;
  const prov = data.stacks[BASE].provenance;
  const allPaths = [...new Set(stacks.flatMap((s) => Object.keys(data.stacks[s].metrics)))].sort();
  const sectionOf = (p) => SECTIONS.find((s) => s.test(p))?.id ?? 'other';
  const rows = OTHER ? (data.comparisons[`${BASE} vs ${OTHER}`] ?? {}) : {};
  const resolvable = Object.entries(rows).filter(([, r]) => r.resolvable);

  const H = [];
  const w = (x = '') => H.push(x);

  w(`<title>Federation Under Two Frameworks</title>`);
  w(STYLE);
  w(FONTS);
  w('<div class="wrap">');

  // ---- masthead ----
  w('<header class="masthead">');
  w('<p class="eyebrow">mfe-benchmarking · research report</p>');
  w('<h1>Federation Under Two Frameworks</h1>');
  w('<p class="lede">One application, implemented twice against a frozen specification and measured by the same sixteen suites — with every figure printed alongside its dispersion.</p>');
  w('<dl class="facts">');
  for (const [k, v] of [
    ['Runs per stack', String(data.runsPerStack)],
    ['Metrics', String(allPaths.length)],
    ['Spec version', String(prov.specVersion)],
    ['Catalog', prov.catalogHash],
    ['Machine', `${data.machine.cpu}, ${data.machine.cores}c`],
    ['Generated', data.generatedAt.slice(0, 10)],
  ]) w(`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`);
  w('</dl>');
  w('</header>');

  // ---- 1 what this is ----
  w(section('1', 'What this report is'));
  w('<p>One application — ten routes, two host applications, four federated remotes — implemented twice against a frozen specification, and measured by the same sixteen suites. Neither implementation is a demo written to flatter its framework: both satisfy the same DOM structure, the same fixture data, the same test-id contract and the same accessibility standard, and <strong>both must pass every check before any number here is recorded</strong>.</p>');
  w(`<p>Every figure is the mean of <strong>${data.runsPerStack} independent runs</strong>, each a full rebuild against a freshly started stack. Every figure is printed with all of its samples and its dispersion, and each is labelled with whether the sample supports a comparison at all.</p>`);
  w('<div class="callout"><span class="callout-label">Why dispersion appears on every number</span>');
  w('<p>An earlier version of this comparison reported that one stack served <strong>7–11% more requests per second</strong>, on the strength of a single run. A second run of the identical builds gave <strong>−11% to −14%</strong> on the same routes. Both measurements were correct; the conclusion was not. Nothing in the tooling had made that visible, and this report format is the response.</p></div>');

  // ---- 2 environment ----
  w(section('2', 'Environment and provenance'));
  w('<div class="scroll"><table><tbody>');
  for (const [k, v] of [
    ['Machine', `${data.machine.cpu}, ${data.machine.cores} cores, ${data.machine.memoryGb} GB`],
    ['Platform', data.runtime.platform],
    ['Node', `${data.runtime.node} (V8 ${data.runtime.v8})`],
    ['Environment', data.machine.ci ? 'CI' : 'a developer workstation'],
    ['Spec version', String(prov.specVersion)],
    ['Dependency catalog', prov.catalogHash],
    ['Commit', `${prov.git.shortCommit} on ${prov.git.branch}${prov.git.dirty ? ' (working tree dirty)' : ''}`],
  ]) w(`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`);
  w('</tbody></table></div>');
  w('<p>Both stacks were measured on the same machine, from the same commit, against the same dependency catalog, minutes apart. <strong>Results from different spec versions or catalog hashes describe different applications and must never be compared.</strong></p>');
  for (const s of stacks) {
    const runs = data.stacks[s].runs;
    w(`<p class="runs"><strong>${esc(s)}</strong> — ${runs.map((r) => `${r.checks.passed}/${r.checks.total}`).join(', ')} checks per run<br>` +
      runs.map((r) => `<code>${esc(r.dir)}</code>`).join('<br>') + '</p>');
  }

  // ---- 3 method ----
  w(section('3', 'Method'));
  w('<p>Each run performs, in order:</p><ol>');
  for (const step of [
    '<strong>Build</strong> every application from a clean <code>dist</code>, in the measured configuration. A stale artefact is a wrong measurement wearing the right name.',
    '<strong>Start</strong> nine processes — runtime registry, media origin, four federated remotes, two host applications, edge router — and wait for every health probe.',
    '<strong>Run all sixteen suites.</strong> A run with any failing check is discarded rather than averaged: a baseline is a run that passed.',
    '<strong>Archive</strong> every raw suite report beside a manifest carrying full provenance.',
    '<strong>Stop</strong> the stack, so the next run starts from a cold process and an empty cache.',
  ]) w(`<li>${step}</li>`);
  w('</ol>');
  w('<p>Browser measurements run in headless Chromium at <strong>4× CPU throttling</strong>, matching Lighthouse\'s mid-range-mobile simulation. Without it every stack reports a Total Blocking Time of zero on a modern workstation and the metric stops discriminating. Core Web Vitals are collected with the <code>web-vitals</code> library itself, injected into the page, so the laboratory and the field cannot disagree about what counts. Server figures are collected in-process by each host, because they do not exist anywhere else.</p>');

  w('<h3>Stability classes</h3>');
  w('<p>Each metric is classified from its own dispersion rather than by assertion. <strong>This is the column to read first</strong> — it decides whether a difference between two stacks is something you may act on.</p>');
  w('<div class="scroll"><table><thead><tr><th>class</th><th>spread</th><th>what it licenses</th></tr></thead><tbody>');
  for (const [cls, spread] of [['deterministic', 'under 0.5%'], ['stable', 'under 3%'], ['variable', 'under 10%'], ['unstable', '10% or more']])
    w(`<tr><td><span class="chip chip-${cls}">${cls}</span></td><td class="num">${spread}</td><td>${esc(CLASS_HELP[cls])}</td></tr>`);
  w('</tbody></table></div>');

  // ---- 4 findings ----
  if (OTHER) {
    w(section('4', 'Findings'));
    w(`<p>Of <strong>${Object.keys(rows).length}</strong> metrics measured on both stacks, <strong>${resolvable.length}</strong> show a difference larger than the measurement spread. The rest are either identical by construction or too noisy to separate at this sample size.</p>`);
    const notable = resolvable
      .filter(([p]) => describe(p).label)
      .sort((a, b) => Math.abs(b[1].deltaPct) - Math.abs(a[1].deltaPct))
      .slice(0, 14);
    w('<div class="scroll"><table><thead><tr><th>metric</th><th>subject</th>' +
      `<th class="num">${esc(BASE)}</th><th class="num">${esc(OTHER)}</th><th class="num">change</th><th>better</th></tr></thead><tbody>`);
    for (const [path, r] of notable) {
      const d = describe(path);
      const parts = path.split('.');
      const subject = parts.length > 2 ? parts.slice(1, -1).join(' · ').replace(/ · byOwnerKbGzip/, '') : '—';
      const better = d.lowerIsBetter === (r.deltaPct < 0) ? OTHER : BASE;
      const cls = better === OTHER ? 'win-other' : 'win-base';
      w(`<tr><td>${esc(d.label)}</td><td><code>${esc(subject)}</code></td>` +
        `<td class="num">${fmt(r.base.mean, d.unit)}</td><td class="num">${fmt(r.other.mean, d.unit)}</td>` +
        `<td class="num ${cls}">${r.deltaPct > 0 ? '+' : ''}${r.deltaPct.toFixed(1)}%</td><td class="${cls}">${esc(better)}</td></tr>`);
    }
    w('</tbody></table><caption>The fourteen largest resolvable differences. Units appear in the metric tables below.</caption></div>');
  }

  // ---- 5 results ----
  w(section('5', 'Results'));
  w('<p>Every table prints each run, the mean, the standard deviation, the coefficient of variation and the stability class. Sections open on demand; the raw suite reports are archived beside the dataset.</p>');

  SECTIONS.forEach((sec, i) => {
    const paths = allPaths.filter((p) => sectionOf(p) === sec.id);
    if (!paths.length) return;
    w(`<h3>5.${i + 1} ${esc(sec.title)}</h3>`);
    w(`<p>${esc(sec.blurb)}</p>`);

    const seen = new Map();
    for (const p of paths) {
      const d = describe(p);
      if (d.label && !seen.has(d.label)) seen.set(d.label, d);
    }
    w('<div class="instruments">');
    for (const [label, d] of seen) {
      w(`<div class="instrument"><h4>${esc(label)}</h4><p>${esc(d.how)}</p>` +
        `<p class="how"><span>Instrument</span> ${esc(d.instrument)}</p>` +
        (d.caveat ? `<p class="how caveat"><span>Caveat</span> ${esc(d.caveat)}</p>` : '') + '</div>');
    }
    w('</div>');

    for (const stack of stacks) {
      const metrics = data.stacks[stack].metrics;
      const present = paths.filter((p) => metrics[p]);
      if (!present.length) continue;
      w(`<details${sec.id === 'dx' ? ' open' : ''}><summary><strong>${esc(stack)}</strong> — ${present.length} metrics</summary>`);
      w('<div class="scroll"><table><thead><tr><th>metric</th>' +
        Array.from({ length: data.runsPerStack }, (_, k) => `<th class="num">run ${k + 1}</th>`).join('') +
        '<th class="num">mean</th><th class="num">sd</th><th class="num">cv%</th><th>class</th></tr></thead><tbody>');
      for (const p of present) {
        const m = metrics[p];
        const d = describe(p);
        const cells = m.runs.map((v) => `<td class="num">${fmt(v, d.unit)}</td>`);
        while (cells.length < data.runsPerStack) cells.push('<td class="num">—</td>');
        w(`<tr><td><code>${esc(p)}</code>${d.unit ? ` <span class="unit">${esc(d.unit)}</span>` : ''}</td>` +
          cells.join('') +
          `<td class="num mean">${fmt(m.mean, d.unit)}</td><td class="num">${fmt(m.stdev, d.unit)}</td>` +
          `<td class="num">${m.cvPct.toFixed(2)}</td><td><span class="chip chip-${m.stability}">${m.stability}</span></td></tr>`);
      }
      w('</tbody></table></div></details>');
    }

    // The comparison for this section, with the resolvability verdict stated per row rather
    // than left for the reader to infer from two means and a standard deviation.
    if (OTHER) {
      const here = paths.filter((p) => rows[p]);
      if (here.length) {
        w('<details><summary><strong>Comparison</strong> — ' +
          `${esc(BASE)} vs ${esc(OTHER)}, ${here.filter((p) => rows[p].resolvable).length} of ${here.length} resolvable</summary>`);
        w('<div class="scroll"><table><thead><tr><th>metric</th>' +
          `<th class="num">${esc(BASE)}</th><th class="num">${esc(OTHER)}</th><th class="num">change</th><th>verdict</th></tr></thead><tbody>`);
        for (const p of here) {
          const r = rows[p];
          const d = describe(p);
          const better = d.lowerIsBetter === (r.deltaPct < 0) ? OTHER : BASE;
          const cls = r.resolvable ? (better === OTHER ? 'win-other' : 'win-base') : '';
          const verdict = r.resolvable
            ? `<span class="${cls}">${esc(better)} better</span>`
            : '<span class="chip chip-unstable">within noise</span>';
          w(`<tr><td><code>${esc(p)}</code></td><td class="num">${fmt(r.base.mean, d.unit)}</td>` +
            `<td class="num">${fmt(r.other.mean, d.unit)}</td>` +
            `<td class="num ${cls}">${r.deltaPct > 0 ? '+' : ''}${r.deltaPct.toFixed(1)}%</td><td>${verdict}</td></tr>`);
        }
        w('</tbody></table></div></details>');
      }
    }
  });

  // ---- 6 threats ----
  w(section('6', 'Threats to validity'));
  w('<p>Stated plainly, because a report that hides its limits is marketing.</p><ul>');
  for (const t of [
    `<strong>Sample size.</strong> ${data.runsPerStack} runs. Standard deviations from ${data.runsPerStack} samples are coarse, and the <span class="chip chip-unstable">unstable</span> class exists precisely because some metrics need more.`,
    '<strong>One machine, not CI.</strong> Build times and throughput are the most hardware-sensitive figures here and are comparable only on identical hardware. Byte counts are unaffected.',
    '<strong>Localhost.</strong> There is no network. Time to First Byte measures server render time, and transfer sizes are what a browser would fetch rather than what it would experience over a real connection.',
    '<strong>One bundler.</strong> Both stacks build with Rspack, so every difference here is a framework difference — and no bundler difference is measured at all.',
    '<strong>A port, not two independent designs.</strong> The second implementation reproduces the first DOM node for node, which is what makes the byte comparison meaningful and what makes it a weaker guide to idiomatic practice.',
    '<strong>Synthetic interaction.</strong> Each route receives one scripted interaction so Interaction to Next Paint is defined at all. A real session would produce a different distribution.',
  ]) w(`<li>${t}</li>`);
  w('</ul>');

  // ---- 7 reproduce ----
  w(section('7', 'Reproducing this'));
  w(`<pre><code>pnpm install
pnpm media                 # fetch the image and video fixtures once
MF_RUNS=${data.runsPerStack} pnpm research      # every stack, every suite, ${data.runsPerStack} times, then this report</code></pre>`);
  w('<p>The raw suite reports for every run are archived beside the dataset, unmodified. The metrics above answer the questions this report was written to answer; the raw reports answer the ones it was not.</p>');

  if (sectionOpen) w('</section>');
  sectionOpen = false;
  w('<footer><p>Generated by <code>packages/bench</code> from <code>dataset.json</code>. Regenerating a report never re-measures.</p></footer>');
  w('</div>');
  return H.join('\n');
}

/**
 * Opens a section and closes whichever one preceded it.
 *
 * Written this way because the alternative — remembering to emit a closing tag at the end of
 * every branch — is exactly the sort of thing that produces a page of nested sections that
 * still renders, so nobody notices.
 */
let sectionOpen = false;
const section = (n, title) => {
  const close = sectionOpen ? '</section>' : '';
  sectionOpen = true;
  return `${close}<section><div class="rule"><span class="num-badge">${n}</span><h2>${esc(title)}</h2></div>`;
};

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">`;

const STYLE = `<style>
:root{--ground:#f6f7f9;--surface:#fff;--sunken:#eceef2;--ink-900:#171c24;--ink-700:#333c49;--ink-500:#5d6875;--ink-400:#7b8695;--line:#dee2e9;--line-strong:#c3cad4;--base:#0d6273;--other:#a63c11;--ok:#1d6a4f;--warn:#8a6100;--stop:#9c2d21;--shadow:0 1px 2px rgba(23,28,36,.06),0 8px 24px -16px rgba(23,28,36,.3)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ground:#12151a;--surface:#191d24;--sunken:#21262f;--ink-900:#eef1f5;--ink-700:#c6ccd6;--ink-500:#98a2b0;--ink-400:#7b8695;--line:#2b313b;--line-strong:#3d4552;--base:#5cc4d8;--other:#f08a5d;--ok:#5fbf95;--warn:#d9a441;--stop:#e2705f;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px -16px rgba(0,0,0,.8)}}
:root[data-theme="dark"]{--ground:#12151a;--surface:#191d24;--sunken:#21262f;--ink-900:#eef1f5;--ink-700:#c6ccd6;--ink-500:#98a2b0;--ink-400:#7b8695;--line:#2b313b;--line-strong:#3d4552;--base:#5cc4d8;--other:#f08a5d;--ok:#5fbf95;--warn:#d9a441;--stop:#e2705f;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px -16px rgba(0,0,0,.8)}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink-700);font-family:"Source Serif 4",Georgia,serif;font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
.wrap{max-width:64rem;margin:0 auto;padding:clamp(2rem,5vw,4rem) clamp(1rem,4vw,2.5rem) 6rem}
h1,h2,h3,h4,.ui{font-family:Archivo,system-ui,sans-serif;color:var(--ink-900);text-wrap:balance}
h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.04;letter-spacing:-.028em;font-weight:700;margin:0 0 .6rem}
h2{font-size:clamp(1.25rem,2.4vw,1.6rem);line-height:1.15;letter-spacing:-.018em;font-weight:650;margin:0}
h3{font-size:1.1rem;font-weight:650;letter-spacing:-.01em;margin:2.4rem 0 .5rem}
h4{font-size:.85rem;font-weight:650;margin:0 0 .3rem}
p{margin:0 0 1rem;max-width:70ch}
ol,ul{max-width:70ch;padding-left:1.2rem}li{margin-bottom:.5rem}li::marker{color:var(--ink-400)}
code{font-family:"IBM Plex Mono",monospace;font-size:.84em;background:var(--sunken);padding:.1em .34em;border-radius:2px}
pre{background:var(--sunken);border:1px solid var(--line);border-radius:3px;padding:.9rem 1.1rem;overflow-x:auto;font-size:.82rem;line-height:1.7;margin:0 0 1.25rem}
pre code{background:none;padding:0}
.eyebrow{font-family:Archivo,sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-400);margin:0 0 1rem}
.lede{font-size:clamp(1.05rem,1.9vw,1.2rem);color:var(--ink-500);max-width:56ch;margin-bottom:2rem}
.masthead{border-bottom:2px solid var(--ink-900);padding-bottom:2rem;margin-bottom:3rem}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:1rem 1.5rem;margin:0}
.facts div{border-top:1px solid var(--line);padding-top:.5rem}
.facts dt{font-family:Archivo,sans-serif;font-size:.65rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-400);margin:0 0 .15rem}
.facts dd{font-family:"IBM Plex Mono",monospace;font-size:.85rem;color:var(--ink-900);margin:0}
section{margin-bottom:3.5rem}
.rule{display:flex;align-items:baseline;gap:.9rem;border-top:2px solid var(--ink-900);padding-top:.85rem;margin-bottom:1.4rem}
.num-badge{font-family:"IBM Plex Mono",monospace;font-size:.8rem;color:var(--ink-400)}
.callout{border-left:3px solid var(--ink-900);padding:.15rem 0 .15rem 1.15rem;margin:1.5rem 0}
.callout-label{font-family:Archivo,sans-serif;font-size:.7rem;font-weight:650;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-900);display:block;margin-bottom:.3rem}
.callout p:last-child{margin-bottom:0}
.scroll{overflow-x:auto;margin:0 0 1.25rem}
table{border-collapse:collapse;width:100%;font-family:Archivo,sans-serif;font-size:.83rem}
caption{caption-side:bottom;text-align:left;font-family:"IBM Plex Mono",monospace;font-size:.71rem;color:var(--ink-400);padding-top:.6rem}
th,td{text-align:left;padding:.5rem .7rem;border-bottom:1px solid var(--line);vertical-align:baseline}
thead th{font-size:.66rem;font-weight:650;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-400);border-bottom:1px solid var(--line-strong);white-space:nowrap}
tbody th{font-weight:500;color:var(--ink-700)}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;font-family:"IBM Plex Mono",monospace;font-size:.79rem}
td.mean{font-weight:600;color:var(--ink-900)}
.unit{font-family:Archivo,sans-serif;font-size:.66rem;color:var(--ink-400);text-transform:uppercase;letter-spacing:.05em}
.win-base{color:var(--base);font-weight:600}
.win-other{color:var(--other);font-weight:600}
.chip{display:inline-block;font-family:Archivo,sans-serif;font-size:.62rem;font-weight:650;letter-spacing:.06em;text-transform:uppercase;padding:.16em .5em;border-radius:2px;white-space:nowrap}
.chip-deterministic{background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok)}
.chip-stable{background:color-mix(in srgb,var(--ok) 10%,transparent);color:var(--ok)}
.chip-variable{background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn)}
.chip-unstable{background:color-mix(in srgb,var(--stop) 16%,transparent);color:var(--stop)}
details{border:1px solid var(--line);border-radius:3px;background:var(--surface);margin:0 0 1rem;box-shadow:var(--shadow)}
summary{cursor:pointer;padding:.7rem 1rem;font-family:Archivo,sans-serif;font-size:.88rem;color:var(--ink-900)}
details[open] summary{border-bottom:1px solid var(--line)}
details .scroll{margin:0;padding:0 .4rem .4rem}
.instruments{display:grid;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));gap:.9rem;margin:0 0 1.4rem}
.instrument{background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:.85rem .95rem}
.instrument p{font-size:.82rem;margin:0 0 .4rem;color:var(--ink-500)}
.instrument p:last-child{margin-bottom:0}
.how{font-family:"IBM Plex Mono",monospace;font-size:.7rem!important;line-height:1.55}
.how span{font-family:Archivo,sans-serif;font-weight:650;text-transform:uppercase;letter-spacing:.07em;font-size:.62rem;color:var(--ink-400);margin-right:.35rem}
.caveat span{color:var(--warn)}
.runs{font-family:"IBM Plex Mono",monospace;font-size:.74rem;color:var(--ink-500)}
footer{border-top:1px solid var(--line);padding-top:1.2rem;font-family:"IBM Plex Mono",monospace;font-size:.72rem;color:var(--ink-400)}
</style>`;
