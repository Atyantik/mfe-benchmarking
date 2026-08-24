/**
 * Sign a browser context in.
 *
 * Every suite that measures the account area needs this now that the area is gated, and each
 * doing it its own way would mean each getting the journey subtly different. It posts the
 * form exactly as a browser does, then hands the cookies to the context — so what is under
 * measurement afterwards is the account area, not the login flow. `auth.mjs` measures the
 * flow itself.
 */
import { EDGE, LOGIN } from './topology.mjs';

export async function sessionCookies() {
  const res = await fetch(EDGE + LOGIN.path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: LOGIN.email,
      password: LOGIN.password,
      next: '/my-account',
    }).toString(),
  });
  if (res.status !== 303) throw new Error(`sign-in failed: ${res.status}`);
  const { hostname } = new URL(EDGE);
  return res.headers.getSetCookie().map((raw) => {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    return {
      name: pair.slice(0, eq).trim(),
      value: pair.slice(eq + 1).trim(),
      domain: hostname,
      path: '/',
    };
  });
}

/** A browser context that is already signed in. */
export async function signedInContext(browser, options = {}) {
  const ctx = await browser.newContext(options);
  await ctx.addCookies(await sessionCookies());
  return ctx;
}

/** Header value for a plain `fetch` that needs to be signed in. */
export async function cookieHeader() {
  return (await sessionCookies()).map((c) => `${c.name}=${c.value}`).join('; ');
}
