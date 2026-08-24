import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { EDGE, ROUTES } from './lib/topology.mjs';
import { signedInContext } from './lib/signin.mjs';

const require = createRequire(import.meta.url);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../results');
const AXE = readFileSync(join(dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

const b = await chromium.launch();
const findings = [];
let total = 0;
for (const route of ROUTES) {
  const ctx = route.path.startsWith('/my-account')
    ? await signedInContext(b, { viewport: { width: 1440, height: 900 } })
    : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(EDGE + route.path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.addScriptTag({ content: AXE });
  const res = await p.evaluate(async () =>
    await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }),
  );
  const v = res.violations.sort(
    (x, y) => IMPACT_ORDER.indexOf(x.impact) - IMPACT_ORDER.indexOf(y.impact),
  );
  total += v.length;
  findings.push({ route: route.path, violations: v.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length })) });
  console.log(`\n${route.path}  ${v.length ? `${v.length} violation type(s)` : 'clean'}`);
  for (const x of v) {
    console.log(`  [${x.impact}] ${x.id}: ${x.help}  (${x.nodes.length} node(s))`);
    console.log(`      e.g. ${(x.nodes[0]?.target ?? []).join(' ')}`.slice(0, 130));
  }
  await ctx.close();
}
await b.close();

console.log(`\n${total === 0 ? 'no' : total} violation type(s) across ${ROUTES.length} routes`);
mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'a11y.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), standard: 'WCAG 2.1 A + AA', findings }, null, 2)}\n`,
);
console.log('wrote results/a11y.json');
if (total > 0) process.exitCode = 1;
