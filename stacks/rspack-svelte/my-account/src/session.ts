/**
 * Sessions — owned by the account host, because it is the thing that needs them.
 *
 * Two cookies, deliberately, and the split is the whole reason the site stays cacheable:
 *
 *   mf_session   HttpOnly, SameSite=Lax. The actual credential. Script cannot read it, so
 *                an XSS on any page of any host cannot lift it.
 *   mf_user      readable, display data only — a name and an initial. It exists so the
 *                shared header can say "Dana" without the SERVER having to know who is
 *                asking. If the server personalized the header, every response would become
 *                user-specific and no CDN could share a single page of the site
 *                (docs/decision-log.md D12).
 *
 * The authentication itself is faked: this is a performance harness, and a real identity
 * provider would add a redirect chain and a token exchange without changing anything the
 * benchmark measures. What is NOT faked is the cookie shape, the redirect flow, the gating
 * and the cache headers — those all affect the numbers.
 */
export const SESSION_COOKIE = 'mf_session';
export const USER_COOKIE = 'mf_user';

export interface Session {
  email: string;
  name: string;
  issuedAt: number;
}

/** The one account this harness knows about. Any password of 4+ characters is accepted. */
export const DEMO = {
  email: 'd.whitfield@harlowcontrols.example',
  name: 'Dana Whitfield',
  hint: 'Any password of four characters or more.',
};

export function parseCookies(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      out[key] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

export function readSession(cookieHeader: string | undefined | null): Session | null {
  const raw = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.email !== 'string' || typeof parsed.name !== 'string') return null;
    return { email: parsed.email, name: parsed.name, issuedAt: Number(parsed.issuedAt) || 0 };
  } catch {
    return null;
  }
}

export interface Credentials {
  email: string;
  password: string;
}

export function authenticate({ email, password }: Credentials): { ok: true; session: Session } | { ok: false; error: string } {
  if (!email.includes('@')) return { ok: false, error: 'Enter the email address on your trade account.' };
  if (password.length < 4) return { ok: false, error: 'That password is too short.' };
  // Fixed timestamp so a session cookie is byte-stable across a benchmark run.
  return { ok: true, session: { email, name: DEMO.name, issuedAt: 0 } };
}

const MAX_AGE = 60 * 60 * 8;

export function sessionCookies(session: Session): string[] {
  const user = { name: session.name, initial: session.name.charAt(0).toUpperCase() };
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`,
    // Readable on purpose — the header behaviour needs it, and it carries nothing secret.
    `${USER_COOKIE}=${encodeURIComponent(JSON.stringify(user))}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`,
  ];
}

export function clearedCookies(): string[] {
  return [
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    `${USER_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`,
  ];
}

/**
 * Where to send someone after signing in.
 *
 * Only same-site paths. An open redirect here bounces a freshly authenticated visitor to an
 * attacker's page carrying the trust of having just signed in on the real site.
 *
 * Checking `startsWith('//')` is not enough, and the bench caught it: browsers also treat a
 * BACKSLASH after the leading slash as protocol-relative, so `/\evil.example` navigates
 * off-site while passing a naive same-origin test. Resolving against a known origin and
 * comparing the result is the only version of this that is not a guess.
 */
const SAFE_ORIGIN = 'https://internal.invalid';

export function safeNext(raw: string | null | undefined): string {
  if (!raw?.startsWith('/')) return '/my-account';
  try {
    const resolved = new URL(raw, SAFE_ORIGIN);
    if (resolved.origin !== SAFE_ORIGIN) return '/my-account';
    return resolved.pathname + resolved.search;
  } catch {
    return '/my-account';
  }
}
