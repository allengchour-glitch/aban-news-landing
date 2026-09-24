#!/usr/bin/env python3
"""auswahl_nachruesten.py — echte Auswahl für Produkte, die EINE Shop-Variante, aber mehrere CJ-Varianten haben (24.09.2026).

ANLASS: `auswahl_fehlt_messen.py` (dropship/AUSWAHL-FEHLT.md). «Wasserfeste Maniküre» zeigt 14 Designs, verkauft wird
«Default Title» mit der Produkt-SKU `CJ-<pid>`. Die Kundin kann nicht wählen, und der Bestell-Automat rät nicht
(`cj_order_engine.py`: mehrere CJ-Varianten ohne Variantenangabe → «manuell prüfen») — die Bestellung bliebe stehen.
Vorbild ist die Netzstecker-Klasse vom 21.09. (`cj_stecker_eu_varianten.py`): Auswahl statt Rate.

AUTOMATISCH NUR, WAS BELEGT IST (alles andere steht im Bericht als «MANUELL» mit Grund):
  * Das Produkt hat genau die Platzhalter-Option «Title / Default Title» und die SKU `CJ-<pid>` (sonst ist es schon
    umgebaut oder trägt eine echte Option — productOptionsCreate würde ein Kreuzprodukt anlegen).
  * JEDES CJ-Variantenbild hängt schon als Medium am Produkt (Dateispeicher voll bis zum Grow-Plan); bei Farbe/Design
    müssen die Bilder zudem VERSCHIEDEN sein — eine Design-Auswahl mit fünfmal demselben Bild ist keine.
  * Preisspreizung ≤ 2×; der Titel verspricht keine Menge, die CJ als Einzelvarianten führt («36 Farben … Set»,
    «3-teiliges Set», «10 pcs»).
  * Werte nur aus festem Wortschatz: Farben → «Farbe», XS–XL → «Grösse», Codes («NJ001») → «Design», Form/Länge/
    Oberfläche/Farbe/Grösse gemischt → «Ausführung». Ein unbekanntes Token (Designnamen, «T», «Ladder») → MANUELL.
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

MESSUNG = os.environ.get("MESSUNG", "dropship/_auswahl_fehlt.jsonl")
LEDGER = "dropship/_auswahl_nachgeruestet.txt"
BERICHT = os.environ.get("BERICHT", "dropship/AUSWAHL-NACHRUESTEN.md")
SCHARF = os.environ.get("SCHARF") == "1"
NUR = os.environ.get("NUR_HANDLE")
CAP = int(os.environ.get("CAP", "40"))
MAX_FEHLER = int(os.environ.get("MAX_FEHLER", "1"))
HEUTE = time.strftime("%Y-%m-%d")
CACHE_DATEI = "/tmp/auswahl_cj_cache.json"
try:
    CACHE = json.load(open(CACHE_DATEI))
except Exception:
    CACHE = {}

TOK = re.compile(r"[\s_\-]+")
GR = r"(?:X{0,3}S|M|X{0,3}L)"
CODE = re.compile(r"^[A-Za-z]{0,5}\d{1,4}[A-Za-z]?$")
EINHEIT = re.compile(r"\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|cm|mm|m|pcs?|pack|stk|w|v)$", re.I)
MENGE = re.compile(r"\b(\d{1,3})\s*(?:-\s*)?(?:Farben|Designs?|Motive|Stück|Stk\.?|teilig\w*|tlg\.?|pcs?|er[- ]?(?:Set|Pack)|x)(?!\w)"
                   r"|\bSet\s+(?:mit|aus|à)\s+(\d{1,3})\b", re.I)
SKU_ALT = re.compile(r"^CJ-(?:\d{10,}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$")
SKU_BESTELLBAR = re.compile(r"[A-Za-z0-9._ -]{6,40}")        # = cj_order_engine.vid_fuer, Form (b)
STECKER = {"EU", "US", "UK", "AU", "JP", "KR", "CN", "BR", "IN"}
NUR_MODIFIKATOR = {"dark", "light", "deep", "bright", "pale"}


def preis(v):
    try:
        return float(str(v.get("variantSellPrice") or "0").split("-")[0])
    except ValueError:
        return 0.0


def rund90(x):
    return round(int(x) + 0.90, 2) if x - int(x) <= 0.90 else round(int(x) + 1.90, 2)


def farbe(wert):
    """farbe_deutsch, aber ein reiner Modifikator («Dark», «Light») ist keine Farbe — sonst wird «XS-Dark Green» zu «Dunkel»."""
    toks = [t.lower() for t in TOK.split(wert or "") if t]
    if not toks or all(t in NUR_MODIFIKATOR for t in toks):
        return None
    return farbe_deutsch(wert)


# Wortschatz für Mischwerte. Ein einziges unbekanntes Token → None (MANUELL). Raten wäre die #1018-Klasse in Grün.
FORM = {"short": "Kurz", "long": "Lang", "square": "Eckig", "almond": "Mandel", "oval": "Oval", "ellipse": "Oval",
        "prolate": "Länglich", "round": "Rund", "coffin": "Ballerina", "ballerina": "Ballerina", "stiletto": "Stiletto"}
OBERFL = {"frosted": "matt", "matte": "matt", "matt": "matt", "glossy": "glänzend", "shiny": "glänzend", "transparent": "transparent"}
FUELL_W = {"surface", "size", "and", "&"}
GROESSENWORT = {"small": "S", "medium": "M", "large": "L"}   # nur weg, wenn es den Buchstaben daneben bestätigt


def ausfuehrung(wert):
    """«Short Ellipse XS» → «Kurz Oval · XS»; None, sobald ein Token nicht im Wortschatz steht."""
    toks = [t for t in TOK.split((wert or "").strip()) if t]
    tl = [t.lower() for t in toks]
    groesse = [t.upper() for t in toks if re.fullmatch(GR, t.upper())]
    if len(groesse) > 1:
        return None
    g = groesse[0] if groesse else None
    teile, i = [], 0
    while i < len(tl):
        t = tl[i]
        if re.fullmatch(GR, t.upper()):
            i += 1; continue
        if t == "extra" and i + 1 < len(tl) and tl[i + 1] == "long":
            teile.append("Extralang"); i += 2; continue
        if t == "extra" and i + 1 < len(tl) and tl[i + 1] in ("small", "large") and g in ("XS", "XL"):
            i += 2; continue
        if t in GROESSENWORT:
            if g and GROESSENWORT[t] == g:          # «Medium M» = Grösse, doppelt genannt
                i += 1; continue
            if t == "medium":                        # «M-Medium Ellipse»: hier ist die Länge gemeint
                teile.append("Mittel"); i += 1; continue
            return None
        if t in FUELL_W:
            i += 1; continue
        if re.fullmatch(r"\d{1,3}mm", t):
            teile.append(t); i += 1; continue
        if t in FORM:
            teile.append(FORM[t]); i += 1; continue
        if t in OBERFL:
            teile.append(OBERFL[t]); i += 1; continue
        if t in NUR_MODIFIKATOR and i + 1 < len(tl):   # «Dark Green» → «Dunkelgrün» (Modifikator nur MIT Grundfarbe)
            f = farbe(f"{toks[i]} {toks[i + 1]}")
            if f:
                teile.append(f); i += 2; continue
        f = farbe(toks[i])
        if f:
            teile.append(f); i += 1; continue
        return None
    if not teile:
        return g
    return " ".join(teile) + (f" · {g}" if g else "")


def werte(keys):
    """Gemeinsame Vorder-/Hintertokens weg (gleiche Trennung wie ausfuehrung), Rest übersetzen → (optname, [wert…]) | (None, grund)."""
    toks = [[t for t in TOK.split((k or "").strip()) if t] for k in keys]
    vorn = 0
    while all(len(ts) > vorn + 1 for ts in toks) and len({ts[vorn].lower() for ts in toks}) == 1:
        vorn += 1
    hinten = 0
    while all(len(ts) > vorn + hinten + 1 for ts in toks) and len({ts[-1 - hinten].lower() for ts in toks}) == 1:
        hinten += 1
    rest = [" ".join(ts[vorn:len(ts) - hinten]).strip() for ts in toks]
    if len(set(r.lower() for r in rest)) != len(rest) or not all(rest):
        return None, f"Werte nach dem Kürzen nicht eindeutig: {rest[:5]}"

    def eindeutig(name, out):
        return (name, out) if len(set(out)) == len(out) else (None, f"Werte nach dem Übersetzen doppelt: {out[:5]}")
    de = [farbe(r) for r in rest]
    if all(de):
        return eindeutig("Farbe", de)
    if all(re.fullmatch(GR, r.upper()) for r in rest):
        return eindeutig("Grösse", [r.upper() for r in rest])
    if all(CODE.match(r.replace(" ", "")) and not EINHEIT.search(r) for r in rest):
        return eindeutig("Design", [r.upper().replace(" ", "") for r in rest])
    au = [ausfuehrung(r) for r in rest]
    if all(au):
        if all(re.fullmatch(GR, x) for x in au):
            return eindeutig("Grösse", au)
        return eindeutig("Ausführung", au)
    return None, f"keine reinen Farb-/Codewerte: {rest[:5]}"


def cj_varianten(sku):
    """CJ-Varianten mit 3-Tage-Cache. Gecacht wird NUR eine gültige Antwort (code 200, data-Objekt) — eine Token-/
    Serverstörung sonst drei Tage lang als «CJ führt 0 Varianten» (Prüfer-Befund)."""
    if sku in CACHE and time.time() - CACHE[sku]["t"] < 3 * 86400:
        return CACHE[sku]["d"], None
    url = cj_url(sku)
    if not url:
        return None, "SKU-Form ohne CJ-Abfrage"
    d = cj(url)                                   # SystemExit bei Tagesbudget (16900500) → PAUSE im Aufrufer
    if d is None:
        return None, "CJ nicht erreichbar"
    if d.get("code") != 200 or not isinstance(d.get("data"), dict):
        return None, f"CJ-Antwort ungültig (code {d.get('code')}: {str(d.get('message'))[:60]})"
    CACHE[sku] = {"t": time.time(), "d": d}
    json.dump(CACHE, open(CACHE_DATEI, "w"))
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
    if len(vs) > 60:
        return None, f"{len(vs)} CJ-Varianten — kein Auswahlmenü mehr"
    for v in vs:
        s = v.get("variantSku") or ""
        if s != s.strip() or not SKU_BESTELLBAR.fullmatch(s) or re.match(r"^CJ-\d{10,}$", s, re.I):
            return None, f"CJ-variantSku passt nicht zum Bestell-Automaten: {s!r}"
    cmin = min(preis(v) for v in vs)
    if cmin <= 0:
        return None, "CJ-Preis fehlt"
    # Netzstecker: keine Auswahl, sondern die EINE EU-SKU (vor der Bildprüfung — ein Stecker braucht kein eigenes Bild).
    keys = [(v.get("variantKey") or "").strip().upper() for v in vs]
    if all(k in STECKER for k in keys):
        eu = [v for v, k in zip(vs, keys) if k == "EU"]
        if len(eu) != 1:
            return None, f"Stecker-Varianten ohne eindeutige EU-Fassung: {keys}"
        if preis(eu[0]) > cmin * 1.15:
            return None, f"EU-Stecker teurer ({preis(eu[0])} vs. {cmin}) — Preis/EK müssten mit → Mensch"
        return {"p": p, "var": var, "optname": None, "plan": [{"wert": "EU", "sku": eu[0]["variantSku"]}]}, None
    m = MENGE.search(p["title"])
    if m:
        n = int(m.group(1) or m.group(2))
        if n >= 2 and (n >= 0.8 * len(vs) or re.search(r"\b(Set|Kit)\b", p["title"], re.I)):
            return None, f"Titel verspricht «{m.group(0)}», CJ führt {len(vs)} Einzelvarianten → Titel prüfen (Mensch)"
    medien = {stamm(n["image"]["url"]): n["id"] for n in p["media"]["nodes"] if n.get("image")}
    fehlt = [v.get("variantKey") for v in vs if not v.get("variantImage") or stamm(v["variantImage"]) not in medien]
    if fehlt:
        return None, f"{len(fehlt)} von {len(vs)} Variantenbildern nicht am Produkt (Speicher voll): {fehlt[:3]}"
    if max(preis(v) for v in vs) > 2 * cmin:
        return None, f"Preisspreizung > 2× ({cmin}–{max(preis(v) for v in vs)})"
    optname, ws = werte([v.get("variantKey") for v in vs])
    if not optname:
        return None, ws
    if optname in ("Farbe", "Design") and len({stamm(v["variantImage"]) for v in vs}) != len(vs):
        return None, f"{optname}-Auswahl, aber Variantenbilder nicht unterscheidbar"
    heute = float(var["price"])
    ek = float(((var.get("inventoryItem") or {}).get("unitCost") or {}).get("amount") or 0) or None
    streich = float(var["compareAtPrice"]) if var.get("compareAtPrice") else None
    plan = []
    for w, v in zip(ws, vs):
        faktor = 1.0 if preis(v) <= cmin * 1.15 else preis(v) / cmin
        vk = heute if faktor == 1.0 else max(heute, rund90(heute * faktor))
        plan.append({"wert": w, "sku": v["variantSku"], "media": medien[stamm(v["variantImage"])], "preis": f"{vk:.2f}",
                     "ek": f"{ek * preis(v) / cmin:.2f}" if ek else None,
                     "streich": f"{(rund90(streich * faktor) if faktor != 1.0 else streich):.2f}" if streich and streich > heute else None})
    if len({x["sku"] for x in plan}) != len(plan):
        return None, "CJ-SKUs nicht eindeutig"
    return {"p": p, "var": var, "optname": optname, "plan": plan}, None


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
        neu = [o["id"] for o in cur if o["name"] == pl["optname"]]
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


def schreibe(pl):
    p, plan, optname, var = pl["p"], pl["plan"], pl["optname"], pl["var"]
    if optname is None:                       # Stecker: nur die EU-SKU setzen
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
    werte_soll = [x["wert"] for x in plan]
    try:
        r = gql('mutation($id:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(productId:$id,options:$o,variantStrategy:CREATE){'
                'userErrors{message code}}}',
                {"id": p["id"], "o": [{"name": optname, "values": [{"name": w} for w in werte_soll]}]})["productOptionsCreate"]
    except Exception as e:
        r = {"userErrors": [{"message": f"Ausnahme: {str(e)[:120]}", "code": "AUSNAHME"}]}
    # Nicht idempotent + gql wiederholt bei Zeitüberschreitung: WAS am Produkt steht, entscheidet — nicht die Antwort.
    live = gql('query($id:ID!){product(id:$id){options{name values} variants(first:100){nodes{id selectedOptions{name value}}}}}',
               {"id": p["id"]})["product"]
    opt = [o for o in live["options"] if o["name"] == optname]
    if not opt:
        return f"Option nicht angelegt: {r['userErrors']}"      # nichts verändert
    if r["userErrors"] and opt[0]["values"] != werte_soll:
        return rueckbau(pl, f"Option mit Fehler angelegt: {r['userErrors']}")
    try:
        byval = {so["value"]: nv["id"] for nv in live["variants"]["nodes"] for so in nv["selectedOptions"] if so["name"] == optname}
        if set(byval) != set(werte_soll) or len(live["variants"]["nodes"]) != len(plan):
            return rueckbau(pl, f"Varianten passen nicht zum Plan: {sorted(byval)[:5]}")
        ii = var.get("inventoryItem") or {}
        w = ((ii.get("measurement") or {}).get("weight") or {})
        upd = []
        for x in plan:
            item = {"sku": x["sku"], "tracked": bool(ii.get("tracked"))}
            if x["ek"]:
                item["cost"] = x["ek"]
            if w.get("value"):
                item["measurement"] = {"weight": {"value": w["value"], "unit": w["unit"]}}
            u = {"id": byval[x["wert"]], "price": x["preis"], "mediaId": x["media"],
                 "inventoryPolicy": var.get("inventoryPolicy") or "CONTINUE", "inventoryItem": item}
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
        soll = {x["sku"]: (x["preis"], x["media"], x["ek"], x["streich"]) for x in plan}
        ist = {v["sku"]: (geld(v["price"]), (v["media"]["nodes"] or [{}])[0].get("id"),
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
        fh.write(f"{p['id'].split('/')[-1]}\t{optname}:{len(plan)}\t{HEUTE}\t{p['handle']}\n")
    return None


def main():
    erledigt = {z.split("\t")[3].strip() for z in open(LEDGER) if z.count("\t") >= 3} if os.path.exists(LEDGER) else set()
    rows = [json.loads(z) for z in open(MESSUNG)] if os.path.exists(MESSUNG) else []
    kand = [r for r in rows if r.get("cj", 0) > 1 and r["handle"] not in erledigt and (not NUR or r["handle"] == NUR)]
    print(f"{len(kand)} Kandidaten aus {MESSUNG}{' [SCHARF]' if SCHARF else ' [DRY]'}", flush=True)
    ok, manuell, fehler, pause, versuche = [], [], [], "", 0
    for r in kand:
        if versuche >= CAP:
            break
        try:
            pl, grund = plane(r)
        except SystemExit as e:                  # CJ-Tagesbudget leer: Bericht trotzdem schreiben, dann aufhören
            pause = str(e); print(pause, flush=True); break
        except Exception as e:                   # Lesefehler bei EINEM Produkt: melden, weiter
            manuell.append((r, f"Lesefehler: {str(e)[:120]}")); continue
        if not pl:
            manuell.append((r, grund)); print(f"  ❔ {r['titel'][:55]} — {grund}", flush=True); continue
        versuche += 1
        zeile = f"{r['titel'][:50]} — {pl['optname'] or 'EU-SKU'}: " + " · ".join(f"{x['wert']} {x.get('preis', '')}" for x in pl["plan"][:6]) + \
                (f" … (+{len(pl['plan']) - 6})" if len(pl["plan"]) > 6 else "")
        if not SCHARF:
            ok.append(r); print(f"  ▶ {zeile}", flush=True); continue
        try:
            f = schreibe(pl)
        except Exception as e:                   # vor productOptionsCreate (z. B. Stecker-Pfad): nichts halb
            f = f"Ausnahme: {str(e)[:160]}"
        if f:
            fehler.append((r, f)); print(f"  ⛔ {r['titel'][:50]} — {f}", flush=True)
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
