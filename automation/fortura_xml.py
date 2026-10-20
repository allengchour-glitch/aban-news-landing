#!/usr/bin/env python3
"""fortura_xml.py — Fortura-Bestellung als Opacc.ORDERS-XML bauen, hochladen, Versandmeldungen (DELVRY) lesen (06.10.2026).

Quelle des Formats: Musterdateien von Fortura (R. Papini, Mail 06.10.2026 14:56) — `dropship/fortura/Opacc_Orders_Template.xml`,
`Opacc_Orders_Muster.xml`, `Opacc_Delvry_Template.xml`. Pflichtfelder laut Template:
  HEADER/DOC_NO (unsere Auftragsnummer) · CUSTOMER/CUST_NO (544341) · DELIVERYADDR/FIRSTNAME, LASTNAME, STREET, ZIP, CITY, EMAIL
  («für DPD-PRO») · POSITIONS/POS/ARTICLE_NO + QUANTITY (je Position). Optional: SHIPMENT (nur «EXPRESS»), DELIVERYDATE,
  HEADER/TEXT (nicht auf dem Lieferschein), COMPANY, EXTRALINE, POS_NO, EAN, POS/TEXT.
Ablage: SYNO.FileStation über https://webtransfer.fortura.ch (Port 443, Zugang /tmp/fortura_env.sh) — Bestellungen nach
/home/ORDERS, Fortura legt Lieferscheine nach /home/DESADV (Format Opacc.DELVRY: ORDER_NO = unsere DOC_NO, TRACKING_NO DPD).

  python3 automation/fortura_xml.py --selbsttest     # baut aus einem Testpaket, prüft gegen das Template (kein Netz)
  python3 automation/fortura_xml.py --liste          # zeigt /home/ORDERS und /home/DESADV (nur lesen)
"""
import json, os, re, subprocess, sys, tempfile, time
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
TEMPLATE = os.path.join(REPO, 'dropship', 'fortura', 'Opacc_Orders_Template.xml')
KUNDENNR = '544341'
BASIS = 'https://webtransfer.fortura.ch'
PFLICHT_ADR = ('FIRSTNAME', 'LASTNAME', 'STREET', 'ZIP', 'CITY', 'EMAIL')
ARTNR = r'[0-9A-Z][0-9A-Z.\-]{2,19}'      # Feed 13.10.: 59774, 90404-2, BO01520, CK-404, OR47166.01, 042156 (20'198 ArtNr, 0 klein → «fortura-x» bleibt unplausibel)
FEED = '/tmp/fortura_feed.csv'


def _t(x):
    return escape(str(x or '').strip())


def bau_orders_xml(nr, adresse, email, positionen, text=''):
    """adresse: Shopify shippingAddress (firstName,lastName,company,address1,address2,zip,city,countryCodeV2);
    positionen: [{'artnr','ean','menge'}]. Gibt (xml_text, fehlerliste) zurück — bei Fehlern NICHT hochladen."""
    a = adresse or {}
    vor, nach = (a.get('firstName') or '').strip(), (a.get('lastName') or '').strip()
    if not (vor and nach) and a.get('name'):
        teile = a['name'].strip().split()
        vor, nach = vor or ' '.join(teile[:-1]) or teile[0], nach or teile[-1]
    felder = {'COMPANY': a.get('company'), 'FIRSTNAME': vor, 'LASTNAME': nach, 'EXTRALINE': a.get('address2'),
              'STREET': a.get('address1'), 'ZIP': a.get('zip'), 'CITY': a.get('city'), 'EMAIL': email}
    fehler = [f'{k} fehlt' for k in PFLICHT_ADR if not str(felder.get(k) or '').strip()]
    if (a.get('countryCodeV2') or 'CH') != 'CH':
        fehler.append(f"Lieferland {a.get('countryCodeV2')} ≠ CH")
    if not positionen:
        fehler.append('keine Positionen')
    for p in positionen:
        # 13.10.2026 (Trockenlauf): hier stand `\d{3,8}` — 2'442 von 4'003 aktiven Fortura-Varianten (Kostüm-Grössen «90404-2»,
        # «BO01520», «CK9999M», «PC28601» …) wären als «unplausibel» NIE per XML gegangen. Form wie im Feed (Spalte ArtNr).
        if not re.fullmatch(ARTNR, str(p.get('artnr') or '')):
            fehler.append(f"Artikelnummer «{p.get('artnr')}» unplausibel")
        if not (isinstance(p.get('menge'), int) and p['menge'] > 0):
            fehler.append(f"Menge «{p.get('menge')}» unplausibel")
        # 13.10.2026: Internet_VE > 1 = der Shop verkauft das Bündel (Draculagebiss «10 Stück»), VP1 ist ein STÜCKpreis. Ob
        # QUANTITY in Stück oder in VE zählt, sagt das Template nicht → bis Fortura es bestätigt: kein Raten, Portal-Weg.
        # 13.10.2026 Nachtrag (N4): «ve» vorhanden, aber None = Feed fehlt oder Artikel nicht im Feed → VE unprüfbar → kein XML.
        if 've' in p and p['ve'] is None:
            fehler.append(f"Artikel {p.get('artnr')}: VE unbekannt (Feed {FEED} fehlt oder Artikel nicht im Feed)")
        elif (p.get('ve') or 1) > 1:
            fehler.append(f"Artikel {p.get('artnr')} hat VE {p['ve']} — QUANTITY Stück oder VE? bei Fortura klären")
    adr = '\n'.join(f'\t\t\t<{k}>{_t(v)}</{k}>' for k, v in felder.items())
    pos = '\n'.join(
        f'\t\t\t<POS>\n\t\t\t\t<POS_NO>{(i + 1) * 10}</POS_NO>\n\t\t\t\t<ARTICLE_NO>{_t(p["artnr"])}</ARTICLE_NO>\n'
        f'\t\t\t\t<EAN>{_t(p.get("ean"))}</EAN>\n\t\t\t\t<QUANTITY>{int(p["menge"])}</QUANTITY>\n\t\t\t\t<TEXT></TEXT>\n\t\t\t</POS>'
        for i, p in enumerate(positionen))
    x = ('<?xml version="1.0" encoding="UTF-8"?>\n<Opacc.ORDERS>\n\t<DOC>\n\t\t<HEADER>\n'
         f'\t\t\t<DOC_NO>{_t(nr)}</DOC_NO>\n\t\t\t<SHIPMENT></SHIPMENT>\n\t\t\t<DELIVERYDATE></DELIVERYDATE>\n'
         f'\t\t\t<TEXT>{_t(text)}</TEXT>\n\t\t</HEADER>\n\t\t<CUSTOMER>\n\t\t\t<CUST_NO>{KUNDENNR}</CUST_NO>\n\t\t</CUSTOMER>\n'
         f'\t\t<DELIVERYADDR>\n{adr}\n\t\t</DELIVERYADDR>\n\t\t<POSITIONS>\n{pos}\n\t\t</POSITIONS>\n\t</DOC>\n</Opacc.ORDERS>\n')
    fehler += gegen_template(x)
    return x, fehler


def _pfade(el, p=''):
    out = set()
    for c in el:
        q = f'{p}/{c.tag}'
        out.add(q); out |= _pfade(c, q)
    return out


def gegen_template(xml_text):
    """Jeder Pfad im Ergebnis muss im Fortura-Template vorkommen und umgekehrt (gleiches Gerüst)."""
    try:
        neu = ET.fromstring(xml_text.encode('utf-8'))
    except ET.ParseError as e:
        return [f'XML ungültig: {e}']
    tpl = ET.parse(TEMPLATE).getroot()
    if neu.tag != tpl.tag:
        return [f'Wurzel {neu.tag} ≠ {tpl.tag}']
    a, b = _pfade(neu), _pfade(tpl)
    return [f'Pfad fehlt: {x}' for x in sorted(b - a)] + [f'Pfad fremd: {x}' for x in sorted(a - b)]


# ── SYNO.FileStation ────────────────────────────────────────────────────────────────────────────────────────────────────
def _zugang():
    if not os.path.exists('/tmp/fortura_env.sh'):
        raise RuntimeError('FORTURA-ZUGANG WEG (/tmp/fortura_env.sh fehlt)')
    env = dict(re.findall(r'export (\w+)=["\']?([^"\'\n]*)', open('/tmp/fortura_env.sh').read()))
    return env['FORTURA_FTP_USER'], env['FORTURA_FTP_PW']


def _curl(args, timeout=120, roh=False):
    # roh=True → Bytes. 13.10.2026: Fortura liefert den Feed in cp1252; ein DELVRY in ISO-8859-1 mit «ä» hätte text=True mit
    # UnicodeDecodeError abgebrochen (ganzer Stufe-2-Lauf ⚠️, kein Tracking). Bytes gibt ET.fromstring selbst die Kodierung.
    r = subprocess.run(['curl', '-sS', '-k', '--max-time', str(timeout)] + args, capture_output=True, text=not roh)
    if r.returncode:
        err = r.stderr if not roh else r.stderr.decode('utf-8', 'replace')
        raise RuntimeError(f'curl {r.returncode}: {err[:160]}')
    return r.stdout


def anmelden():
    u, p = _zugang()
    d = json.loads(_curl(['-X', 'POST', f'{BASIS}/webapi/entry.cgi', '--data-urlencode', 'api=SYNO.API.Auth',
                          '--data-urlencode', 'version=6', '--data-urlencode', 'method=login', '--data-urlencode', f'account={u}',
                          '--data-urlencode', f'passwd={p}', '--data-urlencode', 'session=FileStation', '--data-urlencode', 'format=sid']))
    if not d.get('success'):
        raise RuntimeError(f'Fortura-Login: {d.get("error")}')
    return d['data']['sid']


def abmelden(sid):
    try:
        _curl([f'{BASIS}/webapi/entry.cgi?api=SYNO.API.Auth&version=1&method=logout&session=FileStation&_sid={sid}'], 30)
    except Exception:
        pass


def liste(sid, ordner):
    d = json.loads(_curl(['-G', f'{BASIS}/webapi/entry.cgi', '--data-urlencode', 'api=SYNO.FileStation.List',
                          '--data-urlencode', 'version=2', '--data-urlencode', 'method=list', '--data-urlencode', f'folder_path={ordner}',
                          '--data-urlencode', '_sid=' + sid]))
    if not d.get('success'):
        raise RuntimeError(f'Liste {ordner}: {d.get("error")}')
    return [f['name'] for f in d['data']['files'] if not f['isdir']]


def hochladen(sid, ordner, name, inhalt):
    with tempfile.TemporaryDirectory() as td:
        pfad = os.path.join(td, name)
        open(pfad, 'w', encoding='utf-8').write(inhalt)
        d = json.loads(_curl(['-X', 'POST', f'{BASIS}/webapi/entry.cgi?api=SYNO.FileStation.Upload&version=2&method=upload&_sid={sid}',
                              '-F', f'path={ordner}', '-F', 'create_parents=false', '-F', 'overwrite=false',
                              '-F', f'file=@{pfad};filename={name};type=application/xml'], 300))
    if not d.get('success'):
        raise RuntimeError(f'Upload {name}: {d.get("error")}')
    return True


def herunterladen(sid, pfad):
    return _curl(['-G', f'{BASIS}/webapi/entry.cgi', '--data-urlencode', 'api=SYNO.FileStation.Download',
                  '--data-urlencode', 'version=2', '--data-urlencode', 'method=download', '--data-urlencode', f'path={pfad}',
                  '--data-urlencode', 'mode=download', '--data-urlencode', '_sid=' + sid], 120, roh=True)


def norm_artnr(a):
    """13.10.2026 Nachtrag (N2): Vergleichsform einer Fortura-Artikelnummer — ohne Leerraum, gross, ohne führende Nullen
    («042156» = «42156», « 93583 » = «93583»). Nur zum VERGLEICHEN; ins XML geht immer die Nummer wie im Feed."""
    return re.sub(r'\s+', '', str(a or '')).upper().lstrip('0') or '0'


def werktag_stunden(von, bis):
    """20.10.2026 (Härtung 6): Stunden zwischen zwei Zeitpunkten OHNE Samstag/Sonntag (UTC-Kalendertage; Fortura arbeitet Mo–Fr). Beide
    Zeitpunkte mit Zeitzone (oder beide ohne). Eine Freitag-Abend-Bestellung soll nicht am Samstag «seit 24 h ohne Lieferschein» melden."""
    import datetime as _dt
    if bis <= von:
        return 0.0
    gesamt, t = 0.0, von
    while t < bis:
        naechster_tag = (t + _dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        ende = min(bis, naechster_tag)
        if t.weekday() < 5:
            gesamt += (ende - t).total_seconds() / 3600
        t = ende
    return gesamt


def ve_aus_feed(artnrs, pfad=None):
    """{artnr: Internet_VE} aus dem täglichen Feed (cp1252, «|»). Artikel, die im Feed fehlen, fehlen auch im Ergebnis.
    13.10.2026 Nachtrag (N4): Feed fehlt/unlesbar → None (früher {} = keine VE-Sperre, fail-open). Aufrufer: None → kein XML."""
    import csv
    pfad = pfad or FEED                       # zur Laufzeit lesen (Selbsttest der Engine biegt FEED um)
    exakt, locker, gesucht = {}, {}, {norm_artnr(a): a for a in artnrs}
    try:
        with open(pfad, encoding='cp1252', newline='') as f:
            r = csv.reader(f, delimiter='|'); kopf = next(r); a, v = kopf.index('ArtNr'), kopf.index('Internet_VE')
            for z in r:
                if len(z) > v and norm_artnr(z[a]) in gesucht:
                    ziel = gesucht[norm_artnr(z[a])]
                    try:
                        ve = max(1, round(float(z[v].replace(',', '.') or 1)))
                    except ValueError:
                        ve = 1
                    if z[a].strip() == str(ziel).strip():
                        exakt[ziel] = ve                          # 20.10.2026: Treffer auf die EXAKTE Nummer schlägt jeden normalisierten
                    else:
                        locker[ziel] = max(locker.get(ziel, 1), ve)    # mehrere lockere Treffer (0123/123): die grössere VE gilt (Bündel nie unterschätzen)
    except (OSError, ValueError, StopIteration, UnicodeDecodeError):
        return None
    return {**locker, **exakt}


def bestand_aus_feed(artnrs, pfad=None):
    """{artnr: Lagerbestand Fortura} aus dem Feed (cp1252, «|»); Artikel, die im Feed fehlen, fehlen auch im Ergebnis.
    20.10.2026 (Bestellung #1027): NUR die Spalte «Lagerbestand Fortura» — «Lagerbestand Total» enthält den Bazar-Bestand (Fortura-
    eigener Laden), den Fortura nicht ausliefert (Schwingerhose: Bazar 2 / Fortura 0 / Total 2 → Storno «nicht mehr an Lager»).
    Feed fehlt/unlesbar oder Spalte fehlt → None (fail-closed, nie Rückfall auf Total)."""
    import csv
    pfad = pfad or FEED
    exakt, locker, gesucht = {}, {}, {norm_artnr(a): a for a in artnrs}
    try:
        with open(pfad, encoding='cp1252', newline='') as f:
            r = csv.reader(f, delimiter='|'); kopf = next(r)
            a, b = kopf.index('ArtNr'), kopf.index('Lagerbestand Fortura')
            for z in r:
                if len(z) > b and norm_artnr(z[a]) in gesucht:
                    zahl = menge_zahl(z[b])
                    zahl = zahl if zahl is not None else 0         # unlesbar = 0 (sichere Richtung)
                    ziel = gesucht[norm_artnr(z[a])]
                    if z[a].strip() == str(ziel).strip():
                        exakt[ziel] = zahl                         # 20.10.2026: exakte Nummer schlägt jeden normalisierten Treffer
                    else:
                        locker[ziel] = min(locker.get(ziel, zahl), zahl)    # mehrere lockere Treffer (0123/123): der kleinere Bestand gilt
    except (OSError, ValueError, StopIteration, UnicodeDecodeError):
        return None
    return {**locker, **exakt}


def menge_zahl(s):
    """13.10.2026 Nachtrag (N3/O2): Mengenfeld aus dem Lieferschein → int, sonst None (nie Absturz).
    «2», «2.0», «2.000», «2,000» → 2 (ein einzelnes Trennzeichen = Dezimalzeichen: Opacc schreibt Mengen mit Nachkommastellen,
    1000 Stück sind bei Dropship-Einzelbestellungen unplausibel); «1'000» / «1.000,00» / «1,000.00» → 1000 (Tausender eindeutig);
    «2,5», «», «abc» → None."""
    t = re.sub(r"\s+", '', str(s or '')).replace("'", '').replace('’', '')
    if not t:
        return None
    if ',' in t and '.' in t:
        dez = ',' if t.rindex(',') > t.rindex('.') else '.'
        t = t.replace('.' if dez == ',' else ',', '').replace(dez, '.')
    elif t.count(',') + t.count('.') > 1:
        t = t.replace(',', '').replace('.', '')          # 1.234.567 → Tausender
    else:
        t = t.replace(',', '.')
    try:
        from decimal import Decimal, InvalidOperation
        d = Decimal(t)
    except (InvalidOperation, ValueError):
        return None
    return int(d) if d == d.to_integral_value() and d >= 0 else None


def positionen_aus_text(txt):
    """Ledger-Spalte «93583×2, 90654-2×1» → {'93583': 2, '90654-2': 1} (unsere Bestellung, Grundlage des Abgleichs)."""
    out = {}
    for teil in str(txt or '').split(','):
        teil = teil.strip()
        if '×' in teil:
            a, m = teil.rsplit('×', 1)
            out[a.strip()] = out.get(a.strip(), 0) + (menge_zahl(m) or 0)
    return out


def abgleich(bestellt, positionen):
    """13.10.2026 Nachtrag (N2/N3): Lieferschein gegen UNSERE Bestellung — nie die Mengen des Lieferscheins gegen sich selbst.
    bestellt: {artnr: menge} (Ledger); positionen: lies_delvry()[i]['positionen'].
    → (geliefert {norm_artnr: menge} NUR für bestellte Artikel, fehlt [«A g/b»], fremd [«…»]).
    fremd = Position mit unbekannter Artikelnummer (Ersatzartikel), unlesbare Menge oder Mehrlieferung → Status «abweichend»."""
    soll = {}
    for a, m in bestellt.items():
        soll[norm_artnr(a)] = (a, soll.get(norm_artnr(a), (a, 0))[1] + m)
    geliefert, fremd = {}, []
    for a, _b, g, text in positionen:
        n, gz = norm_artnr(a), menge_zahl(g)
        if gz is None:
            fremd.append(f"{a or '?'} Menge «{g}» unlesbar"); continue
        if n not in soll:
            if gz > 0:
                fremd.append(f"{a or '?'}×{gz} nicht bestellt{(' (' + text[:40] + ')') if text else ''}")
            continue
        geliefert[n] = geliefert.get(n, 0) + gz
    fehlt = []
    for n, (a, m) in soll.items():
        g = geliefert.get(n, 0)
        if g < m:
            fehlt.append(f'{a} {g}/{m}')
        elif g > m:
            fremd.append(f'{a} {g}/{m} zu viel')
    return geliefert, fehlt, fremd


def _xml_wurzel(roh):
    """13.10.2026 Nachtrag (N1): Forturas Vorlage beginnt mit «<?xml version="1.0"?>» — OHNE Kodierungsangabe. Kommen dann
    cp1252/Latin-1-Bytes (ARTICLE_NAME ist Pflicht und hat Umlaute), lehnt expat die Datei ab: früher still [] = kein Tracking.
    Reihenfolge: (1) Bytes wie deklariert, (2) scheitert das: als UTF-8, sonst cp1252, sonst Latin-1 dekodieren und mit
    überschriebener Kodierung parsen (Deklaration bleibt im Text unverändert). None = wirklich unlesbar."""
    if isinstance(roh, str):
        texte = [roh]
    else:
        try:
            return ET.fromstring(roh)
        except ET.ParseError:
            pass
        texte = []
        for kod in ('utf-8', 'cp1252', 'latin-1'):
            try:
                texte = [roh.decode(kod)]; break
            except UnicodeDecodeError:
                continue
    for t in texte:
        try:
            p = ET.XMLParser(encoding='utf-8')
            p.feed(t.lstrip('\ufeff').encode('utf-8'))
            return p.close()
        except ET.ParseError:
            pass
    return None


def lies_delvry(xml_text):
    """→ [{'order_no','doc_no','datum','tracking':[...],'positionen':[(artnr, bestellt, geliefert, text)]}]"""
    out = []
    w = _xml_wurzel(xml_text)
    if w is None:
        return out          # Aufrufer meldet «Lieferschein unlesbar» (fortura_bestell_engine)
    for doc in w.iter('DOC'):
        h = doc.find('HEADER')
        g = lambda e, k: ((e.findtext(k) if e is not None else '') or '').strip()
        out.append({'order_no': g(h, 'ORDER_NO'), 'doc_no': g(h, 'DOC_NO'), 'datum': g(h, 'DELIVERYDATE'),
                    'tracking': [t.text.strip() for t in doc.iter('TRACKING_NO') if (t.text or '').strip()],
                    'positionen': [(g(p, 'ARTICLE_NO'), g(p, 'ORDER_QUANTITY'), g(p, 'DELVRY_QUANTITY'), g(p, 'TEXT'))
                                   for p in doc.iter('POS')]})
    return out


def selbsttest():
    adr = {'firstName': 'Anna', 'lastName': 'Müller & Söhne', 'address1': 'Bahnhofstrasse 1', 'address2': '', 'zip': '3000',
           'city': 'Bern', 'countryCodeV2': 'CH', 'company': ''}
    x, f = bau_orders_xml('LX9999', adr, 'test@example.ch', [{'artnr': '20564', 'ean': '194099102445', 'menge': 2}], 'Test')
    assert not f, f
    assert '&amp;' in x and '<CUST_NO>544341</CUST_NO>' in x and '<QUANTITY>2</QUANTITY>' in x
    _, f = bau_orders_xml('LX9999', dict(adr, address1=''), '', [{'artnr': 'fortura-x', 'menge': 0}])
    assert 'STREET fehlt' in f and 'EMAIL fehlt' in f and any('Artikelnummer' in e for e in f) and any('Menge' in e for e in f), f
    _, f = bau_orders_xml('LX9999', dict(adr, countryCodeV2='DE'), 'a@b.ch', [{'artnr': '20564', 'menge': 1}])
    assert any('Lieferland' in e for e in f)
    muster = open(os.path.join(REPO, 'dropship', 'fortura', 'Opacc_Orders_Muster.xml'), encoding='utf-8').read()
    assert gegen_template(muster) == [], gegen_template(muster)
    d = lies_delvry('<?xml version="1.0"?><Opacc.DELVRY><DOC><HEADER><DOC_NO>L1</DOC_NO><ORDER_NO>LX1023</ORDER_NO>'
                    '<DELIVERYDATE>07.10.2026</DELIVERYDATE></HEADER><TRACKINGLIST><TRACKING_NO>0123</TRACKING_NO></TRACKINGLIST>'
                    '<POSITIONS><POS><POS_NO>1</POS_NO><ARTICLE_NO>20564</ARTICLE_NO><ORDER_QUANTITY>2</ORDER_QUANTITY>'
                    '<DELVRY_QUANTITY>2</DELVRY_QUANTITY></POS></POSITIONS></DOC></Opacc.DELVRY>')
    assert d[0]['order_no'] == 'LX1023' and d[0]['tracking'] == ['0123'] and d[0]['positionen'][0][:3] == ('20564', '2', '2')
    # 13.10.2026: Feed-Formen der Artikelnummer, VE-Sperre, DELVRY als ISO-8859-1-Bytes
    for a in ('90404-2', 'BO01520', 'CK-404', 'OR47166.01', '042156', '86727M'):
        _, f = bau_orders_xml('LX9999', adr, 'a@b.ch', [{'artnr': a, 'menge': 1}])
        assert not f, (a, f)
    _, f = bau_orders_xml('LX9999', adr, 'a@b.ch', [{'artnr': '59774', 'menge': 1, 've': 10}])
    assert any('VE 10' in e for e in f), f
    lat = ('<?xml version="1.0" encoding="ISO-8859-1"?><Opacc.DELVRY><DOC><HEADER><ORDER_NO>LX1030</ORDER_NO></HEADER><POSITIONS><POS>'
           '<ARTICLE_NO>94097</ARTICLE_NO><ARTICLE_NAME>Zähne</ARTICLE_NAME><ORDER_QUANTITY>3</ORDER_QUANTITY>'
           '<DELVRY_QUANTITY>3</DELVRY_QUANTITY></POS></POSITIONS></DOC></Opacc.DELVRY>').encode('latin-1')
    assert lies_delvry(lat)[0]['positionen'][0][:3] == ('94097', '3', '3')
    n = 10
    # ── Nachtrag 13.10.2026 (Prüfer N1–N4) ──
    # N1: Forturas Vorlagen-Kopfzeile OHNE Kodierung + cp1252/Latin-1-Bytes (Umlaut, Gedankenstrich) → gelesen, nicht still []
    roh = ('<?xml version="1.0"?>\r\n<Opacc.DELVRY><DOC><HEADER><DOC_NO>LS1</DOC_NO><ORDER_NO>LX1031</ORDER_NO></HEADER>'
           '<TRACKINGLIST><TRACKING_NO>01505012345678</TRACKING_NO></TRACKINGLIST><POSITIONS><POS><ARTICLE_NO>93583</ARTICLE_NO>'
           '<ARTICLE_NAME>Mantel Dracula – Grösse M, Zähne</ARTICLE_NAME><ORDER_QUANTITY>1</ORDER_QUANTITY>'
           '<DELVRY_QUANTITY>1</DELVRY_QUANTITY></POS></POSITIONS></DOC></Opacc.DELVRY>')
    for kod in ('cp1252', 'latin-1'):
        try:
            b = roh.encode(kod)
        except UnicodeEncodeError:
            b = roh.replace('–', '-').encode(kod)
        d = lies_delvry(b)
        assert d and d[0]['order_no'] == 'LX1031' and d[0]['tracking'] == ['01505012345678'], (kod, d); n += 1
    assert lies_delvry(roh.encode('utf-8'))[0]['order_no'] == 'LX1031'; n += 1                         # UTF-8 ohne Angabe
    assert lies_delvry(roh.replace('<?xml version="1.0"?>', '<?xml version="1.0" encoding="ISO-8859-1"?>'))[0]['order_no'] == 'LX1031'
    assert lies_delvry(b'<?xml version="1.0"?><Opacc.DELVRY><DOC>kaputt') == []; n += 2                  # echt kaputt → [] (Engine warnt)
    # N2: Ersatzartikel / führende Nullen / Leerzeichen
    g, fehlt, fremd = abgleich({'042156': 1, '90654-2': 1},
                               [('42156', '1', '1', ''), ('99999', '1', '1', 'Ersatzartikel für 90654-2')])
    assert g == {'42156': 1} and fehlt == ['90654-2 0/1'] and len(fremd) == 1 and '99999×1 nicht bestellt' in fremd[0], (g, fehlt, fremd)
    g, fehlt, fremd = abgleich({'93583': 2}, [(' 093583 ', '2', '2', '')])
    assert g == {'93583': 2} and not fehlt and not fremd, (g, fehlt, fremd); n += 2
    assert positionen_aus_text('93583×2, 90654-2×1') == {'93583': 2, '90654-2': 1}; n += 1
    # N3/O2: Mengenformate numerisch, kein Absturz, kein falscher Teillieferungs-Alarm
    for s, w in (('2', 2), ('2.0', 2), ('2.000', 2), ('2,000', 2), (' 2 ', 2), ("1'000", 1000), ('1.000,00', 1000),
                 ('1,000.00', 1000), ('2,5', None), ('', None), ('abc', None), ('-1', None)):
        assert menge_zahl(s) == w, (s, menge_zahl(s), w)
    for s in ('2', '2.0', '2.000', '2,000'):
        assert abgleich({'93583': 2}, [('93583', s, s, '')]) == ({'93583': 2}, [], []), s
    assert abgleich({'93583': 2}, [('93583', '2', '1,000', '')])[1] == ['93583 1/2']                    # echte Teillieferung bleibt
    assert 'unlesbar' in abgleich({'93583': 2}, [('93583', '2', 'zwei', '')])[2][0]; n += 4
    # N4: Feed fehlt → None → kein XML; Artikel nicht im Feed → None; Feed vorhanden → VE
    assert ve_aus_feed(['93583'], '/nicht/da.csv') is None
    _, f = bau_orders_xml('LX9999', adr, 'a@b.ch', [{'artnr': '93583', 'menge': 1, 've': None}])
    assert any('VE unbekannt' in e for e in f), f
    with tempfile.NamedTemporaryFile('w', encoding='cp1252', suffix='.csv', delete=False) as tf:
        tf.write('Grp|ArtNr|Bez1DE|Internet_VE|\n1|93583|Mantel Dracula|1|\n1|59774|Draculagebiss|10|\n1|042156|Krone|1|\n')
    try:
        assert ve_aus_feed(['93583', '59774', '42156', '11111'], tf.name) == {'93583': 1, '59774': 10, '42156': 1}
    finally:
        os.unlink(tf.name)
    n += 3
    print(f'Selbsttest {n}/{n}')


if __name__ == '__main__':
    if '--selbsttest' in sys.argv:
        selbsttest()
    elif '--liste' in sys.argv:
        s = anmelden()
        try:
            for o in ('/home/ORDERS', '/home/DESADV'):
                print(o, liste(s, o))
        finally:
            abmelden(s)
