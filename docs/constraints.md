# Module Federation v2 — verified constraints

Everything here was checked against source, not blog posts. Verified **2026-08-21** against
`module-federation/core` @ **2.8.2** and `module-federation/vite` @ **1.20.7**.

The point of this file is that nobody has to re-derive any of it. If something below turns out to be
stale, fix it here and note the date — don't work around it silently in an app.

---

## 1. Bridge cannot server-render. This dictates our whole topology.

`createBridgeComponent` / `createRemoteAppComponent` (`@module-federation/bridge-react`,
`@module-federation/bridge-vue3`) are **client-side only**. A server-rendered host emits a loading
placeholder where the remote should be — no content in the HTML, nothing for SEO, nothing before JS.

The `renderToString` + hydration contract that would fix this is:
- issue [#4868](https://github.com/module-federation/core/issues/4868) — "Application-level SSR for bridge remotes (React & Vue)"
- PR [#4869](https://github.com/module-federation/core/pull/4869) — "feat(bridge): add application-level SSR for React and Vue"

Both opened **2026-07-03**, still **open** on 2026-08-21.

**Consequence.** These two are currently mutually exclusive:

| Want | Possible today |
|---|---|
| Remote ships **its own router**, mounted via Bridge | ✅ CSR only, ❌ no SSR |
| Remote owns **its whole route subtree**, shell owns the one router | ✅ **SSR works** |

We take the second. See `docs/topology.md` — remotes export *route descriptors*, not routers.

> Re-check before Phase 4. If #4869 merges, app-level SSR becomes a real option and is worth
> re-measuring rather than assuming.

---

## 2. Server-side remote refresh is only half-solved upstream

`revalidate()` from `@module-federation/node/utils` compares `remoteEntry` content hashes and resets
the Node require cache, so a redeployed remote is picked up without restarting the server:

```js
import { revalidate } from '@module-federation/node/utils';
revalidate().then((shouldReload) => { /* require cache already reset */ });
```

Two gaps that matter to us:

1. **Framework route stacks are not reset.** Express keeps its own router stack, so remotes that
   register routes need manual clearing (`app._router.stack = ...`). Documented in the package README.
2. **Full cache eviction is unmerged.** `removeRemote` — clearing stale remote, chunk, entry, shared
   and bundler-runtime caches — is PR [#4824](https://github.com/module-federation/core/pull/4824),
   open since 2026-06-17. It exists because **hot-swapping remotes on the server leaks memory**; the
   PR ships a heap-snapshot repro against `apps/modernjs-ssr` with a `/remove-remote-cache` route.

**Consequence.** "Remote refresh on the server" is a headline measurement for us, not a footnote.
The bench must track RSS across N hot-swaps (`packages/bench` → server probes). Expect to find a leak.
Requires `output.chunkFilename: '[id]-[contenthash].js'` on remotes or hash-diffing can't detect change.

### Measured 2026-08-21: `revalidate()` alone does not pick up a redeployed remote

We shipped a genuinely new route in the `faq` remote, rebuilt only that remote, and called
`POST /__revalidate` on the running shell. Result:

```json
{ "ok": true, "shouldReload": false, "ms": 26.39, "rssMb": 118.7 }
```

`shouldReload: false` — no change detected, and the new route stayed 404.

**Why.** `revalidate()` hash-diffs `remoteEntry.js`. The container's bytes did not change, because
the route code lives in a separate exposed chunk (`__federation_expose_routes*.js`). The container is
a stable shim; changing a route does not change it.

**What worked**: bumping the remote's version in the registry. The shell's resolved-set key changed,
it re-registered with `force: true`, and the new route was live — with the shell never rebuilt and
never restarted (verified by pid and bundle hash in `packages/bench/src/independence.mjs`).

**Guidance.** Treat the registry as the source of truth for "what is deployed", not `revalidate()`.
A deploy must bump the version. `revalidate()` remains useful for same-version content changes and
for local dev, but it is not a deployment mechanism, and the docs' framing invites that mistake.

---

## 3. Footprint: Module Federation's own runtime is the dominant cost

Measured locally, jsDelivr `+esm` (Rollup-bundled + minified), compressed with `gzip -9` / `brotli -q 11`:

| | raw | gzip | brotli |
|---|---:|---:|---:|
| **`@module-federation/runtime-core` 2.8.2** | 56,397 | **17,067** | 15,321 |
| `@module-federation/runtime` 2.8.2 (facade) | 2,191 | 972 | 838 |
| preact 10 | 12,047 | 5,138 | 4,651 |
| svelte 5 client | 40,200 | 14,706 | 13,318 |
| solid-js + solid-js/web | 41,452 | 16,357 | 14,851 |
| vue 3 runtime (esm prod) | 109,722 | 41,370 | 37,228 |
| react + react-dom 18 (umd prod) | 142,586 | 47,177 | 40,943 |

**MF's runtime is 3.3× Preact's entire runtime**, and roughly equals all of Svelte or Solid.

> Caveat, stated honestly: the Svelte and Solid numbers are the *untree-shaken module surface*. A real
> app ships far less. The MF number is closer to what you actually ship, because the runtime is mostly
> reachable. So the true ratio is **worse** than the table suggests, not better. Phase 2 replaces every
> row here with numbers measured from real builds.

For light frameworks the footprint study is therefore mostly a study of **MF**, not of the framework.

### The three levers (all supported on both Rspack and Vite)

| Lever | What it does | Config |
|---|---|---|
| `experiments.optimization.*` | Removes unused runtime capabilities at build time | `disableRemote` / `disableShared` / `disableSnapshot` |
| `externalRuntime` | One shared `runtime-core` instead of one per remote | `experiments.externalRuntime` + host `provideExternalRuntime` |
| shared tree-shaking | Ships only the used exports of a shared dep | `shared.<pkg>.treeShaking.mode` = `runtime-infer` \| `server-calc` |

MF's own published fixture for `experiments.optimization`: **73,154 B → 50,008 B** minified
(`disableShared`, ~31.6%). Not gzip — expect a smaller relative win after compression.

Sharp edges found in the docs:
- These are **build-time removals, not feature flags**. Calling an API whose capability was removed
  throws at runtime. Rebuild and redeploy to change them.
- `disableSnapshot` also kills manifest remotes, preload, dynamic types, DevTools and HMR.
  It defaults to **`true` for Node/SSR builds** in the Vite plugin.
- `treeShaking` is **incompatible with `eager: true`** — eager bundles into the initial chunk, which
  defeats the on-demand loading tree-shaking needs.
- `runtime-infer` + `singleton: true` is a **correctness hazard**: app A loads a tree-shaken antd,
  app B loads full antd, and now the "singleton" is two instances. Use `server-calc` for singletons.

---

## 4. Bundlers: Rspack + Vite. Webpack dropped.

**Webpack** uses the identical `@module-federation/enhanced` API as Rspack, builds 5–10× slower, and
adds nothing except `@module-federation/nextjs-mf` for the Next.js Pages Router. Not worth a third
lane. Revisit only if Next.js becomes a target.

**Vite is viable — `module-federation.io` is stale on this.** The docs page still lists SSR and
"nuxt ssr" as roadmap. The repo disagrees:

- Ships `src/plugins/pluginSSRRemoteEntry.ts`, `src/virtualModules/virtualRemoteEntrySSR.ts`,
  `virtualExposesSSR.ts`, `src/utils/ssrVmStrategy.ts`, `ssrCapabilities.ts`, `ssrEntryLoader.ts`,
  plus per-Vite-environment share-cache isolation.
- Vite / VoidZero publicly endorsed the plugin in 2026.
- Working examples for Alpine, Angular, **Astro 7**, Ember 7, Lit, **Nuxt 4**, Preact 10, React 19,
  Solid, **Svelte 5**, **TanStack Start**, Vinext (Next 16), Vue 3 —
  [gioboa/module-federation-vite-examples](https://github.com/gioboa/module-federation-vite-examples).
  That is **broader framework coverage than Rspack has**.
- Feature parity is close: manifest + stats, shared tree-shaking, `externalRuntime`, `disable*` flags.

**The risk is churn, not capability.** 8 releases in 5 weeks (1.18.1 → 1.20.7), overwhelmingly SSR
bug fixes: share-cache scoping per SSR environment, react-server cache isolation, SSR entry emission,
share negotiation. Open regression [#1104](https://github.com/module-federation/vite/issues/1104) —
blank page on cold dev start in 1.20.7.

→ **Pin exact versions** (`pnpm-workspace.yaml` catalog). Upgrade deliberately, re-run the bench.

### Known Vite-plugin behaviours that affect measurements

- **Serial request staircase.** [#1095](https://github.com/module-federation/vite/issues/1095), open —
  native-ESM remotes produce many small sequential fetches on first load. Structurally different from
  Rspack's script-tag `remoteEntry` + manifest-driven preload. The bench captures the full waterfall
  so this shows up as a number, not an anecdote.
- **`manualChunks` is ignored**, and so is `codeSplitting: false` / `codeSplitting.groups`. The plugin
  owns the chunk graph because `loadShare` and `runtimeInitStatus` must stay isolated for bootstrap
  order. We cannot equalise chunking strategy across bundlers — report it, don't fight it.
- **React islands are experimental.** `src/utils/reactIsland.ts`, added in 1.20.1 via PR #988, whose
  own description says: *"Do not use in production; the API will change."*

---

## 5. Module Federation ships no CSS isolation

Confirmed in the docs: host and remotes share one global CSS scope, and MF deliberately does not solve
this. Sanctioned strategies are BEM, CSS Modules, or CSS-in-JS.

For independently deployed teams this is a real collision risk, and each strategy has a byte cost.
It is an evaluation axis, not an afterthought. Vite plugin adds `bundleAllCSS` (default `false`),
which attaches all CSS assets to every exposed module when enabled — a footprint trap if switched on
casually.

---

## 6. SSR asset injection is ours to build

Modern.js (`@module-federation/modern-js-v3`) handles collecting the remote chunks touched during a
server render and injecting the matching `<script>`/`<link>` into the HTML. On a custom server there
is no equivalent — we build it from `mf-manifest.json` + Snapshot.

If we skip it, the browser discovers remote chunks only after hydration starts, and every federated
route pays an extra round trip. This is the single largest piece of real work in Phase 1.

**Also note:** SSR consumption requires the remote to be built **twice** — a web build and a Node
build (`target: 'async-node'`, `library.type: 'commonjs-module'`, and the host needs
`remoteType: 'script'` + `@module-federation/node/runtimePlugin`).

---

## 7. What is officially supported, per framework

| | Bridge (app-level) | Official SSR integration | Rsbuild plugin | Vite MF example |
|---|---|---|---|---|
| React | ✅ `bridge-react` | ✅ Modern.js v3, Next.js | ✅ | ✅ |
| Vue 3 | ✅ `bridge-vue3` | ⚠️ Nuxt via Vite plugin only | ✅ | ✅ |
| Angular | ❌ | ⚠️ Universal guide | ❌ (community `@ng-rsbuild`) | ✅ |
| Preact / Solid / Svelte | ❌ | ❌ **none** | ✅ | ✅ |

For Preact, Solid and Svelte there is **no official SSR integration at all** — the SSR server is ours
to write either way. That is a cost we accept knowingly, and it is the same cost on both bundlers,
which is what keeps the comparison fair.

---

## 8. Rsbuild + MF + SSR: the six traps (verified by spike)

Full write-up and reproduction: `docs/spike-rspack-ssr.md`. **It works** — a plain Rsbuild app plus a
custom Hono server server-renders a federated remote and hydrates it cleanly. But six things bite,
and four of them fail with error messages that point nowhere near the cause.

| # | Trap | Symptom |
|---|---|---|
| 1 | `ssr: true` is deprecated-and-throws; `target: 'dual'` throws outside Rslib/Rspress/Storybook | explicit error, at least |
| 2 | `"type": "module"` in an app with a Node MF build | `require()` returns `{}`, **no error at all** |
| 3 | pnpm catalog breaks MF's `requiredVersion` inference | `...needs catalog:)` share-match failure |
| 4 | Static import of a shared dep in the entry module | `RUNTIME-006`, or worse with `asyncStartup` |
| 5 | Node build `publicPath` defaults to `/` | remote entry resolves to a non-URL |
| 6 | `assetPrefix` set on the **host's** node build | `__webpack_modules__[moduleId] is not a function` |

### Rules that follow

- An app with a Node MF build **must not** declare `"type": "module"`. MF emits CommonJS
  (`library.type: 'commonjs-module'`, `chunkFormat: 'commonjs'`); Node would parse it as ESM and
  silently produce empty exports. Keep the server entry as `.mjs` if you want ESM there.
- **`requiredVersion` must be explicit in every `shared` entry.** MF infers it from `package.json`,
  which under a pnpm catalog literally reads `"catalog:"`. Our catalog is the fairness mechanism
  (D4), so this is not optional.
- **The entry module must contain no static import of anything shared.** Defer behind a dynamic
  import. `experiments.asyncStartup: true` was *not* sufficient — it replaced a clear `RUNTIME-006`
  with an opaque `__webpack_modules__` TypeError.
- **`assetPrefix` on a node build is for remotes only, never the host.** The host's node bundle runs
  in-process; an http publicPath makes the async-node loader fetch its own local chunks.
- For a plain Rsbuild app, the supported shape is two plugin instances — `{ environment: 'web' }`
  and `{ target: 'node', environment: 'node' }`. They are not deduplicated.

### Node manifest advertises `shared: []`

Even with identical `shared` config on both environments, the **node** manifest lists no shared
deps and the node `remoteEntry.js` is 289.9 kB — React appears bundled rather than shared. If that
holds, shell and remote run **separate React instances on the server**. Phase 1 must assert one
instance and price the duplication; do not assume client sharing behaviour carries to Node.

### The cold-load waterfall, measured

Browser requests to the remote origin, strictly sequential:

```
1. mf-manifest.json
2. remoteEntry.js
3. static/js/async/__federation_expose_Widget.<hash>.js
```

Three round trips before one remote component renders, and hydration waits on all of them. The
server already knows all three URLs at render time. This is what the SSR asset injection in §6 is
for, and now there is a baseline to measure it against.

### First real footprint datapoint

`remoteEntry.js` for a remote exposing **one trivial component**: 115.5 kB raw / **32.4 kB gzip** —
roughly 6× Preact's entire runtime, before the remote does anything useful. Corroborates §3 from the
other direction.

---

## Reference implementations worth reading

| Path | Why |
|---|---|
| `module-federation/core` → `apps/modernjs-ssr/{host,remote,nested-remote,remote-new-version}` | Closest thing to our target: SSR + nested remotes + a *v2 of a remote* for swap testing |
| `module-federation/core` → `apps/router-demo/` | Route federation: 1 host + 6 route remotes, plus a Vue3 host and a React-Router-v5 host |
| `module-federation-examples` → `shared-store-cross-framework/` | The product→cart pattern: a `shared-store` package consumed by a React counter, a Vue counter and the shell |
| `module-federation-examples` → `shared-routing/` | shell + dashboard/order/profile/sales route split |
| `module-federation/core` → `apps/node-host`, `apps/node-remote` | Minimal Node consumer/producer, Rslib-built remote |
