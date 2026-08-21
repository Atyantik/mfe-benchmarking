---
name: mf-topology
description: "How ownership, routing, cross-remote state and independent deployment are wired in this repo. Use when adding a remote, exposing routes or components, wiring the registry, coordinating state between remotes, or debugging SSR/hydration of a federated route."
---

# Topology — route descriptors, registry, shared store

Full rationale: `docs/topology.md`. Constraints behind it: `docs/constraints.md`.

## The one rule that everything else depends on

**A remote exposes route descriptors, never a router.**

A remote that ships its own router cannot be server-rendered — Bridge is CSR-only and the SSR contract
(PR #4869) is unmerged. A remote that ships route descriptors can, because the shell keeps exactly one
router.

```ts
// <remote>/src/routes.ts   —  exposed as "./routes"
import type { RouteDescriptor } from '@mf-eval/contracts';

export const routes: RouteDescriptor[] = [{
  path: 'product',
  children: [
    { index: true, lazy: () => import('./List'),   loader: listLoader },
    { path: ':id', lazy: () => import('./Detail'), loader: detailLoader },
  ],
}];
```

- `lazy:`, **never a static import** of the page component. The descriptor module is loaded before
  first render; if it drags the page components in, every route's code is in the critical path.
- Loaders belong to the remote. That is how data fetching stays with the team that owns the data.
- The shell merges: `[...shellRoutes, ...remoteRoutes.flat()]`.

If someone asks for a remote with its own `<BrowserRouter>`, that is the Bridge path: CSR only, no
SSR, no SEO. Say so before building it.

## Adding a remote

1. New directory under `stacks/<stack>/<name>/`, deps as `"catalog:"` only.
2. Decide the kind:
   - **route remote** → expose `./routes`, own a URL subtree
   - **component remote** → expose named components, own no URLs
   - a remote may be both (`cart` exposes `./MiniCart`, `./CartDrawer`, `./store`)
3. `chunkFilename: '[id]-[contenthash].js'` — required for server-side `revalidate()`.
4. If it is consumed during SSR, add the Node build too (`target: 'async-node'`,
   `library.type: 'commonjs-module'`).
5. Add it to the registry fixture. **Do not** add it to the shell's build config — that would
   reintroduce exactly the coupling this design removes.
6. Emit the `mf:remote:<name>:load:start|end` marks (`spec/reference-app.md` § Performance marks).

## Cross-remote state

Goes through `@mf-eval/contracts`, declared `shared: { singleton: true }`. Nothing else.

- The contract package holds **types and a store interface** — no UI, no business logic.
- **No remote imports another remote's internals.** Contract or nothing.
- **The store must be created per request on the server.** A module-global store leaks one user's
  cart into another user's response. This is the sharpest correctness trap in the whole design —
  check it on every review of server code.
- A breaking change to the contract is a coordinated release across every repo. Keep it tiny.

## Registry

The shell resolves `name → entry` at **runtime**, per request, from the registry — never from a
build-time `remotes` block.

```jsonc
{ "remotes": [ { "name": "product", "entry": "https://…/mf-manifest.json", "version": "2.1.0" } ] }
```

Non-negotiables:

- **Cache aggressively and fail open** to the last-known-good snapshot. The registry sits on the SSR
  critical path; a blip there must not take down every page.
- **Pin the resolved versions into the HTML.** The server rendered a specific version; the client must
  load *that* version, not whatever the registry returns a second later. Without this, version skew
  produces hydration mismatches — and it will happen during any real deploy.
- `registerRemotes(..., { force: true })` overwrites loaded modules and drops their cache. MF logs a
  warning because it is genuinely risky. It is still the only client-side way to pick up a new
  version without a reload.

## Debugging a federated route

In order — most failures are the first two:

1. **Placeholder instead of content in view-source?** The remote is being consumed as an app, not as
   route descriptors. Wrong topology, not a bug.
2. **Hydration mismatch after a deploy?** Version skew. Check that the HTML pins the versions the
   server used.
3. **Badge/state wrong in server HTML but right after hydration?** Store is module-global instead of
   per-request, or the shell rendered the header before remote state was resolved.
4. **Extra round trip on every federated route?** SSR asset injection is missing — the server must
   collect the remote chunks it touched and inject `<script>`/`<link>` from `mf-manifest.json`.
5. Still stuck: `/mf observability` and `/mf runtime-error <code>` from the official skill.

## Deliberately not doing

- Bridge in the SSR path — CSR-only lane for comparison only.
- Cross-framework mixing inside a stack — later axis; it is the one place Bridge earns its keep.
- A shared UI component library — would dominate tree-shaking results before we have a baseline.
