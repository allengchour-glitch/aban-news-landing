#!/usr/bin/env python3
"""Netzstecker-Klasse #76, Schlussstein (21.09.2026, Betreiber «mach alles selber und fix»):
Geraete mit Tag `stecker-unklar` bekommen ihre CJ-EU-Varianten als ECHTE Auswahl (Option
«Farbe» bzw. «Ausfuehrung»), jede Variante mit der EU-SKU von CJ. Niemand muss mehr raten,
welche Farbe die Kundin bekommt — sie waehlt sie; und der Bestell-Automat bestellt die EU-SKU.

Warum nicht «erste EU-Variante nehmen»: cj_stecker_eu_setzen.py hat 32 eindeutige Faelle
gesetzt und 30 als «Farbe unbekannt» liegen lassen — ein Wort, das man nicht belegen kann,
ist keine Entscheidung. Eine Auswahl ist ehrlich und deterministisch.

Regeln (nichts wird geraten):
  * Kandidaten: status:active tag:stecker-unklar, genau EINE Shop-Variante («Default Title»).
  * EU-Varianten bei CJ: variantKey/variantSku traegt das Token EU. 0 → uebersprungen (laut).
    1 → nur SKU setzen (Fall wie eu_setzen). ≥2 → Option + Varianten.
  * Optionsname «Farbe», wenn jeder Wert ein Farbwort enthaelt, sonst «Ausfuehrung».
  * Preis: heutiger Shop-Preis fuer jede Variante, deren CJ-Preis ≤ 1.15 × dem guenstigsten
    EU-Preis liegt; teurere Varianten proportional (× CJ/CJ_min), auf .90 gerundet — nie unter
    dem heutigen Preis, nie still eine schlechtere Spanne.
  * Lager wie die bestehende Variante (tracked false, CONTINUE) — CJ-Ware ohne Bestandsfuehrung.
  * Bilder: keine (Dateispeicher voll bis ~21.10., Betreiber-Entscheid).
  * Nach dem Schreiben werden ALLE Varianten zurueckgelesen: jede erwartete SKU muss am Objekt
    stehen, sonst wird nichts quittiert. Tag stecker-unklar → stecker-eu-varianten.
  * Faktenzeile «Netzstecker: EU-Version» unter dem geteilten Produkttext-Schloss.
  * Ledger dropship/_cj_stecker_eu_varianten.txt (pid → Stand), DRY=1 schreibt NICHTS.
Nutzung: DRY=1 python3 automation/cj_stecker_eu_varianten.py   |   NUR_PID=… fuer einen Fall
"""
import fcntl, json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.environ.get("REPO", "/home/user/aban-news-landing"))
from cj_stecker_pruefen import sgql, cj, cj_url  # noqa: E402

LEDGER = "dropship/_cj_stecker_eu_varianten.txt"
DRY = os.environ.get("DRY") == "1"
NUR_PID = os.environ.get("NUR_PID")
CAP = int(os.environ.get("CAP", "40"))
HEUTE = time.strftime("%Y-%m-%d")
PLUG_TOKEN = re.compile(r"[\s_-]*\b(?:CN|US|UK|AU|EU|JP|KR|BR|IN)(?:\s*PLUG)?\b[\s_-]*", re.I)
# Reine Farbwerte: JEDES Token muss ein Farbwort (oder Fuellwort wie LCD/and) sein — «White 50W strip
# 4A and 6C» ist ein anderes Produkt, «Buy 1 Get 8-Household 150CM Line» ein Buendel (Trockenlauf
# 21.09.: haette CHF 180.90 ergeben), «FSH208 Negative Ion» eine Ausstattung. Solche Werte kommen
# NICHT automatisch in den Shop; sie stehen in MANUELL mit einer ausdruecklichen Entscheidung.
FARBTOKEN = {"black": "Schwarz", "white": "Weiss", "pink": "Rosa", "red": "Rot", "blue": "Blau",
             "green": "Grün", "grey": "Grau", "gray": "Grau", "gold": "Gold", "golden": "Gold",
             "silver": "Silber", "purple": "Violett", "violet": "Violett", "beige": "Beige",
             "champagne": "Champagner", "platinum": "Platin", "rose": "Rosé", "cream": "Creme",
             "creamy": "Creme", "yellow": "Gelb", "orange": "Orange", "brown": "Braun", "navy": "Marine",
             "mint": "Mint", "dark": "Dunkel", "light": "Hell", "classic": "Klassisch", "night": "Nacht",
             "dream": "Traum", "cherry": "Kirsch", "avocado": "Avocado", "rosemary": "Rosmarin",
             "greyish": "Grau", "ab": "AB"}
FUELL = {"lcd", "and", "&", "-", "/"}


def farbe_deutsch(wert):
    """Deutscher Name, wenn ALLE Tokens Farbworte sind — sonst None (kein reiner Farbwert)."""
    toks = re.split(r"[\s/&-]+", wert.strip())
    out = []
    for t in toks:
        tl = t.lower()
        if tl in FUELL or not tl:
            continue
        if tl not in FARBTOKEN:
            return None
        out.append(FARBTOKEN[tl])
    if not out:
        return None
    # «Dunkel Grau» → «Dunkelgrau», «Rosé Gold» → «Roségold», «Grau Rot» → «Grau-Rot»
    d = " ".join(out)
    d = re.sub(r"\b(Dunkel|Hell) (\w+)", lambda m: m.group(1) + m.group(2).lower(), d)
    d = d.replace("Rosé Gold", "Roségold").replace("Champagner Gold", "Champagner-Gold")
    d = re.sub(r"^(\w+) (\w+)$", r"\1-\2", d) if " " in d and not re.search(r"Klassisch|AB", d) else d
    for a, b in (("Klassisch Weiss", "Weiss"), ("Traum-Violett", "Violett"), ("Dunkelnacht-Grün", "Dunkelgrün"),
                 ("Creme-Weiss", "Cremeweiss"), ("Kirsch-Rosa", "Kirschrosa")):
        d = d.replace(a, b)
    return d


# Ausdrueckliche Einzelentscheidungen (gelesen, nicht geraten) — pid → Plan
#   ("draft", grund)                     Produkt wird Entwurf
#   ("sku", cj_sku, preis)              genau eine Variante, SKU gesetzt
#   ("varianten", optname, [(wert_deutsch, cj_sku, preis), …])
MANUELL = {
    "15452708143489": ("draft", "CJ fuehrt nur Buendel («Buy 1 Get 8 …», USD 3.69–44.78, 12x Spreizung) — welches Set der Kunde bekaeme, ist nicht belegbar"),
    "15454915690881": ("sku", "CJJF237427006FU", "24.90"),   # Titel sagt «mit Ionen» → Variante «FSH208 Negative Ion» (USD 9.62), nicht die guenstigere ohne
    "15479417536897": ("varianten", "Ausführung", [("Modell J30", "CJYD244709802BY", "29.90"), ("Rot", "CJYD244709806FU", "29.90")]),
    "15493276631425": ("varianten", "Ausführung", [("1 Akku + Ladegerät", "CJYD217287404DW", "86.90"), ("2 Akkus + Ladegerät", "CJYD217287412LO", "100.90")]),
    "15479417667969": ("varianten", "Ausführung", [("Modell 113", "CJYD244387003CX", "47.90"), ("Modell 116", "CJYD244387007GT", "57.90")]),
    "15493319590273": ("varianten", "Ausführung", [("Ausführung 1", "CJCD106901702BY", "21.90"), ("Ausführung 2", "CJCD106901704DW", "21.90")]),
}


def farbe_key(v):
    k = (v.get("variantKey") or v.get("variantNameEn") or "").strip()
    k = PLUG_TOKEN.sub(" ", k)
    return re.sub(r"\s+", " ", k).strip()


def preis(v):
    try:
        return float(str(v.get("variantSellPrice") or v.get("sellPrice") or "0").split("-")[0])
    except ValueError:
        return 0.0


def ist_eu(v):
    t = (v.get("variantKey") or "") + " " + (v.get("variantSku") or "")
    return re.search(r"\bEU\b", t, re.I) is not None


def rund90(x):
    return round(int(x) + 0.90, 2) if x - int(x) <= 0.90 else round(int(x) + 1.90, 2)


def faktenzeile(html):
    if re.search(r"Netzstecker", html or "", re.I):
        return html
    li = '<li><strong>Netzstecker:</strong> EU-Version</li>'
    m = re.search(r'(<div class="ls-produktdetails">.*?<ul>)(.*?)(</ul>)', html or "", re.S)
    if m:
        return html[:m.end(2)] + li + html[m.end(2):]
    return (html or "") + f'\n<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>{li}</ul></div>'


def kandidaten():
    q = 'status:active tag:stecker-unklar' + (f' id:{NUR_PID}' if NUR_PID else '')
    d = sgql("""query($q:String!){products(first:60,query:$q){nodes{id title tags descriptionHtml
              options{name values} variants(first:5){nodes{id title sku price inventoryPolicy inventoryItem{tracked}}}}}}""",
             {"q": q})
    return d["data"]["products"]["nodes"]


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER) if l.strip()}
    fh = None if DRY else open(LEDGER, "a")
    kand = [p for p in kandidaten() if p["id"].rsplit("/", 1)[1] not in erledigt][:CAP]
    print(f"Start | Kandidaten {len(kand)} | DRY={DRY}")
    ok = uebersprungen = 0
    for p in kand:
        pid = p["id"].rsplit("/", 1)[1]
        vs = p["variants"]["nodes"]
        if len(vs) != 1 or p["options"][0]["name"] != "Title":
            print(f"  ↷ {pid} {p['title'][:50]} — hat schon {len(vs)} Varianten/Optionen, nicht meine Klasse"); uebersprungen += 1; continue
        var = vs[0]; sku = var["sku"] or ""; shop_preis = float(var["price"])
        url = cj_url(sku)
        if not url or "pid=" not in url:
            print(f"  ↷ {pid} {p['title'][:50]} — SKU {sku} ohne pid"); uebersprungen += 1; continue
        c = cj(url.replace("product/query?pid=", "product/variant/query?pid="))
        cvs = (c or {}).get("data") or []
        if str((c or {}).get("code")) != "200" or not cvs:
            print(f"  ↷ {pid} {p['title'][:50]} — CJ {c.get('code') if c else None}: {(c or {}).get('message')}"); uebersprungen += 1; continue
        eu = [v for v in cvs if ist_eu(v) and v.get("variantSku")]
        if not eu:
            print(f"  ↷ {pid} {p['title'][:50]} — keine EU-Variante bei CJ ({len(cvs)} Varianten)"); uebersprungen += 1; continue
        # Plan: MANUELL vor Automatik
        man = MANUELL.get(pid)
        plan = []; optname = "Farbe"; draft_grund = None
        if man and man[0] == "draft":
            draft_grund = man[1]
        elif man and man[0] == "sku":
            plan = [{"wert": "Standard", "sku": man[1], "preis": man[2], "cj": 0}]
        elif man and man[0] == "varianten":
            optname = man[1]; plan = [{"wert": w, "sku": sk, "preis": pr, "cj": 0} for w, sk, pr in man[2]]
            skus_cj = {v["variantSku"] for v in eu}
            fehl = [x["sku"] for x in plan if x["sku"] not in skus_cj]
            if fehl:
                print(f"  ⛔ {pid} MANUELL nennt SKUs, die CJ nicht (mehr) als EU fuehrt: {fehl}"); uebersprungen += 1; continue
        else:
            rein = []
            seen = set()
            for v in eu:
                k = farbe_deutsch(farbe_key(v))
                if not k:
                    continue
                base = k; n = 2
                while k.lower() in seen:
                    k = f"{base} ({n})"; n += 1
                seen.add(k.lower()); rein.append((k, v))
            if not rein:
                print(f"  ❔ {pid} {p['title'][:50]} — keine reinen Farbwerte: {[farbe_key(v) for v in eu][:6]} → Menschenentscheid (MANUELL)"); uebersprungen += 1; continue
            cj_min = min(preis(v) for _, v in rein) or 0.0
            for k, v in rein:
                cp = preis(v)
                if cj_min > 0 and cp > cj_min * 2.0:
                    print(f"     ↷ Wert «{k}» {cp} > 2x guenstigste EU ({cj_min}) — weggelassen"); continue
                pr = shop_preis if cj_min <= 0 or cp <= cj_min * 1.15 else rund90(shop_preis * cp / cj_min)
                plan.append({"wert": k, "sku": v["variantSku"], "preis": f"{pr:.2f}", "cj": cp})
        if draft_grund:
            print(f"  ⛔ {pid} {p['title'][:48]} → ENTWURF: {draft_grund}")
            if not DRY:
                e = sgql("mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}", {"id": p["id"]})["data"]["productUpdate"]["userErrors"]
                if e: print("    ⚠️", e); continue
                sgql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": p["id"], "t": ["stecker-unklar-buendel"]})
                sgql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}", {"id": p["id"], "t": ["stecker-unklar", "hype-jetzt"]})
                fh.write(f"{pid}\tdraft:buendel\t{HEUTE}\t{p['title'][:60]}\t\n"); fh.flush(); ok += 1
            continue
        if not plan:
            print(f"  ❔ {pid} {p['title'][:50]} — kein Wert uebrig"); uebersprungen += 1; continue
        print(f"  ▶ {pid} {p['title'][:48]} CHF {shop_preis:.2f} — {optname}: " +
              " · ".join(f"{x['wert']} [{x['sku']}] {x['preis']}" for x in plan))
        if DRY:
            continue
        gid = p["id"]
        if len(plan) == 1:
            r = sgql("""mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){
                        productVariants{sku} userErrors{message}}}""",
                     {"pid": gid, "v": [{"id": var["id"], "price": plan[0]["preis"], "inventoryItem": {"sku": plan[0]["sku"]}}]})["data"]["productVariantsBulkUpdate"]
            if r["userErrors"] or not r["productVariants"] or r["productVariants"][0]["sku"] != plan[0]["sku"]:
                print("    ⛔ SKU nicht gesetzt:", r["userErrors"]); continue
        else:
            r = sgql("""mutation($id:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(productId:$id,options:$o,variantStrategy:CREATE){
                        userErrors{message code} product{variants(first:50){nodes{id selectedOptions{name value}}}}}}""",
                     {"id": gid, "o": [{"name": optname, "values": [{"name": x["wert"]} for x in plan]}]})["data"]["productOptionsCreate"]
            if r["userErrors"]:
                print("    ⛔ Option nicht angelegt:", r["userErrors"]); continue
            byval = {}
            for nv in r["product"]["variants"]["nodes"]:
                for so in nv["selectedOptions"]:
                    if so["name"] == optname: byval[so["value"]] = nv["id"]
            if set(byval) != {x["wert"] for x in plan}:
                print("    ⛔ Varianten passen nicht zum Plan:", sorted(byval), "— NICHT weiter"); continue
            upd = [{"id": byval[x["wert"]], "price": x["preis"], "inventoryPolicy": "CONTINUE",
                    "inventoryItem": {"sku": x["sku"], "tracked": False}} for x in plan]
            r2 = sgql("""mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){
                         userErrors{message}}}""", {"pid": gid, "v": upd})["data"]["productVariantsBulkUpdate"]
            if r2["userErrors"]:
                print("    ⛔ Varianten-Update:", r2["userErrors"]); continue
        # Ruecklesen am Objekt
        live = sgql("query($id:ID!){product(id:$id){variants(first:50){nodes{sku price selectedOptions{value}}}}}", {"id": gid})["data"]["product"]["variants"]["nodes"]
        soll = {x["sku"]: x["preis"] for x in plan}
        ist = {v["sku"]: v["price"] for v in live}
        if ist != soll:
            print(f"    ⛔ Ruecklesen weicht ab: soll {soll} ist {ist} — NICHT quittiert"); continue
        sgql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": gid, "t": ["stecker-eu-varianten"]})
        sgql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}", {"id": gid, "t": ["stecker-unklar"]})
        with open("/tmp/lock_produkttext.lock", "w") as lk:
            fcntl.flock(lk, fcntl.LOCK_EX)
            h = sgql("query($id:ID!){product(id:$id){descriptionHtml}}", {"id": gid})["data"]["product"]["descriptionHtml"]
            html = faktenzeile(h)
            if html != h:
                e = sgql("mutation($id:ID!,$h:String!){productUpdate(input:{id:$id,descriptionHtml:$h}){userErrors{message}}}",
                         {"id": gid, "h": html})["data"]["productUpdate"]["userErrors"]
                if e: print("    ⚠️ Faktenzeile nicht geschrieben:", e)
        fh.write(f"{pid}\t{optname}:{len(plan)}\t{HEUTE}\t{p['title'][:60]}\t{'|'.join(x['sku'] for x in plan)}\n"); fh.flush()
        print(f"    ✅ {len(plan)} Variante(n) mit EU-SKU, zurueckgelesen")
        ok += 1
    if fh: fh.close()
    print(f"\nFERTIG: {ok} umgebaut, {uebersprungen} uebersprungen, {len(kand)} Kandidaten")


if __name__ == "__main__":
    main()
