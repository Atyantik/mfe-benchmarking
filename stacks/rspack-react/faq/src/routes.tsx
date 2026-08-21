import type { RouteDescriptor } from '@mf-eval/contracts';

/**
 * The FAQ team owns /faq/* entirely. The shell never learns these paths — it merges
 * whatever this array contains (docs/topology.md § Rule 1).
 *
 * `lazy` is mandatory here: this module is loaded before first render, so a static
 * import of the page would put its bytes in the critical path of every route.
 */
export const routes: RouteDescriptor[] = [
  {
    path: 'faq',
    children: [
      { index: true, lazy: () => import('./FaqRoute') },
      // Added by the FAQ team alone. No shell rebuild, no shell redeploy, no registry
      // change — the shell never enumerates these paths.
      { path: 'contact', lazy: () => import('./ContactRoute') },
    ],
  },
];
