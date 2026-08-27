# Methodology

How every number in this repository is produced, and what each one does not tell you.

The short version: **one command, three runs per stack, every figure printed with its
dispersion.** The long version is below, and exists because a benchmark whose method is
undocumented is a claim rather than a measurement.

```bash
MF_RUNS=3 pnpm research     # every stack, every suite, three times, then the report
pnpm report <dataset.json>  # regenerate a report without re-measuring
```

---

## Why three runs, and why dispersion is printed everywhere

This repo made the mistake the format now prevents. A single run reported that one stack served
**7–11% more requests per second**. A second run of the identical builds gave **−11% to −14%**
on the same routes. Both measurements were correct; the conclusion drawn from the first was
not, and nothing in the tooling made that visible.

So every metric now carries all of its samples, a standard deviation, and a coefficient of
variation — and is classified from that data rather than from intuition:

| class | spread | what it licenses |
|---|---|---|
| `deterministic` | under 0.5% | byte counts, element counts. A difference of any size is real. |
| `stable` | under 3% | main-thread times, CPU per request. A difference larger than the spread is real. |
| `variable` | under 10% | build times, latency tails. Directionally useful; small differences are not. |
| `unstable` | 10% or more | **not comparable at this sample size.** |

A stack-to-stack difference is reported as *resolvable* only when the gap between the two means
exceeds twice the average spread of the two samples. Everything else is reported as "within
noise", which is a result too.

Three is a compromise, not a target. It is enough to expose an unstable metric and not enough to
estimate a distribution; the `unstable` class exists to say so out loud.

---

## What one run does

1. **Build** every application from a clean `dist`, in the measured configuration
   (`MF_OPTIMIZE=1`). A stale artefact is a wrong measurement wearing the right name.
2. **Start** nine processes — runtime registry, media origin, four federated remotes, two host
   applications, edge router — and wait for every health probe.
3. **Run all sixteen suites.** A run with any failing check is discarded rather than averaged: a
   baseline is a run that passed.
4. **Archive** every raw suite report beside a manifest carrying full provenance.
5. **Stop** the stack. The next run starts cold, because a warm server with a filled cache is a
   different measurement.

---

## Instruments

| Domain | Instrument | Notes |
|---|---|---|
| Core Web Vitals | `web-vitals` v6, injected into the page | The library RUM actually uses, so lab and field cannot disagree about what counts |
| Browser CPU and memory | CDP `Performance.getMetrics` | `TaskDuration`, `ScriptDuration`, `LayoutDuration`, `RecalcStyleDuration`, `JSHeapUsedSize` |
| Long tasks / TBT | `PerformanceObserver`, Lighthouse's TBT definition | Blocking portion over 50 ms of tasks after FCP |
| Transfer size | Playwright response interception, gzip level 9 | Cold cache, one navigation |
| Code coverage | CDP JS and CSS coverage | Bytes downloaded and never executed |
| Server CPU | `process.cpuUsage()` delta, in-process | User and system split |
| Server memory | `process.memoryUsage()`, `v8.getHeapStatistics()` | Retention measured after a **forced** major collection |
| Event loop | `performance.eventLoopUtilization()`, `monitorEventLoopDelay()` | ELU is the honest saturation measure |
| GC | `PerformanceObserver`, `entryTypes: ['gc']` | Count and pause by kind |
| Load | `autocannon`, warm-up discarded | |
| Accessibility | `axe-core`, WCAG 2.1 A and AA | Every route |
| Build and loop time | Wall clock, change verified in a real browser | |

### CPU throttling

Browser measurements run in headless Chromium at **4× CPU throttling**, matching Lighthouse's
mid-range-mobile simulation. Without it every stack reports a Total Blocking Time of zero on a
modern workstation and the metric stops discriminating. Set `MF_CPU_THROTTLE=1` for unthrottled
desktop; the two are not comparable and are labelled as such.

---

## Two metrics that are easy to misread

**Total Blocking Time is not browser CPU.** It counts only the blocking portion of long tasks
*after first paint*. Both stacks in this repo hold TBT at zero on every route while doing
measurably different amounts of main-thread work. `taskMs` — total main-thread busy time — is
the figure that shows it, and script, layout and style are its largest categories but do **not**
sum to it: parsing, compositing, GC and event dispatch are main-thread work in none of them.

**DOM nodes are not DOM elements.** CDP's `Nodes` counts text and comment nodes too. Svelte
emits anchor comments around every block, so `/cart` reported 456 nodes against React's 259 and
looked like a 76% structural divergence. The element counts were 137 and 136. `domElements` is
the conformance metric; `domNodes` is a real cost but says nothing about whether two stacks
rendered the same document.

---

## Comparability rules

- **Never compare across `SPEC_VERSION`.** A different spec is a different application.
- **Never compare across catalog hashes.** A different dependency set may be measuring an
  upgrade rather than the thing under test.
- **Build times and throughput are comparable only on identical hardware.** Byte counts are not
  affected by the machine and travel freely.
- Every archived run records the spec version, catalog hash, git commit, Node and V8 versions,
  CPU model and core count, so all of the above can be checked rather than assumed.

---

## Known limits

- **Localhost.** There is no network. TTFB measures server render time; transfer sizes are what
  a browser would fetch, not what it would experience on a real connection.
- **One bundler.** Both stacks build with Rspack, so framework differences are isolated — and
  bundler differences are not measured at all.
- **A port, not two independent designs.** The second implementation reproduces the first DOM
  node for node, which is what makes the byte comparison meaningful and what makes it a weaker
  guide to idiomatic practice.
- **Synthetic interaction.** Each route gets one scripted interaction so INP is defined at all.
- **A workstation, not CI.** Recorded in every manifest, so a CI run can be told apart.
