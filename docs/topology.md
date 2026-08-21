# Topology — how ownership is split

The goal: `shell`, `faq`, `product`, `cart` are each owned by a different team and deployed on their
own schedule, with **no team ever blocked on a shell deploy** — while the user still gets SSR, fast
first paint, and the smallest JS payload we can manage.

This document is the architecture. `docs/constraints.md` is why it looks like this.

---

## The shape

```
shell            header · footer · root router · home route · error boundaries · registry client
  ├── faq        ROUTE remote      exposes ./routes            owns /faq/*
  ├── product    ROUTE remote      exposes ./routes            owns /product/*   + server loaders
  └── cart       COMPONENT remote  exposes ./MiniCart          consumed by shell header
                                          ./CartDrawer          consumed by product
                                          ./store               shared singleton
```

A remote is a **route owner** or a **component owner** — whichever the team needs. `cart` is both a
component in someone else's header and a participant in someone else's page. That is the point.

`home` stays a shell-native route **on purpose**. It is the experimental control: the same page,
federated versus not, is the only honest way to price federation itself.

---

## Rule 1 — remotes export route descriptors, never routers

This is the load-bearing decision. A remote that ships its own router cannot be server-rendered
(`docs/constraints.md` §1). A remote that ships *route descriptors* can, because the shell still has
exactly one router.

```ts
// product/src/routes.ts   —  exposed as "./routes"
import type { RouteDescriptor } from '@mf-eval/contracts';

export const routes: RouteDescriptor[] = [{
  path: 'product',
  children: [
    { index: true,  lazy: () => import('./List'),    loader: listLoader },
    { path: ':id',  lazy: () => import('./Detail'),  loader: detailLoader },
  ],
}];
```

The shell merges every remote's descriptors into one router:

```ts
const routes = [...shellRoutes, ...(await Promise.all(remotes.map(loadRoutes))).flat()];
```

What this buys:

- **SSR, streaming and hydration all work** — one router, one render tree, loaders run on the server.
- **The product team owns every URL under `/product`.** Adding `/product/:id/reviews` is a product
  deploy. The shell never learns about it.
- **Loaders are part of the contract**, so data fetching stays with the team that owns the data.

What it costs:

- The shell must be able to load descriptors *before* it can render — so descriptor modules must stay
  tiny and must not pull the page components in eagerly. Hence `lazy:`, never a static import.
- Two remotes claiming the same path is a runtime conflict. The registry resolves it (Rule 3).

## Rule 2 — cross-remote coordination goes through an explicit contract

`product` must be able to update `cart`, and the `cart` badge lives in the shell's header. Three
different repos, one piece of state.

`packages/contracts` holds a small store plus a typed event contract, declared
`shared: { singleton: true }` so every remote resolves the **same instance**:

```ts
// @mf-eval/contracts
export interface CartStore {
  getSnapshot(): CartState;
  subscribe(fn: () => void): () => void;
  add(item: CartItem): void;
}
```

Rules that keep this honest:

- The contract package holds **types and a store interface**, not UI and not business logic.
- It is versioned and shared as a singleton. A breaking change to it is a coordinated release —
  which is exactly why it must stay small.
- No remote imports another remote's internals. Remotes talk through the contract or not at all.
- The store must be **SSR-safe**: created per request on the server, never module-global, or one
  user's cart leaks into another's response. This is the sharpest correctness trap in the design.

Upstream precedent: `module-federation-examples/shared-store-cross-framework`.

## Rule 3 — remotes are resolved at runtime, not at build time

A `remotes: { product: 'product@https://…' }` block baked into the shell's build config means every
change to that list is a shell deploy. That is the coupling we are trying to remove.

Instead the shell asks a **registry** at request time:

```jsonc
// GET /registry  →  cached, ETag, TTL
{
  "remotes": [
    { "name": "faq",     "entry": "https://faq.cdn/…/mf-manifest.json",     "version": "1.4.0" },
    { "name": "product", "entry": "https://product.cdn/…/mf-manifest.json", "version": "2.1.0" },
    { "name": "cart",    "entry": "https://cart.cdn/…/mf-manifest.json",    "version": "1.0.3" }
  ]
}
```

and calls `registerRemotes()` with the result. This is what `mf-manifest.json` + Snapshot were
designed for.

It delivers all four levels of independence:

| Capability | Mechanism |
|---|---|
| Deploy a new version of an existing page | Registry entry changes → `revalidate()` server-side, `registerRemotes(force)` client-side |
| Add/remove routes inside a page's subtree | Descriptors come from the remote; shell never enumerates paths |
| Add a brand-new page repo to the live site | New registry entry — no shell rebuild |
| Canary / pin / roll back one page | Registry resolves `name → entry` per request, so it can vary by cohort |

**Costs, stated up front:**

- The registry is on the critical path for SSR. It must be cached aggressively and must fail open to
  the last-known-good snapshot, or one registry blip takes down every page.
- `registerRemotes(..., { force: true })` overwrites already-loaded modules and drops their cache.
  MF's own docs call this risky and log a console warning. Client-side it is the only way to pick up
  a new version without a reload.
- **Version skew is now structural**: the server can render `product@2.1.0` while the browser fetches
  `2.2.0` published a second later, and the result is a hydration mismatch. The registry response
  must be pinned into the HTML so the client loads *exactly* what the server rendered. Phase 2
  measures the mismatch rate with and without this pinning.

---

## What we are deliberately not doing

- **No Bridge in the SSR path.** It cannot server-render (`constraints.md` §1). Bridge stays a
  CSR-only comparison lane so we can price app-level independence, and gets re-evaluated if
  PR #4869 merges.
- **No cross-framework mixing inside a stack.** Each stack is single-framework so the numbers isolate
  one variable. Mixing (a Vue cart in a React shell) is the one place Bridge genuinely earns its
  keep, and it is a later axis.
- **No shared UI component library, yet.** It would be the single biggest shared-dependency and would
  dominate the tree-shaking results before we have a baseline to compare against.

## Open question the topology cannot answer by itself

Should `home`, `faq` and `product` share one React instance, or bundle their own? Strict singleton is
smallest but couples every repo's upgrade schedule; full isolation is ~47 KB gzip of React per app
plus ~17 KB of MF runtime each if `externalRuntime` is off.

We are **not** deciding this by argument. Phase 2 sweeps all three policies and prices each one.
See `spec/reference-app.md` § Shared dependency matrix.
