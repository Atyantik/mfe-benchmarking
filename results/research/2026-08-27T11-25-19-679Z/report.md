# Module Federation under two frameworks

**A measured comparison of the same application implemented in React and in Svelte.**

Generated 2026-08-27T11:25:19.679Z · 3 independent runs of each stack · SPEC_VERSION 4 · catalog `c3b6a5fafb68`

---

## 1. What this report is

One application — ten routes, two host applications, four federated remotes — implemented
twice against a frozen specification, and measured by the same sixteen suites. Neither
implementation is a demo written to flatter its framework: both satisfy the same DOM
structure, the same fixture data, the same test-id contract and the same accessibility
standard, and both must pass every check before any number here is recorded.

Every figure is the mean of **3 independent runs**, each a full rebuild against a
freshly started stack. Every figure is printed with all of its samples and its dispersion,
and each is labelled with whether the sample supports a comparison at all.

> **Why dispersion is printed everywhere.** An earlier version of this comparison reported
> that one stack served 7–11% more requests per second, on the strength of a single run. A
> second run of the identical builds gave −11% to −14% on the same routes. Both measurements
> were correct; the conclusion was not. Nothing in the tooling had made that visible, and
> this report format is the response.

## 2. Environment and provenance

| | |
|---|---|
| **Measurement profile** | **Constrained device on Slow 4G, reference viewport** |
| Profile detail | Lighthouse mobile conditions at the reference viewport: 4x CPU slowdown, 1.6 Mbps down, 750 Kbps up, 150 ms RTT, four cores, 512 MB heap cap. |
| Machine | Apple M4 Pro, 14 cores, 48 GB |
| Platform | darwin-arm64 |
| Node | v24.11.1 (V8 13.6.233.10-node.28) |
| CI | no — a developer workstation |
| Spec version | 4 |
| Dependency catalog | `c3b6a5fafb68` |
| Commit | `2c02f82` on `main` |
| Runs per stack | 3 |

Both stacks were measured on the same machine, from the same commit, against the same
dependency catalog, minutes apart. **Results from different SPEC_VERSIONs or different
catalog hashes describe different applications and must never be compared.**

**rspack-react** — 368/368, 368/368, 368/368 checks per run:

- `results/runs/rspack-react/2026-08-27T11-03-51-157Z` — 2026-08-27T11:03:51.157Z
- `results/runs/rspack-react/2026-08-27T10-56-09-401Z` — 2026-08-27T10:56:09.401Z
- `results/runs/rspack-react/2026-08-27T10-48-28-725Z` — 2026-08-27T10:48:28.725Z

**rspack-svelte** — 368/368, 368/368, 368/368 checks per run:

- `results/runs/rspack-svelte/2026-08-27T11-25-18-667Z` — 2026-08-27T11:25:18.667Z
- `results/runs/rspack-svelte/2026-08-27T11-18-12-539Z` — 2026-08-27T11:18:12.539Z
- `results/runs/rspack-svelte/2026-08-27T11-11-07-194Z` — 2026-08-27T11:11:07.194Z

## 3. Parameters

Everything that shaped these numbers, read from the objects that shaped them rather than
restated here — a hand-maintained list drifts from the run it claims to describe.

### 3.1 Measurement profile

The conditions the browser measurements were taken under. **The most consequential entry
in this report**: on an unthrottled localhost bytes are free, and every route reports the
same Largest Contentful Paint regardless of what it transfers.

| | |
|---|---|
| Profile | `constrained` — Constrained device on Slow 4G, reference viewport |
| CPU throttling | 4x slowdown |
| Network — download | 1638 Kbps |
| Network — upload | 750 Kbps |
| Network — round trip | 150 ms |
| navigator.hardwareConcurrency | 4 |
| V8 heap ceiling | 512 MB |
| Viewport | reference (unchanged) |
| Profiles available | desktop, constrained, mobile |

### 3.2 Toolchain

| | |
|---|---|
| node | `v24.11.1` |
| v8 | `13.6.233.10-node.28` |
| playwright | `1.62.1` |
| rspack | `2.1.10` |
| rsbuild | `2.1.13` |
| moduleFederation | `2.8.2` |
| react | `19.2.8` |
| svelte | `5.56.10` |
| tailwindcss | `4.3.3` |
| autocannon | `8.0.0` |
| axeCore | `4.10.3` |
| webVitals | `6.1.1` |

### 3.3 Environment

Every `MF_*` variable in effect, so a run started with an unusual flag says so.

| | |
|---|---|
| `MF_RUNS` | `3` |
| `MF_STACK` | `rspack-react` |

### 3.4 Topology

2 host applications, 4 federated remotes, 10 routes behind one origin.

| application | role | port |
|---|---|---:|
| storefront | host, document navigation, serves `/` | 3110 |
| my-account | host, zone navigation, serves `/my-account` | 3120 |
| chrome | remote, component | 3104 |
| faq | remote, route | 3101 |
| product | remote, route | 3102 |
| cart | remote, route+component | 3103 |

### 3.5 Shared dependencies

Read from the manifests the build emitted, so this is what was actually shared rather
than what the configuration asked for.

| module | version | singleton | requiredVersion |
|---|---:|---|---:|
| `@mf-eval/media` | 0.0.0 | yes | false |
| `react` | 19.2.8 | yes | 19.2.8 |
| `@mf-eval/contracts` | 0.0.0 | yes | false |
| `@mf-eval/react-contracts` | 0.0.0 | yes | false |

**rspack-svelte** shares: `@mf-eval/media`, `@mf-eval/contracts`.
The two lists differ on purpose, and the difference is itself a result.

### 3.6 Budgets

| metric | document | soft navigation |
|---|---:|---:|
| LCP | 2500 | 1200 |
| CLS | 0.1 | 0.02 |
| INP | 200 | 200 |
| TBT | 300 | — |
| TTFB | 800 | — |
| FCP | 1800 | — |
| taskMs | 600 | — |
| jsHeapMb | 40 | — |

> **Waiver — a waiver is not a pass.** `/` **LCP** is over the
> 2500 threshold and raised to 3000. the LCP element is the hero video's poster (110 kB AVIF) on a media-heavy page. Cropping it to the video ratio and moving it off JPEG took it from 180 kB to 110 kB and LCP from 2964 ms to 2644 ms; a high-priority preload measured as a no-op because the page is bandwidth-bound rather than discovery-bound. Affects both stacks equally. See docs/media.md.

## 4. Method

Each run performs, in order:

1. **Build** every application in the stack from a clean `dist`, in the measured
   configuration (`MF_OPTIMIZE=1`).
2. **Start** nine processes — a runtime registry, a media origin, four federated remotes,
   two host applications and an edge router — and wait for every health probe.
3. **Run all sixteen suites** against that stack. A run with any failing check is discarded
   rather than averaged: a baseline is a run that passed.
4. **Archive** every raw suite report alongside a manifest carrying the provenance above.
5. **Stop** the stack. The next run starts from a cold process and an empty cache, because a
   warm server is a different measurement wearing the same name.

Browser measurements are taken in headless Chromium at **4× CPU throttling**, matching
Lighthouse's mid-range-mobile simulation. Without throttling every stack reports a Total
Blocking Time of zero on a modern workstation and the metric stops discriminating.

Core Web Vitals are collected with the `web-vitals` library itself, injected into the page,
so the laboratory and the field cannot disagree about what counts as an LCP candidate.
Server figures are collected in-process by each host — `process.cpuUsage()`,
`performance.eventLoopUtilization()`, `v8.getHeapStatistics()` and a GC observer — because
they do not exist anywhere else.

## 5. Findings

Of 251 metrics measured on both stacks, **111 show a
difference larger than the measurement spread**. The rest are either identical by
construction or too noisy to separate at this sample size.

The twelve largest resolvable differences:

| metric | route or item | rspack-react | rspack-svelte | change |
|---|---|---:|---:|---:|
| Bundler cache saving | `—` | 0.064 | 0.333 | +422.5% |
| GC pause total | `/product/p-0001` | 52.37 | 144.7 | +176.4% |
| Transfer by owning application | `/my-account` | 26.34 | 65.16 | +147.4% |
| V8 heap used | `/` | 54.99 | 132.0 | +140.1% |
| GC pause total | `/` | 59.50 | 142.6 | +139.6% |
| Transfer by owning application | `/my-account` | 21.41 | 45.84 | +114.1% |
| Transfer by owning application | `/product/p-0001` | 25.94 | 53.57 | +106.5% |
| V8 heap used | `/product/p-0001` | 48.52 | 98.36 | +102.7% |
| Transfer by owning application | `/my-account` | 24.05 | 48.02 | +99.7% |
| Transfer by owning application | `/cart` | 31.58 | 62.70 | +98.5% |
| DOM nodes (all types) | `/cart` | 260 | 456 | +75.4% |
| GC pause total | `/my-account` | 71.06 | 123.5 | +73.8% |

Units are in the metric tables below. A positive change means rspack-svelte is higher, which is
better for some metrics and worse for others — each table states which.

## 6. Results

Every table below prints each run, the mean, the standard deviation, the coefficient of
variation, and a stability class. **The stability class is the one to read first**: it is
computed from the data rather than asserted, and it decides whether a difference between
two columns is something you may act on.

| class | meaning |
|---|---|
| `deterministic` | spread under 0.5%. Byte and node counts. A difference of any size is real. |
| `stable` | spread under 3%. Main-thread times, CPU per request. A difference larger than the spread is real. |
| `variable` | spread under 10%. Build times, latency tails. Directionally useful; small differences are not. |
| `unstable` | spread of 10% or more. **Not comparable at this sample size.** |

### 6.1 Page weight

**CSS transfer** — Every stylesheet the document fetched, gzipped at level 9. *Instrument: Chrome DevTools Protocol CSS coverage.*

**Stylesheets** — Distinct stylesheets the document fetched. *Instrument: Playwright.*

**Foreign bytes** — Bytes fetched from a remote that has no business on this route. Zero is the only acceptable value. *Instrument: Playwright response interception against the route ownership table.*

**Requests** — Resources fetched for one cold navigation. *Instrument: Playwright.*

**Total transfer** — Sum of every resource the page fetched, including HTML, JS, CSS, photographs and video. Cold cache, one navigation. *Instrument: Playwright response interception; every response body gzipped at level 9.* *Caveat: Media dominates on image-heavy routes; read the CSS and per-owner rows to separate code from content.*

<details open><summary><strong>rspack-react</strong> — 42 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `perRoute./.cssKbGzip` (kB gzip) | 9.26 | 9.26 | 9.26 | **9.26** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.cssSheets` (count) | 3 | 3 | 3 | **3** | 0 | 0.00 | `deterministic` |
| `perRoute./.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.requests` (count) | 23 | 23 | 23 | **23** | 0 | 0.00 | `deterministic` |
| `perRoute./.totalKbGzip` (kB gzip) | 890.1 | 890.1 | 890.1 | **890.1** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssKbGzip` (kB gzip) | 12.89 | 12.89 | 12.89 | **12.89** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.requests` (count) | 22 | 22 | 22 | **22** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.totalKbGzip` (kB gzip) | 161.9 | 161.9 | 161.9 | **161.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssKbGzip` (kB gzip) | 12.94 | 12.94 | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.totalKbGzip` (kB gzip) | 81.24 | 81.24 | 81.24 | **81.24** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssKbGzip` (kB gzip) | 12.94 | 12.94 | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.totalKbGzip` (kB gzip) | 81.24 | 81.24 | 81.24 | **81.24** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.requests` (count) | 17 | 17 | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./login.totalKbGzip` (kB gzip) | 151.6 | 151.6 | 151.6 | **151.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.requests` (count) | 32 | 32 | 32 | **32** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account.totalKbGzip` (kB gzip) | 214.3 | 214.3 | 214.3 | **214.3** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.requests` (count) | 17 | 17 | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.totalKbGzip` (kB gzip) | 144.6 | 144.6 | 144.6 | **144.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.requests` (count) | 17 | 17 | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.totalKbGzip` (kB gzip) | 143.3 | 143.3 | 143.3 | **143.3** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.cssKbGzip` (kB gzip) | 13.03 | 13.03 | 13.03 | **13.03** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./product.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.requests` (count) | 20 | 20 | 20 | **20** | 0 | 0.00 | `deterministic` |
| `perRoute./product.totalKbGzip` (kB gzip) | 155.7 | 155.7 | 155.7 | **155.7** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.cssKbGzip` (kB gzip) | 17.00 | 17.00 | 17.00 | **17.00** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.cssSheets` (count) | 6 | 6 | 6 | **6** | 0 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.requests` (count) | 35 | 35 | 35 | **35** | 0 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.totalKbGzip` (kB gzip) | 254.9 | 254.9 | 254.9 | **254.9** | 0.000 | 0.00 | `deterministic` |

</details>

<details open><summary><strong>rspack-svelte</strong> — 42 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `perRoute./.cssKbGzip` (kB gzip) | 9.26 | 9.26 | 9.26 | **9.26** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.cssSheets` (count) | 3 | 3 | 3 | **3** | 0 | 0.00 | `deterministic` |
| `perRoute./.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.requests` (count) | 23 | 23 | 23 | **23** | 0 | 0.00 | `deterministic` |
| `perRoute./.totalKbGzip` (kB gzip) | 889.4 | 889.4 | 889.4 | **889.4** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssKbGzip` (kB gzip) | 12.90 | 12.90 | 12.90 | **12.90** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.requests` (count) | 19 | 19 | 19 | **19** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.totalKbGzip` (kB gzip) | 126.1 | 126.1 | 126.1 | **126.1** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssKbGzip` (kB gzip) | 12.94 | 12.94 | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.totalKbGzip` (kB gzip) | 80.52 | 80.52 | 80.52 | **80.52** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssKbGzip` (kB gzip) | 12.94 | 12.94 | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.totalKbGzip` (kB gzip) | 80.52 | 80.52 | 80.52 | **80.52** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.requests` (count) | 14 | 14 | 14 | **14** | 0 | 0.00 | `deterministic` |
| `perRoute./login.totalKbGzip` (kB gzip) | 130.6 | 130.6 | 130.6 | **130.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.requests` (count) | 32 | 32 | 32 | **32** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account.totalKbGzip` (kB gzip) | 282.0 | 282.0 | 282.0 | **282.0** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.requests` (count) | 14 | 14 | 14 | **14** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.totalKbGzip` (kB gzip) | 124.7 | 124.7 | 124.7 | **124.7** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.totalKbGzip` (kB gzip) | 116.6 | 116.6 | 116.6 | **116.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.cssKbGzip` (kB gzip) | 13.03 | 13.03 | 13.03 | **13.03** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./product.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.requests` (count) | 20 | 20 | 20 | **20** | 0 | 0.00 | `deterministic` |
| `perRoute./product.totalKbGzip` (kB gzip) | 154.8 | 154.8 | 154.8 | **154.8** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.cssKbGzip` (kB gzip) | 17.00 | 17.00 | 17.00 | **17.00** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.cssSheets` (count) | 6 | 6 | 6 | **6** | 0 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.requests` (count) | 32 | 32 | 32 | **32** | 0 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.totalKbGzip` (kB gzip) | 218.6 | 218.6 | 218.6 | **218.6** | 0.000 | 0.00 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `perRoute./.cssKbGzip` | 9.26 | 9.26 | 0.0% | no — within noise |
| `perRoute./.cssSheets` | 3 | 3 | 0.0% | no — within noise |
| `perRoute./.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./.requests` | 23 | 23 | 0.0% | no — within noise |
| `perRoute./.totalKbGzip` | 890.1 | 889.4 | -0.1% | no — within noise |
| `perRoute./cart.cssKbGzip` | 12.89 | 12.90 | +0.1% | no — within noise |
| `perRoute./cart.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./cart.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./cart.requests` | 22 | 19 | -13.6% | yes — rspack-svelte better |
| `perRoute./cart.totalKbGzip` | 161.9 | 126.1 | -22.1% | yes — rspack-svelte better |
| `perRoute./faq.cssKbGzip` | 12.94 | 12.94 | 0.0% | no — within noise |
| `perRoute./faq.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./faq.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./faq.requests` | 13 | 13 | 0.0% | no — within noise |
| `perRoute./faq.totalKbGzip` | 81.24 | 80.52 | -0.9% | no — within noise |
| `perRoute./faq/contact.cssKbGzip` | 12.94 | 12.94 | 0.0% | no — within noise |
| `perRoute./faq/contact.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./faq/contact.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./faq/contact.requests` | 13 | 13 | 0.0% | no — within noise |
| `perRoute./faq/contact.totalKbGzip` | 81.24 | 80.52 | -0.9% | no — within noise |
| `perRoute./login.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./login.requests` | 17 | 14 | -17.6% | yes — rspack-svelte better |
| `perRoute./login.totalKbGzip` | 151.6 | 130.6 | -13.8% | yes — rspack-svelte better |
| `perRoute./my-account.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./my-account.requests` | 32 | 32 | 0.0% | no — within noise |
| `perRoute./my-account.totalKbGzip` | 214.3 | 282.0 | +31.6% | yes — rspack-react better |
| `perRoute./my-account/orders.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./my-account/orders.requests` | 17 | 14 | -17.6% | yes — rspack-svelte better |
| `perRoute./my-account/orders.totalKbGzip` | 144.6 | 124.7 | -13.8% | yes — rspack-svelte better |
| `perRoute./my-account/profile.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./my-account/profile.requests` | 17 | 13 | -23.5% | yes — rspack-svelte better |
| `perRoute./my-account/profile.totalKbGzip` | 143.3 | 116.6 | -18.6% | yes — rspack-svelte better |
| `perRoute./product.cssKbGzip` | 13.03 | 13.03 | 0.0% | no — within noise |
| `perRoute./product.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./product.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./product.requests` | 20 | 20 | 0.0% | no — within noise |
| `perRoute./product.totalKbGzip` | 155.7 | 154.8 | -0.6% | no — within noise |
| `perRoute./product/p-0001.cssKbGzip` | 17.00 | 17.00 | 0.0% | no — within noise |
| `perRoute./product/p-0001.cssSheets` | 6 | 6 | 0.0% | no — within noise |
| `perRoute./product/p-0001.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./product/p-0001.requests` | 35 | 32 | -8.6% | yes — rspack-svelte better |
| `perRoute./product/p-0001.totalKbGzip` | 254.9 | 218.6 | -14.2% | yes — rspack-svelte better |

### 6.2 Weight by owning application

**Transfer by owning application** — Each response is attributed to the application that served it, so a page can be read as a bill of materials per team. *Instrument: Playwright response interception, attributed by origin and edge path prefix.* *Caveat: An origin nobody declared is a hard failure rather than an "other" bucket.*

<details><summary><strong>rspack-react</strong> — 40 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.chrome` (kB gzip) | 19.94 | 19.94 | 19.94 | **19.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.media` (kB gzip) | 812.6 | 812.6 | 812.6 | **812.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.cart` (kB gzip) | 31.58 | 31.58 | 31.58 | **31.58** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.chrome` (kB gzip) | 29.45 | 29.45 | 29.45 | **29.45** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.storefront` (kB gzip) | 100.9 | 100.9 | 100.9 | **100.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.chrome` (kB gzip) | 19.94 | 19.94 | 19.94 | **19.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` (kB gzip) | 19.94 | 19.94 | 19.94 | **19.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.chrome` (kB gzip) | 19.94 | 19.94 | 19.94 | **19.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.my-account` (kB gzip) | 114.5 | 114.5 | 114.5 | **114.5** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.cart` (kB gzip) | 21.41 | 21.41 | 21.41 | **21.41** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.faq` (kB gzip) | 24.05 | 24.05 | 24.05 | **24.05** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.media` (kB gzip) | 15.13 | 15.13 | 15.13 | **15.13** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.my-account` (kB gzip) | 123.6 | 123.6 | 123.6 | **123.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.product` (kB gzip) | 26.34 | 26.34 | 26.34 | **26.34** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.my-account` (kB gzip) | 123.7 | 123.7 | 123.7 | **123.7** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` (kB gzip) | 122.3 | 122.3 | 122.3 | **122.3** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.cart` (kB gzip) | 17.20 | 17.20 | 17.20 | **17.20** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.chrome` (kB gzip) | 19.94 | 19.94 | 19.94 | **19.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.media` (kB gzip) | 57.95 | 57.95 | 57.95 | **57.95** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.product` (kB gzip) | 20.24 | 20.24 | 20.24 | **20.24** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` (kB gzip) | 25.94 | 25.94 | 25.94 | **25.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` (kB gzip) | 19.94 | 19.94 | 19.94 | **19.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.media` (kB gzip) | 77.85 | 77.85 | 77.85 | **77.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.product` (kB gzip) | 30.32 | 30.32 | 30.32 | **30.32** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` (kB gzip) | 100.9 | 100.9 | 100.9 | **100.9** | 0.000 | 0.00 | `deterministic` |

</details>

<details><summary><strong>rspack-svelte</strong> — 40 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.chrome` (kB gzip) | 19.73 | 19.73 | 19.73 | **19.73** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.media` (kB gzip) | 812.6 | 812.6 | 812.6 | **812.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.cart` (kB gzip) | 56.35 | 65.87 | 65.87 | **62.70** | 5.50 | 8.77 | `variable` |
| `perRoute./cart.byOwnerKbGzip.chrome` (kB gzip) | 29.24 | 19.73 | 19.73 | **22.90** | 5.49 | 23.98 | `unstable` |
| `perRoute./cart.byOwnerKbGzip.storefront` (kB gzip) | 40.54 | 40.54 | 40.54 | **40.54** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.chrome` (kB gzip) | 19.73 | 19.73 | 19.73 | **19.73** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` (kB gzip) | 19.73 | 19.73 | 19.73 | **19.73** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.chrome` (kB gzip) | 19.73 | 19.73 | 19.73 | **19.73** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.my-account` (kB gzip) | 93.92 | 93.92 | 93.92 | **93.92** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.cart` (kB gzip) | 45.84 | 45.84 | 45.84 | **45.84** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.faq` (kB gzip) | 48.02 | 48.02 | 48.02 | **48.02** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.media` (kB gzip) | 15.13 | 15.13 | 15.13 | **15.13** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.my-account` (kB gzip) | 104.1 | 104.1 | 104.1 | **104.1** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.product` (kB gzip) | 65.16 | 65.16 | 65.16 | **65.16** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.my-account` (kB gzip) | 104.0 | 104.0 | 104.0 | **104.0** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` (kB gzip) | 95.92 | 95.92 | 95.92 | **95.92** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.chrome` (kB gzip) | 19.73 | 19.73 | 19.73 | **19.73** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.media` (kB gzip) | 57.95 | 57.95 | 57.95 | **57.95** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.product` (kB gzip) | 20.03 | 20.03 | 20.03 | **20.03** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` (kB gzip) | 50.40 | 59.92 | 50.40 | **53.57** | 5.50 | 10.26 | `unstable` |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` (kB gzip) | 19.73 | 19.73 | 19.73 | **19.73** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.media` (kB gzip) | 77.85 | 77.85 | 77.85 | **77.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.product` (kB gzip) | 30.11 | 20.59 | 30.11 | **26.94** | 5.50 | 20.40 | `unstable` |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` (kB gzip) | 40.54 | 40.54 | 40.54 | **40.54** | 0.000 | 0.00 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./.byOwnerKbGzip.chrome` | 19.94 | 19.73 | -1.1% | yes — rspack-svelte better |
| `perRoute./.byOwnerKbGzip.media` | 812.6 | 812.6 | 0.0% | no — within noise |
| `perRoute./.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./cart.byOwnerKbGzip.cart` | 31.58 | 62.70 | +98.5% | yes — rspack-react better |
| `perRoute./cart.byOwnerKbGzip.chrome` | 29.45 | 22.90 | -22.2% | yes — rspack-svelte better |
| `perRoute./cart.byOwnerKbGzip.storefront` | 100.9 | 40.54 | -59.8% | yes — rspack-svelte better |
| `perRoute./faq.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./faq.byOwnerKbGzip.chrome` | 19.94 | 19.73 | -1.1% | yes — rspack-svelte better |
| `perRoute./faq.byOwnerKbGzip.faq` | 3.68 | 3.68 | 0.0% | no — within noise |
| `perRoute./faq.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./faq/contact.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` | 19.94 | 19.73 | -1.1% | yes — rspack-svelte better |
| `perRoute./faq/contact.byOwnerKbGzip.faq` | 3.68 | 3.68 | 0.0% | no — within noise |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./login.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./login.byOwnerKbGzip.chrome` | 19.94 | 19.73 | -1.1% | yes — rspack-svelte better |
| `perRoute./login.byOwnerKbGzip.my-account` | 114.5 | 93.92 | -17.9% | yes — rspack-svelte better |
| `perRoute./my-account.byOwnerKbGzip.cart` | 21.41 | 45.84 | +114.1% | yes — rspack-react better |
| `perRoute./my-account.byOwnerKbGzip.chrome` | 3.72 | 3.72 | 0.0% | no — within noise |
| `perRoute./my-account.byOwnerKbGzip.faq` | 24.05 | 48.02 | +99.7% | yes — rspack-react better |
| `perRoute./my-account.byOwnerKbGzip.media` | 15.13 | 15.13 | 0.0% | no — within noise |
| `perRoute./my-account.byOwnerKbGzip.my-account` | 123.6 | 104.1 | -15.8% | yes — rspack-svelte better |
| `perRoute./my-account.byOwnerKbGzip.product` | 26.34 | 65.16 | +147.4% | yes — rspack-react better |
| `perRoute./my-account/orders.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./my-account/orders.byOwnerKbGzip.chrome` | 3.72 | 3.72 | 0.0% | no — within noise |
| `perRoute./my-account/orders.byOwnerKbGzip.my-account` | 123.7 | 104.0 | -15.9% | yes — rspack-svelte better |
| `perRoute./my-account/profile.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./my-account/profile.byOwnerKbGzip.chrome` | 3.72 | 3.72 | 0.0% | no — within noise |
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` | 122.3 | 95.92 | -21.6% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.cart` | 17.20 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.chrome` | 19.94 | 19.73 | -1.1% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.media` | 57.95 | 57.95 | 0.0% | no — within noise |
| `perRoute./product.byOwnerKbGzip.product` | 20.24 | 20.03 | -1.0% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` | 25.94 | 53.57 | +106.5% | yes — rspack-react better |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` | 19.94 | 19.73 | -1.1% | yes — rspack-svelte better |
| `perRoute./product/p-0001.byOwnerKbGzip.media` | 77.85 | 77.85 | 0.0% | no — within noise |
| `perRoute./product/p-0001.byOwnerKbGzip.product` | 30.32 | 26.94 | -11.2% | no — within noise |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` | 100.9 | 40.54 | -59.8% | yes — rspack-svelte better |

### 6.3 Core Web Vitals

**Cumulative Layout Shift** — Unitless. Google calls under 0.1 good. *Instrument: web-vitals v6.*

**First Contentful Paint** — First paint of any content. *Instrument: web-vitals v6.*

**Interaction to Next Paint** — Requires a real interaction; the suite performs one per route rather than reporting INP for a page nobody touched. *Instrument: web-vitals v6.*

**Largest Contentful Paint** — The library Real User Monitoring actually uses, so the lab and the field cannot disagree about what counts. Median of the runs. *Instrument: web-vitals v6, injected into the page.* *Caveat: Measured at 4x CPU throttling, which raises it relative to an unthrottled desktop.*

**Total Blocking Time** — The blocking portion (over 50 ms) of every long task after First Contentful Paint, at 4x CPU throttling. *Instrument: PerformanceObserver longtask entries, Lighthouse definition.* *Caveat: Counts ONLY long tasks after FCP. A stack can hold TBT at zero and still do materially more main-thread work — see taskMs.*

**Time to First Byte** — Localhost, so this measures server render time rather than network. *Instrument: web-vitals v6.* *Caveat: Not comparable to a production TTFB; there is no network here.*

<details><summary><strong>rspack-react</strong> — 36 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./.FCP` (ms) | 1004.0 | 1004.0 | 1008.0 | **1005.3** | 2.31 | 0.23 | `deterministic` |
| `documents./.INP` (ms) | 8.00 | 40.00 | 8.00 | **18.67** | 18.48 | 98.97 | `unstable` |
| `documents./.LCP` (ms) | 2644.0 | 2656.0 | 2644.0 | **2648.0** | 6.93 | 0.26 | `deterministic` |
| `documents./.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 6.90 | 6.70 | 7.00 | **6.87** | 0.153 | 2.22 | `stable` |
| `documents./cart.CLS` (score) | 0.0077 | 0.0077 | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 896.0 | 880.0 | 884.0 | **886.7** | 8.33 | 0.94 | `stable` |
| `documents./cart.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.LCP` (ms) | 896.0 | 880.0 | 884.0 | **886.7** | 8.33 | 0.94 | `stable` |
| `documents./cart.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 6.20 | 6.20 | 6.40 | **6.27** | 0.115 | 1.84 | `stable` |
| `documents./faq.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 812.0 | 832.0 | 836.0 | **826.7** | 12.86 | 1.56 | `stable` |
| `documents./faq.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.LCP` (ms) | 812.0 | 832.0 | 836.0 | **826.7** | 12.86 | 1.56 | `stable` |
| `documents./faq.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 6.90 | 7.00 | 6.30 | **6.73** | 0.379 | 5.62 | `variable` |
| `documents./faq/contact.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 836.0 | 832.0 | 836.0 | **834.7** | 2.31 | 0.28 | `deterministic` |
| `documents./faq/contact.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 836.0 | 832.0 | 836.0 | **834.7** | 2.31 | 0.28 | `deterministic` |
| `documents./faq/contact.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.50 | 3.50 | 2.60 | **2.87** | 0.551 | 19.21 | `unstable` |
| `documents./product.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 1120.0 | 1128.0 | 1120.0 | **1122.7** | 4.62 | 0.41 | `deterministic` |
| `documents./product.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product.LCP` (ms) | 1120.0 | 1128.0 | 1120.0 | **1122.7** | 4.62 | 0.41 | `deterministic` |
| `documents./product.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 7.60 | 7.40 | 7.80 | **7.60** | 0.200 | 2.63 | `stable` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 1016.0 | 1016.0 | 1008.0 | **1013.3** | 4.62 | 0.46 | `deterministic` |
| `documents./product/p-0001.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 1016.0 | 1016.0 | 1008.0 | **1013.3** | 4.62 | 0.46 | `deterministic` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 7.20 | 3.20 | 7.10 | **5.83** | 2.28 | 39.10 | `unstable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 36 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./.FCP` (ms) | 996.0 | 1000.0 | 1000.0 | **998.7** | 2.31 | 0.23 | `deterministic` |
| `documents./.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./.LCP` (ms) | 2644.0 | 2648.0 | 2652.0 | **2648.0** | 4.00 | 0.15 | `deterministic` |
| `documents./.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 7.20 | 7.00 | 7.10 | **7.10** | 0.100 | 1.41 | `stable` |
| `documents./cart.CLS` (score) | 0.0077 | 0.0077 | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 992.0 | 992.0 | 1000.0 | **994.7** | 4.62 | 0.46 | `deterministic` |
| `documents./cart.INP` (ms) | 8.00 | 8.00 | 40.00 | **18.67** | 18.48 | 98.97 | `unstable` |
| `documents./cart.LCP` (ms) | 992.0 | 992.0 | 1000.0 | **994.7** | 4.62 | 0.46 | `deterministic` |
| `documents./cart.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 6.50 | 6.10 | 6.80 | **6.47** | 0.351 | 5.43 | `variable` |
| `documents./faq.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 820.0 | 820.0 | 820.0 | **820.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.INP` (ms) | 8.00 | 8.00 | 40.00 | **18.67** | 18.48 | 98.97 | `unstable` |
| `documents./faq.LCP` (ms) | 820.0 | 820.0 | 820.0 | **820.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 6.50 | 6.90 | 7.10 | **6.83** | 0.306 | 4.47 | `variable` |
| `documents./faq/contact.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 832.0 | 828.0 | 828.0 | **829.3** | 2.31 | 0.28 | `deterministic` |
| `documents./faq/contact.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 832.0 | 828.0 | 828.0 | **829.3** | 2.31 | 0.28 | `deterministic` |
| `documents./faq/contact.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.60 | 2.50 | 2.70 | **2.60** | 0.100 | 3.85 | `variable` |
| `documents./product.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 1120.0 | 1112.0 | 1124.0 | **1118.7** | 6.11 | 0.55 | `stable` |
| `documents./product.INP` (ms) | 8.00 | 8.00 | 40.00 | **18.67** | 18.48 | 98.97 | `unstable` |
| `documents./product.LCP` (ms) | 1120.0 | 1112.0 | 1124.0 | **1118.7** | 6.11 | 0.55 | `stable` |
| `documents./product.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 7.30 | 7.60 | 7.80 | **7.57** | 0.252 | 3.33 | `variable` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 1136.0 | 1128.0 | 1136.0 | **1133.3** | 4.62 | 0.41 | `deterministic` |
| `documents./product/p-0001.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 1136.0 | 1128.0 | 1136.0 | **1133.3** | 4.62 | 0.41 | `deterministic` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 3.10 | 2.80 | 3.00 | **2.97** | 0.153 | 5.15 | `variable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `documents./.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./.FCP` | 1005.3 | 998.7 | -0.7% | no — within noise |
| `documents./.INP` | 18.67 | 8.00 | -57.1% | no — within noise |
| `documents./.LCP` | 2648.0 | 2648.0 | 0.0% | no — within noise |
| `documents./.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./.TTFB` | 6.87 | 7.10 | +3.4% | no — within noise |
| `documents./cart.CLS` | 0.0077 | 0.0077 | 0.0% | no — within noise |
| `documents./cart.FCP` | 886.7 | 994.7 | +12.2% | yes — rspack-react better |
| `documents./cart.INP` | 8.00 | 18.67 | +133.3% | no — within noise |
| `documents./cart.LCP` | 886.7 | 994.7 | +12.2% | yes — rspack-react better |
| `documents./cart.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./cart.TTFB` | 6.27 | 6.47 | +3.2% | no — within noise |
| `documents./faq.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./faq.FCP` | 826.7 | 820.0 | -0.8% | no — within noise |
| `documents./faq.INP` | 8.00 | 18.67 | +133.3% | no — within noise |
| `documents./faq.LCP` | 826.7 | 820.0 | -0.8% | no — within noise |
| `documents./faq.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./faq.TTFB` | 6.73 | 6.83 | +1.5% | no — within noise |
| `documents./faq/contact.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./faq/contact.FCP` | 834.7 | 829.3 | -0.6% | no — within noise |
| `documents./faq/contact.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./faq/contact.LCP` | 834.7 | 829.3 | -0.6% | no — within noise |
| `documents./faq/contact.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./faq/contact.TTFB` | 2.87 | 2.60 | -9.3% | no — within noise |
| `documents./product.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./product.FCP` | 1122.7 | 1118.7 | -0.4% | no — within noise |
| `documents./product.INP` | 8.00 | 18.67 | +133.3% | no — within noise |
| `documents./product.LCP` | 1122.7 | 1118.7 | -0.4% | no — within noise |
| `documents./product.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./product.TTFB` | 7.60 | 7.57 | -0.4% | no — within noise |
| `documents./product/p-0001.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./product/p-0001.FCP` | 1013.3 | 1133.3 | +11.8% | yes — rspack-react better |
| `documents./product/p-0001.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./product/p-0001.LCP` | 1013.3 | 1133.3 | +11.8% | yes — rspack-react better |
| `documents./product/p-0001.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./product/p-0001.TTFB` | 5.83 | 2.97 | -49.1% | yes — rspack-svelte better |

### 6.4 Browser processor and memory

**DOM nodes (all types)** — Every node: elements, text and comments. A real cost, since the browser walks them. *Instrument: CDP Performance.getMetrics — Nodes.* *Caveat: NOT a conformance metric. Svelte emits anchor comments around every block, so this reads 76% higher on a page whose element counts differ by one. Use domElements to compare structure.*

**JS heap (browser)** — What the document holds in the renderer after the navigation settles. *Instrument: CDP Performance.getMetrics — JSHeapUsedSize.*

**Layout** — Geometry calculation, at 4x throttling. *Instrument: CDP Performance.getMetrics — LayoutDuration.*

**Long tasks** — Main-thread tasks over 50 ms, at 4x throttling. *Instrument: PerformanceObserver.*

**Script execution** — Compiling and running JavaScript, at 4x throttling. *Instrument: CDP Performance.getMetrics — ScriptDuration.*

**Style recalculation** — Matching selectors and computing styles, at 4x throttling. *Instrument: CDP Performance.getMetrics — RecalcStyleDuration.*

**Main-thread busy time** — Total main-thread work for the navigation at 4x CPU throttling. The closest single number to "browser CPU". *Instrument: CDP Performance.getMetrics — TaskDuration.* *Caveat: Script, layout and style are its largest categories and do NOT sum to it: parsing, compositing, GC and event dispatch are main-thread work in none of them.*

<details><summary><strong>rspack-react</strong> — 42 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.domNodes` (count) | 688 | 688 | 688 | **688** | 0 | 0.00 | `deterministic` |
| `documents./.jsHeapMb` (MB) | 2.81 | 2.81 | 2.81 | **2.81** | 0.002 | 0.06 | `deterministic` |
| `documents./.layoutMs` (ms) | 32.54 | 32.89 | 34.01 | **33.15** | 0.765 | 2.31 | `stable` |
| `documents./.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 44.05 | 45.88 | 44.81 | **44.91** | 0.924 | 2.06 | `stable` |
| `documents./.styleMs` (ms) | 42.26 | 43.77 | 42.45 | **42.83** | 0.823 | 1.92 | `stable` |
| `documents./.taskMs` (ms) | 405.8 | 419.0 | 427.7 | **417.5** | 11.06 | 2.65 | `stable` |
| `documents./cart.domNodes` (count) | 260 | 260 | 260 | **260** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 4.31 | 4.30 | 4.30 | **4.31** | 0.003 | 0.07 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 18.60 | 18.13 | 17.72 | **18.15** | 0.441 | 2.43 | `stable` |
| `documents./cart.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 62.43 | 60.06 | 58.05 | **60.18** | 2.19 | 3.64 | `variable` |
| `documents./cart.styleMs` (ms) | 31.54 | 30.87 | 32.03 | **31.48** | 0.582 | 1.85 | `stable` |
| `documents./cart.taskMs` (ms) | 356.5 | 339.4 | 341.6 | **345.8** | 9.29 | 2.69 | `stable` |
| `documents./faq.domNodes` (count) | 542 | 542 | 542 | **542** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 3.20 | 3.20 | 3.20 | **3.20** | 0.001 | 0.03 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 23.46 | 22.33 | 23.15 | **22.98** | 0.585 | 2.54 | `stable` |
| `documents./faq.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 42.23 | 44.22 | 43.56 | **43.33** | 1.02 | 2.34 | `stable` |
| `documents./faq.styleMs` (ms) | 32.68 | 34.88 | 34.75 | **34.10** | 1.24 | 3.62 | `variable` |
| `documents./faq.taskMs` (ms) | 301.8 | 306.3 | 309.6 | **305.9** | 3.89 | 1.27 | `stable` |
| `documents./faq/contact.domNodes` (count) | 389 | 389 | 389 | **389** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.31 | 3.30 | 3.32 | **3.31** | 0.010 | 0.29 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 29.11 | 28.55 | 27.24 | **28.30** | 0.960 | 3.39 | `variable` |
| `documents./faq/contact.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 42.27 | 43.14 | 42.44 | **42.62** | 0.462 | 1.08 | `stable` |
| `documents./faq/contact.styleMs` (ms) | 32.92 | 33.89 | 32.41 | **33.07** | 0.755 | 2.28 | `stable` |
| `documents./faq/contact.taskMs` (ms) | 301.5 | 314.1 | 294.8 | **303.5** | 9.75 | 3.21 | `variable` |
| `documents./product.domNodes` (count) | 904 | 904 | 905 | **904.33** | 0.58 | 0.06 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.53 | 3.50 | 3.51 | **3.52** | 0.014 | 0.40 | `deterministic` |
| `documents./product.layoutMs` (ms) | 33.46 | 33.41 | 33.50 | **33.46** | 0.047 | 0.14 | `deterministic` |
| `documents./product.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 46.74 | 46.74 | 47.42 | **46.97** | 0.396 | 0.84 | `stable` |
| `documents./product.styleMs` (ms) | 39.94 | 41.27 | 39.05 | **40.08** | 1.12 | 2.79 | `stable` |
| `documents./product.taskMs` (ms) | 343.4 | 347.6 | 348.4 | **346.4** | 2.69 | 0.78 | `stable` |
| `documents./product/p-0001.domNodes` (count) | 640 | 640 | 640 | **640** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 4.18 | 4.18 | 4.18 | **4.18** | 0.000 | 0.01 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 36.13 | 36.72 | 35.09 | **35.98** | 0.826 | 2.30 | `stable` |
| `documents./product/p-0001.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 61.93 | 61.26 | 60.59 | **61.26** | 0.668 | 1.09 | `stable` |
| `documents./product/p-0001.styleMs` (ms) | 39.83 | 38.79 | 37.83 | **38.82** | 1.00 | 2.58 | `stable` |
| `documents./product/p-0001.taskMs` (ms) | 407.4 | 408.7 | 408.9 | **408.4** | 0.826 | 0.20 | `deterministic` |

</details>

<details><summary><strong>rspack-svelte</strong> — 42 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.domNodes` (count) | 1005 | 1005 | 1005 | **1005** | 0 | 0.00 | `deterministic` |
| `documents./.jsHeapMb` (MB) | 2.62 | 2.62 | 2.62 | **2.62** | 0.001 | 0.03 | `deterministic` |
| `documents./.layoutMs` (ms) | 30.38 | 34.35 | 33.44 | **32.73** | 2.08 | 6.36 | `variable` |
| `documents./.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 46.41 | 41.97 | 44.14 | **44.17** | 2.22 | 5.02 | `variable` |
| `documents./.styleMs` (ms) | 43.16 | 42.68 | 43.55 | **43.13** | 0.436 | 1.01 | `stable` |
| `documents./.taskMs` (ms) | 409.4 | 383.2 | 412.6 | **401.7** | 16.12 | 4.01 | `variable` |
| `documents./cart.domNodes` (count) | 456 | 456 | 456 | **456** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 3.83 | 3.83 | 3.86 | **3.84** | 0.017 | 0.44 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 18.32 | 17.89 | 19.68 | **18.63** | 0.934 | 5.01 | `variable` |
| `documents./cart.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 41.38 | 43.98 | 45.77 | **43.71** | 2.21 | 5.05 | `variable` |
| `documents./cart.styleMs` (ms) | 30.62 | 31.60 | 32.50 | **31.57** | 0.942 | 2.98 | `stable` |
| `documents./cart.taskMs` (ms) | 306.9 | 309.2 | 335.5 | **317.2** | 15.85 | 5.00 | `variable` |
| `documents./faq.domNodes` (count) | 734 | 734 | 734 | **734** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 2.92 | 2.94 | 2.93 | **2.93** | 0.009 | 0.32 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 22.25 | 23.17 | 23.46 | **22.96** | 0.632 | 2.75 | `stable` |
| `documents./faq.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 40.17 | 41.54 | 42.29 | **41.33** | 1.07 | 2.60 | `stable` |
| `documents./faq.styleMs` (ms) | 32.84 | 33.22 | 34.27 | **33.44** | 0.742 | 2.22 | `stable` |
| `documents./faq.taskMs` (ms) | 287.7 | 291.4 | 305.0 | **294.7** | 9.12 | 3.09 | `variable` |
| `documents./faq/contact.domNodes` (count) | 573 | 573 | 573 | **573** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.02 | 3.02 | 3.02 | **3.02** | 0.002 | 0.07 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 28.16 | 26.35 | 27.82 | **27.45** | 0.967 | 3.52 | `variable` |
| `documents./faq/contact.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 41.31 | 41.67 | 41.35 | **41.44** | 0.195 | 0.47 | `deterministic` |
| `documents./faq/contact.styleMs` (ms) | 34.24 | 32.26 | 33.96 | **33.48** | 1.07 | 3.21 | `variable` |
| `documents./faq/contact.taskMs` (ms) | 288.0 | 290.0 | 298.5 | **292.2** | 5.56 | 1.90 | `stable` |
| `documents./product.domNodes` (count) | 1338 | 1339 | 1339 | **1338.67** | 0.58 | 0.04 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.16 | 3.15 | 3.16 | **3.16** | 0.006 | 0.20 | `deterministic` |
| `documents./product.layoutMs` (ms) | 34.24 | 35.79 | 35.01 | **35.01** | 0.772 | 2.20 | `stable` |
| `documents./product.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 45.96 | 46.06 | 45.89 | **45.97** | 0.086 | 0.19 | `deterministic` |
| `documents./product.styleMs` (ms) | 39.80 | 39.35 | 38.89 | **39.35** | 0.455 | 1.16 | `stable` |
| `documents./product.taskMs` (ms) | 341.2 | 339.2 | 347.6 | **342.7** | 4.40 | 1.28 | `stable` |
| `documents./product/p-0001.domNodes` (count) | 912 | 912 | 912 | **912** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 3.66 | 3.66 | 3.66 | **3.66** | 0.002 | 0.05 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 34.73 | 35.03 | 35.15 | **34.97** | 0.219 | 0.63 | `stable` |
| `documents./product/p-0001.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 47.30 | 47.68 | 46.58 | **47.19** | 0.560 | 1.19 | `stable` |
| `documents./product/p-0001.styleMs` (ms) | 38.99 | 39.43 | 39.90 | **39.44** | 0.453 | 1.15 | `stable` |
| `documents./product/p-0001.taskMs` (ms) | 366.3 | 374.8 | 389.0 | **376.7** | 11.47 | 3.05 | `variable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `documents./.domNodes` | 688 | 1005 | +46.1% | yes — rspack-react better |
| `documents./.jsHeapMb` | 2.81 | 2.62 | -6.8% | yes — rspack-svelte better |
| `documents./.layoutMs` | 33.15 | 32.73 | -1.3% | no — within noise |
| `documents./.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./.scriptMs` | 44.91 | 44.17 | -1.7% | no — within noise |
| `documents./.styleMs` | 42.83 | 43.13 | +0.7% | no — within noise |
| `documents./.taskMs` | 417.5 | 401.7 | -3.8% | no — within noise |
| `documents./cart.domNodes` | 260 | 456 | +75.4% | yes — rspack-react better |
| `documents./cart.jsHeapMb` | 4.31 | 3.84 | -10.8% | yes — rspack-svelte better |
| `documents./cart.layoutMs` | 18.15 | 18.63 | +2.7% | no — within noise |
| `documents./cart.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./cart.scriptMs` | 60.18 | 43.71 | -27.4% | yes — rspack-svelte better |
| `documents./cart.styleMs` | 31.48 | 31.57 | +0.3% | no — within noise |
| `documents./cart.taskMs` | 345.8 | 317.2 | -8.3% | yes — rspack-svelte better |
| `documents./faq.domNodes` | 542 | 734 | +35.4% | yes — rspack-react better |
| `documents./faq.jsHeapMb` | 3.20 | 2.93 | -8.5% | yes — rspack-svelte better |
| `documents./faq.layoutMs` | 22.98 | 22.96 | -0.1% | no — within noise |
| `documents./faq.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./faq.scriptMs` | 43.33 | 41.33 | -4.6% | no — within noise |
| `documents./faq.styleMs` | 34.10 | 33.44 | -1.9% | no — within noise |
| `documents./faq.taskMs` | 305.9 | 294.7 | -3.7% | no — within noise |
| `documents./faq/contact.domNodes` | 389 | 573 | +47.3% | yes — rspack-react better |
| `documents./faq/contact.jsHeapMb` | 3.31 | 3.02 | -8.8% | yes — rspack-svelte better |
| `documents./faq/contact.layoutMs` | 28.30 | 27.45 | -3.0% | no — within noise |
| `documents./faq/contact.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./faq/contact.scriptMs` | 42.62 | 41.44 | -2.8% | yes — rspack-svelte better |
| `documents./faq/contact.styleMs` | 33.07 | 33.48 | +1.2% | no — within noise |
| `documents./faq/contact.taskMs` | 303.5 | 292.2 | -3.7% | no — within noise |
| `documents./product.domNodes` | 904.33 | 1338.67 | +48.0% | yes — rspack-react better |
| `documents./product.jsHeapMb` | 3.52 | 3.16 | -10.2% | yes — rspack-svelte better |
| `documents./product.layoutMs` | 33.46 | 35.01 | +4.7% | yes — rspack-react better |
| `documents./product.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./product.scriptMs` | 46.97 | 45.97 | -2.1% | yes — rspack-svelte better |
| `documents./product.styleMs` | 40.08 | 39.35 | -1.8% | no — within noise |
| `documents./product.taskMs` | 346.4 | 342.7 | -1.1% | no — within noise |
| `documents./product/p-0001.domNodes` | 640 | 912 | +42.5% | yes — rspack-react better |
| `documents./product/p-0001.jsHeapMb` | 4.18 | 3.66 | -12.5% | yes — rspack-svelte better |
| `documents./product/p-0001.layoutMs` | 35.98 | 34.97 | -2.8% | no — within noise |
| `documents./product/p-0001.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./product/p-0001.scriptMs` | 61.26 | 47.19 | -23.0% | yes — rspack-svelte better |
| `documents./product/p-0001.styleMs` | 38.82 | 39.44 | +1.6% | no — within noise |
| `documents./product/p-0001.taskMs` | 408.4 | 376.7 | -7.8% | yes — rspack-svelte better |

### 6.6 Server cost

**Cores used** — Effective parallelism during the load window. *Instrument: CPU time / wall time.*

**Server CPU per request** — User plus system CPU time divided by requests served in the same window. The number that decides how many machines a stack needs. *Instrument: process.cpuUsage() delta, in-process.*

**Server CPU — system** — Time in kernel calls — sockets, filesystem — across the load window. *Instrument: process.cpuUsage().*

**Server CPU — user** — Time in application code across the load window. *Instrument: process.cpuUsage().*

**Event-loop utilisation** — Fraction of the window the loop was active. The honest measure of saturation. *Instrument: perf_hooks.performance.eventLoopUtilization().*

**GC pause total** — Summed collection pauses across the load window. *Instrument: PerformanceObserver, entryTypes gc.*

**V8 heap used** — Sampled under load; not collected first, so it reflects allocation as well as retention. *Instrument: process.memoryUsage().heapUsed.* *Caveat: Retention is measured separately under sustainedHeap, after a forced collection.*

**Latency p50** — Median response time under sustained load. *Instrument: autocannon.*

**Latency p99** — Tail response time under sustained load. *Instrument: autocannon.*

**Throughput** — Sustained request rate against one route with the server already warm. *Instrument: autocannon, warm-up discarded.* *Caveat: The least reproducible figure in this report. It reversed sign between two runs of identical builds, which is why dispersion is printed beside every mean.*

**Resident memory** — Total resident set of the host process under load. *Instrument: process.memoryUsage().rss.*

**Heap retained per request** — Four load blocks; the heap is read after forcing a GC so the figure is retention rather than allocation. A leak has two signatures hardware cannot change: constant retention per request, and growth every block. *Instrument: process.memoryUsage() after a forced major collection.*

<details><summary><strong>rspack-react</strong> — 45 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `server./.coresUsed` (cores) | 1.35 | 1.34 | 1.36 | **1.35** | 0.01 | 0.56 | `stable` |
| `server./.cpuPerRequestMs` (ms) | 0.825 | 0.824 | 0.828 | **0.826** | 0.002 | 0.25 | `deterministic` |
| `server./.cpuSystemMs` (ms) | 477.9 | 486.6 | 488.5 | **484.3** | 5.67 | 1.17 | `stable` |
| `server./.cpuUserMs` (ms) | 10331.5 | 10267.5 | 10379.9 | **10326.3** | 56.40 | 0.55 | `stable` |
| `server./.eventLoopUtilization` (ratio) | 0.884 | 0.883 | 0.888 | **0.885** | 0.003 | 0.31 | `deterministic` |
| `server./.gcPauseMs` (ms) | 60.47 | 58.53 | 59.49 | **59.50** | 0.970 | 1.63 | `stable` |
| `server./.heapUsedMb` (MB) | 86.31 | 35.88 | 42.79 | **54.99** | 27.34 | 49.72 | `unstable` |
| `server./.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./.rps` (req/s) | 1637.1 | 1630.5 | 1638.9 | **1635.5** | 4.42 | 0.27 | `deterministic` |
| `server./.rssMb` (MB) | 277.3 | 273.9 | 275.2 | **275.5** | 1.72 | 0.62 | `stable` |
| `server./my-account.coresUsed` (cores) | 1.31 | 1.31 | 1.32 | **1.31** | 0 | 0.16 | `deterministic` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.330 | 0.337 | 0.342 | **0.336** | 0.006 | 1.79 | `stable` |
| `server./my-account.cpuSystemMs` (ms) | 940.9 | 949.8 | 945.3 | **945.3** | 4.49 | 0.47 | `deterministic` |
| `server./my-account.cpuUserMs` (ms) | 9566.4 | 9565.7 | 9593.3 | **9575.2** | 15.74 | 0.16 | `deterministic` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.974 | 0.970 | 0.969 | **0.971** | 0.003 | 0.30 | `deterministic` |
| `server./my-account.gcPauseMs` (ms) | 70.48 | 71.27 | 71.43 | **71.06** | 0.509 | 0.72 | `stable` |
| `server./my-account.heapUsedMb` (MB) | 76.34 | 49.76 | 58.90 | **61.67** | 13.50 | 21.90 | `unstable` |
| `server./my-account.p50Ms` (ms) | 1.00 | 1.00 | 2.00 | **1.33** | 0.577 | 43.30 | `unstable` |
| `server./my-account.p99Ms` (ms) | 3.00 | 3.00 | 3.00 | **3.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.rps` (req/s) | 3977.8 | 3897.5 | 3849.5 | **3908.3** | 64.80 | 1.66 | `stable` |
| `server./my-account.rssMb` (MB) | 244.7 | 237.5 | 247.5 | **243.2** | 5.13 | 2.11 | `stable` |
| `server./product.coresUsed` (cores) | 1.26 | 1.25 | 1.28 | **1.26** | 0.01 | 1.17 | `stable` |
| `server./product.cpuPerRequestMs` (ms) | 1.15 | 1.17 | 1.14 | **1.15** | 0.015 | 1.30 | `stable` |
| `server./product.cpuSystemMs` (ms) | 689.1 | 677.8 | 709.0 | **692.0** | 15.80 | 2.28 | `stable` |
| `server./product.cpuUserMs` (ms) | 9370.3 | 9337.0 | 9528.9 | **9412.0** | 102.6 | 1.09 | `stable` |
| `server./product.eventLoopUtilization` (ratio) | 0.886 | 0.879 | 0.907 | **0.891** | 0.015 | 1.66 | `stable` |
| `server./product.gcPauseMs` (ms) | 146.8 | 143.3 | 150.7 | **146.9** | 3.68 | 2.51 | `stable` |
| `server./product.heapUsedMb` (MB) | 84.80 | 38.28 | 82.20 | **68.43** | 26.14 | 38.20 | `unstable` |
| `server./product.p50Ms` (ms) | 7.00 | 7.00 | 7.00 | **7.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 13.00 | 10.00 | 11.00 | **11.33** | 1.53 | 13.48 | `unstable` |
| `server./product.rps` (req/s) | 1092.1 | 1073.5 | 1126.1 | **1097.3** | 26.69 | 2.43 | `stable` |
| `server./product.rssMb` (MB) | 298.8 | 285.7 | 294.3 | **292.9** | 6.65 | 2.27 | `stable` |
| `server./product/p-0001.coresUsed` (cores) | 1.28 | 1.26 | 1.27 | **1.27** | 0.01 | 0.79 | `stable` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.746 | 0.762 | 0.762 | **0.757** | 0.009 | 1.22 | `stable` |
| `server./product/p-0001.cpuSystemMs` (ms) | 490.4 | 483.0 | 484.1 | **485.8** | 3.99 | 0.82 | `stable` |
| `server./product/p-0001.cpuUserMs` (ms) | 9791.5 | 9646.8 | 9681.6 | **9706.6** | 75.56 | 0.78 | `stable` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.893 | 0.880 | 0.881 | **0.885** | 0.007 | 0.84 | `stable` |
| `server./product/p-0001.gcPauseMs` (ms) | 52.49 | 52.16 | 52.45 | **52.37** | 0.180 | 0.34 | `deterministic` |
| `server./product/p-0001.heapUsedMb` (MB) | 28.63 | 73.44 | 43.48 | **48.52** | 22.83 | 47.05 | `unstable` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 5.00 | 6.00 | 6.00 | **5.67** | 0.577 | 10.19 | `unstable` |
| `server./product/p-0001.rps` (req/s) | 1722.1 | 1660.3 | 1666.5 | **1683.0** | 34.07 | 2.02 | `stable` |
| `server./product/p-0001.rssMb` (MB) | 286.2 | 283.2 | 282.0 | **283.8** | 2.14 | 0.75 | `stable` |
| `sustainedHeap.perRequestKb` (kB) | 0.023 | 0.047 | 0.032 | **0.034** | 0.012 | 35.66 | `unstable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 45 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `server./.coresUsed` (cores) | 1.48 | 1.48 | 1.48 | **1.48** | 0 | 0.31 | `deterministic` |
| `server./.cpuPerRequestMs` (ms) | 0.832 | 0.832 | 0.836 | **0.833** | 0.002 | 0.28 | `deterministic` |
| `server./.cpuSystemMs` (ms) | 532.6 | 543.0 | 534.1 | **536.6** | 5.62 | 1.05 | `stable` |
| `server./.cpuUserMs` (ms) | 11277.1 | 11267.7 | 11341.4 | **11295.4** | 40.07 | 0.35 | `deterministic` |
| `server./.eventLoopUtilization` (ratio) | 0.868 | 0.876 | 0.876 | **0.873** | 0.005 | 0.56 | `stable` |
| `server./.gcPauseMs` (ms) | 142.6 | 145.6 | 139.5 | **142.6** | 3.06 | 2.15 | `stable` |
| `server./.heapUsedMb` (MB) | 106.1 | 149.8 | 140.3 | **132.0** | 22.96 | 17.39 | `unstable` |
| `server./.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./.rps` (req/s) | 1773.9 | 1773.5 | 1774.6 | **1774.0** | 0.575 | 0.03 | `deterministic` |
| `server./.rssMb` (MB) | 388.2 | 384.7 | 381.3 | **384.7** | 3.46 | 0.90 | `stable` |
| `server./my-account.coresUsed` (cores) | 1.44 | 1.45 | 1.43 | **1.44** | 0.01 | 0.63 | `stable` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.327 | 0.321 | 0.326 | **0.325** | 0.003 | 0.99 | `stable` |
| `server./my-account.cpuSystemMs` (ms) | 1065.6 | 1058.6 | 1046.4 | **1056.9** | 9.70 | 0.92 | `stable` |
| `server./my-account.cpuUserMs` (ms) | 10455.5 | 10536.3 | 10400.4 | **10464.1** | 68.37 | 0.65 | `stable` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.965 | 0.971 | 0.963 | **0.966** | 0.004 | 0.43 | `deterministic` |
| `server./my-account.gcPauseMs` (ms) | 123.9 | 125.5 | 121.2 | **123.5** | 2.18 | 1.77 | `stable` |
| `server./my-account.heapUsedMb` (MB) | 72.69 | 97.03 | 34.95 | **68.22** | 31.28 | 45.85 | `unstable` |
| `server./my-account.p50Ms` (ms) | 1.00 | 1.00 | 1.00 | **1.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.p99Ms` (ms) | 3.00 | 3.00 | 3.00 | **3.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.rps` (req/s) | 4398.0 | 4520.5 | 4383.0 | **4433.8** | 75.43 | 1.70 | `stable` |
| `server./my-account.rssMb` (MB) | 309.6 | 307.7 | 305.2 | **307.5** | 2.19 | 0.71 | `stable` |
| `server./product.coresUsed` (cores) | 1.36 | 1.35 | 1.34 | **1.35** | 0.01 | 0.94 | `stable` |
| `server./product.cpuPerRequestMs` (ms) | 1.14 | 1.12 | 1.11 | **1.13** | 0.013 | 1.18 | `stable` |
| `server./product.cpuSystemMs` (ms) | 769.9 | 784.5 | 768.2 | **774.2** | 8.94 | 1.15 | `stable` |
| `server./product.cpuUserMs` (ms) | 10136.0 | 10002.4 | 9941.7 | **10026.7** | 99.40 | 0.99 | `stable` |
| `server./product.eventLoopUtilization` (ratio) | 0.874 | 0.873 | 0.870 | **0.872** | 0.002 | 0.20 | `deterministic` |
| `server./product.gcPauseMs` (ms) | 198.6 | 205.1 | 199.5 | **201.0** | 3.54 | 1.76 | `stable` |
| `server./product.heapUsedMb` (MB) | 123.1 | 33.07 | 185.9 | **114.0** | 76.80 | 67.37 | `unstable` |
| `server./product.p50Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 14.00 | 13.00 | 14.00 | **13.67** | 0.577 | 4.22 | `variable` |
| `server./product.rps` (req/s) | 1194.9 | 1200.1 | 1200.6 | **1198.5** | 3.19 | 0.27 | `deterministic` |
| `server./product.rssMb` (MB) | 482.4 | 392.1 | 498.7 | **457.7** | 57.47 | 12.56 | `unstable` |
| `server./product/p-0001.coresUsed` (cores) | 1.41 | 1.4 | 1.37 | **1.39** | 0.02 | 1.63 | `stable` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.752 | 0.744 | 0.825 | **0.774** | 0.045 | 5.77 | `variable` |
| `server./product/p-0001.cpuSystemMs` (ms) | 555.4 | 555.2 | 733.0 | **614.5** | 102.6 | 16.69 | `unstable` |
| `server./product/p-0001.cpuUserMs` (ms) | 10771.3 | 10624.2 | 10227.4 | **10541.0** | 281.3 | 2.67 | `stable` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.866 | 0.869 | 0.860 | **0.865** | 0.004 | 0.51 | `stable` |
| `server./product/p-0001.gcPauseMs` (ms) | 145.5 | 145.6 | 143.1 | **144.7** | 1.37 | 0.95 | `stable` |
| `server./product/p-0001.heapUsedMb` (MB) | 93.49 | 111.8 | 89.78 | **98.36** | 11.80 | 12.00 | `unstable` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 6.00 | 6.00 | 10.00 | **7.33** | 2.31 | 31.49 | `unstable` |
| `server./product/p-0001.rps` (req/s) | 1881.8 | 1877.3 | 1659.5 | **1806.2** | 127.0 | 7.03 | `variable` |
| `server./product/p-0001.rssMb` (MB) | 420.2 | 417.6 | 406.9 | **414.9** | 7.02 | 1.69 | `stable` |
| `sustainedHeap.perRequestKb` (kB) | 0.029 | 0.035 | 0.057 | **0.040** | 0.015 | 36.55 | `unstable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `server./.coresUsed` | 1.35 | 1.48 | +9.4% | yes — rspack-react better |
| `server./.cpuPerRequestMs` | 0.826 | 0.833 | +0.9% | no — within noise |
| `server./.cpuSystemMs` | 484.3 | 536.6 | +10.8% | yes — rspack-react better |
| `server./.cpuUserMs` | 10326.3 | 11295.4 | +9.4% | yes — rspack-react better |
| `server./.eventLoopUtilization` | 0.885 | 0.873 | -1.3% | yes — rspack-svelte better |
| `server./.gcPauseMs` | 59.50 | 142.6 | +139.6% | yes — rspack-react better |
| `server./.heapUsedMb` | 54.99 | 132.0 | +140.1% | yes — rspack-react better |
| `server./.p50Ms` | 4.00 | 4.00 | 0.0% | no — within noise |
| `server./.p99Ms` | 6.00 | 6.00 | 0.0% | no — within noise |
| `server./.rps` | 1635.5 | 1774.0 | +8.5% | yes — rspack-svelte better |
| `server./.rssMb` | 275.5 | 384.7 | +39.7% | yes — rspack-react better |
| `server./my-account.coresUsed` | 1.31 | 1.44 | +9.5% | yes — rspack-react better |
| `server./my-account.cpuPerRequestMs` | 0.336 | 0.325 | -3.5% | yes — rspack-svelte better |
| `server./my-account.cpuSystemMs` | 945.3 | 1056.9 | +11.8% | yes — rspack-react better |
| `server./my-account.cpuUserMs` | 9575.2 | 10464.1 | +9.3% | yes — rspack-react better |
| `server./my-account.eventLoopUtilization` | 0.971 | 0.966 | -0.5% | no — within noise |
| `server./my-account.gcPauseMs` | 71.06 | 123.5 | +73.8% | yes — rspack-react better |
| `server./my-account.heapUsedMb` | 61.67 | 68.22 | +10.6% | no — within noise |
| `server./my-account.p50Ms` | 1.33 | 1.00 | -25.0% | no — within noise |
| `server./my-account.p99Ms` | 3.00 | 3.00 | 0.0% | no — within noise |
| `server./my-account.rps` | 3908.3 | 4433.8 | +13.4% | yes — rspack-svelte better |
| `server./my-account.rssMb` | 243.2 | 307.5 | +26.4% | yes — rspack-react better |
| `server./product.coresUsed` | 1.26 | 1.35 | +6.9% | yes — rspack-react better |
| `server./product.cpuPerRequestMs` | 1.15 | 1.13 | -2.1% | no — within noise |
| `server./product.cpuSystemMs` | 692.0 | 774.2 | +11.9% | yes — rspack-react better |
| `server./product.cpuUserMs` | 9412.0 | 10026.7 | +6.5% | yes — rspack-react better |
| `server./product.eventLoopUtilization` | 0.891 | 0.872 | -2.1% | yes — rspack-svelte better |
| `server./product.gcPauseMs` | 146.9 | 201.0 | +36.8% | yes — rspack-react better |
| `server./product.heapUsedMb` | 68.43 | 114.0 | +66.6% | no — within noise |
| `server./product.p50Ms` | 7.00 | 6.00 | -14.3% | yes — rspack-svelte better |
| `server./product.p99Ms` | 11.33 | 13.67 | +20.6% | yes — rspack-react better |
| `server./product.rps` | 1097.3 | 1198.5 | +9.2% | yes — rspack-svelte better |
| `server./product.rssMb` | 292.9 | 457.7 | +56.3% | yes — rspack-react better |
| `server./product/p-0001.coresUsed` | 1.27 | 1.39 | +9.5% | yes — rspack-react better |
| `server./product/p-0001.cpuPerRequestMs` | 0.757 | 0.774 | +2.2% | no — within noise |
| `server./product/p-0001.cpuSystemMs` | 485.8 | 614.5 | +26.5% | yes — rspack-react better |
| `server./product/p-0001.cpuUserMs` | 9706.6 | 10541.0 | +8.6% | yes — rspack-react better |
| `server./product/p-0001.eventLoopUtilization` | 0.885 | 0.865 | -2.2% | yes — rspack-svelte better |
| `server./product/p-0001.gcPauseMs` | 52.37 | 144.7 | +176.4% | yes — rspack-react better |
| `server./product/p-0001.heapUsedMb` | 48.52 | 98.36 | +102.7% | yes — rspack-react better |
| `server./product/p-0001.p50Ms` | 4.00 | 4.00 | 0.0% | no — within noise |
| `server./product/p-0001.p99Ms` | 5.67 | 7.33 | +29.4% | no — within noise |
| `server./product/p-0001.rps` | 1683.0 | 1806.2 | +7.3% | no — within noise |
| `server./product/p-0001.rssMb` | 283.8 | 414.9 | +46.2% | yes — rspack-react better |
| `sustainedHeap.perRequestKb` | 0.034 | 0.040 | +18.6% | no — within noise |

### 6.7 Developer experience

**Bundler cache saving** — How much of a cold build the persistent cache removes. *Instrument: Derived: 1 - warm/cold.*

**Cold build** — No dist, no bundler cache. Every app built sequentially. *Instrument: Wall clock around each app build.* *Caveat: The most hardware-sensitive figure here; comparable only on identical machines.*

**Edit to browser** — A real edit, rebuild, restart, and the change verified present in the DOM. *Instrument: Wall clock, change confirmed in a real browser.* *Caveat: Neither stack has a watch mode; this is a full rebuild in both.*

**Incremental rebuild** — One source file touched, one app rebuilt. The number a developer meets most often. *Instrument: Wall clock, median of three.*

**Pre-commit gate** — Whole-workspace lint, typecheck and unit tests. *Instrument: Wall clock.*

**Per-app build time** — One app, built alone. *Instrument: Wall clock.*

**Stack startup** — Nine processes: registry, media, four remotes, two hosts, edge. *Instrument: Wall clock until every health probe answers.*

**Clean tree to rendering page** — Cold build plus startup plus first page render. What a new joiner waits through once, and CI waits through every run. *Instrument: Wall clock.*

**Warm build** — dist removed, bundler cache intact. *Instrument: Wall clock.*

<details open><summary><strong>rspack-react</strong> — 22 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `dx.cacheSaving` (ratio) | 0.065 | 0.064 | 0.062 | **0.064** | 0.002 | 2.40 | `stable` |
| `dx.coldBuildMs` (ms) | 14248.0 | 14071.0 | 14309.0 | **14209.3** | 123.6 | 0.87 | `stable` |
| `dx.editToBrowserMs` (ms) | 7249.0 | 7247.0 | 7337.0 | **7277.7** | 51.39 | 0.71 | `stable` |
| `dx.incrementalMs` (ms) | 2911.0 | 2879.0 | 2933.0 | **2907.7** | 27.15 | 0.93 | `stable` |
| `dx.lintMs` (ms) | 9762.0 | 9845.0 | 9818.0 | **9808.3** | 42.34 | 0.43 | `deterministic` |
| `dx.perApp.cart.coldMs` (ms) | 3009.0 | 2995.0 | 3039.0 | **3014.3** | 22.48 | 0.75 | `stable` |
| `dx.perApp.cart.warmMs` (ms) | 2791.0 | 2744.0 | 2784.0 | **2773.0** | 25.36 | 0.91 | `stable` |
| `dx.perApp.chrome.coldMs` (ms) | 2855.0 | 2838.0 | 2938.0 | **2877.0** | 53.51 | 1.86 | `stable` |
| `dx.perApp.chrome.warmMs` (ms) | 2741.0 | 2730.0 | 2780.0 | **2750.3** | 26.27 | 0.96 | `stable` |
| `dx.perApp.faq.coldMs` (ms) | 2864.0 | 2821.0 | 2843.0 | **2842.7** | 21.50 | 0.76 | `stable` |
| `dx.perApp.faq.warmMs` (ms) | 2724.0 | 2752.0 | 2775.0 | **2750.3** | 25.54 | 0.93 | `stable` |
| `dx.perApp.my-account.coldMs` (ms) | 1176.0 | 1168.0 | 1198.0 | **1180.7** | 15.53 | 1.32 | `stable` |
| `dx.perApp.my-account.warmMs` (ms) | 1122.0 | 1056.0 | 1098.0 | **1092.0** | 33.41 | 3.06 | `variable` |
| `dx.perApp.product.coldMs` (ms) | 3176.0 | 3092.0 | 3108.0 | **3125.3** | 44.60 | 1.43 | `stable` |
| `dx.perApp.product.warmMs` (ms) | 2818.0 | 2790.0 | 2854.0 | **2820.7** | 32.08 | 1.14 | `stable` |
| `dx.perApp.storefront.coldMs` (ms) | 1167.0 | 1157.0 | 1182.0 | **1168.7** | 12.58 | 1.08 | `stable` |
| `dx.perApp.storefront.warmMs` (ms) | 1125.0 | 1098.0 | 1126.0 | **1116.3** | 15.89 | 1.42 | `stable` |
| `dx.startupMs` (ms) | 3370.0 | 3355.0 | 3366.0 | **3363.7** | 7.77 | 0.23 | `deterministic` |
| `dx.testMs` (ms) | 5115.0 | 5119.0 | 5077.0 | **5103.7** | 23.18 | 0.45 | `deterministic` |
| `dx.typecheckMs` (ms) | 8033.0 | 8424.0 | 8023.0 | **8160.0** | 228.7 | 2.80 | `stable` |
| `dx.unblockedMs` (ms) | 17618.0 | 17426.0 | 17675.0 | **17573.0** | 130.5 | 0.74 | `stable` |
| `dx.warmBuildMs` (ms) | 13320.0 | 13171.0 | 13418.0 | **13303.0** | 124.4 | 0.93 | `stable` |

</details>

<details open><summary><strong>rspack-svelte</strong> — 22 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `dx.cacheSaving` (ratio) | 0.342 | 0.356 | 0.300 | **0.333** | 0.029 | 8.76 | `variable` |
| `dx.coldBuildMs` (ms) | 7741.0 | 7833.0 | 8018.0 | **7864.0** | 141.1 | 1.79 | `stable` |
| `dx.editToBrowserMs` (ms) | 5379.0 | 5394.0 | 5401.0 | **5391.3** | 11.24 | 0.21 | `deterministic` |
| `dx.incrementalMs` (ms) | 906.0 | 916.0 | 950.0 | **924.0** | 23.07 | 2.50 | `stable` |
| `dx.lintMs` (ms) | 9766.0 | 9728.0 | 10261.0 | **9918.3** | 297.4 | 3.00 | `stable` |
| `dx.perApp.cart.coldMs` (ms) | 1357.0 | 1367.0 | 1370.0 | **1364.7** | 6.81 | 0.50 | `deterministic` |
| `dx.perApp.cart.warmMs` (ms) | 862.0 | 842.0 | 910.0 | **871.3** | 34.95 | 4.01 | `variable` |
| `dx.perApp.chrome.coldMs` (ms) | 1239.0 | 1256.0 | 1251.0 | **1248.7** | 8.74 | 0.70 | `stable` |
| `dx.perApp.chrome.warmMs` (ms) | 841.0 | 842.0 | 1047.0 | **910.0** | 118.6 | 13.04 | `unstable` |
| `dx.perApp.faq.coldMs` (ms) | 1217.0 | 1225.0 | 1231.0 | **1224.3** | 7.02 | 0.57 | `stable` |
| `dx.perApp.faq.warmMs` (ms) | 848.0 | 832.0 | 965.0 | **881.7** | 72.61 | 8.24 | `variable` |
| `dx.perApp.my-account.coldMs` (ms) | 1316.0 | 1342.0 | 1412.0 | **1356.7** | 49.65 | 3.66 | `variable` |
| `dx.perApp.my-account.warmMs` (ms) | 839.0 | 846.0 | 886.0 | **857.0** | 25.36 | 2.96 | `stable` |
| `dx.perApp.product.coldMs` (ms) | 1475.0 | 1502.0 | 1492.0 | **1489.7** | 13.65 | 0.92 | `stable` |
| `dx.perApp.product.warmMs` (ms) | 851.0 | 845.0 | 938.0 | **878.0** | 52.05 | 5.93 | `variable` |
| `dx.perApp.storefront.coldMs` (ms) | 1137.0 | 1141.0 | 1263.0 | **1180.3** | 71.62 | 6.07 | `variable` |
| `dx.perApp.storefront.warmMs` (ms) | 852.0 | 841.0 | 868.0 | **853.7** | 13.58 | 1.59 | `stable` |
| `dx.startupMs` (ms) | 3353.0 | 3360.0 | 3366.0 | **3359.7** | 6.51 | 0.19 | `deterministic` |
| `dx.testMs` (ms) | 5112.0 | 5070.0 | 5431.0 | **5204.3** | 197.4 | 3.79 | `variable` |
| `dx.typecheckMs` (ms) | 7769.0 | 7690.0 | 8447.0 | **7968.7** | 416.1 | 5.22 | `variable` |
| `dx.unblockedMs` (ms) | 11094.0 | 11193.0 | 11384.0 | **11223.7** | 147.4 | 1.31 | `stable` |
| `dx.warmBuildMs` (ms) | 5094.0 | 5048.0 | 5614.0 | **5252.0** | 314.3 | 5.99 | `variable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `dx.cacheSaving` | 0.064 | 0.333 | +422.5% | yes — rspack-svelte better |
| `dx.coldBuildMs` | 14209.3 | 7864.0 | -44.7% | yes — rspack-svelte better |
| `dx.editToBrowserMs` | 7277.7 | 5391.3 | -25.9% | yes — rspack-svelte better |
| `dx.incrementalMs` | 2907.7 | 924.0 | -68.2% | yes — rspack-svelte better |
| `dx.lintMs` | 9808.3 | 9918.3 | +1.1% | no — within noise |
| `dx.perApp.cart.coldMs` | 3014.3 | 1364.7 | -54.7% | yes — rspack-svelte better |
| `dx.perApp.cart.warmMs` | 2773.0 | 871.3 | -68.6% | yes — rspack-svelte better |
| `dx.perApp.chrome.coldMs` | 2877.0 | 1248.7 | -56.6% | yes — rspack-svelte better |
| `dx.perApp.chrome.warmMs` | 2750.3 | 910.0 | -66.9% | yes — rspack-svelte better |
| `dx.perApp.faq.coldMs` | 2842.7 | 1224.3 | -56.9% | yes — rspack-svelte better |
| `dx.perApp.faq.warmMs` | 2750.3 | 881.7 | -67.9% | yes — rspack-svelte better |
| `dx.perApp.my-account.coldMs` | 1180.7 | 1356.7 | +14.9% | yes — rspack-react better |
| `dx.perApp.my-account.warmMs` | 1092.0 | 857.0 | -21.5% | yes — rspack-svelte better |
| `dx.perApp.product.coldMs` | 3125.3 | 1489.7 | -52.3% | yes — rspack-svelte better |
| `dx.perApp.product.warmMs` | 2820.7 | 878.0 | -68.9% | yes — rspack-svelte better |
| `dx.perApp.storefront.coldMs` | 1168.7 | 1180.3 | +1.0% | no — within noise |
| `dx.perApp.storefront.warmMs` | 1116.3 | 853.7 | -23.5% | yes — rspack-svelte better |
| `dx.startupMs` | 3363.7 | 3359.7 | -0.1% | no — within noise |
| `dx.testMs` | 5103.7 | 5204.3 | +2.0% | no — within noise |
| `dx.typecheckMs` | 8160.0 | 7968.7 | -2.3% | no — within noise |
| `dx.unblockedMs` | 17573.0 | 11223.7 | -36.1% | yes — rspack-svelte better |
| `dx.warmBuildMs` | 13303.0 | 5252.0 | -60.5% | yes — rspack-svelte better |

### 6.8 Composition and styling

**Behaviour size** — A behaviour is vanilla TypeScript attached to server-rendered markup; no framework is involved in either stack. *Instrument: Built chunk, gzip level 9.*

**CSS coverage** — Fraction of downloaded CSS the page actually applies. *Instrument: CDP CSS coverage.*

**CSS Modules** — Emitted identifiers and the collisions a bare [local]-[hash] would have produced. *Instrument: Static analysis of built stylesheets.*

<details><summary><strong>rspack-react</strong> — 12 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `behaviors.cart.mini.brotli` (bytes) | 567 | 567 | 567 | **567** | 0 | 0.00 | `deterministic` |
| `behaviors.cart.mini.gzip` (bytes) | 662 | 662 | 662 | **662** | 0 | 0.00 | `deterministic` |
| `behaviors.chrome.account.brotli` (bytes) | 460 | 460 | 460 | **460** | 0 | 0.00 | `deterministic` |
| `behaviors.chrome.account.gzip` (bytes) | 572 | 572 | 572 | **572** | 0 | 0.00 | `deterministic` |
| `behaviors.product.autosubmit.brotli` (bytes) | 437 | 437 | 437 | **437** | 0 | 0.00 | `deterministic` |
| `behaviors.product.autosubmit.gzip` (bytes) | 541 | 541 | 541 | **541** | 0 | 0.00 | `deterministic` |
| `behaviors.product.gallery.brotli` (bytes) | 641 | 641 | 641 | **641** | 0 | 0.00 | `deterministic` |
| `behaviors.product.gallery.gzip` (bytes) | 770 | 770 | 770 | **770** | 0 | 0.00 | `deterministic` |
| `cssModules.coverageRatio` (ratio) | 0.814 | 0.814 | 0.814 | **0.814** | 0.000 | 0.00 | `deterministic` |
| `cssModules.identifiers` (count) | 8 | 8 | 8 | **8** | 0 | 0.00 | `deterministic` |
| `cssModules.modules` (count) | 2 | 2 | 2 | **2** | 0 | 0.00 | `deterministic` |
| `cssModules.wouldHaveCollided` (count) | 3 | 3 | 3 | **3** | 0 | 0.00 | `deterministic` |

</details>

<details><summary><strong>rspack-svelte</strong> — 12 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `behaviors.cart.mini.brotli` (bytes) | 567 | 567 | 567 | **567** | 0 | 0.00 | `deterministic` |
| `behaviors.cart.mini.gzip` (bytes) | 662 | 662 | 662 | **662** | 0 | 0.00 | `deterministic` |
| `behaviors.chrome.account.brotli` (bytes) | 460 | 460 | 460 | **460** | 0 | 0.00 | `deterministic` |
| `behaviors.chrome.account.gzip` (bytes) | 572 | 572 | 572 | **572** | 0 | 0.00 | `deterministic` |
| `behaviors.product.autosubmit.brotli` (bytes) | 437 | 437 | 437 | **437** | 0 | 0.00 | `deterministic` |
| `behaviors.product.autosubmit.gzip` (bytes) | 541 | 541 | 541 | **541** | 0 | 0.00 | `deterministic` |
| `behaviors.product.gallery.brotli` (bytes) | 641 | 641 | 641 | **641** | 0 | 0.00 | `deterministic` |
| `behaviors.product.gallery.gzip` (bytes) | 770 | 770 | 770 | **770** | 0 | 0.00 | `deterministic` |
| `cssModules.coverageRatio` (ratio) | 0.814 | 0.814 | 0.814 | **0.814** | 0.000 | 0.00 | `deterministic` |
| `cssModules.identifiers` (count) | 8 | 8 | 8 | **8** | 0 | 0.00 | `deterministic` |
| `cssModules.modules` (count) | 2 | 2 | 2 | **2** | 0 | 0.00 | `deterministic` |
| `cssModules.wouldHaveCollided` (count) | 3 | 3 | 3 | **3** | 0 | 0.00 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `behaviors.cart.mini.brotli` | 567 | 567 | 0.0% | no — within noise |
| `behaviors.cart.mini.gzip` | 662 | 662 | 0.0% | no — within noise |
| `behaviors.chrome.account.brotli` | 460 | 460 | 0.0% | no — within noise |
| `behaviors.chrome.account.gzip` | 572 | 572 | 0.0% | no — within noise |
| `behaviors.product.autosubmit.brotli` | 437 | 437 | 0.0% | no — within noise |
| `behaviors.product.autosubmit.gzip` | 541 | 541 | 0.0% | no — within noise |
| `behaviors.product.gallery.brotli` | 641 | 641 | 0.0% | no — within noise |
| `behaviors.product.gallery.gzip` | 770 | 770 | 0.0% | no — within noise |
| `cssModules.coverageRatio` | 0.814 | 0.814 | +0.0% | no — within noise |
| `cssModules.identifiers` | 8 | 8 | 0.0% | no — within noise |
| `cssModules.modules` | 2 | 2 | 0.0% | no — within noise |
| `cssModules.wouldHaveCollided` | 3 | 3 | 0.0% | no — within noise |

## 7. Threats to validity

Stated plainly, because a report that hides its limits is marketing.

- **Sample size.** 3 runs. Standard deviations from three samples are coarse, and
  the `unstable` class exists precisely because some metrics need more.
- **One machine, not CI.** Build times and throughput are the most hardware-sensitive figures
  here and are comparable only on identical hardware. Byte counts are not affected.
- **Localhost.** There is no network. TTFB measures server render time, and transfer sizes are
  what a browser would fetch rather than what it would experience over a real connection.
- **One bundler.** Both stacks are built with Rspack, so every difference here is a framework
  difference. A Vite comparison would be a different axis and is not built.
- **A port, not two independent designs.** The second implementation reproduces the first
  DOM node for node, because that is what makes the byte comparison meaningful. An idiomatic
  team might build parts of it differently.
- **Synthetic interaction.** Each route receives one scripted interaction so INP is defined.
  A real session would produce a different distribution.

## 8. Reproducing this

```bash
pnpm install
pnpm media                 # fetch the image and video fixtures once
MF_RUNS=3 pnpm research      # every stack, every suite, 3 times, then this report
```

The raw suite reports for every run are archived beside this file, unmodified. The headline
metrics above answer the questions this report was written to answer; the raw reports answer
the ones it was not.

