import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

/** ROUTE remote — owns /product/*, including its own server loaders. */
export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    name: 'product',
    port: 3102,
    isRemote: true,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    exposes: { './routes': './src/routes.tsx' },
  }),
});
