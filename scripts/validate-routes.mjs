// Проверка готовых маршрутов data/routes.json (схема v2).
// Общее: id уникальны, переводы ru/en/ka, ≥2 и ≤25 точек без повторов, места существуют,
//   у места с работами есть хотя бы одна active (место без работ — например храм, источник — допустимо).
// Новые поля v2: kind (city|intercity), theme_key (из routes.json → themes), teaser, cover.
// Принцип раздела: никаких часов/дней/км (поля и цифры с единицами в teaser/desc запрещены);
//   расстояние между соседними точками ограничено только у городских прогулок (kind=city).
// Запуск: node scripts/validate-routes.mjs [путь/к/routes.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : path.join(ROOT, f), 'utf8'));
const LANGS = ['ru', 'en', 'ka'];
const KINDS = ['city', 'intercity'];
const COVER_TYPES = ['photo', 'icon', 'art'];
const MAX_STOPS = 25;
const MAX_LEG_M = 1500;                       // только kind=city
const FORBIDDEN_FIELDS = ['duration', 'distance', 'difficulty', 'season', 'hours', 'days', 'km', 'time'];
// число + единица времени/расстояния (ru, en, ka)
const UNIT_RE = /\d+([.,]\d+)?\s*(км|km|мин\p{L}*|min\p{L}*|час\p{L}*|hours?|hrs?|дн\p{L}*|days?|კმ|წთ|სთ|დღე\p{L}*|м|ч|h)(?![\p{L}])/iu;

const sites = new Map(read('data/sites.geojson').features.map(f => [f.properties.id, f]));
const statuses = new Map();                   // site_id → список статусов работ
for (const a of read('data/artworks.json')) (statuses.get(a.site_id) || statuses.set(a.site_id, []).get(a.site_id)).push(a.status);
const hv = (p, q) => { const R = 6371000, r = x => x * Math.PI / 180, h = Math.sin(r(q[1] - p[1]) / 2) ** 2 + Math.cos(r(p[1])) * Math.cos(r(q[1])) * Math.sin(r(q[0] - p[0]) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

const file = process.argv[2] || 'data/routes.json';
const errs = [], ids = new Set();
const data = read(file);
const routes = data.routes || [];
const themes = data.themes || {};
const loc = (o, w, name) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l].trim()) errs.push(`${w}: нет ${name}.${l}`); };

for (const k of Object.keys(themes)) {
  if (!/^[a-z0-9-]+$/.test(k)) errs.push(`themes.${k}: недопустимый ключ`);
  loc(themes[k], `themes.${k}`, 'title');
}

for (const r of routes) {
  const w = `route ${r.id}`;
  if (!/^[a-z0-9-]+$/.test(r.id || '')) errs.push(`${w}: недопустимый id`);
  if (ids.has(r.id)) errs.push(`${w}: повтор id`); ids.add(r.id);
  for (const k of ['title', 'theme', 'desc', 'teaser']) loc(r[k], w, k);
  for (const k of FORBIDDEN_FIELDS) if (k in r) errs.push(`${w}: поле ${k} запрещено (время/расстояние не указываем)`);
  for (const k of ['teaser', 'desc']) for (const l of LANGS) {
    const m = r[k] && typeof r[k][l] === 'string' && UNIT_RE.exec(r[k][l]);
    if (m) errs.push(`${w}: ${k}.${l} содержит время/расстояние «${m[0]}»`);
  }
  if (!KINDS.includes(r.kind)) errs.push(`${w}: kind должен быть ${KINDS.join(' | ')}`);
  if (!r.theme_key || !themes[r.theme_key]) errs.push(`${w}: theme_key «${r.theme_key || ''}» не описан в themes`);

  // Остановки
  if (!Array.isArray(r.stops) || r.stops.length < 2) { errs.push(`${w}: меньше 2 точек`); continue; }
  if (r.stops.length > MAX_STOPS) errs.push(`${w}: больше ${MAX_STOPS} точек`);
  if (new Set(r.stops).size !== r.stops.length) errs.push(`${w}: точки повторяются`);
  let total = 0;
  r.stops.forEach((id, i) => {
    if (!sites.has(id)) return errs.push(`${w}: нет места ${id}`);
    const st = statuses.get(id);
    if (st && !st.includes('active')) errs.push(`${w}: ${id} — у всех работ нет статуса active (${[...new Set(st)].join(', ')})`);
    if (i && sites.has(r.stops[i - 1])) {
      const d = hv(sites.get(r.stops[i - 1]).geometry.coordinates, sites.get(id).geometry.coordinates); total += d;
      if (r.kind === 'city' && d > MAX_LEG_M) errs.push(`${w}: ${r.stops[i - 1]} → ${id} = ${Math.round(d)} м > ${MAX_LEG_M}`);
    }
  });
  if (r.notes) for (const [sid, n] of Object.entries(r.notes)) {
    if (!r.stops.includes(sid)) errs.push(`${w}: notes для ${sid}, которого нет в stops`);
    loc(n, w, `notes.${sid}`);
  }

  // Обложка обязательна
  const c = r.cover;
  if (!c || !COVER_TYPES.includes(c.type)) { errs.push(`${w}: cover.type должен быть ${COVER_TYPES.join(' | ')}`); }
  else if (c.type === 'photo') {
    // фото: либо копия в icons/covers/<имя>.jpg (JPEG ≤ 600 КБ), либо прямая ссылка на Commons; автор/лицензия/ссылка обязательны всегда
    if (/^icons\/covers\/[a-z0-9-]+\.jpg$/.test(c.src || '')) {
      const f = path.join(ROOT, c.src);
      if (!fs.existsSync(f)) errs.push(`${w}: нет файла ${c.src}`);
      else { const b = fs.readFileSync(f); if (b.length > 600000) errs.push(`${w}: ${c.src} больше 600 КБ`); if (b[0] !== 0xFF || b[1] !== 0xD8) errs.push(`${w}: ${c.src} — не JPEG`); }
    } else if (!/^https:\/\/upload\.wikimedia\.org\//.test(c.src || '')) errs.push(`${w}: cover.src фото — icons/covers/<имя>.jpg или https://upload.wikimedia.org/…`);
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\//.test(c.source_url || '')) errs.push(`${w}: cover.source_url фото — страница файла на commons.wikimedia.org`);
    for (const k of ['credit', 'license', 'source_url']) if (!c[k] || !String(c[k]).trim()) errs.push(`${w}: у фото-обложки нет ${k}`);
  } else if (c.type === 'icon') {
    if (!r.stops.includes(c.site)) errs.push(`${w}: cover.site должен быть одной из остановок`);
  } else if (c.type === 'art') {
    // icons/covers/<имя>.svg (assets/ в .gitignore и пересобирается в CI — туда нельзя); безопасный SVG ≤ 60 КБ
    if (!/^icons\/covers\/[a-z0-9-]+\.svg$/.test(c.src || '')) errs.push(`${w}: cover.src арта — icons/covers/<имя>.svg`);
    else if (!fs.existsSync(path.join(ROOT, c.src))) errs.push(`${w}: нет файла ${c.src}`);
    else {
      const svg = fs.readFileSync(path.join(ROOT, c.src), 'utf8');
      if (svg.length > 60000) errs.push(`${w}: ${c.src} больше 60 КБ`);
      if (!/^\s*<svg[\s>]/.test(svg)) errs.push(`${w}: ${c.src} — не SVG`);
      if (/<script|\son\w+\s*=|javascript:|<foreignObject|(?:href|src)\s*=\s*["']?(?:https?:|\/\/|data:)/i.test(svg)) errs.push(`${w}: ${c.src} содержит скрипты или внешние ссылки`);
    }
  }
  console.log(`${r.id} [${r.kind}]: ${r.stops.length} точек${r.kind === 'city' ? `, ${(total / 1000).toFixed(2)} км по прямой` : ''}`);
}
if (errs.length) { console.error('ROUTES FAIL:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`ROUTES PASS: ${routes.length}`);
