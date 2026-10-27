// Проверка: поиск, пульс выбранного объекта, прорисовка маршрута «Мой день», мобильная раскладка.
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
}).listen(8870);
const U = 'http://localhost:8870/';
const out = [], errs = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(U); await p.waitForTimeout(5000);

const hits = async q => { await p.fill('#searchInput', q); await p.waitForTimeout(150); return p.$$eval('#searchResults .srch-nm', a => a.map(x => x.textContent)); };
await p.click('#searchBtn'); await p.waitForTimeout(300);
ok('лупа открывает поиск с фокусом', await p.evaluate(() => !document.getElementById('search').hidden && document.activeElement.id === 'searchInput'));
let r = await hits('faith');
ok('по художнику «faith» → Солнечные логотипы', r.includes('Солнечные логотипы'), `${r.length}: ${r.slice(0, 3).join(' | ')}`);
r = await hits('атонели');
ok('по адресу «атонели»', r.length > 0, r.slice(0, 2).join(' | '));
r = await hits('мозаика');
const more = await p.textContent('#searchResults');
ok('«мозаика»: много результатов, показаны 30 + подсказка', r.length === 30 && /первые 30 из/.test(more), String(r.length));
r = await hits('Solar logos');
ok('английское название «Solar logos»', r.includes('Солнечные логотипы'), r.slice(0, 2).join(' | '));
r = await hits('ლოგოები');
ok('грузинское название «ლოგოები»', r.includes('Солнечные логотипы'), r.slice(0, 2).join(' | '));
r = await hits('zzzqqq');
ok('ничего → «Ничего не нашлось»', r.length === 0 && /Ничего не нашлось/.test(await p.textContent('#searchResults')));
await hits('faith');
await p.screenshot({ path: path.join(OUT, 's2-search.png') });
await p.press('#searchInput', 'Enter'); await p.waitForTimeout(2500);
const det = await p.evaluate(() => !document.getElementById('detail').hidden && document.getElementById('search').hidden);
ok('Enter открывает объект и закрывает поиск', det);
ok('пульс у выбранного объекта', await p.$$eval('.amg-pulse', a => a.length) === 1);
await p.screenshot({ path: path.join(OUT, 's2-pulse.png') });
await p.click('[data-detail-close]'); await p.waitForTimeout(300);
ok('после закрытия пульс исчезает', await p.$$eval('.amg-pulse', a => a.length) === 0);
await p.keyboard.press('/'); await p.waitForTimeout(200);
ok('клавиша «/» открывает поиск', await p.evaluate(() => !document.getElementById('search').hidden));
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
ok('Escape закрывает поиск', await p.evaluate(() => document.getElementById('search').hidden));

// Маршрут: прорисовка.
await p.evaluate(() => { localStorage.setItem('amg-day', JSON.stringify(['site-0450', 'site-0003', 'site-0008', 'site-0481'])); });
await p.reload(); await p.waitForTimeout(5000);
await p.click('#btnDay'); await p.waitForTimeout(400);
await p.evaluate(() => { const src = window.amgMap.getSource('amg-day'); window.__lens = []; const o = src.setData.bind(src); src.setData = d => { const f = d && d.features && d.features[0]; window.__lens.push(f ? f.geometry.coordinates.length : 0); return o(d); }; });
await p.click('#day [data-day-fit]');
const len = () => p.evaluate(() => { const l = window.__lens; return l.length ? l[l.length - 1] : 0; });
await p.waitForTimeout(250); const mid = await len();
await p.waitForTimeout(2200); const end = await len();
const frames = await p.evaluate(() => window.__lens.length);
ok('маршрут прорисовывается (сначала частично, потом целиком)', mid > 0 && mid < 5 && end === 4 && frames > 10, `mid=${mid} end=${end} frames=${frames}`);
await p.screenshot({ path: path.join(OUT, 's2-route.png') });

// Мобильная раскладка: лупа рядом с меню, без наложения.
const m = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, locale: 'ru-RU', serviceWorkers: 'block' });
const mp = await m.newPage(); mp.on('pageerror', e => errs.push('mobile: ' + e.message));
await mp.goto(U); await mp.waitForTimeout(5000);
const boxes = await mp.evaluate(() => ['searchBtn', 'menuBtn', 'brand'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [id, Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; }));
const [sb, mb, br] = boxes;
ok('мобильный: лупа слева от меню, не перекрывает его и бренд', sb[2] <= mb[1] && sb[1] >= br[2] - 2, JSON.stringify(boxes));
await mp.tap('#searchBtn'); await mp.waitForTimeout(300);
await mp.fill('#searchInput', 'фабрика'); await mp.waitForTimeout(200);
await mp.screenshot({ path: path.join(OUT, 's2-search-mobile.png') });

console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
