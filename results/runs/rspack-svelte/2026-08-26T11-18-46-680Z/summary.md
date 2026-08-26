# Bench run — rspack-svelte — 2026-08-26T11:18:46.680Z

**SPEC_VERSION 4** · catalog `c3b6a5fafb68` · commit `a1c9bd0` *(working tree dirty)*

366/366 checks passed across 13 reports.

> Compare only against runs with the **same SPEC_VERSION**. A different spec is a different
> application, however similar the numbers look.

## Environment

|  |  |
| --- | --- |
| Node | v24.11.1 |
| Platform | darwin-arm64 |
| CPU | Apple M4 Pro (14 cores) |
| Memory | 48 GB |
| CI | no |

## Suites

| suite | checks | report |
| --- | ---: | --- |
| a11y | — | `a11y.json` |
| auth | 40/40 | `auth.json` |
| behaviors | 117/117 | `behaviors.site.json` |
| contract | 22/22 | `contract.json` |
| css | 65/65 | `css.site.json` |
| dx | 12/12 | `dx.json` |
| hosts | 43/43 | `hosts.json` |
| leakage | — | `leakage.json` |
| media | 27/27 | `media.json` |
| ssr | 11/11 | `ssr.json` |
| vitals | 12/12 | `vitals.json` |
| waste-audit | — | `waste-audit.baseline.json` |
| widgets | 17/17 | `widgets.json` |

## Per-route weight (gzip)

| route | requests | total kB | CSS kB | sheets | leaked kB |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 23 | 954.77 | 9.26 | 3 | 0.00 |
| `/faq` | 13 | 80.51 | 12.94 | 4 | 0.00 |
| `/faq/contact` | 13 | 80.51 | 12.94 | 4 | 0.00 |
| `/product` | 20 | 154.81 | 13.03 | 4 | 0.00 |
| `/product/p-0001` | 32 | 218.61 | 17.00 | 6 | 0.00 |
| `/cart` | 19 | 126.12 | 12.90 | 4 | 0.00 |
| `/login` | 14 | 130.62 | — | — | 0.00 |
| `/my-account` | 32 | 281.99 | — | — | 0.00 |
| `/my-account/orders` | 14 | 124.73 | — | — | 0.00 |
| `/my-account/profile` | 13 | 116.62 | — | — | 0.00 |

## Core Web Vitals — document navigations

| route | LCP | CLS | INP | TBT | FCP | TTFB | long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 144 | 0.000 | 8 | 0 | 144 | 3.1 | 0 |
| `/faq` | 140 | 0.000 | 8 | 0 | 140 | 2.9 | 1 |
| `/faq/contact` | 140 | 0.000 | 8 | 0 | 140 | 3.6 | 1 |
| `/product` | 164 | 0.000 | 8 | 0 | 164 | 4.7 | 1 |
| `/product/p-0001` | 164 | 0.000 | 8 | 0 | 164 | 4.0 | 1 |
| `/cart` | 120 | 0.008 | 8 | 0 | 120 | 2.2 | 1 |

## Server cost

| route | req/s | p50 ms | p99 ms | CPU ms/req |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1753 | 4 | 6 | 0.836 |
| `/product` | 1189 | 6 | 14 | 1.130 |
| `/product/p-0001` | 1855 | 4 | 6 | 0.747 |
| `/my-account` | 4406 | 1 | 3 | 0.327 |

Sustained heap: **0.04 kB retained per request** (monotonic), measured after a forced collection.

## Behaviours (gzip bytes)

| behaviour | gzip | brotli |
| --- | ---: | ---: |
| `chrome.account` | 572 | 460 |
| `product.autosubmit` | 541 | 437 |
| `product.gallery` | 770 | 641 |
| `cart.mini` | 662 | 567 |

## Developer experience

> Wall-clock, on the CPU recorded above. Build time is the most hardware-sensitive
> number in this file — compare across stacks only on the same machine.

|  | seconds |
| --- | ---: |
| Cold build (no dist, no cache) | 8.17 |
| Warm build (cache intact) | 5.40 |
| Bundler cache saving | 34% |
| Incremental (one app) | 0.97 |
| Stack startup | 3.39 |
| **Clean tree to a rendering page** | **11.57** |
| **Edit to browser** | **5.50** |
| Lint | 9.80 |
| Typecheck | 8.31 |
| Test | 9.21 |

Hot update: **no**. This stack has no watch mode — `pnpm dev` serves built artefacts, so every edit costs a full rebuild and restart. That is the number above, and it is the one a stack with hot updates should be compared against.

| app | cold s | warm s |
| --- | ---: | ---: |
| chrome | 1.36 | 0.91 |
| faq | 1.28 | 0.89 |
| product | 1.54 | 0.90 |
| cart | 1.44 | 0.91 |
| storefront | 1.18 | 0.90 |
| my-account | 1.37 | 0.90 |

## CSS Modules

2 module(s), 8 emitted identifier(s), 3 of which would collide under a bare `[local]-[hash]`. Page CSS coverage 81%.

## Raw reports

Every suite's own output is archived beside this file, unmodified. The headline metrics
above answer the questions we have today; the raw reports answer the ones we do not.

