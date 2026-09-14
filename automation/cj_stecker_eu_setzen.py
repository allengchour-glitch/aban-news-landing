#!/usr/bin/env python3
"""Netzstecker: EU-SKU setzen, wo sie EINDEUTIG ist (Klasse #1018, Task #76 — 14.09.2026).

Der Pruefer `cj_stecker_pruefen.py` meldet Geraete als «unklar-eu-vorhanden»: CJ fuehrt EU-, US-,
UK-, AU-Versionen, unser Shop hat EINE Variante, deren SKU nicht die EU-Version ist. Welche
Version CJ schickt, ist damit nicht belegt — ein Netzgeraet, das in keine Schweizer Steckdose passt.

Dieses Werkzeug entscheidet DETERMINISTISCH, nichts wird geraten:
  1. CJ fuehrt genau EINE EU-Variante                    -> unsere Variante bekommt deren SKU
  2. mehrere EU-Varianten (Farben), unsere SKU ist selbst eine CJ-Variante mit erkennbarer Farbe
     -> die EU-Variante DERSELBEN Farbe (variantKey ohne Stecker-Token), wenn eindeutig
  3. sonst (Farbwahl unbekannt)                          -> Tag `stecker-unklar`, aus der Hype-Reihe,
     bleibt aktiv; Entscheidung Betreiber (STECKER-UNKLAR.md)
Preis-Wache: die EU-Variante darf nicht mehr als 15 % teurer sein als die Variante, auf der unsere
SKU beruht (sonst `eu-teurer`, unklar) — sonst schriebe man still eine hoehere Einstandsspanne.
Nach dem Setzen wird die SKU am Objekt ZURUECKGELESEN und eine Faktenzeile «Netzstecker: EU-Version»
in den Produktdetails-Block geschrieben (unter dem geteilten Produkttext-Schloss).
⚠️ EU-Varianten-SKUs koennen ein LEERZEICHEN tragen («…-EU plug») — der Bestell-Automat kennt das
seit 14.09. (urllib.parse.quote). Wer eine SKU setzt, prueft, ob der Automat sie lesen kann.

Nutzung: DRY=1 python3 automation/cj_stecker_eu_setzen.py   (Standard CAP 60, 10 CJ-Punkte je Produkt)
"""
import fcntl, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_stecker_pruefen import sgql, cj, cj_url, stecker, LEDGER as PRUEF_LEDGER  # noqa: E402

LEDGER = "dropship/_cj_stecker_eu_gesetzt.txt"
CAP = int(os.environ.get("CAP", "60"))
DRY = os.environ.get("DRY") == "1"
HEUTE = time.strftime("%Y-%m-%d")
PLUG_TOKEN = re.compile(r"[\s_-]*\b(?:CN|US|UK|AU|EU|JP|KR|BR|IN)(?:\s*PLUG)?\b[\s_-]*", re.I)


def farbe_key(v):
    """variantKey ohne Stecker-Token — was uebrig bleibt, ist die Farbe/Ausfuehrung."""
    k = (v.get("variantKey") or v.get("variantNameEn") or "").strip()
    k = PLUG_TOKEN.sub(" ", k)
    return re.sub(r"\s+", " ", k).strip().lower()


def preis(v):
    try:
        return float(str(v.get("variantSellPrice") or v.get("sellPrice") or "0").split("-")[0])
    except ValueError:
        return 0.0


def faktenzeile(html):
    if re.search(r"Netzstecker", html or "", re.I):
        return html
    li = '<li><strong>Netzstecker:</strong> EU-Version</li>'
    m = re.search(r'(<div class="ls-produktdetails">.*?<ul>)(.*?)(</ul>)', html or "", re.S)
    if m:
        return html[:m.end(2)] + li + html[m.end(2):]
    return (html or "") + f'\n<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>{li}</ul></div>'


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER) if l.strip()}
    kand = []
    for l in open(PRUEF_LEDGER):
        t = l.rstrip("\n").split("\t")
        if len(t) >= 2 and t[1].startswith("unklar-eu-vorhanden") and t[0] not in erledigt and t[0] not in kand:
            kand.append(t[0])
    print(f"Kandidaten: {len(kand)} · CAP {CAP} · DRY {DRY}")
    fh = None if DRY else open(LEDGER, "a")
    gesetzt = unklar = 0
    for pid in kand[:CAP]:
        gid = f"gid://shopify/Product/{pid}"
        p = sgql("""query($id:ID!){product(id:$id){id title status tags descriptionHtml
                    variantsCount{count} variants(first:2){nodes{id sku price}}}}""", {"id": gid})["data"]["product"]
        if not p or p["status"] != "ACTIVE" or p["variantsCount"]["count"] != 1:
            if fh: fh.write(f"{pid}\tuebersprungen-status\t{HEUTE}\n")
            continue
        var = p["variants"]["nodes"][0]
        sku = var["sku"] or ""
        eigene = re.sub(r"^CJ-", "", sku)
        url = cj_url(sku)
        d = cj(url) if url else None
        time.sleep(1.1)
        if not d or d.get("code") != 200:
            print(f"  · {pid} {p['title'][:50]} — CJ nicht erreicht/{(d or {}).get('code')} (keine Quittung)")
            continue
        vs = (d.get("data") or {}).get("variants") or []
        eu = [v for v in vs if stecker(v) == "EU"]
        meine = next((v for v in vs if (v.get("variantSku") or "") == eigene), None)
        wahl, grund = None, ""
        if len(eu) == 1:
            wahl, grund = eu[0], "einzige-eu-variante"
        elif eu and meine:
            fk = farbe_key(meine)
            gleich = [v for v in eu if farbe_key(v) == fk]
            if len(gleich) == 1:
                wahl, grund = gleich[0], f"eu-gleiche-farbe:{fk[:30]}"
        if wahl is not None:
            basis = preis(meine) if meine else min((preis(v) for v in vs if preis(v) > 0), default=0)
            if basis and preis(wahl) > basis * 1.15:
                wahl, grund = None, f"eu-teurer:{preis(wahl)}>{basis}"
        if wahl is None:
            unklar += 1
            print(f"  ⚠️ {pid} {p['title'][:50]} — bleibt unklar ({grund or f'{len(eu)} EU-Varianten, Farbe unbekannt'}) → Tag stecker-unklar")
            if not DRY:
                sgql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": gid, "t": ["stecker-unklar"]})
                if "hype-jetzt" in (p.get("tags") or []):
                    sgql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}", {"id": gid, "t": ["hype-jetzt"]})
                fh.write(f"{pid}\tunklar:{grund or 'farbe-unbekannt'}\t{HEUTE}\t{p['title'][:60]}\n")
            continue
        neu = wahl.get("variantSku")
        print(f"  ✅ {pid} {p['title'][:50]} — {sku} → {neu} ({grund}, CJ {preis(wahl)})")
        if DRY:
            continue
        r = sgql("""mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){
                    productVariants{sku} userErrors{message}}}""",
                 {"pid": gid, "v": [{"id": var["id"], "inventoryItem": {"sku": neu}}]})["data"]["productVariantsBulkUpdate"]
        if r["userErrors"] or not r["productVariants"] or r["productVariants"][0]["sku"] != neu:
            print("    ⛔ SKU nicht gesetzt:", r["userErrors"]); continue
        # Faktenzeile unter dem geteilten Produkttext-Schloss (zwei Schreiber auf descriptionHtml = Zombie-Klasse 15.08.)
        with open("/tmp/lock_produkttext.lock", "w") as lk:
            fcntl.flock(lk, fcntl.LOCK_EX)
            live = sgql("query($id:ID!){product(id:$id){descriptionHtml}}", {"id": gid})["data"]["product"]["descriptionHtml"]
            html = faktenzeile(live)
            if html != live:
                e = sgql("mutation($id:ID!,$h:String!){productUpdate(input:{id:$id,descriptionHtml:$h}){userErrors{message}}}",
                         {"id": gid, "h": html})["data"]["productUpdate"]["userErrors"]
                if e: print("    ⚠️ Faktenzeile nicht geschrieben:", e)
        fh.write(f"{pid}\teu-sku-gesetzt:{neu}\t{HEUTE}\t{p['title'][:60]}\n"); fh.flush()
        gesetzt += 1
    if fh: fh.close()
    rest = len(kand) - min(len(kand), CAP)
    print(f"\ngesetzt {gesetzt} · unklar {unklar}")
    print("FERTIG: Klasse durchgearbeitet" if rest <= 0 else f"FORTSETZUNG: noch {rest} Kandidaten")


if __name__ == "__main__":
    main()
