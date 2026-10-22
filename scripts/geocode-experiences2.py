import json, time, urllib.request, urllib.parse

UA = 'AMG-map-builder/1.0 (Georgia art/experience map; contact geordent)'
CACHE = '/workspace/group/AMG/data/.nominatim-cache.json'
cache = json.load(open(CACHE))

def geo(q):
    if q in cache:
        return cache[q]
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({
        'q': q, 'format': 'json', 'limit': 3, 'countrycodes': 'ge', 'addressdetails': 1})
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                j = json.loads(r.read())
            cache[q] = j
            json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
            time.sleep(1.1)
            return j
        except Exception as e:
            print(f'   retry {attempt} {q[:30]}: {type(e).__name__}')
            time.sleep(3 + attempt * 3)
    cache[q] = []
    return []

QUERIES = [
 'Diamond Bridge Dashbashi', 'Dashbashi zipline', 'Tsalka Canyon bridge',
 'Okatse skywalk', 'Okatse ropeway', 'Martvili boat',
 'Gveleti waterfall', 'Kinchkha waterfall', 'Makhuntseti waterfall',
 'Batumi cable car', 'Rike Park cable car', 'Tbilisi funicular',
 'Gergeti Trinity', 'Truso valley', 'Juta Georgia', 'Abudelauri lakes',
 'Bakuriani bike park', 'Gudauri bike park', 'Batumi bike park',
 'Racha rafting', 'Enguri rafting', 'Kutaisi rafting', 'Pasanauri rafting',
 'Paravani lake', 'Kartsakhi lake', 'Tusheti Omalo road',
 'Tbilisi Ethnographic museum', 'Chiatura cable car', 'Katskhi pillar',
 'Birtvisi canyon', 'Samshvilde canyon', 'Tmogvi fortress',
 'Svaneti Ushguli Mestia road', 'Mestia Hatsvali cable car',
 'Kojori', 'Saguramo', 'Tbilisi National Park',
 'Aragvi reservoir', 'Sioni reservoir',
 'Tsalka reservoir', 'Dmanisi museum',
 'Kazbegi paragliding', 'Tbilisi paragliding',
 'Borjomi cable car', 'Borjomi park',
 'Kobuleti', 'Ureki magnetic sand', 'Anaklia',
]
res = {}
for q in QUERIES:
    j = geo(q)
    if not j:
        print(f'-- {q}: NOTHING'); continue
    b = j[0]
    res[q] = {'lat': float(b['lat']), 'lon': float(b['lon']), 'type': b.get('type'), 'display': b.get('display_name','')[:110]}
    print(f"{q[:30]:32s} {float(b['lat']):.5f},{float(b['lon']):.5f} [{b.get('type')}] {b.get('display_name','')[:50]}")
json.dump(res, open('/workspace/group/AMG/data/.geo-candidates2.json','w'), ensure_ascii=False, indent=1)
print('\nok', len(res))
