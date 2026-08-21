import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

/**
 * spec/reference-app.md § Hydration modes. All four are measured for this remote;
 * none is "the real one".
 */
const HYDRATION = process.env.MF_HYDRATION ?? 'full';
const VALID = ['off', 'deferred-idle', 'deferred-visible', 'full'];
if (!VALID.includes(HYDRATION)) {
  throw new Error(`MF_HYDRATION must be one of ${VALID.join(' | ')}, got "${HYDRATION}"`);
}

export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    name: 'faq',
    port: 3101,
    isRemote: true,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    define: { __MF_HYDRATION__: JSON.stringify(HYDRATION) },
    // The server ALWAYS renders real content — that is the whole point of SSR.
    exposesNode: { './routes': './src/routes.tsx' },
    // In `off` the browser gets a route module with no path to the page component,
    // so its code and CSS are absent from the client bundle rather than merely unused.
    exposesWeb: {
      './routes': HYDRATION === 'off' ? './src/routes.inert.tsx' : './src/routes.tsx',
    },
  }),
});
