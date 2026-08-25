import { mount } from 'svelte';
import Badge from './Badge.svelte';

/**
 * A mount FUNCTION is exposed rather than the component itself.
 *
 * Svelte 5 components are not constructible from outside: `new Component()` was removed, and
 * the caller must go through `mount()` from the same Svelte runtime instance that compiled
 * them. Exposing the raw component would force every host to import Svelte and to have the
 * SAME copy of it — exposing a mount function keeps that requirement inside the remote.
 */
export default function mountBadge(target, props = {}) {
  const instance = mount(Badge, { target, props });
  return () => instance?.destroy?.();
}
