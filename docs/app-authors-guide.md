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

## Rules the linter will enforce, and why

These are not style preferences. Each one is a bug we shipped.

**No `useState`, `useEffect`, `window` or `document` in a page component.** Pages are
rendered once on the server and never hydrated, so that code never runs. You get a
component that silently does nothing. Interactivity goes in a behaviour (below).

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
| Per-user state | it is client-only; talk to the platform team first |
