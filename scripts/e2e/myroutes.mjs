// «Мои маршруты»: сохранить, открыть/править, переименовать, удалить, файл (экспорт/импорт), ссылка, телефон, ru/ka/en.
// Запуск: node scripts/e2e/myroutes.mjs <папка сайта> <папка скриншотов>
import { chromium } from 'playwright-core';
import { railify } from './rail.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.geojson':'application/geo+json', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png' };
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
process.on('unhandledRejection', e => { if (!/Target page, context or browser has been closed/.test(String(e && e.message))) { console.log('UNHANDLED', String(e && e.message).slice(0, 160)); process.exitCode = 1; } });   // закрытие контекста Playwright — не ошибка сайта
const out = [], errs = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l); };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/routes.json'), 'utf8')).routes;
const vake = routes.find(r => r.id === 'vake-murals').stops;
const lib = p => p.evaluate(() => (JSON.parse(localStorage.getItem('amg-my-routes') || '{}').routes) || []);
const ls = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const open = async (opts, lang = 'ru') => {
  const ctx = await b.newContext({ locale: 'ru-RU', serviceWorkers: 'block', acceptDownloads: true, ...opts });
  await ctx.addInitScript(l => { try { if (!localStorage.getItem('amg-lang')) localStorage.setItem('amg-lang', l); } catch (_) {} }, lang);
  const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push(e.message));
  await p.goto(U); await p.waitForTimeout(5500);
  return [ctx, p];
};
const toastText = p => p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');

let [ctx, p] = await open({ viewport: { width: 1360, height: 860 } });

// 1. пусто → подсказка
await p.click('#btnDay'); await p.waitForTimeout(500);
await p.click('#day [data-my-list]'); await p.waitForTimeout(500);
ok('пустой список: подсказка и хранение «только в этом браузере»', /Пока пусто/.test(await p.textContent('#myroutes')) && /только в этом браузере/.test(await p.textContent('#myroutes')));
await p.click('#myroutes [data-close-panel]'); await p.waitForTimeout(300);

// 2. сохранить готовый маршрут из витрины
await p.click('#btnExplore'); await p.waitForTimeout(700);
await p.click('#explore [data-ex-route="vake-murals"]'); await p.waitForTimeout(1500);
await p.click('#explore [data-ex-save]'); await p.waitForTimeout(500);
let L = await lib(p);
ok('готовый маршрут сохранён с названием и точками', L.length === 1 && L[0].name.startsWith('Ваке') && JSON.stringify(L[0].stops) === JSON.stringify(vake), L[0] && L[0].name);
ok('«Мой день» не затронут', ((await ls(p, 'amg-day')) || []).length === 0);
await p.click('#explore [data-ex-save]'); await p.waitForTimeout(500);   // повторно → список
ok('повторное нажатие ведёт в «Мои маршруты»', await p.isVisible('#myroutes'));
await p.screenshot({ path: path.join(OUT, 'my-list.png') });

// 3. открыть → редактор; правки сохраняются в библиотеку
await p.click('#myroutes [data-my-open]'); await p.waitForTimeout(1500);
ok('открытие: панель редактора и все точки', await p.isVisible('#day') && (await p.$$('#day .amg-day-list li')).length === vake.length);
ok('в редакторе пометка «изменения сохраняются»', /Изменения сохраняются/.test(await p.textContent('#day')));
await p.click('#day [data-day-down="0"]'); await p.waitForTimeout(300);
await p.click('#day [data-day-del="1"]'); await p.waitForTimeout(300);
L = await lib(p);
const expected = vake.slice(); [expected[0], expected[1]] = [expected[1], expected[0]]; expected.splice(1, 1);
ok('перестановка и удаление точки сохраняются в маршруте', JSON.stringify(L[0].stops) === JSON.stringify(expected), `${L[0].stops.length} точек`);
await p.fill('#dayName', 'Моя прогулка по Ваке'); await p.waitForTimeout(300);
L = await lib(p);
ok('переименование в редакторе сохраняется', L[0].name === 'Моя прогулка по Ваке');
await p.screenshot({ path: path.join(OUT, 'my-editor.png') });
await p.click('#day [data-day-clear]'); await p.waitForTimeout(400);
L = await lib(p);
ok('«Очистить» не стирает сохранённый маршрут', L.length === 1 && L[0].stops.length === expected.length && (await ls(p, 'amg-day-id')) === null);

// 4. сохранить текущий (несохранённый) маршрут
await p.evaluate(() => { localStorage.setItem('amg-day', JSON.stringify(['site-0003', 'site-0450', 'site-0008'])); });
await p.reload(); await p.waitForTimeout(5000);
await p.click('#btnDay'); await p.waitForTimeout(500);
await p.click('#day [data-my-save]'); await p.waitForTimeout(500);
L = await lib(p);
ok('«Сохранить в мои маршруты» из редактора', L.length === 2 && JSON.stringify(L[1].stops) === JSON.stringify(['site-0003', 'site-0450', 'site-0008']), L[1] && L[1].name);
await p.click('#day [data-my-list]'); await p.waitForTimeout(500);
ok('в списке два маршрута, текущий отмечен', (await p.$$('#myroutes .myr-row')).length === 2 && (await p.$$('#myroutes .myr-row.cur')).length === 1);

// 5. переименовать (prompt)
p.once('dialog', d => d.accept('Три мурала <b>жирно</b>'));
await p.click('#myroutes .myr-row:nth-child(2) [data-my-ren]'); await p.waitForTimeout(400);
L = await lib(p);
ok('переименование через список: теги в названии обезврежены, HTML не выполняется', L[1].name === 'Три мурала b жирно /b' && (await p.$$('#myroutes .myr-open b b')).length === 0, L[1].name);

// 6. экспорт одного и всех
let [dl] = await Promise.all([p.waitForEvent('download'), p.click('#myroutes .myr-row:nth-child(2) [data-my-file]')]);
const f1 = path.join(OUT, 'one.json'); await dl.saveAs(f1);
const j1 = JSON.parse(fs.readFileSync(f1, 'utf8'));
ok('экспорт одного: формат amg/schema 1, id мест без текстов и координат', j1.app === 'amg' && j1.schema === 1 && j1.routes.length === 1 && Array.isArray(j1.routes[0].stops) && !('geometry' in j1.routes[0]) && /\.amg-route\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
[dl] = await Promise.all([p.waitForEvent('download'), p.click('#myroutes [data-my-all]')]);
const f2 = path.join(OUT, 'all.json'); await dl.saveAs(f2);
const j2 = JSON.parse(fs.readFileSync(f2, 'utf8'));
ok('экспорт всех', j2.routes.length === 2 && /^amg-routes-\d{4}-\d{2}-\d{2}\.amg-route\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());

// 7. импорт: хороший файл с несуществующим местом и дублем
const good = { app: 'amg', schema: 1, routes: [{ name: 'Из файла', stops: ['site-0003', 'site-9999', 'site-0450', 'site-0003'] }, { name: 'Пустой', stops: ['site-0000x'] }] };
await p.setInputFiles('#myFile', { name: 'g.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(good)) }); await p.waitForTimeout(700);
L = await lib(p);
const imp = L.find(r => r.name === 'Из файла');
ok('импорт: неизвестные места и дубли отброшены, пустой маршрут пропущен', !!imp && JSON.stringify(imp.stops) === JSON.stringify(['site-0003', 'site-0450']) && !L.some(r => r.name === 'Пустой'), `${L.length} маршрутов`);
ok('импорт: сообщение с числом пропущенных мест', /Загружено маршрутов: 1/.test(await toastText(p)) && /Пропущено мест[^0-9]*3/.test(await toastText(p)), (await toastText(p)).slice(0, 90));
// повторный импорт того же имени → уникальное имя
await p.setInputFiles('#myFile', { name: 'g.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(good)) }); await p.waitForTimeout(500);
L = await lib(p);
ok('одинаковые названия не сливаются: «Из файла (2)»', L.some(r => r.name === 'Из файла (2)'));
// плохие файлы
const nBefore = (await lib(p)).length;
for (const [nm, buf] of [['bad1.json', Buffer.from('{не json')], ['bad2.json', Buffer.from(JSON.stringify({ app: 'other', schema: 1, routes: [] }))], ['bad3.json', Buffer.from(JSON.stringify({ app: 'amg', schema: 2, routes: [] }))], ['big.json', Buffer.alloc(310000, 'a')]]) {
  await p.setInputFiles('#myFile', { name: nm, mimeType: 'application/json', buffer: buf }); await p.waitForTimeout(400);
  ok(`импорт ${nm}: отклонён с понятным сообщением, библиотека не изменилась`, /не файл маршрутов AMG/.test(await toastText(p)) && (await lib(p)).length === nBefore);
}
// чужие поля и вредные названия
await p.setInputFiles('#myFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'amg', schema: 1, routes: [{ name: '<img src=x onerror=window.__xss=1>' + 'я'.repeat(100), stops: ['site-0003'], from: 'evil', geometry: { x: 1 } }] })) }); await p.waitForTimeout(600);
L = await lib(p);
const evil = L.find(r => r.name.startsWith('img src=x'));
ok('вредное название: обрезано до 60 знаков, лишние поля не сохраняются', !!evil && evil.name.length <= 60 && !('geometry' in evil) && !('from' in evil));
ok('вредное название выводится текстом (XSS нет)', (await p.$$('#myroutes img')).length === 0 && !(await p.evaluate(() => window.__xss)));

// 8. ссылка «поделиться»
await p.evaluate(() => { window.__shared = null; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__shared = t; return Promise.resolve(); } }, configurable: true }); });
await p.click('#myroutes .myr-row:nth-child(2) [data-my-share]'); await p.waitForTimeout(500);
const link = await p.evaluate(() => window.__shared);
ok('ссылка: #route= с точками и названием', !!link && /#route=site-0003,site-0450,site-0008&n=/.test(link), (link || '').slice(0, 90));

// 9. удаление (отмена и подтверждение)
const n1 = (await lib(p)).length;
p.once('dialog', d => d.dismiss()); await p.click('#myroutes .myr-row:nth-child(1) [data-my-del]'); await p.waitForTimeout(300);
ok('удаление: отмена ничего не удаляет', (await lib(p)).length === n1);
p.once('dialog', d => d.accept()); await p.click('#myroutes .myr-row:nth-child(1) [data-my-del]'); await p.waitForTimeout(300);
ok('удаление: подтверждение удаляет', (await lib(p)).length === n1 - 1);

// 10. сохранность после перезагрузки
const before = JSON.stringify(await lib(p));
await p.reload(); await p.waitForTimeout(5000);
ok('после перезагрузки маршруты на месте', JSON.stringify(await lib(p)) === before);
await p.click('#btnDay'); await p.waitForTimeout(400); await p.click('#day [data-my-list]'); await p.waitForTimeout(500);
ok('список после перезагрузки: те же названия', (await p.$$('#myroutes .myr-row')).length === (await lib(p)).length);

// 11. испорченное хранилище не ломает сайт
await p.evaluate(() => { localStorage.setItem('amg-my-routes', '{"routes":[{"id":5},{"id":"a","stops":"x"},null,{"id":"ok1","name":"Ок","stops":["site-0003"]}]}'); localStorage.setItem('amg-day-id', '"нет-такого"'); });
await p.reload(); await p.waitForTimeout(5000);
await p.click('#btnDay'); await p.waitForTimeout(400); await p.click('#day [data-my-list]'); await p.waitForTimeout(500);
ok('испорченное хранилище: панель открылась, один корректный маршрут', (await p.$$('#myroutes .myr-row')).length === 1);
await ctx.close();

// 12. предел 50
[ctx, p] = await open({ viewport: { width: 1360, height: 860 } });
await p.evaluate(() => { localStorage.setItem('amg-my-routes', JSON.stringify({ v: 1, routes: Array.from({ length: 50 }, (_, i) => ({ id: 'my-' + i, name: 'R' + i, stops: ['site-0003'], created: '2026-10-29', updated: '2026-10-29' })) })); });
await p.reload(); await p.waitForTimeout(5000);
await p.click('#btnExplore'); await p.waitForTimeout(600); await p.click('#explore [data-ex-route="vake-murals"]'); await p.waitForTimeout(1200);
await p.click('#explore [data-ex-save]'); await p.waitForTimeout(400);
ok('предел 50 маршрутов: сообщение, новый не добавлен', /предел|Достигнут/.test(await toastText(p)) && (await lib(p)).length === 50);
await ctx.close();

// 13. телефон
[ctx, p] = await open({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
await p.evaluate(() => { localStorage.setItem('amg-my-routes', JSON.stringify({ v: 1, routes: [{ id: 'my-a', name: 'Очень длинное название маршрута которое должно переноситься и не ломать панель на телефоне', stops: ['site-0003', 'site-0450'], created: '2026-10-29', updated: '2026-10-29' }, { id: 'my-b', name: 'Второй', stops: ['site-0003'], created: '2026-10-29', updated: '2026-10-29' }] })); });
await p.reload(); await p.waitForTimeout(5000);
await p.tap('#btnExplore'); await p.waitForTimeout(800);
await p.tap('#explore [data-ex-own]'); await p.waitForTimeout(800);
const mm = await p.evaluate(() => { const bx = document.getElementById('myroutes'), r = bx.getBoundingClientRect(); const btns = [...bx.querySelectorAll('.myr-act button, .btns button')].map(e => e.getBoundingClientRect()); return { sw: document.documentElement.scrollWidth, iw: innerWidth, h: r.height, vh: innerHeight, minH: Math.min(...btns.map(q => q.height)), minW: Math.min(...[...bx.querySelectorAll('.myr-act button')].map(e => e.getBoundingClientRect().width)), over: bx.scrollWidth > bx.clientWidth + 1 }; });
ok('телефон: нет горизонтальной прокрутки', mm.sw <= mm.iw + 1 && !mm.over, `${mm.sw}/${mm.iw}`);
ok('телефон: кнопки действий ≥ 44 px', mm.minW >= 44 && mm.minH >= 44, `ширина ${Math.round(mm.minW)}, высота ${Math.round(mm.minH)}`);
await p.screenshot({ path: path.join(OUT, 'my-mobile.png') });
await ctx.close();

// 14. языки
for (const lang of ['ka', 'en']) {
  [ctx, p] = await open({ viewport: { width: 800, height: 700 } }, lang);
  await p.evaluate(() => { localStorage.setItem('amg-my-routes', JSON.stringify({ v: 1, routes: [{ id: 'my-a', name: 'Route', stops: ['site-0003', 'site-0450'], created: '2026-10-29', updated: '2026-10-29' }] })); });
  await p.reload(); await p.waitForTimeout(5000);
  await p.click('#btnDay'); await p.waitForTimeout(500); await p.click('#day [data-my-list]'); await p.waitForTimeout(500);
  const t = await p.textContent('#myroutes h2'), hint = await p.textContent('#myroutes .small');
  ok(`${lang}: заголовок и подсказка на своём языке`, !/[а-яА-Я]/.test(t + hint) && t.trim().length > 3, `${t.trim()}`);
  await p.screenshot({ path: path.join(OUT, `my-${lang}.png`) });
  await ctx.close();
}

await b.close(); server.close();
console.log('pageerrors:', errs.length, errs.slice(0, 5).join(' | '));
process.exit(out.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
