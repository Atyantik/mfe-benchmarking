/**
 * `data-behavior` must name a behaviour this app actually ships.
 *
 * A typo here fails at RUNTIME and only in the console: the markup renders, the page looks
 * finished, and the enhancement silently never attaches. That is the worst class of bug in
 * this architecture — it survives review, it survives a smoke test, and it reaches
 * production looking exactly like working code.
 *
 * The check is possible because the name IS the address: `product.gallery` is owned by the
 * `product` remote and lives at `src/behaviors/gallery.ts`. There is no registry to consult,
 * so there is nothing that can be out of date.
 *
 * The owner must be this app. A behaviour belongs to whoever owns the markup it enhances —
 * pointing at another team's remote would make your page load their code, which is exactly
 * the coupling the ownership model exists to prevent. If two apps need the same behaviour it
 * is promoted to the design system, not borrowed across the boundary.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRATEGY = /^(immediate|idle|visible|interaction|media:.+)$/;

/** The app root is the nearest ancestor with a package.json. */
function appRootOf(filename) {
  let dir = path.dirname(filename);
  for (let i = 0; i < 20; i += 1) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function behavioursIn(root) {
  const dir = path.join(root, 'src/behaviors');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^([a-z0-9-]+)\.tsx?$/.exec(f))
    .filter(Boolean)
    .map((m) => m[1]);
}

const literalValue = (attr) =>
  attr.value?.type === 'Literal' && typeof attr.value.value === 'string' ? attr.value.value : null;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'data-behavior must name a behaviour file this app ships.' },
    schema: [],
    messages: {
      malformed:
        'data-behavior="{{name}}" is not a behaviour name. It must be "<app>.<file>", e.g. ' +
        '"{{app}}.gallery" for src/behaviors/gallery.ts — the name is how the browser finds ' +
        'the module, so there is nothing else to fix up if it is wrong.',
      foreign:
        'data-behavior="{{name}}" points at the "{{owner}}" remote, but this markup belongs to ' +
        '"{{app}}". A behaviour is owned by whoever owns the markup; borrowing one would make ' +
        'this page download another team\'s code and tie your deploy to theirs. If both apps ' +
        'need it, promote it to @mf-eval/design.',
      missing:
        'data-behavior="{{name}}" has no src/behaviors/{{file}}.ts in this app, so it will ' +
        'silently never attach — the page will render and look finished with the enhancement ' +
        'simply absent.{{hint}}',
      strategy:
        'data-behavior-when="{{value}}" is not a loading strategy. Use immediate, idle, ' +
        'visible, interaction, or media:(some-query). An unrecognised value falls back to idle, ' +
        'which is not what you asked for and gives no sign that it ignored you.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (/\.(test|spec|stories)\.[jt]sx?$/.test(filename)) return {};
    const root = appRootOf(filename);
    if (!root) return {};
    const app = path.basename(root);

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;

        if (node.name.name === 'data-behavior-when') {
          const value = literalValue(node);
          if (value !== null && !STRATEGY.test(value)) {
            context.report({ node, messageId: 'strategy', data: { value } });
          }
          return;
        }
        if (node.name.name !== 'data-behavior') return;

        const name = literalValue(node);
        // A computed name cannot be checked here, and cannot be found by the build's
        // expose scan either — but that is a separate rule's job, not a false positive here.
        if (name === null) return;

        if (!NAME.test(name)) {
          context.report({ node, messageId: 'malformed', data: { name, app } });
          return;
        }
        const [owner, file] = name.split('.');
        if (owner !== app) {
          context.report({ node, messageId: 'foreign', data: { name, owner, app } });
          return;
        }
        const available = behavioursIn(root);
        if (!available.includes(file)) {
          const hint = available.length
            ? ` This app ships: ${available.join(', ')}.`
            : ' This app has no src/behaviors directory yet.';
          context.report({ node, messageId: 'missing', data: { name, file, hint } });
        }
      },
    };
  },
};
