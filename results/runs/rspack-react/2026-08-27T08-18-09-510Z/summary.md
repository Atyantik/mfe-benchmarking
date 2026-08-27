# Bench run — rspack-react — 2026-08-27T08:18:09.510Z

**SPEC_VERSION 4** · catalog `c3b6a5fafb68` · commit `3e3abe6`

368/368 checks passed across 13 reports.

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
| vitals | 14/14 | `vitals.json` |
| waste-audit | — | `waste-audit.baseline.json` |
| widgets | 17/17 | `widgets.json` |

## Per-route weight (gzip)

| route | requests | total kB | CSS kB | sheets | leaked kB |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 23 | 955.49 | 9.26 | 3 | 0.00 |
| `/faq` | 13 | 81.24 | 12.94 | 4 | 0.00 |
| `/faq/contact` | 13 | 81.24 | 12.94 | 4 | 0.00 |
| `/product` | 20 | 155.74 | 13.03 | 4 | 0.00 |
| `/product/p-0001` | 35 | 254.89 | 17.00 | 6 | 0.00 |
| `/cart` | 22 | 161.89 | 12.89 | 4 | 0.00 |
| `/login` | 17 | 151.57 | — | — | 0.00 |
| `/my-account` | 32 | 214.23 | — | — | 0.00 |
| `/my-account/orders` | 17 | 144.61 | — | — | 0.00 |
| `/my-account/profile` | 17 | 143.23 | — | — | 0.00 |

## Core Web Vitals — document navigations

| route | LCP | CLS | INP | TBT | FCP | TTFB | long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 144 | 0.000 | 8 | 0 | 144 | 2.6 | 0 |
| `/faq` | 140 | 0.000 | 8 | 0 | 140 | 2.3 | 1 |
| `/faq/contact` | 140 | 0.000 | 8 | 0 | 140 | 2.2 | 1 |
| `/product` | 160 | 0.000 | 8 | 0 | 160 | 5.1 | 1 |
| `/product/p-0001` | 164 | 0.000 | 8 | 0 | 164 | 4.3 | 1 |
| `/cart` | 124 | 0.008 | 8 | 0 | 124 | 2.4 | 1 |

## Server cost

| route | req/s | p50 ms | p99 ms | CPU ms/req |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1647 | 4 | 6 | 0.834 |
| `/product` | 1096 | 7 | 9 | 1.132 |
| `/product/p-0001` | 1708 | 4 | 6 | 0.754 |
| `/my-account` | 3925 | 1 | 4 | 0.337 |

Sustained heap: **0.06 kB retained per request** (monotonic), measured after a forced collection.

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
| Cold build (no dist, no cache) | 14.43 |
| Warm build (cache intact) | 13.23 |
| Bundler cache saving | 8% |
| Incremental (one app) | 2.90 |
| Stack startup | 3.37 |
| **Clean tree to a rendering page** | **17.80** |
| **Edit to browser** | **7.23** |
| Lint | 10.03 |
| Typecheck | 8.14 |
| Test | 5.39 |

Hot update: **no**. This stack has no watch mode — `pnpm dev` serves built artefacts, so every edit costs a full rebuild and restart. That is the number above, and it is the one a stack with hot updates should be compared against.

| app | cold s | warm s |
| --- | ---: | ---: |
| chrome | 3.06 | 2.74 |
| faq | 2.87 | 2.71 |
| product | 3.18 | 2.82 |
| cart | 2.99 | 2.76 |
| storefront | 1.16 | 1.12 |
| my-account | 1.17 | 1.08 |

## CSS Modules

2 module(s), 8 emitted identifier(s), 3 of which would collide under a bare `[local]-[hash]`. Page CSS coverage 81%.

## Raw reports

Every suite's own output is archived beside this file, unmodified. The headline metrics
above answer the questions we have today; the raw reports answer the ones we do not.

