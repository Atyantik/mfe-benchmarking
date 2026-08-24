# Navigation zones — MPA and SPA in one site

> **Shape correction, 2026-08-24.** An earlier draft described a zone as a prefix inside the
> storefront shell. It is not. A zone is a **separate host application** behind a shared
> edge, which is both closer to how large storefronts are actually built and the only shape
> that gives the account team a deploy of their own. What follows describes what is built.

Most of a commerce site is documents: catalogue, product, support, content. Some of it is an
application: an account area, a configurator, a quote builder. Forcing either into the other's
model is how you get a 400 kB catalogue page or an account area that reloads the whole document to
switch a tab.

So the site is **MPA by default, with named SPA zones**. This document defines what a zone is, what
it costs, and where the boundary sits.

---

## Why this is now a real option

Until July 2026 a client-routed section was a Core Web Vitals blind spot. Route changes produced no
metrics at all, so a slow account area reported its initial load and nothing else — and looked good
precisely because nothing was watching. That was the strongest argument for banning client routing
outright.

Chrome 151 (28 July 2026) shipped the **Soft Navigations API** unflagged. Each qualifying route
change now starts a new timing origin and produces its own LCP, CLS and INP. See
`docs/constraints.md` §14 for what shipped, and for the four caveats that constrain the design
below — particularly that CrUX reporting is still undetermined, and that a route change without a
paint is still invisible.

**A zone is now a measurable, budgeted choice rather than an unmeasured escape hatch.** That is the
whole reason it is allowed.

---

## What a zone is

A **zone** is one URL prefix, owned by a **separate host application**, inside which
navigation is client-side.

```
edge :3100                          one origin, one cookie, prefix routing
├── /my-account/*   -> my-account host :3120   SPA, its own documents and API
└── /*              -> storefront host :3110   MPA, server-rendered documents

remotes consumed by BOTH hosts
    chrome  :3104   header and footer, server-rendered, never hydrated
    cart    :3103   the header widget and the /cart page
    faq     :3101   storefront only
    product :3102   storefront only
```

The zone is a host, not a remote. That distinction is the whole design:

- **It serves its own documents.** Nothing federates into it; it has no `exposes`. It renders
  its own HTML, runs its own API, and ships its own client bundle.
- **It deploys entirely on its own.** No shell rebuild, no registry entry, no coordination —
  the edge rule is the only thing that knows it exists, and that rule is configuration.
- **It shares what should be shared.** Chrome and the cart are remotes both hosts consume, so
  there is one header on the site and one cart, not two of each drifting apart.

A zone as a prefix *inside* the storefront would have coupled the account team's release to
the storefront's, which is the coupling this whole architecture exists to remove.

Three rules define the boundary, and all three are enforced, not conventions:

1. **Crossing the boundary is a document load.** A link from `/my-account/orders` to `/product` is
   a plain `<a>` and a real navigation. The zone router must not intercept it.
2. **Inside the boundary is a soft navigation.** Real ones — user action, visible URL change,
   visible paint — or the browser will not measure them and the zone becomes unmeasured again.
3. **Nothing from the zone is loaded, referenced or preloaded on any page outside it.** The zone's
   router and framework are its own cost, paid by the people who enter it.

## What the edge knows, and what it does not

The edge knows one thing about a zone: its prefix.

```js
{ prefix: '/my-account', origin: 'http://localhost:3120' }
```

It does **not** know the zone's routes. `/my-account/invoices` can ship on a Tuesday with no
edge change and no storefront deploy, because nothing outside the account host ever
enumerated `/my-account/orders` in the first place. In production the same rule is a CDN path
pattern; moving `/quotes` to a third host is configuration, not code.

The trade is deliberate. A document remote publishes its routes to the shell, so the shell can
attribute assets per route and ship exactly one page's CSS. A zone publishes only a prefix, so
the zone owns its own code splitting and its own budget. That is the price of client routing,
and the team that chose it pays it.

### Why chrome had to move

The moment there were two hosts, the header could no longer belong to either. It became its
own remote, consumed by both — and because it is server-rendered and never hydrated, a second
host consuming it costs the browser nothing but its stylesheet.

This is the part that scales to eight teams: one header, one deploy, no drift. The bench
asserts it directly — both hosts must resolve the same chrome build and render the same links
in the same order, with the active-section marker as the only permitted difference.

---

## The shape of a zone: SSR shell, CSR content

The obvious design — server-render the account dashboard — is wrong here, and for the reason
already settled in `docs/decision-log.md` D12.

An account area is per-user. Server-rendering its content makes every response user-specific, which
means no CDN can share it, personalization lands on the TTFB path, and a crawler gets data it has
no use for. The cart taught this already; a dashboard is the cart at page scale.

So a zone splits the same way everything else does:

| | Rendered | Why |
|---|---|---|
| Zone chrome — nav, section headers, layout | **Server** | Identical for every user, shared-cacheable, gives LCP a real element |
| Skeletons for each data region | **Server** | Reserves the exact box, so filling it costs no CLS |
| Everything personalized | **Client** | Per-user; recreated from cookie or a single fetch |
| Navigation between zone routes | **Client** | The reason it is a zone |

The zone hydrates. It is the one place in this architecture that does, and it is allowed because
it is genuinely an application: stateful, interactive, and behind a login.

### An honest word about LCP in a zone

If the LCP element is a skeleton, LCP is fast and the number is not very meaningful. Optimising it
further would be theatre.

The useful reframing is this: **Google does not rank an authenticated page.** Core Web Vitals inside
a zone are a user-experience budget, not an SEO budget. That changes what to optimise. INP and the
time to *useful* content are the numbers that matter; LCP matters only because a slow skeleton is a
blank screen. A team that spends a sprint shaving 100 ms off an account-dashboard LCP has optimised
the wrong thing, and the budget file should say so.

---

## Core Web Vitals rules for a zone

1. **Zone entry is a document load and is budgeted as one.** It competes with the catalogue pages on
   the same terms — that is the point of not letting a zone hide.
2. **Every soft navigation inside is measured.** `soft-navigation` and
   `interaction-contentful-paint` entries, with CLS and INP re-sliced at each boundary.
3. **A route change must paint.** A `pushState` that swaps content without a contentful paint
   produces no entry, so the route is unmeasured. If a zone route legitimately has nothing to paint,
   it should not be a route.
4. **The zone's JS never appears outside it.** Checked, not trusted — a page outside the zone that
   requests any zone asset fails the bench.
5. **Chromium only, and CrUX coverage is unsettled.** Zone metrics are a partial sample by
   construction. Report them as such; never compare a zone's field numbers against a document
   route's as though they were the same measurement.

---

## When something is a zone, and when it is not

A zone is justified when **all** of these hold:

- The section is behind authentication, or is otherwise not indexed.
- Users move between several of its routes in one session — the client-routing benefit is real.
- Its state is expensive to rebuild on every navigation (a multi-step configurator, a filter-heavy
  workbench with unsaved input).

It is **not** justified by:

- "It feels faster." A document navigation to a server-rendered page is already fast, and this repo
  measured it: the MPA route is cheaper on every metric than the SPA equivalent was.
- "The team prefers React Router." That is a preference, not a requirement, and it costs every
  visitor to the zone the framework and the router.
- "It has interactivity." Interactivity is a behaviour (`docs/interactivity.md`). Islands and
  behaviours cover almost everything short of an application.

One zone per genuine application. Not one per team.

---

## Failure and degradation

- **The zone host is down.** The edge returns 502 for `/my-account/*` and nothing else on the
  site is affected — a separate application fails separately, which is the point.
- **Chrome is down.** Both hosts still render: header and footer are simply absent, the page
  is plain and completely navigable. A header outage must never become a site outage, and
  `MF_DESTRUCTIVE=1 pnpm --filter @mf-eval/bench hosts` proves it by killing chrome mid-run.
- **The zone's client bundle fails.** The server-rendered skeleton is still on screen and every link
  in the zone chrome is a real `<a>`, so the visitor can navigate out. A zone must therefore render
  its navigation as real links, not as click handlers.
- **A soft navigation fails mid-route.** The zone owns this; the shell cannot help. Zones need their
  own error boundary per route.

---

## What this costs

The zone pays for the framework, the router, and its own hydration — on entry, once. The rest of
the site pays nothing, and that is the property the bench checks.

Budgets live in the zone's `budget.json` like any other app, and its Core Web Vitals are held
to their own thresholds — measured per soft navigation, reported separately, never averaged
with the storefront's. `pnpm bench` fails on a breach of either.

Measured today: the account host ships **108 kB gzip** of its own JavaScript, against 3–5 kB
for a storefront page. That is the honest cost of client routing, it is paid only by people
who enter the account area, and the bench asserts that no storefront page fetches a byte of
it.
