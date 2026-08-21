import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const REGISTRY_URL = process.env.MF_REGISTRY_URL ?? 'http://localhost:4000';

/**
 * HOST. Deliberately has NO `remotes` block — every remote is resolved at request time
 * from the registry, which is what makes "add a whole new page repo" possible without
 * rebuilding the shell (docs/topology.md § Rule 3).
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
    extraShared: { 'react-router': { singleton: true, requiredVersion: '8.3.0' } },
  }),
});
