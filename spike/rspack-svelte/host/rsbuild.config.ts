import { defineConfig } from '@rsbuild/core';
import { pluginSvelte } from '@rsbuild/plugin-svelte';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const SVELTE = '5.56.10';

export default defineConfig({
  plugins: [
    pluginSvelte(),
    pluginModuleFederation({
      name: 'svelte_host',
      remotes: { svelte_remote: 'svelte_remote@http://localhost:3201/mf-manifest.json' },
      // Only the PUBLIC entry, matching the remote.
      //
      // `svelte/internal/client` — which is where Svelte 5's reactivity actually lives, and
      // therefore the only share that would be worth having — hangs the container's
      // initialisation permanently, with no error anywhere. See docs/svelte-federation.md for
      // the matrix. Sharing `svelte` is legal, works, and buys almost nothing.
      shared: { svelte: { singleton: true, requiredVersion: SVELTE } },
    }),
  ],
  html: {
    template: './src/index.html',
  },
  output: { distPath: { root: 'dist' } },
  server: { port: 3200 },
});
