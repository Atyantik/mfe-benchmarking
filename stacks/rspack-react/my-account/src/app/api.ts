/**
 * Client data access for the account zone.
 *
 * Everything here is per-user, so it is fetched by the browser and never embedded in the
 * document — that is what keeps the HTML identical for every visitor and shareable by a
 * CDN (docs/decision-log.md D12).
 *
 * Responses are cached in memory for the life of the document. A zone is a single document
 * across many soft navigations, so going back to Orders must not refetch: a route change
 * that re-runs the same request is the SPA equivalent of a full page load, and it shows up
 * in INP rather than in a network panel anyone is looking at.
 */
import type { AccountSummary, Order, Profile } from '../data';

const cache = new Map<string, Promise<unknown>>();

async function get<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const request = fetch(`/my-account/api${path}`, { credentials: 'same-origin' }).then((res) => {
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return res.json() as Promise<T>;
  });
  // Cache the promise, not the value, so two components mounting together share one request.
  cache.set(path, request);
  request.catch(() => cache.delete(path));
  return request;
}

export const fetchSummary = () => get<AccountSummary>('/summary');
export const fetchOrders = () => get<{ orders: Order[] }>('/orders');
export const fetchOrder = (id: string) => get<Order>(`/orders/${encodeURIComponent(id)}`);
export const fetchProfile = () => get<Profile>('/profile');
