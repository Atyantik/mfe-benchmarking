/**
 * Every `shared` entry must state requiredVersion explicitly.
 *
 * Module Federation infers it from package.json. Under a pnpm catalog that field literally
 * reads "catalog:", which is not a semver range, so every share match fails at runtime with
 * a message about a version that "does not satisfy" — pointing at the dependency rather than
 * at the inference. Cost us an afternoon; see docs/spike-rspack-ssr.md §3.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require an explicit requiredVersion on Module Federation shared entries.' },
    schema: [],
    messages: {
      missing:
        'shared["{{name}}"] has no requiredVersion. MF would infer it from package.json, which under our pnpm ' +
        'catalog reads "catalog:" — not a semver range — and every share match fails at runtime. ' +
        'Set requiredVersion explicitly (see SHARED_REACT in @mf-eval/rsbuild-preset).',
    },
  },
  create(context) {
    return {
      Property(node) {
        const key = node.key.name ?? node.key.value;
        if (key !== 'shared' || node.value.type !== 'ObjectExpression') return;
        for (const entry of node.value.properties) {
          if (entry.type !== 'Property' || entry.value.type !== 'ObjectExpression') continue;
          const name = entry.key.name ?? entry.key.value;
          const hasVersion = entry.value.properties.some(
            (p) => p.type === 'Property' && (p.key.name ?? p.key.value) === 'requiredVersion',
          );
          if (!hasVersion) {
            context.report({ node: entry, messageId: 'missing', data: { name } });
          }
        }
      },
    };
  },
};
