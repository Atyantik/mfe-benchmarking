/**
 * Static inventory of every behaviour in the workspace.
 *
 * Read from disk rather than from a registry, because there is no registry — the build
 * scans `src/behaviors/` and the name is the address. That is a good property, but it means
 * the only way to know what exists is to look, and the only way to know it BUILT is to find
 * its chunk in the manifest. A behaviour whose source exists and whose chunk does not is a
 * broken deploy that no page-level check would catch.
 */
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { HOSTS, REMOTES } from './topology.mjs';

/**
 * Every app that can own a behaviour, from the topology.
 *
 * Hardcoded here, this list went stale the moment chrome existed: `chrome.account` was
 * declared in the markup, shipped correctly, and reported as "unknown" because the inventory
 * had never heard of the app that owns it.
 */
export const APPS = [
  ...REMOTES.map((r) => ({ name: r.name, dir: r.dir, port: r.port })),
  ...HOSTS.map((h) => ({ name: h.name, dir: h.dir, port: h.port })),
];

const gzip = (buf) => gzipSync(buf, { level: 9 }).length;
const brotli = (buf) =>
  brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length },
  }).length;

/**
 * @returns {{behaviors: Record<string, object>, problems: string[]}}
 *   keyed `<app>.<name>`, the same string the markup uses.
 */
export function inventory(root) {
  const behaviors = {};
  const problems = [];

  for (const app of APPS) {
    const appDir = join(root, app.dir);
    const srcDir = join(appDir, 'src/behaviors');
    const sources = existsSync(srcDir)
      ? readdirSync(srcDir).flatMap((f) => {
          const m = /^([a-z0-9-]+)\.tsx?$/.exec(f);
          return m ? [{ file: m[1], path: join(srcDir, f) }] : [];
        })
      : [];

    const manifestPath = join(appDir, 'dist/web/mf-manifest.json');
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, 'utf8'))
      : null;
    if (!manifest && sources.length > 0) {
      problems.push(`${app.name}: has ${sources.length} behaviour(s) but no built manifest`);
    }

    // What the BUILD exposed, which is what the browser can actually reach.
    const exposed = new Map();
    for (const expose of manifest?.exposes ?? []) {
      const m = /^\.\/behaviors\/([a-z0-9-]+)$/.exec(expose.path);
      if (!m) continue;
      const files = expose.assets?.js?.sync ?? [];
      exposed.set(m[1], files);
    }

    for (const source of sources) {
      const key = `${app.name}.${source.file}`;
      const src = readFileSync(source.path);
      const files = exposed.get(source.file);
      if (!files) {
        problems.push(`${key}: source exists but the build exposed no chunk for it`);
      }
      const chunks = (files ?? []).map((rel) => {
        const abs = join(appDir, 'dist/web', rel);
        const body = existsSync(abs) ? readFileSync(abs) : null;
        return {
          url: `http://localhost:${app.port}/${rel}`,
          file: rel,
          raw: body?.length ?? 0,
          gzip: body ? gzip(body) : 0,
          brotli: body ? brotli(body) : 0,
          missing: !body,
        };
      });
      for (const c of chunks) if (c.missing) problems.push(`${key}: manifest names ${c.file}, which is not on disk`);

      behaviors[key] = {
        key,
        app: app.name,
        file: source.file,
        sourcePath: source.path.slice(root.length + 1),
        sourceBytes: src.length,
        sourceLines: src.toString('utf8').split('\n').length,
        chunks,
        raw: chunks.reduce((n, c) => n + c.raw, 0),
        gzip: chunks.reduce((n, c) => n + c.gzip, 0),
        brotli: chunks.reduce((n, c) => n + c.brotli, 0),
      };
      exposed.delete(source.file);
    }

    // Left over: exposed by a stale build, with no source behind it.
    for (const orphan of exposed.keys()) {
      problems.push(`${app.name}.${orphan}: exposed by the build but has no source — stale dist`);
    }
  }

  return { behaviors, problems };
}

/** Map a chunk URL back to the behaviour that owns it. */
export function chunkIndex(behaviors) {
  const byUrl = new Map();
  for (const b of Object.values(behaviors)) {
    for (const c of b.chunks) byUrl.set(c.url, b);
  }
  return byUrl;
}
