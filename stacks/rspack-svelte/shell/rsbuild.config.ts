import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

/**
 * The storefront host. Resolves every remote at runtime from the registry — a build-time
 * `remotes` block would recreate the coupling this repo exists to remove.
 */
export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'shell',
    port: 3110,
    isRemote: false,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
  }),
});
