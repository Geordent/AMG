// Сценарный тест этапа 0: штамп «Я здесь», паспорт, «Мой день», ссылка #route=, «Сообщить о проблеме».
import { chromium } from 'playwright-core';
import { railify } from './rail.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';

const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
fs.mkdirSync(OUT, { recursive: true });
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
}).listen(8830);
const URL0 = 'http://localhost:8830/';
const results = [], errors = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// Пользователь стоит у «Солнечных логотипов» (site-0003).
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block',
  geolocation: { latitude: 41.69731, longitude: 44.80561, accuracy: 10 }, permissions: ['geolocation'] });
const p = await ctx.newPage(); railify(p);
p.on('pageerror', e => errors.push(e.message));

// 1) «Подробно» → «Я здесь» → штамп.
await p.goto(URL0 + '#s=site-0003'); await p.waitForTimeout(5000);
await p.click('#detail [data-here]'); await p.waitForTimeout(1500);
const pass1 = await p.evaluate(() => JSON.parse(localStorage.getItem('amg-passport') || '{}'));
ok('штамп ставится у объекта', !!pass1['site-0003']);
const btnPass = await p.textContent('#btnPassport');
ok('кнопка «Паспорт» показывает число', /·\s*1/.test(btnPass), btnPass);

// 2) «+ В мой день» для трёх объектов.
await p.click('#detail [data-day="site-0003"]'); await p.waitForTimeout(300);
for (const id of ['site-0450', 'site-0008']) {
  await p.evaluate(i => { location.hash = '#s=' + i; }, id); await p.waitForTimeout(1800);
  await p.click(`#detail [data-day="${id}"]`); await p.waitForTimeout(300);
}
const day1 = await p.evaluate(() => JSON.parse(localStorage.getItem('amg-day') || '[]'));
ok('«Мой день» сохраняет 3 точки по порядку', JSON.stringify(day1) === JSON.stringify(['site-0003', 'site-0450', 'site-0008']), JSON.stringify(day1));
const btnTxt = await p.textContent(`#detail [data-day="site-0008"]`);
ok('кнопка в карточке переключилась', /В моём дне/.test(btnTxt), btnTxt);

// 3) Панель «Мой день»: порядок ↓, пунктир на карте.
await p.click('[data-detail-close]'); await p.waitForTimeout(300);
await p.click('#btnDay'); await p.waitForTimeout(600);
await p.screenshot({ path: path.join(OUT, 's0-day.png') });
await p.click('#day [data-day-down="0"]'); await p.waitForTimeout(300);
const day2 = await p.evaluate(() => JSON.parse(localStorage.getItem('amg-day') || '[]'));
ok('↓ меняет порядок', day2[0] === 'site-0450' && day2[1] === 'site-0003', JSON.stringify(day2));
const line = await p.evaluate(() => { const s = window.amgMap.getSource('amg-day'); return !!s && !!window.amgMap.getLayer('amg-day-line'); });
ok('пунктир маршрута есть на карте', line);
await p.click('#day [data-day-fit]'); await p.waitForTimeout(1800);
await p.screenshot({ path: path.join(OUT, 's0-day-map.png') });

// 4) Паспорт.
await p.click('#btnPassport'); await p.waitForTimeout(600);
const stamps = await p.$$eval('#passport .amg-stamp', a => a.length);
ok('в паспорте 1 штамп', stamps === 1, String(stamps));
await p.screenshot({ path: path.join(OUT, 's0-passport.png') });
await p.click('#passport [data-close-panel]'); await p.waitForTimeout(300);

// 5) «Сообщить о проблеме»: ссылка на форму GitHub.
await p.evaluate(() => { location.hash = '#s=site-0003'; }); await p.waitForTimeout(1800);
await p.click('#detail [data-report]'); await p.waitForTimeout(400);
const disabled = await p.getAttribute('#repGo', 'aria-disabled');
ok('до выбора варианта кнопка неактивна', disabled === 'true');
await p.check('#report input[value="painted"]'); await p.waitForTimeout(200);
const href = await p.getAttribute('#repGo', 'href');
const u = new URL(href);
ok('форма GitHub: шаблон и поля', u.pathname === '/artmap-georgia/AMG/issues/new' && u.searchParams.get('template') === 'object-report.yml'
  && u.searchParams.get('problem') === 'Закрашен или заменён' && /site-0003/.test(u.searchParams.get('site') || ''), u.searchParams.get('title'));
await p.screenshot({ path: path.join(OUT, 's0-report.png') });

// 6) Ссылка на маршрут в новой вкладке «друга» (чистый браузер).
const ctx2 = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, locale: 'ru-RU', serviceWorkers: 'block' });
const p2 = await ctx2.newPage(); railify(p2); p2.on('pageerror', e => errors.push('friend: ' + e.message));
await p2.goto(URL0 + '#route=site-0450,site-0003,site-0008,bogus-id'); await p2.waitForTimeout(5500);
const sharedOpen = await p2.evaluate(() => !document.getElementById('day').hidden);
const sharedRows = await p2.$$eval('#day .amg-day-list li', a => a.length);
ok('ссылка #route= открывает маршрут (неизвестные id отброшены)', sharedOpen && sharedRows === 3, `rows=${sharedRows}`);
await p2.screenshot({ path: path.join(OUT, 's0-route-link-mobile.png') });
await p2.click('#day [data-day-save]'); await p2.waitForTimeout(400);
const day3 = await p2.evaluate(() => JSON.parse(localStorage.getItem('amg-day') || '[]'));
ok('«Сохранить как мой день» у друга', day3.length === 3, JSON.stringify(day3));

// 7) Мобильная карточка: новые кнопки.
await p2.click('#day [data-close-panel]'); await p2.waitForTimeout(300);
await p2.evaluate(() => { location.hash = '#s=site-0003'; }); await p2.waitForTimeout(2500);
await p2.screenshot({ path: path.join(OUT, 's0-mobile-card.png') });

// 8) Далеко от объекта штамп не ставится.
const ctx3 = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block',
  geolocation: { latitude: 41.7151, longitude: 44.8271, accuracy: 10 }, permissions: ['geolocation'] });
const p3 = await ctx3.newPage(); railify(p3); p3.on('pageerror', e => errors.push('far: ' + e.message));
await p3.goto(URL0 + '#s=site-0003'); await p3.waitForTimeout(5000);
await p3.click('#detail [data-here]'); await p3.waitForTimeout(1500);
const pass3 = await p3.evaluate(() => JSON.parse(localStorage.getItem('amg-passport') || '{}'));
ok('далеко от объекта штампа нет', !pass3['site-0003']);

console.log(results.join('\n'));
console.log('pageerrors:', errors.length ? errors : 'none');
await b.close(); server.close();
