<script lang="ts">
  import type { MediaImage } from '@mf-eval/media';
  import { fallbackSrc, srcSet } from '@mf-eval/media';
  import { cx } from '../cx.ts';

  /**
   * The only way an app puts a photograph on the page.
   *
   * Images are where Core Web Vitals are usually won or lost, and in the same three ways every
   * time: no dimensions so the box is not reserved (CLS), one size for every screen, and either
   * the LCP image lazy-loaded or every image eager. All three are handled here so no app author
   * has to remember them. See docs/media.md.
   */
  let {
    image,
    alt,
    sizes,
    priority = false,
    eager = false,
    class: klass,
    imgClass,
    ...rest
  }: {
    image: MediaImage;
    alt: string;
    sizes: string;
    priority?: boolean;
    eager?: boolean;
    class?: string;
    imgClass?: string;
  } & Record<string, unknown> = $props();

  const immediate = $derived(priority || eager);
  // The wrapper holds the box open at the right ratio before a byte of image arrives, which is
  // what makes the layout shift zero rather than small.
  const style = $derived(
    immediate
      ? `aspect-ratio: ${image.width} / ${image.height}`
      : `aspect-ratio: ${image.width} / ${image.height};background-image:url("${image.lqip}");background-size:cover;background-position:center`,
  );
</script>

<div class={cx('relative overflow-hidden bg-sunken', klass)} {style}>
  <picture>
    <source type="image/avif" srcset={srcSet(image, 'avif')} {sizes} />
    <source type="image/webp" srcset={srcSet(image, 'webp')} {sizes} />
    <img
      src={fallbackSrc(image)}
      srcset={srcSet(image, 'jpeg')}
      {sizes}
      {alt}
      width={image.width}
      height={image.height}
      loading={immediate ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      class={cx('absolute inset-0 size-full object-cover', imgClass)}
      {...rest}
    />
  </picture>
</div>
