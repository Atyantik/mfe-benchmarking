import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const REGISTRY_URL = process.env.MF_REGISTRY_URL ?? 'http://localhost:4000';

/**
 * The host.
 *
 * No client router — react-router is not a dependency of this app at all. Routes are
 * matched on the server; pages are rendered once and never hydrated. The only client
 * JavaScript is for personalized regions (docs/decision-log.md D12).
 *
 * Remotes are resolved at request time from the registry, never from a build-time
 * `remotes` block, so adding a page repo needs no shell rebuild.
 */
export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    name: 'shell',
    port: 3100,
    isRemote: false,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    define: { __MF_REGISTRY_URL__: JSON.stringify(REGISTRY_URL) },
  }),
});
