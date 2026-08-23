/**
 * Controls and behaviour roots must be addressable by a test.
 *
 * Without this the acceptance suites drift into selecting by class name or text content,
 * which then break every time someone edits copy — and a suite that breaks for cosmetic
 * reasons stops being trusted, which is worse than not having one.
 *
 * Deliberately NOT anchors. A link is already addressable by `a[href="/product"]`, which is
 * semantic and stable; demanding a test id on every nav item and breadcrumb would produce
 * exactly the noise that teaches people to ignore lint output.
 */
const INTERACTIVE = new Set(['button', 'select', 'textarea', 'input']);

const hasAttr = (node, name) =>
  node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === name);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require data-testid on interactive elements and behaviour roots.' },
    schema: [],
    messages: {
      missing:
        'Add data-testid to this <{{tag}}>. Acceptance tests select by test id; without one they fall back to ' +
        'class names or copy, and then break when someone rewords a label.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (/\.(test|spec|stories)\.[jt]sx?$/.test(filename)) return {};

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
        const tag = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        const isHostInteractive = INTERACTIVE.has(tag);
        const isBehaviourRoot = hasAttr(node, 'data-behavior');
        if (!isHostInteractive && !isBehaviourRoot) return;
        if (hasAttr(node, 'data-testid') || hasAttr(node, 'aria-hidden')) return;
        // A spread may carry it through from a wrapper.
        if (node.attributes.some((a) => a.type === 'JSXSpreadAttribute')) return;
        context.report({ node, messageId: 'missing', data: { tag } });
      },
    };
  },
};
