// The remote's stylesheet belongs to this expose. Imported here rather than in the client
// entry so it appears in ./routes' manifest assets — the shell injects a remote's CSS only
// when that remote actually renders the page.
import './styles.css';

import type { RouteDescriptor } from '@mf-eval/contracts';

/**
 * The support team owns /faq/* outright. The shell never learns these paths — it mounts
 * whatever this array contains (docs/topology.md § Rule 1), so adding a page here is a
 * support-team deploy and nothing else.
 *
 * The chunk names must match the route ids with dots replaced by dashes, exactly as in the
 * React stack: MF's manifest lists assets per EXPOSE, not per route, so without that key the
 * shell cannot tell which stylesheet belongs to the page it just rendered.
 */
export const routes: RouteDescriptor[] = [
  {
    path: 'faq',
    children: [
      {
        id: 'faq.index',
        index: true,
        // Pure content: server-rendered, never hydrated, ships no framework JS.
        interactive: false,
        lazy: () => import(/* webpackChunkName: "faq-index" */ './SupportCentre.route.ts'),
      },
      {
        id: 'faq.contact',
        path: 'contact',
        interactive: false,
        lazy: () => import(/* webpackChunkName: "faq-contact" */ './Contact.route.ts'),
      },
    ],
  },
];
