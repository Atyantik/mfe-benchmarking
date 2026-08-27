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


---

## The hero poster, and a preload that did nothing

Two findings, both produced by adding network throttling to the bench and neither visible
before it. On localhost bytes are free, so every route reported the same LCP no matter what it
transferred.

**The one image that is an LCP element was the only one skipping the pipeline.** Every
photograph here ships as five widths across three formats. The hero video's poster shipped as a
single JPEG, and it is the largest contentful paint on the busiest page. Worse, `scale`
preserves the SOURCE aspect ratio, so a 4:3 photograph became a 1280×960 poster behind a
1280×720 video — a third of every downloaded pixel cropped away by `object-fit: cover` and
never seen.

| | bytes |
|---|---:|
| Original: 1280×960 JPEG | 180 kB |
| Cropped to 16:9 | 140 kB |
| AVIF at q45 | **110 kB** |

**AVIF, and not WebP, because it was measured.** Against the 140 kB cropped JPEG, WebP is
*larger* at every quality tried — 149 kB at q40, 166 kB at q50, 201 kB at q70. Re-encoding an
already-crushed JPEG of a noisy zoomed photograph spends bytes preserving its artefacts. AVIF
handles that content properly and takes a further 21%.

Net effect on the home page: LCP fell from **2964 ms to 2644 ms** on Slow 4G.

**And a preload that did nothing.** The poster is the `poster` of a `<video preload="none">` —
exactly the shape a preload scanner deprioritises — so `<link rel="preload" as="image"
fetchpriority="high">` looked like the obvious next move. Measured over three runs it moved LCP
from 2644 ms to 2636 ms: nothing.

The reason is worth keeping. On a 200 kB/s connection the page is **bandwidth-bound, not
discovery-bound**. Reordering the queue cannot help when the queue itself is the constraint.
The preload was reverted rather than shipped, because code that measures as a no-op is code
nobody can later justify removing.

`/` still exceeds Google's 2500 ms "good" threshold at ~2.64 s on Slow 4G. That is a true
property of a hero built around a video on a media-heavy page, it affects both stacks equally,
and it is tracked rather than tuned away — see `VITALS_BUDGET` in
`packages/bench/src/lib/topology.mjs`.
