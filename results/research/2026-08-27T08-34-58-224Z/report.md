# Module Federation under two frameworks

**A measured comparison of the same application implemented in React and in Svelte.**

Generated 2026-08-27T08:34:58.224Z · 3 independent runs of each stack · SPEC_VERSION 4 · catalog `c3b6a5fafb68`

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
| Machine | Apple M4 Pro, 14 cores, 48 GB |
| Platform | darwin-arm64 |
| Node | v24.11.1 (V8 13.6.233.10-node.28) |
| CI | no — a developer workstation |
| Spec version | 4 |
| Dependency catalog | `c3b6a5fafb68` |
| Commit | `3e3abe6` on `main` |
| Runs per stack | 3 |

Both stacks were measured on the same machine, from the same commit, against the same
dependency catalog, minutes apart. **Results from different SPEC_VERSIONs or different
catalog hashes describe different applications and must never be compared.**

**rspack-react** — 368/368, 368/368, 368/368 checks per run:

- `results/runs/rspack-react/2026-08-27T08-18-09-510Z` — 2026-08-27T08:18:09.510Z
- `results/runs/rspack-react/2026-08-27T08-12-07-915Z` — 2026-08-27T08:12:07.915Z
- `results/runs/rspack-react/2026-08-27T08-06-08-356Z` — 2026-08-27T08:06:08.356Z

**rspack-svelte** — 368/368, 368/368, 368/368 checks per run:

- `results/runs/rspack-svelte/2026-08-27T08-34-57-237Z` — 2026-08-27T08:34:57.237Z
- `results/runs/rspack-svelte/2026-08-27T08-29-24-212Z` — 2026-08-27T08:29:24.212Z
- `results/runs/rspack-svelte/2026-08-27T08-23-47-779Z` — 2026-08-27T08:23:47.779Z

## 3. Method

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

## 4. Findings

Of 251 metrics measured on both stacks, **114 show a
difference larger than the measurement spread**. The rest are either identical by
construction or too noisy to separate at this sample size.

The twelve largest resolvable differences:

| metric | route or item | rspack-react | rspack-svelte | change |
|---|---|---:|---:|---:|
| Bundler cache saving | `—` | 0.113 | 0.358 | +218.0% |
| GC pause total | `/product/p-0001` | 51.90 | 148.4 | +186.0% |
| Transfer by owning application | `/my-account` | 26.34 | 65.16 | +147.4% |
| GC pause total | `/` | 59.60 | 144.6 | +142.6% |
| Transfer by owning application | `/product/p-0001` | 25.94 | 59.90 | +130.9% |
| V8 heap used | `/` | 48.82 | 108.7 | +122.7% |
| Transfer by owning application | `/my-account` | 21.41 | 45.84 | +114.1% |
| Transfer by owning application | `/my-account` | 24.04 | 48.02 | +99.8% |
| Transfer by owning application | `/cart` | 31.58 | 62.68 | +98.5% |
| V8 heap used | `/product` | 50.40 | 99.90 | +98.2% |
| DOM nodes (all types) | `/cart` | 259 | 456 | +76.1% |
| GC pause total | `/my-account` | 71.41 | 123.9 | +73.5% |

Units are in the metric tables below. A positive change means rspack-svelte is higher, which is
better for some metrics and worse for others — each table states which.

## 5. Results

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

### 5.1 Page weight

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
| `perRoute./.totalKbGzip` (kB gzip) | 955.5 | 955.5 | 955.5 | **955.5** | 0.000 | 0.00 | `deterministic` |
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
| `perRoute./my-account.totalKbGzip` (kB gzip) | 214.2 | 214.2 | 214.2 | **214.2** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.requests` (count) | 17 | 17 | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.totalKbGzip` (kB gzip) | 144.6 | 144.6 | 144.6 | **144.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.requests` (count) | 17 | 17 | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.totalKbGzip` (kB gzip) | 143.2 | 143.2 | 143.2 | **143.2** | 0.000 | 0.00 | `deterministic` |
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
| `perRoute./.totalKbGzip` (kB gzip) | 954.8 | 954.8 | 954.8 | **954.8** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssKbGzip` (kB gzip) | 12.90 | 12.90 | 12.90 | **12.90** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.requests` (count) | 19 | 19 | 19 | **19** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.totalKbGzip` (kB gzip) | 126.1 | 126.1 | 126.1 | **126.1** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssKbGzip` (kB gzip) | 12.94 | 12.94 | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.totalKbGzip` (kB gzip) | 80.51 | 80.51 | 80.51 | **80.51** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssKbGzip` (kB gzip) | 12.94 | 12.94 | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssSheets` (count) | 4 | 4 | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.leakedKbGzip` (kB gzip) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.requests` (count) | 13 | 13 | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.totalKbGzip` (kB gzip) | 80.51 | 80.51 | 80.51 | **80.51** | 0.000 | 0.00 | `deterministic` |
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
| `perRoute./.totalKbGzip` | 955.5 | 954.8 | -0.1% | no — within noise |
| `perRoute./cart.cssKbGzip` | 12.89 | 12.90 | +0.1% | no — within noise |
| `perRoute./cart.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./cart.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./cart.requests` | 22 | 19 | -13.6% | yes — rspack-svelte better |
| `perRoute./cart.totalKbGzip` | 161.9 | 126.1 | -22.1% | yes — rspack-svelte better |
| `perRoute./faq.cssKbGzip` | 12.94 | 12.94 | 0.0% | no — within noise |
| `perRoute./faq.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./faq.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./faq.requests` | 13 | 13 | 0.0% | no — within noise |
| `perRoute./faq.totalKbGzip` | 81.24 | 80.51 | -0.9% | no — within noise |
| `perRoute./faq/contact.cssKbGzip` | 12.94 | 12.94 | 0.0% | no — within noise |
| `perRoute./faq/contact.cssSheets` | 4 | 4 | 0.0% | no — within noise |
| `perRoute./faq/contact.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./faq/contact.requests` | 13 | 13 | 0.0% | no — within noise |
| `perRoute./faq/contact.totalKbGzip` | 81.24 | 80.51 | -0.9% | no — within noise |
| `perRoute./login.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./login.requests` | 17 | 14 | -17.6% | yes — rspack-svelte better |
| `perRoute./login.totalKbGzip` | 151.6 | 130.6 | -13.8% | yes — rspack-svelte better |
| `perRoute./my-account.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./my-account.requests` | 32 | 32 | 0.0% | no — within noise |
| `perRoute./my-account.totalKbGzip` | 214.2 | 282.0 | +31.6% | yes — rspack-react better |
| `perRoute./my-account/orders.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./my-account/orders.requests` | 17 | 14 | -17.6% | yes — rspack-svelte better |
| `perRoute./my-account/orders.totalKbGzip` | 144.6 | 124.7 | -13.7% | yes — rspack-svelte better |
| `perRoute./my-account/profile.leakedKbGzip` | 0.000 | 0.000 | 0.0% | no — within noise |
| `perRoute./my-account/profile.requests` | 17 | 13 | -23.5% | yes — rspack-svelte better |
| `perRoute./my-account/profile.totalKbGzip` | 143.2 | 116.6 | -18.6% | yes — rspack-svelte better |
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

### 5.2 Weight by owning application

**Transfer by owning application** — Each response is attributed to the application that served it, so a page can be read as a bill of materials per team. *Instrument: Playwright response interception, attributed by origin and edge path prefix.* *Caveat: An origin nobody declared is a hard failure rather than an "other" bucket.*

<details><summary><strong>rspack-react</strong> — 40 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | 19.93 | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.media` (kB gzip) | 877.9 | 877.9 | 877.9 | **877.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.cart` (kB gzip) | 31.58 | 31.58 | 31.58 | **31.58** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.chrome` (kB gzip) | 29.44 | 29.44 | 29.44 | **29.44** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.storefront` (kB gzip) | 100.9 | 100.9 | 100.9 | **100.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | 19.93 | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | 19.93 | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | 19.93 | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.my-account` (kB gzip) | 114.4 | 114.4 | 114.4 | **114.4** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.cart` (kB gzip) | 21.41 | 21.41 | 21.41 | **21.41** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.faq` (kB gzip) | 24.04 | 24.04 | 24.04 | **24.04** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.media` (kB gzip) | 15.13 | 15.13 | 15.13 | **15.13** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.my-account` (kB gzip) | 123.6 | 123.6 | 123.6 | **123.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.product` (kB gzip) | 26.34 | 26.34 | 26.34 | **26.34** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.my-account` (kB gzip) | 123.7 | 123.7 | 123.7 | **123.7** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | 3.72 | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` (kB gzip) | 122.3 | 122.3 | 122.3 | **122.3** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.cart` (kB gzip) | 17.19 | 17.19 | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | 19.93 | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.media` (kB gzip) | 57.95 | 57.95 | 57.95 | **57.95** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.product` (kB gzip) | 20.23 | 20.23 | 20.23 | **20.23** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | 40.43 | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` (kB gzip) | 25.94 | 25.94 | 25.94 | **25.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | 19.93 | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.media` (kB gzip) | 77.85 | 77.85 | 77.85 | **77.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.product` (kB gzip) | 30.30 | 30.30 | 30.30 | **30.30** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` (kB gzip) | 100.9 | 100.9 | 100.9 | **100.9** | 0.000 | 0.00 | `deterministic` |

</details>

<details><summary><strong>rspack-svelte</strong> — 40 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.media` (kB gzip) | 877.9 | 877.9 | 877.9 | **877.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.cart` (kB gzip) | 65.85 | 65.85 | 56.35 | **62.68** | 5.48 | 8.75 | `variable` |
| `perRoute./cart.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 29.23 | **22.89** | 5.49 | 23.99 | `unstable` |
| `perRoute./cart.byOwnerKbGzip.storefront` (kB gzip) | 40.54 | 40.54 | 40.54 | **40.54** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.faq` (kB gzip) | 3.68 | 3.68 | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.my-account` (kB gzip) | 93.90 | 93.90 | 93.90 | **93.90** | 0.000 | 0.00 | `deterministic` |
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
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` (kB gzip) | 95.90 | 95.90 | 95.90 | **95.90** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.cart` (kB gzip) | 16.99 | 16.99 | 16.99 | **16.99** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.media` (kB gzip) | 57.95 | 57.95 | 57.95 | **57.95** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.product` (kB gzip) | 20.03 | 20.03 | 20.03 | **20.03** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.storefront` (kB gzip) | 40.12 | 40.12 | 40.12 | **40.12** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` (kB gzip) | 59.90 | 59.90 | 59.90 | **59.90** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.media` (kB gzip) | 77.85 | 77.85 | 77.85 | **77.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.product` (kB gzip) | 20.59 | 20.59 | 20.59 | **20.59** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` (kB gzip) | 40.54 | 40.54 | 40.54 | **40.54** | 0.000 | 0.00 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./.byOwnerKbGzip.media` | 877.9 | 877.9 | 0.0% | no — within noise |
| `perRoute./.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./cart.byOwnerKbGzip.cart` | 31.58 | 62.68 | +98.5% | yes — rspack-react better |
| `perRoute./cart.byOwnerKbGzip.chrome` | 29.44 | 22.89 | -22.2% | yes — rspack-svelte better |
| `perRoute./cart.byOwnerKbGzip.storefront` | 100.9 | 40.54 | -59.8% | yes — rspack-svelte better |
| `perRoute./faq.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./faq.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./faq.byOwnerKbGzip.faq` | 3.68 | 3.68 | 0.0% | no — within noise |
| `perRoute./faq.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./faq/contact.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./faq/contact.byOwnerKbGzip.faq` | 3.68 | 3.68 | 0.0% | no — within noise |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./login.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./login.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./login.byOwnerKbGzip.my-account` | 114.4 | 93.90 | -17.9% | yes — rspack-svelte better |
| `perRoute./my-account.byOwnerKbGzip.cart` | 21.41 | 45.84 | +114.1% | yes — rspack-react better |
| `perRoute./my-account.byOwnerKbGzip.chrome` | 3.72 | 3.72 | 0.0% | no — within noise |
| `perRoute./my-account.byOwnerKbGzip.faq` | 24.04 | 48.02 | +99.8% | yes — rspack-react better |
| `perRoute./my-account.byOwnerKbGzip.media` | 15.13 | 15.13 | 0.0% | no — within noise |
| `perRoute./my-account.byOwnerKbGzip.my-account` | 123.6 | 104.1 | -15.8% | yes — rspack-svelte better |
| `perRoute./my-account.byOwnerKbGzip.product` | 26.34 | 65.16 | +147.4% | yes — rspack-react better |
| `perRoute./my-account/orders.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./my-account/orders.byOwnerKbGzip.chrome` | 3.72 | 3.72 | 0.0% | no — within noise |
| `perRoute./my-account/orders.byOwnerKbGzip.my-account` | 123.7 | 104.0 | -15.9% | yes — rspack-svelte better |
| `perRoute./my-account/profile.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./my-account/profile.byOwnerKbGzip.chrome` | 3.72 | 3.72 | 0.0% | no — within noise |
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` | 122.3 | 95.90 | -21.6% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./product.byOwnerKbGzip.media` | 57.95 | 57.95 | 0.0% | no — within noise |
| `perRoute./product.byOwnerKbGzip.product` | 20.23 | 20.03 | -1.0% | no — within noise |
| `perRoute./product.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` | 25.94 | 59.90 | +130.9% | yes — rspack-react better |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./product/p-0001.byOwnerKbGzip.media` | 77.85 | 77.85 | 0.0% | no — within noise |
| `perRoute./product/p-0001.byOwnerKbGzip.product` | 30.30 | 20.59 | -32.0% | yes — rspack-svelte better |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` | 100.9 | 40.54 | -59.8% | yes — rspack-svelte better |

### 5.3 Core Web Vitals

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
| `documents./.FCP` (ms) | 144.0 | 144.0 | 140.0 | **142.7** | 2.31 | 1.62 | `stable` |
| `documents./.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./.LCP` (ms) | 144.0 | 144.0 | 140.0 | **142.7** | 2.31 | 1.62 | `stable` |
| `documents./.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 2.60 | 3.10 | 3.00 | **2.90** | 0.265 | 9.12 | `variable` |
| `documents./cart.CLS` (score) | 0.0077 | 0.0077 | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 124.0 | 124.0 | 120.0 | **122.7** | 2.31 | 1.88 | `stable` |
| `documents./cart.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.LCP` (ms) | 124.0 | 124.0 | 120.0 | **122.7** | 2.31 | 1.88 | `stable` |
| `documents./cart.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 2.40 | 2.30 | 2.30 | **2.33** | 0.058 | 2.47 | `stable` |
| `documents./faq.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 140.0 | 144.0 | 140.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.LCP` (ms) | 140.0 | 144.0 | 140.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 2.30 | 2.60 | 2.50 | **2.47** | 0.153 | 6.19 | `variable` |
| `documents./faq/contact.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 140.0 | 144.0 | 140.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq/contact.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 140.0 | 144.0 | 140.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq/contact.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.20 | 2.50 | 2.40 | **2.37** | 0.153 | 6.45 | `variable` |
| `documents./product.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 160.0 | 180.0 | 164.0 | **168.0** | 10.58 | 6.30 | `variable` |
| `documents./product.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product.LCP` (ms) | 160.0 | 180.0 | 164.0 | **168.0** | 10.58 | 6.30 | `variable` |
| `documents./product.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 5.10 | 9.00 | 5.00 | **6.37** | 2.28 | 35.83 | `unstable` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 164.0 | 168.0 | 164.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product/p-0001.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 164.0 | 168.0 | 164.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 4.30 | 4.80 | 4.40 | **4.50** | 0.265 | 5.88 | `variable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 36 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./.FCP` (ms) | 144.0 | 144.0 | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./.LCP` (ms) | 144.0 | 144.0 | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 3.00 | 2.80 | 3.30 | **3.03** | 0.252 | 8.30 | `variable` |
| `documents./cart.CLS` (score) | 0.0077 | 0.0077 | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 120.0 | 124.0 | 124.0 | **122.7** | 2.31 | 1.88 | `stable` |
| `documents./cart.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.LCP` (ms) | 120.0 | 124.0 | 124.0 | **122.7** | 2.31 | 1.88 | `stable` |
| `documents./cart.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 2.30 | 2.20 | 2.30 | **2.27** | 0.058 | 2.55 | `stable` |
| `documents./faq.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 140.0 | 140.0 | 140.0 | **140.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.LCP` (ms) | 140.0 | 140.0 | 140.0 | **140.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 2.40 | 2.70 | 3.60 | **2.90** | 0.624 | 21.53 | `unstable` |
| `documents./faq/contact.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 140.0 | 140.0 | 140.0 | **140.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 140.0 | 140.0 | 140.0 | **140.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.30 | 2.40 | 2.30 | **2.33** | 0.058 | 2.47 | `stable` |
| `documents./product.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 164.0 | 164.0 | 168.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product.LCP` (ms) | 164.0 | 164.0 | 168.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 5.30 | 5.10 | 5.50 | **5.30** | 0.200 | 3.77 | `variable` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 168.0 | 168.0 | 168.0 | **168.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 168.0 | 168.0 | 168.0 | **168.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 4.40 | 4.60 | 4.30 | **4.43** | 0.153 | 3.45 | `variable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `documents./.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./.FCP` | 142.7 | 144.0 | +0.9% | no — within noise |
| `documents./.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./.LCP` | 142.7 | 144.0 | +0.9% | no — within noise |
| `documents./.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./.TTFB` | 2.90 | 3.03 | +4.6% | no — within noise |
| `documents./cart.CLS` | 0.0077 | 0.0077 | 0.0% | no — within noise |
| `documents./cart.FCP` | 122.7 | 122.7 | 0.0% | no — within noise |
| `documents./cart.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./cart.LCP` | 122.7 | 122.7 | 0.0% | no — within noise |
| `documents./cart.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./cart.TTFB` | 2.33 | 2.27 | -2.9% | no — within noise |
| `documents./faq.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./faq.FCP` | 141.3 | 140.0 | -0.9% | no — within noise |
| `documents./faq.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./faq.LCP` | 141.3 | 140.0 | -0.9% | no — within noise |
| `documents./faq.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./faq.TTFB` | 2.47 | 2.90 | +17.6% | no — within noise |
| `documents./faq/contact.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./faq/contact.FCP` | 141.3 | 140.0 | -0.9% | no — within noise |
| `documents./faq/contact.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./faq/contact.LCP` | 141.3 | 140.0 | -0.9% | no — within noise |
| `documents./faq/contact.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./faq/contact.TTFB` | 2.37 | 2.33 | -1.4% | no — within noise |
| `documents./product.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./product.FCP` | 168.0 | 165.3 | -1.6% | no — within noise |
| `documents./product.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./product.LCP` | 168.0 | 165.3 | -1.6% | no — within noise |
| `documents./product.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./product.TTFB` | 6.37 | 5.30 | -16.8% | no — within noise |
| `documents./product/p-0001.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./product/p-0001.FCP` | 165.3 | 168.0 | +1.6% | yes — rspack-react better |
| `documents./product/p-0001.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./product/p-0001.LCP` | 165.3 | 168.0 | +1.6% | yes — rspack-react better |
| `documents./product/p-0001.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./product/p-0001.TTFB` | 4.50 | 4.43 | -1.5% | no — within noise |

### 5.4 Browser processor and memory

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
| `documents./.domNodes` (count) | 743 | 743 | 743 | **743** | 0 | 0.00 | `deterministic` |
| `documents./.jsHeapMb` (MB) | 3.24 | 3.22 | 3.23 | **3.23** | 0.009 | 0.27 | `deterministic` |
| `documents./.layoutMs` (ms) | 31.73 | 31.79 | 31.54 | **31.69** | 0.130 | 0.41 | `deterministic` |
| `documents./.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 43.38 | 42.97 | 40.64 | **42.33** | 1.48 | 3.49 | `variable` |
| `documents./.styleMs` (ms) | 41.52 | 42.90 | 42.34 | **42.25** | 0.691 | 1.64 | `stable` |
| `documents./.taskMs` (ms) | 338.3 | 339.9 | 338.7 | **339.0** | 0.845 | 0.25 | `deterministic` |
| `documents./cart.domNodes` (count) | 259 | 259 | 259 | **259** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 4.28 | 4.28 | 4.29 | **4.28** | 0.004 | 0.08 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 18.80 | 18.07 | 18.59 | **18.49** | 0.375 | 2.03 | `stable` |
| `documents./cart.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 56.52 | 55.30 | 55.61 | **55.81** | 0.634 | 1.14 | `stable` |
| `documents./cart.styleMs` (ms) | 33.22 | 30.51 | 31.48 | **31.74** | 1.37 | 4.32 | `variable` |
| `documents./cart.taskMs` (ms) | 334.3 | 329.1 | 330.2 | **331.2** | 2.75 | 0.83 | `stable` |
| `documents./faq.domNodes` (count) | 538 | 538 | 538 | **538** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 3.20 | 3.20 | 3.20 | **3.20** | 0.002 | 0.06 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 22.32 | 24.30 | 21.37 | **22.67** | 1.50 | 6.60 | `variable` |
| `documents./faq.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 39.62 | 41.38 | 39.84 | **40.28** | 0.958 | 2.38 | `stable` |
| `documents./faq.styleMs` (ms) | 35.48 | 32.78 | 34.07 | **34.11** | 1.35 | 3.96 | `variable` |
| `documents./faq.taskMs` (ms) | 287.2 | 294.7 | 288.3 | **290.1** | 4.06 | 1.40 | `stable` |
| `documents./faq/contact.domNodes` (count) | 388 | 388 | 388 | **388** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.30 | 3.29 | 3.31 | **3.30** | 0.006 | 0.18 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 28.69 | 28.60 | 27.21 | **28.17** | 0.828 | 2.94 | `stable` |
| `documents./faq/contact.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 40.88 | 40.02 | 40.21 | **40.37** | 0.451 | 1.12 | `stable` |
| `documents./faq/contact.styleMs` (ms) | 32.82 | 33.58 | 33.49 | **33.29** | 0.417 | 1.25 | `stable` |
| `documents./faq/contact.taskMs` (ms) | 290.8 | 289.8 | 288.7 | **289.8** | 1.05 | 0.36 | `deterministic` |
| `documents./product.domNodes` (count) | 904 | 904 | 904 | **904** | 0 | 0.00 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.50 | 3.51 | 3.53 | **3.51** | 0.012 | 0.34 | `deterministic` |
| `documents./product.layoutMs` (ms) | 31.89 | 35.25 | 33.35 | **33.50** | 1.68 | 5.03 | `variable` |
| `documents./product.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 42.27 | 47.48 | 44.27 | **44.67** | 2.63 | 5.89 | `variable` |
| `documents./product.styleMs` (ms) | 38.64 | 39.89 | 37.35 | **38.63** | 1.27 | 3.29 | `variable` |
| `documents./product.taskMs` (ms) | 324.1 | 347.0 | 328.7 | **333.3** | 12.14 | 3.64 | `variable` |
| `documents./product/p-0001.domNodes` (count) | 640 | 640 | 640 | **640** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 4.15 | 4.17 | 4.15 | **4.16** | 0.012 | 0.29 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 35.74 | 35.95 | 35.99 | **35.90** | 0.133 | 0.37 | `deterministic` |
| `documents./product/p-0001.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 58.29 | 58.61 | 57.70 | **58.20** | 0.466 | 0.80 | `stable` |
| `documents./product/p-0001.styleMs` (ms) | 39.05 | 39.85 | 38.47 | **39.12** | 0.693 | 1.77 | `stable` |
| `documents./product/p-0001.taskMs` (ms) | 384.9 | 384.4 | 381.0 | **383.4** | 2.15 | 0.56 | `stable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 42 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.domNodes` (count) | 1060 | 1060 | 1060 | **1060** | 0 | 0.00 | `deterministic` |
| `documents./.jsHeapMb` (MB) | 2.95 | 2.96 | 2.95 | **2.96** | 0.004 | 0.12 | `deterministic` |
| `documents./.layoutMs` (ms) | 31.23 | 31.41 | 31.63 | **31.43** | 0.198 | 0.63 | `stable` |
| `documents./.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 40.87 | 41.16 | 41.90 | **41.31** | 0.530 | 1.28 | `stable` |
| `documents./.styleMs` (ms) | 41.89 | 43.49 | 42.36 | **42.58** | 0.825 | 1.94 | `stable` |
| `documents./.taskMs` (ms) | 332.0 | 331.1 | 331.8 | **331.6** | 0.460 | 0.14 | `deterministic` |
| `documents./cart.domNodes` (count) | 456 | 456 | 456 | **456** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 3.83 | 3.83 | 3.82 | **3.83** | 0.008 | 0.21 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 17.68 | 17.36 | 18.45 | **17.83** | 0.558 | 3.13 | `variable` |
| `documents./cart.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 40.90 | 42.60 | 41.29 | **41.60** | 0.887 | 2.13 | `stable` |
| `documents./cart.styleMs` (ms) | 31.87 | 32.55 | 31.48 | **31.97** | 0.544 | 1.70 | `stable` |
| `documents./cart.taskMs` (ms) | 305.2 | 309.5 | 306.7 | **307.1** | 2.19 | 0.71 | `stable` |
| `documents./faq.domNodes` (count) | 734 | 734 | 734 | **734** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 2.91 | 2.91 | 2.92 | **2.91** | 0.008 | 0.26 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 22.60 | 22.57 | 22.86 | **22.68** | 0.164 | 0.72 | `stable` |
| `documents./faq.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 38.91 | 37.37 | 38.17 | **38.15** | 0.772 | 2.02 | `stable` |
| `documents./faq.styleMs` (ms) | 32.94 | 33.52 | 34.62 | **33.69** | 0.851 | 2.53 | `stable` |
| `documents./faq.taskMs` (ms) | 284.5 | 285.5 | 281.6 | **283.9** | 1.98 | 0.70 | `stable` |
| `documents./faq/contact.domNodes` (count) | 572 | 572 | 572 | **572** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.01 | 3.01 | 3.01 | **3.01** | 0.003 | 0.09 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 26.81 | 28.74 | 29.09 | **28.21** | 1.23 | 4.35 | `variable` |
| `documents./faq/contact.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 37.29 | 38.88 | 39.77 | **38.65** | 1.25 | 3.24 | `variable` |
| `documents./faq/contact.styleMs` (ms) | 34.16 | 33.28 | 32.32 | **33.25** | 0.921 | 2.77 | `stable` |
| `documents./faq/contact.taskMs` (ms) | 281.6 | 287.6 | 287.3 | **285.5** | 3.37 | 1.18 | `stable` |
| `documents./product.domNodes` (count) | 1337 | 1337 | 1337 | **1337** | 0 | 0.00 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.15 | 3.14 | 3.15 | **3.15** | 0.005 | 0.16 | `deterministic` |
| `documents./product.layoutMs` (ms) | 32.80 | 32.80 | 32.60 | **32.73** | 0.116 | 0.35 | `deterministic` |
| `documents./product.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 43.59 | 43.86 | 46.61 | **44.69** | 1.67 | 3.74 | `variable` |
| `documents./product.styleMs` (ms) | 38.83 | 40.06 | 39.74 | **39.54** | 0.637 | 1.61 | `stable` |
| `documents./product.taskMs` (ms) | 317.5 | 325.6 | 321.8 | **321.6** | 4.06 | 1.26 | `stable` |
| `documents./product/p-0001.domNodes` (count) | 911 | 911 | 911 | **911** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 3.72 | 3.70 | 3.69 | **3.70** | 0.014 | 0.38 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 34.85 | 36.71 | 37.12 | **36.23** | 1.21 | 3.35 | `variable` |
| `documents./product/p-0001.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 46.04 | 47.37 | 45.91 | **46.44** | 0.808 | 1.74 | `stable` |
| `documents./product/p-0001.styleMs` (ms) | 38.76 | 39.00 | 38.95 | **38.90** | 0.124 | 0.32 | `deterministic` |
| `documents./product/p-0001.taskMs` (ms) | 349.9 | 356.0 | 353.8 | **353.2** | 3.09 | 0.87 | `stable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `documents./.domNodes` | 743 | 1060 | +42.7% | yes — rspack-react better |
| `documents./.jsHeapMb` | 3.23 | 2.96 | -8.5% | yes — rspack-svelte better |
| `documents./.layoutMs` | 31.69 | 31.43 | -0.8% | no — within noise |
| `documents./.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./.scriptMs` | 42.33 | 41.31 | -2.4% | no — within noise |
| `documents./.styleMs` | 42.25 | 42.58 | +0.8% | no — within noise |
| `documents./.taskMs` | 339.0 | 331.6 | -2.2% | yes — rspack-svelte better |
| `documents./cart.domNodes` | 259 | 456 | +76.1% | yes — rspack-react better |
| `documents./cart.jsHeapMb` | 4.28 | 3.83 | -10.7% | yes — rspack-svelte better |
| `documents./cart.layoutMs` | 18.49 | 17.83 | -3.6% | no — within noise |
| `documents./cart.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./cart.scriptMs` | 55.81 | 41.60 | -25.5% | yes — rspack-svelte better |
| `documents./cart.styleMs` | 31.74 | 31.97 | +0.7% | no — within noise |
| `documents./cart.taskMs` | 331.2 | 307.1 | -7.3% | yes — rspack-svelte better |
| `documents./faq.domNodes` | 538 | 734 | +36.4% | yes — rspack-react better |
| `documents./faq.jsHeapMb` | 3.20 | 2.91 | -9.0% | yes — rspack-svelte better |
| `documents./faq.layoutMs` | 22.67 | 22.68 | +0.0% | no — within noise |
| `documents./faq.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./faq.scriptMs` | 40.28 | 38.15 | -5.3% | yes — rspack-svelte better |
| `documents./faq.styleMs` | 34.11 | 33.69 | -1.2% | no — within noise |
| `documents./faq.taskMs` | 290.1 | 283.9 | -2.1% | yes — rspack-svelte better |
| `documents./faq/contact.domNodes` | 388 | 572 | +47.4% | yes — rspack-react better |
| `documents./faq/contact.jsHeapMb` | 3.30 | 3.01 | -8.7% | yes — rspack-svelte better |
| `documents./faq/contact.layoutMs` | 28.17 | 28.21 | +0.2% | no — within noise |
| `documents./faq/contact.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./faq/contact.scriptMs` | 40.37 | 38.65 | -4.3% | yes — rspack-svelte better |
| `documents./faq/contact.styleMs` | 33.29 | 33.25 | -0.1% | no — within noise |
| `documents./faq/contact.taskMs` | 289.8 | 285.5 | -1.5% | no — within noise |
| `documents./product.domNodes` | 904 | 1337 | +47.9% | yes — rspack-react better |
| `documents./product.jsHeapMb` | 3.51 | 3.15 | -10.3% | yes — rspack-svelte better |
| `documents./product.layoutMs` | 33.50 | 32.73 | -2.3% | no — within noise |
| `documents./product.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./product.scriptMs` | 44.67 | 44.69 | +0.0% | no — within noise |
| `documents./product.styleMs` | 38.63 | 39.54 | +2.4% | no — within noise |
| `documents./product.taskMs` | 333.3 | 321.6 | -3.5% | no — within noise |
| `documents./product/p-0001.domNodes` | 640 | 911 | +42.3% | yes — rspack-react better |
| `documents./product/p-0001.jsHeapMb` | 4.16 | 3.70 | -10.9% | yes — rspack-svelte better |
| `documents./product/p-0001.layoutMs` | 35.90 | 36.23 | +0.9% | no — within noise |
| `documents./product/p-0001.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./product/p-0001.scriptMs` | 58.20 | 46.44 | -20.2% | yes — rspack-svelte better |
| `documents./product/p-0001.styleMs` | 39.12 | 38.90 | -0.6% | no — within noise |
| `documents./product/p-0001.taskMs` | 383.4 | 353.2 | -7.9% | yes — rspack-svelte better |

### 5.6 Server cost

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
| `server./.coresUsed` (cores) | 1.37 | 1.36 | 1.35 | **1.36** | 0.01 | 0.77 | `stable` |
| `server./.cpuPerRequestMs` (ms) | 0.834 | 0.832 | 0.827 | **0.831** | 0.004 | 0.43 | `deterministic` |
| `server./.cpuSystemMs` (ms) | 493.3 | 484.9 | 492.6 | **490.3** | 4.65 | 0.95 | `stable` |
| `server./.cpuUserMs` (ms) | 10504.3 | 10379.9 | 10355.2 | **10413.1** | 79.88 | 0.77 | `stable` |
| `server./.eventLoopUtilization` (ratio) | 0.894 | 0.888 | 0.889 | **0.890** | 0.003 | 0.37 | `deterministic` |
| `server./.gcPauseMs` (ms) | 60.94 | 60.44 | 57.43 | **59.60** | 1.90 | 3.19 | `variable` |
| `server./.heapUsedMb` (MB) | 35.27 | 42.85 | 68.35 | **48.82** | 17.33 | 35.50 | `unstable` |
| `server./.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./.rps` (req/s) | 1646.6 | 1630.6 | 1639.5 | **1638.9** | 8.02 | 0.49 | `deterministic` |
| `server./.rssMb` (MB) | 277.9 | 268.6 | 270.4 | **272.3** | 4.97 | 1.82 | `stable` |
| `server./my-account.coresUsed` (cores) | 1.32 | 1.32 | 1.33 | **1.32** | 0 | 0.23 | `deterministic` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.337 | 0.332 | 0.333 | **0.334** | 0.003 | 0.79 | `stable` |
| `server./my-account.cpuSystemMs` (ms) | 936.3 | 931.4 | 945.2 | **937.6** | 7.01 | 0.75 | `stable` |
| `server./my-account.cpuUserMs` (ms) | 9645.0 | 9665.8 | 9682.4 | **9664.4** | 18.70 | 0.19 | `deterministic` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.976 | 0.973 | 0.980 | **0.976** | 0.003 | 0.32 | `deterministic` |
| `server./my-account.gcPauseMs` (ms) | 71.93 | 70.93 | 71.36 | **71.41** | 0.502 | 0.70 | `stable` |
| `server./my-account.heapUsedMb` (MB) | 42.44 | 67.42 | 36.21 | **48.69** | 16.52 | 33.92 | `unstable` |
| `server./my-account.p50Ms` (ms) | 1.00 | 1.00 | 1.00 | **1.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.p99Ms` (ms) | 4.00 | 3.00 | 3.00 | **3.33** | 0.577 | 17.32 | `unstable` |
| `server./my-account.rps` (req/s) | 3925.3 | 3984.8 | 3990.9 | **3967.0** | 36.25 | 0.91 | `stable` |
| `server./my-account.rssMb` (MB) | 240.4 | 240.1 | 242.1 | **240.9** | 1.11 | 0.46 | `deterministic` |
| `server./product.coresUsed` (cores) | 1.24 | 1.24 | 1.25 | **1.25** | 0.01 | 0.41 | `deterministic` |
| `server./product.cpuPerRequestMs` (ms) | 1.13 | 1.15 | 1.15 | **1.14** | 0.008 | 0.66 | `stable` |
| `server./product.cpuSystemMs` (ms) | 700.5 | 694.8 | 695.6 | **697.0** | 3.05 | 0.44 | `deterministic` |
| `server./product.cpuUserMs` (ms) | 9239.9 | 9269.6 | 9325.6 | **9278.4** | 43.52 | 0.47 | `deterministic` |
| `server./product.eventLoopUtilization` (ratio) | 0.883 | 0.881 | 0.881 | **0.882** | 0.001 | 0.15 | `deterministic` |
| `server./product.gcPauseMs` (ms) | 147.4 | 145.7 | 142.5 | **145.2** | 2.49 | 1.71 | `stable` |
| `server./product.heapUsedMb` (MB) | 56.00 | 58.19 | 37.00 | **50.40** | 11.65 | 23.12 | `unstable` |
| `server./product.p50Ms` (ms) | 7.00 | 7.00 | 7.00 | **7.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 9.00 | 10.00 | 9.00 | **9.33** | 0.577 | 6.19 | `variable` |
| `server./product.rps` (req/s) | 1096.3 | 1086.8 | 1093.3 | **1092.1** | 4.86 | 0.44 | `deterministic` |
| `server./product.rssMb` (MB) | 287.0 | 286.0 | 279.6 | **284.2** | 4.00 | 1.41 | `stable` |
| `server./product/p-0001.coresUsed` (cores) | 1.29 | 1.27 | 1.27 | **1.28** | 0.01 | 0.61 | `stable` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.754 | 0.753 | 0.754 | **0.754** | 0.001 | 0.08 | `deterministic` |
| `server./product/p-0001.cpuSystemMs` (ms) | 491.6 | 479.5 | 502.2 | **491.1** | 11.34 | 2.31 | `stable` |
| `server./product/p-0001.cpuUserMs` (ms) | 9812.8 | 9719.4 | 9696.6 | **9742.9** | 61.56 | 0.63 | `stable` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.894 | 0.884 | 0.885 | **0.888** | 0.005 | 0.59 | `stable` |
| `server./product/p-0001.gcPauseMs` (ms) | 52.18 | 51.94 | 51.58 | **51.90** | 0.302 | 0.58 | `stable` |
| `server./product/p-0001.heapUsedMb` (MB) | 44.95 | 81.37 | 69.32 | **65.21** | 18.55 | 28.45 | `unstable` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 6.00 | 5.00 | 5.00 | **5.33** | 0.577 | 10.83 | `unstable` |
| `server./product/p-0001.rps` (req/s) | 1708.3 | 1692.1 | 1689.6 | **1696.7** | 10.11 | 0.60 | `stable` |
| `server./product/p-0001.rssMb` (MB) | 281.1 | 281.1 | 281.8 | **281.3** | 0.419 | 0.15 | `deterministic` |
| `sustainedHeap.perRequestKb` (kB) | 0.059 | 0.033 | 0.038 | **0.043** | 0.014 | 31.84 | `unstable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 45 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `server./.coresUsed` (cores) | 1.47 | 1.49 | 1.48 | **1.48** | 0.01 | 0.52 | `stable` |
| `server./.cpuPerRequestMs` (ms) | 0.841 | 0.869 | 0.831 | **0.847** | 0.020 | 2.33 | `stable` |
| `server./.cpuSystemMs` (ms) | 524.8 | 516.3 | 529.3 | **523.5** | 6.61 | 1.26 | `stable` |
| `server./.cpuUserMs` (ms) | 11256.7 | 11392.0 | 11298.5 | **11315.7** | 69.32 | 0.61 | `stable` |
| `server./.eventLoopUtilization` (ratio) | 0.864 | 0.883 | 0.868 | **0.871** | 0.010 | 1.14 | `stable` |
| `server./.gcPauseMs` (ms) | 135.7 | 155.7 | 142.5 | **144.6** | 10.21 | 7.06 | `variable` |
| `server./.heapUsedMb` (MB) | 95.10 | 148.3 | 82.69 | **108.7** | 34.88 | 32.08 | `unstable` |
| `server./.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | 7.00 | 7.00 | **6.67** | 0.577 | 8.66 | `variable` |
| `server./.rps` (req/s) | 1749.0 | 1711.8 | 1778.3 | **1746.3** | 33.33 | 1.91 | `stable` |
| `server./.rssMb` (MB) | 389.6 | 381.2 | 379.3 | **383.4** | 5.52 | 1.44 | `stable` |
| `server./my-account.coresUsed` (cores) | 1.43 | 1.45 | 1.42 | **1.43** | 0.01 | 0.77 | `stable` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.325 | 0.351 | 0.325 | **0.334** | 0.015 | 4.50 | `variable` |
| `server./my-account.cpuSystemMs` (ms) | 1038.2 | 1044.1 | 1033.5 | **1038.6** | 5.30 | 0.51 | `stable` |
| `server./my-account.cpuUserMs` (ms) | 10441.5 | 10530.4 | 10367.8 | **10446.6** | 81.42 | 0.78 | `stable` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.961 | 0.966 | 0.959 | **0.962** | 0.004 | 0.37 | `deterministic` |
| `server./my-account.gcPauseMs` (ms) | 123.0 | 126.0 | 122.6 | **123.9** | 1.90 | 1.53 | `stable` |
| `server./my-account.heapUsedMb` (MB) | 86.19 | 55.13 | 66.68 | **69.33** | 15.70 | 22.64 | `unstable` |
| `server./my-account.p50Ms` (ms) | 1.00 | 1.00 | 1.00 | **1.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.p99Ms` (ms) | 3.00 | 3.00 | 3.00 | **3.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.rps` (req/s) | 4413.0 | 4119.1 | 4390.0 | **4307.4** | 163.4 | 3.79 | `variable` |
| `server./my-account.rssMb` (MB) | 307.6 | 303.4 | 307.9 | **306.3** | 2.52 | 0.82 | `stable` |
| `server./product.coresUsed` (cores) | 1.35 | 1.35 | 1.34 | **1.35** | 0.01 | 0.45 | `deterministic` |
| `server./product.cpuPerRequestMs` (ms) | 1.12 | 1.13 | 1.12 | **1.12** | 0.005 | 0.45 | `deterministic` |
| `server./product.cpuSystemMs` (ms) | 781.0 | 757.9 | 766.7 | **768.5** | 11.65 | 1.52 | `stable` |
| `server./product.cpuUserMs` (ms) | 10055.5 | 10052.7 | 9975.9 | **10028.0** | 45.20 | 0.45 | `deterministic` |
| `server./product.eventLoopUtilization` (ratio) | 0.875 | 0.874 | 0.867 | **0.872** | 0.005 | 0.52 | `stable` |
| `server./product.gcPauseMs` (ms) | 200.8 | 209.2 | 207.4 | **205.8** | 4.38 | 2.13 | `stable` |
| `server./product.heapUsedMb` (MB) | 126.5 | 64.76 | 108.5 | **99.90** | 31.73 | 31.76 | `unstable` |
| `server./product.p50Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 14.00 | 14.00 | 14.00 | **14.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.rps` (req/s) | 1211.8 | 1197.9 | 1194.3 | **1201.3** | 9.24 | 0.77 | `stable` |
| `server./product.rssMb` (MB) | 474.9 | 401.5 | 451.8 | **442.7** | 37.56 | 8.48 | `variable` |
| `server./product/p-0001.coresUsed` (cores) | 1.41 | 1.39 | 1.41 | **1.4** | 0.01 | 0.83 | `stable` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.752 | 0.767 | 0.750 | **0.756** | 0.009 | 1.23 | `stable` |
| `server./product/p-0001.cpuSystemMs` (ms) | 553.7 | 530.9 | 535.8 | **540.1** | 12.01 | 2.22 | `stable` |
| `server./product/p-0001.cpuUserMs` (ms) | 10712.9 | 10570.5 | 10716.0 | **10666.4** | 83.14 | 0.78 | `stable` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.865 | 0.866 | 0.862 | **0.864** | 0.002 | 0.26 | `deterministic` |
| `server./product/p-0001.gcPauseMs` (ms) | 142.8 | 160.8 | 141.8 | **148.4** | 10.72 | 7.22 | `variable` |
| `server./product/p-0001.heapUsedMb` (MB) | 89.10 | 27.52 | 75.78 | **64.13** | 32.40 | 50.52 | `unstable` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.rps` (req/s) | 1872.9 | 1809.1 | 1873.0 | **1851.7** | 36.84 | 1.99 | `stable` |
| `server./product/p-0001.rssMb` (MB) | 418.5 | 406.4 | 404.9 | **409.9** | 7.44 | 1.82 | `stable` |
| `sustainedHeap.perRequestKb` (kB) | 0.038 | 0.035 | 0.040 | **0.038** | 0.003 | 6.68 | `variable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `server./.coresUsed` | 1.36 | 1.48 | +8.6% | yes — rspack-react better |
| `server./.cpuPerRequestMs` | 0.831 | 0.847 | +1.9% | no — within noise |
| `server./.cpuSystemMs` | 490.3 | 523.5 | +6.8% | yes — rspack-react better |
| `server./.cpuUserMs` | 10413.1 | 11315.7 | +8.7% | yes — rspack-react better |
| `server./.eventLoopUtilization` | 0.890 | 0.871 | -2.1% | yes — rspack-svelte better |
| `server./.gcPauseMs` | 59.60 | 144.6 | +142.6% | yes — rspack-react better |
| `server./.heapUsedMb` | 48.82 | 108.7 | +122.7% | yes — rspack-react better |
| `server./.p50Ms` | 4.00 | 4.00 | 0.0% | no — within noise |
| `server./.p99Ms` | 6.00 | 6.67 | +11.1% | yes — rspack-react better |
| `server./.rps` | 1638.9 | 1746.3 | +6.6% | yes — rspack-svelte better |
| `server./.rssMb` | 272.3 | 383.4 | +40.8% | yes — rspack-react better |
| `server./my-account.coresUsed` | 1.32 | 1.43 | +8.3% | yes — rspack-react better |
| `server./my-account.cpuPerRequestMs` | 0.334 | 0.334 | -0.1% | no — within noise |
| `server./my-account.cpuSystemMs` | 937.6 | 1038.6 | +10.8% | yes — rspack-react better |
| `server./my-account.cpuUserMs` | 9664.4 | 10446.6 | +8.1% | yes — rspack-react better |
| `server./my-account.eventLoopUtilization` | 0.976 | 0.962 | -1.5% | yes — rspack-svelte better |
| `server./my-account.gcPauseMs` | 71.41 | 123.9 | +73.5% | yes — rspack-react better |
| `server./my-account.heapUsedMb` | 48.69 | 69.33 | +42.4% | no — within noise |
| `server./my-account.p50Ms` | 1.00 | 1.00 | 0.0% | no — within noise |
| `server./my-account.p99Ms` | 3.33 | 3.00 | -10.0% | no — within noise |
| `server./my-account.rps` | 3967.0 | 4307.4 | +8.6% | yes — rspack-svelte better |
| `server./my-account.rssMb` | 240.9 | 306.3 | +27.2% | yes — rspack-react better |
| `server./product.coresUsed` | 1.25 | 1.35 | +8.2% | yes — rspack-react better |
| `server./product.cpuPerRequestMs` | 1.14 | 1.12 | -1.6% | yes — rspack-svelte better |
| `server./product.cpuSystemMs` | 697.0 | 768.5 | +10.3% | yes — rspack-react better |
| `server./product.cpuUserMs` | 9278.4 | 10028.0 | +8.1% | yes — rspack-react better |
| `server./product.eventLoopUtilization` | 0.882 | 0.872 | -1.1% | yes — rspack-svelte better |
| `server./product.gcPauseMs` | 145.2 | 205.8 | +41.7% | yes — rspack-react better |
| `server./product.heapUsedMb` | 50.40 | 99.90 | +98.2% | yes — rspack-react better |
| `server./product.p50Ms` | 7.00 | 6.00 | -14.3% | yes — rspack-svelte better |
| `server./product.p99Ms` | 9.33 | 14.00 | +50.0% | yes — rspack-react better |
| `server./product.rps` | 1092.1 | 1201.3 | +10.0% | yes — rspack-svelte better |
| `server./product.rssMb` | 284.2 | 442.7 | +55.8% | yes — rspack-react better |
| `server./product/p-0001.coresUsed` | 1.28 | 1.4 | +9.5% | yes — rspack-react better |
| `server./product/p-0001.cpuPerRequestMs` | 0.754 | 0.756 | +0.4% | no — within noise |
| `server./product/p-0001.cpuSystemMs` | 491.1 | 540.1 | +10.0% | yes — rspack-react better |
| `server./product/p-0001.cpuUserMs` | 9742.9 | 10666.4 | +9.5% | yes — rspack-react better |
| `server./product/p-0001.eventLoopUtilization` | 0.888 | 0.864 | -2.6% | yes — rspack-svelte better |
| `server./product/p-0001.gcPauseMs` | 51.90 | 148.4 | +186.0% | yes — rspack-react better |
| `server./product/p-0001.heapUsedMb` | 65.21 | 64.13 | -1.7% | no — within noise |
| `server./product/p-0001.p50Ms` | 4.00 | 4.00 | 0.0% | no — within noise |
| `server./product/p-0001.p99Ms` | 5.33 | 6.00 | +12.5% | yes — rspack-react better |
| `server./product/p-0001.rps` | 1696.7 | 1851.7 | +9.1% | yes — rspack-svelte better |
| `server./product/p-0001.rssMb` | 281.3 | 409.9 | +45.7% | yes — rspack-react better |
| `sustainedHeap.perRequestKb` | 0.043 | 0.038 | -13.1% | no — within noise |

### 5.7 Developer experience

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
| `dx.cacheSaving` (ratio) | 0.083 | 0.160 | 0.095 | **0.113** | 0.041 | 36.77 | `unstable` |
| `dx.coldBuildMs` (ms) | 14427.0 | 15773.0 | 14492.0 | **14897.3** | 759.0 | 5.10 | `variable` |
| `dx.editToBrowserMs` (ms) | 7227.0 | 7221.0 | 7205.0 | **7217.7** | 11.37 | 0.16 | `deterministic` |
| `dx.incrementalMs` (ms) | 2900.0 | 2895.0 | 2897.0 | **2897.3** | 2.52 | 0.09 | `deterministic` |
| `dx.lintMs` (ms) | 10027.0 | 10047.0 | 9699.0 | **9924.3** | 195.4 | 1.97 | `stable` |
| `dx.perApp.cart.coldMs` (ms) | 2986.0 | 3029.0 | 3016.0 | **3010.3** | 22.05 | 0.73 | `stable` |
| `dx.perApp.cart.warmMs` (ms) | 2759.0 | 2769.0 | 2746.0 | **2758.0** | 11.53 | 0.42 | `deterministic` |
| `dx.perApp.chrome.coldMs` (ms) | 3058.0 | 3070.0 | 2847.0 | **2991.7** | 125.4 | 4.19 | `variable` |
| `dx.perApp.chrome.warmMs` (ms) | 2737.0 | 2819.0 | 2732.0 | **2762.7** | 48.85 | 1.77 | `stable` |
| `dx.perApp.faq.coldMs` (ms) | 2870.0 | 2828.0 | 2835.0 | **2844.3** | 22.50 | 0.79 | `stable` |
| `dx.perApp.faq.warmMs` (ms) | 2713.0 | 2718.0 | 2709.0 | **2713.3** | 4.51 | 0.17 | `deterministic` |
| `dx.perApp.my-account.coldMs` (ms) | 1173.0 | 1211.0 | 1173.0 | **1185.7** | 21.94 | 1.85 | `stable` |
| `dx.perApp.my-account.warmMs` (ms) | 1082.0 | 1060.0 | 1054.0 | **1065.3** | 14.74 | 1.38 | `stable` |
| `dx.perApp.product.coldMs` (ms) | 3179.0 | 3212.0 | 3463.0 | **3284.7** | 155.3 | 4.73 | `variable` |
| `dx.perApp.product.warmMs` (ms) | 2821.0 | 2778.0 | 2776.0 | **2791.7** | 25.42 | 0.91 | `stable` |
| `dx.perApp.storefront.coldMs` (ms) | 1162.0 | 2422.0 | 1158.0 | **1580.7** | 728.6 | 46.10 | `unstable` |
| `dx.perApp.storefront.warmMs` (ms) | 1121.0 | 1100.0 | 1097.0 | **1106.0** | 13.08 | 1.18 | `stable` |
| `dx.startupMs` (ms) | 3370.0 | 3366.0 | 3354.0 | **3363.3** | 8.33 | 0.25 | `deterministic` |
| `dx.testMs` (ms) | 5387.0 | 5408.0 | 5389.0 | **5394.7** | 11.59 | 0.21 | `deterministic` |
| `dx.typecheckMs` (ms) | 8136.0 | 8074.0 | 7762.0 | **7990.7** | 200.4 | 2.51 | `stable` |
| `dx.unblockedMs` (ms) | 17797.0 | 19139.0 | 17847.0 | **18261.0** | 760.8 | 4.17 | `variable` |
| `dx.warmBuildMs` (ms) | 13234.0 | 13244.0 | 13113.0 | **13197.0** | 72.92 | 0.55 | `stable` |

</details>

<details open><summary><strong>rspack-svelte</strong> — 22 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `dx.cacheSaving` (ratio) | 0.354 | 0.360 | 0.361 | **0.358** | 0.004 | 1.06 | `stable` |
| `dx.coldBuildMs` (ms) | 7803.0 | 7892.0 | 7951.0 | **7882.0** | 74.51 | 0.95 | `stable` |
| `dx.editToBrowserMs` (ms) | 5396.0 | 5402.0 | 5400.0 | **5399.3** | 3.06 | 0.06 | `deterministic` |
| `dx.incrementalMs` (ms) | 909.0 | 910.0 | 907.0 | **908.7** | 1.53 | 0.17 | `deterministic` |
| `dx.lintMs` (ms) | 9757.0 | 10071.0 | 10475.0 | **10101.0** | 359.9 | 3.56 | `variable` |
| `dx.perApp.cart.coldMs` (ms) | 1357.0 | 1404.0 | 1378.0 | **1379.7** | 23.54 | 1.71 | `stable` |
| `dx.perApp.cart.warmMs` (ms) | 843.0 | 843.0 | 850.0 | **845.3** | 4.04 | 0.48 | `deterministic` |
| `dx.perApp.chrome.coldMs` (ms) | 1258.0 | 1257.0 | 1302.0 | **1272.3** | 25.70 | 2.02 | `stable` |
| `dx.perApp.chrome.warmMs` (ms) | 841.0 | 859.0 | 859.0 | **853.0** | 10.39 | 1.22 | `stable` |
| `dx.perApp.faq.coldMs` (ms) | 1225.0 | 1223.0 | 1228.0 | **1225.3** | 2.52 | 0.21 | `deterministic` |
| `dx.perApp.faq.warmMs` (ms) | 833.0 | 832.0 | 839.0 | **834.7** | 3.79 | 0.45 | `deterministic` |
| `dx.perApp.my-account.coldMs` (ms) | 1337.0 | 1353.0 | 1330.0 | **1340.0** | 11.79 | 0.88 | `stable` |
| `dx.perApp.my-account.warmMs` (ms) | 837.0 | 845.0 | 847.0 | **843.0** | 5.29 | 0.63 | `stable` |
| `dx.perApp.product.coldMs` (ms) | 1487.0 | 1498.0 | 1571.0 | **1518.7** | 45.65 | 3.01 | `variable` |
| `dx.perApp.product.warmMs` (ms) | 848.0 | 830.0 | 843.0 | **840.3** | 9.29 | 1.11 | `stable` |
| `dx.perApp.storefront.coldMs` (ms) | 1140.0 | 1157.0 | 1141.0 | **1146.0** | 9.54 | 0.83 | `stable` |
| `dx.perApp.storefront.warmMs` (ms) | 839.0 | 840.0 | 846.0 | **841.7** | 3.79 | 0.45 | `deterministic` |
| `dx.startupMs` (ms) | 3365.0 | 3377.0 | 3364.0 | **3368.7** | 7.23 | 0.21 | `deterministic` |
| `dx.testMs` (ms) | 5070.0 | 5082.0 | 5337.0 | **5163.0** | 150.8 | 2.92 | `stable` |
| `dx.typecheckMs` (ms) | 7972.0 | 7995.0 | 8025.0 | **7997.3** | 26.58 | 0.33 | `deterministic` |
| `dx.unblockedMs` (ms) | 11168.0 | 11269.0 | 11314.0 | **11250.3** | 74.77 | 0.66 | `stable` |
| `dx.warmBuildMs` (ms) | 5042.0 | 5049.0 | 5083.0 | **5058.0** | 21.93 | 0.43 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `dx.cacheSaving` | 0.113 | 0.358 | +218.0% | yes — rspack-svelte better |
| `dx.coldBuildMs` | 14897.3 | 7882.0 | -47.1% | yes — rspack-svelte better |
| `dx.editToBrowserMs` | 7217.7 | 5399.3 | -25.2% | yes — rspack-svelte better |
| `dx.incrementalMs` | 2897.3 | 908.7 | -68.6% | yes — rspack-svelte better |
| `dx.lintMs` | 9924.3 | 10101.0 | +1.8% | no — within noise |
| `dx.perApp.cart.coldMs` | 3010.3 | 1379.7 | -54.2% | yes — rspack-svelte better |
| `dx.perApp.cart.warmMs` | 2758.0 | 845.3 | -69.3% | yes — rspack-svelte better |
| `dx.perApp.chrome.coldMs` | 2991.7 | 1272.3 | -57.5% | yes — rspack-svelte better |
| `dx.perApp.chrome.warmMs` | 2762.7 | 853.0 | -69.1% | yes — rspack-svelte better |
| `dx.perApp.faq.coldMs` | 2844.3 | 1225.3 | -56.9% | yes — rspack-svelte better |
| `dx.perApp.faq.warmMs` | 2713.3 | 834.7 | -69.2% | yes — rspack-svelte better |
| `dx.perApp.my-account.coldMs` | 1185.7 | 1340.0 | +13.0% | yes — rspack-react better |
| `dx.perApp.my-account.warmMs` | 1065.3 | 843.0 | -20.9% | yes — rspack-svelte better |
| `dx.perApp.product.coldMs` | 3284.7 | 1518.7 | -53.8% | yes — rspack-svelte better |
| `dx.perApp.product.warmMs` | 2791.7 | 840.3 | -69.9% | yes — rspack-svelte better |
| `dx.perApp.storefront.coldMs` | 1580.7 | 1146.0 | -27.5% | no — within noise |
| `dx.perApp.storefront.warmMs` | 1106.0 | 841.7 | -23.9% | yes — rspack-svelte better |
| `dx.startupMs` | 3363.3 | 3368.7 | +0.2% | no — within noise |
| `dx.testMs` | 5394.7 | 5163.0 | -4.3% | yes — rspack-svelte better |
| `dx.typecheckMs` | 7990.7 | 7997.3 | +0.1% | no — within noise |
| `dx.unblockedMs` | 18261.0 | 11250.3 | -38.4% | yes — rspack-svelte better |
| `dx.warmBuildMs` | 13197.0 | 5058.0 | -61.7% | yes — rspack-svelte better |

### 5.8 Composition and styling

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

## 6. Threats to validity

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

## 7. Reproducing this

```bash
pnpm install
pnpm media                 # fetch the image and video fixtures once
MF_RUNS=3 pnpm research      # every stack, every suite, 3 times, then this report
```

The raw suite reports for every run are archived beside this file, unmodified. The headline
metrics above answer the questions this report was written to answer; the raw reports answer
the ones it was not.

