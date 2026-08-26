import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

/**
 * The chrome remote, in Svelte.
 *
 * `framework: 'svelte'` is the whole difference. The preset wires the Svelte plugin per
 * environment, including `generate: 'server'` on the node build — a trap that produces an
 * empty server render with no error anywhere if it is got wrong. See docs/svelte-federation.md.
 */
export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'chrome',
    port: 3104,
    isRemote: true,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
    exposes: {
      './Header': './src/Header.svelte',
      './Footer': './src/Footer.svelte',
    },
  }),
});
