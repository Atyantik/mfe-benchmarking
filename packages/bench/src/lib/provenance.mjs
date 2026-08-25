/**
 * Everything a result needs to carry to still mean something in six months.
 *
 * A number without provenance is not a measurement, it is a rumour. When a second stack is
 * measured, the only question that matters is whether its numbers are comparable to these —
 * and that question is unanswerable unless each run records what it was, what it measured,
 * and on what.
 *
 * Two fields decide comparability outright:
 *
 *   specVersion   `spec/reference-app.md` is frozen. Results from different SPEC_VERSIONs
 *                 describe different applications and must never be compared, however similar
 *                 the numbers look.
 *   catalogHash   every dependency version in the workspace, hashed. Two runs with different
 *                 catalogs may be measuring a React upgrade rather than the thing under test.
 *
 * The hardware fields are not decoration either. Two of this repo's budgets had to be rewritten
 * because they encoded a threshold that passed on a laptop and failed in CI for identical code;
 * without `cpu` and `platform` recorded, that class of disagreement is unresolvable after
 * the fact.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STACK } from './topology.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

/** The frozen spec's version, read from the spec rather than duplicated anywhere. */
export function specVersion() {
  try {
    const text = readFileSync(join(ROOT, 'spec/reference-app.md'), 'utf8');
    return Number(/SPEC_VERSION\s*=\s*(\d+)/.exec(text)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

/**
 * A hash of every pinned version in the workspace catalog.
 *
 * The catalog is the single place versions live (never a literal in an app), so hashing it
 * fingerprints the entire dependency surface in one short string that is cheap to compare.
 */
export function catalogHash() {
  try {
    const text = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
    const catalog = /catalog:\s*\n([\s\S]*?)(?=\n[a-zA-Z#]|\n*$)/.exec(text)?.[1] ?? text;
    return createHash('sha256').update(catalog).digest('hex').slice(0, 12);
  } catch {
    return 'unknown';
  }
}

export function provenance() {
  const cores = cpus();
  return {
    generatedAt: new Date().toISOString(),
    stack: STACK,
    specVersion: specVersion(),
    catalogHash: catalogHash(),
    git: {
      commit: git('rev-parse', 'HEAD'),
      shortCommit: git('rev-parse', '--short', 'HEAD'),
      branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
      /** A dirty tree means the artefacts may not match the commit. Recorded, not judged. */
      dirty: git('status', '--porcelain') !== '',
    },
    runtime: {
      node: process.version,
      v8: process.versions.v8,
      platform: `${process.platform}-${process.arch}`,
    },
    machine: {
      cpu: cores[0]?.model ?? 'unknown',
      cores: cores.length,
      memoryGb: Math.round(totalmem() / 1024 ** 3),
      ci: Boolean(process.env.CI),
    },
    /**
     * The environment of the BENCH process, which is not necessarily the environment of the
     * build it is measuring — the artefacts in `dist/` were produced by an earlier command.
     * Named accordingly so nobody reads `optimize: false` as "this build was unoptimised".
     */
    benchEnv: {
      mfConfig: process.env.MF_CONFIG ?? 'site',
      optimize: process.env.MF_OPTIMIZE === '1',
      esm: process.env.MF_ESM === '1',
    },
  };
}
