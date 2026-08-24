# App author's guide

The only document you need to build a page here. It assumes you know React and nothing about
Module Federation — which is the point.

## What you own

One app under `stacks/rspack-react/<your-app>/`. Its routes, its components, its styles, its
tests. Nothing else in the repo is yours to edit.

## What you never touch

| Thing | Who owns it |
|---|---|
| Module Federation config, remote wiring | `@mf-eval/rsbuild-preset` |
| The registry, SSR, asset injection | `@mf-eval/shell-kit` and the shell |
| Buttons, cards, tokens, layout primitives | `@mf-eval/design` |
| Product data, cart state, route types | `@mf-eval/contracts` |
| Lint, TypeScript, test setup | `@mf-eval/eslint-config`, `@mf-eval/tsconfig`, `@mf-eval/vitest-config` |

If you find yourself editing one of these to get your feature working, stop and ask. It
usually means the platform is missing something, and that is a platform fix.

## The one command

```bash
pnpm check      # lint → typecheck → test → build → budget
```

Run it before you push. It is the same gate CI runs, in the order that fails fastest.

Per app:

```bash
cd stacks/rspack-react/product
pnpm check          # just this app
pnpm test:watch     # while you work
pnpm build
```

## Adding a page

1. Add a route to `src/routes.tsx`:

```tsx
{
  id: 'product.compare',                 // must match the chunk name below
  path: 'compare',
  interactive: false,                    // true only if it needs client JS
  lazy: () => import(/* webpackChunkName: "product-compare" */ './Compare'),
}
```

The `id` and the `webpackChunkName` must agree. That pairing is what lets the shell send
*only this route's* CSS and JS — get it wrong and the page silently ships its siblings'
assets too.

2. Write the page. It takes data as props and renders. That is all it does:

```tsx
import type { PageProps, RouteLoaderArgs } from '@mf-eval/contracts';
import { Container, Card } from '@mf-eval/design';

export interface CompareData { /* … */ }

export function loader({ request }: RouteLoaderArgs): CompareData { /* runs on the server */ }

export function Component({ data }: PageProps<CompareData>) {
  return <Container>{/* … */}</Container>;
}
```

3. Add a test next to it (`Compare.test.ts` for the loader).

You do not register the route anywhere else. The shell mounts whatever your `routes.tsx`
exports — that is why you can add a page without anyone redeploying the shell.

## Adding client interactivity

Your page is server-rendered and never hydrated, so a `useEffect` in it will never run. To
make something interactive you attach a **behaviour** to the markup the server already
produced.

1. Write `src/behaviors/<name>.ts`:

```ts
import { defineBehavior } from '@mf-eval/behaviors';

export default defineBehavior('product.compare-bar', (root, ctx) => {
  const bar = root.querySelector('[data-compare-bar]');
  ctx.on(root, 'change', () => {
    bar?.toggleAttribute('data-empty', root.querySelectorAll(':checked').length === 0);
  });
});
```

2. Point at it from the markup:

```tsx
<div data-behavior="product.compare-bar" data-behavior-when="idle" data-testid="compare">
```

That is the whole wiring. There is no config to edit and nothing to register: the build
exposes every file in `src/behaviors/`, and the name *is* the address — `product.compare-bar`
resolves to `product/behaviors/compare-bar`. The shell reads the rendered HTML, so the module
is downloaded on the pages that use it and on no others.

Three things to get right, all of which the linter or a budget will tell you about:

- **It must work without it.** Disable JavaScript and use the page. A behaviour improves a
  capability that already exists; it never provides one. If the enhanced version makes a
  control redundant, mark that control `data-fallback-only` and CSS will hide it — do not
  hide it from the behaviour, because moving something after the page has painted is a
  layout shift.
- **No props and no serialized data.** Read the DOM, a cookie, or the URL.
- **3 kB gzip.** Over that, it probably wanted to be an island — ask first.

Use `ctx.on` / `ctx.observe` / `ctx.cleanup` rather than raw `addEventListener`: they unwind
on teardown automatically, which is the part everyone forgets — and `pnpm bench` fails the run
if you register a listener that cannot be torn down.

`pnpm bench` also reports what your behaviour cost: its size, how long setup took, how much of
its code actually executed, and whether it moved anything on the page. You do not have to add
it to anything; it is measured because it exists.

Full reference, including when to load and when to reach for an island instead:
`docs/interactivity.md`.

## Rules the linter will enforce, and why

These are not style preferences. Each one is a bug we shipped.

**No `useState`, `useEffect`, `window` or `document` in a page component.** Pages are
rendered once on the server and never hydrated, so that code never runs. You get a
component that silently does nothing. Interactivity goes in a behaviour —
`docs/interactivity.md`.

**`data-behavior` must name a behaviour you actually ship.** `<your-app>.<file>`, with
`src/behaviors/<file>.ts` next to it. A typo fails only in the console, on a page that
otherwise looks finished — which is why the linter checks it instead of you.

**No importing another app.** The moment `product` imports from `faq`, the two can no longer
deploy independently. Share through `@mf-eval/contracts` (types, state) or
`@mf-eval/design` (UI).

**No bare `<button>` or `<input>`.** Use `@mf-eval/design`. Four button styles nobody owns is
how a design system dies.

**No raw colours.** `#0d6a53` in your app is the value that survives a rebrand and nobody can
find. Use `text-brand-700` or `var(--color-…)`.

**`data-testid` on every control.** Tests select by test id; without one they fall back to
copy, and then break when someone rewords a label.

**No `JSON.stringify` into markup.** Embedding a payload makes the response user-specific,
which stops a CDN sharing it, and duplicates data the server already rendered.

## Budgets

`budget.json` in your app is a hard limit, checked on every build. If you go over, either
make it smaller or raise the number in a commit that says why. Content pages should ship
close to zero JavaScript — if that number climbs, something started hydrating that should
not have.

## Where things go

| You are writing | It goes |
|---|---|
| A page | `src/<Page>.tsx` + an entry in `src/routes.tsx` |
| Something only your app uses | `src/` — never exported |
| Something two apps need | propose it for `@mf-eval/design` |
| Client interactivity | `src/behaviors/<name>.ts` — see `docs/interactivity.md` |
| Per-user state | it is client-only; talk to the platform team first |
