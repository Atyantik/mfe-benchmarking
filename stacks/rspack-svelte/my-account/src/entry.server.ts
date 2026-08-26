/**
 * Async boundary — must statically import nothing shared (spike trap 4).
 *
 * `accountData` is behind the same boundary for the same reason: `./data` imports
 * `@mf-eval/contracts/fixtures`, which is a shared singleton. Re-exporting it statically would
 * pull a shared module into the entry and break share-scope initialisation, with an error that
 * points at the output file rather than at this line.
 */
import type { RenderInput, RenderOutput } from './ssr.ts';

export async function render(input: RenderInput): Promise<RenderOutput> {
  const { renderApp } = await import('./ssr.ts');
  return renderApp(input);
}

/** The per-user data the API serves. Never rendered into a document. */
export async function accountData() {
  return import('./data.ts');
}

/** Session handling, behind the same boundary for the same reason. */
export async function sessionApi() {
  return import('./session.ts');
}

export type { RenderInput, RenderOutput };
