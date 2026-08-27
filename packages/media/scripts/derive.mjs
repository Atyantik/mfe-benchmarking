/**
 * Derivatives — the responsive image set the site actually serves.
 *
 * Built to match a MEASURED reference profile rather than an invented one (docs/media.md):
 * a ~900 kB video as the hero LCP, roughly a megabyte of imagery per page, a largest single
 * image near 300 kB. A benchmark against fixtures lighter than the real thing is a benchmark
 * that proves nothing.
 *
 * What it emits per source, and why each part matters to a measurement:
 *
 *   widths 320/640/960/1280/1920   so `srcset` has something real to choose from. The
 *                                  reference profile ships ZERO srcset, which is precisely
 *                                  what this repo exists to do better and then prove.
 *   avif, webp, jpeg               three formats, so the bench can price modern encoding
 *                                  instead of assuming it.
 *   intrinsic width/height         recorded into the manifest so every <img> can carry
 *                                  width/height and reserve its box. Half the reference
 *                                  profile's images do not, which is where its CLS comes from.
 *   LQIP                           a 16px base64 JPEG, small enough to inline, so a slow
 *                                  image has something in its box instead of a hole.
 *
 * ffmpeg does the resizing and JPEG encoding; cwebp and avifenc do the modern formats.
 * No node image library, so nothing to install and nothing to keep patched.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGINALS = join(HERE, 'originals');
const DIST = join(HERE, 'dist');

const WIDTHS = [320, 640, 960, 1280, 1920];
/** Tuned so the 1280 JPEG lands near the reference profile's largest image, ~200-300 kB. */
const QUALITY = { jpeg: 4, webp: 78, avif: 45 };

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

function probe(file) {
  const out = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file,
  ]).toString().trim();
  const [w, h] = out.split(',').map(Number);
  return { width: w, height: h };
}

function resizeJpeg(source, target, width, quality) {
  run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', source,
    // Even dimensions and a proper Lanczos downscale; the default is visibly softer.
    '-vf', `scale=${width}:-2:flags=lanczos`,
    '-q:v', String(quality), target,
  ]);
}

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
const size = (f) => statSync(f).size;

// ---------------------------------------------------------------------------

if (!existsSync(ORIGINALS)) {
  console.error('No originals. Run `pnpm --filter @mf-eval/media fetch` first.');
  process.exit(1);
}
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'img'), { recursive: true });
mkdirSync(join(DIST, 'video'), { recursive: true });

const credits = existsSync(join(HERE, 'credits.json'))
  ? JSON.parse(readFileSync(join(HERE, 'credits.json'), 'utf8'))
  : [];
const creditOf = (id) => credits.find((c) => c.id === id);

const sources = readdirSync(ORIGINALS).filter((f) => f.endsWith('.jpg')).sort();
const manifest = { images: {}, video: {}, generatedAt: null };
let total = 0;

console.log(`\nderiving ${sources.length} image(s)\n`);
console.log('  id        intrinsic     jpeg@1280    webp@1280    avif@1280');

for (const file of sources) {
  const id = file.replace(/\.jpg$/, '');
  const source = join(ORIGINALS, file);
  const { width: ow } = probe(source);
  const outDir = join(DIST, 'img', id);
  mkdirSync(outDir, { recursive: true });

  const entry = {
    id,
    // The intrinsic ratio of the LARGEST derivative, which is what width/height must encode.
    width: 0,
    height: 0,
    aspectRatio: 0,
    widths: [],
    formats: {},
    bytes: {},
    credit: creditOf(id) ?? null,
  };

  for (const w of WIDTHS) {
    // Never upscale: a 320px source blown up to 1920 is bytes with no information in them.
    if (w > ow) continue;
    const jpeg = join(outDir, `${w}.jpg`);
    resizeJpeg(source, jpeg, w, QUALITY.jpeg);
    const dims = probe(jpeg);

    const webp = join(outDir, `${w}.webp`);
    run('cwebp', ['-quiet', '-q', String(QUALITY.webp), jpeg, '-o', webp]);
    const avif = join(outDir, `${w}.avif`);
    run('avifenc', ['--min', '0', '--max', '63', '-q', String(QUALITY.avif), '-s', '6', jpeg, avif]);

    entry.widths.push(w);
    entry.bytes[w] = { jpeg: size(jpeg), webp: size(webp), avif: size(avif) };
    total += size(avif);
    if (w >= entry.width) {
      entry.width = dims.width;
      entry.height = dims.height;
    }
  }
  entry.aspectRatio = Number((entry.width / entry.height).toFixed(4));
  entry.formats = { avif: 'image/avif', webp: 'image/webp', jpeg: 'image/jpeg' };

  // A 16px-wide JPEG, inlined. Small enough that it costs nothing; big enough that a slow
  // image has colour in its box rather than a hole.
  const lqipFile = join(outDir, 'lqip.jpg');
  resizeJpeg(source, lqipFile, 16, 12);
  entry.lqip = `data:image/jpeg;base64,${readFileSync(lqipFile).toString('base64')}`;
  rmSync(lqipFile);

  const at = entry.bytes[1280] ?? entry.bytes[entry.widths.at(-1)] ?? {};
  console.log(
    `  ${id.padEnd(9)} ${`${entry.width}x${entry.height}`.padEnd(12)} ` +
      `${kb(at.jpeg ?? 0).padStart(9)}    ${kb(at.webp ?? 0).padStart(9)}    ${kb(at.avif ?? 0).padStart(9)}`,
  );
  manifest.images[id] = entry;
}

/**
 * The hero video — because the reference profile's LCP element IS a video, and a benchmark whose heaviest
 * element is a paragraph is not measuring the same page.
 *
 * Composed from a still with a slow pan so it is deterministic and needs no third source.
 * Encoded twice: H.264 for reach, VP9 for weight, plus a poster the browser can paint
 * immediately — a video with no poster paints nothing until the first frame decodes.
 */
console.log('\ncomposing hero video');
{
  const still = join(ORIGINALS, 'hero-02.jpg');
  const mp4 = join(DIST, 'video', 'hero.mp4');
  const webm = join(DIST, 'video', 'hero.webm');
  const poster = join(DIST, 'video', 'hero-poster.jpg');
  const posterAvif = join(DIST, 'video', 'hero-poster.avif');

  /**
   * Six seconds at 1280x720, encoded to land near 900 kB.
   *
   * That number is not a preference — it is the reference profile's measured hero video
   * weight (881 kB). A fixture three times heavier would make our LCP look worse than the real
   * site's for no reason, and a fixture three times lighter would make it look better. Both
   * are ways of not measuring anything.
   */
  const common = [
    '-y', '-loglevel', 'error', '-loop', '1', '-i', still, '-t', '6',
    // Slow zoom, 25 fps. `d=150` is the number of frames the effect spans.
    '-vf', "scale=2560:-2,zoompan=z='min(zoom+0.0006,1.15)':d=150:s=1280x720:fps=25,format=yuv420p",
  ];
  run('ffmpeg', [...common, '-c:v', 'libx264', '-preset', 'slow', '-crf', '34',
    '-maxrate', '1200k', '-bufsize', '2400k', '-movflags', '+faststart', mp4]);
  run('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '46', '-row-mt', '1', webm]);
  /**
   * The poster is encoded HARDER than a gallery image, not softer.
   *
   * It is the largest contentful paint on the home page, it is on screen for a fraction of a
   * second before the video replaces it, and at gallery quality it was 385 kB — bigger than
   * the reference profile's worst image and bigger than the video it introduces. Quality that
   * nobody has time to see is bytes in front of the LCP.
   *
   * CROPPED to the video's aspect ratio, which it previously was not. `scale` preserves the
   * SOURCE ratio, so a 4:3 photograph became a 1280x960 poster behind a 1280x720 video: a third
   * of every downloaded pixel was cropped away by `object-fit: cover` and never seen. Found by
   * measuring on a throttled connection, where the poster is the LCP element and those pixels
   * cost about a quarter of a second.
   */
  run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', still,
    '-vf', 'scale=1280:-2:flags=lanczos,crop=1280:720',
    '-q:v', '12', poster,
  ]);
  /**
   * And an AVIF beside it, which is what the browser will actually take.
   *
   * `<video poster>` accepts any image the browser can decode. The photographs have had AVIF
   * and WebP derivatives since the pipeline was written; the one image that is an LCP element
   * on the busiest page was the only one still shipping as JPEG alone.
   *
   * AVIF and not WebP, because it was measured rather than assumed. Against the 140 kB cropped
   * JPEG: WebP is LARGER at every quality tried (149 kB at q40, 201 kB at q70) — re-encoding an
   * already-crushed JPEG of a noisy zoomed photograph spends bytes preserving its artefacts.
   * AVIF handles that content properly: 110 kB at q45, a further 21%.
   */
  run('avifenc', ['--min', '0', '--max', '63', '-q', String(QUALITY.avif), '-s', '6', poster, posterAvif]);

  const posterDims = probe(poster);
  manifest.video.hero = {
    id: 'hero',
    width: 1280,
    height: 720,
    aspectRatio: Number((1280 / 720).toFixed(4)),
    poster: {
      // AVIF first: it is what a browser takes, and what the LCP is paid in.
      path: 'video/hero-poster.avif',
      width: posterDims.width,
      height: posterDims.height,
      bytes: size(posterAvif),
      /** Kept for anything that cannot decode AVIF, and as the record of what it replaced. */
      fallback: { path: 'video/hero-poster.jpg', bytes: size(poster) },
    },
    // Ordered by MEASURED weight, not by the usual assumption that VP9 wins. On this
    // content it does not — a slow zoom over a noisy photograph encodes badly in VP9 — and
    // a browser takes the first source it supports, so a wrong order ships the heavier file
    // to everyone who could have had the lighter one.
    sources: [
      { path: 'video/hero.webm', type: 'video/webm', bytes: size(webm) },
      { path: 'video/hero.mp4', type: 'video/mp4', bytes: size(mp4) },
    ].sort((a, b) => a.bytes - b.bytes),
    credit: creditOf('hero-02') ?? null,
  };
  console.log(
    `  mp4 ${kb(size(mp4))}   webm ${kb(size(webm))}   ` +
      `poster ${kb(size(posterAvif))} avif (jpeg fallback ${kb(size(poster))})`,
  );
}

manifest.generatedAt = new Date().toISOString();
writeFileSync(join(HERE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nwrote manifest.json — ${Object.keys(manifest.images).length} images, avif total ${kb(total)}`);
