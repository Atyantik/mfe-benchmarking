import { createModuleFederationConfig } from '@module-federation/rsbuild-plugin';

const REACT_VERSION = '19.2.8';

// The web build consumes the remote's WEB manifest; the node build consumes its
// NODE manifest (served under /ssr/). They are different artifacts with different
// remoteEntry types — "global" vs "commonjs-module" — so they cannot share a URL.
export const REMOTE_WEB = 'spike_remote@http://localhost:3001/mf-manifest.json';
export const REMOTE_NODE = 'spike_remote@http://localhost:3001/ssr/mf-manifest.json';

export const webConfig = createModuleFederationConfig({
  name: 'spike_shell',
  remotes: { spike_remote: REMOTE_WEB },
  shared: {
    // requiredVersion MUST be explicit: MF infers it from package.json, which under a
    // pnpm catalog literally reads "catalog:" and fails semver matching.
    react: { singleton: true, requiredVersion: REACT_VERSION },
    'react-dom': { singleton: true, requiredVersion: REACT_VERSION },
  },
});

export const nodeConfig = createModuleFederationConfig({
  name: 'spike_shell',
  remotes: { spike_remote: REMOTE_NODE },
  shared: {
    // requiredVersion MUST be explicit: MF infers it from package.json, which under a
    // pnpm catalog literally reads "catalog:" and fails semver matching.
    react: { singleton: true, requiredVersion: REACT_VERSION },
    'react-dom': { singleton: true, requiredVersion: REACT_VERSION },
  },
});
