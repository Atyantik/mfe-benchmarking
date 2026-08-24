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

## The suites

`pnpm bench` runs all of them in dependency order and prints one summary with one exit code.
Individually: `pnpm --filter @mf-eval/bench run <id>`.

| Suite | What it answers |
|---|---|
| `budget` | Does the build output fit the per-app budgets? Runs first — no stack needed, and it fails fastest. |
| `hosts` | Two applications, one origin: edge routing, cookie continuity, cross-host isolation, shared chrome, the zone's boundaries. |
| `verify` | SSR, the no-JS path, personalization, and whether the HTML is byte-identical for two visitors. |
| `independence` | Registry-driven deploy, canary by cohort, and a dead remote degrading one region rather than the site. |
| `contamination` | Does any page fetch another team's code? Network-level, so preloaded-but-unused still counts. |
| `behaviors` | The client interactivity layer end to end: size, timing, coverage, hygiene, strategy matrix. |
| `vitals` | Core Web Vitals, per document navigation AND per soft navigation. |

### One topology, not seven

`packages/bench/src/lib/topology.mjs` declares the hosts, remotes, ports, routes and the
per-route owner allow-list. Every suite imports it.

This is not tidiness. Four suites each carried their own `{ 3100: 'shell', … }` map, and when
the site grew a second host and a chrome remote all four went stale at once — **without
failing**, because an undeclared origin fell through to `'other'` and was never compared
against anything. Two entire applications were invisible to every isolation claim in the repo.
`ownerOf()` now returns `unknown:<port>` and callers treat that as a failure. Adding a host,
a remote or a route is one edit.

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

### Core Web Vitals (`vitals` suite)

Measured with **`web-vitals` v6 itself**, injected into the page — the same library RUM runs,
so the lab and the field cannot disagree about what counts as a layout shift or which
interaction INP picks. Reimplementing that by hand produces numbers that look right.

| Metric | Definition |
|---|---|
| `document.{LCP,CLS,INP,FCP,TTFB}` | Per route, median of `MF_RUNS` (default 3). Held to Google's "good" thresholds, because these pages are indexed. |
| `soft.{LCP,CLS,INP}` | Per SOFT navigation inside a zone, via `reportSoftNavs: true`. Held to a *stricter* LCP and the same INP — an authenticated page is not ranked, so these are user budgets, and LCP is cheap only because the element is a skeleton. |
| `softNavEntries` | How many `soft-navigation` entries Chrome actually recorded. A step that changes the URL without painting produces none, and an unmeasured zone looks exactly like a fast one. |

Two rules:

- **INP requires a real interaction.** The suite performs one and fails if none was rated. A
  reported "INP 0" for a page nobody touched means INP was not measured.
- **The two models are never averaged.** Document and soft-navigation vitals are separate
  tables with separate budgets. One blended number lets a slow zone hide inside a fast site.

### Multi-host topology (`hosts` suite)

| Check group | What it holds |
|---|---|
| routing | Each prefix reaches the host that owns it, identified by a response header rather than by assumption. |
| one origin | Both hosts are one origin to the browser, and the cart survives a document load between them. |
| isolation | No storefront page fetches a byte of the account application, and no account page pulls the storefront's route remotes. |
| shared chrome | Both hosts resolve the same chrome BUILD and render the same links in the same order; only the active-section marker differs. Chrome ships CSS and never JavaScript. |
| the zone | Same document throughout, real document load at the boundary, working back button, a title change per transition, no 4xx, clean console. |
| splitting | One chunk per zone route, fetched on entry; revisiting a route refetches nothing. |
| degradation | Chrome killed mid-run — both hosts must still render. **Opt-in** via `MF_DESTRUCTIVE=1`, because a bench run should never take the site down under someone. |

### Behaviours — client interactivity (`behaviors` suite)

The enhancement layer is measured per BEHAVIOUR and per INSTANCE, never as a page total. Two
instances of the same behaviour on one page are separate attachments, and averaging them hides
the slow one. Full suite in `packages/bench/src/behaviors.mjs`.

| Metric | Definition |
|---|---|
| `behavior.bytes` | Per behaviour chunk: raw / gzip -9 / brotli -q 11, read from the built manifest rather than guessed from a filename. |
| `behavior.wait` | `scan` → `due`. Time spent honouring the declared strategy. Not the author's cost. |
| `behavior.fetch` | `due` → `loaded`. Download, parse and evaluate of that one chunk. |
| `behavior.attach` | `loaded` → `attached`. The author's actual cost. Budgeted at one frame. |
| `behavior.vsFcp` | Attach time minus FCP. Must be positive: an enhancement that runs before first paint is competing with the paint. |
| `behavior.coverage` | V8 precise coverage of the chunk, computed as union(count>0) − union(count===0). A behaviour that downloads and never executes is pure waste. |
| `behavior.clsAttributed` | Layout shift whose `sources` resolve inside a `[data-behavior]` root. Page CLS says something moved; this says the enhancement moved it. |
| `behavior.longTasks` | Long tasks overlapping the attach window, so jank is attributed rather than merely observed. |
| `behavior.heap` | Retained heap after a forced GC, before and after teardown. |

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

### Behaviour assertions (pass/fail)

- every behaviour source has a built chunk, and every built chunk has a source
- every behaviour a page declares is one the workspace actually ships
- a page fetches only the behaviours its SERVER HTML declared, and a page that declares none
  fetches nothing at all
- no behaviour chunk is fetched twice; every one a page needs is preloaded in its `<head>`
- every listener registered during setup carries an abort signal, and teardown aborts it
- every page still renders and every fallback control is still usable with JavaScript disabled
- the runtime honours every loading strategy, verified by rewriting `data-behavior-when` in the
  served HTML — production runtime, production chunk, no test hooks. `interaction` additionally
  has to prove it REPLAYS the event that triggered it rather than swallowing it.

Note: the strategy matrix needs its own browser launched with local-network-access checks off.
A response fulfilled from the test process has no network address, so Chrome files the document
under the public address space and blocks every request to the loopback remotes. The other
sections run on a stock launch.

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
