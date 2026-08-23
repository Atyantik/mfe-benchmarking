/**
 * @mf-eval/eslint-config — the one lint configuration.
 *
 * An app's eslint.config.js is three lines: import this, point it at the app, export it.
 * App teams do not choose rules, and are not expected to know why any of them exist.
 *
 * Everything is `error`. There is no warning tier, because a warning is a thing nobody
 * fixes and a signal everybody learns to scroll past.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import mf from '@mf-eval/eslint-plugin-mf';

const IGNORES = [
  '**/dist/**',
  '**/node_modules/**',
  '**/.rsbuild/**',
  '**/storybook-static/**',
  '**/*.d.ts',
  // Vendored third-party agent skill. Reviewed on adoption (decision-log D9), not ours to lint.
  '.agents/**',
  'results/**',
];

/**
 * Architectural boundaries, expressed as import restrictions.
 *
 * The invariant: an app may use the platform (design system, contracts, runtime) and its
 * own files. It may NOT reach into another app. The moment one does, the two can no longer
 * deploy independently, which is the premise of the whole repo.
 *
 * This is deliberately `no-restricted-imports` with path patterns rather than
 * eslint-plugin-boundaries. The plugin's element detection did not fire in this workspace
 * — every app carries its own package.json — and it reported success while checking
 * nothing. A guardrail that silently passes is worse than no guardrail, because people
 * trust it.
 */
const CROSS_APP =
  'Apps cannot import from each other. This one just reached into another team\'s source, ' +
  'which means the two can no longer deploy independently. Share it through ' +
  '@mf-eval/contracts (types and state), @mf-eval/design (UI), or expose it as a federated ' +
  'module. See docs/design-system.md.';

const INTERNALS =
  'This is build tooling, not application code. Apps configure themselves through ' +
  '@mf-eval/rsbuild-preset and never import it directly — see docs/app-authors-guide.md.';

const IMPORT_POLICY = [
  'error',
  {
    patterns: [
      // Any relative path that climbs out of this app and into a sibling.
      { group: ['../../*/src/**', '../../../*/*/src/**', '**/stacks/*/*/src/**'], message: CROSS_APP },
    ],
  },
];

/**
 * Application source carries BOTH restrictions: no reaching into another app, and no
 * importing build tooling. `no-restricted-imports` does not merge across config blocks —
 * the last one wins outright — so the app-source policy has to restate the cross-app
 * patterns rather than assume they carry over.
 */
const SOURCE_IMPORT_POLICY = [
  'error',
  {
    patterns: [
      ...IMPORT_POLICY[1].patterns,
      { group: ['@mf-eval/rsbuild-preset', '@mf-eval/bench', '@mf-eval/eslint-*'], message: INTERNALS },
    ],
  },
];

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function defineAppLint({ tsconfigRootDir }) {
  return tseslint.config(
    { ignores: IGNORES },
    js.configs.recommended,
    // Plain JS/MJS — build scripts, servers, lint rules. Type-aware linting needs a
    // tsconfig project, and these are deliberately outside one.
    {
      files: ['**/*.{js,mjs,cjs}'],
      ...tseslint.configs.disableTypeChecked,
      languageOptions: { globals: { console: 'readonly', process: 'readonly', URL: 'readonly' } },
      rules: { 'no-undef': 'off', 'no-console': 'off' },
    },
    {
      files: ['**/*.{ts,tsx}'],
      extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    },
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      plugins: { 'jsx-a11y': jsxA11y },
      rules: {
        ...jsxA11y.flatConfigs.strict.rules,
        'no-restricted-imports': IMPORT_POLICY,

        // Async correctness. Every SSR bug we have shipped was an unawaited promise or a
        // floating one, and both are invisible until a page renders empty.
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/require-await': 'error',

        // Numbers and booleans in template literals are normal and readable; the rule's
        // real value is catching objects stringified into `[object Object]`.
        '@typescript-eslint/restrict-template-expressions': [
          'error',
          { allowNumber: true, allowBoolean: true },
        ],

        // `any` is how a contract stops being a contract.
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],

        // Unused code is dead weight a junior will assume is load-bearing.
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
        ],

        'no-console': ['error', { allow: ['warn', 'error'] }],
        // A catch that deliberately does nothing is a decision; the comment inside it is
        // the documentation. Requiring a no-op statement adds noise, not safety.
        'no-empty': ['error', { allowEmptyCatch: true }],
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'prefer-const': 'error',
        // Throwing a Response is the router convention for 404/redirect, used by loaders.
        '@typescript-eslint/only-throw-error': ['error', { allow: [{ from: 'lib', name: 'Response' }] }],

        'no-restricted-syntax': [
          'error',
          {
            selector: "NewExpression[callee.name='Date'][arguments.length=0]",
            message:
              'new Date() makes output non-deterministic, and every measurement in this repo depends on two ' +
              'builds producing identical bytes. Pass a timestamp in, or use a fixture.',
          },
          {
            selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
            message:
              'Math.random() makes output non-deterministic. Fixtures use a seeded PRNG — see ' +
              'packages/contracts/src/fixtures/rng.ts.',
          },
        ],
      },
    },
    // Application source only — config files legitimately import the preset.
    {
      files: ['stacks/*/*/src/**/*.{ts,tsx}'],
      rules: { 'no-restricted-imports': SOURCE_IMPORT_POLICY },
    },
    mf.configs.recommended,
    // Tests and stories exist to poke at the things the rules forbid.
    {
      files: ['**/*.{test,spec,stories}.{ts,tsx}', '**/.storybook/**'],
      rules: {
        // node:test's `test()` returns a promise nobody is meant to await.
        '@typescript-eslint/no-floating-promises': 'off',
        'mf/no-client-api-in-page': 'off',
        'mf/require-testid': 'off',
        'mf/design-system-only': 'off',
        'mf/no-serialized-props': 'off',
        // A test for the colour rule has to contain colours.
        'mf/no-raw-color': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        'no-console': 'off',
      },
    },
    // Build configuration is not application code.
    {
      files: [
        '**/*.config.{ts,js,mjs}',
        '**/server.{ts,mjs}',
        '**/serve.{ts,mjs}',
        '**/*.mjs',
        'scripts/**',
      ],
      rules: {
        // JSON.stringify in a build config is defining a constant, not embedding a payload.
        'mf/no-serialized-props': 'off',
        'no-console': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  );
}

export default defineAppLint;
