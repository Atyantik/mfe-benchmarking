export type Async<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; error: string };

/**
 * The zone's one data primitive.
 *
 * Three states, always, because a zone route that renders nothing while loading produces no
 * contentful paint — and Chrome will then not record the soft navigation at all
 * (docs/constraints.md §14). "Loading" must be something on screen, not an empty div.
 *
 * The abort guard is not defensive dressing: soft navigations are fast, and a visitor who
 * clicks Orders then Profile before the first fetch lands would otherwise see Orders' data
 * arrive into Profile's route.
 *
 * The React stack expresses this as a hook with a dependency array. Runes have no dependency
 * array — `$effect` tracks what it reads — so the caller passes a function whose reads ARE the
 * dependencies, and re-running is automatic rather than declared.
 */
export class Resource<T> {
  current = $state<Async<T>>({ state: 'loading' });

  constructor(load: () => Promise<T>) {
    $effect(() => {
      let live = true;
      this.current = { state: 'loading' };
      load()
        .then((data) => {
          if (live) this.current = { state: 'ready', data };
        })
        .catch((error: unknown) => {
          if (live) this.current = { state: 'error', error: String(error) };
        });
      return () => {
        live = false;
      };
    });
  }
}
