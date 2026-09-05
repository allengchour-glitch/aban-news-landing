"""Setzt die MEHRZAHL als Tag — ohne sie findet die Shop-Suche fast nichts.

DER BEFUND, live an der Storefront gemessen:

    «kleid»      1000 Treffer   |   «kleider»       17
    «tasche»     1000           |   «taschen»      238
    «hose»        474           |   «hosen»         89
    «halskette»   396           |   «halsketten»    33
    «brille»      252           |   «brillen»       44

1'652 aktive Produkte tragen «Kleid» im Titel. Wer «kleider» eingibt — und das ist die
natürlichere Eingabe — bekommt siebzehn. Shopify beugt deutsche Mehrzahlformen nicht: Gesucht
wird nach ganzen Wörtern, und «Sommerkleid» enthält «kleider» nun einmal nicht.

⚠️ NICHT ALLE MEHRZAHLFORMEN SIND BETROFFEN, und das ist der Grund, warum es niemandem
aufgefallen ist: «uhr» 904 gegen «uhren» 968, «schuh» 823 gegen «schuhe» 1000 — beide gesund.
Dort steht die Mehrzahl zufällig ohnehin überall: im Tag «uhren», in der Kollektion
«herren-uhren», in Titeln wie «Herrenuhren-Set». Wo dieser Zufall fehlt, bricht die Suche ein.
Eine Stichprobe über EIN Wortpaar hätte hier «alles in Ordnung» gemeldet.

Die Auswahl der Wörter und die Ausschlüsse kommen aus `suchwort_tags.py` — eine zweite Liste
wäre eine zweite Wahrheit, und die erste Fassung dieses Katalogs hat schon einmal daran
gelitten, dass zwei Reiniger dieselbe Stelle gegenläufig anfassten. Das Muster trifft das
Grundwort NUR am Ende einer Zusammensetzung, «Kleiderbügel» und «Wandverkleidung» sind
deshalb von vornherein aussen vor.

DRY=1 meldet nur.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from suchwort_tags import GRUNDWOERTER, muster

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_suchwort_mehrzahl.txt"

# Nur die Formen, die live nachweislich einbrechen. Wo die Suche funktioniert, wird nichts
# angefasst — ein Tag, der nichts verbessert, ist nur Ballast im Katalog.
MEHRZAHL = {
    "kleid":     "kleider",
    "tasche":    "taschen",
    "hose":      "hosen",
    "kette":     "ketten",      # «halsketten» 33 gegen «halskette» 396
    "brille":    "brillen",
}


def gql(q, v=None):
    with open("/tmp/_sm.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sm.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(5)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    muster_je = {g: muster(g) for g in MEHRZAHL}
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE":
            continue
        t = p["title"]
        tl = t.lower()
        vorhanden = {x.lower() for x in (p.get("tags") or [])}
        neu = []
        for grund, mz in MEHRZAHL.items():
            if mz in vorhanden:
                continue
            if any(a in tl for a in GRUNDWOERTER.get(grund, [])):
                continue                       # Ausschlüsse aus der einen Wahrheit
            if muster_je[grund].search(t):
                neu.append(mz)
        if neu and p["id"] not in erledigt:
            aufgaben.append((p["id"], t, neu))

    from collections import Counter
    z = Counter(x for _, _, ns in aufgaben for x in ns)
    print(f"Produkte, denen die Mehrzahl fehlt: {len(aufgaben)}", flush=True)
    for w, n in z.most_common():
        print(f"   {n:>5}× «{w}»", flush=True)
    for _, t, ns in aufgaben[:10 if DRY else 4]:
        print(f"      {t[:52]:<54} + {','.join(ns)}", flush=True)
    if DRY or not aufgaben:
        return

    f = open(LEDGER, "a")
    getan = 0
    for gid, t, ns in aufgaben:
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": ns})
        if ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
            continue
        getan += 1
        # ⚠️ Nach JEDER Zeile auf die Platte. Der Suchwort-Lauf schrieb sein Ledger nur alle
        # 200 Zeilen und verlor nach jedem Turn-Abbruch alles — acht Minuten lang «lief» er
        # und hatte null Ergebnis.
        f.write(f"{gid}\t{','.join(ns)}\t{t}\n")
        f.flush()
        if getan % 200 == 0:
            print(f"   {getan}/{len(aufgaben)}", flush=True)
        time.sleep(0.25)
    print(f"FERTIG: {getan} Produkte mit Mehrzahl-Tag versehen")


if __name__ == "__main__":
    main()
