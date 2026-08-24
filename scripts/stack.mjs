#!/usr/bin/env node
/**
 * Start/stop the rspack-react stack.
 *
 * Uses spawn({ detached: true, stdio: 'ignore' }) + unref() rather than a shell
 * backgrounding trick: macOS has no setsid, and shell-backgrounded children get
 * reaped when the launching shell's process group is cleaned up.
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = join(ROOT, 'stacks/rspack-react');
const LOG = join(ROOT, '.logs');
const PIDFILE = join(LOG, 'pids.json');
mkdirSync(LOG, { recursive: true });

const SERVICES = [
  { name: 'registry', cwd: join(ROOT, 'packages/registry'), args: ['src/server.ts'], probe: 'http://localhost:4000/health' },
  { name: 'media',    cwd: join(ROOT, 'packages/media'), args: ['serve.mjs'], probe: 'http://localhost:3105/__health' },
  { name: 'chrome',   cwd: join(S, 'chrome'),  args: ['serve.mjs'],  probe: 'http://localhost:3104/mf-manifest.json' },
  { name: 'faq',      cwd: join(S, 'faq'),     args: ['serve.mjs'],  probe: 'http://localhost:3101/mf-manifest.json' },
  { name: 'product',  cwd: join(S, 'product'), args: ['serve.mjs'],  probe: 'http://localhost:3102/mf-manifest.json' },
  { name: 'cart',     cwd: join(S, 'cart'),    args: ['serve.mjs'],  probe: 'http://localhost:3103/mf-manifest.json' },
  { name: 'shell',    cwd: join(S, 'shell'),   args: ['server.mjs'], probe: 'http://localhost:3110/__health',
    env: { MF_SHELL_PORT: '3110', MF_SHELL_ORIGIN: 'http://localhost:3100' } },
  { name: 'my-account', cwd: join(S, 'my-account'), args: ['server.mjs'], probe: 'http://localhost:3120/__health' },
  // Last: the edge is the public origin, and it is only healthy once both hosts are.
  { name: 'edge',     cwd: ROOT,               args: ['scripts/edge.mjs'], probe: 'http://localhost:3100/__edge' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, label, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  console.error(`  TIMEOUT ${label} (${url})`);
  return false;
}

/**
 * Every port the stack binds. `stop` clears these as well as the recorded PIDs.
 *
 * Killing only what `pids.json` remembers is not enough: a server that crashed and was
 * replaced, or one left behind by an interrupted run, keeps its port and goes on answering.
 * The next `start` then fails with EADDRINUSE, the probe still succeeds because SOMETHING is
 * listening, and the stack quietly serves code from a previous build — which is the worst
 * possible failure for a benchmark, because everything looks fine and the numbers are wrong.
 */
const PORTS = [3100, 3101, 3102, 3103, 3104, 3105, 3110, 3120, 4000];

function killPort(port) {
  try {
    const pids = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      try { process.kill(Number(pid), 'SIGKILL'); } catch { /* already gone */ }
    }
    return pids.length;
  } catch {
    return 0; // lsof exits non-zero when nothing is listening
  }
}

function stop() {
  let orphans = 0;
  for (const port of PORTS) orphans += killPort(port);
  if (orphans) console.log(`  cleared ${orphans} process(es) still holding stack ports`);
  if (!existsSync(PIDFILE)) return;
  const pids = JSON.parse(readFileSync(PIDFILE, 'utf8'));
  for (const { name, pid } of pids) {
    try { process.kill(pid, 'SIGTERM'); console.log(`  killed ${name} (${pid})`); }
    catch { /* already gone */ }
  }
  rmSync(PIDFILE, { force: true });
}

async function start() {
  stop();
  await sleep(300);
  const pids = [];
  let ok = true;
  for (const svc of SERVICES) {
    const out = openSync(join(LOG, `${svc.name}.log`), 'a');
    const child = spawn(process.execPath, svc.args, {
      cwd: svc.cwd,
      detached: true,
      stdio: ['ignore', out, out],
      // The storefront moved to :3110 when the edge took over the public origin, but it
      // still renders absolute URLs against :3100 — the browser only ever sees the edge.
      env: { ...process.env, ...(svc.env ?? {}) },
    });
    child.unref();
    pids.push({ name: svc.name, pid: child.pid });
    writeFileSync(PIDFILE, JSON.stringify(pids, null, 2));
    // Shell must come up last — it reads the remotes' manifests at first render.
    if (!(await waitFor(svc.probe, svc.name))) ok = false;
    else console.log(`  up: ${svc.name} (${child.pid})`);
  }
  if (!ok) { console.error('one or more services failed to start; see .logs/'); process.exitCode = 1; }
}

const cmd = process.argv[2] ?? 'start';
if (cmd === 'stop') stop();
else if (cmd === 'start') await start();
else if (cmd === 'restart') { stop(); await sleep(400); await start(); }
else { console.error('usage: stack.mjs [start|stop|restart]'); process.exitCode = 1; }
