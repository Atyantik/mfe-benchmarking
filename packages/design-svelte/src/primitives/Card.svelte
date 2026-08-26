<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cx } from '../cx.ts';

  /**
   * `{...rest}` is load-bearing, not tidiness.
   *
   * In the React stack, Card silently swallowed every attribute it was given — `data-testid`
   * most of all. Three federated widgets rendered perfectly and every test that looked for
   * them reported "widget missing", because the id never reached the DOM. Same trap, same
   * fix, written down in both stacks so neither reintroduces it.
   */
  let {
    children,
    class: klass,
    as = 'div',
    ...rest
  }: { children: Snippet; class?: string; as?: 'div' | 'article' | 'li' } & Record<string, unknown> =
    $props();
</script>

<svelte:element this={as} class={cx('rounded-lg border border-line bg-card shadow-e1', klass)} {...rest}>
  {@render children()}
</svelte:element>
