/**
 * Shared Rsbuild + Module Federation config for every app in the rspack-react stack.
 *
 * This exists to make the six traps from docs/spike-rspack-ssr.md structurally
 * impossible to reintroduce across 4 apps. Read that doc before changing anything here —
 * four of the six fail with error messages that point nowhere near the cause.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { RsbuildConfig, RsbuildPlugin, Rspack } from '@rsbuild/core';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { pluginSass } from '@rsbuild/plugin-sass';
import type { moduleFederationPlugin } from '@module-federation/sdk';

type MFOptions = moduleFederationPlugin.ModuleFederationPluginOptions;

/**
 * The OBJECT form of `shared`, deliberately excluding the array form MF also accepts.
 *
 * We merge shared maps with object spread. Spreading an array into an object produces
 * `{ 0: 'react' }` — sharing silently stops working, every remote bundles its own React,
 * and nothing errors. Constraining the type here makes that unrepresentable.
 */
type SharedMap = Exclude<NonNullable<MFOptions['shared']>, readonly unknown[]>;
/**
 * The object form of `exposes`.
 *
 * MF accepts an array too, and spreading an array into an object silently produces
 * `{0: ..., 1: ...}` — a config that builds and exposes nothing. Excluding the array form
 * at the type level makes the mistake unrepresentable rather than merely unlikely.
 */
type ExposesMap = Exclude<NonNullable<MFOptions['exposes']>, readonly unknown[]>;

/**
 * Pinned in pnpm-workspace.yaml. MUST be repeated literally in every `shared` entry:
 * MF infers requiredVersion from package.json, which under a pnpm catalog reads
 * "catalog:" and fails every semver match. (Trap 3.)
 */
export const REACT_VERSION = '19.2.8';

export const SHARED_REACT: SharedMap = {
  react: { singleton: true, requiredVersion: REACT_VERSION },
  'react-dom': { singleton: true, requiredVersion: REACT_VERSION },
  // Singleton is load-bearing, not an optimisation: this package holds the React
  // context object that connects the shell's provider to a remote's consumer. Two
  // copies means `useCart` throws, and product can no longer update cart.
  '@mf-eval/contracts': { singleton: true, requiredVersion: false },
  '@mf-eval/react-contracts': { singleton: true, requiredVersion: false },
  /**
   * The asset manifest, shared for SIZE rather than for identity.
   *
   * `@mf-eval/design` re-exports `Picture`, which statically imports this — so every app that
   * touches the design system bundled the entire manifest, including apps that render no
   * images at all. Measured on the account overview: 9.0 kB gzip duplicated across three
   * remotes, of which 5.2 kB is seventeen base64 placeholders that the cart's basket widget
   * has no use for.
   *
   * Sharing it makes that one copy. It is data, not a context object, so a second instance
   * would have been a size problem rather than a correctness one — which is exactly why it
   * went unnoticed until a page composed three remotes at once.
   */
  '@mf-eval/media': { singleton: true, requiredVersion: false },
};

export interface AppPorts {
  /** Port the app's own web assets are served from. */
  web: number;
}

/**
 * MF's own footprint levers (docs/constraints.md §3). ON by default; MF_OPTIMIZE=0 opts out.
 *
 * `externalRuntime` + `provideExternalRuntime` share one runtime-core instead of shipping
 * one per remote. `disableRemote` is applied only to remotes, which in this topology are
 * pure producers — if a remote ever starts CONSUMING another remote, that flag must come
 * off or its remote-loading code will have been stripped.
 */
export const OPTIMIZE = process.env.MF_OPTIMIZE !== '0';

/**
 * Emit native ES modules for the browser. ON by default; MF_ESM=0 opts out.
 *
 * The web output is already modern syntax with no polyfills, but it is delivered as a
 * classic script because a Module Federation web container defaults to
 * `library.type: 'global'`. ESM containers are a different loading path: the host uses
 * native dynamic import() rather than injecting a <script>.
 *
 * The NODE build stays CommonJS regardless — MF emits CJS there and Node would misparse
 * an ESM/CJS mismatch (docs/spike-rspack-ssr.md, trap 2).
 */
export const ESM = process.env.MF_ESM !== '0';

export interface MfAppOptions {
  /** MF container name. Also the registry key. */
  name: string;
  port: number;
  /** Browser entry. */
  clientEntry: string;
  /** Node entry. For a pure remote this can be a stub — the container is what matters. */
  serverEntry: string;
  /** `exposes` for a remote; omit for the host. Behaviours are added automatically. */
  exposes?: ExposesMap;
  /** Absolute path to the app root, used to discover src/behaviors/*. */
  appRoot?: string;
  /**
   * Per-environment `exposes` overrides.
   *
   * Used to ship a DIFFERENT module to the browser than to the server — which is how
   * hydration=off actually removes bytes rather than merely skipping work. The web
   * build exposes an inert route with no path to the page component, so the component
   * and its CSS never enter the client bundle.
   */
  exposesWeb?: ExposesMap;
  exposesNode?: ExposesMap;
  /**
   * Only the HOST leaves this undefined and resolves remotes at runtime from the
   * registry. A build-time `remotes` block would recreate the coupling this repo
   * exists to remove (docs/topology.md § Rule 3).
   */
  remotes?: MFOptions['remotes'];
  /**
   * True for apps consumed over HTTP by another app's Node build.
   *
   * Trap 5/6: a REMOTE's node build needs an absolute assetPrefix so its manifest
   * advertises a real URL. The HOST's node build must NOT have one — it runs
   * in-process, and an http publicPath makes the async-node chunk loader try to
   * fetch its own local chunks.
   */
  isRemote: boolean;
  extraShared?: SharedMap;
  /** Build-time constants, applied to both environments. */
  define?: Record<string, string>;
}

/** Where a remote's Node build is served, mirroring Modern.js's `ssrDir` convention. */
export const SSR_PATH_SEGMENT = 'ssr';

/**
 * Workspace packages ship TypeScript/JSX SOURCE, not compiled output — that is what lets
 * the design system tree-shake per app and share one token definition.
 *
 * Rsbuild excludes node_modules from transforms by default, and pnpm symlinks workspace
 * packages into node_modules, so without this their JSX is passed through untransformed
 * and the server dies with a bare `React is not defined`.
 */
const WORKSPACE_SRC = [
  path.resolve(createRequire(import.meta.url).resolve('@mf-eval/design/package.json'), '..', 'src'),
  path.resolve(createRequire(import.meta.url).resolve('@mf-eval/contracts/package.json'), '..', 'src'),
  path.resolve(createRequire(import.meta.url).resolve('@mf-eval/react-contracts/package.json'), '..', 'src'),
  path.resolve(createRequire(import.meta.url).resolve('@mf-eval/shell-kit/package.json'), '..', 'src'),
  path.resolve(createRequire(import.meta.url).resolve('@mf-eval/media/package.json'), '..', 'src'),
];

/**
 * Every `src/behaviors/*.ts` becomes an exposed module, automatically.
 *
 * Convention over registration: an app author adds a file and marks an element with
 * `data-behavior="<app>.<file>"`. Nothing else to wire, and no central list to forget to
 * update — which is exactly the kind of step a new team member misses.
 *
 * The chunk is named after the behaviour so the shell can attribute it per route, the same
 * mechanism that keeps one route's CSS off another's page (docs/constraints.md §5b).
 */
export function behaviorExposes(appRoot: string): Record<string, string> {
  const dir = path.join(appRoot, 'src/behaviors');
  if (!existsSync(dir)) return {};
  const out: Record<string, string> = {};
  for (const file of readdirSync(dir)) {
    const match = /^([a-z0-9-]+)\.tsx?$/.exec(file);
    if (!match) continue;
    out[`./behaviors/${match[1]}`] = `./src/behaviors/${file}`;
  }
  return out;
}

export function mfConfigs(opts: MfAppOptions): { web: MFOptions; node: MFOptions } {
  // externalRuntime: remotes stop bundling their own runtime-core and read the host's
  // from a global. Pairs with provideExternalRuntime on the host — the flags are useless
  // apart. Only a PURE CONSUMER may provide it: combining it with `exposes` throws.
  //
  // disableRemote: our remotes only expose, they never consume another remote, so the
  // remote-consumption half of the runtime is dead code in them.
  const experiments = OPTIMIZE
    ? opts.isRemote
      ? { externalRuntime: true, optimization: { disableRemote: true } }
      : { provideExternalRuntime: true }
    : undefined;

  const base: MFOptions = {
    name: opts.name,
    filename: 'remoteEntry.js',
    manifest: true,
    ...(experiments ? { experiments } : {}),
    ...(() => {
      const behaviors = opts.appRoot ? behaviorExposes(opts.appRoot) : {};
      const exposes = { ...opts.exposes, ...behaviors };
      return Object.keys(exposes).length > 0 ? { exposes } : {};
    })(),
    ...(opts.remotes ? { remotes: opts.remotes } : {}),
    shared: { ...SHARED_REACT, ...opts.extraShared },
  };
  // Same options both sides today. Kept as two objects because they diverge the moment
  // a host resolves different remote URLs per environment, and because the node build
  // is genuinely a different artifact (remoteEntry type commonjs-module vs global).
  // ESM applies to the BROWSER build only. The node build must stay CommonJS — MF emits
  // CJS there and Node would misparse a mismatch, silently yielding empty exports.
  //
  // `library.type: 'module'` requires the library NAME to be unset; rspack rejects the
  // combination outright with "Library name must be unset".
  const web: MFOptions = ESM
    ? { ...base, library: { type: 'module' }, remoteType: 'module' }
    : { ...base };
  const node: MFOptions = { ...base };
  /**
   * Per-environment exposes MERGE with the shared ones, key by key.
   *
   * They used to replace them wholesale, which is a silent trap: an app that sets
   * `exposesWeb` to vary one entry loses every other expose it declared, the build succeeds,
   * and the missing module only surfaces as a runtime failure on whichever page needed it.
   * Overriding one key should override one key.
   */
  const mergeExposes = (base: MFOptions['exposes'], extra: ExposesMap): ExposesMap => ({
    ...(Array.isArray(base) ? {} : base),
    ...extra,
  });
  if (opts.exposesWeb) web.exposes = mergeExposes(web.exposes, opts.exposesWeb);
  if (opts.exposesNode) node.exposes = mergeExposes(node.exposes, opts.exposesNode);
  return { web, node };
}

/**
 * Scope a remote's stylesheet to the region that remote renders.
 *
 * Every app compiles its own Tailwind, so shared utilities are emitted more than once and
 * the page ends up with several utility stylesheets. Those are ORDER-DEPENDENT: a plain
 * `.hidden` from a remote loaded second silently defeats the shell's `.lg\:block`, because
 * a media query adds no specificity. That is not a hypothetical — it hid the site header's
 * search field and utility bar.
 *
 * Prefixing every rule with `[data-owner="<name>"]` fixes it in both directions: a
 * remote's utilities cannot match anything outside its own subtree, and inside that
 * subtree they outrank the shell's by one attribute selector, which is the behaviour you
 * want. It also gives us the style isolation Module Federation deliberately does not
 * provide (docs/constraints.md §5).
 *
 * Left alone: at-rules that are not style rules, and the document-level selectors a
 * remote should never be emitting in the first place.
 */
interface PostcssRule {
  selectors: string[];
  parent?: { type?: string; name?: string } | undefined;
  source?: { input?: { from?: string } } | undefined;
}

/** A CSS Module already carries its own boundary; see scopeRemoteCss. */
const IS_CSS_MODULE = /\.module\.(s?css|sass|less)$/i;

function scopeRemoteCss(owner: string) {
  const SKIP = /^(:root|html|body|\*|::?[a-z-]*(selection|backdrop|placeholder|marker))/i;
  return {
    postcssPlugin: `mf-scope-${owner}`,
    /**
     * CSS MODULES ARE EXEMPT, and that exemption is the point of the comparison.
     *
     * This plugin exists because utility CSS is global by nature: one remote's `.hidden`
     * beat another remote's `.lg\:block` and silently hid the site header
     * (docs/constraints.md §12). Prefixing every rule with `[data-owner]` is a workaround for
     * a language that has no module boundary.
     *
     * A CSS Module has one. Its class names are already unique to the file that declared
     * them, so scoping them again would add specificity, add bytes, and prove nothing. Left
     * unscoped, they demonstrate whether the boundary actually holds.
     */
    Rule(rule: PostcssRule) {
      if (IS_CSS_MODULE.test(rule.source?.input?.from ?? '')) return;
      const parentName = rule.parent?.type === 'atrule' ? rule.parent.name : undefined;
      if (parentName && /^(keyframes|font-face|property|counter-style)$/i.test(parentName)) return;
      rule.selectors = rule.selectors.map((sel) =>
        SKIP.test(sel.trim()) ? sel : `[data-owner="${owner}"] ${sel}`,
      );
    },
  };
}

/** Native ESM output for the browser build. See the ESM constant for why. */
function toEsmOutput(config: Rspack.Configuration): void {
  // No `experiments.outputModule` — that is a webpack option Rspack 2 does not have, and
  // does not need: `output.module` alone produces real ESM here. Verified by the
  // `export{ … as get, … as init }` tail on remoteEntry.js.
  config.output = {
    ...config.output,
    module: true,
    chunkFormat: 'module',
    chunkLoading: 'import',
    library: { type: 'module' },
  };
}

export function defineMfApp(opts: MfAppOptions, extra: RsbuildConfig = {}): RsbuildConfig {
  const { web: webMf, node: nodeMf } = mfConfigs(opts);
  const origin = `http://localhost:${opts.port}`;

  return {
    ...extra,
    // Each app compiles Tailwind over its own source plus the design package's. Utilities
    // shared between apps are emitted more than once — deliberately. The alternative is a
    // central build that must see every consumer's source, which reintroduces exactly the
    // deploy coupling this repo exists to remove. See docs/design-system.md.
    plugins: [
      ...(extra.plugins ?? []),
      pluginTailwindcss(),
      // Sass is available to every app, for components written as CSS Modules rather than
      // utilities. Both approaches coexist on purpose — see docs/css.md.
      pluginSass(),
    ],
    output: {
      ...extra.output,
      cssModules: {
        /**
         * The generated class name carries the APP NAME.
         *
         * The default identifier is a hash of the file path and the local name, which is
         * *probably* unique across remotes — two teams would have to name a file identically,
         * at an identical relative path, with identical content. "Probably" is the wrong
         * guarantee for a boundary between independently deployed applications, and it fails
         * silently and visually when it does not hold.
         *
         * Including the app name makes a cross-remote collision impossible by construction
         * rather than unlikely by hash. It costs a few bytes per rule and removes an entire
         * class of bug that only appears in production, on the one page where two remotes
         * happen to meet.
         */
        localIdentName: `${opts.name}-[local]-[hash:base64:4]`,
      },
    },
    // The automatic JSX runtime, stated explicitly rather than inherited.
    //
    // Workspace packages ship .tsx source and are pulled in via source.include; once that
    // is set, the JSX runtime must be pinned or some modules compile against the CLASSIC
    // runtime and die at render with a bare `React is not defined` — pointing at the
    // output file, never at the config that caused it.
    tools: {
      ...extra.tools,
      ...(opts.isRemote
        ? { postcss: { postcssOptions: { plugins: [scopeRemoteCss(opts.name)] } } }
        : {}),
      swc: {
        jsc: { transform: { react: { runtime: 'automatic' } } },
      },
    },
    server: { port: opts.port, ...extra.server },
    environments: {
      web: {
        source: {
          include: WORKSPACE_SRC,
          entry: { index: opts.clientEntry },
          define: { ...(opts.define ?? {}), __MF_ESM__: JSON.stringify(ESM) },
        },
        output: {
          target: 'web',
          distPath: { root: 'dist/web' },
          assetPrefix: origin,
          // Required for server-side revalidate() hash-diffing to detect a redeploy
          // at all (docs/constraints.md §2).
          filename: { js: '[name].[contenthash:8].js' },
        },
        plugins: [pluginModuleFederation(webMf, { environment: 'web' })],
        ...(ESM
          ? {
              tools: { rspack: toEsmOutput },
            }
          : {}),
      },
      node: {
        source: {
          include: WORKSPACE_SRC,
          entry: { index: opts.serverEntry },
          // __MF_ESM__ is needed on BOTH sides: the server decides how to write the
          // script tag, the client is what the tag points at.
          define: { ...(opts.define ?? {}), __MF_ESM__: JSON.stringify(ESM) },
        },
        output: {
          target: 'node',
          distPath: { root: 'dist/node' },
          // Trap 5/6 — see isRemote docs above.
          ...(opts.isRemote ? { assetPrefix: `${origin}/${SSR_PATH_SEGMENT}` } : {}),
        },
        plugins: [
          // Trap 1: `ssr: true` throws (deprecated) and `target: 'dual'` throws outside
          // Rslib/Rspress. Two plugin instances is the supported shape for a plain
          // Rsbuild app, and they are NOT deduplicated.
          pluginModuleFederation(nodeMf, { target: 'node', environment: 'node' }),
        ],
      },
    },
  };
}

/** Re-exported so apps never import the plugin directly and drift from the preset. */
export type { RsbuildPlugin };
