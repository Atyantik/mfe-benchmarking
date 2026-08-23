# Where design lives in a federated site

Four layers, and the boundary between them is decided by **what has to change independently**,
not by what feels tidy. Getting this wrong is how micro-frontends end up either visually
incoherent or coupled at every deploy.

## The decision test

Ask, in this order:

1. **Does it carry per-user state, or must it be deployable without rebuilding consumers?**
   → **Federated remote.** Pay the runtime cost, get the independence.
2. **Is it presentational and versioned — a Button, a Card, a Table?**
   → **Build-time npm package.** No runtime cost at all; a design-system upgrade is a
   deliberate, coordinated release, which is the correct semantics for a design system.
3. **Is it a value rather than a component — a colour, a spacing step, a type ramp?**
   → **A CSS custom property**, in one stylesheet, served once.
4. **Otherwise** → it belongs to the team that owns the route. It never leaves that repo.

## The four layers

### 1. Tokens — `packages/design/src/tokens/tokens.css`

Brand colour, spacing scale, type ramp, radii, elevation, motion. Plain CSS custom
properties on `:root`.

Served **once** by the shell, immutable-cached, referenced by every remote via `var(--…)`.
A rebrand is a CSS deploy: no app rebuilds, no version bumps, no coordination. This is the
cheapest possible sharing mechanism and it should carry as much as it can.

### 2. Primitives and patterns — `packages/design` (npm, build-time)

`Button`, `Card`, `Badge`, `Breadcrumbs`, `SpecTable`, `Accordion`, `Pagination`,
`ProductCard`, `Facets`. Imported by every app at build time.

**Why not federate the design system?** Because it would be the worst trade available here.
These components are pure presentation with no state and no personalization, and in this
architecture pages are server-rendered and never hydrated — so a DS component compiles down
to markup plus class names and costs the browser *nothing*. Federating it would add a
container, a runtime resolution step, and a network round trip to deliver something that
has no runtime behaviour. You would be paying MF's price for none of its benefit.

The real argument for federating a DS is "ship a fix to every app without rebuilding them".
Tokens already give you that for anything expressible as a value — which is most visual
change. What is left is structural change, and structural change *should* be a versioned,
reviewed release rather than something that lands in production unannounced.

### 3. Feature components — inside the owning remote

`ProductSpecs`, `FaqAccordion`, `CartLine`. They live in the team's repo, are never
imported across a boundary, and are free to change on that team's schedule alone.

If two teams need the same feature component, that is a signal — either it belongs in the
design system (promote it, with review), or the duplication is genuinely cheaper than the
coupling. Both answers are legitimate; deciding by accident is not.

### 4. Personalized and interactive — federated remotes

The cart. Per-user, deployed on its own schedule, and the only thing on the page that runs
JavaScript in the browser. This is what Module Federation is actually for.

## Why each app runs its own Tailwind build

Each app compiles Tailwind over its own source plus the design package's source. Utilities
shared between apps are therefore emitted more than once.

That is deliberate. The alternative — one central Tailwind build scanning every app's
source — means the design system must see every consumer's code, so a team cannot use a new
utility without a coordinated release. That is precisely the coupling this repo exists to
remove, reintroduced through the stylesheet.

The cost is a few kB gzip of duplicated utilities per app, immutable-cached and split per
route. The benefit is that a team can style anything without asking anyone. Measured in
`results/`; if the duplication ever stops being a rounding error, revisit.

## Rules

- Remotes reference tokens with `var(--…)`. Never hard-code a brand value.
- Remotes import components from `@mf-eval/design`. They do not reimplement buttons.
- The design system never imports from an app. Dependencies point one way.
- Anything with per-user state is client-rendered and never appears in server HTML
  (`docs/decision-log.md` D12).
