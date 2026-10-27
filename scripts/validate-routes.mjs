// Проверка готовых маршрутов data/routes.json: id уникальны, точки существуют и не повторяются,
// у объектов статус active, переводы ru/en/ka есть, соседние точки не дальше MAX_LEG_M.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const MAX_LEG_M = 1500;
const sites = new Map(read('data/sites.geojson').features.map(f => [f.properties.id, f]));
const status = new Map();
for (const a of read('data/artworks.json')) if (!status.has(a.site_id)) status.set(a.site_id, a.status);
const hv = (p, q) => { const R = 6371000, r = x => x * Math.PI / 180, h = Math.sin(r(q[1] - p[1]) / 2) ** 2 + Math.cos(r(p[1])) * Math.cos(r(q[1])) * Math.sin(r(q[0] - p[0]) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

const errs = [], ids = new Set();
const { routes = [] } = read('data/routes.json');
for (const r of routes) {
  const w = `route ${r.id}`;
  if (!/^[a-z0-9-]+$/.test(r.id || '')) errs.push(`${w}: недопустимый id`);
  if (ids.has(r.id)) errs.push(`${w}: повтор id`); ids.add(r.id);
  for (const k of ['title', 'theme', 'desc']) for (const l of ['ru', 'en', 'ka']) if (!r[k] || !r[k][l]) errs.push(`${w}: нет ${k}.${l}`);
  if (!Array.isArray(r.stops) || r.stops.length < 2) { errs.push(`${w}: меньше 2 точек`); continue; }
  if (new Set(r.stops).size !== r.stops.length) errs.push(`${w}: точки повторяются`);
  let total = 0;
  r.stops.forEach((id, i) => {
    if (!sites.has(id)) return errs.push(`${w}: нет места ${id}`);
    if (status.get(id) !== 'active') errs.push(`${w}: ${id} не active (${status.get(id) || 'без работ'})`);
    if (i && sites.has(r.stops[i - 1])) {
      const d = hv(sites.get(r.stops[i - 1]).geometry.coordinates, sites.get(id).geometry.coordinates); total += d;
      if (d > MAX_LEG_M) errs.push(`${w}: ${r.stops[i - 1]} → ${id} = ${Math.round(d)} м > ${MAX_LEG_M}`);
    }
  });
  console.log(`${r.id}: ${r.stops.length} точек, ${(total / 1000).toFixed(2)} км по прямой`);
}
if (errs.length) { console.error('ROUTES FAIL:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`ROUTES PASS: ${routes.length}`);
