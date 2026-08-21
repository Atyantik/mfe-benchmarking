import { Link, Outlet, useRouteError } from 'react-router';
import { Slot } from '@mf-eval/react-contracts';
import styles from './shell.module.css';

/** Shell owns the chrome: header, footer, nav. The cart inside the header does not. */
export function Component() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link to="/">Home</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/product">Products</Link>
        </nav>
        {/* Owned by the cart team, rendered in the shell's header. */}
        <Slot name="cart.mini" />
      </header>
      <main>
        <Outlet />
      </main>
      <footer className={styles.footer}>Module Federation evaluation harness</footer>
    </div>
  );
}

/** A failing remote must degrade its route, not take down the shell. */
export function ErrorBoundary() {
  const error = useRouteError() as Error | undefined;
  return (
    <div className={styles.error} data-testid="route-error">
      <h1>This section is unavailable</h1>
      <p>{error?.message ?? 'Unknown error'}</p>
    </div>
  );
}
