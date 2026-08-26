import { defineConfig } from '@rsbuild/core';
import { defineMfApp } from '@mf-eval/rsbuild-preset';

const appRoot = import.meta.dirname;

export default defineConfig({
  ...defineMfApp({
    appRoot,
    framework: 'svelte',
    name: 'cart',
    port: 3203,
    isRemote: true,
    clientEntry: './src/entry.client.ts',
    serverEntry: './src/entry.server.ts',
    exposes: {
      // The cart team owns a route too — /cart, which is personalized end to end.
      './routes': './src/routes.ts',
      // Live components — client only.
      './CartDrawer': './src/CartDrawer.svelte',
      './CartPage': './src/CartPage.svelte',
      // Contributed into the ACCOUNT host's overview. The cart team owns cart UI wherever it
      // appears; the account host renders a named slot and knows nothing about this.
      './AccountCart': './src/AccountCart.svelte',
      './AccountCartPlaceholder': './src/AccountCartPlaceholder.svelte',
      // Server-rendered placeholders. The cart team owns both halves, because the team that
      // owns a component is the only one that knows the box it needs.
      './MiniCartPlaceholder': './src/MiniCartPlaceholder.svelte',
      './CartDrawerPlaceholder': './src/CartDrawerPlaceholder.svelte',
      './CartPagePlaceholder': './src/CartPagePlaceholder.svelte',
    },
  }),
});
