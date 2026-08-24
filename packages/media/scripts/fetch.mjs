/**
 * Fetch the original photographs, once.
 *
 * Pinned by exact Commons file title so a re-fetch is reproducible, and every licence and
 * author is recorded on the way past — CC BY and CC BY-SA both require attribution, and
 * attribution collected later is attribution that never happens.
 *
 * Originals are gitignored. `sources.json` plus this script is what makes the set
 * reproducible without committing 60 MB of photographs to a benchmark repo.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGINALS = join(HERE, 'originals');
const API = 'https://commons.wikimedia.org/w/api.php';
/** Wide enough to derive every responsive step without upscaling anything. */
const FETCH_WIDTH = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const UA = { 'user-agent': 'mf-eval-bench/1.0 (local benchmark fixtures)' };

/**
 * Commons rate-limits, and it answers with a plain-text apology rather than a status code —
 * so `await res.json()` throws a SyntaxError about an unexpected 'Y' and the run dies
 * halfway through with half the fixtures on disk.
 */
async function api(url, attempt = 1) {
  const res = await fetch(url, { headers: UA });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (attempt > 5) throw new Error(`Commons kept refusing: ${text.slice(0, 80)}`);
    const wait = 2_000 * 2 ** attempt;
    console.log(`  ...rate limited, waiting ${wait / 1000}s`);
    await sleep(wait);
    return api(url, attempt + 1);
  }
}

/**
 * A download is only accepted if it is actually a photograph.
 *
 * Thumbnail generation fails intermittently and returns a 2 kB error document with a 200.
 * Written to disk unchecked, that becomes a "fixture" that silently makes every image
 * measurement meaningless — the exact failure this whole exercise is meant to remove.
 */
const MIN_BYTES = 40_000;
function looksLikeJpeg(buf) {
  return buf.length >= MIN_BYTES && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/**
 * Try every URL we have for an image, patiently.
 *
 * Commons generates thumbnails on demand and rate-limits that generation, so a cold fetch of
 * seventeen images reliably loses one or two — which failed CI on the first run with
 * "could not get a usable image". The ORIGINAL file is a static object and needs no
 * generation, so it is the fallback rather than a second guess at the same thing.
 *
 * Backoff is exponential and honours `Retry-After`, because hammering a service that just
 * asked for a pause is how a flaky fetch becomes a blocked one.
 */
async function download(urls, attempt = 1) {
  const candidates = urls.filter(Boolean);
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (looksLikeJpeg(buf)) return buf;
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      if (retryAfter > 0) await sleep(Math.min(retryAfter, 60) * 1_000);
    } catch {
      /* transient; the backoff below covers it */
    }
  }
  if (attempt >= 6) return null;
  const wait = 2_000 * 2 ** attempt;
  console.log(`  ...retrying in ${wait / 1000}s (attempt ${attempt + 1}/6)`);
  await sleep(wait);
  return download(urls, attempt + 1);
}

const { images } = JSON.parse(readFileSync(join(HERE, 'sources.json'), 'utf8'));
mkdirSync(ORIGINALS, { recursive: true });

const credits = [];
let fetched = 0;
let skipped = 0;
const failures = [];

for (const entry of images) {
  const target = join(ORIGINALS, `${entry.id}.jpg`);
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${entry.file}`,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: String(FETCH_WIDTH),
  });

  const data = await api(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) {
    console.error(`  MISSING  ${entry.id}  ${entry.file}`);
    await sleep(1200);
    continue;
  }
  const md = info.extmetadata ?? {};
  credits.push({
    id: entry.id,
    category: entry.category,
    title: entry.file,
    author: clean(md.Artist?.value) || 'Unknown',
    licence: clean(md.LicenseShortName?.value) || 'Unknown',
    licenceUrl: clean(md.LicenseUrl?.value),
    source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(entry.file)}`,
    originalWidth: info.width,
    originalHeight: info.height,
  });

  // Re-fetch anything previously written that is too small to be a photograph.
  const already = existsSync(target) && looksLikeJpeg(readFileSync(target));
  if (already) {
    skipped += 1;
  } else {
    // Thumbnail first because it is smaller; original second because it always exists.
    const buf = await download([info.thumburl, info.url]);
    if (!buf) {
      failures.push(`${entry.id} (${entry.file})`);
      console.error(`  FAILED   ${entry.id.padEnd(8)} could not get a usable image`);
    } else {
      writeFileSync(target, buf);
      fetched += 1;
      console.log(`  ${entry.id.padEnd(8)} ${(buf.length / 1024).toFixed(0).padStart(5)} kB  ${entry.file.slice(0, 52)}`);
    }
  }
  await sleep(2_500);
}

writeFileSync(join(HERE, 'credits.json'), `${JSON.stringify(credits, null, 2)}\n`);

const lines = [
  '# Image attribution',
  '',
  'Every photograph below is used under the licence stated, which permits reuse with',
  'attribution. They are benchmark fixtures: the point is realistic photographic weight and',
  'dimensions, not the specific subject.',
  '',
  '| id | photograph | author | licence |',
  '|---|---|---|---|',
  ...credits.map(
    (c) => `| \`${c.id}\` | [${c.title}](${c.source}) | ${c.author} | ${c.licence} |`,
  ),
  '',
];
writeFileSync(join(HERE, 'ATTRIBUTION.md'), `${lines.join('\n')}\n`);
console.log(`\n${fetched} fetched, ${skipped} already present, ${credits.length} credited`);
console.log('wrote credits.json and ATTRIBUTION.md');
if (failures.length) {
  console.error(`\n${failures.length} source(s) could not be downloaded:`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('Fixtures are incomplete; the media bench will fail rather than measure a gap.');
  process.exitCode = 1;
}
