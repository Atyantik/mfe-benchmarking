import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

/**
 * COMPONENT remote — owns no URLs. Two different consumers: the shell's header
 * (MiniCart) and the product team's page (CartDrawer).
 */
export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    name: 'cart',
    port: 3103,
    isRemote: true,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    exposes: {
      // Live components — client only.
      './MiniCart': './src/MiniCart.tsx',
      './CartDrawer': './src/CartDrawer.tsx',
      // Server-rendered placeholders. The cart team owns both, because the team that
      // owns the component is the only one that knows the box it needs.
      './MiniCartPlaceholder': './src/MiniCartPlaceholder.tsx',
      './CartDrawerPlaceholder': './src/CartDrawerPlaceholder.tsx',
    },
  }),
});
