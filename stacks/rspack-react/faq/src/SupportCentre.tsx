import type { PageProps, RouteLoaderArgs } from '@mf-eval/contracts';
import { FAQ_TOPICS, type FaqTopic } from '@mf-eval/contracts/fixtures';
import {
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  Container,
  Disclosure,
  EmptyState,
  inputClass,
} from '@mf-eval/design';

export interface SupportData {
  topics: FaqTopic[];
  query: string;
  matches: number;
}

/**
 * Search runs on the server, against the URL. No JavaScript, no index to ship, and every
 * result is a real address someone can send to a colleague — or a crawler can follow.
 */
export function loader({ request }: RouteLoaderArgs): SupportData {
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase();
  if (!query) {
    return { topics: [...FAQ_TOPICS], query: '', matches: FAQ_TOPICS.flatMap((t) => t.entries).length };
  }
  const topics = FAQ_TOPICS.map((t) => ({
    ...t,
    entries: t.entries.filter((e) => `${e.question} ${e.answer}`.toLowerCase().includes(query)),
  })).filter((t) => t.entries.length > 0);
  return { topics, query, matches: topics.reduce((n, t) => n + t.entries.length, 0) };
}

export function Component({ data }: PageProps<SupportData>) {
  return (
    <Container>
      <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Support' }]} />

      <div className="grid gap-10 py-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <h2 className="mb-3 text-[length:var(--fs-sm)] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Topics
          </h2>
          <nav aria-label="Support topics">
            <ul className="flex flex-col gap-1 text-[length:var(--fs-md)]">
              {FAQ_TOPICS.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block rounded-md px-2 py-1.5 text-ink-600 hover:bg-brand-50 hover:text-brand-700">
                    {t.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Card className="mt-6 p-4">
            <h3 className="text-[length:var(--fs-md)]">Still stuck?</h3>
            <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">
              An applications engineer replies within one working day.
            </p>
            <ButtonLink href="/faq/contact" size="sm" className="mt-3 w-full">Contact us</ButtonLink>
          </Card>
        </aside>

        <div>
          <h1 className="text-[length:var(--fs-3xl)] leading-tight">Support centre</h1>
          <p className="mt-2 max-w-prose text-[length:var(--fs-lg)] text-ink-600">
            Ordering, delivery, technical selection, warranty. If the answer is not here, the
            applications desk will have it.
          </p>

          <form method="get" action="/faq" role="search" className="mt-6 flex max-w-lg gap-2">
            <label htmlFor="faq-q" className="sr-only">Search support articles</label>
            <input
              id="faq-q"
              type="search"
              name="q"
              defaultValue={data.query}
              placeholder="Search — lead times, RMA, Modbus…"
              className={inputClass}
            />
            <Button type="submit">Search</Button>
          </form>

          {data.query ? (
            <p className="mt-3 text-[length:var(--fs-sm)] text-ink-500">
              <strong className="font-semibold text-ink-800">{data.matches}</strong> result
              {data.matches === 1 ? '' : 's'} for “{data.query}” ·{' '}
              <a href="/faq" className="text-brand-700 hover:underline">clear</a>
            </p>
          ) : null}

          {data.topics.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="Nothing matched that search"
                body="Try a part number, a range name, or a word from the question you have."
                action={<ButtonLink href="/faq/contact" tone="secondary">Ask an engineer</ButtonLink>}
              />
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-10">
              {data.topics.map((topic) => (
                <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-h`} className="scroll-mt-6">
                  <h2 id={`${topic.id}-h`} className="text-[length:var(--fs-xl)]">{topic.title}</h2>
                  <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">{topic.blurb}</p>
                  <Card className="mt-4 px-5">
                    {topic.entries.map((entry, i) => (
                      <Disclosure key={entry.id} question={entry.question} open={Boolean(data.query) || i === 0}>
                        <p>{entry.answer}</p>
                      </Disclosure>
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
