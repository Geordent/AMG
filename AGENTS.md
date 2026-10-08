# AMG — ArtMap Georgia

## Соглашения

- Все отчёты, результаты аудита и важные данные сохранять в папку `docs/` в корне проекта.
  Имена файлов: `YYYY-MM-DD-<тема>.md`.
- По умолчанию работать read-only: не менять код, данные, workflow, git history и GitHub,
  пока не получен явный GO.
- До завершения локального MVP GitHub (commit/push/настройки Pages) не трогать.

## Структура

- `index.html` — вся логика карты (MapLibre + PMTiles, offline через IndexedDB).
- `sw.js` — service worker, кэш оболочки (PMTiles не кэширует).
- `.github/workflows/pages.yml` — сборка тайлов и публикация на GitHub Pages.
- `docs/` — отчёты и документация.
