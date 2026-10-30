# AMG Research 16 — Import-Ready Patch (2026-10-29)

## Итог

- Рассмотрено **15** карточек Research 15.
- В патч включены **14**; все 14 проходят `validate-data`, `validate-experiences` и `validate-routes` в изолированной копии.
- **1** карточка отложена: `AMG15-C-013` Kutaisi Green Bazaar — точка в **14 м** от существующей `site-0151` «Мозаика Зелёного базара». Нужно решение: связать рынок с `site-0151` или создать parent/area-сущность; отдельную точку не добавлять.
- Патч: **48 insertions / 3 deletions** в `data/cities.json`, `data/sources.json`, `data/sites.geojson`.
- Добавлено: **14** site-фич (`site-0585`…`site-0598`), **27** источников (`src-0018`…`src-0044`), **4** city-кода.

## Артефакты

- `proposed-import.patch` — готовый unified diff; применяется к текущему рабочему дереву через `git apply`.
- `validation-report.md` — baseline/applied результаты и ограничения схемы.
- `editorial-exceptions.csv` — 1 отложенная карточка с причиной.
- `research-16-report.md` — этот отчёт.
- `validation-baseline.txt`, `validation-modified.txt`, `validation-applied.txt` — сырые выводы валидаторов.

## Что вошло в патч

Цинандали, Адиши, Музей Сванетии, Болнисский Сион, Баракони, Атени Сиони, Цугругашени, Сапара, Зарзма, Кветера, Мгвимеви, синагога в Лайлаши, Тобаварчхили, Уреки.

Лайлаши остаётся отдельной синагогой (`site-0596`), не объединяется с `site-0549`; расстояние 357 м, связь `RELATED_EXISTING`. Новые city-коды: `ambrolauri` для Баракони, `akhaltsikhe` для Сапары, `adigeni` для Зарзмы, `tsageri` для Лайлаши.

## Совместимость и ограничения

- Схема AMG не менялась: поселения/природа/курорт представлены точками в `sites`; area-геометрия не выдумывалась.
- `access` — обязательный enum без `unknown`: выставлен `public` для публично видимых объектов, а `access_note` прямо говорит, что часы/режим не подтверждены. Это осознанный компромисс; редактор может изменить enum.
- Для 5 карточек Georgia Travel грузинские названия и описания — рабочие переводы, не официальные названия; официальные грузинские названия использованы там, где есть запись реестра.
- Неподтверждённые часы, цены, сезонность и правила доступа не добавлены.
- Production-файлы, валидаторы, конфигурация и Git-история не изменялись; патч не применён к проекту и не закоммичен.

## Проверка

```text
Baseline:         validate-data PASS, validate-experiences PASS, validate-routes PASS
Patch applied:    validate-data PASS, validate-experiences PASS, validate-routes PASS
Counts:           sites 573 → 587; sources 16 → 43; cities 48 → 52
Patch apply:      git apply --check PASS; git apply PASS
Errors/warnings:  0 / 0
```
