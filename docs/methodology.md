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
| Network emulation | CDP `Network.emulateNetworkConditions` | Applied per page, since emulation attaches to a session |
| Core count | CDP `Emulation.setHardwareConcurrencyOverride` | So code adapting to `navigator.hardwareConcurrency` adapts to the profile |
| Heap ceiling | `--js-flags=--max-old-space-size` at launch | V8 reads it at startup; a running isolate's ceiling cannot be lowered |
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

### Measurement profiles

Browser measurements are taken under a **device profile**, not on the machine running the bench.
`MF_PROFILE` selects it and every archived run records which one produced its numbers.

| profile | CPU | network | cores | heap | viewport |
|---|---|---|---|---|---|
| `desktop` | none | none | host | host | reference |
| `constrained` *(default)* | 4× | Slow 4G — 1.6 Mbps ↓, 750 Kbps ↑, 150 ms RTT | 4 | 512 MB | reference |
| `mobile` | 4× | Slow 4G | 4 | 512 MB | 412×823, DPR 2.625 |

**Why network throttling matters more than it looks.** On localhost bytes are free. The first
research dataset had one stack transferring 31.6% more on its heaviest page than the other, and
both reported the same Largest Contentful Paint *to the millisecond* — because a difference in
transfer size is never paid for when there is no connection to pay it over. Under Slow 4G the
same routes range from 832 ms to 2.6 s and the byte difference has somewhere to appear. A
benchmark that measures bytes carefully and then measures their consequences where bytes are
free is measuring half a story.

**Why `constrained` and `mobile` are separate.** A narrower viewport changes which markup
renders — the header's search field is `hidden lg:block`, so at 412 px it is absent, not
smaller. Measuring cost and measuring layout are different questions, and answering both in one
profile would mean the DOM-conformance check was comparing two different documents. `mobile` is
offered for looking at the phone layout; it is not comparable to the other two.

**Time budgets scale with the profile; byte budgets do not.** A 60 ms ceiling measured on an
unthrottled workstation is not a 60 ms ceiling at 4×, and carrying it across is how a budget
starts failing for reasons unrelated to the code. `longTaskMs` is deliberately not scaled: 50 ms
is the specification's definition of a long task, not a local judgement.

**Which suites are throttled.** The ones whose measurement *is* timing or loading — `vitals` and
`behaviors`. Correctness suites (`contract`, `a11y`, `contamination`, `css`, `verify`, `hosts`,
`auth`) run unthrottled, because throttling changes only how long they take, not what they
assert.

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

- **Never compare across measurement profiles.** A throttled run and an unthrottled one describe
  different conditions; the aggregator refuses to average them.
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
