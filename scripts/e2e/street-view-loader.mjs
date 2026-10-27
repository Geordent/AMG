// «Посмотреть на улице» в «Подробно» и мобильной карточке; текст заставки.
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
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
}).listen(8895);
const U = 'http://localhost:8895/';
const out = [], errs = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' })).newPage();
p.on('pageerror', e => errs.push(e.message));
await p.goto(U + '#s=site-0003');
const loaderText = await p.textContent('#amgLoaderText').catch(() => '');
ok('заставка: «Рисуем Грузию…»', loaderText === 'Рисуем Грузию…', loaderText);
await p.waitForTimeout(5000);
const want = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=41.697294,44.805627';
const a = await p.$$eval('#detail a.amg-btn', l => l.map(x => [x.textContent, x.href, x.target]));
const sv = a.find(x => x[0] === 'Посмотреть на улице');
ok('«Подробно»: ссылка на Street View в точке объекта, в новой вкладке', sv && sv[1] === want && sv[2] === '_blank', sv ? sv[1] : JSON.stringify(a));
const m = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, locale: 'en-GB', serviceWorkers: 'block' });
const mp = await m.newPage(); mp.on('pageerror', e => errs.push('mobile: ' + e.message));
await mp.goto(U + '#s=site-0003'); await mp.waitForTimeout(5000);
const ma = await mp.$$eval('#card a.amg-btn', l => l.map(x => [x.textContent, x.href]));
const msv = ma.find(x => x[0] === 'Street view');
ok('мобильная карточка (английский браузер): «Street view» с той же ссылкой', msv && msv[1] === want, msv ? msv[1] : JSON.stringify(ma.map(x => x[0])));
await mp.screenshot({ path: path.join(OUT, 'sv-mobile.png') });
console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
