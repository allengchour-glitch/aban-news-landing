#!/usr/bin/env python3
"""platzhalter_farbwert.py — der Platzhalter-Wert «Color» in der Farbauswahl wird «Wie abgebildet» (22.10.2026).

ANLASS (Sauber-Inventur, Spähtrupp «katalog» K7): GEMESSEN 22.10. (Vollexport, 56'684 Produkte): 67 Produkte tragen in der Option «Farbe» den englischen
Platzhalter «Color» (44 als einer von mehreren Werten, 7 als EINZIGER Wert, 6× «Farbe» als Wert, 1× «Colour»). CJ meldet damit «die Variante hat keinen
Farbnamen» — für die Kundin steht ein Knopf «Color» neben echten Farben. Die Schwesterklasse «Wie abgebildet» (6 Produkte) ist schon die Hausform.

WEG: Kandidaten live über die Variantensuche (`title:*Color*`, kein Export nötig → wirkt auch auf Neuimporte), je Produkt NUR die Option «Farbe»/«Color»,
deren Wert EXAKT Color/Colour/Farbe heisst (Gross/klein egal; «Color-38.», «Color 2» bleiben — Teil-Namen sind eine andere Klasse).
productOptionValueUpdate → «Wie abgebildet». Ausgenommen: Produkte, die den Zielnamen in derselben Option schon tragen (Doppelwert), Editor/POD,
Werbetest-Sperre (dropship/_werbetest_sperre.txt bis 24.10.). Rücklesen: Wert da, alter Wert weg, Variantenzahl unverändert, SKUs/Preise unverändert.
  python3 automation/platzhalter_farbwert.py               # trocken (Standard)
  SCHARF=1 [MAX=n] python3 automation/platzhalter_farbwert.py
  python3 automation/platzhalter_farbwert.py --selbsttest
Ledger dropship/_platzhalter_farbwert.tsv. Ampelzeile: --zeile (offen > 0 → Hinweis).
"""
import datetime as dt
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_platzhalter_farbwert.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX") or 3000)
ZIEL = "Wie abgebildet"
PLATZHALTER = re.compile(r"^\s*(color|colour|farbe)\s*$", re.I)
OPTIONSNAMEN = {"farbe", "color", "colour", "farbe / muster"}
POD = ("selbst-gestalten", "pod", "printful")


def entscheide(optionsname, werte, tags=()):
    """Rein. → (aktion, details). aktion ∈ {"umbenennen", "nichts", "ausgenommen"}; details = Liste der umzubenennenden Alt-Werte.
    Umbenannt wird nur in einer Farb-Option, nur exakte Platzhalter-Werte, nur wenn der Zielname dort noch nicht vorkommt."""
    if (optionsname or "").strip().lower() not in OPTIONSNAMEN:
        return "nichts", []
    alt = [w for w in werte if PLATZHALTER.match(w or "")]
    if not alt:
        return "nichts", []
    if any(t.lower() in POD for t in tags or ()):
        return "ausgenommen", ["editor"]
    if any((w or "").strip().lower() == ZIEL.lower() for w in werte):
        return "ausgenommen", ["zielname-schon-da"]
    if len(alt) > 1:
        return "ausgenommen", ["mehrere-platzhalter"]
    return "umbenennen", alt


def gesperrt():
    try:
        from werbetest_sperre import gesperrte_ids as g
        return {str(x).rsplit("/", 1)[-1] for x in g()}
    except Exception:
        return None


def kandidaten_live(gql):
    """Produkt-IDs, deren Varianten «Color» im Titel tragen (Suche ist Vorfilter; entschieden wird an den Optionen)."""
    ids, cur = [], None
    while True:
        d = gql("query($q:String,$c:String){productVariants(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{product{id}}}}",
                {"q": "product_status:active AND (title:*Color* OR title:*Colour* OR title:Farbe*)", "c": cur})
        pv = d["productVariants"]
        ids += [n["product"]["id"] for n in pv["nodes"]]
        if not pv["pageInfo"]["hasNextPage"]:
            return list(dict.fromkeys(ids))
        cur = pv["pageInfo"]["endCursor"]


def main():
    from kaufwille_zeile import gql
    sperre = gesperrt()
    if sperre is None:
        print("PLATZHALTER-FARBWERT: unklar (Werbetest-Sperre nicht lesbar) — kein Lauf")
        return 1
    try:
        fertig = {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if z.count("\t") >= 2 and "\tok\t" in z}
    except OSError:
        fertig = set()
    ks = [k for k in kandidaten_live(gql) if k not in fertig]
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ} · {'SCHARF' if SCHARF else 'TROCKEN'} · {len(ks)} Kandidaten (Variantensuche) · MAX {MAX}", flush=True)
    zahl, led = {}, (open(LEDGER, "a", encoding="utf-8") if SCHARF else None)
    for pid in ks[:MAX]:
        p = gql('query($i:ID!){product(id:$i){title status tags options{id name optionValues{id name}} variantsCount{count} '
                'variants(first:250){nodes{id sku price}}}}', {"i": pid})["product"]
        if not p or p["status"] != "ACTIVE":
            st, titel = "inaktiv", (p or {}).get("title", "")
        elif pid.rsplit("/", 1)[-1] in sperre:
            st, titel = "werbetest", p["title"]
        else:
            st, titel, plan = "nichts", p["title"], None
            for o in p["options"]:
                a, det = entscheide(o["name"], [v["name"] for v in o["optionValues"]], p["tags"])
                if a == "umbenennen":
                    plan = (o, det[0])
                    break
                if a == "ausgenommen":
                    st = "ausgenommen-" + det[0]
            if plan:
                o, altwert = plan
                vid = next(v["id"] for v in o["optionValues"] if v["name"] == altwert)
                vorher = [(v["id"], v["sku"], v["price"]) for v in p["variants"]["nodes"]]
                if not SCHARF:
                    st = "trocken"
                else:
                    r = gql('mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v)'
                            '{userErrors{message}}}', {"p": pid, "o": {"id": o["id"]}, "v": [{"id": vid, "name": ZIEL}]})["productOptionUpdate"]
                    q = gql('query($i:ID!){product(id:$i){options{id optionValues{name}} variants(first:250){nodes{id sku price}}}}', {"i": pid})["product"]
                    werte = [v["name"] for oo in q["options"] if oo["id"] == o["id"] for v in oo["optionValues"]]
                    nachher = [(v["id"], v["sku"], v["price"]) for v in q["variants"]["nodes"]]
                    if r["userErrors"]:
                        st = "FEHLER " + r["userErrors"][0]["message"][:80]
                    elif ZIEL in werte and altwert not in werte and sorted(vorher) == sorted(nachher):
                        st = "ok"
                    else:
                        st = f"RÜCKLESEN-ABWEICHEND {werte[:6]}"[:120]
        k = st.split(" ")[0]
        zahl[k] = zahl.get(k, 0) + 1
        if led and st not in ("trocken", "nichts"):
            led.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{pid}\t{st}\t{titel[:80]}\n")
            led.flush()
        if k not in ("ok", "trocken", "nichts") and not k.startswith("ausgenommen"):
            print(f"  {k}: {pid.rsplit('/', 1)[-1]} {titel[:60]}")
    print("ERGEBNIS", json.dumps(zahl, ensure_ascii=False))
    return 1 if any(k.startswith(("FEHLER", "RÜCKLESEN")) for k in zahl) else 0


def zeile():
    """Ampelzeile: Anzahl offener Kandidaten aus der letzten Messung ist nicht gespeichert — darum nur Ledger-Fehler zählen."""
    try:
        bad = [z for z in open(LEDGER, encoding="utf-8") if "\tFEHLER" in z or "\tRÜCKLESEN" in z]
    except OSError:
        return ""
    return f"PLATZHALTER-FARBWERT: {len(bad)} Fehlschläge im Ledger ({os.path.relpath(LEDGER, REPO)})" if bad else ""


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        if m.entscheide("Farbe", ["Schwarz", "Color", "Rot"]) != ("umbenennen", ["Color"]):
            f.append("A Color unter echten Farben muss umbenannt werden")
        if m.entscheide("Farbe", ["Color"]) != ("umbenennen", ["Color"]):
            f.append("B Color als einziger Wert muss umbenannt werden")
        if m.entscheide("Farbe", ["Color-38.", "Color 2", "Pink"])[0] != "nichts":
            f.append("C Teil-Namen («Color-38.», «Color 2») dürfen nicht angefasst werden")
        if m.entscheide("Grösse", ["Color", "S"])[0] != "nichts":
            f.append("D nur Farb-Optionen")
        if m.entscheide("Farbe", ["Color", "Wie abgebildet"]) != ("ausgenommen", ["zielname-schon-da"]):
            f.append("E Zielname schon da → Doppelwert verhindern")
        if m.entscheide("Farbe", ["Color"], ["selbst-gestalten"])[0] != "ausgenommen":
            f.append("F Editor/POD ausnehmen")
        if m.entscheide("farbe", ["COLOUR", "Blau"]) != ("umbenennen", ["COLOUR"]):
            f.append("G Gross/klein egal, Colour zählt")
        if m.entscheide("Farbe", ["Color", "Colour", "Blau"])[0] != "ausgenommen":
            f.append("H zwei Platzhalter in einer Option → nicht raten")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Teilnamen werden gematcht", 'r"^\\s*(color|colour|farbe)\\s*$"', 'r"(color|colour|farbe)"'),
           ("Zielname egal", 'if any((w or "").strip().lower() == ZIEL.lower() for w in werte):', "if False:"),
           ("POD egal", 'if any(t.lower() in POD for t in tags or ()):', "if False:"),
           ("Optionsname egal", 'if (optionsname or "").strip().lower() not in OPTIONSNAMEN:', "if False:")]
    erkannt = 0
    for name, alt, neu in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu, 1), "mutant", "exec"), m.__dict__)
        if faelle(m):
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 8 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile())
        sys.exit(0)
    sys.exit(main())
