import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'product',
    port: 3102,
    isRemote: true,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
    exposes: {
      './routes': './src/routes.ts',
      // Contributed into the ACCOUNT host's overview — a second team on the same page.
      './AccountRecommended': './src/AccountRecommended.svelte',
      './AccountRecommendedPlaceholder': './src/AccountRecommendedPlaceholder.svelte',
    },
  }),
});
