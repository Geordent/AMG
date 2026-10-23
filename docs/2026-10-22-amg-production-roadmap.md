# AMG — план доведения до production-уровня

- Дата: **2026-10-22**
- Статус: **план; часть P0/P1 уже реализована локально, без commit/push**
- Основание: аудит `docs/2026-10-22-amg-prod-vs-local-audit.md`
- Главный принцип: **лёгкость и независимость** — статика, бесплатные ресурсы, минимум хостов, никаких тяжёлых runtime-зависимостей и нестабильных внешних API в критическом пути.

---

## Прогресс на 2026-10-22

| Пункт | Статус |
|---|---|
| Синхронизация local с `origin/main` (`b7f511e`) | **готово** (backup-ветка + tar docs) |
| Privacy/license pages + ссылки + копирование в CI | **готово** (draft, нужна юридическая проверка лицензии каталога) |
| UGC «Я здесь» не обманывает | **готово**: `AMG_UGC_ENABLED=false` |
| Провенанс: map/catalog-источники видны текстом | **готово** |
| Offline: ложная ошибка, persist, размеры, пробелы | **готово**, проверено offline-reload |
| Wikimedia thumbnails 960px + fallback | **готово** (runtime, без изменения data) |
| CI: validate + required pages | **готово** |
| README/AGENTS/RUNBOOK | **готово** |
| Thumbnails в data (`thumb_url/width/height`) | P0, осталось |
| Аудит данных (uncertain/годы/дубли/источники) | P1, осталось |
| UGC bot / feed | P0, осталось (сейчас feature выключен) |
| CI smoke / pin PMTiles / PWA/SEO | P1/P2, осталось |
| Commit/push/deploy наших изменений | **не выполнялось**, нужен отдельный GO |

Подробности: `docs/2026-10-22-amg-p0-implementation.md`; «Впечатления» — `docs/2026-10-23-amg-experiences-content-audit.md`.

Локально P0/P1 и «Впечатления» (59 объектов) уже интегрированы в `main` (`5d4614c`) и протестированы. Push/deploy не выполнены: у пользователя `geordent` нет доступа к GitHub deploy-key, а локальный HTTPS требует credentials.

---

## 1. Что считаем «production-уровнем»

Проект готов к публичному запуску, когда одновременно выполнено:

1. Читатель без регистрации открывает карту, видит актуальный каталог, карточку, источники, лицензии и офлайн-пакеты.
2. Критический путь (`index.html` + `data/*` + PMTiles + vendor) **не зависит** от платного хостинга, БД, CDN или внешнего API.
3. UGC-контур («Я здесь») либо реально работает end-to-end, либо честно отключён.
4. Данные валидируются автоматически; сомнительные статусы/координаты не выдаются за точные.
5. Есть privacy/license-страницы и понятная атрибуция данных/фото.
6. Деплой воспроизводим, откатываем, проверяется smoke-тестами.
7. Локальная копия, GitHub `main` и рабочая копия на `zimablade` синхронизированы по коду/данным.

---

## Протокол безопасной работы с живыми данными (обязателен)

Бодхи может менять данные/код прямо сейчас, поэтому `zimablade` считаем **живым источником**, а не архивом.

**Статус повторной проверки 2026-10-22:** в git-репозитории AMG на сервере HEAD = `cf2e8e8`, tracked-diff пуст, live-хеши совпадают с GitHub. При этом на `zimablade` активен контейнер nanoclaw и есть свежие sandbox-файлы (`sandbox_in/*.pmtiles`) — возможны изменения «в полёте», ещё не попавшие в git. Поэтому фазу синхронизации **не начинать** до явного freeze/GO.

Правила:

1. **Никаких записей на `zimablade`** до подтверждения, что Бодхи закончил: не делать `git fetch/reset/clean/checkout`, не перезаписывать `data/`, `scripts/`, `docs/`, `assets/`, не трогать контейнеры.
2. **Сначала snapshot и хеши.** На сервере и локально зафиксировать:
   - `git rev-parse HEAD`, `git status --porcelain`, `git diff --stat`;
   - `sha256sum` для `index.html`, `sw.js`, `data/*.json`, `data/sites.geojson`;
   - список untracked с mtime/размером.
   Сохранить вывод в `docs/audits/2026-10-22-live-snapshot.txt` (или отдельный файл с датой/временем).
3. **Работать только с копиями.** Для анализа — `git clone`/`git worktree`/`cp` в `/tmp/opencode/...`; оригиналы не трогать.
4. **Никогда на сервере:** `git reset --hard`, `git clean -fd`, `git checkout -- .`, force-push, `rm -rf` по `data/`/`docs/`/`scripts/`. На локальной машине reset допустим только после backup и только для синхронизации с `origin/main`.
5. **Сверять три источника:** local ↔ `origin/main` ↔ `zimablade`. Если хеши/счётчики расходятся — остановиться и обновить аудит, не «подгонять» данные.
6. **Backup перед sync:** `git bundle create ... --all` + tar только курируемых `data/`, `docs/`, `scripts/` (без `node_modules/`, `tiles/`, `sat/`, preview); проверить восстановление.
7. **Freeze-window:** дождаться, пока агент не пишет N минут (например, 15–30) и в `git status`/mtime нет новых изменений; только затем синхронизировать.
8. **После любого импорта данных:** пересчитать counts, проверить дубли ID/координат, прогнать `validate-data`, сравнить наборы ID до/после, обновить аудит.
9. **Секреты не логировать.** Токены/ключи не попадают в отчёты, скриншоты, git и чат; при обнаружении — ротация.
10. **Rollback:** перед изменениями зафиксировать точку возврата (коммит/тег/архив), после — проверить, что откат возможен.

---

## 2. Целевая архитектура (лёгкая)

```text
GitHub (код + data + docs)
        │  push в main
        ▼
GitHub Actions (бесплатно)
  validate → smoke → build vendor → pinned PMTiles → artifact
        │
        ▼
GitHub Pages (статика, бесплатно)
  index.html + sw.js + data/ + vendor/ + assets/ + tiles/
        │
        ├─ offline: IndexedDB (PMTiles, скачанные пакеты)
        ├─ runtime: только same-origin ассеты; online-детализация — опционально
        └─ UGC: Telegram-бот на zimablade (long polling, без входящих портов)
```

Что **не** добавляем:

- свою БД/сервер для чтения каталога;
- runtime-запросы к OSM/Wikidata/Google;
- платные CDN, мониторинг, аналитику, хостинг;
- хранение оригиналов фото и «тяжёлых» данных в репозитории;
- CMS, аккаунты, комментарии, рейтинги.

Что допускаем как **опциональное**:

- OpenFreeMap online-детализация (при отсутствии сети/сервиса карта работает на локальных PMTiles);
- внешний счётчик посещений — только progressive enhancement; при сбое просто скрывается;
- GitHub Issues для обратной связи (уже есть);
- Telegram-бот на своём сервере — только для UGC, не для чтения.

---

## 3. Приоритеты и общий порядок

| Фаза | Срок (одному человеку) | Цель |
|---|---:|---|
| **0. Синхронизация и фиксация** | 0,5 дня | локальная копия = прод; backup; решения по UGC/лицензии |
| **1. P0: доверие и запуск** | 3–4 дня | UGC не обманывает; privacy/license; провенанс; thumbnails |
| **2. P1: надёжность** | 3–4 дня | offline без ложных ошибок; CI; качество данных; reproducibility |
| **3. P1/P2: полировка** | 2–3 дня | PWA/SEO, runbook, мониторинг, release candidate |
| **Release gate** | 0,5 дня | приёмка по чек-листу, тег, откат |

Итого ориентир: **2–3 недели** без спешки, с сохранением read-only до явного GO.

---

## 4. Фаза 0 — синхронизация локальной версии

> **Условие старта:** Бодхи закончил изменения, есть явный freeze/GO, снят snapshot и сделаны backup. До этого фаза 0 не выполняется. Все команды ниже — **только для локальной машины**, не для `zimablade`.

### 4.1. Решения, которые нужно принять до git-операций

| Вопрос | Рекомендация |
|---|---|
| Куда деть 142 локальных docs (22 МБ)? | Backup-ветка + вынести тяжёлые PNG наружу; в repo оставить только Markdown/CSV, которые нужны как история |
| Как синхронизировать? | Код/данные — **точно** `origin/main`; docs — отдельно, чтобы не раздувать repo |
| Что делать с untracked на `zimablade`? | Отобрать `scripts/batch2-*`, `contrib-*`, план batch2; `sat/`, `tiles/`, `node_modules/`, preview — не коммитить |

### 4.2. Безопасный порядок (выполнять только после GO)

```bash
cd /mnt/d/MyProjects/AMG

# 0) страховка
git status
git branch backup/local-before-sync-2026-10-22
git fetch origin

# 1) убедиться, что локально отличаются только docs
git log --oneline --left-right HEAD...origin/main
git diff --stat HEAD origin/main

# 2) вариант A (рекомендуемый): точное соответствие проду
git reset --hard origin/main

# 3) вернуть только нужные docs отдельным коммитом/архивом
#    (например, docs/archive/2026-10-08/*.md, без PNG)
```

Вариант B (если нужно сохранить историю docs в git):

```bash
git rebase origin/main
# если конфликт — git rebase --abort и вернуться к варианту A
```

После синхронизации:

```bash
git rev-parse HEAD          # должен совпасть с origin/main
git status                  # clean (кроме намеренно возвращённых docs)
node scripts/validate-data.mjs
```

### 4.3. Синхронизация с `zimablade`

- Проверить, что на сервере `main` = `origin/main` и tracked-clean.
- Забрать с сервера только **курируемые** артефакты:
  - `docs/batch2-integration-plan-2026-10-16.md`;
  - `scripts/batch2-*.py`, `scripts/contrib-*.mjs`, `scripts/amg-contrib-bot.mjs`;
  - небольшие `data/batch2/*.json` (244 КБ).
- Не забирать: `sat/` (14 МБ), `tiles/` (23 МБ), `node_modules/`, preview HTML, `assets/` — до отдельного решения.
- Добавить в `.gitignore` правила для генератов, чтобы `git status` снова был чистым.

**Definition of Done фазы 0:** локальный `HEAD == origin/main`; данные/код совпадают; docs сохранены в backup; на сервере и локально нет неожиданных tracked-изменений.

---

## 5. Фаза 1 — P0: доверие, лицензии, провенанс, фото

### 5.1. UGC «Я здесь»: не обманывать пользователя

Сейчас UI ставит `confirmed` и ведёт на `t.me/amg_map_bot`, но бот не развёрнут, `contributions.json` пуст.

**Решение A (рекомендуемая, соответствует «своему серверу»):**

1. Развернуть `scripts/amg-contrib-bot.mjs` на `zimablade` как systemd-сервис:
   - long polling Telegram, **без входящих портов**;
   - токен в `/etc/amg/contrib.env` (0600), не в git;
   - state `data/contrib-internal.json` — **не публиковать**, добавить в `.gitignore`;
   - публичный `data/contributions.json` — только агрегаты без uid;
   - commit/push feed через deploy-key с ограничением на репозиторий;
   - `Restart=always`, лог, healthcheck.
2. UI:
   - показывать «подтверждено» **только после** появления записи в feed;
   - до ответа бота — «отправлено на проверку», без зелёной галочки;
   - если бот/сеть недоступны — «сервис подтверждений временно недоступен», без ложного успеха.
3. Добавить публичный счётчик подтверждений (из feed), а не только визиты.

**Решение B (если бот пока не нужен):**

- Скрыть «Я здесь» feature-флагом `AMG_UGC_ENABLED=false`.
- Оставить только внешние маршруты/шаринг.
- Убрать из текста обещание подтверждения.

**Definition of Done:** либо подтверждение реально проходит и отражается в feed, либо кнопки нет; ложного `confirmed` нет.

### 5.2. Провенанс и лицензии

Проблема: видимые прицельные ссылки есть только у 207/573 objects; 1 047 GeoAIR refs скрыты, т.к. в реестре generic/map URL.

Задачи:

1. Расширить `sources.json`:
   - `license`, `license_url`, `terms_url`, `attribution`, `accessed_at`;
   - заполнить для 16 источников (OSM/ODbL, Wikimedia/CC, GeoAIR, Street Art Cities, Madloba и т.д.).
2. Добавить per-object URL в `sources[]` там, где он есть (Street Art Cities, Wikipedia, GeoAIR object pages).
3. Для map-only источников (GeoAIR, My Maps, OSM) показывать **не кликабельную** строку вида `Источник: GeoAIR (карта-каталог)` — это сохраняет провенанс и не нарушает политику «не выдавать карту за object page».
4. Добавить `license.html` и `privacy.html`:
   - лицензия данных/текста AMG;
   - ODbL/OSM, Protomaps, OpenFreeMap, Wikimedia;
   - отсутствие cookie/трекеров; что делает счётчик; геолокация остаётся в браузере;
   - Telegram-бот: какие данные хранятся (хеш uid), какие нет;
   - ссылки в меню/футер.
5. Решить лицензию каталога (юридическая консультация): вероятно, CC BY-SA 4.0 для оригинального контента + отдельное указание ODbL для OSM-производных; не смешивать в одну неясную лицензию.

**Definition of Done:** у каждого объекта в detail есть либо прицельная ссылка, либо явно подписанный источник; license/privacy доступны с сайта; лицензии источников заполнены.

### 5.3. Фото: убрать «тяжёлые» оригиналы

Сейчас `direct_url` — оригинал Wikimedia, например **14,7 МБ** на превью.

Задачи:

1. Добавить в `media[]`: `thumb_url`, `width`, `height`.
2. Скрипт `scripts/media-thumbs.mjs`:
   - получает/генерирует thumbnail 800–1200 px;
   - сохраняет в `assets/media/` (same-origin, ~50–150 КБ на файл);
   - original `url` остаётся ссылкой «открыть оригинал».
3. Рендер: `<img src=thumb_url width height loading=lazy decoding=async>`; fallback на original/«фото недоступно».
4. Проверить 51 media URL через Wikimedia API с rate limit; битые/429 — в отчёт, не в прод.

**Definition of Done:** ни одно превью не грузит оригинал >300 КБ; detail открывается быстро на мобильном; атрибуция автора/лицензии сохранена.

---

## 6. Фаза 2 — P1: офлайн, данные, CI

### 6.1. Офлайн без ложных ошибок

| Задача | Детали |
|---|---|
| Не добавлять online source при offline | В `buildStyle()` условие `!state.offlineOnly && navigator.onLine`; на `online/offline` пересобрать стиль |
| Persist `offlineOnly` | `localStorage`, восстановление при старте |
| Убрать generic toast | Ошибки online-слоёв при offline игнорировать; показывать один понятный статус |
| Размер пака до скачивания | `HEAD`/`Range 0-0` → `Content-Length`; показывать «7,2 МБ» |
| Починить тексты | `Файл доступен`, `Скачано 1,3 МБ из 6,8 МБ`, `Занято 6,0 МБ из 1024 МБ` |
| Локальные glyphs/sprites | Перенести `assets/` (2,6 МБ) в build, заменить `GLYPHS`/`SPRITE` на same-origin — меньше зависимости от `protomaps.github.io` |
| SW version | Генерировать `CACHE` из commit SHA при сборке; data — stale-while-revalidate |

**Definition of Done:** offline-reload со скачанным паком: карта, каталог и языки работают, нет toast «Ошибка карты»; размеры паков видны; offline-пакеты не зависят от protomaps.github.io.

### 6.2. Качество данных

1. `scripts/audit-data.mjs` (CI + локально):
   - дубли ID, дубли координат/имён;
   - orphan refs, пустые sources, пустые media;
   - `uncertain`, отсутствие года, `approximate`;
   - покрытие i18n;
   - source visibility (сколько объектов имеют видимую ссылку);
   - отчёт в `docs/audits/YYYY-MM-DD-data-audit.md` (генерируется, не runtime).
2. Ручной триаж:
   - 306 `uncertain` (особенно 242 мозаики): подтвердить/уточнить по GeoAIR/OSM/Wikimedia; если нельзя — оставить `uncertain`, но UI должен честно писать «статус требует проверки»;
   - 347 без года: заполнить где есть источник; иначе не выдумывать;
   - 37 `approximate`: показывать предупреждение в карточке и при маршруте («координата приблизительная»);
   - дубль `site-0543` / `site-0584` (Dikhashko geyser) — слить/развести, проверить координаты;
   - 4 группы одинаковых координат — проверить, это один дом/фестиваль или ошибка.
3. `scripts/check-links.mjs` — ежемесячно, не блокирует CI: проверка media/source URL с задержкой, отчёт CSV.

**Definition of Done:** нет известных дублей; отчёт аудита создан; UI честно маркирует uncertain/approximate; source coverage заметно выше 207/573 (цель — ≥80% объектов имеют источник или фото).

### 6.3. CI и воспроизводимость

Добавить в `.github/workflows/pages.yml`:

1. `node scripts/validate-data.mjs` — обязательный шаг.
2. `node scripts/audit-data.mjs --fail-on=duplicates,orphans` — обязательный для критичных ошибок.
3. `node scripts/contrib-test.mjs` — тесты логики бота (без токена).
4. Playwright smoke (devDependency, не runtime):
   - страница открывается, 8 чипов, карта/канвас;
   - detail открывается;
   - переключение ru/en/ka;
   - offline-сценарий с замоканным/маленьким пакетом;
   - скриншоты/логи в artifact при падении.
5. Пиновать сборку тайлов:
   - `PROTOMAPS_BUILD=20261015` (или известный-good) в workflow;
   - проверка magic/version/размера/bbox;
   - обновление — отдельный PR раз в месяц, не «последний build каждый день».
6. `scripts/build-site.mjs` — локальная сборка `site/` (vendor, data, assets, tiles) для проверки и переносимости на любой static host.
7. Release-тег и rollback: `prod-YYYY-MM-DD`; откат — revert/предыдущий artifact.

**Definition of Done:** CI краснеет при битых данных/дублях; сборка тайлов предсказуема; сайт можно собрать локально без GitHub.

---

## 7. Фаза 3 — P1/P2: полировка и эксплуатация

| Задача | Приоритет |
|---|---|
| Обновить `README.txt`: актуальная архитектура, локальный запуск, сборка, деплой, offline, бот | P1 |
| Обновить `AGENTS.md`: убрать «GitHub не трогать до MVP», описать GO/тесты/деплой | P1 |
| `docs/RUNBOOK.md`: деплой, откат, обновление данных, pin тайлов, SW bump, инциденты | P1 |
| `docs/DATA.md`: схема, источники, лицензии, правила provenance | P1 |
| `docs/DECISIONS.md` (ADR): бот на zimablade vs Worker; лицензия; cadence тайлов; docs archive | P1 |
| PWA: `manifest.json`, иконки, `display: standalone`, theme-color | P2 |
| SEO/соцсети: meta description, OG/Twitter, canonical, `lang` | P2 |
| Доступность: labels у select, aria-live для toast, фокус, контраст | P2 |
| Мониторинг без платных сервисов: systemd timer на zimablade → curl live/tiles/data → Telegram alert | P1 |
| Backup: ежемесячно `data/`, `scripts/`, `docs/` на внешний диск; проверка восстановления | P1 |
| Счётчик посещений: оставить abacus как optional или убрать; не строить ради него сервер | P2 |
| Waze/маршруты: добавить, если нужен паритет с концепцией | P2 |
| Список/поиск/фильтры city/artist/status: только если это реально нужно MVP | P2 |

---

## 8. Приоритизированный backlog

| ID | Задача | Приоритет | Оценка | Зависимости |
|---|---|---|---:|---|
| S1 | Синхронизировать local с `origin/main`, backup docs | P0 | 0,5 д | GO |
| S2 | Решение по UGC: бот на zimablade или скрыть | P0 | 1 д | S1 |
| S3 | Privacy/license pages + ссылки | P0 | 1 д | S1 |
| S4 | Провенанс: source URLs/текстовые источники, лицензии | P0 | 1,5 д | S1 |
| S5 | Thumbnails для 51 media + width/height | P0 | 1 д | S1 |
| S6 | Offline: online source, persist, размеры, тексты | P1 | 1 д | S1 |
| S7 | Локальные glyphs/sprites в build | P1 | 0,5 д | S1 |
| S8 | `audit-data` + триаж uncertain/годов/дублей | P1 | 2 д | S1 |
| S9 | CI: validate + audit + contrib-test + smoke | P1 | 1,5 д | S8 |
| S10 | Pin PMTiles build + проверки | P1 | 0,5 д | — |
| S11 | RUNBOOK/DATA/DECISIONS, README/AGENTS | P1 | 1 д | S2–S10 |
| S12 | PWA/SEO/a11y | P2 | 1 д | S11 |
| S13 | Мониторинг/backup на zimablade | P1 | 0,5 д | S2 |
| S14 | Release candidate + приёмка + тег | P0 | 0,5 д | S1–S13 |

---

## 9. Release gate (чек-лист)

- [ ] Local `HEAD == origin/main`; tracked-clean; backup docs сделан.
- [ ] CI зелёный: validate, audit (critical), contrib-test, smoke.
- [ ] Live deploy соответствует тегу; rollback проверен.
- [ ] UGC: либо реально работает, либо кнопки «Я здесь» нет; ложного `confirmed` нет.
- [ ] Privacy/license доступны; лицензии источников заполнены.
- [ ] У каждого объекта есть источник или фото; нет известных дублей.
- [ ] Offline: скачанный пак → reload без сети → карта/каталог/языки, без ложной ошибки.
- [ ] Превью-фото не грузят оригиналы >300 КБ.
- [ ] Нет runtime-зависимости от платных сервисов; OpenFreeMap/счётчик деградируют мягко.
- [ ] README/RUNBOOK актуальны; monitoring/backup работают.

---

## 10. Риски и как их снимаем

| Риск | Митигация |
|---|---|
| Домашний сервер zimablade недоступен | UGC-бот только дополняет сайт; чтение и офлайн не зависят. Healthcheck + alert. При долгом сбое — временно скрыть «Я здесь» |
| Telegram/бот скомпрометирован | токен 0600, отдельный systemd-user, rate limit, нет входящих портов, ротация токена |
| Wikimedia rate limit/битые URL | локальные thumbnails + fallback + месячный check-links |
| Protomaps меняет schema/удаляет build | pin build, проверки magic/bbox, ручное обновление |
| SW отдаёт старые данные | cache key из commit SHA, stale-while-revalidate для data |
| Данные становятся «тяжёлыми» | не хранить оригиналы; только thumbs; JSON компактный; при росте — разбивка по городам |
| Юридические претензии по фото/данным | license/privacy, per-file attribution, лицензия каталога, legal review |
| Слишком большой scope | P0/P1/P2 и release gate; не добавлять CMS/аккаунты/рейтинги |

---

## 11. Что делать в первую очередь (первые 3 шага)

1. **GO на синхронизацию:** backup docs → `git fetch` → `git reset --hard origin/main` (или rebase docs) → проверка `HEAD == origin/main`.
2. **Решение по UGC:** разворачиваем бота на zimablade или скрываем «Я здесь» до лучших времён.
3. **P0-доверие:** privacy/license + провенанс + thumbnails; после этого — offline-фиксы и CI.

До получения GO никакие git-операции, деплой и изменения на `zimablade` не выполняются.
