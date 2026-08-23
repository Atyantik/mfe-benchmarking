/**
 * Support-centre search.
 *
 * Runs on the server against the URL: no client index to ship, and every result is an
 * address someone can send to a colleague or a crawler can follow.
 */
import { describe, expect, it } from 'vitest';
import { FAQ_TOPICS } from '@mf-eval/contracts/fixtures';

import { loader } from './SupportCentre';

const load = (query = '') =>
  loader({ params: {}, request: new Request(`http://x/faq${query}`) });

const ALL = FAQ_TOPICS.flatMap((t) => t.entries).length;

describe('support centre loader', () => {
  it('returns every topic when there is no query', () => {
    const data = load();
    expect(data.topics).toHaveLength(FAQ_TOPICS.length);
    expect(data.matches).toBe(ALL);
  });

  it('matches question and answer text, case-insensitively', () => {
    const data = load('?q=RMA');
    expect(data.matches).toBeGreaterThan(0);
    expect(data.matches).toBeLessThan(ALL);
    for (const topic of data.topics) {
      for (const entry of topic.entries) {
        expect(`${entry.question} ${entry.answer}`.toLowerCase()).toContain('rma');
      }
    }
  });

  it('drops topics with no surviving entries rather than showing empty sections', () => {
    const data = load('?q=warranty');
    expect(data.topics.every((t) => t.entries.length > 0)).toBe(true);
  });

  it('treats whitespace as no query', () => {
    expect(load('?q=%20%20').matches).toBe(ALL);
  });

  it('returns nothing findable for nonsense, without throwing', () => {
    const data = load('?q=zzzznotathing');
    expect(data.topics).toEqual([]);
    expect(data.matches).toBe(0);
  });
});
