/**
 * Hydration modes — spec/reference-app.md § Hydration modes.
 *
 * The trick that makes "don't hydrate this" work in React: when the client renders an
 * element with `dangerouslySetInnerHTML`, React treats that subtree as opaque and does
 * not reconcile its children. Combined with `suppressHydrationWarning`, the
 * server-rendered DOM is left exactly as delivered.
 *
 * That alone stops the *work*, not the *bytes* — the component code would still be in
 * the client bundle. Excluding the bytes is done at build time: in `off` mode the web
 * build exposes `routes.inert.tsx`, which never imports the page component at all.
 * See rsbuild.config.ts.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { MARKS, mark, type HydrationMode } from '@mf-eval/contracts';

/**
 * Renders children on the server; on the client renders an opaque shell so React
 * leaves the server DOM untouched.
 */
export function Inert({ children }: { children: ReactNode }) {
  if (typeof window === 'undefined') {
    return <div data-mf-hydration="off">{children}</div>;
  }
  return (
    <div
      data-mf-hydration="off"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: '' }}
    />
  );
}

/**
 * Server-renders children, then hydrates them later — on idle or on entering the
 * viewport. Until then the subtree is opaque, exactly as in `Inert`.
 */
export function Deferred({
  mode,
  name,
  children,
}: {
  mode: Extract<HydrationMode, 'deferred-idle' | 'deferred-visible'>;
  name: string;
  children: ReactNode;
}) {
  const isServer = typeof window === 'undefined';
  const [active, setActive] = useState(isServer);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (active) return undefined;

    const activate = () => {
      mark(MARKS.remoteHydrateStart(name));
      setActive(true);
    };

    if (mode === 'deferred-idle') {
      const ric = globalThis.requestIdleCallback;
      if (typeof ric === 'function') {
        const id = ric(activate, { timeout: 2000 });
        return () => globalThis.cancelIdleCallback?.(id);
      }
      const id = setTimeout(activate, 200);
      return () => clearTimeout(id);
    }

    if (!host) return undefined;
    if (typeof IntersectionObserver !== 'function') {
      activate();
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          activate();
        }
      },
      { rootMargin: '128px' },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [active, host, mode, name]);

  useEffect(() => {
    if (active && !isServer) mark(MARKS.remoteHydrateEnd(name));
  }, [active, isServer, name]);

  if (!active) {
    return (
      <div
        ref={setHost}
        data-mf-hydration={mode}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: '' }}
      />
    );
  }
  return <div data-mf-hydration={mode}>{children}</div>;
}

export function Full({ children }: { children: ReactNode }) {
  return <div data-mf-hydration="full">{children}</div>;
}
