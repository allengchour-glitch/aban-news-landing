#!/usr/bin/env python3
"""social_saison_vorrang.py — Saison-Ware (Herbst) zuerst in alle Social-Queues (25.09.2026, Betreiber «herbstsachen auf sozial pushen»).

GEMESSEN vorher: 0 von 107 wartenden Reel-/Bild-Posts waren Herbstartikel. Karussell, Pinterest und TikTok-Sets hatten schon
Herbst-Vorrang; Reels (IG/FB), Bild-Posts und TikTok/Shorts über Metricool nicht — der Bild-Nachschub nahm nur die neuesten
CJ-Produkte, der Reel-Motor ordnet nach hype/neu.

Schreibt (idempotent, täglich im Aufseher):
  dropship/_social_vorrang.txt  «handle<TAB>bis»  → Bild-, Reel- und Metricool-Poster ziehen diese Zeilen vor (post_guard.nachVorrang)
  dropship/_reel_vorrang.txt    «cj-pid<TAB>bis»  → der Reel-Motor baut Reels dieser Produkte zuerst (nur wenn CJ ein Video hat)
Fremde Zeilen in _reel_vorrang.txt (z. B. Halloween) bleiben stehen. Kadenz und alle Sperren bleiben unverändert.
ENV: TAG (Std. herbst-2026), BIS (Std. 2026-11-30)

22.10.2026 (Prüfung): Lizenzfiguren (Batman, Disney, Eiskönigin …) bewerben wir nicht selbst (Regel 24.09.). Diese Liste wird täglich NEU aus Tags erzeugt und
trug keinen Lizenzfilter: GEMESSEN standen 80 Lizenz-Handles in `_social_vorrang.txt`, die die Poster zuerst zogen. Jetzt filtert `behalte()` am Titel mit derselben Liste wie die
Poster (bild_reel_auswahl.LIZENZ_FIGUR; Gleichlauf aller Kopien: lizenz_figur_paritaet.py).
  python3 automation/social_saison_vorrang.py --selbsttest
"""
import os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kollektionstexte_nachbessern import gql  # noqa: E402
from bild_reel_auswahl import LIZENZ_FIGUR  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = os.environ.get("TAG", "herbst-2026")
BIS = os.environ.get("BIS", "2026-11-30")
EXTRA_TAGS = [t for t in os.environ.get("EXTRA_TAGS", "kunden-liebling,nachfrage-liebling,ersatz-wickelset-0928").split(",") if t]
# 28.09.2026 (Betreiber «alles andere weiter pushen bis einkauf kommt», dropship/KASSE-ABBRUCH-2026-09-28.md): 9 Kassen-Sitzungen,
# 1 Kauf; CJ-Lieferzeit 2–4 Wochen ist der wahrscheinlichste Abbruchgrund. CH-Lager (Fortura, 2–3 Werktage, 2'394 aktiv) NACH der
# Saison-Ware, vor allem übrigen — reine Reihenfolge, keine Kadenz- oder Sperränderung.
NACH_TAGS = [t for t in os.environ.get("NACH_TAGS", "ch-lager").split(",") if t]
HANDLES = os.path.join(REPO, "dropship/_social_vorrang.txt")
REEL = os.path.join(REPO, "dropship/_reel_vorrang.txt")


def behalte(titel):
    """Rein: darf das Produkt in die Vorrangliste? Lizenzfiguren nie (am Titel; Plüsch, Ballone, Perücken tragen keinen Lizenz-Tag)."""
    return not LIZENZ_FIGUR.search(titel or "")


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        for t in ("Batman Kostüm für Kinder", "Disney Eiskönigin Kleid", "Spider-Man Rucksack", "Pennywise Maske"):
            if m.behalte(t):
                f.append(f"A «{t}» darf nicht in die Vorrangliste")
        for t in ("Herbstkranz mit Beeren", "Wollschal Karo", "Disneyland Ticket-Halter", None):
            if not m.behalte(t):
                f.append(f"B «{t}» darf bleiben")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Filter aus", "return not LIZENZ_FIGUR.search(titel or \"\")", "return True"),
           ("Filter invertiert", "return not LIZENZ_FIGUR.search(titel or \"\")", "return bool(LIZENZ_FIGUR.search(titel or \"\"))")]
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
    print(f"SELBSTTEST OK: 8 Titel, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


def main():
    if time.strftime("%Y-%m-%d") > BIS:
        open(HANDLES, "w").close()
        print(f"FERTIG: Saison vorbei ({BIS}) — Vorrangliste geleert")
        return
    hs, pids = [], []
    lizenz = 0
    # 28.09.2026 (Betreiber «push mehr etwas das leute kaufen»): zusätzlich die nachweislich gekauften Artikel (Tag
    # kunden-liebling, gesetzt aus ShopifyQL «orders GROUP BY product_title») und der Ersatz für die meistbesuchte Seite
    # (ersatz-wickelset-0928). Sie stehen VOR der Saison-Ware; die Saison-Zählung «0 Produkte → nicht überschreiben» gilt weiter.
    for tag in EXTRA_TAGS + [TAG] + NACH_TAGS:
        c = None
        while True:
            r = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{handle title variants(first:1){nodes{sku}}}}}', {"q": f"tag:{tag} status:active", "c": c})["products"]
            for n in r["nodes"]:
                if n["handle"] in hs:
                    continue
                if not behalte(n.get("title")):
                    lizenz += 1
                    continue
                hs.append(n["handle"])
                m = re.match(r"CJ-([0-9A-Za-z-]{10,})", (n["variants"]["nodes"] or [{}])[0].get("sku") or "")
                if m:
                    pids.append(m.group(1))
            if not r["pageInfo"]["hasNextPage"]:
                break
            c = r["pageInfo"]["endCursor"]
    if not hs:
        print("⚠️ 0 Produkte mit Tag — Vorrangliste NICHT überschrieben (Messfehler ≠ leere Saison)")
        return
    with open(HANDLES + ".tmp", "w") as fh:
        fh.writelines(f"{h}\t{BIS}\n" for h in hs)
    os.replace(HANDLES + ".tmp", HANDLES)
    alt = [z.rstrip("\n") for z in open(REEL)] if os.path.exists(REEL) else []
    fremd = [z for z in alt if z and z.split("\t")[0] not in set(pids)]
    with open(REEL + ".tmp", "w") as fh:
        fh.writelines(z + "\n" for z in fremd)          # Halloween & Co. zuerst — sie laufen früher ab
        fh.writelines(f"{p}\t{BIS}\n" for p in pids)
    os.replace(REEL + ".tmp", REEL)
    print(f"FERTIG: {len(hs)} Handles Vorrang (Bild/Reel/Metricool), {len(pids)} CJ-pids Reel-Vorrang, {len(fremd)} fremde Reel-Zeilen behalten, {lizenz} Lizenzfiguren ausgelassen")


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    main()
