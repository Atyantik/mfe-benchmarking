---
name: mf-v2
description: "Module Federation v2 facts that the official docs get wrong, bury, or omit — verified against source. Use when configuring MF in this repo, reasoning about JS footprint, choosing shared-dependency policy, wiring SSR, or deciding whether a capability actually exists yet. Complements the official `mf` skill; does not replace it."
---

# MF v2 — what the docs won't tell you

**Division of labour.** For general MF questions — API surface, config options, error codes,
type generation — use the official skill: `/mf docs <question>`. It fetches live documentation.

**This skill is for the things live docs get wrong**, plus the decisions frozen in this repo.
Source of truth: `docs/constraints.md`. If this file and that file disagree, that file wins.

## Before you answer anything about capability

`module-federation.io` is **stale in at least one load-bearing place**: it lists Vite SSR as roadmap
when the Vite plugin has shipped SSR since ~1.19. Never answer "does MF support X" from the docs
site alone. Check, in this order:

1. `docs/constraints.md` — already-verified findings, with dates
2. The actual package source on GitHub (`module-federation/core`, `module-federation/vite`)
3. Open issues/PRs — several load-bearing features are unmerged PRs, not missing features

## The four things most likely to bite

**1. Bridge cannot SSR.** `createBridgeComponent` / `createRemoteAppComponent` are CSR-only. A
server-rendered host emits a placeholder. Fix is PR #4869, open since 2026-07-03. If someone proposes
an app-level federated remote that also server-renders, that is currently impossible — steer to route
descriptors (`/mf-topology`).

**2. MF's runtime is probably your biggest dependency.** `runtime-core` is **17.1 KB gzip**. That is
3.3× all of Preact and roughly equal to all of Svelte or Solid. When someone asks "why is the bundle
big", check MF's runtime before blaming the framework. Levers, in order of impact:

| Lever | Config | Note |
|---|---|---|
| `externalRuntime` | `experiments.externalRuntime` + host `provideExternalRuntime` | One runtime-core, not one per remote. Biggest win with many remotes. |
| `experiments.optimization` | `disableRemote` / `disableShared` / `disableSnapshot` | Build-time **removal**. Calling a removed API throws. |
| shared tree-shaking | `shared.<pkg>.treeShaking.mode` | `runtime-infer` local, `server-calc` for deploys |

**3. `disableSnapshot` is not a small optimisation.** It removes manifest remotes, preload, dynamic
types, DevTools and HMR. It defaults to `true` for Node/SSR builds in the Vite plugin — so an SSR
build silently has different capabilities from its web sibling. Know this before debugging "why does
preload not work on the server".

**4. `treeShaking` + `singleton: true` + `runtime-infer` is a correctness hazard**, not just a perf
tradeoff. App A loads a tree-shaken copy, app B loads the full one, and the singleton is now two
instances — split state, duplicated styles, possible crash. Use `server-calc` for singletons, or
don't tree-shake them. Also: `treeShaking` is incompatible with `eager: true`.

## Five rules the spike bought the hard way

Verified in `docs/spike-rspack-ssr.md`. Four of these fail with errors that point nowhere near the
cause, so check them **first** when an MF SSR build misbehaves.

1. **No `"type": "module"` in any app with a Node MF build.** MF emits CommonJS; Node would parse it
   as ESM and `require()` silently returns `{}` with no error. Keep the server entry as `.mjs`.
2. **`requiredVersion` must be explicit in every `shared` entry.** MF infers it from `package.json`,
   which under our pnpm catalog reads `"catalog:"` and fails every semver match.
3. **The entry module must not statically import anything shared.** Defer behind a dynamic import.
   `experiments.asyncStartup: true` is *not* a substitute — it turns a clear `RUNTIME-006` into an
   opaque `__webpack_modules__[moduleId] is not a function`.
4. **`assetPrefix` on a node build is for remotes only, never the host.** On the host it makes the
   async-node chunk loader try to fetch its own local chunks over HTTP.
5. **A plain Rsbuild app uses two plugin instances** — `{ environment: 'web' }` and
   `{ target: 'node', environment: 'node' }`. `ssr: true` throws (deprecated); `target: 'dual'`
   throws outside Rslib/Rspress/Storybook.

Seeing `__webpack_modules__[moduleId] is not a function`? It is almost always #3 or #4.

## Repo rules

- **Versions come from the pnpm catalog.** Every dependency is `"catalog:"` in every app
  `package.json`. Never a literal version, never a range. Unequal transitive versions between two
  apps would make the byte comparison meaningless, which is the entire point of this repo.
  Change versions in `pnpm-workspace.yaml`, nowhere else.
- **`@module-federation/vite` churns weekly** — 8 releases in 5 weeks, mostly SSR fixes, with open
  regressions. It is pinned. Bumping it means re-running the full bench, not just `pnpm up`.
- **Remotes need `chunkFilename: '[id]-[contenthash].js'`** or server-side `revalidate()` cannot
  hash-diff and will never detect a redeploy.
- **A remote consumed during SSR must be built twice** — web build plus Node build
  (`target: 'async-node'`, `library.type: 'commonjs-module'`). Host needs `remoteType: 'script'` and
  `@module-federation/node/runtimePlugin`.

## When changing anything that affects bytes or timing

`spec/reference-app.md` is frozen at `SPEC_VERSION`. If a change alters DOM structure, fixture data,
the interaction script, or build settings, it invalidates every result in `results/`. Bump
`SPEC_VERSION`, say so explicitly, and force a full re-run. Do not quietly "improve" a component in
one stack — that silently biases the comparison it exists to make.
