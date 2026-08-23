import type { ReactNode } from 'react';
import { Slot } from '@mf-eval/react-contracts';
import { CATEGORIES } from '@mf-eval/contracts/fixtures';
import { Container, inputClass } from '@mf-eval/design';

/**
 * Site chrome — owned by the shell, present on every page, server-rendered.
 *
 * Everything here is static markup and native controls: real links, a real search form
 * that GETs, a native <details> for the mobile menu. The only region that is not
 * server-rendered is the cart, which is personalized and therefore client-only
 * (docs/decision-log.md D12).
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <UtilityBar />
      <Masthead />
      <PrimaryNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
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

function Masthead() {
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
              data-testid="site-search"
              placeholder="Search by part number, range or rating"
              className={`${inputClass} h-10 pl-9`}
            />
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            >
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M13.5 13.5L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Personalized: the server renders a reserved placeholder, the client mounts
              the live component into the same box. Never in the HTML, never cached. */}
          <Slot name="cart.mini" />
        </div>
      </Container>
    </header>
  );
}

function PrimaryNav() {
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
        </ul>
      </Container>
    </nav>
  );
}

function SiteFooter() {
  const columns = [
    {
      title: 'Products',
      links: CATEGORIES.map((c) => ({ label: c.name, href: `/product?category=${c.id}` })),
    },
    {
      title: 'Support',
      links: [
        { label: 'Support centre', href: '/faq' },
        { label: 'Ordering & accounts', href: '/faq#ordering' },
        { label: 'Delivery & lead times', href: '/faq#delivery' },
        { label: 'Warranty & returns', href: '/faq#warranty' },
        { label: 'Contact an engineer', href: '/faq/contact' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Northgate', href: '/' },
        { label: 'Industries served', href: '/' },
        { label: 'Sustainability', href: '/' },
        { label: 'Careers', href: '/' },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-line bg-card">
      <Container className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-2 text-[length:var(--fs-md)] font-semibold text-ink-900">Northgate Industrial</p>
          <p className="max-w-xs text-[length:var(--fs-sm)] text-ink-500">
            Electrical distribution, automation and power continuity equipment, stocked and
            supported for industrial and commercial projects.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-[length:var(--fs-sm)] font-semibold uppercase tracking-[0.1em] text-ink-800">
              {col.title}
            </h2>
            <ul className="flex flex-col gap-2 text-[length:var(--fs-sm)] text-ink-500">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="hover:text-brand-700 hover:underline">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 text-[length:var(--fs-xs)] text-ink-400">
          <p>© 2026 Northgate Industrial. A reference application, not a real supplier.</p>
          <p>Built as a Module Federation evaluation harness.</p>
        </Container>
      </div>
    </footer>
  );
}
