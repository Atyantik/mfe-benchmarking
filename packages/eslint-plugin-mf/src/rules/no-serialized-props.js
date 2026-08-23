/**
 * Do not serialize application data into the document.
 *
 * Embedding a payload for the client to re-hydrate is the habit this architecture exists to
 * avoid: it inflates every response, makes the HTML user-specific (killing shared caching),
 * and duplicates data the server already rendered as markup. Behaviours read the DOM; the
 * cart reads a cookie.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid serializing data into markup or script tags from app code.' },
    schema: [],
    messages: {
      serialize:
        'Do not serialize data into the page. The server already rendered this as markup — a behaviour should ' +
        'read the DOM, and per-user state belongs in a cookie. Embedding a payload inflates every response and ' +
        'makes the HTML user-specific, which stops a CDN sharing it. See docs/interactivity.md.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    // The shell's SSR bootstrap is the one sanctioned place, and it carries no user data.
    if (/shell[/\\]src[/\\]ssr\.tsx$/.test(filename)) return {};
    if (!/stacks[/\\]/.test(filename)) return {};

    return {
      JSXAttribute(node) {
        if (node.name.name === 'dangerouslySetInnerHTML') {
          context.report({ node, messageId: 'serialize' });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'JSON' &&
          callee.property.name === 'stringify'
        ) {
          context.report({ node, messageId: 'serialize' });
        }
      },
    };
  },
};
