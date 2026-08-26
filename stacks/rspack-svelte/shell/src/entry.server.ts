/** Async boundary — must statically import nothing shared (spike trap 4). */
import type { RenderInput, RenderOutput } from './ssr.ts';

export async function render(input: RenderInput): Promise<RenderOutput> {
  const { renderApp } = await import('./ssr.ts');
  return renderApp(input);
}

/** Drops the resolved-remote cache. Called after a revalidate picks up a redeploy. */
export async function clearRemoteCache() {
  const kit = await import('@mf-eval/shell-kit');
  kit.clearRemoteCache();
}

/** Diagnostic: how many times each remote module was resolved. */
export async function loadStats() {
  const { loadCounts } = await import('@mf-eval/shell-kit');
  return Object.fromEntries(loadCounts);
}

export type { RenderInput, RenderOutput };
