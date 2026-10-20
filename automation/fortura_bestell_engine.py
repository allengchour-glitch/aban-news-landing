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
  python3 automation/fortura_bestell_engine.py --erneut <nr>     → «xml-unterwegs» (Absturz zwischen Senden und Quittung) von Hand freigeben: neu senden
  python3 automation/fortura_bestell_engine.py --selbsttest      → Stufe 2 ohne Netz (Fortura + Shopify gespielt)

HÄRTUNG 20.10.2026 (Prüferbefunde zu #1027, Runde «weiter»): (1) Upload-TOR: XML nur für Bestellungen, die JETZT in Shopify bezahlt+offen sind
und deren Positionen dem Paket gleichen (`offen` aus main) — storniert/erstattet/teilerstattet/geändert → NICHT senden, Warnzeile; (2) AT-MOST-ONCE:
Ledger «xml-unterwegs» wird VOR dem Upload geschrieben (ein Absturz/Timeout nach dem Senden hätte sonst beim nächsten Lauf, wenn Fortura die Datei
schon abgeholt hat, eine zweite Bestellung ausgelöst); (3) Feed-Plausibilität (≥ FEED_MIN_ZEILEN Zeilen, ≤ FEED_MAX_ALTER_H alt) und KEIN Rückfall
auf den Tages-Feed, wenn der frische Feed lesbar ist, aber die Spalte fehlt; (4) Abruf-Timeout unter dem Aufrufer-Timeout (120 s) mit Prozessgruppen-Kill;
(5) die Verfolgung endet nur mit Erstattungsbeleg; (6) die 24-h-Warnung zählt Werktage (Fortura arbeitet Mo–Fr).
"""
import json, os, sys, time, datetime as dt
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql

LEDGER = os.path.join(REPO, 'dropship', '_fortura_bestellungen.tsv')
PAKETE = '/tmp/fortura_bestellungen'
FEED_MIN_ZEILEN = 15000        # echter Feed: 20'228 Zeilen (20.10.2026); ein abgeschnittener/leerer Feed ist kein Bestandsbeweis
FEED_MAX_ALTER_H = 30          # der Tages-Feed kommt täglich; älter als 30 h = Abruf ist ausgefallen → Bestand unbekannt
FEED_ABRUF_TIMEOUT = 80        # Sekunden; MUSS unter dem Aufrufer-Timeout liegen (engine_keepalive.sh: timeout 120)
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


def feed_pruefen(pfad, jetzt=None):
    """Ist dieser Feed als Bestandsbeweis brauchbar? → (ok, Grund). Prüft Zeilenzahl (≥ FEED_MIN_ZEILEN) und Alter (≤ FEED_MAX_ALTER_H)."""
    try:
        alter_h = ((jetzt or time.time()) - os.path.getmtime(pfad)) / 3600
        with open(pfad, 'rb') as f:
            zeilen = sum(1 for _ in f)
    except OSError as e:
        return False, f'nicht lesbar ({e.__class__.__name__})'
    if zeilen < FEED_MIN_ZEILEN:
        return False, f'nur {zeilen} Zeilen (< {FEED_MIN_ZEILEN}, abgeschnitten?)'
    if alter_h > FEED_MAX_ALTER_H:
        return False, f'{alter_h:.0f} h alt (> {FEED_MAX_ALTER_H} h, Abruf ausgefallen?)'
    return True, ''


def frischer_feed():
    """20.10.2026: frischer Feed für die Bestandsprüfung VOR dem XML-Upload (der Tages-Feed ist bis 24 h alt). Pfad oder None.
    Ein gescheiterter oder unplausibler Abruf ist kein Fehler: dann prüft stufe2 gegen den vorhandenen Tages-Feed (selbst geprüft).
    Härtung: Timeout unter dem Aufrufer-Timeout, Prozessgruppe wird bei Zeitüberschreitung beendet (kein verwaister curl), Ziel vorher gelöscht
    (nie ein alter Feed unter frischem Namen), Zeilenzahl/Alter geprüft."""
    import subprocess, signal
    ziel = '/tmp/fortura_feed_bestellung.csv'
    try:
        if os.path.exists(ziel):
            os.remove(ziel)
        pr = subprocess.Popen(['bash', os.path.join(HIER, 'fortura_fetch_feed.sh'), ziel], stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL, start_new_session=True)
        try:
            rc = pr.wait(timeout=FEED_ABRUF_TIMEOUT)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(pr.pid, signal.SIGKILL)
            except OSError:
                pass
            pr.wait()
            return None
        return ziel if rc == 0 and os.path.getsize(ziel) > 1_000_000 and feed_pruefen(ziel)[0] else None
    except Exception:
        return None


def stufe2(led, zeilen, offen):
    """XML-Upload für «bereit», DESADV-Rücklauf für «xml-hochgeladen». Ersetzt die Stufe-1-Zeilen der betroffenen Bestellungen.
    offen = {nr: {norm_artnr: menge}} der Bestellungen, die JETZT in Shopify bezahlt+offen sind und Fortura-Positionen offen haben (aus main()).
    Pflicht-Parameter (kein Default): wer das Tor vergisst, bekommt einen TypeError statt eines stillen Uploads."""
    import fortura_xml as fx
    try:
        sid = fx.anmelden()
    except Exception as e:
        return zeilen + [f'⚠️ FORTURA-XML: Server nicht erreichbar ({str(e)[:90]}) — Stufe-1-Zeilen gelten']
    neu = {}
    frisch = []                                   # 20.10.2026: frischer Feed höchstens EINMAL je Lauf holen (erst bei der ersten «bereit»-Bestellung)
    try:
        vorhanden = set(fx.liste(sid, '/home/ORDERS'))
        # 20.10.2026 (Härtung 2): «xml-unterwegs» = Absturz/Timeout zwischen Senden und Quittung. Liegt die Datei im Ordner → bestätigt;
        # sonst NIE automatisch neu senden (Fortura könnte sie schon abgeholt haben → Doppelbestellung), Betreiber entscheidet.
        for nr, t in sorted(led.items()):
            if t[3] != 'xml-unterwegs':
                continue
            if t[4] in vorhanden:
                t[3] = 'xml-hochgeladen'; schreibe(led)
                neu[nr] = f'FORTURA: #{nr} als {t[4]} bei Fortura (Upload nachträglich bestätigt) — wartet auf Lieferschein'
            else:
                neu[nr] = (f'⚠️ FORTURA: #{nr} Upload unklar ({t[4]} nicht im Ordner, kein Lieferschein) — bei Fortura/Webtransfer prüfen; '
                           f'`--erneut {nr}` sendet neu, `--bestellt {nr}` quittiert eine Handbestellung')
        for nr, t in sorted(led.items()):
            if t[3] != 'bereit':
                continue
            p = os.path.join(PAKETE, f'{nr}.json')
            if not os.path.exists(p):
                neu[nr] = f'⚠️ FORTURA: #{nr} Paket fehlt in {PAKETE} (Neustart?) — im Portal bestellen: {t[2]}'; continue
            pk = json.load(open(p, encoding='utf-8'))
            # 20.10.2026 (Härtung 1) UPLOAD-TOR: nur für Bestellungen, die JETZT bezahlt+offen sind und deren Fortura-Positionen dem Paket gleichen.
            # Storniert/erstattet/von Hand erfüllt/teilerstattet/Menge geändert → NICHT senden (Fortura würde Ware ausliefern, die wir erstattet haben).
            jetzt_pos = offen.get(nr)
            if jetzt_pos is None:
                neu[nr] = (f'⚠️ FORTURA: #{nr} XML NICHT gesendet — in Shopify nicht (mehr) bezahlt/offen mit Fortura-Position (storniert, erstattet, '
                           f'erfüllt?) — prüfen; von Hand bestellt: `--bestellt {nr}`. {t[2]}'); continue
            paket_pos = {}
            for q in pk['positionen']:
                k = fx.norm_artnr(q['artnr']); paket_pos[k] = paket_pos.get(k, 0) + int(q['menge'])
            if paket_pos != jetzt_pos:
                neu[nr] = (f'⚠️ FORTURA: #{nr} XML NICHT gesendet — Bestellung seit dem Paket geändert (Paket {paket_pos} ≠ Shopify {jetzt_pos}); '
                           f'Paket {PAKETE}/{nr}.json löschen baut es aus Shopify neu, danach läuft es von selbst'); continue
            name = f'ORDERS_LX{nr}.xml'
            # 20.10.2026 (#1027): hat Fortura die Ware JETZT im eigenen Lager («Lagerbestand Fortura», nicht Bazar/Total)? Nein → kein XML,
            # Status «nicht-lagernd», Dauerzeile bis die Bestellung erstattet/geschlossen ist (der Betreiber entscheidet; die Engine erstattet nie).
            artnrs = [q['artnr'] for q in pk['positionen']]
            bs, feed_grund = None, ''
            if not frisch:
                frisch.append(frischer_feed())
            # 20.10.2026 (Härtung 3): EINE Quelle, kein Mischbetrieb. Frischer Feed lesbar → nur er (fehlt die Spalte, ist das ein Formatwechsel von heute,
            # kein Grund, einen älteren Feed zu glauben). Sonst der Tages-Feed, aber nur plausibel (Zeilenzahl, Alter ≤ FEED_MAX_ALTER_H).
            if frisch[0]:
                bs = fx.bestand_aus_feed(artnrs, frisch[0]); feed_grund = 'frischer Feed ohne Spalte «Lagerbestand Fortura»'
            elif os.path.exists(fx.FEED):
                fok, fgrund = feed_pruefen(fx.FEED)
                if fok:
                    bs = fx.bestand_aus_feed(artnrs, fx.FEED); feed_grund = 'Feed ohne Spalte «Lagerbestand Fortura»'
                else:
                    feed_grund = f'Tages-Feed unbrauchbar: {fgrund}'
            if bs is None and (frisch[0] or os.path.exists(fx.FEED)):
                neu[nr] = f'⚠️ FORTURA: #{nr} XML NICHT gesendet (Bestand unbekannt: {feed_grund}) — im Portal prüfen: {t[2]}'; continue
            if bs is not None:
                knapp = [f"{q['artnr']} Fortura-Lager {bs.get(q['artnr'], 0)} < {int(q['menge'])}" for q in pk['positionen']
                         if bs.get(q['artnr'], 0) < int(q['menge'])]
                if knapp:
                    t[3] = 'nicht-lagernd'; t[4] = '; '.join(knapp)
                    neu[nr] = _nicht_lagernd_zeile(nr, t); continue
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
                # 20.10.2026 (Härtung 2) AT-MOST-ONCE: erst als «xml-unterwegs» auf die Platte, DANN senden. Stirbt der Lauf dazwischen (Aufrufer-Timeout
                # 120 s), bleibt «xml-unterwegs» stehen und wird nie automatisch wiederholt — Fortura kann die Datei schon abgeholt haben.
                t[3] = 'xml-unterwegs'; t[4] = name; schreibe(led)
                fx.hochladen(sid, '/home/ORDERS', name, x)
                if name not in set(fx.liste(sid, '/home/ORDERS')):
                    neu[nr] = f'⚠️ FORTURA: #{nr} Upload nicht zurücklesbar ({name}) — Status «xml-unterwegs», nächster Lauf prüft den Ordner; {t[2]}'; continue
            t[3] = 'xml-hochgeladen'; t[4] = name; schreibe(led)
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
                if nr in led and led[nr][3] in ('xml-hochgeladen', 'xml-unterwegs', 'versandt'):
                    if led[nr][3] in ('xml-hochgeladen', 'xml-unterwegs'):
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
                t0 = dt.datetime.fromisoformat(t[1].replace('Z', '+00:00')); jetzt = dt.datetime.now(dt.timezone.utc)
                alter = (jetzt - t0).total_seconds() / 3600
                # 20.10.2026 (#1027): Fortura stornierte nach 20,7 h per MAIL (kein Rückkanal im Ordner: /home/ORDERS und /home/DESADV leer,
                # kein ORDRSP) — die Warnschwelle sinkt von 48 auf 24 h, damit ein Storno am nächsten Tag auffällt, nicht erst am übernächsten.
                # Härtung 6: gezählt werden Werktage-Stunden (Fortura arbeitet Mo–Fr): Freitag-Abend-Bestellung warnt nicht am Samstag.
                warn = fx.werktag_stunden(t0, jetzt) > 24
                neu[nr] = (f"{'⚠️ ' if warn else ''}FORTURA: #{nr} XML seit {alter:.0f} h bei Fortura, noch kein Lieferschein"
                           + (' — Posteingang info@luxestyle.ch auf Storno-Mail von fortura.ch prüfen, sonst nachfragen' if warn else ''))
    except Exception as e:
        neu['_'] = f'⚠️ FORTURA-XML: {str(e)[:140]}'
    finally:
        fx.abmelden(sid)
    alt = [z for z in zeilen if not any(f'#{nr} ' in z for nr in neu)]
    return alt + list(neu.values())


def _ist_beendet(nr):
    """20.10.2026 (#1027): ist die Shopify-Bestellung abgeschlossen? Nur dann endet die Verfolgung. Unbekannt/Fehler → False (konservativ: eine
    teilerstattete Bestellung mit laufender Lieferung darf nicht aus der Ampel fallen). Fragt EINE Bestellung per Name.
    Härtung 5: «cancelledAt» allein genügt nicht — eine stornierte Bestellung OHNE Erstattung schuldet der Kundin noch Geld, die Dauerzeile
    («Kundin erstatten») muss stehen bleiben. Beendet ist: Finanzstatus REFUNDED/VOIDED, oder storniert UND eine REFUND-Transaktion
    (SUCCESS oder PENDING — Shopify Payments hält Erstattungen tagelang auf «pending», #1027) existiert."""
    try:
        r = gql('query($q:String){orders(first:1,query:$q){nodes{name cancelledAt displayFinancialStatus transactions(first:30){kind status}}}}',
                {'q': f'name:#{nr}'})
        n = (((r or {}).get('orders') or {}).get('nodes') or [])
        if not n or n[0].get('name') != f'#{nr}':
            return False
        o = n[0]
        if o.get('displayFinancialStatus') in ('REFUNDED', 'VOIDED'):
            return True
        erstattet = any(tr.get('kind') == 'REFUND' and tr.get('status') in ('SUCCESS', 'PENDING') for tr in (o.get('transactions') or []))
        return bool(o.get('cancelledAt')) and erstattet
    except Exception:
        return False


def _nicht_lagernd_zeile(nr, t):
    return (f'⚠️ FORTURA: #{nr} NICHT bestellt — {t[4]} (Feed «Lagerbestand Fortura»; Bazar-Bestand zählt nicht) · Kundin erstatten '
            f'(Betreiber) oder Ersatz · die Zeile endet, sobald die Bestellung geschlossen ist; sonst `--geklaert {nr}`')


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
    if '--erneut' in sys.argv:
        nr = sys.argv[sys.argv.index('--erneut') + 1].lstrip('#')
        if nr not in led or led[nr][3] != 'xml-unterwegs':
            print(f'#{nr} steht nicht auf «xml-unterwegs»'); return 1
        led[nr][3] = 'bereit'; led[nr][4] = ''; schreibe(led)
        print(f'#{nr} freigegeben: der nächste Lauf sendet das XML neu (nur nach Rückfrage bei Fortura, dass KEINE Bestellung LX{nr} vorliegt)'); return 0
    if '--geklaert' in sys.argv:
        nr = sys.argv[sys.argv.index('--geklaert') + 1].lstrip('#')
        if nr not in led or led[nr][3] not in ('abweichend', 'nicht-lagernd'):
            print(f'#{nr} steht nicht auf «abweichend»/«nicht-lagernd»'); return 1
        led[nr][3] = 'geklaert'; schreibe(led); print(f'#{nr} Abweichung als geklärt quittiert'); return 0
    nodes = gql(Q)['orders']['nodes']
    os.makedirs(PAKETE, mode=0o700, exist_ok=True)
    zeilen, gesehen, offen = [], set(), {}
    for o in nodes:
        nr = o['name'].lstrip('#')
        pos = [(li['sku'][8:], (li.get('variant') or {}).get('barcode') or '', li['unfulfilledQuantity'], li['title'])
               for li in o['lineItems']['nodes'] if (li.get('sku') or '').startswith('fortura-') and li['unfulfilledQuantity'] > 0]
        if not pos:
            continue
        gesehen.add(nr)
        offen[nr] = {}
        for a, _, m, _ in pos:                 # Upload-Tor (stufe2): die Fortura-Positionen, die Shopify JETZT offen führt
            k = _fx().norm_artnr(a); offen[nr][k] = offen[nr].get(k, 0) + int(m)
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
        if st == 'nicht-lagernd':
            zeilen.append(_nicht_lagernd_zeile(nr, led[nr])); continue
        if st == 'bereit':
            alter = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(o['createdAt'].replace('Z', '+00:00'))).total_seconds() / 3600
            zeilen.append(f"⚠️ FORTURA: #{nr} ({alter:.0f} h) bereit — im Fortura-Portal bestellen: {txt} · danach "
                          f"`python3 automation/fortura_bestell_engine.py --bestellt {nr}`")
    # 13.10.2026 Nachtrag (N2): «abweichend» meldet sich in JEDEM Lauf — auch wenn Shopify die Bestellung inzwischen nicht mehr
    # als offen führt (von Hand erfüllt/geschlossen): erst `--geklaert <nr>` beendet die Zeile.
    zeilen += [_abweichend_zeile(nr, t) for nr, t in sorted(led.items()) if t[3] == 'abweichend' and nr not in gesehen]
    # 20.10.2026 (#1027): eine storniert/erstattete Bestellung steht nicht mehr in der offenen Liste — ihr Ledger-Status «xml-hochgeladen»/
    # «bereit»/«nicht-lagernd» machte sonst für immer «XML seit n h, noch kein Lieferschein» (ab 24 h mit ⚠️). Beendet wird nur bei
    # belegtem Storno/voller Erstattung (_ist_beendet), nie, weil die Bestellung bloss nicht in der Liste auftaucht.
    for nr, t in sorted(led.items()):
        if t[3] in ('bereit', 'xml-hochgeladen', 'xml-unterwegs', 'nicht-lagernd') and nr not in gesehen and _ist_beendet(nr):
            t[3] = 'storniert'; t[4] = f"{t[4]} · Shopify-Bestellung storniert/erstattet (Ledger {dt.datetime.now(dt.timezone.utc):%Y-%m-%d})"
    if os.path.exists(SCHALTER) and any(t[3] in ('bereit', 'xml-hochgeladen', 'xml-unterwegs', 'versandt') for t in led.values()):
        zeilen = stufe2(led, zeilen, offen)
    schreibe(led)
    print('\n'.join(zeilen) if zeilen else 'FORTURA: 0 offen')
    return 0


def selbsttest():
    """13.10.2026 Nachtrag (Prüfer N1–N4): Stufe 2 + main() ohne Netz. Fortura (Login/Liste/Download/Upload) und Shopify (gql)
    werden gespielt, Ledger/Pakete/Feed liegen in einem Temp-Ordner, `curl` wird nie aufgerufen."""
    import tempfile, shutil
    import fortura_xml as fx
    global LEDGER, PAKETE, SCHALTER, gql, frischer_feed, FEED_MIN_ZEILEN, FEED_MAX_ALTER_H
    feed_alt = (FEED_MIN_ZEILEN, FEED_MAX_ALTER_H)
    FEED_MIN_ZEILEN = 1               # Test-Feeds sind winzig; die Plausibilitätsfälle (P6) setzen die Schwelle selbst
    alt = (LEDGER, PAKETE, SCHALTER, gql, frischer_feed, fx.FEED, fx.anmelden, fx.abmelden, fx.liste, fx.herunterladen, fx.hochladen, fx._curl, sys.argv)
    td = tempfile.mkdtemp(prefix='fbe_test_')
    LEDGER, PAKETE, SCHALTER = os.path.join(td, 'led.tsv'), os.path.join(td, 'pakete'), os.path.join(td, 'schalter')
    os.makedirs(PAKETE); open(SCHALTER, 'w').close()
    fx.FEED = os.path.join(td, 'feed.csv')
    with open(fx.FEED, 'w', encoding='cp1252') as f:
        f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|1|5|\n90654-2|1|5|\n042156|1|5|\n59774|10|5|\n77777|1|0|\n88888|1|2|\n')
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
    frischer_feed = lambda: None          # 20.10.2026: kein Netz im Selbsttest — geprüft wird gegen den Test-Feed

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
    def offen_aus_paketen(l):
        """Shopify gespielt: die offenen Fortura-Positionen jeder «bereit»-Bestellung = ihr Paket (der Normalfall — Tor offen)."""
        o = {}
        for nr_, t_ in l.items():
            pp = os.path.join(PAKETE, f'{nr_}.json')
            if t_[3] == 'bereit' and os.path.exists(pp):
                for q in json.load(open(pp, encoding='utf-8'))['positionen']:
                    k = fx.norm_artnr(q['artnr']); o.setdefault(nr_, {}); o[nr_][k] = o[nr_].get(k, 0) + int(q['menge'])
        return o
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
        z = stufe2(led, [], offen_aus_paketen(led))
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
        z = stufe2(led, [], offen_aus_paketen(led))
        pruef('N4 Feed wieder da → XML hochgeladen', led['1034'][3] == 'xml-hochgeladen' and hoch and hoch[0][0] == 'ORDERS_LX1034.xml', (led['1034'], hoch))
        # 20.10.2026 (#1027): Bestandsprüfung VOR dem Upload — «Lagerbestand Fortura», nicht Bazar/Total
        def paket(nr, art, m):
            json.dump({'positionen': [{'artnr': art, 'ean': '', 'menge': m}], 'lieferadresse': {'firstName': 'A', 'lastName': 'B',
                       'address1': 'Weg 1', 'zip': '3000', 'city': 'Bern', 'countryCodeV2': 'CH'}, 'email': 'test@example.ch'},
                      open(os.path.join(PAKETE, f'{nr}.json'), 'w'))
        led['1035'] = ['1035', '2026-10-20T10:00Z', '77777×1', 'bereit', '']; paket('1035', '77777', 1)
        led['1036'] = ['1036', '2026-10-20T10:00Z', '88888×2', 'bereit', '']; paket('1036', '88888', 2)
        hoch.clear()
        z = stufe2(led, [], offen_aus_paketen(led))
        alles = '\n'.join(z)
        pruef('O1 Fortura-Lager 0 → «nicht-lagernd», KEIN Upload', led['1035'][3] == 'nicht-lagernd' and not any(n == 'ORDERS_LX1035.xml' for n, _ in hoch), (led['1035'], hoch))
        pruef('O1 Warnzeile nennt Artikel, Lager und Menge', any('#1035' in x and '77777 Fortura-Lager 0 < 1' in x and 'NICHT bestellt' in x for x in z), alles)
        pruef('O1 genau ausreichend (2 von 2) → XML hochgeladen', led['1036'][3] == 'xml-hochgeladen' and any(n == 'ORDERS_LX1036.xml' for n, _ in hoch), (led['1036'], hoch))
        # O2 Bestand reicht NUR im Bazar: der Feed hat die Spalte «Lagerbestand Bazar» 5, «Lagerbestand Fortura» 0 — es zählt Fortura
        with open(fx.FEED, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Bazar|Lagerbestand Fortura|Lagerbestand Total|\n99001|1|5|0|5|\n')
        led['1037'] = ['1037', '2026-10-20T10:00Z', '99001×1', 'bereit', '']; paket('1037', '99001', 1)
        stufe2(led, [], offen_aus_paketen(led))
        pruef('O2 nur im Bazar (Bazar 5, Fortura 0, Total 5) → «nicht-lagernd» (der Fall #1027)', led['1037'][3] == 'nicht-lagernd', led['1037'])
        # O3 Feed ohne Spalte «Lagerbestand Fortura» → kein Upload, KEIN Rückfall auf Total
        with open(fx.FEED, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Total|\n99002|1|9|\n')
        led['1038'] = ['1038', '2026-10-20T10:00Z', '99002×1', 'bereit', '']; paket('1038', '99002', 1)
        z = stufe2(led, [], offen_aus_paketen(led))
        pruef('O3 Spalte fehlt → kein Upload, Status bleibt «bereit»', led['1038'][3] == 'bereit' and not any(n == 'ORDERS_LX1038.xml' for n, _ in hoch), led['1038'])
        pruef('O3 Warnzeile «Bestand unbekannt»', any('#1038' in x and 'Bestand unbekannt' in x for x in z), '\n'.join(z))
        # O4 frischer Feed hat Vorrang vor dem Tages-Feed
        with open(fx.FEED, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n99003|1|5|\n')
        frisch_pfad = os.path.join(td, 'frisch.csv')
        with open(frisch_pfad, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n99003|1|0|\n')
        frischer_feed = lambda: frisch_pfad
        led['1039'] = ['1039', '2026-10-20T10:00Z', '99003×1', 'bereit', '']; paket('1039', '99003', 1)
        stufe2(led, [], offen_aus_paketen(led))
        pruef('O4 frischer Feed (0) schlägt Tages-Feed (5) → «nicht-lagernd»', led['1039'][3] == 'nicht-lagernd', led['1039'])
        frischer_feed = lambda: None
        with open(fx.FEED, 'w', encoding='cp1252') as f:      # Test-Feed für die folgenden Fälle wiederherstellen
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|1|5|\n90654-2|1|5|\n042156|1|5|\n59774|10|5|\n')
        # nicht-lagernd: Dauerzeile solange die Bestellung offen ist; --geklaert beendet sie; geschlossene Bestellung (nicht in Shopify-Liste) schweigt
        schreibe(led)
        import io, contextlib
        sys.argv = ['x', '--geklaert', '1035']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = main()
        pruef('O5 --geklaert beendet «nicht-lagernd»', rc == 0 and ledger()['1035'][3] == 'geklaert', (rc, buf.getvalue()))
        # O6 (#1027): storno/erstattete Bestellung beendet die Verfolgung — nur bei BELEGTEM Storno
        led['1040'] = ['1040', '2026-10-19T10:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX1040.xml']
        led['1041'] = ['1041', '2026-10-19T10:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX1041.xml']
        schreibe(led)
        gql_alt = gql
        def _gql_storno(q, v=None):
            if v and str(v.get('q', '')) == 'name:#1040':
                return {'orders': {'nodes': [{'name': '#1040', 'cancelledAt': '2026-10-20T14:09:51Z', 'displayFinancialStatus': 'PAID',
                                              'transactions': [{'kind': 'SALE', 'status': 'SUCCESS'}, {'kind': 'REFUND', 'status': 'PENDING'}]}]}}
            if v and str(v.get('q', '')) == 'name:#1041':
                return {'orders': {'nodes': [{'name': '#1041', 'cancelledAt': None, 'displayFinancialStatus': 'PARTIALLY_REFUNDED', 'transactions': []}]}}
            return gql_alt(q, v)
        gql = _gql_storno
        sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        gql = gql_alt
        pruef('O6 storniert (cancelledAt) → Ledger «storniert», keine Dauerzeile', ledger()['1040'][3] == 'storniert' and '#1040' not in buf.getvalue(), (ledger()['1040'], buf.getvalue()))
        pruef('O6 nur teilerstattet (nicht storniert) → bleibt «xml-hochgeladen»', ledger()['1041'][3] == 'xml-hochgeladen', ledger()['1041'])
        pruef('O6 Shopify-Antwort fehlt/unbekannt → nicht beenden', _ist_beendet('9999') is False)
        # ================= 20.10.2026 HÄRTUNG (P1–P12) =================
        hoch.clear()
        # P1 TOR: Bestellung in Shopify nicht mehr bezahlt+offen (storniert/erstattet/erfüllt) → KEIN Upload
        led['1050'] = ['1050', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1050', '93583', 1)
        z = stufe2(led, [], {})
        pruef('P1 nicht mehr offen in Shopify → KEIN Upload, Status bleibt «bereit»', led['1050'][3] == 'bereit' and not any(nm == 'ORDERS_LX1050.xml' for nm, _ in hoch), (led['1050'], hoch))
        pruef('P1 Warnzeile «nicht (mehr) bezahlt/offen» mit Hinweis --bestellt', any('#1050' in x and 'nicht (mehr) bezahlt/offen' in x and '--bestellt 1050' in x for x in z), z)
        # P2 TOR: Menge seit dem Paket geändert (Teilerstattung) → KEIN Upload
        led['1051'] = ['1051', '2026-10-20T10:00Z', '93583×2', 'bereit', '']; paket('1051', '93583', 2)
        z = stufe2(led, [], {'1051': {'93583': 1}})
        pruef('P2 Menge geändert (Paket 2, Shopify 1) → KEIN Upload', led['1051'][3] == 'bereit' and not any(nm == 'ORDERS_LX1051.xml' for nm, _ in hoch), (led['1051'], hoch))
        pruef('P2 Warnzeile «seit dem Paket geändert»', any('#1051' in x and 'seit dem Paket geändert' in x for x in z), z)
        # P3 TOR offen: gleiche Positionen (norm_artnr: «093583» = «93583») → Upload; P5 Ledger steht SOFORT auf Platte (ohne main()/schreibe danach)
        z = stufe2(led, [], {'1051': {'93583': 2}})
        pruef('P3 Shopify = Paket → XML hochgeladen', led['1051'][3] == 'xml-hochgeladen' and any(nm == 'ORDERS_LX1051.xml' for nm, _ in hoch), (led['1051'], hoch))
        pruef('P5 Ledger auf Platte sofort «xml-hochgeladen» (kein späteres schreibe nötig)', ledger().get('1051', [None] * 5)[3] == 'xml-hochgeladen', ledger().get('1051'))
        # P4 AT-MOST-ONCE: Absturz beim Senden → «xml-unterwegs» auf der Platte, nie automatisch wiederholt
        led['1052'] = ['1052', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1052', '93583', 1)
        orig_hoch = fx.hochladen
        def _absturz(sid, o, nm, x):
            raise RuntimeError('Verbindung weg')
        fx.hochladen = _absturz
        z = stufe2(led, [], {'1052': {'93583': 1}})
        fx.hochladen = orig_hoch
        pruef('P4 Absturz im Upload → Platte zeigt «xml-unterwegs» (VOR dem Senden geschrieben)', ledger().get('1052', [None] * 5)[3] == 'xml-unterwegs', ledger().get('1052'))
        n_vor = len(hoch)
        z = stufe2(led, [], {'1052': {'93583': 1}})
        pruef('P4 nächster Lauf: KEIN zweiter Upload (Datei nicht im Ordner → Upload unklar)', len(hoch) == n_vor and led['1052'][3] == 'xml-unterwegs' and any('#1052' in x and 'Upload unklar' in x and '--erneut 1052' in x for x in z), (hoch, z))
        hoch.append(('ORDERS_LX1052.xml', b'<x/>'))
        z = stufe2(led, [], {'1052': {'93583': 1}})
        pruef('P4 Datei liegt im Ordner → «xml-hochgeladen» (nachträglich bestätigt)', led['1052'][3] == 'xml-hochgeladen' and any('nachträglich bestätigt' in x for x in z), (led['1052'], z))
        led['1053'] = ['1053', '2026-10-20T10:00Z', '93583×1', 'xml-unterwegs', 'ORDERS_LX1053.xml']
        schreibe(led)
        sys.argv = ['x', '--erneut', '1053']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = main()
        pruef('P4 --erneut gibt «xml-unterwegs» wieder frei (→ «bereit»)', rc == 0 and ledger()['1053'][3] == 'bereit', (rc, buf.getvalue()))
        sys.argv = ['x', '--erneut', '1031']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = main()
        pruef('P4 --erneut lehnt andere Status ab', rc == 1, (rc, buf.getvalue()))
        led.pop('1053', None); schreibe(led)
        # P6 FEED-PLAUSIBILITÄT: zu wenig Zeilen / zu alt → Bestand unbekannt, KEIN Upload
        led['1054'] = ['1054', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1054', '93583', 1)
        FEED_MIN_ZEILEN = 100
        z = stufe2(led, [], {'1054': {'93583': 1}})
        pruef('P6 Feed mit zu wenig Zeilen → «Bestand unbekannt», KEIN Upload', led['1054'][3] == 'bereit' and any('#1054' in x and 'Bestand unbekannt' in x and 'Zeilen' in x for x in z) and not any(nm == 'ORDERS_LX1054.xml' for nm, _ in hoch), (led['1054'], z))
        FEED_MIN_ZEILEN = 1
        t_alt = time.time() - 40 * 3600
        os.utime(fx.FEED, (t_alt, t_alt))
        z = stufe2(led, [], {'1054': {'93583': 1}})
        pruef('P6 Tages-Feed 40 h alt → «Bestand unbekannt … alt», KEIN Upload', led['1054'][3] == 'bereit' and any('#1054' in x and 'h alt' in x for x in z), (led['1054'], z))
        os.utime(fx.FEED, None)
        pruef('P6 feed_pruefen: frischer Test-Feed ist brauchbar', feed_pruefen(fx.FEED)[0], feed_pruefen(fx.FEED))
        # P7 KEIN RÜCKFALL: frischer Feed lesbar, aber ohne Spalte → Bestand unbekannt, obwohl der Tages-Feed die Spalte hat
        ohne_spalte = os.path.join(td, 'frisch_ohne.csv')
        with open(ohne_spalte, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Bestand|\n93583|1|9|\n')
        frischer_feed = lambda: ohne_spalte
        z = stufe2(led, [], {'1054': {'93583': 1}})
        pruef('P7 frischer Feed ohne Spalte → KEIN Rückfall auf den Tages-Feed', led['1054'][3] == 'bereit' and any('#1054' in x and 'frischer Feed ohne Spalte' in x for x in z) and not any(nm == 'ORDERS_LX1054.xml' for nm, _ in hoch), (led['1054'], z))
        frischer_feed = lambda: None
        z = stufe2(led, [], {'1054': {'93583': 1}})
        pruef('P7 Gegenprobe: ohne frischen Feed gilt der plausible Tages-Feed → Upload', led['1054'][3] == 'xml-hochgeladen', (led['1054'], z))
        # P8 ERSTATTUNGSBELEG: Verfolgung endet nur mit Beleg
        gql_p8 = gql
        def _gql_b(q, v=None):
            nm = str((v or {}).get('q', '')).split('#')[-1]
            tab = {'1060': {'cancelledAt': 'x', 'displayFinancialStatus': 'PAID', 'transactions': [{'kind': 'SALE', 'status': 'SUCCESS'}]},
                   '1061': {'cancelledAt': 'x', 'displayFinancialStatus': 'PAID', 'transactions': [{'kind': 'REFUND', 'status': 'SUCCESS'}]},
                   '1062': {'cancelledAt': None, 'displayFinancialStatus': 'REFUNDED', 'transactions': []},
                   '1063': {'cancelledAt': None, 'displayFinancialStatus': 'VOIDED', 'transactions': []},
                   '1064': {'cancelledAt': None, 'displayFinancialStatus': 'PAID', 'transactions': [{'kind': 'REFUND', 'status': 'PENDING'}]},
                   '1065': {'cancelledAt': 'x', 'displayFinancialStatus': 'PAID', 'transactions': [{'kind': 'REFUND', 'status': 'FAILURE'}]}}
            return {'orders': {'nodes': [dict(name='#' + nm, **tab[nm])] if nm in tab else []}}
        gql = _gql_b
        pruef('P8 storniert OHNE Erstattung → NICHT beendet (Kundin wartet auf Geld)', _ist_beendet('1060') is False)
        pruef('P8 storniert + REFUND SUCCESS → beendet', _ist_beendet('1061') is True)
        pruef('P8 REFUNDED / VOIDED → beendet', _ist_beendet('1062') is True and _ist_beendet('1063') is True)
        pruef('P8 Teilerstattung (nicht storniert) → nicht beendet', _ist_beendet('1064') is False)
        pruef('P8 storniert + gescheiterte Erstattung → nicht beendet', _ist_beendet('1065') is False)
        gql = gql_p8
        # P9 WERKTAGE: Freitag-Abend → Montag früh ist keine Warn-Frist
        U = dt.timezone.utc
        pruef('P9 Fr 16:00 → Mo 10:00 = 18 Werktage-Stunden', abs(fx.werktag_stunden(dt.datetime(2026, 10, 23, 16, tzinfo=U), dt.datetime(2026, 10, 26, 10, tzinfo=U)) - 18) < 1e-6)
        pruef('P9 Sa → So = 0 · Mo 08 → Mo 20 = 12', fx.werktag_stunden(dt.datetime(2026, 10, 24, 6, tzinfo=U), dt.datetime(2026, 10, 25, 22, tzinfo=U)) == 0
              and abs(fx.werktag_stunden(dt.datetime(2026, 10, 19, 8, tzinfo=U), dt.datetime(2026, 10, 19, 20, tzinfo=U)) - 12) < 1e-6)
        # P10 EXAKTE ArtNr zuerst: «0123» und «123» sind im Feed zwei Artikel
        with open(fx.FEED, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n0123|1|7|\n123|4|2|\n')
        pruef('P10 «123» → exakte Zeile (Bestand 2, VE 4)', fx.bestand_aus_feed(['123']) == {'123': 2} and fx.ve_aus_feed(['123']) == {'123': 4}, (fx.bestand_aus_feed(['123']), fx.ve_aus_feed(['123'])))
        pruef('P10 «0123» → exakte Zeile (Bestand 7, VE 1)', fx.bestand_aus_feed(['0123']) == {'0123': 7} and fx.ve_aus_feed(['0123']) == {'0123': 1})
        pruef('P10 «00123» (nur lockere Treffer) → kleinerer Bestand 2, grössere VE 4', fx.bestand_aus_feed(['00123']) == {'00123': 2} and fx.ve_aus_feed(['00123']) == {'00123': 4})
        with open(fx.FEED, 'w', encoding='cp1252') as f:      # Test-Feed für die folgenden Fälle wiederherstellen
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|1|5|\n90654-2|1|5|\n042156|1|5|\n59774|10|5|\n')
        # P11 main() reicht das Tor durch: Shopify-Liste → offen → Upload; Menge geändert / nicht mehr in der Liste → Halt
        def _knoten(nr_, menge):
            return {'name': '#' + nr_, 'createdAt': '2026-10-20T10:00:00Z', 'displayFulfillmentStatus': 'UNFULFILLED', 'email': 't@e.ch',
                    'shippingAddress': {'firstName': 'A', 'lastName': 'B', 'address1': 'Weg 1', 'zip': '3000', 'city': 'Bern', 'countryCodeV2': 'CH'},
                    'lineItems': {'nodes': [{'sku': 'fortura-93583', 'title': 'T', 'quantity': menge, 'unfulfilledQuantity': menge,
                                             'variant': {'barcode': '123'}}]}}
        liste = [_knoten('1070', 1), _knoten('1071', 2)]
        gql_m = gql
        def _gql_q(q, v=None):
            if 'financial_status:paid' in q:
                return {'orders': {'nodes': liste}}
            return gql_m(q, v)
        gql = _gql_q
        led = ledger()
        led['1071'] = ['1071', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1071', '93583', 1)     # Paket: 1 — Shopify führt jetzt 2
        led['1072'] = ['1072', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1072', '93583', 1)     # nicht mehr in der Liste (storniert)
        schreibe(led)
        hoch.clear(); sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        out = buf.getvalue()
        pruef('P11 main(): #1070 (neu, bezahlt+offen) → XML hochgeladen', ledger()['1070'][3] == 'xml-hochgeladen' and any(nm == 'ORDERS_LX1070.xml' for nm, _ in hoch), (ledger().get('1070'), hoch))
        pruef('P11 main(): #1071 Menge geändert → KEIN Upload, Zeile «geändert»', ledger()['1071'][3] == 'bereit' and not any(nm == 'ORDERS_LX1071.xml' for nm, _ in hoch) and 'seit dem Paket geändert' in out, out)
        pruef('P11 main(): #1072 nicht mehr offen (ohne Erstattungsbeleg) → KEIN Upload, Zeile «nicht (mehr) bezahlt/offen»', ledger()['1072'][3] == 'bereit' and not any(nm == 'ORDERS_LX1072.xml' for nm, _ in hoch) and '#1072' in out and 'nicht (mehr) bezahlt/offen' in out, out)
        gql = gql_m
        led = ledger()
        for k in ('1070', '1071', '1072'):
            led.pop(k, None)
        schreibe(led)
        # P12 DESADV löst auch eine «xml-unterwegs»-Bestellung auf (der Upload kam an, nur die Quittung ging verloren); Timeout-Invariante
        led['1080'] = ['1080', '2026-10-20T10:00Z', '93583×1', 'xml-unterwegs', 'ORDERS_LX1080.xml']
        desadv['D1080.xml'] = lief('1080', [('93583', '1', '1', '')])
        shop['1080'] = [('fortura-93583', 1)]
        stufe2(led, [], {})
        pruef('P12 Lieferschein für «xml-unterwegs» → «erfuellt» (Tracking trotz verlorener Quittung)', led['1080'][3] == 'erfuellt' and 'DPD 01501080' in led['1080'][4], led['1080'])
        desadv.pop('D1080.xml', None)
        pruef('P12 Abruf-Timeout liegt unter dem Aufrufer-Timeout (engine_keepalive.sh: timeout 120)', FEED_ABRUF_TIMEOUT < 120, FEED_ABRUF_TIMEOUT)
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
        (LEDGER, PAKETE, SCHALTER, gql, frischer_feed, fx.FEED, fx.anmelden, fx.abmelden, fx.liste, fx.herunterladen, fx.hochladen, fx._curl, sys.argv) = alt
        shutil.rmtree(td, ignore_errors=True)
        FEED_MIN_ZEILEN, FEED_MAX_ALTER_H = feed_alt
    print(f"SELBSTTEST {'OK' if ok else 'FEHLER'} ({n} Fälle)")
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(selbsttest() if '--selbsttest' in sys.argv else main())
