// Готовые маршруты: список в панели, открытие, ссылка #ready=, сохранение «себе».
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
}).listen(8890);
const U = 'http://localhost:8890/';
const out = [], errs = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(U); await p.waitForTimeout(4500);
ok('кнопка называется «Маршруты»', (await p.textContent('#btnDay')).trim() === 'Маршруты');
await p.click('#btnDay'); await p.waitForTimeout(1200);
const list = await p.$$eval('#day .amg-ready-r', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
ok('в панели 4 готовых маршрута', list.length === 4, list.map(t => t.slice(0, 60)).join(' | '));
await p.screenshot({ path: path.join(OUT, 'r-list.png') });
await p.click('#day [data-ready="sololaki-old-town"]'); await p.waitForTimeout(2500);
const title = await p.textContent('#day h2');
const rows = await p.$$eval('#day .amg-day-list li', a => a.length);
ok('открылся «Старый город»: заголовок и 15 точек', /Старый город/.test(title) && rows === 15, `${title} / ${rows}`);
const line = await p.evaluate(() => !!window.amgMap.getLayer('amg-day-line'));
ok('пунктир на карте', line);
await p.screenshot({ path: path.join(OUT, 'r-sololaki.png') });

// Ссылка #ready= у «друга» на телефоне.
const m = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, locale: 'ru-RU', serviceWorkers: 'block' });
const mp = await m.newPage(); mp.on('pageerror', e => errs.push('mobile: ' + e.message));
await mp.goto(U + '#ready=varketili-open-air'); await mp.waitForTimeout(6000);
const mt = await mp.evaluate(() => !document.getElementById('day').hidden && document.querySelector('#day h2').textContent);
const mrows = await mp.$$eval('#day .amg-day-list li', a => a.length);
ok('#ready=varketili-open-air открывает маршрут с названием', /Варкетили/.test(mt || '') && mrows === 17, `${mt} / ${mrows}`);
await mp.screenshot({ path: path.join(OUT, 'r-varketili-mobile.png') });
await mp.tap('#day [data-day-save]'); await mp.waitForTimeout(400);
const saved = await mp.evaluate(() => JSON.parse(localStorage.getItem('amg-day') || '[]').length);
ok('«Сохранить как мой день» — 17 точек в своём дне', saved === 17, String(saved));

console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
