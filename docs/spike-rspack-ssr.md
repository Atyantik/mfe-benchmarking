# Spike: MF v2 SSR on plain Rsbuild (no Modern.js)

**Question:** can a plain Rsbuild app + a custom Hono server server-render a federated remote, and
hydrate it cleanly? This was the largest identified risk in Phase 1 — the path is documented but has
no reference example anywhere.

**Answer: yes.** Verified 2026-08-21, Rsbuild 2.1.13, MF 2.8.2, React 19.2.8, Node 24.11.1.
Code: `spike/rspack-ssr/`.

## Result

```html
<div id="root"><main><h1>Spike shell</h1>
<button data-testid="counter">clicked <!-- -->0</button>
<div data-testid="remote-widget"><h2>Remote widget: <!-- -->from shell SSR</h2>
<p>Rendered by spike_remote.</p></div></main></div>
```

Real remote content in the server HTML — not a placeholder. Browser verification:

| Check | Result |
|---|---|
| Remote content in server-rendered HTML | pass |
| Hydration completes and is interactive (counter 0 → 2 on clicks) | pass |
| Console errors | none |
| Hydration mismatch warnings | none |
| Perf marks emitted | `mf:shell:hydrate:start` / `:end` |

**Phase 1 proceeds on Rsbuild. No Modern.js fallback needed.**

---

## Six traps, in the order we hit them

Each one produced an error message that pointed somewhere unhelpful. Worth knowing before writing
the real stacks.

### 1. `ssr: true` and `target: 'dual'` are both dead ends for a plain Rsbuild app

From `@module-federation/rsbuild-plugin` source:

```js
if (ssr) throw new Error("The `ssr` option is deprecated. ... please use `target: 'dual'` instead.");
const isSSR = target === 'dual';
if (isSSR && !isStoryBook(...)) {
  if (!isRslib && !isRspress) throw new Error(`'target' option is only supported in Rslib.`);
}
```

So the docs' advice to use `target: 'dual'` applies to **Rslib/Rspress/Storybook only**. The
supported path for a plain Rsbuild app is `target: 'node'` plus an `environment` that already exists
in `environments`:

```ts
environments: {
  web:  { output: { target: 'web'  }, plugins: [pluginModuleFederation(webCfg, { environment: 'web' })] },
  node: { output: { target: 'node' }, plugins: [pluginModuleFederation(nodeCfg, { target: 'node', environment: 'node' })] },
}
```

Two plugin instances, one per environment. This works — the plugin does not get deduplicated.

### 2. `"type": "module"` in package.json silently breaks the node build

The single most expensive trap here. MF's node output is CommonJS — `patchNodeConfig` forces
`library.type: 'commonjs-module'`, `chunkFormat: 'commonjs'`, `chunkLoading: 'async-node'`. With
`"type": "module"` in `package.json`, Node parses that CJS bundle as ESM.

Symptom: `require('./dist/node/index.js')` returns `{}`. No error. `typeof render === 'undefined'`.

**Rule: an app with a Node MF build must not declare `"type": "module"`.** Keep the server entry as
`.mjs` if you want ESM there.

### 3. pnpm catalogs break MF's `requiredVersion` inference

```
[ Federation Runtime ] Version 19.2.8 from spike_shell of shared singleton module react
does not satisfy the requirement of spike_shell which needs catalog:)
```

MF infers `requiredVersion` from `package.json`, which under a pnpm catalog literally reads
`"catalog:"`. That is not a semver range, so every share match fails.

**Rule: `requiredVersion` must be explicit in every `shared` entry in this repo.** Since the catalog
is our fairness mechanism (`docs/decision-log.md` D4) and it is incompatible with MF's inference,
this is not optional.

```ts
shared: {
  react: { singleton: true, requiredVersion: REACT_VERSION },
  'react-dom': { singleton: true, requiredVersion: REACT_VERSION },
}
```

### 4. The entry needs a real async boundary — `experiments.asyncStartup` was not enough

A static `import` of a shared dep in the entry module gives:

```
Invalid loadShareSync function call from runtime #RUNTIME-006
```

Setting `experiments.asyncStartup: true` changed the failure but did not fix it — it then crashed
with a bare `TypeError: __webpack_modules__[moduleId] is not a function`, which points nowhere near
the real cause. What worked is the classic explicit boundary: the entry module imports **nothing**
shared, and defers everything behind a dynamic import.

```ts
// entry.server.tsx — no static React import anywhere in this file
export async function render(): Promise<string> {
  const { renderApp } = await import('./ssr');
  return renderApp();
}
```

### 5. Web and node remotes are different artifacts and cannot share a URL

| | web manifest | node manifest |
|---|---|---|
| `remoteEntry.type` | `global` | `commonjs-module` |
| `publicPath` | `http://localhost:3001/` | `/` unless you set `assetPrefix` |
| `shared` | `react`, `react-dom` | **`[]`** |

The consumer therefore needs **two different remote URLs** — one per environment. We serve the node
build under `/ssr/` to mirror Modern.js's `ssrDir` convention.

The node build's `publicPath` defaults to `/`, which resolves `remoteEntry` to a non-URL. Set
`assetPrefix` explicitly on the node environment of every **remote**.

### 6. …but do NOT set `assetPrefix` on the *host's* node build

The host's node bundle is never served over HTTP — it runs in-process. Giving it an http
`assetPrefix` makes webpack's `async-node` chunk loader try to **fetch its own local chunks** over
HTTP. Symptom is again the useless `__webpack_modules__[moduleId] is not a function`.

**Rule: `assetPrefix` on a node build is for remotes only, never for the host.**

---

## Two findings that feed the main study

### `shared: []` in the node manifest

The node manifest advertises **no shared dependencies**, even though `shared` is configured
identically for both environments. The node `remoteEntry.js` is 289.9 kB — React appears to be
bundled in rather than shared.

If that holds, **shell and remote run separate React copies on the server**. For `renderToString`
that mostly works, but any cross-boundary context or hook identity check would break, and it is pure
duplicated weight in the SSR bundle.

→ Phase 1 must verify this explicitly: assert one React instance on the server, and measure the SSR
bundle cost of the duplication. Do not assume the client's sharing behaviour carries over.

### The client waterfall is real, and it is what SSR asset injection is for

Requests the browser made to the remote origin, in order:

```
1. http://localhost:3001/mf-manifest.json
2. http://localhost:3001/remoteEntry.js
3. http://localhost:3001/static/js/async/__federation_expose_Widget.<hash>.js
```

Three **sequential** round trips before a single remote component can render — and only then does
hydration proceed. Every federated route pays this on cold load.

This is exactly the cost `docs/constraints.md` §6 predicted, now measured. The server knows all three
URLs at render time (they are in `mf-manifest.json`); injecting `<link rel="modulepreload">` /
`<script>` tags into the HTML should collapse the chain. Phase 1 builds that; Phase 2 measures the
before/after.

### Footprint, first real datapoint

`remoteEntry.js` for a remote exposing **one trivial component** with no dependencies of its own:

| | raw | gzip |
|---|---:|---:|
| `dist/web/remoteEntry.js` | 115.5 kB | **32.4 kB** |

32.4 kB gzip before the remote does anything useful. That is ~6× Preact's entire runtime, and it
corroborates the `runtime-core` measurement in `docs/constraints.md` §3 from the other direction.
Reducing this is what `externalRuntime` and `experiments.optimization` exist for — and now we have a
baseline to measure them against.

---

## Reproduce

```bash
cd spike/rspack-ssr/remote && pnpm build && pnpm serve     # :3001
cd spike/rspack-ssr/shell  && pnpm build && pnpm start     # :3000
curl -s localhost:3000 | grep remote-widget
```
