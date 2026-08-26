/**
 * The route module: a loader and a component.
 *
 * Split across two files because a `.svelte` file has exactly one default export, so the
 * loader cannot live inside it. The React stack puts both in one `.tsx`; this is the same
 * contract expressed in two files, and the shell sees no difference — `RouteDescriptor.lazy`
 * is typed `Promise<unknown>` precisely so a stack can shape this how its framework requires.
 */
import type { RouteLoaderArgs } from '@mf-eval/contracts';
import { FAQ_TOPICS, type FaqTopic } from '@mf-eval/contracts/fixtures';

export { default as Component } from './SupportCentre.svelte';

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
