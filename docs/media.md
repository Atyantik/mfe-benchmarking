# Media — the reference profile, and why the fixtures match it

A Core Web Vitals benchmark run against a page with no images is measuring a page that does
not exist. LCP on a text-only layout is a number about paragraphs; on a real site it is
almost always an image or a video. So the fixtures here are real photographs and a real
video, sized to a profile measured from a production storefront rather than invented.

## The profile

Measured with a headless browser against a large, widely-used enterprise commerce site. The
site is not named: the numbers are a realistic target, not a competitive claim, and nothing
of theirs is redistributed here.

| | measured |
|---|---:|
| LCP element, home | **a video**, 881 kB |
| images in layout, home | 29 |
| ...with `width` and `height` | **15 of 29** |
| ...with `srcset` | **0 of 29** |
| total image weight, home | 976 kB across 77 requests |
| largest single image | 295 kB |
| script | 18.3 MB across 548 requests |

Two things in that table are the whole reason it is worth writing down. **Half the images do
not reserve their box**, which is where a real site's CLS comes from. And **not one image
offers a second width**, so every phone downloads the desktop file. Both are ordinary, both
are invisible without measurement, and both are things this repo sets out to do better and
then prove.

The 18.3 MB of script is not a target. It is a reminder of what "enterprise micro-frontend"
means in the wild.

## What the fixtures do with it

`packages/media` builds to that profile deliberately:

- **A video hero**, encoded to ~630 kB — inside the 881 kB the profile sets, so our LCP is
  not flattered by a lighter fixture.
- **17 real photographs**, AVIF/WebP/JPEG at five widths each, so `srcset` has something real
  to choose from.
- **Intrinsic dimensions in the manifest**, so every `<img>` reserves its box.
- **An inline 16px placeholder** per image, so a slow one shows colour rather than a hole.

Budgets in `packages/bench/src/lib/topology.mjs` are set from the profile's worst cases:
300 kB for a single image, 1.1 MB per route, 950 kB for the hero video. `pnpm --filter
@mf-eval/bench media` fails the build on a breach.

## Sourcing and licences

Photographs come from Wikimedia Commons under CC0, CC BY or CC BY-SA. `sources.json` pins
each by exact file title so a re-fetch is byte-reproducible; `scripts/fetch.mjs` records every
author and licence into `ATTRIBUTION.md` on the way past, because attribution collected later
is attribution that never happens. Credits render on the page, not just in a repository file.

Originals and derivatives are gitignored — 36 MB of source photographs do not belong in a
benchmark repository. `pnpm media` rebuilds the whole set from `sources.json`.

The subject matter is incidental. What the benchmark needs is real photographic entropy at
realistic weights and dimensions, and any real photograph provides that.
