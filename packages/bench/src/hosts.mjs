/**
 * Multi-host topology — two applications, one origin, one shared header.
 *
 * Everything the other suites assume about "the site" stopped being true when it grew a
 * second host. This one tests the seams that only exist because there are two:
 *
 *   1  routing        the edge sends each prefix to the right application
 *   2  one origin     state crosses the host boundary because a browser sees one origin
 *   3  isolation      neither host's code appears on the other's pages
 *   4  shared chrome  one header, two hosts, byte-identical, and zero client cost
 *   5  the zone       client routing inside my-account, document loads at its edges
 *   6  splitting      a zone route's code arrives when the route does, not before
 *   7  degradation    a dead remote degrades one region, never a site  (opt-in)
 *
 * Destructive checks are opt-in via MF_DESTRUCTIVE=1 because they stop and restart services,
 * which is rude to whoever is looking at the site.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import {
  EDGE,
  HOSTS,
  REMOTES,
  ROUTES,
  ZONE_WALK,
  hostOf,
  isUnknownOwner,
  ownerOf,
} from './lib/topology.mjs';
import { cookieHeader, signedInContext } from './lib/signin.mjs';

/**
 * The account area is behind a login now, so every measurement of it starts signed in.
 * `auth.mjs` measures the gate itself; here it would only be noise.
 */
const SESSION = await cookieHeader();
const isGated = (path) => path.startsWith('/my-account');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');
const DESTRUCTIVE = process.env.MF_DESTRUCTIVE === '1';

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
function note(text) {
  console.log(`        ${text}`);
}
function heading(text) {
  console.log(`\n--- ${text} ${'-'.repeat(Math.max(0, 72 - text.length))}`);
}

/** Every request a page made, grouped by who served it. */
async function trace(browser, path, act) {
  const ctx = isGated(path) ? await signedInContext(browser) : await browser.newContext();
  const page = await ctx.newPage();
  const requests = [];
  const bad = [];
  const errors = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(EDGE + path, { waitUntil: 'networkidle' });
  const extra = act ? await act(page) : undefined;
  const html = await page.content();
  await ctx.close();

  const owners = new Map();
  for (const url of requests) {
    const owner = ownerOf(url);
    if (!owners.has(owner)) owners.set(owner, []);
    owners.get(owner).push(url);
  }
  return { requests, owners, bad, errors, html, extra };
}

console.log('\nmulti-host topology - two applications, one origin\n');
const browser = await chromium.launch();
const traces = {};

heading('1. routing - the edge sends each prefix to the right application');
{
  const edge = await (await fetch(`${EDGE}/__edge`)).json();
  note(edge.routes.map((r) => `${r.prefix} -> ${r.origin}`).join('   '));

  /**
   * The routing table exists twice — in the edge and in the topology the suites measure
   * against — and the two drifted the moment sign-in moved to the account host. Asserting
   * they agree turns a silent mis-attribution into a failure that names the missing prefix.
   */
  const declared = new Set(HOSTS.flatMap((h) => h.prefixes ?? [h.prefix]));
  const actual = new Set(edge.routes.map((r) => r.prefix));
  const missing = [...actual].filter((p) => !declared.has(p));
  check('routing', 'the topology knows every prefix the edge routes', missing.length === 0,
    missing.length ? `edge routes ${missing.join(', ')}, topology does not` : `${actual.size} prefix(es), both agree`);
  for (const host of HOSTS) {
    const direct = await fetch(`http://localhost:${host.port}/__health`).then(
      (r) => r.ok,
      () => false,
    );
    check('routing', `${host.name.padEnd(12)} is up on :${host.port}`, direct);
  }
  for (const route of ROUTES) {
    const res = await fetch(EDGE + route.path, {
      headers: isGated(route.path) ? { cookie: SESSION } : {},
    });
    // Only the zone host stamps this header, so it identifies which application answered.
    const zoneHeader = res.headers.get('x-mf-zone-route');
    const servedByZone = zoneHeader !== null;
    const shouldBeZone = hostOf(route.host).nav === 'zone';
    check(
      'routing',
      `${route.path.padEnd(24)} answered by ${route.host}`,
      res.ok && servedByZone === shouldBeZone,
      `${res.status}${zoneHeader ? ` route=${zoneHeader}` : ''}`,
    );
  }
}

heading('2. one origin - state crosses the host boundary');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${EDGE}/product`, { waitUntil: 'networkidle' });
  await page.locator('[data-add-id]').first().click();
  await page.locator('[data-add-id]').nth(1).click();
  await page.waitForTimeout(300);
  const onStorefront = (await page.locator('[data-testid="cart-count"]').first().textContent())?.trim();

  await page.locator('[data-testid="account-link"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="cart-count"]', { timeout: 8_000 }).catch(() => {});
  const onAccount = (await page.locator('[data-testid="cart-count"]').first().textContent())?.trim();
  const origins = await page.evaluate(() => location.origin);
  await ctx.close();

  check(
    'origin',
    'both hosts are one origin to the browser',
    origins === EDGE,
    `${origins} — separate origins would need a cookie domain and CORS credentials`,
  );
  check(
    'origin',
    'the cart survives a document load into the other application',
    onStorefront === onAccount && onStorefront !== '0',
    `storefront ${onStorefront} -> my-account ${onAccount}`,
  );
}

heading('3. isolation - neither host appears on the other');
for (const route of ROUTES) {
  traces[route.path] = await trace(browser, route.path);
  const t = traces[route.path];
  const seen = [...t.owners.keys()].filter((o) => o !== 'edge');
  const unknown = seen.filter(isUnknownOwner);
  const foreign = seen.filter((o) => !isUnknownOwner(o) && !route.owners.includes(o) && o !== 'registry');
  check(
    'isolation',
    `${route.path.padEnd(24)} loads only [${route.owners.join(' ')}]`,
    unknown.length === 0 && foreign.length === 0,
    unknown.length
      ? `origin nobody declared: ${unknown.join(', ')}`
      : foreign.length
        ? `foreign: ${foreign.join(', ')}`
        : `saw [${seen.join(' ')}]`,
  );
}
{
  // The sharpest form of the claim, stated as its own check so it cannot be lost in a list.
  const storefrontRoutes = ROUTES.filter((r) => r.host === 'storefront');
  const leaked = storefrontRoutes.filter((r) => traces[r.path].owners.has('my-account'));
  check(
    'isolation',
    'no storefront page loads a single byte of the account application',
    leaked.length === 0,
    leaked.length ? leaked.map((r) => r.path).join(', ') : `${storefrontRoutes.length} routes clean`,
  );
  /**
   * The zone may load another team's WIDGET. It must never load their ROUTES.
   *
   * The distinction is the whole point of the composition: product contributes a
   * recommendations widget to the account overview, and that is correct. Product's catalogue
   * pages, its route descriptors and its page chunks have no business in this application,
   * and pulling them would mean the account area had quietly imported an entire storefront.
   */
  const accountRoutes = ROUTES.filter((r) => r.host === 'my-account');
  const routeModules = accountRoutes.flatMap((r) =>
    (traces[r.path].requests ?? []).filter((u) => /expose_routes|product-(list|detail)|faq-(index|contact)/.test(u)),
  );
  check(
    'isolation',
    'no account page loads another team\'s ROUTES, only their widgets',
    routeModules.length === 0,
    routeModules.length
      ? routeModules.slice(0, 2).join(', ')
      : 'widgets yes, catalogues no — composition without importing an application',
  );
}

heading('4. shared chrome - one header, two hosts');
{
  const extractHeader = (html) => {
    const start = html.indexOf('<div data-owner="chrome">');
    if (start < 0) return null;
    const end = html.indexOf('<main', start);
    return end > start ? html.slice(start, end) : null;
  };
  const storefrontHeader = extractHeader(traces['/product'].html);
  const accountHeader = extractHeader(traces['/my-account'].html);

  check(
    'chrome',
    'both hosts render the chrome remote',
    Boolean(storefrontHeader) && Boolean(accountHeader),
    storefrontHeader && accountHeader ? 'present on storefront and my-account' : 'missing on one host',
  );

  /**
   * "The same header" means the same links, in the same order, going to the same places —
   * not the same class attribute. The active item is SUPPOSED to look different on each
   * host, so comparing raw markup fails for the one variation that is by design, and
   * normalising the classes away by hand would leave a check that no longer says anything.
   *
   * Comparing (text, href) is what a person means when they say the two headers match, and
   * it is what drifts first when a header is duplicated instead of shared: a campaign link
   * added on one host and not the other.
   */
  const linksOf = (html) =>
    [...(html ?? '').matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
      (m) => `${m[1]} :: ${m[2].replaceAll(/<[^>]*>/g, '').replaceAll(/\s+/g, ' ').trim()}`,
    );
  /**
   * The account link's TEXT is allowed to differ, and now does.
   *
   * The storefront's documents are shared by a CDN, so its header says "My account" for
   * everyone and personalizes on the client. The account host's documents are private, so it
   * renders the visitor's name on the server. Same component, two hosts, two correct answers
   * — the difference is a caching decision. Everything else must still match exactly.
   */
  const normaliseAccount = (links) =>
    links.map((l) => (l.startsWith('/my-account ::') ? '/my-account :: <account label>' : l));
  const storefrontLinks = normaliseAccount(linksOf(storefrontHeader));
  const accountLinks = normaliseAccount(linksOf(accountHeader));
  const sameLinks =
    storefrontLinks.length === accountLinks.length &&
    storefrontLinks.every((l, i) => l === accountLinks[i]);
  check(
    'chrome',
    'both hosts render the same header links, in the same order',
    sameLinks,
    sameLinks
      ? `${storefrontLinks.length} links match — one header, not two copies drifting`
      : `storefront ${storefrontLinks.length} vs my-account ${accountLinks.length}: ` +
        storefrontLinks.filter((l) => !accountLinks.includes(l)).slice(0, 2).join(' | '),
  );
  {
    // Same BUILD, not merely same shape: a stylesheet URL is content-hashed, so if the two
    // hosts resolved different chrome versions these would differ.
    const cssOf = (path) =>
      (traces[path].owners.get('chrome') ?? []).filter((u) => u.endsWith('.css')).sort();
    const a = cssOf('/product');
    const b = cssOf('/my-account');
    check(
      'chrome',
      'both hosts resolved the same chrome build',
      a.length > 0 && a.join() === b.join(),
      a.join() === b.join() ? a.map((u) => u.split('/').pop()).join(', ') : `${a.join()} vs ${b.join()}`,
    );
  }
  check(
    'chrome',
    'the active-section marker is the one thing that varies',
    /aria-current/.test(accountHeader ?? '') && !/aria-current/.test(storefrontHeader ?? ''),
    'my-account marks its own nav item, the storefront does not',
  );

  for (const route of ROUTES) {
    const urls = traces[route.path].owners.get('chrome') ?? [];
    const js = urls.filter((u) => u.endsWith('.js'));
    const css = urls.filter((u) => u.endsWith('.css'));
    if (route.path !== '/product' && route.path !== '/my-account') continue;
    note(`${route.path.padEnd(16)} chrome: ${css.length} stylesheet(s), ${js.length} script(s)`);
  }
  /**
   * Chrome's COMPONENTS are never shipped to the browser — they are server-rendered and never
   * hydrated, which is what makes a shared header affordable on every page of every host.
   *
   * Its one behaviour is the exception, and a deliberate one: the signed-in label cannot be
   * server-rendered on the storefront without making every response user-specific. So chrome
   * ships that, and only that, and only where the label is not already known.
   */
  const chromeComponentJs = ROUTES.filter((r) =>
    (traces[r.path].owners.get('chrome') ?? []).some(
      (u) => u.endsWith('.js') && /expose_(Header|Footer)/.test(u),
    ),
  );
  check(
    'chrome',
    'chrome never ships its components to the browser',
    chromeComponentJs.length === 0,
    chromeComponentJs.length
      ? chromeComponentJs.map((r) => r.path).join(', ')
      : 'Header and Footer are server-rendered and never hydrated',
  );
  const accountBehaviourPages = ROUTES.filter((r) =>
    (traces[r.path].owners.get('chrome') ?? []).some((u) => /behaviors__account/.test(u)),
  );
  /**
   * `/login` is on the account host and legitimately ships it: nobody is signed in there, so
   * the server has no name to render and the header is correctly neutral. What must never
   * ship it is an AUTHENTICATED account page, where the server already knew.
   */
  const redundant = accountBehaviourPages.filter((r) => r.host === 'my-account' && !r.anonymous);
  check(
    'chrome',
    'the signed-in label behaviour never ships where the server already knew the name',
    redundant.length === 0,
    redundant.length
      ? redundant.map((r) => r.path).join(', ')
      : `${accountBehaviourPages.length} page(s) need it; every authenticated account page renders the name server-side instead`,
  );
}

heading('5. the zone - client routing inside, document loads at the edges');
{
  const walk = await trace(browser, ZONE_WALK.start, async (page) => {
    await page.waitForSelector('[data-testid^="page-account"]', { timeout: 8_000 }).catch(() => {});
    await page.evaluate(() => {
      window.__doc = 'first';
    });
    const chunkRequests = [];
    page.on('request', (r) => {
      if (/account-(overview|orders|order|profile)\./.test(r.url())) chunkRequests.push(r.url());
    });
    const apiRequests = [];
    page.on('request', (r) => {
      if (r.url().includes('/my-account/api/')) apiRequests.push(new URL(r.url()).pathname);
    });

    const titles = [await page.title()];
    for (const step of ZONE_WALK.steps) {
      const before = page.url();
      await page.locator(`[data-testid="${step.click}"]`).first().click();
      await page.waitForFunction((u) => location.href !== u, before, { timeout: 6_000 }).catch(() => {});
      await page.waitForSelector(`[data-testid="${step.expect}"]`, { timeout: 6_000 }).catch(() => {});
      titles.push(await page.title());
    }
    const sameDocument = (await page.evaluate(() => window.__doc)) === 'first';

    // Back and forward must work; a client router that breaks history is worse than none.
    await page.goBack();
    await page.waitForTimeout(400);
    const afterBack = new URL(page.url()).pathname;
    const backRendered = (await page.locator('[data-testid^="page-account"]').count()) > 0;

    // Leaving the zone must be a real navigation.
    await page.locator('[data-owner="chrome"] a[href="/product"]').first().click();
    await page.waitForLoadState('networkidle');
    const leftTo = new URL(page.url()).pathname;
    const documentReplaced = (await page.evaluate(() => window.__doc)) === undefined;

    return { sameDocument, titles, afterBack, backRendered, leftTo, documentReplaced, chunkRequests, apiRequests };
  });
  const z = walk.extra;

  check('zone', 'every route change inside the zone stays in one document', z.sameDocument,
    `${ZONE_WALK.steps.length} navigations, document never replaced`);
  check('zone', 'leaving the zone IS a document load', z.documentReplaced && z.leftTo === '/product',
    `landed on ${z.leftTo}, document replaced`);
  check('zone', 'back restores the previous zone route', z.backRendered,
    `back -> ${z.afterBack}`);
  {
    /**
     * The title must change on every TRANSITION, not be globally unique.
     *
     * The walk visits Orders twice, so it legitimately repeats a title — the first version
     * of this check counted distinct titles and failed on correct behaviour. What matters is
     * that consecutive routes never share one, because a soft navigation that leaves the
     * title alone is indistinguishable from no navigation to a screen reader or to history.
     */
    const stuck = z.titles.slice(1).map((t, i) => (t === z.titles[i] ? `${i}` : null)).filter(Boolean);
    check('zone', 'the document title changes on every route transition', stuck.length === 0,
      stuck.length
        ? `unchanged after step ${stuck.join(', ')}: ${z.titles.join(' | ')}`
        : z.titles.join(' -> '));
  }
  check('zone', 'a zone walk produces no 4xx or 5xx', walk.bad.length === 0,
    walk.bad.length ? walk.bad.slice(0, 3).join(', ') : 'no failed requests');
  check('zone', 'a zone walk logs no console errors', walk.errors.length === 0,
    walk.errors.length ? walk.errors.slice(0, 2).join(' | ') : 'clean');

  heading('6. splitting - a zone route\'s code arrives when the route does');
  note(`route chunks fetched during the walk: ${z.chunkRequests.length}`);
  note(`api requests during the walk: ${z.apiRequests.join(' ') || 'none'}`);
  check('splitting', 'each zone route has its own chunk, fetched on entry',
    z.chunkRequests.length >= 3 && z.chunkRequests.length <= ZONE_WALK.steps.length + 1,
    `${z.chunkRequests.length} chunk(s) for ${ZONE_WALK.steps.length} navigations — not one bundle, not one per click`);
  {
    // Revisiting Orders must not refetch: a soft navigation that re-runs its request is a
    // full page load wearing a costume, and it shows up in INP rather than in the network tab.
    const counts = new Map();
    for (const p of z.apiRequests) counts.set(p, (counts.get(p) ?? 0) + 1);
    const repeated = [...counts.entries()].filter(([, n]) => n > 1);
    check('splitting', 'returning to a route refetches nothing', repeated.length === 0,
      repeated.length ? repeated.map(([p, n]) => `${p} x${n}`).join(', ') : 'data cached across soft navigations');
  }
  {
    const noindex = /<meta name="robots" content="noindex/.test(traces['/my-account'].html);
    check('zone', 'account pages are marked noindex', noindex,
      'authenticated, per-user, and of no use to a crawler');
    const storefrontIndexable = !/noindex/.test(traces['/product'].html);
    check('zone', 'storefront pages are NOT marked noindex', storefrontIndexable, 'still indexed');
  }
}

heading('7. degradation - a dead remote degrades a region, not a site');
if (!DESTRUCTIVE) {
  note('skipped — set MF_DESTRUCTIVE=1 to stop and restart chrome as part of the run.');
  note('It is skipped by default so a bench run never takes the site down under someone.');
} else {
  const { execSync } = await import('node:child_process');
  const stopChrome = () => {
    const pids = JSON.parse(
      execSync('cat .logs/pids.json', { cwd: ROOT, encoding: 'utf8' }),
    );
    const entry = pids.find((p) => p.name === 'chrome');
    if (entry) process.kill(entry.pid, 'SIGTERM');
    return entry;
  };
  const entry = stopChrome();
  await new Promise((r) => setTimeout(r, 700));
  try {
    for (const path of ['/product', '/my-account']) {
      const res = await fetch(EDGE + path);
      const html = await res.text();
      check(
        'degradation',
        `${path.padEnd(16)} still renders with chrome down`,
        res.ok && html.length > 1_000 && !html.includes('render failed'),
        `${res.status}, ${html.length} bytes, header absent but page intact`,
      );
    }
  } finally {
    execSync('node scripts/stack.mjs start', { cwd: ROOT, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1_500));
    note(`restarted the stack (chrome was pid ${entry?.pid ?? '?'})`);
  }
}

await browser.close();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.log('\nfailing:');
  for (const f of failed) console.log(`  - [${f.section}] ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  process.exitCode = 1;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'hosts.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      hosts: HOSTS,
      remotes: REMOTES,
      destructiveChecksRun: DESTRUCTIVE,
      perRoute: Object.fromEntries(
        Object.entries(traces).map(([path, t]) => [
          path,
          { owners: Object.fromEntries([...t.owners].map(([k, v]) => [k, v.length])), bad: t.bad },
        ]),
      ),
      checks,
    },
    null,
    2,
  )}\n`,
);
console.log('\nwrote results/hosts.json');
