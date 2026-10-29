AMG — ArtMap Georgia
Карта искусства и необычных городских объектов Грузии: муралы, стрит-арт, мозаики, бани, каньоны, канатки.
Прод: https://artmap-georgia.github.io/AMG/   Репозиторий: github.com/artmap-georgia/AMG

Структура
  index.html                       вся логика сайта (MapLibre + PMTiles, офлайн через IndexedDB)
  sw.js                            service worker (страницы и данные — network-first, остальное — cache-first)
  privacy.html, license.html       конфиденциальность; лицензии и атрибуция
  fonts/                           шрифты интерфейса (OFL), без внешнего CDN
  icons/, manifest.webmanifest     PWA; robots.txt, sitemap.xml, og-cover.jpg — SEO
  data/                            sites, artworks, artists, sources, cities, transit, experiences,
                                   routes (готовые маршруты), offline-packs (офлайн-карты городов),
                                   contributions (фид бота)
  scripts/validate-*.mjs           проверки данных, «Впечатлений», маршрутов
  scripts/extract-tiles.mjs        нарезка офлайн-пакетов по data/offline-packs.json (CI)
  scripts/split-artworks.mjs       описания работ отдельным файлом (CI)
  scripts/fetch-map-assets.mjs     шрифты и спрайты карты → assets/ (CI)
  scripts/build-vendor.mjs         vendor/map-bundle.js из lock-файла
  scripts/contrib-*.mjs            логика, шифрование и проход Telegram-бота; тесты contrib-test.mjs
  scripts/e2e/                     браузерные сценарии (вручную, не в CI)
  .github/workflows/pages.yml      сборка и публикация на GitHub Pages
  .github/workflows/contrib-bot.yml бот @artmap_georgia_bot, дежурство 24/7 (long polling)
  .github/ISSUE_TEMPLATE/          форма «Сообщить о проблеме»
  docs/                            отчёты, аудит, планы; RUNBOOK.md — эксплуатация; DESIGN.md — стиль

Локальная проверка
  1. Node.js 22+
  2. npm ci && npm run build:vendor && npm run build:assets
  3. node scripts/validate-data.mjs && node scripts/validate-experiences.mjs && node scripts/validate-routes.mjs
  4. node scripts/contrib-test.mjs
  5. Статический сервер с поддержкой Range (python -m http.server не подходит).
     vendor/, assets/ и tiles/*.pmtiles в git не хранятся; тайлы собирает CI.

Деплой
  push в main -> GitHub Actions -> GitHub Pages. Подробности и откат — docs/RUNBOOK.md.

Возможности
  Карта с категориями и «Впечатлениями», поиск (ru/en/ka), офлайн-карты Тбилиси и 9 городов,
  паспорт путешественника (штампы за «Я здесь»), «Мой день» и готовые маршруты (#route=, #ready=),
  подтверждение точек через Telegram-бота, форма «Сообщить о проблеме», фото из Wikimedia Commons.

Правила работы с данными
  - Источник истины — git; данные меняются проверяемыми скриптами, отчёт — в docs/.
  - Перед правкой: snapshot, проверка дублей ID/координат, validate-*.
  - Фото — только Wikimedia Commons со свободной лицензией; муралы — по разрешению (docs/2026-10-27-amg-photos-legal-sources.md).
  - Секреты (токены, ключи) не хранятся в git и не публикуются; см. docs/RUNBOOK.md.
  - Не перезаписывать untracked-файлы на zimablade без отдельного GO.
