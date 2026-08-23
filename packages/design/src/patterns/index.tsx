/**
 * Composed patterns — one level above primitives, still design-system property.
 *
 * The test for putting something here rather than in a remote is "does more than one
 * team render it". `ProductCard` appears on the home page (shell) and the catalogue
 * (product team); `ProductThumb` appears in both plus the cart (cart team). A component
 * with a single consumer belongs in that consumer's repo — see docs/design-system.md.
 */
import type { ReactNode } from 'react';
import { Badge, Card, cx } from '../primitives/index.tsx';

// ---------------------------------------------------------------------------
// Product imagery
// ---------------------------------------------------------------------------

export type ProductFamily = 'breaker' | 'controller' | 'ups' | 'sensor' | 'meter';

/**
 * Deterministic line-art product imagery, drawn from the product id.
 *
 * Real catalogue photography is not ours to ship, and grey boxes make an enterprise
 * catalogue look unfinished. These are schematic silhouettes — the visual language of a
 * datasheet rather than a marketing shot — so the page reads as intentional. Same id
 * always yields the same drawing, which keeps SSR and any later client render identical.
 */
export function ProductThumb({
  family,
  id,
  className,
  label,
}: {
  family: ProductFamily;
  id: string;
  className?: string;
  label?: string;
}) {
  // Stable hash → a small amount of per-product variation (vents, terminals, segments).
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const v = (n: number) => ((h >>> 0) % n);

  return (
    <div
      className={cx(
        'relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-md bg-sunken',
        className,
      )}
    >
      <svg
        viewBox="0 0 120 90"
        role={label ? 'img' : 'presentation'}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="h-full w-full"
      >
        <defs>
          <pattern id={`grid-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M6 0H0V6" fill="none" stroke="var(--color-ink-200)" strokeWidth=".4" />
          </pattern>
        </defs>
        <rect width="120" height="90" fill={`url(#grid-${id})`} />
        <g
          fill="none"
          stroke="var(--color-brand-700)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {family === 'breaker' && (
            <>
              <rect x="42" y="20" width="36" height="50" rx="2" fill="var(--color-card)" />
              <rect x="52" y="28" width="16" height="12" rx="1" fill="var(--color-brand-100)" />
              <path d="M60 40v10M52 62h16" />
              {Array.from({ length: 3 + v(3) }, (_, i) => (
                <path key={i} d={`M46 ${50 + i * 4}h28`} strokeWidth=".8" />
              ))}
              <path d="M48 20v-8M72 20v-8M48 70v8M72 70v8" />
            </>
          )}
          {family === 'controller' && (
            <>
              <rect x="26" y="26" width="68" height="38" rx="2" fill="var(--color-card)" />
              <rect x="32" y="32" width="22" height="14" rx="1" fill="var(--color-brand-100)" />
              {Array.from({ length: 6 }, (_, i) => (
                <circle key={i} cx={62 + i * 5} cy={38} r="1.6" fill="var(--color-brand-600)" stroke="none" />
              ))}
              <path d="M32 54h56" strokeWidth=".8" />
              {Array.from({ length: 8 }, (_, i) => (
                <path key={i} d={`M${30 + i * 8} 64v6`} />
              ))}
            </>
          )}
          {family === 'ups' && (
            <>
              <rect x="34" y="16" width="52" height="58" rx="3" fill="var(--color-card)" />
              <rect x="42" y="24" width="36" height="16" rx="1" fill="var(--color-brand-100)" />
              <path d="M58 28l-5 8h6l-4 7" stroke="var(--color-brand-700)" strokeWidth="1.4" />
              {Array.from({ length: 2 + v(2) }, (_, i) => (
                <circle key={i} cx={48 + i * 12} cy={56} r="4" />
              ))}
              <path d="M42 68h36" strokeWidth=".8" />
            </>
          )}
          {family === 'sensor' && (
            <>
              <circle cx="60" cy="42" r="18" fill="var(--color-card)" />
              <circle cx="60" cy="42" r="9" fill="var(--color-brand-100)" />
              <circle cx="60" cy="42" r="3" fill="var(--color-brand-600)" stroke="none" />
              <path d="M60 60v14M52 74h16" />
              {Array.from({ length: 3 }, (_, i) => (
                <path key={i} d={`M${84 + i * 5} ${34 - i * 2}a${10 + i * 5} ${10 + i * 5} 0 0 1 0 ${20 + i * 4}`} strokeWidth=".9" />
              ))}
            </>
          )}
          {family === 'meter' && (
            <>
              <rect x="36" y="22" width="48" height="46" rx="2" fill="var(--color-card)" />
              <rect x="43" y="30" width="34" height="18" rx="1" fill="var(--color-brand-100)" />
              <path d="M47 40h6l3-5 4 10 3-5h9" strokeWidth="1.2" />
              {Array.from({ length: 4 }, (_, i) => (
                <rect key={i} x={43 + i * 9} y="54" width="6" height="6" rx="1" strokeWidth=".9" />
              ))}
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commerce
// ---------------------------------------------------------------------------

export function Price({
  cents,
  size = 'md',
  suffix,
}: {
  cents: number;
  size?: 'sm' | 'md' | 'lg';
  suffix?: string;
}) {
  const sizes = {
    sm: 'text-[length:var(--fs-md)]',
    md: 'text-[length:var(--fs-lg)]',
    lg: 'text-[length:var(--fs-2xl)]',
  } as const;
  const dollars = Math.floor(cents / 100).toLocaleString('en-US');
  const rest = String(cents % 100).padStart(2, '0');
  return (
    <span className={cx('font-semibold tabular-nums text-ink-900', sizes[size])}>
      ${dollars}
      <span className="text-[0.75em] align-baseline">.{rest}</span>
      {suffix ? <span className="ml-1 text-[length:var(--fs-xs)] font-normal text-ink-500">{suffix}</span> : null}
    </span>
  );
}

export type Availability = 'in-stock' | 'low' | 'backorder';

export function StockStatus({ status, leadTimeDays }: { status: Availability; leadTimeDays: number }) {
  if (status === 'in-stock') {
    return <Badge tone="ok">In stock · ships in {leadTimeDays}d</Badge>;
  }
  if (status === 'low') {
    return <Badge tone="warn">Low stock · {leadTimeDays}d</Badge>;
  }
  return <Badge tone="neutral">Backorder · {leadTimeDays}d</Badge>;
}

export interface ProductCardData {
  id: string;
  name: string;
  sku: string;
  range: string;
  family: ProductFamily;
  price: number;
  availability: Availability;
  leadTimeDays: number;
}

export function ProductCard({
  product,
  href,
  action,
}: {
  product: ProductCardData;
  href: string;
  action?: ReactNode;
}) {
  return (
    // `relative` is load-bearing: the title uses a stretched-link overlay
    // (after:absolute inset-0) to make the whole card clickable. Without a positioned
    // ancestor that overlay resolves against the page and covers the entire grid,
    // swallowing every click on the page including other cards' buttons.
    <Card as="li" className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-e2">
      <a href={href} className="block p-3 pb-0" tabIndex={-1} aria-hidden="true">
        <ProductThumb family={product.family} id={product.id} />
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-brand-700">
          {product.range}
        </p>
        <h3 className="text-[length:var(--fs-md)] leading-snug">
          <a
            href={href}
            data-testid={`link-${product.id}`}
            className="after:absolute after:inset-0 group-hover:text-brand-700"
          >
            {product.name}
          </a>
        </h3>
        <p className="font-mono text-[length:var(--fs-xs)] text-ink-500">{product.sku}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price cents={product.price} size="sm" />
          <StockStatus status={product.availability} leadTimeDays={product.leadTimeDays} />
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Faceted filtering — server-rendered, driven by links and a form
// ---------------------------------------------------------------------------

export function FacetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4 last:border-0">
      <legend className="mb-2 text-[length:var(--fs-sm)] font-semibold text-ink-800">{title}</legend>
      <div className="flex flex-col gap-1.5">{children}</div>
    </fieldset>
  );
}

export function FacetOption({
  name,
  value,
  label,
  count,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  count: number;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-md)] text-ink-700 hover:text-brand-700">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        data-testid={`facet-${name}-${value}`}
        className="size-4 accent-[var(--color-brand-700)]"
      />
      <span className="flex-1">{label}</span>
      <span className="tabular-nums text-[length:var(--fs-xs)] text-ink-400">{count}</span>
    </label>
  );
}
