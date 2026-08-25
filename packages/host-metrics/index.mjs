/**
 * Server metrics — what an SSR host costs to run.
 *
 * Plain ESM, no TypeScript: this is imported directly by each host's `server.mjs`, which
 * runs outside the bundle and cannot require a `.ts` source.
 *
 * Bytes and Core Web Vitals describe what the browser receives. They say nothing about what
 * it took to produce, and for a rendering server that is half the question: two stacks can
 * ship identical HTML while one of them burns twice the CPU and holds twice the heap doing
 * it. Comparing frameworks or bundlers on client bytes alone answers the easier half.
 *
 * Everything here is collected in-process, because that is the only place it exists:
 *
 *   cpu          `process.cpuUsage()` — user and system microseconds, as a delta. Divided by
 *                requests served, this is the number that decides how many machines a stack
 *                needs.
 *   memory       rss, heapUsed, heapTotal, external, arrayBuffers. Growth ACROSS a sustained
 *                run is what reveals a leak; a single reading reveals nothing.
 *   heap         `v8.getHeapStatistics()`, including the limit — headroom matters as much as
 *                usage, and only one of the two shows up in a graph of heapUsed.
 *   eventLoop    utilization (ELU) and delay percentiles. ELU is the honest measure of "is
 *                this server saturated"; delay percentiles are what a slow render feels like
 *                to the request queued behind it.
 *   gc           count and total pause, by kind. Pauses are the tail of the latency
 *                distribution, and they are invisible in a mean.
 *
 * Sampling is started at boot and read as a DELTA, so a measurement brackets exactly the
 * work under test rather than everything since the process started.
 */
import { PerformanceObserver, monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { getHeapStatistics, setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

/**
 * Force a major collection, so a heap reading measures what is RETAINED rather than what has
 * merely not been collected yet.
 *
 * This exists because the leak check built on `heapUsed` was flaky, and flaky in the worst
 * way: two runs of the identical build reported +5.31 kB and -2.07 kB retained per request.
 * Neither number was wrong. `heapUsed` samples wherever V8 happens to be in its GC cycle, so
 * on a four-sample series the direction is close to a coin flip — and a leak check that fails
 * one run in six teaches everyone to re-run it, which is worse than not having it.
 *
 * `global.gc` normally needs `--expose-gc` on the command line. Enabling the flag at runtime
 * keeps the servers bootable by any means (`pnpm dev`, the stack script, a bare `node`)
 * without every entry point having to remember it.
 *
 * Deliberately opt-in per request: a forced major GC costs milliseconds and would contaminate
 * the CPU and pause numbers that the same endpoint reports.
 */
let forceGc = null;
function collectGarbage() {
  if (forceGc === null) {
    try {
      setFlagsFromString('--expose-gc');
      forceGc = runInNewContext('gc');
    } catch {
      forceGc = false; // not available; readings stay honest, just noisier
    }
  }
  if (typeof forceGc !== 'function') return false;
  // Twice: the first pass can resurrect objects through finalizers and weak callbacks, and
  // what survives two consecutive collections is what is genuinely held.
  forceGc();
  forceGc();
  return true;
}

/** GC kinds are numeric constants; names make a report readable. */
const GC_KIND = {
  1: 'minor',
  2: 'major',
  4: 'incremental',
  8: 'weakCallbacks',
  16: 'majorSnapshot',
};

const MB = 1024 * 1024;
const round = (n, places = 2) => Number(n.toFixed(places));

/**
 * Start collecting. Call once, at boot, before serving anything.
 *
 * The event-loop delay histogram and the GC observer both run for the life of the process.
 * Their cost is a sampling timer and an observer callback — small enough that leaving them on
 * is cheaper than the mistake of measuring a server that behaves differently when watched.
 */
export function startMetrics() {
  const loopDelay = monitorEventLoopDelay({ resolution: 10 });
  loopDelay.enable();

  let gcCount = 0;
  let gcTotalMs = 0;
  let gcMaxMs = 0;
  let gcByKind = {};

  const gcObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const kind = GC_KIND[entry.detail?.kind ?? 0] ?? 'other';
      gcCount += 1;
      gcTotalMs += entry.duration;
      gcMaxMs = Math.max(gcMaxMs, entry.duration);
      const bucket = (gcByKind[kind] ??= { count: 0, totalMs: 0 });
      bucket.count += 1;
      bucket.totalMs += entry.duration;
    }
  });
  gcObserver.observe({ entryTypes: ['gc'] });

  let cpuBase = process.cpuUsage();
  let eluBase = performance.eventLoopUtilization();
  let startedAt = performance.now();
  let requests = 0;

  return {
    countRequest() {
      requests += 1;
    },

    /**
     * @param {{collect?: boolean}} [options] `collect` forces a major GC first, making the
     *   memory figures retention rather than allocation. Costs a few ms and perturbs the CPU
     *   and pause numbers in the same response, so ask for it only when memory is the subject.
     */
    snapshot(options = {}) {
      const collected = options.collect ? collectGarbage() : false;
      const windowMs = performance.now() - startedAt;
      const cpu = process.cpuUsage(cpuBase);
      const elu = performance.eventLoopUtilization(eluBase);
      const mem = process.memoryUsage();
      const heap = getHeapStatistics();

      const userMs = cpu.user / 1000;
      const systemMs = cpu.system / 1000;
      const totalMs = userMs + systemMs;

      return {
        windowMs: round(windowMs),
        requests,
        /** Whether the memory figures below are post-collection. */
        collected,
        cpu: {
          userMs: round(userMs),
          systemMs: round(systemMs),
          totalMs: round(totalMs),
          perRequestMs: requests > 0 ? round(totalMs / requests, 3) : null,
          coresUsed: windowMs > 0 ? round(totalMs / windowMs, 3) : 0,
        },
        memory: {
          rssMb: round(mem.rss / MB),
          heapUsedMb: round(mem.heapUsed / MB),
          heapTotalMb: round(mem.heapTotal / MB),
          externalMb: round(mem.external / MB),
          arrayBuffersMb: round(mem.arrayBuffers / MB),
        },
        heap: {
          usedMb: round(heap.used_heap_size / MB),
          totalMb: round(heap.total_heap_size / MB),
          limitMb: round(heap.heap_size_limit / MB),
          headroom: round(1 - heap.used_heap_size / heap.heap_size_limit, 3),
        },
        eventLoop: {
          utilization: round(elu.utilization, 4),
          activeMs: round(elu.active),
          idleMs: round(elu.idle),
          // The histogram reports nanoseconds.
          delay: {
            meanMs: round(loopDelay.mean / 1e6, 3),
            p50Ms: round(loopDelay.percentile(50) / 1e6, 3),
            p90Ms: round(loopDelay.percentile(90) / 1e6, 3),
            p99Ms: round(loopDelay.percentile(99) / 1e6, 3),
            maxMs: round(loopDelay.max / 1e6, 3),
          },
        },
        gc: {
          count: gcCount,
          totalPauseMs: round(gcTotalMs),
          maxPauseMs: round(gcMaxMs),
          byKind: Object.fromEntries(
            Object.entries(gcByKind).map(([k, v]) => [k, { count: v.count, totalMs: round(v.totalMs) }]),
          ),
        },
      };
    },

    reset() {
      cpuBase = process.cpuUsage();
      eluBase = performance.eventLoopUtilization();
      startedAt = performance.now();
      requests = 0;
      loopDelay.reset();
      gcCount = 0;
      gcTotalMs = 0;
      gcMaxMs = 0;
      gcByKind = {};
    },
  };
}
