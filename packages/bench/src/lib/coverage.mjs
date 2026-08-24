/**
 * V8 precise-coverage arithmetic, shared by the waste audit and the behaviour bench.
 *
 * Extracted rather than copied because getting it wrong is silent: the naive version
 * reports ~100% for every file that merely got evaluated, which makes a coverage number
 * look excellent precisely when it is useless.
 */

/** Union of a list of [start, end) pairs. */
export function mergeRanges(list) {
  if (list.length === 0) return [];
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0].slice()];
  for (const [s, e] of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/**
 * Bytes of a script that actually executed.
 *
 * V8 ranges are NESTED, and a child range with count 0 carves a hole out of its parent.
 * Summing only the count>0 ranges therefore reports the whole file for anything that was
 * evaluated at all, because the outermost function range spans the entire script. The real
 * figure is union(count > 0) MINUS union(count === 0).
 */
export function usedJsBytes(entry) {
  const hit = [];
  const miss = [];
  for (const fn of entry.functions ?? []) {
    for (const r of fn.ranges ?? []) {
      (r.count > 0 ? hit : miss).push([r.startOffset, r.endOffset]);
    }
  }
  const covered = mergeRanges(hit);
  const holes = mergeRanges(miss);
  let total = 0;
  for (const [cs, ce] of covered) {
    let cursor = cs;
    for (const [hs, he] of holes) {
      if (he <= cursor || hs >= ce) continue;
      if (hs > cursor) total += Math.min(hs, ce) - cursor;
      cursor = Math.max(cursor, Math.min(he, ce));
    }
    if (cursor < ce) total += ce - cursor;
  }
  return total;
}

/** CSS coverage ranges are flat, not nested. */
export function usedCssBytes(ranges) {
  return (ranges ?? []).reduce((sum, r) => sum + (r.end - r.start), 0);
}
