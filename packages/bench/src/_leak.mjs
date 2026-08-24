import autocannon from 'autocannon';
const HOST = 'http://localhost:3110';
const read = async () => (await fetch(`${HOST}/__metrics`)).json();
const hit = (path, duration) => autocannon({ url: HOST + path, connections: 8, duration, excludeErrorStats: true, maxRedirects: 0 });

for (const path of ['/__health', '/product']) {
  await fetch(`${HOST}/__metrics/reset`, { method: 'POST' });
  await hit(path, 3);                       // warm
  const a = await read();
  await hit(path, 5);
  const b = await read();
  await hit(path, 5);
  const c = await read();
  console.log(`${path.padEnd(12)} heapUsed  ${String(a.memory.heapUsedMb).padStart(9)} -> ${String(b.memory.heapUsedMb).padStart(9)} -> ${String(c.memory.heapUsedMb).padStart(9)} MB   over ${c.requests} requests`);
  console.log(`${''.padEnd(12)} rss       ${String(a.memory.rssMb).padStart(9)} -> ${String(b.memory.rssMb).padStart(9)} -> ${String(c.memory.rssMb).padStart(9)} MB`);
  console.log(`${''.padEnd(12)} external  ${String(a.memory.externalMb).padStart(9)} -> ${String(b.memory.externalMb).padStart(9)} -> ${String(c.memory.externalMb).padStart(9)} MB\n`);
}
