AMG — ArtMap Georgia
Карта искусства и необычных городских объектов Грузии.
Прод: https://geordent.github.io/AMG/

Структура
  index.html                      вся логика карты (MapLibre + PMTiles, offline через IndexedDB)
  sw.js                           service worker, кэш оболочки (PMTiles не кэширует)
  privacy.html                    конфиденциальность
  license.html                    лицензии и атрибуция
  data/                           sites, artworks, artists, sources, cities, transit
  scripts/validate-data.mjs       проверка данных (Stage 0)
  scripts/build-vendor.mjs        сборка vendor/map-bundle.js из lock-файла
  .github/workflows/pages.yml     сборка тайлов, vendor и публикация на GitHub Pages
  docs/                           отчёты, аудит, планы

Локальная проверка
  1. Node.js 22+
  2. npm ci
  3. npm run build:vendor
  4. node scripts/validate-data.mjs
  5. Соберите site/ или запустите статический сервер с поддержкой Range
     (PMTiles требует HTTP Range; python -m http.server не подходит для полноценной карты).
  6. Для локальной карты нужны vendor/ и tiles/*.pmtiles; они не хранятся в git.
     Тайлы собираются CI, локально их можно скопировать из рабочей копии на сервере
     или скачать с live-сайта.

Деплой
  push в main -> GitHub Actions -> GitHub Pages.
  Workflow проверяет data, собирает vendor, вырезает PMTiles, копирует
  index.html, sw.js, privacy.html, license.html и data/ в artifact.

Офлайн
  Меню «Офлайн» -> скачать «Вся Грузия» и/или «Тбилиси».
  Размер пака показывается до скачивания; выбор «Только скачанное» запоминается.
  PMTiles хранятся в IndexedDB, shell/каталог/страницы — в Cache API.

UGC
  «Я здесь» временно отключено: в index.html AMG_UGC_ENABLED = false.
  Включать только после реального развёртывания Telegram-бота и публикации
  data/contributions.json. Иначе UI не должен обещать подтверждение.

Правила работы с данными
  - Источник истины — git; данные меняются только через проверяемые скрипты.
  - Перед импортом: snapshot, backup, проверка дублей ID/координат, validate-data.
  - Не перезаписывать untracked-файлы на zimablade без отдельного GO.
