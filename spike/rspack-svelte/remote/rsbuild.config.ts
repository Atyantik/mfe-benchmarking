import { defineConfig } from '@rsbuild/core';
import { pluginSvelte } from '@rsbuild/plugin-svelte';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

/**
 * A Svelte 5 remote, built twice: once for the browser, once for the server.
 *
 * The dual build is the interesting half. Svelte compiles a component DIFFERENTLY for each
 * target — `generate: 'client'` produces DOM instructions, `generate: 'server'` produces a
 * string builder — so a federated Svelte remote that must server-render has to ship two
 * builds of the same component, exactly as the React stack in this repo does.
 */
const SVELTE = '5.56.10';

// Svelte 5's reactivity lives in the runtime, not only in the compiled output. Two copies
// means two independent reactive graphs: a `$state` written in the remote is invisible to an
// effect registered by the host. Singleton is not an optimisation here, it is correctness.
//
// FINDING 4: the shared map must ALSO be split per environment, and getting it wrong does not
// produce an error. `svelte/internal/server` reaches `node:async_hooks`; sharing it in the web
// build left the dynamic import unsettled forever — every chunk downloaded with a 200, no
// console error, no pageerror, no rejection. The entry ran and then nothing happened at all.
const sharedWeb = {
  // ONLY the public entry. Sharing `svelte/internal/client` hangs the container — see
  // FINDING 4 above and docs/svelte-federation.md for the matrix.
  svelte: { singleton: true, requiredVersion: SVELTE },
};
const sharedNode = {
  svelte: { singleton: true, requiredVersion: SVELTE },
  'svelte/internal/server': { singleton: true, requiredVersion: SVELTE },
};

export default defineConfig({
  plugins: [
    pluginModuleFederation({
      name: 'svelte_remote',
      filename: 'remoteEntry.js',
      manifest: true,
      // FINDING 1: exposes must be split per environment.
      //
      // `./render` imports `svelte/server`, which imports `node:async_hooks`. Module
      // Federation builds every expose into every environment, so a single `exposes` map put
      // the server renderer into the BROWSER bundle and the build failed with
      // `"node:*" is a built-in Node.js module and cannot be imported in client-side code`.
      // The React preset in this repo already splits exposes for exactly this reason; Svelte
      // needs it too, and more urgently, because its server entry point is a different module
      // rather than a different function on the same one.
      exposes: { './mount': './src/mount.js' },
      shared: sharedWeb,
    }),
  ],
  environments: {
    web: {
      output: { target: 'web', distPath: { root: 'dist/web' } },
      source: { entry: { index: './src/mount.js' } },
      // FINDING 3: the Svelte plugin must be declared PER ENVIRONMENT, not once at the root
      // with a per-environment override. A root `pluginSvelte()` plus a node-level one with
      // `generate: 'server'` produced a node bundle containing BOTH compilations — server
      // helpers and client `$.child` calls in the same file — and `render()` returned `{}`,
      // silently, with no error at build or run time. Each environment gets its own.
      plugins: [pluginSvelte()],
    },
    node: {
      output: { target: 'node', distPath: { root: 'dist/node' } },
      source: { entry: { index: './src/render.js' } },
      // FINDING 2: Svelte compiles a component DIFFERENTLY per target — `generate: 'client'`
      // emits DOM instructions, `generate: 'server'` emits a string builder — so the server
      // build needs its own compiler options. Without this, `render()` receives a client
      // component and throws.
      plugins: [
        pluginSvelte({ svelteLoaderOptions: { compilerOptions: { generate: 'server' } } }),
        pluginModuleFederation({
          name: 'svelte_remote',
          filename: 'remoteEntry.js',
          exposes: { './render': './src/render.js' },
          shared: sharedNode,
          library: { type: 'commonjs-module' },
        }),
      ],
    },
  },
  server: { port: 3201 },
  dev: { assetPrefix: 'http://localhost:3201' },
  output: { assetPrefix: 'http://localhost:3201' },
});
