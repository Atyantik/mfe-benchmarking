/**
 * Shell SSR server.
 *
 * .mjs on purpose: the app's package.json must NOT declare "type": "module", because
 * MF emits CommonJS for the node build and Node would misparse it, silently yielding
 * empty exports (docs/spike-rspack-ssr.md § trap 2). Keeping ESM here instead.
 */
import { readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { startMetrics } from '@mf-eval/host-metrics';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MF_SHELL_PORT ?? 3100);
const ORIGIN = process.env.MF_SHELL_ORIGIN ?? `http://localhost:${PORT}`;

const { render, loadStats } = require('./dist/node/index.js');
if (typeof render !== 'function') {
  throw new Error('node build did not export render() — check the async boundary');
}

/** Filenames are content-hashed (required for revalidate() hash-diffing). Discover them. */
function discoverAssets() {
  const jsDir = join(HERE, 'dist/web/static/js');
  const cssDir = join(HERE, 'dist/web/static/css');
  const clientScript = readdirSync(jsDir).find((f) => /^index\.[a-f0-9]+\.js$/.test(f));
  if (!clientScript) throw new Error(`no client entry found in ${jsDir}`);
  // Rsbuild emits the shell's CSS under static/css/async/, not static/css/. A
  // non-recursive read found nothing, so the shell's own layout CSS was never in the
  // <head> at all and only arrived once the client bundle executed — a guaranteed flash
  // of unstyled content on every single page.
  const styles = [];
  const walk = (dir, prefix) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const f of entries) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) walk(full, `${prefix}${f}/`);
      else if (f.endsWith('.css')) styles.push(`${ORIGIN}/static/css/${prefix}${f}`);
    }
  };
  walk(cssDir, '');
  return { clientScript: `${ORIGIN}/static/js/${clientScript}`, styles };
}

let assets = discoverAssets();

/**
 * Metrics start before the first request, so a measurement window can bracket exactly the
 * work under test rather than everything since boot.
 */
const metrics = startMetrics();

const app = new Hono();
app.use('*', async (c, next) => {
  await next();
  metrics.countRequest();
});

/**
 * Write a heap snapshot to disk. Opt-in via MF_HEAP_DUMP=1.
 *
 * A benchmark that can measure a leak but not locate one is only half a tool: "the heap grew
 * 700 MB" is a finding nobody can act on without knowing what is in it.
 */
if (process.env.MF_HEAP_DUMP === '1') {
  app.post('/__heap', async (c) => {
    const { writeHeapSnapshot } = await import('node:v8');
    const file = writeHeapSnapshot();
    return c.json({ file });
  });
}

/** What this host costs to run. Read as a delta; POST to /reset to start a fresh window. */
app.get('/__metrics', (c) => c.json(metrics.snapshot()));
app.get('/__loads', async (c) => c.json(await loadStats()));
app.post('/__metrics/reset', (c) => {
  metrics.reset();
  return c.json({ ok: true });
});
// Nothing was compressed before this: every measurement was raw bytes on the wire.
app.use('*', compress());
/**
 * Caching policy. Two classes of asset, and the distinction is load-bearing:
 *
 *   Content-hashed files (name.<hash>.js/css) are immutable — a change produces a new
 *   URL, so they can be cached for a year and never revalidated.
 *
 *   remoteEntry.js and mf-manifest.json are NOT hashed: their URLs are the stable
 *   contract the registry points at, and a redeploy replaces them in place. They must
 *   revalidate every time or independent deployment silently stops working — a team
 *   would ship and nobody would see it.
 */
const HASHED = /\.[a-f0-9]{8,}\.(js|css)$/;
app.use('*', async (c, next) => {
  await next();
  const path = new URL(c.req.url).pathname;
  if (HASHED.test(path)) c.header('Cache-Control', 'public, max-age=31536000, immutable');
  else if (path.endsWith('remoteEntry.js') || path.endsWith('mf-manifest.json')) {
    c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  }
});

app.use('/static/*', serveStatic({ root: './dist/web' }));

/**
 * Server-side remote refresh. `revalidate()` diffs remoteEntry content hashes and
 * resets the Node require cache so a redeployed remote is picked up without a restart.
 *
 * Known upstream gap: full remote/chunk/entry/shared eviction (`removeRemote`) is
 * PR #4824, still open — filed because hot-swapping remotes on the server leaks
 * memory. The bench measures RSS across N swaps precisely because of this.
 */
app.post('/__revalidate', async (c) => {
  const started = performance.now();
  try {
    const { revalidate } = await import('@module-federation/node/utils');
    const shouldReload = await revalidate();
    // Our own resolved-module cache is keyed on the registry set, which a same-version
    // redeploy does not change — so it has to be dropped explicitly or the server keeps
    // serving the previous build's components while reporting a successful revalidate.
    const { clearRemoteCache } = require('./dist/node/index.js');
    if (typeof clearRemoteCache === 'function') clearRemoteCache();
    return c.json({
      ok: true,
      shouldReload,
      ms: Number((performance.now() - started).toFixed(2)),
      rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
    });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

app.get('/__health', (c) =>
  c.json({ ok: true, rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)) }),
);

app.get('*', async (c) => {
  try {
    const out = await render({
      url: new URL(c.req.url, ORIGIN).href,
      cohort: c.req.query('cohort') ?? c.req.header('x-mf-cohort') ?? 'default',
      clientScript: assets.clientScript,
      shellStyles: assets.styles,
    });

    c.header('server-timing', `ssr;dur=${out.ssrMs.toFixed(1)}`);
    // The document carries no per-user data, so a CDN may share it; keep the TTL
    // short so a remote redeploy shows up quickly.
    c.header('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
    // Lets the bench assert that a static page really shipped no client JS.
    c.header('x-mf-personalized', String(out.personalizedCount));
    if (out.degraded) c.header('x-mf-registry', 'stale');
    if (out.failures.length) c.header('x-mf-remote-failures', out.failures.map((f) => f.name).join(','));
    if (!out.html) return c.body(null, out.status);
    return c.html(out.html, out.status);
  } catch (err) {
    console.error('[shell] render failed', err);
    return c.text(`render failed: ${String(err)}`, 500);
  }
});

serve({ fetch: app.fetch, port: PORT }, (i) => {
  console.log(`[shell] :${i.port} -> ${assets.clientScript}`);
});
