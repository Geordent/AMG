// Этап 3: OpenFreeMap вне городов, подсказка «скачайте карту», справка по маршрутам, GoatCounter (выключен/включён).
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
}).listen(8897);
const U = 'http://localhost:8897/';
const out = [], errs = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l.slice(0, 210)); };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const newPage = async (opts = {}, init) => {
  const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block', ...opts });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  return [ctx, p];
};

// --- 1) OpenFreeMap ---
{
  const [ctx, p] = await newPage();
  const ofm = []; p.on('request', r => { if (r.url().includes('openfreemap.org')) ofm.push(r.url()); });
  await p.goto(U); await p.waitForTimeout(7000);
  ok('Тбилиси: ни одного запроса к OpenFreeMap (ни описания, ни тайлов)', ofm.length === 0, `запросов ${ofm.length}`);
  await p.screenshot({ path: path.join(OUT, 's3-tbilisi.png') });
  ofm.length = 0;
  await p.evaluate(() => window.amgMap.jumpTo({ center: [41.6367, 41.6457], zoom: 15 })); await p.waitForTimeout(5000);
  ok('Батуми (есть пак): OpenFreeMap не запрашивается', ofm.length === 0, `запросов ${ofm.length}`);
  await p.evaluate(() => window.amgMap.jumpTo({ center: [42.7287, 43.0469], zoom: 14 })); await p.waitForTimeout(7000);
  const tj = ofm.filter(u => u.endsWith('/planet')).length, tiles = ofm.filter(u => u.endsWith('.pbf')).length;
  const feats = await p.evaluate(() => window.amgMap.queryRenderedFeatures().filter(f => f.source === 'openmaptiles').length);
  ok('Местиа (вне паков): описание 1 раз, тайлы грузятся и рисуются', tj === 1 && tiles > 0 && feats > 20, `TileJSON ${tj}, тайлов ${tiles}, объектов ${feats}`);
  const attr = await p.evaluate(() => document.querySelector('.maplibregl-ctrl-attrib')?.textContent || '');
  ok('в подписи карты есть OpenFreeMap', /OpenFreeMap/.test(attr), attr.slice(0, 90));
  await p.screenshot({ path: path.join(OUT, 's3-mestia.png') });
  await ctx.close();
}

// --- 2) Подсказка «скачайте карту города» ---
{
  const [ctx, p] = await newPage();
  await p.goto(U); await p.waitForTimeout(6000);
  ok('до 8 с подсказки нет', await p.evaluate(() => document.getElementById('packHint').hidden));
  await p.waitForTimeout(5500);
  const txt = await p.evaluate(() => { const e = document.getElementById('packHint'); return e.hidden ? null : e.innerText.replace(/\s+/g, ' '); });
  ok('подсказка: Тбилиси + размер в МБ', !!txt && /Тбилиси/.test(txt) && /МБ/.test(txt), txt);
  await p.screenshot({ path: path.join(OUT, 's3-packhint.png'), clip: { x: 380, y: 700, width: 600, height: 160 } });
  await p.click('#phNo'); await p.waitForTimeout(300);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('amg-packhint') || '{}'));
  ok('«Не сейчас» прячет и запоминает', await p.evaluate(() => document.getElementById('packHint').hidden) && saved.tbilisi === 99, JSON.stringify(saved));
  await p.reload(); await p.waitForTimeout(12000);
  ok('после «Не сейчас» при следующем визите подсказки нет', await p.evaluate(() => document.getElementById('packHint').hidden));
  await ctx.close();
}
{
  const [ctx, p] = await newPage({}, () => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, type: 'wifi', effectiveType: '4g' } }); });
  await p.goto(U); await p.waitForTimeout(12500);
  ok('экономия трафика (saveData): подсказки нет', await p.evaluate(() => document.getElementById('packHint').hidden));
  await ctx.close();
}
{
  const [ctx, p] = await newPage({}, () => { Object.defineProperty(navigator, 'connection', { value: { saveData: false, type: 'cellular', effectiveType: '4g' } }); });
  await p.goto(U); await p.waitForTimeout(12500);
  ok('мобильная сеть (cellular): подсказки нет', await p.evaluate(() => document.getElementById('packHint').hidden));
  await ctx.close();
}
{
  const [ctx, p] = await newPage({ locale: 'en-GB' });
  await p.goto(U); await p.waitForTimeout(12500);
  await p.click('#phYes'); await p.waitForTimeout(800);
  const open = await p.evaluate(() => !document.getElementById('sheet').hidden);
  await p.waitForFunction(() => /Downloaded/.test(document.getElementById('st-tbilisi')?.textContent || ''), null, { timeout: 40000 }).catch(() => {});
  const st = await p.evaluate(() => document.getElementById('st-tbilisi')?.textContent);
  ok('«Download»: панель «Офлайн» открыта, Тбилиси скачивается', open && /Downloaded/.test(st), st);
  await ctx.close();
}

// --- 3) Справка по маршрутам ---
{
  const [ctx, p] = await newPage();
  await p.goto(U); await p.waitForTimeout(5000);
  await p.click('#btnDay'); await p.waitForTimeout(1000);
  const sum = await p.textContent('#day .amg-help summary'), li = await p.$$eval('#day .amg-help li', a => a.length);
  ok('справка «? Как собрать маршрут»: 4 шага', /Как собрать маршрут/.test(sum) && li === 4, `${sum.trim()} / ${li}`);
  await p.click('#day .amg-help summary'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 's3-help.png') });
  await p.click('#day [data-close-panel]'); await p.waitForTimeout(200);
  await p.selectOption('#lang', 'en'); await p.waitForTimeout(500);
  await p.click('#btnDay'); await p.waitForTimeout(800);
  ok('справка на английском', /How to build a route/.test(await p.textContent('#day .amg-help summary')));
  await p.click('#day [data-ready]'); await p.waitForTimeout(1500);
  ok('в открытом готовом маршруте справки нет', await p.$$eval('#day .amg-help', a => a.length) === 0);
  await ctx.close();
}

// --- 4) GoatCounter ---
{
  const [ctx, p] = await newPage();
  await p.goto(U); await p.waitForTimeout(3000);
  ok('GoatCounter включён: скрипт с адресом аккаунта', await p.evaluate(() => document.querySelector('script[src*="zgo.at"]')?.dataset.goatcounter === 'https://artmap-georgia.goatcounter.com/count'));
  await ctx.close();
}
{
  const [ctx, p] = await newPage();
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace("const AMG_GOATCOUNTER = 'artmap-georgia';", "const AMG_GOATCOUNTER = 'artmap-test';");
  await p.route(U, r => r.fulfill({ contentType: 'text/html', body: html }));
  await p.route('https://gc.zgo.at/count.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.__gc=[];window.goatcounter={count:function(o){window.__gc.push(o.path)}};' }));
  await p.goto(U); await p.waitForTimeout(5000);
  const attr = await p.evaluate(() => document.querySelector('script[src="https://gc.zgo.at/count.js"]')?.dataset.goatcounter);
  ok('с кодом: скрипт добавлен с адресом аккаунта', attr === 'https://artmap-test.goatcounter.com/count', attr);
  await p.click('#searchBtn'); await p.waitForTimeout(300);
  ok('событие search отправляется', (await p.evaluate(() => window.__gc)).includes('event/search'), JSON.stringify(await p.evaluate(() => window.__gc)));
  await ctx.close();
}

console.log(out.join('\n')); console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
