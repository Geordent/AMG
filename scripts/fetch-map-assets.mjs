// Скачивает шрифты (glyph PBF) и спрайты карты в assets/ — сайт отдаёт их сам, без protomaps.github.io в рантайме.
// Запуск: npm run build:assets   (в CI — шаг перед публикацией на Pages; результат кэшируется)
//
// Зачем: раньше подписи и иконки базовой карты грузились с внешнего CDN — если он недоступен,
// карта оставалась без подписей, а офлайн работали только заранее прогретые диапазоны.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');
const BASE = 'https://protomaps.github.io/basemaps-assets';
// Все шрифты, которые используют слои @protomaps/basemaps и собственные слои index.html.
const FONTSTACKS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
const FLAVORS = ['light', 'dark', 'grayscale', 'white'];
const SPRITE_FILES = ['.json', '.png', '@2x.json', '@2x.png'];

const jobs = [];
for (const fs_ of FONTSTACKS) for (let i = 0; i < 65536; i += 256) {
  const range = `${i}-${i + 255}`;
  jobs.push({ url: `${BASE}/fonts/${encodeURIComponent(fs_)}/${range}.pbf`, file: path.join(OUT, 'fonts', fs_, `${range}.pbf`), optional: true });
}
for (const f of FLAVORS) for (const s of SPRITE_FILES) {
  jobs.push({ url: `${BASE}/sprites/v4/${f}${s}`, file: path.join(OUT, 'sprites', `${f}${s}`), optional: false });
}

let ok = 0, missing = 0, bytes = 0;
async function run(job) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(job.url);
      if (r.status === 404 && job.optional) { missing++; return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.mkdirSync(path.dirname(job.file), { recursive: true });
      fs.writeFileSync(job.file, buf);
      ok++; bytes += buf.length;
      return;
    } catch (e) {
      if (attempt >= 4) throw new Error(`${job.url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 500 * attempt));
    }
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: 24 }, async () => { while (queue.length) await run(queue.shift()); }));

for (const fs_ of FONTSTACKS) {
  if (!fs.existsSync(path.join(OUT, 'fonts', fs_, '0-255.pbf'))) throw new Error(`fontstack missing: ${fs_}`);
}
console.log(`map assets: ${ok} files, ${(bytes / 1048576).toFixed(1)} MB, ${missing} glyph ranges absent upstream`);
