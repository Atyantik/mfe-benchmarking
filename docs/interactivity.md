# Client interactivity

Every page on this site is fully rendered by the server and is complete before any
JavaScript arrives. Interactivity is added *on top* of that markup, never in place of it.

That is the whole idea, and it is the reason a catalogue page costs 0.5 kB of page
JavaScript instead of 120 kB: **the server already rendered it, so the client's job is to
attach behaviour to it, not to render it again.**

---

## The two tiers

### Tier 1 — a behaviour. This is the default.

A small module bound to a server-rendered subtree. It reads what it needs from the DOM that
is already on screen.

```ts
// product/src/behaviors/gallery.ts
import { defineBehavior } from '@mf-eval/behaviors';

export default defineBehavior('product.gallery', (root, ctx) => {
  const main = root.querySelector<HTMLImageElement>('[data-gallery-main]');
  if (!main) return;
  for (const thumb of root.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]')) {
    ctx.on(thumb, 'click', () => {
      main.src = thumb.dataset.src ?? main.src;
    });
  }
});
```

```tsx
<div data-behavior="product.gallery" data-behavior-when="visible" data-testid="gallery">
  {/* server-rendered, complete, usable with no JavaScript at all */}
</div>
```

- **No props, and nothing serialized into the HTML.** State that must survive lives in the
  DOM, a cookie, or the URL. Embedding a payload would make the response user-specific and
  stop a CDN sharing it, and it would duplicate what the server already rendered.
- **Typically 0.5–2 kB**, no React, no framework on the page at all.
- Downloaded **only on pages whose markup contains the attribute**, from the remote that
  owns it. Your behaviour ships on your deploy.
- Everything registered through `ctx` is torn down automatically.

### Tier 2 — an island. Personalized state only.

A real React component mounted into a server-rendered placeholder. The cart is the only one,
and adding a second is a decision made in review, not by reflex.

Use an island **only** when all of these hold:

1. The state is per-user, so it can never be server-rendered without making every response
   unshareable by a CDN.
2. It is genuinely stateful — not a toggle, a tab strip or a scroll effect.
3. Recreating it from a cookie or the URL on load is the correct behaviour.

If you are reaching for an island for anything else, the answer is a behaviour.

---

## When it loads: `data-behavior-when`

Declared per element, because the same behaviour is urgent in one place and irrelevant in
another.

| Value | Attaches | Use for |
|---|---|---|
| `immediate` | as soon as the client script runs | controls the visitor may hit instantly, and anything with a `data-fallback-only` control |
| `idle` *(default)* | at the first idle moment | almost everything |
| `visible` | 200 px before it scrolls into view | galleries, reveals, anything below the fold |
| `interaction` | on first pointer/focus/click | expensive things behind a deliberate action |
| `media:(min-width: 64rem)` | when the query matches | behaviour that only exists at one breakpoint |

`interaction` **holds the click that triggered it** — the event is prevented, buffered while
the module downloads, then replayed once the behaviour has attached. Without that, the first
press would be swallowed and the control would look broken exactly once, which is the
hardest kind of bug to notice. If the module fails to load, the held event is replayed
anyway, into the plain server-rendered markup — which still works.

---

## Working without JavaScript

Every page must work with JavaScript disabled. That is not a courtesy to a rare visitor; it
is the proof that the server rendering is real and that nothing important is hiding behind a
download that might not arrive.

So a behaviour never *provides* a capability — it improves one that already exists. A filter
panel already submits through a form; the behaviour makes it submit on change instead of
requiring an Apply button.

When the enhanced version makes a control redundant, mark it `data-fallback-only`:

```tsx
<Button type="submit" data-fallback-only data-testid="apply-filters">Apply filters</Button>
```

CSS then hides it *when scripting is enabled*, before the first paint. **Never hide it from
the behaviour itself** — removing a laid-out element after the page has painted shifts
everything below it, and CLS is one of the numbers this architecture exists to protect. If
the behaviour fails to load, the same CSS brings the control back. The rule lives in
`packages/design/src/tokens/enhancement.css`; the control must sit inside the
`[data-behavior]` element that replaces it.

---

## What the platform does for you

You write the file and the attribute. Nothing else.

| | |
|---|---|
| Exposing the module | `src/behaviors/*.ts` is scanned at build time — no config to edit |
| Finding it at runtime | the name *is* the address: `product.gallery` → `product/behaviors/gallery` |
| Loading it | the shell scans the rendered HTML and fetches only what this page uses |
| Preloading it | injected into `<head>` for the pages that use it, and no others |
| Tearing it down | every `ctx.on` / `ctx.observe` / `ctx.cleanup` unwinds on teardown |
| Failure | contained: state goes to `failed`, the server markup is untouched, the page works |

There is no registry of behaviours and no manifest to keep in sync, which is why there is
nothing to forget to update.

---

## Rules the linter enforces

- `data-behavior` must be `<your-app>.<file>` and `src/behaviors/<file>.ts` must exist.
  A typo would otherwise fail only in the console, on a page that looks finished.
- It must name **your** app. Pointing at another team's remote would make your page download
  their code and tie your deploy to theirs. If two apps need the same behaviour, promote it
  to `@mf-eval/design`.
- `data-behavior-when` must be a real strategy. An unrecognised value silently falls back to
  `idle`.
- A behaviour root needs a `data-testid`.
- Each behaviour has a **3 kB gzip budget**, checked on every build. Over it, the answer is
  almost always that it should have been an island — or that it is doing work the server
  should have done.

## How this is measured

`pnpm bench` runs `packages/bench/src/behaviors.mjs` against a running stack. It measures every
behaviour automatically — there is nothing to register, so a new one is measured the moment it
exists — and it fails the run rather than reporting a number nobody reads.

```
pnpm dev            # start the stack
pnpm bench          # 52 checks over 11 sections
```

What it will tell you about your behaviour:

| | |
|---|---|
| size | raw, gzip and brotli of your chunk, against the 3 kB budget |
| timing | wait / fetch / attach split, per instance, and where attach lands relative to FCP |
| execution | how much of your code actually ran, by V8 precise coverage — 0% means it was downloaded for nothing |
| isolation | whether any page fetched it that did not declare it |
| cost | long tasks and layout shift attributed to YOUR root, not to the page in general |
| hygiene | whether every listener you added carries an abort signal, and whether teardown aborted it |
| resilience | whether the page still works with JavaScript off |

The strategy matrix drives the real runtime through all five strategies by rewriting
`data-behavior-when` in the served HTML, so `visible`, `interaction` and `media:` are verified
end to end even when nothing on the site uses them yet.

Results land in `results/behaviors.site.json` with the per-instance detail behind every number.

## Checklist for a new behaviour

1. `src/behaviors/<name>.ts`, default-exporting `defineBehavior('<app>.<name>', …)`.
2. `data-behavior` + `data-behavior-when` + `data-testid` on the element it enhances.
3. The page still works with JavaScript disabled — actually check, in the browser.
4. If the enhancement makes a control redundant, mark it `data-fallback-only`.
5. A test that attaches it, acts on it, and tears it down.
