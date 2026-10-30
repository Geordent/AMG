// Верхняя панель. Десктоп: баннер + язык и стиль карты рядом с ним, счётчик внутри баннера; кнопки «Рядом / Маршруты /
// Паспорт / Транспорт / Офлайн / Обратная связь» выезжают из-за правого края (наведение, фокус, клик по язычку).
// Телефон: бургер-меню. Проверяется: нет пересечений и выхода за экран при любых размерах и языках ru/ka/en.
// Запуск: node scripts/e2e/topbar.mjs <папка сайта> <папка скриншотов>
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.geojson':'application/geo+json', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(fp); const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  const h = { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' };
  if (m) { const s = +m[1], e = m[2] ? +m[2] : st.size - 1;
    res.writeHead(206, { ...h, 'content-range': `bytes ${s}-${e}/${st.size}`, 'content-length': e - s + 1 }); return fs.createReadStream(fp, { start: s, end: e }).pipe(res); }
  res.writeHead(200, { ...h, 'content-length': st.size }); fs.createReadStream(fp).pipe(res);
}).listen(8893);
const out = [], errs = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l); };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// Измерение: прямоугольники элементов; пересечения (>1 px по обеим осям) и выход за экран
const measure = (p, { rail }) => p.evaluate(({ rail }) => {
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const items = [];
  const add = (name, e) => { if (vis(e)) { const r = e.getBoundingClientRect(); items.push({ name, l: r.left, t: r.top, r: r.right, b: r.bottom }); } };
  add('brand', document.getElementById('brand')); add('search', document.getElementById('searchBtn')); add('burger', document.getElementById('menuBtn'));
  add('flavor', document.querySelector('#topSel #flavor')); add('lang', document.querySelector('#topSel #lang'));
  add('chips', document.getElementById('chips')); add('eye', document.getElementById('amgHits')); add('tab', document.getElementById('railTab'));
  if (rail) document.querySelectorAll('#topui > #bar > *:not(#railTab)').forEach(e => add('bar:' + (e.id || e.tagName), e));
  const bad = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], d = items[j];
    if ((a.name === 'brand' && d.name === 'eye') || (a.name === 'eye' && d.name === 'brand')) continue;   // счётчик нарочно внутри баннера (проверяется отдельно: eyeInBrand)
    if (rail && (a.name === 'chips' || d.name === 'chips') && (a.name.startsWith('bar:') || d.name.startsWith('bar:') || a.name === 'tab' || d.name === 'tab')) continue;   // открытая панель временно перекрывает ряд тем справа — так задумано
    if (Math.min(a.r, d.r) - Math.max(a.l, d.l) > 1 && Math.min(a.b, d.b) - Math.max(a.t, d.t) > 1) bad.push(`${a.name}×${d.name}`);
  }
  const outside = items.filter(i => i.r > innerWidth + 1 || i.l < -1 || i.b > innerHeight + 1).map(i => i.name);
  const brand = items.find(i => i.name === 'brand'), eye = items.find(i => i.name === 'eye'), lang = items.find(i => i.name === 'lang'), fl = items.find(i => i.name === 'flavor');
  return { n: items.length, bad, outside, eyeInBrand: !!(brand && eye && eye.l >= brand.l && eye.r <= brand.r + 1 && eye.t >= brand.t && eye.b <= brand.b + 1),
    selRight: !!(brand && fl && lang && fl.l >= brand.r && lang.l >= fl.r && Math.abs(fl.t - brand.t) < 14),
    barVisible: [...document.querySelectorAll('#topui > #bar > *:not(#railTab)')].filter(e => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= 0 && r.width > 0; }).length,
    barTotal: document.querySelectorAll('#topui > #bar > *:not(#railTab)').length,
    mapCtl: (() => { const g = document.querySelector('.maplibregl-ctrl-bottom-right'); return g ? g.getBoundingClientRect().top : 9999; })(),
    barBottom: (() => { const e = document.getElementById('bar'); return e && vis(e) ? e.getBoundingClientRect().bottom : 0; })() };
}, { rail });

const cases = [];
for (const lang of ['ru', 'ka', 'en']) {
  for (const [w, h] of [[769, 600], [800, 700], [1024, 768], [1280, 720], [1360, 860], [1920, 1080]]) cases.push({ lang, w, h, mobile: false });
  for (const [w, h] of [[390, 800], [360, 640], [800, 360]]) cases.push({ lang, w, h, mobile: true });
}
for (const c of cases) {
  const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, isMobile: c.mobile, hasTouch: c.mobile, locale: 'ru-RU', serviceWorkers: 'block' });
  await ctx.addInitScript(l => { try { localStorage.setItem('amg-lang', l); } catch (_) {} }, c.lang);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8893/'); await p.waitForTimeout(5000);
  const tag = `${c.mobile ? 'телефон' : 'десктоп'} ${c.w}×${c.h} ${c.lang}`;
  await p.mouse.move(Math.round(c.w / 2), Math.round(c.h / 2));
  const closed = await measure(p, { rail: false });
  ok(`${tag}: закрытое состояние — нет пересечений и выхода за экран`, closed.bad.length === 0 && closed.outside.length === 0, `${closed.n} эл.${closed.bad.length ? ' пересекаются: ' + closed.bad.join(', ') : ''}${closed.outside.length ? ' за экраном: ' + closed.outside.join(', ') : ''}`);
  ok(`${tag}: счётчик просмотров внутри баннера`, closed.eyeInBrand);
  if (!c.mobile) {
    ok(`${tag}: язык и стиль карты — справа от баннера, в одной строке`, closed.selRight);
    ok(`${tag}: кнопки спрятаны за правым краем, виден только язычок`, closed.barVisible === 0 && closed.n >= 6);
    await p.hover('#railTab'); await p.waitForTimeout(700);
    const open = await measure(p, { rail: true });
    ok(`${tag}: по наведению панель выезжает — все ${open.barTotal} кнопок на экране, без пересечений`, open.barVisible === open.barTotal && open.bad.length === 0 && open.outside.length === 0, `${open.barVisible}/${open.barTotal}${open.bad.length ? ' ' + open.bad.join(', ') : ''}`);
    ok(`${tag}: открытая панель не заходит на кнопки карты`, open.barBottom <= open.mapCtl, `${Math.round(open.barBottom)} ≤ ${Math.round(open.mapCtl)}`);
    await p.mouse.move(Math.round(c.w / 2), Math.round(c.h / 2)); await p.waitForTimeout(1100);
    ok(`${tag}: уводим мышь — панель снова спрятана`, (await measure(p, { rail: false })).barVisible === 0);
    if (c.lang === 'ru' && c.w === 1360) {
      // клик по язычку закрепляет панель, повторный клик снимает; клавиатура тоже открывает
      await p.click('#railTab'); await p.mouse.move(400, 500); await p.waitForTimeout(900);
      ok('клик по язычку закрепляет панель (мышь ушла, панель осталась)', (await measure(p, { rail: false })).barVisible > 0 && (await p.getAttribute('#railTab', 'aria-expanded')) === 'true');
      await p.mouse.click(400, 500); await p.waitForTimeout(900);
      ok('клик по карте снимает закрепление', (await measure(p, { rail: false })).barVisible === 0 && (await p.getAttribute('#railTab', 'aria-expanded')) === 'false');
      await p.focus('#btnDay'); await p.waitForTimeout(700);
      ok('фокус с клавиатуры на кнопке выдвигает панель', (await measure(p, { rail: false })).barVisible > 0);
      await p.mouse.move(400, 500); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(1000);
      await p.hover('#railTab'); await p.waitForTimeout(600);
      await p.click('#btnPassport'); await p.waitForTimeout(700);
      ok('кнопка из выезжающей панели работает (Паспорт открылся)', await p.isVisible('#passport'));
      await p.screenshot({ path: path.join(OUT, 'tb-rail-click.png') });
    }
    if (c.lang === 'ka' && c.w === 800) { await p.hover('#railTab'); await p.waitForTimeout(700); await p.screenshot({ path: path.join(OUT, 'tb-d800-ka-open.png') }); }
  } else {
    const sel = await p.evaluate(() => ({ top: document.querySelectorAll('#topSel select').length, bar: !!document.querySelector('#bar #flavor') || !!document.querySelector('#menu #flavor') }));
    ok(`${tag}: язык и стиль карты внутри бургер-меню, не наверху`, sel.top === 0 && sel.bar);
    ok(`${tag}: язычка выезжающей панели нет`, !(await p.evaluate(() => { const t = document.getElementById('railTab'); return t && t.getClientRects().length > 0; })));
  }
  if (c.lang === 'ka' && c.w === 390) await p.screenshot({ path: path.join(OUT, 'tb-m390-ka.png') });
  await ctx.close();
}
await b.close(); server.close();
console.log('pageerrors:', errs.length, errs.slice(0, 5).join(' | '));
process.exit(out.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
