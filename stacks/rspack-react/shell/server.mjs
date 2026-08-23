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

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MF_SHELL_PORT ?? 3100);
const ORIGIN = process.env.MF_SHELL_ORIGIN ?? `http://localhost:${PORT}`;

const { render } = require('./dist/node/index.js');
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

const app = new Hono();
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
