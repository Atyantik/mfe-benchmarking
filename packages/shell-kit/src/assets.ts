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
    // `type` is how the manifest states whether this container is an ES module or a
    // classic script, which decides modulepreload vs preload-as-script.
    remoteEntry: { name: string; path?: string; type?: string };
  };
  shared?: { name: string; assets?: ManifestAssets }[];
  exposes?: { name: string; path: string; assets?: ManifestAssets }[];
}

export interface PreloadPlan {
  /** Render-blocking stylesheets, in cascade order. */
  styles: string[];
  /** Classic scripts to warm — `<link rel=preload as=script>`. */
  scripts: string[];
  /** ES modules to warm — `<link rel=modulepreload>`. Wrong hint = no cache hit. */
  modules: string[];
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
  /**
   * Whether this remote's SCRIPTS are needed at all.
   *
   * False for route remotes under the MPA shell: their pages are server-rendered and
   * never hydrated, so the component code will never execute in the browser. Preloading
   * it would download a file that cannot run — the exact waste this whole exercise is
   * about. Their CSS is still required, because the server-rendered markup uses it.
   */
  scriptsNeeded?: boolean;
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
      const modules: string[] = [];
      const styles: string[] = [];
      const need = used[entry.name];
      if (!need || need.exposes.length === 0) return { scripts, modules, styles };

      const manifest = await getManifest(entry.entry);
      if (!manifest) return { scripts, modules, styles };
      // The manifest states whether this container is an ES module or a classic script,
      // so the hint follows the artefact instead of being guessed.
      const isModule = manifest.metaData.remoteEntry.type === 'module';
      const js = isModule ? modules : scripts;
      const publicPath = manifest.metaData.publicPath ?? new URL('.', entry.entry).href;

      const wantScripts = need.scriptsNeeded !== false;
      if (wantScripts) {
        const re = manifest.metaData.remoteEntry;
        js.push(join(publicPath, re.path ? `${re.path.replace(/\/$/, '')}/${re.name}` : re.name));
      }

      const wanted = new Set(need.exposes);
      const rendered = new Set(need.routeChunks);

      for (const expose of manifest.exposes ?? []) {
        if (!wanted.has(expose.path)) continue;
        const a = expose.assets;

        // sync = the exposed module itself. Always needed — for a route remote this is
        // the descriptor, which the shell merges into the router on every page.
        if (wantScripts) for (const f of a?.js?.sync ?? []) js.push(join(publicPath, f));
        for (const f of a?.css?.sync ?? []) styles.push(join(publicPath, f));

        // async = the lazy() chunks behind it, one per route. Take ONLY the ones whose
        // chunk name matches a route this render actually produced.
        if (wantScripts) {
          for (const f of a?.js?.async ?? []) {
            if (rendered.has(chunkOf(f))) js.push(join(publicPath, f));
          }
        }
        for (const f of a?.css?.async ?? []) {
          if (rendered.has(chunkOf(f))) styles.push(join(publicPath, f));
        }
      }

      // Deliberately NOT iterating manifest.shared — rule 1 in the file header.
      return { scripts, modules, styles };
    }),
  );

  return {
    styles: dedupeByContentHash(perRemote.flatMap((r) => r.styles)),
    scripts: [...new Set(perRemote.flatMap((r) => r.scripts))],
    modules: [...new Set(perRemote.flatMap((r) => r.modules))],
  };
}

/**
 * Drop stylesheets that are byte-identical to one already in the list.
 *
 * A personalized slot ships two exposes — the live component and its placeholder — and
 * both import the same CSS module, so the bundler emits two files with different names
 * and the SAME content hash. Loading both is pure duplication. The hash segment of the
 * filename is the identity, so identical hashes mean identical bytes.
 */
function dedupeByContentHash(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const file = url.split('/').pop() ?? url;
    const parts = file.split('.');
    // name.<hash>.css -> the hash is the second-to-last segment.
    const hash = parts.length >= 3 ? parts[parts.length - 2] : file;
    const key = hash ?? file;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

export function renderPreloadTags(plan: PreloadPlan): string {
  return [
    // Real stylesheets in <head>, so first paint is styled instead of flashing unstyled
    // until the JS that happens to own the CSS finally executes.
    ...plan.styles.map((href) => `<link rel="stylesheet" href="${href}">`),
    // `as="script"`, not modulepreload: an MF web remoteEntry is a classic script
    // (remoteEntry.type === "global"), not an ES module.
    //
    // NO `crossorigin` on classic preloads. A preload only satisfies a later request when
    // the CORS modes match, and Module Federation's script loader does not set
    // crossOrigin. With the attribute here the preloaded copy was unusable and every
    // remote script was downloaded twice — remoteEntry.js included, on every page.
    ...plan.scripts.map((href) => `<link rel="preload" as="script" href="${href}">`),
    // ES modules are always fetched in CORS mode, so modulepreload MUST carry
    // crossorigin — the mirror image of the classic-script rule above.
    ...plan.modules.map((href) => `<link rel="modulepreload" href="${href}" crossorigin>`),
  ].join('');
}
