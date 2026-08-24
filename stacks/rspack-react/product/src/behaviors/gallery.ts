import { defineBehavior } from '@mf-eval/behaviors';

/**
 * Swap which gallery image is shown.
 *
 * The page already works: the main image is server-rendered and every thumbnail is a real
 * photograph with its own dimensions. This behaviour only changes WHICH one is large — so
 * with no JavaScript a visitor sees the primary image and four thumbnails, which is a worse
 * experience but not a broken one.
 *
 * It swaps `<source srcset>` as well as `<img src>` because the main image is a `<picture>`:
 * changing only the img leaves the browser using the AVIF source it already picked, and the
 * image does not change at all. That is a silent no-op, and the kind of bug that survives
 * review because the code plainly "sets the src".
 */
export default defineBehavior('product.gallery', (root, ctx) => {
  const main = root.querySelector<HTMLElement>('[data-testid="gallery-main"]');
  const picture = main?.closest('picture') ?? main?.parentElement;
  if (!main || !picture) return;

  const thumbs = [...root.querySelectorAll<HTMLElement>('[data-gallery-thumb]')];
  if (thumbs.length === 0) return;

  const mainImg = main instanceof HTMLImageElement ? main : picture.querySelector('img');
  const mainSources = [...picture.querySelectorAll('source')];
  if (!mainImg) return;

  const show = (thumb: HTMLElement) => {
    const from = thumb.querySelector('picture');
    if (!from) return;
    // Copy every candidate, format by format, so the browser re-picks from the same options
    // it had before rather than silently keeping the one it already resolved.
    const fromSources = [...from.querySelectorAll('source')];
    for (const [i, source] of mainSources.entries()) {
      const replacement = fromSources[i];
      if (replacement) source.srcset = replacement.srcset;
    }
    const fromImg = from.querySelector('img');
    if (fromImg) {
      mainImg.srcset = fromImg.srcset;
      mainImg.src = fromImg.src;
    }
    for (const other of thumbs) other.setAttribute('aria-pressed', String(other === thumb));
  };

  for (const thumb of thumbs) {
    ctx.on(thumb, 'click', () => { show(thumb); });
    // Arrow keys are how a gallery is used without a mouse.
    ctx.on(thumb, 'keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const at = thumbs.indexOf(thumb);
      const next = thumbs[(at + (event.key === 'ArrowRight' ? 1 : thumbs.length - 1)) % thumbs.length];
      next?.focus();
      if (next) show(next);
    });
  }
});
