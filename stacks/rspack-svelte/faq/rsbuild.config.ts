import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'faq',
    port: 3201,
    isRemote: true,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
    // Contributed into the ACCOUNT host's overview — a third team on the same page.
    exposes: {
      './AccountSupport': './src/AccountSupport.svelte',
      './AccountSupportPlaceholder': './src/AccountSupportPlaceholder.svelte',
      './routes': './src/routes.ts',
    },
  }),
});
