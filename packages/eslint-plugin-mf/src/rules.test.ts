/**
 * Tests for the lint rules.
 *
 * These exist because a guardrail that silently passes is worse than no guardrail: people
 * trust it. We shipped exactly that — an architectural boundary rule that reported success
 * while checking nothing, because its element detection never matched in this workspace.
 * Every rule here is asserted to both fire and stay quiet, on realistic code.
 */
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, it } from 'vitest';

import { rules } from './index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2023,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const PAGE = '/repo/stacks/rspack-react/product/src/List.tsx';
const BEHAVIOUR = '/repo/stacks/rspack-react/product/src/behaviors/gallery.ts';

describe('no-client-api-in-page', () => {
  tester.run('no-client-api-in-page', rules['no-client-api-in-page'], {
    valid: [
      // Behaviours are precisely where browser APIs belong.
      { code: 'const el = document.querySelector("x");', filename: BEHAVIOUR },
      // A local binding that merely shares the name is not the global.
      { code: 'function f(document: string) { return document; }', filename: PAGE },
      // Outside an app entirely.
      { code: 'const x = window.location.href;', filename: '/repo/packages/bench/src/measure.ts' },
      // Rendering is what a page component is for.
      { code: 'export function Component() { return null; }', filename: PAGE },
    ],
    invalid: [
      { code: 'const w = window.innerWidth;', filename: PAGE, errors: [{ messageId: 'global' }] },
      { code: 'const el = document.body;', filename: PAGE, errors: [{ messageId: 'global' }] },
      { code: 'const [n, setN] = useState(0);', filename: PAGE, errors: [{ messageId: 'hook' }] },
      { code: 'useEffect(() => {}, []);', filename: PAGE, errors: [{ messageId: 'hook' }] },
    ],
  });
});

describe('require-testid', () => {
  tester.run('require-testid', rules['require-testid'], {
    valid: [
      { code: '<button data-testid="add">Add</button>', filename: PAGE },
      { code: '<input type="hidden" name="q" value="x" />', filename: PAGE },
      { code: '<button aria-hidden="true" />', filename: PAGE },
      // A link is addressable by href; demanding a test id on every nav item is noise.
      { code: '<a href="/product">Products</a>', filename: PAGE },
      { code: '<div>text</div>', filename: PAGE },
    ],
    invalid: [
      { code: '<button>Add</button>', filename: PAGE, errors: [{ messageId: 'missing' }] },
      { code: '<select name="sort" />', filename: PAGE, errors: [{ messageId: 'missing' }] },
      {
        code: '<div data-behavior="product.gallery" />',
        filename: PAGE,
        errors: [{ messageId: 'missing' }],
      },
    ],
  });
});

describe('no-raw-color', () => {
  tester.run('no-raw-color', rules['no-raw-color'], {
    valid: [
      { code: 'const c = "text-brand-700";', filename: PAGE },
      { code: 'const c = "var(--color-brand-700)";', filename: PAGE },
      // The design system is where colour is allowed to be literal.
      { code: 'const c = "#0d6a53";', filename: '/repo/packages/design/src/tokens.ts' },
    ],
    invalid: [
      { code: 'const c = "#fff";', filename: PAGE, errors: [{ messageId: 'raw' }] },
      { code: 'const c = "#0d6a53";', filename: PAGE, errors: [{ messageId: 'raw' }] },
      { code: 'const c = "rgb(1 2 3)";', filename: PAGE, errors: [{ messageId: 'raw' }] },
    ],
  });
});

describe('mf-shared-requires-version', () => {
  const CONFIG = '/repo/stacks/rspack-react/product/rsbuild.config.ts';
  tester.run('mf-shared-requires-version', rules['mf-shared-requires-version'], {
    valid: [
      {
        code: 'export default { shared: { react: { singleton: true, requiredVersion: "19.2.8" } } };',
        filename: CONFIG,
      },
      { code: 'export default { shared: ["react"] };', filename: CONFIG },
    ],
    invalid: [
      {
        code: 'export default { shared: { react: { singleton: true } } };',
        filename: CONFIG,
        errors: [{ messageId: 'missing' }],
      },
    ],
  });
});

describe('design-system-only', () => {
  tester.run('design-system-only', rules['design-system-only'], {
    valid: [
      { code: '<Button>Add</Button>', filename: PAGE },
      { code: '<input type="hidden" name="q" />', filename: PAGE },
      { code: '<input className={inputClass} />', filename: PAGE },
      // The design system is where the primitives are implemented.
      { code: '<button />', filename: '/repo/packages/design/src/primitives/index.tsx' },
    ],
    invalid: [
      { code: '<button>Add</button>', filename: PAGE, errors: [{ messageId: 'bare' }] },
      { code: '<textarea name="detail" />', filename: PAGE, errors: [{ messageId: 'bare' }] },
    ],
  });
});

describe('no-serialized-props', () => {
  tester.run('no-serialized-props', rules['no-serialized-props'], {
    valid: [
      { code: 'const s = JSON.parse(raw);', filename: PAGE },
      // The shell's SSR bootstrap is the one sanctioned place, and carries no user data.
      {
        code: 'const s = JSON.stringify(boot);',
        filename: '/repo/stacks/rspack-react/shell/src/ssr.tsx',
      },
    ],
    invalid: [
      { code: 'const s = JSON.stringify(data);', filename: PAGE, errors: [{ messageId: 'serialize' }] },
      {
        code: '<div dangerouslySetInnerHTML={{ __html: x }} />',
        filename: PAGE,
        errors: [{ messageId: 'serialize' }],
      },
    ],
  });
});
