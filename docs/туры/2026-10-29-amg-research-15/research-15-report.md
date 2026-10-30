# AMG Research 15 — Candidate Cards Production Batch (2026-10-29)

Статус: **исследовательский пакет, не публикация**. Production-слои, валидаторы, конфигурация и Git-история не менялись; коммитов нет.

## Кратко

- Подготовлено **15** карточек; **15** — `READY_FOR_EDITORIAL_REVIEW`.
- Дополнительно в `editorial-decisions.csv` зафиксированы **4** решения вне партии: **1** `EXCLUDE_DUPLICATE` (Махунцети) и **3** `NEEDS_MORE_EVIDENCE` (Цхалтубо, Старый Батуми, Биртвиси).
- Публикационно готовых карточек нет: `READY_FOR_EDITORIAL_REVIEW` означает готовность к редакционному рассмотрению, не к автоматической публикации.
- Источников в `sources.jsonl`: **30**; каждый привязан к source_id и списку карточек.

## Артефакты

- `candidate-cards.jsonl` — 15 карточек с `amg_site`-совместимым блоком, описанием, источниками и решением.
- `candidate-cards.geojson` — 15 точек, координаты `[lon, lat]`, WGS84.
- `editorial-decisions.csv` — 15 READY + 4 специальных решения.
- `sources.jsonl` — 30 источников (официальный реестр, Georgia Travel, Wikipedia, внутренние слои).
- `research-15-report.md` — этот отчёт.

## Партия карточек

| ID | Название (ru) | Регион / муниципалитет | Тип | Исходный ID | Решение | Недостаёт |
|---|---|---|---|---|---|---|
| AMG15-C-001 | Дом-музей Александра Чавчавадзе в Цинандали | Кахетия / Телави | site | AMG14-N-002 | READY_FOR_EDITORIAL_REVIEW | hours, access, official museum page |
| AMG15-C-002 | Адиши | Самегрело — Земо-Сванети / Местиа | settlement | AMG14-N-003 | READY_FOR_EDITORIAL_REVIEW | season/road, access to private houses, official status |
| AMG15-C-003 | Музей истории и этнографии Сванетии | Самегрело — Земо-Сванети / Местиа | site | AMG14-N-006 | READY_FOR_EDITORIAL_REVIEW | hours, fee, official museum page |
| AMG15-C-004 | Болнисский Сион | Квемо-Картли / Болниси | site | AMG13-N-002 | READY_FOR_EDITORIAL_REVIEW | hours, access, city code present |
| AMG15-C-005 | Баракони | Рача-Лечхуми и Квемо-Сванети / Амбролаури | site | AMG13-N-001 | READY_FOR_EDITORIAL_REVIEW | hours, access, city code for Ambrolauri |
| AMG15-C-006 | Атени Сиони | Шида-Картли / Гори | site | AMG13-N-004 | READY_FOR_EDITORIAL_REVIEW | hours, access, trail to fortress |
| AMG15-C-007 | Цугругашени | Квемо-Картли / Болниси | site | AMG13-N-003 | READY_FOR_EDITORIAL_REVIEW | hours, access, road condition |
| AMG15-C-008 | Сапара | Самцхе-Джавахети / Ахалцихе | site | AMG13-N-005 | READY_FOR_EDITORIAL_REVIEW | access/road, hours, city code for Akhaltsikhe |
| AMG15-C-009 | Зарзма | Самцхе-Джавахети / Адигени | site | AMG13-N-006 | READY_FOR_EDITORIAL_REVIEW | access/road, hours, city code for Adigeni |
| AMG15-C-010 | Кветера | Кахетия / Ахмета | site | AMG03-022 | READY_FOR_EDITORIAL_REVIEW | access, hours, trail condition |
| AMG15-C-011 | Мгвимеви | Имерети / Чиатура | site | AMG03-031 | READY_FOR_EDITORIAL_REVIEW | visit rules, access to rock-cut parts, hours |
| AMG15-C-012 | Синагога в Лайлаши | Рача-Лечхуми и Квемо-Сванети / Цагери | site | AMG13-N-011 | READY_FOR_EDITORIAL_REVIEW | visit rules, synagogue condition, city code for Tsageri, correct site-0549 city |
| AMG15-C-013 | Кутаисский зелёный базар | Имерети / Кутаиси | site | AMG14-N-001 | READY_FOR_EDITORIAL_REVIEW | hours, access, vendor permissions |
| AMG15-C-014 | Озеро Тобаварчхили | Самегрело — Земо-Сванети / Местиа | site | AMG14-N-004 | READY_FOR_EDITORIAL_REVIEW | season, trail/fords, guide, official protected status |
| AMG15-C-015 | Уреки | Гурия / Озургети | settlement | AMG13-N-010 | READY_FOR_EDITORIAL_REVIEW | season, beach/access, medical claims, official town status |

Распределение по регионам: Кахетия — 2, Самегрело — Земо-Сванети — 3, Квемо-Картли — 2, Рача-Лечхуми и Квемо-Сванети — 2, Шида-Картли — 1, Самцхе-Джавахети — 2, Имерети — 2, Гурия — 1. Темы включают наследие, архитектуру, музеи, виноделие, гастрономию, поселения, природу, хайкинг и побережье.

## Специальные решения вне партии

| ID | Решение | Причина | Недостаёт |
|---|---|---|---|
| AMG13-N-015 | EXCLUDE_DUPLICATE | Водопад Махунцети уже есть в AMG как experience AMG-EXP-ID-72632e484a; повторно не включать. | — |
| AMG08-003 | NEEDS_MORE_EVIDENCE | Цхалтубо — курортная территория; нельзя сводить к одной точке. Нужны границы, отдельные sanatoria и законный доступ. | object boundary; sanatoria access; legal visits |
| AMG10-001 | NEEDS_MORE_EVIDENCE | Старый Батуми — район; нет единого ансамбля. Нужна поадресная сверка зданий с AMG. | building list; coordinates; AMG matching |
| AMG04-020 | NEEDS_MORE_EVIDENCE | Биртвиси: крепость, природный памятник и маршрут — разные сущности; нужно решение о структуре. | entity split; route; access |

- **Махунцети** не включён: уже есть в AMG как `AMG-EXP-ID-72632e484a`.
- **Цхалтубо** — курортная территория, не одна точка; нужны границы/sanatoria и законный доступ.
- **Старый Батуми** — район без единого ансамбля; нужна поадресная сверка.
- **Биртвиси** — крепость, природный памятник и маршрут требуют разделения/связывания.

## Совместимость с AMG

- Целевой слой всех карточек — `sites`; `entity_type` — `site` или `settlement`, геометрия Point.
- Для 11 карточек `amg_site.city` заполнен существующим кодом (`telavi`, `mestia`, `bolnisi`, `gori`, `akhmeta`, `chiatura`, `kutaisi`, `ureki`).
- Для **Баракони, Сапары, Зарзмы, Лайлаши** кода города нет в `data/cities.json` (`ambrolauri`, `akhaltsikhe`, `adigeni`, `tsageri`); `amg_site.city` оставлен `null`, это указано в `missing`. Перед импортом нужно добавить city-коды.
- Грузинские названия заполнены для 10 карточек (официальные записи/`cities.json`); для 5 GT-only карточек `ka` оставлен `null` — нужен перевод/подтверждение.
- `description` заполнено на ru/en (30–70 слов каждое); `description.ka` — `null`, нужен перевод.
- `amg_site.sources` пуст: исследовательские source_id ещё не заведены в `data/sources.json`; полные URL и claims — в `sources.jsonl`. Перед импортом источники нужно добавить в AMG.
- `access`, `hours`, `fee`, `seasonality` намеренно не заполнены: подтверждённых данных нет. `visible_from_outside` — `true` для всех; для действующих монастырей/синагоги правила посещения должны быть проверены.

## Что именно подтверждено

- **9 карточек наследия** опираются на официальные записи `memkvidreoba.gov.ge` с ID, статусом, категорией, реестровым номером и координатами: Болнисский Сион, Баракони, Атени Сиони, Цугугашени, Сапара, Зарзма, Кветера, Мгвимеви, синагога в Лайлаши.
- **6 карточек** (Цинандали, Адиши, Музей Сванетии, Кутаисский базар, Тобаварчхили, Уреки) опираются на Georgia Travel: идентичность, координаты и туристический контекст; официальный статус/часы не подтверждены.
- **Лайлаши** — отдельная карточка синагоги (официальный ID 17280, Tsageri, 42.610601,42.859688); `site-0549` — другой объект (Okronishi Fountain), связь `RELATED_EXISTING`, не слияние.
- **Kvetera/others** официальные координаты отличаются от туристических на десятки метров; в карточках использованы официальные.

## Ограничения и следующий шаг

- 4 карточки без city-кода и 5 без грузинского названия/перевода; это техническая, а не смысловая неопределённость.
- Часы, стоимость, доступ, сезонность и правила действующих монастырей/синагоги не подтверждены — оставлены `null`.
- `candidate-cards.geojson` — исследовательский слой, не production `sites.geojson`.
- Следующий шаг — редактору: выбрать карточки, добавить city-коды/переводы/источники, проверить доступ и только затем готовить production-коммит по отдельному GO.

**Итог:** 15 содержательных карточек готовы к редакционному рассмотрению; 1 дубликат исключён; 3 сложных случая отложены до уточнения структуры/доступа.
