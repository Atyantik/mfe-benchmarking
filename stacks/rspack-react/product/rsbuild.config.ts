import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

/** ROUTE remote — owns /product/*, including its own server loaders. */
const appRoot = import.meta.dirname;

export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    appRoot,
    name: 'product',
    port: 3102,
    isRemote: true,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    exposes: {
      './routes': './src/routes.tsx',
      // Contributed into the ACCOUNT host's overview, on the product team's own schedule.
      './AccountRecommended': './src/AccountRecommended.tsx',
      './AccountRecommendedPlaceholder': './src/AccountRecommendedPlaceholder.tsx',
    },
  }),
});
