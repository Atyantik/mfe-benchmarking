import { defineBehavior } from '@mf-eval/behaviors';

/**
 * Show who is signed in, without making the page user-specific.
 *
 * The header is on every page of both hosts, so if the SERVER rendered the visitor's name
 * every response would vary by user and no CDN could share a single page of the site. That
 * is the same trap the cart badge taught (docs/decision-log.md D12), and it is worth more
 * here because the header is on literally everything.
 *
 * So the server renders one neutral label — "My account" — which is correct whether or not
 * anyone is signed in, and this behaviour refines it on the client from a readable cookie.
 * Two consequences worth being explicit about:
 *
 *   - There is no flash of the WRONG state, because "My account" is not wrong. It is just
 *     less specific than it could be.
 *   - The box is already the right size, so replacing the text moves nothing. The label is
 *     the widest of the two states by construction.
 *
 * The cookie it reads carries a display name and an initial. The session itself is HttpOnly
 * and unreadable here, which is the point: this can personalize a label and nothing else.
 */
const USER_COOKIE = 'mf_user';

function readUser(): { name: string; initial: string } | null {
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== USER_COOKIE) continue;
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(part.slice(eq + 1).trim()));
      if (typeof parsed !== 'object' || parsed === null) return null;
      const { name, initial } = parsed as { name?: unknown; initial?: unknown };
      if (typeof name !== 'string' || typeof initial !== 'string') return null;
      return { name, initial };
    } catch {
      return null;
    }
  }
  return null;
}

export default defineBehavior('chrome.account', (root) => {
  const user = readUser();
  root.setAttribute('data-signed-in', user ? 'true' : 'false');
  if (!user) return;

  const label = root.querySelector<HTMLElement>('[data-account-label]');
  const avatar = root.querySelector<HTMLElement>('[data-account-initial]');
  // First name only: a header is not the place for a full name, and it keeps the label
  // narrower than the one the server already reserved space for.
  if (label) label.textContent = user.name.split(' ')[0] ?? user.name;
  if (avatar) avatar.textContent = user.initial;
});
