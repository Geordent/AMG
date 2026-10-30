# AMG Research 16 — Validation Report (2026-10-29)

## Environment and method

- Node.js `v22.14.0`.
- Isolated copy: `/tmp/opencode/amg16-apply` (current `data/` + `scripts/`, no production files touched).
- Baseline: validators run before applying the patch.
- Patch: `proposed-import.patch` applied with `git apply` (default flags).
- Post-apply: all three validators run again on the isolated copy.

## Patch apply

```text
git apply --check proposed-import.patch  -> PASS
git apply proposed-import.patch          -> PASS
```

Patch scope:

```text
data/cities.json     |  6 +++++-
data/sites.geojson   | 16 +++++++++++++++-
data/sources.json    | 29 ++++++++++++++++++++++++++++-
3 files changed, 48 insertions(+), 3 deletions(-)
```

## Validator results

| Run | validate-data | validate-experiences | validate-routes |
|---|---|---|---|
| Baseline | PASS | PASS | PASS |
| Patch applied | PASS | PASS | PASS |

Counts before → after:

```text
sites:   573 → 587
sources:  16 → 43
cities:   48 → 52
artworks: 539 → 539
artists:  188 → 188
```

Errors: **0**. Warnings: **0**. Raw output is in `validation-baseline.txt`, `validation-modified.txt`, and `validation-applied.txt`.

## Duplicate / overlap check

Checked against current `data/sites.geojson` and `data/experiences.geojson` by exact names/aliases and nearest coordinates.

- 14 included cards: no exact name hits; no other site/experience within 500 m.
- `AMG15-C-012` (Lailashi synagogue): 357 m from `site-0549` “Okronishi Fountain / Lailashi Secret Pool”. Different object; marked `RELATED_EXISTING`, not merged.
- `AMG15-C-013` (Kutaisi Green Bazaar): **14 m** from `site-0151` “Green Bazaar mosaic”. Same location but different entity (market vs mosaic); excluded from the patch pending an entity-model decision.

## Schema notes

- All 14 new entities use the existing `sites` Point model. No schema or validator changes.
- Settlements/nature/resort cards are represented as point sites with `topic`/`poi_kind`, consistent with existing place records. No area geometry was invented.
- `access` is a required enum with no `unknown` value. Records use `public` for publicly visible exteriors and carry `access_note` stating that visiting conditions/hours are unconfirmed. If an editor knows a site is restricted, the enum should be adjusted.
- `name.ka` and `description.ka` for the five Georgia Travel-only cards are working translations, not official titles. Official Georgian names are used where the heritage registry supplies them.
- `sources` roles (`identity`, `coordinates`, `description`, `tourism`) link each card to its AMG source IDs; source URLs and titles are added to `data/sources.json`.
- Four new city codes were required and added: `adigeni`, `akhaltsikhe`, `ambrolauri`, `tsageri`.
