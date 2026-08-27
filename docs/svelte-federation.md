# Is Module Federation possible with Svelte?

**Yes — including SSR and Svelte 5 runes — with one significant caveat about sharing.**

Everything published on this question is a blog post, a forum thread with no error message in
it, or a demo that does not run. So it was answered the way everything else in this repo is
answered: by building it. The spike is in `spike/rspack-svelte/` and every claim below was
produced by running it, on 2026-08-25, against Svelte 5.56.10, Rsbuild 2.1.13, Rspack 2.1.10,
`@rsbuild/plugin-svelte` 2.0.1 and Module Federation 2.8.2.

---

## What works

| | |
|---|---|
| Building a Svelte 5 remote that exposes a component | **yes** |
| A host loading it at runtime with no build-time dependency | **yes** |
| `$state` and `$derived` continuing to work after crossing the boundary | **yes** |
| Svelte's scoped component styles surviving federation | **yes** |
| Server-side rendering through `svelte/server` | **yes** |

Verified output, client:

```
mounted: true | Basket: 0 (doubled 0)
after 3 clicks: $state=3 $derived=6   -> runes work across the boundary
scoped style: border-radius 999px
```

Verified output, server:

```html
<!--[--><button data-testid="svelte-badge" class="svelte-f5tfni">Basket: <span
data-testid="svelte-count">0</span> (doubled <span data-testid="svelte-doubled">0</span>)</button><!--]-->
```

Props applied, styles scoped, hydration markers present. This is a real SSR path, not a
string template.

---

## The caveat: you cannot share the Svelte runtime

This is the finding that matters, and it is the one no article states.

| `shared` on the remote | result |
|---|---|
| `{}` | mounts |
| `svelte` — singleton | mounts |
| `svelte` — no singleton | mounts |
| **`svelte/internal/client`** — singleton | **hangs** |

Sharing `svelte/internal/client` leaves the container's initialisation promise **permanently
unsettled**. Every chunk downloads with a 200. There is no console error, no `pageerror`, no
rejected promise, no warning. The host's entry runs, the dynamic `import()` never resolves,
and the page sits on its loading state forever.

That failure mode is worse than a crash. A crash names a file.

**Why it matters:** `svelte` — the entry you *can* share — is the public API surface
(`mount`, `hydrate`, lifecycle). It is not where Svelte 5's reactivity lives. Compiled Svelte 5
components import from `svelte/internal/client`, which is the actual runtime, and that is the
entry that cannot be shared. So:

> Sharing `svelte` is legal and nearly worthless. Sharing the runtime is what would pay for
> itself, and it does not work.

Every Svelte remote therefore carries **its own private copy of the Svelte runtime**, measured
here at **17.3 kB gzip**. Two consequences follow, and the second is the serious one:

1. **Duplication scales with the number of remotes.** Five Svelte remotes on a page is ~86 kB
   gzip of duplicated runtime.
2. **Each copy is its own reactive graph.** Cross-remote reactive state is not merely
   inefficient, it is *unavailable*: a `$state` written in one remote cannot be observed by an
   effect registered in another, because they are different runtimes. Shared state between
   Svelte remotes has to travel through something outside Svelte — a store on `window`, an
   event bus, a cookie, the DOM.

This is consistent with the Svelte team's own position that `svelte/internal` is undocumented
API that was never meant to be depended on, and with the reports that sharing it "worked in
Svelte 4 and is broken in 5".

---

## Four configuration traps, none of which error usefully

Found while building the spike. All four are in `spike/rspack-svelte/remote/rsbuild.config.ts`
with comments at the site.

**1 · `exposes` must be split per environment.** `svelte/server` imports `node:async_hooks`.
MF builds every expose into every environment, so one `exposes` map put the server renderer
into the browser bundle:

```
× "node:*" is a built-in Node.js module and cannot be imported in client-side code
```

This one is honest, at least. The React preset in this repo already splits exposes; Svelte
needs it more, because its server entry is a different *module*, not a different function.

**2 · The server build needs its own compiler options.** Svelte compiles a component
differently per target — `generate: 'client'` emits DOM instructions, `generate: 'server'`
emits a string builder.

**3 · The Svelte plugin must be declared per environment, not overridden.** A root
`pluginSvelte()` plus a node-level one with `generate: 'server'` produced a node bundle
containing **both** compilations — server helpers and client `$.child` calls in the same
file — and `render()` returned `{}`. No error at build time or run time. Give each
environment its own plugin and nothing at the root.

**4 · `shared` must be split per environment too.** See the table above.

Three of these four fail *silently*. That is the real cost of this stack today: not that it
cannot be done, but that getting it wrong produces an empty object or a page that never
finishes loading.

---

## What it costs

Remote output, gzip, with `svelte` shared as a singleton:

| chunk | gzip | what |
|---|---:|---|
| `remoteEntry.js` | 32.7 kB | MF runtime + container |
| `139.js` | 17.3 kB | the Svelte runtime, private to this remote |
| `__federation_expose_mount.js` | **0.96 kB** | the component |
| other | 0.9 kB | |

**A 0.96 kB component delivered by ~50 kB of machinery.** The MF runtime figure is not
optimised here — the React stack in this repo gets `remoteEntry` to 15.3 kB gzip with
`externalRuntime: true` + `provideExternalRuntime`, and there is no reason that lever would not
apply, but the spike did not test it.

For comparison, the same repo's measured finding for React: MF's `runtime-core` alone is
17.1 kB gzip, which is roughly all of Svelte. The runtime you cannot share is about the size
of the framework you chose Svelte to avoid.

---

## Also true, and relevant to DX

`svelte-loader` does not support HMR for Svelte 5 (stated in the `@rsbuild/plugin-svelte`
documentation). This repo's `dx` suite records that the rspack-react stack has no hot update
path either — `pnpm dev` serves built artefacts — so the two would currently be compared on
equal footing. That is a property of *this* harness, not of Svelte, and it would stop being
true the moment a Vite-based stack is added.

---

## Verdict for this repo

A `rspack-svelte` stack is **feasible** and would be a genuinely interesting comparison: the
same reference application, the same 366 checks, a framework with no virtual DOM, and a
runtime that federation cannot deduplicate.

It is **not free**. Before committing to it:

- The widget composition test (`/my-account`, three teams contributing to one page) becomes a
  much harsher test for Svelte, because each contributing remote brings its own runtime. That
  is a *result*, and arguably the most valuable one this repo could produce about Svelte.
- Cross-remote shared state must be designed around the runtime boundary. This repo's cart
  store already lives in `@mf-eval/contracts` as framework-agnostic code with a cookie behind
  it, so the reference application happens to be shaped correctly for that already.
- Every one of the four traps above must be encoded as a check or a lint rule before an app
  author meets it, per this repo's standing rule that a trap which can be a rule should be one.

## Reproducing

```bash
pnpm --filter @mf-eval/spike-svelte-remote build
pnpm --filter @mf-eval/spike-svelte-host build
node spike/rspack-svelte/remote/serve.mjs &   # :3201
node spike/rspack-svelte/host/serve.mjs &     # :3200
open http://localhost:3200
```

To see the silent hang for yourself, add `'svelte/internal/client'` to `sharedWeb` in
`spike/rspack-svelte/remote/rsbuild.config.ts` and rebuild.


---

## Lighter, and slower: what a real connection showed

Measured on localhost, `/cart` and `/product/p-0001` were flatly better in Svelte — 22% and 14%
fewer bytes. Measured on Slow 4G at 150 ms round trip, the same two pages paint **later**:

| route | total transfer | first paint |
|---|---|---|
| `/cart` | 161.9 → 126.1 kB gz (**−22%**) | 887 → 995 ms (**+12%**) |
| `/product/p-0001` | 254.9 → 218.6 kB gz (**−14%**) | 1013 → 1133 ms (**+12%**) |

Both stacks have FCP equal to LCP on those routes, so this is about when rendering *starts*, not
about a large image arriving late. Three candidates were checked and two eliminated:

- **HTML size.** Svelte's anchor comments do inflate the document, but only by 140–270 bytes
  gzipped — about a millisecond on this connection. Not it.
- **Stylesheets.** Identical: same count, same bytes, to the kilobyte.
- **The eagerly preloaded set.** This is it.

```
React  /cart   1 modulepreload chunk    3.7 kB gz
Svelte /cart   2 modulepreload chunks   5.2 + 22.8 = 28.0 kB gz
```

Svelte ships **22% fewer bytes overall and seven times more bytes in the critical path**,
because its client runtime is bundled into the island chunk rather than shared from the host.
Those chunks are `modulepreload` — fetched eagerly, at high priority, competing directly with
the stylesheets and markup first paint is waiting for.

The arithmetic closes: 24.3 kB of extra critical-path transfer at 205 kB/s is **118 ms**, against
an observed **108 ms** of additional paint delay.

**This is the unshareable runtime again, in its third form.** It has now cost bytes per remote
(the account page, +31.6%), correctness (a component cannot cross the boundary), and now latency
— by moving weight from the part of the page that can wait into the part that cannot.

None of it was visible on localhost, where the two routes reported identical paint times.
