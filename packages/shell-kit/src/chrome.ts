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
import type { FrameworkComponent } from './remotes.ts';
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
  Header: FrameworkComponent;
  Footer: FrameworkComponent;
}

/**
 * Returns null when chrome is unavailable.
 *
 * Null is a real, tested state rather than a defensive gesture: chrome deploys on its own
 * schedule, and a host that white-screens because the header is briefly unreachable has
 * traded one team's outage for everyone's. The caller renders its page without chrome —
 * plain, navigable, still server-rendered.
 */
/**
 * @typeParam C the calling stack's component type. Defaults to `unknown`, because this module
 *   resolves chrome for every stack and renders none of it — the caller names the type once,
 *   here, rather than asserting at every JSX site.
 */
export async function loadChrome<C = unknown>(
  entries: RegistryEntry[],
): Promise<{ Header: C; Footer: C } | null> {
  const entry = entries.find((e) => e.name === CHROME_REMOTE);
  if (!entry) return null;
  register([entry]);
  try {
    const [header, footer] = await Promise.all([
      loadRemote<{ Header?: C; default?: C }>(`${CHROME_REMOTE}/Header`),
      loadRemote<{ Footer?: C; default?: C }>(`${CHROME_REMOTE}/Footer`),
    ]);
    /**
     * Named export or default — both are correct, depending on the framework.
     *
     * A React component is a named `export function Header`. A `.svelte` file has exactly one
     * export and it is the default. This module resolves chrome for every stack, so it accepts
     * either rather than forcing one framework's convention onto the other. Getting this wrong
     * fails as `Cannot read properties of undefined` from deep inside the renderer, naming
     * neither the remote nor the export it wanted.
     */
    const Header = header?.Header ?? header?.default;
    const Footer = footer?.Footer ?? footer?.default;
    if (!Header || !Footer) return null;
    return { Header, Footer };
  } catch {
    return null;
  }
}

/** The exposes a host must claim so chrome's stylesheet reaches the page. */
export const CHROME_EXPOSES = ['./Header', './Footer'] as const;
