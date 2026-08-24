import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

/**
 * Chrome is consumed by every host, and only on the server.
 *
 * It is exposed to the web build too, because the manifest is how a host discovers the
 * stylesheet the server-rendered markup needs. The JS half of that expose is never
 * requested — the shell marks chrome as having no client exposes, so the browser gets
 * chrome's CSS and none of its code.
 */
export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    appRoot,
    name: 'chrome',
    port: 3104,
    isRemote: true,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    exposes: { './Header': './src/Header.tsx', './Footer': './src/Footer.tsx' },
  }),
});
