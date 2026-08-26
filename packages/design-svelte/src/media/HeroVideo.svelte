<script lang="ts">
  import type { MediaVideo } from '@mf-eval/media';
  import { mediaUrl } from '@mf-eval/media';
  import { cx } from '../cx.ts';

  /**
   * A poster is not optional: without one a `<video>` paints nothing until the first frame has
   * been fetched and decoded, so the largest element on the page is blank for as long as that
   * takes. With one, the poster IS the largest contentful paint and the video replaces it.
   *
   * `preload="none"` and autoplay look contradictory but are not — the poster carries the
   * paint, so nobody who never scrolls to it pays for the video. `muted` and `playsinline` are
   * what make autoplay legal on iOS at all.
   */
  let { video, label, class: klass, ...rest }: {
    video: MediaVideo; label: string; class?: string;
  } & Record<string, unknown> = $props();
</script>

<div
  class={cx('relative overflow-hidden bg-ink-900', klass)}
  style={`aspect-ratio: ${video.width} / ${video.height}`}
>
  <!-- svelte-ignore a11y_media_has_caption -->
  <video
    poster={mediaUrl(video.poster.path)}
    width={video.width}
    height={video.height}
    autoplay
    muted
    loop
    playsinline
    preload="none"
    aria-label={label}
    class="absolute inset-0 size-full object-cover"
    {...rest}
  >
    {#each video.sources as s (s.path)}
      <source src={mediaUrl(s.path)} type={s.type} />
    {/each}
  </video>
</div>
