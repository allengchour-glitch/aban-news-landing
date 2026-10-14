"""schusswaffen_en_namen.py — englische CJ-Namen (productNameEn) der Bestandsware für die Schusswaffen-Zubehör-Regel.

BEFUND 14.10.2026 (Nachprüfung der Runde 12:26). Die Regel google_sperrliste.ist_schusswaffen_zubehoer() fand im ganzen
aktiven Bestand 10 Treffer — am Bild bestätigt sind aber ≥ 12 WEITERE Waffenteile, deren deutscher Titel die Ware nicht
nennt: «Multifunktions-Schraubenschlüssel» (AR-15-Schaftschlüssel), «Outdoor Carbon Entferner Werkzeug» (AR-15-Carbon-
Schaber), «T6 Taschenlampe Set» (Waffenlicht mit Schienenklemme und Druckschalter), «Taktische Sporttasche» (Dreifach-
Magazintasche), «Taktischer Angelrucksack, 85 cm» und «Taktische Angeltasche 100 cm» (Gewehrfutterale), «Infrarot-
Kalibrator» (Laser-Boresight) … Der Groq-Titel hat das Waffenwort weggelassen; im CJ-Namen steht es. Die Importer kennen
den CJ-Namen (en=productNameEn), der Bestandswächter nicht — dieses Werkzeug schliesst die Lücke für die Altware.

WAS ES TUT (nur lesen — Shopify UND CJ): wählt aktive Produkte mit CJ-SKU in Vorrang-Reihenfolge aus (1. Titel mit
taktisch/tactical/outdoor/militär/jagd/tarn/holster/schiene, 2. Typ «Werkzeug & Heimwerken», 3. «Sport & Outdoor»,
4. «Taschen»), holt je Produkt EINE CJ-Abfrage product/query (cj_stecker_pruefen.cj: Takt, Drossel, Tagesbudget →
geordneter Abbruch) und schreibt den Namen in den Cache dropship/_cj_name_en.tsv. Höchstens CAP Abfragen je Lauf
(Standard 150 ≈ 1'500 CJ-Punkte; GEMESSEN 14.10. nachmittags ~18 s je Abfrage hinter dem gemeinsamen CJ-Takt, 68 in
20 min → für 150 eine Stunde einplanen). Bereits gecachte Produkte werden übersprungen (Fehlschläge «-» nach 30 Tagen neu).

GEMESSENER NUTZEN (ehrlich): von 13 nur am Bild erkannten Waffenteilen trägt nur EINES ein Waffenwort im CJ-Namen
(«… Scope Bracket 20mm»), 68 weitere Namen der Klasse «taktisch/outdoor» brachten 0 neue Treffer. Der Cache ist ein
Zusatznetz für Altware mit verräterischem CJ-Namen — die Hauptlast tragen bild_geprueft und bild_pruefen.
Shopify bekommt KEINE Mutation; den Tag setzt ueberwachung_waffen_guard.py (liest den Cache, en=…).

    python3 automation/schusswaffen_en_namen.py --selbsttest          ohne Netz: Cache-Format + Auswahl-Kanarien
    CAP=150 python3 automation/schusswaffen_en_namen.py               Bestand nach Vorrang, höchstens CAP CJ-Abfragen
    python3 automation/schusswaffen_en_namen.py --ids 1,2,3           genau diese Shopify-Produkte (CAP gilt auch hier)
    python3 automation/schusswaffen_en_namen.py --bericht             Cache gegen die Regel (nur lesen, kein Netz)

Cache-Zeile (Tab): pid · cj-sku · Datum · Titel bei Abruf · Typ · productNameEn («-» = CJ ohne Antwort/kein CJ-Produkt).
"""
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)


def _repo():
    # Wie google_sperrliste._repo: läuft das Modul als /tmp-Spiegelkopie (Aufseher), wäre dirname(HIER) «/» und der Cache
    # still leer. Kandidaten: $REPO, Lage der Datei, Arbeitsverzeichnis, fester Pfad; gültig nur mit dropship/ UND automation/.
    for k in (os.environ.get("REPO"), os.path.dirname(HIER), os.getcwd(), "/home/user/aban-news-landing"):
        if k and os.path.isdir(os.path.join(k, "dropship")) and os.path.isdir(os.path.join(k, "automation")):
            return k
    return os.path.dirname(HIER)


REPO = _repo()
CACHE = os.path.join(REPO, "dropship", "_cj_name_en.tsv")
CAP = int(os.environ.get("CAP", "150"))
NEU_VERSUCH_TAGE = 30
HEUTE = time.strftime("%Y-%m-%d", time.gmtime())

# Vorrang-Klassen als Shopify-Suche (nur aktive). Reihenfolge = Reihenfolge der CJ-Abfragen.
KLASSEN = [
    # 14.10.2026 GEMESSEN (CAP=100, 68 Namen): mit «outdoor*»/«tarn*» bestand diese Klasse fast nur aus Outdoor-Kleidung,
    # -Uhren und -Rucksäcken — 0 neue Treffer. Jetzt nur die engen Wörter; «Sport & Outdoor» kommt als eigene Klasse.
    ("titel-verdacht", 'status:active AND (title:taktisch* OR title:tactical* OR title:militär* OR title:militaer* '
                       'OR title:military* OR title:jagd* OR title:holster* OR title:schiene* OR title:schienen* '
                       'OR title:kalibrator* OR title:molle* OR title:zielfernrohr* OR title:visier*)'),
    ("werkzeug", 'status:active AND product_type:"Werkzeug & Heimwerken"'),
    ("sport-outdoor", 'status:active AND product_type:"Sport & Outdoor"'),
    ("taschen", 'status:active AND product_type:Taschen'),
]
Q = ('query($c:String,$q:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
     'nodes{id title productType variants(first:1){nodes{sku}}}}}')


def _sauber(s):
    return re.sub(r"[\t\r\n]+", " ", str(s or "")).strip()


def cache_lesen(pfad=CACHE):
    """→ {pid: (sku, datum, titel, typ, name_en)}; letzte Zeile je pid gewinnt."""
    out = {}
    if not os.path.exists(pfad):
        return out
    for z in open(pfad, encoding="utf-8"):
        f = z.rstrip("\n").split("\t")
        if len(f) >= 6 and f[0].isdigit():
            out[f[0]] = tuple(f[1:6])
    return out


def en_namen(pfad=CACHE):
    """{pid: productNameEn} nur mit echtem Namen — für ueberwachung_waffen_guard.py (en=…)."""
    return {pid: v[4] for pid, v in cache_lesen(pfad).items() if v[4] and v[4] != "-"}


def faellig(eintrag):
    if not eintrag:
        return True
    if eintrag[4] and eintrag[4] != "-":
        return False
    try:
        alt = (time.mktime(time.strptime(HEUTE, "%Y-%m-%d")) - time.mktime(time.strptime(eintrag[1], "%Y-%m-%d"))) / 86400
    except ValueError:
        return True
    return alt >= NEU_VERSUCH_TAGE


def auswahl(gql, ids=None):
    """[(klasse, pid, titel, typ, sku)] in Vorrang-Reihenfolge, je pid einmal, nur mit CJ-SKU."""
    gesehen, out = set(), []
    if ids:
        q = ('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title productType status '
             'variants(first:1){nodes{sku}}}}}')
        for i in range(0, len(ids), 100):
            d = gql(q, {"ids": ["gid://shopify/Product/" + x for x in ids[i:i + 100]]})
            for n in d["nodes"]:
                if not n:
                    continue
                sku = ((n["variants"]["nodes"] or [{}])[0].get("sku") or "")
                out.append(("ids", n["id"].split("/")[-1], n["title"], n.get("productType") or "", sku))
        return out
    for name, such in KLASSEN:
        cur = None
        while True:
            d = gql(Q, {"c": cur, "q": such})
            pr = d["products"]
            for n in pr["nodes"]:
                pid = n["id"].split("/")[-1]
                sku = ((n["variants"]["nodes"] or [{}])[0].get("sku") or "")
                if pid in gesehen or not re.match(r"(?i)cj", sku):
                    continue
                gesehen.add(pid)
                out.append((name, pid, n["title"], n.get("productType") or "", sku))
            if not pr["pageInfo"]["hasNextPage"]:
                break
            cur = pr["pageInfo"]["endCursor"]
    return out


def holen(kandidaten, cap):
    import cj_stecker_pruefen as S   # erst hier: liest beim Import das Shopify-Token (Selbsttest läuft ohne)
    cache = cache_lesen()
    offen = [k for k in kandidaten if faellig(cache.get(k[1]))]
    print(f"Auswahl: {len(kandidaten)} · schon im Cache: {len(kandidaten) - len(offen)} · offen: {len(offen)} · "
          f"CAP {cap}", flush=True)
    n = gefunden = 0
    with open(CACHE, "a", encoding="utf-8") as f:
        for klasse, pid, titel, typ, sku in offen:
            if n >= cap:
                break
            url = S.cj_url(sku)
            if not url:
                name = "-"
            else:
                try:
                    d = S.cj(url)
                except SystemExit as e:          # Tagesbudget leer: geordnet aufhören, Cache ist Zeile für Zeile geschrieben
                    print(f"⏸ {e} — nach {n} Abfragen beendet", flush=True)
                    break
                n += 1
                name = _sauber(((d or {}).get("data") or {}).get("productNameEn")) or "-"
            if name != "-":
                gefunden += 1
            f.write("\t".join([pid, _sauber(sku), HEUTE, _sauber(titel)[:120], _sauber(typ)[:60], name]) + "\n")
            f.flush()
    print(f"FERTIG: {n} CJ-Abfragen, {gefunden} Namen in {os.path.relpath(CACHE, REPO)}", flush=True)


def bericht():
    import google_sperrliste as gs
    c = cache_lesen()
    treffer = []
    for pid, (sku, datum, titel, typ, en) in sorted(c.items()):
        if not en or en == "-":
            continue
        g = gs.ist_schusswaffen_zubehoer(titel, typ, [], "", en)
        g0 = gs.ist_schusswaffen_zubehoer(titel, typ, [], "", "")
        if g and not g0:
            treffer.append((pid, titel, en, g))
    print(f"Cache: {len(c)} Produkte, davon mit Namen {sum(1 for v in c.values() if v[4] not in ('', '-'))}; "
          f"nur dank CJ-Namen getroffen: {len(treffer)}")
    for pid, titel, en, g in treffer:
        print(f"  {pid}  {titel[:45]:<45} ← «{en[:70]}» → {g}")


def selbsttest():
    import tempfile
    import google_sperrliste as gs
    ok = True
    with tempfile.NamedTemporaryFile("w", suffix=".tsv", delete=False, encoding="utf-8") as t:
        t.write("123\tCJ-1\t2026-10-14\tT6 Taschenlampe Set\tSport & Outdoor\tTactical Weapon Light\n")
        t.write("456\tCJ-2\t2000-01-01\tX\tY\t-\n")
        t.write("kaputt\n")
    c = cache_lesen(t.name)
    e = en_namen(t.name)
    os.unlink(t.name)
    pruef = [("Cache 2 Zeilen", len(c) == 2), ("en_namen nur echte Namen", e == {"123": "Tactical Weapon Light"}),
             ("gefundener Name nie neu", not faellig(c["123"])), ("Fehlschlag alt → neu", faellig(c["456"])),
             ("Fehlschlag heute → nicht neu", not faellig(("CJ-3", HEUTE, "", "", "-"))),
             ("Tab im Namen bereinigt", _sauber("a\tb\nc") == "a b c")]
    n, f = gs.schusswaffen_kanarien()
    pruef.append((f"Regel-Kanarien {n - len(f)}/{n}", not f))
    for name, gut in pruef:
        print(f"  {'✓' if gut else '✗'} {name}")
        ok &= gut
    print("SELBSTTEST", "GRÜN" if ok else "ROT")
    return ok


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if "--bericht" in sys.argv:
        bericht()
        return
    from kaufwille_zeile import gql
    ids = None
    if "--ids" in sys.argv:
        ids = [x for x in sys.argv[sys.argv.index("--ids") + 1].split(",") if x.strip().isdigit()]
    holen(auswahl(gql, ids), CAP)


if __name__ == "__main__":
    main()
