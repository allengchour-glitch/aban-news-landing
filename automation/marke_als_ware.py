#!/usr/bin/env python3
"""marke_als_ware.py — Fremdmarke als WARE im Titel (10.10.2026).

ANLASS: «Harrods Keramik-Tasse» (CJ, CHF 19.90) trägt auf jedem Bild das Harrods-Logo. Am 24.09. fiel sie beim Herbst-
Kuratieren auf — die Regel kam nur in `herbst_kuratieren.py` (GLOBAL_RAUS), die Tasse blieb aktiv, im Google-Kanal und in
«Geschenke bis CHF 30». Dieselbe Prüfung fand am 10.10. «Xbox 360 Wireless Controller» (nachgemachte Xbox-Verpackung mit
chinesischem Text) und «iPhone 12» (CHF 31.90, Bilder = runde Billig-Smartwatch, Text verspricht A14-Chip und 5G).
Google Merchant: «Counterfeit goods» ist ein Grund für die Kontosperre — der Google-Kanal ist der einzige mit Verkäufen.

ABGRENZUNG
  · Anlehnung «im Chanel-Stil» → marken_filter.mjs / markenanlehnung.py (Text umschreiben)
  · Kompatibilität «Hülle für iPhone», «Controller-Halterung für PS4/PS5/Xbox» → erlaubt (Regel `kompat*`)
  · Lizenz-/Markenware von Grosshändlern (Fortura CH, BigBuy) und eigene Druckware → SKU-Präfix `lizenz_lieferanten`
Regel + Kanarien: automation/data/marke_als_ware_regel.json (gleich gelesen von marke_als_ware.mjs in den CJ-Importern).

  python3 automation/marke_als_ware.py --kanarien        Regel gegen die Kanarien (Pflicht vor jedem Lauf)
  python3 automation/marke_als_ware.py --selbsttest      Kanarien + py=js über alle aktiven Titel
  python3 automation/marke_als_ware.py                   Trockenlauf: Treffer (aktiv, ohne Lizenz-SKU)
  SCHARF=1 python3 automation/marke_als_ware.py          Treffer ohne Urteil → Tag `marken-pruefen` (Google-Ausschluss setzt
                                                         google_sperrtags_durchsetzen.py durch; Ware bleibt im Shop)
  SCHARF=1 python3 automation/marke_als_ware.py --draften ID,ID GRUND=marke-faelschung
                                                         Urteil nach Bildprüfung: DRAFT + Tag GRUND (+ marken-pruefen)
Ledger: dropship/_marke_als_ware.tsv (Zeit, ID, Aktion, Titel). Bericht: dropship/MARKE-ALS-WARE.md (Treffer zum Sichten).
"""
import datetime as dt, json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

REGEL = json.load(open(os.path.join(HIER, "data", "marke_als_ware_regel.json"), encoding="utf-8"))
RX_MARKE = re.compile(r"(?<![\wäöüßÄÖÜ])(?:" + REGEL["marken"] + r")(?![\wäöüßÄÖÜ])", re.I)
RX_KOMPAT = re.compile(REGEL["kompat"], re.I)
RX_KOMPAT_VOR = re.compile(REGEL["kompat_vor"], re.I)
RX_KOMPAT_NACH = re.compile(REGEL["kompat_nach"], re.I)
RX_LIZENZ = re.compile(REGEL["lizenz_lieferanten"], re.I)
EXPORT = "/tmp/geschenk_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_marke_als_ware.tsv")
BERICHT = os.path.join(REPO, "dropship", "MARKE-ALS-WARE.md")
SCHARF = os.environ.get("SCHARF") == "1"
URTEIL_TAGS = ("marke-faelschung", "marke-ok", "lizenz-nicht-bewerben", "lizenz-risiko")   # marken-pruefen = noch offen


def marke_als_ware(titel):
    """Gibt die erste Marke zurück, die als Ware (nicht als Kompatibilität) im Titel steht, sonst ""."""
    ende = None                                     # Ende der letzten ERLAUBTEN Marke (Kette «für Samsung Galaxy Watch»)
    for m in RX_MARKE.finditer(titel or ""):
        vor, nach = titel[:m.start()], titel[m.end():]
        if (ende is not None and not titel[ende:m.start()].strip()) or \
                RX_KOMPAT.search(vor) or RX_KOMPAT_VOR.search(vor) or RX_KOMPAT_NACH.search(nach):
            ende = m.end()
            continue
        return m.group(0)
    return ""


def kanarien():
    fehler = [t for t in REGEL["kanarien"]["treffer"] if not marke_als_ware(t)]
    fehler += [f"{t} → {marke_als_ware(t)}" for t in REGEL["kanarien"]["frei"] if marke_als_ware(t)]
    n = len(REGEL["kanarien"]["treffer"]) + len(REGEL["kanarien"]["frei"])
    print(f"Kanarien {n - len(fehler)}/{n}")
    for f in fehler:
        print("   ✗", f)
    return not fehler


def export_laden():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 86400:
        subprocess.run(["python3", os.path.join(HIER, "hype_export_bauen.py")],
                       env={**os.environ, "ZIEL": EXPORT, "MAXALTER": "86400"}, check=True)
    for z in open(EXPORT, encoding="utf-8"):
        d = json.loads(z)
        if d.get("status") == "ACTIVE":
            yield d


def selbsttest():
    ok = kanarien()
    titel = [d["title"] for d in export_laden()]
    r = subprocess.run(["/opt/node22/bin/node", os.path.join(HIER, "marke_als_ware.mjs"), "--stapel"],
                       input=json.dumps(titel), capture_output=True, text=True, timeout=300)
    js = json.loads(r.stdout or "[]")
    py = [marke_als_ware(t) for t in titel]
    diff = [(t, a, b) for t, a, b in zip(titel, py, js) if bool(a) != bool(b)]
    print(f"py=js {len(titel) - len(diff)}/{len(titel)}" + ("" if len(js) == len(titel) else f" (js lieferte {len(js)})"))
    for t, a, b in diff[:10]:
        print(f"   ✗ py={a!r} js={b!r} {t}")
    return ok and not diff and len(js) == len(titel)


def gql(q, v=None):
    from seo_autopilot import gql as g
    return g(q, v or {})


def sku_von(pid):
    d = gql('query($id:ID!){p:product(id:$id){status tags variants(first:1){nodes{sku}}}}', {"id": pid})["p"]
    return d, ((d["variants"]["nodes"] or [{}])[0].get("sku") or "")


def ledger(pid, aktion, titel):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{pid.split('/')[-1]}\t{aktion}\t{titel}\n")


def treffer():
    aus = []
    for d in export_laden():
        m = marke_als_ware(d["title"])
        if not m:
            continue
        if any(t in URTEIL_TAGS for t in d.get("tags") or []):
            continue                               # geurteilt (marke-ok = gesichtet und erlaubt, lizenz-* = schon aus Google)
        aus.append((d, m))
    return aus


def bericht(zeilen):
    kopf = ("# Fremdmarke als Ware im Titel — Wächterliste\n\n"
            "Geschrieben von `automation/marke_als_ware.py` (Aufseher täglich). Jede Zeile = aktives Produkt mit Markenname als "
            "Ware, ohne Kompatibilitätsangabe und ohne Lizenz-Lieferant. Automatisch: Tag `marken-pruefen` (raus aus Google). "
            "**Nach Bildprüfung urteilen:** Fälschung → `--draften ID GRUND=marke-faelschung`; echte/erlaubte Ware → Tag "
            "`marke-ok`; Fehltitel → Titel ohne Marke umschreiben (+ 301).\n\n"
            f"Stand {dt.datetime.utcnow():%Y-%m-%d %H:%M} UTC · {len(zeilen)} offen\n\n| Produkt | Marke | Titel |\n|---|---|---|\n")
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(kopf + "".join(f"| {pid} | {m} | {t} |\n" for pid, m, t in zeilen))


def draften(ids, grund):
    for i in ids:
        pid = i if i.startswith("gid://") else f"gid://shopify/Product/{i}"
        d, sku = sku_von(pid)
        print(f"   {pid.split('/')[-1]} {d['status']} SKU {sku}", flush=True)
        if not SCHARF:
            continue
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{status} userErrors{message}}}',
                {"p": {"id": pid, "status": "DRAFT"}})["productUpdate"]
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": pid, "t": [grund, "marken-pruefen"]})
        zur = sku_von(pid)[0]
        ok = zur["status"] == "DRAFT" and grund in zur["tags"]
        print(f"      → {zur['status']} {'✓' if ok else '✗'} {r['userErrors'] or ''}", flush=True)
        ledger(pid, f"draft:{grund}" if ok else "FEHLER-draft", "")


def main():
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if not kanarien():
        sys.exit("Kanarien rot — kein Lauf")
    if "--draften" in sys.argv:
        ids = sys.argv[sys.argv.index("--draften") + 1].split(",")
        draften(ids, os.environ.get("GRUND", "marke-faelschung"))
        return
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    zeilen, gesetzt = [], 0
    for d, m in treffer():
        info, sku = sku_von(d["id"])
        if RX_LIZENZ.search(sku) or info["status"] != "ACTIVE" or any(t in URTEIL_TAGS for t in info["tags"]):
            continue                               # live gelesen: der Export kann bis 24 h alt sein
        pid = d["id"].split("/")[-1]
        zeilen.append((pid, m, d["title"]))
        print(f"   {pid} [{m}] SKU {sku[:24]:24} {d['title'][:70]}", flush=True)
        if SCHARF and "marken-pruefen" not in info["tags"]:
            r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                    {"id": d["id"], "t": ["marken-pruefen"]})["tagsAdd"]
            if not r["userErrors"]:
                gesetzt += 1
                ledger(d["id"], f"tag:marken-pruefen [{m}]", d["title"])
    bericht(zeilen)
    print(f"FERTIG {len(zeilen)} Treffer · Tag gesetzt {gesetzt}" + ("" if SCHARF else " (trocken)"))


if __name__ == "__main__":
    main()
