import { defineBehavior } from '@mf-eval/behaviors';

/**
 * Apply a filter the moment it is ticked.
 *
 * Without this the panel needs an explicit Apply button, and with two dozen facets that
 * button sits well below where you clicked — so ticking a box appears to do nothing. That is
 * exactly how it was reported.
 *
 * The form still works without JavaScript. The Apply button is marked `data-fallback-only`
 * and hidden by CSS on the enhanced path — not by this file, because hiding a laid-out
 * element after the page has painted shifts everything under it. If this behaviour ever
 * fails to load, that same CSS brings the button back.
 */
export default defineBehavior('product.autosubmit', (root, ctx) => {
  const form = root instanceof HTMLFormElement ? root : root.querySelector('form');
  if (!form) return;

  let pending: number | undefined;
  ctx.cleanup(() => {
    if (pending !== undefined) clearTimeout(pending);
  });

  ctx.on(form, 'change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return;

    // A short debounce, so moving across several facets with the keyboard does not fire a
    // navigation per keystroke.
    if (pending !== undefined) clearTimeout(pending);
    pending = window.setTimeout(() => {
      // requestSubmit runs validation and fires a submit event; a bare .submit() skips both.
      form.requestSubmit();
    }, 120);
  });
});
