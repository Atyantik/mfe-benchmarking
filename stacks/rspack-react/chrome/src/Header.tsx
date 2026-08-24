import { Slot } from '@mf-eval/react-contracts';
import { CHROME } from '@mf-eval/contracts/testids';
import { CATEGORIES } from '@mf-eval/contracts/fixtures';
import { Container, inputClass } from '@mf-eval/design';

import './styles.css';

/**
 * Site header — one remote, rendered by EVERY host.
 *
 * This used to live inside the storefront shell. It moved the moment there were two hosts:
 * the storefront and my-account both render it, and a header duplicated across two
 * applications drifts on the first campaign and takes two deploys to rebrand.
 *
 * Loaded SERVER-SIDE only. The markup is static, so it is rendered into the HTML and never
 * hydrated — a second host consuming it costs the browser nothing beyond this file's CSS.
 * The container is initialised once per process, so the per-render cost is a function call.
 *
 * Header and Footer are exposed SEPARATELY rather than as one Layout that wraps the page.
 * A wrapper would put every host's page content inside `[data-owner="chrome"]`, and chrome's
 * scoped stylesheet would then match markup belonging to other teams — reintroducing exactly
 * the cross-remote CSS bleed the scoping exists to prevent. As siblings, each owns its own
 * subtree and nothing else. The page frame belongs to the host, which is right: my-account
 * has a sidebar and the storefront does not.
 */
export type ChromeHost = 'storefront' | 'my-account';

/**
 * Who is looking, when the SERVER already knows.
 *
 * Only a host whose documents are private may pass this. The storefront's are shared by a
 * CDN across every visitor, so it passes nothing and the header personalizes on the client
 * from a readable cookie. The account host's documents are private by definition — they are
 * behind a login and are never indexed — so it renders the name directly, and the visitor
 * sees it in the first paint instead of a beat later.
 *
 * Same component, two hosts, two correct answers. The difference is a caching decision, not
 * a styling one, which is why it is a prop rather than something chrome sniffs for itself.
 */
export interface Viewer {
  name: string;
  initial: string;
}

export function Header({
  host = 'storefront',
  viewer = null,
}: {
  host?: ChromeHost;
  viewer?: Viewer | null;
}) {
  return (
    <div data-owner="chrome">
      <UtilityBar />
      <Masthead viewer={viewer} />
      <PrimaryNav host={host} />
    </div>
  );
}

function UtilityBar() {
  return (
    <div className="hidden border-b border-line bg-card text-[length:var(--fs-xs)] text-ink-500 md:block">
      <Container className="flex h-9 items-center justify-end gap-5">
        <a href="/faq#delivery" className="hover:text-brand-700">Delivery &amp; lead times</a>
        <a href="/faq/contact" className="hover:text-brand-700">Contact an engineer</a>
        <span aria-hidden="true" className="text-ink-300">|</span>
        <a href="/faq" className="hover:text-brand-700">Support</a>
        <a href="/faq#ordering" className="hover:text-brand-700">Trade accounts</a>
      </Container>
    </div>
  );
}

function Masthead({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="border-b border-line bg-card">
      <Container className="flex h-16 items-center gap-4">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Northgate Industrial — home">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
            <rect width="32" height="32" rx="5" fill="var(--color-brand-700)" />
            <path
              d="M9 23V9l7 7 7-7v14"
              fill="none"
              stroke="var(--color-card)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[length:var(--fs-lg)] font-semibold tracking-tight text-ink-900">
            Northgate<span className="font-normal text-ink-500"> Industrial</span>
          </span>
        </a>

        <form action="/product" method="get" role="search" className="ml-auto hidden w-full max-w-md lg:block">
          <label htmlFor="site-search" className="sr-only">Search products</label>
          <div className="relative">
            <input
              id="site-search"
              type="search"
              name="q"
              data-testid={CHROME.search}
              placeholder="Search by part number, range or rating"
              className={`${inputClass} h-10 pl-9`}
            />
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
            >
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M13.5 13.5L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Into the other host. A plain link, because crossing a host boundary is a real
              document navigation — there is nothing to intercept and nothing to preload. */}
          {/* Server-rendered neutral, refined on the client. "My account" is correct for
              both states, so there is no flash of anything wrong — and the response stays
              byte-identical for every visitor, which is what keeps it CDN-shareable. */}
          {/* With a viewer, this is rendered signed-in on the server and needs no behaviour.
              Without one, the markup is neutral — "My account" is correct for both states, so
              there is no flash of anything wrong — and the behaviour refines it on the client
              from a readable cookie, leaving the response byte-identical for every visitor. */}
          <a
            href="/my-account"
            data-testid={CHROME.accountLink}
            data-signed-in={viewer ? 'true' : undefined}
            {...(viewer ? {} : { 'data-behavior': 'chrome.account', 'data-behavior-when': 'idle' })}
            className="hidden min-w-[8.5rem] items-center gap-2 rounded-md px-2.5 py-2 text-[length:var(--fs-sm)] font-medium text-ink-700 hover:bg-sunken hover:text-brand-700 sm:inline-flex"
          >
            <span
              data-account-initial
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-[length:var(--fs-xs)] font-semibold text-ink-600"
            >
              {viewer ? (
                viewer.initial
              ) : (
                <svg viewBox="0 0 20 20" className="size-3.5">
                  <circle cx="10" cy="6.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M3.8 17c.7-3.2 3.2-5 6.2-5s5.5 1.8 6.2 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <span data-account-label>{viewer ? (viewer.name.split(' ')[0] ?? viewer.name) : 'My account'}</span>
          </a>
          {/* Personalized: the server renders a reserved placeholder, the client mounts
              the live component into the same box. Never in the HTML, never cached. */}
          <Slot name="cart.mini" />
        </div>
      </Container>
    </header>
  );
}

function PrimaryNav({ host }: { host: ChromeHost }) {
  const inAccount = host === 'my-account';
  return (
    <nav aria-label="Primary" className="border-b border-line bg-card">
      <Container>
        <ul className="-mx-2 flex items-center gap-1 overflow-x-auto text-[length:var(--fs-md)]">
          <li>
            <a
              href="/product"
              className="inline-block whitespace-nowrap px-3 py-3 font-medium text-ink-800 hover:text-brand-700"
            >
              All products
            </a>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <a
                href={`/product?category=${c.id}`}
                className="inline-block whitespace-nowrap px-3 py-3 text-ink-600 hover:text-brand-700"
              >
                {c.name}
              </a>
            </li>
          ))}
          <li className="ml-auto">
            <a href="/faq" className="inline-block whitespace-nowrap px-3 py-3 text-ink-600 hover:text-brand-700">
              Support
            </a>
          </li>
          <li>
            <a
              href="/my-account"
              aria-current={inAccount ? 'true' : undefined}
              className={
                inAccount
                  ? 'inline-block whitespace-nowrap border-b-2 border-brand-700 px-3 py-3 font-medium text-brand-700'
                  : 'inline-block whitespace-nowrap px-3 py-3 text-ink-600 hover:text-brand-700'
              }
            >
              My account
            </a>
          </li>
        </ul>
      </Container>
    </nav>
  );
}
