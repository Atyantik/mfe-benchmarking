# Porting the reference app to a second stack

The repo exists to compare implementations. That comparison is only worth anything if the
second implementation is the *same application* — and if the measurement code does not change
when it is pointed at it.

This is the checklist. It is short on purpose: everything genuinely hard is already encoded as
a check, so "am I done" has an answer that is not an opinion.

---

## 0. The rule

**Do not edit `packages/bench` to make your stack pass.** Code edited per stack measures the
edit. If a suite cannot run against your stack, either your stack diverges from
`spec/reference-app.md`, or the suite has a stack-specific assumption that is a bug in the
suite — fix it there, for every stack, and say so in the commit.

---

## 1. Directory layout

The stack is a parameter (`MF_STACK`, default `rspack-react`), and paths are resolved from it.
The app directory names are fixed:

```
stacks/<your-stack>/shell/         the storefront host  (budget key: shell)
stacks/<your-stack>/my-account/    the account host
stacks/<your-stack>/chrome/
stacks/<your-stack>/faq/
stacks/<your-stack>/product/
stacks/<your-stack>/cart/
```

Each app:

- builds to `dist/web` (browser) and `dist/node` (SSR)
- publishes `mf-manifest.json` at its web root
- commits a `budget.json`
- listens on the port `packages/bench/src/lib/topology.mjs` assigns it

Run everything with `MF_STACK=<your-stack>`:

```bash
MF_STACK=vite-solid pnpm dev
MF_STACK=vite-solid pnpm bench
```

## 2. Reuse everything framework-agnostic

These are not React packages and must not be reimplemented:

| Package | What |
|---|---|
| `@mf-eval/contracts` | route descriptors, fixtures, cart store, money, **test-id contract** |
| `@mf-eval/behaviors` | `defineBehavior` and the loader — vanilla TS |
| `@mf-eval/registry` | runtime remote registry |
| `@mf-eval/media` | asset pipeline and origin |
| `@mf-eval/shell-kit` | host infrastructure: slots, asset injection, revalidation |
| `@mf-eval/design` tokens | the CSS custom properties |

The design system's *components* are React. A Solid stack reimplements those, against the
same tokens and the same DOM.

## 3. What you must reproduce exactly

From `spec/reference-app.md`:

- **10 routes**, the same paths, the same host each
- the same **DOM structure** and node counts
- **every `data-testid`** — import them from `@mf-eval/contracts/testids`, never type a literal
- the same **server-rendered vs client-only** split per region
- the same **four behaviours**, with the same names and strategies
- the same **three account widgets**, owned by the same three remotes
- `localIdentName` beginning with the app name (see § 5)
- `requiredVersion` as a **literal**, never `"catalog:"`

## 4. Gates, in the order they will fail

```bash
MF_STACK=<your-stack> pnpm check     # lint → typecheck → test → build → budget
MF_STACK=<your-stack> pnpm dev
MF_STACK=<your-stack> pnpm bench     # 15 suites
```

Expect to fail in roughly this order:

1. **`budget`** — your bundler chunks differently. Adjust `budget.json`, in a commit that says
   why. Do not adjust a budget to hide a regression.
2. **`contract`** — a missing or invented `data-testid`. §4 of that suite names it. This is
   the single highest-value gate: pass it and most of the other suites become meaningful.
3. **`hosts` / `verify`** — routing, cookie continuity, or a storefront document that is not
   byte-identical for a signed-in visitor.
4. **`css`** — see below.
5. **`behaviors`** — a behaviour that did not attach, or a page that broke with JS disabled.
6. **`vitals` / `a11y` / `audit` / `ssr`** — these measure rather than gate, but they have
   budgets and the budgets are real.

## 5. The two traps that are not obvious

**CSS Module identifiers.** Whatever your bundler calls the option, the emitted name must
begin with the application's own name:

| Bundler | Option |
|---|---|
| Rspack / Rsbuild | `output.cssModules.localIdentName` |
| Vite | `css.modules.generateScopedName` |

Two apps that pick the same file name and class name hash to the **same** four characters.
This is verified in this repo, not theoretical — `.cart-panel-V0TX` and `.product-panel-V0TX`.
Without the app name, both emit `.panel-V0TX`, and which team wins is decided by which
stylesheet the network delivered last: one way on a cold load, the other on a warm cache.
`css.mjs` §2 asserts it and the negative control fails 20 checks.

**Component CSS delivery.** A component that imports its app's shared utility bundle drags
that bundle onto every route the component appears on. In this repo the header cart badge did
exactly that and put 19.9 kB of stylesheet, **0% used**, on every page. Per-app byte budgets
do not catch it — they measure what an app builds, not what a page fetches. `css.mjs` §8 does.

## 6. Recording a result

Results carry `SPEC_VERSION`, the catalog hash, the stack and the config cell. **Never compare
results across `SPEC_VERSION`.** If you had to change the spec to accommodate your stack, that
is a bump and a full re-run of every stack — including the ones already measured.

If your stack genuinely cannot express something the spec requires, that is a finding and
belongs in `docs/decision-log.md` with the constraint that caused it. It is not a reason to
quietly implement something else: an unrecorded divergence turns every later comparison into
noise.
