/**
 * The edge — one origin, two hosts.
 *
 * In production this is a CDN rule or a load-balancer path pattern; here it is thirty lines
 * of Node so the topology is real in development rather than described in a document.
 *
 *   /my-account/*   ->  my-account host  (:3120)   client-routed application
 *   everything else ->  storefront host  (:3110)   server-rendered documents
 *
 * Why an edge at all, rather than two origins:
 *
 *  1. **One origin means one cookie.** The cart survives the walk from a product page into
 *     the account area, because both hosts are `localhost:3100` to the browser. On separate
 *     origins that needs a cookie domain, CORS credentials, and a conversation about
 *     third-party cookie policy that has no good ending.
 *  2. **The boundary stays invisible to the visitor.** `/my-account` is a link, not a
 *     redirect to another domain.
 *  3. **Routing is configuration, not code.** Moving `/quotes` to a third host is a rule
 *     here, deployed without touching either application — the same property the registry
 *     gives remotes, applied to hosts.
 *
 * Compression is terminated here, exactly as a CDN would: `accept-encoding` is stripped on
 * the way upstream so the origins answer in plain text, and the edge compresses once. Two
 * layers of gzip would otherwise arrive double-encoded, which fails in a way that looks like
 * a corrupt bundle rather than a proxy bug.
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { compress } from 'hono/compress';

const PORT = Number(process.env.MF_EDGE_PORT ?? 3100);

/** First match wins. Order is the routing table. */
const ACCOUNT = process.env.MF_ACCOUNT_ORIGIN ?? 'http://localhost:3120';
const ROUTES = [
  { prefix: '/my-account', origin: ACCOUNT },
  // Sign-in belongs to whoever owns sessions, which is the account host. Putting it on the
  // storefront would mean two applications both able to mint a session.
  { prefix: '/login', origin: ACCOUNT },
  { prefix: '/logout', origin: ACCOUNT },
  { prefix: '/', origin: process.env.MF_STOREFRONT_ORIGIN ?? 'http://localhost:3110' },
];

const upstreamFor = (pathname) =>
  ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`) || r.prefix === '/')
    ?.origin ?? ROUTES[ROUTES.length - 1].origin;

const app = new Hono();
app.use('*', compress());

app.get('/__edge', (c) => c.json({ ok: true, routes: ROUTES }));

app.all('*', async (c) => {
  const incoming = new URL(c.req.url);
  const target = new URL(incoming.pathname + incoming.search, upstreamFor(incoming.pathname));

  const headers = new Headers(c.req.raw.headers);
  headers.delete('accept-encoding');
  headers.delete('host');
  // Origins render absolute URLs against the PUBLIC origin, so they need to know it.
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

  try {
    const upstream = await fetch(target, {
      method: c.req.method,
      headers,
      body: c.req.method === 'GET' || c.req.method === 'HEAD' ? undefined : c.req.raw.body,
      // Redirects belong to the browser: following them here would hide the 302 that gates
      // the account area, and the login journey is partly a measurement OF that redirect.
      redirect: 'manual',
      duplex: 'half',
    });
    const out = new Headers(upstream.headers);
    // The body has already been decoded by the client; re-declaring an encoding would make
    // the browser try to decode it a second time.
    out.delete('content-encoding');
    out.delete('content-length');
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (err) {
    return c.text(`edge: ${target.origin} unreachable — ${String(err)}`, 502);
  }
});

serve({ fetch: app.fetch, port: PORT }, (i) => {
  console.log(`[edge] :${i.port}`);
  for (const r of ROUTES) console.log(`  ${r.prefix.padEnd(12)} -> ${r.origin}`);
});
