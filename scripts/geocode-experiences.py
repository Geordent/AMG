import json, time, urllib.request, urllib.parse, os

UA = 'AMG-map-builder/1.0 (Georgia art/experience map; contact geordent)'
CACHE = '/workspace/group/AMG/data/.nominatim-cache.json'
try:
    cache = json.load(open(CACHE))
except Exception:
    cache = {}

def geo(q, extra=''):
    key = q + extra
    if key in cache:
        return cache[key]
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({
        'q': q, 'format': 'json', 'limit': 3, 'countrycodes': 'ge', 'addressdetails': 1})
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                j = json.loads(r.read())
            cache[key] = j
            json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
            time.sleep(1.1)
            return j
        except Exception as e:
            print(f'   retry {attempt} {q[:30]}: {type(e).__name__}')
            time.sleep(3 + attempt * 3)
    cache[key] = []
    return []

QUERIES = [
    'Dashbashi Canyon',
    'დაშბაში',
    'Okatse Canyon',
    'Martvili Canyon',
    'Prometheus Cave',
    'Kincha canyon Georgia',
    'Gudauri',
    'Stepantsminda',
    'Kazbegi',
    'Bakuriani',
    'Mestia',
    'Svaneti',
    'Tbilisi Sea',
    'Mtkheta',
    'Mtskheta',
    'Racha Ambrolauri',
    'Oni Georgia',
    'Borjomi',
    'Batumi',
    'Kutaisi',
    'Zugdidi',
    'Paravani',
    'Tusheti',
    'Omalo',
    'Shatili',
    'Ushguli',
    'Vardzia',
    'Sighnaghi',
    'Telavi',
    'Lagodekhi',
    'Tbilisi Rike Park',
    'Abastumani',
    'Bakhmaro',
    'Gomismta',
    'Khulo',
    'Tskaltubo',
    'Sataplia',
    'Alazani',
    'Dashbashi Canyon Natural Monument',
    'Trialeti',
    'Tsalka',
    'Dmanisi',
    'Chiatura',
    'Gudauri ski resort',
    'Racha rafting',
    'Khertvisi',
    'Aragvi',
    'Zhinvali',
    'Pasanauri',
    'Gudauri paragliding',
]

res = {}
for q in QUERIES:
    j = geo(q)
    if not j:
        print(f'-- {q}: NOTHING')
        continue
    best = j[0]
    res[q] = {
        'lat': float(best['lat']), 'lon': float(best['lon']),
        'display': best.get('display_name', '')[:110],
        'type': best.get('type'), 'class': best.get('class'),
    }
    print(f"{q[:28]:30s} {float(best['lat']):.5f},{float(best['lon']):.5f}  [{best.get('type')}] {best.get('display_name','')[:60]}")

json.dump(res, open('/workspace/group/AMG/data/.geo-candidates.json', 'w'), ensure_ascii=False, indent=1)
print('\nsaved', len(res), 'of', len(QUERIES))
