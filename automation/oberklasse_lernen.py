#!/usr/bin/env python3
"""oberklasse_lernen.py — Neuimporte auf groben Google-Oberklassen verfeinern, mit Regeln GELERNT aus geprüften Urteilen (08.10.2026).

ANLASS (Verbesserungsrunde 08.10., Plan-Tag 8). GEMESSEN 08.10. 00:40 UTC: von 2'642 aktiven Neuimporten seit 01.10. stehen
483 bei Google auf einer OBERKLASSE (Hardware > Tools 122, Pet Supplies 50, Party Supplies 32, Clothing 18, Lighting 17 …),
im Schnitt ~70 je Tag — die CJ-Gruppe stempelt nur den Korb. Am 07.10. wurden 12'583 solche Produkte EINZELN am Titel
beurteilt (Prüfer + Taxonomie-Validierung, 8'477 verfeinert, Rücklesen 40/40). Ohne Wächter füllt sich der Korb neu.

METHODE (nie raten):
  * Trainingsdaten: automation/data/oberklasse_training.jsonl = {titel, alt (grobe Google-Klasse), neu (geprüfter Pfad oder
    "" = bleibt)} aus den Urteilen vom 07.10. (Runde 1 + 2, 16'351 Beispiele).
  * Merkmale: Titelwörter (≥ 4 Buchstaben) + KOPFWÖRTER in Komposita («Hundepullover» → «pullover», wenn «pullover» im
    Wortschatz allein vorkommt).
  * Regel (alt, Merkmal) → Ziel nur bei Beleg ≥ MIN_BELEG und Reinheit ≥ MIN_REIN; «bleibt» ist ebenfalls ein Ziel (Veto).
    Zweigwechsel (Ziel nicht unter alt) brauchen strengere Werte.
  * Anwenden: ALLE feuernden Regeln eines Titels müssen dasselbe Ziel nennen, sonst nichts (Widerspruch = grob lassen).
  * Gegenprobe (`--pruefen`): Lernen auf 80 %, Trefferquote auf den übrigen 20 % — der Lauf schreibt nur, wenn die
    Präzision ≥ 95 % ist (sonst Abbruch).
  * Nie: Kostüm, Tabak, Klinge, Erotik (Titelwort-Sperre); Shopify-Klasse aus Shopifys Zuordnung (+ kategorie_fein.ZUSATZ),
    eine feinere oder geschützte Shopify-Klasse bleibt.
DRY (Standard) zeigt Plan + Stichproben; SCHARF=1 schreibt (kosmetik_fein.schreiben, Rücklesen), Ledger
dropship/_oberklasse_lernen.tsv. Täglich im Aufseher (TAGE=14: nur jüngere Neuimporte). KI_EXPORT=datei legt den Rest OHNE
Regel im Format von google_fein_ki.py ab — der Aufseher lässt danach die Zwei-Modell-KI-Stufe darüber laufen (die alte
KI-Stufe war ein einmaliger Lauf über einen festen Export vom 02.10. und sah keine Neuimporte).

  python3 automation/oberklasse_lernen.py --pruefen     # Gegenprobe 80/20
  python3 automation/oberklasse_lernen.py               # Trockenlauf über Neuimporte der letzten TAGE (Standard 14)
  SCHARF=1 python3 automation/oberklasse_lernen.py
"""
import collections, datetime, hashlib, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
TRAIN = os.path.join(HIER, "data", "oberklasse_training.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_oberklasse_lernen.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
TAGE = int(os.environ.get("TAGE", "14"))
ZEIGEN = int(os.environ.get("ZEIGEN", "40"))
MIN_BELEG, MIN_REIN = 4, 0.92
MIN_BELEG_X, MIN_REIN_X = 8, 0.95          # Zweigwechsel
MIN_BELEG_K, MIN_REIN_K = 3, 0.90          # Rückfall Kopfwort (nur Verfeinerung unterhalb der heutigen Klasse)
BLEIBT = "="
# 09.10.2026: Wortgrenzen. Ohne sie sperrte die Liste ~300 harmlose Titel von jeder Verfeinerung: «Unisex» (163, «sex»),
# «Waffelstrick/Waffeleisen» (~50, «waffe»), «Türklingel» («klinge»), «Puls-/Höhen-/Winkelmesser», «Durchmesser» (~40,
# «messer» = Messgerät), «Pulloverkleid» («verkleid»), «Zigarettenanzünder» (Auto-Zubehör). Kanarien: SPERRE_KANARIEN.
_L = r"(?<![a-zäöüß])"
SPERRE = re.compile(
    r"kostüm|cosplay|" + _L + r"verkleid|tabak|zigar(?!ettenanzünder|renanzünder)|shisha|vape|klinge(?!l)|"
    r"" + _L + r"messer|(?:küchen|taschen|jagd|steak|brot|obst|schnitz|klapp|survival|kampf|wurf|butterfly|filet|santoku|"
    r"chef|koch|gemüse|schäl|fleisch|käse|tomaten|pizza|keramik|damast|camping|outdoor)messer|"
    r"schwert|dolch|machete|axt\b|erotik|" + _L + r"sex|dessous|vibrator|waffe(?!l)|munition", re.I)
SPERRE_KANARIEN = [
    ("Unisex Baseball-Cap", False), ("Waffelstrick Henley", False), ("Herzli-Waffeleisen", False),
    ("WLAN Video-Türklingel", False), ("Smart-Armband mit Herzfrequenzmesser", False), ("Gymnastikring 80 cm Durchmesser", False),
    ("Pailletten-Pulloverkleid", False), ("Auto-Zigarettenanzünder mit USB", False), ("Infrarot-Laser-Entfernungsmesser", False),
    ("Kinderkostüm Hexe", True), ("Küchenmesser-Schärfer 12 Zoll", True), ("Messerblock aus Akazienholz", True),
    ("Sparschäler mit Zirkonia-Klinge", True), ("Metall-Kohlezange für Shisha", True), ("Halloween Verkleidung Vampir", True),
    ("Spitzen-Dessous-Set", True), ("Sexy Spitzen-Body", True), ("Wasserpistole Waffe", True), ("Zigarren-Hygrometer", True),
    ("Taschenmesser mit 12 Funktionen", True), ("USB-Mini-Blender mit 6 Messern", True)]


def sperre_kanarien():
    f = [(t, s) for t, s in SPERRE_KANARIEN if bool(SPERRE.search(t)) != s]
    for t, s in f:
        print(f"  ✗ SPERRE {t!r}: soll {'gesperrt' if s else 'frei'}")
    return not f
SCHUTZ_SHOPIFY = ("tg-5-12-2", "aa-1-25", "el-13")


FUELL = {"set", "sets", "stück", "stueck", "teilig", "design", "stil", "style", "premium", "modell", "farbe", "farben", "grösse",
         "groesse", "kinder", "damen", "herren", "frauen", "männer", "zuhause", "haushalt", "alltag", "outdoor", "reise", "geschenk",
         "geschenkset", "zubehör", "zubehoer", "pack", "paar", "packung", "edition", "version", "serie", "optik", "look", "motiv",
         "muster", "material", "qualität", "funktion", "schweiz", "luxestyle", "diy", "mini", "maxi", "plus", "pro", "neu", "kit"}


TRENNER = re.compile(r"\s(?:mit|für|fuer|aus|zum|zur|von|in|im|inkl\.?|und|&|für)\s|\s[–—-]\s|[,·(«\"|/:]", re.I)
ENDUNG = re.compile(r"(ige|iger|iges|igen|liche|licher|liches|lichen|bare|barer|bares|isch|ische|ischer|ischen|ende|ender|endes|"
                    r"ene|ener|enes|te|ter|tes|ten)$")


def woerter(titel):
    """Kopfwort der Ware: der Abschnitt VOR «mit/für/aus/…» trägt das Produkt («Leckschale mit Ball für Hunde» = Leckschale);
    darin das letzte Nomen, bei Bindestrich-Ketten der letzte Teil («Pizza-Schaufel-Set» → Schaufel, «Set» ist Füllwort).
    Gegenprobe 07.10.: alle Titelwörter 92,1 %, nur Nomen 93,0 % — Nebenwörter («Ball», «Set», «handgemacht») führten."""
    kopf = TRENNER.split(" " + (titel or "") + " ")[0]
    # 09.10.2026: «Hundeschüssel Anti-Rutsch» → Kopfwort war «Rutsch». Anti-Ketten (Anti-Rutsch, Anti-Kratz …) sind Merkmale.
    kopf = re.sub(r"(?<![A-Za-zÄÖÜäöüß])Anti-[A-Za-zÄÖÜäöüß-]+", " ", kopf)
    teile = [t for w in re.findall(r"[A-Za-zÄÖÜäöüß-]+", kopf) for t in w.split("-") if t]
    nomen = [t.lower() for t in teile if len(t) >= 4 and t[0].isupper() and t.lower() not in FUELL and not ENDUNG.search(t.lower())]
    return nomen[-1:] if nomen else []


def merkmale(titel, schatz):
    """Kopfwort + dessen Kompositum-Kopf («Hundepullover» → «pullover», wenn «pullover» im Wortschatz allein vorkommt)."""
    m = set()
    for w in woerter(titel):
        m.add(w)
        for i in range(1, len(w) - 4):
            if w[i:] in schatz:
                m.add(w[i:])
    return m


def lernen(beispiele):
    schatz = collections.Counter(w for b in beispiele for w in set(woerter(b["titel"])))
    schatz = {w for w, n in schatz.items() if n >= 3}
    zaehler = collections.defaultdict(collections.Counter)
    for b in beispiele:
        ziel = b["neu"] or BLEIBT
        for f in merkmale(b["titel"], schatz):
            zaehler[(b["alt"], f)][ziel] += 1
    regeln = {}
    for (alt, f), c in zaehler.items():
        ziel, n = c.most_common(1)[0]
        ges = sum(c.values()); rein = n / ges
        quer = ziel != BLEIBT and not ziel.startswith(alt + " > ")
        if (quer and n >= MIN_BELEG_X and rein >= MIN_REIN_X) or (not quer and n >= MIN_BELEG and rein >= MIN_REIN):
            regeln[f"{alt}\t{f}"] = [ziel, n, round(rein, 3)]
    # Rückfall: Kopfwort allein → Feinklasse (über alle Oberklassen gelernt; Wahrheit = geprüfter Pfad, «bleibt» = alte Klasse)
    kopf = collections.defaultdict(collections.Counter)
    for b in beispiele:
        for f in merkmale(b["titel"], schatz):
            kopf[f][b["neu"] or b["alt"]] += 1
    kopfregeln = {}
    for f, c in kopf.items():
        ziel, n = c.most_common(1)[0]
        if n >= MIN_BELEG_K and n / sum(c.values()) >= MIN_REIN_K:
            kopfregeln[f] = [ziel, n, round(n / sum(c.values()), 3)]
    return {"schatz": sorted(schatz), "regeln": regeln, "kopf": kopfregeln}


AK = "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Craft Kits"
FEST = [  # Bastelsets: das Kopfwort («Leinwandbild») täuscht, die Technik entscheidet (Gegenprobe 08.10.)
    (re.compile(r"malen nach zahlen|paint by numbers", re.I), AK + " > Drawing & Painting Kits"),
    (re.compile(r"diamond[\s-]?painting|diamant[\s-]?mal", re.I), AK + " > Mosaic Kits"),
    (re.compile(r"kreuzstich|stickset|stick-set|stickbild|stickerei[\s-]?set|cross[\s-]?stitch", re.I), AK + " > Needlecraft Kits"),
]


def urteil(modell, alt, titel, schatz=None):
    """Ziel-Pfad, BLEIBT oder None (keine/streitende Regel)."""
    if SPERRE.search(titel or ""):
        return None
    if alt.startswith(("Arts & Entertainment", "Home & Garden > Decor")):
        for rx, z in FEST:
            if rx.search(titel or ""):
                return z
    schatz = schatz if schatz is not None else set(modell["schatz"])
    mm = merkmale(titel, schatz)
    ziele = {modell["regeln"][f"{alt}\t{f}"][0] for f in mm if f"{alt}\t{f}" in modell["regeln"]}
    if ziele:
        return ziele.pop() if len(ziele) == 1 else None
    # Rückfall: Kopfwort-Regel, NUR wenn ihr Ziel unterhalb der heutigen Oberklasse liegt (zwei Signale einig)
    k = {modell["kopf"][f][0] for f in mm if f in modell.get("kopf", {})}
    k = {z for z in k if z.startswith(alt + " > ")}
    return k.pop() if len(k) == 1 else None


TRAIN_KI = os.path.join(HIER, "data", "oberklasse_training_ki.jsonl")   # 09.10.: KI-Urteile (beide Modelle einig), oberklasse_nachlernen.py


def lade_training():
    alle = [json.loads(l) for l in open(TRAIN, encoding="utf-8")]
    if os.path.exists(TRAIN_KI):
        alle += [json.loads(l) for l in open(TRAIN_KI, encoding="utf-8")]
    return alle


def pruefen(drucken=True):
    alle = lade_training()
    test = [b for b in alle if int(hashlib.md5(b["titel"].encode()).hexdigest(), 16) % 5 == 0]
    train = [b for b in alle if int(hashlib.md5(b["titel"].encode()).hexdigest(), 16) % 5 != 0]
    m = lernen(train); schatz = set(m["schatz"])
    gefeuert = richtig = 0; fehl = []
    for b in test:
        z = urteil(m, b["alt"], b["titel"], schatz)
        if z is None or z == BLEIBT:
            continue
        gefeuert += 1
        wahr = b["neu"] or b["alt"]
        if z == wahr or z.startswith(wahr + " > ") or wahr.startswith(z + " > "):
            richtig += 1          # gleich oder auf demselben Ast (feiner/gröber als der Prüfer, aber nicht falsch)
        elif len(fehl) < 25:
            fehl.append((b["titel"][:50], z.split(" > ")[-1], (b["neu"] or "bleibt").split(" > ")[-1]))
    soll = sum(1 for b in test if b["neu"])
    praez = richtig / gefeuert if gefeuert else 0
    if drucken:
        print(f"GEGENPROBE: {len(train)} Lern-/{len(test)} Testbeispiele · Regeln {len(m['regeln'])} · gefeuert {gefeuert} · "
              f"verträglich {richtig} · Präzision {praez:.1%} · Abdeckung {richtig}/{soll} geprüfte Verfeinerungen")
        for f in fehl:
            print("   ✗", f)
    return praez


def main():
    import kategorie_fein as kf
    import kosmetik_fein as kos
    from kaufwille_zeile import gql
    if not sperre_kanarien():
        raise SystemExit("SPERRE-Kanarien rot — nichts geschrieben")
    praez = pruefen(drucken=True)
    if praez < 0.95:
        raise SystemExit(f"Präzision {praez:.1%} < 95 % — nichts geschrieben")
    modell = lernen(lade_training()); schatz = set(modell["schatz"])
    gueltig = kos.google_taxonomie()
    karte = json.load(open(kf.KARTE, encoding="utf-8"))["karte"]
    ab = (datetime.datetime.utcnow() - datetime.timedelta(days=TAGE)).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        erledigt = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8")}
    except OSError:
        erledigt = set()
    plan = []; st = collections.Counter(); cur = None; bsp = collections.defaultdict(list); rest = []
    for _ in range(200):
        r = gql('query($c:String,$q:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id title '
                'category{id} tags pub:publishedOnPublication(publicationId:"gid://shopify/Publication/302872297857") '
                'g:metafield(namespace:"mm-google-shopping",key:"google_product_category"){value}}}}',
                {"c": cur, "q": f"created_at:>={ab} status:active"})
        for p in r["products"]["nodes"]:
            alt = (p["g"] or {}).get("value") or ""
            if alt not in ALTE:
                continue
            st["grob"] += 1
            if p["id"] in erledigt:
                st["schon"] += 1; continue
            z = urteil(modell, alt, p["title"], schatz)
            if z is None:
                st["keine-regel"] += 1
                rest.append({"id": p["id"], "title": p["title"], "tags": p.get("tags") or [], "g": bool(p.get("pub")),
                             "gk": {"value": alt}})
                continue
            if z == BLEIBT:
                st["bleibt"] += 1; continue
            if z not in gueltig:
                st["pfad-ungueltig"] += 1; continue
            cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
            sid = kos.shopify_ziel(z, karte) or cid
            if cid and (cid.startswith(SCHUTZ_SHOPIFY) or cid.startswith(sid + "-")):
                sid = cid
            plan.append((p["id"], z, sid)); st["plan"] += 1
            if len(bsp[z]) < 3:
                bsp[z].append(p["title"][:55])
        if not r["products"]["pageInfo"]["hasNextPage"]:
            break
        cur = r["products"]["pageInfo"]["endCursor"]
    gs = kf.ids_pruefen({x[2] for x in plan if x[2]}) if plan else set()
    plan = [x for x in plan if x[2] in gs]
    print("Stand:", dict(st))
    for z, n in collections.Counter(x[1] for x in plan).most_common(ZEIGEN):
        print(f"  {n:4} → {z}  e.g. {bsp[z]}")
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 25):
                for pid, s, g, sid, fehler in kos.schreiben(plan[i:i + 25]):
                    f.write(f"{pid}\t{s}\t{g}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{fehler}\n")
                    ok += s == "gesetzt"; fe += s == "fehler"
                f.flush(); time.sleep(0.5)
    if os.environ.get("KI_EXPORT"):
        # Rest ohne Regel → Export im Format von google_fein_ki.py (Zwei-Modell-Einigkeit, nur innerhalb der Oberklasse)
        with open(os.environ["KI_EXPORT"], "w", encoding="utf-8") as f:
            for x in rest:
                f.write(json.dumps(x, ensure_ascii=False) + "\n")
        print(f"  KI-Export: {len(rest)} ohne Regel → {os.environ['KI_EXPORT']}")
    print(f"OBERKLASSE-LERNEN: {len(plan)} verfeinerbar{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · "
          f"grob {st['grob']} · ohne Regel {st['keine-regel']} · Gegenprobe {praez:.1%}")


ALTE = set()
if __name__ == "__main__":
    _tax = [m.group(1) for l in open(os.environ.get("TAXO", "/tmp/gtaxo.txt"), encoding="utf-8")
            if (m := re.match(r"\d+ - (.+)", l.strip()))] if os.path.exists(os.environ.get("TAXO", "/tmp/gtaxo.txt")) else []
    _hat_kinder = {t.rsplit(" > ", 1)[0] for t in _tax if " > " in t}
    # nur echte OBERKLASSEN (Google-Klassen mit Unterklassen) — Schuhe/Rucksäcke/Jacken sind Blätter (Messung 08.10.)
    ALTE = {b["alt"] for b in lade_training()} & _hat_kinder        # 09.10.: auch Oberklassen aus den KI-Lerndaten
    if "--pruefen" in sys.argv:
        sys.exit(0 if pruefen() >= 0.95 else 1)
    main()
