# AMG — оценка Sakartrailo (2026-10-29)

Статус: только чтение и исследование. Код, `data/*`, production и Git не менялись. Отчёт сохранён в `docs/туры/`.

## 1. Что это за проект

- Сайт: https://guahoo.github.io/sakartrailo/ — Vue/Leaflet SPA, карта треков.
- Данные: `https://sakartrailo-backend.onrender.com/api/tracks/` — JSON на ~2,1 МБ, 442 записи треков, 269 групп (`group_id`).
- Источник данных: OpenStreetMap Overpass API, запрос `route=hiking`/`route=foot` в границах Грузии. Это подтверждается README и кодом companion-приложения `guahoo/Sacartrailo` (Retrofit/Overpass, `area["ISO3166-1"="GE"]`, `relation["route"="hiking"]`).
- Веб-репозиторий `guahoo/sakartrailo` не содержит файлов данных и не имеет LICENSE; код и данные живут отдельно, backend на Render.
- GPX: сайт собирает GPX из `nodes` выбранной группы в браузере; отдельного файла/эндпоинта GPX нет.

## 2. Инвентаризация данных

- 442 записи → **269 групп** (уникальных relation). Группировать нужно по `group_id`: один маршрут часто разбит на несколько сегментов.
- **157** групп с именем, **112** без имени/`Unnamed`.
- Только **34** группы имеют непустое описание; из них **10** именованных; **4** описания содержат URL. Практически нет сведений о доступе, сезоне, сложности.
- **149** групп имеют `label` (OSMC-символ), **120** — без метки. `label` — это цвет/тип маркировки (`red:white:red_bar`, `yellow:white:yellow_bar` и т. п.), **не уровень сложности**.
- **81** группа состоит из нескольких сегментов; **34** — короче 1 км; **4** помечены как planned; **5** по названиям относятся к Абхазии/спорным/внешним территориям (Рица, Мамдзышха, Семиозерье и т. п.) — требует проверки охвата.
- Распределение по расстоянию (по `distance` группы): 40+ км: 14, 20–40 км: 31, 10–20 км: 51, 5–10 км: 60, 1–5 км: 79, 0–1 км: 34.
- **124** именованных групп ≥5 км; после фильтрации по имени/расстоянию/региону — 68 кандидатов; в shortlist отобраны **24**.

## 3. Что сайт даёт и чего не даёт

**Даёт:**
- готовую геометрию (последовательность lat/lon) и расстояние;
- названия части маршрутов, OSMC-метки, группы сегментов;
- экспорт GPX в браузере;
- широкий охват: Сванетия, Тушетия, Рача/Лечхуми, Имерети, Тбилиси, Аджария, Самцхе-Джавахети;
- пересечения с AMG/Research 13: TCT Upper Svaneti/Imereti–Racha, Koruldi, Chalaadi, Ushba, Omalo–Shatili, Dartlo, Roshka–Juta, Samshvilde, Oniore, Vardzia, Khikhani, Sairme, Abastumani–Jaji, Tbilisi NP.

**Не даёт:**
- **уровень сложности**: нет elevation/ascent/descent/technical difficulty; «уровни» можно делать только эвристикой по расстоянию;
- сезонность, состояние тропы, разрешения, доступ, воду, ночёвки, безопасность;
- официальный статус маршрута/оператора;
- стабильные ID/версии и дату обновления данных;
- описания и связи с POI/остановками;
- лицензию на данные: OSM-происхождение предполагает ODbL/атрибуцию, но сайт её явно не декларирует; веб-репозиторий без LICENSE.

## 4. Эвристика «уровней» (только по расстоянию)

| Расстояние | Условный уровень | Оговорка |
|---|---|---|
| <5 км | короткая прогулка | рельеф/набор высоты неизвестны |
| 5–10 км | полдня | зависит от уклона/тропы |
| 10–20 км | день | без высотного профиля |
| 20–40 км | длинный день / 2 дня | нужны ночёвки/вода |
| 40+ км | многодневный | только при подтверждённой логистике |

Это **не** официальная классификация и не замена elevation/technical grade.

## 5. Shortlist маршрутов для AMG

Отобраны 24 группы: именованные, с расстоянием, географически релевантные, без planned/совсем коротких; приоритет — пересечения с AMG/Research 13 и пробелы (Сванетия, Тушетия, Рача, Тбилиси).

| ID | Маршрут | Км | Регион | Эвристический уровень | Приоритет | Пересечение с AMG/Research | Проверка |
|---|---|---|---|---|---|---|---|
| SAK-01 | Transcaucasian Trail: Upper Svaneti (5 segments) | 131.52 | Самегрело — Земо-Сванети | multi-day (distance heuristic) | HIGH | Research 13 TCT Upper Svaneti (AMG05-001); TCT official page | PARTIALLY_VERIFIED |
| SAK-02 | Transcaucasian Trail: Imereti → Racha | 69.16 | Имерети / Рача-Лечхуми | multi-day (distance heuristic) | HIGH | Research 12 AMG05-002; TCT official page | PARTIALLY_VERIFIED |
| SAK-03 | Mestia — Koruldi Lakes | 9.56 | Самегрело — Земо-Сванети | half-day (distance heuristic) | HIGH | Research 13 AMG13-N-013 Koruldi | PARTIALLY_VERIFIED |
| SAK-04 | Mestia — Koruldi Lakes — Becho | 22.51 | Самегрело — Земо-Сванети | long day/2 days (distance heuristic) | MEDIUM | Research 13 Koruldi (variant) | PARTIALLY_VERIFIED |
| SAK-05 | Mestia — Chalaadi | 8.21 | Самегрело — Земо-Сванети | half-day (distance heuristic) | HIGH | Нет прямого кандидата Research 12/13 | UNVERIFIED |
| SAK-06 | Mazeri — Ushba Glacier | 5.19 | Самегрело — Земо-Сванети | half-day (distance heuristic) | HIGH | Нет прямого кандидата | UNVERIFIED |
| SAK-07 | Ushguli — Shkhara Glacier | 8.67 | Самегрело — Земо-Сванети | half-day (distance heuristic) | MEDIUM | Нет прямого кандидата | UNVERIFIED |
| SAK-08 | Adishi — Iprali | 17.7 | Самегрело — Земо-Сванети | day (distance heuristic) | MEDIUM | Нет прямого кандидата | UNVERIFIED |
| SAK-09 | Iprari — Ushguli | 12.18 | Самегрело — Земо-Сванети | day (distance heuristic) | MEDIUM | Нет прямого кандидата | UNVERIFIED |
| SAK-10 | Omalo — Shatili | 50.52 | Кахетия / Тушетия | multi-day (distance heuristic) | HIGH | Research 13 Dartlo/Shatili; AMG site-0558 Shatili | UNVERIFIED |
| SAK-11 | Tusheti Omalo 2–3 Nights Round Trail | 56.13 | Кахетия / Тушетия | multi-day (distance heuristic) | MEDIUM | Research 13 Tusheti cluster | UNVERIFIED |
| SAK-12 | Omalo — Diklo | 18.21 | Кахетия / Тушетия | day (distance heuristic) | MEDIUM | Research 13 Tusheti cluster | UNVERIFIED |
| SAK-13 | Dartlo — Kvavlo | 1.88 | Кахетия / Тушетия | short (distance heuristic; terrain unknown) | HIGH | Research 13 AMG13-N-009 Dartlo | PARTIALLY_VERIFIED |
| SAK-14 | Roshka — Juta | 11.74 | Мцхета-Мтианети / Хевсурети | day (distance heuristic) | HIGH | Нет прямого кандидата Research 12/13 | UNVERIFIED |
| SAK-15 | Samshvilde Canyon Trail | 13.53 | Квемо-Картли | day (distance heuristic) | HIGH | Research 12 AMG04-026; Research 13 Samshvilde | PARTIALLY_VERIFIED |
| SAK-16 | Oniore Waterfalls tourist trails | 12.67 | Имерети | day (distance heuristic) | HIGH | Research 04/11 Oniore; AMG candidate context | PARTIALLY_VERIFIED |
| SAK-17 | Abastumani — Jaji Lake | 19.51 | Самцхе-Джавахети | day (distance heuristic) | MEDIUM | AMG Abastumani site-0536; Research 08 | PARTIALLY_VERIFIED |
| SAK-18 | Vardzia — Tmgovi | 4.37 | Самцхе-Джавахети | short (distance heuristic; terrain unknown) | MEDIUM | Research 03 AMG03-024; AMG site-0570 | PARTIALLY_VERIFIED |
| SAK-19 | Khikhadziri — Shuamta — Khikhani | 21.02 | Аджария | long day/2 days (distance heuristic) | MEDIUM | Research 03 AMG03-009 Khikhani | PARTIALLY_VERIFIED |
| SAK-20 | Sairme Pass Trail | 24.93 | Имерети / Рача-Лечхуми | long day/2 days (distance heuristic) | MEDIUM | AMG Sairme site-0555; Research 08 | PARTIALLY_VERIFIED |
| SAK-21 | Tbilisi National Park Trail | 14.82 | Тбилиси | day (distance heuristic) | HIGH | Tbilisi gap; AMG city sites nearby | UNVERIFIED |
| SAK-22 | Kojori, Kabeni Monastery and Kabeni Waterfalls | 9.37 | Тбилиси / Квемо-Картли | half-day (distance heuristic) | MEDIUM | Tbilisi gap; AMG heritage context | UNVERIFIED |
| SAK-23 | Kutaisi — Motsameta Monastery — Kutaisi | 9.5 | Имерети | half-day (distance heuristic) | MEDIUM | AMG Kutaisi/Motsameta context | UNVERIFIED |
| SAK-24 | Mestia — Hatsvali — Zuruldi | 5.99 | Самегрело — Земо-Сванети | half-day (distance heuristic) | MEDIUM | Svaneti cluster; no direct candidate | UNVERIFIED |

Итог shortlist: **11 HIGH**, **13 MEDIUM**; **11 PARTIALLY_VERIFIED** (геометрия/название из OSM + совпадение с известным объектом), **13 UNVERIFIED** (только OSM/API).

## 6. Что подходит AMG, а что нет

**Подходит как исследовательский источник и геометрия:**
- TCT Upper Svaneti (5 сегментов, 131,5 км; официальный TCT говорит ~140 км — расхождение).
- TCT Imereti–Racha (69,2 км; Research 12 указывал ~74 км — расхождение).
- Svaneti: Koruldi, Chalaadi, Ushba, Shkhara, Adishi–Iprali, Iprari–Ushguli.
- Tusheti: Omalo–Shatili, Omalo–Diklo, Tusheti round, Dartlo–Kvavlo.
- Khevsureti: Roshka–Juta.
- Kvemo Kartli: Samshvilde.
- Imereti/Racha: Oniore, Sairme, Kutaisi–Motsameta.
- Samtskhe-Javakheti: Abastumani–Jaji, Vardzia–Tmgovi.
- Adjara: Khikhadziri–Shuamta–Khikhani.
- Tbilisi: Tbilisi National Park, Kojori–Kabeni.

**Не подходит для прямой публикации:**
- нельзя выдавать `label` за сложность;
- нельзя брать участки/безымянные relation как отдельные маршруты без дедупликации;
- нет сезона/доступа/официального статуса;
- лицензия/атрибуция OSM не оформлена;
- backend Render без SLA/версии; API может измениться;
- часть треков в Абхазии/вне охвата — проверить.

## 7. Рекомендации по использованию

1. **Не импортировать всё.** Сделать snapshot API с датой/хешем и хранить как research-only; в AMG — только отобранные и проверенные маршруты.
2. **Группировать по `group_id`**, склеивать сегменты, отбрасывать `Unnamed`, planned, <1 км и явные дубли; сохранять варианты (Omalo–Shatili 50,5/45,9; Roshka–Juta 11,7/12,9; Koruldi 9,6/22,5).
3. **Проверять по официальным источникам**: TCT, APA/нацпарки, муниципалитеты, Georgia Travel; добавлять сезон/доступ/сложность/высоты.
4. **Лицензия**: считать данные OSM-derived (ODbL), указывать «© OpenStreetMap contributors», проверить условия с владельцем Sakartrailo; код репозитория без LICENSE — не копировать.
5. **Схема AMG**: текущий `routes.json` хранит только `stops`; для этих маршрутов нужна отдельная сущность с `geometry`/GPX, дистанцией, сложностью, сезоном, доступами. Не втискивать в `stops` без расширения.
6. **Приоритет следующего прохода**: TCT Upper Svaneti и Imereti–Racha; Svaneti Koruldi/Chalaadi/Ushba; Tusheti Omalo–Shatili/Dartlo; Samshvilde; Tbilisi NP; Oniore; Vardzia; Khikhani; Sairme; Abastumani–Jaji.
7. **Проверка данных**: сравнить distance API с пересчётом по nodes; проверить направление/соединение сегментов; получить GPX и прогнать на карте.

## 8. Вывод

Sakartrailo — **полезный источник маршрутов и геометрии**, особенно для закрытия пробела хайкинга в AMG. Он **не является готовым каталогом уровней**: difficulty/elevation/season/access отсутствуют, а `label` — это маркировка, не сложность. Использовать его следует как research-источник и источник GPX/линий для отобранных маршрутов, с проверкой официальных источников и соблюдением OSM-лицензии. Прямой массовый импорт в AMG не рекомендуется.

## Артефакты

- `docs/туры/2026-10-29-sakartrailo-assessment.md` — этот отчёт.
- `docs/туры/2026-10-29-sakartrailo-route-groups.csv` — 269 групп с расстоянием, меткой, сегментами, bbox и черновой региональной догадкой.
- `docs/туры/2026-10-29-sakartrailo-shortlist.jsonl` — 24 отобранных маршрута.
- `docs/туры/2026-10-29-sakartrailo-shortlist.csv` — то же для таблиц.

**Источники:** сайт `https://guahoo.github.io/sakartrailo/`, API `https://sakartrailo-backend.onrender.com/api/tracks/`, репозиторий `https://github.com/guahoo/sakartrailo`, companion app `https://github.com/guahoo/Sacartrailo` (README/Overpass-код), OSM copyright `https://www.openstreetmap.org/copyright`.
