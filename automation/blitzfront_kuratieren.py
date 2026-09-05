"""Räumt die erste Produktreihe der Startseite auf.

WAS DER BILDSCHIRM ZEIGTE (Screenshot-Studie 11.08.2026): Direkt unter dem Hero, der
«Premium-Style. Schweizer Shop.» verspricht, standen als erste acht Artikel des Shops:

    Badeset Dino · Badeset DINOPARK · Badeset in Werkzeugtasche · Pappbecher aus Frischfaser ·
    Plüsch Alligator · Plüsch Pikachu · Magic Wasser Ballone · Liegender Plüschwolf

Pappbecher und Plüschtiere sind das Erste, was eine Besucherin sieht, die wegen Mode, Schmuck
oder Beauty gekommen ist. Ein Pikachu ist obendrein Lizenzware — Regel 16b hält solche Artikel
ausdrücklich aus den Werbekanälen heraus.

DIE URSACHE liegt nicht im Theme, sondern in der Auswahl: Die Kollektion «⚡ Blitzversand-
Highlights» sammelt alles mit dem Tag `blitz-front`, und der wurde auf 302 Artikel gestreut:

    195  Spielzeug & Spiele          ← 78 % der Startreihe
     42  Partydeko & Ballone
     31  Accessoires
     16  Beauty & Pflege
     11  Haushalt & Wohnen
      6  Schweizer Editionen
      1  Deko & Wohnaccessoires

Dahinter steckt eine unbequeme Tatsache über das Schweizer Lager insgesamt: Von 2'593 Artikeln
sind **2'194 Kostüme** und 243 Spielzeug. Der schnellste Lieferant ist im Kern ein Fasnachts-
und Party-Grosshandel. Das «Blitzversand»-Versprechen stimmt — nur trägt die Ware dahinter
nicht die Handschrift des Shops.

WAS DIESES SKRIPT TUT: Es nimmt den Tag `blitz-front` von Spielzeug, Partydeko und Lizenzware.
Mehr nicht. Die Artikel bleiben im Shop, bleiben in «Blitzversand · 1–2 Tage aus der Schweiz»
und bleiben auffindbar — sie führen bloss nicht mehr die Startseite an.

Was es NICHT tut: die Kollektion löschen oder die Ware draften. Wer gezielt ein Plüschtier mit
Schweizer Expresslieferung sucht, soll es weiterhin bekommen.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
TAG = "blitz-front"
LEDGER = "dropship/_blitzfront_kuratiert.txt"

# Warengruppen, die nicht an die Spitze der Startseite gehören.
RAUS_TYP = {"Spielzeug & Spiele", "Partydeko & Ballone"}
# Fremde Marken: Rechte-Risiko in Werbekanälen (Regel 16b), und auf der Startseite fehl am Platz.
LIZENZ = re.compile(r'Pikachu|Pok[eé]mon|Disney|Marvel|Hello Kitty|Star Wars|Batman|'
                    r'Spider-?man|Barbie|Minions|Frozen|Mickey|Harry Potter', re.I)
# Auch innerhalb der «Accessoires» steckt Fasnachtsware. Wortgenau prüfen — «Party» steckt sonst
# in «Partykleid», und ein Partykleid ist echte Mode.
RAUS_TITEL = re.compile(r'Partybrille|Party-?Skibrille|Scherzartikel|Konfetti|Luftschlangen|'
                        r'Knallerbsen|Wunderkerze|'
                        # Einweggeschirr steht als «Haushalt & Wohnen» im Katalog und rutschte
                        # deshalb durch die Warengruppen-Prüfung — der «Pappbecher aus
                        # Frischfaser» aus dem Screenshot ist genau so hereingekommen.
                        r'Einwegbecher|Pappbecher|Plastikbecher|Trinkbecher|Einweggeschirr|'
                        r'Pappteller|Servietten|Strohhalm|Trinkhalm|'
                        # ── NACHTRAG 12.08.2026 ──────────────────────────────────────────
                        # Die Nachkontrolle fand 26 der verbliebenen 59 weiterhin fehl am
                        # Platz. Der erste Lauf filterte nach WARENGRUPPE — und Fortura
                        # vergibt Fasnachtsware auch die Warengruppen «Accessoires»,
                        # «Haushalt & Wohnen» und «Schweizer Editionen». Dieselbe
                        # Einweggeschirr-Falle, nur eine Ebene höher.
                        r'Polizei-?Abzeichen|Sheriffstern|'   # Imitat eines Hoheitszeichens
                        r'Morticia|Wednesday|'                # Figurenbezug wie beim Pikachu
                        r'Chinesischer Sonnenschirm|'         # Text: «wenn Du Dich verkleiden willst»
                        r'Aladins? Wunderlampe|'
                        r'Schottentasche|Felltasche|Kunstfell|Kopfschmuck', re.I)

# Verkleidungs-Tags. `kostuem-accessoire` steht BEWUSST nicht dabei: der Tag beschreibt den
# Regalplatz des Lieferanten, und die so markierte Ware ist zu 90 % gewöhnliche Handtaschen,
# Partybrillen und Modeschmuck. Wer ihn mitfiltert, räumt die halbe Reihe aus Versehen leer.
RAUS_TAG = {"fasnacht", "kostueme", "herrenkostuem", "damenkostuem", "kostuem-hut",
            # Fanartikel = Schweizer Fahnen, Lampions, Fahnenketten. Anlass «1. August» und
            # «Fanparty» — heute ist der 12. August, die Saison ist seit elf Tagen vorbei.
            "fanartikel",
            # Ein Artikel, dessen Bild schon als zu klein markiert ist, gehört nicht auf die
            # prominenteste Fläche des Shops. Fünf der sechs haben zudem nur EIN Bild, also
            # auch kein Karussell.
            "bild-zu-klein"}


def gql(q, v=None):
    with open("/tmp/_bf.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_bf.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
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


def norm(t):
    s = t.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '', s)


def grund(p, doppelt=frozenset()):
    if p["productType"] in RAUS_TYP:
        return p["productType"]
    if LIZENZ.search(p["title"]):
        return "Lizenzware"
    if RAUS_TITEL.search(p["title"]):
        return "Fasnachts-/Scherzartikel"
    treffer = RAUS_TAG & {t.lower() for t in (p.get("tags") or [])}
    if treffer:
        return "Tag " + sorted(treffer)[0]
    if p["id"] in doppelt:
        # «Badeset Romantic Dreams» lag zweimal in derselben Reihe, zu CHF 24.90 und 27.50 —
        # nebeneinander auf einer Startseite sieht das nach einem kaputten Shop aus.
        return "Dublette in derselben Reihe"
    return None


def main():
    cur, alle = None, []
    while True:
        # ⚠️ NICHT auf status:ACTIVE einschränken. Entwürfe behalten den Tag sonst und stehen
        # in dem Moment wieder auf der Startseite, in dem jemand sie reaktiviert — beim ersten
        # Lauf blieben so 13 Plüschtaschen und Konfettibeutel als stille Rückkehrer liegen.
        # (Der Kollektionszähler zeigt Entwürfe übrigens mit: 74 statt der 59 sichtbaren.)
        d = gql('query($c:String){products(first:250,after:$c,'
                'query:"tag:%s"){pageInfo{hasNextPage endCursor} '
                'nodes{id title productType tags status}}}' % TAG, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Abbruch — Liste unvollständig", flush=True)
            return
        alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    # Dubletten in derselben Reihe finden: gleicher Titel, mehrere Produkte — alle ausser dem
    # ersten fliegen aus der Reihe (bleiben aber im Shop).
    gesehen, doppelt = {}, set()
    # ACTIVE zuerst betrachten: sonst behielte ein Entwurf den Platz in der Reihe und das
    # sichtbare Produkt flöge hinaus — genau verkehrt herum.
    for p in sorted(alle, key=lambda x: x.get("status") != "ACTIVE"):
        n = norm(p["title"])
        if n in gesehen:
            doppelt.add(p["id"])
        else:
            gesehen[n] = p["id"]

    raus = [(p, grund(p, doppelt)) for p in alle]
    raus = [(p, g) for p, g in raus if g]
    bleibt = len(alle) - len(raus)
    print(f"Tag {TAG}: {len(alle)} Artikel | entfernen: {len(raus)} | bleibt: {bleibt}", flush=True)
    for g, n in Counter(g for _, g in raus).most_common():
        print(f"   {n:>4}  {g}")
    if bleibt < 12:
        # Eine Reihe mit weniger als einer Bildschirmbreite sähe kaputter aus als eine
        # unpassende. Dann lieber nichts tun und das melden.
        print(f"  ⛔ Es blieben nur {bleibt} Artikel übrig — zu wenig für eine Reihe. "
              f"Nichts geändert.", flush=True)
        return
    if DRY:
        print("  (DRY) Beispiele, die bleiben:", flush=True)
        for p in [p for p in alle if not grund(p)][:10]:
            print(f"     {p['productType'][:22]:<24} {p['title'][:46]}", flush=True)
        return

    f = open(LEDGER, "a")
    for i in range(0, len(raus), 20):
        for p, g in raus[i:i + 20]:
            r = gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t)'
                    '{userErrors{message}}}', {"id": p["id"], "t": [TAG]})
            errs = ((r.get("data") or {}).get("tagsRemove") or {}).get("userErrors")
            if errs:
                print(f"  ⚠️ {p['title'][:40]}: {errs[0]['message']}", flush=True)
                continue
            f.write(f"{p['id']}\t{g}\t{p['title']}\n")
        f.flush()
        print(f"  … {min(i+20, len(raus))}/{len(raus)}", flush=True)
        time.sleep(0.4)
    print(f"FERTIG: {len(raus)} Artikel aus der Startreihe genommen, {bleibt} bleiben.")


if __name__ == "__main__":
    main()
