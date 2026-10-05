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
  2 (sobald FORTURA_XML_MUSTER=<pfad> eine echte Musterdatei von Fortura enthält): XML nach dem Muster bauen und per
    SYNO.FileStation.Upload nach /home/ORDERS legen; DESADV-Rücklauf → Tracking in Shopify. Bis dahin Exit-Text «Stufe 2 aus».
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
     'name createdAt displayFulfillmentStatus email shippingAddress{name company address1 address2 zip city countryCodeV2 phone} '
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
        if nr not in led:
            paket = {'bestellref': f'LX{nr}', 'kundennr': '544341', 'erstellt': o['createdAt'], 'positionen':
                     [{'artnr': a, 'ean': e, 'menge': m, 'titel': t} for a, e, m, t in pos],
                     'lieferadresse': o.get('shippingAddress'), 'email': o.get('email'), 'versand': 'neutral (Dropship), Absender LuxeStyle'}
            p = os.path.join(PAKETE, f'{nr}.json')
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(paket, f, ensure_ascii=False, indent=1)
            os.chmod(p, 0o600)
            led[nr] = [nr, dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), txt, 'bereit', '']
        st = led[nr][3]
        if st != 'bestellt':
            alter = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(o['createdAt'].replace('Z', '+00:00'))).total_seconds() / 3600
            zeilen.append(f"⚠️ FORTURA: #{nr} ({alter:.0f} h) bereit — im Fortura-Portal bestellen: {txt} · danach "
                          f"`python3 automation/fortura_bestell_engine.py --bestellt {nr}`")
    schreibe(led)
    if not os.environ.get('FORTURA_XML_MUSTER'):
        pass  # Stufe 2 aus, bis Fortura ein Muster liefert
    print('\n'.join(zeilen) if zeilen else 'FORTURA: 0 offen')
    return 0


if __name__ == '__main__':
    sys.exit(main())
