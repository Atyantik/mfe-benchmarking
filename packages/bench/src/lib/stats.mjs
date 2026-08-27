/**
 * Summary statistics for repeated measurement.
 *
 * This module exists because of a specific mistake made in this repo, which is worth stating
 * where the fix lives: server throughput was reported as "Svelte serves 7-11% more requests
 * per second" on the strength of ONE run. A second run of the identical builds gave -11% and
 * -14% on the same routes. The number was not wrong; presenting a single sample as a result
 * was.
 *
 * So every figure here carries its dispersion, and a mean is never shown without one. The
 * classification below is the part that matters in a report: it decides, from the data rather
 * than from intuition, whether a difference between two stacks is something a reader may act
 * on or something the sample size cannot resolve.
 */

export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Sample standard deviation (n-1). With n=3 this is a coarse estimate and is labelled as one. */
export function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Coefficient of variation, as a percentage of the mean.
 *
 * Scale-free, which is what makes it usable across 239 metrics whose units range from bytes to
 * milliseconds to a CLS score of 0.007. A standard deviation of 3 means nothing until you know
 * whether the mean is 4 or 40 000.
 */
export function cv(xs) {
  const m = mean(xs);
  if (m === 0) return 0;
  return (stdev(xs) / Math.abs(m)) * 100;
}

/**
 * How much weight a reader may put on this metric, decided by its own dispersion.
 *
 * The thresholds are judgement, and stated so they can be argued with:
 *
 *   deterministic  under 0.5% — byte counts, node counts. Reproduces exactly; a difference of
 *                  any size is real.
 *   stable         under 3%   — main-thread times, CPU per request. A difference larger than
 *                  the spread is real.
 *   variable       under 10%  — build times, latency percentiles. Directionally useful; small
 *                  differences are not.
 *   unstable       10% or more — throughput under load. NOT comparable at this sample size,
 *                  and saying so is the whole point of measuring it three times.
 */
export function stability(cvPct) {
  if (cvPct < 0.5) return 'deterministic';
  if (cvPct < 3) return 'stable';
  if (cvPct < 10) return 'variable';
  return 'unstable';
}

/** Everything a report needs about one metric, from its raw samples. */
export function summarise(values) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (xs.length === 0) return null;
  const c = cv(xs);
  return {
    runs: xs,
    n: xs.length,
    mean: mean(xs),
    median: median(xs),
    stdev: stdev(xs),
    cvPct: c,
    min: Math.min(...xs),
    max: Math.max(...xs),
    range: Math.max(...xs) - Math.min(...xs),
    stability: stability(c),
  };
}

/**
 * Flatten a nested object to dotted paths -> number.
 *
 * Generic on purpose: the headline carries 239 numeric leaves today and will carry more. An
 * aggregator that enumerated them by hand would silently stop covering whatever was added
 * last, which is the failure mode this repo keeps finding in its own tooling.
 */
export function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'number' && Number.isFinite(child)) out[path] = child;
    else if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out);
  }
  return out;
}

/**
 * Compare one metric between two stacks.
 *
 * `resolvable` is the honest half. Two means differ by some percentage; whether that
 * percentage means anything depends on how far each one wandered across its own runs. If the
 * gap between the means is smaller than the combined spread, the correct report is "no
 * difference detected", not a number with a sign on it.
 */
export function compare(a, b) {
  if (!a || !b) return null;
  const deltaPct = a.mean === 0 ? 0 : ((b.mean - a.mean) / Math.abs(a.mean)) * 100;
  const noise = (a.stdev + b.stdev) / 2;
  const gap = Math.abs(b.mean - a.mean);
  return {
    deltaPct,
    deltaAbs: b.mean - a.mean,
    /** The gap exceeds the average spread of the two samples. */
    resolvable: gap > noise * 2 && Math.abs(deltaPct) >= 1,
  };
}
