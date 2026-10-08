#!/usr/bin/env python3
"""auswahl_nachruesten.py — echte Auswahl für Produkte, die EINE Shop-Variante, aber mehrere CJ-Varianten haben (24.09.2026).

ANLASS: `auswahl_fehlt_messen.py` (dropship/AUSWAHL-FEHLT.md). «Wasserfeste Maniküre» zeigt 14 Designs, verkauft wird
«Default Title» mit der Produkt-SKU `CJ-<pid>`. Die Kundin kann nicht wählen, und der Bestell-Automat rät nicht
(`cj_order_engine.py`: mehrere CJ-Varianten ohne Variantenangabe → «manuell prüfen») — die Bestellung bliebe stehen.
Vorbild ist die Netzstecker-Klasse vom 21.09. (`cj_stecker_eu_varianten.py`): Auswahl statt Rate.

AUTOMATISCH NUR, WAS BELEGT IST (alles andere steht im Bericht als «MANUELL» mit Grund):
  * Das Produkt hat genau die Platzhalter-Option «Title / Default Title» und die SKU `CJ-<pid>` (sonst ist es schon
    umgebaut oder trägt eine echte Option — productOptionsCreate würde ein Kreuzprodukt anlegen).
  * JEDES CJ-Variantenbild hängt am Produkt — seit 08.10.2026 (Grow-Plan, Speicher frei) lädt der scharfe Lauf fehlende
    Bilder aus CJ nach (HTTP-200-Prüfung, FAILED → Medien wieder weg, Produkt bleibt unverändert); bei Farbe/Design
    müssen die Bilder zudem VERSCHIEDEN sein — eine Design-Auswahl mit fünfmal demselben Bild ist keine.
  * Preisspreizung ≤ 2×; der Titel verspricht keine Menge, die CJ als Einzelvarianten führt («36 Farben … Set»,
    «3-teiliges Set», «10 pcs»).
  * Werte aus `auswahl_werte.py` (08.10.2026, Betreiber «ja fix das alles sehr sauber ganze katalog»): bis zu DREI
    Optionen (Farbe × Grösse × …), Stecker-Teil → nur EU-Varianten, Masse/Mengen mit Einheit, Lieferantencodes und
    Zählwerte → «Modell N» wie im Importer. Reste übersetzt ein Sprachmodell — nur mit harter Prüfung (Zahlen bleiben,
    Grundfarben bleiben, kein englisches Restwort), Ledger `dropship/_auswahl_uebersetzt.jsonl`; sonst MANUELL.
  * Raster nicht voll (CJ führt «Blau · M» nicht): productOptionsCreate legt jede Kombination an, die fehlenden werden
    sofort wieder gelöscht (productVariantsBulkDelete); die Ursprungsvariante ist immer die erste Kombination (Werte in
    CJ-Reihenfolge) — am Wegwerf-Entwurf 08.10. getestet: 2×2-Raster, 1 gelöscht, Rücklesen + Rückbau ok.
  * Optionen, die man SEHEN muss (Farbe, Modell, Motiv, Typ …), brauchen je Wert ein anderes Bild.
  * Jede neue SKU passt zum Schema des Bestell-Automaten (Form b, exakte variantSku).
  * Netzstecker (EU/US/UK/AU): keine Auswahl, sondern die EINE EU-SKU — nur wenn die EU-Variante nicht teurer ist.
Preis/EK/Streichpreis wie heute; teurere CJ-Varianten (> 1.15 × günstigste) proportional, auf .90 — nie billiger als heute.

SCHREIBEN (Prüfer-Befunde 24.09., 22 bestätigt): Scheitert irgendetwas NACH productOptionsCreate, wird zurückgebaut
(productOptionsDelete strategy POSITION — am Wegwerf-Entwurf getestet: die ursprüngliche Varianten-ID bleibt, zurück auf
«Default Title») und SKU/Preis/Streichpreis/EK der Ursprungsvariante wiederhergestellt. Gelingt auch das nicht, werden
alle Varianten auf DENY gesetzt (nicht kaufbar) und mit `auswahl-halb-pruefen` markiert. Ein scharfer Lauf bricht beim
ERSTEN Fehler ab (MAX_FEHLER, Std. 1) — ein systematischer Fehler darf nicht 330 Produkte anfassen. Rücklesen je
Variante (SKU, Preis, Bild, EK, Streichpreis, Gewicht), erst dann Ledger + Tag `auswahl-nachgeruestet`.
DRY ist Standard: SCHARF=1 schreibt. NUR_HANDLE=… für einen Fall, CAP=… Versuche je Lauf.
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.environ.get("REPO", "/home/user/aban-news-landing"))
from cj_stecker_pruefen import cj, cj_url                    # noqa: E402
from cj_stecker_eu_varianten import farbe_deutsch            # noqa: E402
from kollektionstexte_nachbessern import gql                 # noqa: E402
from auswahl_fehlt_messen import stamm                       # noqa: E402
from auswahl_werte import (farbe, ausfuehrung, plane_optionen,  # noqa: E402,F401  (farbe/ausfuehrung: alte Aufrufer)
                           uebersetze_ki)

MESSUNG = os.environ.get("MESSUNG", "dropship/_auswahl_fehlt.jsonl")
LEDGER = "dropship/_auswahl_nachgeruestet.txt"
# 08.10.2026 (ganzer Katalog, ~5'000 Kandidaten, stündlich): bekannte MANUELL-Fälle und Schreibfehler werden gemerkt und
# MANUELL_TAGE lang übersprungen — sonst plant jeder Lauf dieselben 1'000 Fälle neu und kommt nie zu neuen; ein Produkt,
# dessen Schreiben scheiterte (zurückgebaut), würde jede Stunde als erstes wieder versucht und den Lauf abbrechen.
MANUELL_LEDGER = "dropship/_auswahl_manuell.tsv"
FEHLER_LEDGER = "dropship/_auswahl_fehler.tsv"
MANUELL_TAGE = int(os.environ.get("MANUELL_TAGE", "7"))
VORUEBERGEHEND = re.compile(r"Cache|nicht erreichbar|ungültig|Lesefehler|Tagesbudget", re.I)
BERICHT = os.environ.get("BERICHT", "dropship/AUSWAHL-NACHRUESTEN.md")
SCHARF = os.environ.get("SCHARF") == "1"
NUR = os.environ.get("NUR_HANDLE")
CAP = int(os.environ.get("CAP", "40"))
MAX_FEHLER = int(os.environ.get("MAX_FEHLER", "1"))
# 08.10.2026: Zeitbudget statt hartem `timeout` — ein SIGTERM mitten in schreibe() hinterliesse ein halb umgebautes Produkt
# (Optionen da, Varianten ohne SKU/Preis), ohne Rückbau. Nach ZEIT_S wird kein NEUES Produkt mehr begonnen.
ZEIT_S = float(os.environ.get("ZEIT_S", "0")) or None
_START = time.time()
BILDER_NACHLADEN = os.environ.get("BILDER_NACHLADEN", "1") == "1"   # 08.10.: Speicher frei seit Grow-Plan
HEUTE = time.strftime("%Y-%m-%d")
CACHE_DATEI = "/tmp/auswahl_cj_cache.json"
try:
    CACHE = json.load(open(CACHE_DATEI))
except Exception:
    CACHE = {}

GR = r"(?:X{0,3}S|M|X{0,3}L)"
MENGE = re.compile(r"\b(\d{1,3})\s*(?:-\s*)?(?:Farben|Designs?|Motive|Stück|Stk\.?|teilig\w*|tlg\.?|pcs?|er[- ]?(?:Set|Pack)|x)(?!\w)"
                   r"|\bSet\s+(?:mit|aus|à)\s+(\d{1,3})\b", re.I)
SKU_ALT = re.compile(r"^CJ-(?:\d{10,}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$")
SKU_BESTELLBAR = re.compile(r"[A-Za-z0-9._ -]{6,40}")        # = cj_order_engine.vid_fuer, Form (b)
STECKER = {"EU", "US", "UK", "AU", "JP", "KR", "CN", "BR", "IN"}
# 08.10.2026: Optionen mit Bildpflicht — wer «Modell 3» oder «Hase · Blau» wählt, muss es SEHEN.
BILD_PFLICHT = {"Farbe", "Modell", "Motiv", "Typ", "Muster", "Ausführung", "Variante", "Stil", "Set"}
KI = os.environ.get("KI", "1") == "1"                       # Reste über auswahl_werte.uebersetze_ki (Ledger, Prüfung)


def preis(v):
    try:
        return float(str(v.get("variantSellPrice") or "0").split("-")[0])
    except ValueError:
        return 0.0


def rund90(x):
    return round(int(x) + 0.90, 2) if x - int(x) <= 0.90 else round(int(x) + 1.90, 2)


def cj_varianten(sku):
    """CJ-Varianten mit 3-Tage-Cache. Gecacht wird NUR eine gültige Antwort (code 200, data-Objekt) — eine Token-/
    Serverstörung sonst drei Tage lang als «CJ führt 0 Varianten» (Prüfer-Befund)."""
    if sku not in CACHE:                          # die Messung läuft parallel und füllt die Datei laufend
        try:
            for k, v in json.load(open(CACHE_DATEI)).items():
                CACHE.setdefault(k, v)
        except Exception:
            pass
    if sku in CACHE and time.time() - CACHE[sku]["t"] < 3 * 86400:
        return CACHE[sku]["d"], None
    if os.environ.get("NUR_CACHE") == "1":
        return None, "nicht im Cache (NUR_CACHE=1)"
    url = cj_url(sku)
    if not url:
        return None, "SKU-Form ohne CJ-Abfrage"
    d = cj(url)                                   # SystemExit bei Tagesbudget (16900500) → PAUSE im Aufrufer
    if d is None:
        return None, "CJ nicht erreichbar"
    if d.get("code") != 200 or not isinstance(d.get("data"), dict):
        return None, f"CJ-Antwort ungültig (code {d.get('code')}: {str(d.get('message'))[:60]})"
    CACHE[sku] = {"t": time.time(), "d": d}
    try:                                          # einmischen + atomar ersetzen (zwei Schreiber, 08.10.2026)
        for k, v in json.load(open(CACHE_DATEI)).items():
            CACHE.setdefault(k, v)
    except Exception:
        pass
    teil = f"{CACHE_DATEI}.{os.getpid()}.teil"
    json.dump(CACHE, open(teil, "w")); os.replace(teil, CACHE_DATEI)
    return d, None


def plane(zeile):
    p = gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id handle title status tags variantsCount{count} '
            'options{id name values} '
            'variants(first:2){nodes{id sku price compareAtPrice inventoryPolicy inventoryItem{tracked unitCost{amount} '
            'measurement{weight{value unit}}}}} media(first:100){nodes{id ... on MediaImage{image{url}}}}}}',
            {"h": zeile["handle"]})["productByIdentifier"]
    if not p or p["status"] != "ACTIVE":
        return None, "nicht mehr aktiv"
    if p["variantsCount"]["count"] != 1:
        return None, "hat inzwischen mehrere Varianten"
    if [(o["name"], o["values"]) for o in p["options"]] != [("Title", ["Default Title"])]:
        return None, f"Produkt trägt schon eine echte Option: {[o['name'] for o in p['options']]}"
    if any(t.lower() in ("selbst-gestalten", "pod", "printful") for t in p["tags"]):
        return None, "Editor/POD — nie anfassen"
    var = p["variants"]["nodes"][0]
    if not SKU_ALT.match(var["sku"] or ""):
        return None, f"SKU ist nicht mehr CJ-<pid> ({var['sku']!r}) — schon umgestellt?"
    d, grund = cj_varianten(var["sku"])
    if grund:
        return None, grund
    vs = d["data"].get("variants") or []
    if len(vs) < 2:
        return None, f"CJ führt {len(vs)} Variante(n)"
    for v in vs:
        s_ = v.get("variantSku") or ""
        if s_ != s_.strip() or not SKU_BESTELLBAR.fullmatch(s_) or re.match(r"^CJ-\d{10,}$", s_, re.I):
            return None, f"CJ-variantSku passt nicht zum Bestell-Automaten: {s_!r}"
    cmin_alle = min(preis(v) for v in vs)
    if cmin_alle <= 0:
        return None, "CJ-Preis fehlt"
    # Netzstecker allein (EU/US/UK/AU): keine Auswahl, sondern die EINE EU-SKU (vor der Bildprüfung).
    keys = [(v.get("variantKey") or "").strip().upper() for v in vs]
    if all(k in STECKER for k in keys):
        eu = [v for v, k in zip(vs, keys) if k == "EU"]
        if len(eu) != 1:
            return None, f"Stecker-Varianten ohne eindeutige EU-Fassung: {keys}"
        if preis(eu[0]) > cmin_alle * 1.15:
            return None, f"EU-Stecker teurer ({preis(eu[0])} vs. {cmin_alle}) — Preis/EK müssten mit → Mensch"
        return {"p": p, "var": var, "optionen": [], "plan": [{"werte": (), "sku": eu[0]["variantSku"]}]}, None
    # 08.10.2026: Mehrdimensional (Farbe × Grösse …), Stecker-Teil gefiltert, Reste per KI mit harter Prüfung.
    op, grund = plane_optionen(vs, p["title"], ki=uebersetze_ki if KI else None)
    if not op:
        return None, grund
    rows = op["zeilen"]
    if not op["optionen"]:                                   # nach dem Stecker-Filter bleibt EINE EU-Variante
        v = rows[0][0]
        if preis(v) > cmin_alle * 1.15:
            return None, f"EU-Variante teurer ({preis(v)} vs. {cmin_alle}) — Preis/EK müssten mit → Mensch"
        return {"p": p, "var": var, "optionen": [], "plan": [{"werte": (), "sku": v["variantSku"]}]}, None
    if len(rows) > 60:
        return None, f"{len(rows)} CJ-Varianten — kein Auswahlmenü mehr"
    raster = 1
    for _, ws in op["optionen"]:
        raster *= len(ws)
    if raster > 100:
        return None, f"Raster {raster} Kombinationen — productOptionsCreate legt jede an"
    m = MENGE.search(p["title"])
    if m:
        n = int(m.group(1) or m.group(2))
        if n >= 2 and (n >= 0.8 * len(rows) or re.search(r"\b(Set|Kit)\b", p["title"], re.I)):
            return None, f"Titel verspricht «{m.group(0)}», CJ führt {len(rows)} Einzelvarianten → Titel prüfen (Mensch)"
    cmin = min(preis(v) for v, _ in rows)
    if cmin <= 0:
        return None, "CJ-Preis fehlt"
    if max(preis(v) for v, _ in rows) > 2 * cmin:
        return None, f"Preisspreizung > 2× ({cmin}–{max(preis(v) for v, _ in rows)})"
    medien = {stamm(n["image"]["url"]): n["id"] for n in p["media"]["nodes"] if n.get("image")}
    # Bildpflicht: jede Option, die man SEHEN muss (Farbe, Modell, Motiv …), braucht je Wert ein eigenes Bild.
    for i, (name, ws) in enumerate(op["optionen"]):
        if name not in BILD_PFLICHT:
            continue
        ohne = [w for v, w in rows if not v.get("variantImage")]
        if ohne:
            return None, f"{name}-Auswahl, aber {len(ohne)} CJ-Varianten ohne eigenes Bild: {[w for w in ohne[:3]]}"
        bild_je_wert = {}
        for v, w in rows:
            bild_je_wert.setdefault(w[i], set()).add(stamm(v["variantImage"]))
        # Jeder Wert muss ein ANDERES Bild zeigen (Bildmenge je Wert verschieden) — fünfmal dasselbe Bild ist keine Wahl.
        if len({frozenset(bs) for bs in bild_je_wert.values()}) < len(ws):
            return None, f"{name}-Auswahl, aber Variantenbilder nicht unterscheidbar"
    fehlt = {}
    for v, _ in rows:
        if v.get("variantImage"):
            k = stamm(v["variantImage"])
            if k not in medien:
                fehlt[k] = v["variantImage"]
    if fehlt and not BILDER_NACHLADEN:
        return None, f"{len(fehlt)} Variantenbilder nicht am Produkt (BILDER_NACHLADEN=0)"
    heute = float(var["price"])
    ek = float(((var.get("inventoryItem") or {}).get("unitCost") or {}).get("amount") or 0) or None
    streich = float(var["compareAtPrice"]) if var.get("compareAtPrice") else None
    plan = []
    for v, w in rows:
        faktor = 1.0 if preis(v) <= cmin * 1.15 else preis(v) / cmin
        vk = heute if faktor == 1.0 else max(heute, rund90(heute * faktor))
        bild = stamm(v["variantImage"]) if v.get("variantImage") else None
        plan.append({"werte": w, "sku": v["variantSku"], "media": medien.get(bild) if bild else None, "bild": bild,
                     "preis": f"{vk:.2f}",
                     "ek": f"{ek * preis(v) / cmin:.2f}" if ek else None,
                     "streich": f"{(rund90(streich * faktor) if faktor != 1.0 else streich):.2f}" if streich and streich > heute else None})
    if len({x["sku"] for x in plan}) != len(plan):
        return None, "CJ-SKUs nicht eindeutig"
    return {"p": p, "var": var, "optionen": op["optionen"], "plan": plan, "nachladen": fehlt, "ki": op["ki"],
            "stecker_gefiltert": op["stecker_gefiltert"]}, None


def tag(pid, t):
    e = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [t]})["tagsAdd"]["userErrors"]
    if e:
        raise RuntimeError(f"Tag {t} nicht gesetzt: {e}")


def rueckbau(pl, grund):
    """Nach einem Fehler hinter productOptionsCreate: Option weg (POSITION → «Default Title», ursprüngliche Varianten-ID
    bleibt), Ursprungswerte zurück, rücklesen. Scheitert das, alle Varianten DENY + Tag — nicht kaufbar statt halb kaufbar."""
    p, var = pl["p"], pl["var"]
    ii = var.get("inventoryItem") or {}
    try:
        cur = gql('query($id:ID!){product(id:$id){options{id name}}}', {"id": p["id"]})["product"]["options"]
        neu = [o["id"] for o in cur if o["name"] in {n for n, _ in pl["optionen"]}]
        if neu:
            r = gql('mutation($p:ID!,$o:[ID!]!){productOptionsDelete(productId:$p,options:$o,strategy:POSITION){userErrors{message}}}',
                    {"p": p["id"], "o": neu})["productOptionsDelete"]
            if r["userErrors"]:
                raise RuntimeError(f"productOptionsDelete: {r['userErrors']}")
        live = gql('query($id:ID!){product(id:$id){options{name values} variants(first:5){nodes{id}}}}', {"id": p["id"]})["product"]
        if [v["id"] for v in live["variants"]["nodes"]] != [var["id"]]:
            raise RuntimeError(f"nach dem Rückbau nicht die Ursprungsvariante: {live['variants']['nodes']}")
        item = {"sku": var["sku"], "tracked": bool(ii.get("tracked"))}
        if (ii.get("unitCost") or {}).get("amount"):
            item["cost"] = ii["unitCost"]["amount"]
        u = {"id": var["id"], "price": var["price"], "compareAtPrice": var.get("compareAtPrice"),
             "inventoryPolicy": var.get("inventoryPolicy") or "CONTINUE", "inventoryItem": item}
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){'
                'productVariants{sku price} userErrors{message}}}', {"p": p["id"], "v": [u]})["productVariantsBulkUpdate"]
        pv = (r.get("productVariants") or [{}])[0]
        if r["userErrors"] or pv.get("sku") != var["sku"] or f"{float(pv.get('price') or 0):.2f}" != f"{float(var['price']):.2f}":
            raise RuntimeError(f"Ursprungswerte nicht bestätigt: {r['userErrors']} {pv}")
        return f"{grund} — ZURÜCKGEBAUT auf den Ursprungszustand (rückgelesen)"
    except Exception as e:
        return sperren(pl, f"{grund} — Rückbau gescheitert ({str(e)[:160]})")


def sperren(pl, grund):
    """Letzte Linie: alle Varianten nicht kaufbar (DENY) + Tag. Lieber kurz ausverkauft als falsche Ware."""
    p = pl["p"]
    try:
        vs = gql('query($id:ID!){product(id:$id){variants(first:100){nodes{id}}}}', {"id": p["id"]})["product"]["variants"]["nodes"]
        gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
            {"p": p["id"], "v": [{"id": v["id"], "inventoryPolicy": "DENY", "inventoryItem": {"tracked": True}} for v in vs]})
        tag(p["id"], "auswahl-halb-pruefen")
        return f"{grund} — Varianten auf DENY gesetzt, Tag auswahl-halb-pruefen"
    except Exception as e:
        return f"{grund} — ⚠️ AUCH DAS SPERREN SCHEITERTE ({str(e)[:120]}) — SOFORT VON HAND PRÜFEN"



def bilder_nachladen(pl):
    """Fehlende CJ-Variantenbilder ans Produkt hängen (vor productOptionsCreate). Jede URL vorher auf HTTP 200 prüfen
    (cj_variantenbild-Lehre: ein FAILED-Medium hängt sonst dauerhaft am Produkt). productCreateMedia gibt die IDs in der
    Reihenfolge der Eingabe zurück; die Zuordnung zur Variante läuft über den Dateistamm. Gibt (ok, grund) zurück."""
    import subprocess
    fehlt = pl.get("nachladen") or {}
    if not fehlt:
        return True, ""
    quellen = []
    for k, url in fehlt.items():
        code = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-L", "--max-time", "30", url],
                              capture_output=True, text=True).stdout.strip()
        if code != "200":
            return False, f"CJ-Variantenbild HTTP {code}: {url[:80]}"
        quellen.append((k, url))
    titel = pl["p"]["title"]
    r = gql('mutation($p:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$p,media:$m){media{id status} mediaUserErrors{message}}}',
            {"p": pl["p"]["id"], "m": [{"originalSource": u, "mediaContentType": "IMAGE", "alt": titel} for _, u in quellen]})
    pcm = r["productCreateMedia"]
    if pcm["mediaUserErrors"] or len(pcm["media"] or []) != len(quellen):
        return False, f"Bild-Upload: {pcm['mediaUserErrors'] or 'Anzahl stimmt nicht'}"
    ids = [m["id"] for m in pcm["media"]]
    for _ in range(20):                          # bis keines mehr PROCESSING/UPLOADED ist oder 40 s
        st = gql('query($i:[ID!]!){nodes(ids:$i){... on MediaImage{id status}}}', {"i": ids})["nodes"]
        if any((n or {}).get("status") == "FAILED" for n in st):
            gql('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds}}', {"p": pl["p"]["id"], "m": ids})
            return False, "Bild-Upload FAILED (Medien wieder entfernt)"
        if all((n or {}).get("status") == "READY" for n in st):
            break
        time.sleep(2)
    neu = {k: i for (k, _), i in zip(quellen, ids)}
    for x in pl["plan"]:
        if not x.get("media"):
            x["media"] = neu.get(x.get("bild"))
    if any(not x.get("media") for x in pl["plan"] if x.get("bild")):
        return False, "Bild-Zuordnung nach Upload unvollständig"
    return True, f"{len(ids)} Bilder nachgeladen"

def schreibe(pl):
    import itertools
    p, plan, optionen, var = pl["p"], pl["plan"], pl["optionen"], pl["var"]
    if not optionen:                          # Stecker: nur die EU-SKU setzen
        x = plan[0]
        r = gql('mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){'
                'productVariants{sku} userErrors{message}}}',
                {"pid": p["id"], "v": [{"id": var["id"], "inventoryItem": {"sku": x["sku"]}}]})["productVariantsBulkUpdate"]
        if r["userErrors"] or not r["productVariants"] or r["productVariants"][0]["sku"] != x["sku"]:
            return f"EU-SKU nicht gesetzt: {r['userErrors']}"
        tag(p["id"], "stecker-eu-sku")
        with open(LEDGER, "a") as fh:
            fh.write(f"{p['id'].split('/')[-1]}\tstecker-eu\t{HEUTE}\t{p['handle']}\n")
        return None
    ok_b, grund_b = bilder_nachladen(pl)                 # 08.10.: fehlende Variantenbilder (vor jeder Optionsänderung)
    if not ok_b:
        return f"Bilder: {grund_b}"
    namen = [n for n, _ in optionen]
    try:
        r = gql('mutation($id:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(productId:$id,options:$o,variantStrategy:CREATE){'
                'userErrors{message code}}}',
                {"id": p["id"], "o": [{"name": n, "values": [{"name": w} for w in ws]} for n, ws in optionen]})["productOptionsCreate"]
    except Exception as e:
        r = {"userErrors": [{"message": f"Ausnahme: {str(e)[:120]}", "code": "AUSNAHME"}]}
    # Nicht idempotent + gql wiederholt bei Zeitüberschreitung: WAS am Produkt steht, entscheidet — nicht die Antwort.
    live = gql('query($id:ID!){product(id:$id){options{name values} variants(first:100){nodes{id selectedOptions{name value}}}}}',
               {"id": p["id"]})["product"]
    opt_live = {o["name"]: o["values"] for o in live["options"]}
    if not any(n in opt_live for n in namen):
        return f"Option nicht angelegt: {r['userErrors']}"      # nichts verändert
    if r["userErrors"] and [opt_live.get(n) for n in namen] != [ws for _, ws in optionen]:
        return rueckbau(pl, f"Option mit Fehler angelegt: {r['userErrors']}")
    try:
        byval = {}
        for nv in live["variants"]["nodes"]:
            sel = {so["name"]: so["value"] for so in nv["selectedOptions"]}
            byval[tuple(sel.get(n) for n in namen)] = nv["id"]
        raster = set(itertools.product(*[ws for _, ws in optionen]))
        soll_t = {x["werte"] for x in plan}
        if set(byval) != raster:
            return rueckbau(pl, f"Varianten passen nicht zum Raster: {sorted(set(byval) ^ raster)[:4]}")
        # 08.10.2026: Kombinationen, die CJ nicht führt (Raster nicht voll), wieder weg — sonst kauft man «Rot · XL», das
        # es nicht gibt. Die Ursprungsvariante ist die erste Kombination und gehört immer zum Plan (Werte in CJ-Reihenfolge).
        weg = [byval[t] for t in raster - soll_t]
        if var["id"] in weg:
            return rueckbau(pl, "Ursprungsvariante läge ausserhalb des Plans")
        if weg:
            rd = gql('mutation($p:ID!,$v:[ID!]!){productVariantsBulkDelete(productId:$p,variantsIds:$v){userErrors{message}}}',
                     {"p": p["id"], "v": weg})["productVariantsBulkDelete"]
            if rd["userErrors"]:
                return rueckbau(pl, f"Überzählige Kombinationen nicht gelöscht: {rd['userErrors']}")
            rest = gql('query($id:ID!){product(id:$id){variantsCount{count}}}', {"id": p["id"]})["product"]["variantsCount"]["count"]
            if rest != len(plan):
                return rueckbau(pl, f"nach dem Löschen {rest} statt {len(plan)} Varianten")
        ii = var.get("inventoryItem") or {}
        w = ((ii.get("measurement") or {}).get("weight") or {})
        upd = []
        for x in plan:
            item = {"sku": x["sku"], "tracked": bool(ii.get("tracked"))}
            if x["ek"]:
                item["cost"] = x["ek"]
            if w.get("value"):
                item["measurement"] = {"weight": {"value": w["value"], "unit": w["unit"]}}
            u = {"id": byval[x["werte"]], "price": x["preis"],
                 "inventoryPolicy": var.get("inventoryPolicy") or "CONTINUE", "inventoryItem": item}
            if x.get("media"):
                u["mediaId"] = x["media"]
            if x["streich"]:
                u["compareAtPrice"] = x["streich"]
            upd.append(u)
        r2 = gql('mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}',
                 {"pid": p["id"], "v": upd})["productVariantsBulkUpdate"]
        if r2["userErrors"]:
            return rueckbau(pl, f"Varianten-Update: {r2['userErrors']}")
        lv = gql('query($id:ID!){product(id:$id){variants(first:100){nodes{sku price compareAtPrice media(first:1){nodes{id}} '
                 'inventoryItem{unitCost{amount} measurement{weight{value}}}}}}}', {"id": p["id"]})["product"]["variants"]["nodes"]

        def geld(a):
            return f"{float(a):.2f}" if a not in (None, "") else None
        soll = {x["sku"]: (x["preis"], x.get("media"), x["ek"], x["streich"]) for x in plan}
        ist = {v["sku"]: (geld(v["price"]), (v["media"]["nodes"] or [{}])[0].get("id") if soll.get(v["sku"], (0, None))[1] else None,
                          geld(((v["inventoryItem"] or {}).get("unitCost") or {}).get("amount")) if soll.get(v["sku"], (0, 0, None, None))[2] else None,
                          geld(v["compareAtPrice"]) if soll.get(v["sku"], (0, 0, None, None))[3] else None) for v in lv}
        if ist != soll:
            abw = [k for k in soll if ist.get(k) != soll[k]][:3]
            return rueckbau(pl, f"Rücklesen weicht ab bei {abw} (soll {[soll[k] for k in abw]}, ist {[ist.get(k) for k in abw]})")
        if w.get("value") and any(not (((v["inventoryItem"] or {}).get("measurement") or {}).get("weight") or {}).get("value") for v in lv):
            return rueckbau(pl, "Varianten ohne Gewicht (Original hat eins) — Versandtarif wäre falsch")
        tag(p["id"], "auswahl-nachgeruestet")
    except Exception as e:
        return rueckbau(pl, f"Ausnahme beim Schreiben: {str(e)[:160]}")
    with open(LEDGER, "a") as fh:
        fh.write(f"{p['id'].split('/')[-1]}\t{'+'.join(f'{n}:{len(ws)}' for n, ws in optionen)}:{len(plan)}"
                 f"{'+ki' if pl.get('ki') else ''}\t{HEUTE}\t{p['handle']}\n")
    return None


def _gemerkt(datei, tage):
    """Handles aus einem «handle\tdatum\tgrund»-Ledger, die jünger als `tage` sind."""
    out = set()
    if not os.path.exists(datei):
        return out
    grenze = time.strftime("%Y-%m-%d", time.gmtime(time.time() - tage * 86400))
    for z in open(datei, encoding="utf-8"):
        t = z.rstrip("\n").split("\t")
        if len(t) >= 2 and t[1] >= grenze:
            out.add(t[0])
    return out


def _merken(datei, handle, grund):
    if not SCHARF:                                # Trockenläufe merken nichts (sonst sperrt ein Test den echten Lauf)
        return
    with open(datei, "a", encoding="utf-8") as fh:
        sauber = re.sub(r"[\t\n]+", " ", str(grund))[:300]
        fh.write(f"{handle}\t{HEUTE}\t{sauber}\n")


def main():
    erledigt = {z.split("\t")[3].strip() for z in open(LEDGER) if z.count("\t") >= 3} if os.path.exists(LEDGER) else set()
    if not NUR:
        erledigt |= _gemerkt(MANUELL_LEDGER, MANUELL_TAGE) | _gemerkt(FEHLER_LEDGER, 30)
    rows = [json.loads(z) for z in open(MESSUNG)] if os.path.exists(MESSUNG) else []
    kand = [r for r in rows if (r.get("cj") or 0) > 1 and r["handle"] not in erledigt and (not NUR or r["handle"] == NUR)]
    # 08.10.2026: jüngste Messungen zuerst — deren CJ-Antwort liegt schon im Cache (auswahl_fehlt_messen schreibt ihn), die alten
    # Nagel-Zeilen vom 24.09. kosten je eine neue CJ-Anfrage. Doppelte Zeilen (Nachmessung) → nur die jüngste.
    kand = list({r["handle"]: r for r in kand}.values())[::-1]
    print(f"{len(kand)} Kandidaten aus {MESSUNG}{' [SCHARF]' if SCHARF else ' [DRY]'}", flush=True)
    ok, manuell, fehler, pause, versuche = [], [], [], "", 0
    for r in kand:
        if versuche >= CAP:
            break
        if ZEIT_S and time.time() - _START > ZEIT_S:
            print(f"Zeitbudget {ZEIT_S:.0f} s erreicht — Rest im nächsten Lauf", flush=True)
            break
        try:
            pl, grund = plane(r)
        except SystemExit as e:                  # CJ-Tagesbudget leer: Bericht trotzdem schreiben, dann aufhören
            pause = str(e); print(pause, flush=True); break
        except Exception as e:                   # Lesefehler bei EINEM Produkt: melden, weiter
            manuell.append((r, f"Lesefehler: {str(e)[:120]}")); continue
        if not pl:
            manuell.append((r, grund)); print(f"  ❔ {r['titel'][:55]} — {grund}", flush=True)
            if not VORUEBERGEHEND.search(grund or ""):
                _merken(MANUELL_LEDGER, r["handle"], grund)
            continue
        versuche += 1
        kopf = " × ".join(f"{n}({len(ws)})" for n, ws in pl["optionen"]) or "EU-SKU"
        zeile = f"{r['titel'][:50]} — {kopf}{' [KI]' if pl.get('ki') else ''}: " + \
            " | ".join(f"{' / '.join(x['werte'])} {x.get('preis', '')}" for x in pl["plan"][:6]) + \
            (f" … (+{len(pl['plan']) - 6})" if len(pl["plan"]) > 6 else "")
        if not SCHARF:
            ok.append(r); print(f"  ▶ {zeile}", flush=True); continue
        try:
            f = schreibe(pl)
        except Exception as e:                   # vor productOptionsCreate (z. B. Stecker-Pfad): nichts halb
            f = f"Ausnahme: {str(e)[:160]}"
        if f:
            fehler.append((r, f)); print(f"  ⛔ {r['titel'][:50]} — {f}", flush=True)
            _merken(FEHLER_LEDGER, r["handle"], f)
            if len(fehler) >= MAX_FEHLER:
                pause = f"Abbruch nach {len(fehler)} Schreibfehler(n) — ein systematischer Fehler darf nicht alle Produkte anfassen"
                print(pause, flush=True); break
        else:
            ok.append(r); print(f"  ✅ {zeile}", flush=True)
    L = [f"# Auswahl nachrüsten — {'scharf' if SCHARF else 'Trockenlauf'} {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC", "",
         f"{'umgebaut' if SCHARF else 'automatisch möglich'}: {len(ok)} · MANUELL: {len(manuell)} · Fehler: {len(fehler)}"
         + (f" · ⚠️ abgebrochen: {pause}" if pause else ""), ""]
    if fehler:
        L += ["## Fehler (zuerst lesen)", ""] + [f"- {r['titel']} (`{r['handle']}`): {g}" for r, g in fehler] + [""]
    L += ["## MANUELL (Grund)", ""] + [f"- {r['titel']} (`{r['handle']}`): {g}" for r, g in manuell]
    open(BERICHT, "w").write("\n".join(L) + "\n")
    wort = "umgebaut" if SCHARF else "möglich"
    if pause:
        print(f"PAUSE {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {pause} — bisher {len(ok)} {wort}, "
              f"{len(manuell)} manuell, {len(fehler)} Fehler → {BERICHT}")
        sys.exit(2)
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {len(ok)} {wort}, "
          f"{len(manuell)} manuell, {len(fehler)} Fehler → {BERICHT}")


if __name__ == "__main__":
    main()
