// Офлайн-пакеты городов: детальный слой Батуми, панель «Офлайн», скачивание и режим «только скачанное».
import { chromium } from 'playwright-core';
import { railify } from './rail.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.geojson':'application/geo+json', '.css':'text/css', '.woff2':'font/woff2' };
const hits = {};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p.startsWith('/tiles/')) hits[p] = (hits[p] || 0) + 1;
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(fp); const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  const h = { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' };
  if (m) { const s = +m[1], e = m[2] ? +m[2] : st.size - 1;
    res.writeHead(206, { ...h, 'content-range': `bytes ${s}-${e}/${st.size}`, 'content-length': e - s + 1 }); return fs.createReadStream(fp, { start: s, end: e }).pipe(res); }
  res.writeHead(200, { ...h, 'content-length': st.size }); fs.createReadStream(fp).pipe(res);
}).listen(8880);
const U = 'http://localhost:8880/';
const out = [], errs = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push(e.message));
await p.goto(U); await p.waitForTimeout(4500);

// 1) Батуми на уровне улиц: тайлы идут из batumi.pmtiles.
await p.evaluate(() => window.amgMap.jumpTo({ center: [41.6367, 41.6457], zoom: 15.5 }));
await p.waitForTimeout(5000);
ok('Батуми z15: детальные тайлы из batumi.pmtiles', (hits['/tiles/batumi.pmtiles'] || 0) > 1, JSON.stringify(hits));
const houses = await p.evaluate(() => window.amgMap.queryRenderedFeatures().filter(f => f.source === 'protomaps_detail').length);
ok('на экране есть объекты детального слоя', houses > 50, String(houses));
await p.screenshot({ path: path.join(OUT, 'p-batumi.png') });

// 2) Панель «Офлайн»: 11 пакетов с размерами.
await p.click('#btnPacks'); await p.waitForTimeout(1500);
const rows = await p.$$eval('#packs .pack', a => a.map(x => x.querySelector('b').textContent + ' | ' + x.querySelector('.st').textContent));
ok('в панели 11 пакетов (обзор + 10 городов)', rows.length === 11, rows.length + ': ' + rows.slice(0, 3).join(' ; '));
ok('у Батуми виден размер', rows.some(r => /Батуми.*МБ/.test(r)), rows.find(r => /Батуми/.test(r)) || '');
await p.screenshot({ path: path.join(OUT, 'p-panel.png') });

// 3) Скачать Батуми → режим «только скачанное» → карта Батуми рисуется без сети к пакетам.
await p.click('#dl-batumi'); await p.waitForTimeout(6000);
const st = await p.textContent('#st-batumi');
ok('Батуми скачан', /Скачан|скачан/.test(st), st);
await p.check('#offlineOnly'); await p.waitForTimeout(500);
await p.click('#btnClose'); await p.waitForTimeout(300);
for (const k of Object.keys(hits)) delete hits[k];
await p.evaluate(() => window.amgMap.jumpTo({ center: [41.6300, 41.6420], zoom: 15.8 }));
await p.waitForTimeout(5000);
const houses2 = await p.evaluate(() => window.amgMap.queryRenderedFeatures().filter(f => f.source === 'protomaps_detail').length);
ok('офлайн: Батуми рисуется из скачанного пакета, без запросов к тайлам', houses2 > 50 && !hits['/tiles/batumi.pmtiles'], `features=${houses2} hits=${JSON.stringify(hits)}`);
await p.screenshot({ path: path.join(OUT, 'p-batumi-offline.png') });

console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
