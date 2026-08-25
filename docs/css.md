# CSS at eight teams — can two of them write `.panel` and not collide?

Every micro-frontend architecture asserts that styles are isolated. Very few test it, and the
ones that do usually test it the easy way: two components whose class names happen not to
overlap, which proves nothing.

This repo tests it the hard way, and the test is wired into `pnpm bench` as the `css` suite.

## The experiment

Two applications — **cart** and **product**, separate teams, separate deploys — each ship a
file called `panel.module.scss`. Not similar files. The same file name, the same class names,
the same Sass variable names, and a mixin with the same name:

| | `cart/src/panel.module.scss` | `product/src/panel.module.scss` |
|---|---|---|
| classes | `.panel` `.label` `.value` `.total` | `.panel` `.label` `.value` `.row` |
| variables | `$surface` `$ink` `$radius` `$pad` | `$surface` `$ink` `$radius` `$pad` |
| mixin | `@mixin frame` | `@mixin frame` |
| `.panel` display | `inline-flex` | `block` |
| `.panel` radius | `0.375rem` | `0.5rem` |
| `.panel` surface | `--color-card` | `--color-sunken` |
| `.label` | 15 px, sentence case | 12 px, uppercase, tracked |

Both render on **`/product/p-0001`** — cart's as the header badge, product's as the stock
panel. Nothing coordinates them: no prefix convention, no shared stylesheet, no reviewer who
noticed. Every declaration contradicts the other team's, so a leak is loud and visual: the
cart badge would become a full-width block, or the stock panel an inline pill.

Two teams both reaching for `.panel` is not a contrived collision. It is the most likely one
there is.

## The result

All 65 checks pass. The two elements resolve to different values on 4 of the 7 properties
measured, `.label` and `.value` diverge inside them, no application's rule matches another
application's element, and flipping stylesheet order changes nothing.

## The fair objection, and the answer

On the real page the two components sit eight levels apart — one in `header`, one in `main`.
Flat class selectors can only collide by *name*, so two elements that never share an ancestor
never test the case that actually breaks design systems: a **descendant selector** reaching
into someone else's subtree.

So both stylesheets now carry one, with contradictory declarations:

```css
.cart-panel-V0TX    .cart-label-ldEi    { text-transform: none;      letter-spacing: 0;      }
.product-panel-V0TX .product-label-ldEi { text-transform: uppercase; letter-spacing: 0.16em; }
```

Note that **both halves** of each selector are hashed. That is what makes the rule unable to
escape its own component, and §9 proves it by cloning both components out of the live page and
rebuilding them in three arrangements: side by side under one parent, cart nested inside
product, and product nested inside cart. In every arrangement each `.panel` keeps every
declared value it has in its natural position, and nested in one subtree the two `.label`
elements still disagree on `text-transform`, `letter-spacing` and `color`.

Layout-derived values are deliberately excluded from that comparison. A block element nested
in a flex parent is blockified, and its computed `display` changes — that is CSS working, not
a leak, and asserting otherwise would make the section lie.

## The negative control

Every check above is worthless if it would pass anyway. Reverting `localIdentName` to the
stock `[local]-[hash:base64:4]` and rebuilding collapses the suite — **20 checks fail**, and
the page breaks visibly:

```
mini-cart     class=panel-V0TX  inline-flex  r:6px  bg:rgb(255,255,255)  p:4px 12px
stock-panel   class=panel-V0TX  flex         r:6px  bg:rgb(255,255,255)  p:4px 12px
```

Identical class. The stock panel *becomes* the cart badge — green pills, a cramped inline row,
text overflowing its box. Among the failures:

- `product's .panel renders its own display: block` — computed `flex`
- `.panel disagrees on borderRadius` — cart 6px · product 6px
- **`cart's .panel is unchanged by stylesheet order` — changed: display, borderRadius,
  backgroundColor, padding**

That last one is the whole argument for doing this by construction. With the app name gone,
which team wins is decided by which stylesheet the network delivered last — one way on a cold
load, the other on a warm cache. The bug would not reproduce on the machine of whoever was
asked to fix it.

## What actually does the work — and the near-miss

The interesting finding is *why* it holds, because it very nearly did not.

```
.cart-panel-V0TX      .product-panel-V0TX
.cart-label-ldEi      .product-label-ldEi
.cart-value-sVMb      .product-value-sVMb
```

**The hashes are identical.** All three pairs. The hash input is the local name plus a path
that is the same relative to each app root, so two teams who chose the same file name and the
same class name hash to the same four characters — deterministically, every build.

Under the stock `[local]-[hash:base64:4]` that ships as the default, both teams would have
emitted `.panel-V0TX`, and whichever stylesheet the network delivered last would have won. On
a cold load one way, on a warm cache the other. That is the worst class of bug: intermittent,
environment-dependent, and invisible in every local dev run.

What separates them is one line in `packages/rsbuild-preset/src/index.ts`:

```ts
output: {
  cssModules: { localIdentName: `${opts.name}-[local]-[hash:base64:4]` },
},
```

The application's own name, first. Uniqueness stops depending on a hash being lucky and
starts depending on two applications not sharing a name — which the registry already
guarantees. **Collision becomes impossible by construction rather than improbable by hash.**

`css.mjs` asserts the near-miss deliberately: it recomputes what `[local]-[hash]` alone would
have produced and requires that at least one pair collides. If a future refactor makes the
hashes diverge, the check reports that it now proves less. If someone removes the app name
from `localIdentName`, three checks fail and name the identifiers that merged.

## Two mechanisms, not one

The preset isolates CSS two different ways, and they apply to different things:

**Utility and component CSS** is rewritten by the `scopeRemoteCss` PostCSS plugin, which
prefixes every rule with `[data-owner="<app>"]`. This is what keeps Tailwind's `.p-4` from one
remote off another remote's markup — utilities are shared vocabulary by design, so the
scoping has to come from outside the stylesheet.

**CSS Modules are exempt from it**, by an explicit check:

```ts
const IS_CSS_MODULE = /\.module\.(s?css|sass|less)$/i;
// inside the visitor
if (IS_CSS_MODULE.test(rule.source?.input?.from ?? '')) return;
```

They do not need it. Their identifiers are already unique, and wrapping them in an attribute
selector would add specificity and bytes for nothing. Running both would also hide a failure
in either: if the module identifiers ever stopped being unique, `[data-owner]` would mask it
until the day someone rendered two apps into one subtree.

Keeping them separate means each mechanism is tested on its own. `css.mjs` covers the modules;
`cross-contamination.mjs` covers the scoped utilities.

## Why Sass, and what it costs

Sass is here because it is what the collision needs to be honest. Variables and mixins are
the constructs teams actually share names for, and they are *build-time* — `$surface` in two
apps must not become one `$surface`, and there is no runtime mechanism that could rescue it.
The suite checks the compiler erased them: no `$`, no `@mixin`, no `@include` survives into
the shipped bytes, and `&:hover` flattened into `.cart-panel-V0TX:hover`.

The cost is small and worth stating:

| | source | built | gzip |
|---|---:|---:|---:|
| `cart/panel.module.scss` | 1 467 b | 707 b | 0.35 kB |
| `product/panel.module.scss` | 1 229 b | 635 b | 0.33 kB |

Both compile smaller than they were written — nesting and mixins are authoring conveniences
that cost nothing at runtime. `/product/p-0001` ships 16.96 kB gzip of CSS in total across six
stylesheets, of which **81% is used**.

## Delivery — isolation is only half of it

The other half is not being on the page at all. A federated site makes this easy to get wrong
in a way a single bundle does not: an app's CSS travels with whichever of its modules a page
loads, so **one component placed in the site chrome drags its app's entire stylesheet onto
every route**.

That is exactly what this repo was doing. The header cart badge imported `./styles.css` —
cart's shared utility bundle — because every component in that app did, and for a component
that renders on one route the convention is harmless. This one renders in the chrome:

```
/faq   19 856 b from cart   0% used
```

Zero. Not "mostly unused" — the browser downloaded, parsed and applied 19.9 kB of stylesheet
that contributed nothing at all, on every page of the site. No per-app byte budget caught it,
because budgets measure what an app **builds**, not what a page **fetches**.

Rewriting the badge as a self-contained CSS Module removed the import and the 19.9 kB with it:

| route | before | after |
|---|---:|---:|
| `/` | 4 sheets, 29.1 kB gz | **3 sheets, 9.24 kB gz** |
| `/faq` | 5 sheets, 32.8 kB gz | **4 sheets, 12.92 kB gz** |
| `/product` | 5 sheets, 32.9 kB gz | **4 sheets, 13.00 kB gz** |
| `/product/p-0001` | 6 sheets, 16.96 kB gz | 6 sheets, 16.96 kB gz — unchanged, and correct |
| `/cart` | 4 sheets, 12.86 kB gz | 4 sheets, 12.86 kB gz — unchanged, and correct |

The last two rows matter as much as the first three. Cart's utility bundle still loads on
`/cart` and `/product/p-0001`, where it measures 80% used, because the drawer placeholder
genuinely renders there. The goal is not "less CSS everywhere"; it is CSS on exactly the
routes that use it.

This is the general property a CSS Module buys beyond naming: a component whose styles are
its own is **relocatable**. Put it in the chrome, in a widget, on one route — its CSS goes
where it goes and nowhere else. A component that imports a shared bundle is only cheap in the
place it was first written.

### The three checks that keep it true

`css.mjs` §8 walks every anonymous route with CSS coverage on and asserts:

1. **No route fetches a stylesheet it uses less than 5% of.** Not zero — a utility bundle can
   legitimately be mostly idle on one route. Contributing *nothing* is never legitimate.
2. **A stylesheet that defines module identifiers is fetched only on routes where one of them
   renders.** Stated generally rather than per-component, so it keeps holding as components
   are added: a component's CSS travels with the component, or it is not component CSS.
3. **A module's CSS is its own chunk, not merged into the app bundle.** If it were merged,
   check 2 would be unachievable no matter how correct the identifiers are.

Plus a per-route ceiling of 23.44 kB gzip for all CSS on one document.

Reintroducing the import fails check 1 immediately, naming the stylesheet, the four routes and
the 19.39 kB — which is how this section was verified rather than assumed.

## When to reach for which

Modules are not a replacement for the utility layer, and the suite does not treat them as a
competitor to be scored against it.

- **Design-system primitives and layout** — the shared `@mf-eval/design` package. One
  definition, one place, tokens enforced by lint.
- **Utilities** — for composition inside an app. They amortise: the hundredth `.p-4` is free.
- **CSS Modules** — for a component with a real visual identity of its own, where a team wants
  to write CSS rather than assemble it, and where the styles are nobody else's business.

The last one is the case this experiment is about, and the answer is that it works, it costs
about 0.35 kB per component, and the isolation does not depend on anyone being careful.

## What this does not prove

Stated plainly, because a benchmark that hides its limits is marketing:

- **CSS custom properties are global, and deliberately so.** Both modules read
  `--color-card`, `--color-line` and the type scale from the design system. That is the shared
  vocabulary working as intended, not a leak — but it does mean a team that redefines a token
  on `:root` affects everyone, and no check here would catch it.
- **This is build-time isolation.** It holds because two applications cannot emit the same
  identifier. It says nothing about a third party injecting a stylesheet at runtime, which is
  an iframe or a shadow-root problem — see `docs/third-party-remotes.md`.
- **One stack.** The identifiers are produced by Rspack's CSS Modules implementation. A Vite
  stack must satisfy the same suite before its numbers sit beside these; `localIdentName` has
  a direct equivalent there, but "equivalent" is a claim until the suite is green.
