# AMG — runbook

Дата: 2026-10-27  
Статус: рабочий документ; дополняется по мере изменений. Решения и причины — в отчётах `docs/2026-10-27-*.md`.

## 0. Где что живёт

| Что | Где |
|---|---|
| Сайт | `https://artmap-georgia.github.io/AMG/` (GitHub Pages, сборка через Actions) |
| Репозиторий | `github.com/artmap-georgia/AMG` (организация; прежний `Geordent/AMG` GitHub перенаправляет) |
| Старый адрес | `geordent.github.io` — репозиторий `Geordent/geordent.github.io` с перенаправлением на новый адрес |
| Бот | `@artmap_georgia_bot`, GitHub Actions `contrib-bot` (раз в 10 минут) |
| Статистика | GoatCounter, `https://artmap-georgia.goatcounter.com` (вход — почта и пароль автора) |
| Секреты репозитория | `AMG_BOT_TOKEN`, `AMG_STATE_KEY` (значения не читаются обратно; копия ключа — в менеджере паролей автора) |

## 1. Локальная проверка

```bash
npm ci
npm run build:vendor        # vendor/map-bundle.js
npm run build:assets        # шрифты и спрайты карты → assets/
node scripts/validate-data.mjs
node scripts/validate-experiences.mjs
node scripts/validate-routes.mjs
node scripts/extract-tiles.mjs        # проверка списка офлайн-пакетов
node scripts/contrib-test.mjs         # логика бота (15 тестов)
```

Для полноценной карты нужны `vendor/`, `assets/` и `tiles/*.pmtiles` (не в git; `assets/` и `tiles/` в `.gitignore`). Локальный сервер должен поддерживать HTTP Range — `python -m http.server` не подходит. Браузерные сценарии — `scripts/e2e/` (см. README там).

## 2. Деплой

1. `git status`, валидаторы из п. 1.
2. Push в `main` (только по GO). Любой push запускает `build-and-deploy`.
3. `build-and-deploy`: проверки данных → vendor → шрифты/спрайты (кэш) → тайлы (кэш на ISO-неделю и по хешу `data/offline-packs.json`) → сборка `site/` (описания работ отдельно, версия кэша SW = хеш файлов) → Pages.
4. Проверить live: страницы и данные → 200; `tiles/*.pmtiles` (11 файлов) → 206 при Range; хеши `index.html`, `data/*` совпадают с коммитом.

Версию кэша `sw.js` вручную менять не нужно: CI подставляет хеш cache-first файлов.

## 3. Rollback

- Быстрый: revert проблемного коммита в `main` → Actions задеплоит предыдущее состояние.
- Если сломан только артефакт: Actions → Re-run предыдущего успешного запуска.
- Не делать force-push в `main`.

## 4. Данные

Общее: snapshot/хеши до, изменения скриптом, проверка дублей ID и координат, orphan refs, i18n (ru/en/ka), `validate-data.mjs`, сравнение counts до/после, отчёт в `docs/`.

- **Места и работы** — `data/sites.geojson` (формат: одна фича в строке, Python-style JSON), `data/artworks.json`. На сайт уходят `artworks.lite.json` и `artworks.desc.json` (делает `scripts/split-artworks.mjs`).
- **Впечатления** — `data/experiences.geojson` (indent 1). Проверка: `validate-experiences.mjs` (включая `media`).
- **Фото** — поле `media[]` у места или «Впечатления»: страница файла на commons.wikimedia.org, `direct_url` на upload.wikimedia.org, автор, лицензия из списка (CC0, Public domain, CC BY 2.0–4.0, CC BY-SA 2.0–4.0). Правовые правила — `docs/2026-10-27-amg-photos-legal-sources.md`; муралы — только по разрешению фестиваля/художника.
- **Маршруты** — `data/routes.json` (точки со статусом `active`, соседние не дальше 1,5 км). Проверка: `validate-routes.mjs` (запускается и в CI).
- **Офлайн-пакеты** — `data/offline-packs.json` (обзор Грузии + города с bbox). Новый город = новая строка; CI нарезает тайлы скриптом `scripts/extract-tiles.mjs`, сайт подхватывает список сам.
- **Совет местного** — необязательное поле `tip {ru,en,ka}` у места или работы (данных пока нет, блок не показывается).
- Транспорт — `data/transit.geojson` (статический, OSM/Overpass; скрипт сборки должен быть в git).

## 5. Бот «Я здесь» (`@artmap_georgia_bot`)

Схема: сайт → ссылка `t.me/artmap_georgia_bot?start=<payload>` → workflow `contrib-bot` раз в 10 минут забирает сообщения (`getUpdates`), проверяет, отвечает на языке пользователя и пишет:

- зашифрованное состояние (AES-256-GCM, Telegram ID → HMAC-хеш) → ветка `contrib-state`;
- публичный фид `data/contributions.json` (статус, число людей, месяц) → `main` и запуск деплоя.

Правила: «проверено» — 2 человека у объекта; коррекция точки — 3 человека в ≥2 разных дня, точки в пределах 100 м → бот открывает Issue с меткой `report`, **точку не переносит** (решает автор); лимит 20 отметок в сутки; «телепорт» быстрее 300 км/ч не засчитывается.

Эксплуатация:
- Ручной запуск: Actions → `contrib-bot` → Run workflow (или `gh workflow run contrib-bot.yml -R artmap-georgia/AMG`).
- Лог: строка `[bot] updates=… replies=… feed_changed=…`.
- Секреты менять так: токен/ключ в временный файл → скрипт `gh secret set … --body` → удалить файл. Токены никому не показывать и не вставлять в чат; **ключ `AMG_STATE_KEY` потерять нельзя** (без него состояние не расшифровать).
- Расписание GitHub срабатывает нестабильно (на практике — единичные запуски); запасной вариант — внешний планировщик, см. п. 5a.
- Telegram в РФ заблокирован; боту это не мешает (сообщения идут от пользователей из Грузии), автор админит через VPN. Сообщения Telegram хранит сутки.

### 5a. Внешний планировщик (cron-job.org) для бота

Нужен, если собственное расписание GitHub не работает. Запускает `contrib-bot` по HTTP раз в 10 минут.

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate: Resource owner `artmap-georgia`, Repository access — only `AMG`, Permissions → Repository → **Actions: Read and write** (ничего больше), срок 90 дней (поставить напоминание о продлении).
2. cron-job.org → бесплатная регистрация → Create cronjob:
   - URL: `https://api.github.com/repos/artmap-georgia/AMG/actions/workflows/contrib-bot.yml/dispatches`
   - Schedule: every 10 minutes
   - Advanced → Request method `POST`; Request body `{"ref":"main"}`
   - Headers: `Authorization: Bearer <токен>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: amg-scheduler`, `Content-Type: application/json`
   - Ожидаемый ответ — `204`; включить уведомление о сбоях на почту.
3. Проверка: `gh run list -R artmap-georgia/AMG -w contrib-bot` — запуски с событием `workflow_dispatch` каждые ~10 минут. Одновременные запуски не пересекаются (`concurrency: contrib-bot`).

## 6. Статистика (GoatCounter)

- Код аккаунта `artmap-georgia` в `index.html` (`AMG_GOATCOUNTER`); пустая строка выключает счётчик. Описан в `privacy.html`.
- Страницы считаются автоматически; события (`event/search`, `route-…`, `stamp`, `pack-…`, `report`, `route-share`) отправляет функция `track()` без данных о человеке.
- Запросы с `localhost` GoatCounter не считает — тесты статистику не засоряют.
- Старый счётчик визитов (abacus, «глаз» под чипами) остаётся; namespace `geordent-amg` не менять — обнулится.

## 7. Service worker и кэш

- `CACHE` в `sw.js` подставляет CI (хеш файлов); локально остаётся `amg-shell-v18`.
- Страницы (`*.html`) и данные (`*.json`, `*.geojson` того же origin) — network-first с fallback на кэш (каталог работает офлайн). Остальное — cache-first. PMTiles SW не кэширует: пакеты живут в IndexedDB.
- Паспорт, «Мой день», выбранные слои и язык — `localStorage`; привязаны к адресу сайта (при смене домена начинаются заново).

## 8. Мониторинг и backup

- Периодически: live-страница, данные, тайлы (Range), `privacy.html`/`license.html`, запуски `contrib-bot`.
- Backup: `git bundle` + архив `data/docs/scripts` (без `node_modules`, `tiles`, `assets`); копия `AMG_STATE_KEY` в менеджере паролей.
- Секреты (токены, ключи, deploy-key) не попадают в отчёты, git и чат.
- `zimablade` — живой источник: перед любыми действиями snapshot/хеши, destructive-команды не использовать.
