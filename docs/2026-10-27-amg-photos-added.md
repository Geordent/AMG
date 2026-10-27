# AMG — фото с Wikimedia Commons: что добавлено (2026-10-27)

GO автора на фото с Commons для природы, бань, канаток и старой архитектуры. Основа отбора и правовой разбор — `docs/2026-10-27-amg-photos-legal-sources.md`.

## Итог

| | До | После |
|---|---|---|
| Места каталога с фото | 43 из 573 | 45 из 573 |
| Фото у мест (всего) | 43 | 50 |
| «Впечатления» с фото | 0 из 60 | 12 из 60 |
| Фото у «Впечатлений» (всего) | 0 | 18 |

Счётчики данных не изменились: места 573, работы 539, художники 188, источники 16, города 48, «Впечатления» 60. Дублей id и координат не появилось (меняются только поля `media`). `validate-data.mjs`, `validate-experiences.mjs` (теперь проверяет и `media`), `validate-routes.mjs` — PASS. Все 28 ссылок на файлы отвечают 200 и отдают изображение.

## Что изменилось в коде

- Карточка «Впечатления» показывает первое фото с подписью (автор · лицензия · источник), как у мест; свойства из карты приходят строкой, поэтому `media` разбирается через `JSON.parse`.
- `scripts/validate-experiences.mjs`: `media[]` — только страница файла на commons.wikimedia.org, оригинал на upload.wikimedia.org, автор, лицензия из того же списка, что в `validate-data.mjs`.
- У трёх мест с уже существовавшим фото (Давид Гареджи, Шатили, Ушгули) добавлен ещё один снимок: в «Подробно» они в галерее, в карточке остаётся прежнее первое.

## Добавленные фото

| Что | Объект | Автор | Лицензия | Файл на Commons |
|---|---|---|---|---|
| Впечатление | Каньон Окаце | Paata vardanashvili | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Okatse 26.jpg](https://commons.wikimedia.org/wiki/File:Okatse_26.jpg) |
| Впечатление | Каньон Окаце | Zysko serhii | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Pendant road. Okatse Canyon Natural Monument. fo](https://commons.wikimedia.org/wiki/File:Pendant_road._Okatse_Canyon_Natural_Monument._foto-4.jpg) |
| Впечатление | Каньон Биртвиси | Alexkom000 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [2024-01-07 Birtvisi Natural Monument 3.jpg](https://commons.wikimedia.org/wiki/File:2024-01-07_Birtvisi_Natural_Monument_3.jpg) |
| Впечатление | Водопад Рочо (Лагодехи) | Alexey Komarov | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Black Grouse Waterfall 2023-08-12-3.jpg](https://commons.wikimedia.org/wiki/File:Black_Grouse_Waterfall_2023-08-12-3.jpg) |
| Впечатление | Водопад Рочо (Лагодехи) | Alexey Komarov | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Black Grouse Waterfall 2023-08-12-4.jpg](https://commons.wikimedia.org/wiki/File:Black_Grouse_Waterfall_2023-08-12-4.jpg) |
| Впечатление | Бриллиантовый мост + зиплайн (Дашбаши) | Hijas Rahim Binutha | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Dash bashi view.jpg](https://commons.wikimedia.org/wiki/File:Dash_bashi_view.jpg) |
| Впечатление | Годердзи (перевал, летний курорт) | Jelger Groeneveld | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Goderdzi Pass (2025m).jpg](https://commons.wikimedia.org/wiki/File:Goderdzi_Pass_(2025m).jpg) |
| Впечатление | Годердзи (перевал, летний курорт) | Yasuhiro Kojima | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Mount Tlili (view from Goderdzi Pass).jpg](https://commons.wikimedia.org/wiki/File:Mount_Tlili_(view_from_Goderdzi_Pass).jpg) |
| Впечатление | Тбилисский фуникулёр | Andrewlevint | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [The Tbilisi Funicular. Lower station.jpg](https://commons.wikimedia.org/wiki/File:The_Tbilisi_Funicular._Lower_station.jpg) |
| Впечатление | Тбилисский фуникулёр | Aldis Dzenovskis | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Dzveli Tbilisi, Tbilisi, Georgia - panoramio (34](https://commons.wikimedia.org/wiki/File:Dzveli_Tbilisi,_Tbilisi,_Georgia_-_panoramio_(344).jpg) |
| Впечатление | Ски-подъёмник Цуруди (Местиа) | Alexey Komarov | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [A view from mount Zuruldi, Svaneti, June, 2018-1](https://commons.wikimedia.org/wiki/File:A_view_from_mount_Zuruldi,_Svaneti,_June,_2018-1.jpg) |
| Впечатление | Аквапарк Анаклия | Dalibor Z. Chvatal | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Unnamed Road, Georgia - panoramio (19).jpg](https://commons.wikimedia.org/wiki/File:Unnamed_Road,_Georgia_-_panoramio_(19).jpg) |
| Впечатление | Мини-зоопарк (Гори) | Tiia Monto | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Gori 3.jpg](https://commons.wikimedia.org/wiki/File:Gori_3.jpg) |
| Впечатление | Тбилисский зоопарк | Mostafameraji | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [حیوانات باغ وحش مرکزی شهر تفلیس پایتخت گرجستان 2](https://commons.wikimedia.org/wiki/File:%D8%AD%DB%8C%D9%88%D8%A7%D9%86%D8%A7%D8%AA_%D8%A8%D8%A7%D8%BA_%D9%88%D8%AD%D8%B4_%D9%85%D8%B1%DA%A9%D8%B2%DB%8C_%D8%B4%D9%87%D8%B1_%D8%AA%D9%81%D9%84%DB%8C%D8%B3_%D9%BE%D8%A7%DB%8C%D8%AA%D8%AE%D8%AA_%DA%AF%D8%B1%D8%AC%D8%B3%D8%AA%D8%A7%D9%86_29.jpg) |
| Впечатление | Тбилисский зоопарк | Mostafameraji | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [حیوانات باغ وحش مرکزی شهر تفلیس پایتخت گرجستان 2](https://commons.wikimedia.org/wiki/File:%D8%AD%DB%8C%D9%88%D8%A7%D9%86%D8%A7%D8%AA_%D8%A8%D8%A7%D8%BA_%D9%88%D8%AD%D8%B4_%D9%85%D8%B1%DA%A9%D8%B2%DB%8C_%D8%B4%D9%87%D8%B1_%D8%AA%D9%81%D9%84%DB%8C%D8%B3_%D9%BE%D8%A7%DB%8C%D8%AA%D8%AE%D8%AA_%DA%AF%D8%B1%D8%AC%D8%B3%D8%AA%D8%A7%D9%86_28.jpg) |
| Впечатление | Батумский дельфинарий | Kharkil | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Batumi Dolphinarium 3.jpg](https://commons.wikimedia.org/wiki/File:Batumi_Dolphinarium_3.jpg) |
| Впечатление | Kiketi Farm (конная ферма) | Anuka1990 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Cows on the field - Kiketi.jpg](https://commons.wikimedia.org/wiki/File:Cows_on_the_field_-_Kiketi.jpg) |
| Впечатление | Kiketi Farm (конная ферма) | FingerWiki | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Старинный умывальник E.W.K. Lwów на Ферме Кикети](https://commons.wikimedia.org/wiki/File:%D0%A1%D1%82%D0%B0%D1%80%D0%B8%D0%BD%D0%BD%D1%8B%D0%B9_%D1%83%D0%BC%D1%8B%D0%B2%D0%B0%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA_E.W.K._Lw%C3%B3w_%D0%BD%D0%B0_%D0%A4%D0%B5%D1%80%D0%BC%D0%B5_%D0%9A%D0%B8%D0%BA%D0%B5%D1%82%D0%B8.jpg) |
| Каталог site-0039 | Цромская церковь | Jaba1977 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Tsromi church (6).jpg](https://commons.wikimedia.org/wiki/File:Tsromi_church_(6).jpg) |
| Каталог site-0039 | Цромская церковь | Jaba1977 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Tsromi church (22).jpg](https://commons.wikimedia.org/wiki/File:Tsromi_church_(22).jpg) |
| Каталог site-0041 | Грузинский национальный музей | Mostafameraji | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Საქართველოს ეროვნული მუზეუმი موزه ملی گرجستان در](https://commons.wikimedia.org/wiki/File:%E1%B2%A1%E1%83%90%E1%83%A5%E1%83%90%E1%83%A0%E1%83%97%E1%83%95%E1%83%94%E1%83%9A%E1%83%9D%E1%83%A1_%E1%83%94%E1%83%A0%E1%83%9D%E1%83%95%E1%83%9C%E1%83%A3%E1%83%9A%E1%83%98_%E1%83%9B%E1%83%A3%E1%83%96%E1%83%94%E1%83%A3%E1%83%9B%E1%83%98_%D9%85%D9%88%D8%B2%D9%87_%D9%85%D9%84%DB%8C_%DA%AF%D8%B1%D8%AC%D8%B3%D8%AA%D8%A7%D9%86_%D8%AF%D8%B1_%D8%B4%D9%87%D8%B1_%D8%AA%D9%81%D9%84%DB%8C%D8%B3_04.jpg) |
| Каталог site-0041 | Грузинский национальный музей | Mostafameraji | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Georgian National Museum موزه ملی تفلیس- گرجستان](https://commons.wikimedia.org/wiki/File:Georgian_National_Museum_%D9%85%D9%88%D8%B2%D9%87_%D9%85%D9%84%DB%8C_%D8%AA%D9%81%D9%84%DB%8C%D8%B3-_%DA%AF%D8%B1%D8%AC%D8%B3%D8%AA%D8%A7%D9%86_15.jpg) |
| Каталог site-0541 | Давид Гареджи | Devi Asmadiredja | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [David gareji cave monastery2013.jpg](https://commons.wikimedia.org/wiki/File:David_gareji_cave_monastery2013.jpg) |
| Каталог site-0558 | Шатили | Vyacheslav Argenberg | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Shatili houses 3, Georgia.jpg](https://commons.wikimedia.org/wiki/File:Shatili_houses_3,_Georgia.jpg) |
| Каталог site-0569 | Ушгули и сванские башни | xiquinhosilva | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Ushguli - 9837463824.jpg](https://commons.wikimedia.org/wiki/File:Ushguli_-_9837463824.jpg) |

## Отклонено и почему

- **Современные произведения как главный объект** (в Грузии ограниченная свобода панорамы): «Летопись Грузии» Церетели, мозаика у филармонии, мозаика Мцхетского музея, здание шахматного дворца.
- **Снимок не показывает объект или показывает соседний:** Картлис Деда, Памятник Вахтангу Горгасали, Гвелети (на фото тропа, не водопад), Ride Ranch (табличка на заборе), Дманиси (здание, не городище), мини-зоопарк/дельфинарий Батуми для зоопарка.
- **Нельзя подтвердить, что это именно этот объект:** «Баня царицы Тамары» (на Commons — «городская серная баня, Гришашвили 11», второй снимок — бизнес-центр), «Царская баня» (Орбелиани и Абанотубани — другие объекты), «Тбилисский бальнеологический курорт» (улицы), «Джвари» (файл — вид *с* монастыря).

## Подпись и лицензии

CC BY / CC BY-SA требуют указания автора и лицензии со ссылкой: подпись под каждым фото их содержит (поле `attribution_required`). Миниатюры 960 px подгружаются с upload.wikimedia.org; оригинал — запасной вариант при ошибке. Страница лицензий (`license.html`) уже описывает, что у каждого файла Commons свои автор и лицензия.

## Дальше

- Муралы — только по разрешению Tbilisi Mural Fest (см. правовой разбор); пока вместо чужих фото муралов есть кнопка «Посмотреть на улице».
- Остальные 60 объектов без фото: брать с Commons по тому же методу или присылать свои снимки с согласием на лицензию.
