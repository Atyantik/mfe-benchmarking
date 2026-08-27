# Bench run — rspack-react — 2026-08-27T10:48:28.725Z

**SPEC_VERSION 4** · catalog `c3b6a5fafb68` · commit `2c02f82`

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
| `/` | 23 | 890.15 | 9.26 | 3 | 0.00 |
| `/faq` | 13 | 81.24 | 12.94 | 4 | 0.00 |
| `/faq/contact` | 13 | 81.24 | 12.94 | 4 | 0.00 |
| `/product` | 20 | 155.74 | 13.03 | 4 | 0.00 |
| `/product/p-0001` | 35 | 254.91 | 17.00 | 6 | 0.00 |
| `/cart` | 22 | 161.90 | 12.89 | 4 | 0.00 |
| `/login` | 17 | 151.59 | — | — | 0.00 |
| `/my-account` | 32 | 214.25 | — | — | 0.00 |
| `/my-account/orders` | 17 | 144.63 | — | — | 0.00 |
| `/my-account/profile` | 17 | 143.25 | — | — | 0.00 |

## Core Web Vitals — document navigations

| route | LCP | CLS | INP | TBT | FCP | TTFB | long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 2644 | 0.000 | 8 | 0 | 1008 | 7.0 | 0 |
| `/faq` | 836 | 0.000 | 8 | 0 | 836 | 6.3 | 0 |
| `/faq/contact` | 836 | 0.000 | 8 | 0 | 836 | 2.6 | 0 |
| `/product` | 1120 | 0.000 | 8 | 0 | 1120 | 7.8 | 0 |
| `/product/p-0001` | 1008 | 0.000 | 8 | 0 | 1008 | 7.1 | 0 |
| `/cart` | 884 | 0.008 | 8 | 0 | 884 | 6.4 | 0 |

## Server cost

| route | req/s | p50 ms | p99 ms | CPU ms/req |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1639 | 4 | 6 | 0.828 |
| `/product` | 1126 | 7 | 11 | 1.135 |
| `/product/p-0001` | 1667 | 4 | 6 | 0.762 |
| `/my-account` | 3850 | 2 | 3 | 0.342 |

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
| Cold build (no dist, no cache) | 14.31 |
| Warm build (cache intact) | 13.42 |
| Bundler cache saving | 6% |
| Incremental (one app) | 2.93 |
| Stack startup | 3.37 |
| **Clean tree to a rendering page** | **17.68** |
| **Edit to browser** | **7.34** |
| Lint | 9.82 |
| Typecheck | 8.02 |
| Test | 5.08 |

Hot update: **no**. This stack has no watch mode — `pnpm dev` serves built artefacts, so every edit costs a full rebuild and restart. That is the number above, and it is the one a stack with hot updates should be compared against.

| app | cold s | warm s |
| --- | ---: | ---: |
| chrome | 2.94 | 2.78 |
| faq | 2.84 | 2.77 |
| product | 3.11 | 2.85 |
| cart | 3.04 | 2.78 |
| storefront | 1.18 | 1.13 |
| my-account | 1.20 | 1.10 |

## CSS Modules

2 module(s), 8 emitted identifier(s), 3 of which would collide under a bare `[local]-[hash]`. Page CSS coverage 81%.

## Raw reports

Every suite's own output is archived beside this file, unmodified. The headline metrics
above answer the questions we have today; the raw reports answer the ones we do not.

