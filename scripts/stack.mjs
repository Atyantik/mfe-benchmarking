#!/usr/bin/env node
/**
 * Start/stop the rspack-react stack.
 *
 * Uses spawn({ detached: true, stdio: 'ignore' }) + unref() rather than a shell
 * backgrounding trick: macOS has no setsid, and shell-backgrounded children get
 * reaped when the launching shell's process group is cleaned up.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = join(ROOT, 'stacks/rspack-react');
const M = join(ROOT, 'stacks/rspack-react-mpa');
const LOG = join(ROOT, '.logs');
const PIDFILE = join(LOG, 'pids.json');
mkdirSync(LOG, { recursive: true });

const SERVICES = [
  { name: 'registry', cwd: join(ROOT, 'packages/registry'), args: ['src/server.ts'], probe: 'http://localhost:4000/health' },
  { name: 'faq',      cwd: join(S, 'faq'),     args: ['serve.mjs'],  probe: 'http://localhost:3101/mf-manifest.json' },
  { name: 'product',  cwd: join(S, 'product'), args: ['serve.mjs'],  probe: 'http://localhost:3102/mf-manifest.json' },
  { name: 'cart',     cwd: join(S, 'cart'),    args: ['serve.mjs'],  probe: 'http://localhost:3103/mf-manifest.json' },
  { name: 'shell',    cwd: join(S, 'shell'),   args: ['server.mjs'], probe: 'http://localhost:3100/__health' },
  // Same remotes, same registry, different navigation model. That is the only variable.
  { name: 'mpa',      cwd: join(M, 'shell'),   args: ['server.mjs'], probe: 'http://localhost:3200/__health' },
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

function stop() {
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
