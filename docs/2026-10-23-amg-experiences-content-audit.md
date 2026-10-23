# AMG — «Впечатления»: интеграция и контент-аудит

- Дата: **2026-10-23**
- Основа: прод `6002600` + серверная заготовка Bodhi (65 features)
- Локальная ветка: `wip/p0-2026-10-23`
- Статус: **локально интегрировано и протестировано; не закоммичено/не задеплоено**

---

## 1. Что было

- В проде: 23 объекта — canyon 10, cablecar 5, bike 3, paraglide 2, rafting 2, zipline 1.
- На `zimablade` в рабочем дереве: 65 объектов (+42): baths 23, zoo 6, horse 6, waterpark 4, aquarium 1, golf 1, marina 1.
- Черновик также добавлял блок «Куда сходить», 7 новых чекбоксов, иконки и поля карточки (`fee_ru`, `desc_scope`).
- Проблемы черновика: `name_en` 54/65, `name_ka` 41/65, `desc_ru` 49/65, дубли с `sites.geojson`, форматирование 1500 строк.

## 2. Что сделано локально

| Действие | Результат |
|---|---|
| Интеграция индекса | блок «Куда сходить», 7 новых категорий, иконки, карточки, `EXP_KEYS`/`EXP_UI` |
| Дедуп с `sites.geojson` | удалено 6 явных дублей: Chiatura cable car, Vedza spring, Torgvas Abano, Dikhashkho geyser, Tsar's Sulphur Baths, Sulphur bath (Abastumani) |
| Итого features | **59** |
| i18n | `name_ru/en/ka`, `addr_ru`, `desc_ru`, `desc_src` — **0 пропусков** |
| Контент | добавлены venue-specific описания для бань/аквапарков/зоопарков/конных клубов/гольфа; уточнены названия (Киевская баня, Цихисджвари, Ота, Mini Zoo Gori/Tbilisi, Кикети) |
| Источники | у описаний сохранён `desc_src` (OSM/официальный сайт), в карточке различаются «Источник описания» и «О населённом пункте» |
| Валидатор | добавлен `scripts/validate-experiences.mjs`: FeatureCollection, Point, bbox Грузии, kind, i18n, desc, minzoom, approx, duplicate names |
| CI | workflow запускает `validate-experiences` и проверяет наличие `data/experiences.geojson` |
| SW | единый **v11** (prod v10 + наши изменения) |

## 3. Итоговый состав

| kind | Кол-во |
|---|---:|
| canyon | 10 |
| bath | 18 |
| zoo | 6 |
| horse | 6 |
| cablecar | 4 |
| waterpark | 4 |
| bike | 3 |
| paraglide | 2 |
| rafting | 2 |
| zipline / aquarium / golf / marina | по 1 |

## 4. Проверки

- `node scripts/validate-experiences.mjs` → **PASS**, 59 features, 0 warnings.
- `node scripts/validate-data.mjs` → **PASS** (sites 573 / artworks 539 / artists 188 / sources 16 / cities 48).
- `node --check` inline-модуля и `sw.js` → PASS.
- Desktop 1280×900: панель «Впечатления», второй блок «Куда сходить», 13 чекбоксов, слои, карточка бани (адрес, описание, источник, телефон, маршруты) — без JS-ошибок.
- Mobile 390×844: панель помещается, 13 чекбоксов, legal links видны — без ошибок.
- Offline reload с скачанным паком: карта/каталог/«Впечатления» работают, ложного toast нет.
- Thumbnails Wikimedia 960px — работают.
- UGC «Я здесь» остаётся выключенным (`AMG_UGC_ENABLED=false`).

## 5. Остаточные пересечения

После удаления 6 дублей остались близкие кластеры в Абанотубани (Царская, Баня царя Ираклия, Баня царицы Тамары, Пёстрая, Баня №5) и Батумский дельфинарий рядом с мозаикой дельфинария. Это **разные объекты/роли**, не точные дубли; маркеры разнесены на 12–83 м. Если нужен один маркер на комплекс — потребуется явная связь `experience ↔ site`, отдельное решение.

## 6. Не сделано

- Commit/push/deploy этого блока.
- `related_site` для смысловых пересечений (сейчас просто разные слои).
- Полные контакты/часы для всех 59 объектов (добавлены только проверенные/имевшиеся).
- Аудит остальных 306 `uncertain` и 347 без года в основном каталоге.
- `thumb_url/width/height` в data (пока thumbnails выводятся на лету).
