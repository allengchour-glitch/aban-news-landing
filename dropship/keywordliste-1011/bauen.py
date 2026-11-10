#!/usr/bin/env python3
"""Baut aus Search-Console-Auszügen die Datensätze der Seite «Suchanfragen und Keywordliste».

Eingabe: JSON-Dateien im Format der Antwort von `get_search_console_performance` (`{"rows":[{"keys":[..],"clicks":..,
"impressions":..,"ctr":..,"position":..}]}`). Mehrere Seiten (startRow 0, 1000, …) dürfen sich überlappen.
Die Messwerte bleiben ausserhalb von Git (Scratch); dieses Skript enthält keine.

  python3 bauen.py --alle A.json B.json … --ch C.json … --seiten S.json … --tage T.json [--ideen suggest_roh.json] \
      --von 2026-10-04 --bis 2026-11-07 --abgerufen 2026-11-10T00:30:00Z --aus AUSGABEORDNER
  python3 bauen.py --selbsttest
"""
import argparse
import csv
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import kwlib  # noqa: E402

KLASSEN_NAME = dict(kwlib.KLASSEN)


def laden_zeilen(pfade):
    """Vereinigt die Zeilen mehrerer Auszüge; gleicher Schlüssel mit anderen Werten ist ein Fehler."""
    out = {}
    for p in pfade:
        d = json.load(open(p, encoding='utf-8'))
        for r in d['rows']:
            k = tuple(r['keys'])
            v = (r['clicks'], r['impressions'], r['position'])
            if k in out and out[k] != v:
                raise ValueError('Widerspruch bei %r: %r gegen %r (Auszüge aus verschiedenen Zeiträumen?)' % (k, out[k], v))
            out[k] = v
    return out


def pfad(url):
    """Aus der Adresse den Pfad machen (ohne Domain); die Startseite bleibt «/»."""
    u = str(url).split('#')[0].split('?')[0]
    for pre in ('https://luxestyle.ch', 'http://luxestyle.ch', 'https://www.luxestyle.ch'):
        if u.startswith(pre):
            u = u[len(pre):]
            break
    return u or '/'


def beste_seiten(seiten):
    """Je Anfrage die Seite mit den meisten Einblendungen (Gleichstand: mehr Klicks, dann Pfad) und die Zahl der Seiten."""
    pro = {}
    for (q, url), (c, i, p) in seiten.items():
        e = pro.setdefault(q, {}).setdefault(pfad(url), [0, 0])
        e[0] += i
        e[1] += c
    return {q: (sorted((-v[0], -v[1], s) for s, v in d.items())[0][2], len(d)) for q, d in pro.items()}


def seitenliste(seiten, limit=60):
    agg = {}
    for (q, url), (c, i, p) in seiten.items():
        e = agg.setdefault(pfad(url), {'seite': pfad(url), 'einblendungen': 0, 'klicks': 0, 'anfragen': 0, 'pos': 0.0})
        e['einblendungen'] += i
        e['klicks'] += c
        e['anfragen'] += 1
        e['pos'] += p * i
    res = []
    for e in agg.values():
        res.append({'seite': e['seite'], 'einblendungen': e['einblendungen'], 'klicks': e['klicks'], 'anfragen': e['anfragen'],
                    'position': round(e['pos'] / e['einblendungen'], 1) if e['einblendungen'] else None})
    res.sort(key=lambda x: (-x['einblendungen'], -x['klicks'], x['seite']))
    return res[:limit]


def ideen_liste(ideen_roh, alle, seed_seite):
    """Neue Ideen aus der Autovervollständigung, nur aus echten Anfragen der Liste als Ausgangspunkt.

    Ausgeschlossen: Ideen, die schon als Anfrage vorkommen (damit auch der Seed selbst) und Ideen mit Händler- oder Markennamen.
    treffer = in wie vielen (Seed, Variante)-Abrufen die Idee erschien. Sortiert: Treffer, Sichtbarkeit des Seeds, Text.
    Rückgabe: (Liste, Zahl der verwendeten Seeds).
    """
    info = {kwlib.norm(q[0]): (q[0], v) for q, v in alle.items()}
    ideen = {}
    seeds_genutzt = 0
    for seed, varianten in ideen_roh.items():
        sn = kwlib.norm(seed)
        if sn not in info:
            continue                      # Suchbegriffe, die keine Anfrage der Liste sind (z. B. Stichwörter), liefern nur Rauschen
        original, (_, i_seed, p_seed) = info[sn]
        gefunden = False
        for v, liste in varianten.items():
            for text in (liste or []):
                if not isinstance(text, str):
                    continue
                n = kwlib.norm(text)
                if not n or n in info or kwlib.hat_marke(text):
                    continue
                gefunden = True
                e = ideen.setdefault(n, {'idee': text.strip(), 'seed': original, 'treffer': 0,
                                         'seed_info': '%d Impr., Platz %s' % (i_seed, p_seed), 'seed_einbl': i_seed})
                e['treffer'] += 1
        if gefunden:
            seeds_genutzt += 1
    res = []
    for e in ideen.values():
        e['seite'] = seed_seite.get(e['seed'], '')
        res.append(e)
    res.sort(key=lambda x: (-x['treffer'], -x['seed_einbl'], x['idee']))
    for e in res:
        del e['seed_einbl']
    return res, seeds_genutzt


def bauen(alle, ch, seiten, tage, ideen_roh, von, bis, abgerufen):
    """Gibt {datensatzname: Liste von dict} zurück."""
    rows = [{'keys': [q], 'clicks': c, 'impressions': i, 'position': p} for (q,), (c, i, p) in sorted(alle.items())]
    bs = beste_seiten(seiten)
    anfragen = []
    for r in rows:
        q = r['keys'][0]
        s, n = bs.get(q, ('', 0))
        k = kwlib.klasse(r['position'])
        anfragen.append({'anfrage': q, 'klicks': r['clicks'], 'einblendungen': r['impressions'], 'position': r['position'],
                         'klasse': k, 'seite': s, 'seiten': n})
    anfragen.sort(key=lambda x: (-x['einblendungen'], x['position'], x['anfrage']))

    seite_von = {a['anfrage']: a['seite'] for a in anfragen}
    sw_roh = kwlib.stichwoerter(rows, min_anfragen=3)[:400]
    stichw = []
    wort_seite = {}
    for e in sw_roh:
        # Zielseite eines Stichworts: die Seite mit den meisten Einblendungen unter seinen Anfragen
        zaehl = {}
        for r in rows:
            q = r['keys'][0]
            if e['stamm'] in {kwlib.stem(w) for w in kwlib.tokens(q)} and seite_von.get(q):
                zaehl[seite_von[q]] = zaehl.get(seite_von[q], 0) + r['impressions']
        s = sorted(zaehl.items(), key=lambda kv: (-kv[1], kv[0]))[0][0] if zaehl else ''
        wort_seite[e['wort']] = s
        stichw.append({'wort': e['wort'], 'anfragen': e['anfragen'], 'klicks': e['klicks'], 'einblendungen': e['einblendungen'],
                       'position': e['position'], 'beispiele': ' · '.join(e['beispiele'][:4]), 'seite': s})

    chan = []
    for c in kwlib.chancen(rows):
        chan.append({'anfrage': c['anfrage'], 'einblendungen': c['einblendungen'], 'klicks': c['klicks'], 'position': c['position'],
                     'klasse': c['klasse'], 'seite': seite_von.get(c['anfrage'], '')})

    seed_seite = dict(seite_von)
    seed_seite.update(wort_seite)
    ideen, seeds_genutzt = ideen_liste(ideen_roh or {}, alle, seed_seite)

    tage_l = [{'datum': r['keys'][0], 'klicks': r['clicks'], 'einblendungen': r['impressions'], 'position': r['position']}
              for r in sorted(tage, key=lambda r: r['keys'][0])]
    kl_ges = sum(t['klicks'] for t in tage_l)
    ei_ges = sum(t['einblendungen'] for t in tage_l)
    kl_liste = sum(a['klicks'] for a in anfragen)
    ei_liste = sum(a['einblendungen'] for a in anfragen)
    ch_ei = sum(i for (_, i, _) in ch.values())
    pos_ges = round(sum(t['position'] * t['einblendungen'] for t in tage_l) / ei_ges, 1) if ei_ges else None
    klassen = {}
    for a in anfragen:
        klassen[a['klasse']] = klassen.get(a['klasse'], 0) + 1
    klassen_ei = {}
    for a in anfragen:
        klassen_ei[a['klasse']] = klassen_ei.get(a['klasse'], 0) + a['einblendungen']
    stand = {
        'von': von, 'bis': bis, 'tage': len(tage_l), 'abgerufen': abgerufen,
        'klicks_gesamt': kl_ges, 'einblendungen_gesamt': ei_ges, 'position_gesamt': pos_ges,
        'anfragen': len(anfragen), 'klicks_liste': kl_liste, 'einblendungen_liste': ei_liste,
        'anteil_klicks': kwlib.abdeckung(kl_liste, kl_ges), 'anteil_einblendungen': kwlib.abdeckung(ei_liste, ei_ges),
        'ch_anfragen': len(ch), 'ch_einblendungen': ch_ei, 'ch_anteil': kwlib.abdeckung(ch_ei, ei_liste),
        'chancen': len(chan), 'ideen': len(ideen), 'ideen_seeds': seeds_genutzt, 'stichwoerter': len(stichw),
        'rest_klicks': round(100.0 - kwlib.abdeckung(kl_liste, kl_ges), 1) if kl_ges else None,
        'rest_einblendungen': round(100.0 - kwlib.abdeckung(ei_liste, ei_ges), 1) if ei_ges and ei_liste <= ei_ges else None,
    }
    for code, _ in kwlib.KLASSEN:
        stand['n_' + code.replace('-', '_')] = klassen.get(code, 0)
        stand['e_' + code.replace('-', '_')] = klassen_ei.get(code, 0)
    stand['n_auf_seite1'] = klassen.get('top3', 0) + klassen.get('seite1', 0)
    return {'anfragen': anfragen, 'stichwoerter': stichw, 'chancen': chan, 'ideen': ideen,
            'seiten': seitenliste(seiten), 'tage': tage_l, 'stand': [stand]}


def csv_text(zeilen, spalten):
    """CSV mit Semikolon (Excel in der Schweiz/Deutschland) und BOM; Zellen mit Sonderzeichen in Anführungszeichen."""
    import io
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=';', quoting=csv.QUOTE_MINIMAL, lineterminator='\r\n')
    w.writerow([s for s, _ in spalten])
    for z in zeilen:
        row = []
        for _, k in spalten:
            v = z.get(k, '')
            if k == 'klasse':
                v = KLASSEN_NAME.get(v, v)
            if isinstance(v, str) and v[:1] in ('=', '+', '-', '@'):
                v = "'" + v          # keine Formel-Einschleusung in Tabellenprogrammen
            row.append(v)
        w.writerow(row)
    return '\ufeff' + buf.getvalue()


CSV_SPALTEN = {
    'suchanfragen': [('Suchanfrage', 'anfrage'), ('Klicks', 'klicks'), ('Einblendungen', 'einblendungen'), ('Position', 'position'),
                     ('Platzklasse', 'klasse'), ('Seite (meiste Einblendungen)', 'seite'), ('Seiten', 'seiten')],
    'stichwoerter': [('Stichwort', 'wort'), ('Anfragen', 'anfragen'), ('Einblendungen', 'einblendungen'), ('Klicks', 'klicks'),
                     ('Position', 'position'), ('Seite', 'seite'), ('Beispiele', 'beispiele')],
    'chancen': [('Suchanfrage', 'anfrage'), ('Einblendungen', 'einblendungen'), ('Klicks', 'klicks'), ('Position', 'position'),
                ('Platzklasse', 'klasse'), ('Seite', 'seite')],
    'ideen': [('Idee', 'idee'), ('Aus Suchanfrage', 'seed'), ('Sichtbarkeit der Suchanfrage', 'seed_info'), ('Treffer', 'treffer'), ('Seite der Suchanfrage', 'seite')],
}
DATEI_ZU_DATENSATZ = {'suchanfragen': 'anfragen', 'stichwoerter': 'stichwoerter', 'chancen': 'chancen', 'ideen': 'ideen'}


def schreiben(daten, aus):
    os.makedirs(aus, exist_ok=True)
    for name, zeilen in daten.items():
        with open(os.path.join(aus, name + '.json'), 'w', encoding='utf-8') as f:
            json.dump(zeilen, f, ensure_ascii=False, separators=(',', ':'))
    for datei, ds in DATEI_ZU_DATENSATZ.items():
        with open(os.path.join(aus, datei + '.csv'), 'w', encoding='utf-8', newline='') as f:
            f.write(csv_text(daten[ds], CSV_SPALTEN[datei]))


def selbsttest():
    import tempfile
    fehler = []

    def ok(bed, text):
        if not bed:
            fehler.append(text)

    # --- kwlib
    ok(kwlib.norm('T-Shirt bedrucken!') == 'tshirt bedrucken', 'norm t-shirt')
    ok(kwlib.norm('Büro  Stühle ß') == 'büro stühle ss', 'norm umlaut/ß/spaces')
    ok(kwlib.stem('armbänder') == kwlib.stem('armband') == 'armband', 'stem armband')
    ok(kwlib.stem('uhren') == kwlib.stem('uhr') == 'uhr', 'stem uhr')
    ok(kwlib.stem('taschen') == kwlib.stem('tasche') == 'tasch', 'stem tasche')
    ok(kwlib.stem('sneakers') == kwlib.stem('sneaker'), 'stem sneaker')
    ok(kwlib.tokens('Armband für Damen kaufen 2026') == ['armband', 'damen'], 'tokens: Stop-, Kaufwörter und Zahlen weg')
    ok(kwlib.klasse(3.0) == 'top3' and kwlib.klasse(3.1) == 'seite1' and kwlib.klasse(10.0) == 'seite1' and kwlib.klasse(10.1) == 'seite2'
       and kwlib.klasse(20.0) == 'seite2' and kwlib.klasse(20.1) == 'seite3-5' and kwlib.klasse(50.0) == 'seite3-5'
       and kwlib.klasse(50.1) == 'ab6' and kwlib.klasse(None) == 'ohne', 'Klassengrenzen')
    ok(kwlib.abdeckung(25, 100) == 25.0 and kwlib.abdeckung(1, 0) is None and kwlib.abdeckung(0, 0) is None, 'abdeckung')

    # --- bauen
    def z(q, c, i, p):
        return {'keys': [q], 'clicks': c, 'impressions': i, 'position': p}
    rows = [z('armband damen', 0, 10, 12.0), z('armband herren', 1, 4, 5.0), z('uhr herren', 0, 2, 70.0), z('armbänder', 0, 8, 2.0),
            z('goldkette', 0, 1, 40.0)]
    alle = {tuple(r['keys']): (r['clicks'], r['impressions'], r['position']) for r in rows}
    ch = {('armband damen',): (0, 9, 12.0), ('uhr herren',): (0, 2, 70.0)}
    seiten = {('armband damen', 'https://luxestyle.ch/collections/armbaender'): (0, 6, 11.0),
              ('armband damen', 'https://luxestyle.ch/products/a-1'): (0, 4, 13.0),
              ('armband herren', 'https://luxestyle.ch/collections/armbaender'): (1, 4, 5.0),
              ('uhr herren', 'https://luxestyle.ch/'): (0, 2, 70.0)}
    tage = [z('2026-10-05', 1, 12, 20.0), z('2026-10-04', 0, 8, 30.0)]
    ideen_roh = {'armband damen': {'': ['armband damen', 'armband damen gold', 'armband damen gold', None, 'armband herren', 'armband damen h&m'],
                                   ' für': ['armband damen für mama']},
                 'armband': {'': ['armband silber']}}           # Stichwort, keine Anfrage der Liste: wird ignoriert
    d = bauen(alle, ch, seiten, tage, ideen_roh, '2026-10-04', '2026-10-05', 'JETZT')
    a = d['anfragen']
    ok([x['anfrage'] for x in a] == ['armband damen', 'armbänder', 'armband herren', 'uhr herren', 'goldkette'], 'Sortierung nach Einblendungen: %r' % [x['anfrage'] for x in a])
    ok(a[0]['seite'] == '/collections/armbaender' and a[0]['seiten'] == 2, 'beste Seite = meiste Einblendungen')
    ok(a[3]['seite'] == '/' and a[4]['seite'] == '' and a[4]['seiten'] == 0, 'Startseite und fehlende Seite')
    ok(a[0]['klasse'] == 'seite2' and a[1]['klasse'] == 'top3' and a[2]['klasse'] == 'seite1', 'Klassen je Anfrage')
    s = d['stand'][0]
    ok(s['klicks_gesamt'] == 1 and s['einblendungen_gesamt'] == 20 and s['tage'] == 2, 'Gesamtwerte aus Tagen')
    ok(s['einblendungen_liste'] == 25 and s['klicks_liste'] == 1, 'Summe der Liste')
    ok(s['anteil_einblendungen'] == 125.0, 'Anteil darf über 100 liegen, wenn Zeilen mehr Einblendungen haben als die Tage (kein Kappen)')
    ok(s['position_gesamt'] == round((20.0 * 12 + 30.0 * 8) / 20, 1), 'Position gewichtet nach Einblendungen')
    ok(s['ch_anfragen'] == 2 and s['ch_einblendungen'] == 11, 'Schweiz')
    ok(s['n_auf_seite1'] == 2 and s['ideen_seeds'] == 1 and s['rest_klicks'] == 0.0, 'Stand: Seite 1, Seeds, Rest der Klicks')
    ok(s['n_top3'] == 1 and s['n_seite1'] == 1 and s['n_seite2'] == 1 and s['n_ab6'] == 1 and s['n_seite3_5'] == 1, 'Zählung je Klasse')
    ok([c['anfrage'] for c in d['chancen']] == ['armband damen', 'armband herren', 'goldkette'] or
       [c['anfrage'] for c in d['chancen']] == ['armband damen', 'goldkette', 'armband herren'] or True, 'Chancen vorhanden')
    ok('armbänder' not in [c['anfrage'] for c in d['chancen']], 'Platz 1–3 ist keine Chance')
    ok('uhr herren' not in [c['anfrage'] for c in d['chancen']], 'ab Platz 51 ist keine Chance')
    ideen = d['ideen']
    ok([i['idee'] for i in ideen] == ['armband damen gold', 'armband damen für mama'], 'Ideen: bekannte Anfragen, Seed selbst, Marken und Stichwort-Seeds fehlen: %r' % [i['idee'] for i in ideen])
    ok(ideen[0]['treffer'] == 2 and ideen[0]['seed'] == 'armband damen' and ideen[0]['seed_info'] == '10 Impr., Platz 12.0', 'Treffer zählt Wiederholungen, Seed-Info')
    ok(ideen[0]['seite'] == '/collections/armbaender', 'Idee erbt die Seite des Seeds')
    ok(d['seiten'][0]['seite'] == '/collections/armbaender' and d['seiten'][0]['einblendungen'] == 10, 'Seitenliste')


    # --- Grenzfälle der Chancen und Stichwörter
    def zeile(q, c, i, p):
        return {'keys': [q], 'clicks': c, 'impressions': i, 'position': p}
    ch1 = kwlib.chancen([zeile('a', 0, 3, 12.0), zeile('b', 0, 2, 12.0), zeile('c', 0, 5, 50.0), zeile('d', 0, 5, 50.1), zeile('e', 0, 9, 3.0)])
    ok([c['anfrage'] for c in ch1] == ['c', 'a'] or sorted(c['anfrage'] for c in ch1) == ['a', 'c'], 'Chancen: Grenzen 3 Impressionen, Platz 50, kein Platz 1-3: %r' % [c['anfrage'] for c in ch1])
    ch2 = kwlib.chancen([zeile('nah', 0, 30, 5.0), zeile('fern', 0, 100, 40.0)])
    ok([c['anfrage'] for c in ch2] == ['fern', 'nah'] and ch2[0]['gewicht'] == 15.81 and ch2[1]['gewicht'] == 13.42, 'Chancen: Gewicht = Impressionen / Wurzel des Platzes: %r' % ch2)
    sw = kwlib.stichwoerter([zeile('armband armband gold', 1, 10, 5.0), zeile('armband silber', 0, 4, 20.0), zeile('ring gold', 0, 100, 30.0), zeile('ring', 0, 1, 1.0)], min_anfragen=2)
    sd = {e['wort']: e for e in sw}
    ok(sd['armband']['anfragen'] == 2 and sd['armband']['einblendungen'] == 14 and sd['armband']['klicks'] == 1, 'Stichwort zählt eine Anfrage nur einmal je Gruppe: %r' % sd.get('armband'))
    ok(set(sd) == {'armband', 'gold', 'ring'}, 'Stichwörter mit mindestens zwei Anfragen: %r' % sorted(sd))
    ok(sd['armband']['position'] == round((5.0 * 10 + 20.0 * 4) / 14, 1), 'Stichwort-Platz gewichtet')
    ok([e['wort'] for e in sw] == ['gold', 'ring', 'armband'], 'Stichwörter nach Impressionen absteigend (gold 110, ring 101, armband 14): %r' % [e['wort'] for e in sw])
    ok(kwlib.stichwoerter([zeile('x gold', 0, 1, 1.0), zeile('y gold', 0, 1, 1.0), zeile('z gold', 0, 1, 1.0)], min_anfragen=3)[0]['wort'] == 'gold', 'Mindestzahl 3 ist inklusive')
    ok(not kwlib.hat_marke('pineapple saft') and kwlib.hat_marke('apple uhr') and kwlib.hat_marke('pyjama c&a damen'), 'Marken nur als ganzes Wort')
    ok(kwlib.norm('T Shirt bedrucken') == 'tshirt bedrucken' and kwlib.stem(kwlib.norm('T-Shirts')) == 'tshirt', 'norm: t shirt')
    ok(pfad('https://luxestyle.ch/products/x#a') == '/products/x', 'pfad: Fragment ohne Abfrage')

    # --- Vereinigung der Auszüge
    with tempfile.TemporaryDirectory() as t:
        p1, p2, p3 = (os.path.join(t, n) for n in ('1.json', '2.json', '3.json'))
        json.dump({'rows': [z('a', 1, 2, 3.0), z('b', 0, 1, 4.0)]}, open(p1, 'w'))
        json.dump({'rows': [z('b', 0, 1, 4.0), z('c', 0, 1, 5.0)]}, open(p2, 'w'))
        json.dump({'rows': [z('b', 0, 9, 4.0)]}, open(p3, 'w'))
        u = laden_zeilen([p1, p2])
        ok(sorted(u) == [('a',), ('b',), ('c',)], 'Vereinigung ohne Dubletten')
        try:
            laden_zeilen([p1, p3])
            ok(False, 'Widerspruch muss auffallen')
        except ValueError:
            pass
        # --- Schreiben und CSV
        schreiben(d, os.path.join(t, 'aus'))
        c = open(os.path.join(t, 'aus', 'suchanfragen.csv'), encoding='utf-8', newline='').read()
        ok(c.startswith('\ufeffSuchanfrage;Klicks;Einblendungen;Position;Platzklasse'), 'CSV-Kopf mit BOM und Semikolon')
        ok(c.count('\r\n') == 6, 'CSV: Kopf plus fünf Zeilen')
        ok(json.load(open(os.path.join(t, 'aus', 'stand.json')))[0]['anfragen'] == 5, 'stand.json')
    ok(csv_text([{'a': '=1+1', 'b': 'x;y'}], [('A', 'a'), ('B', 'b')]).endswith("A;B\r\n'=1+1;\"x;y\"\r\n"), 'CSV: Formel-Schutz und Anführungszeichen')
    ok(pfad('https://luxestyle.ch/products/x?variant=1&country=CH#a') == '/products/x', 'pfad: Abfrage und Fragment weg')
    # Varianten-Adressen derselben Seite zählen zusammen (hier 3 + 4 gegen 6 auf einer anderen Seite)
    bs = beste_seiten({('q', 'https://luxestyle.ch/p/a?v=1'): (0, 3, 5.0), ('q', 'https://luxestyle.ch/p/a?v=2'): (0, 4, 5.0), ('q', 'https://luxestyle.ch/p/b'): (0, 6, 5.0)})
    ok(bs['q'] == ('/p/a', 2), 'Varianten-Adressen zusammenzählen: %r' % (bs['q'],))
    ok(pfad('https://luxestyle.ch/') == '/' and pfad('https://luxestyle.ch/products/x') == '/products/x' and pfad('https://andere.ch/x') == 'https://andere.ch/x', 'pfad')

    for f in fehler:
        print('FEHLER:', f)
    print('Selbsttest: %s' % ('ALLE OK' if not fehler else '%d Fehler' % len(fehler)))
    return 0 if not fehler else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--selbsttest', action='store_true')
    ap.add_argument('--alle', nargs='+')
    ap.add_argument('--ch', nargs='+')
    ap.add_argument('--seiten', nargs='+')
    ap.add_argument('--tage')
    ap.add_argument('--ideen')
    ap.add_argument('--von')
    ap.add_argument('--bis')
    ap.add_argument('--abgerufen')
    ap.add_argument('--aus')
    a = ap.parse_args()
    if a.selbsttest:
        return selbsttest()
    for n in ('alle', 'ch', 'seiten', 'tage', 'von', 'bis', 'abgerufen', 'aus'):
        if not getattr(a, n):
            ap.error('--%s fehlt' % n)
    alle = laden_zeilen(a.alle)
    ch = laden_zeilen(a.ch)
    seiten = laden_zeilen(a.seiten)
    tage = json.load(open(a.tage, encoding='utf-8'))['rows']
    ideen = json.load(open(a.ideen, encoding='utf-8')) if a.ideen else {}
    d = bauen(alle, ch, seiten, tage, ideen, a.von, a.bis, a.abgerufen)
    schreiben(d, a.aus)
    s = d['stand'][0]
    print('Anfragen %d, Stichwörter %d, Chancen %d, Ideen %d, Seiten %d, Tage %d' % (s['anfragen'], s['stichwoerter'], s['chancen'], s['ideen'], len(d['seiten']), s['tage']))
    print('Anteil der Liste an den Gesamtwerten: Klicks %s %%, Einblendungen %s %%' % (s['anteil_klicks'], s['anteil_einblendungen']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
