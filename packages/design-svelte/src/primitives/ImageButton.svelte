<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx } from '../cx.ts';

  /**
   * A control whose label is an image: a gallery thumbnail, a swatch, a variant picker.
   *
   * `Button` is the wrong base here — its padding, height and typography all assume text.
   * The pressed state is `aria-pressed`, so it is announced as well as drawn.
   */
  let { children, class: klass, ...rest }: { children: Snippet; class?: string } & Record<string, unknown> =
    $props();
</script>

<button
  type="button"
  class={cx(
    'block w-full overflow-hidden rounded-md border border-line p-0 transition-colors',
    'hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2',
    'focus-visible:outline-brand-600 aria-pressed:border-brand-700',
    klass,
  )}
  {...rest}
>
  {@render children()}
</button>
