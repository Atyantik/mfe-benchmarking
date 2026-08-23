import { chromium } from 'playwright';
const [,, out, route, mode, addFirst] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
if (addFirst) {
  await p.goto('http://localhost:3100/product', { waitUntil: 'networkidle' });
  await p.waitForSelector('[data-testid="cart-count"]');
  for (const id of ['p-0001','p-0002','p-0013']) await p.click(`[data-testid="add-${id}"]`).catch(()=>{});
  await p.waitForTimeout(300);
}
await p.goto('http://localhost:3100' + route, { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: out, fullPage: mode === 'full' });
console.log('errors:', errs.length ? errs.slice(0,2) : 'none');
await b.close();
