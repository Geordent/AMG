// Название маршрута дня (в ссылке #route=…&n=…), показ у друга, сохранение, «Скопировать списком», защита от вредных названий.
import { chromium } from 'playwright-core';
import { railify } from './rail.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir || '.');
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
}).listen(8950);
const U = 'http://localhost:8950/';
const out = [], errs = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l.slice(0, 230)); };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const IDS = ['site-0450', 'site-0003', 'site-0008'];
// Выполняется в браузере до загрузки страницы: заранее заданный день, подсказка про карту скрыта, navigator.share записывает вызовы.
const init = ids => { try { localStorage.setItem('amg-day', JSON.stringify(ids)); localStorage.setItem('amg-packhint', JSON.stringify({ tbilisi: 99 })); } catch (_) {} window.__shared = []; navigator.share = d => { window.__shared.push(d); return Promise.resolve(); }; };

// 1) Свой день: название, ссылка, список.
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
await ctx.addInitScript(init, IDS);
const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push(e.message));
await p.goto(U); await p.waitForTimeout(4500);
await p.click('#btnDay'); await p.waitForTimeout(900);
ok('поле «Название маршрута» есть у непустого дня', await p.$$eval('#day #dayName', a => a.length) === 1);
await p.fill('#dayName', 'Муралы Сабуртало & суббота'); await p.waitForTimeout(200);
ok('название сохраняется на лету и не сбивает фокус', (await p.evaluate(() => JSON.parse(localStorage.getItem('amg-day-name')))) === 'Муралы Сабуртало & суббота' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'dayName'));
await p.click('#day [data-day-share]'); await p.waitForTimeout(300);
const sh = await p.evaluate(() => window.__shared[0]);
const want = U + '#route=site-0450,site-0003,site-0008&n=' + encodeURIComponent('Муралы Сабуртало & суббота');
ok('«Поделиться»: ссылка содержит точки и название, заголовок меню — название', sh && sh.url === want && sh.title === 'Муралы Сабуртало & суббота', sh && sh.url);
await p.click('#day [data-day-copy]'); await p.waitForTimeout(400);
const clip = (await p.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');   // Windows пишет в буфер CRLF
const lines = clip.split('\n');
ok('«Скопировать списком»: название, 3 пункта, ссылка', lines[0] === 'Муралы Сабуртало & суббота' && /^1\. /.test(lines[1]) && /^3\. /.test(lines[3]) && lines[lines.length - 1] === 'Карта: ' + want, JSON.stringify(lines).slice(0, 200));
ok('toast «Список скопирован»', /Список скопирован/.test(await p.textContent('#toast')));
await p.screenshot({ path: path.join(OUT, 'rn-own.png') });

// 2) Друг открывает ссылку.
const ctx2 = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, locale: 'ru-RU', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
await ctx2.addInitScript(() => { try { localStorage.setItem('amg-packhint', JSON.stringify({ tbilisi: 99 })); } catch (_) {} });
const p2 = await ctx2.newPage(); railify(p2); p2.on('pageerror', e => errs.push('friend: ' + e.message));
await p2.goto(want); await p2.waitForTimeout(6000);
ok('у друга заголовок — название маршрута, 3 точки', (await p2.textContent('#day h2')) === 'Муралы Сабуртало & суббота' && await p2.$$eval('#day .amg-day-list li', a => a.length) === 3);
ok('у друга нет поля названия (чужой маршрут не редактируется)', await p2.$$eval('#day #dayName', a => a.length) === 0);
await p2.screenshot({ path: path.join(OUT, 'rn-friend.png') });
await p2.tap('#day [data-day-copy]'); await p2.waitForTimeout(400);
const clip2 = (await p2.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
ok('друг: «Скопировать списком» с тем же названием и ссылкой', clip2.startsWith('Муралы Сабуртало & суббота\n1. ') && clip2.endsWith('Карта: ' + want));
await p2.tap('#day [data-day-save]'); await p2.waitForTimeout(500);
const saved = await p2.evaluate(() => [JSON.parse(localStorage.getItem('amg-day')).length, JSON.parse(localStorage.getItem('amg-day-name'))]);
ok('«Сохранить как мой день»: точки и название у друга', saved[0] === 3 && saved[1] === 'Муралы Сабуртало & суббота', JSON.stringify(saved));
ok('после сохранения в поле — то же название', (await p2.inputValue('#dayName')) === 'Муралы Сабуртало & суббота');

// 3) Вредные и длинные названия.
const ctx3 = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
await ctx3.addInitScript(() => { try { localStorage.setItem('amg-packhint', JSON.stringify({ tbilisi: 99 })); } catch (_) {} });
const p3 = await ctx3.newPage(); railify(p3); p3.on('pageerror', e => errs.push('xss: ' + e.message));
const evil = '<img src=x onerror=window.__xss=1><script>window.__xss=2</script>' + 'ы'.repeat(100);
await p3.goto(U + '#route=site-0450,site-0003&n=' + encodeURIComponent(evil)); await p3.waitForTimeout(6000);
const info = await p3.evaluate(() => ({ title: document.querySelector('#day h2').textContent, imgs: document.querySelectorAll('#day h2 img, #day h2 script').length, xss: window.__xss || 0 }));
ok('вредное название выводится текстом: теги не выполняются', info.imgs === 0 && !info.xss, JSON.stringify({ imgs: info.imgs, xss: info.xss }));
ok('название обрезано до 60 знаков', info.title.length <= 60, String(info.title.length));
await p3.goto(U + '#route=site-0450,site-0003&n=%E0%A4%A'); await p3.waitForTimeout(5000);
ok('битая кодировка в ссылке не ломает страницу', await p3.evaluate(() => !document.getElementById('day').hidden && document.querySelectorAll('#day .amg-day-list li').length === 2));
await p3.goto(U + '#route=site-0450,site-0003'); await p3.waitForTimeout(5000);
ok('ссылка без названия работает как раньше', (await p3.textContent('#day h2')) === 'Маршрут по ссылке');
// 4) «Очистить» сбрасывает и название.
await p.click('#day [data-day-clear]'); await p.waitForTimeout(400);
ok('«Очистить» убирает и название', await p.evaluate(() => JSON.parse(localStorage.getItem('amg-day-name')) === '' && JSON.parse(localStorage.getItem('amg-day')).length === 0));

console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
