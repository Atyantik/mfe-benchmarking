/**
 * Chrome is rendered by every host, so its contract is "the same header everywhere".
 *
 * The bench asserts that across two live hosts; this asserts it at the unit level, where a
 * regression is caught in a second rather than in a full stack run. The interesting property
 * is not that the header renders — it is that the ONLY thing the `host` prop may change is
 * which item is marked current.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlotProvider } from '@mf-eval/react-contracts';

import { Header } from './Header';
import { Footer } from './Footer';

const linksIn = (root: HTMLElement) =>
  [...root.querySelectorAll('a')].map((a) => `${a.getAttribute('href')} :: ${a.textContent.trim()}`);

const renderHeader = (host: 'storefront' | 'my-account') =>
  render(
    <SlotProvider slots={{}}>
      <Header host={host} />
    </SlotProvider>,
  ).container.firstElementChild as HTMLElement;

describe('Header', () => {
  it('renders the same links in the same order for every host', () => {
    const storefront = linksIn(renderHeader('storefront'));
    const account = linksIn(renderHeader('my-account'));
    expect(account).toEqual(storefront);
    expect(storefront.length).toBeGreaterThan(5);
  });

  it('marks only the section the host is in', () => {
    const storefront = renderHeader('storefront');
    expect(storefront.querySelectorAll('[aria-current]')).toHaveLength(0);

    const account = renderHeader('my-account');
    const current = account.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute('href')).toBe('/my-account');
  });

  it('scopes itself with data-owner, so its stylesheet cannot reach another team\'s markup', () => {
    expect(renderHeader('storefront').getAttribute('data-owner')).toBe('chrome');
  });

  it('links to the account host with a plain anchor — crossing hosts is a document load', () => {
    renderHeader('storefront');
    const link = screen.getByTestId('account-link');
    expect(link).toHaveAttribute('href', '/my-account');
    expect(link.tagName).toBe('A');
  });
});

describe('Footer', () => {
  it('renders scoped, with real links', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector<HTMLElement>('footer');
    expect(footer).toHaveAttribute('data-owner', 'chrome');
    expect(linksIn(footer!).length).toBeGreaterThan(5);
  });
});
