# AMG — передача релиза Bodhi: что сделано и промпт для push/deploy

- Дата: **2026-10-23**
- Локальный релиз: `main` = 4 коммита после прода `6002600` (P0, Experiences, docs)
- Bundle: `/mnt/SSD_KINGSTON_250/media/amg-release-2026-10-23.bundle` на хосте; в контейнере — `/workspace/extra/server-ssd/media/amg-release-2026-10-23.bundle`
- Push/deploy **не выполнялись**: у `geordent` нет GitHub credentials, deploy-key принадлежит `nanoclaw`.

---

## 1. Что сделано (коротко)

### P0 — доверие/устойчивость

- `privacy.html`, `license.html` — конфиденциальность, лицензии, OSM/ODbL, Wikimedia, транзит, контакты; ссылки в brand.
- UGC «Я здесь» выключен: `AMG_UGC_ENABLED=false`; verified-бейджи скрыты.
- Provenance: map/catalog-источники показываются в detail как «Источники без прямой ссылки», а не исчезают.
- Offline: убран ложный toast при offline, `offlineOnly` сохраняется, размер пака показывается до скачивания, исправлены пробелы.
- Wikimedia thumbnails 960px вместо оригиналов (fallback на original).
- SW v11; network-first для всех `*.html`.
- CI: `validate-data`, `validate-experiences`, проверка наличия transit/experiences/privacy/license.

### «Впечатления» — очистка и контент

- Из серверной заготовки 65 объектов удалены 6 явных дублей с `sites.geojson`:
  Chiatura cable car, Vedza spring, Torgvas Abano, Dikhashko geyser, Borjomi Tsar's baths, Abastumani sulphur bath.
- Осталось **59** объектов.
- У всех 59: `name_ru/en/ka`, `addr_ru`, `desc_ru`, `desc_src` — 100%.
- Дополнены описания для бань, аквапарков, зоопарков, конных клубов, гольфа, марины; уточнены названия (Киевская баня, Цихисджвари, Ота, Mini Zoo Gori/Tbilisi, Кикети).
- Добавлен `scripts/validate-experiences.mjs`; CI запускает его.
- Остаточные близкие кластеры в Абанотубани — разные бани, не точные дубли; маркеры разнесены на 12–83 м.

### Проверки

- `validate-data` PASS: 573 / 539 / 188 / 16 / 48.
- `validate-experiences` PASS: 59 features, 0 warnings.
- Syntax PASS; desktop 1280 и mobile 390 — без JS-ошибок.
- Карточки «Впечатлений», legal links, UGC-off, provenance, thumbnails — работают.
- Offline-reload с пакетом: карта/каталог/«Впечатления» работают, ложного toast нет.

Подробные отчёты: `docs/2026-10-23-amg-experiences-content-audit.md`, `docs/2026-10-22-amg-p0-implementation.md`.

---

## 2. Промпт для Bodhi (скопировать целиком)

```text
Ты работаешь на zimablade в AMG. Задача: аккуратно доставить и задеплоить готовый релиз,
не потеряв твою текущую незакоммиченную заготовку.

Исходное состояние (проверь перед началом):
- /workspace/group/AMG, ветка main, HEAD должен быть 6002600.
- Рабочее дерево грязное: M data/experiences.geojson, M index.html, M sw.js
  (это твоя заготовка «Куда сходить» на 65 объектов). НЕ делай reset/clean/checkout,
  пока не сохранишь её.

Готовый релиз лежит в bundle:
  /workspace/extra/server-ssd/media/amg-release-2026-10-23.bundle

В нём main = 4 коммита после 6002600:
- P0: privacy/license, provenance, offline fixes, thumbnails, UGC off, CI validation;
- Experiences: 59 очищенных объектов, i18n/descriptions, validator;
- docs/audit.

Шаги:

1) Сначала backup своей dirty-заготовки (не пропускай):
   cd /workspace/group/AMG
   git status
   mkdir -p /workspace/group/amg-draft-backup-2026-10-23
   cp index.html sw.js data/experiences.geojson /workspace/group/amg-draft-backup-2026-10-23/ 2>/dev/null || true
   git diff > /workspace/group/amg-draft-backup-2026-10-23/tracked.patch
   git status > /workspace/group/amg-draft-backup-2026-10-23/status.txt

2) Проверь bundle, не меняя рабочее дерево:
   git bundle verify /workspace/extra/server-ssd/media/amg-release-2026-10-23.bundle

3) Сделай временный клон (не worktree в грязном repo):
   rm -rf /tmp/amg-release-push-2026-10-23
   git clone /workspace/group/AMG /tmp/amg-release-push-2026-10-23
   cd /tmp/amg-release-push-2026-10-23
   git fetch /workspace/extra/server-ssd/media/amg-release-2026-10-23.bundle \
     main:refs/remotes/release/main
   git remote set-url origin git@github.com:Geordent/AMG.git

4) Сверь, что это ожидаемый релиз:
   git log --oneline origin/main..refs/remotes/release/main
   # ожидаются 4 коммита: P0, Experiences, docs; ни одного force/rewrite.
   git diff --stat origin/main..refs/remotes/release/main

5) Push только fast-forward, без force:
   git push origin refs/remotes/release/main:main

   Если push отклонён non-fast-forward:
   - НЕ используй --force;
   - git fetch origin
   - git checkout -B release-2026-10-23 refs/remotes/release/main
   - git rebase origin/main
   - git push origin release-2026-10-23:main
   - Если конфликт — остановись, сохрани вывод, не разрешай данные вслепую.

6) После push:
   - дождись GitHub Actions build-and-deploy (run success);
   - проверь live:
       index.html, sw.js, data/experiences.geojson, privacy.html, license.html → 200;
       data/experiences.geojson → 59 features;
       tiles/*.pmtiles → 206 на Range;
       на карте открываются «Впечатления» и карточка (например, Киевская баня / Gino Paradise);
       online/offline без JS-ошибок.
   - сообщи: commit SHA, run number, результаты проверок.

7) Не трогай и не сбрасывай /workspace/group/AMG. Твоя 65-объектная заготовка
   сохранена в backup; релиз содержит очищенные 59. Решение о её удалении/слиянии —
   отдельно, только после backup и явного подтверждения.

Не выводи токены/ключи. Не делай force-push. Не меняй данные вне релиза.
```

---

## 3. Что проверить после деплоя

- `main` = 4 коммита после `6002600`; PR/force не использовались.
- Actions `build-and-deploy` — success.
- Live `data/experiences.geojson` — 59 features.
- `privacy.html`/`license.html` — 200.
- SW-версия v11.
- UGC «Я здесь» отсутствует; provenance в detail виден.
- Offline с скачанным паком — без ложной ошибки.
