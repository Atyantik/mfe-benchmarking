# Module Federation under two frameworks

**A measured comparison of the same application implemented in React and in Svelte.**

Generated 2026-08-27T07:42:23.015Z · 3 independent runs of each stack · SPEC_VERSION 4 · catalog `c3b6a5fafb68`

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
| Commit | `eaacb1f` on `main` |
| Runs per stack | 3 |

Both stacks were measured on the same machine, from the same commit, against the same
dependency catalog, minutes apart. **Results from different SPEC_VERSIONs or different
catalog hashes describe different applications and must never be compared.**

**rspack-react** — 368/368, 368/368, 368/368 checks per run:

- `results/runs/rspack-react/2026-08-27T07-25-34-573Z` — 2026-08-27T07:25:34.573Z
- `results/runs/rspack-react/2026-08-27T07-19-36-670Z` — 2026-08-27T07:19:36.670Z
- `results/runs/rspack-react/2026-08-27T07-13-35-315Z` — 2026-08-27T07:13:35.315Z

**rspack-svelte** — 368/368, 368/368, 368/368 checks per run:

- `results/runs/rspack-svelte/2026-08-27T07-42-21-968Z` — 2026-08-27T07:42:21.968Z
- `results/runs/rspack-svelte/2026-08-27T07-36-48-737Z` — 2026-08-27T07:36:48.737Z
- `results/runs/rspack-svelte/2026-08-27T07-31-15-216Z` — 2026-08-27T07:31:15.216Z

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

Of 245 metrics measured on both stacks, **109 show a
difference larger than the measurement spread**. The rest are either identical by
construction or too noisy to separate at this sample size.

The twelve largest resolvable differences:

| metric | route or item | rspack-react | rspack-svelte | change |
|---|---|---:|---:|---:|
| Bundler cache saving | `—` | 0.082 | 0.351 | +328.5% |
| GC pause total | `/product/p-0001` | 51.38 | 139.9 | +172.2% |
| Transfer by owning application | `/my-account` | 26.34 | 65.16 | +147.4% |
| GC pause total | `/` | 58.44 | 143.4 | +145.4% |
| Transfer by owning application | `/product/p-0001` | 25.94 | 56.73 | +118.7% |
| Transfer by owning application | `/my-account` | 21.41 | 45.84 | +114.1% |
| Transfer by owning application | `/cart` | 31.58 | 65.85 | +108.5% |
| Transfer by owning application | `/my-account` | 24.04 | 48.02 | +99.8% |
| V8 heap used | `/product` | 78.86 | 144.1 | +82.7% |
| GC pause total | `/my-account` | 71.15 | 127.5 | +79.2% |
| DOM nodes (all types) | `/cart` | 259 | 456 | +76.1% |
| Per-app build time | `perApp · product` | 2825.7 | 838.3 | -70.3% |

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
| `perRoute./cart.byOwnerKbGzip.cart` (kB gzip) | 65.85 | 65.85 | 65.85 | **65.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
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
| `perRoute./product/p-0001.byOwnerKbGzip.cart` (kB gzip) | 59.90 | 50.40 | 59.90 | **56.73** | 5.48 | 9.67 | `variable` |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` (kB gzip) | 19.72 | 19.72 | 19.72 | **19.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.media` (kB gzip) | 77.85 | 77.85 | 77.85 | **77.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.product` (kB gzip) | 20.59 | 30.09 | 20.59 | **23.76** | 5.48 | 23.09 | `unstable` |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` (kB gzip) | 40.54 | 40.54 | 40.54 | **40.54** | 0.000 | 0.00 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` | 17.19 | 16.99 | -1.2% | yes — rspack-svelte better |
| `perRoute./.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./.byOwnerKbGzip.media` | 877.9 | 877.9 | 0.0% | no — within noise |
| `perRoute./.byOwnerKbGzip.storefront` | 40.43 | 40.12 | -0.8% | no — within noise |
| `perRoute./cart.byOwnerKbGzip.cart` | 31.58 | 65.85 | +108.5% | yes — rspack-react better |
| `perRoute./cart.byOwnerKbGzip.chrome` | 29.44 | 19.72 | -33.0% | yes — rspack-svelte better |
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
| `perRoute./product/p-0001.byOwnerKbGzip.cart` | 25.94 | 56.73 | +118.7% | yes — rspack-react better |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` | 19.93 | 19.72 | -1.1% | yes — rspack-svelte better |
| `perRoute./product/p-0001.byOwnerKbGzip.media` | 77.85 | 77.85 | 0.0% | no — within noise |
| `perRoute./product/p-0001.byOwnerKbGzip.product` | 30.30 | 23.76 | -21.6% | yes — rspack-svelte better |
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
| `documents./.FCP` (ms) | 140.0 | 144.0 | 148.0 | **144.0** | 4.00 | 2.78 | `stable` |
| `documents./.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./.LCP` (ms) | 140.0 | 144.0 | 148.0 | **144.0** | 4.00 | 2.78 | `stable` |
| `documents./.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 2.90 | 3.50 | 2.60 | **3.00** | 0.458 | 15.28 | `unstable` |
| `documents./cart.CLS` (score) | 0.0077 | 0.0077 | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 120.0 | 128.0 | 124.0 | **124.0** | 4.00 | 3.23 | `variable` |
| `documents./cart.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.LCP` (ms) | 120.0 | 128.0 | 124.0 | **124.0** | 4.00 | 3.23 | `variable` |
| `documents./cart.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 2.50 | 6.80 | 2.40 | **3.90** | 2.51 | 64.41 | `unstable` |
| `documents./faq.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 140.0 | 144.0 | 144.0 | **142.7** | 2.31 | 1.62 | `stable` |
| `documents./faq.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.LCP` (ms) | 140.0 | 144.0 | 144.0 | **142.7** | 2.31 | 1.62 | `stable` |
| `documents./faq.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 2.60 | 2.50 | 2.50 | **2.53** | 0.058 | 2.28 | `stable` |
| `documents./faq/contact.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 140.0 | 140.0 | 144.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq/contact.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 140.0 | 140.0 | 144.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq/contact.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.30 | 2.70 | 2.50 | **2.50** | 0.200 | 8.00 | `variable` |
| `documents./product.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 164.0 | 164.0 | 164.0 | **164.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product.LCP` (ms) | 164.0 | 164.0 | 164.0 | **164.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 5.10 | 5.00 | 5.20 | **5.10** | 0.100 | 1.96 | `stable` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 164.0 | 168.0 | 164.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product/p-0001.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 164.0 | 168.0 | 164.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 4.30 | 4.40 | 4.70 | **4.47** | 0.208 | 4.66 | `variable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 36 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./.FCP` (ms) | 144.0 | 144.0 | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./.LCP` (ms) | 144.0 | 144.0 | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 3.40 | 2.70 | 2.80 | **2.97** | 0.379 | 12.76 | `unstable` |
| `documents./cart.CLS` (score) | 0.0077 | 0.0077 | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 124.0 | 124.0 | 124.0 | **124.0** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.LCP` (ms) | 124.0 | 124.0 | 124.0 | **124.0** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 2.20 | 2.20 | 2.20 | **2.20** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 140.0 | 140.0 | 144.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq.INP` (ms) | 8.00 | 8.00 | 40.00 | **18.67** | 18.48 | 98.97 | `unstable` |
| `documents./faq.LCP` (ms) | 140.0 | 140.0 | 144.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 2.30 | 2.30 | 5.00 | **3.20** | 1.56 | 48.71 | `unstable` |
| `documents./faq/contact.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 140.0 | 140.0 | 144.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq/contact.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 140.0 | 140.0 | 144.0 | **141.3** | 2.31 | 1.63 | `stable` |
| `documents./faq/contact.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.30 | 2.40 | 2.40 | **2.37** | 0.058 | 2.44 | `stable` |
| `documents./product.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 164.0 | 164.0 | 168.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product.LCP` (ms) | 164.0 | 164.0 | 168.0 | **165.3** | 2.31 | 1.40 | `stable` |
| `documents./product.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 5.10 | 5.20 | 5.10 | **5.13** | 0.058 | 1.12 | `stable` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | 0.0000 | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 168.0 | 164.0 | 168.0 | **166.7** | 2.31 | 1.39 | `stable` |
| `documents./product/p-0001.INP` (ms) | 8.00 | 8.00 | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 168.0 | 164.0 | 168.0 | **166.7** | 2.31 | 1.39 | `stable` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 4.70 | 4.60 | 4.90 | **4.73** | 0.153 | 3.23 | `variable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `documents./.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./.FCP` | 144.0 | 144.0 | 0.0% | no — within noise |
| `documents./.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./.LCP` | 144.0 | 144.0 | 0.0% | no — within noise |
| `documents./.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./.TTFB` | 3.00 | 2.97 | -1.1% | no — within noise |
| `documents./cart.CLS` | 0.0077 | 0.0077 | 0.0% | no — within noise |
| `documents./cart.FCP` | 124.0 | 124.0 | 0.0% | no — within noise |
| `documents./cart.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./cart.LCP` | 124.0 | 124.0 | 0.0% | no — within noise |
| `documents./cart.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./cart.TTFB` | 3.90 | 2.20 | -43.6% | no — within noise |
| `documents./faq.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./faq.FCP` | 142.7 | 141.3 | -0.9% | no — within noise |
| `documents./faq.INP` | 8.00 | 18.67 | +133.3% | no — within noise |
| `documents./faq.LCP` | 142.7 | 141.3 | -0.9% | no — within noise |
| `documents./faq.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./faq.TTFB` | 2.53 | 3.20 | +26.3% | no — within noise |
| `documents./faq/contact.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./faq/contact.FCP` | 141.3 | 141.3 | 0.0% | no — within noise |
| `documents./faq/contact.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./faq/contact.LCP` | 141.3 | 141.3 | 0.0% | no — within noise |
| `documents./faq/contact.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./faq/contact.TTFB` | 2.50 | 2.37 | -5.3% | no — within noise |
| `documents./product.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./product.FCP` | 164.0 | 165.3 | +0.8% | no — within noise |
| `documents./product.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./product.LCP` | 164.0 | 165.3 | +0.8% | no — within noise |
| `documents./product.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./product.TTFB` | 5.10 | 5.13 | +0.7% | no — within noise |
| `documents./product/p-0001.CLS` | 0.0000 | 0.0000 | 0.0% | no — within noise |
| `documents./product/p-0001.FCP` | 165.3 | 166.7 | +0.8% | no — within noise |
| `documents./product/p-0001.INP` | 8.00 | 8.00 | 0.0% | no — within noise |
| `documents./product/p-0001.LCP` | 165.3 | 166.7 | +0.8% | no — within noise |
| `documents./product/p-0001.TBT` | 0.000 | 0.000 | 0.0% | no — within noise |
| `documents./product/p-0001.TTFB` | 4.47 | 4.73 | +6.0% | no — within noise |

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
| `documents./.jsHeapMb` (MB) | 3.24 | 3.25 | 3.24 | **3.24** | 0.006 | 0.17 | `deterministic` |
| `documents./.layoutMs` (ms) | 32.67 | 31.96 | 33.63 | **32.75** | 0.839 | 2.56 | `stable` |
| `documents./.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 43.49 | 42.78 | 44.07 | **43.45** | 0.642 | 1.48 | `stable` |
| `documents./.styleMs` (ms) | 42.12 | 44.38 | 43.63 | **43.38** | 1.15 | 2.65 | `stable` |
| `documents./.taskMs` (ms) | 342.4 | 340.1 | 355.9 | **346.1** | 8.53 | 2.46 | `stable` |
| `documents./cart.domNodes` (count) | 259 | 259 | 259 | **259** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 4.28 | 4.28 | 4.29 | **4.28** | 0.003 | 0.08 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 18.43 | 18.63 | 18.15 | **18.40** | 0.246 | 1.34 | `stable` |
| `documents./cart.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 57.15 | 57.00 | 56.10 | **56.75** | 0.568 | 1.00 | `stable` |
| `documents./cart.styleMs` (ms) | 30.48 | 31.71 | 31.54 | **31.24** | 0.666 | 2.13 | `stable` |
| `documents./cart.taskMs` (ms) | 333.0 | 335.3 | 331.5 | **333.3** | 1.93 | 0.58 | `stable` |
| `documents./faq.domNodes` (count) | 538 | 538 | 538 | **538** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 3.19 | 3.21 | 3.19 | **3.20** | 0.012 | 0.37 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 21.98 | 22.54 | 24.56 | **23.03** | 1.36 | 5.89 | `variable` |
| `documents./faq.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 39.52 | 39.86 | 41.20 | **40.19** | 0.892 | 2.22 | `stable` |
| `documents./faq.styleMs` (ms) | 32.70 | 33.58 | 33.65 | **33.31** | 0.526 | 1.58 | `stable` |
| `documents./faq.taskMs` (ms) | 288.0 | 295.4 | 298.9 | **294.1** | 5.56 | 1.89 | `stable` |
| `documents./faq/contact.domNodes` (count) | 388 | 388 | 388 | **388** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.30 | 3.31 | 3.31 | **3.30** | 0.005 | 0.16 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 27.58 | 28.73 | 27.62 | **27.98** | 0.651 | 2.33 | `stable` |
| `documents./faq/contact.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 41.69 | 38.47 | 42.89 | **41.01** | 2.28 | 5.57 | `variable` |
| `documents./faq/contact.styleMs` (ms) | 32.11 | 33.88 | 33.54 | **33.17** | 0.939 | 2.83 | `stable` |
| `documents./faq/contact.taskMs` (ms) | 289.5 | 293.4 | 294.4 | **292.4** | 2.61 | 0.89 | `stable` |
| `documents./product.domNodes` (count) | 904 | 904 | 904 | **904** | 0 | 0.00 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.51 | 3.42 | 3.51 | **3.48** | 0.052 | 1.50 | `stable` |
| `documents./product.layoutMs` (ms) | 32.27 | 31.86 | 33.80 | **32.65** | 1.02 | 3.12 | `variable` |
| `documents./product.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 46.40 | 45.05 | 47.00 | **46.15** | 1.00 | 2.17 | `stable` |
| `documents./product.styleMs` (ms) | 39.85 | 40.59 | 39.45 | **39.97** | 0.580 | 1.45 | `stable` |
| `documents./product.taskMs` (ms) | 327.3 | 330.1 | 329.8 | **329.1** | 1.57 | 0.48 | `deterministic` |
| `documents./product/p-0001.domNodes` (count) | 640 | 640 | 640 | **640** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 4.16 | 4.14 | 4.15 | **4.15** | 0.007 | 0.16 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 36.80 | 36.58 | 35.38 | **36.25** | 0.763 | 2.10 | `stable` |
| `documents./product/p-0001.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 58.92 | 58.06 | 59.00 | **58.66** | 0.518 | 0.88 | `stable` |
| `documents./product/p-0001.styleMs` (ms) | 39.99 | 39.16 | 40.02 | **39.72** | 0.488 | 1.23 | `stable` |
| `documents./product/p-0001.taskMs` (ms) | 381.9 | 391.6 | 385.2 | **386.2** | 4.92 | 1.27 | `stable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 42 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `documents./.domNodes` (count) | 1060 | 1060 | 1060 | **1060** | 0 | 0.00 | `deterministic` |
| `documents./.jsHeapMb` (MB) | 2.97 | 2.95 | 2.96 | **2.96** | 0.006 | 0.19 | `deterministic` |
| `documents./.layoutMs` (ms) | 31.73 | 32.11 | 31.15 | **31.66** | 0.485 | 1.53 | `stable` |
| `documents./.longTasks` (count) | 0 | 0 | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 40.98 | 40.67 | 41.80 | **41.15** | 0.583 | 1.42 | `stable` |
| `documents./.styleMs` (ms) | 42.17 | 41.08 | 43.06 | **42.10** | 0.991 | 2.35 | `stable` |
| `documents./.taskMs` (ms) | 327.0 | 331.5 | 330.7 | **329.7** | 2.43 | 0.74 | `stable` |
| `documents./cart.domNodes` (count) | 456 | 456 | 456 | **456** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 3.83 | 3.82 | 3.83 | **3.83** | 0.006 | 0.16 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 17.63 | 17.36 | 17.98 | **17.65** | 0.309 | 1.75 | `stable` |
| `documents./cart.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 41.03 | 40.66 | 41.18 | **40.96** | 0.267 | 0.65 | `stable` |
| `documents./cart.styleMs` (ms) | 31.91 | 31.72 | 31.36 | **31.66** | 0.282 | 0.89 | `stable` |
| `documents./cart.taskMs` (ms) | 305.1 | 304.0 | 305.5 | **304.9** | 0.775 | 0.25 | `deterministic` |
| `documents./faq.domNodes` (count) | 734 | 734 | 734 | **734** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 2.92 | 2.92 | 2.92 | **2.92** | 0.002 | 0.08 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 22.43 | 22.58 | 22.17 | **22.39** | 0.207 | 0.93 | `stable` |
| `documents./faq.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 39.62 | 39.57 | 39.75 | **39.65** | 0.092 | 0.23 | `deterministic` |
| `documents./faq.styleMs` (ms) | 33.10 | 33.04 | 33.60 | **33.25** | 0.304 | 0.92 | `stable` |
| `documents./faq.taskMs` (ms) | 283.6 | 282.3 | 295.5 | **287.1** | 7.28 | 2.54 | `stable` |
| `documents./faq/contact.domNodes` (count) | 572 | 572 | 572 | **572** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.01 | 3.02 | 3.01 | **3.01** | 0.003 | 0.09 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 29.05 | 27.46 | 27.37 | **27.96** | 0.942 | 3.37 | `variable` |
| `documents./faq/contact.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 39.31 | 38.85 | 38.85 | **39.00** | 0.265 | 0.68 | `stable` |
| `documents./faq/contact.styleMs` (ms) | 33.66 | 33.76 | 34.38 | **33.93** | 0.393 | 1.16 | `stable` |
| `documents./faq/contact.taskMs` (ms) | 280.8 | 282.4 | 283.9 | **282.3** | 1.56 | 0.55 | `stable` |
| `documents./product.domNodes` (count) | 1337 | 1337 | 1337 | **1337** | 0 | 0.00 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.15 | 3.15 | 3.15 | **3.15** | 0.001 | 0.05 | `deterministic` |
| `documents./product.layoutMs` (ms) | 31.67 | 32.09 | 32.38 | **32.05** | 0.358 | 1.12 | `stable` |
| `documents./product.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 44.45 | 44.05 | 44.27 | **44.26** | 0.199 | 0.45 | `deterministic` |
| `documents./product.styleMs` (ms) | 39.50 | 39.70 | 39.87 | **39.69** | 0.183 | 0.46 | `deterministic` |
| `documents./product.taskMs` (ms) | 317.0 | 316.8 | 322.0 | **318.6** | 2.92 | 0.92 | `stable` |
| `documents./product/p-0001.domNodes` (count) | 911 | 911 | 911 | **911** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 3.71 | 3.70 | 3.70 | **3.70** | 0.007 | 0.19 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 33.25 | 33.43 | 33.75 | **33.47** | 0.254 | 0.76 | `stable` |
| `documents./product/p-0001.longTasks` (count) | 1 | 1 | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 45.51 | 46.61 | 47.29 | **46.47** | 0.898 | 1.93 | `stable` |
| `documents./product/p-0001.styleMs` (ms) | 38.67 | 39.09 | 40.13 | **39.30** | 0.750 | 1.91 | `stable` |
| `documents./product/p-0001.taskMs` (ms) | 354.0 | 350.0 | 352.4 | **352.1** | 2.03 | 0.58 | `stable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `documents./.domNodes` | 743 | 1060 | +42.7% | yes — rspack-react better |
| `documents./.jsHeapMb` | 3.24 | 2.96 | -8.7% | yes — rspack-svelte better |
| `documents./.layoutMs` | 32.75 | 31.66 | -3.3% | no — within noise |
| `documents./.longTasks` | 0 | 0 | 0.0% | no — within noise |
| `documents./.scriptMs` | 43.45 | 41.15 | -5.3% | yes — rspack-svelte better |
| `documents./.styleMs` | 43.38 | 42.10 | -2.9% | no — within noise |
| `documents./.taskMs` | 346.1 | 329.7 | -4.7% | yes — rspack-svelte better |
| `documents./cart.domNodes` | 259 | 456 | +76.1% | yes — rspack-react better |
| `documents./cart.jsHeapMb` | 4.28 | 3.83 | -10.7% | yes — rspack-svelte better |
| `documents./cart.layoutMs` | 18.40 | 17.65 | -4.1% | yes — rspack-svelte better |
| `documents./cart.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./cart.scriptMs` | 56.75 | 40.96 | -27.8% | yes — rspack-svelte better |
| `documents./cart.styleMs` | 31.24 | 31.66 | +1.3% | no — within noise |
| `documents./cart.taskMs` | 333.3 | 304.9 | -8.5% | yes — rspack-svelte better |
| `documents./faq.domNodes` | 538 | 734 | +36.4% | yes — rspack-react better |
| `documents./faq.jsHeapMb` | 3.20 | 2.92 | -8.7% | yes — rspack-svelte better |
| `documents./faq.layoutMs` | 23.03 | 22.39 | -2.8% | no — within noise |
| `documents./faq.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./faq.scriptMs` | 40.19 | 39.65 | -1.4% | no — within noise |
| `documents./faq.styleMs` | 33.31 | 33.25 | -0.2% | no — within noise |
| `documents./faq.taskMs` | 294.1 | 287.1 | -2.4% | no — within noise |
| `documents./faq/contact.domNodes` | 388 | 572 | +47.4% | yes — rspack-react better |
| `documents./faq/contact.jsHeapMb` | 3.30 | 3.01 | -8.8% | yes — rspack-svelte better |
| `documents./faq/contact.layoutMs` | 27.98 | 27.96 | -0.1% | no — within noise |
| `documents./faq/contact.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./faq/contact.scriptMs` | 41.01 | 39.00 | -4.9% | no — within noise |
| `documents./faq/contact.styleMs` | 33.17 | 33.93 | +2.3% | no — within noise |
| `documents./faq/contact.taskMs` | 292.4 | 282.3 | -3.5% | yes — rspack-svelte better |
| `documents./product.domNodes` | 904 | 1337 | +47.9% | yes — rspack-react better |
| `documents./product.jsHeapMb` | 3.48 | 3.15 | -9.5% | yes — rspack-svelte better |
| `documents./product.layoutMs` | 32.65 | 32.05 | -1.8% | no — within noise |
| `documents./product.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./product.scriptMs` | 46.15 | 44.26 | -4.1% | yes — rspack-svelte better |
| `documents./product.styleMs` | 39.97 | 39.69 | -0.7% | no — within noise |
| `documents./product.taskMs` | 329.1 | 318.6 | -3.2% | yes — rspack-svelte better |
| `documents./product/p-0001.domNodes` | 640 | 911 | +42.3% | yes — rspack-react better |
| `documents./product/p-0001.jsHeapMb` | 4.15 | 3.70 | -10.9% | yes — rspack-svelte better |
| `documents./product/p-0001.layoutMs` | 36.25 | 33.47 | -7.7% | yes — rspack-svelte better |
| `documents./product/p-0001.longTasks` | 1 | 1 | 0.0% | no — within noise |
| `documents./product/p-0001.scriptMs` | 58.66 | 46.47 | -20.8% | yes — rspack-svelte better |
| `documents./product/p-0001.styleMs` | 39.72 | 39.30 | -1.1% | no — within noise |
| `documents./product/p-0001.taskMs` | 386.2 | 352.1 | -8.8% | yes — rspack-svelte better |

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
| `server./.coresUsed` (cores) | 1.36 | 1.35 | 1.35 | **1.36** | 0 | 0.24 | `deterministic` |
| `server./.cpuPerRequestMs` (ms) | 0.820 | 0.840 | 0.837 | **0.832** | 0.011 | 1.30 | `stable` |
| `server./.cpuSystemMs` (ms) | 503.2 | 499.4 | 484.7 | **495.8** | 9.78 | 1.97 | `stable` |
| `server./.cpuUserMs` (ms) | 10383.8 | 10336.8 | 10360.6 | **10360.4** | 23.50 | 0.23 | `deterministic` |
| `server./.eventLoopUtilization` (ratio) | 0.894 | 0.886 | 0.884 | **0.888** | 0.005 | 0.56 | `stable` |
| `server./.gcPauseMs` (ms) | 57.99 | 58.16 | 59.18 | **58.44** | 0.644 | 1.10 | `stable` |
| `server./.heapUsedMb` (MB) | 84.30 | 70.93 | 33.75 | **62.99** | 26.19 | 41.58 | `unstable` |
| `server./.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./.rps` (req/s) | 1658.5 | 1611.6 | 1619.1 | **1629.8** | 25.18 | 1.54 | `stable` |
| `server./.rssMb` (MB) | 267.8 | 271.1 | 269.3 | **269.4** | 1.62 | 0.60 | `stable` |
| `server./my-account.coresUsed` (cores) | 1.32 | 1.3 | 1.3 | **1.31** | 0.01 | 0.83 | `stable` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.327 | 0.345 | 0.335 | **0.336** | 0.009 | 2.69 | `stable` |
| `server./my-account.cpuSystemMs` (ms) | 932.4 | 936.7 | 940.7 | **936.6** | 4.19 | 0.45 | `deterministic` |
| `server./my-account.cpuUserMs` (ms) | 9639.0 | 9466.7 | 9513.2 | **9539.6** | 89.13 | 0.93 | `stable` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.978 | 0.962 | 0.969 | **0.969** | 0.008 | 0.81 | `stable` |
| `server./my-account.gcPauseMs` (ms) | 69.43 | 72.26 | 71.76 | **71.15** | 1.51 | 2.12 | `stable` |
| `server./my-account.heapUsedMb` (MB) | 45.57 | 31.68 | 49.72 | **42.32** | 9.45 | 22.32 | `unstable` |
| `server./my-account.p50Ms` (ms) | 1.00 | 2.00 | 2.00 | **1.67** | 0.577 | 34.64 | `unstable` |
| `server./my-account.p99Ms` (ms) | 3.00 | 3.00 | 3.00 | **3.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.rps` (req/s) | 4038.9 | 3767.8 | 3898.8 | **3901.8** | 135.6 | 3.48 | `variable` |
| `server./my-account.rssMb` (MB) | 240.2 | 244.0 | 244.7 | **243.0** | 2.42 | 1.00 | `stable` |
| `server./product.coresUsed` (cores) | 1.24 | 1.26 | 1.25 | **1.25** | 0.01 | 0.95 | `stable` |
| `server./product.cpuPerRequestMs` (ms) | 1.24 | 1.13 | 1.14 | **1.17** | 0.060 | 5.17 | `variable` |
| `server./product.cpuSystemMs` (ms) | 675.0 | 719.9 | 685.7 | **693.5** | 23.43 | 3.38 | `variable` |
| `server./product.cpuUserMs` (ms) | 9226.5 | 9356.3 | 9363.2 | **9315.3** | 77.03 | 0.83 | `stable` |
| `server./product.eventLoopUtilization` (ratio) | 0.891 | 0.895 | 0.885 | **0.891** | 0.005 | 0.58 | `stable` |
| `server./product.gcPauseMs` (ms) | 136.0 | 146.1 | 141.2 | **141.1** | 5.04 | 3.57 | `variable` |
| `server./product.heapUsedMb` (MB) | 46.42 | 87.32 | 102.8 | **78.86** | 29.15 | 36.96 | `unstable` |
| `server./product.p50Ms` (ms) | 7.00 | 7.00 | 7.00 | **7.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 19.00 | 9.00 | 9.00 | **12.33** | 5.77 | 46.81 | `unstable` |
| `server./product.rps` (req/s) | 999.6 | 1118.9 | 1098.6 | **1072.4** | 63.81 | 5.95 | `variable` |
| `server./product.rssMb` (MB) | 285.3 | 287.3 | 293.6 | **288.7** | 4.37 | 1.51 | `stable` |
| `server./product/p-0001.coresUsed` (cores) | 1.28 | 1.29 | 1.27 | **1.28** | 0.01 | 0.48 | `deterministic` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.756 | 0.755 | 0.755 | **0.755** | 0.001 | 0.08 | `deterministic` |
| `server./product/p-0001.cpuSystemMs` (ms) | 503.1 | 507.0 | 488.8 | **499.6** | 9.59 | 1.92 | `stable` |
| `server./product/p-0001.cpuUserMs` (ms) | 9763.0 | 9795.7 | 9711.6 | **9756.8** | 42.39 | 0.43 | `deterministic` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.889 | 0.893 | 0.885 | **0.889** | 0.004 | 0.42 | `deterministic` |
| `server./product/p-0001.gcPauseMs` (ms) | 51.52 | 51.09 | 51.52 | **51.38** | 0.248 | 0.48 | `deterministic` |
| `server./product/p-0001.heapUsedMb` (MB) | 82.16 | 42.77 | 88.78 | **71.24** | 24.87 | 34.92 | `unstable` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 6.00 | 5.00 | 6.00 | **5.67** | 0.577 | 10.19 | `unstable` |
| `server./product/p-0001.rps` (req/s) | 1695.8 | 1705.1 | 1687.8 | **1696.2** | 8.70 | 0.51 | `stable` |
| `server./product/p-0001.rssMb` (MB) | 283.6 | 276.3 | 275.4 | **278.5** | 4.50 | 1.62 | `stable` |
| `sustainedHeap.perRequestKb` (kB) | 0.042 | 0.048 | 0.044 | **0.045** | 0.003 | 6.84 | `variable` |

</details>

<details><summary><strong>rspack-svelte</strong> — 45 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `server./.coresUsed` (cores) | 1.49 | 1.47 | 1.48 | **1.48** | 0.01 | 0.83 | `stable` |
| `server./.cpuPerRequestMs` (ms) | 0.837 | 0.831 | 0.829 | **0.832** | 0.004 | 0.50 | `stable` |
| `server./.cpuSystemMs` (ms) | 552.7 | 537.5 | 547.1 | **545.8** | 7.72 | 1.41 | `stable` |
| `server./.cpuUserMs` (ms) | 11401.3 | 11226.0 | 11271.7 | **11299.7** | 90.92 | 0.80 | `stable` |
| `server./.eventLoopUtilization` (ratio) | 0.878 | 0.875 | 0.872 | **0.875** | 0.003 | 0.35 | `deterministic` |
| `server./.gcPauseMs` (ms) | 145.0 | 141.4 | 143.9 | **143.4** | 1.86 | 1.30 | `stable` |
| `server./.heapUsedMb` (MB) | 100.9 | 100.8 | 77.10 | **92.95** | 13.73 | 14.77 | `unstable` |
| `server./.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | 6.00 | 7.00 | **6.33** | 0.577 | 9.12 | `variable` |
| `server./.rps` (req/s) | 1783.3 | 1769.4 | 1780.9 | **1777.8** | 7.42 | 0.42 | `deterministic` |
| `server./.rssMb` (MB) | 393.6 | 386.5 | 383.8 | **388.0** | 5.08 | 1.31 | `stable` |
| `server./my-account.coresUsed` (cores) | 1.44 | 1.43 | 1.44 | **1.43** | 0 | 0.12 | `deterministic` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.324 | 0.323 | 0.325 | **0.324** | 0.001 | 0.31 | `deterministic` |
| `server./my-account.cpuSystemMs` (ms) | 1040.5 | 1048.8 | 1040.4 | **1043.2** | 4.80 | 0.46 | `deterministic` |
| `server./my-account.cpuUserMs` (ms) | 10452.2 | 10424.3 | 10455.8 | **10444.1** | 17.22 | 0.16 | `deterministic` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.966 | 0.962 | 0.966 | **0.965** | 0.002 | 0.23 | `deterministic` |
| `server./my-account.gcPauseMs` (ms) | 130.4 | 124.7 | 127.4 | **127.5** | 2.86 | 2.24 | `stable` |
| `server./my-account.heapUsedMb` (MB) | 81.21 | 26.93 | 89.12 | **65.75** | 33.85 | 51.49 | `unstable` |
| `server./my-account.p50Ms` (ms) | 1.00 | 1.00 | 1.00 | **1.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.p99Ms` (ms) | 3.00 | 2.00 | 3.00 | **2.67** | 0.577 | 21.65 | `unstable` |
| `server./my-account.rps` (req/s) | 4433.5 | 4437.5 | 4422.0 | **4431.0** | 8.05 | 0.18 | `deterministic` |
| `server./my-account.rssMb` (MB) | 305.1 | 305.7 | 305.4 | **305.4** | 0.300 | 0.10 | `deterministic` |
| `server./product.coresUsed` (cores) | 1.35 | 1.32 | 1.33 | **1.34** | 0.01 | 1.09 | `stable` |
| `server./product.cpuPerRequestMs` (ms) | 1.12 | 1.20 | 1.17 | **1.17** | 0.039 | 3.32 | `variable` |
| `server./product.cpuSystemMs` (ms) | 766.7 | 752.9 | 765.6 | **761.7** | 7.70 | 1.01 | `stable` |
| `server./product.cpuUserMs` (ms) | 10064.5 | 9881.0 | 9895.9 | **9947.1** | 101.9 | 1.02 | `stable` |
| `server./product.eventLoopUtilization` (ratio) | 0.874 | 0.874 | 0.868 | **0.872** | 0.004 | 0.40 | `deterministic` |
| `server./product.gcPauseMs` (ms) | 190.3 | 191.7 | 194.2 | **192.1** | 1.99 | 1.04 | `stable` |
| `server./product.heapUsedMb` (MB) | 148.1 | 124.2 | 159.9 | **144.1** | 18.19 | 12.63 | `unstable` |
| `server./product.p50Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 14.00 | 14.00 | 14.00 | **14.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.rps` (req/s) | 1205.0 | 1107.5 | 1133.6 | **1148.7** | 50.47 | 4.39 | `variable` |
| `server./product.rssMb` (MB) | 477.9 | 466.6 | 492.6 | **479.1** | 13.03 | 2.72 | `stable` |
| `server./product/p-0001.coresUsed` (cores) | 1.41 | 1.39 | 1.38 | **1.39** | 0.01 | 0.87 | `stable` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.749 | 0.744 | 0.747 | **0.747** | 0.003 | 0.34 | `deterministic` |
| `server./product/p-0001.cpuSystemMs` (ms) | 556.1 | 554.6 | 546.3 | **552.3** | 5.30 | 0.96 | `stable` |
| `server./product/p-0001.cpuUserMs` (ms) | 10700.3 | 10590.5 | 10524.4 | **10605.1** | 88.82 | 0.84 | `stable` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.869 | 0.865 | 0.864 | **0.866** | 0.003 | 0.29 | `deterministic` |
| `server./product/p-0001.gcPauseMs` (ms) | 139.3 | 141.5 | 138.8 | **139.9** | 1.46 | 1.04 | `stable` |
| `server./product/p-0001.heapUsedMb` (MB) | 78.77 | 78.94 | 98.39 | **85.37** | 11.28 | 13.21 | `unstable` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | 4.00 | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 6.00 | 6.00 | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.rps` (req/s) | 1877.8 | 1871.1 | 1851.8 | **1866.9** | 13.51 | 0.72 | `stable` |
| `server./product/p-0001.rssMb` (MB) | 410.6 | 412.3 | 416.4 | **413.1** | 3.00 | 0.73 | `stable` |
| `sustainedHeap.perRequestKb` (kB) | 0.037 | 0.047 | 0.029 | **0.038** | 0.009 | 23.94 | `unstable` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `server./.coresUsed` | 1.36 | 1.48 | +9.1% | yes — rspack-react better |
| `server./.cpuPerRequestMs` | 0.832 | 0.832 | 0.0% | no — within noise |
| `server./.cpuSystemMs` | 495.8 | 545.8 | +10.1% | yes — rspack-react better |
| `server./.cpuUserMs` | 10360.4 | 11299.7 | +9.1% | yes — rspack-react better |
| `server./.eventLoopUtilization` | 0.888 | 0.875 | -1.5% | yes — rspack-svelte better |
| `server./.gcPauseMs` | 58.44 | 143.4 | +145.4% | yes — rspack-react better |
| `server./.heapUsedMb` | 62.99 | 92.95 | +47.6% | no — within noise |
| `server./.p50Ms` | 4.00 | 4.00 | 0.0% | no — within noise |
| `server./.p99Ms` | 6.00 | 6.33 | +5.6% | no — within noise |
| `server./.rps` | 1629.8 | 1777.8 | +9.1% | yes — rspack-svelte better |
| `server./.rssMb` | 269.4 | 388.0 | +44.0% | yes — rspack-react better |
| `server./my-account.coresUsed` | 1.31 | 1.43 | +9.6% | yes — rspack-react better |
| `server./my-account.cpuPerRequestMs` | 0.336 | 0.324 | -3.5% | yes — rspack-svelte better |
| `server./my-account.cpuSystemMs` | 936.6 | 1043.2 | +11.4% | yes — rspack-react better |
| `server./my-account.cpuUserMs` | 9539.6 | 10444.1 | +9.5% | yes — rspack-react better |
| `server./my-account.eventLoopUtilization` | 0.969 | 0.965 | -0.5% | no — within noise |
| `server./my-account.gcPauseMs` | 71.15 | 127.5 | +79.2% | yes — rspack-react better |
| `server./my-account.heapUsedMb` | 42.32 | 65.75 | +55.4% | no — within noise |
| `server./my-account.p50Ms` | 1.67 | 1.00 | -40.0% | yes — rspack-svelte better |
| `server./my-account.p99Ms` | 3.00 | 2.67 | -11.1% | no — within noise |
| `server./my-account.rps` | 3901.8 | 4431.0 | +13.6% | yes — rspack-svelte better |
| `server./my-account.rssMb` | 243.0 | 305.4 | +25.7% | yes — rspack-react better |
| `server./product.coresUsed` | 1.25 | 1.34 | +6.9% | yes — rspack-react better |
| `server./product.cpuPerRequestMs` | 1.17 | 1.17 | -0.2% | no — within noise |
| `server./product.cpuSystemMs` | 693.5 | 761.7 | +9.8% | yes — rspack-react better |
| `server./product.cpuUserMs` | 9315.3 | 9947.1 | +6.8% | yes — rspack-react better |
| `server./product.eventLoopUtilization` | 0.891 | 0.872 | -2.1% | yes — rspack-svelte better |
| `server./product.gcPauseMs` | 141.1 | 192.1 | +36.1% | yes — rspack-react better |
| `server./product.heapUsedMb` | 78.86 | 144.1 | +82.7% | yes — rspack-react better |
| `server./product.p50Ms` | 7.00 | 6.00 | -14.3% | yes — rspack-svelte better |
| `server./product.p99Ms` | 12.33 | 14.00 | +13.5% | no — within noise |
| `server./product.rps` | 1072.4 | 1148.7 | +7.1% | no — within noise |
| `server./product.rssMb` | 288.7 | 479.1 | +65.9% | yes — rspack-react better |
| `server./product/p-0001.coresUsed` | 1.28 | 1.39 | +8.8% | yes — rspack-react better |
| `server./product/p-0001.cpuPerRequestMs` | 0.755 | 0.747 | -1.1% | yes — rspack-svelte better |
| `server./product/p-0001.cpuSystemMs` | 499.6 | 552.3 | +10.5% | yes — rspack-react better |
| `server./product/p-0001.cpuUserMs` | 9756.8 | 10605.1 | +8.7% | yes — rspack-react better |
| `server./product/p-0001.eventLoopUtilization` | 0.889 | 0.866 | -2.6% | yes — rspack-svelte better |
| `server./product/p-0001.gcPauseMs` | 51.38 | 139.9 | +172.2% | yes — rspack-react better |
| `server./product/p-0001.heapUsedMb` | 71.24 | 85.37 | +19.8% | no — within noise |
| `server./product/p-0001.p50Ms` | 4.00 | 4.00 | 0.0% | no — within noise |
| `server./product/p-0001.p99Ms` | 5.67 | 6.00 | +5.9% | no — within noise |
| `server./product/p-0001.rps` | 1696.2 | 1866.9 | +10.1% | yes — rspack-svelte better |
| `server./product/p-0001.rssMb` | 278.5 | 413.1 | +48.3% | yes — rspack-react better |
| `sustainedHeap.perRequestKb` | 0.045 | 0.038 | -15.7% | no — within noise |

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
| `dx.cacheSaving` (ratio) | 0.077 | 0.085 | 0.084 | **0.082** | 0.004 | 5.32 | `variable` |
| `dx.coldBuildMs` (ms) | 14598.0 | 14460.0 | 14297.0 | **14451.7** | 150.7 | 1.04 | `stable` |
| `dx.editToBrowserMs` (ms) | 7222.0 | 7312.0 | 7275.0 | **7269.7** | 45.24 | 0.62 | `stable` |
| `dx.incrementalMs` (ms) | 2900.0 | 2921.0 | 2892.0 | **2904.3** | 14.98 | 0.52 | `stable` |
| `dx.lintMs` (ms) | 10106.0 | 10004.0 | 9738.0 | **9949.3** | 190.0 | 1.91 | `stable` |
| `dx.perApp.cart.coldMs` (ms) | 3131.0 | 3032.0 | 2987.0 | **3050.0** | 73.67 | 2.42 | `stable` |
| `dx.perApp.cart.warmMs` (ms) | 2767.0 | 2767.0 | 2762.0 | **2765.3** | 2.89 | 0.10 | `deterministic` |
| `dx.perApp.chrome.coldMs` (ms) | 3001.0 | 3017.0 | 2908.0 | **2975.3** | 58.86 | 1.98 | `stable` |
| `dx.perApp.chrome.warmMs` (ms) | 2792.0 | 2746.0 | 2730.0 | **2756.0** | 32.19 | 1.17 | `stable` |
| `dx.perApp.faq.coldMs` (ms) | 2916.0 | 2843.0 | 2804.0 | **2854.3** | 56.85 | 1.99 | `stable` |
| `dx.perApp.faq.warmMs` (ms) | 2790.0 | 2748.0 | 2697.0 | **2745.0** | 46.57 | 1.70 | `stable` |
| `dx.perApp.my-account.coldMs` (ms) | 1176.0 | 1189.0 | 1175.0 | **1180.0** | 7.81 | 0.66 | `stable` |
| `dx.perApp.my-account.warmMs` (ms) | 1114.0 | 1060.0 | 1063.0 | **1079.0** | 30.35 | 2.81 | `stable` |
| `dx.perApp.product.coldMs` (ms) | 3190.0 | 3196.0 | 3266.0 | **3217.3** | 42.25 | 1.31 | `stable` |
| `dx.perApp.product.warmMs` (ms) | 2881.0 | 2803.0 | 2793.0 | **2825.7** | 48.18 | 1.71 | `stable` |
| `dx.perApp.storefront.coldMs` (ms) | 1185.0 | 1185.0 | 1158.0 | **1176.0** | 15.59 | 1.33 | `stable` |
| `dx.perApp.storefront.warmMs` (ms) | 1122.0 | 1108.0 | 1052.0 | **1094.0** | 37.04 | 3.39 | `variable` |
| `dx.startupMs` (ms) | 3405.0 | 3363.0 | 3365.0 | **3377.7** | 23.69 | 0.70 | `stable` |
| `dx.testMs` (ms) | 5299.0 | 5267.0 | 5345.0 | **5303.7** | 39.21 | 0.74 | `stable` |
| `dx.typecheckMs` (ms) | 7685.0 | 7664.0 | 8200.0 | **7849.7** | 303.6 | 3.87 | `variable` |
| `dx.unblockedMs` (ms) | 18003.0 | 17824.0 | 17662.0 | **17829.7** | 170.6 | 0.96 | `stable` |
| `dx.warmBuildMs` (ms) | 13467.0 | 13232.0 | 13098.0 | **13265.7** | 186.8 | 1.41 | `stable` |

</details>

<details open><summary><strong>rspack-svelte</strong> — 22 metrics</summary>

| metric | run 1 | run 2 | run 3 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---:|---:|---|
| `dx.cacheSaving` (ratio) | 0.348 | 0.342 | 0.364 | **0.351** | 0.011 | 3.24 | `variable` |
| `dx.coldBuildMs` (ms) | 7721.0 | 7677.0 | 7941.0 | **7779.7** | 141.4 | 1.82 | `stable` |
| `dx.editToBrowserMs` (ms) | 5377.0 | 5366.0 | 5383.0 | **5375.3** | 8.62 | 0.16 | `deterministic` |
| `dx.incrementalMs` (ms) | 910.0 | 911.0 | 911.0 | **910.7** | 0.577 | 0.06 | `deterministic` |
| `dx.lintMs` (ms) | 10244.0 | 10001.0 | 10096.0 | **10113.7** | 122.5 | 1.21 | `stable` |
| `dx.perApp.cart.coldMs` (ms) | 1384.0 | 1362.0 | 1374.0 | **1373.3** | 11.02 | 0.80 | `stable` |
| `dx.perApp.cart.warmMs` (ms) | 844.0 | 847.0 | 849.0 | **846.7** | 2.52 | 0.30 | `deterministic` |
| `dx.perApp.chrome.coldMs` (ms) | 1260.0 | 1262.0 | 1302.0 | **1274.7** | 23.69 | 1.86 | `stable` |
| `dx.perApp.chrome.warmMs` (ms) | 831.0 | 847.0 | 852.0 | **843.3** | 10.97 | 1.30 | `stable` |
| `dx.perApp.faq.coldMs` (ms) | 1223.0 | 1205.0 | 1227.0 | **1218.3** | 11.72 | 0.96 | `stable` |
| `dx.perApp.faq.warmMs` (ms) | 833.0 | 846.0 | 836.0 | **838.3** | 6.81 | 0.81 | `stable` |
| `dx.perApp.my-account.coldMs` (ms) | 1324.0 | 1323.0 | 1315.0 | **1320.7** | 4.93 | 0.37 | `deterministic` |
| `dx.perApp.my-account.warmMs` (ms) | 837.0 | 844.0 | 842.0 | **841.0** | 3.61 | 0.43 | `deterministic` |
| `dx.perApp.product.coldMs` (ms) | 1381.0 | 1382.0 | 1587.0 | **1450.0** | 118.6 | 8.18 | `variable` |
| `dx.perApp.product.warmMs` (ms) | 838.0 | 838.0 | 839.0 | **838.3** | 0.577 | 0.07 | `deterministic` |
| `dx.perApp.storefront.coldMs` (ms) | 1149.0 | 1143.0 | 1136.0 | **1142.7** | 6.51 | 0.57 | `stable` |
| `dx.perApp.storefront.warmMs` (ms) | 849.0 | 831.0 | 831.0 | **837.0** | 10.39 | 1.24 | `stable` |
| `dx.startupMs` (ms) | 3358.0 | 3359.0 | 3363.0 | **3360.0** | 2.65 | 0.08 | `deterministic` |
| `dx.testMs` (ms) | 5379.0 | 5614.0 | 5324.0 | **5439.0** | 154.0 | 2.83 | `stable` |
| `dx.typecheckMs` (ms) | 8219.0 | 8660.0 | 7667.0 | **8182.0** | 497.5 | 6.08 | `variable` |
| `dx.unblockedMs` (ms) | 11079.0 | 11036.0 | 11304.0 | **11139.7** | 143.9 | 1.29 | `stable` |
| `dx.warmBuildMs` (ms) | 5033.0 | 5054.0 | 5050.0 | **5045.7** | 11.15 | 0.22 | `deterministic` |

</details>

**rspack-react vs rspack-svelte**

| metric | rspack-react mean | rspack-svelte mean | change | resolvable? |
|---|---:|---:|---:|---|
| `dx.cacheSaving` | 0.082 | 0.351 | +328.5% | yes — rspack-svelte better |
| `dx.coldBuildMs` | 14451.7 | 7779.7 | -46.2% | yes — rspack-svelte better |
| `dx.editToBrowserMs` | 7269.7 | 5375.3 | -26.1% | yes — rspack-svelte better |
| `dx.incrementalMs` | 2904.3 | 910.7 | -68.6% | yes — rspack-svelte better |
| `dx.lintMs` | 9949.3 | 10113.7 | +1.7% | no — within noise |
| `dx.perApp.cart.coldMs` | 3050.0 | 1373.3 | -55.0% | yes — rspack-svelte better |
| `dx.perApp.cart.warmMs` | 2765.3 | 846.7 | -69.4% | yes — rspack-svelte better |
| `dx.perApp.chrome.coldMs` | 2975.3 | 1274.7 | -57.2% | yes — rspack-svelte better |
| `dx.perApp.chrome.warmMs` | 2756.0 | 843.3 | -69.4% | yes — rspack-svelte better |
| `dx.perApp.faq.coldMs` | 2854.3 | 1218.3 | -57.3% | yes — rspack-svelte better |
| `dx.perApp.faq.warmMs` | 2745.0 | 838.3 | -69.5% | yes — rspack-svelte better |
| `dx.perApp.my-account.coldMs` | 1180.0 | 1320.7 | +11.9% | yes — rspack-react better |
| `dx.perApp.my-account.warmMs` | 1079.0 | 841.0 | -22.1% | yes — rspack-svelte better |
| `dx.perApp.product.coldMs` | 3217.3 | 1450.0 | -54.9% | yes — rspack-svelte better |
| `dx.perApp.product.warmMs` | 2825.7 | 838.3 | -70.3% | yes — rspack-svelte better |
| `dx.perApp.storefront.coldMs` | 1176.0 | 1142.7 | -2.8% | yes — rspack-svelte better |
| `dx.perApp.storefront.warmMs` | 1094.0 | 837.0 | -23.5% | yes — rspack-svelte better |
| `dx.startupMs` | 3377.7 | 3360.0 | -0.5% | no — within noise |
| `dx.testMs` | 5303.7 | 5439.0 | +2.6% | no — within noise |
| `dx.typecheckMs` | 7849.7 | 8182.0 | +4.2% | no — within noise |
| `dx.unblockedMs` | 17829.7 | 11139.7 | -37.5% | yes — rspack-svelte better |
| `dx.warmBuildMs` | 13265.7 | 5045.7 | -62.0% | yes — rspack-svelte better |

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

