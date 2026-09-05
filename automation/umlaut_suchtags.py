"""Macht die Suche auch ohne Umlaute auffindbar — «maentel» findet heute NICHTS.

LIVE AN DER STORefront GEMESSEN, nicht geschätzt:

    «mäntel»    192  |  «maentel»      0
    «grösse»   1000  |  «groesse»     11
    «höhe»     1000  |  «hoehe»       44
    «für»      1000  |  «fuer»       516
    «schürze»    60  |  «schuerze»    27

Wer «maentel» eingibt, bekommt eine leere Seite — und das ist keine exotische Eingabe: auf
Schweizer Tastaturen und in vielen Handy-Layouts ist die Umschreibung ae/oe/ue gebräuchlich,
und wer aus dem Ausland sucht, hat die Umlaute oft gar nicht. Shopify normalisiert das nicht.

⚠️ NICHT JEDES PAAR IST BETROFFEN, und das ist der Grund, warum es nie auffiel: «küche» 1000
gegen «kueche» 1000 — dort steht die Umschreibung zufällig ohnehin überall im Katalog. Eine
Stichprobe über EIN Wortpaar hätte «alles in Ordnung» gemeldet. Dieselbe Falle wie bei den
Mehrzahlformen.

DER WEG: Tags sind indiziert. Jedes Produkt, dessen TITEL ein Umlautwort trägt, bekommt die
umschriebene Form als Tag. 14'538 aktive Produkte haben mindestens ein solches Wort.

⚠️ NUR AUS DEM TITEL, nicht aus der Beschreibung. Die Beschreibung enthält Bausteine, die in
JEDEM Produkt stehen («Gratis-Versand», «Rückgabe», «Grösse»); daraus gebaute Tags wären
wertlos und würden jeden Suchbegriff auf den ganzen Katalog werfen — genau der Fehler, den
der cat_tags-Mapper schon einmal gemacht hat («cat_tags NUR auf Titel — Beschreibung
übertaggt!»).

⚠️ HÖCHSTENS FÜNF NEUE TAGS JE PRODUKT. Sonst bläht ein Titel wie «Gefütterte Umhängetasche
mit Rüschen für Mädchen» die Tag-Liste auf und macht die Kollektions-Smart-Regeln unscharf.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
QUELLE = os.environ.get("QUELLE", "/tmp/opts.jsonl")
LEDGER = "dropship/_umlaut_suchtags.txt"
MAXNEU = 5

UM = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}
WORT = re.compile(r'[A-Za-zÄÖÜäöüß]{4,}')

# Wörter, deren Umschreibung nichts bringt oder schadet: reine Füllwörter und solche, die
# ohnehin im ganzen Katalog stehen.
STOPP = {"fuer", "fuers", "ueber", "waehrend", "gegenueber", "ausserdem"}


def umschreiben(w):
    n = w.lower()
    for a, b in UM.items():
        n = n.replace(a, b)
    return n


def gql(q, v=None):
    with open("/tmp/_um.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_um.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(4)
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

    aufgaben = []
    for zeile in open(QUELLE):
        d = json.loads(zeile)
        if "options" not in d or d["id"] in erledigt:
            continue
        titel = d.get("title") or ""
        neu = []
        for w in WORT.findall(titel):
            if not re.search(r'[äöüÄÖÜß]', w):
                continue
            u = umschreiben(w)
            if u in STOPP or u in neu:
                continue
            neu.append(u)
        if neu:
            aufgaben.append((d["id"], titel, neu[:MAXNEU]))

    from collections import Counter
    z = Counter(x for _, _, ns in aufgaben for x in ns)
    print(f"Produkte, die ohne Umlaut nicht gefunden werden: {len(aufgaben)}", flush=True)
    for w, n in z.most_common(8):
        print(f"   {n:>5}× «{w}»", flush=True)
    for _, t, ns in aufgaben[:6]:
        print(f"      {t[:50]:<52} + {','.join(ns)}", flush=True)
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
        f.write(f"{gid}\t{','.join(ns)}\t{t[:60]}\n")
        f.flush()
        if getan % 250 == 0:
            print(f"   {getan}/{len(aufgaben)}", flush=True)
        time.sleep(0.22)
    print(f"FERTIG: {getan} Produkte auch ohne Umlaut auffindbar.")


if __name__ == "__main__":
    main()
