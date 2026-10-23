# AMG — runbook

Дата: 2026-10-22  
Статус: рабочий документ; дополняется по мере изменений.

## 1. Локальная проверка

```bash
npm ci
npm run build:vendor
node scripts/validate-data.mjs
```

Для полноценной карты нужны `vendor/` и `tiles/*.pmtiles` (не в git). Локальный static server должен
поддерживать HTTP Range — иначе PMTiles будет отдавать ошибки. `python -m http.server` для этого не подходит.

## 2. Деплой

1. Проверить `git status`, `node scripts/validate-data.mjs`.
2. Push в `main` (только по GO).
3. GitHub Actions `build-and-deploy`: vendor → data validation → PMTiles → artifact → Pages.
4. Проверить live:
   - `index.html`, `data/transit.geojson`, `privacy.html`, `license.html` → 200;
   - `tiles/*.pmtiles` → 206 при Range;
   - SHA live-файлов совпадает с коммитом.

## 3. Rollback

- Быстрый: revert проблемного коммита в `main` → Actions задеплоит предыдущее состояние.
- Если сломан только артефакт: перезапустить предыдущий успешный run (Actions → Re-run).
- Не делать force-push в `main`.

## 4. Обновление данных

1. Снять snapshot/хеши затронутых файлов.
2. Изменения — только скриптом/импортом, не ручной перезаписью больших JSON.
3. Проверить:
   - дубли ID и координат;
   - orphan refs (`site_id`, `artist_ids`, `sources`);
   - i18n (ru/en/ka);
   - `node scripts/validate-data.mjs`.
4. Сравнить counts и наборы ID до/после; отчёт — в `docs/`.
5. Обновить `sw.js` cache-версию, если менялись `index.html`/data.

## 5. Транспорт

- Источник: OSM/Overpass + Nominatim + проверенный список.
- Сборка: `python3 scripts/build-transit.py` (файл скрипта должен быть в git).
- `data/transit.geojson` — статический; слои не зависят от PMTiles.
- Проверять bbox Грузии, наличие ru/en/ka, отсутствие дублей координат.
- Атрибуция OSM/Nominatim — в `license.html`.

## 6. UGC «Я здесь»

- Сейчас `AMG_UGC_ENABLED = false` в `index.html`.
- Включать только после:
  1. развёртывания `amg-contrib-bot.mjs` (systemd на zimablade, long polling, без входящих портов);
  2. публикации `data/contributions.json` без uid;
  3. проверки, что UI не ставит «подтверждено» до ответа бота.
- Токен хранить в `/etc/amg/contrib.env` (0600), не в git.

## 7. Service worker

- `CACHE` в `sw.js` менять при изменении оболочки/данных.
- PMTiles не кэшируются SW; они в IndexedDB.
- Для страниц (`*.html`) — network-first, для остального — cache-first.

## 8. Мониторинг/backup

- Периодически проверять live: страница, data, transit, tiles (Range), privacy/license.
- Backup: `git bundle` + архив `data/docs/scripts` (без `node_modules`, `tiles`, `sat`, preview).
- Секреты (токены, deploy-key) не попадают в отчёты, git и чат.
