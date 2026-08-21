---
name: mf-bench
description: "The measurement contract for this repo — what each metric means, how runs must be produced to stay comparable, and how results are recorded. Use when running the bench, adding a metric, interpreting results, or judging whether two numbers can honestly be compared."
---

# mf-bench — the measurement contract

Harness lives in `packages/bench`. The spec it measures is `spec/reference-app.md` (frozen).

## The rule that makes any of this worth doing

**Two numbers are comparable only if every held-constant variable in `spec/reference-app.md`
§ "Constant vs variable" was actually constant.** If you changed a component, a dependency version, a
build flag, or the fixture between two runs, those runs are not comparable — say so instead of
reporting a delta.

Every result record carries `SPEC_VERSION`, the catalog hash, the stack, and the config cell. Results
with different `SPEC_VERSION` values are **never** compared. Bump the spec, re-run everything.

## Metrics

### Size (static analysis of build output)

| Metric | Definition |
|---|---|
| `bytes.raw` / `.gzip` / `.brotli` | Per file. `gzip -9`, `brotli -q 11`. Never report raw alone. |
| `bytes.byOwner` | Split into `mf-runtime` / `framework` / `app` / `shared` / `css`. The split is the point — "the bundle is 200 KB" is not an actionable finding. |
| `bytes.criticalPath` | Only what a cold load of that route actually fetches, not everything on disk. |
| `bytes.duplicated` | Same module present in more than one chunk across apps — measures whether `shared` is doing its job. |

### Client runtime (Playwright + CDP)

| Metric | Definition |
|---|---|
| `ttfb`, `fcp`, `lcp`, `cls` | Standard. LCP from the largest-contentful-paint observer. |
| `tbt` | Total blocking time over the load window. The honest proxy for "does it feel janky". |
| `inp` | Measured against the § Interaction script steps, not synthetic clicks. |
| `hydrationMs` | From `mf:shell:hydrate:start` to `:end`. Per-remote where separable. |
| `remoteLoadMs` | Per remote, from `mf:remote:<name>:load:start` to `:end`. |
| `waterfall` | Full request list with start/end. This is how the Vite serial-request staircase (#1095) becomes a number rather than an anecdote. Report request **count** and **max chain depth**, not just total bytes. |
| `jsExecMs` | Script evaluation time from CDP. Separates "we shipped less" from "we ship less work". |

### Server

| Metric | Definition |
|---|---|
| `ssrMs.p50` / `.p95` | Per route, warmed. Discard the first N renders. |
| `rssAfterNSwaps` | RSS across N remote hot-swaps — reproduces the leak behind PR #4824. Report the **slope**, not a single value; a leak is a trend. |
| `revalidateMs` | Time from remote redeploy to the server serving new content. |

### Refresh and independence (assertions, not timings)

Pass/fail, recorded alongside the numbers:

- server picks up `remote@v2` with **no shell rebuild**
- client picks up `remote@v2` via `registerRemotes(force)` with **no reload**
- a brand-new remote added to the registry serves its route, shell untouched
- a route added *inside* a remote's subtree is live, shell untouched
- version-skew hydration mismatch rate, with and without version pinning in the HTML

## Producing a valid run

1. Clean build. Never measure an incremental build.
2. Production mode, source maps off, settings per `spec/reference-app.md` § Build settings.
3. Serve from a static server with fixed, realistic compression — not the dev server.
4. Discard warmup iterations. Report **median of ≥5**, plus p95 where the metric is a distribution.
5. Same machine, no other load. Record CPU throttle setting; CDP throttling must be identical or
   stated.
6. Record the catalog hash. A dependency change invalidates comparison even if nothing else moved.

## Interpreting honestly

- **Report medians with spread.** A single number with no variance is not a measurement.
- **Never compare across `SPEC_VERSION`.** No exceptions.
- **Attribute before concluding.** "Stack A is 30 KB smaller" is not a finding until you can say
  which owner (`mf-runtime` / `framework` / `app` / `shared` / `css`) the 30 KB came from.
- **State what is not held constant.** Chunking strategy genuinely cannot be equalised — the Vite
  plugin ignores `manualChunks` and owns its chunk graph. Say that next to any bundler comparison
  instead of pretending it away.
- **A failed assertion outranks a good number.** A stack that is 20 KB lighter but serves a
  placeholder instead of server-rendered content has not won anything.
- **Negative results are results.** "Islands over MF are not a standard" and "the server leaks memory
  on hot swap" are among the most useful things this repo can produce. Record them as findings, not
  as blockers to be worked around quietly.

## Adding a metric

Add it to `packages/bench`, define it in the table above, and state whether existing results remain
comparable. A new *observation* usually keeps them comparable; a change to *how an existing metric is
computed* does not — that is a `SPEC_VERSION` bump.
