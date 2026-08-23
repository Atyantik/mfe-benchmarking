/**
 * Design system primitives.
 *
 * Build-time dependency of every app — see docs/design-system.md for why these are an npm
 * package rather than a federated remote. They are pure presentation: no state, no
 * effects, no personalization. In this architecture pages are server-rendered and never
 * hydrated, so every component here compiles to markup plus class names and costs the
 * browser nothing at runtime.
 *
 * Interactivity, where it exists, is native HTML — <details> for disclosure, real form
 * controls, real links. Nothing here needs JavaScript to work.
 */
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-[80rem] px-4 sm:px-6', className)}>{children}</div>;
}

export function Section({
  children,
  className,
  tone = 'page',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'page' | 'card' | 'sunken' | 'inverse';
}) {
  const tones = {
    page: '',
    card: 'bg-card',
    sunken: 'bg-sunken',
    inverse: 'bg-[var(--s-inverse)] text-[var(--t-invert)]',
  } as const;
  return <section className={cx('py-10 sm:py-14', tones[tone], className)}>{children}</section>;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-brand-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[length:var(--fs-2xl)] leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap';

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary: 'border border-line-strong bg-card text-ink-800 hover:border-brand-600 hover:text-brand-700',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-[var(--color-alert)] text-white hover:brightness-110',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[length:var(--fs-sm)]',
  md: 'h-10 px-4 text-[length:var(--fs-md)]',
  lg: 'h-12 px-6 text-[length:var(--fs-base)]',
};

export function Button({
  tone = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; size?: ButtonSize }) {
  return <button className={cx(BUTTON_BASE, BUTTON_TONES[tone], BUTTON_SIZES[size], className)} {...rest} />;
}

export function ButtonLink({
  tone = 'primary',
  size = 'md',
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { tone?: ButtonTone; size?: ButtonSize }) {
  return <a className={cx(BUTTON_BASE, BUTTON_TONES[tone], BUTTON_SIZES[size], className)} {...rest} />;
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li';
}) {
  return (
    <As className={cx('rounded-lg border border-line bg-card shadow-e1', className)}>{children}</As>
  );
}

type BadgeTone = 'neutral' | 'ok' | 'warn' | 'alert' | 'info' | 'brand';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    ok: 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]',
    warn: 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]',
    alert: 'bg-[var(--color-alert-soft)] text-[var(--color-alert)]',
    info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
    brand: 'bg-brand-100 text-brand-800',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-3">
      <ol className="flex flex-wrap items-center gap-1 text-[length:var(--fs-xs)] text-ink-500">
        {trail.map((step, i) => (
          <li key={step.label} className="flex items-center gap-1">
            {i > 0 ? <span aria-hidden="true" className="text-ink-300">/</span> : null}
            {step.href && i < trail.length - 1 ? (
              <a href={step.href} className="hover:text-brand-700 hover:underline">{step.label}</a>
            ) : (
              <span aria-current="page" className="font-medium text-ink-700">{step.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 py-8">
      <a
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cx(
          'rounded-md border border-line px-3 py-1.5 text-[length:var(--fs-sm)]',
          page === 1 ? 'pointer-events-none opacity-40' : 'hover:border-brand-600 hover:text-brand-700',
        )}
      >
        Previous
      </a>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - (pages[i - 1] as number) > 1 ? <span className="px-1 text-ink-400">…</span> : null}
          <a
            href={hrefFor(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cx(
              'min-w-9 rounded-md border px-3 py-1.5 text-center text-[length:var(--fs-sm)] tabular-nums',
              p === page
                ? 'border-brand-700 bg-brand-700 font-semibold text-white'
                : 'border-line hover:border-brand-600 hover:text-brand-700',
            )}
          >
            {p}
          </a>
        </span>
      ))}
      <a
        href={hrefFor(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className={cx(
          'rounded-md border border-line px-3 py-1.5 text-[length:var(--fs-sm)]',
          page === pageCount ? 'pointer-events-none opacity-40' : 'hover:border-brand-600 hover:text-brand-700',
        )}
      >
        Next
      </a>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------

export function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <table className="w-full text-[length:var(--fs-md)]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-line last:border-0">
            <th scope="row" className="w-2/5 py-2.5 pr-4 text-left font-medium text-ink-500">
              {row.label}
            </th>
            <td className="py-2.5 text-ink-800 tabular-nums">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Native disclosure. Works with JavaScript switched off, and ships none. */
export function Disclosure({
  question,
  children,
  open = false,
}: {
  question: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink-800 marker:hidden hover:text-brand-700">
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="shrink-0 text-ink-400 transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pb-5 pr-8 text-ink-600">{children}</div>
    </details>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-card px-6 py-14 text-center">
      <h3 className="mb-1 text-[length:var(--fs-lg)]">{title}</h3>
      <p className="mx-auto mb-5 max-w-prose text-[length:var(--fs-md)] text-ink-500">{body}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[length:var(--fs-sm)] font-medium text-ink-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[length:var(--fs-xs)] text-ink-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-md border border-line-strong bg-card px-3 py-2 text-[length:var(--fs-md)] ' +
  'text-ink-800 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none';

export { cx };
