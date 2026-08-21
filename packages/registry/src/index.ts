/**
 * Runtime remote registry — docs/topology.md § Rule 3.
 *
 * The shell resolves `name -> manifest URL` from here at request time instead of
 * baking a `remotes` block into its build. That is what makes "deploy a page",
 * "add a whole new page repo", and "canary/roll back one page" possible without
 * touching the shell.
 */
import type { RegistryEntry, RegistryResponse } from '@mf-eval/contracts';

export type TargetEnv = 'web' | 'node';

export interface RegistryRecord {
  name: string;
  kind: 'route' | 'component';
  version: string;
  /** Manifest URL for the browser build. */
  web: string;
  /** Manifest URL for the Node/SSR build — a different artifact, never the same URL. */
  node: string;
  /**
   * Optional gradual rollout. `percent` is 0–100 of cohorts that get the canary.
   * Cohort is supplied by the caller so the server and the browser can agree.
   */
  canary?: {
    version: string;
    web: string;
    node: string;
    percent: number;
  };
}

export interface RegistryFile {
  revision: string;
  remotes: RegistryRecord[];
}

/** Stable 0–99 bucket from an arbitrary cohort key. Same input, same bucket, anywhere. */
export function cohortBucket(cohort: string): number {
  let h = 2166136261;
  for (let i = 0; i < cohort.length; i += 1) {
    h ^= cohort.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

export function resolveRegistry(
  file: RegistryFile,
  env: TargetEnv,
  cohort: string,
): RegistryResponse {
  const bucket = cohortBucket(cohort);
  const remotes: RegistryEntry[] = file.remotes.map((r) => {
    const useCanary = r.canary !== undefined && bucket < r.canary.percent;
    const source = useCanary ? r.canary! : r;
    return {
      name: r.name,
      kind: r.kind,
      version: source.version,
      entry: env === 'node' ? source.node : source.web,
    };
  });

  // Revision covers the resolved set, not just the file. Two cohorts on different
  // canary buckets must not share a revision, or the client could load a different
  // build from the one the server rendered against and hydration would mismatch.
  const revision = `${file.revision}:${remotes.map((r) => `${r.name}@${r.version}`).join(',')}`;
  return { remotes, revision };
}
