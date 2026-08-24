/**
 * The behaviour runtime.
 *
 * This is the one piece of client code that runs on every page of every app, so its failure
 * modes are everyone's failure modes. The cases below are the ones that actually bit:
 * a swallowed first click, a behaviour that throws taking the page down with it, and a
 * teardown that leaves listeners behind.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defineBehavior } from './index.ts';
import { scanBehaviors } from './runtime.ts';

/** Let queued microtasks, timers and idle callbacks drain. */
const settle = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('scanBehaviors', () => {
  it('attaches only what the markup asks for, and marks it ready', async () => {
    document.body.innerHTML = `
      <div data-behavior="a.one" data-behavior-when="immediate"></div>
      <div data-behavior="a.two" data-behavior-when="immediate"></div>`;

    const attached: string[] = [];
    const resolve = vi.fn((name: string) =>
      Promise.resolve(defineBehavior(name, () => { attached.push(name); })),
    );

    scanBehaviors(document, resolve);
    await settle();

    expect(attached.sort()).toEqual(['a.one', 'a.two']);
    expect(document.querySelector('[data-behavior="a.one"]')?.getAttribute('data-behavior-state'))
      .toBe('ready');
  });

  it('does not attach twice, so a rescan after an island renders is safe', async () => {
    document.body.innerHTML = `<div data-behavior="a.one" data-behavior-when="immediate"></div>`;
    let count = 0;
    const resolve = () => Promise.resolve(defineBehavior('a.one', () => { count += 1; }));

    scanBehaviors(document, resolve);
    scanBehaviors(document, resolve);
    await settle();
    scanBehaviors(document, resolve);
    await settle();

    expect(count).toBe(1);
  });

  it('contains a failure instead of letting it reach the page', async () => {
    document.body.innerHTML = `<div data-behavior="a.boom" data-behavior-when="immediate">kept</div>`;
    const error = vi.spyOn(console, 'error').mockImplementation(() => { /* silence expected noise */ });

    scanBehaviors(document, () => Promise.reject(new Error('404')));
    await settle();

    const el = document.querySelector('[data-behavior="a.boom"]')!;
    expect(el.getAttribute('data-behavior-state')).toBe('failed');
    // The server-rendered markup it was enhancing is untouched.
    expect(el.textContent).toBe('kept');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('contains a behaviour that throws during setup', async () => {
    document.body.innerHTML = `<div data-behavior="a.throws" data-behavior-when="immediate"></div>`;
    const error = vi.spyOn(console, 'error').mockImplementation(() => { /* silence expected noise */ });

    scanBehaviors(document, () =>
      Promise.resolve(defineBehavior('a.throws', () => { throw new Error('bad'); })),
    );
    await settle();

    expect(document.querySelector('[data-behavior]')?.getAttribute('data-behavior-state'))
      .toBe('failed');
    error.mockRestore();
  });
});

describe('the interaction strategy', () => {
  /** A behaviour whose module resolves only when the test says so. */
  function deferred() {
    let release!: (value: unknown) => void;
    const promise = new Promise((r) => { release = r; });
    return { promise, release };
  }

  it('does nothing until the visitor reaches for the control', async () => {
    document.body.innerHTML = `<button data-behavior="a.menu" data-behavior-when="interaction"></button>`;
    const resolve = vi.fn(() => Promise.resolve(defineBehavior('a.menu', () => { /* attaches nothing */ })));

    scanBehaviors(document, resolve);
    await settle();

    expect(resolve).not.toHaveBeenCalled();
  });

  it('replays the click that triggered it, so the first press is not swallowed', async () => {
    document.body.innerHTML = `<button data-behavior="a.menu" data-behavior-when="interaction">Menu</button>`;
    const button = document.querySelector('button')!;

    const gate = deferred();
    const clicks: string[] = [];
    const resolve = vi.fn(() =>
      gate.promise.then(() =>
        defineBehavior('a.menu', (root, ctx) => {
          ctx.on(root, 'click', () => { clicks.push('handled'); });
        }),
      ),
    );

    scanBehaviors(document, resolve);
    await settle();

    // The visitor clicks while the module is still in flight.
    button.click();
    await settle();
    expect(resolve).toHaveBeenCalled();
    expect(clicks).toEqual([]);

    // Module arrives, attaches, and the held click is handed over.
    gate.release(undefined);
    await settle();
    expect(clicks).toEqual(['handled']);
  });

  it('replays a held click onto the control itself, so a checkbox still toggles', async () => {
    document.body.innerHTML = `
      <form data-behavior="a.filters" data-behavior-when="interaction">
        <input type="checkbox" name="c" />
      </form>`;
    const box = document.querySelector('input')!;

    const gate = deferred();
    const changes: boolean[] = [];
    scanBehaviors(document, () =>
      gate.promise.then(() =>
        defineBehavior('a.filters', (root, ctx) => {
          ctx.on(root, 'change', () => { changes.push(box.checked); });
        }),
      ),
    );
    await settle();

    box.click();
    await settle();
    // Held: the toggle is prevented rather than happening without anyone listening.
    expect(box.checked).toBe(false);

    gate.release(undefined);
    await settle();
    // Replayed: the checkbox is now ticked AND the behaviour saw the change.
    expect(box.checked).toBe(true);
    expect(changes).toEqual([true]);
  });

  it('still hands the interaction back when the behaviour fails to load', async () => {
    document.body.innerHTML = `
      <form data-behavior="a.filters" data-behavior-when="interaction">
        <input type="checkbox" name="c" />
      </form>`;
    const box = document.querySelector('input')!;
    const error = vi.spyOn(console, 'error').mockImplementation(() => { /* silence expected noise */ });

    const gate = deferred();
    scanBehaviors(document, () => gate.promise.then(() => { throw new Error('offline'); }));
    await settle();

    box.click();
    await settle();
    gate.release(undefined);
    await settle();

    // Degraded to the plain no-JS form — which still works — rather than a dead control.
    expect(box.checked).toBe(true);
    error.mockRestore();
  });
});

describe('teardown', () => {
  it('removes every listener the behaviour registered', async () => {
    document.body.innerHTML = `<div data-behavior="a.one" data-behavior-when="immediate"></div>`;
    const el = document.querySelector<HTMLElement>('[data-behavior]')!;
    const seen: string[] = [];
    const disposed: string[] = [];

    scanBehaviors(document, () =>
      Promise.resolve(
        defineBehavior('a.one', (root, ctx) => {
          ctx.on(root, 'click', () => { seen.push('click'); });
          ctx.cleanup(() => { disposed.push('first'); });
          ctx.cleanup(() => { disposed.push('second'); });
        }),
      ),
    );
    await settle();

    el.click();
    expect(seen).toEqual(['click']);

    (el as HTMLElement & { __mfTeardown?: () => void }).__mfTeardown!();
    el.click();

    expect(seen).toEqual(['click']);
    // Last registered runs first, so cleanup unwinds the way it was built up.
    expect(disposed).toEqual(['second', 'first']);
  });

  it('survives a disposer that throws — a half-cleaned page is worse than a leak', async () => {
    document.body.innerHTML = `<div data-behavior="a.one" data-behavior-when="immediate"></div>`;
    const el = document.querySelector<HTMLElement>('[data-behavior]')!;
    const disposed: string[] = [];

    scanBehaviors(document, () =>
      Promise.resolve(
        defineBehavior('a.one', (_root, ctx) => {
          ctx.cleanup(() => { disposed.push('first'); });
          ctx.cleanup(() => { throw new Error('nope'); });
        }),
      ),
    );
    await settle();

    expect(() => {
      (el as HTMLElement & { __mfTeardown?: () => void }).__mfTeardown!();
    }).not.toThrow();
    expect(disposed).toEqual(['first']);
  });
});
