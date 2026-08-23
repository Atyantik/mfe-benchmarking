/**
 * Colour belongs to the design system, not to an app.
 *
 * A hard-coded hex in one app is invisible until a rebrand, at which point it is the one
 * thing that does not change — and nobody can find it. Tokens make a rebrand a deploy of
 * one stylesheet (docs/design-system.md).
 */
const RAW_COLOR = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|\b(?:rgba?|hsla?)\s*\(/i;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid raw colour literals outside the design system.' },
    schema: [],
    messages: {
      raw:
        'Raw colour `{{value}}`. Use a design token instead — a Tailwind class like `text-brand-700`, or ' +
        'var(--color-…). Hard-coded colours are the values that survive a rebrand and nobody can find.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    // The design system is where colour is allowed to be literal.
    if (/packages[/\\]design[/\\]/.test(filename)) return {};

    const check = (node, value) => {
      if (typeof value !== 'string') return;
      const m = RAW_COLOR.exec(value);
      if (m) context.report({ node, messageId: 'raw', data: { value: m[0] } });
    };
    return {
      Literal: (node) => check(node, node.value),
      TemplateElement: (node) => check(node, node.value.cooked),
    };
  },
};
