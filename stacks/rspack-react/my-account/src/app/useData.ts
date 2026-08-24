import { useEffect, useState } from 'react';

export type Async<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error'; error: string };

/**
 * The zone's one data hook.
 *
 * Three states, always, because a zone route that renders nothing while loading produces no
 * contentful paint — and Chrome will then not record the soft navigation at all
 * (docs/constraints.md §14). "Loading" must be something on screen, not an empty div.
 *
 * The abort guard is not defensive dressing: soft navigations are fast, and a visitor who
 * clicks Orders then Profile before the first fetch lands would otherwise see Orders' data
 * arrive into Profile's route.
 */
export function useData<T>(load: () => Promise<T>, deps: readonly unknown[]): Async<T> {
  const [value, setValue] = useState<Async<T>>({ state: 'loading' });
  useEffect(() => {
    let live = true;
    setValue({ state: 'loading' });
    load()
      .then((data) => { if (live) setValue({ state: 'ready', data }); })
      .catch((error: unknown) => { if (live) setValue({ state: 'error', error: String(error) }); });
    return () => { live = false; };
    // `load` is a new closure on every render, so it cannot be a dependency; `deps` is the
    // real input and the caller passes it.
  }, deps);
  return value;
}
