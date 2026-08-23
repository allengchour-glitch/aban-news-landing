#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""groesse_im_farbwert.py — holt die Grösse aus dem Farbwert zurück in die Grössen-Option.

BEFUND (Katalog-Audit 22.08.2026, §1.2): Bei 350 aktiven Produkten steht die Grösse im
FARBWERT statt im Grössenfeld — «Aprikose-2XL / S», «Red-7XL / S», «Gray-0XL / 2XL».
Der Grössen-Slot trägt dabei einen Füllwert (bei 1'700 von 1'700 Varianten exakt die
kleinste Grösse des Produkts). Ursache: Der CJ-Importer schreibt CJs `variantKey`
unverändert in die Shopify-Option, und CJ hängt Zusatzgrössen an den Farbnamen.

Der Schaden ist NICHT eine Fehllieferung — das Etikett, das die Kundin anklickt, sagt die
Wahrheit. Er ist (1) eine dreifach doppelte Farbliste im Auswahlfeld und (2) ein falsches
`size`-Attribut im Google-Feed, weil dort der Füllwert steht.

⚠️ DIE REPARATURFALLE ist die Reihenfolge. Ein naives Umbenennen «Aprikose-2XL» →
«Aprikose» kollidiert mit dem vorhandenen Wert und VERSCHMILZT zwei Varianten
(«Option value already exists», bekannt aus farbwerte_uebersetzen.py). Deshalb wird die
Variante an ihr ZIEL (Farbe, Grösse) umgehängt — und vorher geprüft, ob dieses Ziel schon
belegt ist. Ist es belegt, bleibt das GANZE Produkt unberührt: halb repariert ist
schlimmer als roh (dieselbe Kollisionswache wie in variant_value_clean.py seit 21.08.).

⚠️ Der Farbname wird NICHT geraten. «Himmelblau-2XL» wird zu «Himmelblau», auch wenn das
Produkt schon ein «Hellblau» führt — beides könnte dieselbe CJ-Farbe sein, aber das ist
eine Vermutung. Es wird nur der Grössen-Anhang abgetrennt, sonst nichts.

ENV: DRY=1 (nur zeigen) · IDS=15447594172801,… (nur diese Produkte) · MAX=n
Ledger: dropship/_groesse_im_farbwert.txt
"""
import json, os, re, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_groesse_im_farbwert.txt"
KANDIDATEN = "/tmp/groesse_im_farbwert.json"
MAX = int(os.environ.get("MAX") or 0)

# Nur eindeutige Grössen-Anhänge. «S», «M», «L», «XL» stehen bewusst NICHT drin: ein
# Farbwert wie «Navy-M» wäre nicht von einem Farbnamen zu unterscheiden, der auf -M endet.
ANHANG = re.compile(r'^(.+?)-(\d{1,2}XL|XXS|XXL|XXXL|XS)$', re.I)


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
     'options{ id name position optionValues{ id name } } '
     'variants(first:250){ nodes{ id title selectedOptions{ name value } } } } }')


def plan(p):
    """Liefert (Plan, Grund-wenn-nichts). Plan = (farbOpt, groessenOpt, [(vid, farbe, groesse)])."""
    opts = p["options"]
    if len(opts) < 2:
        return None, "nur eine Option"
    vs = p["variants"]["nodes"]
    # Grössen-Option: die, deren Werte ueberwiegend wie Groessen aussehen.
    gr = re.compile(r'^(?:\d{1,2}XL|XXS|XS|S|M|L|XL|XXL|XXXL)$', re.I)
    kandidat = [o for o in opts
                if sum(bool(gr.match(v["name"].strip())) for v in o["optionValues"])
                > len(o["optionValues"]) * 0.6]
    if not kandidat:
        return None, "keine Groessen-Option erkennbar"
    gopt = kandidat[0]
    belegt = {tuple(sorted((s["name"], s["value"]) for s in v["selectedOptions"]))
              for v in vs}
    umzug = []
    for v in vs:
        sel = {s["name"]: s["value"] for s in v["selectedOptions"]}
        for name, wert in sel.items():
            if name == gopt["name"]:
                continue
            m = ANHANG.match(wert.strip())
            if not m:
                continue
            basis, groesse = m.group(1).strip(), m.group(2).upper()
            ziel = dict(sel)
            ziel[name] = basis
            ziel[gopt["name"]] = groesse
            schluessel = tuple(sorted(ziel.items()))
            if schluessel in belegt:
                return None, f"Ziel belegt: {basis} / {groesse}"
            belegt.add(schluessel)
            umzug.append((v["id"], name, basis, gopt["name"], groesse, wert))
            break
    if not umzug:
        return None, "kein Anhang gefunden"
    return (gopt, umzug), None


def main():
    ids = os.environ.get("IDS")
    if ids:
        liste = [i.strip() for i in ids.split(",") if i.strip()]
    elif os.path.exists(KANDIDATEN):
        liste = [t[0].split("/")[-1] for t in json.load(open(KANDIDATEN))]
    else:
        # Die Kandidatenliste kommt aus einem Bulk-Export (Variantentitel enthalten die
        # Optionskombination). Fehlt sie — Container gewiped —, ist das KEIN «nichts zu
        # tun»: ohne frischen Export blieben genau die neuesten Produkte ungeprueft.
        print(f"PAUSE ({KANDIDATEN} fehlt — frischen Export bauen)")
        return
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [i for i in liste if i not in erledigt]
    if MAX:
        offen = offen[:MAX]
    print(f"{len(liste)} Kandidaten · {len(offen)} offen"
          + (" · DRY" if DRY else ""), flush=True)

    ok = uebersprungen = varianten = 0
    for pid in offen:
        d = gql(Q, {"id": f"gid://shopify/Product/{pid}"})
        if d is None:
            print("PAUSE (Shopify antwortet nicht)"); return
        p = (d.get("data") or {}).get("product")
        if not p or p["status"] != "ACTIVE":
            continue
        pl, grund = plan(p)
        if not pl:
            uebersprungen += 1
            print(f"  ⛔ {p['title'][:52]:52} — {grund}", flush=True)
            if not DRY and grund.startswith("Ziel belegt"):
                with open(LEDGER, "a") as f:
                    f.write(f"{pid}\tuebersprungen:{grund}\t{p['title'][:60]}\n")
            continue
        gopt, umzug = pl
        neue_groessen = sorted({u[4] for u in umzug}
                               - {v["name"].upper() for v in gopt["optionValues"]})
        print(f"  ✅ {p['title'][:52]:52} {len(umzug)} Varianten"
              f" · neue Groessen {neue_groessen or '—'}", flush=True)
        for u in umzug[:3]:
            print(f"       {u[5]} / …  ->  {u[2]} / {u[4]}")
        if DRY:
            ok += 1; varianten += len(umzug); continue

        if neue_groessen:
            r = gql('mutation($p:ID!,$o:ID!,$a:[OptionValueCreateInput!]){'
                    'productOptionUpdate(productId:$p,option:{id:$o},optionValuesToAdd:$a)'
                    '{userErrors{message}}}',
                    {"p": p["id"], "o": gopt["id"],
                     "a": [{"name": g} for g in neue_groessen]})
            fe = (((r or {}).get("data") or {}).get("productOptionUpdate") or {}).get("userErrors")
            if r is None or fe is None or fe:
                print(f"       ⚠️ Groessen nicht angelegt: {json.dumps(fe)[:90] if fe else 'keine Antwort'}")
                uebersprungen += 1; time.sleep(1); continue

        eingaben = [{"id": u[0], "optionValues": [{"optionName": u[1], "name": u[2]},
                                                  {"optionName": u[3], "name": u[4]}]}
                    for u in umzug]
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){'
                'productVariantsBulkUpdate(productId:$p,variants:$v)'
                '{userErrors{field message}}}', {"p": p["id"], "v": eingaben})
        fe = (((r or {}).get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if r is None or fe is None or fe:
            print(f"       ⚠️ nicht umgehaengt: {json.dumps(fe)[:120] if fe else 'keine Antwort'}")
            uebersprungen += 1; time.sleep(1); continue

        ok += 1; varianten += len(umzug)
        with open(LEDGER, "a") as f:
            f.write(f"{pid}\trepariert:{len(umzug)}\t{p['title'][:60]}\n")
        time.sleep(0.8)

    print(f"\n{ok} Produkte · {varianten} Varianten umgehaengt · {uebersprungen} uebersprungen")
    print("FERTIG")


if __name__ == "__main__":
    main()
