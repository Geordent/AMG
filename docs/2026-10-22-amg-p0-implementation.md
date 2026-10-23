# AMG — P0/P1 implementation snapshot

- Дата: **2026-10-22**
- Режим: локальная работа; commit/push/deploy **не выполнялись**
- База: `b7f511e` (после синхронизации с `origin/main`)
- Локальная копия: `/mnt/d/MyProjects/AMG`
- Backup до sync: ветка `backup/local-before-sync-2026-10-22`, архив `../AMG-docs-archive-2026-10-22.tar.gz`

---

## 1. Синхронизация

- `git fetch origin`, `git reset --hard origin/main` → local HEAD = `b7f511e`.
- 142 старых docs (22 МБ) сохранены в backup-ветке и tar-архиве; в рабочем дереве остались только актуальные отчёты.
- `node scripts/validate-data.mjs` → **PASS** (573 sites / 539 artworks / 188 artists / 16 sources / 48 cities).
- `data/transit.geojson` — 128 features, на месте.

---

## 2. Что изменено

| Область | Изменение | Файлы |
|---|---|---|
| Privacy | статическая страница на ru/en/ka: localStorage/IndexedDB, геолокация, карта, счётчик, GitHub, Telegram, удаление данных | `privacy.html` |
| License | статическая страница: OSM/ODbL, Protomaps, OpenFreeMap, Wikimedia, GeoAIR, Street Art Cities, transit OSM/Nominatim; статус лицензии каталога | `license.html` |
| Навигация | ссылки «Конфиденциальность · Лицензии» в brand-блоке; локализация ru/en/ka | `index.html` |
| UGC safety | `AMG_UGC_ENABLED = false`: «Я здесь» и verified-бейджи не показываются до реального запуска бота | `index.html` |
| Provenance | в detail появилась группа «Источники без прямой ссылки»: map/catalog-источники показываются текстом, а не скрываются | `index.html` |
| Offline | online-слой OpenFreeMap не добавляется при `navigator.onLine === false`; `offlineOnly` сохраняется; размер пака показывается до скачивания; исправлены пробелы в текстах; online/offline пересобирают стиль | `index.html` |
| Photos | Wikimedia Commons: превью `960px` вместо оригинала; при ошибке — fallback на original | `index.html` |
| SW | cache v9; network-first для любых `*.html` | `sw.js` |
| CI | `node scripts/validate-data.mjs` + проверка наличия `transit.geojson`, `privacy.html`, `license.html`; legal pages копируются в artifact | `.github/workflows/pages.yml` |
| Docs | README/AGENTS обновлены; добавлен `docs/RUNBOOK.md` | `README.txt`, `AGENTS.md`, `docs/RUNBOOK.md` |

---

## 3. Проверки

| Проверка | Результат |
|---|---|
| `node --check` inline-модуля | PASS |
| `node --check sw.js` | PASS |
| `node scripts/validate-data.mjs` | PASS |
| Desktop local (1280×900) | карта, 573 объекта, 8 чипов, legal links, транспорт, detail — без JS-ошибок |
| Mobile local (390×844) | legal links видны, бургер-меню, транспорт, карта — без ошибок |
| UGC | `[data-here]` отсутствует в detail; verified badge скрыт |
| Provenance | `site-0003`: «Источники без прямой ссылки — Tbilisi Mural Fest…» |
| Offline pack | «Вся Грузия» скачана; размер показан до скачивания; `offlineOnly` сохранился после reload |
| Offline reload | карта/каталог/языки работают, **ложного toast «Ошибка карты» нет** |
| Thumbnail | `Abastumani_resort.jpg`: 960×640 thumb вместо оригинала 5472×3648 (14,7 МБ) |
| Legal pages local | 200, ~8–10 КБ каждая |

---

## 4. Что осталось

- **Не коммитил и не пушил**: изменения только локально.
- **Бот не развёрнут**; UGC выключен флагом. Для включения нужен реальный `amg-contrib-bot.mjs` + feed.
- **Thumbnails** пока выводятся на лету; поля `thumb_url/width/height` в data не добавлены.
- **Аудит данных** (306 uncertain, 347 без года, дубль Dikhashko, source coverage) не завершён.
- **CI smoke** (Playwright) и pin PMTiles build не добавлены.
- **PWA/SEO** (manifest, OG/meta) не добавлены.
- **Лицензия каталога** всё ещё требует юридического решения.
- На `zimablade` остаются untracked build-scripts/source для transit; их нужно решить отдельно (коммит/архив).

---

## 5. Следующий шаг

1. Просмотреть локальный diff и решить, что коммитить.
2. Отдельным GO: commit/push → Actions → live-проверка.
3. После live — взяться за thumbnails в data, аудит данных и CI smoke.
