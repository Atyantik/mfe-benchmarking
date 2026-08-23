/**
 * Shared Rsbuild + Module Federation config for every app in the rspack-react stack.
 *
 * This exists to make the six traps from docs/spike-rspack-ssr.md structurally
 * impossible to reintroduce across 4 apps. Read that doc before changing anything here —
 * four of the six fail with error messages that point nowhere near the cause.
 */
import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import type { moduleFederationPlugin } from '@module-federation/sdk';

type MFOptions = moduleFederationPlugin.ModuleFederationPluginOptions;

/**
 * Pinned in pnpm-workspace.yaml. MUST be repeated literally in every `shared` entry:
 * MF infers requiredVersion from package.json, which under a pnpm catalog reads
 * "catalog:" and fails every semver match. (Trap 3.)
 */
export const REACT_VERSION = '19.2.8';

export const SHARED_REACT: NonNullable<MFOptions['shared']> = {
  react: { singleton: true, requiredVersion: REACT_VERSION },
  'react-dom': { singleton: true, requiredVersion: REACT_VERSION },
  // Singleton is load-bearing, not an optimisation: this package holds the React
  // context object that connects the shell's provider to a remote's consumer. Two
  // copies means `useCart` throws, and product can no longer update cart.
  '@mf-eval/contracts': { singleton: true, requiredVersion: false },
  '@mf-eval/react-contracts': { singleton: true, requiredVersion: false },
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
export const OPTIMIZE = process.env['MF_OPTIMIZE'] !== '0';

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
export const ESM = process.env['MF_ESM'] !== '0';

export interface MfAppOptions {
  /** MF container name. Also the registry key. */
  name: string;
  port: number;
  /** Browser entry. */
  clientEntry: string;
  /** Node entry. For a pure remote this can be a stub — the container is what matters. */
  serverEntry: string;
  /** `exposes` for a remote; omit for the host. */
  exposes?: MFOptions['exposes'];
  /**
   * Per-environment `exposes` overrides.
   *
   * Used to ship a DIFFERENT module to the browser than to the server — which is how
   * hydration=off actually removes bytes rather than merely skipping work. The web
   * build exposes an inert route with no path to the page component, so the component
   * and its CSS never enter the client bundle.
   */
  exposesWeb?: MFOptions['exposes'];
  exposesNode?: MFOptions['exposes'];
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
  extraShared?: MFOptions['shared'];
  /** Build-time constants, applied to both environments. */
  define?: Record<string, string>;
}

/** Where a remote's Node build is served, mirroring Modern.js's `ssrDir` convention. */
export const SSR_PATH_SEGMENT = 'ssr';

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
    ...(opts.exposes ? { exposes: opts.exposes } : {}),
    ...(opts.remotes ? { remotes: opts.remotes } : {}),
    shared: { ...SHARED_REACT, ...opts.extraShared },
  };
  // Same options both sides today. Kept as two objects because they diverge the moment
  // a host resolves different remote URLs per environment, and because the node build
  // is genuinely a different artifact (remoteEntry type commonjs-module vs global).
  const web = { ...base };
  const node = { ...base };
  // ESM applies to the BROWSER build only. The node build must stay CommonJS — MF emits
  // CJS there and Node would misparse a mismatch, silently yielding empty exports.
  if (ESM) {
    // `library.type: 'module'` requires the library NAME to be unset; webpack/rspack
    // rejects the combination outright.
    (web as { library?: unknown }).library = { type: 'module' };
    (web as { remoteType?: string }).remoteType = 'module';
  }
  if (opts.exposesWeb) web.exposes = opts.exposesWeb;
  if (opts.exposesNode) node.exposes = opts.exposesNode;
  return { web, node };
}

export function defineMfApp(opts: MfAppOptions, extra: RsbuildConfig = {}): RsbuildConfig {
  const { web: webMf, node: nodeMf } = mfConfigs(opts);
  const origin = `http://localhost:${opts.port}`;

  return {
    ...extra,
    server: { port: opts.port, ...extra.server },
    environments: {
      web: {
        source: {
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
              tools: {
                rspack: (config: { experiments?: Record<string, unknown>; output?: Record<string, unknown> }) => {
                  config.experiments = { ...config.experiments, outputModule: true };
                  config.output = {
                    ...config.output,
                    module: true,
                    chunkFormat: 'module',
                    chunkLoading: 'import',
                    library: { type: 'module' },
                  };
                },
              },
            }
          : {}),
      },
      node: {
        source: {
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
