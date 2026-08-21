// Async boundary. This module must not statically import React or anything shared —
// MF would then resolve the share synchronously and crash before the container is ready.
export async function render(): Promise<string> {
  const { renderApp } = await import('./ssr');
  return renderApp();
}
