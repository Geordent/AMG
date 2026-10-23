# AMG — ArtMap Georgia

## Соглашения

- Все отчёты, результаты аудита и важные данные сохранять в папку `docs/` в корне проекта.
  Имена файлов: `YYYY-MM-DD-<тема>.md`.
- По умолчанию работать read-only: не менять код, данные, workflow, git history и GitHub,
  пока не получен явный GO.
- GitHub (commit/push/настройки Pages) — только по отдельному явному GO.
- `zimablade` считать живым источником: перед любыми действиями — snapshot/хеши/backup;
  не перезаписывать untracked и не делать destructive-команды на сервере.
- Перед изменениями данных: проверить дубли ID/координат, прогнать `node scripts/validate-data.mjs`,
  сравнить counts до/после и сохранить отчёт в `docs/`.

## Структура

- `index.html` — вся логика карты (MapLibre + PMTiles, offline через IndexedDB).
- `sw.js` — service worker, кэш оболочки (PMTiles не кэширует).
- `privacy.html`, `license.html` — конфиденциальность и лицензии/атрибуция.
- `data/` — sites, artworks, artists, sources, cities, transit.
- `scripts/validate-data.mjs` — проверка данных.
- `.github/workflows/pages.yml` — сборка vendor/тайлов и публикация на GitHub Pages.
- `docs/` — отчёты, аудит, планы, runbook.
