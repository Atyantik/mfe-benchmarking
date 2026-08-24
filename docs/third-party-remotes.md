# Third-party remotes — integration without a shared contract

At eight teams the coupling you can see is the problem. At eighty vendors the coupling you *cannot*
see is the problem: a `@company/mfe-contract` package that every integrator must depend on, and
whose every change is a coordinated release across organisations that do not share a release train.

This document describes how a third party integrates **from its own artifact**, with no package in
the middle. Every primitive below is verified — see `docs/constraints.md` §15 for versions, dates
and the limits.

---

## Why the shared-contract instinct is wrong

The reflex is to publish an interface package:

```ts
// @company/mfe-contract  <- do not do this
export interface WidgetModule {
  mount(el: HTMLElement, props: WidgetProps): () => void;
}
```

It reads like good engineering and it fails at scale for four reasons:

1. **It is a synchronous dependency between asynchronous organisations.** Changing the interface
   means every vendor upgrades before you can ship, which is the coupling federation removes.
2. **It versions badly.** Two vendors on two major versions of the contract cannot coexist in one
   share scope without the singleton problems in §15.
3. **It only describes shape, never fitness.** It cannot say "this build needs React 18", "this is
   the EU build", "this widget must not be server-rendered".
4. **It does not survive a vendor who will not adopt it** — and at 500 developers and dozens of
   integrations, some will not.

The alternative is not "no contract". It is a contract that **travels inside the vendor's build
output** and is adapted on our side at load time.

---

## The four primitives

### 1. The remote describes itself

`manifest.additionalData` mutates the manifest the vendor's own build emits:

```ts
// the VENDOR's build config
manifest: {
  additionalData: ({ stats }) => {
    stats.custom = {
      contract: 'widget@2',
      capabilities: ['cart.recommendations'],
      requires: { react: '^18 || ^19' },
      ssr: false,
      region: process.env.REGION,
    };
  },
}
```

That object arrives with `mf-manifest.json`, which we already fetch before loading anything. So
capability discovery, contract versioning and fitness checks happen **before a single byte of vendor
code is executed**, using data the vendor published about itself.

### 2. Its types travel with it

The DTS plugin generates declarations from the vendor's source and records them in
`metaData.types` (`path`, `name`, `api`, `zip`). Consumers pull types from the producer's build.
There is no `.d.ts` in a shared package for both sides to agree to upgrade, and the types cannot
drift from the implementation because they are generated from it.

### 3. The host adapts at load time, not at author time

Runtime plugin hooks, in increasing order of power:

| Hook | What it can do |
|---|---|
| `beforeRequest` | rewrite the lookup before resolution |
| `afterResolve` | rewrite the resolved entry URL — CDN indirection, region pinning |
| `fetch` | manifest request: credentials, headers, retry |
| `createScript` / `createLink` | `integrity`, `nonce`, `crossorigin`, load `timeout` |
| `getModuleFactory` | supply a custom module factory |
| `loadEntry` | **complete** custom loading — a non-MF remote type, a JSON descriptor, a delegate |
| `onLoad` | **rewrite the exposed exports** |
| `errorLoadRemote` | return a fallback module instead of failing |

`onLoad` is the one that removes the contract package. A vendor exporting `{ render, teardown }`
where we expect `{ mount }` is normalised in **our** code, at load time:

```ts
onLoad({ exposeModule, id }) {
  if (!isVendor(id)) return;
  const m = exposeModule as VendorShape;
  if (typeof m.mount !== 'function' && typeof m.render === 'function') {
    m.mount = (el, props) => { m.render(el, props); return () => m.teardown?.(el); };
  }
}
```

The vendor conforms to nothing. The adapter is versioned with our code, reviewed by us, and deleted
when the vendor catches up. `loadEntry` extends the same idea to a remote that is not a Module
Federation container at all.

### 4. Isolation is configurable — and it is two mechanisms, not one

```ts
// a vendor gets its own runtime instance AND its own share scope
const vendors = createInstance({
  name: 'vendor-host',
  remotes: [{ name: 'acme', entry, shareScope: 'vendor' }],
  shareStrategy: 'loaded-first',
  plugins: [vendorAdapter(), vendorSecurity({ nonce, timeoutMs: 5_000 })],
});
```

- **`createInstance()`** returns a federation instance isolated from the default one. Our remotes
  and their remotes do not share a registry.
- **Share scopes** are named dependency pools. A vendor in `shareScope: 'vendor'` cannot resolve or
  replace the `default` React our own apps use. Both sides must list a scope for sharing to occur; a
  scope the consumer lists and the producer does not is filled in as `{}` rather than crashing.
- **`loaded-first`** defers loading until use, so a slow or dead vendor fails at the point of use
  rather than during startup — and avoids the `version-first` singleton-duplication bug (#3209).

---

## Trust tiers

Isolation is a dial, not a switch. Pick the tier when the integration is approved, and let the
tooling apply it.

| | **Tier 1 — internal** | **Tier 2 — partner** | **Tier 3 — vendor** |
|---|---|---|---|
| Example | another in-house team | a contracted integrator | an analytics or chat widget |
| Federation instance | default | default | **own instance** |
| Share scope | `default` | `default` | **own scope** |
| React | shared singleton | shared singleton | **their own copy** |
| Share strategy | `version-first` | `loaded-first` | `loaded-first` |
| Server-rendered | yes, route descriptors | components only | **never** |
| Script attributes | standard | `integrity` | `integrity` + `nonce` + `timeout` |
| Failure policy | degrade the route | fallback component | fallback, then silence |
| Placement | anywhere | below the fold | below the fold, never the LCP element |
| Byte budget | app budget | explicit, per integration | explicit, per integration |

Tier 3 costs a duplicate React. That is the point: it buys a vendor who cannot break your render.
If the duplicate is unaffordable, the integration is Tier 2 and the vendor accepts the review that
comes with it.

---

## The three limits, stated plainly

**A share scope is a dependency boundary, not a security boundary.** Vendor code still runs on your
main thread with full DOM, cookie and network access. Federation isolates *modules*, not
*capabilities*. For genuinely untrusted code the boundary is an iframe or a worker, and nothing here
substitutes for that. Say this out loud in every integration review, because "it's in its own share
scope" sounds like a security control and is not one.

**Third-party app-level remotes cannot server-render.** Bridge SSR is PR #4869, still open as of
2026-08-24, with a V1 scope that excludes streaming, React data routers and the Modern.js/Nuxt
adapters. Everything from a vendor is client-side. In Core Web Vitals terms that means a vendor
widget must never be the LCP element and must never occupy space that shifts — it gets a
server-rendered placeholder of the exact size, like any other client-only region.

**Every vendor is a Core Web Vitals liability with someone else's release schedule.** They ship when
they ship. The controls that matter are the ones that hold when they ship something bad: a byte
budget enforced in CI against their manifest, a load `timeout`, a fallback module, and a placement
below the fold. A vendor who regresses your INP is not a conversation, it is a rollback — which is
why the registry entry, not a rebuild, is what points at them.

---

## Governance at 500 developers

The technical design above is the easy half. These are the rules that decide whether it survives.

**Central platform owns**, and no team may override: the shell, the registry, the share-scope
policy, the trust tiers, the budget enforcement, and the runtime plugins that implement isolation. A
team cannot promote itself a tier.

**Teams own** their remote entirely: routes, behaviours, styles, tests, deploy cadence, and their
own budget file. No central sign-off to ship a page.

**An integration is a reviewed artifact, not a code change.** Adding a vendor is a registry entry
plus a tier plus a budget — reviewed once, then deployable without touching the shell. That is what
makes eighty integrations administrable: the shell never changes, so the shell is never the
bottleneck and never the blast radius.

**Every claim is checked by the bench, not by review.** Isolation that is asserted in a design
document decays. Isolation that fails CI does not. The rules that matter are the ones with a test:
no cross-remote fetches, no vendor asset outside its page, budgets enforced per integration, and a
clean console.
