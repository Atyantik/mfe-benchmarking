/**
 * Cart page.
 *
 * The whole page is personalized, so it is client-rendered from cookie state — which makes
 * these the only component tests in the repo that exercise real client behaviour.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCartStore, type CartItem } from '@mf-eval/contracts';
import { CartProvider } from '@mf-eval/react-contracts';
import { PRODUCTS } from '@mf-eval/contracts/fixtures';

import CartPage from './CartPage';

const item = (i: number): CartItem => {
  const p = PRODUCTS[i]!;
  return { id: p.id, name: p.name, price: p.price };
};

const renderCart = (items: CartItem[]) => {
  const store = createCartStore();
  for (const i of items) store.add(i);
  return {
    store,
    ...render(
      <CartProvider store={store}>
        <CartPage />
      </CartProvider>,
    ),
  };
};

describe('CartPage', () => {
  it('offers a way out when the cart is empty', () => {
    renderCart([]);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse the catalogue/i })).toHaveAttribute(
      'href',
      '/product',
    );
  });

  it('lists a line per item', () => {
    renderCart([item(0), item(1), item(2)]);
    expect(screen.getAllByTestId('cart-row')).toHaveLength(3);
  });

  it('totals subtotal, delivery and VAT rather than showing a bare subtotal', () => {
    const items = [item(0), item(1)];
    renderCart(items);
    const subtotal = items.reduce((n, i) => n + i.price, 0);
    const expected = subtotal + Math.round(subtotal * 0.2) + 1850;
    const dollars = Math.floor(expected / 100).toLocaleString('en-US');
    expect(screen.getByText(new RegExp(`\\$${dollars.replace(/,/g, ',')}`))).toBeInTheDocument();
  });

  it('empties the cart when asked, without a page reload', async () => {
    const user = userEvent.setup();
    renderCart([item(0), item(1)]);
    await user.click(screen.getByTestId('clear-cart'));
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
