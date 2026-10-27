// Нарезка офлайн-пакетов карты из planet-build Protomaps по списку data/offline-packs.json.
// Запуск в CI:   node scripts/extract-tiles.mjs <url planet.pmtiles> <папка>      — pmtiles extract для каждого пакета
// Проверка:      node scripts/extract-tiles.mjs --check <папка>                    — все файлы на месте и не пустые
// Без аргументов — только проверка самого списка (bbox, id, переводы).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/offline-packs.json'), 'utf8'));

function validate() {
  const ids = new Set(), errs = [];
  const all = [{ ...cfg.overview, id: cfg.overview.id }, ...cfg.packs];
  for (const p of all) {
    if (!/^[a-z][a-z0-9-]*$/.test(p.id)) errs.push(`${p.id}: недопустимый id`);
    if (ids.has(p.id)) errs.push(`${p.id}: повтор id`); ids.add(p.id);
    const [w, s, e, n] = p.bbox || [];
    if (!(w < e && s < n && w >= 39 && e <= 47 && s >= 40.5 && n <= 44)) errs.push(`${p.id}: bbox вне Грузии или перевёрнут`);
    for (const l of ['ru', 'en', 'ka']) if (!p.title || !p.title[l]) errs.push(`${p.id}: нет названия ${l}`);
  }
  if (errs.length) { console.error('offline-packs.json:\n  ' + errs.join('\n  ')); process.exit(1); }
  return all;
}
const fileOf = p => (p.file || p.id) + '.pmtiles';

const all = validate();
const [mode, a, b] = process.argv.slice(2);
if (mode === '--check') {
  const dir = path.resolve(a || 'site/tiles'), missing = all.filter(p => !(fs.existsSync(path.join(dir, fileOf(p))) && fs.statSync(path.join(dir, fileOf(p))).size > 0));
  if (missing.length) { console.error('нет пакетов: ' + missing.map(fileOf).join(', ')); process.exit(1); }
  for (const p of all) console.log(`${fileOf(p).padEnd(22)} ${(fs.statSync(path.join(dir, fileOf(p))).size / 1048576).toFixed(1)} MB`);
} else if (mode) {
  const src = mode, dir = path.resolve(a || 'tiles-cache');
  fs.mkdirSync(dir, { recursive: true });
  for (const p of all) {
    const args = ['extract', src, path.join(dir, fileOf(p)), `--bbox=${p.bbox.join(',')}`];
    if (p.maxzoom) args.push(`--maxzoom=${p.maxzoom}`);
    console.log('pmtiles ' + args.join(' '));
    execFileSync('pmtiles', args, { stdio: 'inherit' });
  }
} else {
  console.log(`offline-packs.json OK: обзор + ${cfg.packs.length} городов`);
}
