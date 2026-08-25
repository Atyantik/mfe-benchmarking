import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

/**
 * COMPONENT remote — owns no URLs. Two different consumers: the shell's header
 * (MiniCart) and the product team's page (CartDrawer).
 */
const appRoot = import.meta.dirname;

export default defineConfig({
  plugins: [pluginReact()],
  ...defineMfApp({
    appRoot,
    name: 'cart',
    port: 3103,
    isRemote: true,
    clientEntry: './src/entry.client.tsx',
    serverEntry: './src/entry.server.tsx',
    exposes: {
      // The cart team owns a route too — /cart, which is personalized end to end.
      './routes': './src/routes.tsx',
      // Live components — client only.
      './CartDrawer': './src/CartDrawer.tsx',
      './CartPage': './src/CartPage.tsx',
      // Contributed into the ACCOUNT host's overview. The cart team owns cart UI wherever
      // it appears; the account host renders a named slot and knows nothing about this.
      './AccountCart': './src/AccountCart.tsx',
      './AccountCartPlaceholder': './src/AccountCartPlaceholder.tsx',
      // Server-rendered placeholders. The cart team owns both halves, because the team
      // that owns a component is the only one that knows the box it needs.
      './MiniCartPlaceholder': './src/MiniCartPlaceholder.tsx',
      './CartDrawerPlaceholder': './src/CartDrawerPlaceholder.tsx',
      './CartPagePlaceholder': './src/CartPagePlaceholder.tsx',
    },
  }),
});
