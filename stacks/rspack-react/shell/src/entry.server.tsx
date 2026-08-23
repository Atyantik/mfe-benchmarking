/** Async boundary — must statically import nothing shared (spike trap 4). */
import type { RenderInput, RenderOutput } from './ssr';

export async function render(input: RenderInput): Promise<RenderOutput> {
  const { renderApp } = await import('./ssr');
  return renderApp(input);
}

export type { RenderInput, RenderOutput };
