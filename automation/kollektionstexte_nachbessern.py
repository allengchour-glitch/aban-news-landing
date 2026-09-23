#!/usr/bin/env python3
"""kollektionstexte_nachbessern.py — Paket C (Audit 23.09.2026): Kollektionstexte auf die Wahrheit.

WARUM (alles GEMESSEN am 23.09.2026, Admin-GraphQL 2026-01, 520 Kollektionen EXACT, 353 im Onlineshop):
  1. Der Kürzer koll_seo_laengen.py hat in drei SEO-Beschreibungen die wahre Schlussaussage
     «Gratis-Versand ab CHF 50» verloren (uhren, moissanit-schmuck, haustier-futter-naepfe).
  2. Tote Marken: productsCount(status:active AND vendor:"<Marke>", limit:null) = 0 EXACT für
     Adidas, Nike, Puma, Hi-Tec, Rip Curl, Casio, Olivia Burton, Tommy Hilfiger, Stanley, Knipex,
     Wolfcraft, Ferrestock, Bosch, Dewalt, Metabo, Trixie, Hunter, Ferplast (Makita 1 = Fremd-Ladegerät,
     nicht in elektrowerkzeug). Im Kollektionsinhalt (alle Produkte abgeblättert, Vendor UND Titel):
     0 aktive je Marke und Kollektion. Die Marken stehen in seo.description von damen-schuhe,
     herren-schuhe, uhren, handwerkzeug, elektrowerkzeug, haustier-hund; im descriptionHtml NUR bei
     handwerkzeug und haustier-hund; dazu (gleiche Klasse, Vollscan) descriptionHtml von
     🎁-geschenke-bis-chf-30 («Stanley Werkzeugkästen und Dewalt Sägeblätter»).
     elektrowerkzeug: 7 aktive, alles Zubehör (Spannmutter, Staubhaube, Kettensägeblatt, Druckluft-
     Winkelschleifer …) — SEO-Titel/-Text versprachen Bohrmaschinen, Akkuschrauber, Stichsägen.
  3. «Blitzversand aus der Schweiz» / «ab Schweizer Lager» (Lieferant = SKU-Präfix der 1. Variante,
     nur ACTIVE): haustier-napf-futter CJ 367/367, licht-nachtlicht-projektor CJ 120/122 (+2 LX),
     licht-tischlampe CJ 37/38 (+1 Fortura), licht-led-strip CJ 4/4, wasserfester-schmuck CJ 99/99
     («Edelstahl-Schmuck aus der Schweiz»), schmuck-uhren CJ 4'855/4'856 («vieles ab Schweizer
     Lager in 1–2 Werktagen», «Versand aus der Schweiz», «über 5'000 Artikel» bei 4'856 aktiven).
     Bleiben (Mehrheit CH-Lager): ft-wohndeko-ft 8/8 Fortura+ch-lager, halloween 135/173,
     suesses-esswaren 31/31; beauty-haar 171/458 («viele Artikel ab Schweizer Lager» bleibt wahr).
  4. Sie-Form: ft-wohndeko-ft («Ihr Zuhause») und sieben weitere SEO-Beschreibungen («Entdecken Sie»,
     «Gestalten Sie Ihre»). «für Sie» / «Sie & Ihn» (= sie, die Frau) bleibt.
  5. «Sortiert nach Preis» steht in 11 veröffentlichten Kollektionstexten, alle mit sortOrder
     CREATED_DESC (gemessen) → der Satz ist falsch. Die Sortierung bleibt (Frische-Strategie), der
     Satz fällt.
  6. «Silberarmband» (15453601890689): Beschreibung «Schmuckstück für Frauen», Tags damen UND herren →
     steht in «Geschenke für Ihn». Der herren-Tag geht weg (tagsRemove, alle Schreibweisen).

WAS ES TUT: je Kollektion den LIVE-Wert lesen; «voll»-Änderungen nur, wenn der Live-Wert GENAU dem
erwarteten Altwert entspricht; «teil»-Änderungen nur, wenn der Alt-Baustein genau einmal vorkommt.
Sonst «ABWEICHUNG» (nichts geschrieben). Prüft vor dem Schreiben: seo.description ≤ 155 und mit
«Gratis-Versand ab CHF 50», keine Sie-Anrede, kein ß, keine tote Marke (Marken live nachgezählt),
kein CH-Lager-Versprechen bei CJ-Kollektionen, kein «sortiert nach Preis» ohne PRICE_ASC, <p>-Bilanz
und <!--gd2--> erhalten. Schreibt mit collectionUpdate, liest zurück, Ledger je Feld.
Kein Produkttext wird geschrieben (nur ein Tag an einem Produkt) → Text-Sperre nicht nötig.

  DIFF=<pfad> python3 automation/kollektionstexte_nachbessern.py          # DRY (Standard)
  SCHARF=1 python3 automation/kollektionstexte_nachbessern.py             # schreibt + liest zurück
Idempotent: ein zweiter Lauf meldet «schon erledigt». Letzte Zeile: «KOLL-TEXTE: …».
"""
import difflib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf  # noqa: E402

API = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_kollektionstexte_nachbessern.txt")
SCHARF = os.environ.get("SCHARF") == "1"
DIFF = os.environ.get("DIFF", "/tmp/kollektionstexte_nachbessern_diff.txt")
USP = "Gratis-Versand ab CHF 50"

TOTE_MARKEN = ["Adidas", "Nike", "Puma", "Hi-Tec", "Rip Curl", "Casio", "Olivia Burton", "Tommy Hilfiger",
               "Stanley", "Knipex", "Wolfcraft", "Ferrestock", "Bosch", "Makita", "Dewalt", "Metabo",
               "Trixie", "Hunter", "Ferplast",
               # 23.09. abends (Pruefer: 6 weitere Kollektionen mit Marken ohne aktive Ware; vendor+Titel EXACT 0 gemessen)
               "Chicco", "Bright Starts", "Kinderkraft", "Remington", "Oral-B", "Sonicare", "Ravensburger",
               "Fisher-Price", "Intex", "Bandai", "Hasbro", "Varta"]
# «Braun», «Wahl», «Philips», «Panasonic» nur im Marken-Kontext (Braun = Farbe, Wahl = Wort; Philips 1 und Panasonic 2 aktive
# irgendwo im Shop, aber nicht in diesen Kollektionen — als Aufzaehlung neben anderen Marken sind sie tot).
MARKE_KONTEXT_RX = re.compile(r"(?:Philips|Remington|Oral-B|Sonicare|Panasonic)[^.]{0,40}\b(?:Braun|Wahl)\b"
                              r"|\b(?:Braun|Wahl)\b[^.]{0,40}(?:Philips|Remington|Oral-B|Sonicare|Panasonic)"
                              r"|Mundduschen von Panasonic|von Philips\b")
# Kollektionen, deren aktive Ware (fast) nur CJ ist → kein CH-Lager-Versprechen
CJ_KOLLEKTIONEN = {"haustier-napf-futter", "licht-nachtlicht-projektor", "licht-tischlampe", "licht-led-strip",
                   "wasserfester-schmuck", "schmuck-uhren", "uhren", "moissanit-schmuck", "haustier-futter-naepfe",
                   "damen-schuhe", "herren-schuhe", "handwerkzeug", "elektrowerkzeug", "haustier-hund"}
CH_VERSPRECHEN = re.compile(r"Blitzversand|aus der Schweiz|ab Schweizer Lager|1[–-]2 Werktag", re.I)
SIE_ANREDE = re.compile(r"\b(Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b|\b\w+en Sie\b(?! & Ihn)")
# Pruefer 23.09. abends: die Wortfolge «Nach Preis sortiert» / «nach Preis aufsteigend sortiert» stand in 5 Kollektionen
# und die alte Regex sah nur «sortiert nach Preis» — «0 (vorher 11)» war ein falsches Gruen.
SORTIERT = re.compile(r"(sortiert|geordnet)\s+nach\s+(dem\s+)?(Preis|günstigstem)|nach\s+(dem\s+)?Preis(\s+\w+){0,2}\s+(sortiert|geordnet)", re.I)
MARKE_RX = re.compile(r"\b(" + "|".join(re.escape(m) for m in TOTE_MARKEN) + r")\b", re.I)

SORT_SATZ_PREIS = "<p>Sortiert nach Preis – die günstigsten zuerst.</p>"

# (handle, feld, art, alt, neu)  feld ∈ html | seo_d | seo_t ; art ∈ voll | teil
PLAN = [
    # 1 — CHF-50-Aussage zurück (Kürzer hatte sie gestrichen)
    ("uhren", "seo_d", "voll",
     "Uhren für Damen & Herren bei LuxeStyle Schweiz: elegante Damenuhren, sportliche Herrenuhren & Marken wie Casio, Olivia Burton & Tommy Hilfiger.",
     "Uhren für Damen & Herren bei LuxeStyle Schweiz: elegante Damenuhren, sportliche Herrenuhren, Chronographen & Automatikuhren. Gratis-Versand ab CHF 50."),
    ("moissanit-schmuck", "seo_d", "voll",
     "Moissanit-Schmuck als günstige Diamant-Alternative: Ringe, Halsketten & Ohrstecker aus 925 Sterling-Silber mit zertifiziertem Moissanit (D-VVS1).",
     "Moissanit-Schmuck als Diamant-Alternative: Ringe, Halsketten & Ohrstecker aus 925 Sterling-Silber, teils mit D-VVS1-Moissanit. Gratis-Versand ab CHF 50."),
    ("haustier-futter-naepfe", "seo_d", "voll",
     "Futter & Näpfe bei LuxeStyle: Futterautomaten, Futterspender, Trinkbrunnen sowie Näpfe aus Edelstahl, Keramik & Silikon für Hund und Katze.",
     "Futter & Näpfe bei LuxeStyle: Futterautomaten, Futterspender, Trinkbrunnen sowie Näpfe aus Edelstahl, Keramik & Silikon. Gratis-Versand ab CHF 50."),
    ("haustier-futter-naepfe", "html", "teil",
     "<p>Sortiert nach Preis – für Hund und Katze, drinnen wie unterwegs.</p>",
     "<p>Für Hund und Katze, drinnen wie unterwegs.</p>"),
    # 2 — tote Marken
    ("damen-schuhe", "seo_d", "voll",
     "Damen-Schuhe bei LuxeStyle Schweiz: Sneaker, Sandalen, Pumps & Stiefel von Adidas, Nike, Puma & Hi-Tec. Stil & Komfort. Gratis-Versand ab CHF 50.",
     "Damen-Schuhe bei LuxeStyle Schweiz: Sandalen, Sneaker, Pumps, Loafer & Stiefel für Alltag, Abend und kühle Tage. Gratis-Versand ab CHF 50."),
    ("herren-schuhe", "seo_d", "voll",
     "Herren-Schuhe bei LuxeStyle Schweiz: Sneaker, Sportschuhe, Loafer & Stiefel von Adidas, Puma & Rip Curl. Bequem & robust. Gratis-Versand ab CHF 50.",
     "Herren-Schuhe bei LuxeStyle Schweiz: Sneaker, Sportschuhe, Loafer & Stiefel für Alltag, Arbeit und Outdoor. Gratis-Versand ab CHF 50."),
    ("handwerkzeug", "seo_d", "voll",
     "Schraubendreher, Zangen, Hämmer, Schraubenschlüssel & Inbus von Stanley, Knipex & Wolfcraft. Robustes Handwerkzeug für jedes Projekt.",
     "Handwerkzeug online kaufen: Schraubendreher-Sets, Zangen, Hämmer, Schraubenschlüssel & Inbus für Heimwerk und Reparatur. Gratis-Versand ab CHF 50."),
    ("handwerkzeug", "html", "teil",
     "hier findest du robustes, langlebiges Handwerkzeug von Marken wie Stanley, Knipex, Wolfcraft und Ferrestock.",
     "hier findest du Handwerkzeug für Heimwerk, Reparatur und Elektronik."),
    ("handwerkzeug", "html", "teil",
     "Mit dem richtigen Werkzeug in der Hand gelingt jede Arbeit präziser und schneller. Entdecke unsere Auswahl – geordnet nach günstigstem Preis zuerst.",
     "Mit dem richtigen Werkzeug in der Hand geht die Arbeit leichter. Gratis-Versand ab CHF 50."),
    ("elektrowerkzeug", "seo_t", "voll",
     "Elektrowerkzeug – Bohrmaschinen, Winkelschleifer & mehr | LuxeStyle",
     "Zubehör für Winkelschleifer & Bohrmaschinen | LuxeStyle"),
    ("elektrowerkzeug", "seo_d", "voll",
     "Bohrmaschinen, Akkuschrauber, Winkelschleifer, Stichsägen & Schlagbohrer von Bosch, Makita, Dewalt & Metabo. Kraftvolles Elektrowerkzeug.",
     "Zubehör für Winkelschleifer & Bohrmaschinen: Spannmutter, Staubschutzhaube, Kettensägeblätter und ein Druckluft-Winkelschleifer. Gratis-Versand ab CHF 50."),
    ("haustier-hund", "seo_d", "voll",
     "Hunde-Zubehör bei LuxeStyle: Hundebetten, Leinen, Halsbänder, Geschirre, Spielzeug & Näpfe von Trixie, Hunter & Ferplast. Gratis-Versand ab CHF 50.",
     "Hunde-Zubehör bei LuxeStyle: Hundebetten, Leinen, Halsbänder, Geschirre, Spielzeug & Näpfe für Alltag, Spaziergang und Spiel. Gratis-Versand ab CHF 50."),
    ("haustier-hund", "html", "teil",
     "Von kuscheligen Hundebetten über robuste Leinen, Halsbänder und Geschirre bis zu Spielzeug und Näpfen: Hier findest du geprüftes Zubehör von Marken wie Trixie, Hunter &amp; Ferplast für jeden Vierbeiner.",
     "Von kuscheligen Hundebetten über Leinen, Halsbänder und Geschirre bis zu Spielzeug und Näpfen: Hier findest du Zubehör für deinen Vierbeiner."),
    ("haustier-hund", "html", "teil",
     "<p>Sortiert nach Preis – so findest du im Handumdrehen das Passende für Alltag, Spaziergang und Spiel.</p>",
     "<p>Das Passende für Alltag, Spaziergang und Spiel.</p>"),
    ("🎁-geschenke-bis-chf-30", "html", "teil",
     "Auch hochwertige Werkzeuge wie Stanley Werkzeugkästen und Dewalt Sägeblätter für Holz und Metall warten darauf, von dir verschenkt zu werden.",
     "Auch Werkzeug wie Handsägen und Sägeblätter wartet darauf, von dir verschenkt zu werden."),
    # 3 — CH-Versandversprechen bei CJ-Ware
    ("haustier-napf-futter", "seo_d", "voll",
     "Näpfe, Trinkbrunnen & Futter-Zubehör für Hund & Katze · Blitzversand aus der Schweiz.",
     "Näpfe, Trinkbrunnen & Futter-Zubehör für Hund & Katze · Lieferung meist 10–20 Werktage · Gratis-Versand ab CHF 50."),
    ("licht-nachtlicht-projektor", "seo_d", "voll",
     "Nachtlicht & Sternenhimmel-Projektoren · fürs Kinderzimmer · Blitzversand aus der Schweiz.",
     "Nachtlichter & Sternenhimmel-Projektoren für Kinder- und Schlafzimmer · Lieferung meist 10–20 Werktage · Gratis-Versand ab CHF 50."),
    ("licht-tischlampe", "seo_d", "voll",
     "Tisch- & Schreibtischlampen · augenschonend & stilvoll · Blitzversand aus der Schweiz, Kauf auf Rechnung.",
     "Tisch-, Schreibtisch- & Nachttischlampen für Homeoffice, Schlaf- und Wohnzimmer · Lieferung meist 10–20 Werktage · Gratis-Versand ab CHF 50."),
    ("licht-led-strip", "seo_d", "voll",
     "LED-Strips & Lichterketten günstig kaufen · Blitzversand aus der Schweiz · Kauf auf Rechnung mit Klarna & TWINT.",
     "LED- und Solar-Lichterketten für Garten und Balkon · Lieferung meist 10–20 Werktage · Gratis-Versand ab CHF 50 · Kauf auf Rechnung mit Klarna."),
    ("wasserfester-schmuck", "seo_d", "voll",
     "Wasserfester Edelstahl-Schmuck aus der Schweiz: läuft nicht an beim Duschen, Schwimmen & am See. Ketten, Ohrringe, Armbänder. Gratis-Versand ab CHF 50.",
     "Wasserfester Schmuck aus Edelstahl: läuft beim Duschen, Händewaschen und am See nicht an. Armbänder, Ketten, Ringe & Ohrringe. Gratis-Versand ab CHF 50."),
    ("wasserfester-schmuck", "html", "teil",
     "Über 100 Stücke in Gold- und Silber-Optik:",
     "In Gold- und Silber-Optik:"),
    ("schmuck-uhren", "html", "teil",
     "Die Lieferzeit steht bei jedem Artikel — vieles ab Schweizer Lager in 1–2 Werktagen.",
     "Die Lieferzeit steht bei jedem Artikel, meist sind es 10–20 Werktage."),
    ("schmuck-uhren", "seo_d", "voll",
     "Halsketten, Armbänder, Ringe, Ohrringe und Uhren — über 5'000 Artikel, Versand aus der Schweiz oder direkt ab Hersteller. Preise in CHF, 30 Tage Rückgabe.",
     "Halsketten, Armbänder, Ringe, Ohrringe und Uhren bei LuxeStyle Schweiz. Preise in CHF, Lieferung meist 10–20 Werktage, Gratis-Versand ab CHF 50."),
    # 4 — Sie-Form (+ Wohndeko: CH-Lager ist dort wahr, 8/8 Fortura mit ch-lager)
    ("ft-wohndeko-ft", "seo_d", "voll",
     "Wohndeko online kaufen bei luxestyle.ch ✓ Stilvolle Deko für Ihr Zuhause ✓ Blitzversand in der ganzen Schweiz ✓ Jetzt entdecken!",
     "Wohndeko bei luxestyle.ch: Dekostoffe, Tischtücher, Kissen & Gästerahmen für dein Zuhause. Versand ab Schweizer Lager, Gratis-Versand ab CHF 50."),
    ("baby-kids", "seo_d", "voll",
     "Entdecken Sie hochwertige Produkte für Baby & Kids bei LuxeStyle CH. Stil und Qualität für die Kleinsten in Ihrem Leben.",
     "Entdecke Produkte für Baby & Kids bei LuxeStyle CH – für die Kleinsten in deinem Leben. Gratis-Versand ab CHF 50."),
    ("aufbewahrung-sub", "seo_d", "voll",
     "Entdecken Sie exklusive Aufbewahrungsprodukte. Gratis-Versand ab CHF 50.",
     "Entdecke Aufbewahrungsprodukte bei LuxeStyle. Gratis-Versand ab CHF 50."),
    ("foto-tech", "seo_d", "voll",
     "Entdecken Sie exklusive Foto-Accessoires. Gratis-Versand ab CHF 50.",
     "Entdecke Foto-Accessoires bei LuxeStyle. Gratis-Versand ab CHF 50."),
    ("gadgets", "seo_d", "voll",
     "Entdecken Sie coole Gadgets bei LuxeStyle. Gratis-Versand ab CHF 50. Jetzt bestellen!",
     "Entdecke coole Gadgets bei LuxeStyle. Gratis-Versand ab CHF 50."),
    ("sg-wohnen", "seo_d", "voll",
     "Entdecken Sie unsere Auswahl an Wohnen & Deko Produkten. Gratis-Versand ab CHF 50.",
     "Entdecke Wohn- & Deko-Produkte zum Selbstgestalten. Gratis-Versand ab CHF 50."),
    ("sg-trinken", "seo_d", "voll",
     "Gestalten Sie Ihre eigene Tasse oder Flasche bei LuxeStyle. Gratis-Versand ab CHF 50.",
     "Gestalte deine eigene Tasse oder Flasche bei LuxeStyle. Gratis-Versand ab CHF 50."),
    ("sg-accessoires", "seo_d", "voll",
     "Gestalten Sie Ihre Accessoires selbst & entdecken Sie unsere hochwertigen Produkte. Gratis-Versand ab CHF 50.",
     "Gestalte deine Accessoires selbst bei LuxeStyle. Gratis-Versand ab CHF 50."),
    # 5 — «sortiert nach Preis» bei sortOrder CREATED_DESC
    ("kuechen-gadgets", "html", "teil",
     " Entdecke jetzt die beliebtesten Küchenhelfer – sortiert nach Preis, damit du schnell dein Schnäppchen findest.",
     " Entdecke jetzt unsere Küchenhelfer."),
    ("damen-jacken-maentel", "html", "teil",
     "die jeden Look vervollständigt – sortiert nach Preis, damit du dein Lieblingsstück schnell findest.",
     "die jeden Look vervollständigt."),
    ("damen-strick-pullover", "html", "teil",
     "deinen neuen Lieblings-Layer, sortiert nach Preis.",
     "deinen neuen Lieblings-Layer."),
    ("chronographen-automatik", "html", "teil",
     " Sortiert nach Preis, damit du schnell dein Modell findest.",
     ""),
    ("haustier-katze", "html", "teil",
     "<p>Sortiert nach Preis – so findest du im Handumdrehen das Passende zum Toben, Ruhen und Spielen.</p>",
     "<p>Das Passende zum Toben, Ruhen und Spielen.</p>"),
    ("ventilatoren", "html", "teil", SORT_SATZ_PREIS, "<p>Gratis-Versand ab CHF 50.</p>"),
    ("luftreiniger-klimageraete", "html", "teil", SORT_SATZ_PREIS, "<p>Gratis-Versand ab CHF 50.</p>"),
    ("lampen-leuchten", "html", "teil", SORT_SATZ_PREIS, "<p>Gratis-Versand ab CHF 50.</p>"),
    # 23.09. abends — Pruefer-Nachlauf: «Nach Preis sortiert» in 5 Kollektionen (alle CREATED_DESC), tote Marken in 6
    ("haustier-katze", "seo_d", "voll",
     "Katzen-Zubehör bei LuxeStyle: Kratzbäume, Katzenbetten, Spielzeug & Katzenklo für deine Samtpfote. Nach Preis sortiert. Gratis-Versand ab CHF 50.",
     "Katzen-Zubehör bei LuxeStyle: Kratzbäume, Katzenbetten, Spielzeug & Katzenklo für deine Samtpfote. Gratis-Versand ab CHF 50."),
    ("kissen-wohntextilien", "html", "teil",
     "<p>Nach Preis sortiert, damit du schnell das passende Wohntextil findest. Versandkostenfrei ab CHF 50.</p>",
     "<p>Versandkostenfrei ab CHF 50 – die Lieferzeit steht bei jedem Artikel.</p>"),
    ("haarpflege", "html", "teil",
     " Nach Preis aufsteigend sortiert, damit du schnell dein Lieblingsprodukt findest.",
     " Gratis-Versand ab CHF 50."),
    ("naegel", "html", "teil",
     " Nach Preis aufsteigend sortiert für den schnellen Überblick.",
     " Gratis-Versand ab CHF 50."),
    ("fitness-geraete", "html", "teil",
     "Qualitativ hochwertige Ausrüstung für Einsteiger und Profis – nach Preis sortiert, damit du schnell das passende Gerät für dein Budget findest.",
     "Ausrüstung für Einsteiger und Profis – Gratis-Versand ab CHF 50."),
    # baby-kids: 14 aktive = Plüsch-Babytiere, Folienballone zur Geburt, Schwimmring, Kinderkostüme (gemessen 23.09.);
    # keine Babytragen/Hochstühle mehr — Chicco, Bright Starts, Kinderkraft 0 aktiv, dazu der Modellcode KLJOY02BEG000AC (SKU-Leck)
    ("baby-kids", "html", "teil",
     "<p>Entdecke bei uns alles für deine Kleinsten! Von praktischen Babytragen wie dem Chicco Baby Carrier Hip Seat bis zu gemütlichen Baby-Liegestühlen von Chicco Froggy oder Bright Starts findest du hier die perfekte Ausstattung. Auch sichere Babybettchen wie das Kinderkraft KLJOY02BEG000AC und komfortable Hochstühle von Bright Starts Pop N Dine oder Chicco Sage warten auf dich.</p>",
     "<p>Entdecke bei uns alles für deine Kleinsten: kuschelige Plüsch-Babytiere, Folienballone zur Geburt, Schwimmringe für Kleinkinder und Kinderkostüme für die erste Fasnacht.</p>"),
    ("herren-grooming", "seo_d", "voll",
     "Haarschneider, Barttrimmer & Elektrorasierer von Philips, Braun, Remington & Wahl. Männerpflege leicht gemacht – Gratis Versand ab CHF 50.",
     "Haarschneider, Elektrorasierer, Bartpflege-Öl & Rasierer-Halter für die Männerpflege zuhause. Gratis-Versand ab CHF 50."),
    ("zahnpflege", "seo_d", "voll",
     "Elektrische Zahnbürsten (Oral-B, Philips Sonicare, Braun) & Mundduschen bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.",
     "Elektrische Schallzahnbürsten, Mundduschen & Zahnbürstenhalter bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe."),
    ("zahnpflege", "html", "teil",
     "Entdecke elektrische Zahnbürsten von Oral-B – auch für Kids mit Frozen-Motiv – sowie Mundduschen von Panasonic.",
     "Entdecke elektrische Schallzahnbürsten, Einweg-Zahnbürsten für unterwegs und mobile Mundduschen."),
    ("spielzeug-lernen", "html", "teil",
     "Mit jedem Spielzeug aus dieser Kategorie, sei es ein Ravensburger Lernspiel oder ein Fisher-Price Produkt, investierst du",
     "Mit jedem Spielzeug aus dieser Kategorie – magnetisch, geometrisch oder aus Holz – investierst du"),
    ("garten-deko-outdoor", "html", "teil",
     "Von beruhigenden 36-Röhren Windspielen mit Stativ bis zu auffälligen aufblasbaren Pool-Figuren wie dem Intex Hummer findest du hier alles. Sogar edle 3er Yoga Figuren in Gold-Schwarz für dein Heim oder coole Actionfiguren von Bandai und Hasbro für drinnen sind dabei – mach dein Zuhause noch schöner!",
     "Von Windspielen und Gartensteckern bis zu Ornamenten im Landhausstil findest du hier alles für Garten und Balkon – mach dein Zuhause draussen noch schöner!"),
    ("camping-licht-outdoor", "html", "teil",
     "praktische Stirnlampen wie die Varta Sports H30R Pro und",
     "praktische Stirnlampen mit USB-Ladung und"),
]

PRODUKT_HERREN_WEG = [("gid://shopify/Product/15453601890689", "Silberarmband")]
MANN_TITEL = re.compile(r"herren|männer|\bmann\b|\bmen\b|für ihn|gentleman|\bpapa\b|vater", re.I)
FRAU_TEXT = re.compile(r"für Frauen|für Damen|Damenschmuck|Geschlecht: Damen", re.I)


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    letzte = None
    for i in range(10):
        r = urllib.request.Request(API, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(r, timeout=90))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as e:
            letzte = str(e)[:120]
            time.sleep(3 + 3 * i)
            continue
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in d.get("errors") or []):
            letzte = "THROTTLED"
            time.sleep(5 + 2 * i)
            continue
        nachlauf(d)
        if d.get("errors"):
            raise RuntimeError(f"GraphQL-Fehler: {str(d['errors'])[:300]}")
        return d["data"]
    raise RuntimeError(f"Shopify antwortet nicht ({letzte}) — Abbruch, damit nichts falsch quittiert wird")


def ledger(objekt, feld, alt, neu):
    zeit = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sauber = lambda s: (s or "").replace("\t", " ").replace("\n", "\\n")  # noqa: E731
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([zeit, objekt, feld, sauber(alt), sauber(neu)]) + "\n")
        f.flush()
        os.fsync(f.fileno())


def lesen(handle):
    return gql('query($h:String!){collectionByHandle(handle:$h){id handle sortOrder descriptionHtml seo{title description}}}',
               {"h": handle})["collectionByHandle"]


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def pruefen(handle, c, neu, geaendert):
    """Liefert Liste von Verstössen für die NEUEN Werte (nur geänderte Felder zählen)."""
    fehler = []
    werte = {"html": text(neu["html"]), "seo_d": neu["seo_d"] or "", "seo_t": neu["seo_t"] or ""}
    for f in geaendert:
        w = werte[f]
        if "ß" in w:
            fehler.append(f"{f}: ß")
        if SIE_ANREDE.search(w):
            fehler.append(f"{f}: Sie-Anrede «{SIE_ANREDE.search(w).group(0)}»")
        if MARKE_RX.search(w):
            fehler.append(f"{f}: tote Marke «{MARKE_RX.search(w).group(0)}»")
        if MARKE_KONTEXT_RX.search(w):
            fehler.append(f"{f}: tote Marke im Kontext «{MARKE_KONTEXT_RX.search(w).group(0)}»")
        if handle in CJ_KOLLEKTIONEN and CH_VERSPRECHEN.search(w):
            fehler.append(f"{f}: CH-Lager-Versprechen bei CJ-Ware «{CH_VERSPRECHEN.search(w).group(0)}»")
        if c["sortOrder"] != "PRICE_ASC" and SORTIERT.search(w):
            fehler.append(f"{f}: «sortiert nach Preis» bei sortOrder {c['sortOrder']}")
    if "seo_d" in geaendert:
        if len(neu["seo_d"]) > 155:
            fehler.append(f"seo_d: {len(neu['seo_d'])} Zeichen > 155")
        if USP not in neu["seo_d"]:
            fehler.append("seo_d: ohne «Gratis-Versand ab CHF 50»")
    if "seo_t" in geaendert and len(neu["seo_t"]) > 65:
        fehler.append(f"seo_t: {len(neu['seo_t'])} Zeichen > 65")
    if "html" in geaendert:
        h = neu["html"]
        if h.count("<p>") != h.count("</p>"):
            fehler.append("html: <p>-Bilanz kaputt")
        if (c["descriptionHtml"] or "").count("<!--gd2-->") != h.count("<!--gd2-->"):
            fehler.append("html: <!--gd2--> verloren")
        if re.search(r"\s[.,]|\.\.|<p>\s*</p>", h):
            fehler.append("html: kaputtes Satzende/leerer Absatz")
    return fehler


def marken_gegenprobe():
    """Jede tote Marke live nachzählen (+ Kanarienvogel). Liefert Menge der Marken mit >0 aktiven."""
    lebend = set()
    for m in TOTE_MARKEN + ["ZZZNICHTDA-xqzv"]:
        z = gql('query($q:String!){productsCount(query:$q,limit:null){count precision}}',
                {"q": f'status:active AND vendor:"{m}"'})["productsCount"]
        if z["precision"] != "EXACT":
            raise RuntimeError(f"Markenzählung ungenau: {m} {z}")
        if z["count"] > 0:
            lebend.add(m)
    return lebend


def worte_diff(a, b):
    return " ".join(x for x in difflib.ndiff(a.split(" "), b.split(" ")) if x[:1] in "+-")


def main():
    lebend = marken_gegenprobe()
    # Makita hat 1 aktives Fremd-Ladegerät «für Makita 18V Akkus» — ausserhalb von elektrowerkzeug (gemessen)
    unerwartet = lebend - {"Makita"}
    if unerwartet:
        print(f"⛔ Marken wieder aktiv: {sorted(unerwartet)} — Abbruch, Texte erst neu messen")
        print("KOLL-TEXTE: ABBRUCH (Marken)")
        return 1
    handles = []
    for h, *_ in PLAN:
        if h not in handles:
            handles.append(h)
    diff = open(DIFF, "w", encoding="utf-8")
    stat = {"geplant": 0, "schon": 0, "abweichung": 0, "verstoss": 0, "geschrieben": 0, "fehler": 0}
    for h in handles:
        c = lesen(h)
        if not c:
            print(f"  ❔ {h}: Kollektion fehlt")
            stat["abweichung"] += 1
            continue
        alt = {"html": c["descriptionHtml"] or "", "seo_d": (c["seo"] or {}).get("description") or "",
               "seo_t": (c["seo"] or {}).get("title") or ""}
        neu = dict(alt)
        geaendert, notiz = [], []
        for hh, feld, art, a, n in PLAN:
            if hh != h:
                continue
            if art == "voll":
                if neu[feld] == n:
                    notiz.append(f"{feld}: schon erledigt")
                    continue
                if neu[feld] != a:
                    notiz.append(f"{feld}: ABWEICHUNG (live «{neu[feld][:80]}…»)")
                    stat["abweichung"] += 1
                    continue
                neu[feld] = n
            else:
                k = neu[feld].count(a)
                if k == 0 and (not n or n in neu[feld]):
                    notiz.append(f"{feld}: Baustein schon erledigt")
                    continue
                if k != 1:
                    notiz.append(f"{feld}: ABWEICHUNG (Baustein {k}× gefunden)")
                    stat["abweichung"] += 1
                    continue
                neu[feld] = neu[feld].replace(a, n)
            if feld not in geaendert:
                geaendert.append(feld)
        verstoesse = pruefen(h, c, neu, geaendert) if geaendert else []
        diff.write(f"===== {h}  ({c['id']}, sortOrder {c['sortOrder']})\n")
        for f in ("seo_t", "seo_d", "html"):
            if f in geaendert:
                diff.write(f"--- {f} ALT ({len(alt[f])}): {alt[f]}\n+++ {f} NEU ({len(neu[f])}): {neu[f]}\n")
                diff.write(f"    Δ {worte_diff(alt[f], neu[f])}\n")
        for x in notiz:
            diff.write(f"    · {x}\n")
        for x in verstoesse:
            diff.write(f"    ⛔ {x}\n")
        diff.write("\n")
        if not geaendert:
            stat["schon"] += 1
            print(f"  = {h}: nichts zu tun ({'; '.join(notiz)})")
            continue
        if verstoesse:
            stat["verstoss"] += 1
            print(f"  ⛔ {h}: {verstoesse} — nicht geschrieben")
            continue
        stat["geplant"] += 1
        print(f"  → {h}: {', '.join(geaendert)}{' · ' + '; '.join(notiz) if notiz else ''}")
        if not SCHARF:
            continue
        inp = {"id": c["id"]}
        if "html" in geaendert:
            inp["descriptionHtml"] = neu["html"]
        if "seo_d" in geaendert or "seo_t" in geaendert:
            inp["seo"] = {"title": neu["seo_t"], "description": neu["seo_d"]}
        r = gql("mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{id} userErrors{field message}}}", {"i": inp})
        errs = (r.get("collectionUpdate") or {}).get("userErrors")
        if errs is None or errs:
            stat["fehler"] += 1
            print(f"  ✗ {h}: {errs}")
            continue
        z = lesen(h)
        live = {"html": z["descriptionHtml"] or "", "seo_d": (z["seo"] or {}).get("description") or "",
                "seo_t": (z["seo"] or {}).get("title") or ""}
        # Shopify normalisiert HTML evtl. (Entities) — Vergleich über den sichtbaren Text, SEO exakt
        ok = all((text(live[f]) == text(neu[f])) if f == "html" else (live[f] == neu[f]) for f in geaendert)
        if not ok:
            stat["fehler"] += 1
            print(f"  ✗ {h}: Rücklesen weicht ab")
            continue
        for f in geaendert:
            ledger(h, f, alt[f], live[f])
        stat["geschrieben"] += 1
        print(f"  ✓ {h}: geschrieben + rückgelesen")

    # 6 — falscher herren-Tag an Damenschmuck
    for pid, erwartet in PRODUKT_HERREN_WEG:
        p = gql('query($id:ID!){product(id:$id){id title status tags descriptionHtml collections(first:40){nodes{handle}}}}',
                {"id": pid})["product"]
        herren = [t for t in p["tags"] if t.lower() == "herren"]
        frau = FRAU_TEXT.search(text(p["descriptionHtml"]))
        diff.write(f"===== PRODUKT {pid} «{p['title']}» {p['status']}\n    Tags: {p['tags']}\n"
                   f"    Kollektionen: {[c['handle'] for c in p['collections']['nodes']]}\n"
                   f"    Frauen-Beleg: «{frau.group(0) if frau else '—'}» · herren-Varianten: {herren}\n\n")
        if not herren:
            print(f"  = {erwartet}: herren-Tag schon weg")
            continue
        if p["title"] != erwartet or MANN_TITEL.search(p["title"]) or not frau:
            print(f"  ⛔ {erwartet}: Titel/Beschreibung nicht eindeutig Damen — nicht angefasst")
            stat["verstoss"] += 1
            continue
        stat["geplant"] += 1
        print(f"  → {erwartet}: tagsRemove {herren} (Beleg «{frau.group(0)}»)")
        if not SCHARF:
            continue
        r = gql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{field message}}}",
                {"id": pid, "t": herren})
        errs = (r.get("tagsRemove") or {}).get("userErrors")
        if errs is None or errs:
            stat["fehler"] += 1
            print(f"  ✗ {erwartet}: {errs}")
            continue
        z = gql('query($id:ID!){product(id:$id){tags}}', {"id": pid})["product"]
        if any(t.lower() == "herren" for t in z["tags"]):  # Shopify wertet gross/klein-blind aus
            stat["fehler"] += 1
            print(f"  ✗ {erwartet}: herren-Tag steht noch da: {z['tags']}")
            continue
        ledger(pid, "tags", ",".join(p["tags"]), ",".join(z["tags"]))
        stat["geschrieben"] += 1
        print(f"  ✓ {erwartet}: herren weg, rückgelesen")
    diff.close()
    modus = "SCHARF" if SCHARF else "DRY"
    print(f"KOLL-TEXTE ({modus}): {stat['geplant']} geplant · {stat['geschrieben']} geschrieben+rückgelesen · "
          f"{stat['schon']} schon erledigt · {stat['abweichung']} Abweichung · {stat['verstoss']} Verstoss · "
          f"{stat['fehler']} Fehler · Diff {DIFF}")
    return 1 if stat["fehler"] else 0


if __name__ == "__main__":
    sys.exit(main())
