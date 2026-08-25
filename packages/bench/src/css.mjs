/**
 * CSS isolation bench — can two teams write the same CSS and not collide?
 *
 * Every other suite here measures cost. This one measures a claim, and the claim is the one
 * most often asserted and least often tested in a micro-frontend: *styles are isolated*.
 *
 * The experiment is deliberately rigged to fail if the boundary is weak. Two applications,
 * cart and product, each ship a file called `panel.module.scss`. Both declare `.panel`,
 * `.label` and `.value`. Both define Sass variables named `$surface`, `$ink`, `$radius`,
 * `$pad` and a mixin named `frame`. Every declaration contradicts the other team's — one is
 * an inline pill on the brand colour, the other a full-width block on a sunken surface — and
 * both render on `/product/p-0001`. Nothing coordinates them: no prefix convention, no shared
 * stylesheet, no reviewer who happened to notice. If the boundary leaks, one component
 * visibly becomes the other.
 *
 * That collision is the INPUT, not the failure. Section 1 asserts it still exists, because a
 * suite that quietly stops testing anything is worse than no suite.
 *
 * Seven sections:
 *
 *   1  sources       what each team wrote, and the source-level collisions between them
 *   2  identifiers   what the build emitted, whether it is unique, and *why* it is unique
 *   3  isolation     computed styles on the page where both render
 *   4  cascade       does any app's rule reach any other app's element
 *   5  order         does flipping stylesheet order change any of it
 *   6  containment   does a module leak anything global on its way out
 *   7  cost          bytes, and how much of them the page actually uses
 *   8  delivery      is CSS split per route and component, and fetched only where it renders
 *   9  arrangement   the two components nested inside each other, both ways round
 *
 * Section 9 answers the fair objection to all of the above: on the real page the two
 * components sit eight levels apart, in `header` and `main`, so they never got close enough to
 * fight. It clones both into one container as siblings and then nests each inside the other,
 * and both stylesheets now carry a DESCENDANT selector (`.panel .label`) with contradictory
 * declarations — a rule that reaches down the tree and would, if class names were global,
 * restyle whatever `.label` it found inside whatever `.panel` it was in.
 *
 * Section 8 earned its place immediately: it found cart shipping a 19.9 kB stylesheet on
 * every page of the site that measured **0% used** on /faq. The header badge imported the
 * app's shared utility bundle, as every component in that app did — a convention that is
 * harmless for a component on one route and expensive for one in the chrome. Rewriting it as
 * a self-contained CSS Module removed the import and the 19.9 kB with it.
 *
 * Section 2 is the one that earned its place. The two apps' hashes are IDENTICAL — both
 * `.panel` rules hash to the same four characters, because the hash input is the local name
 * and a path that is the same relative to each app root. Under the stock `[local]-[hash]`
 * pattern both teams would have emitted `.panel-V0TX` and one would have silently overwritten
 * the other. The app name in `localIdentName` is what separates them, and it separates them
 * by construction rather than by luck. This suite exists to keep that true.
 */
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { CATALOGUE, CHROME } from '../../contracts/src/testids.ts';
import { APPS } from './lib/inventory.mjs';
import { EDGE, ROUTES, ownerOf } from './lib/topology.mjs';
import { usedCssBytes } from './lib/coverage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');
const CONFIG = process.env.MF_CONFIG ?? 'site';

/** The page where the collision happens: cart's badge in the header, product's panel below. */
const ARENA = '/product/p-0001';

/**
 * The two colliding components, by test id, with the property each stylesheet disagrees on.
 *
 * `expect` is read from the SOURCE stylesheet, not hardcoded here, wherever it can be — but
 * these four are the declarations chosen precisely because they contradict, so they are named
 * explicitly. If someone edits a stylesheet and makes the two agree, section 1 fails first
 * and says why.
 */
const SUBJECTS = [
  { app: 'cart', testid: CHROME.miniCart, local: 'panel', display: 'inline-flex' },
  { app: 'product', testid: CATALOGUE.stockPanel, local: 'panel', display: 'block' },
];

const LIMITS = {
  /** A module's own CSS, gzip. Modules are per-component; one this big is a stylesheet. */
  moduleGzip: 2_000,
  /** Of the CSS a page downloads, how much may go unused before it is worth splitting. */
  minCoveragePct: 25,
  /**
   * Per stylesheet, per route. A sheet below this on a route it was fetched for is being
   * delivered somewhere it is not needed.
   *
   * Not zero. A stylesheet can legitimately be mostly idle on one route — utilities amortise
   * across an app and every app has a page that uses few of them. What is never legitimate is
   * a sheet that contributes nothing at all, which is what the cart bundle did on /faq.
   */
  minSheetUsePct: 5,
  /** All CSS one document route may download, gzip. */
  routeCssGzip: 24_000,
};

/** Anonymous document routes — every page a visitor can reach without signing in. */
const PROBE_ROUTES = ROUTES.filter((r) => r.host === 'storefront').map((r) => r.path);

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (text) => console.log(`        ${text}`);
const heading = (text) =>
  console.log(`\n--- ${text} ${'-'.repeat(Math.max(0, 72 - text.length))}`);

const kb = (n) => `${(n / 1024).toFixed(2)} kB`;
const pct = (n) => `${(n * 100).toFixed(0)}%`;

// ---------------------------------------------------------------------------
// 1. what each team wrote
// ---------------------------------------------------------------------------

/**
 * Parse a `.module.scss` for the things two teams can collide on.
 *
 * Deliberately a regex rather than a real Sass parser: the point is to read what the author
 * typed, not what the compiler made of it, and to keep this suite free of a build dependency
 * that would have to track the one the apps use.
 */
function readModuleSource(path) {
  const text = readFileSync(path, 'utf8');
  const stripped = text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const locals = new Set();
  // A class selector at the start of a rule, including nested `&`-free ones.
  for (const m of stripped.matchAll(/(^|[\s,>+~{}])\.([a-zA-Z_][\w-]*)/g)) locals.add(m[2]);
  const vars = [...stripped.matchAll(/\$([a-zA-Z_][\w-]*)\s*:/g)].map((m) => m[1]);
  const mixins = [...stripped.matchAll(/@mixin\s+([a-zA-Z_][\w-]*)/g)].map((m) => m[1]);
  return {
    locals: [...locals].sort(),
    vars: [...new Set(vars)].sort(),
    mixins: [...new Set(mixins)].sort(),
    bytes: Buffer.byteLength(text),
  };
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.module\.(s[ac]ss|css|less)$/i.test(entry)) out.push(full);
  }
  return out;
}

heading('1. sources — what each team wrote');

const modules = [];
for (const app of APPS) {
  for (const path of walk(join(ROOT, app.dir, 'src'))) {
    modules.push({ app: app.name, path, file: relative(ROOT, path), ...readModuleSource(path) });
  }
}

check('sources', 'the workspace contains CSS Modules to measure', modules.length > 0,
  `${modules.length} module(s)`);
for (const m of modules) {
  note(`${m.app.padEnd(9)} ${m.file}  ${m.locals.length} classes, ${m.vars.length} vars, ${m.mixins.length} mixins`);
}

/** Collisions, at the source level: a name two different applications both chose. */
const collide = (key) => {
  const byName = new Map();
  for (const m of modules) for (const name of m[key]) {
    if (!byName.has(name)) byName.set(name, new Set());
    byName.get(name).add(m.app);
  }
  return [...byName].filter(([, apps]) => apps.size > 1).map(([name, apps]) => ({ name, apps: [...apps].sort() }));
};

const classCollisions = collide('locals');
const varCollisions = collide('vars');
const mixinCollisions = collide('mixins');
const fileCollisions = [...new Map(modules.map((m) => [m.file.split('/').pop(), []])).keys()]
  .map((name) => ({ name, apps: [...new Set(modules.filter((m) => m.file.endsWith(`/${name}`)).map((m) => m.app))] }))
  .filter((f) => f.apps.length > 1);

// The experiment is only worth running if the collision is real. A refactor that renames one
// team's classes would make every check below pass while proving nothing at all.
check('sources', 'two applications declare the same class names', classCollisions.length > 0,
  classCollisions.map((c) => `.${c.name} (${c.apps.join(' + ')})`).join(', ') || 'NONE — this suite proves nothing');
check('sources', 'two applications ship the same file name', fileCollisions.length > 0,
  fileCollisions.map((f) => `${f.name} (${f.apps.join(' + ')})`).join(', ') || 'none');
check('sources', 'two applications use the same Sass variable names', varCollisions.length > 0,
  varCollisions.map((c) => `$${c.name}`).join(', ') || 'none');
check('sources', 'two applications define a mixin of the same name', mixinCollisions.length > 0,
  mixinCollisions.map((c) => `@mixin ${c.name}`).join(', ') || 'none');

// And the collision must be a real disagreement, not two teams writing the same rule twice.
for (const subject of SUBJECTS) {
  const src = modules.find((m) => m.app === subject.app && m.file.endsWith('panel.module.scss'));
  const declares = src ? readFileSync(src.path, 'utf8').includes(subject.display) : false;
  check('sources', `${subject.app}'s .${subject.local} asks for display: ${subject.display}`, declares,
    src ? src.file : 'stylesheet missing');
}

// ---------------------------------------------------------------------------
// 2. what the build emitted
// ---------------------------------------------------------------------------

heading('2. identifiers — what the build emitted, and why it is unique');

/** Every emitted CSS-Module identifier found in an app's built CSS, with its rules. */
const IDENT = /\.([a-z][a-z0-9-]*)-([a-zA-Z_][\w-]*)-([A-Za-z0-9_+/-]{4,})\b/g;

const builtCss = [];
for (const app of APPS) {
  const dist = join(ROOT, app.dir, 'dist/web');
  if (!existsSync(dist)) continue;
  const files = [];
  (function css(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) css(full);
      else if (entry.endsWith('.css')) files.push(full);
    }
  })(dist);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    builtCss.push({ app: app.name, file: relative(ROOT, file), text, bytes: Buffer.byteLength(text) });
  }
}

/** identifier -> { app, local, hash, files } for every identifier the build produced. */
const emitted = new Map();
for (const sheet of builtCss) {
  for (const m of sheet.text.matchAll(IDENT)) {
    const [, prefix, local, hash] = m;
    const id = `${prefix}-${local}-${hash}`;
    if (!emitted.has(id)) emitted.set(id, { id, prefix, local, hash, sheets: new Set() });
    emitted.get(id).sheets.add(sheet.app);
  }
}

const identifiers = [...emitted.values()].filter((e) => APPS.some((a) => a.name === e.prefix));
check('identifiers', 'the build emitted hashed module identifiers', identifiers.length > 0,
  `${identifiers.length} identifier(s)`);

// Every identifier is namespaced by the app that owns it, and appears only in that app's CSS.
const misattributed = identifiers.filter((e) => e.sheets.size !== 1 || !e.sheets.has(e.prefix));
check('identifiers', "each identifier appears only in its own application's stylesheets",
  misattributed.length === 0,
  misattributed.map((e) => `${e.id} in ${[...e.sheets].join(',')}`).join('; ') || `${identifiers.length} checked`);

// The colliding source names emit distinct identifiers.
for (const { name, apps } of classCollisions) {
  const perApp = apps.map((app) => identifiers.find((e) => e.prefix === app && e.local === name));
  const found = perApp.filter(Boolean);
  const distinct = new Set(found.map((e) => e.id));
  check('identifiers', `.${name} emits a distinct identifier per app`,
    found.length === apps.length && distinct.size === found.length,
    found.map((e) => `.${e.id}`).join('  vs  ') || 'not found in built CSS');
}

/**
 * The finding: the hash alone does not separate them.
 *
 * Both apps' `.panel` hashes to the same four characters. Under the stock `[local]-[hash]`
 * localIdentName the two teams would have emitted the identical class and the last stylesheet
 * to load would have won. The app name is not belt-and-braces; it is the whole mechanism.
 */
const hashOnly = new Map();
for (const e of identifiers) {
  const key = `${e.local}-${e.hash}`;
  if (!hashOnly.has(key)) hashOnly.set(key, new Set());
  hashOnly.get(key).add(e.prefix);
}
const wouldHaveCollided = [...hashOnly].filter(([, apps]) => apps.size > 1);
check('identifiers', 'the app name — not the hash — is what makes identifiers unique',
  wouldHaveCollided.length > 0,
  wouldHaveCollided.length
    ? `${wouldHaveCollided.length} identifier(s) would be identical under [local]-[hash]: ` +
      wouldHaveCollided.map(([k, apps]) => `.${k} (${[...apps].sort().join(' + ')})`).join(', ')
    : 'no hash collisions in this build — the check still holds, but proves less today');
if (wouldHaveCollided.length) {
  note('This is why localIdentName carries the app name: collision becomes impossible by');
  note('construction rather than improbable by hash. See packages/rsbuild-preset/src/index.ts.');
}

// Sass really compiled — no source-level construct survived into the shipped bytes.
const leakedSass = builtCss.filter((s) => /\$[a-z-]+\s*:|@mixin|@include/i.test(s.text));
check('identifiers', 'no Sass construct survives into the shipped CSS', leakedSass.length === 0,
  leakedSass.map((s) => s.file).join(', ') || `${builtCss.length} stylesheet(s) checked`);

// Nesting flattened into real selectors, so the cascade behaves the way the author read it.
const nested = builtCss.some((s) => /\.cart-panel-[\w+/-]+:hover/.test(s.text));
check('identifiers', 'nested rules flatten into hashed selectors', nested,
  nested ? '&:hover -> .cart-panel-<hash>:hover' : 'no flattened nested rule found');

// ---------------------------------------------------------------------------
// 3-7. the page where both render
// ---------------------------------------------------------------------------

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await context.newPage();

const sheetUrls = new Set();
page.on('response', (res) => {
  if (res.request().resourceType() === 'stylesheet' || res.url().endsWith('.css')) sheetUrls.add(res.url());
});

await page.coverage.startCSSCoverage();
await page.goto(`${EDGE}${ARENA}`, { waitUntil: 'networkidle' });
await page.waitForSelector(`[data-testid="${SUBJECTS[1].testid}"]`);
await page.waitForTimeout(300);
const cssCoverage = await page.coverage.stopCSSCoverage();

const PROPS = ['display', 'borderRadius', 'backgroundColor', 'padding', 'fontSize', 'fontWeight', 'textTransform'];

const readComputed = (testid) =>
  page.evaluate(
    ({ testid, props }) => {
      const el = document.querySelector(`[data-testid="${testid}"]`);
      if (!el) return null;
      const style = getComputedStyle(el);
      const child = (name) => {
        const found = el.querySelector(`[class*="-${name}-"]`);
        if (!found) return null;
        const cs = getComputedStyle(found);
        return { className: found.className, fontSize: cs.fontSize, textTransform: cs.textTransform, display: cs.display };
      };
      return {
        className: el.className,
        ...Object.fromEntries(props.map((p) => [p, style[p]])),
        label: child('label'),
        value: child('value'),
      };
    },
    { testid, props: PROPS },
  );

heading('3. isolation — computed styles where both components render');

note(`page: ${EDGE}${ARENA}`);
const computed = {};
for (const subject of SUBJECTS) {
  const got = await readComputed(subject.testid);
  computed[subject.app] = got;
  check('isolation', `${subject.app}'s component is on the page`, got !== null, `[data-testid="${subject.testid}"]`);
  if (!got) continue;
  note(`${subject.app.padEnd(9)} class="${got.className}"  display:${got.display}  radius:${got.borderRadius}  bg:${got.backgroundColor}`);
  check('isolation', `${subject.app}'s .${subject.local} renders its own display: ${subject.display}`,
    got.display === subject.display, `computed ${got.display}`);
  check('isolation', `${subject.app}'s element carries only its own namespace`,
    /^[a-z]+-/.test(got.className) && got.className.startsWith(`${subject.app}-`),
    got.className);
}

// The direct question: identical source class names, same page, different rendering.
const [a, b] = SUBJECTS.map((s) => computed[s.app]);
if (a && b) {
  const differing = PROPS.filter((p) => a[p] !== b[p]);
  check('isolation', 'the two .panel elements do not resolve to the same styles',
    differing.length > 0,
    `${differing.length}/${PROPS.length} properties differ: ${differing.join(', ')}`);
  for (const p of ['display', 'borderRadius', 'backgroundColor', 'padding']) {
    check('isolation', `.panel disagrees on ${p} and both sides win their own`,
      a[p] !== b[p], `cart ${a[p]}  ·  product ${b[p]}`);
  }
  // The nested names too — the collision is not limited to the outermost element.
  if (a.label && b.label) {
    check('isolation', '.label resolves differently in each application',
      a.label.fontSize !== b.label.fontSize || a.label.textTransform !== b.label.textTransform,
      `cart ${a.label.fontSize}/${a.label.textTransform}  ·  product ${b.label.fontSize}/${b.label.textTransform}`);
  }
  if (a.value && b.value) {
    check('isolation', '.value resolves differently in each application',
      a.value.display !== b.value.display || a.value.fontSize !== b.value.fontSize,
      `cart ${a.value.fontSize}/${a.value.display}  ·  product ${b.value.fontSize}/${b.value.display}`);
  }
}

// ---------------------------------------------------------------------------
// 4. cascade — can any app's CSS reach any other app's element
// ---------------------------------------------------------------------------

heading('4. cascade — whose rules can reach whose elements');

/**
 * Fetched in Node rather than read through `document.styleSheets`, because remote CSS is
 * cross-origin and `cssRules` throws on it — a `try/catch` there would silently skip exactly
 * the stylesheets this section exists to check.
 */
const pageSheets = [];
for (const url of sheetUrls) {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) continue;
  const text = await res.text();
  pageSheets.push({ url, owner: ownerOf(url), text, bytes: Buffer.byteLength(text) });
}
check('cascade', 'every stylesheet on the page is attributable to an application',
  pageSheets.length > 0 && pageSheets.every((s) => !s.owner.startsWith('unknown:')),
  pageSheets.map((s) => `${s.owner}:${s.bytes}b`).join(', '));

// No stylesheet may contain another application's identifiers.
const foreign = [];
for (const sheet of pageSheets) {
  for (const m of sheet.text.matchAll(IDENT)) {
    const prefix = m[1];
    if (!APPS.some((app) => app.name === prefix)) continue;
    // The shell serves other apps' CSS through the edge; attribute by the identifier's own
    // namespace only when the sheet is served by an app that is not the owner.
    if (prefix !== sheet.owner && sheet.owner !== 'shell') {
      foreign.push({ sheet: sheet.url, owner: sheet.owner, id: m[0].slice(1) });
    }
  }
}
check('cascade', "no stylesheet carries another application's identifiers", foreign.length === 0,
  foreign.slice(0, 4).map((f) => `${f.owner} ships .${f.id}`).join('; ') || `${pageSheets.length} stylesheet(s) clean`);

/**
 * The strongest form of the question, asked of the live DOM: for each element carrying a
 * module identifier, which applications' rules match it?
 *
 * A leak that regexes miss — a bare `.panel` written outside a module, a global selector wide
 * enough to catch a hashed element — shows up here and nowhere else.
 */
const reach = await page.evaluate(
  ({ selectors }) => {
    const results = [];
    for (const { app, testid } of selectors) {
      const el = document.querySelector(`[data-testid="${testid}"]`);
      if (!el) continue;
      const matching = new Set();
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin; covered by the Node-side check above
        }
        for (const rule of rules) {
          if (!rule.selectorText) continue;
          for (const part of rule.selectorText.split(',')) {
            let matches = false;
            try {
              matches = el.matches(part.trim());
            } catch {
              /* :is() and friends in old form */
            }
            if (matches) matching.add(rule.selectorText.trim());
          }
        }
      }
      results.push({ app, testid, matched: [...matching] });
    }
    return results;
  },
  { selectors: SUBJECTS.map((s) => ({ app: s.app, testid: s.testid })) },
);

for (const r of reach) {
  const others = r.matched.filter((sel) => {
    const m = /\.([a-z][a-z0-9-]*)-[\w-]+-[A-Za-z0-9_+/-]{4,}/.exec(sel);
    return m && APPS.some((app) => app.name === m[1]) && m[1] !== r.app;
  });
  check('cascade', `no other application's rule matches ${r.app}'s element`, others.length === 0,
    others.join('; ') || `${r.matched.length} same-origin rule(s) matched, all its own`);
}

// ---------------------------------------------------------------------------
// 5. order — does the cascade decide this, or does the namespace
// ---------------------------------------------------------------------------

heading('5. order — flip the cascade and measure again');

/**
 * Real isolation does not depend on load order. Federated stylesheets arrive in whatever
 * order the network settles on, and that order changes between a cold load, a warm cache and
 * a slow remote. If two teams' rules were genuinely disjoint the order cannot matter; if they
 * overlap, the last one in wins and the page renders differently on a bad day.
 *
 * Re-appending every stylesheet node in reverse moves it in document order, which is what the
 * cascade reads. It is the same flip a slow remote would produce, done deterministically.
 */
const before = Object.fromEntries(SUBJECTS.map((s) => [s.app, computed[s.app]]));
const flipped = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('link[rel="stylesheet"], style')];
  for (const node of nodes.reverse()) node.parentNode?.appendChild(node);
  return nodes.length;
});
await page.waitForTimeout(200);
note(`re-appended ${flipped} stylesheet node(s) in reverse document order`);

for (const subject of SUBJECTS) {
  const after = await readComputed(subject.testid);
  const was = before[subject.app];
  const changed = after && was ? PROPS.filter((p) => was[p] !== after[p]) : ['element vanished'];
  check('order', `${subject.app}'s .${subject.local} is unchanged by stylesheet order`,
    changed.length === 0, changed.length ? `changed: ${changed.join(', ')}` : `${PROPS.length} properties identical`);
}

// ---------------------------------------------------------------------------
// 6. containment — what a module leaks on its way out
// ---------------------------------------------------------------------------

heading('6. containment — what a module leaks globally');

/**
 * A CSS Module that emits an unhashed selector has leaked. It happens by accident — a `:root`
 * block, a bare element selector, a `:global` escape hatch someone reached for once — and it
 * is invisible until two teams disagree about `button`.
 */
const moduleSheets = builtCss.filter((s) => IDENT.test(s.text) && (IDENT.lastIndex = 0) === 0);
const globalLeaks = [];
for (const sheet of moduleSheets) {
  // Selector heads only; media queries, keyframes and custom-property blocks are not leaks.
  const body = sheet.text.replace(/@(media|supports|layer)[^{]*\{/g, '').replace(/@(keyframes|font-face|property)[^{]*\{[\s\S]*?\}\s*\}/g, '');
  for (const m of body.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
    const selector = m[2].trim();
    if (!selector || selector.startsWith('--')) continue;
    // Anything naming a hashed identifier is contained by definition.
    if (/\.[a-z][a-z0-9-]*-[\w-]+-[A-Za-z0-9_+/-]{4,}/.test(selector)) continue;
    // The design system's tokens and the preset's owner-scoped remote CSS are not modules.
    if (/^:root|^\[data-owner|^html|^\*|^:where\(/.test(selector)) continue;
    globalLeaks.push({ file: sheet.file, selector: selector.slice(0, 70) });
  }
}
const fromModules = globalLeaks.filter((l) => /panel\.module|\.module\./.test(l.file) || l.file.includes('MiniCartPlaceholder'));
check('containment', 'no CSS Module emits an unhashed global selector', fromModules.length === 0,
  fromModules.slice(0, 3).map((l) => `${l.file}: ${l.selector}`).join('; ') || `${moduleSheets.length} stylesheet(s) checked`);

/**
 * A module identifier must never appear in the HTML the server sends unless the component
 * that owns it rendered — otherwise the class is being written by hand somewhere.
 *
 * Read from `class` attributes, NOT with `IDENT`: that pattern matches CSS selectors and
 * requires a leading dot, so run against markup it finds nothing and every check built on it
 * passes on an empty set. It did exactly that here before this comment existed.
 */
const CLASS_ATTR = /class="([^"]*)"/g;
const html = await fetch(`${EDGE}${ARENA}`).then((r) => r.text());
const inHtml = [
  ...new Set(
    [...html.matchAll(CLASS_ATTR)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter((name) => /^[a-z][a-z0-9-]*-[\w-]+-[A-Za-z0-9_+/-]{4,}$/.test(name))
      .filter((name) => APPS.some((app) => name.startsWith(`${app.name}-`))),
  ),
];
const unknownInHtml = inHtml.filter((id) => !emitted.has(id));
check('containment', 'every module identifier in the HTML came from a build', unknownInHtml.length === 0,
  unknownInHtml.join(', ') || `${inHtml.length} identifier(s) in the server HTML, all accounted for`);

// And the server rendered them — the isolation is not a client-side repair job.
for (const subject of SUBJECTS) {
  const present = inHtml.some((id) => id.startsWith(`${subject.app}-${subject.local}-`));
  check('containment', `${subject.app}'s .${subject.local} is in the server HTML`, present,
    present ? 'server-rendered, no flash of unstyled content' : 'client-only');
}

// ---------------------------------------------------------------------------
// 7. cost
// ---------------------------------------------------------------------------

heading('7. cost — bytes, and how many of them are used');

for (const m of modules) {
  const built = builtCss.filter((s) => s.app === m.app && s.text.includes(`-${m.locals[0]}-`));
  const bytes = built.reduce((sum, s) => sum + s.bytes, 0);
  const gz = built.length ? gzipSync(Buffer.from(built.map((s) => s.text).join('')), { level: 9 }).length : 0;
  note(`${m.app.padEnd(9)} ${m.file.split('/').pop().padEnd(20)} source ${String(m.bytes).padStart(5)} b -> built ${String(bytes).padStart(5)} b, ${kb(gz)} gz`);
  check('cost', `${m.app}'s ${m.file.split('/').pop()} stays under ${kb(LIMITS.moduleGzip)} gzip`,
    gz > 0 && gz < LIMITS.moduleGzip, `${kb(gz)}`);
}

let cssTotal = 0;
let cssUsed = 0;
const coverageRows = [];
for (const entry of cssCoverage) {
  const used = usedCssBytes(entry.ranges);
  const total = entry.text?.length ?? 0;
  if (!total) continue;
  cssTotal += total;
  cssUsed += used;
  coverageRows.push({ url: entry.url, owner: ownerOf(entry.url), total, used, ratio: used / total });
}
for (const row of coverageRows.sort((x, y) => y.total - x.total).slice(0, 6)) {
  note(`${row.owner.padEnd(9)} ${kb(row.total).padStart(9)}  ${pct(row.ratio).padStart(4)} used  ${row.url.split('/').pop()}`);
}
const overall = cssTotal ? cssUsed / cssTotal : 0;
check('cost', `the page uses at least ${LIMITS.minCoveragePct}% of the CSS it downloads`,
  overall * 100 >= LIMITS.minCoveragePct,
  `${kb(cssUsed)} of ${kb(cssTotal)} — ${pct(overall)}`);

/**
 * The comparison the request was really about: what does a hand-written CSS Module cost
 * beside the utility CSS the rest of the site uses?
 *
 * Reported, not budgeted. They are different tools — utilities amortise across a whole app
 * and a module carries only its component — so a threshold here would be arbitrary. The
 * number is here so the next stack can be held against it.
 */
const moduleBytes = modules.reduce((sum, m) => sum + m.bytes, 0);
const pageCssGz = pageSheets.reduce((sum, s) => sum + gzipSync(Buffer.from(s.text), { level: 9 }).length, 0);
note(`CSS Modules: ${modules.length} file(s), ${kb(moduleBytes)} of source`);
note(`this page ships ${kb(pageCssGz)} gzip of CSS across ${pageSheets.length} stylesheet(s)`);

// ---------------------------------------------------------------------------
// 8. delivery — is CSS split, and fetched only where it renders
// ---------------------------------------------------------------------------

heading('8. delivery — split per route and component, or shipped everywhere');

/**
 * Isolation is only half of what a stylesheet owes a page. The other half is not being there.
 *
 * A federated site makes this easy to get wrong in a way a single bundle does not: an app's
 * CSS travels with whichever of its modules a page happens to load, so one component placed
 * in the site chrome drags its app's entire stylesheet onto every route. That is what happened
 * here — 19.9 kB of cart CSS on `/faq`, 0% of it used — and nothing in the byte budgets caught
 * it, because per-app budgets measure what an app BUILDS, not what a page FETCHES.
 */
const delivery = [];
for (const route of PROBE_ROUTES) {
  const ctx = await browser.newContext();
  const probe = await ctx.newPage();
  await probe.coverage.startCSSCoverage();
  await probe.goto(`${EDGE}${route}`, { waitUntil: 'networkidle' });
  await probe.waitForTimeout(300);
  const cov = await probe.coverage.stopCSSCoverage();

  // Which module identifiers this route actually rendered, so an unused sheet can be named.
  const rendered = await probe.evaluate(() =>
    [...new Set([...document.querySelectorAll('[class]')].flatMap((el) => String(el.className).split(/\s+/)))],
  );
  await ctx.close();

  const sheets = cov
    .filter((e) => (e.text?.length ?? 0) > 0)
    .map((e) => {
      const text = e.text ?? '';
      const used = usedCssBytes(e.ranges);
      return {
        url: e.url,
        owner: ownerOf(e.url),
        file: e.url.split('/').pop(),
        bytes: text.length,
        gzip: gzipSync(Buffer.from(text), { level: 9 }).length,
        used,
        ratio: used / text.length,
        /** The module identifiers this stylesheet defines, if any. */
        defines: [...new Set([...text.matchAll(IDENT)].map((m) => m[0].slice(1)))].filter((id) =>
          APPS.some((app) => id.startsWith(`${app.name}-`)),
        ),
      };
    });
  delivery.push({ route, sheets, rendered: new Set(rendered) });
}

for (const { route, sheets } of delivery) {
  const total = sheets.reduce((sum, s) => sum + s.gzip, 0);
  note(`${route.padEnd(18)} ${String(sheets.length).padStart(2)} sheet(s)  ${kb(total).padStart(9)} gz  ` +
    sheets.map((s) => `${s.owner}:${pct(s.ratio)}`).join(' '));
}

/**
 * The check that would have caught it. Every stylesheet a route fetches must contribute
 * something to that route.
 */
const dead = delivery.flatMap(({ route, sheets }) =>
  sheets.filter((s) => s.ratio * 100 < LIMITS.minSheetUsePct).map((s) => ({ route, ...s })),
);
check('delivery', `no route fetches a stylesheet it uses less than ${LIMITS.minSheetUsePct}% of`,
  dead.length === 0,
  dead.map((d) => `${d.route}: ${kb(d.bytes)} from ${d.owner} at ${pct(d.ratio)} (${d.file})`).join('; ') ||
    `${delivery.reduce((n, d) => n + d.sheets.length, 0)} route/stylesheet pairs, all contributing`);

/**
 * A stylesheet that defines module identifiers must only be fetched where one of them renders.
 *
 * Stated generally rather than per-component, so it keeps holding as components are added:
 * a component's CSS travels with the component, or it is not component CSS.
 */
const misdelivered = [];
for (const { route, sheets, rendered } of delivery) {
  for (const sheet of sheets) {
    if (sheet.defines.length === 0) continue;
    if (!sheet.defines.some((id) => rendered.has(id))) {
      misdelivered.push({ route, file: sheet.file, owner: sheet.owner, defines: sheet.defines.length });
    }
  }
}
check('delivery', "a component's CSS is fetched only on routes that render it",
  misdelivered.length === 0,
  misdelivered.map((m) => `${m.route}: ${m.owner}/${m.file}`).join('; ') ||
    `${modules.length} module stylesheet(s) tracked across ${PROBE_ROUTES.length} routes`);

/**
 * Split, not combined: a module's CSS must be its own file rather than merged into the app's
 * shared stylesheet. If it were merged, the route-scoping above would be unachievable no
 * matter how correct the identifiers are.
 */
for (const m of modules) {
  const own = builtCss.filter((s) => s.app === m.app && s.text.includes(`-${m.locals[0]}-`));
  const combined = own.filter((s) => s.bytes > 5_000);
  check('delivery', `${m.app}'s ${m.file.split('/').pop()} is its own chunk, not merged into the app bundle`,
    own.length > 0 && combined.length === 0,
    own.length === 0 ? 'no built CSS found'
      : combined.length ? `merged into ${combined.map((s) => `${s.file.split('/').pop()} (${kb(s.bytes)})`).join(', ')}`
        : own.map((s) => `${s.file.split('/').pop()} (${kb(s.bytes)})`).join(', '));
}

// And the whole-route figure, which is the number a visitor actually pays.
for (const { route, sheets } of delivery) {
  const total = sheets.reduce((sum, s) => sum + s.gzip, 0);
  check('delivery', `${route} stays under ${kb(LIMITS.routeCssGzip)} gzip of CSS`,
    total < LIMITS.routeCssGzip, `${kb(total)} across ${sheets.length} stylesheet(s)`);
}

// ---------------------------------------------------------------------------
// 9. arrangement — put them inside each other and measure again
// ---------------------------------------------------------------------------

heading('9. arrangement — nested inside each other, both ways round');

/**
 * Everything above measures the two components where the site happens to put them: the cart
 * badge in the header, the stock panel in the main column, eight levels apart. That is a fair
 * objection to the whole experiment — flat class selectors can only collide by NAME, and two
 * elements that never share an ancestor never test the case that actually breaks design
 * systems, which is a descendant selector reaching into someone else's subtree.
 *
 * So: clone both components out of the live page, and rebuild them in three arrangements —
 * side by side, cart inside product, product inside cart. The clones keep their real class
 * names and the real stylesheets are already loaded, so this is the shipped CSS being asked a
 * question the page's own layout never asks it.
 *
 * Both modules now carry `.panel .label` with contradictory declarations. Nested, exactly one
 * of those two rules may apply to any given label.
 */
const arrangements = await page.evaluate(
  ({ subjects, props, labelProps }) => {
    const source = Object.fromEntries(
      subjects.map((s) => [s.app, document.querySelector(`[data-testid="${s.testid}"]`)]),
    );
    if (Object.values(source).some((el) => !el)) return null;

    const read = (el) => {
      const style = getComputedStyle(el);
      const label = el.querySelector('[class*="-label-"]');
      return {
        className: el.className,
        ...Object.fromEntries(props.map((p) => [p, style[p]])),
        label: label
          ? {
              className: label.className,
              ...Object.fromEntries(labelProps.map((p) => [p, getComputedStyle(label)[p]])),
            }
          : null,
      };
    };

    const baseline = Object.fromEntries(subjects.map((s) => [s.app, read(source[s.app])]));

    // Off-screen but LAID OUT — `display: none` would make every computed value useless.
    const arena = document.createElement('div');
    arena.setAttribute('data-css-arena', '');
    arena.style.cssText = 'position:absolute;left:-10000px;top:0;width:900px';
    document.body.appendChild(arena);

    const clone = (app) => source[app].cloneNode(true);
    const [first, second] = subjects.map((s) => s.app);
    const layouts = {};

    // 1. siblings under one parent — a shared ancestor and adjacent source order
    {
      const box = document.createElement('div');
      const a = clone(first);
      const b = clone(second);
      box.append(a, b);
      arena.appendChild(box);
      layouts.siblings = { [first]: read(a), [second]: read(b) };
    }
    // 2. cart inside product's panel — product's `.panel .label` now has cart's label below it
    {
      const outer = clone(second);
      const inner = clone(first);
      outer.appendChild(inner);
      arena.appendChild(outer);
      layouts.firstInsideSecond = { [second]: read(outer), [first]: read(inner) };
    }
    // 3. and the reverse
    {
      const outer = clone(first);
      const inner = clone(second);
      outer.appendChild(inner);
      arena.appendChild(outer);
      layouts.secondInsideFirst = { [first]: read(outer), [second]: read(inner) };
    }

    const result = { baseline, layouts };
    arena.remove();
    return result;
  },
  {
    subjects: SUBJECTS.map((s) => ({ app: s.app, testid: s.testid })),
    // Declared properties only. Layout-derived values (width, computed display under a flex
    // parent) legitimately change with arrangement — blockification is CSS working, not a
    // leak — and treating them as failures would make this section lie.
    props: ['borderRadius', 'backgroundColor', 'padding', 'borderColor'],
    labelProps: ['fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'color'],
  },
);

check('arrangement', 'both components could be cloned into a shared container',
  arrangements !== null, arrangements ? 'three arrangements built' : 'source elements missing');

if (arrangements) {
  const { baseline, layouts } = arrangements;
  const NAMES = {
    siblings: 'side by side under one parent',
    firstInsideSecond: `${SUBJECTS[0].app} nested inside ${SUBJECTS[1].app}`,
    secondInsideFirst: `${SUBJECTS[1].app} nested inside ${SUBJECTS[0].app}`,
  };

  for (const [key, label] of Object.entries(NAMES)) {
    const layout = layouts[key];
    note(`${label}`);
    for (const subject of SUBJECTS) {
      const base = baseline[subject.app];
      const got = layout[subject.app];
      const drift = Object.keys(base)
        .filter((p) => p !== 'label' && p !== 'className')
        .filter((p) => base[p] !== got[p]);
      note(`    ${subject.app.padEnd(9)} ${got.className}  radius:${got.borderRadius} bg:${got.backgroundColor}`);
      check('arrangement', `${subject.app}'s .panel is unchanged ${label}`,
        drift.length === 0,
        drift.length ? drift.map((p) => `${p}: ${base[p]} -> ${got[p]}`).join(', ') : 'identical to its natural position');

      // The one the descendant selector is aimed at.
      if (base.label && got.label) {
        const labelDrift = Object.keys(base.label)
          .filter((p) => p !== 'className')
          .filter((p) => base.label[p] !== got.label[p]);
        check('arrangement', `${subject.app}'s .label keeps its own styling ${label}`,
          labelDrift.length === 0,
          labelDrift.length
            ? labelDrift.map((p) => `${p}: ${base.label[p]} -> ${got.label[p]}`).join(', ')
            : `${got.label.textTransform}/${got.label.letterSpacing}/${got.label.fontSize}`);
      }
    }
  }

  // Say the finding out loud rather than leaving it in the pass/fail column: the two labels
  // are nested in the same subtree and still disagree on every property the two teams set.
  const nestedCart = layouts.firstInsideSecond[SUBJECTS[0].app]?.label;
  const nestedProduct = layouts.firstInsideSecond[SUBJECTS[1].app]?.label;
  if (nestedCart && nestedProduct) {
    const differ = ['textTransform', 'letterSpacing', 'color'].filter((p) => nestedCart[p] !== nestedProduct[p]);
    check('arrangement', 'a descendant rule cannot escape its own component',
      differ.length > 0,
      `nested in one subtree, the two .label elements still differ on ${differ.join(', ')}`);
    note(`    ${SUBJECTS[0].app}'s label: ${nestedCart.textTransform} / ${nestedCart.letterSpacing}`);
    note(`    ${SUBJECTS[1].app}'s label: ${nestedProduct.textTransform} / ${nestedProduct.letterSpacing}`);
  }
}

await browser.close();

// ---------------------------------------------------------------------------

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.log(`\n${failed.length} failing:`);
  for (const f of failed) console.log(`  ${f.section}: ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  process.exitCode = 1;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, `css.${CONFIG}.json`),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      config: CONFIG,
      arena: ARENA,
      limits: LIMITS,
      sources: modules.map((m) => ({ app: m.app, file: m.file, locals: m.locals, vars: m.vars, mixins: m.mixins, bytes: m.bytes })),
      collisions: { classes: classCollisions, files: fileCollisions, vars: varCollisions, mixins: mixinCollisions },
      identifiers: identifiers.map((e) => ({ id: e.id, app: e.prefix, local: e.local, hash: e.hash })),
      wouldHaveCollidedWithoutAppName: wouldHaveCollided.map(([k, apps]) => ({ id: k, apps: [...apps].sort() })),
      computed,
      cascade: reach,
      arrangement: arrangements,
      coverage: { rows: coverageRows, usedBytes: cssUsed, totalBytes: cssTotal, ratio: overall },
      delivery: delivery.map(({ route, sheets }) => ({
        route,
        gzipTotal: sheets.reduce((sum, s) => sum + s.gzip, 0),
        sheets: sheets.map(({ url, owner, file, bytes, gzip, used, ratio, defines }) => ({
          url, owner, file, bytes, gzip, used, ratio: Number(ratio.toFixed(3)), defines,
        })),
      })),
      checks,
    },
    null,
    2,
  )}\n`,
);
console.log(`\nwrote results/css.${CONFIG}.json`);
