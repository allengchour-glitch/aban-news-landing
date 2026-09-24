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
CODE = re.compile(r"^[A-Za-z]{0,5}[ -]?\d{1,4}[A-Za-z]?$")
MENGE = re.compile(r"\b(\d{1,3})\s*(?:-\s*)?(?:Farben|Designs?|Motive|Stück|Stk|teilig|tlg|er[- ]?Set)\b", re.I)


def preis(v):
    try:
        return float(str(v.get("variantSellPrice") or "0").split("-")[0])
    except ValueError:
        return 0.0


def rund90(x):
    return round(int(x) + 0.90, 2) if x - int(x) <= 0.90 else round(int(x) + 1.90, 2)


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
    return None, f"keine reinen Farb-/Codewerte: {rest[:5]}"


def plane(zeile):
    p = gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id handle title status variantsCount{count} '
            'variants(first:2){nodes{id sku price inventoryPolicy}} media(first:100){nodes{id ... on MediaImage{image{url}}}}}}',
            {"h": zeile["handle"]})["productByIdentifier"]
    if not p or p["status"] != "ACTIVE":
        return None, "nicht mehr aktiv"
    if p["variantsCount"]["count"] != 1:
        return None, "hat inzwischen mehrere Varianten"
    var = p["variants"]["nodes"][0]
    d = cj(cj_url(var["sku"]))
    if d is None:
        raise SystemExit("PAUSE: CJ antwortet nicht")
    vs = (d.get("data") or {}).get("variants") or [] if isinstance(d.get("data"), dict) else []
    if len(vs) < 2:
        return None, f"CJ führt {len(vs)} Variante(n)"
    if len(vs) > 60:
        return None, f"{len(vs)} CJ-Varianten — kein Auswahlmenü mehr"
    m = MENGE.search(p["title"])
    if m and int(m.group(1)) >= 0.8 * len(vs):
        return None, f"Titel verspricht «{m.group(0)}», CJ führt {len(vs)} Einzelvarianten → Titel prüfen (Mensch)"
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
    plan = [{"wert": w, "sku": v["variantSku"], "media": medien[stamm(v["variantImage"])],
             "preis": f"{(heute if preis(v) <= cmin * 1.15 else max(heute, rund90(heute * preis(v) / cmin))):.2f}"}
            for w, v in zip(ws, vs)]
    if len({x["sku"] for x in plan}) != len(plan):
        return None, "CJ-SKUs nicht eindeutig"
    return {"p": p, "var": var, "optname": optname, "plan": plan}, None


def schreibe(pl):
    p, plan, optname = pl["p"], pl["plan"], pl["optname"]
    r = gql('mutation($id:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(productId:$id,options:$o,variantStrategy:CREATE){'
            'userErrors{message code} product{variants(first:100){nodes{id selectedOptions{name value}}}}}}',
            {"id": p["id"], "o": [{"name": optname, "values": [{"name": x["wert"]} for x in plan]}]})["productOptionsCreate"]
    if r["userErrors"]:
        return f"Option nicht angelegt: {r['userErrors']}"
    byval = {so["value"]: nv["id"] for nv in r["product"]["variants"]["nodes"] for so in nv["selectedOptions"] if so["name"] == optname}
    if set(byval) != {x["wert"] for x in plan}:
        return f"Varianten passen nicht zum Plan: {sorted(byval)[:5]}"
    upd = [{"id": byval[x["wert"]], "price": x["preis"], "mediaId": x["media"], "inventoryPolicy": "CONTINUE",
            "inventoryItem": {"sku": x["sku"], "tracked": False}} for x in plan]
    r2 = gql('mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}',
             {"pid": p["id"], "v": upd})["productVariantsBulkUpdate"]
    if r2["userErrors"]:
        return f"Varianten-Update: {r2['userErrors']}"
    live = gql('query($id:ID!){product(id:$id){variants(first:100){nodes{sku price media(first:1){nodes{id}}}}}}',
               {"id": p["id"]})["product"]["variants"]["nodes"]
    soll = {x["sku"]: (x["preis"], x["media"]) for x in plan}
    ist = {v["sku"]: (v["price"], (v["media"]["nodes"] or [{}])[0].get("id")) for v in live}
    if ist != soll:
        abw = [k for k in soll if ist.get(k) != soll[k]][:3]
        return f"Rücklesen weicht ab bei {abw} — NICHT quittiert"
    gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": ["auswahl-nachgeruestet"]})
    with open(LEDGER, "a") as fh:
        fh.write(f"{p['id'].split('/')[-1]}\t{optname}:{len(plan)}\t{HEUTE}\t{p['handle']}\n")
    return None


def main():
    erledigt = {z.split("\t")[3].strip() for z in open(LEDGER) if z.count("\t") >= 3} if os.path.exists(LEDGER) else set()
    rows = [json.loads(z) for z in open(MESSUNG)] if os.path.exists(MESSUNG) else []
    kand = [r for r in rows if r.get("cj", 0) > 1 and r["handle"] not in erledigt and (not NUR or r["handle"] == NUR)]
    print(f"{len(kand)} Kandidaten aus {MESSUNG}{' [SCHARF]' if SCHARF else ' [DRY]'}", flush=True)
    ok, manuell, fehler = [], [], []
    for r in kand:
        if len(ok) >= CAP:
            break
        pl, grund = plane(r)
        if not pl:
            manuell.append((r, grund)); print(f"  ❔ {r['titel'][:55]} — {grund}", flush=True); continue
        zeile = f"{r['titel'][:50]} — {pl['optname']}: " + " · ".join(f"{x['wert']} {x['preis']}" for x in pl["plan"][:6]) + \
                (f" … (+{len(pl['plan']) - 6})" if len(pl["plan"]) > 6 else "")
        if not SCHARF:
            ok.append(r); print(f"  ▶ {zeile}", flush=True); continue
        f = schreibe(pl)
        if f:
            fehler.append((r, f)); print(f"  ⛔ {r['titel'][:50]} — {f}", flush=True)
        else:
            ok.append(r); print(f"  ✅ {zeile}", flush=True)
    L = [f"# Auswahl nachrüsten — {'scharf' if SCHARF else 'Trockenlauf'} {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC", "",
         f"{'umgebaut' if SCHARF else 'automatisch möglich'}: {len(ok)} · MANUELL: {len(manuell)} · Fehler: {len(fehler)}", "",
         "## MANUELL (Grund)", ""] + [f"- {r['titel']} (`{r['handle']}`): {g}" for r, g in manuell] + \
        (["", "## Fehler", ""] + [f"- {r['titel']} (`{r['handle']}`): {g}" for r, g in fehler] if fehler else [])
    open(BERICHT, "w").write("\n".join(L) + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {len(ok)} {'umgebaut' if SCHARF else 'möglich'}, "
          f"{len(manuell)} manuell, {len(fehler)} Fehler → {BERICHT}")


if __name__ == "__main__":
    main()
