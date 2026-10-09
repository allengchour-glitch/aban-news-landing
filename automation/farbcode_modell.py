#!/usr/bin/env python3
"""farbcode_modell.py — Lieferanten-Artikelcodes im Farb-/Ausführungsfeld → «Modell N» (09.10.2026, Betreiber «weiter»).

GEMESSEN 09.10. (Optionen-Export 51'805 Produkte, 04:28 UTC): 124 aktive Produkte zeigen im Auswahlfeld «Farbe» reine
Lieferantencodes — «QW121, QW123», «YT6419113017», «040401», «MFH3IUW75B08E11» neben «Blau», «ZQ202201025» neben
«Muster 13–19». 66 aus Juli, 46 aus August, 12 seit September (Chelsea-Boots 01.10., Kinder-Badeanzug 02.10.,
Herrenhemd 03.10., Bambus-Leinen-Hemd 06.10.). Für die Kundin ist «KD5237» keine Farbe, und der Code ist ein
Lieferanten-Leak (Regel 3).
WARUM ES DURCHKAM: beide CJ-Importer (cj_category_fill.mjs, cj_trending_import.mjs) machen aus Codes nur dann
«Modell N», wenn JEDER Wert ein Code ist (codeOpt), und ihr Code-Muster verlangt einen Buchstaben vorn. Gemischte
Listen und «70000EU»/«040401» blieben stehen. variant_value_clean.py schneidet nur vorangestellte Codes ab und
behält einen Code, wenn sonst nichts übrig bliebe.
REGEL (automation/data/farbcode_modell_regel.json, dieselbe Datei liest farbcode_modell.mjs in den Importern):
ein Wert ohne Leerzeichen, 5–24 Zeichen, ≥ 3 Ziffern (nur Ziffern: ≥ 6), kein Segment mit Einheit/Mass/Grösse
(«TP136-3M», «XT30-15.2V-850mAh», «YW4191-180x70» bleiben), keine bekannte Kennung (S925, IP68, 18650, XT60), kein
Wort mit Kleinbuchstaben ausser Zählwörtern (Style/Color/No) → Code. Codes werden zur nächsten Nummer der vorhandenen
Serie («Muster 13–19» → «Muster 20»), sonst «Modell N» in Galerie-Reihenfolge. Sind danach ALLE Werte einer
«Farbe» «Modell N», heisst die Option «Ausführung» (wie der Importer seit 14.08.). Kollision → nichts.
Gerätebezug im Titel (Hülle/Akku/Ersatz/kompatibel …) → gemeldet, nicht geschrieben: dort kann «A2337» das Modell sein.

  python3 automation/farbcode_modell.py              # trocken (Export /tmp/farbmuster_export.jsonl)
  SCHARF=1 [IDS=gid,…] [MAX=n] python3 automation/farbcode_modell.py
  python3 automation/farbcode_modell.py --selbsttest  # Kanarien (auch py=js über alle Exportwerte)
"""
import datetime, json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "farbcode_modell_regel.json"), encoding="utf-8"))
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_farbcode_modell.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX") or 0)
IDS = {x if x.startswith("gid:") else f"gid://shopify/Product/{x}" for x in os.environ.get("IDS", "").split(",") if x.strip()}

OPT = re.compile(R["optionen"], re.I)
ZEICHEN = re.compile(R["zeichen"])
SEG = re.compile(R["segment_einheit"], re.I)
BEKANNT = re.compile(R["bekannt"], re.I)
ZAEHL = re.compile(R["zaehlwort"], re.I)
SPERRE = re.compile(R["wortsperre"], re.I)
SERIE = re.compile(R["serien"])
GERAET = re.compile(R["fach_titel"], re.I)


VOKAL = re.compile(r"[AEIOUÄÖÜaeiouäöü]")
KONS_LAUF = re.compile(r"[^AEIOUÄÖÜaeiouäöü]+")
MASS = re.compile(r"\d+(?:[.,]\d+)?\s*[x×*]\s*\d+", re.I)
TEIL = re.compile(R["teil_segment"])


def _wort(t):
    """Buchstabenfolge eines Werts: echtes Wort (→ kein Code)? Zählwörter (Style/Color/No) zählen nicht als Wort."""
    if ZAEHL.match(t):
        return False
    if SPERRE.match(t):
        return True
    if len(t) >= 3 and t != t.upper():
        return True                                   # «Supreme», «flagship», «Balck»
    if len(t) >= R["wort_min"]:                       # GROSS geschriebenes Wort («CLEAR», «PUMPKIN») vs. Code («SXCTMB»)
        lauf = max(len(x) for x in KONS_LAUF.findall(t)) if KONS_LAUF.search(t) else 0
        return len(VOKAL.findall(t)) / len(t) >= R["wort_vokal_min"] and lauf <= R["wort_konsonantenlauf_max"]
    return False


def _kern(s):
    """Code-Test ohne Segment-Prüfung (für den Kopf eines «Code-Grösse»-Werts)."""
    if not (R["min_laenge"] <= len(s) <= R["max_laenge"]) or not ZEICHEN.match(s) or BEKANNT.match(s) or MASS.search(s):
        return False
    ziff = sum(c.isdigit() for c in s)
    if s.isdigit():
        return ziff >= R["nur_ziffern_min"]
    if ziff < R["min_ziffern"]:
        return False
    return not any(_wort(t) for t in re.findall(r"[A-Za-z]+", s))


LUECKE = re.compile(R["luecke"])


def ist_code(w):
    s = LUECKE.sub(r"\1\2", (w or "").strip())      # «YTB 0012» neben «YTB0011»: dieselbe Nummer mit Leerschlag
    return _kern(s) and not any(SEG.match(t) or TEIL.match(t) for t in re.split(r"[-._#]", s)[1:]) \
        and not SEG.match(re.split(r"[-._#]", s)[0])


def teilcode(w):
    """«C3101-3XS», «GZ2794-110», «3D40D60D-CC», «TP136-3M»: Code + Grösse/Kurve/Alter. Steht so ein Wert in der Option,
    trägt der Anhang eine echte Wahl — die ganze Option bleibt (sonst würden «C3101» und «C3101-3XS» zwei Modelle)."""
    t = re.split(r"-", (w or "").strip())
    return len(t) >= 2 and _kern(t[0]) and any(SEG.match(x) or TEIL.match(x) for x in t[1:])


GR_ENDE = re.compile(R["groesse_ende"])


def wortcode(w):
    """«114BLISS» neben «101CLEAR»: Nummer + Wort (Tonname). Steht so ein Wert in der Option, ist das Feld eine Namensliste —
    ein einzelner Wert, den die Wortprüfung knapp verfehlt, würde sonst zu «Modell 1» zwischen lauter Namen."""
    s = (w or "").strip()
    if not (R["min_laenge"] <= len(s) <= R["max_laenge"]) or not ZEICHEN.match(s) or sum(c.isdigit() for c in s) < R["min_ziffern"]:
        return False
    return any(_wort(t) and not SPERRE.match(t) for t in re.findall(r"[A-Za-z]+", s))


def neu_werte(werte):
    """Werte EINER Option → neue Werte (gleiche Reihenfolge) oder None, wenn nichts zu tun / Kollision."""
    codes = [i for i, w in enumerate(werte) if ist_code(w)]
    if not codes or len(werte) < 2 or any(teilcode(w) or wortcode(w) for w in werte):
        return None
    staemme = [GR_ENDE.sub("", w.strip()) for w in werte if GR_ENDE.search(w.strip()) and re.search(r"\d", GR_ENDE.sub("", w.strip()))]
    if len(staemme) != len(set(staemme)):
        return None                                   # «Y043S, Y043M, Y043L»: Code + Grösse ohne Strich — die Grösse ist die Wahl
    zahlen = [re.findall(r"\d+", werte[i]) for i in codes]
    if all(z and len(z[-1]) <= 5 and int(z[-1]) % R["rund"] == 0 for z in zahlen):
        return None                                   # «AR2000 … AR7000»: Rollen-/Leistungsgrössen, keine Artikelnummern
    serie = {}
    for w in werte:
        m = SERIE.match((w or "").strip())
        if m:
            serie.setdefault(m[1], []).append(int(m[2]))
    wort = max(serie, key=lambda k: len(serie[k])) if serie else R["neu_wort"]
    n = max(serie.get(wort, [0]))
    neu = list(werte)
    for i in codes:
        n += 1
        neu[i] = f"{wort} {n}"
    if len({x.strip().lower() for x in neu}) != len(neu):
        return None
    return neu


def kanarien(still=False):
    f = 0
    for ein, soll in R["kanarien"]:
        ist = neu_werte(ein) or ein
        if ist != soll:
            f += 1
            print(f"  ✗ {ein} → {ist} (soll {soll})")
    if not still:
        print(f"FARBCODE-KANARIEN {len(R['kanarien']) - f}/{len(R['kanarien'])}")
    return f == 0


def paritaet():
    """py = js über alle Optionswerte des Exports (Farb-/Ausführungsoptionen)."""
    gruppen = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        for o in p.get("options") or []:
            if OPT.match(o["name"]):
                gruppen.append([v["name"] for v in o["optionValues"]])
    py = [neu_werte(g) for g in gruppen]
    js_code = ("import fs from 'node:fs'; import {codesNummerieren} from './automation/farbcode_modell.mjs';"
               "const g=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(JSON.stringify(g.map(codesNummerieren)));")
    r = subprocess.run(["/opt/node22/bin/node", "--input-type=module", "-e", js_code], input=json.dumps(gruppen),
                       capture_output=True, text=True, cwd=REPO, timeout=300)
    js = json.loads(r.stdout)
    ab = sum(a != b for a, b in zip(py, js))
    print(f"FARBCODE py=js: {len(gruppen)} Optionen, {sum(x is not None for x in py)} mit Codes, {ab} Abweichungen")
    return ab == 0


def kandidaten():
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        if IDS and p["id"] not in IDS:
            continue
        for o in p.get("options") or []:
            if OPT.match(o["name"]) and neu_werte([v["name"] for v in o["optionValues"]]):
                yield p
                break


def bearbeiten(pid):
    from kaufwille_zeile import gql
    p = gql('query($i:ID!){product(id:$i){id title status options{id name linkedMetafield{key} optionValues{id name}}}}',
            {"i": pid})["product"]
    if not p or p["status"] != "ACTIVE":
        return [("—", "", "", "nicht aktiv")]
    if GERAET.search(p["title"] or ""):
        return [("—", "", "", "fach-titel (gemeldet)")]
    erg = []
    for o in p["options"]:
        if not OPT.match(o["name"]):
            continue
        alt = [v["name"] for v in o["optionValues"]]
        neu = neu_werte(alt)
        if not neu:
            continue
        if o.get("linkedMetafield"):
            erg.append((o["name"], " | ".join(alt), "", "linkedMetafield")); continue
        name_neu = o["name"]
        if o["name"].lower() in ("farbe", "color", "colour") and all(re.fullmatch(rf"{R['neu_wort']} \d+", x) for x in neu):
            name_neu = R["optionsname_wenn_alle"]
        if any(x["name"] == name_neu for x in p["options"] if x["id"] != o["id"]):
            name_neu = o["name"]
        upd = [{"id": v["id"], "name": n} for v, n in zip(o["optionValues"], neu) if v["name"] != n]
        aend = " | ".join(f"{a}→{b}" for a, b in zip(alt, neu) if a != b)
        if not SCHARF:
            erg.append((o["name"] + (f"→{name_neu}" if name_neu != o["name"] else ""), aend, "", "trocken")); continue
        opt_in = {"id": o["id"]}
        if name_neu != o["name"]:
            opt_in["name"] = name_neu
        r = gql("mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,"
                "optionValuesToUpdate:$u,variantStrategy:LEAVE_AS_IS){userErrors{field message}}}",
                {"p": pid, "o": opt_in, "u": upd})["productOptionUpdate"]
        if r["userErrors"]:
            erg.append((o["name"], aend, "", "FEHLER " + r["userErrors"][0]["message"][:80])); continue
        rl = gql('query($i:ID!){product(id:$i){options{id name optionValues{id name}}}}', {"i": pid})["product"]["options"]
        o2 = next((x for x in rl if x["id"] == o["id"]), None)
        ok = o2 and o2["name"] == name_neu and [v["name"] for v in o2["optionValues"]] == neu
        erg.append((o["name"] + (f"→{name_neu}" if name_neu != o["name"] else ""), aend, "", "ok" if ok else "RÜCKLESEN ABWEICHEND"))
    return erg or [("—", "", "", "live nichts zu tun")]


def main():
    if not kanarien():
        raise SystemExit("Kanarien rot")
    if "--selbsttest" in sys.argv:
        sys.exit(0 if paritaet() else 1)
    if not os.path.exists(EXPORT):
        raise SystemExit(f"Export fehlt: {EXPORT}")
    kand = list(kandidaten())
    if MAX:
        kand = kand[:MAX]
    print(f"START {datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {len(kand)} Kandidaten · {'SCHARF' if SCHARF else 'TROCKEN'}")
    zahl = {}
    with open(LEDGER, "a", encoding="utf-8") as led:
        for p in kand:
            for opt, aend, _, st in bearbeiten(p["id"]):
                k = st.split(" ")[0]
                zahl[k] = zahl.get(k, 0) + 1
                print(f"  {st:10} {p['title'][:48]:48} {opt}: {aend[:150]}")
                if SCHARF:
                    led.write(f"{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{p['id']}\t{opt}\t{aend}\t{st}\n")
    print(f"FERTIG {datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {zahl}")


if __name__ == "__main__":
    main()
