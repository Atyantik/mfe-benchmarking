import type { ReactNode } from 'react';
import { Slot } from '@mf-eval/react-contracts';
import styles from './shell.module.css';

/**
 * Same DOM as the SPA shell's Layout — plain <a> instead of react-router's <Link>,
 * which renders an identical anchor. The spec requires identical markup so the two
 * navigation models stay comparable.
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
