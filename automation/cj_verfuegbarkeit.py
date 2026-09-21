"""Findet aktive CJ-Produkte, die es bei CJ nicht mehr gibt.

WARUM: Ein eingestelltes CJ-Produkt bleibt im Shop kaufbar. Der Kunde bezahlt, und erst beim
Bestellen faellt auf, dass CJ es nicht mehr fuehrt (`variantSku … nicht gefunden`). Das ist
derselbe Ghost-Sale wie bei BigBuy — nur faellt es hier spaeter auf, weil kein Bestand gefuehrt
wird. Besser vorher finden.

⚠️ WICHTIGSTE REGEL: Ein API-Aussetzer darf NIEMALS ein gutes Produkt draften.
Darum wird nur gedraftet, wenn CJ mehrfach und eindeutig 'nicht gefunden' antwortet — jede
andere Antwort (Drossel, Timeout, Fehlercode) gilt als 'unklar' und laesst das Produkt in Ruhe.

Punkte-sparsam: CJ deckelt die Abfragen taeglich (`pointsInfo.remaining`), und der Import-Grind
braucht sie auch. Der Audit stoppt selbst, wenn das Restbudget unter PUNKTE_RESERVE faellt.

Fortschritt steht im LEDGER dropship/_cj_verfuegbarkeit.txt (kein Cursor auf Platte —
siehe main(): ein Cursor hat den Waechter vom 16.-19.09. blind gemacht).
DRY=1 meldet nur.
"""
import json, subprocess, time, os, re, fcntl


def _nur_einmal():
    """Verhindert, dass zwei Laeufe gleichzeitig dasselbe Ledger fuellen.

    ANLASS 19.09.2026, eigener Fehler: Der Aufseher startet diesen Waechter taeglich als
    `python3 /tmp/cj_verfuegbarkeit.py` (engine_keepalive spiegelt automation/*.py nach /tmp).
    Ich habe daneben von Hand `python3 automation/cj_verfuegbarkeit.py` gestartet — zwei
    verschiedene PFADE, dieselbe Arbeit. Beide liefen 20 Minuten nebeneinander, bauten ihr
    `done`-Set beim eigenen Start und prueften deshalb gegenseitig nach: **415 doppelte IDs**
    im Ledger (46'702 Zeilen, 46'287 eindeutig). Kein Datenschaden — das Ledger ist
    anhaengend, das Draften idempotent —, aber doppelte CJ-Punkte und doppelte Zeit.

    Die Sperre haengt deshalb an einem FESTEN Pfad, nicht an `__file__`: sie muss die
    /tmp-Kopie und die Repo-Fassung als DENSELBEN Waechter erkennen. Der Deskriptor bleibt
    absichtlich offen (Modul-global), damit die Sperre bis zum Prozessende haelt; stirbt der
    Prozess (Container-Pause), gibt der Kernel sie von selbst frei — eine Datei mit PID darin
    waere nach jedem harten Tod eine Ruine.
    """
    global _sperre
    _sperre = open("/tmp/cj_verfuegbarkeit.lock", "w")
    try:
        fcntl.flock(_sperre, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("Ein anderer Lauf haelt die Sperre (/tmp/cj_verfuegbarkeit.lock) — "
              "dieser Aufruf macht nichts. Das ist kein Fehler.", flush=True)
        raise SystemExit(0)


_sperre = None

def _cj_token():
    """Crash-frei an den CJ-Token kommen (01.09.): /tmp/_cjtok schreibt der Fulfill-Runner —
    fehlt die Datei (frischer /tmp-Wipe, Runner noch nicht gelaufen), holen wir selbst einen
    (CJ limitiert getAccessToken auf 1x/300s; ein Fehlschlag ist dann ein sauberes No-op,
    kein Traceback — ein Crash-Log sieht fuer den Aufseher wie ein erledigter Lauf aus)."""
    try:
        t = open("/tmp/_cjtok").read().strip()
        if t:
            return t
    except FileNotFoundError:
        pass
    try:
        body = json.dumps({"email": open("/tmp/cj_email").read().strip(),
                           "password": open("/tmp/cj_apikey").read().strip()})
        r = subprocess.run(["curl", "-s", "--max-time", "30", "-X", "POST",
                            "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
                            "-H", "Content-Type: application/json", "-d", body],
                           capture_output=True, text=True)
        t = ((json.loads(r.stdout).get("data") or {}).get("accessToken") or "").strip()
        if t:
            open("/tmp/_cjtok", "w").write(t)
            return t
    except Exception:
        pass
    print("Kein CJ-Token erreichbar (/tmp/_cjtok fehlt, Eigenbezug scheiterte) — No-op.")
    raise SystemExit(0)


CJTOK = _cj_token()
STOK = open("/tmp/cj_shop_token.txt").read().strip()
SHOP = "au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_cj_verfuegbarkeit.txt"
PUNKTE_RESERVE = int(os.environ.get("PUNKTE_RESERVE", "400"))
PAUSE = float(os.environ.get("PAUSE", "1.2"))

_punkte = {"rest": None}


def cj(path, body=None):
    a = ["curl", "-s", "--max-time", "40", "-H", "CJ-Access-Token: " + CJTOK]
    if body is not None:
        a += ["-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(body)]
    a.append("https://developers.cjdropshipping.com" + path)
    for att in range(3):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except Exception:
            time.sleep(4); continue
        pi = d.get("pointsInfo") or {}
        if pi.get("remaining") is not None:
            _punkte["rest"] = pi["remaining"]
        if str(d.get("code")) in ("1600200", "1600201"):   # Drossel
            time.sleep(8 * (att + 1)); continue
        return d
    return None


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "50",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + STOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        # ⚠️ 17.09.2026: Hier stand `except Exception: pass` — der GRUND wurde
        # verschluckt. 15 Waechter meldeten «Shopify antwortet nicht», und keiner
        # konnte sagen warum. Ein Fehler ohne Grund ist eine Sackgasse fuer den,
        # der ihn als naechstes liest.
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            grund = str(d.get("errors") or d)[:300]
            # THROTTLED ist kein Fehler, sondern eine Bitte um Geduld: der Eimer
            # fuellt sich mit restoreRate pro Sekunde, eine teure Abfrage braucht
            # laenger als der feste Kurzschlaf.
            if "THROTTLED" in grund.upper():
                # ⚠️ 21.09.2026: der feste 12-s-Schlaf reichte nicht. Nach JEDEM stuendlichen
                # Container-Neustart startet der Aufseher ~25 Waechter auf EINEN 2000-Punkte-
                # Eimer (100/s Nachlauf); wer hier nach 4 Versuchen aufgab, schrieb einen
                # Traceback ins Log und wartete auf den naechsten Aufseher-Zyklus — 30 min fuer
                # die 13 Reiniger, 24 h fuer die Tageswaechter (Start nach Log-ALTER). Gemessen
                # 09:08-Runde: 4 von 21 Waechtern so gestorben. Shopify sagt
                # in throttleStatus, wie lange es dauert — fragen statt raten (menue_links, frueh).
                drossel += 1
                wartezeit = 12.0
                try:
                    _k = (d.get("extensions") or {}).get("cost") or {}
                    _t = _k.get("throttleStatus") or {}
                    _fehlt = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                    _rate = float(_t.get("restoreRate") or 0)
                    if _fehlt > 0 and _rate > 0:
                        wartezeit = min(30.0, _fehlt / _rate + 0.5)
                except Exception:
                    pass
                time.sleep(wartezeit)
                if drossel < 12:
                    continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund
                break
        except Exception as e:
            roh = (r.stdout or "")[:200]
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + roh
        versuche += 1
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


UUID = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$', re.I)


def cj_kennt(sku):
    """-> True (vorhanden) / False (sicher weg) / None (unklar, nicht anfassen)

    ⚠️ TEUER GELERNT (2026-08-09): Es gibt DREI SKU-Formen, nicht zwei.
      a) CJ-<Ziffern>   numerische pid
      b) <variantSku>   z.B. CJLY291603001AZ
      c) CJ-<UUID>      z.B. CJ-5AF5A72D-0897-4AF6-AFF5-D6A33F2D3A01  ← aeltere CJ-Produkte
    Form (c) landete zuerst im variantSku-Zweig, bekam dort korrekt «nicht gefunden» — und wurde
    faelschlich als «bei CJ verschwunden» gewertet. Zwei kerngesunde Produkte wurden dadurch
    gedraftet. Ein «nicht gefunden» beweist nur, dass DIESE eine Abfrage nichts fand, nicht dass
    das Produkt weg ist. Darum wird jede Form ueber ihren eigenen Endpunkt geprueft, und bei
    Unsicherheit gilt weiterhin: nicht anfassen."""
    s = (sku or "").strip()
    kern = re.sub(r'^CJ-', '', s, flags=re.I)
    if re.fullmatch(r'[0-9]{10,}', kern) or UUID.fullmatch(kern):
        d = cj(f"/api2.0/v1/product/variant/query?pid={kern}")
    else:
        if not re.fullmatch(r'[A-Za-z0-9._-]{6,40}', kern):
            return None
        d = cj(f"/api2.0/v1/product/query?variantSku={kern}")
    if d is None:
        return None                      # Netz/Drossel -> unklar
    code = str(d.get("code"))
    if code == "200":
        data = d.get("data")
        if isinstance(data, dict):
            return bool(data.get("variants") or data.get("pid"))
        if isinstance(data, list):
            return bool(data)
        return None
    # CJ meldet Nichtgefunden mit eigenem Code; alles andere ist ein Fehler, kein Beweis
    # 14.09.: Code 1602002 «Product has been removed from shelves» ist die EINDEUTIGE Absage
    # (gemessen 02.09. und 14.09.) — ihr Text enthaelt keines der Woerter unten, deshalb galt
    # jedes ausgelistete Produkt hier als «unklar» und der Waechter hat in Wochen 0 gedraftet.
    if code == "1602002":
        return False
    txt = (d.get("message") or "").lower()
    if "not exist" in txt or "not found" in txt or "no data" in txt:
        return False
    return None


def main():
    _nur_einmal()                      # zwei Laeufe fuellen sonst dasselbe Ledger doppelt
    # ⚠️ 19.09.2026: DER CURSOR IST ERSATZLOS RAUS — er hat den Waechter blind gemacht.
    #
    # GEMESSEN: `/tmp/cj_verf_cursor.txt` stand seit dem 16.09. 00:13 auf einem Produkt vom
    # Juni; seither meldete JEDER Lauf «FERTIG: 0 geprueft, 0 ok, 0 weg, 0 unklar». Ledger
    # 45'522 Eintraege, aktive cj-real 47'522 — und von den 600 NEUESTEN aktiven Produkten
    # fehlten ALLE 600 im Ledger, darunter die Mini-Beamer vom 05.09., die auf der Startseite
    # in der Hype-Reihe stehen.
    #
    # Der Grund ist die Sortierung: `CREATED_AT, reverse:true` heisst NEUESTE ZUERST, und
    # `after:<cursor>` liefert deshalb nur das, was ALTER ist als der Cursor. Alles Neuere
    # liegt VOR dem Cursor und war nie wieder erreichbar. Dazu wurde der Cursor beim Ende
    # eines Durchgangs nie geloescht — ein Waechter, der einmal durch ist, war fuer immer fertig.
    #
    # Ein Cursor ist hier ueberfluessig: Das LEDGER macht den Lauf schon idempotent. Wer oben
    # anfaengt, trifft die ungeprueften Neuzugaenge sofort (sie sind die neuesten), und was
    # geprueft wurde, ueberspringt der Ledger-Abgleich ohne einen einzigen CJ-Aufruf. Stirbt
    # der Lauf mittendrin (der Container wird zwischen Turns angehalten), ist der Fortschritt
    # im Ledger — nicht in einer Cursor-Datei, die ihn danach blockiert.
    veraltet = "/tmp/cj_verf_cursor.txt"
    if os.path.exists(veraltet):
        try:
            os.remove(veraltet)
            print("alten Cursor entfernt (blockierte seit 16.09. alle Neuzugaenge)", flush=True)
        except OSError:
            pass
    cur = None
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = weg = unklar = ok = 0
    print(f"Start | schon geprüft {len(done)} | DRY={DRY}", flush=True)

    while True:
        d = gql('''query($c:String){ products(first:60,after:$c,
                 query:"status:ACTIVE AND tag:cj-real", sortKey:CREATED_AT, reverse:true){
                 pageInfo{hasNextPage endCursor}
                 nodes{ id title variants(first:1){nodes{sku}} }}}''', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("keine Shopify-Daten", flush=True); break
        for p in pg["nodes"]:
            if p["id"] in done:
                continue
            if _punkte["rest"] is not None and _punkte["rest"] < PUNKTE_RESERVE:
                print(f"⏸️ Punkte-Restbudget {_punkte['rest']} < {PUNKTE_RESERVE} — "
                      f"Audit pausiert, damit der Import weiterläuft.", flush=True)
                print(f"Zwischenstand: {n} geprüft, {ok} ok, {weg} weg, {unklar} unklar")
                return
            v = p["variants"]["nodes"]
            sku = v[0]["sku"] if v else ""
            n += 1
            res = cj_kennt(sku)
            time.sleep(PAUSE)
            if res is None:
                unklar += 1
                continue                 # bewusst NICHT ins Ledger: nächster Lauf prüft erneut
            if res:
                ok += 1
                f.write(f"{p['id']}\tok\n")
            else:
                weg += 1
                f.write(f"{p['id']}\tbei-cj-weg\t{sku}\n")
                print(f"  ⛔ nicht mehr bei CJ: {p['title'][:55]} [{sku}]", flush=True)
                if not DRY:
                    gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                        {"i": {"id": p["id"], "status": "DRAFT"}})
                    gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                        {"id": p["id"], "t": ["cj-nicht-mehr-verfuegbar"]})
            f.flush()
        if n and n % 300 < 60:
            print(f"  {n} geprüft | ok {ok} | weg {weg} | unklar {unklar} | Punkte {_punkte['rest']}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]        # nur INNERHALB dieses Laufs, nichts auf Platte
    print(f"FERTIG: {n} geprüft, {ok} ok, {weg} nicht mehr verfügbar, {unklar} unklar")


if __name__ == "__main__":
    main()
