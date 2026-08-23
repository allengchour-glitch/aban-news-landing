#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""farbwert_dubletten.py — legt «Blue» und «Blau» im selben Auswahlfeld zusammen.

WARUM ES DAS BRAUCHT: `farbwerte_uebersetzen.py` uebersetzt englische Farbwerte ueber
`automation/farben_de.json`. Traegt ein Produkt BEIDE Schreibweisen — «Blau» aus dem
Importer und «Blue» aus einem spaeteren Nachruester —, lehnt Shopify das Umbenennen mit
«Option value already exists» ab. Das ist richtig so: Ein Umbenennen wuerde die beiden
Werte VERSCHMELZEN und damit Varianten zusammenlegen, die verschiedene Lieferanten-SKUs
haben. Der Lauf vom 23.08. meldete diesen Fehler bei mehreren Dutzend Produkten.

Sichtbar wurde es durch die Groessen-Reparatur desselben Tages: Beim «Floralen Etuikleid»
steckten die englischen Werte vorher in «Blue-0XL»; jetzt steht «Blau» neben «Blue» in
derselben Liste, und die Kundin sieht zwei Farben, wo eine ist.

DER WEG IST DERSELBE WIE BEI groesse_im_farbwert.py: nicht umbenennen, sondern die
VARIANTEN an ihr Ziel umhaengen — und vorher pruefen, ob dieses Ziel belegt ist. Belegt
heisst hier: Es gibt bereits eine Variante mit derselben Farbe UND derselben Groesse.
Dann bleibt das GANZE Produkt unberuehrt; halb zusammengelegt ist schlimmer als roh.

⚠️ Zusammengelegt wird NUR, wenn `farben_de.json` beide Werte auf DASSELBE deutsche Wort
abbildet (oder der eine Wert bereits das Ziel des anderen ist). Zwei Farben, die sich nur
aehnlich sehen — «Hellblau» und «Himmelblau» —, bleiben getrennt: das waere geraten.

ENV: DRY=1 · IDS=… · MAX=n · QUELLE=<options-export.jsonl>
Ledger: dropship/_farbwert_dubletten.txt
"""
import json, os, subprocess, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
MAX = int(os.environ.get("MAX") or 0)
QUELLE = os.environ.get("QUELLE", "/tmp/opts_frisch.jsonl")
LEDGER = "dropship/_farbwert_dubletten.txt"
FARBE = {k.lower(): v for k, v in json.load(
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "farben_de.json"),
         encoding="utf-8")).items()}
FARBFELD = ("farbe", "color", "colour", "farben")


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


def paare(werte):
    """Liefert {Quellwert: Zielwert} fuer Werte, die dasselbe Deutsch meinen."""
    ziel = {}
    for w in werte:
        d = FARBE.get(w.strip().lower())
        if d:
            ziel.setdefault(d, []).append(w)
    umzug = {}
    for deutsch, gruppe in ziel.items():
        # Nur zusammenlegen, wenn das deutsche Wort selbst schon als Wert dasteht
        # ODER mehrere Schreibweisen auf dasselbe Wort zeigen.
        vorhanden = [w for w in werte if w.strip() == deutsch]
        if vorhanden:
            for w in gruppe:
                if w.strip() != deutsch:
                    umzug[w] = deutsch
        elif len(gruppe) > 1:
            for w in gruppe[1:]:
                umzug[w] = gruppe[0]
    return umzug


def kandidaten_aus_export():
    ids = []
    for zeile in open(QUELLE, encoding="utf-8"):
        try:
            p = json.loads(zeile)
        except Exception:
            continue
        if not str(p.get("id", "")).startswith("gid://shopify/Product/"):
            continue
        if p.get("status") not in (None, "ACTIVE"):
            continue
        for o in (p.get("options") or []):
            if (o.get("name") or "").strip().lower() not in FARBFELD:
                continue
            werte = [(v.get("name") if isinstance(v, dict) else v) or ""
                     for v in (o.get("optionValues") or o.get("values") or [])]
            if paare(werte):
                ids.append(p["id"].split("/")[-1])
            break
    return ids


def main():
    if os.environ.get("IDS"):
        liste = [i.strip() for i in os.environ["IDS"].split(",") if i.strip()]
    elif os.path.exists(QUELLE):
        liste = kandidaten_aus_export()
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

    ok = uebersprungen = varianten = 0
    for pid in offen:
        d = gql(Q, {"id": f"gid://shopify/Product/{pid}"})
        if d is None:
            print("PAUSE (Shopify antwortet nicht)"); return
        p = (d.get("data") or {}).get("product")
        if not p or p["status"] != "ACTIVE":
            continue
        fopt = next((o for o in p["options"]
                     if (o["name"] or "").strip().lower() in FARBFELD), None)
        if not fopt:
            continue
        umzug = paare([v["name"] for v in fopt["optionValues"]])
        if not umzug:
            continue
        vs = p["variants"]["nodes"]
        belegt = {tuple(sorted((s["name"], s["value"]) for s in v["selectedOptions"]))
                  for v in vs}
        eingaben, konflikt = [], None
        for v in vs:
            sel = {s["name"]: s["value"] for s in v["selectedOptions"]}
            alt = sel.get(fopt["name"], "")
            if alt not in umzug:
                continue
            ziel = dict(sel); ziel[fopt["name"]] = umzug[alt]
            schluessel = tuple(sorted(ziel.items()))
            if schluessel in belegt:
                konflikt = f"{alt} -> {umzug[alt]} kollidiert"
                break
            belegt.add(schluessel)
            eingaben.append({"id": v["id"],
                             "optionValues": [{"optionName": fopt["name"],
                                               "name": umzug[alt]}]})
        if konflikt or not eingaben:
            uebersprungen += 1
            print(f"  ⛔ {p['title'][:52]:52} — {konflikt or 'nichts zu tun'}", flush=True)
            if not DRY and konflikt:
                with open(LEDGER, "a") as f:
                    f.write(f"{pid}\tuebersprungen:{konflikt}\t{p['title'][:60]}\n")
            continue

        print(f"  ✅ {p['title'][:52]:52} {len(eingaben)} Varianten · "
              + ", ".join(f"{a}→{b}" for a, b in list(umzug.items())[:3]), flush=True)
        if DRY:
            ok += 1; varianten += len(eingaben); continue

        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){'
                'productVariantsBulkUpdate(productId:$p,variants:$v)'
                '{userErrors{field message}}}', {"p": p["id"], "v": eingaben})
        fe = (((r or {}).get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if r is None or fe is None or fe:
            print(f"       ⚠️ nicht zusammengelegt: "
                  f"{json.dumps(fe)[:110] if fe else 'keine Antwort'}")
            uebersprungen += 1; time.sleep(1); continue
        ok += 1; varianten += len(eingaben)
        with open(LEDGER, "a") as f:
            f.write(f"{pid}\tzusammengelegt:{len(eingaben)}\t{p['title'][:60]}\n")
        time.sleep(0.8)

    print(f"\n{ok} Produkte · {varianten} Varianten · {uebersprungen} uebersprungen")
    print("FERTIG")


if __name__ == "__main__":
    main()
