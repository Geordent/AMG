# AMG — ArtMap Georgia

## Соглашения

- Все отчёты, результаты аудита и важные данные сохранять в папку `docs/` в корне проекта.
  Имена файлов: `YYYY-MM-DD-<тема>.md`.
- По умолчанию работать read-only: не менять код, данные, workflow, git history и GitHub,
  пока не получен явный GO.
- GitHub (commit/push/настройки Pages) — только по отдельному явному GO.
- `zimablade` считать живым источником: перед любыми действиями — snapshot/хеши/backup;
  не перезаписывать untracked и не делать destructive-команды на сервере.
- Секреты (токен бота, ключ шифрования, токены GitHub) никогда не читать, не печатать и не просить вставить в чат: автор кладёт значение во временный файл, скрипт записывает секрет и удаляет файл.
- Фото — только Wikimedia Commons со свободной лицензией и подписью автора; фото муралов — только по разрешению (docs/2026-10-27-amg-photos-legal-sources.md).
- Перед изменениями данных: проверить дубли ID/координат, прогнать `node scripts/validate-data.mjs`,
  сравнить counts до/после и сохранить отчёт в `docs/`.

## Структура

- `index.html` — вся логика карты (MapLibre + PMTiles, offline через IndexedDB).
- `sw.js` — service worker, кэш оболочки (PMTiles не кэширует).
- `privacy.html`, `license.html` — конфиденциальность и лицензии/атрибуция.
- `data/` — sites, artworks, artists, sources, cities, transit.
- `scripts/validate-data.mjs` — проверка данных.
- `scripts/split-artworks.mjs`, `scripts/fetch-map-assets.mjs` — шаги сборки (описания работ отдельно; шрифты/спрайты карты в `assets/`).
- `fonts/` — шрифты интерфейса (OFL), без внешнего CDN.
- `docs/DESIGN.md` — дизайн-система «Балкон + Скетчбук» (палитра, шрифты, маркеры, движение); сверяться перед правками стиля.
- `data/routes.json` — готовые маршруты; `data/offline-packs.json` — офлайн-карты городов (читают сайт и CI); `data/contributions.json` — фид бота (пишет бот, не вручную).
- `scripts/validate-experiences.mjs`, `scripts/validate-routes.mjs`, `scripts/extract-tiles.mjs`, `scripts/contrib-*.mjs` — проверки, нарезка тайлов, Telegram-бот и его тесты; `scripts/e2e/` — браузерные сценарии (вручную).
- `.github/workflows/pages.yml` — сборка vendor/тайлов и публикация на GitHub Pages; `.github/workflows/contrib-bot.yml` — бот `@artmap_georgia_bot`.
- `docs/RUNBOOK.md` — эксплуатация: деплой, откат, бот, секреты, планировщик, статистика.
- `docs/` — отчёты, аудит, планы, runbook.
