/**
 * Registry service. Reads registry.json on every request so a "deployment" is just
 * a file edit — no restart, which is exactly what the independence assertions need
 * to exercise (spec: packages/bench § Refresh and independence).
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { resolveRegistry, type RegistryFile, type TargetEnv } from './index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = process.env.MF_REGISTRY_FILE ?? join(HERE, '..', 'registry.json');
const PORT = Number(process.env.MF_REGISTRY_PORT ?? 4000);

const app = new Hono();

app.get('/registry', async (c) => {
  const env: TargetEnv = c.req.query('env') === 'node' ? 'node' : 'web';
  const cohort = c.req.query('cohort') ?? c.req.header('x-mf-cohort') ?? 'default';

  let file: RegistryFile;
  try {
    file = JSON.parse(await readFile(REGISTRY_PATH, 'utf8')) as RegistryFile;
  } catch (err) {
    // Fail loudly here; the SHELL is responsible for failing open to its last-known-good
    // snapshot. Papering over it here would hide a broken registry from every consumer.
    return c.json({ error: `registry unreadable: ${(err as Error).message}` }, 503);
  }

  const resolved = resolveRegistry(file, env, cohort);
  const etag = `W/"${createHash('sha256').update(JSON.stringify(resolved)).digest('hex').slice(0, 16)}"`;

  if (c.req.header('if-none-match') === etag) return c.body(null, 304);

  c.header('ETag', etag);
  c.header('Cache-Control', 'public, max-age=5, stale-while-revalidate=60');
  c.header('Access-Control-Allow-Origin', '*');
  return c.json(resolved);
});

app.get('/health', (c) => c.text('ok'));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[registry] :${info.port} reading ${REGISTRY_PATH}`);
});
