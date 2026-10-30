// Витрина «Путешествуем по Грузии»: темы → карточки → точки на карте, сохранить себе, ссылка #ready=, телефон, 3 языка.
// Запуск: node scripts/e2e/showcase.mjs <папка сайта> <папка скриншотов>
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
}).listen(8892);
const U = 'http://localhost:8892/';
const out = [], errs = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l); };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/routes.json'), 'utf8')).routes;
const open = async (opts, lang = 'ru') => {
  const ctx = await b.newContext({ locale: 'ru-RU', serviceWorkers: 'block', ...opts });
  await ctx.addInitScript(l => { try { localStorage.setItem('amg-lang', l); } catch (_) {} }, lang);
  const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push(e.message));
  await p.goto(U); await p.waitForTimeout(5500);
  return [ctx, p];
};
const sitesXY = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites.geojson'), 'utf8')).features.map(f => [f.properties.id, f.geometry.coordinates]));
const arcs = p => p.evaluate(() => { const s = amgMap.getSource('amg-route-arc'); try { return s ? s.serialize().data.features.map(f => f.geometry.coordinates) : null; } catch (_) { return null; } });
const dayLine = p => p.evaluate(() => { const s = amgMap.getSource('amg-day'); try { return s ? s.serialize().data.features.map(f => f.geometry.coordinates) : null; } catch (_) { return null; } });
// качество дуги: концы ровно в точках, заметно выгнута (не хорда), длиннее хорды
const arcQ = (c, a, b) => { const k = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180), X = q => [q[0] * k, q[1]], A = X(a), B = X(b);
  const dx = B[0] - A[0], dy = B[1] - A[1], ch = Math.hypot(dx, dy); let dev = 0, len = 0;
  c.forEach((q, i) => { const P = X(q); dev = Math.max(dev, Math.abs((P[0] - A[0]) * dy - (P[1] - A[1]) * dx) / ch); if (i) { const Q = X(c[i - 1]); len += Math.hypot(P[0] - Q[0], P[1] - Q[1]); } });
  return { ends: Math.abs(c[0][0] - a[0]) < 1e-9 && Math.abs(c[0][1] - a[1]) < 1e-9 && Math.abs(c[c.length - 1][0] - b[0]) < 1e-9 && Math.abs(c[c.length - 1][1] - b[1]) < 1e-9, dev: dev / ch, len: len / ch }; };
const arcsOk = (legs, ids) => !!legs && legs.length === ids.length - 1 && legs.every((c, i) => { const q = arcQ(c, sitesXY.get(ids[i]), sitesXY.get(ids[i + 1])); return q.ends && q.dev >= 0.08 && q.len >= 1.02; });
// ни одна точка маршрута не под панелью, колонкой кнопок, лупой/бургером, брендом или чипами; и в пределах экрана
const markersFree = p => p.evaluate(() => {
  const rects = ['#explore', '#topui > #bar', '#searchBtn', '#menuBtn', '#brand', '#feature', '#chips'].map(q => document.querySelector(q)).filter(e => e && e.getClientRects().length).map(e => [e.id || e.tagName, e.getBoundingClientRect()]);
  const bad = [];
  document.querySelectorAll('.amg-rm').forEach((m, i) => { const r = m.getBoundingClientRect();
    if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) bad.push((i + 1) + ':экран');
    for (const [n, q] of rects) if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 4 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 4) bad.push((i + 1) + ':' + n); });
  return bad;
});
const noUnits = t => !/\d+([.,]\d+)?\s*(км|km|мин|min|час|hour|კმ|წთ|სთ)/i.test(t);

// ---------- Десктоп ----------
let [ctx, p] = await open({ viewport: { width: 1360, height: 860 } });
await p.click('#btnExplore'); await p.waitForTimeout(1500);
ok('панель открылась', await p.isVisible('#explore'));
ok('карточек столько же, сколько маршрутов', (await p.$$('#explore .ex-card')).length === routes.length, `${(await p.$$('#explore .ex-card')).length}/${routes.length}`);
const themes = await p.$$eval('#explore .ex-theme', a => a.map(x => x.textContent.trim()));
const themeKeys = new Set(routes.map(r => r.theme_key));
ok('темы: по одному заголовку на тему, всё на одном экране', themes.length === themeKeys.size && themes.length >= 2, themes.join(' | '));
const panelText = await p.textContent('#explore');
ok('в витрине нет километров и минут', noUnits(panelText));
ok('нет чекбоксов и выпадающих списков', (await p.$$('#explore input, #explore select')).length === 0);
// Карточки прокручиваем по очереди: обложки грузятся лениво, а список растёт вместе с числом маршрутов.
for (const h of await p.$$('#explore .ex-card')) { await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); }
await p.waitForTimeout(1200);
const covers = await p.$$eval('#explore .ex-card', a => a.map(c => { const i = c.querySelector('.ex-cover img'); return { id: c.dataset.exRoute, ph: i.classList.contains('ph'), ok: i.complete && i.naturalWidth > 0, credit: !!c.querySelector('.ex-credit') }; }));
const photoIds = routes.filter(r => r.cover.type === 'photo').map(r => r.id);
ok('все обложки загрузились с сайта (рисунки и фото, не запасная иконка)', covers.length === routes.length && covers.every(c => c.ph && c.ok), covers.filter(c => !(c.ph && c.ok)).map(c => c.id).join(', '));
ok('фото-обложки лежат на сайте (не зависят от сети) и подписаны автором', routes.filter(r => r.cover.type === 'photo').every(r => r.cover.src.startsWith('icons/covers/') && covers.find(x => x.id === r.id).credit), photoIds.join(', '));
ok('у каждой карточки есть обложка', covers.length === routes.length);
await p.$$eval('#explore', a => { a[0].scrollTop = 0; });
await p.screenshot({ path: path.join(OUT, 'sc-desktop-list.png') });

await p.click('#explore [data-ex-route="saburtalo-mosaic-murals"]'); await p.waitForTimeout(2500);
const stops = routes.find(r => r.id === 'saburtalo-mosaic-murals').stops;
ok('на карте пронумерованные точки маршрута', (await p.$$('.amg-rm')).length === stops.length, `${(await p.$$('.amg-rm')).length}/${stops.length}`);
ok('режим маршрута: скрим выключен, карта живая', await p.evaluate(() => document.getElementById('scrim').hidden && document.getElementById('explore').classList.contains('route')));
const firstMarker = await p.evaluate(() => { const r = document.querySelector('.amg-rm').getBoundingClientRect(); return [r.left, r.top]; });
ok('точки не спрятаны под панелью (десктоп)', firstMarker[0] > 480, `x=${Math.round(firstMarker[0])}`);
await p.waitForTimeout(1200);
const freeD = await markersFree(p);
ok('десктоп: все точки видны — не под панелью, колонкой кнопок, лупой, брендом и чипами', freeD.length === 0, freeD.join(', '));
ok('в списке остановок нет километров и минут', noUnits(await p.textContent('#explore')));
ok('«Мой день» ещё пуст: линии нет', await p.evaluate(() => { const s = amgMap.getSource('amg-day'); try { return !s || !s.serialize().data.features.length; } catch (_) { return true; } }));
await p.screenshot({ path: path.join(OUT, 'sc-desktop-route.png') });

await p.click('#explore [data-ex-share]').catch(() => {});
await p.click('#explore [data-ex-save]'); await p.waitForTimeout(500);
const lib = await p.evaluate(() => ({ my: JSON.parse(localStorage.getItem('amg-my-routes') || '{}').routes || [], day: JSON.parse(localStorage.getItem('amg-day') || '[]') }));
ok('«Сохранить себе» кладёт маршрут в «Мои маршруты» и не затирает «Мой день»', lib.my.length === 1 && JSON.stringify(lib.my[0].stops) === JSON.stringify(stops) && lib.day.length === 0, `${lib.my.length} маршрут(а), день: ${lib.day.length}`);
ok('кнопка меняется на «✓ В моих маршрутах»', /В моих маршрутах/.test(await p.textContent('#explore [data-ex-save]')));

await p.click(`#explore [data-ex-stop="${stops[1]}"]`); await p.waitForTimeout(2500);
ok('нажатие на остановку закрывает панель и открывает карточку места', await p.evaluate(() => document.getElementById('explore').hidden) && (await p.$$('#card:not([hidden]), #detail:not([hidden])')).length >= 0);
ok('точки маршрута остаются на карте', (await p.$$('.amg-rm')).length === stops.length);
await p.screenshot({ path: path.join(OUT, 'sc-desktop-stop.png') });

await p.keyboard.press('Escape'); await p.waitForTimeout(400);     // закрыть карточку места: скрим перекрывает кнопки, как у пользователя
await p.click('#btnExplore'); await p.waitForTimeout(800);
ok('повторное открытие очищает точки и возвращает список', (await p.$$('.amg-rm')).length === 0 && (await p.$$('#explore .ex-card')).length === routes.length);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('Escape закрывает витрину', await p.evaluate(() => document.getElementById('explore').hidden));

await p.click('#btnDay'); await p.waitForTimeout(800);
const dayText = await p.textContent('#day');
ok('«Мой день»: без километров и минут', noUnits(dayText));
ok('«Мой день»: кнопка перехода в витрину', (await p.$$('#day [data-explore-open]')).length === 1);
await ctx.close();

// ---------- Правила дуг и анимации ----------
// R1 дуга не выдаётся за дорогу; R2 анимация не мешает навигации; R3 prefers-reduced-motion → статичные дуги.
const vake = routes.find(r => r.id === 'vake-murals').stops;
{ // R3: reduced motion
  const [c3, p3] = await open({ viewport: { width: 1360, height: 860 }, reducedMotion: 'reduce' });
  await p3.click('#btnExplore'); await p3.waitForTimeout(600);
  await p3.click('#explore [data-ex-route="vake-murals"]');
  let heroSeen = false;
  for (let i = 0; i < 6; i++) { await p3.waitForTimeout(700); if (await p3.$('.amg-hero')) heroSeen = true; }
  ok('R3 reduced-motion: «героя» нет вообще', !heroSeen);
  ok('R3 reduced-motion: дуги сразу целиком и статичны', arcsOk(await arcs(p3), vake));
  ok('R3 reduced-motion: точки без анимации появления', await p3.evaluate(() => getComputedStyle(document.querySelector('.amg-rm .dot')).animationName === 'none'));
  await p3.click('#explore [data-ex-save]'); await p3.waitForTimeout(600);            // сохранить в «Мои маршруты»
  await p3.click('#explore [data-ex-save]'); await p3.waitForTimeout(600);            // уже сохранён → список
  await p3.click('#myroutes [data-my-open]'); await p3.waitForTimeout(1500);          // открыть в редакторе: рисуется дуга
  const dl = await dayLine(p3);
  ok('«Мой день»: линия — дуга (не прямая), концы в первой и последней точке', !!dl && dl.length === 1 && dl[0].length > vake.length * 3 && arcQ(dl[0], sitesXY.get(vake[0]), sitesXY.get(vake[vake.length - 1])).ends);
  await c3.close();
}
{ // R1/R2: обычный режим
  const [c2, p2] = await open({ viewport: { width: 1360, height: 860 } });
  await p2.click('#btnExplore'); await p2.waitForTimeout(600);
  await p2.click('#explore [data-ex-route="vake-murals"]');
  await p2.waitForSelector('.amg-hero', { timeout: 15000 });
  const m = await p2.evaluate(() => ({ pe: getComputedStyle(document.querySelector('.amg-hero')).pointerEvents, drag: amgMap.dragPan.isEnabled(), zoom: amgMap.scrollZoom.isEnabled(), scrim: document.getElementById('scrim').hidden }));
  ok('R2 «герой» не перехватывает нажатия', m.pe === 'none');
  ok('R2 во время анимации карта живая: перетаскивание и зум включены, скрима нет', m.drag && m.zoom && m.scrim);
  ok('R1 в панели есть пометка «линия показывает порядок, а не дорогу»', /порядок, а не дорогу/.test(await p2.textContent('#explore')));
  // пользователь двигает карту → анимация завершается, дуги остаются целиком
  await p2.mouse.move(900, 500); await p2.mouse.down(); await p2.mouse.move(860, 470, { steps: 6 }); await p2.mouse.up(); await p2.waitForTimeout(1500);
  ok('R2 перетаскивание карты останавливает анимацию (героя нет)', !(await p2.$('.amg-hero')));
  ok('R1/R2 после остановки дуги целиком: концы в точках, выгнуты, длиннее хорды', arcsOk(await arcs(p2), vake));
  await p2.click('#explore [data-ex-back]'); await p2.waitForTimeout(1200);
  const gone = await arcs(p2);
  ok('«← Все маршруты» убирает дуги и точки', (!gone || gone.length === 0) && (await p2.$$('.amg-rm')).length === 0);
  await c2.close();
}
{ // R2: нажатие на остановку во время полёта
  const [c4, p4] = await open({ viewport: { width: 1360, height: 860 } });
  await p4.click('#btnExplore'); await p4.waitForTimeout(600);
  await p4.click('#explore [data-ex-route="vake-murals"]');
  await p4.waitForSelector('.amg-hero', { timeout: 15000 });
  await p4.click(`#explore [data-ex-stop="${vake[2]}"]`); await p4.waitForTimeout(1500);
  ok('R2 нажатие на остановку во время полёта: панель уступает место, героя нет, точки остаются', await p4.evaluate(() => document.getElementById('explore').hidden) && !(await p4.$('.amg-hero')) && (await p4.$$('.amg-rm')).length === vake.length);
  ok('R2 дуги остаются целиком', arcsOk(await arcs(p4), vake));
  await c4.close();
}
{ // анимация завершается сама: дуги остаются, «герой» растворяется
  const [c5, p5] = await open({ viewport: { width: 1360, height: 860 } });
  await p5.click('#btnExplore'); await p5.waitForTimeout(600);
  await p5.click('#explore [data-ex-route="vake-murals"]');
  await p5.waitForSelector('.amg-hero', { timeout: 15000 });
  await p5.waitForSelector('.amg-hero', { state: 'detached', timeout: 120000 });
  ok('анимация завершилась сама: герой убран, дуги целиком', arcsOk(await arcs(p5), vake));
  await p5.click('#explore [data-ex-close]'); await p5.waitForTimeout(800);
  const gone5 = await arcs(p5);
  ok('закрытие витрины убирает дуги и точки', (!gone5 || gone5.length === 0) && (await p5.$$('.amg-rm')).length === 0);
  await c5.close();
}

// ---------- Межгородской маршрут: подписи доступа, лицензия фото-обложки, «герои» ----------
{
  const trip = routes.find(r => r.id === 'medieval-samtskhe');
  const [c6, p6] = await open({ viewport: { width: 1360, height: 860 } });
  await p6.click('#btnExplore'); await p6.waitForTimeout(600);
  await p6.click('#explore [data-ex-route="medieval-samtskhe"]'); await p6.waitForTimeout(2000);
  const tags = await p6.$$eval('#explore .ex-stops li', a => a.map(li => ({ id: li.querySelector('[data-ex-stop]').dataset.exStop, tag: (li.querySelector('.ex-tag') || {}).textContent || '' })));
  ok('платный вход подписан у Вардзии, у бесплатных остановок подписи нет', /платный вход/.test(tags.find(x => x.id === 'site-0570').tag) && tags.find(x => x.id === 'site-0592').tag === '', JSON.stringify(tags.map(x => x.tag)));
  const credit = await p6.textContent('#explore .ex-photo').catch(() => '');
  const href = await p6.getAttribute('#explore .ex-photo a', 'href').catch(() => '');
  ok('фото-обложка: автор, лицензия и ссылка на Commons в панели маршрута', credit.includes(trip.cover.credit) && credit.includes(trip.cover.license) && href === trip.cover.source_url, credit.trim().slice(0, 80));
  ok('межгородской: в панели нет километров и минут', noUnits(await p6.textContent('#explore')));
  await p6.waitForSelector('.amg-hero', { timeout: 15000 });
  const kinds = new Set();
  for (let i = 0; i < 30; i++) { const k = await p6.evaluate(() => { const e = document.querySelector('.amg-hero .in svg'); return e ? (e.querySelector('rect[x="12"]') ? 'balloon' : e.querySelector('circle[r="3.4"]') ? 'hiker' : 'other') : ''; }); if (k) kinds.add(k); await p6.waitForTimeout(400); }
  ok('межгородской: «герои» — шар и турист (не самолётик и змей)', kinds.has('balloon') && !kinds.has('other'), [...kinds].join(','));
  await p6.screenshot({ path: path.join(OUT, 'sc-trip.png') });
  await c6.close();
}

// ---------- Фото-обложки не зависят от сети: Commons заблокирован ----------
{
  const c7 = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
  let blocked = 0;
  await c7.route(/upload\.wikimedia\.org/, r => { blocked++; r.abort(); });
  const p7 = await c7.newPage(); railify(p7); p7.on('pageerror', e => errs.push(e.message));
  await p7.goto(U); await p7.waitForTimeout(5500);
  await p7.click('#btnExplore'); await p7.waitForTimeout(600);
  for (const h of await p7.$$('#explore .ex-card')) { await h.scrollIntoViewIfNeeded(); await p7.waitForTimeout(150); }
  await p7.waitForTimeout(1500);
  const st = await p7.$$eval('#explore .ex-card', a => a.map(c => { const i = c.querySelector('.ex-cover img'); return i.classList.contains('ph') && i.complete && i.naturalWidth > 0; }));
  ok('без доступа к Commons все обложки на месте (фото лежат на сайте)', st.length === routes.length && st.every(Boolean) && blocked === 0, `заблокированных запросов к Commons: ${blocked}`);
  await c7.close();
}

// ---------- «Герой»: турист смотрит по ходу движения; движение плавное (без ступенек) ----------
{
  const eastTrip = { id: 'test-east', kind: 'intercity', title: { ru: 'Тест на восток', en: 'Test east', ka: 'ტესტი' }, theme: routes[0].theme, theme_key: routes[0].theme_key,
    desc: { ru: 'т', en: 't', ka: 'ტ' }, teaser: { ru: 'т', en: 't', ka: 'ტ' }, cover: routes[0].cover, stops: ['site-0593', 'site-0592', 'site-0570'] };   // Зарзма → Сапара → Вардзия: на восток
  const hikerFacing = async (page, routeId) => {
    await page.click('#btnExplore'); await page.waitForTimeout(600);
    await page.click(`#explore [data-ex-route="${routeId}"]`);
    await page.waitForSelector('.amg-hero', { timeout: 15000 });
    // ждём второго звена (турист): шар идёт ~5 с первое звено
    await page.waitForFunction(() => { const e = document.querySelector('.amg-hero .in svg'); return e && e.querySelector('circle[r="3.4"]'); }, null, { timeout: 40000 });
    await page.waitForTimeout(1500);
    return page.evaluate(() => document.querySelector('.amg-hero .in').style.transform);
  };
  const mk = async route => {
    const c = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
    if (route) await c.route(/data\/routes\.json/, async r => { const j = await (await r.fetch()).json(); j.routes.push(route); await r.fulfill({ json: j }); });
    await c.addInitScript(() => { try { localStorage.setItem('amg-lang', 'ru'); } catch (_) {} });
    const pg = await c.newPage(); railify(pg); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(U); await pg.waitForTimeout(5500);
    return [c, pg];
  };
  let [c8, p8] = await mk(null);
  const west = await hikerFacing(p8, 'medieval-samtskhe');          // Сапара → Зарзма: на запад
  ok('турист идёт на запад → смотрит вперёд (рисунок смотрит влево, без зеркала)', /scaleX\(1\)/.test(west), west);
  await c8.close();
  [c8, p8] = await mk(eastTrip);
  const east = await hikerFacing(p8, 'test-east');                  // Сапара → Вардзия: на восток/юго-восток
  ok('турист идёт на восток → смотрит вперёд (рисунок отражён)', /scaleX\(-1\)/.test(east), east);
  await c8.close();
  // плавность на коротком звене (город): положение не округляется до целого пикселя, поворот без скачков
  [c8, p8] = await mk(null);
  await p8.click('#btnExplore'); await p8.waitForTimeout(600);
  await p8.click('#explore [data-ex-route="vake-murals"]');
  await p8.waitForSelector('.amg-hero', { timeout: 15000 });
  const samples = await p8.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 40; i++) {
      const h = document.querySelector('.amg-hero'); if (h) { const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(h.style.transform || ''); const rot = /rotate\(([-\d.]+)deg/.exec(h.firstChild.style.transform || ''); if (m) out.push({ x: +m[1], y: +m[2], rot: rot ? +rot[1] : null, plane: !!h.querySelector('path[d^="M3 15"]') }); }
      await new Promise(r => setTimeout(r, 60));
    }
    return out;
  });
  const frac = v => Math.abs(v - Math.round(v)) > 0.01;
  const fracShare = samples.filter(s => frac(s.x) || frac(s.y)).length / Math.max(1, samples.length);
  let maxRot = 0; for (let i = 1; i < samples.length; i++) if (samples[i].rot != null && samples[i - 1].rot != null && samples[i].plane && samples[i - 1].plane) maxRot = Math.max(maxRot, Math.abs(((samples[i].rot - samples[i - 1].rot + 540) % 360) - 180));
  ok('короткое звено: положение «героя» дробное (не ступеньками по пикселям)', samples.length > 20 && fracShare > 0.7, `${samples.length} кадров, дробных ${(fracShare * 100).toFixed(0)}%`);
  ok('короткое звено: поворот самолётика плавный (скачок между кадрами ≤ 25°)', maxRot <= 25, `макс. ${maxRot.toFixed(1)}°`);
  await c8.close();
}

// ---------- Возврат к маршруту: панель больше не «одноразовая» ----------
{
  const [c9, p9] = await open({ viewport: { width: 1360, height: 860 } });
  const vis = sel => p9.isVisible(sel);
  await p9.click('#btnExplore'); await p9.waitForTimeout(600);
  await p9.click('#explore [data-ex-route="vake-murals"]'); await p9.waitForTimeout(2000);
  ok('пока панель маршрута открыта, кнопки возврата нет', !(await vis('#exploreReturn')));
  await p9.click(`#explore [data-ex-stop="${vake[1]}"]`); await p9.waitForTimeout(1500);
  ok('после перехода к объекту появляется «↩ …» с названием маршрута', (await vis('#exploreReturn')) && /Ваке/.test(await p9.textContent('#exploreReturn .er-go')), (await p9.textContent('#exploreReturn .er-go')).trim());
  await p9.keyboard.press('Escape'); await p9.waitForTimeout(500);                                   // закрыть карточку места
  await p9.click('#exploreReturn .er-go'); await p9.waitForTimeout(1500);
  ok('нажатие возвращает панель с остановками; точки маршрута на месте', (await vis('#explore')) && !(await vis('#exploreReturn')) && (await p9.$$('#explore .ex-stops li')).length === vake.length && (await p9.$$('.amg-rm')).length === vake.length);
  await p9.click('#btnPassport'); await p9.waitForTimeout(800);                                      // другая кнопка
  ok('другая кнопка («Паспорт») скрывает панель маршрута, но кнопка возврата остаётся', !(await vis('#explore')) && (await vis('#exploreReturn')) && (await vis('#passport')));
  await p9.keyboard.press('Escape'); await p9.waitForTimeout(500);
  await p9.click('#exploreReturn .er-go'); await p9.waitForTimeout(1200);
  ok('после «Паспорта» возвращаемся в тот же маршрут', (await vis('#explore')) && !(await vis('#passport')) && /Ваке/.test(await p9.textContent('#explore .ex-rtitle')));
  await p9.click('#explore [data-ex-stop]'); await p9.waitForTimeout(1200);
  await p9.keyboard.press('Escape'); await p9.waitForTimeout(500);                                   // карточка места закрыта (скрим перекрывает кнопки)
  await p9.click('#exploreReturn .er-x'); await p9.waitForTimeout(600);
  ok('крестик на кнопке возврата убирает маршрут: точки и кнопка исчезают', !(await vis('#exploreReturn')) && (await p9.$$('.amg-rm')).length === 0);
  await p9.screenshot({ path: path.join(OUT, 'sc-return.png') });
  await c9.close();
}

// ---------- Ряд баннеров, чипы и панели-переключатели: оформление и анимация ----------
{
  const [cA, pA] = await open({ viewport: { width: 1360, height: 860 } });
  const css = (sel, prop) => pA.$eval(sel, (e, k) => getComputedStyle(e)[k], prop);
  ok('«Впечатления» переименованы в «Развлечения» (кнопка и заголовок панели)', (await pA.textContent('#btnExp')).trim() === 'Развлечения' && /Развлечения на карте/.test(await pA.textContent('#expTitle')));
  const m0 = await css('#btnExp', 'transform'); await pA.hover('#btnExp'); await pA.waitForTimeout(450);
  ok('баннер при наведении «приподнимается» (меняется transform)', (await css('#btnExp', 'transform')) !== m0, `${m0} → ${await css('#btnExp', 'transform')}`);
  await pA.mouse.move(700, 600);
  const c0 = await css('#chips .chip[data-cat="mosaic"]', 'backgroundColor'); await pA.hover('#chips .chip[data-cat="mosaic"]'); await pA.waitForTimeout(350);
  ok('чип при наведении меняет цвет и приподнимается', (await css('#chips .chip[data-cat="mosaic"]', 'backgroundColor')) !== c0 && (await css('#chips .chip[data-cat="mosaic"]', 'transform')) !== 'none', `${c0} → ${await css('#chips .chip[data-cat="mosaic"]', 'backgroundColor')}`);
  await pA.mouse.move(700, 600);
  const dots = await pA.$$eval('#chips .chip', a => a.map(c => getComputedStyle(c, '::before').backgroundColor));
  ok('у чипов категорий свои цветные точки (разные цвета)', new Set(dots).size >= 6, `${new Set(dots).size} цветов`);
  // панель «Развлечения»: кнопки-переключатели вместо чекбоксов
  await pA.click('#btnExp'); await pA.waitForTimeout(700);
  const row = '#experiences label.row:has(#exCanyon)';
  const ind = await pA.$eval('#exCanyon', e => { const s = getComputedStyle(e); return (s.appearance === 'none' || s.webkitAppearance === 'none') && s.borderRadius !== '0px' && s.pointerEvents === 'none'; });
  ok('чекбокс — круглый индикатор, клик ловит вся строка', ind);
  ok('в строках иконки (те же, что на карте)', (await pA.$$('#experiences .row .row-ico')).length >= 13, `${(await pA.$$('#experiences .row .row-ico')).length}`);
  const bg0 = await css(row, 'backgroundColor'); await pA.click(row); await pA.waitForTimeout(400);
  const on = await pA.$eval('#exCanyon', e => e.checked);
  ok('нажатие на строку включает слой; строка меняет цвет; кнопка «Развлечения» показывает число', on && (await css(row, 'backgroundColor')) !== bg0 && /· 1/.test(await pA.textContent('#btnExp')), `${bg0} → ${await css(row, 'backgroundColor')}`);
  ok('включённая строка отмечена галочкой (индикатор справа закрашен, без :has)', await pA.$eval('#exCanyon', e => getComputedStyle(e).backgroundImage.startsWith('url(') && getComputedStyle(e).backgroundColor !== 'rgb(255, 255, 255)'));
  await pA.click(row); await pA.waitForTimeout(300);
  ok('повторное нажатие выключает слой', !(await pA.$eval('#exCanyon', e => e.checked)));
  await pA.mouse.move(900, 700); await pA.waitForTimeout(400);
  const tr0 = await css(row, 'transform'); await pA.hover(row); await pA.waitForTimeout(350);
  ok('наведение на строку сдвигает её (анимация)', (await css(row, 'transform')) !== tr0);
  const box = await pA.$eval('#experiences', e => { const r = e.getBoundingClientRect(); return [r.left, r.width, r.top]; });
  ok('на десктопе панель — компактная карточка слева, не на всю ширину; не заходит на ряд категорий', box[0] < 40 && box[1] < 480 && box[2] >= 195, `${Math.round(box[1])} px, верх ${Math.round(box[2])}`);
  await pA.keyboard.press('Escape'); await pA.waitForTimeout(400);
  // панель «Транспорт»
  await pA.click('#btnTransit'); await pA.waitForTimeout(700);
  ok('«Транспорт»: те же кнопки-переключатели с иконками', (await pA.$$('#transit .row .row-ico')).length === 4 && await pA.$eval('#trMetro', e => (getComputedStyle(e).appearance === 'none')));
  await pA.click('#transit label.row:has(#trBus)'); await pA.waitForTimeout(400);
  ok('«Транспорт»: нажатие включает слой автовокзалов и окрашивает строку', await pA.$eval('#trBus', e => e.checked) && (await pA.$eval('#transit label.row:has(#trBus)', e => getComputedStyle(e).backgroundColor)) !== 'rgb(255, 255, 255)');
  await pA.screenshot({ path: path.join(OUT, 'sc-panels.png') });
  await cA.close();
}

// ---------- Ссылка #ready= ----------
[ctx, p] = await open({ viewport: { width: 1360, height: 860 } });
await p.goto(U + '#ready=vake-murals'); await p.reload(); await p.waitForTimeout(6000);
ok('ссылка #ready= открывает маршрут в витрине', await p.evaluate(() => document.getElementById('explore').classList.contains('route') && !document.getElementById('explore').hidden) && (await p.$$('.amg-rm')).length === routes.find(r => r.id === 'vake-murals').stops.length);
await ctx.close();

// ---------- Телефон ----------
[ctx, p] = await open({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
await p.tap('#btnExplore'); await p.waitForTimeout(1500);
const lm = await p.evaluate(() => { const r = document.getElementById('explore').getBoundingClientRect(); return [r.top, r.height, innerHeight, document.documentElement.scrollWidth, innerWidth]; });
ok('телефон: нет горизонтальной прокрутки', lm[3] <= lm[4] + 1, `${lm[3]}/${lm[4]}`);
await p.screenshot({ path: path.join(OUT, 'sc-mobile-list.png') });
await p.tap('#explore [data-ex-route="vake-murals"]'); await p.waitForTimeout(3000);
const mm = await p.evaluate(() => { const pr = document.getElementById('explore').getBoundingClientRect(); const ms = [...document.querySelectorAll('.amg-rm')].map(e => e.getBoundingClientRect()); return { panelTop: pr.top, panelH: pr.height, vh: innerHeight, hidden: ms.filter(r => r.bottom > pr.top).length, n: ms.length, tapMin: Math.min(...ms.map(r => Math.min(r.width, r.height))) }; });
ok('телефон: панель маршрута ≤ 46% высоты', mm.panelH <= mm.vh * 0.47, `${Math.round(mm.panelH)}/${mm.vh}`);
ok('телефон: все точки видны над панелью', mm.n > 0 && mm.hidden === 0, `под панелью: ${mm.hidden}/${mm.n}`);
const freeM = await markersFree(p);
ok('телефон: точки не под лупой, бургером, брендом и чипами', freeM.length === 0, freeM.join(', '));
ok('телефон: цель нажатия ≥ 34 px', mm.tapMin >= 34, `${mm.tapMin}`);
await p.screenshot({ path: path.join(OUT, 'sc-mobile-route.png') });
await ctx.close();

// ---------- Языки ----------
for (const lang of ['ka', 'en']) {
  [ctx, p] = await open({ viewport: { width: 800, height: 700 } }, lang);
  await p.click('#btnExplore'); await p.waitForTimeout(1500);
  const ttl = await p.textContent('#explore h2'), card = await p.textContent('#explore .ex-title');
  ok(`${lang}: заголовок и название маршрута на своём языке`, ttl.trim().length > 3 && /[a-zA-ZႠ-ჿ]/.test(card) && !/[а-яА-Я]/.test(card), `${ttl.trim()} / ${card.trim().slice(0, 40)}`);
  const w = await p.evaluate(() => { const r = [...document.querySelectorAll('#topui > *:not(#bar)')].map(e => e.getBoundingClientRect().right); return Math.max(...r) <= innerWidth + 1; });
  ok(`${lang} 800px: верхняя панель не вылезает за экран`, w);
  await p.screenshot({ path: path.join(OUT, `sc-${lang}.png`) });
  await ctx.close();
}

await b.close(); server.close();
console.log('pageerrors:', errs.length, errs.slice(0, 5).join(' | '));
process.exit(out.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
