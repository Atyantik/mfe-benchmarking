/**
 * SSR cost — what it takes to PRODUCE the page, not what the browser receives.
 *
 * Everything else in this repo measures the output. This measures the machine. Two stacks
 * can ship byte-identical HTML while one burns twice the CPU and holds twice the heap doing
 * it, and a comparison that only counts client bytes has answered the easier half of the
 * question. For a benchmark whose whole purpose is comparing bundlers and frameworks, that
 * half is arguably the more expensive one — client bytes are paid once per visitor, server
 * CPU is paid once per request forever.
 *
 * Method, and why each part of it is there:
 *
 *   **Warm-up is separated from steady state.** V8's JIT optimises hot paths after a few
 *   thousand executions, so the first seconds of any load test measure a compiler warming up
 *   rather than a server serving. Warm-up runs, is discarded, and only then is the
 *   measurement window opened.
 *
 *   **Server metrics are read in-process, as a delta.** CPU, heap and event-loop numbers do
 *   not exist outside the process that produced them. Each host exposes `/__metrics`, the
 *   window is reset before the run and read after it, so the numbers describe exactly the
 *   work under test.
 *
 *   **Latency is reported as percentiles, never a mean.** A mean hides the tail, and the
 *   tail is where garbage collection and event-loop saturation live — which are precisely
 *   the things that differ between stacks.
 *
 *   **Sustained-load memory growth is checked separately.** A single heap reading says
 *   nothing; the slope across a long run is what reveals a leak.
 *
 * Concurrency is deliberately modest. This runs on a developer machine and in CI alongside
 * the servers it is measuring, so the goal is a repeatable comparison between stacks, not a
 * capacity figure for a production fleet. Absolute numbers are only meaningful against
 * another run on the same hardware.
 */
import autocannon from 'autocannon';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EDGE, HOSTS, ROUTES, hostOf } from './lib/topology.mjs';
import { cookieHeader } from './lib/signin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');

/** Tunable, but the defaults are what the recorded results were produced with. */
const CONNECTIONS = Number(process.env.MF_CONNECTIONS ?? 8);
const DURATION = Number(process.env.MF_DURATION ?? 8);
const WARMUP = Number(process.env.MF_WARMUP ?? 3);

/**
 * Budgets. Absolute values are hardware-dependent; these are ceilings loose enough to pass
 * on a CI runner and tight enough to catch a regression that matters.
 */
const BUDGET = {
  /** CPU milliseconds to render one page. The number that sizes a fleet. */
  cpuPerRequestMs: 40,
  /** p99 latency under modest concurrency. */
  p99Ms: 400,
  /** Event-loop delay p99. Above this, requests are queuing behind renders. */
  loopDelayP99Ms: 120,
  /**
   * Heap retained per request, which is what a leak actually is. An absolute megabyte figure
   * is not portable between machines that serve different request counts in the same time.
   * The bug this suite found retained ~160 kB per render; 4 kB is generous headroom for
   * caches that fill and then stop.
   */
  heapPerRequestKb: 4,
  /** A single GC pause long enough to be visible in the latency tail. */
  gcPauseMs: 120,
};

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (t) => console.log(`        ${t}`);
const heading = (t) => console.log(`\n--- ${t} ${'-'.repeat(Math.max(0, 72 - t.length))}`);
const ms = (n) => `${Number(n).toFixed(1)} ms`;

const metricsUrl = (host) => `http://localhost:${host.port}/__metrics`;
/**
 * Retention sampling: forces a major GC server-side before reading memory.
 *
 * Without it this suite compared GC PHASE, not retention — the identical build reported
 * +5.31 kB and -2.07 kB retained per request on two consecutive runs.
 */
const retentionUrl = (host) => `${metricsUrl(host)}?gc=1`;

async function resetMetrics(host) {
  await fetch(`${metricsUrl(host)}/reset`, { method: 'POST' });
}
async function readMetrics(host) {
  return (await fetch(metricsUrl(host))).json();
}

/**
 * One load run against one route.
 *
 * `excludeErrorStats` keeps a single transient failure from skewing the percentiles into
 * nonsense; non-2xx responses are reported separately instead, where they are visible.
 */
function load(url, { duration, headers }) {
  return autocannon({
    url,
    connections: CONNECTIONS,
    duration,
    headers,
    excludeErrorStats: true,
    // A benchmark that follows redirects measures two responses and reports one.
    maxRedirects: 0,
  });
}

console.log('\nSSR cost - CPU, memory, heap, event loop and latency\n');
note(`${CONNECTIONS} connections, ${WARMUP}s warm-up discarded, ${DURATION}s measured`);
note('absolute numbers are hardware-dependent; compare runs on the same machine');

const SESSION = await cookieHeader();
const results = {};

// Routes worth loading: one per host, plus the heaviest page each serves.
const TARGETS = [
  { host: 'storefront', path: '/', label: 'home (hero video, 10 images)' },
  { host: 'storefront', path: '/product', label: 'catalogue (12 cards, facets)' },
  { host: 'storefront', path: '/product/p-0001', label: 'detail (gallery)' },
  { host: 'my-account', path: '/my-account', label: 'account overview (3 remote widgets)', auth: true },
];

heading('1. throughput and latency');
console.log('        route                        rps    p50      p90      p99      max   non-2xx');
for (const target of TARGETS) {
  const host = hostOf(target.host);
  const headers = target.auth ? { cookie: SESSION } : {};
  const url = EDGE + target.path;

  // Warm the JIT, then throw the numbers away.
  await load(url, { duration: WARMUP, headers });
  await resetMetrics(host);

  const run = await load(url, { duration: DURATION, headers });
  const metrics = await readMetrics(host);

  results[target.path] = { target, run: {
    rps: run.requests.average,
    p50: run.latency.p50, p90: run.latency.p90, p99: run.latency.p99, max: run.latency.max,
    non2xx: run.non2xx + run.errors,
    totalRequests: run.requests.total,
  }, metrics };

  console.log(
    `        ${target.path.padEnd(22)} ${String(Math.round(run.requests.average)).padStart(8)} ` +
      `${String(run.latency.p50).padStart(6)} ${String(run.latency.p90).padStart(8)} ` +
      `${String(run.latency.p99).padStart(8)} ${String(run.latency.max).padStart(8)} ` +
      `${String(run.non2xx + run.errors).padStart(9)}`,
  );
}
console.log('');
{
  const failed = Object.values(results).filter((r) => r.run.non2xx > 0);
  check('load', 'every request under load returns 2xx', failed.length === 0,
    failed.length ? failed.map((r) => `${r.target.path} ${r.run.non2xx}`).join(', ') : 'no errors or timeouts');
  const slow = Object.values(results).filter((r) => r.run.p99 > BUDGET.p99Ms);
  check('load', `p99 stays under ${BUDGET.p99Ms} ms at ${CONNECTIONS} connections`, slow.length === 0,
    slow.length ? slow.map((r) => `${r.target.path} ${r.run.p99} ms`).join(', ')
                : `worst p99 ${Math.max(...Object.values(results).map((r) => r.run.p99))} ms`);
}

heading('2. CPU - what one render actually costs');
console.log('        route                   cpu/req    user     system    cores   requests');
for (const [path, r] of Object.entries(results)) {
  const c = r.metrics.cpu;
  console.log(
    `        ${path.padEnd(22)} ${ms(c.perRequestMs ?? 0).padStart(9)} ${ms(c.userMs).padStart(9)} ` +
      `${ms(c.systemMs).padStart(9)} ${String(c.coresUsed).padStart(8)} ${String(r.metrics.requests).padStart(10)}`,
  );
}
console.log('');
{
  const hungry = Object.entries(results).filter(([, r]) => (r.metrics.cpu.perRequestMs ?? 0) > BUDGET.cpuPerRequestMs);
  check('cpu', `a render costs under ${BUDGET.cpuPerRequestMs} ms of CPU`, hungry.length === 0,
    hungry.length ? hungry.map(([p, r]) => `${p} ${ms(r.metrics.cpu.perRequestMs)}`).join(', ')
                  : `worst ${ms(Math.max(...Object.values(results).map((r) => r.metrics.cpu.perRequestMs ?? 0)))} per render`);
  // System time much above user time usually means the process is doing I/O it need not do.
  const syscallHeavy = Object.entries(results).filter(([, r]) => r.metrics.cpu.systemMs > r.metrics.cpu.userMs);
  check('cpu', 'work is dominated by user time, not system calls', syscallHeavy.length === 0,
    syscallHeavy.length ? syscallHeavy.map(([p]) => p).join(', ') : 'rendering, not syscall overhead');
}

heading('3. memory and heap');
console.log('        route                     rss   heapUsed  heapTotal  external   headroom');
for (const [path, r] of Object.entries(results)) {
  const m = r.metrics.memory;
  console.log(
    `        ${path.padEnd(22)} ${String(m.rssMb).padStart(8)} ${String(m.heapUsedMb).padStart(10)} ` +
      `${String(m.heapTotalMb).padStart(10)} ${String(m.externalMb).padStart(9)} ${String(r.metrics.heap.headroom).padStart(10)}`,
  );
}
console.log('');
{
  const tight = Object.entries(results).filter(([, r]) => r.metrics.heap.headroom < 0.5);
  check('memory', 'the heap stays well below its limit', tight.length === 0,
    tight.length ? tight.map(([p, r]) => `${p} headroom ${r.metrics.heap.headroom}`).join(', ')
                 : `worst headroom ${Math.min(...Object.values(results).map((r) => r.metrics.heap.headroom))}`);
}

heading('4. event loop - is the server saturated, and does it queue');
console.log('        route                     ELU   delay p50  delay p90  delay p99  delay max');
for (const [path, r] of Object.entries(results)) {
  const e = r.metrics.eventLoop;
  console.log(
    `        ${path.padEnd(22)} ${String(e.utilization).padStart(8)} ${ms(e.delay.p50Ms).padStart(10)} ` +
      `${ms(e.delay.p90Ms).padStart(10)} ${ms(e.delay.p99Ms).padStart(10)} ${ms(e.delay.maxMs).padStart(10)}`,
  );
}
console.log('');
{
  const queuing = Object.entries(results).filter(([, r]) => r.metrics.eventLoop.delay.p99Ms > BUDGET.loopDelayP99Ms);
  check('eventLoop', `delay p99 stays under ${BUDGET.loopDelayP99Ms} ms`, queuing.length === 0,
    queuing.length ? queuing.map(([p, r]) => `${p} ${ms(r.metrics.eventLoop.delay.p99Ms)}`).join(', ')
                   : 'requests are not queuing behind renders');
  /**
   * ELU qualifies the other numbers; it is not a pass/fail on its own.
   *
   * A load test at fixed concurrency is MEANT to saturate a single-process server, so a
   * utilisation near 1.0 is the expected state and failing on it would fail every correct
   * run. What it tells you is how to read the latency: near 1.0 the numbers are
   * capacity-bound (add processes), well below it they are latency-bound (the render itself
   * is slow). The first version of this check asserted the opposite and was simply wrong.
   *
   * The assertion that does mean something is that a saturated loop still serves promptly —
   * saturated AND queuing is the failure, and queuing has its own check above.
   */
  const saturated = Object.entries(results).filter(([, r]) => r.metrics.eventLoop.utilization > 0.95);
  note(saturated.length
    ? `${saturated.map(([p]) => p).join(', ')} ran capacity-bound at this concurrency — read latency as throughput-limited`
    : 'every route stayed latency-bound at this concurrency');
  const wedged = Object.entries(results).filter(
    ([, r]) => r.metrics.eventLoop.utilization > 0.95 && r.metrics.eventLoop.delay.p99Ms > BUDGET.loopDelayP99Ms,
  );
  check('eventLoop', 'a saturated loop still serves promptly', wedged.length === 0,
    wedged.length
      ? wedged.map(([p, r]) => `${p} ELU ${r.metrics.eventLoop.utilization} delay p99 ${ms(r.metrics.eventLoop.delay.p99Ms)}`).join(', ')
      : 'no route is both saturated and queuing');
}

heading('5. garbage collection - the latency tail');
console.log('        route                    count  total pause   max pause   by kind');
for (const [path, r] of Object.entries(results)) {
  const g = r.metrics.gc;
  const kinds = Object.entries(g.byKind).map(([k, v]) => `${k}:${v.count}`).join(' ') || '-';
  console.log(
    `        ${path.padEnd(22)} ${String(g.count).padStart(7)} ${ms(g.totalPauseMs).padStart(12)} ` +
      `${ms(g.maxPauseMs).padStart(11)}   ${kinds}`,
  );
}
console.log('');
{
  const stalls = Object.entries(results).filter(([, r]) => r.metrics.gc.maxPauseMs > BUDGET.gcPauseMs);
  check('gc', `no single collection pauses longer than ${BUDGET.gcPauseMs} ms`, stalls.length === 0,
    stalls.length ? stalls.map(([p, r]) => `${p} ${ms(r.metrics.gc.maxPauseMs)}`).join(', ')
                  : `worst pause ${ms(Math.max(...Object.values(results).map((r) => r.metrics.gc.maxPauseMs)))}`);
}

heading('6. resolution caching - modules are resolved once, not per request');
{
  /**
   * The regression guard for the most expensive bug this suite has found.
   *
   * Route descriptors and slot placeholders do not change between requests, but the server
   * re-resolved all nine of them on every render: 4.6 ms of CPU per page, 160 kB of heap
   * retained per render, and a process past three gigabytes under sustained load. Caching the
   * resolved set cut CPU per render six-fold and throughput rose five-fold.
   *
   * Counting resolutions is the only check that notices this. Every byte-level and latency
   * assertion in the repo passed happily while it was happening.
   */
  const readLoads = async () => {
    const res = await fetch('http://localhost:3110/__loads');
    if (!res.ok) return null;
    const loads = await res.json();
    return { loads, total: Object.values(loads).reduce((a, b) => a + b, 0) };
  };

  const first = await readLoads();
  if (!first) {
    check('caching', 'the host reports how often it resolves remote modules', false, 'endpoint unavailable');
  } else {
    /**
     * The honest test is a DELTA, not a ratio.
     *
     * A count alone cannot distinguish a cache from a coincidence: different pages need
     * different slot sets, so several resolutions of the same module are correct — the
     * account overview resolves three placeholders the catalogue never asks for. Comparing
     * the count against the request count therefore fails on correct behaviour, which is
     * exactly what the first version of this check did.
     *
     * Running more traffic through routes already visited and asserting the count does not
     * move is the assertion that actually means "cached".
     */
    await resetMetrics(hostOf('storefront'));
    for (const path of ['/', '/product', '/product/p-0001']) {
      await load(EDGE + path, { duration: 2, headers: {} });
    }
    const second = await readLoads();
    const servedSince = (await readMetrics(hostOf('storefront'))).requests;
    const delta = (second?.total ?? 0) - first.total;

    note(`${first.total} resolution(s) of ${Object.keys(first.loads).length} module(s) since boot`);
    note(`${servedSince} further requests through routes already visited added ${delta}`);
    check('caching', 'serving a route again resolves nothing again', delta === 0,
      delta === 0
        ? `${servedSince} requests, zero new resolutions`
        : `${delta} new resolutions across ${servedSince} requests — the cache is not holding`);
  }
}

heading('7. sustained load - does memory settle or climb');
{
  /**
   * A single heap reading says nothing. This runs the same route repeatedly and compares the
   * heap after each block, because a leak is a SLOPE. The first block is discarded: caches
   * and lazily-initialised module state fill on first use, and calling that a leak would fail
   * every correct server.
   */
  const host = hostOf('storefront');
  const blocks = 4;
  const samples = [];
  await resetMetrics(host);
  for (let i = 0; i < blocks; i += 1) {
    await load(`${EDGE}/product`, { duration: 4, headers: {} });
    const m = await fetch(retentionUrl(host)).then((r) => r.json());
    samples.push({
      block: i + 1,
      heapUsedMb: m.memory.heapUsedMb,
      rssMb: m.memory.rssMb,
      requests: m.requests,
      collected: m.collected,
    });
  }
  for (const s of samples) {
    note(`block ${s.block}  heapUsed ${String(s.heapUsedMb).padStart(7)} MB   rss ${String(s.rssMb).padStart(7)} MB   ${s.requests} requests served`);
  }
  /**
   * Judge retention PER REQUEST, and require the growth to be monotonic.
   *
   * An absolute megabyte ceiling is not portable: a fast machine serves several times more
   * requests in the same wall clock, so the same code retains more in total while retaining
   * the same amount per request. Held at 40 MB this passed locally (where the heap actually
   * shrank) and failed on CI for identical code.
   *
   * A leak has two signatures that hardware does not change: it retains a roughly constant
   * amount per request, and it grows every block. Noise does neither — it fluctuates, and it
   * frequently goes down when a collection lands mid-block.
   *
   * Both signatures are only readable if the samples measure RETENTION. `heapUsed` on its own
   * measures whatever V8 has not collected yet, which on a four-sample series makes the
   * direction close to a coin flip: the identical build reported +5.31 kB and -2.07 kB per
   * request on two consecutive runs, and the first of those failed the build. The samples
   * above are taken through `?gc=1`, which forces a major collection first, so what is left
   * is what is genuinely held.
   */
  // A reading that was not preceded by a collection is not retention, and must not be judged
  // as though it were — say so rather than quietly reporting a weaker number as a strong one.
  const collected = samples.every((s) => s.collected);
  check('sustained', 'memory is sampled after a forced collection', collected,
    collected ? 'figures are retention, not allocation' : 'server could not force a GC — readings are noisy');

  const settled = samples.slice(1);
  const first = settled[0];
  const last = settled.at(-1);
  const growthMb = (last?.heapUsedMb ?? 0) - (first?.heapUsedMb ?? 0);
  const requests = (last?.requests ?? 0) - (first?.requests ?? 0);
  const perRequestKb = requests > 0 ? (growthMb * 1024) / requests : 0;
  const monotonic = settled.every((s, i) => i === 0 || s.heapUsedMb >= (settled[i - 1]?.heapUsedMb ?? 0));

  results.sustained = {
    samples,
    growthMb: Number(growthMb.toFixed(2)),
    perRequestKb: Number(perRequestKb.toFixed(3)),
    monotonic,
  };
  note(`${growthMb.toFixed(1)} MB across ${requests} requests = ${perRequestKb.toFixed(2)} kB retained per request` +
    `${monotonic ? ', growing every block' : ', not monotonic — consistent with collection noise'}`);
  check('sustained',
    `heap retention stays under ${BUDGET.heapPerRequestKb} kB per request, or is not a trend`,
    perRequestKb < BUDGET.heapPerRequestKb || !monotonic,
    monotonic
      ? `${perRequestKb.toFixed(2)} kB per request across ${settled.length} blocks, growing every block`
      : `${perRequestKb.toFixed(2)} kB per request, but the series is not monotonic — no leak signature`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.log('\nfailing:');
  for (const f of failed) console.log(`  - [${f.section}] ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  process.exitCode = 1;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'ssr.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      method: { connections: CONNECTIONS, warmupSeconds: WARMUP, durationSeconds: DURATION },
      budget: BUDGET,
      hosts: HOSTS.map((h) => ({ name: h.name, port: h.port })),
      routes: Object.fromEntries(Object.entries(results).filter(([k]) => k !== 'sustained')),
      sustained: results.sustained,
      checks,
    },
    null,
    2,
  )}\n`,
);
console.log('\nwrote results/ssr.json');
void ROUTES;
