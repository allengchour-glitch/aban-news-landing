"""Macht deutsche Zusammensetzungen auffindbar — über Tags, ohne einen Titel anzufassen.

DER BEFUND (Live-Test mit 25 Kundenbegriffen, 12.08.2026): Die Shop-Suche findet ein Wort nur,
wenn es als EIGENES Wort dasteht. Steht das Grundwort am Ende einer Zusammensetzung, ist das
Produkt über keine Ergebnisseite erreichbar:

    «koffer»  → 25 Treffer, im Sortiment sind 64. Alle Reise-, Roll-, Hartschalen- und
                Kabinenkoffer fehlen.
    «mantel»  → 53 Treffer, es fehlen 117 Woll-, Daunen- und Kunstpelzmäntel.
    «mütze»   → 29 Treffer statt 57.

In sieben durchgeblätterten Kategorien waren 286 von 318 Produkten (89 %) unauffindbar. Die
Ursache ist gemessen: Handkuratierte Ware schreibt «Trolley-Koffer» MIT Bindestrich und wird
gefunden; der CJ-Importer schreibt «Reisekoffer» ohne Trennzeichen und wird es nicht.

WARUM TAGS UND NICHT TITEL: Shopify durchsucht Titel, Warengruppe, Anbieter UND Tags. Ein Tag
ist unsichtbar für die Kundin, ändert weder den Feed noch die SEO noch die Kollektionsregeln,
und lässt sich jederzeit wieder entfernen. Den Titel «Reisekoffer» zu «Reise-Koffer» zu
zerlegen wäre der Eingriff mit der grösseren Wirkung — und dem grösseren Schaden, wenn er
danebengeht.

DAZU DIE UMLAUT-LÜCKE: Wer «guertel», «buegel», «handyhuelle» oder «schluesselanhaenger»
eintippt — also ohne Umlaut, wie auf vielen Tastaturen üblich — bekommt NULL Treffer, während
«muetze» zufällig funktioniert. Für jedes Grundwort mit Umlaut wird deshalb auch die
umlautfreie Schreibweise als Tag gesetzt.

⚠️ DIE FALLE, DIE HIER TEUER WÄRE, IST BEKANNT: «Handschuh» endet auf «schuh», ist aber kein
Schuh. «Armbanduhr» endet auf «uhr» und ist eine Uhr — aber sie enthält auch «armband» und ist
kein Armband. «Hundegeschirr» ist kein Geschirr. Solche Paare stehen als Ausnahmen unten; ohne
sie füllt dieser Lauf die Schuhsuche mit Handschuhen. Genau daran ist im Juli schon einmal
eine Tag-Chirurgie gescheitert («schleif» traf «Schleife», «rock» traf «GT Line ROCK»).

DRY=1 zeigt je Grundwort die Treffer und die abgewiesenen Ausnahmen.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_suchwort_tags.txt"

# Grundwort → Wörter, die davorstehen dürfen NICHT gelten (die Zusammensetzung meint etwas
# anderes). Leere Liste = keine bekannte Falle.
GRUNDWOERTER = {
    "koffer":      ["kuehl"],                       # Kühlkoffer ist eine Box, kein Reisekoffer
    "mantel":      ["reifen", "schutz"],            # Reifenmantel, Schutzmantel
    "muetze":      [],
    "jacke":       [],
    "hose":        ["schlauch"],
    "kleid":       [],
    "rock":        ["barock", "line"],              # «GT Line ROCK» ist ein Werkzeugkoffer
    "schuh":       ["hand", "pferde", "brems"],     # Handschuh, Hufeisen-Zubehör, Bremsschuh
    "stiefel":     [],
    "tasche":      ["hosen", "brust", "seiten"],    # Hosentasche ist ein Teil, kein Produkt
    "rucksack":    [],
    "guertel":     ["sicherheits", "keil"],         # Keilriemen-nah, Sicherheitsgurt
    "brille":      [],
    "uhr":         ["fuehr", "spur", "natur", "kultur", "geschirr"],   # nur Wortende-Zufall
    # ⚠️ «Lichterkette» ist keine Halskette. Ohne diese Ausnahme füllt eine LED-Solar-
    # Lichterkette die Schmucksuche — der Probelauf hatte 383 «kette»-Treffer, viele davon
    # Beleuchtung.
    "kette":       ["fahrrad", "saege", "schnee", "foerder", "lichter", "licht", "schluessel"],
    "ring":        ["feder", "dicht", "schlauch", "schleif", "lenk", "spring", "hering"],
    "armband":     [],
    "ohrring":     [],
    "lampe":       [],
    "leuchte":     [],
    "spiegel":     ["rueck"],                       # Rückspiegel ist Autoteil
    "kissen":      [],
    "decke":       ["zimmer", "raum"],              # Zimmerdecke
    "teppich":     [],
    "vorhang":     [],
    "pfanne":      [],
    "topf":        ["blumen"],
    "messer":      [],
    "flasche":     [],
    "becher":      [],
    "buerste":     [],
    "kamm":        [],
    "schere":      [],
    "rasierer":    [],
    "parfum":      [],
    "creme":       [],
    "maske":       [],
    "seife":       [],
    "shampoo":     [],
    "handtuch":    [],
    "bademantel":  [],
    "badeanzug":   [],
    "bikini":      [],
    "socken":      [],
    "pullover":    [],
    "hemd":        [],
    "bluse":       [],
    "shirt":       [],
    "weste":       [],
    "anzug":       ["bade"],                        # Badeanzug hat ein eigenes Grundwort
    "guertelt":    [],
    "handyhuelle": [],
    "huelle":      [],
    "ladegeraet":  [],
    "kabel":       [],
    "kopfhoerer":  [],
    "lautsprecher": [],
    "tastatur":    [],
    "maus":        ["fleder"],                      # Fledermaus
    "kamera":      [],
    "drohne":      [],
    "ventilator":  [],
    "heizung":     [],
    "staubsauger": [],
    "waage":       [],
    "koffergriff": [],
    "schluesselanhaenger": [],
    "geldboerse":  [],
    "portemonnaie": [],
    "werkzeug":    [],
    "bohrer":      [],
    "schraubenzieher": [],
    "zange":       [],
    "hammer":      [],
    "leiter":      [],
    "matte":       ["auto"],                        # Automatte ist Fussmatte, nicht Yogamatte
    "hantel":      [],
    "fahrrad":     [],
    "helm":        [],
    "zelt":        [],
    "schlafsack":  [],
    "grill":       [],
    "korb":        [],
    "regal":       [],
    "stuhl":       [],
    # ⚠️ «tisch» ganz herausgenommen. Es ist die Endung Dutzender Adjektive (minimalistisch,
    # praktisch, romantisch, hektisch) — die Ausnahmen liessen sich pflegen. Aber selbst die
    # ECHTEN Treffer taugen nicht: «Schreibtisch-Ständer» ist ein Handyhalter und
    # «Nachttischlampe» eine Lampe. Wer «tisch» sucht, will einen Tisch. Ein Suchwort, dessen
    # richtige Treffer schon falsch sind, gehört nicht auf die Liste.
    "sessel":      [],
    "halskette":   [],
    "anhaenger":   ["wohnwagen"],
}
# Umlaut-Schreibweise für die Suche im Titel (die Tags selbst bleiben umlautfrei, damit sie
# auch bei umlautfreier Eingabe treffen).
MIT_UMLAUT = {"muetze": "mütze", "guertel": "gürtel", "huelle": "hülle",
              "handyhuelle": "handyhülle", "buerste": "bürste", "kopfhoerer": "kopfhörer",
              "ladegeraet": "ladegerät", "geldboerse": "geldbörse", "saege": "säge",
              "schluesselanhaenger": "schlüsselanhänger", "anhaenger": "anhänger",
              "fuehr": "führ", "foerder": "förder", "rueck": "rück", "kuehl": "kühl"}


def gql(q, v=None):
    with open("/tmp/_st.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_st.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def muster(grund):
    """Trifft das Grundwort NUR am Ende einer Zusammensetzung, nicht als eigenes Wort."""
    wort = MIT_UMLAUT.get(grund, grund)
    # Mindestens zwei Buchstaben davor, damit «Koffer» allein nicht trifft — das Produkt wäre
    # ohnehin auffindbar. Danach optional die Mehrzahl-Endung.
    return re.compile(r'[a-zäöüß]{2,}' + wort + r'(?:e|en|n|s)?\b', re.I)


def main():
    aufgaben, statistik, abgewiesen = [], Counter(), Counter()
    muster_je = {g: muster(g) for g in GRUNDWOERTER}
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        t = p["title"]
        tl = t.lower()
        vorhanden = {x.lower() for x in (p.get("tags") or [])}
        neu = []
        for grund, verboten in GRUNDWOERTER.items():
            if grund in vorhanden:
                continue
            m = muster_je[grund].search(t)
            if not m:
                continue
            # Steht eines der verbotenen Wörter direkt davor, meint die Zusammensetzung
            # etwas anderes.
            vorher = tl[:m.start()] + m.group(0).lower()
            if any(v in vorher for v in verboten):
                abgewiesen[(grund, m.group(0))] += 1
                continue
            neu.append(grund)
        if neu:
            aufgaben.append((p["id"], t, neu))
            for g in neu:
                statistik[g] += 1

    print(f"Produkte, die ein Suchwort bekommen: {len(aufgaben)}", flush=True)
    for g, n in statistik.most_common(22):
        beispiel = next((t for _, t, ns in aufgaben if g in ns), "")
        print(f"   {n:>5}  {g:<20} z.B. «{beispiel[:44]}»", flush=True)
    if abgewiesen:
        print("   — als Ausnahme abgewiesen (Zusammensetzung meint etwas anderes):", flush=True)
        for (g, wort), n in abgewiesen.most_common(8):
            print(f"     {n:>4}  {wort} → NICHT «{g}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, titel, neu in aufgaben:
        if gid in done:
            continue
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": neu})
        if ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{gid}\t{','.join(neu)}\t{titel}\n")
        # ⚠️ NACH JEDEM EINTRAG AUF DIE PLATTE SCHREIBEN, nicht alle 200.
        # Der erste Anlauf tat das nur alle 200 Zeilen — und kam nie so weit: Das
        # Turn-Reaping killt lange Läufe zuverlässig nach wenigen Minuten, der Puffer war
        # dann noch nicht geschrieben, das Ledger blieb leer, und der Supervisor startete
        # den Lauf von vorn. Nach acht Minuten und mehreren Neustarts standen exakt 0
        # Produkte im Ledger, obwohl die API sauber antwortete. Ein Ledger, das einen
        # Absturz nicht überlebt, ist kein Ledger. Das Schreiben kostet nichts gegen den
        # API-Aufruf daneben.
        f.flush()
        if n % 200 == 0:
            print(f"  … {n}/{len(aufgaben)}", flush=True)
        time.sleep(0.25)
    f.flush()
    print(f"FERTIG: {n} Produkte mit Suchwort-Tags versehen")


if __name__ == "__main__":
    main()
