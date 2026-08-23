import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const REGISTRY_URL = process.env.MF_REGISTRY_URL ?? 'http://localhost:4000';

/**
 * MPA HOST. Consumes the SAME remotes as the SPA shell, from the SAME registry.
 * The only difference is the navigation model — that is the whole experiment.
 *
 * Note what is absent: react-router. It is not a dependency of this app at all.
 */
export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    name: 'mpa_shell',
    port: 3200,
    isRemote: false,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    define: { __MF_REGISTRY_URL__: JSON.stringify(REGISTRY_URL) },
  }),
});
