// Делит data/artworks.json для публикации: artworks.lite.json (без описаний, грузится на старте)
// и artworks.desc.json ({id: description}, догружается после показа карты).
// Источник правды не меняется — правки по-прежнему только в data/artworks.json.
// Запуск: node scripts/split-artworks.mjs <outDir>   (в CI: site/data)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'data'));
const artworks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/artworks.json'), 'utf8'));

const lite = [], desc = {};
for (const { description, ...rest } of artworks) {
  lite.push(rest);
  if (description) desc[rest.id] = description;
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'artworks.lite.json'), JSON.stringify(lite));
fs.writeFileSync(path.join(OUT, 'artworks.desc.json'), JSON.stringify(desc));
const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB';
console.log(`artworks: ${lite.length} → lite ${kb('artworks.lite.json')}, desc ${Object.keys(desc).length} (${kb('artworks.desc.json')})`);
