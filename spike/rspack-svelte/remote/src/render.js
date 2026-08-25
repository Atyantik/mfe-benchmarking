import { render } from 'svelte/server';
import Badge from './Badge.svelte';

/** Server rendering, via Svelte 5's own `svelte/server` API. */
export default function renderBadge(props = {}) {
  return render(Badge, { props });
}
