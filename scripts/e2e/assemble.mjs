// Собирает тестовую копию сайта «как в CI» для браузерных сценариев: node scripts/e2e/assemble.mjs <папка>
// Нужны vendor/ (npm run build:vendor), assets/ (npm run build:assets) и tiles/*.pmtiles (скопировать с live-сайта
// или нарезать: node scripts/extract-tiles.mjs <planet.pmtiles> tiles). Отсутствующее пропускается с предупреждением.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.argv[2] || 'site-test');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const copy = rel => {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) return console.warn('пропущено (нет): ' + rel);
  fs.cpSync(from, path.join(OUT, rel), { recursive: true });
};
for (const f of ['index.html', 'sw.js', 'privacy.html', 'license.html', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'og-cover.jpg',
  'icons', 'fonts', 'data', 'vendor', 'assets', 'tiles']) copy(f);
execFileSync('node', [path.join(ROOT, 'scripts/split-artworks.mjs'), path.join(OUT, 'data')], { stdio: 'inherit' });
console.log('готово: ' + OUT);
console.log('запуск: npm i --no-save playwright-core@1.48.2; node scripts/e2e/<сценарий>.mjs ' + OUT + ' <папка-скриншотов>');
