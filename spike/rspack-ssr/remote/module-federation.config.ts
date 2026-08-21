import { createModuleFederationConfig } from '@module-federation/rsbuild-plugin';

const REACT_VERSION = '19.2.8';

export default createModuleFederationConfig({
  name: 'spike_remote',
  filename: 'remoteEntry.js',
  exposes: { './Widget': './src/Widget.tsx' },
  shared: {
    // requiredVersion MUST be explicit: MF infers it from package.json, which under a
    // pnpm catalog literally reads "catalog:" and fails semver matching.
    react: { singleton: true, requiredVersion: REACT_VERSION },
    'react-dom': { singleton: true, requiredVersion: REACT_VERSION },
  },
});
