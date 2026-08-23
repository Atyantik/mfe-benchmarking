/**
 * SSR asset injection — docs/constraints.md §6.
 *
 * Without this, a cold load of a federated route costs three STRICTLY SEQUENTIAL round
 * trips before one remote component renders, and hydration waits on all of them:
 *
 *     mf-manifest.json  ->  remoteEntry.js  ->  the exposed module's chunk
 *
 * Three rules learned the hard way, each one a bug we shipped first:
 *
 *  1. NEVER preload a remote's `shared` assets. Every remote emits its own fallback copy
 *     of react, react-router and the contracts. At runtime MF's share scope executes
 *     exactly one provider's copy — but `<link rel=preload>` *forces the download*
 *     regardless. Preloading them all made /faq fetch product's 186 kB react-router copy
 *     that would never execute.
 *
 *  2. Route-content CSS lives in the manifest's `async` bucket, not `sync`, because the
 *     page component sits behind `lazy()`. Reading only `sync` is why stylesheets
 *     arrived after hydration instead of in the head.
 *
 *  3. MF's manifest is per-EXPOSE, not per-route. A remote exposing `./routes` reports
 *     every one of its routes' assets in one flat `async` list, so /faq would pull
 *     /faq/contact's CSS. The fix is on the remote side: each route names its chunk after
 *     its route id (webpackChunkName), which makes the flat list attributable again.
 *     See RouteDescriptor.id in @mf-eval/contracts.
 */
import type { RegistryEntry } from '@mf-eval/contracts';

interface ManifestAssets {
  js?: { sync?: string[]; async?: string[] };
  css?: { sync?: string[]; async?: string[] };
}

interface Manifest {
  metaData: {
    publicPath?: string;
    remoteEntry: { name: string; path?: string };
  };
  shared?: { name: string; assets?: ManifestAssets }[];
  exposes?: { name: string; path: string; assets?: ManifestAssets }[];
}

export interface PreloadPlan {
  /** Render-blocking stylesheets, in cascade order. */
  styles: string[];
  /** Scripts to warm so hydration does not rediscover them a round trip at a time. */
  scripts: string[];
}

/** What one render needs from one remote. */
export interface RemoteNeed {
  /** Exposed module paths this render touched, e.g. ['./routes'] or ['./MiniCart']. */
  exposes: string[];
  /**
   * Chunk names of the routes ACTUALLY rendered, e.g. ['faq-index'].
   *
   * Empty for a remote whose descriptor was merged into the router but whose pages were
   * not rendered — that remote contributes its tiny `./routes` module and nothing else.
   * This is what keeps /faq from downloading product's page code, and /faq from
   * downloading /faq/contact's CSS.
   */
  routeChunks: string[];
}

export type UsedExposes = Record<string, RemoteNeed>;

const manifestCache = new Map<string, { manifest: Manifest; at: number }>();
const MANIFEST_TTL_MS = 5_000;

function join(publicPath: string, file: string): string {
  const base = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
  return `${base}${file}`;
}

/** `static/css/async/faq-index.3ad0e0.css` belongs to chunk `faq-index`. */
function chunkOf(file: string): string {
  const base = file.split('/').pop() ?? file;
  return base.split('.')[0] ?? '';
}

async function getManifest(url: string): Promise<Manifest | null> {
  const cached = manifestCache.get(url);
  if (cached && Date.now() - cached.at < MANIFEST_TTL_MS) return cached.manifest;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const manifest = (await res.json()) as Manifest;
    manifestCache.set(url, { manifest, at: Date.now() });
    return manifest;
  } catch {
    // Preloading is an optimisation. Never fail a page render over it.
    return null;
  }
}

export async function buildPreloadPlan(
  webEntries: RegistryEntry[],
  used: UsedExposes,
): Promise<PreloadPlan> {
  // Cascade order matters: chrome (header/cart) before page content, so a page can
  // override chrome rather than racing it. Component remotes are the chrome.
  const ordered = [...webEntries].sort(
    (a, b) => (a.kind === 'component' ? 0 : 1) - (b.kind === 'component' ? 0 : 1),
  );

  const perRemote = await Promise.all(
    ordered.map(async (entry) => {
      const scripts: string[] = [];
      const styles: string[] = [];
      const need = used[entry.name];
      if (!need || need.exposes.length === 0) return { scripts, styles };

      const manifest = await getManifest(entry.entry);
      if (!manifest) return { scripts, styles };
      const publicPath = manifest.metaData.publicPath ?? new URL('.', entry.entry).href;

      const re = manifest.metaData.remoteEntry;
      scripts.push(join(publicPath, re.path ? `${re.path.replace(/\/$/, '')}/${re.name}` : re.name));

      const wanted = new Set(need.exposes);
      const rendered = new Set(need.routeChunks);

      for (const expose of manifest.exposes ?? []) {
        if (!wanted.has(expose.path)) continue;
        const a = expose.assets;

        // sync = the exposed module itself. Always needed — for a route remote this is
        // the descriptor, which the shell merges into the router on every page.
        for (const f of a?.js?.sync ?? []) scripts.push(join(publicPath, f));
        for (const f of a?.css?.sync ?? []) styles.push(join(publicPath, f));

        // async = the lazy() chunks behind it, one per route. Take ONLY the ones whose
        // chunk name matches a route this render actually produced.
        for (const f of a?.js?.async ?? []) {
          if (rendered.has(chunkOf(f))) scripts.push(join(publicPath, f));
        }
        for (const f of a?.css?.async ?? []) {
          if (rendered.has(chunkOf(f))) styles.push(join(publicPath, f));
        }
      }

      // Deliberately NOT iterating manifest.shared — rule 1 in the file header.
      return { scripts, styles };
    }),
  );

  return {
    styles: [...new Set(perRemote.flatMap((r) => r.styles))],
    scripts: [...new Set(perRemote.flatMap((r) => r.scripts))],
  };
}

export function renderPreloadTags(plan: PreloadPlan): string {
  return [
    // Real stylesheets in <head>, so first paint is styled instead of flashing unstyled
    // until the JS that happens to own the CSS finally executes.
    ...plan.styles.map((href) => `<link rel="stylesheet" href="${href}">`),
    // `as="script"`, not modulepreload: an MF web remoteEntry is a classic script
    // (remoteEntry.type === "global"), not an ES module.
    ...plan.scripts.map((href) => `<link rel="preload" as="script" href="${href}" crossorigin>`),
  ].join('');
}
