/**
 * Page components are server-rendered and NEVER hydrated. Reaching for a browser API or a
 * React state hook in one is not a subtle mistake — the code simply never runs, and the
 * developer is left staring at a component that "does nothing".
 *
 * The fix is always the same: put the behaviour in `src/behaviors/`, where it attaches to
 * the markup the server already produced. This rule says so, at the point of the mistake.
 */
const CLIENT_GLOBALS = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'navigator']);
const CLIENT_HOOKS = new Set([
  'useState', 'useEffect', 'useLayoutEffect', 'useReducer',
  'useRef', 'useSyncExternalStore', 'useImperativeHandle',
]);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid browser APIs and React state hooks in server-rendered page components.' },
    schema: [],
    messages: {
      global:
        "`{{name}}` does not exist when this component renders — pages are server-rendered and never hydrated. " +
        'Move this into a behaviour: create src/behaviors/<name>.ts with defineBehavior(), and mark the ' +
        'element with data-behavior="<app>.<name>". See docs/app-authors-guide.md.',
      hook:
        "`{{name}}` never runs here — pages are server-rendered and never hydrated, so state and effects are dead code. " +
        'Move this into a behaviour (src/behaviors/), or, if it is genuinely per-user state, make it an island ' +
        'and say why in review. See docs/interactivity.md.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    // Only app source. Tooling packages are not pages at all.
    if (!/stacks[/\\][^/\\]+[/\\][^/\\]+[/\\]src[/\\]/.test(filename)) return {};
    // Behaviours, islands and client entries are precisely where browser APIs belong.
    //
    // `src/app/` is the fourth: inside a ZONE host the premise of this rule is false by
    // design. A zone is a client-routed application (docs/navigation-zones.md), so its
    // pages really do run in the browser and really do hold state. The exemption is that
    // one directory and no wider — a zone host's `ssr.tsx`, frame and skeletons ARE
    // server-rendered and never hydrated, and the rule still guards them.
    if (/[/\\](behaviors|islands|app)[/\\]|\.client\.|entry\.client|personalized|behaviors\.ts/.test(filename)) return {};

    return {
      Identifier(node) {
        const parent = node.parent;
        if (parent?.type === 'MemberExpression' && parent.property === node) return;
        if (parent?.type === 'Property' && parent.key === node && !parent.computed) return;
        // A binding that merely shares the name is not the global — and neither is the
        // declaration that introduces it. Both must be skipped, or shadowing is unusable.
        if (
          (parent?.type === 'VariableDeclarator' && parent.id === node) ||
          (parent?.type === 'FunctionDeclaration' && parent.id === node) ||
          parent?.type === 'AssignmentPattern' ||
          (parent?.params?.includes(node) ?? false)
        ) {
          return;
        }
        if (CLIENT_GLOBALS.has(node.name)) {
          const scope = context.sourceCode.getScope(node);
          const resolved = scope.references.find((r) => r.identifier === node)?.resolved;
          if (resolved && resolved.defs.length > 0) return; // shadowed by a local
          context.report({ node, messageId: 'global', data: { name: node.name } });
        } else if (CLIENT_HOOKS.has(node.name) && node.parent?.type === 'CallExpression') {
          context.report({ node, messageId: 'hook', data: { name: node.name } });
        }
      },
    };
  },
};
