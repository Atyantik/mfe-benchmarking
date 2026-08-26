<script lang="ts">
  import type { MediaImage, MediaVideo } from '@mf-eval/media';
  /** CC BY and CC BY-SA both require this to be visible, not buried in a repository file. */
  let { image }: { image: MediaImage | MediaVideo } = $props();
</script>

{#if image.credit}
  <p class="mt-1 text-[length:var(--fs-xs)] text-ink-500">
    <a href={image.credit.source} rel="nofollow noopener" class="hover:underline">Photo</a>
    by {image.credit.author} · {image.credit.licence}
  </p>
{/if}
