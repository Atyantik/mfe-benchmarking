import type { ReactNode } from 'react';
import { Slot } from '@mf-eval/react-contracts';
import styles from './shell.module.css';

/**
 * Plain <a> elements. A link is a link: the browser navigates, the server responds with
 * a whole document, and nothing intercepts the click.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <a href="/">Home</a>
          <a href="/faq">FAQ</a>
          <a href="/product">Products</a>
        </nav>
        {/* Personalized: server renders a reserved placeholder, client mounts the live one. */}
        <Slot name="cart.mini" />
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>Module Federation evaluation harness</footer>
    </div>
  );
}
