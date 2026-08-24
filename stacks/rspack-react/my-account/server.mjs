/**
 * my-account host server.
 *
 * A second, independent application. It serves its own documents for `/my-account/*`, its
 * own per-user API, and its own assets — and it is reached through the edge exactly as the
 * storefront is, so the two are the same origin to a browser and share the cart cookie.
 *
 * .mjs on purpose: this app's package.json must NOT declare "type": "module", because MF
 * emits CommonJS for the node build and Node would misparse it, silently yielding empty
 * exports (docs/spike-rspack-ssr.md § trap 2).
 */
import { readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MF_ACCOUNT_PORT ?? 3120);
/** Where the browser reaches this host — the edge, not this process. */
const PUBLIC_ORIGIN = process.env.MF_PUBLIC_ORIGIN ?? 'http://localhost:3100';
/** Where this host's own assets are served from. Its own origin, like every remote. */
const ASSET_ORIGIN = process.env.MF_ACCOUNT_ORIGIN ?? `http://localhost:${PORT}`;

const { render, accountData, sessionApi } = require('./dist/node/index.js');
if (typeof render !== 'function') {
  throw new Error('node build did not export render() — check the async boundary');
}
// Behind the same async boundary as render(), because they reach shared modules.
const fixtures = await accountData();
const auth = await sessionApi();

function discoverAssets() {
  const jsDir = join(HERE, 'dist/web/static/js');
  const cssDir = join(HERE, 'dist/web/static/css');
  const clientScript = readdirSync(jsDir).find((f) => /^index\.[a-f0-9]+\.js$/.test(f));
  if (!clientScript) throw new Error(`no client entry found in ${jsDir}`);
  const styles = [];
  const walk = (dir, prefix) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const f of entries) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) walk(full, `${prefix}${f}/`);
      else if (f.endsWith('.css')) styles.push(`${ASSET_ORIGIN}/static/css/${prefix}${f}`);
    }
  };
  walk(cssDir, '');
  return { clientScript: `${ASSET_ORIGIN}/static/js/${clientScript}`, styles };
}

const assets = discoverAssets();

const app = new Hono();
app.use('*', compress());
// The document is same-origin (served through the edge) but this host's assets are not,
// exactly like every remote's. A module script is always fetched in CORS mode.
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  await next();
});

const HASHED = /\.[a-f0-9]{8,}\.(js|css)$/;
app.use('*', async (c, next) => {
  await next();
  const path = new URL(c.req.url).pathname;
  if (HASHED.test(path)) c.header('Cache-Control', 'public, max-age=31536000, immutable');
});

app.use('/static/*', serveStatic({ root: './dist/web' }));

/**
 * The account API. PER-USER, and therefore never rendered into the document.
 *
 * `private, no-store` is the point: these responses must never reach a shared cache. The
 * document they belong to carries no personalization at all, which is what lets the
 * document itself be cached for everyone (docs/decision-log.md D12).
 */
const api = new Hono();
api.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'private, no-store');
});

api.get('/summary', (c) => c.json(fixtures.summary()));
api.get('/orders', (c) => c.json({ orders: fixtures.ORDERS }));
api.get('/orders/:id', (c) => {
  const order = fixtures.ORDERS.find((o) => o.id === c.req.param('id'));
  return order ? c.json(order) : c.json({ error: 'not found' }, 404);
});
api.get('/profile', (c) => c.json(fixtures.PROFILE));
app.route('/my-account/api', api);

app.get('/__health', (c) =>
  c.json({ ok: true, rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)) }),
);

/** Display identity from the session. Never the session itself. */
const viewerFrom = (session) =>
  session
    ? {
        name: session.name,
        initial: session.name.charAt(0).toUpperCase(),
        accountNumber: 'NG-448120',
      }
    : null;

const renderPage = async (c, extra = {}) => {
  const out = await render({
    url: new URL(c.req.url, PUBLIC_ORIGIN).href,
    cohort: c.req.query('cohort') ?? c.req.header('x-mf-cohort') ?? 'default',
    clientScript: assets.clientScript,
    shellStyles: assets.styles,
    ...extra,
  });
  c.header('server-timing', `ssr;dur=${out.ssrMs.toFixed(1)}`);
  c.header('x-mf-zone-route', out.routeId ?? 'none');
  c.header('x-mf-personalized', out.personalized ? '1' : '0');
  if (out.degraded) c.header('x-mf-registry', 'stale');
  if (out.failures.length) c.header('x-mf-remote-failures', out.failures.map((f) => f.name).join(','));
  return out;
};

/**
 * The sign-in page.
 *
 * `private, no-store` even though the markup is identical for everyone: it is the page a
 * shared cache is most likely to be holding when a visitor's state changes underneath it,
 * and a cached login page shown to someone who just signed in is the classic version of that
 * bug. Cheap to render, so nothing is lost.
 */
app.get('/login', async (c) => {
  const next = auth.safeNext(c.req.query('next'));
  // Already signed in? There is nothing to ask.
  if (auth.readSession(c.req.header('cookie'))) return c.redirect(next, 303);
  const out = await renderPage(c, { login: { next } });
  c.header('Cache-Control', 'private, no-store');
  return c.html(out.html, 200);
});

app.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const next = auth.safeNext(String(body.next ?? ''));
  const email = String(body.email ?? '');
  const result = auth.authenticate({ email, password: String(body.password ?? '') });

  if (!result.ok) {
    const out = await renderPage(c, { login: { next, error: result.error, email } });
    c.header('Cache-Control', 'private, no-store');
    // 422, not 200: the request was understood and rejected, and a bench measuring the
    // failure path should be able to tell it apart from a successful render.
    return c.html(out.html, 422);
  }

  for (const cookie of auth.sessionCookies(result.session)) c.header('Set-Cookie', cookie, { append: true });
  // 303 so the browser re-issues as GET — a POST left in history means a reload re-submits.
  return c.redirect(next, 303);
});

app.post('/logout', (c) => {
  for (const cookie of auth.clearedCookies()) c.header('Set-Cookie', cookie, { append: true });
  return c.redirect('/', 303);
});

/**
 * The gate.
 *
 * One place, in front of everything under the prefix, rather than a check inside each page.
 * A redirect costs a round trip and no render; a component-level check costs a full render
 * of a page the visitor may not see.
 */
app.use('/my-account/*', async (c, next) => {
  if (auth.readSession(c.req.header('cookie'))) return next();
  const target = new URL(c.req.url).pathname + new URL(c.req.url).search;
  return c.redirect(`/login?next=${encodeURIComponent(target)}`, 302);
});

app.get('*', async (c) => {
  try {
    const session = auth.readSession(c.req.header('cookie'));
    const out = await renderPage(c, { viewer: viewerFrom(session) });
    /**
     * A personalized document is PRIVATE, and says so.
     *
     * The server knows who is asking, renders their name into the first paint, and therefore
     * must not let a shared cache hand that response to anybody else. This is the opposite
     * decision from the storefront's, and deliberately so: those documents are identical for
     * every visitor and are cached for all of them.
     *
     * It costs nothing here. An account page is behind a login and is never indexed, so
     * there was never a shared audience to cache it for — only a per-visitor one, which is
     * what `private` describes.
     */
    if (out.personalized) {
      c.header('Cache-Control', 'private, no-store');
    } else {
      c.header('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
      c.header('Vary', 'Accept-Encoding');
    }
    return c.html(out.html, out.status);
  } catch (err) {
    console.error('[my-account] render failed', err);
    return c.text(`render failed: ${String(err)}`, 500);
  }
});

serve({ fetch: app.fetch, port: PORT }, (i) => {
  console.log(`[my-account] :${i.port} -> ${assets.clientScript}`);
});
