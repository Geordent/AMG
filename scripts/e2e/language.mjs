// Язык: заставка и сайт совпадают; выбор запоминается между визитами.
import { chromium } from 'playwright-core';
import { railify } from './rail.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root] = process.argv.slice(2);
const ROOT = path.resolve(root);
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.geojson':'application/geo+json', '.css':'text/css', '.woff2':'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(fp); const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  const h = { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' };
  if (m) { const s = +m[1], e = m[2] ? +m[2] : st.size - 1;
    res.writeHead(206, { ...h, 'content-range': `bytes ${s}-${e}/${st.size}`, 'content-length': e - s + 1 }); return fs.createReadStream(fp, { start: s, end: e }).pipe(res); }
  res.writeHead(200, { ...h, 'content-length': st.size }); fs.createReadStream(fp).pipe(res);
}).listen(8896);
const U = 'http://localhost:8896/';
const out = [], errs = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const state = async p => p.evaluate(() => ({ sel: document.getElementById('lang').value, nearby: document.getElementById('btnNearby').textContent.trim() }));

for (const [locale, wantLoader, wantSel] of [['en-US', 'Drawing Georgia…', 'en'], ['ru-RU', 'Рисуем Грузию…', 'ru'], ['ka-GE', 'ვხატავთ საქართველოს…', 'ka'], ['de-DE', 'Drawing Georgia…', 'en']]) {
  const ctx = await b.newContext({ locale, serviceWorkers: 'block' });
  const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push(locale + ': ' + e.message));
  await p.goto(U);
  const early = await p.evaluate(() => document.getElementById('amgLoaderText')?.textContent);
  await p.waitForTimeout(4500);
  const s = await state(p);
  ok(`браузер ${locale}: заставка и сайт на «${wantSel}»`, early === wantLoader && s.sel === wantSel, `заставка «${early}», меню ${s.sel}, кнопка «${s.nearby}»`);
  await ctx.close();
}
// Выбор запоминается: английский браузер → выбрали грузинский → новый визит на грузинском.
const ctx = await b.newContext({ locale: 'en-US', serviceWorkers: 'block' });
const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push('persist: ' + e.message));
await p.goto(U); await p.waitForTimeout(4500);
await p.selectOption('#lang', 'ka'); await p.waitForTimeout(800);
await p.reload();
const early = await p.evaluate(() => document.getElementById('amgLoaderText')?.textContent);
await p.waitForTimeout(4500);
const s = await state(p);
ok('выбранный грузинский сохраняется: заставка и сайт на ka', early === 'ვხატავთ საქართველოს…' && s.sel === 'ka', `заставка «${early}», меню ${s.sel}, кнопка «${s.nearby}»`);
console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
