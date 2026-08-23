/**
 * Apps compose the design system; they do not re-implement it.
 *
 * A bare <button> in an app is how a design system dies: it looks close enough, it drifts,
 * and six months later there are four button styles nobody owns.
 */
const REPLACEMENTS = {
  button: 'Button from @mf-eval/design',
  input: 'the `inputClass` export, inside a <Field>, from @mf-eval/design',
  select: 'the `inputClass` export, inside a <Field>, from @mf-eval/design',
  textarea: 'the `inputClass` export, inside a <Field>, from @mf-eval/design',
};

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require design-system components instead of bare interactive elements.' },
    schema: [],
    messages: {
      bare:
        'Use {{replacement}} instead of a bare <{{tag}}>. Re-implementing a control is how a design system ' +
        'drifts into four button styles nobody owns.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (/packages[/\\]design[/\\]/.test(filename)) return {};
    if (/\.(test|spec|stories)\.[jt]sx?$/.test(filename)) return {};
    if (!/stacks[/\\]/.test(filename)) return {};

    return {
      JSXOpeningElement(node) {
        // A hidden input carries form state; nobody clicks it and no design applies.
        const isHidden = node.attributes.some(
          (a) =>
            a.type === 'JSXAttribute' &&
            a.name.name === 'type' &&
            a.value?.type === 'Literal' &&
            a.value.value === 'hidden',
        );
        if (isHidden) return;
        if (node.name.type !== 'JSXIdentifier') return;
        const tag = node.name.name;
        const replacement = REPLACEMENTS[tag];
        if (!replacement) return;
        // An input carrying the design system's class is already conforming.
        const usesTokenClass = node.attributes.some(
          (a) =>
            a.type === 'JSXAttribute' &&
            a.name.name === 'className' &&
            a.value?.type === 'JSXExpressionContainer' &&
            context.sourceCode.getText(a.value).includes('inputClass'),
        );
        if (usesTokenClass) return;
        context.report({ node, messageId: 'bare', data: { tag, replacement } });
      },
    };
  },
};
