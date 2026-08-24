/**
 * The asset origin — a stand-in for a DAM or image CDN.
 *
 * Its own service, on its own port, for two reasons. Large sites serve media from a separate
 * origin — a DAM or an image CDN — and keeping it separate lets the bench attribute media
 * bytes on their own rather than mixed into whichever app happened to reference them.
 *
 * Everything here is content-addressed by build, so everything is immutable.
 */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

const PORT = Number(process.env.MF_MEDIA_PORT ?? 3105);
const app = new Hono();

app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  await next();
});
app.use('*', async (c, next) => {
  await next();
  // Derivatives never change in place: a new encode is a new build and a new path.
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  // Byte-range requests are what make a <video> seekable; without this the browser
  // downloads the whole file before it can play a second of it.
  c.header('Accept-Ranges', 'bytes');
});

app.get('/__health', (c) => c.json({ ok: true }));
// Deliberately NOT compressed: AVIF, WebP, JPEG and MP4 are already compressed, and gzip
// over them costs CPU to add bytes.
app.use('/*', serveStatic({ root: './dist' }));

serve({ fetch: app.fetch, port: PORT }, (i) => console.log(`[media] :${i.port}`));
