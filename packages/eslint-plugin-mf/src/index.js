/**
 * @mf-eval/eslint-plugin-mf
 *
 * Every rule here exists because we hit the bug it prevents, and every message names the
 * failure rather than the rule. The traps in docs/constraints.md that can be caught
 * statically are caught here; the rest are checked by scripts/validate-workspace.mjs.
 */
import noClientApiInPage from './rules/no-client-api-in-page.js';
import requireTestid from './rules/require-testid.js';
import noRawColor from './rules/no-raw-color.js';
import mfSharedRequiresVersion from './rules/mf-shared-requires-version.js';
import noSerializedProps from './rules/no-serialized-props.js';
import designSystemOnly from './rules/design-system-only.js';
import behaviorMustExist from './rules/behavior-must-exist.js';

const rules = {
  'no-client-api-in-page': noClientApiInPage,
  'require-testid': requireTestid,
  'no-raw-color': noRawColor,
  'mf-shared-requires-version': mfSharedRequiresVersion,
  'no-serialized-props': noSerializedProps,
  'design-system-only': designSystemOnly,
  'behavior-must-exist': behaviorMustExist,
};

const plugin = { meta: { name: '@mf-eval/eslint-plugin-mf', version: '0.0.0' }, rules };

/** Every rule at error. There is no "warn" tier — a warning is a thing nobody fixes. */
export const configs = {
  recommended: {
    plugins: { mf: plugin },
    rules: Object.fromEntries(Object.keys(rules).map((r) => [`mf/${r}`, 'error'])),
  },
};

export default { ...plugin, configs };
export { rules };
