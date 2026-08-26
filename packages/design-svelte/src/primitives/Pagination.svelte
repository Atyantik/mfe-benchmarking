<script lang="ts">
  import { cx } from '../cx.ts';
  let { page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string } =
    $props();

  const pages = $derived(
    Array.from({ length: pageCount }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
    ),
  );
</script>

{#if pageCount > 1}
  <nav aria-label="Pagination" class="flex items-center justify-center gap-1 py-8">
    <a
      href={hrefFor(Math.max(1, page - 1))}
      aria-disabled={page === 1}
      class={cx(
        'rounded-md border border-line px-3 py-1.5 text-[length:var(--fs-sm)]',
        page === 1 ? 'pointer-events-none opacity-40' : 'hover:border-brand-600 hover:text-brand-700',
      )}
    >Previous</a>
    {#each pages as p, i (p)}
      <span class="flex items-center gap-1">
        {#if i > 0 && p - (pages[i - 1] ?? p) > 1}<span class="px-1 text-ink-500">…</span>{/if}
        <a
          href={hrefFor(p)}
          aria-current={p === page ? 'page' : undefined}
          class={cx(
            'min-w-9 rounded-md border px-3 py-1.5 text-center text-[length:var(--fs-sm)] tabular-nums',
            p === page
              ? 'border-brand-700 bg-brand-700 font-semibold text-white'
              : 'border-line hover:border-brand-600 hover:text-brand-700',
          )}
        >{p}</a>
      </span>
    {/each}
    <a
      href={hrefFor(Math.min(pageCount, page + 1))}
      aria-disabled={page === pageCount}
      class={cx(
        'rounded-md border border-line px-3 py-1.5 text-[length:var(--fs-sm)]',
        page === pageCount ? 'pointer-events-none opacity-40' : 'hover:border-brand-600 hover:text-brand-700',
      )}
    >Next</a>
  </nav>
{/if}
