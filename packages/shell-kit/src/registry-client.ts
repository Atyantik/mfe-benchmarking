/**
 * Registry client — docs/topology.md § Rule 3.
 *
 * The registry sits on the SSR critical path. If it blips, every page must keep
 * serving from the last known good snapshot rather than going down. That is the
 * single most important behaviour in this file.
 */
import { MARKS, mark, type RegistryResponse } from '@mf-eval/contracts';

declare const __MF_REGISTRY_URL__: string;
const REGISTRY_URL = __MF_REGISTRY_URL__;

interface CacheEntry {
  value: RegistryResponse;
  etag?: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5_000;

export class RegistryUnavailableError extends Error {}

/**
 * Resolve the remote set for an environment.
 *
 * Fails open: on any error, a previously cached snapshot is returned no matter how
 * stale, and `stale: true` is reported so the caller can surface it. Only a failure
 * with no cache at all throws.
 */
export async function fetchRegistry(
  env: 'web' | 'node',
  cohort: string,
): Promise<{ registry: RegistryResponse; stale: boolean }> {
  const key = `${env}:${cohort}`;
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh) return { registry: cached.value, stale: false };

  mark(MARKS.registryFetchStart);
  try {
    const res = await fetch(
      `${REGISTRY_URL}/registry?env=${env}&cohort=${encodeURIComponent(cohort)}`,
      { headers: cached?.etag ? { 'if-none-match': cached.etag } : {} },
    );

    if (res.status === 304 && cached) {
      cached.fetchedAt = Date.now();
      return { registry: cached.value, stale: false };
    }
    if (!res.ok) throw new RegistryUnavailableError(`registry ${res.status}`);

    const value = (await res.json()) as RegistryResponse;
    cache.set(key, {
      value,
      ...(res.headers.get('etag') ? { etag: res.headers.get('etag')! } : {}),
      fetchedAt: Date.now(),
    });
    return { registry: value, stale: false };
  } catch (err) {
    if (cached) {
      // Serve stale rather than fail. A registry outage must degrade to "last known
      // good", never to a blank page.
      console.warn(`[shell] registry unavailable, serving stale snapshot: ${String(err)}`);
      return { registry: cached.value, stale: true };
    }
    throw new RegistryUnavailableError(
      `registry unavailable and no cached snapshot: ${String(err)}`,
    );
  } finally {
    mark(MARKS.registryFetchEnd);
  }
}

/**
 * Seed the cache from what the server already resolved.
 *
 * This is the version-skew fix. The server rendered against a specific resolved set;
 * if the browser re-queried the registry it could get a newer one published a second
 * later and hydrate against a different build. So the client starts from the server's
 * exact answer (docs/topology.md § Rule 3).
 */
export function primeRegistry(env: 'web' | 'node', cohort: string, value: RegistryResponse): void {
  cache.set(`${env}:${cohort}`, { value, fetchedAt: Date.now() });
}
