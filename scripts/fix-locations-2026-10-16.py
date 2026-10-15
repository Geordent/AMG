#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix district/address mismatches (2026-10-16 audit).
Group A + Group B (minus amg-0306 hold): district was systemically wrong.
Coordinates are the ground truth (confirmed by OSM tourism=artwork nodes).
Rewrites the district token in the ADDRESS (sites.geojson, ru/en/ka) and, where
the district is named in text, in the DESCRIPTION (artworks.json, ru/en/ka).

Scoped edits only: the sites.geojson feature block is located by site id, so a
shared address string ("Vake, Tbilisi") is only changed in the intended record.
artworks.json round-trips exactly with indent=2 + separators=(",",": ") + "\n".
"""
import json, sys, io

ROOT = "/workspace/group/AMG"

# ---- address fixes: site_id -> list of (old_value, new_value) for en/ru/ka ----
ADDR = {
    # Group A
    "site-0011": [("Chugureti, Tbilisi", "Mtatsminda, Tbilisi"),
                  ("Чугурети, Тбилиси", "Мтацминда, Тбилиси"),
                  ("ჩუღურეთი, თბილისი", "მთაწმინდა, თბილისი")],           # amg-0013
    "site-0012": [("Vake, Tbilisi", "Nadzaladevi, Tbilisi"),
                  ("Ваке, Тбилиси", "Надзаладеви, Тбилиси"),
                  ("ვაკე, თბილისი", "ნაძალადევი, თბილისი")],               # amg-0014
    "site-0013": [("Vake, Tbilisi", "Nadzaladevi, Tbilisi"),
                  ("Ваке, Тбилиси", "Надзаладеви, Тбилиси"),
                  ("ვაკე, თბილისი", "ნაძალადევი, თბილისი")],               # amg-0015
    "site-0014": [("Saburtalo, Tbilisi", "Mtatsminda, Tbilisi"),
                  ("Сабуртало, Тбилиси", "Мтацминда, Тбилиси"),
                  ("საბურთალო, თბილისი", "მთაწმინდა, თბილისი")],           # amg-0016
    "site-0036": [("Saburtalo, Tbilisi", "Didube, Tbilisi"),
                  ("Сабуртало, Тбилиси", "Дидубе, Тбилиси"),
                  ("საბურთალო, თბილისი", "დიდუბე, თბილისი")],               # amg-0038
    # Group B
    "site-0030": [("Vake, Tbilisi", "Mtatsminda, Tbilisi"),
                  ("Ваке, Тбилиси", "Мтацминда, Тбилиси"),
                  ("ვაკე, თბილისი", "მთაწმინდა, თბილისი")],               # amg-0032
    "site-0037": [("Krtsanisi, Tbilisi", "Mtatsminda, Tbilisi"),
                  ("Крцаниси, Тбилиси", "Мтацминда, Тбилиси"),
                  ("კრწანისი, თბილისი", "მთაწმინდა, თბილისი")],           # amg-0039
    "site-0298": [("Saburtalo", "Vake"),
                  ("Сабуртало", "Ваке"),
                  ("საბურთალო", "ვაკე")],                                  # amg-0307
}

# ---- description fixes: artwork_id -> {lang: (old, new)} ----
DESC = {
    "amg-0013": {"ru": ("в районе Чугурети", "в районе Мтацминда"),
                 "ka": ("ჩუღურეთის რაიონში", "მთაწმინდის რაიონში")},
    "amg-0014": {"ru": ("в районе Ваке", "в районе Надзаладеви"),
                 "en": ("the Vake district", "the Nadzaladevi district")},
    "amg-0015": {"ru": ("в районе Ваке", "в районе Надзаладеви"),
                 "en": ("the Vake district", "the Nadzaladevi district")},
    "amg-0016": {"ru": ("в районе Сабуртало", "в районе Мтацминда"),
                 "en": ("the Saburtalo district", "the Mtatsminda district"),
                 "ka": ("საბურთალოს რაიონში", "მთაწმინდის რაიონში")},
    "amg-0038": {"ru": ("в районе Сабуртало", "в районе Дидубе"),
                 "en": ("the Saburtalo district", "the Didube district"),
                 "ka": ("საბურთალოს რაიონში", "დიდუბის რაიონში")},
    "amg-0307": {"ru": ("в Сабуртало", "в Ваке"),
                 "en": ("at Saburtalo", "at Vake"),
                 "ka": ("საბურთალოზე", "ვაკეზე")},
    "amg-0477": {"ru": ("в районе Варкетили", "в районе Надзаладеви"),
                 "en": ("the Varketili area", "the Nadzaladevi area"),
                 "ka": ("ვარკეთილის რაიონში", "ნაძალადევის რაიონში")},
}

log = []

# ================= sites.geojson (scoped raw replacement) =================
sp = f"{ROOT}/data/sites.geojson"
raw = io.open(sp, encoding="utf-8").read()
parts = raw.split('{ "type": "Feature"')
for sid, pairs in ADDR.items():
    idx = None
    for i, p in enumerate(parts):
        if f'"id": "{sid}"' in p:
            idx = i
            break
    if idx is None:
        log.append(f"[MISS-FEATURE] {sid}")
        continue
    blk = parts[idx]
    for old, new in pairs:
        needle = f'"{old}"'
        if needle in blk:
            blk = blk.replace(needle, f'"{new}"', 1)
            log.append(f"[addr OK] {sid}: {old} -> {new}")
        else:
            log.append(f"[addr SKIP] {sid}: '{old}' not found")
    parts[idx] = blk
out = '{ "type": "Feature"'.join(parts)
io.open(sp, "w", encoding="utf-8").write(out)

# ================= artworks.json (json round-trip) =================
ap = f"{ROOT}/data/artworks.json"
data = json.loads(io.open(ap, encoding="utf-8").read())
byid = {a["id"]: a for a in data}
for aid, langs in DESC.items():
    a = byid.get(aid)
    if a is None:
        log.append(f"[MISS-ART] {aid}")
        continue
    d = a.get("description") or {}
    for lang, (old, new) in langs.items():
        t = d.get(lang, "")
        if old in t:
            d[lang] = t.replace(old, new)
            a["description"] = d
            log.append(f"[desc OK] {aid}/{lang}: {old} -> {new}")
        else:
            log.append(f"[desc SKIP] {aid}/{lang}: '{old}' not found")
outjson = json.dumps(data, ensure_ascii=False, indent=2, separators=(",", ": ")) + "\n"
io.open(ap, "w", encoding="utf-8").write(outjson)

# ================= validation =================
json.loads(io.open(sp, encoding="utf-8").read())
json.loads(io.open(ap, encoding="utf-8").read())
print("\n".join(log))
print("---VALID JSON OK---")
