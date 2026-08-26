<script lang="ts">
  import { FAQ_TOPICS } from '@mf-eval/contracts/fixtures';
  import { SUPPORT } from '@mf-eval/contracts/testids';
  import {
    Breadcrumbs,
    Button,
    ButtonLink,
    Card,
    Container,
    Disclosure,
    EmptyState,
    inputClass,
  } from '@mf-eval/design-svelte';
  import type { SupportData } from './SupportCentre.route.ts';

  let { data }: { data: SupportData } = $props();
</script>

<Container>
  <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Support' }]} />

  <div class="grid gap-10 py-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside class="lg:sticky lg:top-4 lg:h-fit">
      <h2 class="mb-3 text-[length:var(--fs-sm)] font-semibold uppercase tracking-[0.1em] text-ink-500">
        Topics
      </h2>
      <nav aria-label="Support topics">
        <ul class="flex flex-col gap-1 text-[length:var(--fs-md)]">
          {#each FAQ_TOPICS as t (t.id)}
            <li>
              <a href={`#${t.id}`} class="block rounded-md px-2 py-1.5 text-ink-600 hover:bg-brand-50 hover:text-brand-700">
                {t.title}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
      <Card class="mt-6 p-4">
        <h3 class="text-[length:var(--fs-md)]">Still stuck?</h3>
        <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">
          An applications engineer replies within one working day.
        </p>
        <ButtonLink href="/faq/contact" size="sm" class="mt-3 w-full">Contact us</ButtonLink>
      </Card>
    </aside>

    <div>
      <h1 class="text-[length:var(--fs-3xl)] leading-tight">Support centre</h1>
      <p class="mt-2 max-w-prose text-[length:var(--fs-lg)] text-ink-600">
        Ordering, delivery, technical selection, warranty. If the answer is not here, the
        applications desk will have it.
      </p>

      <form method="get" action="/faq" role="search" class="mt-6 flex max-w-lg gap-2">
        <label for="faq-q" class="sr-only">Search support articles</label>
        <input
          id="faq-q"
          type="search"
          name="q"
          value={data.query}
          data-testid={SUPPORT.search}
          placeholder="Search — lead times, RMA, Modbus…"
          class={inputClass}
        />
        <Button type="submit">Search</Button>
      </form>

      {#if data.query}
        <p class="mt-3 text-[length:var(--fs-sm)] text-ink-500">
          <strong class="font-semibold text-ink-800">{data.matches}</strong> result{data.matches === 1 ? '' : 's'}
          for “{data.query}” ·
          <a href="/faq" class="text-brand-700 hover:underline">clear</a>
        </p>
      {/if}

      {#if data.topics.length === 0}
        <div class="mt-8">
          <EmptyState
            title="Nothing matched that search"
            body="Try a part number, a range name, or a word from the question you have."
          >
            {#snippet action()}
              <ButtonLink href="/faq/contact" tone="secondary">Ask an engineer</ButtonLink>
            {/snippet}
          </EmptyState>
        </div>
      {:else}
        <div class="mt-8 flex flex-col gap-10">
          {#each data.topics as topic (topic.id)}
            <section id={topic.id} aria-labelledby={`${topic.id}-h`} class="scroll-mt-6">
              <h2 id={`${topic.id}-h`} class="text-[length:var(--fs-xl)]">{topic.title}</h2>
              <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">{topic.blurb}</p>
              <Card class="mt-4 px-5">
                {#each topic.entries as entry, i (entry.id)}
                  <Disclosure question={entry.question} open={Boolean(data.query) || i === 0}>
                    <p>{entry.answer}</p>
                  </Disclosure>
                {/each}
              </Card>
            </section>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Container>
