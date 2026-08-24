import type { ReactNode } from 'react';
import { Button, Container } from '@mf-eval/design';

/**
 * The account frame — sidebar and page shell.
 *
 * SERVER-RENDERED and never hydrated, exactly like a document page. It is identical for
 * every visitor, so it is shared-cacheable, and it gives the first paint a real element
 * instead of an empty box.
 *
 * The sidebar links are real anchors. That matters twice over: without JavaScript they are
 * the only way to move around the account area, and with JavaScript the zone router
 * intercepts them, which is what produces the URL change the browser needs before it will
 * record a soft navigation at all.
 */
export const NAV = [
  { href: '/my-account', label: 'Overview', id: 'account.overview' },
  { href: '/my-account/orders', label: 'Orders', id: 'account.orders' },
  { href: '/my-account/profile', label: 'Profile & addresses', id: 'account.profile' },
] as const;

export interface FrameViewer {
  name: string;
  initial: string;
  accountNumber: string;
}

export function Frame({
  activeId,
  children,
  viewer = null,
}: {
  activeId: string;
  children: ReactNode;
  /** Known on the server here, because this host's documents are private. */
  viewer?: FrameViewer | null;
}) {
  return (
    <Container className="py-8">
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside>
          <h1 className="mb-1 text-[length:var(--fs-xl)] font-semibold tracking-tight text-ink-900">
            My account
          </h1>
          {viewer ? (
            <p className="mb-4 text-[length:var(--fs-sm)] text-ink-500" data-testid="frame-viewer">
              {viewer.name} · {viewer.accountNumber}
            </p>
          ) : (
            <div className="mb-4 h-5" aria-hidden="true" />
          )}
          <nav aria-label="Account">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {NAV.map((item) => {
                const active = item.id === activeId;
                return (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      data-testid={`nav-${item.id}`}
                      aria-current={active ? 'page' : undefined}
                      className={
                        active
                          ? 'block whitespace-nowrap rounded-md bg-sunken px-3 py-2 text-[length:var(--fs-sm)] font-medium text-brand-700'
                          : 'block whitespace-nowrap rounded-md px-3 py-2 text-[length:var(--fs-sm)] text-ink-600 hover:bg-sunken hover:text-brand-700'
                      }
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* A POST, not a link. A GET that ends a session is signed out by any prefetcher,
              link scanner or antivirus proxy that touches the page. */}
          <form method="post" action="/logout" className="mt-6">
            <Button type="submit" tone="ghost" size="sm" data-testid="sign-out">
              Sign out
            </Button>
          </form>
        </aside>
        {/* The one region the client owns. Everything inside is per-user, so the server
            renders a correctly-sized skeleton here and the client replaces it. */}
        <div id="account-app" data-testid="account-app">
          {children}
        </div>
      </div>
    </Container>
  );
}
