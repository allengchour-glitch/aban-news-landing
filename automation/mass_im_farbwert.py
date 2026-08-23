#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mass_im_farbwert.py — trennt Ringgrösse, Speicher und Kissenmass aus dem Farbwert.

BEFUND (23.08.2026, gefunden beim Aufräumen der Farbwerte): Bei **222 aktiven Produkten**
ist «Farbe» die EINZIGE Option und trägt zwei Angaben in einem Wert:

    Ring          «Black Gold-5 · Black Gold-6 · … · Silver-9»      → Ringgrösse
    Speicher      «Silver-64GB · Silver-128GB»                      → Speichergrösse
    Kissenbezug   «Amber-30X50cm · Amber-45X45cm · Beige-45x45cm»   → Masse

Die Kundin wählt damit blind: Im Dropdown «Farbe» stehen neun Einträge, von denen sie
nicht ahnen kann, dass sich vier davon nur in der Ringgrösse unterscheiden. Es ist
dieselbe Fehlerklasse wie «Aprikose-2XL» (§1.2 des Katalog-Audits), nur mit einer anderen
Masseinheit — und deshalb hat sie kein Werkzeug erwischt.

DER WEG: Es wird NICHTS gelöscht. Es entsteht eine ZWEITE Option, und jede Variante behält
ihre vollständige Information — nur eben in zwei Feldern statt in einem.

⚠️ DREI WACHEN, jede gegen einen belegten Fehlgriff:
1. **Eine blosse Zahl ist keine Grösse, solange der Rest keine Farbe ist.** Der «Bluetooth
   Grip Ring Handtrainer» führt «001-1 · 001-2 · 001-3» — das ist eine Modellnummer, keine
   Ringgrösse. Bei blossen Zahlen muss der vordere Teil als Farbe erkennbar sein
   (`automation/farben_de.json` oder deutscher Farbname).
2. **ALLE Werte müssen dieselbe Form haben.** Trägt nur ein Teil den Anhang, ist die
   Struktur unklar — dann bleibt das Produkt unberührt.
3. **Kollisionswache:** Ergäben zwei Varianten dasselbe Paar (Farbe, Mass), bleibt das
   GANZE Produkt unberührt. Halb getrennt ist schlimmer als roh.

ENV: DRY=1 · IDS=… · MAX=n · QUELLE=<options-export.jsonl>
Ledger: dropship/_mass_im_farbwert.txt
"""
import json, os, re, subprocess, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
MAX = int(os.environ.get("MAX") or 0)
QUELLE = os.environ.get("QUELLE", "/tmp/opts_frisch.jsonl")
LEDGER = "dropship/_mass_im_farbwert.txt"
FARBFELD = ("farbe", "color", "colour")

_hier = os.path.dirname(os.path.abspath(__file__))
FARBE = {k.lower(): v for k, v in
         json.load(open(os.path.join(_hier, "farben_de.json"), encoding="utf-8")).items()}
# Deutsche Farbwörter, die in der Tabelle als ZIEL stehen (sie stehen dort nicht als Schlüssel).
FARBE_DE = {v.lower() for v in FARBE.values()}

SPEICHER = re.compile(r'^(.*\S)[-–]\s*(\d{1,4}\s?[GT]B)$', re.I)
INHALT = re.compile(r'^(.*\S)[-–]\s*(\d{1,5}\s?(?:ML|L))$', re.I)
MASSE = re.compile(r'^(.*\S)[-–]\s*(\d{1,4}\s?[xX×]\s?\d{1,4}\s?(?:cm|mm)?)$')
ZAHL = re.compile(r'^(.*\S)[-–]\s*(\d{1,2})$')


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors"):
                if "THROTTL" in json.dumps(d["errors"]).upper():
                    time.sleep(4 + i * 3); continue
                print("  GraphQL:", json.dumps(d["errors"])[:160], flush=True)
                return None
        except Exception:
            pass
        time.sleep(2 + i)
    return None


Q = ('query($id:ID!){ product(id:$id){ id title status '
     'options{ id name optionValues{ name } } '
     'variants(first:250){ nodes{ id selectedOptions{ name value } } } } }')


def istFarbe(w):
    t = w.strip().lower()
    return t in FARBE or t in FARBE_DE


def zerlegen(werte):
    """(Optionsname, {Wert: (Farbe, Mass)}) oder (None, Grund)."""
    for muster, name, braucht_farbe in ((SPEICHER, "Speicher", False),
                                        (INHALT, "Inhalt", False),
                                        (MASSE, "Grösse", False),
                                        (ZAHL, "Grösse", True)):
        teile = {}
        for w in werte:
            m = muster.match(w.strip())
            if not m:
                teile = None
                break
            teile[w] = (m.group(1).strip(), m.group(2).strip().replace(" ", ""))
        if teile is None:
            continue
        if braucht_farbe and not all(istFarbe(f) for f, _ in teile.values()):
            # Wache 1: «001-1» ist eine Modellnummer, keine Ringgrösse.
            return None, "blosse Zahl, aber vorderer Teil ist keine Farbe"
        if len({m for _, m in teile.values()}) < 2:
            return None, "nur ein Mass — nichts zu trennen"
        return name, teile
    return None, "nicht alle Werte tragen denselben Anhang"


def main():
    if os.environ.get("IDS"):
        liste = [i.strip() for i in os.environ["IDS"].split(",") if i.strip()]
    elif os.path.exists(QUELLE):
        liste = []
        for zeile in open(QUELLE, encoding="utf-8"):
            try:
                p = json.loads(zeile)
            except Exception:
                continue
            if not str(p.get("id", "")).startswith("gid://shopify/Product/"):
                continue
            if p.get("status") not in (None, "ACTIVE"):
                continue
            opts = p.get("options") or []
            if len(opts) != 1:
                continue                       # zweite Option da → anderes Thema
            if (opts[0].get("name") or "").strip().lower() not in FARBFELD:
                continue
            werte = [(v.get("name") if isinstance(v, dict) else v) or ""
                     for v in (opts[0].get("optionValues") or opts[0].get("values") or [])]
            if len(werte) > 1 and zerlegen(werte)[0]:
                liste.append(p["id"].split("/")[-1])
    else:
        print(f"PAUSE ({QUELLE} fehlt — frischen Options-Export bauen)")
        return

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [i for i in liste if i not in erledigt]
    if MAX:
        offen = offen[:MAX]
    print(f"{len(liste)} Kandidaten · {len(offen)} offen" + (" · DRY" if DRY else ""),
          flush=True)

    ok = uebersprungen = 0
    for pid in offen:
        d = gql(Q, {"id": f"gid://shopify/Product/{pid}"})
        if d is None:
            print("PAUSE (Shopify antwortet nicht)"); return
        p = (d.get("data") or {}).get("product")
        if not p or p["status"] != "ACTIVE" or len(p["options"]) != 1:
            continue
        fopt = p["options"][0]
        if (fopt["name"] or "").strip().lower() not in FARBFELD:
            continue
        name, teile = zerlegen([v["name"] for v in fopt["optionValues"]])
        if not name:
            uebersprungen += 1
            print(f"  ⛔ {p['title'][:50]:50} — {teile}", flush=True)
            continue
        vs = p["variants"]["nodes"]
        paare, doppelt = set(), None
        for v in vs:
            alt = next((s["value"] for s in v["selectedOptions"]
                        if s["name"] == fopt["name"]), None)
            if alt not in teile:
                doppelt = f"Variante «{alt}» passt nicht ins Muster"; break
            if teile[alt] in paare:
                doppelt = f"{teile[alt][0]} / {teile[alt][1]} doppelt"; break
            paare.add(teile[alt])
        if doppelt:
            uebersprungen += 1
            print(f"  ⛔ {p['title'][:50]:50} — {doppelt}", flush=True)
            if not DRY:
                with open(LEDGER, "a") as f:
                    f.write(f"{pid}\tuebersprungen:{doppelt}\t{p['title'][:60]}\n")
            continue

        farben = sorted({f for f, _ in teile.values()})
        masse = sorted({m for _, m in teile.values()})
        print(f"  ✅ {p['title'][:50]:50} → Farbe {len(farben)} × {name} {len(masse)} "
              f"({', '.join(masse[:4])})", flush=True)
        if DRY:
            ok += 1; continue

        # Zweite Option anlegen. ⚠️ NICHT `CREATE` — das legt das KARTESISCHE PRODUKT an
        # (21 Farben × 4 Masse = 84 Varianten, wo 21 echte existieren) und erfindet damit
        # Ware, die es beim Lieferanten nicht gibt. `LEAVE_AS_IS` laesst die bestehenden
        # Varianten unberuehrt; die richtige Zuordnung macht der Variantenlauf danach.
        r = gql('mutation($p:ID!,$o:[OptionCreateInput!]!){'
                'productOptionsCreate(productId:$p,options:$o,variantStrategy:LEAVE_AS_IS)'
                '{userErrors{message}}}',
                {"p": p["id"], "o": [{"name": name,
                                      "values": [{"name": m} for m in masse]}]})
        fe = (((r or {}).get("data") or {}).get("productOptionsCreate") or {}).get("userErrors")
        if r is None or fe is None or fe:
            print(f"       ⚠️ Option nicht angelegt: "
                  f"{json.dumps(fe)[:110] if fe else 'keine Antwort'}")
            uebersprungen += 1; time.sleep(1); continue

        eingaben = []
        for v in vs:
            alt = next((s["value"] for s in v["selectedOptions"]
                        if s["name"] == fopt["name"]), None)
            farbe, mass = teile[alt]
            eingaben.append({"id": v["id"],
                             "optionValues": [{"optionName": fopt["name"], "name": farbe},
                                              {"optionName": name, "name": mass}]})
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){'
                'productVariantsBulkUpdate(productId:$p,variants:$v)'
                '{userErrors{field message}}}', {"p": p["id"], "v": eingaben})
        fe = (((r or {}).get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if r is None or fe is None or fe:
            print(f"       ⚠️ Varianten nicht umgehaengt: "
                  f"{json.dumps(fe)[:140] if fe else 'keine Antwort'}")
            uebersprungen += 1; time.sleep(1); continue
        ok += 1
        with open(LEDGER, "a") as f:
            f.write(f"{pid}\tgetrennt:{name}:{len(masse)}\t{p['title'][:60]}\n")
        time.sleep(0.8)

    print(f"\n{ok} Produkte getrennt · {uebersprungen} uebersprungen")
    print("FERTIG")


if __name__ == "__main__":
    main()
