# Bench run — rspack-svelte — 2026-08-27T11:18:12.539Z

**SPEC_VERSION 4** · catalog `c3b6a5fafb68` · commit `61ac3d1`

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
| `/` | 23 | 889.43 | 9.26 | 3 | 0.00 |
| `/faq` | 13 | 80.52 | 12.94 | 4 | 0.00 |
| `/faq/contact` | 13 | 80.52 | 12.94 | 4 | 0.00 |
| `/product` | 20 | 154.81 | 13.03 | 4 | 0.00 |
| `/product/p-0001` | 32 | 218.63 | 17.00 | 6 | 0.00 |
| `/cart` | 19 | 126.13 | 12.90 | 4 | 0.00 |
| `/login` | 14 | 130.63 | — | — | 0.00 |
| `/my-account` | 32 | 282.01 | — | — | 0.00 |
| `/my-account/orders` | 14 | 124.74 | — | — | 0.00 |
| `/my-account/profile` | 13 | 116.63 | — | — | 0.00 |

## Core Web Vitals — document navigations

| route | LCP | CLS | INP | TBT | FCP | TTFB | long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 2648 | 0.000 | 8 | 0 | 1000 | 7.0 | 0 |
| `/faq` | 820 | 0.000 | 8 | 0 | 820 | 6.9 | 0 |
| `/faq/contact` | 828 | 0.000 | 8 | 0 | 828 | 2.5 | 0 |
| `/product` | 1112 | 0.000 | 8 | 0 | 1112 | 7.6 | 0 |
| `/product/p-0001` | 1128 | 0.000 | 8 | 0 | 1128 | 2.8 | 0 |
| `/cart` | 992 | 0.008 | 8 | 0 | 992 | 6.1 | 0 |

## Server cost

| route | req/s | p50 ms | p99 ms | CPU ms/req |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1774 | 4 | 6 | 0.832 |
| `/product` | 1200 | 6 | 13 | 1.122 |
| `/product/p-0001` | 1877 | 4 | 6 | 0.744 |
| `/my-account` | 4521 | 1 | 3 | 0.321 |

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
| Cold build (no dist, no cache) | 7.83 |
| Warm build (cache intact) | 5.05 |
| Bundler cache saving | 36% |
| Incremental (one app) | 0.92 |
| Stack startup | 3.36 |
| **Clean tree to a rendering page** | **11.19** |
| **Edit to browser** | **5.39** |
| Lint | 9.73 |
| Typecheck | 7.69 |
| Test | 5.07 |

Hot update: **no**. This stack has no watch mode — `pnpm dev` serves built artefacts, so every edit costs a full rebuild and restart. That is the number above, and it is the one a stack with hot updates should be compared against.

| app | cold s | warm s |
| --- | ---: | ---: |
| chrome | 1.26 | 0.84 |
| faq | 1.23 | 0.83 |
| product | 1.50 | 0.84 |
| cart | 1.37 | 0.84 |
| storefront | 1.14 | 0.84 |
| my-account | 1.34 | 0.85 |

## CSS Modules

2 module(s), 8 emitted identifier(s), 3 of which would collide under a bare `[local]-[hash]`. Page CSS coverage 81%.

## Raw reports

Every suite's own output is archived beside this file, unmodified. The headline metrics
above answer the questions we have today; the raw reports answer the ones we do not.

