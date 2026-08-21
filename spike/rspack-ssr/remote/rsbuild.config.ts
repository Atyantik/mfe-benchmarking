import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import mfConfig from './module-federation.config';

// SPIKE: does a plain Rsbuild app (no Modern.js) produce both a web and a node
// MF build? `ssr: true` is deprecated-and-throws; `target: 'dual'` throws outside
// Rslib/Rspress. So the only supported path is target:'node' + a named environment.
export default defineConfig({
  plugins: [pluginReact()],
  server: { port: 3001 },
  environments: {
    web: {
      output: { target: 'web', distPath: { root: 'dist/web' }, assetPrefix: 'http://localhost:3001' },
      source: { entry: { index: './src/index.tsx' } },
      plugins: [pluginModuleFederation(mfConfig, { environment: 'web' })],
    },
    node: {
      // Node build is served under /ssr/ — mirrors Modern.js's ssrDir convention.
      output: { target: 'node', distPath: { root: 'dist/node' }, assetPrefix: 'http://localhost:3001/ssr' },
      source: { entry: { index: './src/index.node.tsx' } },
      plugins: [pluginModuleFederation(mfConfig, { target: 'node', environment: 'node' })],
    },
  },
});
