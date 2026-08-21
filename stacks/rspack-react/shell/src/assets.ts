/**
 * SSR asset injection — docs/constraints.md §6.
 *
 * Without this, a cold load of a federated route costs three STRICTLY SEQUENTIAL round
 * trips before one remote component can render, and hydration waits on all of them:
 *
 *     mf-manifest.json  ->  remoteEntry.js  ->  the exposed module's chunk
 *
 * The server already knows all three URLs at render time — they are in the manifest it
 * just read. Emitting preload tags collapses the chain. Modern.js does this for you;
 * on a custom server it is ours to build.
 *
 * Note this reads the WEB manifests, not the node ones the server rendered with. They
 * are different artifacts with different asset lists (docs/spike-rspack-ssr.md § trap 5).
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
  scripts: string[];
  styles: string[];
}

const manifestCache = new Map<string, { manifest: Manifest; at: number }>();
const MANIFEST_TTL_MS = 5_000;

function join(publicPath: string, path: string | undefined, file: string): string {
  const base = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
  const mid = path ? `${path.replace(/\/$/, '')}/` : '';
  return `${base}${mid}${file}`;
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

/**
 * Build the preload plan for the remotes and exposed modules this render touched.
 *
 * `usedExposes` is keyed by remote name, e.g. { cart: ['./MiniCart'] }. Passing only
 * what was actually rendered matters: preloading every expose of every remote would
 * trade one waterfall for a pile of wasted bytes.
 */
export async function buildPreloadPlan(
  webEntries: RegistryEntry[],
  usedExposes: Record<string, string[]>,
): Promise<PreloadPlan> {
  const scripts: string[] = [];
  const styles: string[] = [];

  await Promise.all(
    webEntries.map(async (entry) => {
      const manifest = await getManifest(entry.entry);
      if (!manifest) return;

      const publicPath = manifest.metaData.publicPath ?? new URL('.', entry.entry).href;

      // 1. The container itself — always needed before anything else can load.
      scripts.push(
        join(publicPath, manifest.metaData.remoteEntry.path, manifest.metaData.remoteEntry.name),
      );

      // 2. Shared deps this remote will pull (react, react-dom, the contracts).
      for (const shared of manifest.shared ?? []) {
        for (const f of shared.assets?.js?.sync ?? []) scripts.push(join(publicPath, undefined, f));
        for (const f of shared.assets?.css?.sync ?? []) styles.push(join(publicPath, undefined, f));
      }

      // 3. Only the exposes this render actually used.
      const wanted = new Set(usedExposes[entry.name] ?? []);
      for (const expose of manifest.exposes ?? []) {
        if (!wanted.has(expose.path)) continue;
        for (const f of expose.assets?.js?.sync ?? []) scripts.push(join(publicPath, undefined, f));
        for (const f of expose.assets?.css?.sync ?? []) styles.push(join(publicPath, undefined, f));
      }
    }),
  );

  return { scripts: [...new Set(scripts)], styles: [...new Set(styles)] };
}

export function renderPreloadTags(plan: PreloadPlan): string {
  return [
    ...plan.styles.map((href) => `<link rel="stylesheet" href="${href}">`),
    // `as="script"` not modulepreload: MF web remoteEntry is a classic script
    // (remoteEntry.type === "global"), not an ES module.
    ...plan.scripts.map((href) => `<link rel="preload" as="script" href="${href}" crossorigin>`),
  ].join('');
}
