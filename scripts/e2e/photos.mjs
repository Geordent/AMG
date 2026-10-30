// Фото Commons: карточка «Впечатления» (десктоп-попап и телефон), галерея места в «Подробно».
import { chromium } from 'playwright-core';
import { railify } from './rail.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir, repo] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
const exp = JSON.parse(fs.readFileSync(path.join(repo, 'data/experiences.geojson'), 'utf8')).features;
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
}).listen(8942);
const U = 'http://localhost:8942/';
const out = [], errs = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l.slice(0, 220)); };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ALL = ['paraglide','canyon','zipline','rafting','bike','cablecar','bath','waterpark','zoo','aquarium','horse','golf','marina'];
const target = n => exp.find(f => f.properties.name_ru === n).geometry.coordinates;
const loaded = p => p.evaluate(() => [...document.querySelectorAll('img[data-media-img]')].map(i => i.complete && i.naturalWidth > 0));

async function openExp(p, name) {
  const [lng, lat] = target(name);
  await p.evaluate(([x, y]) => window.amgMap.jumpTo({ center: [x, y], zoom: 13 }), [lng, lat]);
  await p.waitForTimeout(3500);
  const pt = await p.evaluate(([x, y]) => { const q = window.amgMap.project([x, y]); return [q.x, q.y]; }, [lng, lat]);
  await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(2500);
}
// 3) галерея места в «Подробно»
{
  const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU', serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('amg-packhint', JSON.stringify({ tbilisi: 99 })); } catch (_) {} });
  const p = await ctx.newPage(); railify(p); p.on('pageerror', e => errs.push('detail: ' + e.message));
  await p.goto(U); await p.waitForTimeout(4000);
  for (const [id, want] of [['site-0039', 2], ['site-0041', 2], ['site-0541', 2], ['site-0558', 2], ['site-0569', 2]]) {
    await p.evaluate(h => { location.hash = '#s=' + h; }, id); await p.waitForTimeout(3000);
    // ленивая загрузка: фото качаются, когда галерея видна — прокручиваем к ней и ждём загрузки (до 25 с)
    await p.evaluate(() => document.querySelector('#detail .amg-detail-gallery')?.scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => { const a = [...document.querySelectorAll('#detail img[data-media-img]')]; return a.length >= 2 && a.every(i => i.complete && i.naturalWidth > 0); }, null, { timeout: 25000 }).catch(() => {});
    const n = await p.$$eval('#detail .amg-detail-gallery img', a => a.length);
    const L = await loaded(p);
    ok(`«Подробно» ${id}: в галерее ${want} фото, все загрузились`, n === want && L.length >= want && L.slice(0, want).every(Boolean), `img=${n} loaded=${JSON.stringify(L)}`);
    if (id === 'site-0039') await p.screenshot({ path: path.join(OUT, 'ph-site-detail.png'), clip: { x: 880, y: 0, width: 480, height: 640 } });
    await p.click('[data-detail-close]').catch(() => {}); await p.waitForTimeout(300);
  }
  await ctx.close();
}
console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close();
