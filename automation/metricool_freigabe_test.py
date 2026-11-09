#!/usr/bin/env python3
"""Prüfungen für metricool_freigabe.py (ohne Netz). Aufruf: python3 automation/metricool_freigabe_test.py"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import metricool_freigabe as m

n = 0


def ok(bedingung, text):
    global n
    assert bedingung, text
    n += 1


def gl(a, b, text):
    global n
    assert a == b, f'{text}: {a!r} != {b!r}'
    n += 1


def prod(title, handle, preise, status='ACTIVE', tracks=False, inv=0, avail=True):
    return {'title': title, 'handle': handle, 'status': status, 'tracksInventory': tracks, 'totalInventory': inv,
            'variants': [{'price': str(p), 'availableForSale': avail} for p in preise]}


PRODUKTE = [
    prod('JCB Mikrobagger 8010 CTS', 'jcb-mikrobagger-8010-cts-fga062003', [26.9], tracks=True, inv=74),
    prod('Plüsch Panda 15 cm', 'plusch-panda-15-cm-fga25867', [19.9], tracks=True, inv=1041),
    prod('Plüsch Waschbär', 'plusch-waschbar-fga41332', [20.9], tracks=True, inv=92),
    prod('Tennisarmband mit dekorativem Besatz', 'dreifachklinken-tennisarmband-mit-zirkon-613400', [16.9, 19.9]),
    prod('3-in-1 Gemüsehobel mit Scharfen Messern', '3-in-1-gemusehobel-mit-scharfen-messern-940928', [26.9]),
    prod('LED Tulpen-Planet Nachtlicht für Tisch', 'led-tulpen-planet-nachtlicht-fur-tisch-618400', [28.9]),
    prod('Kristallspitzen-Set 8-teilig in Holzbox', 'kristallspitzen-set-8-teilig-holzbox', [29.9]),
    prod('Haarspange Keks', 'schokoladen-ohrring-haarstecker-609700', [15.9]),
    prod('Plüsch Hochlandrind', 'plusch-hochlandrind-fga59641', [35.9], tracks=True, inv=0),     # ausverkauft
]

# ---- Bausteine
gl(m.norm('Plüsch Waschbär, 14 cm'), 'plusch waschbar 14 cm', 'norm entfernt Umlaute und Satzzeichen')
gl(m.tokens('Plüsch Panda 15 cm'), ['plusch', 'panda'], 'tokens ohne kurze Wörter')
gl(m.handle_ohne_id('plusch-panda-15-cm-fga25867'), 'plusch panda 15 cm', 'Handle ohne Kennung')
gl(m.handle_ohne_id('kristallspitzen-set-8-teilig-holzbox'), 'kristallspitzen set 8 teilig holzbox', 'Handle ohne Kennung nur wenn vorhanden')
gl(m.handle_ohne_id('led-wasserwellen-projektionsleuchte-677504'), 'led wasserwellen projektionsleuchte', 'Zahlenkennung')

t6 = 'Ein Text\n\n#a #b #c #d #e #f'
gl(m.kuerze_hashtags(t6, 5), ('Ein Text\n\n#a #b #c #d #e', ['#f']), 'ein Hashtag zu viel am Ende wird entfernt')
gl(m.kuerze_hashtags('Ein Text #a #b', 5), ('Ein Text #a #b', []), 'bis 5 bleibt unverändert')
gl(m.kuerze_hashtags('#a #b #c #d #e #f mitten im Text', 5)[1], [], 'nicht am Textende: nicht anfassen')
gl(m.kuerze_hashtags('x #a #b #c #d #e #f #g', 5)[1], ['#g', '#f'], 'zwei zu viel: letzte zuerst')

a, k, ab = m.preise('Bagger · CHF 26.90 · Versand CHF 7, ab CHF 50 gratis · ab CHF 16,90 · bis CHF 30 · unter CHF 20')
gl(a, [26.9, 50.0, 16.9, 7.0][:0] or a, 'Beträge werden gelesen')
ok(26.9 in a and 7.0 in a and 50.0 in a and 16.9 in a, 'alle Beträge erkannt, Komma wird Punkt')
gl(k, [('bis', 30.0), ('unter', 20.0)], 'Obergrenzen')
ok(16.9 in ab and 50.0 in ab, '«ab»-Beträge')

# ---- Produkterkennung
gl([p['handle'] for p in m.finde_produkte('Ein Bagger 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16 · CHF 26.90', PRODUKTE)], ['jcb-mikrobagger-8010-cts-fga062003'], 'Titel erkannt')
gl([p['handle'] for p in m.finde_produkte('Zucchini mit dem 3-in-1 Gemüsehobel, drei Edelstahlmessern', PRODUKTE)], ['3-in-1-gemusehobel-mit-scharfen-messern-940928'], 'Wortteil (Edelstahlmessern ~ messern)')
gl([p['handle'] for p in m.finde_produkte('Tennisarmband mit Zirkon ab CHF 16.90', PRODUKTE)], ['dreifachklinken-tennisarmband-mit-zirkon-613400'], 'Erkennung über das Handle')
gl(m.finde_produkte('Ein Plüschtier für Kinder ab 3 Jahren', PRODUKTE), [], 'ein einzelnes gemeinsames Wort reicht nicht')
gl(m.finde_produkte('Schöne Dinge für dich', PRODUKTE), [], 'kein Treffer')

# ---- Produkt- und Preisprüfung
pp, tr = m.pruefe_produkte('Plüsch Panda, 15 cm · CHF 19.90 · Versand CHF 7, ab CHF 50 gratis nach Rabatt', PRODUKTE)
gl(pp, [], 'richtiger Preis und generische Beträge bestehen')
pp, _ = m.pruefe_produkte('Plüsch Panda, 15 cm · CHF 18.90', PRODUKTE)
ok(any('stimmt nicht' in x for x in pp), 'falscher Preis fällt auf')
pp, _ = m.pruefe_produkte('Tennisarmband mit Zirkon ab CHF 19.90', PRODUKTE)
ok(any('niedrigste' in x for x in pp), '«ab»-Preis muss der niedrigste sein')
pp, _ = m.pruefe_produkte('Tennisarmband mit Zirkon ab CHF 16.90', PRODUKTE)
gl(pp, [], '«ab» mit niedrigstem Preis besteht')
pp, _ = m.pruefe_produkte('Plüsch Panda: Geschenke bis CHF 15', PRODUKTE)
ok(any('bis CHF 15' in x for x in pp), 'Obergrenze verletzt')
pp, _ = m.pruefe_produkte('Plüsch Panda: Geschenk unter CHF 20', PRODUKTE)
gl(pp, [], 'Obergrenze eingehalten')
pp, _ = m.pruefe_produkte('Plüsch Hochlandrind, 25 cm · CHF 35.90', PRODUKTE)
ok(any('ausverkauft' in x for x in pp), 'getrackter Bestand 0 = ausverkauft')
pp, _ = m.pruefe_produkte('Schöne Dinge für dich', PRODUKTE)
ok(any('nicht erkannt' in x for x in pp), 'kein Produkt = Entwurf bleibt')
pp, _ = m.pruefe_produkte('Plüsch Panda · CHF 19.90', [dict(PRODUKTE[1], status='DRAFT')])
ok(any('nicht ACTIVE' in x for x in pp), 'Entwurfsprodukt')
pp, _ = m.pruefe_produkte('Plüsch Panda · CHF 19.90', [dict(PRODUKTE[1], variants=[{'price': '19.9', 'availableForSale': False}], tracksInventory=False)])
ok(any('nicht lieferbar' in x for x in pp), 'keine lieferbare Variante')
pp, _ = m.pruefe_produkte('Fünf Geschenke: LED Tulpen-Planet CHF 28.90, Tennisarmband ab CHF 16.90, Plüsch Panda CHF 19.90, Kristallspitzen-Set CHF 29.90 · bis CHF 30 · Versand CHF 7', PRODUKTE)
gl(pp, [], 'Sammelbeitrag mit mehreren Produkten besteht')
pp, _ = m.pruefe_produkte('Fünf Geschenke: LED Tulpen-Planet CHF 28.90, Tennisarmband, Plüsch Panda, Kristallspitzen-Set · CHF 12.34', PRODUKTE)
ok(any('12.34' in x or '12,34' in x or '12.3' in x for x in pp), 'unbekannter Preis im Sammelbeitrag')

# ---- Textregeln
ok(m.pruefe_text('Bis Weihnachten bestellen und rechtzeitig liefern', ['instagram']), 'Weihnachts-Bestellschluss')
ok(m.pruefe_text('Jetzt bestellen, zu Weihnachten da', ['instagram']), 'Bestellen + Weihnachten')
ok(m.pruefe_text('Fasnacht Kostüme', ['tiktok']), 'Fasnacht')
ok(m.pruefe_text('Halloween Deko', ['tiktok']), 'Halloween')
ok(m.pruefe_text('Das hilft garantiert', ['tiktok']), 'Garantie')
gl(m.pruefe_text('Wichteln: ein Plüschtier ab 3 Jahren #weihnachtsgeschenk #wichteln', ['tiktok']), [], 'harmlos mit Hashtag Weihnachtsgeschenk')

# ---- Abstand und Zeit
D = lambda s: datetime.fromisoformat(s)
gl(m.frei_fuer('tiktok', D('2026-11-11T12:00'), [('tiktok', D('2026-11-11T09:00'))]), True, '3 Stunden genügen')
gl(m.frei_fuer('tiktok', D('2026-11-11T11:59'), [('tiktok', D('2026-11-11T09:00'))]), False, 'unter 3 Stunden')
gl(m.frei_fuer('tiktok', D('2026-11-11T10:00'), [('youtube', D('2026-11-11T10:00'))]), True, 'anderes Netzwerk zählt nicht')
gl(m.frei_fuer('instagram-story', D('2026-11-11T10:00'), [('instagram-story', D('2026-11-11T10:10'))]), True, 'Stories ausgenommen')
gl(m.frei_fuer('pinterest', D('2026-11-11T10:00'), [('pinterest', D('2026-11-11T10:10'))]), True, 'Pinterest ausgenommen')
gl(m.finde_zeit(['tiktok'], D('2026-11-11T10:00'), [('tiktok', D('2026-11-11T12:00'))]), D('2026-11-11T09:00'), 'weicht eine Stunde nach vorn aus')
gl(m.finde_zeit(['tiktok'], D('2026-11-11T10:00'), [('tiktok', D('2026-11-11T11:00'))]), D('2026-11-11T14:00'), 'später zuerst (+4 h ist der nächste freie Platz)')
gl(m.finde_zeit(['tiktok'], D('2026-11-11T12:00'), [('tiktok', h) for h in (D('2026-11-11T09:00'), D('2026-11-11T12:00'), D('2026-11-11T15:00'), D('2026-11-11T18:00'), D('2026-11-11T21:00'))][1:2]), D('2026-11-11T15:00'), 'Nachbar auf derselben Zeit')
gl(m.finde_zeit(['tiktok'], D('2026-11-11T12:00'), [('tiktok', D(f'2026-11-11T{h:02d}:00')) for h in (9, 12, 15, 18, 21)]), None, 'kein Platz: bleibt Entwurf')
gl(m.finde_zeit(['tiktok'], D('2026-11-11T10:00'), []), D('2026-11-11T10:00'), 'freie Zeit bleibt')

# ---- Pflichtfelder und Request
def post(id, dt, netze, text, draft=True, uuid=None, media=('https://x.test/a.mp4',), **extra):
    p = {'id': id, 'uuid': uuid or f'u{id}', 'publicationDate': {'dateTime': dt, 'timezone': 'Europe/Zurich'}, 'text': text,
         'providers': [{'network': nn, 'status': 'PENDING', 'detailedStatus': 'Pending'} for nn in netze], 'media': list(media),
         'mediaAltText': ['alt'], 'draft': draft, 'autoPublish': not draft, 'firstCommentText': '', 'shortener': False, 'hasNotReadNotes': False,
         'twitterData': {'type': 'POST'}}
    if 'youtube' in netze: p['youtubeData'] = {'title': 'T #Shorts', 'type': 'short', 'privacy': 'public', 'madeForKids': False, 'isAiGeneratedContent': False}
    if 'tiktok' in netze: p['tiktokData'] = {'privacyOption': 'PUBLIC_TO_EVERYONE', 'commercialContentOwnBrand': False, 'title': 'T'}
    if 'threads' in netze: p['threadsData'] = {'replyControl': 'EVERYONE', 'type': 'POST'}
    if 'facebook' in netze: p['facebookData'] = {'type': 'REEL', 'title': 'FT'}
    if 'instagram' in netze: p['instagramData'] = {'type': 'REEL', 'autoPublish': False, 'showReelOnFeed': True, 'isAiGenerated': False}
    p.update(extra)
    return p


gl(m.pflichtfelder(post(1, '2026-11-11T10:00', ['tiktok'], 'x')), [], 'vollständig')
ok('keine Medien' in m.pflichtfelder(post(1, '2026-11-11T10:00', ['tiktok'], 'x', media=())), 'Medien fehlen')
ok(any('Titel' in x for x in m.pflichtfelder(post(1, '2026-11-11T10:00', ['youtube'], 'x', youtubeData={'title': 'x' * 101, 'madeForKids': False}))), 'YouTube-Titel zu lang')
ok(any('madeForKids' in x for x in m.pflichtfelder(post(1, '2026-11-11T10:00', ['youtube'], 'x', youtubeData={'title': 'x'}))), 'madeForKids fehlt')
ok(any('Netzwerk' in x for x in m.pflichtfelder(post(1, '2026-11-11T10:00', ['twitter'], 'x'))), 'Netzwerk nicht erlaubt')
gl(m.pflichtfelder(post(1, '2026-11-11T10:00', ['instagram'], '', instagramData={'type': 'STORY'})), [], 'Story ohne Text ist erlaubt')
ok('kein Text' in m.pflichtfelder(post(1, '2026-11-11T10:00', ['tiktok'], '  ')), 'Beitrag ohne Text')

b = m.baue_put(post(7, '2026-11-11T10:00', ['tiktok'], 'Text'), D('2026-11-11T09:00'), 'Text')
gl(b['draft'], False, 'kein Entwurf mehr'); gl(b['autoPublish'], True, 'autoPublish')
gl(b['publicationDate'], {'dateTime': '2026-11-11T09:00:00', 'timezone': 'Europe/Zurich'}, 'Datum im Planerformat')
ok('twitterData' not in b and 'uuid' not in b and 'id' not in b, 'keine fremden Felder')
gl(b['tiktokData']['commercialContentOwnBrand'], True, 'TikTok-Eigenwerbung gesetzt')
b2 = m.baue_put(post(8, '2026-11-11T10:00', ['facebook', 'instagram'], 'T'), D('2026-11-11T10:00'), 'T')
gl(b2['instagramData']['autoPublish'], True, 'Instagram-autoPublish'); gl(b2['facebookData']['type'], 'REEL', 'Facebook-Daten bleiben')
gl([p['network'] for p in b2['providers']], ['facebook', 'instagram'], 'Netzwerke ohne Status')

# ---- Gesamtplanung
JETZT = D('2026-11-09T20:00')
T_PANDA = 'Wichtelgeschenk unter CHF 20? Plüsch Panda, 15 cm · CHF 19.90\nVersand CHF 7, ab CHF 50 gratis nach Rabatt\n#a #b #c #d #e #f'
planer = [
    post(1, '2026-11-10T10:00', ['tiktok'], T_PANDA),                                              # frei
    post(2, '2026-11-10T11:00', ['instagram', 'facebook'], T_PANDA),                              # frei, Hashtags gekürzt
    post(3, '2026-11-09T10:00', ['tiktok'], T_PANDA),                                             # gestern: gehalten
    post(4, '2026-11-10T12:00', ['tiktok'], 'Plüsch Panda, 15 cm · CHF 18.90'),                  # falscher Preis
    post(5, '2026-11-10T14:00', ['tiktok'], 'Fasnacht: Plüsch Panda, 15 cm'),                    # verbotener Text
    post(6, '2026-11-10T15:00', ['tiktok'], 'Schöne Dinge'),                                      # kein Produkt
    post(7, '2026-11-10T16:00', ['youtube'], 'Plüsch Panda, 15 cm', uuid='doppelt'),
    post(8, '2026-11-10T16:00', ['youtube'], 'Plüsch Panda, 15 cm', uuid='doppelt'),              # Kopie
    post(9, '2026-11-11T10:00', ['tiktok'], 'Plüsch Waschbär · CHF 20.90'),                       # 10:00, Nachbar 12:00 → 09:00
    post(10, '2026-11-11T12:00', ['tiktok'], 'Plüsch Waschbär · CHF 20.90 (zweiter Beitrag)'),
    post(11, '2026-11-11T15:00', ['tiktok'], 'Rose', draft=False),                                 # schon geplant
]
e = {x['id']: x for x in m.plane_lauf(planer, PRODUKTE, JETZT, medien_ok=lambda u: True)}
gl(sorted(i for i, x in e.items() if x['ok']), [1, 2, 9, 10], 'freigegeben werden genau die geprüften')
gl(e[2]['text_neu'].count('#'), 5, 'Instagram: höchstens fünf Hashtags'); ok(any('Hashtags' in f for f in e[2]['fixes']), 'Hashtag-Kürzung wird gemeldet')
gl(e[1]['text_neu'].count('#'), 6, 'TikTok: Hashtags bleiben unverändert')
ok(any('Vergangenheit' in x for x in e[3]['probleme']), 'Termin gestern: nicht neu gesetzt')
ok(any('stimmt nicht' in x for x in e[4]['probleme']), 'Preisfehler gemeldet')
ok(any('Fasnacht' in x for x in e[5]['probleme']), 'Textregel gemeldet')
ok(any('nicht erkannt' in x for x in e[6]['probleme']), 'ohne Produkt gehalten')
ok(any('uuid' in x for x in e[7]['probleme']) and any('uuid' in x for x in e[8]['probleme']), 'Kopien (gleiche uuid) bleiben unberührt')
gl(e[9]['neu'], D('2026-11-11T09:00'), 'früherer Beitrag weicht aus, damit für den nächsten Platz bleibt')
gl(e[10]['neu'], D('2026-11-11T12:00'), 'der zweite behält seine Zeit (3 Stunden bis zur Rose um 15:00)')
e2 = {x['id']: x for x in m.plane_lauf(planer, PRODUKTE, JETZT, max_je_lauf=1, medien_ok=lambda u: True)}
gl(sorted(i for i, x in e2.items() if x['ok']), [1], 'Obergrenze je Lauf')
ok(any('Obergrenze' in x for x in e2[2]['probleme']), 'Obergrenze wird gemeldet')
e3 = {x['id']: x for x in m.plane_lauf(planer, PRODUKTE, JETZT, medien_ok=lambda u: u != 'https://x.test/a.mp4')}
gl([i for i, x in e3.items() if x['ok']], [], 'Medium nicht erreichbar: nichts frei')
ok(any('nicht erreichbar' in x for x in e3[1]['probleme']), 'Medium-Problem wird gemeldet')
gl([x['id'] for x in m.plane_lauf([post(1, '2026-11-10T10:00', ['tiktok'], T_PANDA, draft=False)], PRODUKTE, JETZT)], [], 'geplante Beiträge sind keine Kandidaten')
gl([x['id'] for x in m.plane_lauf([post(1, '2026-10-01T10:00', ['tiktok'], T_PANDA)], PRODUKTE, JETZT)], [], 'alte Entwürfe werden nicht mehr gemeldet')
gl([x['id'] for x in m.plane_lauf([post(1, '2026-12-30T10:00', ['tiktok'], T_PANDA)], PRODUKTE, JETZT, horizont_tage=10)], [], 'zu weit in der Zukunft')

# ---- Kontrolle nach dem Update
erw = {'uuid': 'u1', 'neu': D('2026-11-10T10:00'), 'text_neu': 'T', 'media': ['https://x.test/a.mp4'], 'netze': ['tiktok']}
gut = post(99, '2026-11-10T10:00', ['tiktok'], 'T', draft=False, uuid='u1')
gl(m.pruefe_nachher([gut], 1, erw), [], 'sauberes Ergebnis')
ok(any('mit uuid' in x for x in m.pruefe_nachher([gut, dict(gut, id=100)], 1, erw)), 'Kopie (zwei Beiträge mit uuid)')
ok(any('mit uuid' in x for x in m.pruefe_nachher([], 1, erw)), 'Beitrag verschwunden')
ok(any('alte id' in x for x in m.pruefe_nachher([gut, dict(gut, id=1, uuid='anders')], 1, erw)), 'alte id noch da')
ok(any('Entwurf' in x for x in m.pruefe_nachher([dict(gut, draft=True, autoPublish=False)], 1, erw)), 'noch Entwurf')
ok(any('Datum' in x for x in m.pruefe_nachher([dict(gut, publicationDate={'dateTime': '2026-11-10T11:00:00', 'timezone': 'x'})], 1, erw)), 'Datum weicht ab')
ok(any('Text' in x for x in m.pruefe_nachher([dict(gut, text='anders')], 1, erw)), 'Text weicht ab')
ok(any('Medien' in x for x in m.pruefe_nachher([dict(gut, media=['x'])], 1, erw)), 'Medien weichen ab')
ok(any('Status' in x for x in m.pruefe_nachher([dict(gut, providers=[{'network': 'tiktok', 'status': 'ERROR'}])], 1, erw)), 'Status nicht PENDING')

# ---- Status
befunde = m.status_befunde([post(1, '2026-11-09T12:00', ['tiktok'], 'a', draft=False, providers=[{'network': 'tiktok', 'status': 'ERROR', 'detailedStatus': 'x'}]),
                            post(2, '2026-11-09T12:00', ['instagram'], 'b', draft=False, providers=[{'network': 'instagram', 'status': 'PUBLISHED'}]),
                            post(3, '2026-11-09T19:50', ['tiktok'], 'c', draft=False, providers=[{'network': 'tiktok', 'status': 'PENDING'}]),
                            post(4, '2026-11-09T12:00', ['tiktok'], 'd', providers=[{'network': 'tiktok', 'status': 'PENDING'}])], JETZT)
gl([b['id'] for b in befunde], [1], 'nur Fehler/Hänger älter als 45 Minuten, Entwürfe und Veröffentlichtes nicht')


# ---- Lücken aus der Mutationsprobe
e4 = {x['id']: x for x in m.plane_lauf([post(1, '2026-11-09T21:00', ['tiktok'], 'Plüsch Panda, 15 cm · CHF 19.90')], PRODUKTE, JETZT, medien_ok=lambda u: True)}
ok(not e4[1]['ok'] and any('Vergangenheit' in x for x in e4[1]['probleme']), 'weniger als 2 Stunden Vorlauf: Entwurf bleibt')
e5 = {x['id']: x for x in m.plane_lauf([post(1, '2026-11-10T21:00', ['tiktok'], 'Plüsch Panda, 15 cm · CHF 19.90')], PRODUKTE, JETZT, medien_ok=lambda u: True)}
ok(e5[1]['ok'], 'mehr als 2 Stunden Vorlauf: frei')
pp, _ = m.pruefe_produkte('Plüsch Panda: Geschenk unter CHF 19.90', PRODUKTE)
ok(any('unter CHF 19.9' in x for x in pp), '«unter» ist strikt: gleicher Preis verletzt die Grenze')
pp, _ = m.pruefe_produkte('Plüsch Panda: Geschenk bis CHF 19.90', PRODUKTE)
gl(pp, [], '«bis» ist einschliesslich: gleicher Preis passt')
fest = [post(20, '2026-11-11T07:00', ['tiktok'], 'Rose', draft=False), post(21, '2026-11-11T17:00', ['tiktok'], 'Rose', draft=False)]
e6 = {x['id']: x for x in m.plane_lauf(fest + [post(1, '2026-11-11T10:00', ['tiktok'], 'Plüsch Panda, 15 cm · CHF 19.90'),
                                              post(2, '2026-11-11T12:00', ['tiktok'], 'Plüsch Waschbär · CHF 20.90')], PRODUKTE, JETZT, medien_ok=lambda u: True)}
gl(e6[1]['neu'], D('2026-11-11T10:00'), 'ohne Platz mit vorläufigen Nachbarn bleibt die eigene Zeit, wenn sie frei ist')
gl(e6[2]['neu'], D('2026-11-11T13:00'), 'der Nachbar weicht danach aus')

print(f'metricool_freigabe_test.py: {n} Prüfungen bestanden')
