/**
 * @mf-eval/vitest-config — the two test environments an app needs.
 *
 * `node` for pure logic: loaders, facet counting, cart maths. Fast, no DOM.
 * `dom`  for anything that renders or attaches to markup: page components and behaviours.
 *
 * An app's vitest.config.ts is one line. Test setup is not a thing app teams should be
 * assembling from blog posts.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

const SETUP = fileURLToPath(new URL('./setup-dom.ts', import.meta.url));

const shared = {
  globals: false,
  clearMocks: true,
  restoreMocks: true,
  // A test that takes longer than this is doing something a unit test should not.
  testTimeout: 5_000,
} as const;

/** Pure logic. No DOM, no React. */
export function nodeTests(overrides: ViteUserConfig = {}): ViteUserConfig {
  return defineConfig({
    ...overrides,
    test: {
      ...shared,
      name: 'node',
      environment: 'node',
      include: ['src/**/*.test.ts'],
      exclude: ['**/*.dom.test.ts', '**/node_modules/**'],
      ...overrides.test,
    },
  });
}

/** Components and behaviours. jsdom, Testing Library, jest-dom matchers. */
export function domTests(overrides: ViteUserConfig = {}): ViteUserConfig {
  return defineConfig({
    ...overrides,
    test: {
      ...shared,
      name: 'dom',
      environment: 'jsdom',
      setupFiles: [SETUP],
      include: ['src/**/*.dom.test.{ts,tsx}'],
      exclude: ['**/node_modules/**'],
      ...overrides.test,
    },
  });
}

/** Both projects in one run — what `pnpm test` uses in an app. */
export function appTests(overrides: ViteUserConfig = {}): ViteUserConfig {
  return defineConfig({
    ...overrides,
    test: { projects: [nodeTests(), domTests()], ...overrides.test },
  });
}
