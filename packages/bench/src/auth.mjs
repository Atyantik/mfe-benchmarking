/**
 * Authentication — the journey, and what it costs the cache.
 *
 * Signing in is where most enterprise sites quietly give up on performance. The moment a
 * page knows who you are it stops being shareable, and from then on every request is an
 * origin request. The interesting claim in this architecture is that it does not have to be:
 * the account documents stay byte-identical for every signed-in visitor, and the personal
 * part arrives separately.
 *
 * Six sections:
 *
 *   1  the gate       anonymous requests to protected paths redirect, carrying `next`
 *   2  the form       a real POST that works with JavaScript disabled
 *   3  cookies        the session is HttpOnly; only display data is readable
 *   4  failure        a bad password is rejected without minting anything
 *   5  cacheability   what personalization costs, and what it must NOT cost
 *   6  the journey    end to end, timed, with and without JavaScript
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { EDGE, LOGIN } from './lib/topology.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'results');

const checks = [];
function check(section, label, ok, detail = '') {
  checks.push({ section, label, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}${detail ? `  - ${detail}` : ''}`);
}
const note = (t) => console.log(`        ${t}`);
const heading = (t) => console.log(`\n--- ${t} ${'-'.repeat(Math.max(0, 72 - t.length))}`);

const form = (fields) => new URLSearchParams(fields).toString();
const post = (path, fields, headers = {}) =>
  fetch(EDGE + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: form(fields),
  });

console.log('\nauthentication - the login journey, measured\n');
const browser = await chromium.launch();
const timings = {};

// -- 1. the gate -------------------------------------------------------------
heading('1. the gate - anonymous requests never reach the account area');
for (const path of LOGIN.gated) {
  const res = await fetch(EDGE + path, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  const next = new URL(location, EDGE).searchParams.get('next');
  check(
    'gate',
    `${path.padEnd(24)} redirects an anonymous visitor`,
    res.status === 302 && location.startsWith('/login'),
    `${res.status} -> ${location || '(none)'}`,
  );
  check(
    'gate',
    `${path.padEnd(24)} carries where they were going`,
    next === path,
    `next=${next ?? '(missing)'} — losing it means signing in dumps them on a dashboard`,
  );
}
{
  // The gate must not cost a render. A 302 that returns a full HTML body has rendered a page
  // nobody will read.
  const res = await fetch(`${EDGE}/my-account`, { redirect: 'manual' });
  const body = await res.text();
  check('gate', 'the redirect renders nothing', body.length < 512, `${body.length} byte body`);
}

// -- 2. the form -------------------------------------------------------------
heading('2. the form - a real POST, no JavaScript required');
{
  const res = await fetch(`${EDGE}${LOGIN.path}`);
  const html = await res.text();
  check('form', 'the sign-in page is server-rendered', res.ok && html.includes('data-testid="login-form"'),
    `${res.status}, ${html.length} bytes`);
  check('form', 'it is a POST form, not a fetch handler', /<form[^>]+method="post"/i.test(html),
    'a GET login puts credentials in the URL and in every log');
  check('form', 'it declares autocomplete, so password managers work',
    html.includes('autoComplete="username"') || html.includes('autocomplete="username"'),
    'username and current-password');

  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(EDGE + LOGIN.path, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="login-email"]').fill(LOGIN.email);
  await page.locator('[data-testid="login-password"]').fill(LOGIN.password);
  await Promise.all([
    page.waitForURL('**/my-account', { timeout: 8_000 }).catch(() => {}),
    page.locator('[data-testid="login-submit"]').click(),
  ]);
  const landed = new URL(page.url()).pathname;
  const body = (await page.textContent('body')) ?? '';
  await ctx.close();
  check('form', 'signing in works with JavaScript disabled', landed === '/my-account' && body.length > 200,
    `landed on ${landed}, ${body.trim().length} characters rendered`);
}

// -- 3. cookies --------------------------------------------------------------
heading('3. cookies - the session is not readable by script');
{
  const res = await post('/login', { email: LOGIN.email, password: LOGIN.password, next: '/my-account' });
  const setCookies = res.headers.getSetCookie();

  check('cookies', 'a successful sign-in redirects with 303', res.status === 303,
    `${res.status} -> ${res.headers.get('location')} — 303 so a reload does not re-POST`);

  const session = setCookies.find((c) => c.startsWith(`${LOGIN.sessionCookie}=`)) ?? '';
  const user = setCookies.find((c) => c.startsWith(`${LOGIN.userCookie}=`)) ?? '';
  check('cookies', 'the session cookie is HttpOnly', /httponly/i.test(session),
    'an XSS anywhere on either host must not be able to lift it');
  check('cookies', 'the session cookie is SameSite=Lax', /samesite=lax/i.test(session),
    'so a cross-site POST cannot ride it');
  check('cookies', 'the display cookie is deliberately readable', Boolean(user) && !/httponly/i.test(user),
    'it carries a name and an initial, so the shared header can personalize without the server doing it');
  check('cookies', 'the display cookie carries no credential', !/token|secret|email/i.test(decodeURIComponent(user)),
    decodeURIComponent(user.split(';')[0] ?? '').slice(0, 60));

  /**
   * Sign in through the BROWSER, so the cookie is set by the server with its real flags.
   *
   * The first version of this check wrote the cookie from `document.cookie` and then read it
   * back — which can only ever create a non-HttpOnly cookie, so it was asserting that a
   * cookie script just wrote is readable by script. It failed, correctly, and told us
   * nothing about the real one.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(EDGE + LOGIN.path, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="login-email"]').fill(LOGIN.email);
  await page.locator('[data-testid="login-password"]').fill(LOGIN.password);
  await Promise.all([
    page.waitForURL('**/my-account', { timeout: 8_000 }).catch(() => {}),
    page.locator('[data-testid="login-submit"]').click(),
  ]);
  const visible = await page.evaluate(() => document.cookie);
  const jar = await ctx.cookies();
  await ctx.close();
  check('cookies', 'the browser really holds a session', jar.some((c) => c.name === LOGIN.sessionCookie),
    `${jar.length} cookie(s) in the jar`);
  check('cookies', 'script cannot see the session the server set', !visible.includes(LOGIN.sessionCookie),
    `document.cookie exposes only: ${visible.split(';').map((c) => c.split('=')[0].trim()).join(', ') || '(nothing)'}`);
}

// -- 4. failure --------------------------------------------------------------
heading('4. failure - a bad password mints nothing');
{
  const res = await post('/login', { email: LOGIN.email, password: 'x', next: '/my-account' });
  const html = await res.text();
  check('failure', 'a short password is rejected', res.status === 422,
    `${res.status} — understood and refused, distinguishable from a render`);
  check('failure', 'no session is issued', res.headers.getSetCookie().length === 0, 'nothing Set-Cookie');
  check('failure', 'the reason is shown to the visitor', html.includes('data-testid="login-error"'), 'with role="alert"');

  const badEmail = await post('/login', { email: 'nonsense', password: LOGIN.password, next: '/my-account' });
  check('failure', 'a malformed email is rejected', badEmail.status === 422, `${badEmail.status}`);

  /**
   * Open redirect. `next` comes from a query string that anyone can put in a link, so an
   * unchecked value bounces a freshly authenticated visitor to an attacker's page — with the
   * trust of having just signed in on the real site.
   */
  for (const evil of ['//evil.example/', 'https://evil.example/', '/\\evil.example', '/\\/evil.example']) {
    const res2 = await post('/login', { email: LOGIN.email, password: LOGIN.password, next: evil });
    const location = res2.headers.get('location') ?? '';
    // Resolve it the way a browser would rather than pattern-matching the string: `/\` is
    // protocol-relative to a browser and same-origin to a naive startsWith check, which is
    // exactly how this got through the first time.
    const resolved = new URL(location || '/', EDGE);
    check('failure', `an off-site next is refused: ${evil}`, resolved.origin === EDGE,
      `redirected to ${location} which resolves to ${resolved.origin}`);
  }
}

// -- 5. cacheability ---------------------------------------------------------
heading('5. cacheability - what personalization costs, and what it must not');
{
  const anon = await fetch(`${EDGE}${LOGIN.path}`);
  check('cache', 'the sign-in page is never cached', /no-store/i.test(anon.headers.get('cache-control') ?? ''),
    anon.headers.get('cache-control') ?? '(none)');

  // Two different signed-in visitors. The documents must be identical.
  const sessionFor = async (name) => {
    const res = await post('/login', { email: `${name}@example.test`, password: LOGIN.password, next: '/my-account' });
    return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  };
  const [a, b] = await Promise.all([sessionFor('ada'), sessionFor('grace')]);
  const [pageA, pageB] = await Promise.all([
    fetch(`${EDGE}/my-account/orders`, { headers: { cookie: a } }).then((r) => r.text()),
    fetch(`${EDGE}/my-account/orders`, { headers: { cookie: b } }).then((r) => r.text()),
  ]);
  // Both sessions carry the same display name in this harness, so identical HTML here says
  // the document depends on the SESSION and nothing else about the request.
  check(
    'cache',
    'a personalized document is a pure function of the session',
    pageA === pageB && pageA.length > 1_000,
    `${pageA.length} vs ${pageB.length} bytes`,
  );

  const authed = await fetch(`${EDGE}/my-account/orders`, { headers: { cookie: a } });
  const cc = authed.headers.get('cache-control') ?? '';
  /**
   * The account document is PRIVATE, and says so.
   *
   * The server knows who is asking and renders their name into the first paint, so it must
   * not let a shared cache hand that response to anyone else. It costs nothing: an account
   * page is behind a login and never indexed, so there was never a shared audience for it —
   * only a per-visitor one, which is exactly what `private` describes.
   *
   * Note what this check is NOT claiming. It used to assert the opposite, back when the
   * server deliberately knew nothing about the visitor. Making the SSR session-aware was a
   * decision with a cost, and the cost is this header.
   */
  check('cache', 'a personalized document declares itself private', /private/.test(cc) && /no-store/.test(cc),
    cc || '(none)');
  check('cache', 'and marks itself as personalized for anything downstream',
    authed.headers.get('x-mf-personalized') === '1',
    `x-mf-personalized: ${authed.headers.get('x-mf-personalized')}`);

  const api = await fetch(`${EDGE}/my-account/api/orders`, { headers: { cookie: a } });
  check('cache', 'the API that carries personal data is not cacheable',
    /no-store/i.test(api.headers.get('cache-control') ?? ''),
    api.headers.get('cache-control') ?? '(none)');

  /**
   * The property that matters most, now that one host personalizes and the other does not:
   * SIGNING IN MUST NOT DE-CACHE THE STOREFRONT.
   *
   * This is where large sites lose their cache. One page learns who you are, someone adds
   * `Vary: Cookie` to be safe, and suddenly every catalogue page is an origin request for
   * every signed-in visitor. The storefront's documents must stay byte-identical whether or
   * not the browser is carrying a session — the header personalizes on the CLIENT precisely
   * so this stays true.
   */
  const [anonProduct, authedProduct] = await Promise.all([
    fetch(`${EDGE}/product`).then((r) => r.text()),
    fetch(`${EDGE}/product`, { headers: { cookie: a } }).then((r) => r.text()),
  ]);
  check(
    'cache',
    'signing in does NOT de-cache the storefront',
    anonProduct === authedProduct,
    anonProduct === authedProduct
      ? `${anonProduct.length} bytes, identical with and without a session`
      : `${anonProduct.length} vs ${authedProduct.length} — a session changed a public page`,
  );
  const storeCc = (await fetch(`${EDGE}/product`, { headers: { cookie: a } })).headers;
  check('cache', 'and the storefront stays shared-cacheable for signed-in visitors',
    /s-maxage/.test(storeCc.get('cache-control') ?? '') && !/cookie/i.test(storeCc.get('vary') ?? ''),
    `${storeCc.get('cache-control')} · Vary: ${storeCc.get('vary') ?? '(none)'}`);
}

// -- 6. the journey ----------------------------------------------------------
heading('6. the journey - anonymous product page to signed-in account');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const t0 = Date.now();
  await page.goto(`${EDGE}/product`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const anonLabel = (await page.locator('[data-testid="account-link"] [data-account-label]').textContent())?.trim();
  const anonFlag = await page.locator('[data-testid="account-link"]').getAttribute('data-signed-in');

  await page.locator('[data-testid="account-link"]').click();
  await page.waitForLoadState('networkidle');
  const gatedTo = new URL(page.url()).pathname;
  const tGate = Date.now();

  await page.locator('[data-testid="login-email"]').fill(LOGIN.email);
  await page.locator('[data-testid="login-password"]').fill(LOGIN.password);
  await Promise.all([
    page.waitForURL('**/my-account', { timeout: 10_000 }),
    page.locator('[data-testid="login-submit"]').click(),
  ]);
  await page.waitForSelector('[data-testid="page-account.overview"]', { timeout: 10_000 });
  const tUseful = Date.now();
  await page.waitForTimeout(600);
  const authedLabel = (await page.locator('[data-testid="account-link"] [data-account-label]').textContent())?.trim();
  const authedFlag = await page.locator('[data-testid="account-link"]').getAttribute('data-signed-in');

  timings.toGateMs = tGate - t0;
  timings.signInToUsefulMs = tUseful - tGate;
  note(`product page -> gate ${timings.toGateMs} ms   sign-in -> useful content ${timings.signInToUsefulMs} ms`);

  check('journey', 'the gate sends an anonymous visitor to sign in', gatedTo === '/login', gatedTo);
  check('journey', 'the header is neutral before sign-in', anonLabel === 'My account' && anonFlag === 'false',
    `"${anonLabel}" — correct for both states, so there is no flash of anything wrong`);
  check('journey', 'the header personalizes after sign-in', authedFlag === 'true' && authedLabel !== 'My account',
    `"${authedLabel}" — from a readable cookie, on the client, so the HTML stayed shareable`);
  check('journey', 'signed-in content renders', (await page.locator('[data-testid="page-account.overview"]').count()) > 0);

  // Sign out, and confirm the gate closes again.
  await page.locator('[data-testid="sign-out"]').click();
  await page.waitForLoadState('networkidle');
  const afterOut = new URL(page.url()).pathname;
  await page.goto(`${EDGE}/my-account/orders`);
  const gateAgain = new URL(page.url()).pathname;
  check('journey', 'signing out returns to the storefront', afterOut === '/', afterOut);
  check('journey', 'the gate closes again after signing out', gateAgain === '/login', gateAgain);
  check('journey', 'the whole journey logs no console errors', errors.length === 0,
    errors.length ? errors.slice(0, 2).join(' | ') : 'clean');
  await ctx.close();
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
  join(OUT, 'auth.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), timings, checks }, null, 2)}\n`,
);
console.log('\nwrote results/auth.json');
