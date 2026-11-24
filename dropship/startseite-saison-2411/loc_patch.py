import json, sys
TXT = {
 'de.json': {'christmas_eyebrow':'Advent & Weihnachten','christmas_heading':'Weihnachtszauber','christmas_intro':'Adventskalender, Deko und kleine Geschenke für die schönste Zeit des Jahres.',
             'winter_eyebrow':'Saison-Auswahl','winter_heading':'Warm durch den Winter','winter_intro':'Mützen, Schals, Jacken und Kuscheliges für kalte Tage.',
             'gifts_eyebrow':'Geschenke finden','gifts_heading':'Geschenkideen für deine Liebsten','gifts_intro':'Für sie, für ihn und für die Kleinen – Ideen, die Freude machen.'},
 'fr.json': {'christmas_eyebrow':'Avent & Noël','christmas_heading':'Magie de Noël','christmas_intro':"Calendriers de l'Avent, décorations et petits cadeaux pour la plus belle période de l'année.",
             'winter_eyebrow':'Sélection de saison','winter_heading':'Bien au chaud cet hiver','winter_intro':'Bonnets, écharpes, vestes et douceurs pour les jours froids.',
             'gifts_eyebrow':'Trouver un cadeau','gifts_heading':'Idées cadeaux pour tes proches','gifts_intro':'Pour elle, pour lui et pour les petits – des idées qui font plaisir.'},
 'en.default.json': {'christmas_eyebrow':'Advent & Christmas','christmas_heading':'Christmas magic','christmas_intro':'Advent calendars, decorations and little gifts for the most wonderful time of the year.',
             'winter_eyebrow':'Seasonal pick','winter_heading':'Warm through winter','winter_intro':'Beanies, scarves, jackets and cosy pieces for cold days.',
             'gifts_eyebrow':'Find a gift','gifts_heading':'Gift ideas for your loved ones','gifts_intro':'For her, for him and for the little ones – ideas that bring joy.'},
}
for fn, add in TXT.items():
    c = open('loc/' + fn).read()
    k = c.index('{'); head = c[:k]
    j = json.loads(c[k:])
    ex = j['luxe_home']['extra']
    for key in add: assert key not in ex, (fn, key)
    ex.update(add)
    out = head + json.dumps(j, ensure_ascii=False, indent=2) + '\n'
    open('neu/' + fn, 'w').write(out)
    # Gegenprobe: alle alten Schlüssel unverändert
    alt = json.loads(c[k:]); neu = json.loads(out[k:])
    neu['luxe_home']['extra'] = {x: y for x, y in neu['luxe_home']['extra'].items() if x not in add}
    assert alt == neu, fn
    print(fn, 'ok', len(c), '->', len(out))
