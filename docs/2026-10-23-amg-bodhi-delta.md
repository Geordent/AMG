# AMG — повторная дельта: прод и заготовки Bodhi

- Снимок: **2026-10-23, ~08:58 MSK**
- Сервер: `zimablade`, `.../nanoclaw/groups/telegram_main/AMG`
- Режим: read-only; на сервере/GitHub ничего не менялось
- Предыдущая точка: `b7f511e` (транспорт) + локальные P0-правки

---

## 1. Что уже в проде

GitHub `main` и `zimablade` HEAD: **`6002600`**. GitHub Actions run **#22 — success**, live обновлён.

| Коммит | Что добавлено |
|---|---|
| `290dbcb` | слой «Впечатления»: 23 объекта (парапланы, каньоны/водопады, зиплайн, рафтинг, байк, канатки), OSM/Nominatim, `data/experiences.geojson` |
| `c39c5ba` | кликабельные карточки «Впечатлений»: адрес, описание, источник, контакты; SW v9 |
| `2d15645` | чип/переключатель «Впечатления» перенесён после «Наследие и другое», с разделителем |
| `6002600` | фикс перевода Мтацминды («Святая гора»), SW v10 |

Проверка live:

- `index.html` — hash `b8f67c…`, `sw.js` — `14dc07…`;
- `data/experiences.geojson` — **200**, 19 731 Б, **23 features**;
- кнопка «Впечатления» и панель открываются;
- слои `amg-exp-paraglide/canyon/zipline/rafting/bike/cablecar` присутствуют;
- JS-ошибок/HTTP-ошибок нет;
- `privacy.html` и `license.html` — **404** (наши P0-страницы ещё не задеплоены).

Live-набор «Впечатлений»: canyon 10, cablecar 5, bike 3, paraglide 2, rafting 2, zipline 1.

---

## 2. Заготовки на сервере (не в проде)

На `zimablade` HEAD = `6002600`, но рабочее дерево **грязное**:

| Файл | Изменение |
|---|---|
| `data/experiences.geojson` | **65 features** (+42), 55 017 Б; pretty-printed |
| `index.html` | +100/−6: второй блок панели «Куда сходить» |
| `sw.js` | draft SW **v11** |

Новые категории в заготовке:

| kind | Кол-во |
|---|---:|
| `bath` (бани/термы) | 23 |
| `zoo` | 6 |
| `horse` | 6 |
| `waterpark` | 4 |
| `aquarium` | 1 |
| `golf` | 1 |
| `marina` | 1 |

Плюс уже существующие: canyon 10, cablecar 5, bike 3, paraglide 2, rafting 2, zipline 1.

В `index.html` добавлены: секция «Куда сходить», 7 новых чекбоксов, 7 SVG-иконок, новые слои, карточка с `fee_ru` и разделением «источник описания» / «о населённом пункте».

Синтаксис/JSON заготовки: `node --check` PASS, `experiences.geojson` parse OK. **Не коммитилось и не деплоилось.**

Сопутствующие черновики (untracked): `data/.newcats/*`, `scripts/newcats-*.py`, `scripts/fetch-newcat-osm*.py`, `scripts/enrich-experiences.py`, `scripts/curate-exp.py`, `.shots/nc-*`.

---

## 3. Качество заготовки «Куда сходить»

| Показатель | Значение |
|---|---|
| Features | 65 |
| `name_ru` | 65/65 |
| `name_en` | **54/65** |
| `name_ka` | **41/65** |
| `desc_ru` | 49/65 |
| `note_ru` | 65/65 |
| `addr_ru` | 65/65 |
| `desc_src` | 65/65 |
| `phone` / `website` / `email` / `hours` | 18 / 14 / 8 / 12 |
| `fee_ru` | 17 |
| `approx` | 2 |
| bbox | в пределах Грузии |

**Пересечения с существующим каталогом** (потенциальные дубли между слоями):

- `Chiatura cable car` — **0 м** от `site-0540` «Chiatura, Soviet cable network»;
- `Dikhashkho Sulphur Geyser` — **4,8 м** от `site-0543` (и ~109 м от `site-0584`);
- `Tsar's Sulphur Baths` — **5,5 м** от `site-0539` «Borjomi Open-Air Sulfur Pools»;
- `Sulphur bath` — **30 м** от `site-0536` «Abastumani Sulfur Baths»;
- `Royal Bath` / `King Erekle's Bath` / `Bath #5` / `Chreli Abano` — кластер Абанотубани рядом с `site-0560` и `site-0200`;
- `Batumi Dolphinarium` — 51 м от мозаики дельфинария (`site-0062`, другой объект, но тот же комплекс);
- `Torghva Sulfur Bath` — 94 м от `site-0564`.

Это не обязательно ошибки: слой «Куда сходить» и слой «Необычные места» могут пересекаться по смыслу. Но пользователь увидит два маркера/две сущности на одном месте; нужно решение: объединить, развести по роли или явно связать.

Внутри «Впечатлений» также есть плотный кластер бань Абанотубани (`Bath #5` ↔ `Royal Bath` ↔ `King Erekle's Bath` ↔ `Chreli Abano`, 30–76 м).

---

## 4. Локальная копия

> Обновление: локальные P0/P1 и очищенные «Впечатления» (59) уже интегрированы в локальный `main` (`5d4614c`); push/deploy не выполнялись. Ниже — состояние на момент снимка.

- Локально HEAD всё ещё `b7f511e` + **наши незакоммиченные P0/P1-правки** (privacy/license, UGC off, provenance, offline, thumbnails, CI).
- `origin/main` уже `6002600`: локально **отстаём на 4 коммита**.
- Наш diff сохранён: `/mnt/d/MyProjects/AMG-local-p0-2026-10-23.patch` (27 КБ).
- Backup docs: ветка `backup/local-before-sync-2026-10-22`, tar `../AMG-docs-archive-2026-10-22.tar.gz`.
- Автоматически не синхронизировал: наши изменения пересекаются с `index.html`/`sw.js` Bodhi, нужен аккуратный rebase/merge. `sw.js` сейчас в трёх состояниях: local v9, prod v10, draft v11 — при интеграции нужен единый новый номер.

---

## 5. Риски/что решить

1. **Не задеплоены** privacy/license и остальные наши P0-правки; live пока без них.
2. **Заготовка 65 объектов** не закоммичена; `name_en`/`name_ka` неполные (54/41 из 65).
3. **Дубли между слоями**: Chiatura, Dikhashko, Borjomi, Abastumani, Abanotubani — нужен явный аудит.
4. **Незакоммиченный пайплайн** `newcats-*` — reproducibility gap.
5. **SW-версии конфликтуют**: local v9 / prod v10 / draft v11.
6. **Данные `experiences.geojson`** в заготовке переформатированы (pretty-print), diff на 1500 строк — удобнее минифицировать/генерировать перед коммитом.
7. **Live privacy/license 404** — юридический P0 всё ещё открыт в проде.

---

## 6. Рекомендуемый порядок

1. Не деплоить заготовку 65 объектов до аудита дублей и заполнения `name_en/name_ka`.
2. Сначала интегрировать наши P0-правки на `6002600` (rebase/merge), поднять единый SW (например, v12) и задеплоить privacy/license/UGC-off/offline/thumbnails.
3. Затем отдельно — «Куда сходить»: дедуп с `sites.geojson`, i18n, контакты, решение по пересечениям, коммит пайплайна.
4. После каждого шага — `validate-data`, smoke desktop/mobile/offline, проверка live-хешей.
