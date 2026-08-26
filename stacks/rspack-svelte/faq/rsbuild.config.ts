import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'faq',
    port: 3101,
    isRemote: true,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
    // Contributed into the ACCOUNT host's overview — a third team on the same page.
    exposes: {
      './AccountSupport': './src/AccountSupport.mount.ts',
      './AccountSupportPlaceholder': './src/AccountSupportPlaceholder.svelte',
      './routes': './src/routes.ts',
    },
  }),
});
