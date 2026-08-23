/**
 * @mf-eval/design — the design system.
 *
 * Build-time dependency of every app. Not a federated remote, deliberately: these are
 * pure presentation with no state and no personalization, and in this architecture pages
 * are server-rendered and never hydrated, so they cost the browser nothing at runtime.
 * Federating them would add a container and a network round trip to ship something with
 * no runtime behaviour. See docs/design-system.md for the full reasoning.
 */
export * from './primitives/index.tsx';
export * from './patterns/index.tsx';
