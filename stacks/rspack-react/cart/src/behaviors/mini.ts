import { defineBehavior } from '@mf-eval/behaviors';
import { formatPrice, getCartStore } from '@mf-eval/contracts';

/**
 * The header cart, without a framework.
 *
 * This was a React island, and it was the most expensive component on the site by a wide
 * margin — not because of its own code, which is trivial, but because being an island meant
 * every page that showed it shipped react-dom. Measured: 55 kB gzip of react-dom at 22.5%
 * executed, on every route, to render a number and a price.
 *
 * Nothing about the feature needed a framework. It reads two values out of a cookie and
 * writes them into markup the server already rendered — which is the definition of a
 * behaviour (docs/interactivity.md). The island stays for the drawer and the cart page,
 * where there is genuinely stateful UI; it is gone from the header, where there was not.
 *
 * It also owns add-to-cart, by delegation. That listener used to live in the shell's client
 * entry, which meant the SHELL knew how to mutate the CART's state — a boundary crossing
 * that only existed because the shell was already loading React for the island. With the
 * island gone, the cart team owns its own writes.
 */
export default defineBehavior('cart.mini', (root, ctx) => {
  const count = root.querySelector<HTMLElement>('[data-testid="cart-count"]');
  const total = root.querySelector<HTMLElement>('[data-testid="cart-total"]');
  if (!count || !total) return;

  // THE store — shared with the drawer island and the cart page, which are still React.
  // Building a second one here is what made the badge count up while the drawer stayed empty.
  const store = getCartStore();

  const paint = () => {
    const state = store.getSnapshot();
    count.textContent = String(state.count);
    total.textContent = formatPrice(state.totalCents);
    // The server renders this dimmed, because it has no idea what is in the cart. Once the
    // real values are in, it is live.
    root.removeAttribute('aria-hidden');
    root.setAttribute('data-cart-state', 'ready');
  };

  // The store persists itself; this only repaints.
  ctx.cleanup(store.subscribe(paint));
  paint();

  /**
   * Add to cart, by delegation on markup that was never hydrated.
   *
   * A 60-row catalogue costs nothing to make interactive this way. Price and name come from
   * the DOM because the cart is client-owned state; a real checkout re-prices server-side
   * from the id, and this harness is explicit that it does not.
   */
  ctx.on(document, 'click', (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-add-id]');
    if (!target) return;
    const { addId, addName, addPrice } = target.dataset;
    const price = Number(addPrice);
    if (!addId || !addName || Number.isNaN(price)) return;
    store.add({ id: addId, name: addName, price });
  });
});
