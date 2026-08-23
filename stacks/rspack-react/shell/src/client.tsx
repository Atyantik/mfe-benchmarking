import { hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import {
  CART_STATE_GLOBAL,
  MARKS,
  createCartStore,
  deserializeCartState,
  mark,
  type RegistryResponse,
} from '@mf-eval/contracts';

import { App } from './App';
import { CART_COOKIE, cartCookieValue } from '@mf-eval/shell-kit';
import { primeRegistry } from '@mf-eval/shell-kit';
import { loadRemotes } from '@mf-eval/shell-kit';
import { buildRoutes, resolveLazyRoutes } from './router';

interface Bootstrap {
  registry: RegistryResponse;
  cohort: string;
  cart: unknown;
}

async function start(): Promise<void> {
  const boot = (window as unknown as Record<string, Bootstrap>)[CART_STATE_GLOBAL];
  if (!boot) throw new Error('[shell] missing bootstrap payload');

  // Start from the server's resolved set rather than re-querying. A newer registry
  // response here would hydrate against a different build than the server rendered.
  primeRegistry('web', boot.cohort, boot.registry);

  const { routes: remoteRoutes, slots } = await loadRemotes(boot.registry.remotes);
  const store = createCartStore(deserializeCartState(boot.cart));

  // Persist so the badge is right in the SERVER HTML on the next navigation/reload.
  store.subscribe(() => {
    document.cookie = `${CART_COOKIE}=${cartCookieValue(store.getSnapshot())}; path=/; SameSite=Lax`;
  });

  const routes = buildRoutes(remoteRoutes);
  // Same reason as on the server: React Router will not hydrate a route whose `lazy`
  // is unresolved — it renders HydrateFallback instead, which here means the route
  // subtree never becomes interactive and every event handler is missing. Resolve the
  // routes matching the CURRENT url first; later navigations use `lazy` normally.
  await resolveLazyRoutes(routes, window.location.href);

  const router = createBrowserRouter(routes, {
    // Reuse the server's loader data instead of re-running loaders during hydration.
    hydrationData: (window as unknown as { __staticRouterHydrationData?: never })
      .__staticRouterHydrationData,
  });

  mark(MARKS.shellHydrateStart);
  hydrateRoot(
    document.getElementById('root')!,
    <App store={store} slots={slots}>
      <RouterProvider router={router} />
    </App>,
  );
  mark(MARKS.shellHydrateEnd);
}

void start();
