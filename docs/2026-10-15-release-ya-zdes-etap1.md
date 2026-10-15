# 2026-10-15 — Выпуск: «Я здесь», «Рядом», прицельные ссылки, приём вкладов

Ветка: `release/2026-10-15-ya-zdes-etap1`
База: `main` = `6569ce9` + коммит локализации `1a1ab9a`
Деплой: слияние в `main` → GitHub Actions (`.github/workflows/pages.yml`) → GitHub Pages

## Что входит

### 1. Локализация (коммит `1a1ab9a`)
- `data/artworks.json`, `data/sites.geojson` — добавлены названия/адреса на **ru + ka** (en сохранён).
- `index.html` — политика прицельных ссылок (ссылка указывает только на объект), 5 ссылок на Wikipedia в карточках объектов.
- `.gitignore` — исключены артефакты резолверов (`.wikidata-georgia.json`, `.wiki-*.json`).

### 2. «Я здесь» (adaptive tolerance)
- `navigator.geolocation` → локальный расчёт расстояния (гаверсинус, `haversine`).
- Допуск привязан к заявленной точности GPS (`accuracy`), а не к фиксированному радиусу.
- `armManualPick` / `focusSite` — ручная установка точки, если GPS-сигнал плохой.
- Поток больше не обрывается в «miss»: при плохом сигнале предлагается ручной выбор.

### 3. «Рядом» (nearby)
- `openNearby` / `renderNearby` / `nearbyRows` — список объектов в радиусе от пользователя.

### 4. Прицельные ссылки / share
- `shareSite`, `b64url`, `makeHerePayload` — компактные ссылки (deep-link `t.me`), полезные для обмена объектом.

### 5. Приём вкладов — фронт (Этап 2, только чтение)
- `loadContributions` читает `data/contributions.json` (пока пустой плейсхолдер `{"version":1,"sites":{}}`).
- UI-заготовки: `simVote`, `verifiedBadge`, `amg-*` CSS-классы.
- Логика отправки вкладов (бот) в этот выпуск **не входит** — ждёт решения по Этапу 2.

## Проверка перед публикацией
- `node scripts/validate-data.mjs` → **PASS** (sites 524, artworks 531, artists 187, sources 16, cities 40).
- JSON-валидность всех `data/*.json|geojson` → OK.
- `index.html` — синтаксис основного `<script>` (ESM) через `node --check` → OK.

## Не входит в этот выпуск (осталось локально)
Скрипты и артефакты Этапа 2 / резолверов (`scripts/amg-contrib-bot.mjs`, `contrib-lib.mjs`,
`contrib-test.mjs`, `resolve-wikipedia*.py`, `*.preview`, `__pycache__`) — черновые, в репозиторий не коммичены намеренно.

## Откат
`git revert` соответствующего мержа в `main` → повторный деплой.
