/**
 * What each metric IS, how it was captured, and what it does not tell you.
 *
 * A number in a research report without its instrument is an anecdote. This dictionary is what
 * lets the generated report say, for every figure it prints, which tool produced it, under what
 * conditions, and what it excludes — rather than leaving a reader to infer that from a name.
 *
 * `path` is matched against the dotted metric paths the aggregator produces. The first pattern
 * that matches wins, so specific entries precede general ones.
 */
export const DICTIONARY = [
  // ---- page weight ------------------------------------------------------
  {
    match: /^perRoute\.[^.]+\.totalKbGzip$/,
    label: 'Total transfer',
    unit: 'kB gzip',
    instrument: 'Playwright response interception; every response body gzipped at level 9',
    how: 'Sum of every resource the page fetched, including HTML, JS, CSS, photographs and video. Cold cache, one navigation.',
    caveat: 'Media dominates on image-heavy routes; read the CSS and per-owner rows to separate code from content.',
    lowerIsBetter: true,
  },
  {
    match: /^perRoute\.[^.]+\.cssKbGzip$/,
    label: 'CSS transfer',
    unit: 'kB gzip',
    instrument: 'Chrome DevTools Protocol CSS coverage',
    how: 'Every stylesheet the document fetched, gzipped at level 9.',
    lowerIsBetter: true,
  },
  {
    match: /^perRoute\.[^.]+\.byOwnerKbGzip\./,
    label: 'Transfer by owning application',
    unit: 'kB gzip',
    instrument: 'Playwright response interception, attributed by origin and edge path prefix',
    how: 'Each response is attributed to the application that served it, so a page can be read as a bill of materials per team.',
    caveat: 'An origin nobody declared is a hard failure rather than an "other" bucket.',
    lowerIsBetter: true,
  },
  {
    match: /^perRoute\.[^.]+\.leakedKbGzip$/,
    label: 'Foreign bytes',
    unit: 'kB gzip',
    instrument: 'Playwright response interception against the route ownership table',
    how: 'Bytes fetched from a remote that has no business on this route. Zero is the only acceptable value.',
    lowerIsBetter: true,
  },
  { match: /^perRoute\.[^.]+\.requests$/, label: 'Requests', unit: 'count', instrument: 'Playwright', how: 'Resources fetched for one cold navigation.', lowerIsBetter: true },
  { match: /^perRoute\.[^.]+\.cssSheets$/, label: 'Stylesheets', unit: 'count', instrument: 'Playwright', how: 'Distinct stylesheets the document fetched.', lowerIsBetter: true },

  // ---- core web vitals --------------------------------------------------
  {
    match: /\.LCP$/,
    label: 'Largest Contentful Paint',
    unit: 'ms',
    instrument: 'web-vitals v6, injected into the page',
    how: 'The library Real User Monitoring actually uses, so the lab and the field cannot disagree about what counts. Median of the runs.',
    caveat: 'Measured at 4x CPU throttling, which raises it relative to an unthrottled desktop.',
    lowerIsBetter: true,
  },
  { match: /\.CLS$/, label: 'Cumulative Layout Shift', unit: 'score', instrument: 'web-vitals v6', how: 'Unitless. Google calls under 0.1 good.', lowerIsBetter: true },
  { match: /\.INP$/, label: 'Interaction to Next Paint', unit: 'ms', instrument: 'web-vitals v6', how: 'Requires a real interaction; the suite performs one per route rather than reporting INP for a page nobody touched.', lowerIsBetter: true },
  {
    match: /\.TBT$/,
    label: 'Total Blocking Time',
    unit: 'ms',
    instrument: 'PerformanceObserver longtask entries, Lighthouse definition',
    how: 'The blocking portion (over 50 ms) of every long task after First Contentful Paint, at 4x CPU throttling.',
    caveat: 'Counts ONLY long tasks after FCP. A stack can hold TBT at zero and still do materially more main-thread work — see taskMs.',
    lowerIsBetter: true,
  },
  { match: /\.FCP$/, label: 'First Contentful Paint', unit: 'ms', instrument: 'web-vitals v6', how: 'First paint of any content.', lowerIsBetter: true },
  { match: /\.TTFB$/, label: 'Time to First Byte', unit: 'ms', instrument: 'web-vitals v6', how: 'Localhost, so this measures server render time rather than network.', caveat: 'Not comparable to a production TTFB; there is no network here.', lowerIsBetter: true },

  // ---- browser processor ------------------------------------------------
  {
    match: /\.taskMs$/,
    label: 'Main-thread busy time',
    unit: 'ms',
    instrument: 'CDP Performance.getMetrics — TaskDuration',
    how: 'Total main-thread work for the navigation at 4x CPU throttling. The closest single number to "browser CPU".',
    caveat: 'Script, layout and style are its largest categories and do NOT sum to it: parsing, compositing, GC and event dispatch are main-thread work in none of them.',
    lowerIsBetter: true,
  },
  { match: /\.scriptMs$/, label: 'Script execution', unit: 'ms', instrument: 'CDP Performance.getMetrics — ScriptDuration', how: 'Compiling and running JavaScript, at 4x throttling.', lowerIsBetter: true },
  { match: /\.layoutMs$/, label: 'Layout', unit: 'ms', instrument: 'CDP Performance.getMetrics — LayoutDuration', how: 'Geometry calculation, at 4x throttling.', lowerIsBetter: true },
  { match: /\.styleMs$/, label: 'Style recalculation', unit: 'ms', instrument: 'CDP Performance.getMetrics — RecalcStyleDuration', how: 'Matching selectors and computing styles, at 4x throttling.', lowerIsBetter: true },
  { match: /\.jsHeapMb$/, label: 'JS heap (browser)', unit: 'MB', instrument: 'CDP Performance.getMetrics — JSHeapUsedSize', how: 'What the document holds in the renderer after the navigation settles.', lowerIsBetter: true },
  {
    match: /\.domElements$/,
    label: 'DOM elements',
    unit: 'count',
    instrument: 'document.querySelectorAll("*").length, in the page',
    how: 'BODY elements only. The frozen spec holds DOM structure constant, so this is the conformance check: a divergence means the two stacks stopped rendering the same document.',
    caveat: 'Excludes <head>, because stylesheet and preload links are chunking rather than structure — counting them once made a one-<link> difference look like a structural one. See headLinks.',
    lowerIsBetter: true,
  },
  {
    match: /\.headLinks$/,
    label: 'Head links',
    unit: 'count',
    instrument: 'document.head.querySelectorAll("link").length',
    how: 'Stylesheets and preload hints in the document head. A real cost and a real difference between bundlers, kept out of the structural count on purpose.',
    lowerIsBetter: true,
  },
  {
    match: /\.domNodes$/,
    label: 'DOM nodes (all types)',
    unit: 'count',
    instrument: 'CDP Performance.getMetrics — Nodes',
    how: 'Every node: elements, text and comments. A real cost, since the browser walks them.',
    caveat: 'NOT a conformance metric. Svelte emits anchor comments around every block, so this reads 76% higher on a page whose element counts differ by one. Use domElements to compare structure.',
    lowerIsBetter: true,
  },
  { match: /\.longTasks$/, label: 'Long tasks', unit: 'count', instrument: 'PerformanceObserver', how: 'Main-thread tasks over 50 ms, at 4x throttling.', lowerIsBetter: true },

  // ---- server -----------------------------------------------------------
  {
    match: /^server\.[^.]+\.rps$/,
    label: 'Throughput',
    unit: 'req/s',
    instrument: 'autocannon, warm-up discarded',
    how: 'Sustained request rate against one route with the server already warm.',
    caveat: 'The least reproducible figure in this report. It reversed sign between two runs of identical builds, which is why dispersion is printed beside every mean.',
    lowerIsBetter: false,
  },
  {
    match: /^server\.[^.]+\.cpuPerRequestMs$/,
    label: 'Server CPU per request',
    unit: 'ms',
    instrument: 'process.cpuUsage() delta, in-process',
    how: 'User plus system CPU time divided by requests served in the same window. The number that decides how many machines a stack needs.',
    lowerIsBetter: true,
  },
  { match: /^server\.[^.]+\.cpuUserMs$/, label: 'Server CPU — user', unit: 'ms', instrument: 'process.cpuUsage()', how: 'Time in application code across the load window.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.cpuSystemMs$/, label: 'Server CPU — system', unit: 'ms', instrument: 'process.cpuUsage()', how: 'Time in kernel calls — sockets, filesystem — across the load window.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.coresUsed$/, label: 'Cores used', unit: 'cores', instrument: 'CPU time / wall time', how: 'Effective parallelism during the load window.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.rssMb$/, label: 'Resident memory', unit: 'MB', instrument: 'process.memoryUsage().rss', how: 'Total resident set of the host process under load.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.heapUsedMb$/, label: 'V8 heap used', unit: 'MB', instrument: 'process.memoryUsage().heapUsed', how: 'Sampled under load; not collected first, so it reflects allocation as well as retention.', caveat: 'Retention is measured separately under sustainedHeap, after a forced collection.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.eventLoopUtilization$/, label: 'Event-loop utilisation', unit: 'ratio', instrument: 'perf_hooks.performance.eventLoopUtilization()', how: 'Fraction of the window the loop was active. The honest measure of saturation.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.gcPauseMs$/, label: 'GC pause total', unit: 'ms', instrument: 'PerformanceObserver, entryTypes gc', how: 'Summed collection pauses across the load window.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.p50Ms$/, label: 'Latency p50', unit: 'ms', instrument: 'autocannon', how: 'Median response time under sustained load.', lowerIsBetter: true },
  { match: /^server\.[^.]+\.p99Ms$/, label: 'Latency p99', unit: 'ms', instrument: 'autocannon', how: 'Tail response time under sustained load.', lowerIsBetter: true },
  {
    match: /^sustainedHeap\.perRequestKb$/,
    label: 'Heap retained per request',
    unit: 'kB',
    instrument: 'process.memoryUsage() after a forced major collection',
    how: 'Four load blocks; the heap is read after forcing a GC so the figure is retention rather than allocation. A leak has two signatures hardware cannot change: constant retention per request, and growth every block.',
    lowerIsBetter: true,
  },

  // ---- developer experience ---------------------------------------------
  { match: /^dx\.coldBuildMs$/, label: 'Cold build', unit: 'ms', instrument: 'Wall clock around each app build', how: 'No dist, no bundler cache. Every app built sequentially.', caveat: 'The most hardware-sensitive figure here; comparable only on identical machines.', lowerIsBetter: true },
  { match: /^dx\.warmBuildMs$/, label: 'Warm build', unit: 'ms', instrument: 'Wall clock', how: 'dist removed, bundler cache intact.', lowerIsBetter: true },
  { match: /^dx\.incrementalMs$/, label: 'Incremental rebuild', unit: 'ms', instrument: 'Wall clock, median of three', how: 'One source file touched, one app rebuilt. The number a developer meets most often.', lowerIsBetter: true },
  { match: /^dx\.startupMs$/, label: 'Stack startup', unit: 'ms', instrument: 'Wall clock until every health probe answers', how: 'Nine processes: registry, media, four remotes, two hosts, edge.', lowerIsBetter: true },
  { match: /^dx\.unblockedMs$/, label: 'Clean tree to rendering page', unit: 'ms', instrument: 'Wall clock', how: 'Cold build plus startup plus first page render. What a new joiner waits through once, and CI waits through every run.', lowerIsBetter: true },
  { match: /^dx\.editToBrowserMs$/, label: 'Edit to browser', unit: 'ms', instrument: 'Wall clock, change confirmed in a real browser', how: 'A real edit, rebuild, restart, and the change verified present in the DOM.', caveat: 'Neither stack has a watch mode; this is a full rebuild in both.', lowerIsBetter: true },
  { match: /^dx\.(lintMs|typecheckMs|testMs)$/, label: 'Pre-commit gate', unit: 'ms', instrument: 'Wall clock', how: 'Whole-workspace lint, typecheck and unit tests.', lowerIsBetter: true },
  { match: /^dx\.cacheSaving$/, label: 'Bundler cache saving', unit: 'ratio', instrument: 'Derived: 1 - warm/cold', how: 'How much of a cold build the persistent cache removes.', lowerIsBetter: false },
  { match: /^dx\.perApp\./, label: 'Per-app build time', unit: 'ms', instrument: 'Wall clock', how: 'One app, built alone.', lowerIsBetter: true },

  // ---- composition ------------------------------------------------------
  { match: /^behaviors\./, label: 'Behaviour size', unit: 'bytes', instrument: 'Built chunk, gzip level 9', how: 'A behaviour is vanilla TypeScript attached to server-rendered markup; no framework is involved in either stack.', lowerIsBetter: true },
  { match: /^widgets\./, label: 'Widget cost', unit: 'bytes', instrument: 'Playwright response interception on the account overview', how: 'What each contributed widget costs the page that hosts it.', lowerIsBetter: true },
  { match: /^cssModules\.coverageRatio$/, label: 'CSS coverage', unit: 'ratio', instrument: 'CDP CSS coverage', how: 'Fraction of downloaded CSS the page actually applies.', lowerIsBetter: false },
  { match: /^cssModules\./, label: 'CSS Modules', unit: 'count', instrument: 'Static analysis of built stylesheets', how: 'Emitted identifiers and the collisions a bare [local]-[hash] would have produced.', lowerIsBetter: false },
];

const FALLBACK = {
  label: null,
  unit: '',
  instrument: 'see the raw suite report',
  how: 'Not yet described in the metric dictionary.',
  lowerIsBetter: true,
};

export function describe(path) {
  const entry = DICTIONARY.find((d) => d.match.test(path));
  return entry ? { ...FALLBACK, ...entry } : { ...FALLBACK };
}
