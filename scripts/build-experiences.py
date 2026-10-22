# -*- coding: utf-8 -*-
"""Собирает data/experiences.geojson — слой «Впечатления» (парапланы, каньоны, зиплайны,
рафтинг, байк, канатки). Все координаты получены из OSM/Nominatim (см. data/.geo-candidates*.json),
кроме помеченных approx=true (центр населённого пункта, точное место не найдено).
Ничего не выдумано: если координата приблизительная — она помечена."""
import json

E = [
 # kind, name_ru, name_en, name_ka, lat, lon, minzoom, note_ru, approx
 ('paraglide','Парапланы в Гудаури','Gudauri tandem paragliding','გუდაური','42.49108','44.46287',8,
  'Стартовая точка тандем-полётов над Гудаурским перевалом (OSM: viewpoint «Gudauri tandem paragliding»).',False),
 ('paraglide','Парапланы над Тбилисским морем','Paragliding launch Tbilisi Sea','თბილისის ზღვა','41.75748','44.91945',9,
  'Старт на берегу Тбилисского водохранилища (OSM: pitch «Paragliding launch Tbilisi Sea»).',False),

 ('canyon','Каньон Дашбаши','Dashbashi Canyon','დაშბაში','41.58206','44.13358',7,
  'Памятник природы у Цалки: каньон, тропа и смотровые. Вход платный.',False),
 ('canyon','Каньон Окаце','Okatse Canyon','ოკაცეს კანიონი','42.45187','42.54984',7,
  'Каньон с подвесной тропой (skywalk) над пропастью; от парковки — трансфер.',False),
 ('canyon','Каньон Мартвили','Martvili Canyon','მარტვილის კანიონი','42.45843','42.37288',7,
  'Лодочная прогулка по каньону с бирюзовой водой и водопадами.',False),
 ('canyon','Каньон Балди (смотровая)','Baldi Canyon viewpoint','ბალდის კანიონი','42.48811','42.40757',9,
  'Смотровая площадка над Мартвильским каньоном (OSM: tourism=viewpoint).',False),
 ('canyon','Каньон Биртвиси','Birtvisi Canyon','ბირთვისი','41.60960','44.54067',9,
  'Скальный лабиринт и крепость; маршруты для трекинга и скалолазания.',False),
 ('canyon','Каньон Самшвилде','Samshvilde Canyon','სამშვილდე','41.50103','44.47967',9,
  'Памятник природы рядом с крепостью Самшвилде.',False),
 ('canyon','Водопад Кинчха','Kinchkha Waterfall','კინჩხა','42.49570','42.55019',10,
  'Двухступенчатый водопад у Окаце; верхняя ступень ~100 м.',False),
 ('canyon','Водопад Махунцети','Makhuntseti Waterfall','მახუნცეთი','41.57494','41.85831',10,
  'Водопад у дороги в Аджарии, рядом арочный мост царицы Тамары.',False),
 ('canyon','Водопад Гвелети','Gveleti Waterfall','გველეთი','42.70483','44.61758',10,
  'Два водопада в Дарьяльском ущелье, 20 мин пешком от дороги.',False),
 ('canyon','Водопад Рочо (Лагодехи)','Rocho Waterfall','როჭო','41.87571','46.30371',10,
  'Водопад в Лагодехском заповеднике (маршрут ~7 км от входа).',False),

 ('zipline','Бриллиантовый мост + зиплайн (Дашбаши)','Diamond Bridge & zipline','ბრილიანტის ხიდი','41.59473','44.12329',8,
  'Стеклянный мост 240 м над каньоном; внутри «алмаза» — кафе с видом, рядом зиплайн через ущелье. OSM: footway «ბრილიანტის ხიდი».',False),

 ('rafting','Рафтинг в Кутаиси','Kutaisi rafting','ქუთაისი','42.28257','42.71579',9,
  'Рафтинг-база на Риони (OSM: camp_site «ჯომარდობა ქუთაისში»).',False),
 ('rafting','Рафтинг в Пасанаури','Pasanauri rafting','ფასანაური','42.36305','44.68427',9,
  'Сплав по Белой Арагви (OSM: camp_site «Pasanauri-Jomardia»).',False),

 ('bike','Байк-парк Гудаури','Gudauri Bike Park','გუდაური','42.50908','44.49684',9,
  'Летний даунхилл на подъёмниках Гудаури (OSM: winter_sports «Gudauri ski resort»).',False),
 ('bike','Бакуриани (байк-трассы)','Bakuriani bike trails','ბაკურიანი','41.75109','43.52801',9,
  'Координата — центр курорта; трассы на склонах Кохта и Митарби. Точка ПРИБЛИЗИТЕЛЬНАЯ.',True),
 ('bike','Годердзи (перевал, летний курорт)','Goderdzi Pass','გოდერძი','41.63259','42.51028',9,
  'Горный курорт на перевале; точка приблизительная (центр перевала).',True),

 ('cablecar','Тбилисский фуникулёр','Tbilisi Funicular','ფუნიკულიორი','41.69521','44.79073',9,
  'Подъём на Мтацминду к парку и смотровой площадке.',False),
 ('cablecar','Парк Мтацминда','Mtatsminda Park','მთაწმინდის პარკი','41.69304','44.77948',10,
  'Парк развлечений и смотровая над Тбилиси (наверху фуникулёра).',False),
 ('cablecar','Канатная дорога «Арго» (Батуми)','Argo Cable Car','საბაგირო არგო','41.63662','41.65088',9,
  'Подъём на гору Аниноури — вид на весь Батуми (OSM: aerialway=gondola).',False),
 ('cablecar','Канатка Чиатуры','Chiatura cable car','ჭიათურა','42.28256','43.27575',9,
  'Исторические пассажирские канатки марганцевого городка (часть законсервирована).',False),
 ('cablecar','Ски-подъёмник Цуруди (Местиа)','Zurudi Ski Lift, Mestia','ჰაწვალი','43.01738','42.73898',9,
  'Подъёмник над Местией на Хацвали (OSM: guidepost «Zurudi Ski Lift»).',False),
]

feats=[]
seen=set()
for kind,nru,nen,nka,lat,lon,mz,note,approx in E:
    key=(nru,lat,lon)
    if key in seen: continue
    seen.add(key)
    feats.append({'type':'Feature','geometry':{'type':'Point','coordinates':[float(lon),float(lat)]},
      'properties':{'kind':kind,'name_ru':nru,'name_en':nen,'name_ka':nka,'note_ru':note,
                    'minzoom':mz,'approx':approx}})
gj={'type':'FeatureCollection','features':feats}
json.dump(gj,open('data/experiences.geojson','w'),ensure_ascii=False,separators=(',',':'))
from collections import Counter
print('features:',len(feats), dict(Counter(f['properties']['kind'] for f in feats)))
import os; print('bytes:',os.path.getsize('data/experiences.geojson'))
