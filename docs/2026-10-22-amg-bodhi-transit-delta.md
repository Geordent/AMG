# AMG — дельта после аудита: работа Bodhi на zimablade

- Снимок: **2026-10-22, ~15:43 MSK**
- Сервер: `zimablade`, каталог `.../nanoclaw/groups/telegram_main/AMG`
- Режим: read-only; на сервере ничего не менялось
- Прод на момент снимка: `https://geordent.github.io/AMG/` — `cf2e8e8`

> **Обновление 2026-10-22 ~16:00:** Bodhi закоммитил и задеплоил изменения:
> `b7f511e` «AMG: транспорт подключаемым слоем…», GitHub Actions run #18 — success.
> Live `index.html` и `data/transit.geojson` обновлены. В коммит вошли только
> `index.html` + `data/transit.geojson`; `build-transit.py`, source и тестовые скрипты
> остались untracked на сервере. Ниже — снимок до этого обновления.

---

## 1. Главное

После аудита Bodhi сделал **новую функцию «Транспорт на карте»**:

- метро и линии метро;
- Ж/Д станции;
- автовокзалы;
- аэропорты/аэродромы;
- отдельная панель с чекбоксами, по умолчанию всё выключено;
- выбор запоминается в `localStorage`;
- слои работают на любом зуме, независимо от PMTiles;
- встроены в темы и в ru/en/ka-локализацию.

**Но работа ещё не закоммичена и не задеплоена.** В git только `index.html` в modified; новые данные и скрипты — untracked. Live-сайт пока старый.

---

## 2. Состояние git на момент снимка

| Параметр | Значение |
|---|---|
| HEAD | `cf2e8e8` (без новых коммитов) |
| Reflog | последняя запись — 18.10.2026, новых commit/reset нет |
| Tracked-изменения | `M index.html` (+167 / −4 строк) |
| Staged | пусто |
| Untracked | `data/transit.geojson`, `data/.transit-osm-source.json`, `scripts/build-transit.py`, `scripts/transit-*.mjs`, `scripts/.shots/`, preview |
| Live `index.html` | hash `71aa8dac…` — совпадает с `cf2e8e8`, не с рабочим файлом |
| GitHub `main` | `cf2e8e8`, новых push нет |

---

## 3. Что добавлено в `index.html`

| Блок | Содержание |
|---|---|
| UI | кнопка «Транспорт» в верхней панели; bottom-sheet `#transit` с 4 чекбоксами |
| state | `state.transit` — Set включённых видов; чтение `localStorage['amg-transit']` |
| Данные | `fetch('data/transit.geojson')`, кэш на время сессии |
| Слои | `amg-transit-line`, `amg-transit-metro-local`, `amg-transit-train-local`, `amg-transit-bus-local`, `amg-transit-air-local` |
| Иконки | SVG: метро/поезд/автобус/самолёт/паром; локальные, без внешних ассетов |
| Видимость | `applyTransitVisibility()` — единая точка для переключений и после `style.load` |
| Тема | транспортные POI исключены из базового слоя `pois`, чтобы не было дублей |
| i18n | подписи панели и кнопки на ru/en/ka |
| Persist | выбор сохраняется; после reload кнопка показывает «Транспорт · N» |
| Fix | добавлен идемпотентный `schedule()` при `map.isStyleLoaded()`, чтобы слои не терялись при быстрой загрузке |

---

## 4. Новые данные

`data/transit.geojson` — **128 features**, 31 372 Б:

| kind | Кол-во | Что это |
|---|---:|---|
| `metro` | 23 | станции Тбилисского метро |
| `metro_line` | 2 | линии 1 и 2 |
| `train` | 77 | Ж/Д станции из OSM `railway=station` |
| `bus` | 19 | проверенный список автовокзалов |
| `air` | 7 | аэропорты/аэродромы |

Проверки данных:

- все координаты внутри bbox Грузии;
- все объекты имеют `name_ru`, `name_en`, `name_ka`;
- дублей координат и пар <50 м нет;
- единственное совпадение имён — `Kutaisi International Airport` у `train` (ж/д станция аэропорта) и `air` (сам аэропорт), это не дубль, но стоит переименовать станцию.

Источник: `data/.transit-osm-source.json` (Overpass + Nominatim + ручной список автовокзалов), сборка — `scripts/build-transit.py`.

---

## 5. Что проверено

| Проверка | Результат |
|---|---|
| `node --check` inline-модуля | **PASS** |
| Границы/имена/дубли в transit.geojson | PASS (см. выше) |
| Desktop-скриншоты | слои, панель, темы, английский язык — визуально работают |
| Переключение по одному | Bodhi прогнал серию тестов `transit-toggle-verify` / `transit-ab-proof` |
| Persist после reload | есть скриншот `09-reload-persisted.png`: остался только metro, кнопка «Транспорт · 1» |
| Live-сайт | не изменился (старый `cf2e8e8`) |

Скриншоты на сервере: `AMG/scripts/.shots/` и `amg-preview/transit*/`.
Preview: `amg-preview/amg-transit-20261022.html` (3 МБ, не прод).

---

## 6. Риски и что не доделано

| Риск | Комментарий |
|---|---|
| **Не закоммичено** | `index.html` modified, `transit.geojson`/скрипты untracked. Если закоммитить только `index.html`, прод сломается: данных не будет |
| **Не задеплоено** | Live старый; нужен commit + push + GitHub Actions |
| **Нет обновления workflow** | `data/transit.geojson` попадёт в `site/` только если его закоммитить; отдельного шага сборки нет |
| **Нет валидации** | `validate-data.mjs` не знает про transit; схемы/границы/имена не проверяются в CI |
| **Лицензирование** | данные из OSM/Nominatim (ODbL) и ручной список; нужна атрибуция/запись в `sources`/license |
| **77 Ж/Д станций** | взяты все `railway=station` без фильтра `usage`/disused; стоит проверить, нет ли грузовых/заброшенных |
| **Мобильный тест** | скриншоты desktop (1100–1440 px); мобильный bottom-sheet не подтверждён |
| **Тестовый стенд** | на скриншотах иногда остаётся toast `Ошибка карты, Server returned no content-length…` — похоже на ограничение локального test-server, не на live; но перед релизом надо перепроверить |
| **SW v8** | `sw.js` не менялся; новые data/index лучше сопровождать bump cache-версии |
| **Непрерывность работы** | на сервере активен контейнер nanoclaw, последние скриншоты — 15:43; возможно, Bodhi ещё не закончил |

---

## 7. Безопасный следующий шаг (после freeze/GO)

1. Дождаться, пока Bodhi закончит; снять snapshot и хеши.
2. Проверить `git diff` и полный набор файлов:
   - `index.html`;
   - `data/transit.geojson`;
   - `data/.transit-osm-source.json`;
   - `scripts/build-transit.py`;
   - тесты/доки — по желанию, но не `.shots` и не preview.
3. Добавить `data/transit.geojson` в коммит и в CI-проверку; при необходимости генерировать его из source в workflow.
4. Добавить атрибуцию OSM/Nominatim в license/sources.
5. Прогнать `validate-data` + smoke, проверить mobile и offline, затем bump `sw.js`.
6. Только после этого — commit/push/deploy. Live не трогать до отдельного GO.

**Текущий статус:** feature выглядит рабочей на desktop, но это **незавершённая незакоммиченная работа**, а не прод. Данные и сервер не изменялись.
