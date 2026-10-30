// Оговорка о доступе и безопасности (access_note) видна в карточке и в подробной панели объекта,
// на трёх языках; у заброшенных мест она говорит «осматривайте снаружи, внутрь не заходите».
// Запуск: node scripts/e2e/access-note.mjs <папка сайта> <папка скриншотов>
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [root, outDir] = process.argv.slice(2);
const ROOT = path.resolve(root), OUT = path.resolve(outDir);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.geojson':'application/geo+json', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.pmtiles':'application/octet-stream' };
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
const errs = [];
const ok = (n, c, x = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`);
const feats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites.geojson'), 'utf8')).features;
const withNote = feats.filter(f => f.properties.access_note);
ok('в данных есть объекты с access_note', withNote.length > 0, String(withNote.length));
const abandoned = ['site-0562', 'site-0563', 'site-0566', 'site-0567', 'site-0540'];
ok('у заброшенных советских мест есть оговорка на трёх языках', abandoned.every(id => {
  const n = feats.find(f => f.properties.id === id)?.properties.access_note;
  return n && n.ru && n.en && n.ka;
}));

const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [lang, re] of [['ru', /внутрь не заходите/], ['en', /do not go in/], ['ka', /შიგნით ნუ შეხვალთ/]]) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, locale: lang === 'ru' ? 'ru-RU' : lang === 'ka' ? 'ka-GE' : 'en-US', serviceWorkers: 'block' });
  await ctx.addInitScript(l => { try { localStorage.setItem('amg-lang', l); } catch (_) {} }, lang);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(U); await p.waitForTimeout(5500);
  await p.click('#btnExplore'); await p.waitForTimeout(1200);
  await p.click('#explore [data-ex-route="tbilisi-soviet-abandoned"]'); await p.waitForTimeout(2000);
  await p.click('#explore [data-ex-stop="site-0562"]'); await p.waitForTimeout(2200);
  const detailTxt = await p.evaluate(() => (document.querySelector('#detail .amg-access-note') || {}).textContent || '');
  const popTxt = await p.evaluate(() => (document.querySelector('.amg-pop .amg-access-note, #card .amg-access-note') || {}).textContent || '');
  const txt = detailTxt || popTxt;
  ok(`${lang}: оговорка видна в карточке заброшенного объекта`, re.test(txt), txt.slice(0, 80));
  if (lang === 'ru') await p.screenshot({ path: path.join(OUT, 'access-note-ru.png') });
  await ctx.close();
}
ok('нет ошибок страницы', errs.length === 0, errs.slice(0, 2).join('; '));
console.log('pageerrors:', errs.length);
await b.close(); server.close();
