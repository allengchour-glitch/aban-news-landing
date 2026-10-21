#!/usr/bin/env python3
"""cj_lager_abgleich.py — CJ-Lagerbestand je VARIANTE → Shop zeigt «ausverkauft» (06.10.2026).

Betreiber 06.10.: «cj lagerstatus check und dann unser webseite auch bei alle produkten».
GEMESSEN 06.10.: CJ-Ware läuft ohne Bestandsführung (tracked:false, ab Import DENY) → jede Variante ist kaufbar.
Vorhandene Wächter prüfen nur «gibt es das Produkt/die Variante noch» (cj_verfuegbarkeit, cj_varianten_wache) — beide
standen am 06.10. still («Insufficient API points … Remaining 0», der Grind braucht ~110–126k Punkte/Tag, Topf ab ~04:30
leer). Der BESTAND (totalInventory) wurde nur von cj_stock_guard.mjs geprüft, der in keiner Startliste stand.
GEMESSEN 06.10.: `product/query?productSku=…&features=enable_inventory` liefert je Variante `inventories[]` (totalInventory = cj +
  factory); OHNE features ist `inventories` None (Doku 1.10 sagt «automatisch» — falsch)
— EINE Anfrage je Produkt für alle Varianten.

REGEL (umkehrbar, nichts löschen, nichts draften):
  * Variante mit Summe totalInventory == 0 und Policy CONTINUE → DENY (Shop: «ausverkauft», Google: out of stock).
  * Variante, die DIESES Werkzeug auf DENY gesetzt hat (Ledger) und wieder Bestand > 0 hat → zurück auf CONTINUE.
  * Fremde DENY (andere Wächter) bleiben unberührt. Variante fehlt in der CJ-Antwort → «unklar», nichts tun
    (cj_varianten_wache ist dafür zuständig; Lehre 21.09.: ein «nicht gefunden» aus der falschen Anfrage beweist nichts).
  * Fabrikbestand ZÄHLT (Journal 05.10. #1021: factory 20'000 bei «out of stock» — n=1, noch keine Regel).
  * KANARIENVOGEL: erste Antwort muss variants[].inventories tragen, sonst Abbruch (Format geändert = blind).
  * Punkte: Lauf endet sauber bei «Insufficient API points» (kein Ledger-Eintrag, nächster Lauf holt nach).
PID-SKU (14.10.2026): 29'013 aktive Produkte tragen nur «CJ-<pid>» (Zahl oder UUID, fast alle 1 Shop-Variante «Default
Title») — produkt_sku() leitet daraus nichts ab, sie standen als «keine-cj-sku» ohne jeden Bestandsschutz (#1019).
GEMESSEN 14.10.: `product/query?pid=…&features=enable_inventory` geht für Zahl UND UUID, 10 Punkte, data.pid + variants[]
mit vid/inventories. Welche CJ-Variante eine Bestellung nimmt, entscheidet cj_order_engine.vid_fuer(): CJ hat 1 Variante →
diese; Zeile in dropship/_cj_varianten_zuordnung.tsv → diese; sonst erst beim Bestellen (Bildvergleich). Deshalb:
  * eindeutig (1 CJ-Variante oder Zuordnung) → Bestand genau dieser Variante.
  * offen (mehrere CJ-Varianten) → sperren nur, wenn ALLE 0; eigene Sperre frei, sobald eine > 0 (Zustand = Funktion des
    Bestands, nie des Verlaufs). Restrisiko: die beim Bestellen gewählte Variante kann 0 haben, während andere Bestand haben.
  * Shop-Produkt mit mehreren Varianten unter derselben pid-SKU (3 Stück) → unklar.
  * Antwort gehört zu einer anderen pid → unklar. Nur über die ZUSATZKONTEN (nie Hauptkonto/Grind-Topf), höchstens
    CAP_PID je Lauf und PID_TAG je UTC-Tag (gezählt an Ledger-Zeilen «q:pid»), immer NACH der SKU-Ware des Laufs.
  * Kanarie pid: erste pid-Antwort mit Varianten muss inventories mit totalInventory tragen, sonst kein pid-Urteil im Lauf.
BESTAND UNBEKANNT (14.10.): inventories fehlt, ist leer oder ein Eintrag ohne totalInventory → None (nie 0).
LEDGER-REIHENFOLGE (14.10.): vor jeder Sperre steht eine Zeile «geplant» mit den IDs (ein Abbruch zwischen Mutation und
Ledger hinterliess sonst eine Sperre, die nie mehr freigegeben wird); «fehler» wird nach 1 Tag wieder vorgelegt.
ENTWÜRFE (14.10., gemessen 20 von 74): lagerstand_hygiene macht ein ganz gesperrtes Produkt zum DRAFT «ausverkauft-lieferant»;
der Export kennt nur ACTIVE → nie mehr geprüft, nie freigegeben, nie zurück. Jetzt werden Entwürfe mit eigener Sperre
mitgeprüft (nur FREIGEBEN, nie sperren); die Reaktivierung macht danach lagerstand_hygiene mit ihren eigenen Prüfungen.
Reihenfolge: besuchte Seiten, dann nie geprüfte, dann die am längsten nicht geprüften (Ledger `dropship/_cj_lager.tsv`),
pid-Ware am Ende.
Läuft im CJ-Vorrang-Fenster (00:00–01:30 UTC, direkt nach dem Punkte-Reset) mit CAP; Bericht `dropship/CJ-LAGER.md`.
  DRY=1 python3 automation/cj_lager_abgleich.py          # messen
  CAP=1500 python3 automation/cj_lager_abgleich.py       # schreiben
  python3 automation/cj_lager_abgleich.py --probe CJDS2337796   # Rohantwort einer productSku
  python3 automation/cj_lager_abgleich.py --selbsttest
"""
import collections, datetime, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import cj_sku   # 20.10.2026: EINE Quelle für CJ-SKU-Formen (siehe dort)
LEDGER = os.path.join(REPO, "dropship", "_cj_lager.tsv")
BERICHT = os.path.join(REPO, "dropship", "CJ-LAGER.md")
EXPORT = "/tmp/cj_lager_export.jsonl"
DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "1500"))
PID_AN = os.environ.get("PID", "1") == "1"                       # PID=0: pid-Teil aus (eigene pid-Sperren werden trotzdem geprüft)
CAP_PID = int(os.environ.get("CAP_PID", "300"))                  # pid-Produkte je Lauf (am Ende der Liste)
PID_TAG = int(os.environ.get("PID_TAG", "600"))                  # pid-Abfragen je UTC-Tag (Zusatzkonten, Rest bleibt der SKU-Ware)
RECHECK_PID_S = int(os.environ.get("RECHECK_PID_TAGE", "21")) * 86400
STREU_PID_TAGE = int(os.environ.get("STREU_PID_TAGE", "15"))
ZUORDNUNG = os.path.join(REPO, "dropship", "_cj_varianten_zuordnung.tsv")
_UUID = r"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"
RECHECK_S = int(os.environ.get("RECHECK_TAGE", "7")) * 86400
# 13.10.2026 (Hetzner-Plan Schritt 2, GEMESSEN): 16'564 «ok»-Prüfungen vom 07.10. wurden gleichzeitig fällig (bis 2'307/h,
# ~146'000 Punkte = mehr als ein Tagestopf) → fester Versatz je Produkt 0–7 Tage (crc32, auf Server und Cloud gleich; Pythons
# hash() ist je Prozess zufällig). Besuchte Landeseiten bleiben schneller dran (2 Tage).
STREU_TAGE = int(os.environ.get("STREU_TAGE", "8"))
BESUCHT_S = int(os.environ.get("BESUCHT_TAGE", "2")) * 86400


def recheck_s(pid, besucht=False):
    """Prüfabstand je Produkt: besucht → 2 T, sonst 7 T + stabiler Versatz 0–7 T (verteilt einen Prüf-Berg über eine Woche)."""
    import zlib
    if besucht:
        return BESUCHT_S
    return RECHECK_S + (zlib.crc32(str(pid).encode()) % max(1, STREU_TAGE)) * 86400


def kern(sku):
    """«CJ-CJDS233779601AZ» und «CJDS233779601AZ» → «CJDS233779601AZ» (44'956 Varianten ohne «CJ-», gemessen 06.10.)."""
    return re.sub(r"^CJ-", "", (sku or "").strip(), flags=re.I).upper()


def produkt_sku(variant_sku):
    """→ productSku für product/query?productSku=…; None = keine CJ-Stamm-Form.
    20.10.2026: delegiert an cj_sku.stamm(). Vorher kannte die Funktion nur «Stamm + 2 Ziffern + 2 Buchstaben» und den nackten Stamm;
    die Form MIT Optionsanhang («CJYDQXHB00011-BROWN-39» → CJYDQXHB00011, gemessen 3'123 Varianten) ergab None → «keine-cj-sku»:
    ein Produkt, dessen Varianten alle so heissen, bekam NIE eine Bestandsprüfung und blieb bei CJ-Auslistung im Verkauf."""
    return cj_sku.stamm(variant_sku)


def bestand(variante):
    """Summe totalInventory über alle Lager → int, oder None = unbekannt. 14.10.2026: leere Liste und Einträge ohne
    totalInventory zählten als 0 (`or 0`) — ein umbenanntes Feld hätte jedes Produkt gesperrt. Unbekannt ist nie 0."""
    inv = variante.get("inventories")
    if not isinstance(inv, list) or not inv:
        return None
    try:
        werte = [x.get("totalInventory") for x in inv]
        if any(w is None or isinstance(w, bool) for w in werte):
            return None
        return sum(int(w) for w in werte)
    except Exception:
        return None


def pid_aus_sku(sku):
    """«CJ-2606160740461633600» / «CJ-5AF5A72D-…» → pid; jede andere Form → None (gleiche Erkennung wie cj_order_engine)."""
    m = re.match(r"^CJ-([0-9]{10,}|" + _UUID + r")$", (sku or "").strip(), re.I)
    return m.group(1) if m else None


def recheck_pid_s(pid):
    """pid-Ware: 21 T + stabiler Versatz 0–14 T (29'000 Produkte ≈ 1'000/Tag; die Tages-Deckel bremsen zusätzlich)."""
    import zlib
    return RECHECK_PID_S + (zlib.crc32(str(pid).encode()) % max(1, STREU_PID_TAGE)) * 86400


def zuordnung_lesen(pfad=None):
    """dropship/_cj_varianten_zuordnung.tsv → {shopify_sku (gross): cj_vid} — dieselbe Datei, die cj_order_engine liest."""
    z = {}
    try:
        for l in open(pfad or ZUORDNUNG, encoding="utf-8"):
            if l.startswith("#") or not l.strip():
                continue
            t = l.rstrip("\n").split("\t")
            if len(t) >= 2 and t[0].strip() and t[1].strip():
                z.setdefault(t[0].strip().upper(), t[1].strip())   # erste Zeile gewinnt — wie cj_order_engine.vid_fuer()
    except Exception:
        pass
    return z


def antwort_passt(pid_cj, data):
    """Gehört die CJ-Antwort zur gefragten pid? Fehlt data.pid → passt nicht (nie ein fremdes Produkt beurteilen)."""
    return isinstance(data, dict) and str(data.get("pid") or "").upper() == str(pid_cj or "").upper() != ""


def entscheiden_pid(shop_varianten, cj_varianten, eigene_deny, zuordnung):
    """→ (sperren_ids, freigeben_ids, unklar, art). Nur die Variante(n), die cj_order_engine.vid_fuer() bestellen könnte:
    Zuordnung (genau 1 vid-Treffer) → eindeutig · CJ 1 Variante → eindeutig · sonst offen (alle). Gesperrt wird, wenn
    ALLE Kandidaten 0 haben; eine EIGENE Sperre wird frei, sobald ein Kandidat > 0 hat. Bestand unbekannt → unklar."""
    cj = [v for v in (cj_varianten or []) if isinstance(v, dict)]
    if len(shop_varianten) != 1 or not cj:
        return [], [], len(shop_varianten), "mehrere-shopvarianten" if len(shop_varianten) != 1 else "keine-cj-variante"
    v = shop_varianten[0]
    vid = None if len(cj) == 1 else zuordnung.get(str(v.get("sku") or "").upper())   # Engine: «1 Variante» vor der Datei
    treffer = [k for k in cj if vid and str(k.get("vid") or "").upper() == vid.upper()]
    if vid and len(treffer) != 1:
        return [], [], 1, "zuordnung-passt-nicht"
    kand, art = (treffer, "zuordnung") if vid else ((cj, "einzeln") if len(cj) == 1 else (cj, "offen"))
    b = [bestand(k) for k in kand]
    if any(x is None for x in b):
        return [], [], 1, art
    if all(x == 0 for x in b):
        return ([v["id"]] if v.get("kaufbar") else []), [], 0, art
    if not v.get("kaufbar") and v["id"] in eigene_deny:
        return [], [v["id"]], 0, art
    return [], [], 0, art


def cj_entfernt(grund):
    """07.10.2026 (Prüf-Routine): CJ-Code 1602002 «Product has been removed from shelves» = nicht mehr lieferbar. Gemessen:
    9 «unklar», davon 8 ACTIVE und VOLL kaufbar (149 Varianten) — Geisterverkauf. Jetzt: alle kaufbaren Varianten sperren
    (umkehrbar: die IDs stehen als eigene Sperre im Ledger und werden frei, sobald CJ wieder Bestand meldet)."""
    g = str(grund or "")
    return "1602002" in g or "removed from" in g.lower()


def entscheiden(shop_varianten, cj_varianten, eigene_deny):
    """→ (sperren_ids, freigeben_ids, unklar). shop: [{id, sku, kaufbar}], cj: [{variantSku, inventories}].
    Entscheidet nach KAUFBARKEIT (availableForSale), nie nach inventoryPolicy: CJ-Ware steht ab Import auf DENY + tracked:false
    (427'616 Varianten, gemessen 06.10.) und ist trotzdem kaufbar — DENY allein sperrt nichts (Journal 08.09.)."""
    cj = {kern(v.get("variantSku")): bestand(v) for v in cj_varianten or []}
    einzeln = len(shop_varianten) == 1 and len(cj_varianten or []) == 1   # Produkt-SKU ohne Anhang ↔ einzige CJ-Variante
    deny, zurueck, unklar = [], [], 0
    for v in shop_varianten:
        b = cj.get(kern(v.get("sku")))
        if b is None and einzeln:
            b = bestand(cj_varianten[0])
        if b is None:
            unklar += 1; continue
        if b == 0 and v.get("kaufbar"):
            deny.append(v["id"])
        elif b > 0 and not v.get("kaufbar") and v["id"] in eigene_deny:
            zurueck.append(v["id"])
    return deny, zurueck, unklar


def export_holen():
    from kaufwille_zeile import gql
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 20 * 3600:
        return
    q = ('{ products(query:"tag:cj-real status:active") { edges { node { id handle title '
         'variants { edges { node { id sku inventoryPolicy availableForSale inventoryItem { tracked } } } } } } } }')
    b = gql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}", {"q": q})["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise SystemExit(f"Bulk: {b['userErrors']}")
    for _ in range(240):
        time.sleep(15)
        s = gql("query($i:ID!){node(id:$i){... on BulkOperation{status url objectCount errorCode}}}", {"i": b["bulkOperation"]["id"]})["node"]
        if s["status"] == "COMPLETED":
            urllib.request.urlretrieve(s["url"], EXPORT + ".teil"); os.replace(EXPORT + ".teil", EXPORT); return
        if s["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {s['status']} {s['errorCode']}")
    raise SystemExit("Bulk: Zeitüberschreitung")


def produkte():
    P = {}
    for l in open(EXPORT, encoding="utf-8"):
        o = json.loads(l)
        if "__parentId" in o:
            P.setdefault(o["__parentId"], {"v": []})["v"].append(o)
        else:
            P.setdefault(o["id"], {"v": []}).update(o)
    return P


def ledger(pfad=None, heute_ab=None):
    """→ (zuletzt, eigene, status, pid_heute). zuletzt/status = letzte Prüfzeile je Produkt; «geplant»-Zeilen (vor einer
    Sperre geschrieben) zählen nur für eigene, nicht als Prüfung; pid_heute = Zeilen mit «q:pid» seit 00:00 UTC."""
    if heute_ab is None:
        heute_ab = time.time() // 86400 * 86400
    zuletzt, eigene, status, pid_heute = {}, set(), {}, 0
    pfad = pfad or LEDGER
    if os.path.exists(pfad):
        for l in open(pfad, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) < 3:
                continue
            try:
                ts = float(t[1])
            except ValueError:
                continue
            if t[2] != "geplant":
                zuletzt[t[0]] = ts
                status[t[0]] = t[2]
            if "q:pid" in t[3:] and ts >= heute_ab and t[2] != "geplant":
                pid_heute += 1
            for teil in t[3:]:
                if teil.startswith("deny:"):
                    eigene |= set(filter(None, teil[5:].split(",")))
                elif teil.startswith("zurueck:"):
                    eigene -= set(filter(None, teil[8:].split(",")))
    return zuletzt, eigene, status, pid_heute


# ── Zusatzkonten (Betreiber 06.10. «beide reaktiviert»): GEMESSEN get_account_settings je Konto: /product/query 1000/Tag,
#    eigenes Kontingent, unabhängig vom Grind-Punktetopf des Hauptkontos. Schlüssel nur /tmp/cj_konten.env (600), Tokens
#    /tmp/cj_konten_token.json (gültig bis 2027-04). Je Konto ≥ 1,1 s Abstand; Kontingent-/Sperrmeldung → Konto für diesen Lauf weg.
import threading as _th
_KONTEN, _KLOCK = None, _th.Lock()


def _konten():
    global _KONTEN
    if _KONTEN is not None:
        return _KONTEN
    _KONTEN = []
    try:
        env = {l.split("=", 1)[0]: l.split("=", 1)[1].strip().strip("'") for l in open("/tmp/cj_konten.env") if "=" in l and not l.startswith("#")}
    except Exception:
        return _KONTEN
    try:
        tok = json.load(open("/tmp/cj_konten_token.json"))
    except Exception:
        tok = {}
    import subprocess
    for n in ("2", "3"):
        key = env.get(f"CJ{n}_API_KEY")
        if not key:
            continue
        t = (tok.get(n) or {}).get("accessToken")
        if not t:
            try:
                d = json.loads(subprocess.run(["curl", "-s", "-m", "30", "-X", "POST",
                    "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", "-H", "Content-Type: application/json",
                    "-d", json.dumps({"apiKey": key})], capture_output=True, text=True).stdout)
                t = d["data"]["accessToken"]; tok[n] = d["data"]
                old = os.umask(0o077); json.dump(tok, open("/tmp/cj_konten_token.json", "w")); os.umask(old)
            except Exception:
                continue
        _KONTEN.append({"n": n, "t": t, "zuletzt": 0.0, "aktiv": True})
    return _KONTEN


def zusatz_abfrage(frage):
    """frage = «productSku=…» oder «pid=…» (nackte productSku geht auch) → (data|None, grund).
    None + 'kein-konto' = alle Zusatzkonten erschöpft → Hauptkonto nehmen (SKU-Ware) bzw. pid-Teil für heute beenden."""
    import subprocess
    if not frage.startswith(("productSku=", "pid=")):
        frage = "productSku=" + frage
    drossel = 0
    while True:
        with _KLOCK:
            frei = [k for k in _konten() if k["aktiv"]]
            if not frei:
                return None, "kein-konto"
            k = min(frei, key=lambda x: x["zuletzt"])
            warte = k["zuletzt"] + 1.1 - time.time()
            k["zuletzt"] = max(time.time(), k["zuletzt"] + 1.1)
        if warte > 0:
            time.sleep(warte)
        out = subprocess.run(["curl", "-s", "-m", "40", "-H", "CJ-Access-Token: " + k["t"],
            f"https://developers.cjdropshipping.com/api2.0/v1/product/query?{frage}&features=enable_inventory"],
            capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except Exception:
            return None, "netz"
        msg = str(d.get("message") or "")
        # 14.10.2026: «Quota has been used up» (1600201) lief hier als Drossel in eine Endlosschleife → Kontingent ZUERST.
        if "quota" in msg.lower() or "used up" in msg.lower() or "Insufficient" in msg or "disabled" in msg \
                or str(d.get("code")) in ("1600014", "16900500"):
            with _KLOCK:
                k["aktiv"] = False
            print(f"  Zusatzkonto {k['n']} erschöpft/gesperrt: {msg[:80]}", flush=True); continue
        if str(d.get("code")) in ("1600200", "1600201") or "Too Many" in msg:
            drossel += 1
            if drossel > 20:
                return None, "netz"
            time.sleep(1.5); continue
        return (d.get("data") if isinstance(d.get("data"), dict) else {}), f"konto{k['n']} code {d.get('code')} {msg[:30]}"


def entwuerfe_mit_eigener_sperre(gql, P, pfad=None):
    """14.10.2026: Produkte mit EIGENER Sperre (Ledger), die lagerstand_hygiene inzwischen zum DRAFT «ausverkauft-lieferant»
    gemacht hat — der Export kennt nur ACTIVE, also prüfte sie niemand mehr. → {gid: {"v": [...], "entwurf": True, …}}."""
    sperr_prod = {}
    try:
        for l in open(pfad or LEDGER, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            for teil in t[3:]:
                if teil.startswith("deny:") and teil[5:]:
                    sperr_prod[t[0]] = True
    except Exception:
        return {}
    ids = [i for i in sperr_prod if i not in P and i.startswith("gid://shopify/Product/")]
    aus = {}
    for i in range(0, len(ids), 50):
        d = gql('query($i:[ID!]!){nodes(ids:$i){... on Product{id handle title status tags '
                'variants(first:100){nodes{id sku availableForSale}}}}}', {"i": ids[i:i + 50]})
        d = d.get("data", d) if isinstance(d, dict) else {}
        for n in (d.get("nodes") or []):
            if n and n.get("status") == "DRAFT" and "ausverkauft-lieferant" in (n.get("tags") or []):
                aus[n["id"]] = {"id": n["id"], "handle": n.get("handle"), "title": n.get("title"), "entwurf": True,
                                "v": [{"id": v["id"], "sku": v.get("sku"), "availableForSale": v.get("availableForSale")}
                                      for v in n["variants"]["nodes"]]}
    return aus


def ledger_zeile(zeile, pfad=None):
    """14.10.2026: Datei JE ZEILE öffnen. Ein offener Griff schrieb nach einem git-Merge (Autocommitter, Server-Zeilen) in die
    ersetzte, gelöschte Datei — «geplant»/«ok» waren dann weg und eine Sperre ohne Eintrag (nie wieder freigegeben)."""
    if DRY:
        return
    with open(pfad or LEDGER, "a", encoding="utf-8") as f:
        f.write(zeile if zeile.endswith("\n") else zeile + "\n")


PID_ZAEHLER = "/tmp/cj_lager_pid_tag.json"
import threading as _thz
_ZLOCK = _thz.Lock()


def pid_zaehlen(n=1, pfad=None):
    """Echte pid-Abfragen je UTC-Tag (jede Abfrage kostet, auch ohne Ledger-Zeile: Kanarie, Bremse, Abbruch) → Stand."""
    pfad = pfad or PID_ZAEHLER
    tag = time.strftime("%Y-%m-%d", time.gmtime())
    with _ZLOCK:
        try:
            d = json.load(open(pfad))
        except Exception:
            d = {}
        d = {tag: int(d.get(tag, 0)) + n}
        if n:
            try:
                tmp = pfad + ".tmp"
                json.dump(d, open(tmp, "w")); os.replace(tmp, pfad)
            except Exception:
                pass
        return d[tag]


def verwaiste_plaene(pfad=None):
    """→ {Produkt-gid: [Varianten-IDs]}, deren LETZTE Ledger-Zeile ein «geplant deny:…» ist (Lauf starb zwischen Plan und
    Ergebnis). Der Aufrufer liest den Stand und nimmt nie gesetzte Sperren mit «geplant zurueck:…» wieder aus «eigene»."""
    letzte = {}
    try:
        for l in open(pfad or LEDGER, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 3:
                letzte[t[0]] = t
    except Exception:
        return {}
    aus = {}
    for pid, t in letzte.items():
        if t[2] == "geplant":
            ids = [x for teil in t[3:] if teil.startswith("deny:") for x in teil[5:].split(",") if x]
            if ids:
                aus[pid] = ids
    return aus


def nie_gesperrt(gql, ids):
    """Varianten, die NOCH kaufbar sind (die geplante Sperre wurde nie gesetzt) → Liste. Unlesbar → [] (lieber eigen behalten)."""
    try:
        import ausverkauft
        stand = ausverkauft._lesen(gql, list(ids))
        return [i for i in ids if (stand.get(i) or {}).get("availableForSale") is True]
    except Exception:
        return []


def neu_pruefbar(varianten):
    """20.10.2026: Ein Produkt mit altem Befund «keine-cj-sku», dessen Varianten HEUTE einen productSku-Stamm hergeben (Optionsanhang-Form
    «CJYDQXHB00011-BROWN-39», cj_sku.stamm), ist sofort fällig — sonst bliebe der Erstbefund 7–15 Tage stehen (Prüfabstand + Streuung).
    Produkte ohne jede CJ-Stamm-Form bleiben dabei, was sie waren (keine Endlosschleife)."""
    return any(produkt_sku(v.get("sku")) for v in varianten)


def pid_des_produkts(p):
    """Produkt mit pid-SKU → pid, wenn KEINE Variante eine productSku hergibt und alle Varianten dieselbe pid tragen."""
    skus = [v.get("sku") for v in p.get("v") or []]
    if not skus or any(produkt_sku(s) for s in skus):
        return None
    pids = {(pid_aus_sku(s) or "").upper() for s in skus}
    return next(iter(pids)) if len(pids) == 1 and "" not in pids else None


def main():
    import cj_varianten_wache as w          # gemeinsamer CJ-Takt, Token, Drossel (gleiches cj() wie die Varianten-Wache)
    export_holen()
    P = produkte(); zuletzt, eigene, status, pid_heute = ledger(); jetzt = time.time()
    try:
        P.update(entwuerfe_mit_eigener_sperre(w.gql, P))
    except Exception as e:
        print(f"  Entwürfe mit eigener Sperre nicht lesbar ({str(e)[:80]}) — nur ACTIVE", flush=True)
    zuordnung = zuordnung_lesen()
    PIDS = {pid: x for pid, p in P.items() if (x := pid_des_produkts(p))}
    eigene_prod = {pid for pid, p in P.items() if any(v["id"] in eigene for v in p.get("v") or [])}
    prio = set()   # besuchte Landeseiten zuerst (Liste der Lieferbarkeits-Wache), dann nie geprüft, dann älteste Prüfung
    try:
        prio = {l.split("\t")[0] for l in open(os.path.join(REPO, "dropship", "_besuchte_seiten_geprueft.tsv"), encoding="utf-8")}
    except Exception:
        pass

    def zeit(pid):          # «keine-cj-sku» von früher ist für pid-Ware keine Prüfung — und seit 20.10. auch nicht für SKU-Ware, die jetzt einen Stamm hat
        if status.get(pid) == "keine-cj-sku" and (pid in PIDS or neu_pruefbar(P[pid].get("v") or [])):
            return 0
        return zuletzt.get(pid, 0)

    def abstand(pid):
        if status.get(pid) in ("fehler", "netz", "fehler-cj"):
            return 86400                                   # gescheitert → morgen wieder, nicht in 1–6 Wochen
        if P[pid].get("entwurf") or P[pid].get("handle") in prio:
            return BESUCHT_S
        if pid in PIDS and pid not in eigene_prod:
            return recheck_pid_s(pid)
        return recheck_s(pid)

    faellig = [pid for pid, p in P.items() if p.get("v") and jetzt - zeit(pid) > abstand(pid)]
    a = sorted((x for x in faellig if x not in PIDS), key=lambda x: (P[x].get("handle") not in prio, zeit(x)))[:CAP]
    pid_heute = max(pid_heute, pid_zaehlen(0))      # Ledger-Zeilen ODER echte Abfragen (Zähler), was grösser ist
    pid_rest = max(0, PID_TAG - pid_heute)
    b = sorted((x for x in faellig if x in PIDS and (PID_AN or x in eigene_prod)),
               key=lambda x: (x not in eigene_prod, P[x].get("handle") not in prio, zeit(x)))[:min(CAP_PID, pid_rest)]
    arbeit = a + b
    print(f"CJ-Ware aktiv {sum(1 for p in P.values() if not p.get('entwurf'))} (+{sum(1 for p in P.values() if p.get('entwurf'))} "
          f"Entwürfe mit eigener Sperre) · fällig {len(faellig)} · Lauf {len(a)} SKU (CAP {CAP}) + {len(b)} pid (CAP_PID {CAP_PID}, "
          f"heute {pid_heute}/{PID_TAG}) · pid-Ware {len(PIDS)} · eigene DENY {len(eigene)} · {'DRY' if DRY else 'SCHARF'}", flush=True)
    stat = collections.Counter(); bsp = []; geprueft_format = False; pid_format = None
    stopp = {"pid": False}                       # Kanarie/Bremse/Kontingent → keine weiteren pid-Abfragen in diesem Lauf
    if not DRY:                                  # verwaiste «geplant»-Zeilen: nie gesetzte Sperren aus «eigene» nehmen
        for gid, ids in verwaiste_plaene().items():
            frei = nie_gesperrt(w.gql, ids)
            if frei:
                ledger_zeile(f"{gid}\t{jetzt:.0f}\tgeplant\tzurueck:{','.join(frei)}\tplan-verworfen")
                eigene -= set(frei); stat["plan-verworfen"] += len(frei)
    # 06.10. 21:25: CJ-MCP nur auf Wunsch (USE_MCP=1) — gemessen: gleicher Punktetopf + gleiche Konto-QPS 1/s wie REST,
    # aber OHNE den gemeinsamen cj_takt → würde mit den Grind-Runnern um die QPS kollidieren («Too Many Requests»).
    mcp = None
    if os.environ.get("USE_MCP") == "1":
        try:
            import cj_mcp
            mcp = cj_mcp.Sitzung()
        except Exception as e:
            print(f"  MCP nicht verfügbar ({str(e)[:80]}) → REST", flush=True)

    def p_entwurf(pid):
        return bool(P[pid].get("entwurf"))

    def holen(pid):
        shop_v = [{"id": v["id"], "sku": v.get("sku"), "kaufbar": v.get("availableForSale")} for v in P[pid]["v"]]
        if pid in PIDS:                              # pid-Ware: NUR Zusatzkonten, nie der Grind-Topf des Hauptkontos
            if stopp["pid"] or (not p_entwurf(pid) and pid_zaehlen(0) >= PID_TAG):
                return pid, shop_v, None, "PID-STOPP"
            pid_zaehlen(1)
            data, grund = zusatz_abfrage("pid=" + PIDS[pid])
            if grund == "kein-konto":
                return pid, shop_v, None, "PID-WARTET"
            return pid, shop_v, data, grund
        ps = next((produkt_sku(v["sku"]) for v in shop_v if produkt_sku(v["sku"])), None)
        if not ps:
            return pid, shop_v, None, "keine-cj-sku"
        if mcp:
            for versuch in range(3):
                try:
                    return pid, shop_v, mcp.produkt(ps), ""
                except Exception as e:
                    fehler = str(e)
                    if "Insufficient API points" in fehler:
                        return pid, shop_v, None, "PUNKTE-LEER"
                    if "not found" in fehler.lower() or "不存在" in fehler:
                        return pid, shop_v, {}, "cj-kennt-nicht"
                    time.sleep(2 * (versuch + 1))
            return pid, shop_v, None, f"mcp {fehler[:50]}"
        data, grund = zusatz_abfrage(ps)            # Zusatzkonten zuerst (eigenes Kontingent)
        if grund != "kein-konto":
            return pid, shop_v, data, grund
        d = w.cj(f"/api2.0/v1/product/query?productSku={ps}&features=enable_inventory")   # ohne features: inventories None (gemessen 06.10.)
        msg = str(d.get("message") or "")
        if "Insufficient API points" in msg or str(d.get("code")) == "16900500":
            return pid, shop_v, None, "PUNKTE-LEER"
        return pid, shop_v, (d.get("data") if isinstance(d.get("data"), dict) else {}), f"code {d.get('code')} {msg[:40]}"

    def sperren_mit_plan(pid, deny, zurueck, q):
        """Erst die Zeile «geplant» (IDs), dann schreiben + rücklesen. Stirbt der Lauf dazwischen, kennt der nächste die Sperre."""
        import ausverkauft
        if deny:
            ledger_zeile(f"{pid}\t{jetzt:.0f}\tgeplant\tdeny:{','.join(deny)}{q}")
        try:
            ist = ausverkauft.sperren(w.gql, pid, deny)
            ist2 = ausverkauft.freigeben(w.gql, pid, zurueck)
            if any(ist.get(i) is not False for i in deny) or any(ist2.get(i) is not True for i in zurueck):
                raise RuntimeError(f"Rücklesen: gesperrt {ist} / frei {ist2}")
        except Exception:
            frei = nie_gesperrt(w.gql, deny) if deny else []
            if frei:                              # geplant, aber nie gesetzt → nicht «eigen» (sonst gäbe sie später fremde Sperren frei)
                ledger_zeile(f"{pid}\t{jetzt:.0f}\tgeplant\tzurueck:{','.join(frei)}\tplan-verworfen{q}")
            raise

    MAX_PID_SPERREN = int(os.environ.get("MAX_PID_SPERREN", "60"))   # Bremse je Lauf (Ausgangswert SKU-Ware 0,4 %/Tag)
    from concurrent.futures import ThreadPoolExecutor
    pool = ThreadPoolExecutor(2)   # 2 Zusatzkonten je 1/s parallel; das Hauptkonto bleibt über cj_takt gedrosselt
    for pid, shop_v, data, grund in pool.map(holen, arbeit):
        p = P[pid]
        ist_pid = pid in PIDS
        q = "\tq:pid" if ist_pid else ""
        if grund == "PUNKTE-LEER":
            stat["punkte-leer"] += 1; print("  CJ-Punkte leer — sauberer Abbruch", flush=True); break
        if grund == "PID-WARTET":
            stopp["pid"] = True
            stat["pid-wartet-zusatzkonten-leer"] += 1; continue             # keine Zeile → nächster Lauf/Tag
        if grund == "PID-STOPP":
            stat["pid-gestoppt"] += 1; continue
        if data is None:
            g = "keine-cj-sku" if grund == "keine-cj-sku" else ("netz" if grund == "netz" else "unklar")
            stat[g] += 1
            ledger_zeile(f"{pid}\t{jetzt:.0f}\t{g}\t{grund or ''}{q}"); continue
        vs = data.get("variants") if isinstance(data, dict) else None
        if not vs and cj_entfernt(grund):
            deny = [v["id"] for v in shop_v if v.get("kaufbar")]
            stat["produkte-cj-entfernt"] += 1
            if deny and not DRY:
                try:
                    sperren_mit_plan(pid, deny, [], q)
                except Exception as e:
                    stat["schreibfehler"] += 1
                    ledger_zeile(f"{pid}\t{jetzt:.0f}\tfehler\t{str(e)[:80]}{q}"); continue
            stat["varianten-ausverkauft"] += len(deny)
            if len(bsp) < 12:
                bsp.append(f"{p.get('title', '')[:50]} — bei CJ aus dem Sortiment: {len(deny)} gesperrt")
            ledger_zeile(f"{pid}\t{jetzt:.0f}\tok\tdeny:{','.join(deny)}\tzurueck:\tcj-entfernt{q}")
            continue
        if not vs:
            # 14.10.: CJ-Fehlercode ≠ 200/1602001 (z. B. 1600000 «System busy», Kontofehler) = vorübergehend → morgen wieder
            vorueber = bool(grund) and "code 200" not in grund and "1602001" not in grund
            stat["fehler-cj" if vorueber else "unklar"] += 1
            ledger_zeile(f"{pid}\t{jetzt:.0f}\t{'fehler-cj' if vorueber else 'unklar'}\t{grund or 'keine Varianten'}{q}"); continue
        if ist_pid:
            if not antwort_passt(PIDS[pid], data):
                stat["pid-antwort-fremd"] += 1
                ledger_zeile(f"{pid}\t{jetzt:.0f}\tunklar\tpid-abweichung {str(data.get('pid'))[:40]}{q}"); continue
            if pid_format is None:                     # Kanarie pid: Format einmal je Lauf
                pid_format = any(bestand(v) is not None for v in vs) or all(
                    isinstance(v.get("inventories"), list) and all("totalInventory" in x for x in v["inventories"]) for v in vs)
                if not pid_format:
                    stopp["pid"] = True
                    print(f"  ⛔ KANARIE pid: inventories/totalInventory fehlt ({p.get('title', '')[:40]}) — kein pid-Urteil in diesem Lauf", flush=True)
            if not pid_format:
                stat["pid-format-fehlt"] += 1; continue                      # keine Zeile → nächster Lauf
        elif not geprueft_format:
            if not any(isinstance(v.get("inventories"), list) for v in vs):
                print(f"  ⛔ KANARIENVOGEL: variants[].inventories fehlt ({p.get('title', '')[:40]}) — CJ-Format geändert, Abbruch ohne Schreiben", flush=True)
                stat["format-fehlt"] += 1; break
            geprueft_format = True
        if ist_pid:
            deny, zurueck, unklar, art = entscheiden_pid(shop_v, vs, eigene, zuordnung)
            stat["pid-" + art] += 1
            if deny and not p.get("entwurf") and stat["pid-gesperrt"] >= MAX_PID_SPERREN:
                stopp["pid"] = True
                stat["pid-sperr-bremse"] += 1; continue                      # keine Zeile → nächster Lauf
            stat["pid-gesperrt"] += bool(deny) and not p.get("entwurf")
        else:
            deny, zurueck, unklar = entscheiden(shop_v, vs, eigene)
        # 14.10. (Prüfung): Entwürfe werden wieder GESPERRT, wenn CJ 0 meldet — sonst holte lagerstand_hygiene ein
        # ausverkauftes Produkt zurück, sobald es einmal freigegeben war (ein Entwurf ist unsichtbar, die Sperre kostet nichts).
        stat["geprüft"] += 1; stat["varianten-unklar"] += unklar
        if deny or zurueck:
            if len(bsp) < 12:
                bsp.append(f"{p.get('title', '')[:50]} — {len(deny)} ausverkauft, {len(zurueck)} wieder da (von {len(shop_v)})"
                           + (" [pid]" if ist_pid else "") + (" [Entwurf]" if p.get("entwurf") else ""))
            if not DRY:
                try:
                    sperren_mit_plan(pid, deny, zurueck, q)
                except Exception as e:
                    stat["schreibfehler"] += 1
                    ledger_zeile(f"{pid}\t{jetzt:.0f}\tfehler\t{str(e)[:80]}{q}"); continue
            stat["varianten-ausverkauft"] += len(deny); stat["varianten-wieder-da"] += len(zurueck)
            stat["produkte-ganz-ausverkauft"] += int(len(deny) == len(shop_v))
            stat["entwürfe-freigegeben"] += int(bool(p.get("entwurf") and zurueck))
        ledger_zeile(f"{pid}\t{jetzt:.0f}\tok\tdeny:{','.join(deny)}\tzurueck:{','.join(zurueck)}{q}")
        if stat["geprüft"] % 500 == 0:
            print(f"  … {stat['geprüft']} geprüft · ausverkauft {stat['varianten-ausverkauft']} · wieder da {stat['varianten-wieder-da']}", flush=True)
    pool.shutdown(wait=False, cancel_futures=True)
    with open(BERICHT if not DRY else "/tmp/cj_lager_dry.md", "w", encoding="utf-8") as f:
        f.write(f"# CJ-Lagerabgleich ({datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC, {'DRY' if DRY else 'SCHARF'})\n\n"
                "Werkzeug `automation/cj_lager_abgleich.py` — Regel im Kopf. Bestand 0 → Variante «ausverkauft» (DENY), "
                "Bestand zurück → wieder kaufbar. Nichts gelöscht, nichts gedraftet. pid-Ware (CJ-<pid>) seit 14.10. über die "
                "Zusatzkonten, Entwürfe mit eigener Sperre werden mitgeprüft (nur Freigabe).\n\n"
                f"CJ-Ware aktiv: {len(P)} · pid-Ware: {len(PIDS)} · in diesem Lauf: {len(a)} SKU + {len(b)} pid\n\n| Zustand | Anzahl |\n|---|---:|\n" +
                "".join(f"| {k} | {v} |\n" for k, v in sorted(stat.items())) + "\n## Beispiele\n\n" + "".join(f"- {b_}\n" for b_ in bsp))
    print(f"CJ-LAGER: {dict(stat)}", flush=True)
    return 0


def selbsttest():
    sv = [{"id": "a", "sku": "CJ-CJDS233779601AZ", "kaufbar": True},
          {"id": "b", "sku": "CJ-CJDS233779602BY", "kaufbar": True},
          {"id": "c", "sku": "CJ-CJDS233779603CX", "kaufbar": False},
          {"id": "d", "sku": "CJ-CJDS233779604DW", "kaufbar": False},
          {"id": "e", "sku": "CJ-CJDS233779605EV", "kaufbar": True}]
    cv = [{"variantSku": "CJDS233779601AZ", "inventories": [{"totalInventory": 0}, {"totalInventory": 0}]},
          {"variantSku": "CJDS233779602BY", "inventories": [{"totalInventory": 0}, {"totalInventory": 12}]},
          {"variantSku": "CJDS233779603CX", "inventories": [{"totalInventory": 5}]},
          {"variantSku": "CJDS233779604DW", "inventories": [{"totalInventory": 9}]}]
    d, z, u = entscheiden(sv, cv, {"c"})
    t = [
        (produkt_sku("CJ-CJDS233779601AZ") == "CJDS2337796", "productSku aus Varianten-SKU"),
        (produkt_sku("CJ-CJYD286336001AZ") == "CJYD2863360", "CJYD-Form"),
        (produkt_sku("fortura-12345") is None, "Nicht-CJ = nichts"),
        (produkt_sku("CJYD291508502BY") == "CJYD2915085", "ohne CJ-Präfix"),
        (produkt_sku("CJ-CJJJJTJT22925") == "CJJJJTJT22925", "Produkt-SKU ohne Anhang"),
        (produkt_sku("CJYDQXHB00011-BROWN-39") == "CJYDQXHB00011", "Optionsanhang hinter «-» (20.10.)"),
        (produkt_sku("CJ-CJBJMRJF00040-EU plug") == "CJBJMRJF00040", "Anhang mit Leerzeichen"),
        (produkt_sku("CJXFLPJY00276-3") == "CJXFLPJY00276", "Anhang eine Ziffer"),
        (produkt_sku("CJ-2608071241571604000") is None, "pid-Form hat keine productSku"),
        (neu_pruefbar([{"sku": "CJYDQXHB00011-BROWN-39"}, {"sku": "CJYDQXHB00011-BROWN-40"}]) is True, "alter Befund keine-cj-sku + neuer Stamm → sofort fällig"),
        (neu_pruefbar([{"sku": "fortura-12345"}]) is False and neu_pruefbar([{"sku": ""}]) is False and neu_pruefbar([]) is False,
         "ohne CJ-Stamm bleibt der Befund (keine Endlosschleife)"),
        (entscheiden([{"id": "h1", "sku": "CJYDQXHB00011-BROWN-39", "kaufbar": True}, {"id": "h2", "sku": "CJYDQXHB00011-BROWN-40", "kaufbar": True}],
                     [{"variantSku": "CJYDQXHB00011-BROWN-39", "inventories": [{"totalInventory": 0}]},
                      {"variantSku": "CJYDQXHB00011-BROWN-40", "inventories": [{"totalInventory": 7}]}], set())[0] == ["h1"],
         "Hyphen-Variante mit Bestand 0 wird gesperrt, die mit Bestand bleibt"),
        (entscheiden([{"id": "x", "sku": "CJJJJTJT22925", "kaufbar": True}], [{"variantSku": "CJJJJTJT2292501AZ", "inventories": [{"totalInventory": 0}]}], set())[0] == ["x"], "Einzelvariante zugeordnet"),
        (entscheiden([{"id": "y", "sku": "CJYD291508502BY", "kaufbar": True}], [{"variantSku": "CJYD291508502BY", "inventories": [{"totalInventory": 0}]}, {"variantSku": "CJYD291508501AZ", "inventories": [{"totalInventory": 3}]}], set())[0] == ["y"], "Shop-SKU ohne CJ- trifft"),
        (d == ["a"], "Bestand 0 + kaufbar → sperren"),
        ("b" not in d, "Fabrik/ein Lager > 0 → bleibt kaufbar"),
        (z == ["c"], "eigene Sperre + Bestand → freigeben"),
        ("d" not in z, "fremde Sperre bleibt"),
        (u == 1, "fehlt bei CJ → unklar, nichts tun"),
        (bestand({"inventories": None}) is None and bestand({}) is None, "ohne inventories = unbekannt, nie 0"),
        (cj_entfernt("konto3 code 1602002 Product has been removed from shelves"), "CJ 1602002 = aus dem Sortiment"),
        (cj_entfernt("code 1602002 Product has been removed"), "Hauptkonto-Wortlaut"),
        (not cj_entfernt("konto2 code 200 Success"), "Kanarie: Erfolg ist nicht entfernt"),
        (not cj_entfernt("netz"), "Kanarie: Netzfehler bleibt unklar"),
    ]
    # ── 14.10.2026: pid-Ware, unbekannter Bestand, Ledger «geplant»/«q:pid» ──
    inv = lambda n: [{"countryCode": "CN", "totalInventory": n}]
    sv1 = [{"id": "p", "sku": "CJ-2606160740461633600", "kaufbar": True}]
    sv1g = [{"id": "p", "sku": "CJ-2606160740461633600", "kaufbar": False}]
    ein0 = [{"vid": "V1", "variantSku": "CJYD1", "inventories": inv(0)}]
    ein5 = [{"vid": "V1", "variantSku": "CJYD1", "inventories": inv(5)}]
    mehr00 = [{"vid": "V1", "inventories": inv(0)}, {"vid": "V2", "inventories": inv(0)}]
    mehr05 = [{"vid": "V1", "inventories": inv(0)}, {"vid": "V2", "inventories": inv(5)}]
    zu = {"CJ-2606160740461633600": "V2"}
    import tempfile
    tl = tempfile.NamedTemporaryFile("w", delete=False, suffix=".tsv")
    heute = time.time() // 86400 * 86400
    tl.write(f"gid://x/1\t{heute + 10}\tgeplant\tdeny:a1,a2\tq:pid\n"
             f"gid://x/1\t{heute + 11}\tfehler\tTHROTTLED\tq:pid\n"
             f"gid://x/2\t{heute + 12}\tok\tdeny:b1\tzurueck:\tq:pid\n"
             f"gid://x/2\t{heute + 13}\tok\tdeny:\tzurueck:b1\tq:pid\n"
             f"gid://x/3\t{heute - 99999}\tkeine-cj-sku\t\tq:pid\n"
             f"gid://x/4\t{heute + 14}\tok\tdeny:\tzurueck:\n")
    tl.close()
    zl, eg, st, ph = ledger(tl.name, heute)
    os.unlink(tl.name)
    t += [
        (pid_aus_sku("CJ-2606160740461633600") == "2606160740461633600", "pid Zahl"),
        (pid_aus_sku("CJ-5AF5A72D-0897-4AF6-AFF5-D6A33F2D3A01") == "5AF5A72D-0897-4AF6-AFF5-D6A33F2D3A01", "pid UUID"),
        (pid_aus_sku("CJ-CJDS233779601AZ") is None and pid_aus_sku("CJ-SHOWERCADDY-5SET") is None, "Varianten-SKU/Slug ≠ pid"),
        (pid_des_produkts({"v": [{"sku": "CJ-2606160740461633600"}]}) == "2606160740461633600", "Produkt-pid"),
        (pid_des_produkts({"v": [{"sku": "CJ-CJDS233779601AZ"}]}) is None, "SKU-Ware bleibt SKU-Weg"),
        (bestand({"inventories": []}) is None, "leere inventories = unbekannt (nie 0)"),
        (bestand({"inventories": [{"countryCode": "CN"}]}) is None, "ohne totalInventory = unbekannt"),
        (bestand({"inventories": [{"totalInventory": 0}, {"totalInventory": 3}]}) == 3, "Summe über Lager"),
        (entscheiden_pid(sv1, ein0, set(), {})[:2] == (["p"], []), "eine CJ-Variante 0 → sperren"),
        (entscheiden_pid(sv1, ein5, set(), {})[:2] == ([], []), "eine CJ-Variante > 0 → bleibt"),
        (entscheiden_pid(sv1g, ein5, {"p"}, {})[:2] == ([], ["p"]), "eigene Sperre + Bestand → frei"),
        (entscheiden_pid(sv1g, ein5, set(), {})[:2] == ([], []), "fremde Sperre bleibt"),
        (entscheiden_pid(sv1, mehr00, set(), {})[0] == ["p"], "offen: alle 0 → sperren"),
        (entscheiden_pid(sv1, mehr05, set(), {})[:2] == ([], []), "offen: teilweise → kaufbar bleiben"),
        (entscheiden_pid(sv1g, mehr05, {"p"}, {})[1] == ["p"], "offen: eigene Sperre, eine > 0 → frei"),
        (entscheiden_pid(sv1, mehr05, set(), zu)[:2] == ([], []), "Zuordnung V2 (5) → bleibt"),
        (entscheiden_pid(sv1, mehr05, set(), {"CJ-2606160740461633600": "V1"})[0] == ["p"], "Zuordnung V1 (0) → sperren"),
        (entscheiden_pid(sv1, mehr05, set(), {"CJ-2606160740461633600": "V9"})[2:] == (1, "zuordnung-passt-nicht"), "Zuordnung ohne Treffer → unklar"),
        (entscheiden_pid(sv1 * 2, ein0, set(), {})[2:] == (2, "mehrere-shopvarianten"), "mehrere Shop-Varianten → unklar"),
        (entscheiden_pid(sv1, [{"vid": "V1", "inventories": []}], set(), {})[:3] == ([], [], 1), "unbekannter Bestand → nichts"),
        (antwort_passt("2606160740461633600", {"pid": "2606160740461633600"}) and not antwort_passt("1", {"pid": "2"})
         and not antwort_passt("1", {}), "Antwort gehört zur pid"),
        ({"a1", "a2"} <= eg, "«geplant» zählt als eigene Sperre"),
        (st.get("gid://x/1") == "fehler" and zl.get("gid://x/1") == heute + 11, "«geplant» ist keine Prüfung, «fehler» schon"),
        ("b1" not in eg, "zurueck hebt eigene Sperre auf"),
        (ph == 3, "pid-Abfragen heute (ohne geplant, ohne gestern)"),
        (st.get("gid://x/3") == "keine-cj-sku", "Status keine-cj-sku gelesen"),
    ]
    # ── 14.10.2026 (Prüfung wf_77b3cddc): Plan verworfen, verwaiste Pläne, Zuordnung wie Engine, Zähler, Datei je Zeile ──
    tl2 = tempfile.NamedTemporaryFile("w", delete=False, suffix=".tsv")
    tl2.write(f"gid://y/1\t{heute + 1}\tgeplant\tdeny:c1\tq:pid\n"            # Lauf starb nach dem Plan
              f"gid://y/2\t{heute + 2}\tgeplant\tdeny:d1\n"
              f"gid://y/2\t{heute + 3}\tok\tdeny:d1\tzurueck:\n"               # Plan + Ergebnis = nicht verwaist
              f"gid://y/3\t{heute + 4}\tgeplant\tdeny:e1\n"
              f"gid://y/3\t{heute + 5}\tgeplant\tzurueck:e1\tplan-verworfen\n") # nie gesetzt → wieder raus
    tl2.close()
    vp = verwaiste_plaene(tl2.name)
    zl2, eg2, st2, _ = ledger(tl2.name, heute)
    tz = tempfile.NamedTemporaryFile("w", delete=False, suffix=".tsv")
    tz.write("# kopf\nCJ-1\tVA\tx\tbeleg\nCJ-1\tVB\tx\tbeleg\n"); tz.close()
    zu2 = zuordnung_lesen(tz.name)
    zp = tempfile.mktemp(suffix=".json")
    z1 = pid_zaehlen(1, zp); z2 = pid_zaehlen(2, zp); z3 = pid_zaehlen(0, zp)
    lz = tempfile.mktemp(suffix=".tsv")
    if not DRY:
        ledger_zeile("a\t1\tok", lz); ledger_zeile("b\t2\tok\n", lz)
    for f_ in (tl2.name, tz.name, zp, lz):
        try:
            os.unlink(f_)
        except OSError:
            pass
    t += [
        (vp == {"gid://y/1": ["c1"], "gid://y/3": ["e1"]} or vp == {"gid://y/1": ["c1"]}, "verwaister Plan erkannt (nur ohne Ergebnis)"),
        ("gid://y/2" not in vp, "Plan + Ergebnis ist nicht verwaist"),
        ("e1" not in eg2 and "c1" in eg2, "plan-verworfen nimmt die nie gesetzte Sperre aus «eigene»"),
        ("gid://y/3" not in st2, "geplant/plan-verworfen ist keine Prüfung"),
        (zu2 == {"CJ-1": "VA"}, "Zuordnung: erste Zeile gewinnt (wie Engine)"),
        (entscheiden_pid(sv1, ein5, set(), {"CJ-2606160740461633600": "VX"})[3] == "einzeln", "1 CJ-Variante schlägt die Zuordnung (wie Engine)"),
        ((z1, z2, z3) == (1, 3, 3), "pid-Zähler je Tag"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}"); return 0 if ok == len(t) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--probe" in sys.argv:
        import cj_varianten_wache as w
        print(json.dumps(w.cj(f"/api2.0/v1/product/query?productSku={sys.argv[sys.argv.index('--probe') + 1]}"), ensure_ascii=False)[:3000])
        sys.exit(0)
    sys.exit(main())
