# Reference app — FROZEN SPEC

Every stack (`rspack-react`, and later `vite-react`, `*-preact`, `*-solid`, `*-svelte`,
`*-vue`) implements **exactly this**. Not "something equivalent". Exactly this.

If two stacks render a different number of DOM nodes, or fetch a different number of bytes,
the comparison between them measures the implementer's taste rather than the technology. That
makes the whole repo worthless. So this file is frozen: changing it invalidates every result
in `results/`, and any change must bump `SPEC_VERSION` and force a full re-run.

```
SPEC_VERSION = 4
```

**v4 — 2026-08-25.** The implementation outgrew the spec, and the spec is what a second stack
implements, so the drift was the single largest risk in the repo. v3 described **4 owners and
5 routes**; the application has **7 owners and 10 routes**. It did not mention the account
host, the chrome remote, the media origin, the widget composition, the login flow, or the
behaviour layer — every one of which a second stack must reproduce for its numbers to be
comparable. It also specified "no CSS framework, hand-written CSS Modules only" while the
implementation shipped Tailwind, and named exposes (`./MiniCart`, `./store`) that no longer
exist. This version describes what is actually built and measured. Results produced under v3
are void.

**v3 — 2026-08-23.** Synthetic lorem fixtures replaced with a realistic industrial catalogue
(60 products across 5 categories) and the pages rebuilt as a real site.

**Amendments** (pre-measurement only — once `results/` is non-empty these require a bump):
- *2026-08-21*: the product row's name cell is a link.

---

## Constant vs variable

| Held constant across every stack | Allowed to vary |
|---|---|
| Topology: hosts, remotes, ports, prefixes | Framework (React / Preact / Solid / Svelte / Vue) |
| Route paths and ownership split | Bundler (Rspack / Vite) |
| DOM structure and node counts | Framework-idiomatic component syntax |
| **Every `data-testid`** — see § Test-id contract | Component file organisation |
| Fixture data, byte-for-byte | |
| Navigation model per host (MPA vs SPA zone) | |
| Which regions are server-rendered vs client-only | |
| Shared dependency policy (per run) | |
| Minifier settings, compression, target | |
| Directory layout under `stacks/<stack>/` | |

No UI library. No animation library. No state library beyond `@mf-eval/contracts`.

---

## Topology

One public origin. A browser never sees anything else.

```
edge :3100                          prefix routing, no rewriting of app HTML
├── /my-account/*, /login, /logout →  my-account :3120   host, SPA zone, gated
└── /*                            →  storefront :3110   host, MPA, server-rendered

remotes, resolved at runtime from the registry — never imported at build time
    chrome   :3104   header + footer, consumed by BOTH hosts, never hydrated
    faq      :3101   support content + a widget in the account area
    product  :3102   catalogue + a widget in the account area
    cart     :3103   basket + header badge + a widget in the account area
    media    :3105   asset origin (stand-in for a DAM or image CDN)
    registry :4000   which remote version each host resolves
```

Two hosts is not decoration. It is the case the architecture exists for: a
**multi-page storefront** and a **single-page account application** in one site, at one
origin, sharing chrome — measured separately, because they are different measurements.

---

## Ownership and exposes

| Owner | Kind | Owns | Exposes |
|---|---|---|---|
| `storefront` | host | `/`, root document, error boundaries, registry client, slot rendering | — |
| `my-account` | host | `/my-account/*`, `/login`, `/logout`, session, zone router | — |
| `chrome` | component remote | header, footer, search, account link | `./Header`, `./Footer`, `./behaviors/account` |
| `faq` | route remote | `/faq/*` | `./routes`, `./AccountSupport`, `./AccountSupportPlaceholder` |
| `product` | route remote | `/product/*` | `./routes`, `./AccountRecommended`, `./AccountRecommendedPlaceholder`, `./behaviors/gallery`, `./behaviors/autosubmit` |
| `cart` | route + component remote | cart state, `/cart`, header badge, drawer | `./routes`, `./CartPage`, `./CartPagePlaceholder`, `./CartDrawer`, `./CartDrawerPlaceholder`, `./MiniCartPlaceholder`, `./AccountCart`, `./AccountCartPlaceholder`, `./behaviors/mini` |

A host never imports a remote at build time. Every resolution goes through the registry.

---

## Routes

Ten. Every one is checked by `packages/bench/src/contract.mjs`.

| Path | Host | Nav | Auth | Notes |
|---|---|---|---|---|
| `/` | storefront | document | — | hero video, categories. The CONTROL. |
| `/faq` | storefront | document | — | support centre, client-side filter |
| `/faq/contact` | storefront | document | — | contact form, works with JS disabled |
| `/product` | storefront | document | — | faceted catalogue, form-submit filters |
| `/product/p-0001` | storefront | document | — | detail, gallery, stock panel, drawer slot |
| `/cart` | storefront | document | — | fully personalized, never shared-cached |
| `/login` | my-account | document | — | any email, any password ≥ 4 chars |
| `/my-account` | my-account | zone | yes | overview, composed of **three teams' widgets** |
| `/my-account/orders` | my-account | zone | yes | order list, filters |
| `/my-account/profile` | my-account | zone | yes | profile detail |

**Navigation model decides the measurement.** A document host reports one set of Core Web
Vitals per navigation. A zone host reports one per **soft navigation** — a different
measurement that must never be averaged with the first (`docs/constraints.md` §14).

---

## Server rendering and personalization

The storefront is server-rendered and **never hydrated**. There is no client router.

| Region | Rendered | Why |
|---|---|---|
| All storefront page content | server, no hydration | nothing on it is per-visitor |
| Header, footer | server, no hydration | shared chrome, identical for everyone |
| Header cart badge | server as empty markup, filled by a **behaviour** | a real count in the HTML makes every response unshareable |
| Cart drawer, cart page | server placeholder, client island | genuinely stateful |
| Account area | server shell + skeleton, client SPA | gated and per-visitor |
| Account widgets | server placeholder, client module per widget | three separate owners |

**A storefront document must be byte-identical for a signed-out and a signed-in visitor.**
Personalization that de-caches the whole site is the failure this constraint exists to
prevent, and `verify.mjs` asserts it on every run.

The SSR layer is session-aware: it reads the session from the HTTP request, and the account
application receives the same session on the client without a second round trip.

---

## Interactivity — two tiers

**Tier 1, the default: a behaviour.** A vanilla module bound to server-rendered markup.
No props, no serialized payload, no framework. State that must survive lives in the DOM, a
cookie, or the URL.

```html
<div data-behavior="product.gallery" data-behavior-when="visible"> … </div>
```

Strategies: `immediate` | `idle` | `visible` | `interaction` | `media:(query)`. Default `idle`.
A behaviour is loaded only on pages whose server HTML declares it, from its owning remote.

Four exist, and every stack implements exactly these four:

| Behaviour | Owner | Strategy | Does |
|---|---|---|---|
| `chrome.account` | chrome | idle | account link label |
| `cart.mini` | cart | immediate | header badge count and total, owns add-to-cart |
| `product.gallery` | product | visible | thumbnail switching, keyboard |
| `product.autosubmit` | product | idle | facet ticking submits the form |

**Tier 2, the exception: an island.** A framework component mounted into a reserved
server-rendered placeholder. Only for genuinely personalized stateful UI — the cart drawer,
the cart page, the account SPA. Every island is a reviewed decision.

Every feature must work with JavaScript disabled. `behaviors.mjs` §9 asserts it per route.

---

## Widget composition

`/my-account` is the three-team test. Its overview is assembled from widgets owned by
**faq**, **product** and **cart**, and the account host imports none of them:

```
account overview
├── widget-account-cart          owned by cart
├── widget-account-recommended   owned by product
└── widget-account-support       owned by faq
```

Each renders a server-side placeholder of its final size, then loads only its own module.
The point being measured is **per-area cost**: a page must not download everything from
everywhere to fill three boxes. `widgets.mjs` reports bytes per widget.

---

## Test-id contract

Every `data-testid` in this application is named in `packages/contracts/src/testids.ts`.
This is the mechanism that lets one acceptance suite run against every stack, so it is part of
the frozen spec rather than a convention.

- Fixed ids are constants; parametric ids are **built by the exported functions**, never
  concatenated at the call site.
- Values interpolated into an id are slugified by those functions. An id is always a safe
  selector fragment: lower-case, no spaces, no quoting required.
- `contract.mjs` asserts three things: every named id is present where the contract says,
  **every id the site emits is named by the contract**, and every unconditional name is
  emitted somewhere. Inventing a name fails the build.

A stack that satisfies the contract is testable by every existing suite on day one.

---

## Styling

Three layers, and the split is deliberate. v3's "hand-written CSS Modules only" was never
implemented and is withdrawn.

| Layer | What | Isolation mechanism |
|---|---|---|
| Design system | tokens, primitives, patterns (`@mf-eval/design`) | one definition, shared by all |
| Utilities | Tailwind, per app | PostCSS rewrite to `[data-owner="<app>"]` |
| Component CSS | CSS Modules, Sass allowed | hashed identifiers |

**`localIdentName` MUST begin with the application's own name**:

```
<app>-[local]-[hash:base64:4]
```

This is not a style preference. Two apps that choose the same file name and the same class
name hash to the **same** four characters — verified, not theoretical — so under a bare
`[local]-[hash]` two teams silently emit the same class and load order decides the winner.
The app name makes collision impossible by construction. `css.mjs` §2 asserts it.

CSS Modules are exempt from the `[data-owner]` rewrite: their identifiers are already unique,
and applying both would mask a failure in either.

**A component's CSS must be delivered only on routes that render it.** A component that
imports its app's shared utility bundle drags that whole bundle onto every route the component
appears on. `css.mjs` §8 fails the build when a route fetches a stylesheet it uses less than
5% of.

CSS bytes are reported separately from JS bytes.

---

## Shared dependency policy

Baseline, held constant unless a sweep says otherwise:

```ts
react:      { singleton: true, requiredVersion: '19.2.8' }   // literal, never "catalog:"
react-dom:  { singleton: true, requiredVersion: '19.2.8' }
@mf-eval/*: { singleton: true, requiredVersion: false }
```

`requiredVersion` must be a **literal**. MF infers it from `package.json`, which under a pnpm
catalog reads `"catalog:"` and fails every semver match (`docs/constraints.md`).

Swept axes, one at a time from this baseline — `packages/bench` defines the cell list:

| Axis | Values |
|---|---|
| policy | `singleton` / `range` / `isolated` |
| `externalRuntime` | on / off — the single biggest MF-runtime lever |
| `MF_OPTIMIZE` | off / on |
| `MF_ESM` | off / on |

---

## Fixtures and media

- **60 products**, 5 categories, real ranges, specs, documents, availability, lead times.
- **18 orders** for the account area.
- Fixture data is byte-identical across stacks. Changing it is a `SPEC_VERSION` bump.
- Media is **real**: 17 CC-licensed photographs and one hero video, built to the profile in
  `docs/media.md`, served from the media origin. Fixtures are fetched from a pinned GitHub
  release, not live from Wikimedia — CI IPs are rate-limited.

---

## Build settings held constant

| Setting | Value |
|---|---|
| Mode | `production` |
| Target | `es2022` |
| Minify | bundler default, unmodified |
| Source maps | off for measured builds |
| Compression | raw / `gzip -9` / `brotli -q 11`, applied by the bench |
| `chunkFilename` | `[id]-[contenthash].js` — required for `revalidate()` hash-diffing |
| Node build | `dist/node`, web build `dist/web` — the bench reads both by path |

Chunking strategy is **not** held constant, because it cannot be: the Vite plugin ignores
`manualChunks` and owns its chunk graph. Report the difference; do not fight it.

---

## Directory layout

Part of the spec, because the measurement code resolves paths from it. Every stack uses the
same directory names so that `MF_STACK=<name>` is the only thing that changes:

```
stacks/<stack>/shell/         the storefront host   (budget key: shell)
stacks/<stack>/my-account/    the account host
stacks/<stack>/chrome/
stacks/<stack>/faq/
stacks/<stack>/product/
stacks/<stack>/cart/
```

Each app builds to `dist/web` and `dist/node`, publishes `mf-manifest.json`, and commits a
`budget.json`. See `docs/porting-a-stack.md`.
