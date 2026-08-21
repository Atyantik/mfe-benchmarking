import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const server = require('./dist/node/index.js');
const render = server.render ?? server.default?.render;
if (typeof render !== 'function') {
  throw new Error(`node build did not export render(). exports: ${Object.keys(server)}`);
}

const app = new Hono();
app.use('/static/*', serveStatic({ root: './dist/web' }));

app.get('/', async (c) => {
  const t0 = performance.now();
  const html = await render();
  const ssrMs = (performance.now() - t0).toFixed(1);
  return c.html(
    `<!doctype html><html><head><meta charset="utf-8"><title>spike</title>` +
      `<meta name="x-ssr-ms" content="${ssrMs}"></head>` +
      `<body><div id="root">${html}</div>` +
      `<script src="/static/js/index.js"></script></body></html>`,
  );
});

serve({ fetch: app.fetch, port: 3000 }, (i) => console.log(`shell on :${i.port}`));
