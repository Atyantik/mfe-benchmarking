import type { RouteDescriptor } from '@mf-eval/contracts';

/**
 * hydration=off, browser build only.
 *
 * The point is bytes, not just work: this module has no path to FaqPage, so the
 * component and its CSS never enter the client bundle. The server-rendered DOM is
 * left untouched because React treats a dangerouslySetInnerHTML subtree as opaque.
 */
export const routes: RouteDescriptor[] = [
  {
    path: 'faq',
    hydration: 'off',
    lazy: () =>
      Promise.resolve({
        Component: () => (
          <div
            data-mf-hydration="off"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: '' }}
          />
        ),
      }),
  },
];
