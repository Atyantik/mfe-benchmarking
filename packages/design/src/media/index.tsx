/**
 * Media primitives — the only way an app puts a photograph or a video on the page.
 *
 * Images are where Core Web Vitals are usually won or lost, and they are lost in the same
 * three ways every time. All three are handled here so no app author has to remember them:
 *
 *  1. **No dimensions, so the box is not reserved.** The image arrives, everything below it
 *     jumps, and that is CLS. In the reference profile (docs/media.md): 29 images in
 *     layout, 14 with no width or height. `Picture` always emits both, from the manifest.
 *  2. **One size for every screen.** A phone downloads the desktop image. In the reference
 *     profile: zero images with `srcset`. `Picture` always emits one, across five widths
 *     and three formats.
 *  3. **The LCP image lazy-loaded, or every image eager.** Either the largest element waits
 *     for a scroll handler that never runs, or the whole page competes for bandwidth on
 *     load. `priority` makes that one decision explicit and gives it to exactly one image
 *     per page.
 *
 * The API is deliberately small: pass the manifest entry, say how wide it renders, and say
 * whether it is the LCP element. Everything else follows.
 */
import type { CSSProperties } from 'react';
import type { MediaImage, MediaVideo } from '@mf-eval/media';
import { fallbackSrc, mediaUrl, srcSet } from '@mf-eval/media';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export interface PictureProps {
  image: MediaImage;
  alt: string;
  /**
   * What the browser needs to pick a width — a `sizes` value, e.g.
   * `(min-width: 64rem) 20rem, 50vw`. Getting this wrong is how a correct `srcset` still
   * ships a 1920px file into a 300px box.
   */
  sizes: string;
  /**
   * True for the ONE image that is the largest contentful paint on this page.
   *
   * Sets `fetchpriority="high"` and eager loading, and drops the LQIP so nothing paints
   * twice. Marking several images priority is the same as marking none: they then compete
   * with each other for the same bandwidth, and the browser's own heuristics were doing a
   * better job before you intervened.
   */
  priority?: boolean;
  /**
   * True for images that are above the fold but are NOT the LCP element.
   *
   * They should not be lazy — lazy defers them behind a scroll that already happened — but
   * they must not claim high priority either, or they race the LCP image. This is the
   * distinction that "just mark the first row priority" gets wrong.
   */
  eager?: boolean;
  className?: string;
  /** Applied to the <img>; the wrapper keeps the aspect ratio. */
  imgClassName?: string;
  'data-testid'?: string;
}

export function Picture({
  image,
  alt,
  sizes,
  priority = false,
  eager = false,
  className,
  imgClassName,
  'data-testid': testId,
}: PictureProps) {
  const immediate = priority || eager;
  // The wrapper holds the box open at the right ratio before a byte of image arrives, which
  // is what makes the layout shift zero rather than small.
  const style: CSSProperties = { aspectRatio: `${image.width} / ${image.height}` };
  if (!immediate) {
    style.backgroundImage = `url("${image.lqip}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  return (
    <div className={cx('relative overflow-hidden bg-sunken', className)} style={style}>
      <picture>
        <source type="image/avif" srcSet={srcSet(image, 'avif')} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet(image, 'webp')} sizes={sizes} />
        <img
          src={fallbackSrc(image)}
          srcSet={srcSet(image, 'jpeg')}
          sizes={sizes}
          alt={alt}
          width={image.width}
          height={image.height}
          loading={immediate ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          data-testid={testId}
          className={cx('absolute inset-0 size-full object-cover', imgClassName)}
        />
      </picture>
    </div>
  );
}

export interface HeroVideoProps {
  video: MediaVideo;
  /** Describes the video for anyone who cannot see it. Not decorative. */
  label: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * The hero video.
 *
 * A poster is not optional: without one a `<video>` paints nothing until the first frame has
 * been fetched and decoded, so the largest element on the page is blank for as long as that
 * takes. With one, the poster IS the largest contentful paint and the video replaces it.
 *
 * `preload="none"` and autoplay look contradictory but are not — the poster carries the
 * paint, and the video begins once it is in view, so nobody who never scrolls to it pays for
 * it. `muted` and `playsInline` are what make autoplay legal on iOS at all.
 */
export function HeroVideo({ video, label, className, 'data-testid': testId }: HeroVideoProps) {
  return (
    <div
      className={cx('relative overflow-hidden bg-ink-900', className)}
      style={{ aspectRatio: `${video.width} / ${video.height}` }}
    >
      <video
        poster={mediaUrl(video.poster.path)}
        width={video.width}
        height={video.height}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        data-testid={testId}
        className="absolute inset-0 size-full object-cover"
      >
        {video.sources.map((s) => (
          <source key={s.path} src={mediaUrl(s.path)} type={s.type} />
        ))}
      </video>
    </div>
  );
}

/** CC BY and CC BY-SA both require this to be visible, not buried in a repository file. */
export function MediaCredit({ image }: { image: MediaImage | MediaVideo }) {
  if (!image.credit) return null;
  const { author, licence, source } = image.credit;
  return (
    <p className="mt-1 text-[length:var(--fs-xs)] text-ink-500">
      <a href={source} rel="nofollow noopener" className="hover:underline">
        Photo
      </a>{' '}
      by {author} · {licence}
    </p>
  );
}
