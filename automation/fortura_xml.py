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
        if (p.get('ve') or 1) > 1:
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


def ve_aus_feed(artnrs, pfad=FEED):
    """{artnr: Internet_VE} aus dem täglichen Feed (cp1252, «|»). Fehlt der Feed: {} (dann keine VE-Sperre — Feed ist täglich da)."""
    import csv
    out, gesucht = {}, set(artnrs)
    try:
        with open(pfad, encoding='cp1252', newline='') as f:
            r = csv.reader(f, delimiter='|'); kopf = next(r); a, v = kopf.index('ArtNr'), kopf.index('Internet_VE')
            for z in r:
                if len(z) > v and z[a] in gesucht:
                    try:
                        out[z[a]] = max(1, round(float(z[v].replace(',', '.') or 1)))
                    except ValueError:
                        out[z[a]] = 1
    except (OSError, ValueError, StopIteration):
        pass
    return out


def lies_delvry(xml_text):
    """→ [{'order_no','doc_no','datum','tracking':[...],'positionen':[(artnr, bestellt, geliefert, text)]}]"""
    out = []
    try:
        w = ET.fromstring(xml_text.encode('utf-8') if isinstance(xml_text, str) else xml_text)
    except ET.ParseError:
        return out
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
    print('Selbsttest 10/10')


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
