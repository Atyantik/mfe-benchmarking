/**
 * Site chrome, resolved at runtime like any other remote.
 *
 * Chrome is the one remote EVERY host consumes, which is exactly why it must not be built
 * into any of them. The storefront and my-account render the same header; if it were a
 * build-time package a rebrand would need every host to rebuild and redeploy, and the two
 * would drift the moment one of them lagged.
 *
 * Loaded on the SERVER only. The markup is static, so it is rendered into the HTML and never
 * hydrated — a second host consuming it costs the browser nothing beyond chrome's CSS. The
 * container is initialised once per process and cached, so the per-render cost is a function
 * call, not a federation round trip.
 */
import type { ComponentType } from 'react';
import type { RegistryEntry } from '@mf-eval/contracts';
import { loadRemote } from '@module-federation/enhanced/runtime';

import { register } from './remotes.ts';

export const CHROME_REMOTE = 'chrome';

/** Which host is rendering. Chrome uses it to mark the active section, nothing more. */
export type ChromeHost = 'storefront' | 'my-account';

/** Display identity only. Never a credential — this reaches the rendered HTML. */
export interface Viewer {
  name: string;
  initial: string;
}

export interface Chrome {
  Header: ComponentType<{ host?: ChromeHost; viewer?: Viewer | null }>;
  Footer: ComponentType;
}

/**
 * Returns null when chrome is unavailable.
 *
 * Null is a real, tested state rather than a defensive gesture: chrome deploys on its own
 * schedule, and a host that white-screens because the header is briefly unreachable has
 * traded one team's outage for everyone's. The caller renders its page without chrome —
 * plain, navigable, still server-rendered.
 */
export async function loadChrome(entries: RegistryEntry[]): Promise<Chrome | null> {
  const entry = entries.find((e) => e.name === CHROME_REMOTE);
  if (!entry) return null;
  register([entry]);
  try {
    const [header, footer] = await Promise.all([
      loadRemote<{ Header: Chrome['Header'] }>(`${CHROME_REMOTE}/Header`),
      loadRemote<{ Footer: Chrome['Footer'] }>(`${CHROME_REMOTE}/Footer`),
    ]);
    if (!header?.Header || !footer?.Footer) return null;
    return { Header: header.Header, Footer: footer.Footer };
  } catch {
    return null;
  }
}

/** The exposes a host must claim so chrome's stylesheet reaches the page. */
export const CHROME_EXPOSES = ['./Header', './Footer'] as const;
