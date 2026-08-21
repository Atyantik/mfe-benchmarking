import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

const app = new Hono();
app.use('*', async (c, next) => { c.header('Access-Control-Allow-Origin', '*'); await next(); });
app.use('/ssr/*', serveStatic({ root: './dist/node', rewriteRequestPath: (p) => p.replace(/^\/ssr/, '') }));
app.use('/*', serveStatic({ root: './dist/web' }));
serve({ fetch: app.fetch, port: 3103 }, (i) => console.log(`[cart] :${i.port}`));
