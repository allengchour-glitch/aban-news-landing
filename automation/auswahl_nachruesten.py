#!/usr/bin/env python3
"""auswahl_nachruesten.py — echte Auswahl für Produkte, die EINE Shop-Variante, aber mehrere CJ-Varianten haben (24.09.2026).

ANLASS: `auswahl_fehlt_messen.py` (dropship/AUSWAHL-FEHLT.md). «Wasserfeste Maniküre» zeigt 14 Designs, verkauft wird
«Default Title» mit der Produkt-SKU `CJ-<pid>`. Die Kundin kann nicht wählen, und der Bestell-Automat rät nicht
(`cj_order_engine.py`: mehrere CJ-Varianten ohne Variantenangabe → «manuell prüfen») — die Bestellung bliebe stehen.
Vorbild ist die Netzstecker-Klasse vom 21.09. (`cj_stecker_eu_varianten.py`): Auswahl statt Rate.

AUTOMATISCH NUR, WAS BELEGT IST (alles andere steht im Bericht als «MANUELL» mit Grund):
  * JEDES CJ-Variantenbild hängt schon als Medium am Produkt (gleicher Dateistamm) — der Dateispeicher ist bis zum
    Grow-Plan voll, neue Bilder gingen nicht, und eine Design-Auswahl ohne Bild ist keine Auswahl.
  * Preisspreizung ≤ 2× (sonst sind es verschiedene Produkte/Bündel, Lehre 21.09.).
  * Der Titel verspricht keine Menge, die CJ als EINZELVARIANTEN führt: «36 Farben … Set» bei 36 CJ-Varianten zu je
    USD 2.60 heisst, das Listing verkauft EINE Farbe — dieser Titel muss ein Mensch ändern, nicht diese Maschine.
  * Werte: reine Farbworte → deutsch (Option «Farbe»); kurze Codes («NJ001») → Option «Design»; alles andere → MANUELL
    (englische Lieferantentexte kommen nicht in den Shop).
  * Höchstens 60 Werte (Shopify erlaubt 100; darüber ist es kein Auswahlmenü mehr).
Preis wie heute; teurere CJ-Varianten (> 1.15 × günstigste) proportional, auf .90 — nie billiger als heute.
Lager wie die bestehende Variante (tracked false, CONTINUE); `cj_varianten_wache.py` prüft Mehrvarianten täglich.
Nach dem Schreiben wird zurückgelesen (SKU, Preis, Bild je Variante), erst dann quittiert (Ledger + Tag
`auswahl-nachgeruestet`). DRY ist Standard: SCHARF=1 schreibt. NUR_HANDLE=… für einen Fall, CAP=… je Lauf.
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
HEUTE = time.strftime("%Y-%m-%d")
CACHE_DATEI = "/tmp/auswahl_cj_cache.json"
try:
    CACHE = json.load(open(CACHE_DATEI))
except Exception:
    CACHE = {}
CODE = re.compile(r"^[A-Za-z]{0,5}[ -]?\d{1,4}[A-Za-z]?$")
MENGE = re.compile(r"\b(\d{1,3})\s*(?:-\s*)?(?:Farben|Designs?|Motive|Stück|Stk|teilig|tlg|er[- ]?Set)\b", re.I)


def preis(v):
    try:
        return float(str(v.get("variantSellPrice") or "0").split("-")[0])
    except ValueError:
        return 0.0


def rund90(x):
    return round(int(x) + 0.90, 2) if x - int(x) <= 0.90 else round(int(x) + 1.90, 2)


# 24.09.2026 (Betreiber «fix und verbessere writer»): 68 von 169 Trockenlauf-Fällen scheiterten an Mischwerten wie
# «Square M», «Short Ellipse XS», «gold frosted surface M» — Form + Länge + Farbe + Oberfläche + Grösse in EINEM Wert.
# Übersetzt wird nur mit diesem festen Wortschatz; ein einziges unbekanntes Token (Designnamen wie «Lost Paradise»,
# unklare Kürzel wie «T» oder «Ladder») → MANUELL. Raten ist hier die #1018-Klasse in Grün.
FORM = {"short": "Kurz", "long": "Lang", "square": "Eckig", "almond": "Mandel", "oval": "Oval", "ellipse": "Oval",
        "prolate": "Länglich", "round": "Rund", "coffin": "Ballerina", "ballerina": "Ballerina", "stiletto": "Stiletto"}
OBERFL = {"frosted": "matt", "matte": "matt", "matt": "matt", "glossy": "glänzend", "shiny": "glänzend", "transparent": "transparent"}
FUELL_W = {"surface", "size", "and", "&"}
GROESSENWORT = {"small", "medium", "large"}          # redundant neben XS/S/M/L — fällt dann weg


def ausfuehrung(wert):
    """«Short Ellipse XS» → «Kurz Oval · XS»; None, sobald ein Token nicht im Wortschatz steht."""
    toks = [t for t in re.split(r"[\s_\-]+", (wert or "").strip()) if t]
    tl = [t.lower() for t in toks]
    groesse = [t.upper() for t in toks if re.fullmatch(r"(?:X{0,3}S|M|X{0,3}L)", t.upper())]
    if len(groesse) > 1:
        return None
    teile, i = [], 0
    while i < len(tl):
        t = tl[i]
        if re.fullmatch(r"(?:X{0,3}S|M|X{0,3}L)", t.upper()):
            i += 1; continue
        if t == "extra" and i + 1 < len(tl) and tl[i + 1] == "long":
            teile.append("Extralang"); i += 2; continue
        if t == "extra" and i + 1 < len(tl) and tl[i + 1] in GROESSENWORT and groesse:
            i += 2; continue
        if t in GROESSENWORT and groesse:
            i += 1; continue
        if t in FUELL_W:
            i += 1; continue
        if re.fullmatch(r"\d{1,3}mm", t):
            teile.append(t); i += 1; continue
        if t in FORM:
            teile.append(FORM[t]); i += 1; continue
        if t in OBERFL:
            teile.append(OBERFL[t]); i += 1; continue
        f = farbe_deutsch(toks[i])
        if f:
            teile.append(f); i += 1; continue
        return None
    if not teile and not groesse:
        return None
    return " ".join(teile) + (f" · {groesse[0]}" if groesse else "") if teile else groesse[0]


def werte(keys):
    """Gemeinsame Vorder-/Hintertokens weg, Rest übersetzen. → (optname, [wert…]) oder (None, grund)."""
    toks = [re.split(r"[\s_]+|(?<=[a-z])-(?=[A-Z])|-(?=[A-Z]{1,5}\d)", (k or "").strip()) for k in keys]
    toks = [[t for t in ts if t] for ts in toks]
    vorn = 0
    while all(len(ts) > vorn + 1 for ts in toks) and len({ts[vorn].lower() for ts in toks}) == 1:
        vorn += 1
    hinten = 0
    while all(len(ts) > vorn + hinten + 1 for ts in toks) and len({ts[-1 - hinten].lower() for ts in toks}) == 1:
        hinten += 1
    rest = [" ".join(ts[vorn:len(ts) - hinten]).strip(" -") for ts in toks]
    if len(set(r.lower() for r in rest)) != len(rest) or not all(rest):
        return None, f"Werte nach dem Kürzen nicht eindeutig: {rest[:5]}"
    de = [farbe_deutsch(r) for r in rest]
    if all(de) and len(set(de)) == len(de):
        return "Farbe", de
    # Reine Konfektionsgrössen (Nagel-Tips XS–L): Option «Grösse», Reihenfolge wie bei CJ.
    if all(re.fullmatch(r"(?:X{0,3}S|M|X{0,3}L)", r.upper()) for r in rest):
        return "Grösse", [r.upper() for r in rest]
    if all(CODE.match(r) for r in rest):
        return "Design", [r.upper().replace(" ", "") for r in rest]
    au = [ausfuehrung(r) for r in rest]
    if all(au) and len(set(au)) == len(au):
        if all(re.fullmatch(r"(?:X{0,3}S|M|X{0,3}L)", x) for x in au):
            return "Grösse", au                  # «Extra Small XS … Large L» sind nur Grössen
        return "Ausführung", au
    return None, f"keine reinen Farb-/Codewerte: {rest[:5]}"


def plane(zeile):
    p = gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id handle title status variantsCount{count} '
            'variants(first:2){nodes{id sku price compareAtPrice inventoryPolicy inventoryItem{tracked unitCost{amount} measurement{weight{value unit}}}}} media(first:100){nodes{id ... on MediaImage{image{url}}}}}}',
            {"h": zeile["handle"]})["productByIdentifier"]
    if not p or p["status"] != "ACTIVE":
        return None, "nicht mehr aktiv"
    if p["variantsCount"]["count"] != 1:
        return None, "hat inzwischen mehrere Varianten"
    var = p["variants"]["nodes"][0]
    # CJ-Antworten zwischenspeichern (3 Tage): Trockenlauf und scharfer Lauf fragen sonst jede pid zweimal — am 24.09.
    # frass das zusammen mit Messung und Bewertungs-Nachholer das CJ-Tagesbudget (16900500) nach 169 von 329.
    ck = var["sku"]
    if ck in CACHE and time.time() - CACHE[ck]["t"] < 3 * 86400:
        d = CACHE[ck]["d"]
    else:
        d = cj(cj_url(var["sku"]))
        if d is None:
            raise SystemExit("PAUSE: CJ antwortet nicht")
        CACHE[ck] = {"t": time.time(), "d": d}
        json.dump(CACHE, open(CACHE_DATEI, "w"))
    vs = (d.get("data") or {}).get("variants") or [] if isinstance(d.get("data"), dict) else []
    if len(vs) < 2:
        return None, f"CJ führt {len(vs)} Variante(n)"
    if len(vs) > 60:
        return None, f"{len(vs)} CJ-Varianten — kein Auswahlmenü mehr"
    m = MENGE.search(p["title"])
    if m and int(m.group(1)) >= 0.8 * len(vs):
        return None, f"Titel verspricht «{m.group(0)}», CJ führt {len(vs)} Einzelvarianten → Titel prüfen (Mensch)"
    # Netzstecker-Varianten (vor Bild- und Preisprüfung: ein Stecker braucht kein eigenes Bild) (EU/US/UK/AU): in der Schweiz nur EU — keine Auswahl, sondern die EINE richtige SKU
    # (Regel wie cj_stecker_eu_setzen.py, 21.09.). Genau eine EU-Variante, sonst MANUELL.
    keys = [(v.get("variantKey") or "").strip().upper() for v in vs]
    if all(k in {"EU", "US", "UK", "AU", "JP", "KR", "CN", "BR", "IN"} for k in keys):
        eu = [v for v, k in zip(vs, keys) if k == "EU"]
        if len(eu) != 1:
            return None, f"Stecker-Varianten ohne eindeutige EU-Fassung: {keys}"
        return {"p": p, "var": var, "optname": None, "plan": [{"wert": "EU", "sku": eu[0]["variantSku"],
                "media": None, "preis": var["price"]}]}, None
    medien = {stamm(n["image"]["url"]): n["id"] for n in p["media"]["nodes"] if n.get("image")}
    fehlt = [v.get("variantKey") for v in vs if not v.get("variantImage") or stamm(v["variantImage"]) not in medien]
    if fehlt:
        return None, f"{len(fehlt)} von {len(vs)} Variantenbildern nicht am Produkt (Speicher voll): {fehlt[:3]}"
    cmin = min(preis(v) for v in vs)
    if cmin <= 0 or max(preis(v) for v in vs) > 2 * cmin:
        return None, f"Preisspreizung > 2× ({cmin}–{max(preis(v) for v in vs)})"
    optname, ws = werte([v.get("variantKey") for v in vs])
    if not optname:
        return None, ws
    heute = float(var["price"])
    # 24.09.2026: Die neuen Varianten erbten Gewicht und Versandflags, aber NICHT den Einkaufspreis (unitCost) —
    # am Kanarienvogel trug nur NJ001 CHF 7.33, die 13 anderen nichts. Ohne EK sieht verlustbringer.py die Marge nicht.
    # EK und Streichpreis skalieren darum mit demselben Faktor wie der Verkaufspreis (Basis = günstigste CJ-Variante).
    ek = float(((var.get("inventoryItem") or {}).get("unitCost") or {}).get("amount") or 0) or None
    streich = float(var["compareAtPrice"]) if var.get("compareAtPrice") else None
    plan = []
    for w, v in zip(ws, vs):
        faktor = 1.0 if preis(v) <= cmin * 1.15 else preis(v) / cmin
        vk = heute if faktor == 1.0 else max(heute, rund90(heute * faktor))
        plan.append({"wert": w, "sku": v["variantSku"], "media": medien[stamm(v["variantImage"])], "preis": f"{vk:.2f}",
                     "ek": f"{ek * preis(v) / cmin:.2f}" if ek else None,
                     "streich": f"{rund90(streich * faktor) if faktor != 1.0 else streich:.2f}" if streich and streich > heute else None})
    if len({x["sku"] for x in plan}) != len(plan):
        return None, "CJ-SKUs nicht eindeutig"
    return {"p": p, "var": var, "optname": optname, "plan": plan}, None


def halb(p, grund):
    """Option ist angelegt, aber der Rest nicht belegt: markieren statt schweigen. Der Bestell-Automat stoppt bei solchen
    Varianten ohnehin («manuell prüfen»), aber ein Mensch muss es sehen — Tag + Bericht, kein Ledger-Eintrag."""
    try:
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": ["auswahl-halb-pruefen"]})
    except Exception:
        pass
    return grund + " — Tag auswahl-halb-pruefen gesetzt"


def schreibe(pl):
    p, plan, optname = pl["p"], pl["plan"], pl["optname"]
    if optname is None:                       # nur SKU auf die EU-Variante setzen
        x = plan[0]
        r = gql('mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){'
                'productVariants{sku} userErrors{message}}}',
                {"pid": p["id"], "v": [{"id": pl["var"]["id"], "inventoryItem": {"sku": x["sku"]}}]})["productVariantsBulkUpdate"]
        if r["userErrors"] or not r["productVariants"] or r["productVariants"][0]["sku"] != x["sku"]:
            return f"EU-SKU nicht gesetzt: {r['userErrors']}"
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": ["stecker-eu-sku"]})
        with open(LEDGER, "a") as fh:
            fh.write(f"{p['id'].split('/')[-1]}\tstecker-eu\t{HEUTE}\t{p['handle']}\n")
        return None
    r = gql('mutation($id:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(productId:$id,options:$o,variantStrategy:CREATE){'
            'userErrors{message code} product{variants(first:100){nodes{id selectedOptions{name value}}}}}}',
            {"id": p["id"], "o": [{"name": optname, "values": [{"name": x["wert"]} for x in plan]}]})["productOptionsCreate"]
    if r["userErrors"]:
        return f"Option nicht angelegt: {r['userErrors']}"
    byval = {so["value"]: nv["id"] for nv in r["product"]["variants"]["nodes"] for so in nv["selectedOptions"] if so["name"] == optname}
    if set(byval) != {x["wert"] for x in plan}:
        return f"Varianten passen nicht zum Plan: {sorted(byval)[:5]}"
    ii = pl["var"].get("inventoryItem") or {}
    upd = []
    for x in plan:
        item = {"sku": x["sku"], "tracked": bool(ii.get("tracked"))}
        if x["ek"]:
            item["cost"] = x["ek"]
        u = {"id": byval[x["wert"]], "price": x["preis"], "mediaId": x["media"],
             "inventoryPolicy": pl["var"].get("inventoryPolicy") or "CONTINUE", "inventoryItem": item}
        if x["streich"]:
            u["compareAtPrice"] = x["streich"]
        upd.append(u)
    r2 = gql('mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}',
             {"pid": p["id"], "v": upd})["productVariantsBulkUpdate"]
    if r2["userErrors"]:
        return halb(p, f"Varianten-Update: {r2['userErrors']}")
    live = gql('query($id:ID!){product(id:$id){variants(first:100){nodes{sku price compareAtPrice media(first:1){nodes{id}} '
               'inventoryItem{unitCost{amount} measurement{weight{value}}}}}}}', {"id": p["id"]})["product"]["variants"]["nodes"]
    def geld(a):
        return f"{float(a):.2f}" if a not in (None, "") else None
    soll = {x["sku"]: (x["preis"], x["media"], x["ek"], x["streich"]) for x in plan}
    ist = {v["sku"]: (geld(v["price"]), (v["media"]["nodes"] or [{}])[0].get("id"),
                      geld(((v["inventoryItem"] or {}).get("unitCost") or {}).get("amount")) if soll.get(v["sku"], (0, 0, None))[2] else None,
                      geld(v["compareAtPrice"]) if soll.get(v["sku"], (0, 0, 0, None))[3] else None) for v in live}
    if ist != soll:
        abw = [k for k in soll if ist.get(k) != soll[k]][:3]
        return halb(p, f"Rücklesen weicht ab bei {abw} (soll {[soll[k] for k in abw]}, ist {[ist.get(k) for k in abw]})")
    gewicht0 = [v["sku"] for v in live if not (((v["inventoryItem"] or {}).get("measurement") or {}).get("weight") or {}).get("value")]
    if gewicht0 and ((ii.get("measurement") or {}).get("weight") or {}).get("value"):
        return halb(p, f"{len(gewicht0)} Varianten ohne Gewicht (Original hat eins) — Versandtarif wäre falsch")
    gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": ["auswahl-nachgeruestet"]})
    with open(LEDGER, "a") as fh:
        fh.write(f"{p['id'].split('/')[-1]}\t{optname}:{len(plan)}\t{HEUTE}\t{p['handle']}\n")
    return None


def main():
    erledigt = {z.split("\t")[3].strip() for z in open(LEDGER) if z.count("\t") >= 3} if os.path.exists(LEDGER) else set()
    rows = [json.loads(z) for z in open(MESSUNG)] if os.path.exists(MESSUNG) else []
    kand = [r for r in rows if r.get("cj", 0) > 1 and r["handle"] not in erledigt and (not NUR or r["handle"] == NUR)]
    print(f"{len(kand)} Kandidaten aus {MESSUNG}{' [SCHARF]' if SCHARF else ' [DRY]'}", flush=True)
    ok, manuell, fehler, pause = [], [], [], ""
    for r in kand:
        if len(ok) >= CAP:
            break
        try:
            pl, grund = plane(r)
        except SystemExit as e:                  # CJ-Tagesbudget leer: Bericht trotzdem schreiben, dann aufhören
            pause = str(e); print(pause, flush=True); break
        if not pl:
            manuell.append((r, grund)); print(f"  ❔ {r['titel'][:55]} — {grund}", flush=True); continue
        zeile = f"{r['titel'][:50]} — {pl['optname'] or 'EU-SKU'}: " + " · ".join(f"{x['wert']} {x['preis']}" for x in pl["plan"][:6]) + \
                (f" … (+{len(pl['plan']) - 6})" if len(pl["plan"]) > 6 else "")
        if not SCHARF:
            ok.append(r); print(f"  ▶ {zeile}", flush=True); continue
        f = schreibe(pl)
        if f:
            fehler.append((r, f)); print(f"  ⛔ {r['titel'][:50]} — {f}", flush=True)
        else:
            ok.append(r); print(f"  ✅ {zeile}", flush=True)
    L = [f"# Auswahl nachrüsten — {'scharf' if SCHARF else 'Trockenlauf'} {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC", "",
         f"{'umgebaut' if SCHARF else 'automatisch möglich'}: {len(ok)} · MANUELL: {len(manuell)} · Fehler: {len(fehler)}"
         + (f" · ⚠️ abgebrochen: {pause}" if pause else ""), "",
         "## MANUELL (Grund)", ""] + [f"- {r['titel']} (`{r['handle']}`): {g}" for r, g in manuell] + \
        (["", "## Fehler", ""] + [f"- {r['titel']} (`{r['handle']}`): {g}" for r, g in fehler] if fehler else [])
    open(BERICHT, "w").write("\n".join(L) + "\n")
    if pause:
        print(f"PAUSE {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {pause} — bisher {len(ok)} {'umgebaut' if SCHARF else 'möglich'}, "
              f"{len(manuell)} manuell, {len(fehler)} Fehler → {BERICHT}")
        sys.exit(2)
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {len(ok)} {'umgebaut' if SCHARF else 'möglich'}, "
          f"{len(manuell)} manuell, {len(fehler)} Fehler → {BERICHT}")


if __name__ == "__main__":
    main()
