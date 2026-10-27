// Проверка включённого бота на сайте: ссылка «Подтвердить в Telegram», значок «проверено», коррекция точки.
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
}).listen(8850);
const U = 'http://localhost:8850/';
const out = [], errs = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const dec = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// 1) У объекта: штамп + ссылка в Telegram с payload c|site-0003|lat|lng; значок «проверено» из фида.
const c1 = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block',
  geolocation: { latitude: 41.69731, longitude: 44.80561, accuracy: 10 }, permissions: ['geolocation'] });
const p1 = await c1.newPage(); p1.on('pageerror', e => errs.push(e.message));
await p1.goto(U + '#s=site-0003'); await p1.waitForTimeout(5000);
const tags = await p1.textContent('#detail .amg-tags');
ok('значок «Проверено на месте · месяц»', /Проверено на месте · окт/.test(tags), tags.trim().replace(/\s+/g, ' '));
const title = await p1.getAttribute('#detail .amg-tag.vf', 'title');
ok('подсказка значка: число людей', title === 'Подтвердили людей: 2', title);
await p1.click('#detail [data-here]'); await p1.waitForTimeout(1500);
const href = await p1.getAttribute('#detail .amg-tg-link', 'href');
const pl = href ? dec(new URL(href).searchParams.get('start')) : '';
ok('ссылка «Подтвердить в Telegram» → @artmap_georgia_bot', !!href && href.startsWith('https://t.me/artmap_georgia_bot?start='), href);
ok('payload = подтверждение site-0003 с координатами', /^c\|site-0003\|41\.6973\d\|44\.8056\d$/.test(pl), pl);
ok('штамп поставлен', await p1.evaluate(() => !!JSON.parse(localStorage.getItem('amg-passport') || '{}')['site-0003']));
await p1.screenshot({ path: path.join(OUT, 's1-confirm.png'), clip: { x: 880, y: 0, width: 480, height: 300 } });

// 2) В 300 м от метки: предложение исправить → второе нажатие открывает бота с k-payload.
const c2 = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'en-GB', serviceWorkers: 'block',
  geolocation: { latitude: 41.69731 + 300 / 111320, longitude: 44.80561, accuracy: 10 }, permissions: ['geolocation'] });
await c2.addInitScript(() => { window.__opens = []; const o = window.open; window.open = function (u, t) { window.__opens.push(String(u)); return o.apply(this, arguments); }; });
const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push('fix: ' + e.message));
await p2.goto(U + '#s=site-0003'); await p2.waitForTimeout(5000);
await p2.click('#detail [data-here]'); await p2.waitForTimeout(1500);
const st = await p2.getAttribute('#detail [data-here]', 'data-state');
ok('в 300 м → предложение исправить', st === 'fix-offer', st);
const [pop] = await Promise.all([c2.waitForEvent('page', { timeout: 5000 }).catch(() => null), p2.click('#detail [data-here]')]);
const opens = await p2.evaluate(() => window.__opens);
console.log('window.open calls:', JSON.stringify(opens), '| popup page:', pop ? pop.url() : null);
const fixUrl = opens[0] || (pop ? pop.url() : '');
const fp = fixUrl ? dec(new URL(fixUrl).searchParams.get('start') || '') : '';
ok('второе нажатие открывает бота с коррекцией', /^k\|site-0003\|41\.700\d\d\|44\.8056\d$/.test(fp), fixUrl.slice(0, 70) + ' → ' + fp);
const st2 = await p2.getAttribute('#detail [data-here]', 'data-state');
ok('кнопка → «исправление отправлено»', st2 === 'fix-sent', st2);

console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
