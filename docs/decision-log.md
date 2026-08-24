# Decision log

Append-only. Each entry: what was decided, why, and what would reverse it.

---

### D1 — Bundlers: Rspack + Vite. Webpack dropped.
**2026-08-21**

Webpack uses the identical `@module-federation/enhanced` API as Rspack, builds 5–10× slower, and adds
nothing except `@module-federation/nextjs-mf` for the Next.js Pages Router. A third lane costs real
implementation and maintenance time for no new information.

**Reverses if:** Next.js becomes a target stack.

---

### D2 — Remotes export route descriptors, not routers.
**2026-08-21**

Bridge (`createBridgeComponent` / `createRemoteAppComponent`) is CSR-only; a server-rendered host
emits a placeholder. The SSR contract is PR #4869, open since 2026-07-03. Route descriptors keep one
router in the shell, so SSR, streaming and hydration all work, while a remote still owns its entire
URL subtree — which is the actual ownership requirement.

**Reverses if:** #4869 merges and app-level SSR measures acceptably. Re-check before Phase 4.

---

### D3 — Remotes resolved at runtime via a registry, not a build-time `remotes` block.
**2026-08-21**

A `remotes` block baked into the shell's build makes every change to the remote list a shell deploy —
exactly the coupling the project exists to remove. A runtime registry delivers all four independence
levels: deploy an existing page, add routes inside a subtree, add a brand-new repo live, and
canary/roll back one page.

**Cost accepted:** the registry is on the SSR critical path (must cache and fail open), and version
skew becomes structural (must pin resolved versions into the HTML).

---

### D4 — pnpm catalog is the only place versions are declared.
**2026-08-21**

Every app references deps as `"catalog:"`. Unequal transitive dependency versions between two apps
would make the byte comparison between them meaningless, and the trustworthiness of that comparison
is the entire value of this repo. Enforced by the package manager rather than by review.

This is also why a monorepo is used to model "one repo per team". Real repo splits come after a stack
is chosen; splitting later is `git filter-repo`, not a refactor.

---

### D5 — TypeScript 5.9.3, not 7.0.2.
**2026-08-21**

TS 7 is the native rewrite. `@module-federation/dts-plugin` declares support for it, but the wider
plugin ecosystem we depend on does not have the same mileage. 5.9.3 is what MF's own example suite
uses. Tooling stability beats language features in a measurement repo.

---

### D6 — Vite 8.1.0 / `@vitejs/plugin-react` 5.1.4, not npm latest.
**2026-08-21**

These are the versions `@module-federation/vite`'s own example suite is tested against. Latest is
8.2.2 / 6.1.0. The plugin ships ~1.5 releases a week and currently has an open cold-start regression
(#1104), so "tested against" is worth more than "newest".

---

### D7 — Shared-dependency policy is measured, not chosen.
**2026-08-21**

Strict singleton, range-with-fallback, and full isolation each trade bytes against deployment
coupling. The trade depends on numbers we do not have yet. Phase 2 sweeps all three and prices them.
Picking one now by argument would be guessing with extra steps.

---

### D8 — `home` stays shell-native.
**2026-08-21**

It is the experimental control. The difference between the shell-native `/` and the federated `/faq`,
with content held equivalent, is the only honest measurement of what federation itself costs.

---

### D9 — Official `mf` skill vendored, after review.
**2026-08-21**

`npx skills add module-federation/agent-skills --skill mf` installs to `.agents/skills/mf`, symlinked
into `.claude/skills/`. The installer reported a Socket alert and a Snyk "Med Risk".

Reviewed before adoption: 3,495 lines across 12 scripts. External hosts referenced are only
`localhost`/`127.0.0.1` (Chrome DevTools Protocol), `module-federation.io` (docs), and `unpkg.com`
plus `example.com` inside documentation examples. No `eval`, no `new Function`, no exfiltration. The
risk rating is the `child_process.spawn` of Chrome with a remote-debugging port and custom user-data
dir — inherent to a browser-debugging skill, and only triggered by the `observability` sub-command.

**Accepted.** Re-review on upgrade; it is committed to the repo so upgrades are diffable.

---

### D10 — Phase 1 proceeds on plain Rsbuild. No Modern.js fallback.
**2026-08-21**

The Phase 1 spike (`docs/spike-rspack-ssr.md`, code in `spike/rspack-ssr/`) proved a plain Rsbuild
app plus a custom Hono server can server-render a federated remote and hydrate it with zero console
errors and zero mismatch warnings. The risk flagged in the plan is retired.

Six non-obvious traps were found and are documented in the spike write-up. Three become repo rules:

1. An app with a Node MF build **must not** declare `"type": "module"` — MF emits CommonJS and Node
   would misparse it, silently yielding empty exports.
2. `requiredVersion` **must** be explicit in every `shared` entry — MF infers it from `package.json`,
   which under a pnpm catalog reads `"catalog:"` and fails every semver match.
3. `assetPrefix` on a node build is for **remotes only**. On the host it makes the async-node chunk
   loader fetch its own local chunks over HTTP.

Also: the entry module needs a real async boundary. `experiments.asyncStartup: true` was **not**
sufficient — it converted a clear `RUNTIME-006` into an opaque
`__webpack_modules__[moduleId] is not a function`.

**Reverses if:** a later Rsbuild or MF release changes the node output contract. Re-run the spike on
every MF or Rsbuild bump; it is fast and it is the canary.

---

### D11 — MPA is the target. SPA is a rejected reference lane.
**2026-08-23**

The SPA was never the goal; it exists only because measuring it produced the evidence for
this decision. Every page is owned and deployed by one team, `/faq*` included, and a single
client router puts every remote's container on the critical path of every page — which is
the coupling the project exists to remove, reappearing at the asset layer.

Kept in-tree as the rejected alternative, not as a co-equal variant.

---

### D12 — SSR/CSR split is decided by purpose, not by convenience.
**2026-08-23**

The rule, in priority order:

1. **Anything that must reach SEO, GEO/AEO, or Core Web Vitals is server-rendered.**
   Page content, chrome, copy, links. Identical for every visitor, therefore
   shared-cacheable at a CDN.
2. **Anything personalized is client-rendered only.** The cart is per-user, useless to a
   crawler, and putting it in the HTML would make every response user-specific and
   destroy shared caching. Its state is recreated on the client from a cookie (or query
   params) — never held as client-owned state that could be lost.
3. **Every personalized region gets a server-rendered placeholder** that reserves its
   exact box, so mounting the live component costs zero CLS.

This reverses an earlier mistake. Cart state was briefly moved server-side (read from the
cookie during SSR) because it made the badge correct in the initial HTML. That was wrong:
it made every response user-specific, put personalization on the TTFB path, and gave a
crawler data it has no use for. Verified now by assertion — two visitors with different
carts receive **byte-identical** HTML.

Consequences, measured:
- Page content is never hydrated, so its component JS is never even preloaded — only its
  CSS, which the server-rendered markup needs.
- The 200-row product table is inert markup; Add works by delegated listener, so making it
  interactive costs no framework reconciliation.
- `createRoot`, not `hydrateRoot`, for personalized regions: the server deliberately
  rendered something different, so claiming a hydration match would be a lie.

**Open cost:** the cart sits in the header, so it sets the JS floor for EVERY page —
currently ~131 kB gzip, of which react-dom is 56 kB at 22.5% executed, to render a badge
whose own code is 1.3 kB. See docs/constraints.md §9.

### D13 — Interactivity is a behaviour attached to server markup, not hydration of it.

Triggered by a real report: ticking a filter did nothing. The panel had 24 facets and an
Apply button below all of them, so applying a filter meant scrolling past everything you
had just clicked.

The obvious fix — hydrate the filter panel — would have pulled React onto a page that ships
4.5 kB of JavaScript, to make a `<form>` submit itself. So the enhancement layer was built
instead: `defineBehavior` in `@mf-eval/behaviors`, a module bound to a server-rendered
subtree, no props, nothing serialized into the HTML. The filter enhancement costs **0.5 kB
gzip** and is downloaded only on pages whose markup asks for it.

Four things this decision fixes or forces:

1. **`interaction` must hold the event that triggered it.** The first version loaded on
   first interaction and lost that interaction — the click that woke the behaviour was
   consumed by the waking. The strategy now prevents and buffers the event during the
   download and replays it after attach, including when the module fails to load, in which
   case it replays into plain server markup that still works.
2. **The behaviour must never hide its own fallback control.** Doing so collapsed the Apply
   button after paint and CLS went from 0 to 0.023 — measured, caught by the acceptance
   suite. `data-fallback-only` + `@media (scripting: enabled)` makes the decision in CSS,
   before the first paint, with the failed state bringing the control back.
3. **Client-script attribution had to become per-expose, not per-remote.** On /product the
   product remote is simultaneously a page that is never hydrated and the owner of a
   behaviour that certainly runs. A per-remote flag could not express that and silently
   dropped whichever need was recorded second.
4. **The name is the address.** `product.gallery` → `product/behaviors/gallery`, exposed by
   a build-time scan of `src/behaviors/`. No registry, no manifest, nothing to keep in sync
   — and therefore nothing to forget. A typo is caught by `mf/behavior-must-exist` rather
   than by a console message on a page that looks finished.

Islands remain for genuinely personalized state — the cart, and only the cart. That is a
reviewed decision each time, not a default (`docs/interactivity.md`).

### D14 — MPA by default, with named SPA zones. Allowed because they became measurable.

`/my-account/*` is an application: authenticated, stateful, several routes per session. Forcing it
into document navigation would rebuild expensive state on every click. Forcing the catalogue into
its model would cost every visitor a router they never use.

So: **the site is MPA, and a zone is one URL prefix owned by a SEPARATE HOST APPLICATION, inside
which navigation is client-side.** Crossing the boundary is a document load. Nothing from a zone is
loaded on any page outside it.

A host, not a prefix inside the shell. That was the first draft and it was wrong: it would have tied
the account team's release to the storefront's, which is the coupling this architecture exists to
remove. `/my-account` is its own application, with its own server, its own API, its own bundle and
its own deploy, reached through an edge that routes by prefix. One origin, so one cookie — a cart
filled on a product page is still there in the account area, verified rather than assumed.

The immediate consequence: **the header could no longer belong to either host.** It became its own
remote consumed by both, and because it is server-rendered and never hydrated, the second consumer
costs the browser nothing but a stylesheet. One header, one deploy, no drift — asserted by the bench,
which requires both hosts to resolve the same chrome build and render the same links in the same
order.

The reason this is allowed now and was not before is `docs/constraints.md` §14. Chrome 151
(28 July 2026) shipped the Soft Navigations API unflagged, so each route change inside a zone
produces its own LCP, CLS and INP. Client routing used to be a Core Web Vitals blind spot — a slow
zone reported its initial load and nothing else, and looked good because nothing was watching. A
zone is now a budgeted, measured choice.

Four things this forces:

1. **A zone is SSR chrome plus CSR content**, not a server-rendered dashboard. An account area is
   per-user, so server-rendering its content breaks D12 exactly the way the cart did: every response
   becomes user-specific and unshareable. The server renders the zone's chrome and correctly-sized
   skeletons; the client fills them.
2. **The edge knows only the prefix.** Nothing outside the account host enumerates its routes, so
   the team adds `/my-account/invoices` with no edge change and no storefront deploy. The trade is
   that the zone owns its own code splitting and its own budget, because nobody else can attribute
   assets they cannot see. Measured cost today: 108 kB gzip of its own JavaScript, against 3–5 kB
   for a storefront page, paid only by people who enter the account area.
3. **A route change must paint** to be measured. A `pushState` with no contentful paint produces no
   entry. If a zone route has nothing to paint, it should not be a route.
4. **Core Web Vitals in a zone are a user budget, not an SEO budget** — Google does not rank an
   authenticated page. That changes what to optimise: INP and time-to-useful-content, not LCP, whose
   element is a skeleton and whose number is therefore close to meaningless. Stated explicitly so
   nobody spends a sprint on LCP theatre.

Zones are rationed: one per genuine application, never one per team. "It feels faster" and "the team
prefers React Router" are not justifications — this repo measured the MPA route as cheaper on every
metric than the SPA equivalent it replaced.

### D15 — Third parties integrate from their own artifact. No shared contract package.

The instinct at this scale is `@company/mfe-contract`, which every integrator depends on. It is a
synchronous dependency between organisations that do not share a release train, it versions badly
across a share scope, it describes shape but never fitness, and it does not survive a vendor who
declines to adopt it.

Rejected in favour of four primitives, all verified in `docs/constraints.md` §15:

1. **The remote describes itself.** `manifest.additionalData` puts capabilities, contract version
   and requirements inside the vendor's own `mf-manifest.json` — read and checked before any vendor
   code executes.
2. **Types travel with it.** The DTS plugin publishes declarations in `metaData.types`, generated
   from the vendor's source, so they cannot drift from the implementation.
3. **The host adapts at load time.** `onLoad` rewrites a mismatched export shape and `loadEntry`
   replaces loading entirely. The adapter lives in our repo, is reviewed by us, and is deleted when
   the vendor catches up. The vendor conforms to nothing.
4. **Isolation is two mechanisms.** `createInstance()` for an isolated federation instance, share
   scopes for an isolated dependency pool, plus `createScript` for `integrity` / `nonce` / timeout.

Formalised as three trust tiers (`docs/third-party-remotes.md`): internal shares the default scope;
partner shares it under review; vendor gets its own instance, its own scope, its own React copy,
`loaded-first`, a timeout, a fallback, and a placement below the fold. Tier 3 costs a duplicate
React on purpose — it buys a vendor who cannot break your render.

Three limits recorded so nobody mistakes this for more than it is:

- **A share scope is a dependency boundary, not a security boundary.** Vendor code still has full
  DOM, cookie and network access. Untrusted code needs an iframe or a worker; federation offers
  neither.
- **Vendor remotes cannot server-render.** Bridge SSR is PR #4869, still open on 2026-08-24. So
  vendor content is client-side, which means it is never the LCP element and always gets a
  correctly-sized server-rendered placeholder.
- **Every vendor is a Core Web Vitals liability on someone else's release schedule.** The controls
  that hold are the mechanical ones: a budget enforced against their manifest in CI, a load timeout,
  a fallback module, and a registry entry that can be rolled back without a rebuild.
