/**
 * The same measurements, for someone who does not already know the vocabulary.
 *
 * `report-html.mjs` is written for a reader who knows what `TaskDuration` is and wants to check
 * which CDP call produced it. This one is written for the person deciding whether any of it
 * matters — who has never met Interaction to Next Paint and should not have to look it up to
 * read a chart.
 *
 * Same dataset, same statistics, no simplified numbers. The difference is entirely in what is
 * said around them: every metric gets a plain title, a sentence on what it is, a sentence on why
 * anyone should care, what a good value looks like, and its own chart.
 *
 * One rule kept from the technical report: the spread is never dropped. A reader who cannot
 * define a coefficient of variation still needs to know which numbers are trustworthy, so the
 * stability class is translated rather than removed.
 */
import { groupedBars, CHART_STYLE } from './charts.mjs';
import { METRIC_NOTES, PARAMETER_NOTES, STABILITY_PLAIN } from './explain.mjs';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ROUTES = ['/', '/faq', '/faq/contact', '/product', '/product/p-0001', '/cart'];

const HUMAN_ROUTE = {
  '/': 'Home',
  '/faq': 'Support centre',
  '/faq/contact': 'Contact form',
  '/product': 'Product catalogue',
  '/product/p-0001': 'A product page',
  '/cart': 'Shopping basket',
  '/login': 'Sign in',
  '/my-account': 'Account overview',
  '/my-account/orders': 'Order history',
  '/my-account/profile': 'Profile',
};

/** Charts, grouped into the questions a reader actually has. */
const CHAPTERS = [
  {
    id: 'waiting',
    title: 'How long people wait',
    intro: 'Four different kinds of waiting, because "slow" is not one thing. A page can appear instantly and then refuse to respond, or respond instantly and show nothing for three seconds.',
    charts: [
      { metric: 'LCP', family: 'documents', unit: 'ms', threshold: 2500 },
      { metric: 'FCP', family: 'documents', unit: 'ms', threshold: 1800 },
      { metric: 'INP', family: 'documents', unit: 'ms', threshold: 200 },
      { metric: 'TTFB', family: 'documents', unit: 'ms', threshold: 800 },
    ],
  },
  {
    id: 'annoyance',
    title: 'How annoying the page is',
    intro: 'Two metrics for the things that make a page feel broken rather than slow.',
    charts: [
      { metric: 'CLS', family: 'documents', unit: 'score', threshold: 0.1 },
      { metric: 'TBT', family: 'documents', unit: 'ms', threshold: 300 },
    ],
  },
  {
    id: 'cost',
    title: 'What the page costs to download',
    intro: 'What has to come down the wire before any of the above can happen.',
    charts: [{ metric: 'totalKbGzip', family: 'perRoute', unit: 'kB' }],
  },
  {
    id: 'work',
    title: 'How hard the device has to work',
    intro: 'Downloading is half the cost. The other half is what the phone does with it once it arrives — which turns into battery, heat, and slowness on anything cheaper than a test machine.',
    charts: [
      { metric: 'taskMs', family: 'documents', unit: 'ms' },
      { metric: 'scriptMs', family: 'documents', unit: 'ms' },
      { metric: 'jsHeapMb', family: 'documents', unit: 'MB' },
    ],
  },
  {
    id: 'fairness',
    title: 'Are we comparing the same website?',
    intro: 'Everything above is meaningless if the two versions do not produce the same page. This is the check.',
    charts: [{ metric: 'domElements', family: 'documents', unit: 'count' }],
  },
  {
    id: 'server',
    title: 'What it costs to run the servers',
    intro: 'Not what the visitor experiences — what the bill looks like.',
    charts: [
      { metric: 'rps', family: 'server', unit: 'req/s', lowerIsBetter: false, routes: ['/', '/product', '/product/p-0001', '/my-account'] },
      { metric: 'cpuPerRequestMs', family: 'server', unit: 'ms', routes: ['/', '/product', '/product/p-0001', '/my-account'] },
      { metric: 'rssMb', family: 'server', unit: 'MB', routes: ['/', '/product', '/product/p-0001', '/my-account'] },
    ],
  },
];

/** Developer-experience metrics are single values, not per-route, so they get their own shape. */
const DX_CHARTS = ['coldBuildMs', 'incrementalMs', 'editToBrowserMs'];

export function renderPlain(data) {
  const stacks = Object.keys(data.stacks);
  const [BASE] = stacks;
  const prov = data.stacks[BASE].provenance;
  const par = data.stacks[BASE].parameters;
  const H = [];
  const w = (x = '') => H.push(x);

  const seriesFor = (family, metric, routes) =>
    (routes ?? ROUTES)
      .map((route) => {
        const path = `${family}.${route}.${metric}`;
        const series = stacks
          .filter((s) => data.stacks[s].metrics[path])
          .map((s) => {
            const m = data.stacks[s].metrics[path];
            return { stack: s, mean: m.mean, min: m.min, max: m.max };
          });
        return series.length ? { label: HUMAN_ROUTE[route] ?? route, series, path } : null;
      })
      .filter(Boolean);

  /**
   * How much of this chart can be trusted, and — if some of it cannot — exactly which rows.
   *
   * Taking the worst class across every row and stating it flatly was misleading: one wobbly
   * route made a chart of five solid ones read as "not reliable enough to compare". Naming the
   * rows tells the reader which bars to discount and, by omission, that the rest are fine.
   */
  const ORDER = ['deterministic', 'stable', 'variable', 'unstable'];
  const confidenceOf = (rows) => {
    let worst = 'deterministic';
    const shaky = new Set();
    for (const r of rows) {
      for (const s of stacks) {
        const m = data.stacks[s].metrics[r.path];
        if (!m) continue;
        if (ORDER.indexOf(m.stability) > ORDER.indexOf(worst)) worst = m.stability;
        if (m.stability === 'variable' || m.stability === 'unstable') shaky.add(r.label);
      }
    }
    return { worst, shaky: [...shaky] };
  };

  w('<title>What We Measured, In Plain Words</title>');
  w(STYLE);
  w(`<style>${CHART_STYLE}</style>`);
  w('<div class="wrap">');

  w('<header class="masthead">');
  w('<p class="eyebrow">A guided version of the technical report</p>');
  w('<h1>What We Measured, In Plain Words</h1>');
  w('<p class="lede">The same website, built twice — once with React and once with Svelte — then measured under identical conditions. Every number here appears in the technical report too; this version explains what each one means and why it might matter.</p>');
  w('</header>');

  // ---- what we did ----
  w('<section><h2>What we did, in three sentences</h2>');
  w('<p>We built the <strong>same website twice</strong>. Same pages, same content, same layout — one version written with React, the other with Svelte. Everything else was held identical so that any difference is caused by the framework and nothing else.</p>');
  w(`<p>We then loaded every page <strong>${data.runsPerStack} times per version</strong>, on a deliberately slowed-down machine and connection, and recorded ${Object.keys(data.stacks[BASE].metrics).length} different measurements each time.</p>`);
  w('<p>Below, each measurement gets a plain description and its own chart. <strong>Blue is React, orange is Svelte.</strong> Shorter bars are better everywhere except where it says otherwise.</p>');
  w('</section>');

  // ---- how to read a chart ----
  w('<section><h2>How to read the charts</h2>');
  w('<div class="cards">');
  for (const [t, d] of [
    ['The bar', 'The average of all runs. Blue is React, orange is Svelte.'],
    ['The thin line through it', 'How much the number moved between runs. A short line means we measured the same thing every time; a long one means the number is unreliable and should not be used to pick a winner.'],
    ['The dotted red line', 'The point at which the industry calls a result "good", where such a standard exists. Bars past it are a problem regardless of which version is ahead.'],
  ]) w(`<div class="card"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`);
  w('</div></section>');

  // ---- conditions ----
  w('<section><h2>The conditions we measured under</h2>');
  w('<p>This is the part most easily got wrong, and it changes every number below. The machine running these tests is much faster than the phone a real visitor uses, and everything runs on that one machine with no network in between — so left alone, it would make every version look equally fast and hide every difference.</p>');
  w('<p>So we deliberately made things worse, on purpose, in four ways:</p>');
  w('<div class="cards">');
  for (const note of PARAMETER_NOTES) {
    let actual = '';
    if (par) {
      if (note.key === 'cpuThrottleRate') actual = `${par.profile.cpuThrottleRate}× slower`;
      if (note.key === 'network' && par.profile.network)
        actual = `${par.profile.network.downloadKbps} Kbps down · ${par.profile.network.uploadKbps} Kbps up · ${par.profile.network.latencyMs} ms delay`;
      if (note.key === 'hardwareConcurrency') actual = `${par.profile.hardwareConcurrency} cores`;
      if (note.key === 'v8HeapCapMb') actual = `${par.profile.v8HeapCapMb} MB`;
      if (note.key === 'runs') actual = `${data.runsPerStack} runs of each version`;
    }
    w(`<div class="card"><h4>${esc(note.title)}</h4><p class="plain">${esc(note.plain)}</p>` +
      (actual ? `<p class="actual">${esc(actual)}</p>` : '') +
      `<p>${esc(note.why)}</p></div>`);
  }
  w('</div></section>');

  // ---- chapters ----
  CHAPTERS.forEach((chapter) => {
    w(`<section><h2>${esc(chapter.title)}</h2>`);
    w(`<p>${esc(chapter.intro)}</p>`);
    for (const spec of chapter.charts) {
      const note = METRIC_NOTES[spec.metric];
      const rows = seriesFor(spec.family, spec.metric, spec.routes);
      if (!rows.length) continue;
      const { worst: confidence, shaky } = confidenceOf(rows);
      w('<div class="metric">');
      w(`<h3>${esc(note?.title ?? spec.metric)}</h3>`);
      if (note) {
        w(`<p class="plain">${esc(note.plain)}</p>`);
        w(`<p>${esc(note.what)}</p>`);
        w(`<p><strong>Why it matters.</strong> ${note.why.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`);
        w(`<p class="good"><span>What good looks like</span> ${esc(note.good)}</p>`);
      }
      w(groupedBars({
        title: note?.title ?? spec.metric,
        subtitle: spec.lowerIsBetter === false ? 'higher is better' : 'lower is better',
        rows,
        unit: spec.unit,
        threshold: spec.threshold ?? null,
        lowerIsBetter: spec.lowerIsBetter !== false,
      }));
      const allShaky = shaky.length === rows.length;
      const trust =
        confidence === 'deterministic' || confidence === 'stable'
          ? STABILITY_PLAIN[confidence]
          : allShaky
            ? STABILITY_PLAIN[confidence]
            : `Most rows here held steady across runs. ${shaky.join(' and ')} did not — ` +
              `${STABILITY_PLAIN[confidence].charAt(0).toLowerCase()}${STABILITY_PLAIN[confidence].slice(1)}`;
      w(`<p class="confidence conf-${confidence}"><span>How much to trust this</span> ${esc(trust)}</p>`);
      w('</div>');
    }
    w('</section>');
  });

  // ---- developer experience ----
  const dxRows = DX_CHARTS.map((metric) => {
    const path = `dx.${metric}`;
    const series = stacks
      .filter((s) => data.stacks[s].metrics[path])
      .map((s) => {
        const m = data.stacks[s].metrics[path];
        return { stack: s, mean: m.mean / 1000, min: m.min / 1000, max: m.max / 1000 };
      });
    return series.length ? { label: METRIC_NOTES[metric]?.title ?? metric, series, path } : null;
  }).filter(Boolean);

  if (dxRows.length) {
    w('<section><h2>What it costs the people building it</h2>');
    w('<p>Everything above is about the visitor. This is about the engineers — how long they spend waiting for the computer instead of working. At eight teams and hundreds of developers, it is the largest single cost in the whole report.</p>');
    for (const metric of DX_CHARTS) {
      const note = METRIC_NOTES[metric];
      if (!note) continue;
      w('<div class="metric">');
      w(`<h3>${esc(note.title)}</h3>`);
      w(`<p class="plain">${esc(note.plain)}</p><p>${esc(note.what)}</p>`);
      w(`<p><strong>Why it matters.</strong> ${note.why.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`);
      w('</div>');
    }
    w(groupedBars({ title: 'Build and reload times', subtitle: 'lower is better · seconds', rows: dxRows, unit: 's' }));
    w('</section>');
  }

  // ---- caveats ----
  w('<section><h2>What this does not tell you</h2>');
  w('<p>Worth saying plainly, because a report that only lists its strengths is an advertisement.</p><ul>');
  for (const t of [
    `We ran everything <strong>${data.runsPerStack} times</strong>. That is enough to spot an unreliable measurement and not enough to be precise about a small one.`,
    'Everything ran on <strong>one computer</strong>, not on a range of real devices. Download sizes would be identical anywhere; timings would not.',
    'There is <strong>no real network</strong> — we simulated a slow connection rather than using one, so the numbers are repeatable but idealised.',
    'The Svelte version <strong>copies the React one exactly</strong>, down to the page structure, because that is what makes the comparison fair. A team building it from scratch in Svelte might do some things differently.',
    'Both versions use <strong>the same build tool</strong>. This compares two frameworks, not two build tools.',
  ]) w(`<li>${t}</li>`);
  w('</ul></section>');

  w('<footer><p>Every number here comes from the same dataset as the technical report, which carries the full method, all raw measurements, and the exact conditions each was taken under.</p>');
  if (prov) w(`<p>Measured ${esc(data.generatedAt.slice(0, 10))} on ${esc(data.machine.cpu)} · ${data.runsPerStack} runs per version · specification version ${esc(String(prov.specVersion))}</p>`);
  w('</footer>');
  w('</div>');
  return H.join('\n');
}

const STYLE = `<style>
:root{--ground:#f7f8fa;--surface:#fff;--sunken:#eceef2;--ink-900:#171c24;--ink-700:#333c49;--ink-500:#5d6875;--ink-400:#7b8695;--line:#dee2e9;--line-strong:#c3cad4;--base:#0d6273;--other:#a63c11;--ok:#1d6a4f;--warn:#8a6100;--stop:#9c2d21;--shadow:0 1px 2px rgba(23,28,36,.06),0 10px 30px -20px rgba(23,28,36,.35)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ground:#12151a;--surface:#191d24;--sunken:#21262f;--ink-900:#eef1f5;--ink-700:#c6ccd6;--ink-500:#98a2b0;--ink-400:#7b8695;--line:#2b313b;--line-strong:#3d4552;--base:#5cc4d8;--other:#f08a5d;--ok:#5fbf95;--warn:#d9a441;--stop:#e2705f;--shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -20px rgba(0,0,0,.8)}}
:root[data-theme="dark"]{--ground:#12151a;--surface:#191d24;--sunken:#21262f;--ink-900:#eef1f5;--ink-700:#c6ccd6;--ink-500:#98a2b0;--ink-400:#7b8695;--line:#2b313b;--line-strong:#3d4552;--base:#5cc4d8;--other:#f08a5d;--ok:#5fbf95;--warn:#d9a441;--stop:#e2705f;--shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -20px rgba(0,0,0,.8)}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink-700);font-family:"Source Serif 4",Georgia,serif;font-size:18px;line-height:1.7;-webkit-font-smoothing:antialiased}
.wrap{max-width:52rem;margin:0 auto;padding:clamp(2rem,5vw,4rem) clamp(1rem,4vw,2rem) 6rem}
h1,h2,h3,h4{font-family:Archivo,system-ui,sans-serif;color:var(--ink-900);text-wrap:balance}
h1{font-size:clamp(2rem,5.5vw,3.1rem);line-height:1.05;letter-spacing:-.03em;font-weight:700;margin:0 0 .7rem}
h2{font-size:clamp(1.35rem,3vw,1.8rem);line-height:1.2;letter-spacing:-.02em;font-weight:650;margin:0 0 .9rem;padding-top:1rem;border-top:2px solid var(--ink-900)}
h3{font-size:1.15rem;font-weight:650;letter-spacing:-.012em;margin:0 0 .3rem}
h4{font-size:.9rem;font-weight:650;margin:0 0 .3rem}
p{margin:0 0 .9rem}
ul{padding-left:1.2rem}li{margin-bottom:.6rem}li::marker{color:var(--ink-400)}
code{font-family:"IBM Plex Mono",monospace;font-size:.85em;background:var(--sunken);padding:.1em .34em;border-radius:2px}
.eyebrow{font-family:Archivo,sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-400);margin:0 0 1rem}
.lede{font-size:clamp(1.1rem,2.2vw,1.3rem);color:var(--ink-500);margin-bottom:0}
.masthead{border-bottom:2px solid var(--ink-900);padding-bottom:2rem;margin-bottom:2.5rem}
section{margin-bottom:3rem}
.metric{background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:1.3rem 1.4rem;margin:0 0 1.4rem;box-shadow:var(--shadow)}
.plain{font-family:Archivo,sans-serif;font-size:1.02rem;font-weight:600;color:var(--ink-900);margin-bottom:.5rem}
.good{font-size:.88rem;color:var(--ink-500);background:var(--sunken);border-radius:3px;padding:.5rem .7rem;margin-bottom:1rem}
.good span,.confidence span{display:block;font-family:Archivo,sans-serif;font-size:.62rem;font-weight:650;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-400);margin-bottom:.15rem}
.confidence{font-size:.85rem;border-left:3px solid var(--line-strong);padding:.35rem 0 .35rem .8rem;margin:.6rem 0 0}
.conf-deterministic,.conf-stable{border-left-color:var(--ok)}
.conf-variable{border-left-color:var(--warn)}
.conf-unstable{border-left-color:var(--stop)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem;margin:0 0 1.2rem}
.card{background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:1rem 1.1rem}
.card p{font-size:.88rem;margin-bottom:.5rem;color:var(--ink-500)}
.card p:last-child{margin-bottom:0}
.card .plain{font-size:.95rem;margin-bottom:.35rem}
.actual{font-family:"IBM Plex Mono",monospace;font-size:.76rem!important;color:var(--ink-700)!important;background:var(--sunken);border-radius:2px;padding:.3rem .5rem}
footer{border-top:1px solid var(--line);padding-top:1.2rem;font-size:.85rem;color:var(--ink-400)}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">`;
