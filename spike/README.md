# Spikes

## `rspack-ssr` — the upgrade canary

The smallest thing that proves Module Federation SSR still works on plain Rsbuild: one host,
one remote, a Hono server, no framework beyond React.

It is kept, and deliberately not folded into the main stack, because it is the fastest way to
find out whether an MF or Rsbuild upgrade broke the foundation. **Run it before bumping either.**

```bash
cd spike/rspack-ssr/remote && pnpm build && pnpm serve   # :3001
cd spike/rspack-ssr/shell  && pnpm build && pnpm start   # :3000
curl -s localhost:3000 | grep remote-widget              # must print the remote's markup
```

If that grep comes back empty, stop and read `docs/spike-rspack-ssr.md` — the six traps it
documents are all things that fail with error messages pointing somewhere else entirely.
