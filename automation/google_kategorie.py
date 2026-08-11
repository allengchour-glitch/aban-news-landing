"""Setzt die Google-Produktkategorie aus den gepflegten Katalog-Tags.

WARUM DAS ZÄHLT: Die Produktkategorie entscheidet, bei welchen Suchen ein Artikel überhaupt
erscheinen kann. Fehlt sie, rät Google — und rät bei fremdsprachigen Katalogtiteln oft daneben.
Im Google-Kanal stehen 25'357 Produkte, aber nur **1'550 (6 %)** haben das Feld
`mm-google-shopping.google_product_category`.

UND DIE VORHANDENEN SIND TEILS FALSCH. Stichprobe aus dem Bestand:

    «LED Solar-Lichterkette XL – 8 Leuchtmodi»   → Apparel & Accessories > Jewelry
    «LED Schreibtischlampe Dimmbar»              → Apparel & Accessories > Clothing Accessories

Beides sind Lampen — die Werte stammen aus einem ungeprüften Sprachmodell-Durchlauf.

⚠️ TROTZDEM WIRD NICHTS ÜBERSCHRIEBEN. Der erste Entwurf tat das, und der Probelauf zeigte,
dass die Kur schlimmer gewesen wäre als die Krankheit — von 22'091 Änderungen waren 1'208
Überschreibungen, darunter diese:

    Smartwatch Pro   Electronics > … > Smart Watches  →  Apparel & Accessories > Jewelry  ✗
    Bombata Laptoptasche   Handbags  →  Electronics                                       ✗
    Reed-Diffuser    Cosmetics > Perfume & Cologne  →  Cosmetics                          ✗

Ein Tag-Mapper kennt nur die grobe Warengruppe; wo schon ein feinerer Pfad steht, ist er in der
Regel besser. Gesetzt wird deshalb **nur, wo das Feld leer ist**. Die Abweichungen werden nach
`dropship/GOOGLE-KATEGORIE-ABWEICHUNGEN.md` geschrieben — zum Nachsehen, nicht zum Ausführen.

DIE QUELLE IST BEWUSST NICHT DER TITEL, sondern die Kategorie-Tags aus `cat_tags.mjs`. Die sind
gepflegt, deutsch gedacht und kennen die Zusammensetzungs-Fallen (armband**uhr** ≠ Armband,
**Hand**schuh ≠ Schuh). Ein zweiter Titel-Rater würde genau die Fehler wiederholen, die dieses
Skript aufräumt.

REIHENFOLGE ZÄHLT: Die Liste wird von oben nach unten geprüft, das erste passende Tag gewinnt.
Spezifisches steht deshalb vor Allgemeinem — sonst würde «schmuck» die Halsketten schlucken.

Format: Google akzeptiert den vollen Pfad als Text; genau so liegen die vorhandenen Werte im
Shop («Apparel & Accessories > Jewelry > Watches», Typ single_line_text_field). Nummern-IDs
werden bewusst NICHT verwendet — eine falsch erinnerte Zahl fällt niemandem auf, ein falscher
Pfad schon.

DRY=1 meldet nur und zeigt Stichproben je Kategorie.
"""
import json, os, re, subprocess, time
from collections import Counter, defaultdict

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_google_kategorie.txt"
FELD = "google_product_category"

# (Tag, Google-Pfad) — von spezifisch nach allgemein.
REGELN = [
    ("kategorie-halskette", "Apparel & Accessories > Jewelry > Necklaces"),
    ("halskette",           "Apparel & Accessories > Jewelry > Necklaces"),
    ("kategorie-ohrring",   "Apparel & Accessories > Jewelry > Earrings"),
    ("ohrringe",            "Apparel & Accessories > Jewelry > Earrings"),
    ("kategorie-armband",   "Apparel & Accessories > Jewelry > Bracelets"),
    ("kategorie-ring",      "Apparel & Accessories > Jewelry > Rings"),
    ("kategorie-uhr",       "Apparel & Accessories > Jewelry > Watches"),
    ("uhren",               "Apparel & Accessories > Jewelry > Watches"),
    ("sonnenbrille",        "Apparel & Accessories > Clothing Accessories > Sunglasses"),
    ("kategorie-tasche",    "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    ("damen-taschen",       "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    ("damenschuhe",         "Apparel & Accessories > Shoes"),
    ("herrenschuhe",        "Apparel & Accessories > Shoes"),
    ("schuhe",              "Apparel & Accessories > Shoes"),
    ("kategorie-kleid",     "Apparel & Accessories > Clothing > Dresses"),
    ("kat-damen-pullover",  "Apparel & Accessories > Clothing > Shirts & Tops"),
    ("schmuck",             "Apparel & Accessories > Jewelry"),
    ("haarstyling",         "Health & Beauty > Personal Care > Hair Care"),
    ("beauty",              "Health & Beauty > Personal Care > Cosmetics"),
    ("pflege",              "Health & Beauty > Personal Care"),
    ("haustier",            "Animals & Pet Supplies > Pet Supplies"),
    ("pet",                 "Animals & Pet Supplies > Pet Supplies"),
    ("beleuchtung",         "Home & Garden > Lighting"),
    ("kueche",              "Home & Garden > Kitchen & Dining"),
    ("dekoration",          "Home & Garden > Decor"),
    ("aufbewahrung",        "Home & Garden > Household Supplies > Storage & Organization"),
    ("fitness",             "Sporting Goods > Exercise & Fitness"),
    ("elektronik",          "Electronics"),
    ("tech",                "Electronics"),
    ("kinder",              "Baby & Toddler"),
    # Ganz zuletzt das Grobe: «mode» trägt fast jedes Kleidungsstück, ist aber nur dann die
    # Antwort, wenn nichts Genaueres gegriffen hat.
    ("mode",                "Apparel & Accessories > Clothing"),
]


def gql(q, v=None):
    with open("/tmp/_gk.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gk.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


# Der Tag `uhren` steckt auch auf Smartwatches und Fitness-Trackern. Die gehören NICHT unter
# Schmuck-Uhren, sondern zu tragbarer Elektronik — dort sucht auch die Kundschaft danach.
# Diese Titelmuster stechen deshalb die Tag-Regeln.
VORRANG = [
    (re.compile(r'smart\s*-?\s*watch|smartuhr', re.I),
     "Electronics > Electronics Accessories > Wearable Technology > Smart Watches"),
    (re.compile(r'fitness\s*-?\s*(tracker|armband)|activity\s*tracker', re.I),
     "Electronics > Electronics Accessories > Wearable Technology > Activity Trackers"),
]


# Wie sauber sind die Tags wirklich? Nachgezählt am 11.08. mit wortgenauen Mustern:
#   schuhe            2'613 Produkte →  2 Fehltreffer (0,1 %)
#   kategorie-tasche    891 Produkte →  4 Fehltreffer (0,6 %)
#   uhren               811 Produkte →  0 Fehltreffer
# Also gut genug, um darauf zu bauen. (Die erste Messung meldete 8 % — sie war falsch: das
# Muster «sand» traf «Sandalen», «tisch» traf «minimalis-tisch». Genau die Substring-Falle,
# vor der Regel 9b warnt. Wortgrenzen sind Pflicht, auch beim blossen Nachzählen.)
# Für die verbliebenen Einzelfälle: Trifft das Muster, wird das Tag ignoriert und die nächste
# Regel geprüft — ein Schuhregal ist kein Schuh, aber eben auch nicht kategorielos.
AUSNAHMEN = {
    "schuhe": re.compile(r'Schuhregal|Schuhschrank|Schuh-?Organizer|Schuhb[üu]rste|'
                         r'Schuhspanner|Eau de|Sandalwood|Sandelholz', re.I),
    "damenschuhe": re.compile(r'Schuhregal|Schuhschrank|Schuh-?Organizer', re.I),
    "herrenschuhe": re.compile(r'Schuhregal|Schuhschrank|Schuh-?Organizer', re.I),
    "kategorie-tasche": re.compile(r'Pinsel-?[Ss]et|Schrank-?Organizer|Schuh-?Organizer', re.I),
    "damen-taschen": re.compile(r'Pinsel-?[Ss]et|Schrank-?Organizer', re.I),
}


# Zweite Ebene: die Warengruppe des Katalogs. Nach dem ersten Durchlauf blieben 3'116 Produkte
# im Google-Kanal ohne Kategorie, weil ihnen die Mode-/Schmuck-Tags fehlen — sie sind schlicht
# keine Mode. Ihr `productType` ist aber gepflegt und eindeutig genug:
#     406 Auto-Zubehör · 380 Basteln & DIY · 343 Taschen · 205 Spielzeug · 178 Gaming …
# Bewusst NICHT abgebildet: «Trend-Gadget» (874) und «Trend-Produkt» (165). Das sind Sammelkörbe
# ohne gemeinsame Warengruppe — vom Küchenhelfer bis zum Nachtlicht. Eine falsche Kategorie
# schadet dort mehr als eine fehlende, weil Google danach in den falschen Suchen ausspielt.
NACH_TYP = {
    "Auto-Zubehör":          "Vehicles & Parts > Vehicle Parts & Accessories",
    "Basteln & DIY":         "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts",
    "Taschen":               "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
    "Spielzeug & Spiele":    "Toys & Games > Toys",
    "Gaming-Zubehör":        "Electronics > Video Game Console Accessories",
    "Werkzeug & Heimwerken": "Hardware > Tools",
    "Werkzeug":              "Hardware > Tools",
    "Musikinstrumente":      "Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments",
    "Sport & Outdoor":       "Sporting Goods",
    "Partydeko & Ballone":   "Home & Garden > Decor > Party Supplies",
    "Audio":                 "Electronics > Audio",
    "Beauty Tools":          "Health & Beauty > Personal Care > Cosmetics",
    "Beauty & Pflege":       "Health & Beauty > Personal Care",
    "Wellness & Spa":        "Health & Beauty > Health Care",
    "Haushalt & Wohnen":     "Home & Garden > Household Supplies",
    "Deko & Wohnaccessoires": "Home & Garden > Decor",
    "Damenmode":             "Apparel & Accessories > Clothing",
    "Herrenmode":            "Apparel & Accessories > Clothing",
    "Haustierbedarf":        "Animals & Pet Supplies > Pet Supplies",
    "Aufbewahrung & Organizer": "Home & Garden > Household Supplies > Storage & Organization",
    "Elektronik":            "Electronics",
    "Schmuck":               "Apparel & Accessories > Jewelry",
}


SCHUHWERK = re.compile(r'\b\w*(schuhe?|stiefel|sandalen|slipper|pantoffeln)\b', re.I)
KLEIDUNG = re.compile(r'\b\w*(jacke|m[üu]tze|hose|pullover|pulli|schal|handschuh\w*|socken|'
                      r'shirt|kleid|mantel|weste|hemd|hoodie|str[üu]mpfe|stiefel|sandalen)\b', re.I)


def kategorie(titel, tags, typ=None):
    titel = titel or ""
    for muster, pfad in VORRANG:
        if muster.search(titel):
            return pfad
    t = {x.lower() for x in tags}
    for tag, pfad in REGELN:
        if tag not in t:
            continue
        sperre = AUSNAHMEN.get(tag)
        if sperre and sperre.search(titel):
            continue
        return pfad
    typ = (typ or "").strip()
    # ⚠️ Auch die Warengruppe irrt. Unter «Spielzeug & Spiele» stehen acht Kleidungsstücke —
    # «Plüschjacke», «Plüschmütze Panda», «Baby-Schuhe mit Plüschfutter». Das Wort «Plüsch»
    # hat sie dorthin sortiert, nicht ihr Zweck. Eine Jacke als «Toys» anzubieten, spielt sie
    # in den falschen Suchen aus. Das Kleidungswort im Titel sticht deshalb die Warengruppe.
    if typ == "Spielzeug & Spiele":
        if SCHUHWERK.search(titel):
            return "Apparel & Accessories > Shoes"
        if KLEIDUNG.search(titel):
            return "Apparel & Accessories > Clothing"
    return NACH_TYP.get(typ)


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")

    cur, gesehen, gesetzt, korrigiert, ohne_regel = None, 0, 0, 0, 0
    verteilung, proben, abweichungen = Counter(), defaultdict(list), []
    stapel = []
    while True:
        d = gql('query($c:String){products(first:150,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title tags productType '
                'g:publishedOnPublication(publicationId:"gid://shopify/Publication/302872297857") '
                'mf:metafield(namespace:"mm-google-shopping",key:"%s"){value}}}}' % FELD,
                {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Abbruch — Liste unvollständig", flush=True)
            break
        for p in pg["nodes"]:
            if not p["g"]:
                continue                      # nur was im Google-Kanal steht, zählt hier
            gesehen += 1
            if p["id"] in done:
                continue
            neu = kategorie(p["title"], p["tags"], p.get("productType"))
            if not neu:
                ohne_regel += 1
                continue
            alt = ((p.get("mf") or {}) or {}).get("value")
            if alt:
                # Vorhandenes bleibt stehen — nur notieren, wo es abweicht.
                if alt != neu:
                    korrigiert += 1
                    abweichungen.append((p["title"], alt, neu))
                continue
            if len(proben[neu]) < 2:
                proben[neu].append(p["title"][:52])
            verteilung[neu] += 1
            gesetzt += 1
            stapel.append({"ownerId": p["id"], "namespace": "mm-google-shopping",
                           "key": FELD, "type": "single_line_text_field", "value": neu})
            if len(stapel) >= 25 and not DRY:
                schreiben(stapel, f)
                stapel = []
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        if gesehen % 6000 < 150:
            print(f"  … {gesehen} gesehen | {gesetzt} zu setzen", flush=True)
    if stapel and not DRY:
        schreiben(stapel, f)

    print(f"{'(DRY) ' if DRY else ''}FERTIG: {gesehen} im Google-Kanal | {gesetzt} leere Felder "
          f"gefüllt | {korrigiert} vorhandene Werte abweichend (unangetastet) | "
          f"{ohne_regel} ohne passende Regel")
    for pfad, n in verteilung.most_common():
        print(f"  {n:>5}  {pfad}")
        for b in proben[pfad]:
            print(f"          {b}")

    if abweichungen:
        pfad = "dropship/GOOGLE-KATEGORIE-ABWEICHUNGEN.md"
        with open(pfad, "w") as r:
            r.write("# Google-Kategorie: vorhandener Wert weicht von der Tag-Regel ab\n\n"
                    "Nichts davon wurde geändert. Die Liste dient dem Nachsehen: Wo der "
                    "vorhandene Pfad genauer ist (z. B. «Smart Watches» statt «Jewelry»), ist er "
                    "richtig und die Tag-Regel zu grob. Wo er offensichtlich unsinnig ist "
                    "(Lampe als Schmuck), lohnt eine Einzelkorrektur.\n\n"
                    "| Produkt | steht jetzt | Tag-Regel sagt |\n|---|---|---|\n")
            for titel, alt, neu in abweichungen[:400]:
                r.write(f"| {titel[:60]} | {alt} | {neu} |\n")
            if len(abweichungen) > 400:
                r.write(f"\n… und {len(abweichungen)-400} weitere.\n")
        print(f"  Abweichungen notiert in {pfad}")


def schreiben(stapel, f):
    r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
            '{userErrors{message}}}', {"m": stapel})
    errs = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if errs:
        print(f"  ⚠️ {errs[0]['message']}", flush=True)
        return
    for m in stapel:
        f.write(f"{m['ownerId']}\t{m['value']}\n")
    f.flush()
    time.sleep(0.3)


if __name__ == "__main__":
    main()
