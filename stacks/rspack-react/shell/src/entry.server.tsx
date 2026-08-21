/**
 * Async boundary. This module must statically import NOTHING shared — no React, no
 * router, no contracts. MF resolves shares synchronously at entry evaluation and would
 * throw RUNTIME-006 (docs/spike-rspack-ssr.md § trap 4).
 */
import type { RenderInput, RenderOutput } from './ssr';

export async function render(input: RenderInput): Promise<RenderOutput> {
  const { renderApp } = await import('./ssr');
  return renderApp(input);
}

export type { RenderInput, RenderOutput };
