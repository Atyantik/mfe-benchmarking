import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const REGISTRY_URL = process.env.MF_REGISTRY_URL ?? 'http://localhost:4000';

/**
 * my-account — the SECOND HOST, and the only client-routed part of the site.
 *
 * It is a host, not a remote: it owns `/my-account/*`, serves its own documents, and is
 * reached through the edge like the storefront is. It consumes the same chrome and cart
 * remotes the storefront consumes, which is the point — one header, two applications, and
 * neither team blocked on the other (docs/navigation-zones.md, decision D14).
 *
 * `isRemote: false` because nothing federates INTO it. It exposes nothing.
 */
const appRoot = import.meta.dirname;

export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    appRoot,
    name: 'my_account',
    port: 3120,
    isRemote: false,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    define: { __MF_REGISTRY_URL__: JSON.stringify(REGISTRY_URL) },
  }),
});
