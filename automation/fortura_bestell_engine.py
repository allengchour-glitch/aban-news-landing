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
  python3 automation/fortura_bestell_engine.py            → Ampel-Zeile(n), schreibt Ledger/Pakete
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
            menge = min(int(geliefert.get(sku[8:], 0)), li['remainingQuantity']) if sku.startswith('fortura-') else 0
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
            x, fehler = fx.bau_orders_xml(f'LX{nr}', pk.get('lieferadresse'), pk.get('email'),
                                          [{'artnr': q['artnr'], 'ean': q.get('ean'), 'menge': int(q['menge'])} for q in pk['positionen']],
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
            for d in fx.lies_delvry(fx.herunterladen(sid, '/home/DESADV/' + datei)):
                nr = d['order_no'].upper().lstrip('LX')
                if nr in led and led[nr][3] in ('xml-hochgeladen', 'versandt'):
                    if led[nr][3] == 'xml-hochgeladen':
                        led[nr][4] = f"{led[nr][4]} · Lieferschein {d['doc_no']} {d['datum']} · DPD {','.join(d['tracking'])}"
                    teil = [f'{a} {g}/{b}' for a, b, g, _ in d['positionen'] if g != b]
                    led[nr][3] = 'versandt'
                    geliefert = {}
                    for a, _, g, _ in d['positionen']:
                        geliefert[a] = geliefert.get(a, 0) + int(float(g or 0))
                    ok, info = sendung_eintragen(nr, d['tracking'], geliefert) if d['tracking'] else (False, 'Lieferschein ohne Tracking')
                    if ok:
                        led[nr][3] = 'erfuellt'
                    neu[nr] = (f"{'' if ok else '⚠️ '}FORTURA: #{nr} versandt {d['datum']} · DPD {','.join(d['tracking'])} · "
                               f"{'Shopify: ' + info if ok else 'Shopify-Sendung NICHT eingetragen: ' + info}"
                               + (f" · ⚠️ Teillieferung {', '.join(teil)}" if teil else ''))
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


def main():
    led = ledger()
    if '--bestellt' in sys.argv:
        nr = sys.argv[sys.argv.index('--bestellt') + 1].lstrip('#')
        auftrag = sys.argv[sys.argv.index('--bestellt') + 2] if len(sys.argv) > sys.argv.index('--bestellt') + 2 else ''
        if nr not in led:
            print(f'#{nr} nicht im Fortura-Ledger'); return 1
        led[nr][3] = 'bestellt'; led[nr] = (led[nr] + [''] * 5)[:5]; led[nr][4] = auftrag
        schreibe(led); print(f'#{nr} als bei Fortura bestellt quittiert {auftrag}'); return 0
    nodes = gql(Q)['orders']['nodes']
    os.makedirs(PAKETE, mode=0o700, exist_ok=True)
    zeilen = []
    for o in nodes:
        nr = o['name'].lstrip('#')
        pos = [(li['sku'][8:], (li.get('variant') or {}).get('barcode') or '', li['unfulfilledQuantity'], li['title'])
               for li in o['lineItems']['nodes'] if (li.get('sku') or '').startswith('fortura-') and li['unfulfilledQuantity'] > 0]
        if not pos:
            continue
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
        if st == 'bereit':
            alter = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(o['createdAt'].replace('Z', '+00:00'))).total_seconds() / 3600
            zeilen.append(f"⚠️ FORTURA: #{nr} ({alter:.0f} h) bereit — im Fortura-Portal bestellen: {txt} · danach "
                          f"`python3 automation/fortura_bestell_engine.py --bestellt {nr}`")
    if os.path.exists(SCHALTER) and any(t[3] in ('bereit', 'xml-hochgeladen', 'versandt') for t in led.values()):
        zeilen = stufe2(led, zeilen)
    schreibe(led)
    print('\n'.join(zeilen) if zeilen else 'FORTURA: 0 offen')
    return 0


if __name__ == '__main__':
    sys.exit(main())
