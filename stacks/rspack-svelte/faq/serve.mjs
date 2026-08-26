import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';

const PORT = 3101;
const app = new Hono();
// Nothing was compressed before this: every measurement was raw bytes on the wire.
app.use('*', compress());
app.use('*', async (c, next) => { c.header('Access-Control-Allow-Origin', '*'); await next(); });
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

app.use('/ssr/*', serveStatic({ root: './dist/node', rewriteRequestPath: (p) => p.replace(/^\/ssr/, '') }));
app.use('/*', serveStatic({ root: './dist/web' }));
serve({ fetch: app.fetch, port: PORT }, (i) => console.log(`[faq] :${i.port}`));
