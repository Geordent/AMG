// Собирает vendor/map-bundle.js из точных версий в package.json (см. package-lock.json).
// Запуск: npm ci && npm run build:vendor   (в CI — шаг перед публикацией на Pages)
//
// Зачем: сайт раньше тянул maplibre-gl / pmtiles / @protomaps/basemaps с esm.sh
// (мажорные теги @5/@4 → версию выбирал CDN; 2 хопа на библиотеку; ~5 с на хоп,
// единственная внешняя точка полного отказа). Теперь эти библиотеки лежат рядом
// со страницей, версии зафиксированы lock-файлом, офлайн-первый запуск настоящий.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'vendor');
const OUT_JS = path.join(OUT_DIR, 'map-bundle.js');
const OUT_CSS = path.join(OUT_DIR, 'maplibre-gl.css');

fs.mkdirSync(OUT_DIR, { recursive: true });

const res = await build({
  entryPoints: [path.join(ROOT, 'scripts/vendor-entry.mjs')],
  outfile: OUT_JS,
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  sourcemap: false,
  metafile: true,
  logLevel: 'warning',
});

// CSS карты — тоже локально (иначе control/popup-стили остаются за unpkg).
const cssSrc = path.join(ROOT, 'node_modules/maplibre-gl/dist/maplibre-gl.css');
fs.copyFileSync(cssSrc, OUT_CSS);

const kb = n => (n / 1024).toFixed(0) + ' KB';
const jsSize = fs.statSync(OUT_JS).size;
const cssSize = fs.statSync(OUT_CSS).size;
const inputs = Object.keys(res.metafile.inputs).length;

console.log(`vendor/map-bundle.js  ${kb(jsSize)}  (esm, minified, ${inputs} inputs)`);
console.log(`vendor/maplibre-gl.css ${kb(cssSize)}`);

// Страховка от «зелёного» CI с пустым бандлом.
if (jsSize < 400 * 1024) {
  console.error('FATAL: бандл подозрительно мал — похоже, зависимости не установлены');
  process.exit(1);
}
const head = fs.readFileSync(OUT_JS, 'utf8').slice(0, 200);
if (head.includes('esm.sh') || head.includes('from"http')) {
  console.error('FATAL: в бандле остались внешние импорты');
  process.exit(1);
}
