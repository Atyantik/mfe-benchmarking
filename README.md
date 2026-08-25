# mfe-benchmarking

An experimental harness for measuring micro-frontend architectures — footprint, Core Web
Vitals, isolation, accessibility and developer experience — under conditions that resemble a
real enterprise site rather than a demo.

It exists because most micro-frontend material is architecture diagrams and claims. This
repo runs a real site, measures it, and **fails the build when a claim stops being true**.

> **Status: experimental.** One stack is implemented (Rspack + React). The comparison axis —
> Vite, Preact, Solid — is the point of the repo and is not built yet. Findings below are
> reproducible today; treat them as a baseline, not a verdict.

## The question

Can a site be split so that each area is owned and deployed by a different team — with **no
team blocked on another's deploy** — while the visitor still gets server rendering, a fast
first paint, and the smallest JavaScript payload the architecture allows?

And separately: what does that cost, exactly, in bytes and milliseconds?

## What is built

Two independent host applications behind one edge, plus four federated remotes:

```
edge :3100                       one origin, prefix routing
├── /my-account/*, /login   →  my-account host :3120   SPA, own documents, own API, gated
└── /*                      →  storefront host :3110   MPA, server-rendered documents

remotes, resolved from a runtime registry
    chrome  :3104   header and footer — consumed by BOTH hosts, never hydrated
    faq     :3101   support content + a widget in the account area
    product :3102   catalogue + a widget in the account area
    cart    :3103   basket + header widget + a widget in the account area
    media   :3105   asset origin (stand-in for a DAM or image CDN)
```

The storefront is a multi-page app: server-rendered, never hydrated, no client router. The
account area is a single-page app behind a login. **Both models in one site, measured
separately**, because they are different measurements.

Its account overview is composed from three widgets owned by three different applications,
and the account host imports none of them.

## Findings so far

Every number here is produced by `pnpm bench` and re-checked on every run.

**Module Federation's runtime is the dominant cost for light frameworks.** `runtime-core` is
17.1 kB gzip — 3.3× all of Preact, roughly equal to all of Svelte or Solid.

**A remote costs ~15 kB gzip to participate in a page, before any of its own code.** Three
teams contributing widgets to one page cost 45 kB of container to deliver 1.6 kB of widget.
That is the scaling law to design around, not a misconfiguration.

**On a page that needs no interactivity, the JS floor is zero.** Content pages ship no
route-content script at all — not deferred, absent.

**Client interactivity does not require hydration.** A behaviour attached to server-rendered
markup costs 0.5 kB gzip and 0.1 ms to attach; 99% of the wall-clock cost of the first one on
a page is Module Federation initialising the container it lives in.

**Signing in need not de-cache the site.** Account documents are private; storefront
documents stay byte-identical and shared-cacheable for signed-in visitors.

**Style isolation survives two teams writing the same CSS — but not by the mechanism you would
assume.** Two applications ship `panel.module.scss` declaring `.panel`, `.label` and `.value`,
and both render on one page without touching each other. The hashes, though, are *identical*:
`.cart-panel-V0TX` and `.product-panel-V0TX`. Under the default `[local]-[hash]` both teams
would have emitted the same class and load order would have decided the winner. The app name
in `localIdentName` is the whole mechanism — see `docs/css.md`.

**A component's stylesheet should travel with the component.** The header cart badge imported
its app's shared utility bundle — the convention every component in that app followed — which
put 19.9 kB of cart CSS on every page of the site, measuring **0% used** on `/faq`. Per-app
byte budgets did not catch it: they measure what an app builds, not what a page fetches.
Making the badge self-contained took `/` from 29.1 to 9.24 kB gzip of CSS.

**A spec drifts faster than code, and it is the spec a second implementation reads.** The
frozen spec described 4 owners and 5 routes; the application had grown to 7 and 10, with no
mention of the account host, the widget composition or the behaviour layer — and it still
specified a styling approach that was never implemented. Nothing failed, because nothing
checks a document. It is rewritten at `SPEC_VERSION = 4`.

**Measurement finds what review does not.** An accessibility audit found a colour token that
passed contrast on the background a person would check by hand and failed on the two they
would not — on all ten routes, since the palette was written.

## Running it

Requires Node 24, pnpm, and `ffmpeg`/`cwebp`/`avifenc` for the media pipeline.

```bash
pnpm install
pnpm media          # fetch + derive the image and video fixtures (once, needs network)
pnpm build
pnpm dev            # start the whole stack
open http://localhost:3100

pnpm check          # lint → typecheck → test → build → budget
pnpm bench          # 16 suites, ~366 checks, against the running stack

MF_STACK=<name> pnpm bench   # the same suites against a different implementation
```

Sign in with any email and any password of four characters or more.

## What the bench measures

| suite | question |
|---|---|
| `budget` | does the build output fit the per-app budgets? |
| `hosts` | two applications, one origin: routing, cookie continuity, shared chrome, zone boundaries |
| `verify` | SSR, the no-JS path, personalization, byte-identical HTML for two visitors |
| `independence` | registry-driven deploy, canary by cohort, a dead remote degrading one region |
| `contamination` | does any page fetch another team's code? |
| `contract` | does every route emit the shared test ids, so suites port to another stack? |
| `auth` | the login journey, and what personalization costs the cache |
| `widgets` | three teams on one page, and per-area download cost |
| `css` | identical class names from two teams on one page, and CSS delivered only where it renders |
| `media` | real photographs and video: weight, formats, dimensions, priority |
| `behaviors` | client interactivity: size, timing, coverage, teardown, loading strategies |
| `vitals` | Core Web Vitals, per document navigation and per soft navigation |
| `a11y` | axe-core, WCAG 2.1 A and AA, every route |
| `dx` | build, startup and edit-to-browser time — what it costs an engineer |

Core Web Vitals are measured with `web-vitals` itself, injected into the page, so the lab and
the field cannot disagree about what counts.

## Recorded runs

`results/*.json` is working output and is gitignored — every run overwrites it. A **complete,
green** run is archived instead, and committed:

```
results/runs/<stack>/<timestamp>/
    manifest.json    provenance + per-suite verdicts + headline metrics
    summary.md       the same, readable
    <suite>.json     every raw report, unmodified
results/runs/<stack>/latest.json     pointer to the newest run
```

Each record carries `SPEC_VERSION`, the catalog hash, the git commit, and the CPU it was taken
on. **Never compare across `SPEC_VERSION`** — a different spec is a different application,
however similar the numbers look. Build times are the most hardware-sensitive figures in the
record and are only comparable on the same machine.

A partial or failing run is deliberately not archived: a baseline is a run that passed.

## Layout

```
docs/constraints.md         verified Module Federation facts, with dates and sources
docs/decision-log.md        what was decided, why, and what would reverse it
docs/media.md               the media profile the fixtures are built to
docs/interactivity.md       behaviours vs islands, and when each applies
docs/css.md                 two teams writing the same CSS, and why it does not collide
docs/navigation-zones.md    MPA and SPA in one site
docs/third-party-remotes.md integrating a vendor without a shared contract package
docs/app-authors-guide.md   the only document a new app author must read
docs/porting-a-stack.md     the checklist for implementing stack #2
spec/reference-app.md       the frozen spec every stack implements

packages/contracts          route descriptors, cart store, fixtures, test-id contract
packages/design             tokens, primitives, patterns, media components
packages/media              asset pipeline and origin
packages/behaviors          client interactivity runtime
packages/zone-router        client routing inside one host's URL prefix
packages/registry           runtime remote registry
packages/shell-kit          host infrastructure shared by every host
packages/bench              the measurement suites
packages/eslint-plugin-mf   the traps, encoded as lint rules

stacks/rspack-react/        the implemented stack
```

## Conventions worth knowing before reading the code

- **Every trap that can be a lint rule is one.** `packages/eslint-plugin-mf` exists because
  each rule prevents a bug that was actually shipped here first.
- **Every claim has a check.** Isolation asserted in a document decays; isolation that fails
  CI does not.
- **Versions come from the pnpm catalog.** Never a literal version in an app.
- **The spec is frozen.** Changing DOM structure, fixtures or build settings invalidates
  every recorded result and requires a `SPEC_VERSION` bump.

## Known gaps

Stated plainly, because a benchmark that hides its gaps is marketing:

- Only one stack exists. The Vite / Preact / Solid comparison is unbuilt.
- Storybook, a standalone dev harness and code generators are designed but not built.
- Three behaviours exist of roughly sixteen planned.
- The third-party vendor lane is documented (`docs/third-party-remotes.md`) but not built.
- Most app components emit test-id literals that match the contract rather than importing it.
  The **suites** all import it, and the contract is enforced at runtime — `contract.mjs` §4
  fails on any id the site emits that the contract does not name — so this is a style gap in
  the apps rather than a portability risk.

## Licence

MIT — see `LICENSE`. Photographic fixtures are third-party works under their own licences;
see `packages/media/ATTRIBUTION.md`.
