import { CATEGORIES } from '@mf-eval/contracts/fixtures';
import { Container } from '@mf-eval/design';

import './styles.css';

/** Site footer. Exposed separately from the header — see Header.tsx for why. */
export function Footer() {
  return <SiteFooter />;
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
    <footer data-owner="chrome" className="mt-16 border-t border-line bg-card">
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
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 text-[length:var(--fs-xs)] text-ink-500">
          <p>© 2026 Northgate Industrial. A reference application, not a real supplier.</p>
          <p>Built as a Module Federation evaluation harness.</p>
        </Container>
      </div>
    </footer>
  );
}
