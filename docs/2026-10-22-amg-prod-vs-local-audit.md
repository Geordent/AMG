# AMG — аудит: локальная версия vs прод (работа Bodhi)

- Дата аудита: **2026-10-22**
- Режим: **read-only** (код, данные, workflow, git и GitHub не менялись; создан только этот отчёт)
- Локальная копия: `/mnt/d/MyProjects/AMG`
- Сервер: `zimablade` (Tailscale), пользователь `geordent`
- Прод: <https://geordent.github.io/AMG/>, GitHub `Geordent/AMG`, ветка `main`
- Методы: SSH, git, GitHub API, HTTP/range-проверки, `node scripts/validate-data.mjs`, headless Edge + CDP (desktop/mobile, клики, языки, offline), ручной аудит данных.

> **Обновление:** после этого аудита Bodhi выпустил `b7f511e` (транспортные слои) и задеплоил его (Actions #18). Актуальная дельта — `docs/2026-10-22-amg-bodhi-transit-delta.md`; локальная копия синхронизирована с `b7f511e` 2026-10-22.

---

## 0. Краткий вердикт

**Прод — это не локальная версия, а существенно более новая работа Bodhi.** Live-сайт полностью соответствует GitHub `main` (`cf2e8e8`, 18.10.2026), деплой через GitHub Actions успешен. Локальная копия отстала: она стоит на общей базе `6569ce9` + один docs-only коммит, тогда как прод ушёл на **16 коммитов** вперёд.

**Сильные стороны прода:** карта и офлайн работают, 573 объекта, полная локализация ru/en/ka, 4 темы, «Рядом», «Я здесь», share, обратная связь, счётчик, vendor-сборка без runtime-CDN, SW v8, CI-гарды.

**Главные ограничения:** UGC-контур «Я здесь» фактически не запущен (Telegram-бот не развёрнут), у 366 из 573 объектов нет видимой прицельной ссылки на источник, нет страниц лицензий/конфиденциальности, фотографии грузятся оригиналами до ~15 МБ, а офлайн-режим показывает ложную ошибку карты.

**Оценка: 7/10.** Как публичный MVP/демо — уверенно; как «надёжный публичный продукт» — пока нет, нужны P0/P1-исправления.

---

## 1. Что именно проверено

| Проверка | Результат |
|---|---|
| SSH на `zimablade` | OK, `/home/geordent`, Debian 13 |
| Поиск AMG на сервере | Найден рабочий репозиторий Bodhi + preview/i18n/deploy-артефакты |
| GitHub `main` | `cf2e8e8`, pushed 2026-10-17T21:44Z |
| GitHub Actions | 22 запуска, последний `build-and-deploy` #17 — **success** |
| Live SHA vs `main` | `index.html`, `data/*.json`, `sw.js` — **байт-в-байт совпадают** |
| Live HTTP | 200 для страницы, vendor, data, sw; 206 (range) для PMTiles |
| Валидатор данных | **PASS**: 573 sites / 539 artworks / 188 artists / 16 sources / 48 cities |
| `node --check` inline-модуля | PASS (и local, и prod) |
| Runtime (Edge + CDP) | 0 JS-исключений; карта, чипы, попапы, языки, темы, «Рядом», feedback — работают |
| Offline | пакет скачивается, shell/каталог/карта после offline-reload работают; есть ложный toast ошибки |
| Медиа | выборочно грузятся; один оригинал — **14,7 МБ**; массовый curl к Wikimedia дал 429 (rate limit, не вывод о битых URL) |

---

## 2. Где AMG лежит на `zimablade`

В `/DATA/lab` AMG **нет** — там трейдинговая лаборатория. Проект находится в рабочем каталоге агента Nanoclaw/Bodhi:

| Путь | Что это | Состояние |
|---|---|---|
| `/mnt/SSD_KINGSTON_250/projects/nanoclaw/groups/telegram_main/AMG` | **основной git-репозиторий AMG**, рабочая копия Bodhi | `main` = `cf2e8e8`, tracked-clean, 52 untracked-артефакта |
| `.../telegram_main/amg-preview` | 98 preview-снимков (`amg-batch2-r3.html`, `amg-final-20261015.html`, скриншоты) | не прод, исторические превью |
| `.../telegram_main/amg-i18n` | кэши/скрипты переводов ru/ka, backup-data | не прод |
| `.../telegram_main/amg-deploy` | deploy-key и старый `index.html` | не прод |
| `.../telegram_main/AMG/scripts` | `batch2-*.py`, `amg-contrib-bot.mjs`, `contrib-lib.mjs`, резолверы, live-check | **почти всё untracked** |
| `.../telegram_main/AMG/data/batch2` | сырые артефакты batch2 (37 объектов) | untracked |
| `.../telegram_main/AMG/{assets,sat,tiles}` | локальные шрифты/спрайты, спутниковые скриншоты для проверки координат, тайлы | untracked/локально |
| `.../telegram_main/AMG/docs` | только release-doc; план batch2 — untracked | 1 tracked + 1 untracked |

Важно: **в репозиторий попали финальные данные и `index.html`, но не попала значительная часть пайплайна** (batch2-скрипты, аудиты, sat-проверки, preview). Если сервер потеряется, воспроизводимость этих 49 объектов и методы проверки координат будут утрачены.

---

## 3. Git/GitHub: локальная копия отстала и разошлась

| Параметр | Локально `/mnt/d/MyProjects/AMG` | Прод / GitHub `main` |
|---|---|---|
| HEAD | `039929e` (2026-10-09) | `cf2e8e8` (2026-10-18) |
| Общая база | `6569ce9` | `6569ce9` |
| Коммитов после базы | **1** (только docs) | **16** |
| `origin/main` в локальном git | устаревший `6569ce9` | фактический `cf2e8e8` |
| `git status` | `main...origin/main [ahead 1]` (вводит в заблуждение) | tracked-clean |
| Данные | 524 sites / 531 artworks | 573 / 539 |
| Docs | 142 файла, ~22 МБ | 1 файл (release note) |
| `index.html` | 1 398 строк / 101 837 Б | 2 354 строки / 179 238 Б |
| `sw.js` | cache v2 | cache v8 |
| Runtime-зависимости | `esm.sh` + unpkg CSS | vendor `map-bundle.js` + CSS |
| CI | старый workflow | + `npm ci`, `build:vendor`, guard от `esm.sh` |

**Ключевой вывод:** локальный коммит `039929e` содержит **только документацию**; все локальные 524 site / 531 artwork **полностью входят** в прод (прод — строгий superset). Локальные 142 docs в GitHub не попали. Локальный `index.html` **нельзя деплоить как есть** — он не умеет place-объекты (`topic`), не имеет ru/ka-локализации и снова потянет `esm.sh`.

Перед любой работой: `git fetch origin`, затем rebase/merge docs-коммита на `cf2e8e8`; не push старого `index.html`.

---

## 4. Что сделал Bodhi (16 коммитов после общей базы)

| Период | Работа |
|---|---|
| 09–11.10 | ru+ka локализация данных, политика «только прицельные ссылки», 5 Wikipedia-ссылок (`1a1ab9a`) |
| 15.10 | «Я здесь» (adaptive GPS), «Рядом», share/deep-link, фронт приёма вкладов (`95c37cc`); полное i18n-покрытие оболочки; 25 описаний работ; 4 фирменные темы; фикс районов у 9 объектов |
| 16.10 | batch2: 37 «необычных мест/наследия» + 8 объектов Street Art Cities (`0850db7`) |
| 17.10 | vendor-сборка maplibre/pmtiles/basemaps вместо `esm.sh` (`9cea4c5`); feedback + счётчик + устойчивость + SW v6/v7; новый объект Махинджаури; place-страницы Google/Яндекс + уточнение 6 объектов (`cf2e8e8`) |
| 18.10 | финальный деплой `cf2e8e8` |

Итог по данным: **+49 sites, +8 artworks, +1 artist, +8 cities**; все 524 локальных site и 531 artwork сохранены.

---

## 5. Сравнение local vs prod по функциям

| Функция | Local `039929e` | Prod `cf2e8e8` | Комментарий |
|---|---|---|---|
| Карта MapLibre + PMTiles | да | да | обе версии |
| Кластеризация, singleton, попапы, detail | да | да | prod доработан |
| 4 темы карты | базово | фирменные палитры | prod: «Графит/Бумага/Ночь/Светлая» |
| Онлайн-детализация вне Тбилиси | OpenFreeMap | OpenFreeMap | сохранено |
| Локализация данных | только en | **en/ru/ka, 100%** | prod |
| Локализация оболочки | частично | полная (109 узлов LB) | prod |
| Офлайн-пакеты + IndexedDB | да | да, SW v8 | prod |
| «Рядом» | нет | да | prod |
| «Я здесь» + deep-link | нет | да (клиент + Telegram) | **бот не развёрнут** |
| Share | частично | да | prod |
| Приём вкладов | нет | фронт + пустой feed | backend отсутствует |
| Обратная связь | нет | GitHub issue | prod |
| Счётчик посещений | нет | abacus (внешний) | prod |
| Vendor-сборка библиотек | нет (`esm.sh`) | да | prod |
| Устойчивость (error/unhandled/offline) | нет | да | prod |
| Place-объекты (не только искусство) | нет | 41 объект (25 unusual + 16 heritage) | prod |
| Фото/отзывы Google/Яндекс | нет | ссылки у 7 site / 11 link | prod |
| Документация в repo | 142 docs | 1 release note | локальные docs не запушены |
| Privacy/license pages | нет | нет | **не сделано** |
| Список/поиск/фильтры city/artist/status | нет | нет | только 8 категорий + «Рядом» |

---

## 6. Прод в цифрах

| Показатель | Значение |
|---|---:|
| Sites | **573** |
| Artworks | **539** |
| Artists | **188** |
| Sources | **16** |
| Cities | **48** |
| Sites без artwork (place-only) | **41** (25 unusual + 16 heritage) |
| Artworks `uncertain` | **306 / 539 (56,8%)** |
| Artworks без года | **347 / 539 (64,4%)** |
| Координаты `approximate` | **37** site (6,5%) |
| Sites с media | **43** |
| Artworks с media | **8** |
| Media items | **51** |
| Sites с видимой прицельной ссылкой на источник | **207 / 573** |
| Sites без видимой ссылки и без media | **350 / 573** |
| Source refs всего / видимых | **2 552 / 379** |
| Из них GeoAIR (map) refs | **1 047 — все скрыты политикой** |
| Street Art Cities refs | 1 117, из них 352 с прицельным URL |
| Wikipedia refs | 38, из них 27 с прицельным URL |

Типы artwork: mural 258, mosaic 250, street_art 8, installation 7, monument 5, architectural_art 5, other 3, artifact 2, sculpture 1.

---

## 7. Runtime-проверки прода (headless Edge + CDP)

| Сценарий | Результат |
|---|---|
| Загрузка desktop/mobile | 0 JS-исключений, 0 HTTP-ошибок |
| Карта | canvas отрисован, PMTiles range 206, подписи/маркеры видны |
| Счётчик | `573` в «Все»; 8 чипов; счётчик посещений показал 28 |
| Карточка/детали | detail открывается, контент и media рендерятся |
| Языки ru → en → ka → ru | заголовки, чипы, detail, подписи — перерисовываются |
| «Рядом» | geolocation override: 33 объекта в радиусе 1 км |
| «Я здесь» | deep-link `t.me/amg_map_bot?...` сформирован; UI ставит «confirmed» |
| Обратная связь | модалка открывается, GitHub issue URL формируется |
| Тёмная тема | рендерится, скриншот снят |
| Офлайн-пакет | «Вся Грузия» 6,8 МБ скачалась, IDB записана |
| Offline reload | shell, 8 чипов, каталог и карта работают; **но toast «Ошибка карты, Failed to fetch»** |
| SW | `amg-shell-v8`, controller активен |

---

## 8. Найденные проблемы и риски

### P0 — блокеры публичного запуска/доверия

| # | Проблема | Доказательство | Что делать |
|---|---|---|---|
| 1 | **UGC «Я здесь» не работает end-to-end** | `index.html:2015` — `AMG_BOT_USERNAME = 'amg_map_bot'` с комментарием «плейсхолдер до выбора хостинга»; `data/contributions.json` пуст (`{"version":1,"sites":{}}`); `scripts/amg-contrib-bot.mjs` — untracked, в шапке «Никуда не задеплоен»; на сервере нет процесса AMG-бота (только `nanoclaw.service`) | Либо развернуть бота + публиковать feed, либо скрыть/отключить «Я здесь» до запуска. Сейчас UI обещает подтверждение, которого нет |
| 2 | **Провенанс скрыт у большинства объектов** | По логике `sourceLinks()`/`isMapUrl()`: 207/573 с видимой ссылкой; 350 без ссылки и без фото; 1 047 GeoAIR refs и 141 Madloba скрыты, т.к. в реестре только generic/map URL | Добавить per-object URL в refs или показывать источник как текст/ссылку на карту-каталог; проверить лицензии/атрибуцию |
| 3 | **Нет страниц лицензий и конфиденциальности** | `privacy.html`, `license.html`, `about.html` → 404; в `index.html` нет ссылок на них | Добавить страницы и ссылки в меню/футер; указать лицензию данных, OSM/Protomaps/OpenFreeMap, Wikimedia, политику cookie/счётчика |
| 4 | **Фото грузятся оригиналами до ~15 МБ** | `direct_url` = Wikimedia original; пример `Abastumani_resort.jpg` — **14 712 038 Б**, 5472×3648; media doc уже рекомендовал thumb | Генерировать/использовать thumb-URL (например, 800–1200 px), добавить width/height; оставить original только по клику |

### P1 — серьёзные, но не блокирующие

| # | Проблема | Доказательство | Что делать |
|---|---|---|---|
| 5 | **Офлайн показывает ложную ошибку карты** | при offline reload с скачанным Georgia-паком карта рисуется, но toast: `Ошибка карты,Failed to fetch`; `buildStyle()` добавляет OpenFreeMap source даже при `navigator.onLine === false` (проверяется только `state.offlineOnly`) | Не добавлять online source при offline; игнорировать abort/fetch-ошибки online-слоёв; показывать «скачайте пакет» вместо generic error |
| 6 | **`offlineOnly` не сохраняется между reload** | после offline reload checkbox снова false → online source снова добавляется | Persist в localStorage или авто-определять offline |
| 7 | **Качество данных** | 306/539 `uncertain` (242 из 250 мозаик), 347 без года, 37 approximate; дубль `site-0543` / `site-0584` (Dikhashko geyser, ~100 м); 4 группы точных одинаковых координат (11 site, часть — разные работы одного здания) | Провести аудит статусов/годов/координат; устранить дубль; пометить shared-building кластеры |
| 8 | **CI не проверяет данные и не делает smoke-тесты** | workflow: checkout → vendor → tiles → deploy; нет `validate-data.mjs`, нет `contrib-test`, нет Playwright | Добавить `node scripts/validate-data.mjs`, `node scripts/contrib-test.mjs`, браузерный smoke (карта/язык/offline) |
| 9 | **Пайплайн и аудиты не в git** | 52 untracked entry: `scripts/batch2-*.py`, `data/batch2/*`, `data/.district-*`, `sat/`, `assets/`, `docs/batch2-integration-plan...` | Закоммитить/архивировать пайплайн и отчёты; иначе данные не воспроизводимы |
| 10 | **Устаревшая документация** | `README.txt` всё ещё про «загрузите index.html и sw.js», версия 2; `AGENTS.md` про «GitHub не трогать до MVP»; release note говорит 524/531, а в проде 573/539 | Обновить README/AGENTS/release note; добавить текущий audit |
| 11 | **Неполный MVP по концепции** | нет списка, поиска, фильтров по городу/художнику/статусу; нет privacy/license; счётчик считает визиты, а не подтверждения; Telegram-заявки не работают | Либо зафиксировать сокращение MVP, либо доделать |
| 12 | **Кэш/обновления** | SW cache-first для data/assets, версия кэша ручная (`v8`); при обновлении данных без смены `CACHE` клиенты могут видеть старое | Автоматически менять cache-key/использовать stale-while-revalidate для data; документировать правило bump |
| 13 | **Плавающая сборка тайлов** | workflow ищет «последний planet build» по дате; live-тайлы уже отличаются от локальных (16 338 131 / 7 166 235 vs 16 329 023 / 7 154 505) | Пиновать дату build или архивировать PMTiles для воспроизводимости |
| 14 | **Внешние зависимости** | `abacus.jasoncameron.dev` (счётчик), `protomaps.github.io` glyphs/sprites, OpenFreeMap online | Оставить fallback/скрытие при сбое; рассмотреть локальные glyphs/sprites (assets уже лежат на сервере, но не деплоятся) |

### P2 — косметика/улучшения

| # | Проблема | Доказательство |
|---|---|---|
| 15 | Пропущены пробелы в офлайн-UI | `Файлдоступен`, `Скачано1.3 МБиз6.8 МБ`, `браузере6.0 МБиз1024` — из-за `pick()` с `trim()` и конкатенации |
| 16 | Размер пака не показывается до скачивания | `probe()` возвращает только «доступен»; README обещает «покажется реальный размер» |
| 17 | Нет `manifest.json`/PWA-иконок | live `manifest.json` → 404; сайт офлайновый, но не устанавливаемый |
| 18 | Нет OG/meta description | в `<head>` только title/viewport/favicon |
| 19 | «Я здесь» ставит галочку до ответа бота | `hereBtnSet('confirmed')` вызывается до фактического подтверждения; текст «Отправлено…» честнее, но визуально это уже confirmed |
| 20 | Нет Waze | route providers: Yandex → Google → Apple → OSM; концепция упоминала Waze |
| 21 | Медиа-ссылки не проверяются регулярно | массовый curl к Wikimedia дал 429; нужен health-check с задержками/официальным API |
| 22 | Один файл на 179 КБ / 2 354 строки | высокая стоимость поддержки; тесты живут вне repo |

---

## 9. Оценка проекта в проде

| Критерий | Балл | Обоснование |
|---|---:|---|
| Функциональность | **9/10** | карта, 573 объекта, 3 языка, offline, nearby, here, share, feedback — всё живое |
| UX/дизайн | **8,5/10** | аккуратный mobile/desktop, темы, чипы, detail; минусы — offline-тексты и отсутствие поиска/списка |
| Достоверность данных | **5,5/10** | 57% uncertain, 64% без года, 37 approximate, дубль, скрытый провенанс |
| Офлайн | **7/10** | пакеты/IDB/SW работают; ложный toast, размер пака, сброс offlineOnly |
| Надёжность/CI | **7/10** | деплой и vendor-гарды хорошие; нет data/smoke-тестов, плавающие тайлы, ручной cache bump |
| Право/доверие | **5/10** | нет privacy/license, лицензии источников часто пустые, атрибуция скрыта, оригиналы фото |
| Сопровождаемость | **6/10** | single-file, untracked-пайплайн, устаревшие README/AGENTS |
| **Итог** | **7/10** | **MVP/демо — да; публичный продукт — после P0/P1** |

Формулировка для решения: **«Прод функционально сильный и заметно лучше локальной версии; запускать как публичный сервис рано — сначала закрыть UGC-бот, провенанс/лицензии и вес фотографий, затем починить offline-ошибку и добавить CI-проверки.»**

---

## 10. Рекомендации по приоритету

| Приоритет | Действие |
|---|---|
| **P0** | Развернуть `amg-contrib-bot.mjs` (токен, хостинг, автокоммит `contributions.json`) **или** скрыть «Я здесь» и убрать обещание подтверждения. |
| **P0** | Добавить `privacy.html`/`license.html`; раскрыть лицензию данных, OSM/Protomaps/OpenFreeMap, Wikimedia, счётчик; ссылки в UI. |
| **P0** | Показать провенанс: per-object URL в `sources[]` или текстовая ссылка на GeoAIR/каталог; проверить лицензии 16 источников. |
| **P0** | Перейти на thumb-URL Wikimedia + width/height; не грузить 15 МБ в превью. |
| **P1** | Offline: не добавлять online source при offline; persist `offlineOnly`; убрать ложный toast; показывать размер пака; починить пробелы. |
| **P1** | Аудит данных: `uncertain`, годы, approximate, дубль Dikhashko, кластеры одинаковых координат. |
| **P1** | CI: `validate-data`, `contrib-test`, Playwright smoke; pinned/archived tiles; health-check ссылок. |
| **P1** | Закоммитить/архивировать batch2-пайплайн, sat-проверки, аудиты; обновить README/AGENTS/release note. |
| **P2** | Добавить список/поиск/фильтры city/artist/status; manifest/PWA; OG/meta; Waze; кэш-стратегию data. |

---

## 11. Ограничения аудита

- Runtime-проверки выполнены в headless Edge (CDP), не на реальном iOS/Android; геолокация эмулировалась.
- Полный health-check 51 media URL не выполнен: Wikimedia отдаёт 429 при массовых запросах. Выборочно изображения в браузере загрузились; один оригинал — 14,7 МБ.
- Качество машинного перевода оценивалось выборочно; покрытие ru/ka — 100%, но стиль местами машинный (например, «Логотип компании Faith47 Solar Logos»).
- Telegram-бот проверен по коду/процессам/фиду, но не по реальному прохождению подтверждения (нет доступа к токену/боту).
- GitHub Pages API `build_type` без токена недоступен; факт Actions-деплоя подтверждён успешным run #17 и совпадением live-файлов с `cf2e8e8`.

---

## Приложение A. Почему провенанс почти не виден

Логика `index.html` (`isGenericUrl`, `isMapUrl`, `concreteSourceUrl`, `sourceLinks`) намеренно скрывает:
- корневые URL (`https://streetartcities.com/`, `https://madloba.info/` и т.п.);
- Google My Maps (`maps/d/viewer`);
- OpenStreetMap/Mapcarta/Google Maps.

В `sources.json` у большинства провайдеров URL — корневой или карта. Per-object URL есть только у части Street Art Cities refs (352) и Wikipedia (27). Поэтому 1 047 GeoAIR refs, 141 Madloba, 42 Tbilisi Mural Fest map, 39 Red Fedora и др. не дают видимой ссылки. Это не баг рендера, а **политика + неполные данные**: чтобы провенанс появился, нужны прицельные URL в refs или отдельный безопасный показ «источник-каталог».

## Приложение B. Точные размеры live-ассетов

| Asset | Размер |
|---|---:|
| `vendor/map-bundle.js` | 1 103 824 Б |
| `vendor/maplibre-gl.css` | 70 024 Б |
| `data/artworks.json` | 1 127 405 Б |
| `data/sites.geojson` | 508 764 Б |
| `tiles/tbilisi.pmtiles` | 16 338 131 Б |
| `tiles/georgia.pmtiles` | 7 166 235 Б |

