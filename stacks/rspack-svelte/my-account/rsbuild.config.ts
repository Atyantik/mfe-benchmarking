import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const REGISTRY_URL = process.env.MF_REGISTRY_URL ?? 'http://localhost:4000';

const appRoot = import.meta.dirname;

/**
 * The account host — a ZONE: server-rendered frame, client-routed inside /my-account/*.
 */
export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'my_account',
    port: 3120,
    isRemote: false,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
    define: { __MF_REGISTRY_URL__: JSON.stringify(REGISTRY_URL) },
  }),
});
