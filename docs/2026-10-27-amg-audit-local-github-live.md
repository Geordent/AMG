# AMG — аудит: локально / GitHub / live (2026-10-27)

Режим: read-only. Код, данные, workflows и GitHub не менялись. Единственное изменение — этот отчёт.

## Кратко

- Локальный `HEAD` = `origin/main` = живой сайт: коммит `5134e91` («offline cities, ready routes, photo sources report»), деплой Pages run #44 — success.
- **Не задеплоено:** незакоммиченные правки `index.html` (кнопка «Посмотреть на улице», запоминание языка, заставка «Рисуем Грузию…») и `docs/DESIGN.md`. На GitHub и live их нет.
- **Не запущено:** Telegram-бот `contrib-bot` по расписанию. За 2 ч 10 мин после включения — **0 запусков `schedule`**, только 3 ручных `workflow_dispatch` (последний 12:34 UTC). При этом `AMG_UGC_ENABLED = true` уже на live, а `data/contributions.json` пуст. Новые отметки «Я здесь» автоматически не обрабатываются.
- 7 файлов в `git status` — только смена LF→CRLF, содержимое не изменилось. Коммитить их как есть нельзя: будет шумный diff на ~38 тыс. строк.
- Открытых PR/Issues нет. Все удалённые ветки, кроме `contrib-state`, полностью влиты в `main`; локальная `backup/local-before-sync-2026-10-22` — старый снапшот, не запушена.
- Валидаторы и тесты PASS. Live отдаёт все страницы, данные, шрифты, спрайты и 11 PMTiles (Range → 206).

## 1. Сверка версий

| Что | Состояние |
|---|---|
| `origin/main` | `5134e91`, 2026-10-27 13:27 UTC |
| Локальный `main` | `5134e91`, ahead/behind 0 |
| Live `index.html` | sha256 = `HEAD:index.html` (побайтно, после нормализации EOL) |
| Live `sw.js` | = `HEAD:sw.js`, отличается только версия кэша, проставленная CI (`amg-shell-4f8fe08ea4`) |
| Live `data/*` | совпадает с локальными и `HEAD` (artworks, sites, experiences, contributions, routes, offline-packs) |
| GitHub Pages | run #44 по `5134e91` — success |
| Валидаторы | `validate-data` PASS (573/539/188/16/48), `validate-experiences` PASS (60), `validate-routes` PASS (4), `contrib-test` 15/15 |
| Live endpoints | `index.html`, `sw.js`, `manifest`, `privacy`, `license`, `robots`, `sitemap`, `data/*`, `vendor/map-bundle.js`, `assets/sprites/light.json` → 200 |
| Live tiles | `georgia` + `tbilisi`, `batumi`, `kutaisi`, `rustavi`, `zugdidi`, `gori`, `poti`, `telavi`, `borjomi`, `sagarejo` → 206 на `Range: bytes=0-1` |
| PR/Issues | 0 открытых |

Вывод: GitHub, live и локальный коммит синхронны. Расхождение — только рабочее дерево.

## 2. Что не задеплоено

Незакоммиченные содержательные правки (не в GitHub, не на сайте):

| Файл | Что |
|---|---|
| `index.html` | «Посмотреть на улице» — ссылка на Google Street View в попапе, «Подробно» и карточке «Впечатлений» (`streetViewBtn`, `streetViewBtnFor`, `LB.streetView`) |
| `index.html` | запоминание языка: `localStorage['amg-lang']`, язык браузера как значение по умолчанию, `window.__amgLang`, синхронизация с `#lang` |
| `index.html` | заставка «Рисуем Тбилиси…» → «Рисуем Грузию…» (ru/en/ka) |
| `docs/DESIGN.md` | соответствующая правка описания заставки |

Отчёта/тест-плана по этим правкам в `docs/` нет. Нужен GO на проверку (smoke desktop/mobile, языки, ссылка Street View), commit и деплой.

## 3. CRLF-шум (не контент)

`git status` показывает 9 изменённых файлов, но реальных изменений только два (см. п. 2).
Остальные 7 — перевод строк LF→CRLF, содержимое идентично `HEAD`:

`data/artworks.json`, `data/sites.geojson`, `data/experiences.geojson`, `data/contributions.json`,
`icons/icon.svg`, `manifest.webmanifest`, `scripts/validate-experiences.mjs`.

`git diff --ignore-space-at-eol --stat` оставляет только `index.html` и `docs/DESIGN.md`.
Если сделать `git add -A`, в коммит попадёт ~38 тыс. строк шума. Рекомендация: вернуть эти файлы
(`git restore`) или добавить `.gitattributes` с `* text=auto eol=lf` и отдельно нормализовать.

## 4. Что не запущено

### 4.1 Telegram-бот по расписанию — главная проблема

| Проверка | Результат |
|---|---|
| Workflow `contrib-bot` | state `active` |
| Запуски `event=schedule` | **0** |
| Все запуски | 3, только `workflow_dispatch`: 11:35, 11:51, 12:34 UTC — все success |
| Сейчас | 13:44 UTC (прошло ~2 ч 10 мин после включения) |
| `contrib-state` | последний коммит 12:34 UTC (от ручного запуска) |
| `data/contributions.json` на live | `{"version":2,"updated":"2026-10-27T11:51:34.180Z","sites":{}}` |
| UGC на live | `AMG_UGC_ENABLED = true`, `AMG_STAMPS_ENABLED = true` |

То есть сайт уже предлагает «Подтвердить в Telegram», но автоматического приёма ответов нет:
сообщения будут ждать, пока workflow не запустят вручную. `AMG_BOT_TOKEN`/`AMG_STATE_KEY`, судя по
успешным ручным запускам, заданы; дело именно в триггере `schedule`.

Вероятные причины: задержка/сбой регистрации расписания GitHub, политика организации, либо
расписание не перерегистрировалось после переноса репозитория. Проверять по GO:
Actions → `contrib-bot` → включён ли scheduled trigger; при необходимости пересохранить workflow
(коммит, меняющий файл) или поставить внешний cron на `workflow_dispatch`.

Пока не исправлено — либо держать UGC включённым и запускать бота вручную, либо временно выключить
`AMG_UGC_ENABLED`, чтобы UI не обещал обработку.

### 4.2 Локальная среда

- `tiles/` локально содержит только `georgia.pmtiles` и `tbilisi.pmtiles`; 9 городских паков есть
  только на live/в CI. Для локальной проверки этих паков нужен запуск `extract-tiles`.
- `vendor/` и `assets/` локально есть; в git их нет — так и задумано.

## 5. Ветки

| Ветка | Состояние |
|---|---|
| `main` / `origin/main` | `5134e91`, синхронны |
| `wip/p0-2026-10-23` | полностью влита в `main` (ahead 0 / behind 23), можно удалить |
| `backup/local-before-sync-2026-10-22` | локальная, +1 коммит к `main`, behind 46; снапшот 22.10 с docs/скриншотами, не запушена |
| `origin/content/2026-10-15-descriptions` | ahead 0 — влита/устарела |
| `origin/fix/2026-10-15-i18n-coverage` | ahead 0 — влита/устарела |
| `origin/release/2026-10-15-ya-zdes-etap1` | ahead 0 — влита/устарела |
| `origin/contrib-state` | отдельная ветка состояния бота, 2 коммита, последний 12:34 UTC |

## 6. Документация расходится с кодом

| Место | Написано | Фактически |
|---|---|---|
| `README.txt` (UGC) | «Я здесь» отключено, `AMG_UGC_ENABLED = false` | `true`, бот включён, live показывает UGC |
| `RUNBOOK.md` §6 | `AMG_UGC_ENABLED = false` | `true` |
| `docs/2026-10-27-amg-crowd-concept.md` | «работает, выключено флагом `false`» | `true` |
| `docs/2026-10-27-amg-recommendations-and-plan.md` §P4.3 | UGC выключен | `true` |
| `README.txt` | нет `routes.json`, `offline-packs.json`, Street View | функции уже в коде/live |
| `index.html` meta/og/twitter | «59 впечатлений» | в данных 60 |
| `license.html` | нет упоминания Google Street View | ссылка появится после деплоя п. 2 (это ссылка, не встраивание) |

`privacy.html`, наоборот, уже описывает Telegram-бота, хеш ID и шифрованное хранение — актуально.

## 7. Предлагаемые действия (каждое — по отдельному GO)

1. **Разобраться с расписанием бота.** Проверить scheduled trigger в Actions; при необходимости
   пересохранить workflow или добавить внешний cron. До фикса — ручной запуск или UGC off.
2. **Решить судьбу незакоммиченных правок:** прогнать smoke, обновить docs/license при необходимости,
   затем commit + push + проверка live.
3. **Убрать CRLF-шум:** `git restore` для 7 файлов либо `.gitattributes` + отдельная нормализация.
4. **Актуализировать README/RUNBOOK/crowd-concept** (UGC true, routes/offline/Street View).
5. **Поправить meta «59 впечатлений»** или убрать точное число.
6. **Гигиена веток:** удалить влитую `wip/p0`, решить судьбу локального backup-снапшота.

## 8. Что проверено и чем

- `git status`, `git log`, `git diff --ignore-space-at-eol`, сравнение sha256 рабочего дерева/`HEAD`/live.
- GitHub REST API без токена: repo, commits, branches, workflow runs, workflows, labels, PR/issues.
- Live: HTTP-коды страниц/данных/ассетов, `Range`-запросы к 11 PMTiles, сравнение `index.html` и `sw.js`.
- `node scripts/validate-data.mjs`, `node scripts/validate-experiences.mjs`,
  `node scripts/validate-routes.mjs`, `node scripts/contrib-test.mjs`, `node scripts/extract-tiles.mjs --check tiles`.
