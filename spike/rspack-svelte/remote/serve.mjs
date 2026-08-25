import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(import.meta.dirname, 'dist/web');
const TYPES = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

createServer((req, res) => {
  const file = join(ROOT, new URL(req.url, 'http://x').pathname);
  if (!existsSync(file) || !file.startsWith(ROOT)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'access-control-allow-origin': '*',
  }).end(readFileSync(file));
}).listen(3201, () => console.log('svelte remote on :3201'));
