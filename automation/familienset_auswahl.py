#!/usr/bin/env python3
"""familienset_auswahl.py — Auswahlfeld von Familien-/Partnerlook-Sets ins Deutsche (10.10.2026, «weiter»).

GEMESSEN 10.10. (Search Console über OpenSEO, 28 T): «familien-weihnachtspyjama» Pos. 26, «partner weihnachtspyjama»
Pos. 22 — die Nachfrage steigt bis Dezember. Im Optionen-Export (52'293 Produkte) tragen 43 Optionen Rollenwörter im Wert,
und die Kundin wählt dort zwischen «Gray-Father S», «Hat Print-S For Mother», «White-DadS», «Mother's Size L». Das
Werkzeug vom 12.09. (tools/varianten_deutsch.mjs) übersetzte damals 13 Produkte von Hand — Neuimporte seither nie.
REGEL (automation/familienset_werte.mjs = dieselbe Funktion in den CJ-Importern): nur Familien-Titel oder ≥ 2 Werte mit
Elternwort; nach der Übersetzung kein englischer Rest, kein Code vorn, keine Lieferanten-Kennung, Grössen buchstabengleich,
keine Kollision — sonst bleibt die Option. «Farbe» heisst danach «Ausführung & Grösse» (bzw. «Ausführung»).

  python3 automation/familienset_auswahl.py               # trocken (Export /tmp/farbmuster_export.jsonl)
  SCHARF=1 [IDS=gid,…] python3 automation/familienset_auswahl.py
  python3 automation/familienset_auswahl.py --selbsttest  # Übersetzer-Selbsttest + Kanarien
Ledger: dropship/_familienset_auswahl.tsv
"""
import datetime, json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
NODE = "/opt/node22/bin/node"
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_familienset_auswahl.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
IDS = {x if x.startswith("gid:") else f"gid://shopify/Product/{x}" for x in os.environ.get("IDS", "").split(",") if x.strip()}
ROLLE = re.compile(r"\b(dad|daddy|mom|mommy|mother|father|kid|kids|child|children|baby|romper|tong)\b|\b(dad|mom)(?=[SMLX0-9])", re.I)


def stapel(eintraege):
    """[{title, opt, werte}] → [ {werte, name} | None ] über familienset_werte.mjs (EINE Regel für Bestand und Importer)."""
    r = subprocess.run([NODE, os.path.join(HIER, "familienset_werte.mjs"), "--stapel"], input=json.dumps(eintraege),
                       capture_output=True, text=True, cwd=REPO, timeout=300)
    if r.returncode != 0:
        raise SystemExit("familienset_werte.mjs: " + r.stderr[-300:])
    return json.loads(r.stdout)


def selbsttest():
    a = subprocess.run([NODE, os.path.join(REPO, "tools", "varianten_deutsch.mjs"), "--selbsttest"], capture_output=True, text=True, timeout=60)
    b = subprocess.run([NODE, os.path.join(HIER, "familienset_werte.mjs"), "--test"], capture_output=True, text=True, timeout=60)
    print(("Übersetzer: " + (a.stdout.strip().splitlines() or ["?"])[-1]) + " · " + (b.stdout.strip().splitlines() or ["?"])[-1])
    return a.returncode == 0 and b.returncode == 0 and "BESTANDEN" in a.stdout


def kandidaten():
    roh = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        if IDS and p["id"] not in IDS:
            continue
        for o in p.get("options") or []:
            w = [v["name"] for v in o["optionValues"]]
            if sum(1 for x in w if ROLLE.search(x)) >= 2:
                roh.append({"id": p["id"], "title": p.get("title") or "", "opt": o["name"], "werte": w})
    erg = stapel([{"title": r["title"], "opt": r["opt"], "werte": r["werte"]} for r in roh]) if roh else []
    ids = []
    for r, e in zip(roh, erg):
        if e and r["id"] not in ids:
            ids.append(r["id"])
    return ids, len(roh)


def bearbeiten(pid):
    from kaufwille_zeile import gql
    p = gql('query($i:ID!){product(id:$i){id title status options{id name linkedMetafield{key} optionValues{id name}}}}', {"i": pid})["product"]
    if not p or p["status"] != "ACTIVE":
        return [("—", "", "nicht aktiv")]
    opts = [o for o in p["options"] if sum(1 for v in o["optionValues"] if ROLLE.search(v["name"])) >= 2]
    if not opts:
        return [("—", "", "live nichts zu tun")]
    vorschlag = stapel([{"title": p["title"], "opt": o["name"], "werte": [v["name"] for v in o["optionValues"]]} for o in opts])
    erg = []
    for o, v in zip(opts, vorschlag):
        if not v:
            continue
        alt = [x["name"] for x in o["optionValues"]]
        name_neu = v["name"]
        if any(x["name"] == name_neu for x in p["options"] if x["id"] != o["id"]):
            name_neu = o["name"]                     # Name schon vergeben → nur Werte
        aend = (f"[{o['name']}→{name_neu}] " if name_neu != o["name"] else "") + " | ".join(f"{a}→{b}" for a, b in zip(alt, v["werte"]) if a != b)
        if o.get("linkedMetafield"):
            erg.append((o["name"], aend, "linkedMetafield")); continue
        if not SCHARF:
            erg.append((o["name"], aend, "trocken")); continue
        opt_in = {"id": o["id"]}
        if name_neu != o["name"]:
            opt_in["name"] = name_neu
        upd = [{"id": x["id"], "name": n} for x, n in zip(o["optionValues"], v["werte"]) if x["name"] != n]
        r = gql("mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,"
                "optionValuesToUpdate:$u,variantStrategy:LEAVE_AS_IS){userErrors{field message}}}",
                {"p": pid, "o": opt_in, "u": upd})["productOptionUpdate"]
        if r["userErrors"]:
            erg.append((o["name"], aend, "FEHLER " + r["userErrors"][0]["message"][:80])); continue
        rl = gql('query($i:ID!){product(id:$i){options{id name optionValues{name}}}}', {"i": pid})["product"]["options"]
        o2 = next((x for x in rl if x["id"] == o["id"]), None)
        ok = o2 and o2["name"] == name_neu and [x["name"] for x in o2["optionValues"]] == v["werte"]
        erg.append((o["name"], aend, "ok" if ok else "RÜCKLESEN ABWEICHEND"))
    return erg or [("—", "", "live nichts zu tun")]


# Faktenblock «Produktdetails» (Import, cj_specs.mjs): «<li><strong>Farbe:</strong> Black-Father S Size, …</li>» = roher
# CJ-Variantenschlüssel. produktdetails_wahrheit.py (MODUS=spiegel) lässt die Zeile bewusst stehen, wenn es keine Farb-Option
# gibt («Farbe: Schwarz» kann richtig sein) — nach dem Umbau zu «Ausführung & Grösse» trifft das hier zu. Gestrichen wird
# NUR eine Farbe-Zeile mit englischem Rollenwort; die Wahl steht im Auswahlfeld.
FARB_LI = re.compile(r"<li>\s*<strong>(?:Farbe|Color|Farben):</strong>([^<]*)</li>\s*", re.I)
ROLLE_EN = re.compile(r"\b(dad|daddy|mom|mommy|mother|father|kid|kids|child|children|romper)\b|\b(dad|mom)(?=[SMLX0-9])", re.I)
# Rohliste in der Faktenzeile kann auch schon deutsche Rollen tragen («5562-Herren M, 5562-Damen S …») — gestrichen wird sie nur,
# wenn das Auswahlfeld NICHT mehr «Farbe» heisst (oben geprüft), also die Wahl dort steht.
ROLLE_ZEILE = re.compile(ROLLE_EN.pattern + r"|\b(herren|damen|kinder|baby|papa|mama)\b", re.I)


def details_bereinigen(pid):
    from kaufwille_zeile import gql
    p = gql('query($i:ID!){product(id:$i){descriptionHtml options{name values}}}', {"i": pid})["product"]
    if any(o["name"].lower() in ("farbe", "color") and sum(1 for v in o["values"] if ROLLE_EN.search(v)) >= 2 for o in p["options"]):
        return None                                   # Option selbst noch roh → Zeile spiegelt die Wahrheit, bleibt
    alt = p["descriptionHtml"] or ""
    if any(o["name"].lower() in ("farbe", "color") for o in p["options"]):
        rolle = ROLLE_EN                              # Farb-Option existiert noch → nur englische Rohliste streichen
    else:
        rolle = ROLLE_ZEILE
    neu = FARB_LI.sub(lambda m: "" if len(rolle.findall(m.group(1))) >= 2 else m.group(0), alt)
    if neu == alt:
        return None
    if not SCHARF:
        return "trocken"
    r = gql('mutation($p:ProductInput!){productUpdate(input:$p){userErrors{message}}}', {"p": {"id": pid, "descriptionHtml": neu}})["productUpdate"]
    if r["userErrors"]:
        return "FEHLER " + r["userErrors"][0]["message"][:60]
    zur = gql('query($i:ID!){product(id:$i){descriptionHtml}}', {"i": pid})["product"]["descriptionHtml"] or ""
    return "ok" if not any(len(rolle.findall(m.group(1))) >= 2 for m in FARB_LI.finditer(zur)) else "RÜCKLESEN ABWEICHEND"


def main():
    if not selbsttest():
        raise SystemExit("Selbsttest rot — nichts geschrieben")
    if "--selbsttest" in sys.argv:
        return
    if not os.path.exists(EXPORT):
        raise SystemExit(f"Export fehlt: {EXPORT}")
    ids, n_opt = kandidaten()
    print(f"START {datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {n_opt} Optionen mit Rollenwörtern · {len(ids)} Produkte schreibbar · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}")
    zahl = {}
    with open(LEDGER, "a", encoding="utf-8") as led:
        for pid in ids:
            for opt, aend, st in bearbeiten(pid):
                k = st.split(" ")[0]
                zahl[k] = zahl.get(k, 0) + 1
                print(f"  {st:10} {pid.rsplit('/', 1)[-1]} {opt}: {aend[:170]}")
                if SCHARF:
                    led.write(f"{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{pid}\t{opt}\t{aend}\t{st}\n")
    # Faktenblock: auch bei Sets, die schon früher (12.09.) oder heute umgebaut wurden — Kandidaten = deutsche Rollen im Wert
    det = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        if (IDS and p["id"] not in IDS) or p["id"] in det:
            continue
        if any(sum(1 for v in o["optionValues"] if re.search(r"\b(Papa|Mama|Kind|Kinder)\b|" + ROLLE.pattern, v["name"], re.I)) >= 2
               for o in p.get("options") or []):
            det.append(p["id"])
    dz = {}
    with open(LEDGER, "a", encoding="utf-8") as led:
        for pid in det:
            st = details_bereinigen(pid)
            if not st:
                continue
            dz[st.split(" ")[0]] = dz.get(st.split(" ")[0], 0) + 1
            print(f"  {st:10} {pid.rsplit('/', 1)[-1]} Produktdetails: Farbe-Zeile mit Rollenwörtern gestrichen")
            if SCHARF:
                led.write(f"{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{pid}\tProduktdetails\tFarbe-Zeile gestrichen\t{st}\n")
    print(f"FERTIG {datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}: Optionen {zahl} · Produktdetails {dz} (von {len(det)} Sets geprüft)")


if __name__ == "__main__":
    main()
