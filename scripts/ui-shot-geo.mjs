// Проверка UI после правок: глаз под чипами, обратная связь в бургер-меню, диагностика «Рядом».
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = '/workspace/group/AMG';
const OUT = '/workspace/group/amg-preview';
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.geojson':'application/geo+json', '.pmtiles':'application/octet-stream', '.css':'text/css', '.svg':'image/svg+xml' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(8124, r));

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });

const report = {};

// --- 1) Мобильный вид: глаз под чипами, «Обратная связь» только в бургере ---
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto('http://localhost:8124/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  report.mobile = await page.evaluate(() => {
    const hits = document.getElementById('amgHits');
    const chips = document.getElementById('chips');
    const meta = document.getElementById('amgMeta');
    const menu = document.getElementById('menu');
    const h = hits && hits.getBoundingClientRect();
    const c = chips && chips.getBoundingClientRect();
    const btns = document.getElementById('menuBtn').getBoundingClientRect();
    return {
      hitsVisible: !!(hits && !hits.hidden && h && h.width > 0),
      hitsText: (document.getElementById('amgHitsN') || {}).textContent,
      hitsBelowChips: !!(h && c && h.top >= c.bottom - 1),
      hitsRightAligned: !!(h && Math.abs(h.right - (window.innerWidth - 8)) < 24),
      metaInsideMenu: !!(meta && menu && menu.contains(meta)),
      menuBtnRight: !!(btns && btns.right > window.innerWidth - 80),
      chipsTop: c && Math.round(c.top), hitsTop: h && Math.round(h.top),
    };
  });
  await page.screenshot({ path: path.join(OUT, 'mobile-top.png'), clip: { x: 0, y: 0, width: 412, height: 260 } });

  // открыть бургер — «Обратная связь» должна быть внутри
  await page.click('#menuBtn');
  await page.waitForTimeout(600);
  report.burger = await page.evaluate(() => {
    const menu = document.getElementById('menu');
    const meta = document.getElementById('amgMeta');
    const r = meta && meta.getBoundingClientRect();
    const hits = document.getElementById('amgHits').getBoundingClientRect();
    return {
      menuOpen: menu && ! menu.hidden,
      metaInMenuVisible: !!(meta && !meta.hidden && r && r.width > 0),
      metaText: (meta && meta.textContent || '').trim(),
      hitsStillOnScreen: !!(hits && hits.top < window.innerHeight * 0.4),
    };
  });
  await page.screenshot({ path: path.join(OUT, 'mobile-burger.png') });
  report.mobileErrs = errs;
  await ctx.close();
}

// --- 2) «Рядом» без разрешения: понятная причина + шаги ---
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  // нет grantPermissions → Chromium отвечает отказом
  await page.goto('http://localhost:8124/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.click('#menuBtn');            // на мобиле «Рядом» живёт в бургер-меню
  await page.waitForTimeout(500);
  await page.click('#btnNearby');
  await page.waitForTimeout(1500);
  report.nearbyDenied = await page.evaluate(() => {
    const nb = document.getElementById('nearby');
    const fail = nb.querySelector('.amg-geo-fail');
    return {
      panelOpen: nb && !nb.hidden,
      failShown: !!fail,
      why: fail ? fail.querySelector('.amg-geo-why').textContent.slice(0, 90) : null,
      steps: fail ? Array.from(fail.querySelectorAll('.amg-geo-steps li')).length : 0,
      retryBtn: !!nb.querySelector('[data-geo-retry]'),
      menuClosed: document.getElementById('menu').hidden,
      diag: (nb.querySelector('.amg-geo-diag div') || {}).textContent || null,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'nearby-denied.png') });
  report.nearbyErrs = errs;
  await ctx.close();
}

// --- 3) «Рядом» с разрешением и координатой в Тбилиси ---
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    geolocation: { latitude: 41.6938, longitude: 44.8015, accuracy: 12 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8124/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.click('#menuBtn');            // на мобиле «Рядом» живёт в бургер-меню
  await page.waitForTimeout(500);
  await page.click('#btnNearby');
  await page.waitForTimeout(2500);
  report.nearbyOk = await page.evaluate(() => {
    const nb = document.getElementById('nearby');
    return {
      failShown: !!nb.querySelector('.amg-geo-fail'),
      menuClosed: document.getElementById('menu').hidden,
      note: (nb.querySelector('.amg-near-note') || {}).textContent || null,
      rows: nb.querySelectorAll('.amg-near-row').length,
      radii: nb.querySelectorAll('.amg-near-radii button').length,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'nearby-ok.png') });
  await ctx.close();
}

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
