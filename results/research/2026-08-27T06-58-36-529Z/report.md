# Module Federation under two frameworks

**A measured comparison of the same application implemented in React and in Svelte.**

Generated 2026-08-27T06:58:36.529Z · 1 independent runs of each stack · SPEC_VERSION 4 · catalog `c3b6a5fafb68`

---

## 1. What this report is

One application — ten routes, two host applications, four federated remotes — implemented
twice against a frozen specification, and measured by the same sixteen suites. Neither
implementation is a demo written to flatter its framework: both satisfy the same DOM
structure, the same fixture data, the same test-id contract and the same accessibility
standard, and both must pass every check before any number here is recorded.

Every figure is the mean of **1 independent runs**, each a full rebuild against a
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
| Commit | `6c945ac` on `main` |
| Runs per stack | 1 |

Both stacks were measured on the same machine, from the same commit, against the same
dependency catalog, minutes apart. **Results from different SPEC_VERSIONs or different
catalog hashes describe different applications and must never be compared.**

**rspack-react** — 368/368 checks per run:

- `results/runs/rspack-react/2026-08-27T06-58-35-535Z` — 2026-08-27T06:58:35.535Z

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

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `perRoute./.cssKbGzip` (kB gzip) | 9.26 | **9.26** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.cssSheets` (count) | 3 | **3** | 0 | 0.00 | `deterministic` |
| `perRoute./.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.requests` (count) | 23 | **23** | 0 | 0.00 | `deterministic` |
| `perRoute./.totalKbGzip` (kB gzip) | 955.5 | **955.5** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssKbGzip` (kB gzip) | 12.89 | **12.89** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.cssSheets` (count) | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.requests` (count) | 22 | **22** | 0 | 0.00 | `deterministic` |
| `perRoute./cart.totalKbGzip` (kB gzip) | 161.9 | **161.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssKbGzip` (kB gzip) | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.cssSheets` (count) | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.requests` (count) | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq.totalKbGzip` (kB gzip) | 81.24 | **81.24** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssKbGzip` (kB gzip) | 12.94 | **12.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.cssSheets` (count) | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.requests` (count) | 13 | **13** | 0 | 0.00 | `deterministic` |
| `perRoute./faq/contact.totalKbGzip` (kB gzip) | 81.24 | **81.24** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.requests` (count) | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./login.totalKbGzip` (kB gzip) | 151.6 | **151.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.requests` (count) | 32 | **32** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account.totalKbGzip` (kB gzip) | 214.2 | **214.2** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.requests` (count) | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.totalKbGzip` (kB gzip) | 144.6 | **144.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.requests` (count) | 17 | **17** | 0 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.totalKbGzip` (kB gzip) | 143.2 | **143.2** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.cssKbGzip` (kB gzip) | 13.03 | **13.03** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.cssSheets` (count) | 4 | **4** | 0 | 0.00 | `deterministic` |
| `perRoute./product.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.requests` (count) | 20 | **20** | 0 | 0.00 | `deterministic` |
| `perRoute./product.totalKbGzip` (kB gzip) | 155.7 | **155.7** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.cssKbGzip` (kB gzip) | 17.00 | **17.00** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.cssSheets` (count) | 6 | **6** | 0 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.leakedKbGzip` (kB gzip) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.requests` (count) | 35 | **35** | 0 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.totalKbGzip` (kB gzip) | 254.9 | **254.9** | 0.000 | 0.00 | `deterministic` |

</details>

### 5.2 Weight by owning application

**Transfer by owning application** — Each response is attributed to the application that served it, so a page can be read as a bill of materials per team. *Instrument: Playwright response interception, attributed by origin and edge path prefix.* *Caveat: An origin nobody declared is a hard failure rather than an "other" bucket.*

<details><summary><strong>rspack-react</strong> — 40 metrics</summary>

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `perRoute./.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.media` (kB gzip) | 877.9 | **877.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.cart` (kB gzip) | 31.58 | **31.58** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.chrome` (kB gzip) | 29.44 | **29.44** | 0.000 | 0.00 | `deterministic` |
| `perRoute./cart.byOwnerKbGzip.storefront` (kB gzip) | 100.9 | **100.9** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.faq` (kB gzip) | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.faq` (kB gzip) | 3.68 | **3.68** | 0.000 | 0.00 | `deterministic` |
| `perRoute./faq/contact.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./login.byOwnerKbGzip.my-account` (kB gzip) | 114.4 | **114.4** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.cart` (kB gzip) | 21.41 | **21.41** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.faq` (kB gzip) | 24.04 | **24.04** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.media` (kB gzip) | 15.13 | **15.13** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.my-account` (kB gzip) | 123.6 | **123.6** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account.byOwnerKbGzip.product` (kB gzip) | 26.34 | **26.34** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/orders.byOwnerKbGzip.my-account` (kB gzip) | 123.7 | **123.7** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.chrome` (kB gzip) | 3.72 | **3.72** | 0.000 | 0.00 | `deterministic` |
| `perRoute./my-account/profile.byOwnerKbGzip.my-account` (kB gzip) | 122.3 | **122.3** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.cart` (kB gzip) | 17.19 | **17.19** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.media` (kB gzip) | 57.95 | **57.95** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.product` (kB gzip) | 20.23 | **20.23** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product.byOwnerKbGzip.storefront` (kB gzip) | 40.43 | **40.43** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.cart` (kB gzip) | 25.94 | **25.94** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.chrome` (kB gzip) | 19.93 | **19.93** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.media` (kB gzip) | 77.85 | **77.85** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.product` (kB gzip) | 30.30 | **30.30** | 0.000 | 0.00 | `deterministic` |
| `perRoute./product/p-0001.byOwnerKbGzip.storefront` (kB gzip) | 100.9 | **100.9** | 0.000 | 0.00 | `deterministic` |

</details>

### 5.3 Core Web Vitals

**Cumulative Layout Shift** — Unitless. Google calls under 0.1 good. *Instrument: web-vitals v6.*

**First Contentful Paint** — First paint of any content. *Instrument: web-vitals v6.*

**Interaction to Next Paint** — Requires a real interaction; the suite performs one per route rather than reporting INP for a page nobody touched. *Instrument: web-vitals v6.*

**Largest Contentful Paint** — The library Real User Monitoring actually uses, so the lab and the field cannot disagree about what counts. Median of the runs. *Instrument: web-vitals v6, injected into the page.* *Caveat: Measured at 4x CPU throttling, which raises it relative to an unthrottled desktop.*

**Total Blocking Time** — The blocking portion (over 50 ms) of every long task after First Contentful Paint, at 4x CPU throttling. *Instrument: PerformanceObserver longtask entries, Lighthouse definition.* *Caveat: Counts ONLY long tasks after FCP. A stack can hold TBT at zero and still do materially more main-thread work — see taskMs.*

**Time to First Byte** — Localhost, so this measures server render time rather than network. *Instrument: web-vitals v6.* *Caveat: Not comparable to a production TTFB; there is no network here.*

<details><summary><strong>rspack-react</strong> — 36 metrics</summary>

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `documents./.CLS` (score) | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./.FCP` (ms) | 148.0 | **148.0** | 0.000 | 0.00 | `deterministic` |
| `documents./.INP` (ms) | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./.LCP` (ms) | 148.0 | **148.0** | 0.000 | 0.00 | `deterministic` |
| `documents./.TBT` (ms) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./.TTFB` (ms) | 3.50 | **3.50** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.CLS` (score) | 0.0077 | **0.0077** | 0.0000 | 0.00 | `deterministic` |
| `documents./cart.FCP` (ms) | 124.0 | **124.0** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.INP` (ms) | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.LCP` (ms) | 124.0 | **124.0** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TBT` (ms) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.TTFB` (ms) | 2.10 | **2.10** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.CLS` (score) | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq.FCP` (ms) | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.INP` (ms) | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.LCP` (ms) | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TBT` (ms) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.TTFB` (ms) | 4.30 | **4.30** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.CLS` (score) | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./faq/contact.FCP` (ms) | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.INP` (ms) | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.LCP` (ms) | 144.0 | **144.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TBT` (ms) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.TTFB` (ms) | 2.30 | **2.30** | 0.000 | 0.00 | `deterministic` |
| `documents./product.CLS` (score) | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product.FCP` (ms) | 168.0 | **168.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product.INP` (ms) | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product.LCP` (ms) | 168.0 | **168.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TBT` (ms) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product.TTFB` (ms) | 8.80 | **8.80** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.CLS` (score) | 0.0000 | **0.0000** | 0.0000 | 0.00 | `deterministic` |
| `documents./product/p-0001.FCP` (ms) | 168.0 | **168.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.INP` (ms) | 8.00 | **8.00** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.LCP` (ms) | 168.0 | **168.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TBT` (ms) | 0.000 | **0.000** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.TTFB` (ms) | 2.70 | **2.70** | 0.000 | 0.00 | `deterministic` |

</details>

### 5.4 Browser processor and memory

**DOM nodes (all types)** — Every node: elements, text and comments. A real cost, since the browser walks them. *Instrument: CDP Performance.getMetrics — Nodes.* *Caveat: NOT a conformance metric. Svelte emits anchor comments around every block, so this reads 76% higher on a page whose element counts differ by one. Use domElements to compare structure.*

**JS heap (browser)** — What the document holds in the renderer after the navigation settles. *Instrument: CDP Performance.getMetrics — JSHeapUsedSize.*

**Layout** — Geometry calculation, at 4x throttling. *Instrument: CDP Performance.getMetrics — LayoutDuration.*

**Long tasks** — Main-thread tasks over 50 ms, at 4x throttling. *Instrument: PerformanceObserver.*

**Script execution** — Compiling and running JavaScript, at 4x throttling. *Instrument: CDP Performance.getMetrics — ScriptDuration.*

**Style recalculation** — Matching selectors and computing styles, at 4x throttling. *Instrument: CDP Performance.getMetrics — RecalcStyleDuration.*

**Main-thread busy time** — Total main-thread work for the navigation at 4x CPU throttling. The closest single number to "browser CPU". *Instrument: CDP Performance.getMetrics — TaskDuration.* *Caveat: Script, layout and style are its largest categories and do NOT sum to it: parsing, compositing, GC and event dispatch are main-thread work in none of them.*

<details><summary><strong>rspack-react</strong> — 42 metrics</summary>

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `documents./.domNodes` (count) | 743 | **743** | 0 | 0.00 | `deterministic` |
| `documents./.jsHeapMb` (MB) | 3.22 | **3.22** | 0.000 | 0.00 | `deterministic` |
| `documents./.layoutMs` (ms) | 32.91 | **32.91** | 0.000 | 0.00 | `deterministic` |
| `documents./.longTasks` (count) | 0 | **0** | 0 | 0.00 | `deterministic` |
| `documents./.scriptMs` (ms) | 45.94 | **45.94** | 0.000 | 0.00 | `deterministic` |
| `documents./.styleMs` (ms) | 44.99 | **44.99** | 0.000 | 0.00 | `deterministic` |
| `documents./.taskMs` (ms) | 357.5 | **357.5** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.domNodes` (count) | 259 | **259** | 0 | 0.00 | `deterministic` |
| `documents./cart.jsHeapMb` (MB) | 4.28 | **4.28** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.layoutMs` (ms) | 21.25 | **21.25** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.longTasks` (count) | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./cart.scriptMs` (ms) | 57.20 | **57.20** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.styleMs` (ms) | 30.55 | **30.55** | 0.000 | 0.00 | `deterministic` |
| `documents./cart.taskMs` (ms) | 341.1 | **341.1** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.domNodes` (count) | 538 | **538** | 0 | 0.00 | `deterministic` |
| `documents./faq.jsHeapMb` (MB) | 3.20 | **3.20** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.layoutMs` (ms) | 22.27 | **22.27** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.longTasks` (count) | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq.scriptMs` (ms) | 42.52 | **42.52** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.styleMs` (ms) | 34.02 | **34.02** | 0.000 | 0.00 | `deterministic` |
| `documents./faq.taskMs` (ms) | 309.0 | **309.0** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.domNodes` (count) | 388 | **388** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.jsHeapMb` (MB) | 3.31 | **3.31** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.layoutMs` (ms) | 28.18 | **28.18** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.longTasks` (count) | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./faq/contact.scriptMs` (ms) | 41.74 | **41.74** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.styleMs` (ms) | 33.95 | **33.95** | 0.000 | 0.00 | `deterministic` |
| `documents./faq/contact.taskMs` (ms) | 305.0 | **305.0** | 0.000 | 0.00 | `deterministic` |
| `documents./product.domNodes` (count) | 904 | **904** | 0 | 0.00 | `deterministic` |
| `documents./product.jsHeapMb` (MB) | 3.51 | **3.51** | 0.000 | 0.00 | `deterministic` |
| `documents./product.layoutMs` (ms) | 34.06 | **34.06** | 0.000 | 0.00 | `deterministic` |
| `documents./product.longTasks` (count) | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product.scriptMs` (ms) | 46.36 | **46.36** | 0.000 | 0.00 | `deterministic` |
| `documents./product.styleMs` (ms) | 38.07 | **38.07** | 0.000 | 0.00 | `deterministic` |
| `documents./product.taskMs` (ms) | 343.5 | **343.5** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.domNodes` (count) | 640 | **640** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.jsHeapMb` (MB) | 4.16 | **4.16** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.layoutMs` (ms) | 37.93 | **37.93** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.longTasks` (count) | 1 | **1** | 0 | 0.00 | `deterministic` |
| `documents./product/p-0001.scriptMs` (ms) | 60.46 | **60.46** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.styleMs` (ms) | 39.69 | **39.69** | 0.000 | 0.00 | `deterministic` |
| `documents./product/p-0001.taskMs` (ms) | 404.8 | **404.8** | 0.000 | 0.00 | `deterministic` |

</details>

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

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `server./.coresUsed` (cores) | 1.35 | **1.35** | 0 | 0.00 | `deterministic` |
| `server./.cpuPerRequestMs` (ms) | 0.845 | **0.845** | 0.000 | 0.00 | `deterministic` |
| `server./.cpuSystemMs` (ms) | 494.2 | **494.2** | 0.000 | 0.00 | `deterministic` |
| `server./.cpuUserMs` (ms) | 10338.7 | **10338.7** | 0.000 | 0.00 | `deterministic` |
| `server./.eventLoopUtilization` (ratio) | 0.887 | **0.887** | 0.000 | 0.00 | `deterministic` |
| `server./.gcPauseMs` (ms) | 62.49 | **62.49** | 0.000 | 0.00 | `deterministic` |
| `server./.heapUsedMb` (MB) | 40.72 | **40.72** | 0.000 | 0.00 | `deterministic` |
| `server./.p50Ms` (ms) | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./.p99Ms` (ms) | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./.rps` (req/s) | 1601.6 | **1601.6** | 0.000 | 0.00 | `deterministic` |
| `server./.rssMb` (MB) | 272.7 | **272.7** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.coresUsed` (cores) | 1.34 | **1.34** | 0 | 0.00 | `deterministic` |
| `server./my-account.cpuPerRequestMs` (ms) | 0.344 | **0.344** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.cpuSystemMs` (ms) | 967.0 | **967.0** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.cpuUserMs` (ms) | 9775.3 | **9775.3** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.eventLoopUtilization` (ratio) | 0.968 | **0.968** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.gcPauseMs` (ms) | 73.67 | **73.67** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.heapUsedMb` (MB) | 52.67 | **52.67** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.p50Ms` (ms) | 1.00 | **1.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.p99Ms` (ms) | 3.00 | **3.00** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.rps` (req/s) | 3901.0 | **3901.0** | 0.000 | 0.00 | `deterministic` |
| `server./my-account.rssMb` (MB) | 241.4 | **241.4** | 0.000 | 0.00 | `deterministic` |
| `server./product.coresUsed` (cores) | 1.25 | **1.25** | 0 | 0.00 | `deterministic` |
| `server./product.cpuPerRequestMs` (ms) | 1.15 | **1.15** | 0.000 | 0.00 | `deterministic` |
| `server./product.cpuSystemMs` (ms) | 696.6 | **696.6** | 0.000 | 0.00 | `deterministic` |
| `server./product.cpuUserMs` (ms) | 9299.6 | **9299.6** | 0.000 | 0.00 | `deterministic` |
| `server./product.eventLoopUtilization` (ratio) | 0.883 | **0.883** | 0.000 | 0.00 | `deterministic` |
| `server./product.gcPauseMs` (ms) | 143.9 | **143.9** | 0.000 | 0.00 | `deterministic` |
| `server./product.heapUsedMb` (MB) | 38.50 | **38.50** | 0.000 | 0.00 | `deterministic` |
| `server./product.p50Ms` (ms) | 7.00 | **7.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.p99Ms` (ms) | 9.00 | **9.00** | 0.000 | 0.00 | `deterministic` |
| `server./product.rps` (req/s) | 1085.4 | **1085.4** | 0.000 | 0.00 | `deterministic` |
| `server./product.rssMb` (MB) | 278.0 | **278.0** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.coresUsed` (cores) | 1.26 | **1.26** | 0 | 0.00 | `deterministic` |
| `server./product/p-0001.cpuPerRequestMs` (ms) | 0.761 | **0.761** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.cpuSystemMs` (ms) | 496.7 | **496.7** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.cpuUserMs` (ms) | 9624.6 | **9624.6** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.eventLoopUtilization` (ratio) | 0.881 | **0.881** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.gcPauseMs` (ms) | 51.22 | **51.22** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.heapUsedMb` (MB) | 81.27 | **81.27** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p50Ms` (ms) | 4.00 | **4.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.p99Ms` (ms) | 6.00 | **6.00** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.rps` (req/s) | 1660.4 | **1660.4** | 0.000 | 0.00 | `deterministic` |
| `server./product/p-0001.rssMb` (MB) | 276.4 | **276.4** | 0.000 | 0.00 | `deterministic` |
| `sustainedHeap.perRequestKb` (kB) | 0.030 | **0.030** | 0.000 | 0.00 | `deterministic` |

</details>

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

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `dx.cacheSaving` (ratio) | 0.066 | **0.066** | 0.000 | 0.00 | `deterministic` |
| `dx.coldBuildMs` (ms) | 14330.0 | **14330.0** | 0.000 | 0.00 | `deterministic` |
| `dx.editToBrowserMs` (ms) | 7297.0 | **7297.0** | 0.000 | 0.00 | `deterministic` |
| `dx.incrementalMs` (ms) | 2931.0 | **2931.0** | 0.000 | 0.00 | `deterministic` |
| `dx.lintMs` (ms) | 10127.0 | **10127.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.cart.coldMs` (ms) | 3004.0 | **3004.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.cart.warmMs` (ms) | 2820.0 | **2820.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.chrome.coldMs` (ms) | 2925.0 | **2925.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.chrome.warmMs` (ms) | 2763.0 | **2763.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.faq.coldMs` (ms) | 2849.0 | **2849.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.faq.warmMs` (ms) | 2754.0 | **2754.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.my-account.coldMs` (ms) | 1177.0 | **1177.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.my-account.warmMs` (ms) | 1078.0 | **1078.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.product.coldMs` (ms) | 3216.0 | **3216.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.product.warmMs` (ms) | 2855.0 | **2855.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.storefront.coldMs` (ms) | 1160.0 | **1160.0** | 0.000 | 0.00 | `deterministic` |
| `dx.perApp.storefront.warmMs` (ms) | 1112.0 | **1112.0** | 0.000 | 0.00 | `deterministic` |
| `dx.startupMs` (ms) | 3408.0 | **3408.0** | 0.000 | 0.00 | `deterministic` |
| `dx.testMs` (ms) | 5471.0 | **5471.0** | 0.000 | 0.00 | `deterministic` |
| `dx.typecheckMs` (ms) | 8179.0 | **8179.0** | 0.000 | 0.00 | `deterministic` |
| `dx.unblockedMs` (ms) | 17738.0 | **17738.0** | 0.000 | 0.00 | `deterministic` |
| `dx.warmBuildMs` (ms) | 13381.0 | **13381.0** | 0.000 | 0.00 | `deterministic` |

</details>

### 5.8 Composition and styling

**Behaviour size** — A behaviour is vanilla TypeScript attached to server-rendered markup; no framework is involved in either stack. *Instrument: Built chunk, gzip level 9.*

**CSS coverage** — Fraction of downloaded CSS the page actually applies. *Instrument: CDP CSS coverage.*

**CSS Modules** — Emitted identifiers and the collisions a bare [local]-[hash] would have produced. *Instrument: Static analysis of built stylesheets.*

<details><summary><strong>rspack-react</strong> — 12 metrics</summary>

| metric | run 1 | mean | sd | cv% | class |
|---|---:|---:|---:|---:|---|
| `behaviors.cart.mini.brotli` (bytes) | 567 | **567** | 0 | 0.00 | `deterministic` |
| `behaviors.cart.mini.gzip` (bytes) | 662 | **662** | 0 | 0.00 | `deterministic` |
| `behaviors.chrome.account.brotli` (bytes) | 460 | **460** | 0 | 0.00 | `deterministic` |
| `behaviors.chrome.account.gzip` (bytes) | 572 | **572** | 0 | 0.00 | `deterministic` |
| `behaviors.product.autosubmit.brotli` (bytes) | 437 | **437** | 0 | 0.00 | `deterministic` |
| `behaviors.product.autosubmit.gzip` (bytes) | 541 | **541** | 0 | 0.00 | `deterministic` |
| `behaviors.product.gallery.brotli` (bytes) | 641 | **641** | 0 | 0.00 | `deterministic` |
| `behaviors.product.gallery.gzip` (bytes) | 770 | **770** | 0 | 0.00 | `deterministic` |
| `cssModules.coverageRatio` (ratio) | 0.814 | **0.814** | 0.000 | 0.00 | `deterministic` |
| `cssModules.identifiers` (count) | 8 | **8** | 0 | 0.00 | `deterministic` |
| `cssModules.modules` (count) | 2 | **2** | 0 | 0.00 | `deterministic` |
| `cssModules.wouldHaveCollided` (count) | 3 | **3** | 0 | 0.00 | `deterministic` |

</details>

## 6. Threats to validity

Stated plainly, because a report that hides its limits is marketing.

- **Sample size.** 1 runs. Standard deviations from three samples are coarse, and
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
MF_RUNS=1 pnpm research      # every stack, every suite, 1 times, then this report
```

The raw suite reports for every run are archived beside this file, unmodified. The headline
metrics above answer the questions this report was written to answer; the raw reports answer
the ones it was not.

