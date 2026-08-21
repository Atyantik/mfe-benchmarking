import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cohortBucket, resolveRegistry, type RegistryFile } from './index.ts';

const FILE: RegistryFile = {
  revision: 'r1',
  remotes: [
    {
      name: 'faq',
      kind: 'route',
      version: '1.0.0',
      web: 'http://localhost:3101/mf-manifest.json',
      node: 'http://localhost:3101/ssr/mf-manifest.json',
    },
    {
      name: 'product',
      kind: 'route',
      version: '1.0.0',
      web: 'http://localhost:3102/mf-manifest.json',
      node: 'http://localhost:3102/ssr/mf-manifest.json',
      canary: {
        version: '2.0.0',
        web: 'http://localhost:3112/mf-manifest.json',
        node: 'http://localhost:3112/ssr/mf-manifest.json',
        percent: 50,
      },
    },
  ],
};

test('web and node resolve to different artifacts', () => {
  const web = resolveRegistry(FILE, 'web', 'default');
  const node = resolveRegistry(FILE, 'node', 'default');
  const webFaq = web.remotes.find((r) => r.name === 'faq')!;
  const nodeFaq = node.remotes.find((r) => r.name === 'faq')!;
  assert.notEqual(webFaq.entry, nodeFaq.entry);
  assert.ok(nodeFaq.entry.includes('/ssr/'));
});

test('cohort bucketing is stable and in range', () => {
  for (const c of ['a', 'b', 'user-123', 'default', '']) {
    const bucket = cohortBucket(c);
    assert.ok(bucket >= 0 && bucket < 100);
    assert.equal(bucket, cohortBucket(c), 'must be deterministic');
  }
});

test('canary is applied by cohort, not at random', () => {
  const cohorts = Array.from({ length: 200 }, (_, i) => `u${i}`);
  const onCanary = cohorts.filter(
    (c) => resolveRegistry(FILE, 'web', c).remotes.find((r) => r.name === 'product')!.version === '2.0.0',
  );
  // 50% target; allow slack for hash distribution over a small sample.
  assert.ok(onCanary.length > 60 && onCanary.length < 140, `got ${onCanary.length}/200`);

  // The same cohort must always land on the same side, or a user would flip between
  // builds mid-session and hydration would mismatch.
  for (const c of onCanary.slice(0, 20)) {
    assert.equal(
      resolveRegistry(FILE, 'web', c).remotes.find((r) => r.name === 'product')!.version,
      '2.0.0',
    );
  }
});

test('revision covers the resolved set, so canary cohorts differ', () => {
  const stable = resolveRegistry(FILE, 'web', 'default');
  const cohorts = Array.from({ length: 50 }, (_, i) => `u${i}`);
  const canaryCohort = cohorts.find(
    (c) => resolveRegistry(FILE, 'web', c).remotes.find((r) => r.name === 'product')!.version === '2.0.0',
  )!;
  const canary = resolveRegistry(FILE, 'web', canaryCohort);
  assert.notEqual(stable.revision, canary.revision);
  assert.ok(canary.revision.includes('product@2.0.0'));
});

test('remotes with no canary are unaffected by cohort', () => {
  const a = resolveRegistry(FILE, 'web', 'a').remotes.find((r) => r.name === 'faq')!;
  const b = resolveRegistry(FILE, 'web', 'zzz').remotes.find((r) => r.name === 'faq')!;
  assert.deepEqual(a, b);
});
