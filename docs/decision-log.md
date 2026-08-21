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
