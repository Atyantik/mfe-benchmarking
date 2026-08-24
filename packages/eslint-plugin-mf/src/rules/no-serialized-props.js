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
    // A HOST's server render is the one sanctioned place, and what it writes carries no
    // user data — the registry it resolved and which regions to mount, nothing more.
    //
    // This named the shell specifically until there were two hosts, at which point the
    // second one was reported for doing the identical, correct thing. `src/ssr.tsx` is the
    // host server-render entry by convention; a remote has no such file.
    if (/[/\\]src[/\\]ssr\.tsx$/.test(filename)) return {};
    if (!/stacks[/\\]/.test(filename)) return {};

    return {
      JSXAttribute(node) {
        if (node.name.name === 'dangerouslySetInnerHTML') {
          context.report({ node, messageId: 'serialize' });
        }
      },
      CallExpression(node) {
        // Only in files that can contain markup. `JSON.stringify` in a `.ts` module is
        // serializing to a cookie, a header or an API response — which is exactly where the
        // rule's own message says per-user state belongs. Flagging it there told authors to
        // stop doing the correct thing.
        if (!/\.tsx$/.test(filename)) return;
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
