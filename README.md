# Module Federation v2 — evaluation harness

Can a website be split so that `shell`, `home`, `faq`, `product` and `cart` are each owned and
deployed by a different team — **with no team blocked on a shell deploy** — while the user still gets
server rendering, fast first paint, and the smallest JS payload we can manage?

This repo answers that with measurements, not opinions.

## What is being measured

- **JS footprint**, attributed by owner: MF runtime vs framework vs app vs shared vs CSS
- **The JS floor** — what a page costs when it needs no interactivity at all
- **Rendering** — TTFB, FCP, LCP, TBT, INP, hydration duration, script execution time
- **Remote refresh** — how fast a redeployed remote is picked up, on the **server** and the client
- **Independence** — proof that adding routes, adding whole new repos, and rolling back one page all
  work without touching the shell

## Headline finding so far

Module Federation's own runtime is **17.1 KB gzip** — 3.3× all of Preact, roughly equal to all of
Svelte or Solid. For light frameworks, MF is the dominant cost, not the framework. Full numbers and
the three levers that reduce it: `docs/constraints.md` §3.

## Layout

```
docs/constraints.md    verified MF v2 facts — read this before believing module-federation.io
docs/topology.md       how ownership, routing and cross-remote state are wired
docs/decision-log.md   what was decided, why, and what would reverse it
spec/reference-app.md  FROZEN spec — every stack implements exactly this
packages/contracts     route-descriptor types, cart store, fixtures
packages/registry      runtime remote registry
packages/bench         size analyzer, Playwright+CDP runner, server probes
stacks/rspack-react    shell · faq · product · cart
stacks/vite-react      same four apps, different substrate
results/               generated measurements
```

## Ground rules

1. **Versions live in the pnpm catalog only.** Every dep is `"catalog:"`. Unequal transitive versions
   between two apps make the byte comparison meaningless.
2. **`spec/reference-app.md` is frozen.** Changing DOM structure, fixtures, the interaction script or
   build settings invalidates every result. Bump `SPEC_VERSION` and re-run everything.
3. **Never compare runs across `SPEC_VERSION`.**
4. **Negative results are results.** "The server leaks memory on remote hot-swap" is a finding, not a
   blocker to be quietly worked around.

## Status

- [x] Phase 0 — skills, verified constraints, frozen spec, pinned versions
- [~] Phase 1 — Rspack + React vertical slice (SSR spike PASSED, see docs/spike-rspack-ssr.md)
- [ ] Phase 2 — measurement harness
- [ ] Phase 3 — Vite + React, same spec
- [ ] Phase 4 — decision gate, then fan out to Preact / Solid / Svelte / Vue

## Skills

| Skill | Use for |
|---|---|
| `/mf` | Official Module Federation skill — live docs, type checks, shared-dep and runtime-error triage, observability |
| `/mf-v2` | What the official docs get wrong or bury, plus this repo's version rules |
| `/mf-topology` | Adding a remote, exposing routes, registry, cross-remote state, debugging federated SSR |
| `/mf-bench` | Metric definitions and what makes two numbers honestly comparable |
