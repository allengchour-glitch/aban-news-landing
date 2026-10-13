#!/usr/bin/env python3
"""fortura_bestell_engine.py — jede bezahlte Bestellung mit Fortura-Ware löst die Fortura-Bestellung aus (05.10.2026).

Betreiber 05.10.: «jeder kauf muss auch automatisch auslösen bei fortuna». Bis heute: Fortura-Verkauf = Handbestellung im
Portal, die Ampel zeigte nur «KEIN CJ-Auftrag ⚠️». Fortura nimmt Bestellungen als XML (Opacc.ORDERS) im Ordner /home/ORDERS
auf webtransfer.fortura.ch (SYNO-FileStation über Port 443, dieselben Zugangsdaten wie der Feed) und legt Versandmeldungen
nach /home/DESADV. Die MUSTERDATEIEN hat Fortura nie geschickt (angefragt 22.07.) — ohne sie wird KEINE XML-Datei geraten.

STUFEN
  1 (jetzt, Standard): erkennen + vorbereiten. Je neue bezahlte, offene Bestellung mit `fortura-<ArtNr>`-Positionen:
    - Positionen (ArtNr = SKU ohne «fortura-», EAN, Menge) + Lieferadresse → /tmp/fortura_bestellungen/<nr>.json (600; Adresse
      NIE ins Repo — öffentlich), Ledger dropship/_fortura_bestellungen.tsv (nr, zeit, ArtNr×Menge, status — ohne Personendaten),
    - Ampel-Zeile «FORTURA: #nr bereit — im Portal bestellen: ArtNr×Menge …» (bis der Betreiber «bestellt» quittiert:
      `python3 automation/fortura_bestell_engine.py --bestellt <nr> [Fortura-Auftragsnr]`).
  2 (AKTIV seit 06.10.2026, Schalter dropship/_fortura_xml_aktiv; Muster von Fortura 06.10. in dropship/fortura/):
    `fortura_xml.bau_orders_xml` baut Opacc.ORDERS (DOC_NO = LX<nr>), prüft Pflichtfelder + Gerüst gegen das Template und legt
    ORDERS_LX<nr>.xml per SYNO.FileStation.Upload nach /home/ORDERS (overwrite=false; vorher Liste → nie doppelt).
    Status «xml-hochgeladen»; jeder Lauf liest /home/DESADV (Opacc.DELVRY, ORDER_NO = LX<nr>) → Status «versandt» + DPD-Tracking
    in der Ampel. Fehlt ein Pflichtfeld/Zugang → KEIN Upload, Ampel «⚠️ … im Portal bestellen» wie Stufe 1.
Gemischte Bestellungen (CJ + Fortura): nur die Fortura-Positionen hier; CJ-Teil bleibt beim CJ-Automaten.
Endstatus nach Lieferschein (13.10.2026): erfuellt · teilgeliefert (fehlt …) · abweichend (Ersatzartikel/fremde Nummer/unlesbare
Menge/Mehrlieferung — Shopify-Position bleibt offen, ⚠️-Zeile in JEDEM Lauf bis `--geklaert <nr>`).
  python3 automation/fortura_bestell_engine.py            → Ampel-Zeile(n), schreibt Ledger/Pakete
  python3 automation/fortura_bestell_engine.py --geklaert <nr>   → «abweichend» von Hand geklärt (Zeile verschwindet)
  python3 automation/fortura_bestell_engine.py --selbsttest      → Stufe 2 ohne Netz (Fortura + Shopify gespielt)
"""
import json, os, sys, time, datetime as dt
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql

LEDGER = os.path.join(REPO, 'dropship', '_fortura_bestellungen.tsv')
PAKETE = '/tmp/fortura_bestellungen'
Q = ('{orders(first:30,query:"financial_status:paid AND status:open AND created_at:>=2026-10-01",sortKey:CREATED_AT,reverse:true){nodes{'
     'name createdAt displayFulfillmentStatus email shippingAddress{name firstName lastName company address1 address2 zip city countryCodeV2 phone} '
     'lineItems(first:30){nodes{sku title quantity unfulfilledQuantity variant{barcode}}}}}}')


def ledger():
    d = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding='utf-8'):
            t = z.rstrip('\n').split('\t')
            if len(t) >= 4 and t[0] != 'nr':
                d[t[0]] = t
    return d


def schreibe(d):
    with open(LEDGER, 'w', encoding='utf-8') as f:
        f.write('nr\tzeit\tpositionen\tstatus\tfortura_auftrag\n')
        for t in sorted(d.values()):
            f.write('\t'.join((t + [''] * 5)[:5]) + '\n')


SCHALTER = os.path.join(REPO, 'dropship', '_fortura_xml_aktiv')
NOTIFY = os.environ.get('NOTIFY', '1') == '1'     # wie cj_fulfill_engine: Shopifys normale Versandbestätigung an die Kundin


def sendung_eintragen(nr, tracking, geliefert):
    """06.10.2026: DPD-Tracking aus dem Fortura-Lieferschein als Sendung in Shopify — NUR die Fortura-Positionen
    (gemischte Bestellungen: CJ-Teil bleibt offen für den CJ-Automaten), Menge = geliefert laut DELVRY.
    geliefert: {artnr: menge}. Rückgabe (ok, text)."""
    q = ('query($q:String!){orders(first:1,query:$q){nodes{id name fulfillmentOrders(first:10){nodes{id status '
         'lineItems(first:50){nodes{id remainingQuantity lineItem{sku}}}}}}}}')
    o = (gql(q, {'q': f'name:#{nr}'})['orders']['nodes'] or [None])[0]
    if not o:
        return False, 'Bestellung nicht gefunden'
    gruppen = []
    for fo in o['fulfillmentOrders']['nodes']:
        if fo['status'] not in ('OPEN', 'IN_PROGRESS', 'SCHEDULED'):
            continue
        teile = []
        for li in fo['lineItems']['nodes']:
            sku = (li['lineItem'] or {}).get('sku') or ''
            # 13.10.2026 Nachtrag (N2): geliefert ist nach norm_artnr geschlüsselt (führende Nullen/Leerraum egal)
            menge = min(int(geliefert.get(_fx().norm_artnr(sku[8:]), 0)), li['remainingQuantity']) if sku.startswith('fortura-') else 0
            if menge > 0:
                teile.append({'id': li['id'], 'quantity': menge})
        if teile:
            gruppen.append({'fulfillmentOrderId': fo['id'], 'fulfillmentOrderLineItems': teile})
    if not gruppen:
        return False, 'keine offene Fortura-Position'
    m = ('mutation($f:FulfillmentInput!){fulfillmentCreate(fulfillment:$f){fulfillment{status trackingInfo{number company}} '
         'userErrors{message}}}')
    r = gql(m, {'f': {'lineItemsByFulfillmentOrder': gruppen, 'notifyCustomer': NOTIFY,
                      'trackingInfo': {'company': 'DPD', 'numbers': tracking}}})['fulfillmentCreate']
    if r['userErrors']:
        return False, r['userErrors'][0]['message'][:120]
    return True, f"Sendung {r['fulfillment']['status']} · DPD {','.join(tracking)}"


def _fx():
    import fortura_xml
    return fortura_xml


def stufe2(led, zeilen):
    """XML-Upload für «bereit», DESADV-Rücklauf für «xml-hochgeladen». Ersetzt die Stufe-1-Zeilen der betroffenen Bestellungen."""
    import fortura_xml as fx
    try:
        sid = fx.anmelden()
    except Exception as e:
        return zeilen + [f'⚠️ FORTURA-XML: Server nicht erreichbar ({str(e)[:90]}) — Stufe-1-Zeilen gelten']
    neu = {}
    try:
        vorhanden = set(fx.liste(sid, '/home/ORDERS'))
        for nr, t in sorted(led.items()):
            if t[3] != 'bereit':
                continue
            p = os.path.join(PAKETE, f'{nr}.json')
            if not os.path.exists(p):
                neu[nr] = f'⚠️ FORTURA: #{nr} Paket fehlt in {PAKETE} (Neustart?) — im Portal bestellen: {t[2]}'; continue
            pk = json.load(open(p, encoding='utf-8'))
            name = f'ORDERS_LX{nr}.xml'
            ve = fx.ve_aus_feed([q['artnr'] for q in pk['positionen']])     # 13.10.: Bündel (VE>1) nie raten
            # 13.10.2026 Nachtrag (N4): Feed fehlt (None) oder Artikel nicht im Feed → 've': None → bau_orders_xml lehnt ab (fail-closed)
            x, fehler = fx.bau_orders_xml(f'LX{nr}', pk.get('lieferadresse'), pk.get('email'),
                                          [{'artnr': q['artnr'], 'ean': q.get('ean'), 'menge': int(q['menge']),
                                            've': (ve or {}).get(q['artnr'])}
                                           for q in pk['positionen']],
                                          f'LuxeStyle Dropship #{nr} - neutraler Versand an Endkundin')
            if fehler:
                neu[nr] = f'⚠️ FORTURA: #{nr} XML NICHT gesendet ({"; ".join(fehler)[:120]}) — im Portal bestellen: {t[2]}'; continue
            if name not in vorhanden:
                fx.hochladen(sid, '/home/ORDERS', name, x)
                if name not in set(fx.liste(sid, '/home/ORDERS')):
                    neu[nr] = f'⚠️ FORTURA: #{nr} Upload nicht zurücklesbar — im Portal prüfen: {t[2]}'; continue
            t[3] = 'xml-hochgeladen'; t[4] = name
            neu[nr] = f'FORTURA: #{nr} als {name} an Fortura übermittelt ({t[2]}) — wartet auf Lieferschein'
        # DESADV: Lieferscheine von Fortura
        for datei in fx.liste(sid, '/home/DESADV'):
            docs = fx.lies_delvry(fx.herunterladen(sid, '/home/DESADV/' + datei))
            if not docs:
                # 13.10.2026 Nachtrag (N1): unlesbarer Lieferschein war still [] → kein Tracking, nach 48 h «noch kein Lieferschein».
                neu[f'_{datei}'] = f'⚠️ FORTURA: Lieferschein {datei} unlesbar — von Hand öffnen (Tracking/Bestellnr. fehlen sonst)'
                continue
            for d in docs:
                nr = d['order_no'].upper().lstrip('LX')
                if nr in led and led[nr][3] in ('xml-hochgeladen', 'versandt'):
                    if led[nr][3] == 'xml-hochgeladen':
                        led[nr][4] = f"{led[nr][4]} · Lieferschein {d['doc_no']} {d['datum']} · DPD {','.join(d['tracking'])}"
                    # 13.10.2026 Nachtrag (N2/N3): Abgleich gegen UNSERE Bestellung (Ledger), Artikelnummer normalisiert, Mengen
                    # numerisch. Früher: Text «2» ≠ «2.000» → falscher Teillieferungs-Alarm, «2,000» → Absturz, Ersatzartikel mit
                    # anderer ARTICLE_NO → still «erfuellt», das bestellte Teil blieb in Shopify offen.
                    geliefert, teil, fremd = fx.abgleich(fx.positionen_aus_text(led[nr][2]), d['positionen'])
                    led[nr][3] = 'versandt'
                    ok, info = sendung_eintragen(nr, d['tracking'], geliefert) if d['tracking'] else (False, 'Lieferschein ohne Tracking')
                    if fremd and (ok or info == 'keine offene Fortura-Position'):
                        led[nr][3] = 'abweichend'
                    elif ok:
                        # 13.10.2026 (Trockenlauf): eine Teillieferung wurde «erfuellt» — main() überspringt das, die Warnung
                        # stand genau EINMAL da, der fehlende Artikel blieb danach still offen. Jetzt eigener Endstatus mit Dauerzeile.
                        led[nr][3] = 'teilgeliefert' if teil else 'erfuellt'
                    if led[nr][3] in ('abweichend', 'teilgeliefert'):
                        led[nr][4] = (f"{led[nr][4]}" + (f" · fehlt {', '.join(teil)}" if teil else '')
                                      + (f" · fremd {'; '.join(fremd)}" if fremd else ''))
                    neu[nr] = (f"{'' if ok and not fremd else '⚠️ '}FORTURA: #{nr} versandt {d['datum']} · DPD {','.join(d['tracking'])} · "
                               f"{'Shopify: ' + info if ok else 'Shopify-Sendung NICHT eingetragen: ' + info}"
                               + (f" · ⚠️ Teillieferung {', '.join(teil)}" if teil else '')
                               + (f" · ⚠️ ABWEICHEND {'; '.join(fremd)} — Ersatz prüfen, Shopify-Position bleibt offen" if fremd else ''))
        for nr, t in led.items():
            if t[3] == 'xml-hochgeladen' and nr not in neu:
                alter = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(t[1].replace('Z', '+00:00'))).total_seconds() / 3600
                neu[nr] = (f"{'⚠️ ' if alter > 48 else ''}FORTURA: #{nr} XML seit {alter:.0f} h bei Fortura, noch kein Lieferschein"
                           + (' — bei Fortura nachfragen' if alter > 48 else ''))
    except Exception as e:
        neu['_'] = f'⚠️ FORTURA-XML: {str(e)[:140]}'
    finally:
        fx.abmelden(sid)
    alt = [z for z in zeilen if not any(f'#{nr} ' in z for nr in neu)]
    return alt + list(neu.values())


def _abweichend_zeile(nr, t):
    return (f'⚠️ FORTURA: #{nr} ABWEICHEND — {t[4]} · Lieferschein ≠ Bestellung (Ersatzartikel?): Shopify-Position bleibt offen, '
            f'bei Fortura/Kundin klären · danach `python3 automation/fortura_bestell_engine.py --geklaert {nr}`')


def main():
    led = ledger()
    if '--bestellt' in sys.argv:
        nr = sys.argv[sys.argv.index('--bestellt') + 1].lstrip('#')
        auftrag = sys.argv[sys.argv.index('--bestellt') + 2] if len(sys.argv) > sys.argv.index('--bestellt') + 2 else ''
        if nr not in led:
            print(f'#{nr} nicht im Fortura-Ledger'); return 1
        led[nr][3] = 'bestellt'; led[nr] = (led[nr] + [''] * 5)[:5]; led[nr][4] = auftrag
        schreibe(led); print(f'#{nr} als bei Fortura bestellt quittiert {auftrag}'); return 0
    if '--geklaert' in sys.argv:
        nr = sys.argv[sys.argv.index('--geklaert') + 1].lstrip('#')
        if nr not in led or led[nr][3] != 'abweichend':
            print(f'#{nr} steht nicht auf «abweichend»'); return 1
        led[nr][3] = 'geklaert'; schreibe(led); print(f'#{nr} Abweichung als geklärt quittiert'); return 0
    nodes = gql(Q)['orders']['nodes']
    os.makedirs(PAKETE, mode=0o700, exist_ok=True)
    zeilen, gesehen = [], set()
    for o in nodes:
        nr = o['name'].lstrip('#')
        pos = [(li['sku'][8:], (li.get('variant') or {}).get('barcode') or '', li['unfulfilledQuantity'], li['title'])
               for li in o['lineItems']['nodes'] if (li.get('sku') or '').startswith('fortura-') and li['unfulfilledQuantity'] > 0]
        if not pos:
            continue
        gesehen.add(nr)
        txt = ', '.join(f'{a}×{m}' for a, _, m, _ in pos)
        p = os.path.join(PAKETE, f'{nr}.json')
        if nr not in led or not os.path.exists(p):     # 06.10.: /tmp stirbt beim Neustart → Paket aus Shopify neu bauen
            paket = {'bestellref': f'LX{nr}', 'kundennr': '544341', 'erstellt': o['createdAt'], 'positionen':
                     [{'artnr': a, 'ean': e, 'menge': m, 'titel': t} for a, e, m, t in pos],
                     'lieferadresse': o.get('shippingAddress'), 'email': o.get('email'), 'versand': 'neutral (Dropship), Absender LuxeStyle'}
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(paket, f, ensure_ascii=False, indent=1)
            os.chmod(p, 0o600)
        if nr not in led:
            led[nr] = [nr, dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), txt, 'bereit', '']
        st = led[nr][3]
        if st == 'versandt':
            zeilen.append(f'⚠️ FORTURA: #{nr} versandt — {led[nr][4]} (Sendung in Shopify noch offen, nächster Lauf versucht es)'); continue
        if st == 'erfuellt':
            continue
        if st == 'teilgeliefert':
            zeilen.append(f'⚠️ FORTURA: #{nr} Teillieferung — {led[nr][4]} · Rest bei Fortura klären oder erstatten'); continue
        if st == 'abweichend':
            zeilen.append(_abweichend_zeile(nr, led[nr])); continue
        if st == 'bereit':
            alter = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(o['createdAt'].replace('Z', '+00:00'))).total_seconds() / 3600
            zeilen.append(f"⚠️ FORTURA: #{nr} ({alter:.0f} h) bereit — im Fortura-Portal bestellen: {txt} · danach "
                          f"`python3 automation/fortura_bestell_engine.py --bestellt {nr}`")
    # 13.10.2026 Nachtrag (N2): «abweichend» meldet sich in JEDEM Lauf — auch wenn Shopify die Bestellung inzwischen nicht mehr
    # als offen führt (von Hand erfüllt/geschlossen): erst `--geklaert <nr>` beendet die Zeile.
    zeilen += [_abweichend_zeile(nr, t) for nr, t in sorted(led.items()) if t[3] == 'abweichend' and nr not in gesehen]
    if os.path.exists(SCHALTER) and any(t[3] in ('bereit', 'xml-hochgeladen', 'versandt') for t in led.values()):
        zeilen = stufe2(led, zeilen)
    schreibe(led)
    print('\n'.join(zeilen) if zeilen else 'FORTURA: 0 offen')
    return 0


def selbsttest():
    """13.10.2026 Nachtrag (Prüfer N1–N4): Stufe 2 + main() ohne Netz. Fortura (Login/Liste/Download/Upload) und Shopify (gql)
    werden gespielt, Ledger/Pakete/Feed liegen in einem Temp-Ordner, `curl` wird nie aufgerufen."""
    import tempfile, shutil
    import fortura_xml as fx
    global LEDGER, PAKETE, SCHALTER, gql
    alt = (LEDGER, PAKETE, SCHALTER, gql, fx.FEED, fx.anmelden, fx.abmelden, fx.liste, fx.herunterladen, fx.hochladen, fx._curl, sys.argv)
    td = tempfile.mkdtemp(prefix='fbe_test_')
    LEDGER, PAKETE, SCHALTER = os.path.join(td, 'led.tsv'), os.path.join(td, 'pakete'), os.path.join(td, 'schalter')
    os.makedirs(PAKETE); open(SCHALTER, 'w').close()
    fx.FEED = os.path.join(td, 'feed.csv')
    with open(fx.FEED, 'w', encoding='cp1252') as f:
        f.write('ArtNr|Internet_VE|\n93583|1|\n90654-2|1|\n042156|1|\n59774|10|\n')
    desadv, hoch, gesendet, shop = {}, [], [], {}

    def _kein_curl(*a, **k):
        raise AssertionError('curl im Selbsttest')
    fx._curl = _kein_curl
    fx.anmelden = lambda: 'SID'
    fx.abmelden = lambda sid: None
    fx.liste = lambda sid, o: sorted(desadv) if o.endswith('DESADV') else [n for n, _ in hoch]
    fx.herunterladen = lambda sid, pfad: desadv[pfad.rsplit('/', 1)[1]]
    fx.hochladen = lambda sid, o, n, x: hoch.append((n, x)) or True

    def _gql(q, v=None):
        if 'fulfillmentCreate' in q:
            gesendet.append(v['f']['lineItemsByFulfillmentOrder'])
            return {'fulfillmentCreate': {'fulfillment': {'status': 'SUCCESS', 'trackingInfo': []}, 'userErrors': []}}
        if 'fulfillmentOrders' in q:
            nr = v['q'].split('#')[1]
            return {'orders': {'nodes': [{'id': 'o', 'name': '#' + nr, 'fulfillmentOrders': {'nodes': [{'id': 'fo' + nr, 'status': 'OPEN',
                    'lineItems': {'nodes': [{'id': f'li-{s}', 'remainingQuantity': m, 'lineItem': {'sku': s}}
                                            for s, m in shop.get(nr, [])]}}]}}]}}
        return {'orders': {'nodes': []}}
    gql = _gql

    def lief(nr, pos, kod='utf-8', kopf='<?xml version="1.0"?>'):
        x = (f'{kopf}<Opacc.DELVRY><DOC><HEADER><DOC_NO>LS{nr}</DOC_NO><ORDER_NO>LX{nr}</ORDER_NO><DELIVERYDATE>15.10.2026'
             f'</DELIVERYDATE></HEADER><TRACKINGLIST><TRACKING_NO>0150{nr}</TRACKING_NO></TRACKINGLIST><POSITIONS>'
             + ''.join(f'<POS><ARTICLE_NO>{a}</ARTICLE_NO><ARTICLE_NAME>Kostüm Grösse M</ARTICLE_NAME><ORDER_QUANTITY>{b}'
                       f'</ORDER_QUANTITY><DELVRY_QUANTITY>{g}</DELVRY_QUANTITY><TEXT>{t}</TEXT></POS>' for a, b, g, t in pos)
             + '</POSITIONS></DOC></Opacc.DELVRY>')
        return x.encode(kod)

    ok, n = True, 0

    def pruef(name, bed, info=''):
        nonlocal ok, n
        n += 1; ok = ok and bool(bed)
        print(f"  {'OK  ' if bed else 'FEHL'} {name}{'' if bed else ' → ' + str(info)[:300]}")
    try:
        led = {'1031': ['1031', '2026-10-13T10:00Z', '93583×1, 90654-2×1', 'xml-hochgeladen', 'ORDERS_LX1031.xml'],
               '1032': ['1032', '2026-10-13T10:00Z', '042156×2', 'xml-hochgeladen', 'ORDERS_LX1032.xml'],
               '1033': ['1033', '2026-10-13T10:00Z', '93583×2', 'xml-hochgeladen', 'ORDERS_LX1033.xml'],
               '1034': ['1034', '2026-10-13T10:00Z', '93583×1', 'bereit', '']}
        shop.update({'1031': [('fortura-93583', 1), ('fortura-90654-2', 1)], '1032': [('fortura-042156', 2)],
                     '1033': [('fortura-93583', 2)]})
        # N2 Ersatzartikel (UTF-8) · N1+N2+N3 führende Null, Latin-1 ohne Kodierungsangabe, «2,000» · N3 echte Teillieferung «1.000»
        desadv['D1031.xml'] = lief('1031', [('93583', '1.000', '1.000', ''), ('99999', '1', '1', 'Ersatzartikel für 90654-2')])
        desadv['D1032.xml'] = lief('1032', [('42156', '2,000', '2,000', '')], 'latin-1')
        desadv['D1033.xml'] = lief('1033', [('93583', '2.000', '1.000', '')], 'cp1252')
        desadv['KAPUTT.xml'] = b'<?xml version="1.0"?><Opacc.DELVRY><DOC>abgeschnitten'
        # N4: Paket für 1034 da, aber der Feed fehlt → kein XML
        json.dump({'positionen': [{'artnr': '93583', 'ean': '', 'menge': 1}], 'lieferadresse': {'firstName': 'A', 'lastName': 'B',
                   'address1': 'Weg 1', 'zip': '3000', 'city': 'Bern', 'countryCodeV2': 'CH'}, 'email': 'test@example.ch'},
                  open(os.path.join(PAKETE, '1034.json'), 'w'))
        os.rename(fx.FEED, fx.FEED + '.weg')
        z = stufe2(led, [])
        alles = '\n'.join(z)
        pruef('N2 Ersatzartikel → abweichend', led['1031'][3] == 'abweichend', led['1031'])
        pruef('N2 nur 93583 erfüllt, 90654-2 bleibt offen', gesendet and gesendet[0][0]['fulfillmentOrderLineItems'] == [{'id': 'li-fortura-93583', 'quantity': 1}], gesendet[:1])
        pruef('N2 Warnzeile ABWEICHEND', any('#1031' in x and 'ABWEICHEND' in x and '99999' in x for x in z), alles)
        pruef('N1+N2+N3 Latin-1 ohne Angabe, «042156»=«42156», «2,000»=2 → erfuellt', led['1032'][3] == 'erfuellt', led['1032'])
        pruef('N1 Tracking aus Latin-1-Lieferschein', 'DPD 01501032' in led['1032'][4], led['1032'])
        pruef('N3 «1.000» von «2.000» → teilgeliefert 1/2', led['1033'][3] == 'teilgeliefert' and 'fehlt 93583 1/2' in led['1033'][4], led['1033'])
        pruef('N1 kaputte Datei → Warnzeile', any('KAPUTT.xml unlesbar' in x for x in z), alles)
        pruef('N4 Feed fehlt → kein Upload', led['1034'][3] == 'bereit' and not hoch, (led['1034'], hoch))
        pruef('N4 Warnzeile VE unbekannt', any('#1034' in x and 'NICHT gesendet' in x and 'VE unbekannt' in x for x in z), alles)
        os.rename(fx.FEED + '.weg', fx.FEED)
        z = stufe2(led, [])
        pruef('N4 Feed wieder da → XML hochgeladen', led['1034'][3] == 'xml-hochgeladen' and hoch and hoch[0][0] == 'ORDERS_LX1034.xml', (led['1034'], hoch))
        # main(): «abweichend» meldet sich in jedem Lauf (Shopify führt #1031 nicht mehr als offen), bis --geklaert
        schreibe(led)
        import io, contextlib
        for runde in (1, 2):
            sys.argv = ['x']; buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                main()
            pruef(f'main() Lauf {runde}: Zeile ABWEICHEND #1031', 'ABWEICHEND' in buf.getvalue() and '#1031' in buf.getvalue(), buf.getvalue())
        sys.argv = ['x', '--geklaert', '1031']
        with contextlib.redirect_stdout(io.StringIO()):
            main()
        sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        pruef('--geklaert beendet die Zeile', '#1031' not in buf.getvalue() and ledger()['1031'][3] == 'geklaert', buf.getvalue())
    finally:
        (LEDGER, PAKETE, SCHALTER, gql, fx.FEED, fx.anmelden, fx.abmelden, fx.liste, fx.herunterladen, fx.hochladen, fx._curl, sys.argv) = alt
        shutil.rmtree(td, ignore_errors=True)
    print(f"SELBSTTEST {'OK' if ok else 'FEHLER'} ({n} Fälle)")
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(selbsttest() if '--selbsttest' in sys.argv else main())
