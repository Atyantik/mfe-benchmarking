/**
 * Every parameter that shaped a run, collected from the things that actually shaped it.
 *
 * A report which does not declare its own conditions cannot be reproduced and cannot be argued
 * with. "LCP 2.6 s" means nothing without the connection it was measured over; "Svelte builds
 * 3x faster" means nothing without knowing both were built with the same optimisation flags.
 *
 * Everything here is READ from the source of truth rather than restated. The profile comes from
 * the profile module, the budgets from the budget objects the checks use, the shared
 * dependencies from the manifests the build emitted. A hand-maintained list would drift from the
 * run it claims to describe, which is worse than no list at all.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { PROFILE, PROFILES } from './profile.mjs';
import { DOCUMENT_ROUTES, HOSTS, REMOTES, ROUTES, VITALS_BUDGET, ZONE_ROUTES } from './topology.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);

/** Every MF_* variable in effect, so a run started with an unusual flag says so. */
function environment() {
  const out = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('MF_')) out[key] = value;
  }
  return out;
}

/** What the build actually shared, read from the manifests it emitted. */
function sharedDependencies(stack) {
  const out = {};
  for (const remote of REMOTES) {
    const manifestPath = join(ROOT, 'stacks', stack, remote.dir.split('/').pop(), 'dist/web/mf-manifest.json');
    if (!existsSync(manifestPath)) continue;
    for (const entry of JSON.parse(readFileSync(manifestPath, 'utf8')).shared ?? []) {
      out[entry.name] ??= {
        version: entry.version ?? null,
        singleton: entry.singleton ?? false,
        requiredVersion: entry.requiredVersion ?? null,
      };
    }
  }
  return out;
}

/**
 * Versions of the tools that produced and measured the build.
 *
 * Read from the workspace catalog first, because that is where this repo pins every version and
 * therefore what a reproduction would install. `require.resolve` is the fallback for anything
 * the bench package can see directly — it is more precise, but it only resolves what happens to
 * be a dependency of THIS package, which is a subset and a misleading one.
 */
function toolchain() {
  let catalog = {};
  try {
    const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
    for (const [, name, value] of yaml.matchAll(/^\s{2}'?([@a-z0-9/._-]+)'?:\s*([0-9][^\s#]*)/gim)) {
      catalog[name] = value;
    }
  } catch {
    catalog = {};
  }
  const version = (pkg) => {
    if (catalog[pkg]) return catalog[pkg];
    try {
      return require(`${pkg}/package.json`).version;
    } catch {
      /* not a dependency of this package; fall through to the store */
    }
    /**
     * Last resort: read it out of the pnpm store path.
     *
     * `@rspack/core` is a transitive of rsbuild rather than a catalog entry, so neither of the
     * two honest sources above can see it — and it is the single most important version in a
     * report about bundler output. Omitting it because it is awkward to resolve would be the
     * wrong trade.
     */
    try {
      const dirs = readdirSync(join(ROOT, 'node_modules/.pnpm'));
      const key = `${pkg.replace('/', '+')}@`;
      const hit = dirs.find((d) => d.startsWith(key));
      return hit ? (/@([0-9][^_]*)/.exec(hit.slice(key.length - 1))?.[1] ?? null) : null;
    } catch {
      return null;
    }
  };
  return {
    node: process.version,
    v8: process.versions.v8,
    playwright: version('playwright'),
    rspack: version('@rspack/core'),
    rsbuild: version('@rsbuild/core'),
    moduleFederation: version('@module-federation/enhanced'),
    react: version('react'),
    svelte: version('svelte'),
    tailwindcss: version('tailwindcss'),
    autocannon: version('autocannon'),
    axeCore: version('axe-core'),
    webVitals: version('web-vitals'),
  };
}

/**
 * The whole parameter set.
 *
 * @param {string} stack the stack this run measured
 * @param {Record<string, unknown>} suiteLimits per-suite budgets, lifted from the raw reports
 */
export function parameters(stack, suiteLimits = {}) {
  return {
    /**
     * The conditions the browser measurements were taken under. The single most important
     * entry here: on an unthrottled localhost bytes are free and every route reports the same
     * LCP regardless of what it transfers.
     */
    profile: {
      id: PROFILE.id,
      label: PROFILE.label,
      cpuThrottleRate: PROFILE.cpuThrottle,
      network: PROFILE.network
        ? {
            downloadKbps: Math.round((PROFILE.network.downloadThroughput * 8) / 1024),
            uploadKbps: Math.round((PROFILE.network.uploadThroughput * 8) / 1024),
            latencyMs: PROFILE.network.latency,
          }
        : null,
      hardwareConcurrency: PROFILE.cores,
      v8HeapCapMb: PROFILE.heapCapMb,
      viewport: PROFILE.viewport ?? 'reference (unchanged)',
      available: Object.keys(PROFILES),
    },
    environment: environment(),
    toolchain: toolchain(),
    topology: {
      hosts: HOSTS.map((h) => ({ name: h.name, port: h.port, prefix: h.prefix, navigation: h.nav })),
      remotes: REMOTES.map((r) => ({ name: r.name, port: r.port, kind: r.kind })),
      routeCount: ROUTES.length,
      documentRoutes: DOCUMENT_ROUTES.map((r) => r.path),
      zoneRoutes: ZONE_ROUTES.map((r) => r.path),
    },
    sharedDependencies: sharedDependencies(stack),
    budgets: {
      /**
       * Core Web Vitals thresholds, and the waivers against them.
       *
       * A waiver is not a pass: the route is over the threshold, the number stays visible, and
       * the reason is committed beside it so the next reader can disagree with the reason
       * rather than discover a moved threshold.
       */
      vitals: VITALS_BUDGET,
      suites: suiteLimits,
    },
  };
}
