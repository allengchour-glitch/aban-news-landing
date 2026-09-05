"""Schreibt Suchmaschinen-Beschreibungen für Kategorien, die keine haben.

WARUM DAS LOHNT: Die Beschreibung ist der Text, den Google unter dem Titel anzeigt. Fehlt er,
schneidet Google irgendeinen Satz aus der Seite heraus — meist den Anfang der Kategorie-
Einleitung, oft mitten im Satz abgebrochen. Google ist der einzige Kanal mit belegten Verkäufen
(4 von 10 Bestellungen), und die Einträge sind kostenlos. Eine gute Beschreibung kostet nichts
und entscheidet, ob jemand klickt.

Es geht dabei um grosse Kategorien: Werkzeug (1'282), Ladegeräte (659), Haarpflege (559),
Kopfhörer (512), Damenuhren (381).

⚠️ KEINE ERFUNDENEN VERSPRECHEN. Erlaubt sind nur die drei am lebenden Warenkorb geprüften
Aussagen: Versand CHF 7.00 / gratis ab CHF 50, 30 Tage Rückgabe, Klarna & TWINT. Ausdrücklich
NICHT «Blitzversand aus der Schweiz» — das gilt nur für die 2'593 Artikel aus dem CH-Lager und
wurde am 11.08. aus 22 Reel-Texten und 19 Kollektionstexten entfernt, weil es für CJ-Ware
schlicht falsch ist.

Länge: rund 150 Zeichen. Google schneidet ab etwa 160 ab.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
SCHLUSS = "Gratis-Versand ab CHF 50, 30 Tage Rückgabe."

TEXTE = {
    "licht-solar-aussen": ("Solar- & Aussenleuchten für Garten und Balkon",
                           "Solarlampen, Wegleuchten und Lichterketten fürs Aussen – ohne Kabel, "
                           "ohne Stromkosten."),
    "uhren-damen": ("Damenuhren online kaufen",
                    "Elegante und sportliche Damenuhren, von zurückhaltend bis auffällig."),
    "schuhe-absatz": ("High Heels & Pumps",
                      "Pumps, Sandaletten und Absatzschuhe für Büro, Abend und besondere Anlässe."),
    "beauty-hautpflege": ("Hautpflege – Gesicht & Körper",
                          "Seren, Cremes und Masken für jeden Hauttyp – von Reinigung bis Pflege."),
    "beauty-haar": ("Haarpflege & Styling",
                    "Shampoos, Kuren und Styling-Helfer für jede Haarstruktur."),
    "beauty-naegel": ("Nageldesign & Nagelpflege",
                      "Lacke, Gel-Sets, Lampen und Werkzeug fürs Nagelstudio zu Hause."),
    "wohnen-kueche": ("Küche & Kochen",
                      "Küchenhelfer, Aufbewahrung und Geräte, die den Alltag am Herd leichter machen."),
    "wohnen-bad": ("Badezimmer & Bad-Accessoires",
                   "Ordnung, Spiegel und Accessoires fürs Bad – praktisch und schön zugleich."),
    "wohnen-aufbewahrung": ("Aufbewahrung & Ordnung",
                            "Boxen, Körbe und Organizer für Schrank, Küche und Schreibtisch."),
    "elektronik-audio": ("Kopfhörer & Lautsprecher",
                         "In-Ear, Over-Ear und Bluetooth-Boxen – für unterwegs und daheim."),
    "elektronik-laden": ("Ladegeräte & Powerbanks",
                         "Powerbanks, Kabel, Netzteile und kabelloses Laden für Handy und Tablet."),
    "werkzeug-maschinen": ("Werkzeug & Maschinen",
                           "Handwerkzeug, Akkugeräte und Zubehör für Werkstatt, Haus und Garten."),
    "blitzversand-highlights": ("Blitzversand ab Schweizer Lager – in 1–2 Werktagen",
                                "Unsere Auswahl ab Schweizer Lager: Beauty-Sets, Taschen und "
                                "Wohnaccessoires, in 1–2 Werktagen bei dir."),
}


def gql(q, v=None):
    with open("/tmp/_ks.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ks.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors"):
                print("  ", str(d["errors"])[:110], flush=True)
        except Exception:
            pass
        time.sleep(4)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    gesetzt = uebersprungen = 0
    for handle, (titel, satz) in TEXTE.items():
        d = gql('query($h:String!){collectionByHandle(handle:$h){id title productsCount{count} '
                'seo{title description} '
                'onlineStore:publishedOnPublication(publicationId:'
                '"gid://shopify/Publication/301970915713")}}', {"h": handle})
        c = (d.get("data") or {}).get("collectionByHandle")
        if not c:
            print(f"  ⚠️ {handle}: gibt es nicht", flush=True)
            continue
        if not c["onlineStore"]:
            # Eine unveröffentlichte Kategorie erscheint gar nicht bei Google. Text wäre
            # verschwendet — und die unveröffentlichten sind hier durchweg Doppelgänger
            # der Menü-Kategorien.
            print(f"  ⏭️ {handle}: nicht im Onlineshop", flush=True)
            uebersprungen += 1
            continue
        if (c["seo"] or {}).get("description"):
            print(f"  ⏭️ {handle}: hat schon eine Beschreibung", flush=True)
            uebersprungen += 1
            continue
        besch = f"{satz} {SCHLUSS}"
        if len(besch) > 165:
            print(f"  ⚠️ {handle}: {len(besch)} Zeichen — zu lang, bitte kürzen", flush=True)
            continue
        print(f"  {c['productsCount']['count']:>5}×  {handle}\n         «{besch}»", flush=True)
        if DRY:
            continue
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": c["id"], "seo": {"title": f"{titel} | LuxeStyle Schweiz",
                                              "description": besch}}})
        errs = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
        if errs:
            print(f"     ⚠️ {errs[0]['message']}", flush=True)
            continue
        gesetzt += 1
        time.sleep(0.3)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {gesetzt} Beschreibungen gesetzt, "
          f"{uebersprungen} übersprungen")


if __name__ == "__main__":
    main()
