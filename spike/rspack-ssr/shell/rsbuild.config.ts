import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { webConfig, nodeConfig } from './module-federation.config';

export default defineConfig({
  plugins: [pluginReact()],
  environments: {
    web: {
      output: {
        target: 'web',
        distPath: { root: 'dist/web' },
        assetPrefix: 'http://localhost:3000',
        filenameHash: false,
      },
      source: { entry: { index: './src/entry.client.tsx' } },
      plugins: [pluginModuleFederation(webConfig, { environment: 'web' })],
    },
    node: {
      output: {
        target: 'node',
        distPath: { root: 'dist/node' },
        // NO assetPrefix here. The shell's node bundle is never served over HTTP — it
        // runs in-process. An http publicPath makes webpack's async-node chunk loader
        // try to FETCH its own local chunks, which fails with a bare
        // "__webpack_modules__[moduleId] is not a function".
        filenameHash: false,
      },
      source: { entry: { index: './src/entry.server.tsx' } },
      plugins: [pluginModuleFederation(nodeConfig, { target: 'node', environment: 'node' })],
    },
  },
});
