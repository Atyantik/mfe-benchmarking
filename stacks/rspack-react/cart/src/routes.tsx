import './styles.css';
import type { RouteDescriptor } from '@mf-eval/contracts';

/**
 * The cart team owns /cart. The page is entirely personalized, so its route component is
 * just the slot: the server renders a reserved skeleton and the client mounts the real
 * thing into it (docs/decision-log.md D12).
 */
export const routes: RouteDescriptor[] = [
  {
    id: 'cart.page',
    path: 'cart',
    interactive: false,
    lazy: () => import(/* webpackChunkName: "cart-page" */ './CartRoute'),
  },
];
