# AMG — сверка local vs GitHub Pages, ошибки и узкие места (2026-10-27)

Режим: read-only. Анализ выполнен на снапшоте `origin/main` (b93067f), выгруженном через `git archive` вне репозитория.

## 1. Расхождение версий

| Что | Состояние |
|---|---|
| Живой сайт https://geordent.github.io/AMG/ | **== origin/main (b93067f)** — index.html, sw.js, data/* побайтно совпадают |
| Локальный `main` (b8d60cc) | **отстаёт на 7 коммитов**, своих коммитов нет, рабочее дерево чистое → чистый fast-forward |
| CI (build-and-deploy) | последние 5 запусков — success (31–51 с) |

Коммиты, которых нет локально: dc51382 (SEO/PWA, sw v12), 0adf5c4 (i18n experiences), a00ba2b (sw v13: не кэшировать json), ccca600 (зоопарк, hours_en/ka, sw v14), 14e0270 (размер иконок по зуму, sw v15), cf2d1bb (интерактивные OSM POI, sw v16), b93067f (6 адресов). Локально отсутствуют `manifest.webmanifest`, `icons/`, `og-cover.jpg`, `robots.txt`, `sitemap.xml`.

Действие (по GO): `git pull --ff-only`.

## 2. Проверки

- `validate-data.mjs`: PASS — sites 573, artworks 539, artists 188, sources 16, cities 48.
- `validate-experiences.mjs`: PASS — 60 объектов, 13 видов.
- PMTiles Range-запросы на Pages: 206 корректно. При `Accept-Encoding: gzip` Pages отдаёт диапазон gzip-потока, но браузеры по Fetch-спеке шлют `identity` для Range → в браузере работает.

## 3. Ошибки

### 3.1 [Высокий] Офлайн-режим: карта есть, маркеров нет
С sw v13 `.json/.geojson` не кэшируются SW, а в IndexedDB сохраняются только `.pmtiles`. `loadCatalog()` (index.html:722) без сети падает (HTTP-кэш `max-age=600` после 10 мин не отдаётся при ошибке сети) → `catalogError`, на карте нет ни одного объекта, transit/experiences тоже пусты. Фича «скачать карту для офлайна» фактически неполная.
**Фикс:** в `sw.js` для данных — network-first с fallback на кэш (свежесть сохраняется, офлайн работает).

### 3.2 [Низкий] Прогресс скачивания пакета
`download()`/`probe()` берут `content-length`/`content-range` gzip-ответа (16 347 680) — фактически приходит 16 344 163 байт. Прогресс и «размер» слегка неточны. Фикс: запрос с `Range: bytes=0-` (Pages тогда отдаёт identity).

## 4. Узкие места / оптимизация

| # | Проблема | Где | Предложение | Эффект |
|---|---|---|---|---|
| O1 | Водопад старта: `await import(bundle 299 KB gz)` → `await loadCatalog()` (~270 KB gz) → `await loadLocal()` → карта | index.html:380, 741, 770 | запускать fetch данных и чтение IDB параллельно с импортом бандла; `modulepreload` для бандла | −1 RTT+загрузка данных на старте, особенно на 3G |
| O2 | При каждом `setStyle` (язык, тема, online/offline, скачивание пакета) ~60 SVG заново растеризуются через Image+canvas | index.html:1394–1426 | кэшировать `ImageData` в `Map` | смена языка/темы мгновенная на слабых устройствах |
| O3 | `artworks.json` 790 KB (150 KB gz), из них `description` ≈ 60 % — грузится на старте, нужен только в карточке | data/artworks.json | вынести описания в отдельный файл, грузить лениво | −~90 KB gz на старте (рефактор, позже) |
| O4 | Рантайм-зависимость от `protomaps.github.io` (glyphs/sprites) и `tiles.openfreemap.org` | index.html:408–409, 1186 | вендорить нужные glyph-диапазоны/спрайты в сборку | устойчивость, нет внешнего CDN для основы карты |
| O5 | CI каждый деплой (даже правка текста) тянет свежий planet-build и `go-pmtiles` latest | pages.yml | `actions/cache` для tiles (ключ — неделя), пин версии go-pmtiles | воспроизводимость, деплой не падает при недоступности build.protomaps.com |
| O6 | Ручной bump `CACHE` в sw.js на каждый релиз; vendor/иконки cache-first навсегда | sw.js | версию кэша генерировать в CI (хеш коммита) | нельзя забыть bump |

## 5. Прочее
- Корень репозитория: `list.txt`, `list1.txt`, `mozaic.txt`, `markers-preview.png`, `.docx`, `зафиксировал оба решения в памяти.txt` — рабочие артефакты, стоит перенести в `docs/` или убрать из корня.
- Счётчик abacus упомянут в privacy.html — ок.

## 6. План по GO
1. `git pull --ff-only` (локальный main → b93067f).
2. Фикс 3.1 (sw.js network-first для данных, bump sw v18) + O1 + O2 — малый diff, без изменения данных.
3. Отдельно, по желанию: O3–O6.

## 7. Выполнено (GO на п.1–2, 2026-10-27)

1. `git pull --ff-only` → локальный main = b93067f (== прод). `validate-data.mjs`: PASS.
2. Правки (не закоммичены):
   - `sw.js` v18: same-origin `.json/.geojson` — network-first с fallback на кэш (фикс 3.1). Побочно: cross-origin `.json` спрайтов protomaps теперь тоже кэшируются SW (раньше regex исключал их с любого origin).
   - `index.html`: `<link rel="modulepreload">` для бандла; fetch данных каталога стартует в начале модуля параллельно с `import()` (O1); кэш растеризованных SVG-иконок (O2). MapLibre `RGBAImage` берёт view на буфер, а не копию → из кэша отдаётся копия `ImageData` (9 КБ на иконку).

### Smoke-тест (Edge headless + playwright-core, локальный сервер; HTTP-кэш очищен перед офлайном = имитация >10 мин)

| Шаг | origin/main (v17) | patched (v18) |
|---|---|---|
| online, первая загрузка | ok | ok; запросы data стартуют одновременно с map-bundle (56 мс vs 40 мс) |
| reload под SW, смена языка ru→en→ru | ok | ok, без ошибок |
| **offline reload** | **«Каталог не загрузился: Failed to fetch»** | **каталог загружен** из SW-кэша (8 файлов data) |

«Ошибка карты, Failed to fetch» офлайн в обоих вариантах — ожидаемо: пакеты тайлов в тесте не скачаны.
