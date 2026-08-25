# Bench run — rspack-react — 2026-08-25T12:46:05.826Z

**SPEC_VERSION 4** · catalog `65aa797f2a92` · commit `4091efd` *(working tree dirty)*

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
| `/` | 23 | 955.49 | 9.26 | 3 | 0.00 |
| `/faq` | 13 | 81.23 | 12.94 | 4 | 0.00 |
| `/faq/contact` | 13 | 81.23 | 12.94 | 4 | 0.00 |
| `/product` | 20 | 155.73 | 13.03 | 4 | 0.00 |
| `/product/p-0001` | 35 | 254.83 | 17.00 | 6 | 0.00 |
| `/cart` | 22 | 161.83 | 12.89 | 4 | 0.00 |
| `/login` | 17 | 151.50 | — | — | 0.00 |
| `/my-account` | 32 | 214.12 | — | — | 0.00 |
| `/my-account/orders` | 17 | 144.55 | — | — | 0.00 |
| `/my-account/profile` | 17 | 143.17 | — | — | 0.00 |

## Core Web Vitals — document navigations

| route | LCP | CLS | INP | TBT | FCP | TTFB | long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 156 | 0.000 | 8 | 0 | 156 | 5.0 | 0 |
| `/faq` | 156 | 0.000 | 8 | 0 | 156 | 5.2 | 1 |
| `/faq/contact` | 144 | 0.000 | 8 | 0 | 144 | 4.6 | 1 |
| `/product` | 168 | 0.000 | 8 | 0 | 168 | 6.4 | 1 |
| `/product/p-0001` | 172 | 0.000 | 8 | 0 | 172 | 4.9 | 1 |
| `/cart` | 124 | 0.008 | 8 | 0 | 124 | 2.9 | 1 |

## Server cost

| route | req/s | p50 ms | p99 ms | CPU ms/req |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1304 | 6 | 8 | 1.033 |
| `/product` | 938 | 8 | 12 | 1.322 |
| `/product/p-0001` | 1475 | 5 | 7 | 0.847 |
| `/my-account` | 2311 | 2 | 12 | 0.539 |

Sustained heap: **0.03 kB retained per request** (monotonic), measured after a forced collection.

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
| Cold build (no dist, no cache) | 17.20 |
| Warm build (cache intact) | 17.49 |
| Bundler cache saving | -2% |
| Incremental (one app) | 3.15 |
| Stack startup | 3.71 |
| **Clean tree to a rendering page** | **20.91** |
| **Edit to browser** | **9.34** |
| Lint | 8.71 |
| Typecheck | 4.90 |
| Test | 8.21 |

Hot update: **no**. This stack has no watch mode — `pnpm dev` serves built artefacts, so every edit costs a full rebuild and restart. That is the number above, and it is the one a stack with hot updates should be compared against.

| app | cold s | warm s |
| --- | ---: | ---: |
| chrome | 3.35 | 2.90 |
| faq | 2.96 | 3.75 |
| product | 4.06 | 3.74 |
| cart | 3.69 | 3.97 |
| storefront | 1.96 | 1.95 |
| my-account | 1.19 | 1.19 |

## CSS Modules

2 module(s), 8 emitted identifier(s), 3 of which would collide under a bare `[local]-[hash]`. Page CSS coverage 81%.

## Raw reports

Every suite's own output is archived beside this file, unmodified. The headline metrics
above answer the questions we have today; the raw reports answer the ones we do not.

