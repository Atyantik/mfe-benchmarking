/**
 * Slot names — the vocabulary by which one remote's UI appears inside another's page.
 *
 * Framework-agnostic on purpose. The React and Svelte bindings each implement their own
 * `<Slot>`, but they must agree on the NAMES, and `packages/shell-kit` resolves slots without
 * knowing which framework will render them. A second copy of this list in each binding would
 * be the same class of drift the test-id contract exists to prevent.
 */
export type SlotName =
  | 'cart.drawer'
  | 'cart.mini'
  | 'cart.page'
  // Account-area widgets, each contributed by a DIFFERENT app into a region of the account
  // overview. This is the composition the whole architecture is for: three teams contribute
  // to one page, the page depends on none of them, and a visitor who never opens the account
  // area downloads none of it.
  | 'account.cart'
  | 'account.recommended'
  | 'account.support';
