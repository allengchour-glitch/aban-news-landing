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
  python3 automation/fortura_bestell_engine.py --geklaert <nr>   → auch für «teilgeliefert»/«versandt»/«storniert-xml» (Storno-Mail an Fortura geschickt)
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
SPERRE = os.environ.get('FORTURA_SPERRE', '/tmp/fortura_engine.lock')
FEED_MIN_ZEILEN = 15000        # echter Feed: 20'228 Zeilen (20.10.2026); ein abgeschnittener/leerer Feed ist kein Bestandsbeweis
FEED_MAX_ALTER_H = 30          # der Tages-Feed kommt täglich; älter als 30 h = Abruf ist ausgefallen → Bestand unbekannt
FEED_FRISCH = '/tmp/fortura_feed_bestellung.csv'
FEED_ABRUF_TIMEOUT = 80        # Sekunden; MUSS unter dem Aufrufer-Timeout liegen (engine_keepalive.sh: timeout 120)
HALT_STATI = ('ON_HOLD', 'REQUEST_DECLINED', 'RESTOCKED', 'FULFILLED')   # Fulfillment-Status, bei dem NICHT bestellt wird (Betreiber hält die Ware zurück / schon erledigt)
# Reihenfolge der Zustände: bei doppelten Ledger-Zeilen (git-merge --union zweier Rechner) gewinnt der WEITERE Zustand, nie «bereit» über «xml-hochgeladen»
RANG = {'bereit': 0, 'nicht-lagernd': 1, 'xml-unterwegs': 2, 'xml-hochgeladen': 3, 'bestellt': 3, 'versandt': 4, 'teilgeliefert': 5, 'abweichend': 5,
        'erfuellt': 6, 'geklaert': 6, 'storniert-xml': 6, 'storniert': 7}
Q = ('{orders(first:30,query:"financial_status:paid AND status:open AND created_at:>=2026-10-01",sortKey:CREATED_AT,reverse:true){pageInfo{hasNextPage} nodes{'
     'name createdAt cancelledAt closedAt displayFulfillmentStatus email shippingAddress{name firstName lastName company address1 address2 zip city countryCodeV2 phone} '
     'lineItems(first:30){pageInfo{hasNextPage} nodes{sku title quantity unfulfilledQuantity variant{barcode}}}}}}')


def _sperre_holen():
    """28.10.2026 (Zweitmeinung Codex, am echten Code nachgestellt): NUR EIN Lauf zugleich auf diesem Rechner. Zwei überlappende Läufe (Stundenlauf + Handlauf) lasen beide «bereit»,
    der zweite lud dieselbe Bestellung noch einmal hoch, sobald Fortura die erste Datei abgeholt hatte (Ordner leer, `overwrite=false` greift nur bei vorhandener Datei) = zweite Lieferantenbestellung.
    flock fällt mit dem Prozess weg (auch bei Kill/Timeout, `engine_keepalive.sh: timeout 120`). Rückgabe: offene Datei (festhalten!), None = anderer Lauf aktiv,
    'ohne' = Sperre nicht möglich (z. B. /tmp nicht beschreibbar): dann weiterlaufen, Bestellungen dürfen nicht an der Sperre scheitern.
    GRENZE: gilt je Rechner. Zwei Rechner mit eigenem Ledger schützt dies nicht; dort bleibt der frisch gelesene Ordner und das Ledger (siehe eine())."""
    try:
        import fcntl
        f = open(SPERRE, 'a')
    except (OSError, ImportError):
        return 'ohne'
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        f.close()
        return None
    return f


def ledger():
    d = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding='utf-8'):
            t = z.rstrip('\n').split('\t')
            if len(t) >= 4 and t[0] != 'nr':
                # 20.10.2026 (Prüfer): zwei Zeilen derselben Bestellung (git-merge --union) → der weitere Zustand gewinnt, bei Gleichstand die spätere
                if t[0] not in d or RANG.get(t[3], 0) >= RANG.get(d[t[0]][3], 0):
                    d[t[0]] = t
    return d


def schreibe(d):
    """Atomar (Temp-Datei im selben Ordner + fsync + os.replace): ein Kill/ENOSPC mitten im Schreiben darf das Ledger nie leeren — es ist der
    einzige Schutz gegen eine zweite Bestellung bei Fortura (20.10.2026, Prüfer)."""
    tmp = LEDGER + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('nr\tzeit\tpositionen\tstatus\tfortura_auftrag\n')
        for t in sorted(d.values()):
            f.write('\t'.join((t + [''] * 5)[:5]) + '\n')
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, LEDGER)


def paket_schreiben(p, paket):
    """Paket (Adresse!) atomar ablegen, 600."""
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(paket, f, ensure_ascii=False, indent=1)
        f.flush(); os.fsync(f.fileno())
    os.chmod(tmp, 0o600)
    os.replace(tmp, p)


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
    rest = {k: int(v) for k, v in geliefert.items()}     # 28.10.2026 (Zweitmeinung Codex): die gelieferte Menge je Nummer wird verbraucht, nicht jeder gleichen SKU-Position voll zugeteilt
    for fo in o['fulfillmentOrders']['nodes']:
        if fo['status'] not in ('OPEN', 'IN_PROGRESS', 'SCHEDULED'):
            continue
        teile = []
        for li in fo['lineItems']['nodes']:
            sku = (li['lineItem'] or {}).get('sku') or ''
            # 13.10.2026 Nachtrag (N2): geliefert ist nach norm_artnr geschlüsselt (führende Nullen/Leerraum egal)
            key = _fx().norm_artnr(sku[8:]) if sku.startswith('fortura-') else None
            menge = min(rest.get(key, 0), li['remainingQuantity']) if key is not None else 0
            if menge > 0:
                rest[key] -= menge
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
    ziel = FEED_FRISCH
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


def stufe2(led, zeilen, offen, gehalten=None):
    """XML-Upload für «bereit», DESADV-Rücklauf für «xml-hochgeladen». Ersetzt die Stufe-1-Zeilen der betroffenen Bestellungen.
    offen = {nr: {norm_artnr: menge}} der Bestellungen, die JETZT in Shopify bezahlt+offen sind und Fortura-Positionen offen haben (aus main()).
    gehalten = {nr: Grund} für Bestellungen, die zwar in der Liste stehen, aber nicht bestellt werden dürfen (storniert/geschlossen/ON_HOLD …).
    `offen` ist ein Pflicht-Parameter (kein Default): wer das Tor vergisst, bekommt einen TypeError statt eines stillen Uploads."""
    import fortura_xml as fx, re
    gehalten = gehalten or {}
    try:
        sid = fx.anmelden()
    except Exception as e:
        return zeilen + [f'⚠️ FORTURA-XML: Server nicht erreichbar ({str(e)[:90]}) — Stufe-1-Zeilen gelten']
    neu = {}
    frisch = []                                   # 20.10.2026: frischer Feed höchstens EINMAL je Lauf holen (erst bei der ersten «bereit»-Bestellung)
    verbraucht = {}                               # norm_artnr → in DIESEM Lauf schon zugesagte Menge (Feed-Bestand sinkt mit jedem Upload)

    def jetzt_iso():
        return dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')

    def unklar_zeile(nr, t, grund):
        return (f'⚠️ FORTURA: #{nr} Upload unklar ({grund}) — Status «xml-unterwegs»: NICHT im Portal bestellen, bei Fortura/Webtransfer nachsehen; '
                f'`--erneut {nr}` sendet neu, `--bestellt {nr}` quittiert eine Handbestellung')

    def eine(nr, t, vorhanden):
        """Eine «bereit»-Bestellung → Warn-/Statuszeile oder None. Wirft nie über die Bestellung hinaus (der Aufrufer fängt und meldet mit Nummer)."""
        p = os.path.join(PAKETE, f'{nr}.json')
        if not os.path.exists(p):
            return f'⚠️ FORTURA: #{nr} Paket fehlt in {PAKETE} (Neustart?) — im Portal bestellen: {t[2]}'
        try:
            pk = json.load(open(p, encoding='utf-8'))
            pk['positionen'][0]['artnr']
        except (ValueError, OSError, KeyError, IndexError, TypeError) as e:
            try:
                os.remove(p)                      # abgeschnitten/leer (Kill im Schreiben): löschen — main() baut es aus Shopify neu
            except OSError:
                pass
            return f'⚠️ FORTURA: #{nr} Paket unlesbar ({e.__class__.__name__}) und gelöscht — der nächste Lauf baut es aus Shopify neu; {t[2]}'
        # 20.10.2026 (Härtung 1) UPLOAD-TOR: nur für Bestellungen, die JETZT bezahlt+offen sind und deren Fortura-Positionen dem Paket gleichen.
        # Storniert/erstattet/zurückgehalten (ON_HOLD)/von Hand erfüllt/teilerstattet/Menge geändert → NICHT senden (Fortura würde Ware ausliefern,
        # die wir erstattet haben bzw. die der Betreiber zurückhält).
        if nr in gehalten and gehalten[nr].startswith('PAKET:'):
            return f'⚠️ FORTURA: #{nr} XML NICHT gesendet — {gehalten[nr][6:]}; {t[2]}'
        if nr in gehalten:
            return (f'⚠️ FORTURA: #{nr} XML NICHT gesendet — Shopify-Status {gehalten[nr]} (storniert/geschlossen/zurückgehalten/erledigt) — freigeben '
                    f'oder von Hand bestellen (`--bestellt {nr}`). {t[2]}')
        jetzt_pos = offen.get(nr)
        if jetzt_pos is None:
            return (f'⚠️ FORTURA: #{nr} XML NICHT gesendet — in Shopify nicht (mehr) bezahlt/offen mit Fortura-Position (storniert, erstattet, '
                    f'erfüllt?) — prüfen; von Hand bestellt: `--bestellt {nr}`. {t[2]}')
        paket_pos, roh = {}, {}
        for q in pk['positionen']:
            k = fx.norm_artnr(q['artnr']); paket_pos[k] = paket_pos.get(k, 0) + int(q['menge']); roh.setdefault(k, q['artnr'])
        if paket_pos != jetzt_pos:
            return (f'⚠️ FORTURA: #{nr} XML NICHT gesendet — Bestellung seit dem Paket geändert (Paket {paket_pos} ≠ Shopify {jetzt_pos}); '
                    f'Paket {PAKETE}/{nr}.json löschen baut es aus Shopify neu, danach läuft es von selbst')
        name = f'ORDERS_LX{nr}.xml'
        # 20.10.2026 (#1027): hat Fortura die Ware JETZT im eigenen Lager («Lagerbestand Fortura», nicht Bazar/Total)? Nein → kein XML,
        # Status «nicht-lagernd», Dauerzeile bis die Bestellung erstattet/geschlossen ist (der Betreiber entscheidet; die Engine erstattet nie).
        artnrs = [q['artnr'] for q in pk['positionen']]
        bs, feed_grund, quelle = None, '', fx.FEED
        if not frisch:
            frisch.append(frischer_feed())
        # 20.10.2026 (Härtung 3): EINE Quelle, kein Mischbetrieb — für Bestand UND Verpackungseinheit (VE). Frischer Feed lesbar → nur er (fehlt die Spalte,
        # ist das ein Formatwechsel von heute, kein Grund, einen älteren Feed zu glauben). Sonst der Tages-Feed, aber nur plausibel (Zeilenzahl, Alter).
        if frisch[0]:
            quelle = frisch[0]; bs = fx.bestand_aus_feed(artnrs, quelle); feed_grund = 'frischer Feed ohne Spalte «Lagerbestand Fortura»'
        elif os.path.exists(fx.FEED):
            fok, fgrund = feed_pruefen(fx.FEED)
            if fok:
                bs = fx.bestand_aus_feed(artnrs, fx.FEED); feed_grund = 'Feed ohne Spalte «Lagerbestand Fortura»'
            else:
                feed_grund = f'Tages-Feed unbrauchbar: {fgrund}'
        if bs is None and (frisch[0] or os.path.exists(fx.FEED)):
            return f'⚠️ FORTURA: #{nr} XML NICHT gesendet (Bestand unbekannt: {feed_grund}) — im Portal prüfen: {t[2]}'
        if bs is not None:
            # Härtung (Prüfer): Bedarf je ArtNr SUMMIERT (zwei Positionen derselben Nummer) und abzüglich dessen, was dieser Lauf schon zugesagt hat
            knapp = []
            for k, m in paket_pos.items():
                lager = bs.get(roh[k], 0) - verbraucht.get(k, 0)
                if lager < m:
                    knapp.append(f'{roh[k]} Fortura-Lager {lager} < {m}')
            if knapp:
                t[3] = 'nicht-lagernd'; t[4] = '; '.join(knapp)
                return _nicht_lagernd_zeile(nr, t)
        ve = fx.ve_aus_feed(artnrs, quelle)                  # 13.10.: Bündel (VE>1) nie raten — aus derselben Quelle wie der Bestand
        # 13.10.2026 Nachtrag (N4): Feed fehlt (None) oder Artikel nicht im Feed → 've': None → bau_orders_xml lehnt ab (fail-closed)
        x, fehler = fx.bau_orders_xml(f'LX{nr}', pk.get('lieferadresse'), pk.get('email'),
                                      [{'artnr': q['artnr'], 'ean': q.get('ean'), 'menge': int(q['menge']),
                                        've': (ve or {}).get(q['artnr'])}
                                       for q in pk['positionen']],
                                      f'LuxeStyle Dropship #{nr} - neutraler Versand an Endkundin')
        if fehler:
            return f'⚠️ FORTURA: #{nr} XML NICHT gesendet ({"; ".join(fehler)[:120]}) — im Portal bestellen: {t[2]}'
        if name not in vorhanden:
            # 28.10.2026 (Zweitmeinung Codex): `vorhanden` und `led` stammen vom Laufanfang, der Feed-Abruf davor dauert bis 80 s. Ein anderer Lauf kann die Bestellung inzwischen
            # gesendet haben, und Fortura holt Dateien ab (Ordner dann leer): nur das Ledger weiss es. Darum JETZT Ledger und Ordner frisch lesen.
            aktuell = ledger().get(nr)
            if aktuell is not None and aktuell[3] != 'bereit':
                t[:] = (aktuell + [''] * 5)[:5]          # den fremden Stand übernehmen: das abschliessende schreibe(led) in main() darf ihn nicht auf «bereit» zurückdrehen
                return (f'⚠️ FORTURA: #{nr} XML NICHT gesendet — das Ledger steht inzwischen auf «{aktuell[3]}» (anderer Lauf?), '
                        f'der nächste Lauf prüft es; {t[2]}')
            if name in set(fx.liste(sid, '/home/ORDERS')):
                t[3] = 'xml-hochgeladen'; t[4] = name; schreibe(led)
                return f'FORTURA: #{nr} {name} liegt bereits bei Fortura (frisch gelesen, nicht noch einmal gesendet) — wartet auf Lieferschein'
            # 20.10.2026 (Härtung 2) AT-MOST-ONCE: erst als «xml-unterwegs» auf die Platte, DANN senden. Stirbt der Lauf dazwischen (Aufrufer-Timeout
            # 120 s), bleibt «xml-unterwegs» stehen und wird nie automatisch wiederholt — Fortura kann die Datei schon abgeholt haben.
            # Die Uhr der 24-h-Warnung startet mit dem Senden (nicht mit der Erstsichtung, die ein Halt tagelang vorher liegen kann).
            t[3] = 'xml-unterwegs'; t[4] = name; t[1] = jetzt_iso(); schreibe(led)
            try:
                fx.hochladen(sid, '/home/ORDERS', name, x)
            except Exception as e:
                if re.match(r'curl (6|7):', str(e)):          # DNS/Verbindung gescheitert: nachweislich NICHTS gesendet → nächster Lauf darf es erneut versuchen
                    t[3] = 'bereit'; t[4] = ''; schreibe(led)
                    return f'⚠️ FORTURA: #{nr} Upload nicht gesendet ({str(e)[:70]}) — nächster Lauf versucht es erneut; {t[2]}'
                return unklar_zeile(nr, t, str(e)[:70])
            if name not in set(fx.liste(sid, '/home/ORDERS')):
                return f'⚠️ FORTURA: #{nr} Upload nicht zurücklesbar ({name}) — Status «xml-unterwegs», nächster Lauf prüft den Ordner; {t[2]}'
        t[3] = 'xml-hochgeladen'; t[4] = name; schreibe(led)
        for k, m in paket_pos.items():
            verbraucht[k] = verbraucht.get(k, 0) + m
        return f'FORTURA: #{nr} als {name} an Fortura übermittelt ({t[2]}) — wartet auf Lieferschein'

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
                neu[nr] = unklar_zeile(nr, t, f'{t[4]} nicht im Ordner, kein Lieferschein')
        for nr, t in sorted(led.items()):
            if t[3] != 'bereit':
                continue
            try:
                z = eine(nr, t, vorhanden)
            except Exception as e:                # eine kaputte Bestellung darf weder die übrigen noch die Lieferscheine blockieren
                z = (unklar_zeile(nr, t, f'{e.__class__.__name__}: {str(e)[:60]}') if t[3] == 'xml-unterwegs'
                     else f'⚠️ FORTURA: #{nr} Fehler in der Verarbeitung ({e.__class__.__name__}: {str(e)[:80]}) — die übrigen Bestellungen laufen weiter; {t[2]}')
            if z:
                neu[nr] = z
        # DESADV: Lieferscheine von Fortura
        for datei in fx.liste(sid, '/home/DESADV'):
            try:
                docs = fx.lies_delvry(fx.herunterladen(sid, '/home/DESADV/' + datei))
                if not docs:
                    # 13.10.2026 Nachtrag (N1): unlesbarer Lieferschein war still [] → kein Tracking, nach 48 h «noch kein Lieferschein».
                    neu[f'_{datei}'] = f'⚠️ FORTURA: Lieferschein {datei} unlesbar — von Hand öffnen (Tracking/Bestellnr. fehlen sonst)'
                    continue
                for d in docs:
                    nr = d['order_no'].upper().lstrip('LX')
                    if nr in led and led[nr][3] == 'storniert-xml':
                        # Härtung (Prüfer): Storno/Erstattung kam NACH dem Upload — Fortura hat trotzdem versandt. Shopify bleibt unberührt.
                        neu[nr] = (f"⚠️ FORTURA: #{nr} Fortura hat trotz Storno/Erstattung VERSANDT {d['datum']} · DPD {','.join(d['tracking'])} "
                                   f"(Lieferschein {d['doc_no']}) — Sendung abfangen/Rücknahme klären; danach `--geklaert {nr}`")
                        continue
                    if nr in led and led[nr][3] in ('xml-hochgeladen', 'xml-unterwegs', 'versandt'):
                        if led[nr][3] in ('xml-hochgeladen', 'xml-unterwegs'):
                            led[nr][4] = f"{led[nr][4]} · Lieferschein {d['doc_no']} {d['datum']} · DPD {','.join(d['tracking'])}"
                        # 13.10.2026 Nachtrag (N2/N3): Abgleich gegen UNSERE Bestellung (Ledger), Artikelnummer normalisiert, Mengen
                        # numerisch. Früher: Text «2» ≠ «2.000» → falscher Teillieferungs-Alarm, «2,000» → Absturz, Ersatzartikel mit
                        # anderer ARTICLE_NO → still «erfuellt», das bestellte Teil blieb in Shopify offen.
                        geliefert, teil, fremd = fx.abgleich(fx.positionen_aus_text(led[nr][2]), d['positionen'])
                        led[nr][3] = 'versandt'; schreibe(led)       # Härtung: Zustand VOR der Shopify-Sendung sichern (Kill danach darf nicht zur Dauer-Falschmeldung werden)
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
                        schreibe(led)
                        neu[nr] = (f"{'' if ok and not fremd else '⚠️ '}FORTURA: #{nr} versandt {d['datum']} · DPD {','.join(d['tracking'])} · "
                                   f"{'Shopify: ' + info if ok else 'Shopify-Sendung NICHT eingetragen: ' + info}"
                                   + (f" · ⚠️ Teillieferung {', '.join(teil)}" if teil else '')
                                   + (f" · ⚠️ ABWEICHEND {'; '.join(fremd)} — Ersatz prüfen, Shopify-Position bleibt offen" if fremd else ''))
            except Exception as e:           # 28.10.2026: ein defekter Download/Shopify-Fehler bei EINEM Lieferschein darf die übrigen nicht blockieren (Warnzeile mit Dateiname)
                neu[f'_{datei}'] = (f'⚠️ FORTURA-XML: Lieferschein {datei} nicht verarbeitet ({e.__class__.__name__}: {str(e)[:80]}) — '
                                    f'die übrigen laufen weiter, der nächste Lauf versucht es erneut')
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
        if nr not in led or led[nr][3] not in ('abweichend', 'nicht-lagernd', 'teilgeliefert', 'versandt', 'storniert-xml'):
            print(f'#{nr} steht nicht auf «abweichend»/«nicht-lagernd»/«teilgeliefert»/«versandt»/«storniert-xml»'); return 1
        led[nr][3] = 'geklaert'; schreibe(led); print(f'#{nr} Abweichung als geklärt quittiert'); return 0
    bestellungen = gql(Q)['orders']
    nodes = bestellungen['nodes']
    os.makedirs(PAKETE, mode=0o700, exist_ok=True)
    zeilen, gesehen, offen, gehalten = [], set(), {}, {}
    if (bestellungen.get('pageInfo') or {}).get('hasNextPage'):
        # 28.10.2026 (Zweitmeinung Codex): die Abfrage liest nur die 30 neuesten; ältere offene Bestellungen blieben ohne Ledger-Eintrag und ohne Meldung
        zeilen.append('⚠️ FORTURA: mehr als 30 bezahlte offene Bestellungen — die ältesten wurden NICHT gelesen (weder Paket noch Ledger noch XML); im Portal prüfen')
    for o in nodes:
        nr = o['name'].lstrip('#')
        pos = [(li['sku'][8:], (li.get('variant') or {}).get('barcode') or '', li['unfulfilledQuantity'], li['title'])
               for li in o['lineItems']['nodes'] if (li.get('sku') or '').startswith('fortura-') and li['unfulfilledQuantity'] > 0]
        if not pos:
            continue
        gesehen.add(nr)
        if ((o['lineItems'].get('pageInfo')) or {}).get('hasNextPage'):
            gehalten[nr] = 'PAKET:mehr als 30 Positionen — Paket wäre unvollständig, von Hand bestellen (`--bestellt {nr}`)'.replace('{nr}', nr)
        # Härtung (Prüfer): das Tor verlässt sich nicht nur auf den Such-Filter (financial_status:paid AND status:open) — storniert/geschlossen/
        # ON_HOLD wird hier selbst erkannt (#1027: cancelledAt gesetzt, Finanzstatus weiter PAID)
        if o.get('cancelledAt') or o.get('closedAt'):
            gehalten[nr] = 'storniert/geschlossen'
        elif o.get('displayFulfillmentStatus') in HALT_STATI:
            gehalten[nr] = o['displayFulfillmentStatus']
        offen[nr] = {}
        for a, _, m, _ in pos:                 # Upload-Tor (stufe2): die Fortura-Positionen, die Shopify JETZT offen führt
            k = _fx().norm_artnr(a); offen[nr][k] = offen[nr].get(k, 0) + int(m)
        txt = ', '.join(f'{a}×{m}' for a, _, m, _ in pos)
        p = os.path.join(PAKETE, f'{nr}.json')
        if nr not in led or not os.path.exists(p):     # 06.10.: /tmp stirbt beim Neustart → Paket aus Shopify neu bauen
            paket = {'bestellref': f'LX{nr}', 'kundennr': '544341', 'erstellt': o['createdAt'], 'positionen':
                     [{'artnr': a, 'ean': e, 'menge': m, 'titel': t} for a, e, m, t in pos],
                     'lieferadresse': o.get('shippingAddress'), 'email': o.get('email'), 'versand': 'neutral (Dropship), Absender LuxeStyle'}
            paket_schreiben(p, paket)
            if nr in led and led[nr][3] == 'bereit':
                led[nr][2] = txt               # Ledger-Positionen = die jetzt gesendeten (sonst falscher Teillieferungs-Alarm nach «Paket löschen», Prüfer)
        elif nr in led and led[nr][3] == 'bereit':
            # Härtung (Prüfer): Adresse/E-Mail ändern sich bis zum Senden — das Paket zieht sie bei JEDEM Lauf aus Shopify nach (das Tor prüft nur Positionen)
            try:
                paket = json.load(open(p, encoding='utf-8'))
            except (ValueError, OSError):
                paket = None                   # unlesbares Paket: stufe2 löscht es und meldet es mit Bestellnummer
            if paket is not None and (paket.get('lieferadresse') != o.get('shippingAddress') or paket.get('email') != o.get('email')):
                paket['lieferadresse'], paket['email'] = o.get('shippingAddress'), o.get('email')
                try:
                    paket_schreiben(p, paket)
                except OSError as e:
                    # 28.10.2026 (Zweitmeinung Codex): ein Schreibfehler hier liess das Paket mit der ALTEN Adresse stehen, stufe2 sendete sie (das Tor prüft nur Positionen)
                    gehalten[nr] = f'PAKET:Adresse im Paket nicht aktualisierbar ({e.__class__.__name__}) — nächster Lauf versucht es erneut'
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
            if t[3] in ('xml-hochgeladen', 'xml-unterwegs'):
                # Härtung (Prüfer): das XML liegt bei Fortura — «storniert» wäre still, Fortura liefert trotz Erstattung. Dauerzeile bis `--geklaert`.
                t[3] = 'storniert-xml'; t[4] = f"{t[4]} · Shopify storniert/erstattet {dt.datetime.now(dt.timezone.utc):%Y-%m-%d}, XML lag bei Fortura"
            else:
                t[3] = 'storniert'; t[4] = f"{t[4]} · Shopify-Bestellung storniert/erstattet (Ledger {dt.datetime.now(dt.timezone.utc):%Y-%m-%d})"
    # Dauerzeile für «storniert-xml» (Storno/Erstattung NACH dem Upload): die Datei liegt bei Fortura, es gibt keinen Storno-Kanal ausser Mail —
    # unabhängig vom Schalter, bis `--geklaert <nr>`; ein eintreffender Lieferschein ersetzt sie in stufe2 durch «trotz Storno VERSANDT».
    zeilen += [(f'⚠️ FORTURA: #{nr} storniert/erstattet, aber das XML (LX{nr}) liegt bei Fortura — dort per Mail stornieren, sonst wird trotz Erstattung '
                f'geliefert; ein Lieferschein meldet sich hier; danach `python3 automation/fortura_bestell_engine.py --geklaert {nr}`')
               for nr, t in sorted(led.items()) if t[3] == 'storniert-xml']
    if os.path.exists(SCHALTER) and any(t[3] in ('bereit', 'xml-hochgeladen', 'xml-unterwegs', 'versandt', 'storniert-xml') for t in led.values()):
        zeilen = stufe2(led, zeilen, offen, gehalten)
    schreibe(led)
    print('\n'.join(zeilen) if zeilen else 'FORTURA: 0 offen')
    return 0


def selbsttest():
    """13.10.2026 Nachtrag (Prüfer N1–N4): Stufe 2 + main() ohne Netz. Fortura (Login/Liste/Download/Upload) und Shopify (gql)
    werden gespielt, Ledger/Pakete/Feed liegen in einem Temp-Ordner, `curl` wird nie aufgerufen."""
    import tempfile, shutil
    import fortura_xml as fx
    global LEDGER, PAKETE, SCHALTER, gql, frischer_feed, FEED_MIN_ZEILEN, FEED_MAX_ALTER_H, HIER, FEED_FRISCH, FEED_ABRUF_TIMEOUT, SPERRE, paket_schreiben
    feed_alt = (FEED_MIN_ZEILEN, FEED_MAX_ALTER_H)
    frischer_echt, hier_alt, frisch_alt, timeout_alt = frischer_feed, HIER, FEED_FRISCH, FEED_ABRUF_TIMEOUT
    FEED_MIN_ZEILEN = 1               # Test-Feeds sind winzig; die Plausibilitätsfälle (P6) setzen die Schwelle selbst
    alt = (LEDGER, PAKETE, SCHALTER, gql, frischer_feed, fx.FEED, fx.anmelden, fx.abmelden, fx.liste, fx.herunterladen, fx.hochladen, fx._curl, sys.argv)
    td = tempfile.mkdtemp(prefix='fbe_test_')
    datetime_echt = dt.datetime
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
        pruef('O6 storniert NACH dem Upload (XML liegt bei Fortura) → «storniert-xml» + Dauerzeile «bei Fortura stornieren» (kein stilles «storniert»)',
              ledger()['1040'][3] == 'storniert-xml' and '#1040' in buf.getvalue() and 'liegt bei Fortura' in buf.getvalue(), (ledger()['1040'], buf.getvalue()))
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
        # ================= 20.10.2026 HÄRTUNG, Prüfer-Runde (Q1–Q14) =================
        def _liste_gql(knoten):
            basis = gql
            def _g(q, v=None):
                if 'financial_status:paid' in q:
                    return {'orders': {'nodes': knoten}}
                return basis(q, v)
            return _g

        def _lauf(*argv):
            sys.argv = ['x', *argv]; b = io.StringIO()
            with contextlib.redirect_stdout(b):
                rc_ = main()
            return rc_, b.getvalue()

        def _knoten2(nr_, menge=1, **extra):
            k = {'name': '#' + nr_, 'createdAt': '2026-10-20T10:00:00Z', 'cancelledAt': None, 'closedAt': None, 'displayFulfillmentStatus': 'UNFULFILLED',
                 'email': 't@e.ch', 'shippingAddress': {'firstName': 'A', 'lastName': 'B', 'address1': 'Weg 1', 'zip': '3000', 'city': 'Bern', 'countryCodeV2': 'CH'},
                 'lineItems': {'nodes': [{'sku': 'fortura-93583', 'title': 'T', 'quantity': menge, 'unfulfilledQuantity': menge, 'variant': {'barcode': '123'}}]}}
            k.update(extra)
            return k
        gql_basis = gql
        led = ledger()

        # Q1 Storno NACH dem Upload: XML liegt bei Fortura → «storniert-xml» + Dauerzeile (nie stilles «storniert»), Lieferschein → «trotz Storno VERSANDT»
        led['1100'] = ['1100', '2026-10-20T10:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX1100.xml']; schreibe(led)
        def _gql_q1(q, v=None):
            if v and str(v.get('q', '')) == 'name:#1100':
                return {'orders': {'nodes': [{'name': '#1100', 'cancelledAt': '2026-10-20T14:00:00Z', 'displayFinancialStatus': 'REFUNDED',
                                              'transactions': [{'kind': 'REFUND', 'status': 'SUCCESS'}]}]}}
            return gql_basis(q, v)
        gql = _gql_q1
        _, out = _lauf()
        pruef('Q1 Storno nach Upload → «storniert-xml» + Dauerzeile «bei Fortura stornieren»', ledger()['1100'][3] == 'storniert-xml' and '#1100' in out and 'per Mail stornieren' in out, (ledger()['1100'], out))
        _, out = _lauf()
        pruef('Q1 Dauerzeile steht in JEDEM Lauf', '#1100' in out and 'per Mail stornieren' in out, out)
        n_sendungen = len(gesendet)
        desadv['D1100.xml'] = lief('1100', [('93583', '1', '1', '')])
        shop['1100'] = [('fortura-93583', 1)]
        led_voll = {k_: list(v_) for k_, v_ in ledger().items()}
        schreibe({'1100': led_voll['1100']})                  # NUR diese Zeile: stufe2 muss allein wegen «storniert-xml» laufen
        _, out = _lauf()
        schreibe(led_voll)
        pruef('Q1 Lieferschein trotz Storno → ⚠️ «VERSANDT», Shopify unberührt, Status bleibt', 'trotz Storno/Erstattung VERSANDT' in out and ledger()['1100'][3] == 'storniert-xml' and len(gesendet) == n_sendungen, (out, ledger()['1100']))
        desadv.pop('D1100.xml', None)
        rc_, out = _lauf('--geklaert', '1100')
        pruef('Q1 --geklaert beendet «storniert-xml»', rc_ == 0 and ledger()['1100'][3] == 'geklaert', (rc_, out))
        gql = gql_basis

        # Q2 Adresse/E-Mail ändern sich bis zum Senden: das Paket zieht sie nach, das XML trägt die NEUE Adresse
        led = ledger()
        led['1101'] = ['1101', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1101', '93583', 1); schreibe(led)
        k = _knoten2('1101'); k['shippingAddress'] = dict(k['shippingAddress'], address1='Neuweg 9')
        gql = _liste_gql([k]); hoch.clear()
        _lauf()
        xml_1101 = next((x for nm, x in hoch if nm == 'ORDERS_LX1101.xml'), '')
        pruef('Q2 geänderte Lieferadresse → XML trägt «Neuweg 9», nicht «Weg 1»', 'Neuweg 9' in xml_1101 and '>Weg 1<' not in xml_1101, xml_1101[:200])
        gql = gql_basis

        # Q3 TOR gegen zurückgehaltene/stornierte Bestellungen in der Liste (der Such-Filter allein genügt nicht)
        led = ledger()
        for nr_ in ('1102', '1103'):
            led[nr_] = [nr_, '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket(nr_, '93583', 1)
        schreibe(led)
        gql = _liste_gql([_knoten2('1102', displayFulfillmentStatus='ON_HOLD'), _knoten2('1103', cancelledAt='2026-10-20T14:00:00Z')]); hoch.clear()
        _, out = _lauf()
        pruef('Q3 ON_HOLD → KEIN XML, Zeile nennt den Status', ledger()['1102'][3] == 'bereit' and not any(nm == 'ORDERS_LX1102.xml' for nm, _ in hoch) and 'ON_HOLD' in out, out)
        pruef('Q3 cancelledAt gesetzt (Finanzstatus PAID!) → KEIN XML', ledger()['1103'][3] == 'bereit' and not any(nm == 'ORDERS_LX1103.xml' for nm, _ in hoch) and 'storniert/geschlossen' in out, out)
        gql = _liste_gql([_knoten2('1102')]); _lauf()
        pruef('Q3 Gegenprobe: ON_HOLD aufgehoben (UNFULFILLED) → XML hochgeladen', ledger()['1102'][3] == 'xml-hochgeladen', ledger()['1102'])
        gql = gql_basis

        # Q4 EINE kaputte Bestellung blockiert weder die übrigen noch die Lieferscheine (Paket abgeschnitten → gelöscht, Zeile mit Nummer)
        led = ledger()
        led['1104'] = ['1104', '2026-10-20T10:00Z', '93583×1', 'bereit', '']
        open(os.path.join(PAKETE, '1104.json'), 'w').write('{"positionen": [{"artnr": "9358')
        led['1105'] = ['1105', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1105', '93583', 1)
        led['1106'] = ['1106', '2026-10-20T10:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX1106.xml']
        desadv['D1106.xml'] = lief('1106', [('93583', '1', '1', '')]); shop['1106'] = [('fortura-93583', 1)]
        hoch.clear()
        z = stufe2(led, [], {'1104': {'93583': 1}, '1105': {'93583': 1}})
        pruef('Q4 kaputtes Paket → Zeile mit «#1104», Datei gelöscht (Neubau im nächsten Lauf)', any('#1104' in x and 'Paket unlesbar' in x for x in z) and not os.path.exists(os.path.join(PAKETE, '1104.json')), z)
        pruef('Q4 die gesunde Bestellung #1105 läuft trotzdem durch', led['1105'][3] == 'xml-hochgeladen', led['1105'])
        pruef('Q4 und der Lieferschein #1106 wird trotzdem verarbeitet', led['1106'][3] == 'erfuellt', led['1106'])
        desadv.pop('D1106.xml', None)
        led['1103b'] = ['1103b', '2026-10-20T10:00Z', '93583×1', 'bereit', '']
        json.dump({'positionen': [{'artnr': '93583', 'ean': ''}], 'lieferadresse': {}, 'email': ''}, open(os.path.join(PAKETE, '1103b.json'), 'w'))   # «menge» fehlt → KeyError tief in der Verarbeitung
        led['1103c'] = ['1103c', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1103c', '93583', 1)
        z = stufe2(led, [], {'1103b': {'93583': 1}, '1103c': {'93583': 1}})
        pruef('Q4 unerwartete Ausnahme in #1103b → Zeile mit Nummer, #1103c läuft trotzdem durch', any('#1103b' in x and 'Fehler in der Verarbeitung' in x for x in z) and led['1103c'][3] == 'xml-hochgeladen', (z, led['1103c']))
        led.pop('1103b'); led.pop('1103c'); schreibe(led)

        # Q5 Upload-Fehler nach Klasse: DNS/Verbindung (curl 6/7) = nichts gesendet → zurück auf «bereit»; Timeout (curl 28) = unklar → «xml-unterwegs»
        led = ledger()
        led['1107'] = ['1107', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1107', '93583', 1)
        led['1108'] = ['1108', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1108', '93583', 1)
        orig_hoch = fx.hochladen
        def _fehler(msg, nur):
            def f_(sid, o, nm, x):
                if nm == f'ORDERS_LX{nur}.xml':
                    raise RuntimeError(msg)
                return orig_hoch(sid, o, nm, x)
            return f_
        fx.hochladen = _fehler('curl 7: Failed to connect', '1107')
        z = stufe2(led, [], {'1107': {'93583': 1}})
        pruef('Q5 curl 7 (nicht verbunden) → zurück auf «bereit», Zeile «nicht gesendet»', led['1107'][3] == 'bereit' and any('#1107' in x and 'nicht gesendet' in x for x in z), (led['1107'], z))
        fx.hochladen = _fehler('curl 28: Operation timed out', '1108')
        z = stufe2(led, [], {'1108': {'93583': 1}})
        pruef('Q5 curl 28 (Timeout) → «xml-unterwegs», Zeile «NICHT im Portal bestellen»', led['1108'][3] == 'xml-unterwegs' and any('#1108' in x and 'NICHT im Portal bestellen' in x for x in z), (led['1108'], z))
        fx.hochladen = orig_hoch

        # Q6 Bestandsprüfung: Bedarf je ArtNr SUMMIERT, und was dieser Lauf schon zugesagt hat, zählt (zwei Bestellungen um den letzten Artikel)
        with open(fx.FEED, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|1|3|\n')
        led = ledger()
        led['1109'] = ['1109', '2026-10-20T10:00Z', '93583×2, 93583×2', 'bereit', '']
        json.dump({'positionen': [{'artnr': '93583', 'ean': '', 'menge': 2}, {'artnr': '93583', 'ean': '', 'menge': 2}],
                   'lieferadresse': {'firstName': 'A', 'lastName': 'B', 'address1': 'Weg 1', 'zip': '3000', 'city': 'Bern', 'countryCodeV2': 'CH'}, 'email': 't@e.ch'},
                  open(os.path.join(PAKETE, '1109.json'), 'w'))
        z = stufe2(led, [], {'1109': {'93583': 4}})
        pruef('Q6 zwei Positionen derselben ArtNr (2+2) bei Lager 3 → «nicht-lagernd»', led['1109'][3] == 'nicht-lagernd' and 'Fortura-Lager 3 < 4' in led['1109'][4], (led['1109'], z))
        with open(fx.FEED, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|1|1|\n')
        for nr_ in ('1110', '1111'):
            led[nr_] = [nr_, '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket(nr_, '93583', 1)
        z = stufe2(led, [], {'1110': {'93583': 1}, '1111': {'93583': 1}})
        pruef('Q6 zwei Bestellungen um den LETZTEN Artikel: die erste geht raus, die zweite ist «nicht-lagernd»', led['1110'][3] == 'xml-hochgeladen' and led['1111'][3] == 'nicht-lagernd', (led['1110'], led['1111']))
        with open(fx.FEED, 'w', encoding='cp1252') as f:      # Test-Feed für die folgenden Fälle wiederherstellen
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|1|5|\n90654-2|1|5|\n042156|1|5|\n59774|10|5|\n')

        # Q7 VE aus DERSELBEN Quelle wie der Bestand: frischer Feed VE 10 (Bündel) schlägt den Tages-Feed VE 1 — keine Einzelstück-Bestellung eines Bündels
        frisch_ve = os.path.join(td, 'frisch_ve.csv')
        with open(frisch_ve, 'w', encoding='cp1252') as f:
            f.write('ArtNr|Internet_VE|Lagerbestand Fortura|\n93583|10|50|\n')
        frischer_feed = lambda: frisch_ve
        led = ledger()
        led['1112'] = ['1112', '2026-10-20T10:00Z', '93583×1', 'bereit', '']; paket('1112', '93583', 1)
        hoch.clear()
        z = stufe2(led, [], {'1112': {'93583': 1}})
        pruef('Q7 frischer Feed meldet VE 10 → KEIN XML mit Menge 1 (Bündel), Zeile «NICHT gesendet»', led['1112'][3] == 'bereit' and not any(nm == 'ORDERS_LX1112.xml' for nm, _ in hoch) and any('#1112' in x and 'NICHT gesendet' in x for x in z), (led['1112'], z, hoch))
        frischer_feed = lambda: None

        # Q8 doppelte Ledger-Zeilen (git merge --union zweier Rechner): der WEITERE Zustand gewinnt, nie «bereit» über «xml-hochgeladen»
        led_vor_q8 = {k_: list(v_) for k_, v_ in ledger().items()}
        with open(LEDGER, 'w', encoding='utf-8') as f:
            f.write('nr\tzeit\tpositionen\tstatus\tfortura_auftrag\n1120\tx\t93583×1\txml-hochgeladen\tORDERS_LX1120.xml\n1120\tx\t93583×1\tbereit\t\n'
                    '1121\tx\t93583×1\tbereit\t\n1121\tx\t93583×1\tversandt\tx\n')
        pruef('Q8 «xml-hochgeladen» dann «bereit» (Union) → xml-hochgeladen', ledger()['1120'][3] == 'xml-hochgeladen', ledger()['1120'])
        pruef('Q8 «bereit» dann «versandt» → versandt', ledger()['1121'][3] == 'versandt', ledger()['1121'])
        led = {k_: list(v_) for k_, v_ in led_vor_q8.items()}
        schreibe(led)

        # Q9 ATOMARES Schreiben: stirbt der Lauf mitten im Schreiben (fsync wirft), bleibt das alte Ledger vollständig
        vorher = open(LEDGER, encoding='utf-8').read()
        fsync_alt = os.fsync
        def _kaputt(fd):
            raise OSError('Platte voll')
        os.fsync = _kaputt
        try:
            schreibe({'9999': ['9999', 'x', 'y', 'bereit', '']})
            geworfen = False
        except OSError:
            geworfen = True
        finally:
            os.fsync = fsync_alt
        pruef('Q9 Schreibfehler → altes Ledger unverändert (kein Abschneiden)', geworfen and open(LEDGER, encoding='utf-8').read() == vorher, open(LEDGER, encoding='utf-8').read()[:120])
        pruef('Q9 erfolgreiches Schreiben hinterlässt keine .tmp-Datei', (schreibe(led), not os.path.exists(LEDGER + '.tmp'))[1])

        # Q10 «Paket löschen» (Abhilfe des Tors): die Ledger-Positionen ziehen mit — sonst falscher Teillieferungs-Alarm
        led = ledger()
        led['1130'] = ['1130', '2026-10-01T10:00Z', '93583×2, 90654-2×1', 'bereit', '']; schreibe(led)
        gql = _liste_gql([_knoten2('1130', 2)]); hoch.clear()
        _lauf()
        pruef('Q10 Paket neu gebaut → Ledger-Positionen = «93583×2» (nicht mehr «…, 90654-2×1»)', '90654-2' not in ledger()['1130'][2] and ledger()['1130'][2] == '93583×2', ledger()['1130'])
        gql = gql_basis

        # Q11 die Uhr der 24-h-Warnung startet mit dem SENDEN (t[1]), nicht mit der Erstsichtung
        heute_ = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%d')
        pruef('Q11 Zeitstempel nach Upload = heute (Erstsichtung war 01.10. 10:00)', ledger()['1130'][1].startswith(heute_) and ledger()['1130'][3] == 'xml-hochgeladen', ledger()['1130'])

        # Q12 Warnschwelle IN DER ENGINE (Werktage): Freitag-Abend-Upload warnt am Wochenende nicht, am Montagabend schon
        class _FixDT(datetime_echt):
            fix = None
            @classmethod
            def now(cls, tz=None):
                return cls.fix
        dt.datetime = _FixDT
        try:
            led = {'1140': ['1140', '2026-10-23T16:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX1140.xml']}
            def _zeile(jetzt_):
                _FixDT.fix = jetzt_
                zz = stufe2(led, [], {})
                return next((x for x in zz if '#1140 ' in x), '')
            U = dt.timezone.utc
            sa = _zeile(datetime_echt(2026, 10, 24, 20, 0, tzinfo=U))
            mo = _zeile(datetime_echt(2026, 10, 26, 20, 0, tzinfo=U))
            led['1140'][1] = '2026-10-20T10:00Z'
            mi_fruh = _zeile(datetime_echt(2026, 10, 21, 9, 0, tzinfo=U))
            mi_spaet = _zeile(datetime_echt(2026, 10, 21, 12, 0, tzinfo=U))
        finally:
            dt.datetime = datetime_echt
        pruef('Q12 Fr 16:00 Upload → Sa 20:00 (8 Werktage-h): KEINE Warnung', sa.startswith('FORTURA') and 'Storno-Mail' not in sa, sa)
        pruef('Q12 Fr 16:00 Upload → Mo 20:00 (28 Werktage-h): Warnung + Hinweis Storno-Mail', mo.startswith('⚠️') and 'Storno-Mail' in mo, mo)
        pruef('Q12 Di 10:00 → Mi 09:00 (23 h): keine Warnung · Mi 12:00 (26 h): Warnung', mi_fruh.startswith('FORTURA') and mi_spaet.startswith('⚠️'), (mi_fruh, mi_spaet))

        # Q13 frischer_feed() mit Attrappenskript: Erfolg · Hänger (Prozessgruppe wird beendet) · rc≠0 · keine Datei (alter Feed wird NICHT wiederverwendet) · zu wenig Zeilen
        import stat as _stat, time as _t
        skriptdir = os.path.join(td, 'skript'); os.makedirs(skriptdir)
        sk = os.path.join(skriptdir, 'fortura_fetch_feed.sh')
        with open(sk, 'w') as f:
            f.write('#!/bin/bash\ncase "$FAKE_MODE" in\n'
                    ' ok) yes "93583|1|5|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" | head -n 20000 > "$1" ;;\n'
                    ' wenig) yes "$(head -c 700 /dev/zero | tr "\\0" a)" | head -n 2000 > "$1" ;;\n'
                    ' haenger) sleep 60 & echo $! > "$FAKE_PIDFILE"; wait ;;\n'
                    ' fehler) yes "x" | head -n 900000 > "$1"; exit 3 ;;\n'
                    ' keine) exit 0 ;;\nesac\n')
        os.chmod(sk, os.stat(sk).st_mode | _stat.S_IXUSR)
        HIER, FEED_FRISCH, FEED_ABRUF_TIMEOUT = skriptdir, os.path.join(td, 'frisch_echt.csv'), 2
        FEED_MIN_ZEILEN = 10000
        pid_datei = os.path.join(td, 'kind.pid'); os.environ['FAKE_PIDFILE'] = pid_datei
        try:
            os.environ['FAKE_MODE'] = 'ok'
            pruef('Q13 Abruf ok (20000 Zeilen, > 1 MB) → Pfad', frischer_echt() == FEED_FRISCH and os.path.getsize(FEED_FRISCH) > 1_000_000)
            os.environ['FAKE_MODE'] = 'keine'
            pruef('Q13 Skript ohne Datei → None, der ALTE Feed wird nicht wiederverwendet (vorher gelöscht)', frischer_echt() is None and not os.path.exists(FEED_FRISCH))
            os.environ['FAKE_MODE'] = 'fehler'
            pruef('Q13 Skript rc=3 (obwohl Datei da) → None', frischer_echt() is None)
            os.environ['FAKE_MODE'] = 'wenig'
            pruef('Q13 > 1 MB aber nur 2000 Zeilen (< 10000) → None', frischer_echt() is None)
            os.environ['FAKE_MODE'] = 'haenger'
            t0_ = _t.time(); ergebnis = frischer_echt(); dauer = _t.time() - t0_
            _t.sleep(0.5)
            kind_tot = True
            try:
                kind = int(open(pid_datei).read().strip())
                zustand_ = open(f'/proc/{kind}/stat').read().rsplit(')', 1)[1].split()[0]     # 'Z' = beendet, nur nicht abgeholt (Container ohne init-Reaper)
                kind_tot = zustand_ == 'Z'
            except (ProcessLookupError, FileNotFoundError, ValueError, OSError):
                pass
            pruef('Q13 Hänger → None nach Timeout (2 s) UND das Kind-Prozess (sleep 60) ist beendet', ergebnis is None and dauer < 10 and kind_tot, (ergebnis, dauer, kind_tot))
        finally:
            HIER, FEED_FRISCH, FEED_ABRUF_TIMEOUT = hier_alt, frisch_alt, timeout_alt
            FEED_MIN_ZEILEN = 1
            os.environ.pop('FAKE_MODE', None)

        # Q14 Tor-Normalisierung: Paket «042156», Shopify-Position «42156» → gleiche Ware, Upload
        led = ledger()
        led['1150'] = ['1150', '2026-10-20T10:00Z', '042156×1', 'bereit', '']; paket('1150', '042156', 1)
        z = stufe2(led, [], {'1150': {fx.norm_artnr('42156'): 1}})
        pruef('Q14 «042156» im Paket = «42156» in Shopify → XML hochgeladen', led['1150'][3] == 'xml-hochgeladen', (led['1150'], z))
        led = ledger()
        schreibe(led)
        gql = gql_basis

        # Q15 Kill NACH der Shopify-Sendung: der Zustand «versandt» steht schon auf der Platte (sonst Dauer-Falschmeldung «Sendung NICHT eingetragen»)
        led = ledger()
        led['1160'] = ['1160', '2026-10-20T10:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX1160.xml']; schreibe(led)
        desadv['D1160.xml'] = lief('1160', [('93583', '1', '1', '')])
        global sendung_eintragen
        sendung_alt = sendung_eintragen
        def _stirbt(nr_, tracking, geliefert):
            raise RuntimeError('Container-Neustart mitten in der Sendung')
        sendung_eintragen = _stirbt
        try:
            stufe2(led, [], {})
        finally:
            sendung_eintragen = sendung_alt
            desadv.pop('D1160.xml', None)
        pruef('Q15 Absturz in der Shopify-Sendung → Platte zeigt schon «versandt» (Zustand VOR der Sendung gesichert)', ledger()['1160'][3] == 'versandt', ledger().get('1160'))
        led = ledger(); led.pop('1160', None); schreibe(led)

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

        # ================= 28.10.2026 HÄRTUNG (R1–R8, Zweitmeinung Codex; jeder Fall vorher am alten Code nachgestellt) =================
        gql_ende = gql
        sperre_alt, SPERRE = SPERRE, os.path.join(td, 'engine.lock')
        s1 = _sperre_holen(); s2 = _sperre_holen()
        pruef('R1 Sperre: der erste Lauf bekommt sie, ein zweiter gleichzeitiger NICHT', s1 not in (None, 'ohne') and s2 is None, (s1, s2))
        import subprocess
        zweiter = subprocess.run([sys.executable, '-B', os.path.abspath(__file__)], env={'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'FORTURA_SPERRE': SPERRE, 'HOME': td},
                                 capture_output=True, text=True, timeout=60)
        pruef('R1 zweiter PROZESS (echter Aufruf) meldet «ein anderer Lauf ist noch aktiv», Exit 0, tut nichts',
              zweiter.returncode == 0 and 'ein anderer Lauf ist noch aktiv' in zweiter.stdout, (zweiter.returncode, zweiter.stdout, zweiter.stderr[-200:]))
        s1.close(); s3 = _sperre_holen()
        pruef('R1 nach dem Ende des ersten Laufs ist die Sperre wieder frei', s3 not in (None, 'ohne'), s3)
        s3.close()
        SPERRE = os.path.join(td, 'gibt-es-nicht', 'engine.lock')
        pruef('R1 Sperre nicht möglich (Ordner fehlt) → «ohne»: der Lauf darf trotzdem laufen', _sperre_holen() == 'ohne')
        SPERRE = sperre_alt

        # R2: ein anderer Lauf sendet während unseres Feed-Abrufs (Ledger auf der Platte springt auf «xml-hochgeladen»)
        hoch.clear(); led = ledger()
        led['2001'] = ['2001', '2026-10-28T08:00Z', '93583×1', 'bereit', '']; paket('2001', '93583', 1); schreibe(led)
        def _anderer_lauf_sendet():
            fremd = ledger(); fremd['2001'][3] = 'xml-hochgeladen'; fremd['2001'][4] = 'ORDERS_LX2001.xml'; schreibe(fremd)
            return None
        frischer_feed = _anderer_lauf_sendet
        z = stufe2(led, [], offen_aus_paketen({'2001': led['2001']}))
        frischer_feed = lambda: None
        schreibe(led)                                    # wie das Ende von main(): der in-memory-Stand darf den fremden NICHT zurückdrehen
        pruef('R2 anderer Lauf hat inzwischen gesendet → KEIN zweiter Upload', not any(n_ == 'ORDERS_LX2001.xml' for n_, _ in hoch), hoch)
        pruef('R2 Warnzeile nennt das Ledger', any('#2001' in x and 'Ledger steht inzwischen' in x for x in z), z)
        pruef('R2 das abschliessende schreibe() dreht den fremden Stand nicht auf «bereit» zurück', ledger()['2001'][3] == 'xml-hochgeladen', ledger().get('2001'))
        led = ledger(); led['2002'] = ['2002', '2026-10-28T08:00Z', '93583×1', 'bereit', '']; paket('2002', '93583', 1); schreibe(led)
        z = stufe2(led, [], offen_aus_paketen({'2002': led['2002']}))
        pruef('R2 Gegenprobe: ohne anderen Lauf wird genau einmal hochgeladen', [n_ for n_, _ in hoch].count('ORDERS_LX2002.xml') == 1 and led['2002'][3] == 'xml-hochgeladen', (hoch, led['2002']))

        # R3: die Datei liegt beim frischen Lesen schon im Ordner (anderer Rechner war schneller)
        led = ledger(); led['2003'] = ['2003', '2026-10-28T08:00Z', '93583×1', 'bereit', '']; paket('2003', '93583', 1); schreibe(led)
        frischer_feed = lambda: hoch.append(('ORDERS_LX2003.xml', b'x')) or None
        n_vor = len(hoch)
        z = stufe2(led, [], offen_aus_paketen({'2003': led['2003']}))
        frischer_feed = lambda: None
        pruef('R3 Datei liegt frisch gelesen schon im Ordner → nicht noch einmal gesendet, Status «xml-hochgeladen»', len(hoch) == n_vor + 1 and led['2003'][3] == 'xml-hochgeladen', (hoch[-2:], led['2003']))
        pruef('R3 Zeile «liegt bereits bei Fortura»', any('#2003' in x and 'liegt bereits bei Fortura' in x for x in z), z)

        # R4: ein defekter Lieferschein (Download-Fehler) stoppt die übrigen nicht
        led = ledger(); led['2004'] = ['2004', '2026-10-28T08:00Z', '93583×1', 'xml-hochgeladen', 'ORDERS_LX2004.xml']; schreibe(led)
        shop['2004'] = [('fortura-93583', 1)]
        desadv.clear(); desadv['A_DEFEKT.xml'] = b'x'; desadv['B2004.xml'] = lief('2004', [('93583', '1', '1', '')])
        her_alt = fx.herunterladen
        def _her(sid, pfad):
            if pfad.endswith('A_DEFEKT.xml'):
                raise RuntimeError('curl 56: Recv failure')
            return her_alt(sid, pfad)
        fx.herunterladen = _her
        z = stufe2(led, [], {})
        fx.herunterladen = her_alt
        pruef('R4 defekter Download bei A → B wird trotzdem verarbeitet (Status «erfuellt»)', led['2004'][3] == 'erfuellt', led['2004'])
        pruef('R4 Warnzeile nennt die Datei und die Ursache', any('A_DEFEKT.xml' in x and 'nicht verarbeitet' in x and 'curl 56' in x for x in z), z)
        desadv.clear()

        # R5: Adresse im Paket nicht aktualisierbar (Schreibfehler) → NICHT mit der alten Adresse senden
        import io, contextlib
        def _bestellung(nr_, strasse, pos_extra=None, seite=False, pos_seite=False):
            return {'orders': {'pageInfo': {'hasNextPage': seite}, 'nodes': [{'name': '#' + nr_, 'createdAt': '2026-10-28T08:00:00Z', 'cancelledAt': None, 'closedAt': None,
                    'displayFulfillmentStatus': 'UNFULFILLED', 'email': 'test@example.ch',
                    'shippingAddress': {'firstName': 'A', 'lastName': 'B', 'address1': strasse, 'zip': '3000', 'city': 'Bern', 'countryCodeV2': 'CH'},
                    'lineItems': {'pageInfo': {'hasNextPage': pos_seite}, 'nodes': [{'sku': 'fortura-93583', 'title': 'Kostüm', 'quantity': 1, 'unfulfilledQuantity': 1,
                                                                                   'variant': {'barcode': ''}}]}}]}}
        def _gql_bestellung(antwort):
            def g(q, v=None):
                return antwort if 'financial_status:paid' in q else gql_ende(q, v)
            return g
        hoch.clear(); led = ledger(); led['2005'] = ['2005', '2026-10-28T08:00Z', '93583×1', 'bereit', '']; schreibe(led); paket('2005', '93583', 1)   # Paket: «Weg 1»
        gql = _gql_bestellung(_bestellung('2005', 'NEU 2'))
        pw_alt = paket_schreiben
        def _pw_kaputt(pfad, inhalt):
            raise PermissionError('Paketordner nicht beschreibbar')
        paket_schreiben = _pw_kaputt
        sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        paket_schreiben = pw_alt
        pruef('R5 Adresse im Paket nicht aktualisierbar → KEIN Upload mit der alten Adresse', not any(n_ == 'ORDERS_LX2005.xml' for n_, _ in hoch), hoch)
        pruef('R5 Warnzeile «Adresse im Paket nicht aktualisierbar» (sauber formuliert, kein «Shopify-Status PAKET:»)', '#2005' in buf.getvalue() and 'Adresse im Paket nicht aktualisierbar' in buf.getvalue()
              and 'Shopify-Status' not in buf.getvalue() and 'PAKET:' not in buf.getvalue(), buf.getvalue())
        sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        pruef('R5 Gegenprobe: schreibbar → das XML trägt die NEUE Adresse', any(n_ == 'ORDERS_LX2005.xml' and 'NEU 2' in str(x_) for n_, x_ in hoch), [n_ for n_, _ in hoch])

        # R6: gelieferte Menge wird über mehrere Positionen derselben Nummer VERBRAUCHT
        shop['2006'] = [('fortura-93583', 1), ('fortura-93583', 1)]
        gesendet.clear()
        ok6, info6 = sendung_eintragen('2006', ['TR6'], {'93583': 1})
        teile6 = [t_ for g_ in gesendet[-1] for t_ in g_['fulfillmentOrderLineItems']] if gesendet else []
        pruef('R6 geliefert 1, zwei offene Positionen derselben SKU → insgesamt 1 erfüllt (nicht 2)', ok6 and sum(t_['quantity'] for t_ in teile6) == 1, (ok6, teile6))
        shop['2007'] = [('fortura-93583', 1), ('fortura-93583', 1)]
        gesendet.clear()
        sendung_eintragen('2007', ['TR7'], {'93583': 2})
        teile7 = [t_ for g_ in gesendet[-1] for t_ in g_['fulfillmentOrderLineItems']] if gesendet else []
        pruef('R6 Gegenprobe: geliefert 2, zwei Positionen → beide erfüllt', sum(t_['quantity'] for t_ in teile7) == 2, teile7)

        # R7: Seitengrenze der Shopify-Abfrage wird sichtbar
        gql = _gql_bestellung(_bestellung('2008', 'Weg 1', seite=True))
        sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        pruef('R7 mehr als 30 offene Bestellungen → Warnzeile', 'mehr als 30 bezahlte offene Bestellungen' in buf.getvalue(), buf.getvalue())
        hoch.clear(); led = ledger(); led['2009'] = ['2009', '2026-10-28T08:00Z', '93583×1', 'bereit', '']; schreibe(led); paket('2009', '93583', 1)
        gql = _gql_bestellung(_bestellung('2009', 'Weg 1', pos_seite=True))
        sys.argv = ['x']; buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            main()
        pruef('R7 Bestellung mit mehr als 30 Positionen → KEIN Upload (Paket wäre unvollständig), Warnzeile', not any(n_ == 'ORDERS_LX2009.xml' for n_, _ in hoch)
              and 'mehr als 30 Positionen' in buf.getvalue() and 'Shopify-Status' not in buf.getvalue() and 'PAKET:' not in buf.getvalue(), (hoch, buf.getvalue()))
        gql = gql_ende
    finally:
        SPERRE = sperre_alt if 'sperre_alt' in locals() else SPERRE
        if 'pw_alt' in locals():
            paket_schreiben = pw_alt
        (LEDGER, PAKETE, SCHALTER, gql, frischer_feed, fx.FEED, fx.anmelden, fx.abmelden, fx.liste, fx.herunterladen, fx.hochladen, fx._curl, sys.argv) = alt
        shutil.rmtree(td, ignore_errors=True)
        FEED_MIN_ZEILEN, FEED_MAX_ALTER_H = feed_alt
        HIER, FEED_FRISCH, FEED_ABRUF_TIMEOUT = hier_alt, frisch_alt, timeout_alt
        dt.datetime = datetime_echt
    print(f"SELBSTTEST {'OK' if ok else 'FEHLER'} ({n} Fälle)")
    return 0 if ok else 1


if __name__ == '__main__':
    if '--selbsttest' in sys.argv:
        sys.exit(selbsttest())
    _sperre = _sperre_holen()
    if _sperre is None:
        print(f'FORTURA: ein anderer Lauf ist noch aktiv (Sperre {SPERRE}) — diesmal nichts getan')
        sys.exit(0)
    sys.exit(main())
