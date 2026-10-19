"""Stellt die Hype-Reihe der Startseite zusammen — und räumt sie von selbst wieder ab.

AUFTRAG DES BETREIBERS (12.08.2026, wörtlich): «informiere dich immer über neuste hype
produkte und so und mache auch in startseite ganz gross irgendwo paar coolen produkten, aber
wen hype vorbei produkt ändern.»

Der zweite Halbsatz ist der schwierige. Eine Trend-Reihe anzulegen ist leicht; das Problem ist,
dass sie ein halbes Jahr später immer noch dieselben Artikel zeigt. Deshalb trägt jedes
Produkt hier ein DATUM: `hype-seit-JJJJ-MM-TT`. Läuft dieses Skript erneut, verliert alles,
was älter ist als HYPE_TAGE (Vorgabe 21), den Tag `hype-jetzt` und verschwindet aus der Reihe —
ohne dass jemand daran denken muss. Die Ware bleibt im Shop, sie führt nur nicht mehr die
Startseite an.

WOHER DIE THEMEN KOMMEN: aus einer Recherche, die zu jedem Lauf gehört (Web-Suche nach
aktuellen TikTok-/Dropshipping-Trends). Die Liste unten ist der Stand vom 12.08.2026:
Beauty-Geräte, Schnecken-/Serum-Hautpflege, Mini-Beamer, «aesthetic» Ordnungshelfer,
Shapewear, 3-in-1-Ladestationen. Wer sie ändert, trägt das Datum in QUELLE nach — sonst weiss
die nächste Session nicht, wie alt der Stand ist.

⚠️ NICHT JEDES TREFFERPRODUKT TAUGT FÜR DIE STARTSEITE. Verlangt werden: mindestens zwei
Bilder (sonst kein Karussell auf der Karte), Preis ab CHF 19 (darunter wirkt die Reihe wie ein
Ramschtisch und liegt zu nahe am Preisboden), im Google-Kanal, und keine der Warengruppen, die
schon einmal aus der Startreihe genommen wurden (Kostüm, Spielzeug, Partydeko).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from werbetest_sperre import gesperrt as werbetest_gesperrt, HINWEIS as WERBETEST_HINWEIS  # noqa: E402  (13.10.2026)


def ohne_werbetest(liste, wie=lambda x: x["id"]):
    """13.10.2026 Werbetest A: Produkte aus dropship/_werbetest_sperre.txt bis Testende weder aufnehmen noch abräumen."""
    rest = []
    for x in liste:
        if werbetest_gesperrt(wie(x)):
            print(f"   {WERBETEST_HINWEIS}: {str((x[0] if isinstance(x, tuple) else x).get('title', ''))[:52]}", flush=True)
        else:
            rest.append(x)
    return rest
HEUTE = os.environ.get("HEUTE") or time.strftime("%Y-%m-%d")
HYPE_TAGE = int(os.environ.get("HYPE_TAGE", "21"))
PRO_THEMA = int(os.environ.get("PRO_THEMA", "1"))  # 31.08.: 2 je Thema landete als PAAR nebeneinander in der Reihe (zwei Beamer, zwei Kleider) — sieht aus wie Katalogauszug
TAG = "hype-jetzt"
HANDLE = "hype-jetzt"
LEDGER = "dropship/_hype_verlauf.txt"

QUELLE = "Web-Recherche 19.10.2026 (Betreiber «mache weiter alle verbesserungen…»; hypersku.com 14.10.2026, z.media 12.10.2026, minerxads.com 18.10.2026, autods.com 15.09.2026 — US-Listen, Umsatzzahlen = Anbieter-Schätzung, BEHAUPTUNG, CH-Übertragbarkeit ebenfalls): NEU Nackenmassagegerät (Bestand GEMESSEN 15 aktiv, 14 frei), Kuscheldecke (20/14), Heizjacke (4/4), Waffeleisen (5/4, nur mit Stecker-Beleg), Thermo-Lockenbürste (6/5). NICHT übernommen: Pflegesets/Kollagen/Spot-Patches/Vernebler (Betreiber 30.08.: topische Kosmetik/Supplements/Medizin), Parfüm-Mini-Sets (kein Entscheid), Bluetooth-Lautsprecher/Smartwatch (zu breit), Haustierbett (Reihe schon 16 % Haustier), Hausschuhe (38 von 58 < CHF 19), Tumbler (Katzenspielzeug). Davor: siehe QUELLE_ALT"
QUELLE_ALT = "Web-Recherche 13.10.2026 (Betreiber «mach bitte du alles weiter»; eprolo/sellthetrend/wholesale2b/cjdropshipping Oktober 2026, TikTok-Newsroom Holiday 2025 — Umsatz-/Wachstumszahlen = Anbieter-Werbung, BEHAUPTUNG): NEU «Drehbares Gewürzregal» (rotating spice rack; Bestand GEMESSEN title:*drehbar*+*Gewürz* 4, davon 3 ab CHF 19 mit ≥ 4 Bildern). GEMESSEN und NICHT übernommen: schwebende/unsichtbare Regale 0, LED-Streifen 6 (generisch), Familien-/Weihnachts-Pyjamas 12/9 (alle ab CHF 14.90 = unter dem Reihen-Boden 19; gehören in die Weihnachts-Reihe), Fellpflege-Handschuh steckt schon in «Haustier-Fellpflege»; Pimple Patches weiter abgelehnt (Wundauflage). Kanarie: title:*Haarbürste* 3 = Methode sieht Treffer. — davor Web-Recherche 10.10.2026 (Betreiber «weiter»; sellthetrend «Winning Products» Oktober 2026: Beauty & Personal Care + Home & Seasonal Décor vorn, genannt GreenGlide Trimmer, DreamDuo Support Pillow, GraveGlow Harvester — Umsatzzahlen = Anbieter-Werbung, BEHAUPTUNG): NEU «Schlaf-Stützkissen» (Bestand GEMESSEN 20: Stütz 5, Knie 4, Seitenschläfer 2, Schwangerschaft 9). NICHT übernommen: Trimmer (34 Haarschneider im Bestand = Rasur/Pflege, kein Hype-Thema), leuchtende Halloween-Deko (Saison-Reihe, Partydeko-Regel); dodropshipping August-Liste (Promise-Ringe, Foto-Medaillon, Skelett-Uhren, Haar-Supplements) — Supplements abgelehnt (Lebensmittel). — davor Web-Recherche 07.10.2026 (Betreiber «lerne im internet»; sellthetrend «Winning Products, Updated for October 2026» (Stand 22.09.), eprolo/shiptothemoon 2026): NEU «Schleckmatte Haustier» (Bestand GEMESSEN 11, 5 ab CHF 19). GEMESSEN und NICHT uebernommen: Claw-Clips (9 Treffer, alle CHF 15.90 = unter dem Reihen-Boden 19), Haar-Lametta 0, Haarkreide 0, Schuhwaschbeutel 0, Y2K-Schild-Sonnenbrille 1, Grillschuerze 1; Silikon-Gesichtsbuerste (23) steckt schon in «Beauty-Geraet»; Halloween-Deko (60) gehoert in die Saison-Reihe, nicht hierher (Partydeko-Regel). Kanarie: title:*Haarbuerste* findet 3 = Methode sieht Treffer. — davor Web-Recherche 27.09.2026 (Websuche «TikTok viral products late September 2026», wholesale2b/sellthetrend): BESTAETIGT Hunde-Trinkflasche, Sternenhimmel-Projektor, UV-Zahnbuerstenreiniger, 3-in-1-Ladestation (Qi2), Home-Decor. EINE neue Nennung am Bestand GEMESSEN (productsCount status:active): «2-in-1-Haarbuerste mit Wasserspruehnebel (AquaBrush)» 0 (Haarbuerste*Spray/Spruehbuerste 0; Kanarienvogel title:*Haarbuerste* findet 3 = Methode sieht Treffer). NICHT uebernommen: Peeling-Seren (topische Kosmetik, Betreiber-Entscheid 30.08.). THEMEN unveraendert. — davor Web-Recherche 24.09.2026 (sellthetrend «Winning Products, Updated for September 2026»): BESTAETIGT die Liste vom 23.09. (3-in-1-Ladestation, beruehrungslose Spender, UV-Zahnbuerstenreiniger, Lifting-Tape, Retro-OTG-Goggles, doppelseitige Paar-Hoodies). DREI neue Nennungen am Bestand GEMESSEN (productsCount status:active): «Mini-Beutelversiegler» 0, «Antibeschlag-Spiegelfolie» 0 (die 22 Antibeschlag-Treffer sind Schwimm-/Skibrillen und Sprays), «Silikon-Saugnapf-Handyhalter» 0 (2 Treffer sind Armaturenbrett-/Spiegelhalter, nicht das virale Saugpad). NICHT uebernommen: Plasma-Lichtbogen-Feuerzeug (Raucherbedarf gehoert nicht auf die Startseite). THEMEN unveraendert. — davor Web-Recherche 23.09.2026 (sellthetrend/eprolo/cjdropshipping September): DREI Themen NEU, alle am Bestand GEMESSEN (productsCount, title:*x*): «Sternenhimmel-Projektor» (Trendlisten: tiny projector with night sky effect; Bestand 41 + 13 Galaxy), «Hunde-Trinkflasche tragbar» (portable dog water bottle; Bestand 5), «Mini-Staubsauger» (mini desktop vacuum; Bestand 4). Bestaetigt: Hygiene-Gadgets (UV-Zahnbuerstenreiniger, beruehrungslose Spender), Ordnung/aesthetic living, Retro-OTG-Goggles, Dock-Stand (= Ladestation 3-in-1), Katzen-Laserspielzeug (Haustier-Spielzeug smart). NICHT uebernommen: Travel-Hoodie mit Rucksack (0 im Bestand), Selfie-Monitor (0), Gummy Blocks (Spielzeug — Reihe nimmt kein Spielzeug), Pimple Patches (Wundauflage). — davor Web-Recherche 21.09.2026 — BESTAETIGT die Liste vom 18.09., KEINE Aenderung an THEMEN noetig: Hygiene-Gadgets (beruehrungslose Spender, UV-Zahnbuerstenreiniger), Ordnung/aesthetic living, Creator-Zubehoer und Retro-OTG-Goggles stehen alle schon drin. DREI neue Vorschlaege am eigenen Bestand gegengeprueft (Voll-Export 51'331 aktive, 21.09. 01:11) statt uebernommen: (a) «Pimple Patches», in den Listen als profitabelster Artikel fuer Ende 2026 gefuehrt — im Bestand GEMESSEN 2 Produkte, und eines davon ist ein «Hydrokolloid-Verband», also eine Wundauflage; gehoert NICHT auf die Startseite. (b) «Travel-Hoodie mit Rucksack»: 0 im Bestand. (c) «Selfie-Monitor»: 0 im Bestand. Gegenprobe, dass die Messung ueberhaupt finden KANN: dasselbe Verfahren fand 23 aktive Hygiene-Gadgets. Fazit: zwei von drei neuen Trends waeren folgenlos geblieben, der dritte ist rechtlich heikel — die Themenliste bleibt unveraendert. ABGELEHNT wie bisher: Wellness-/Magnet-Armband (Heilversprechen), Supplements/Olivenoel (Lebensmittel), Snail-Essence/Seren (topische Kosmetik, Betreiber-Entscheid 30.08.) — davor Web-Recherche 18.09.2026 (eprolo/sellthetrend/cjdropshipping September: Hygiene-Gadgets NEU (UV-Sterilisation, beruehrungslose Spender); Blush-Balms, Lifting-Tape, Doppelseitige Paar-Hoodies und Ordnung/aesthetic living erneut bestaetigt. ABGELEHNT trotz Trendlisten: Wellness-/Magnet-Armband (15 im Bestand) = Heilversprechen, gehoert in dieselbe Klasse wie die aus den Werbekanaelen ausgeschlossenen 1667; Supplements/Olivenoel = Lebensmittel; Snail-Essence/Seren = topische Kosmetik, Betreiber-Entscheid 30.08.) — davor 13.09.2026 (Retro-OTG-Goggles/Motorradbrillen NEU; Creator-Handyhalter/Ringlicht; Halloween-Kostueme bewusst NICHT hier) — davor 03.09.2026 (smarte Haustier-Spielzeuge, Handy-Umhaengetaschen, Kerzenwaermer)"
THEMEN = {
    # ⚠️ «IPL» ohne Wortgrenze steckt in «L-IPL-iner»: der erste Lauf setzte einen
    # «Peel-Off Lipliner» als Beauty-GERÄT auf die Startseite. Dieselbe Falle wie «rock» in
    # «GT Line ROCK» aus dem Projektgedächtnis — bei Abkürzungen immer \b.
    # 25.08.: Spätaugust-Listen ergänzen Ice Roller, Kopfhaut-Massage und EMS-GESICHTS-Toner.
    # ⚠️ «EMS» allein bleibt draussen — EMS-Bauchtrainer ist Fitness (Abgrenzung im
    # medizin_zweck-Gedächtnis); nur mit Gesichts-Anker. «Scalp» braucht Massage-Anker.
    "Beauty-Gerät": re.compile(
        r'\bIPL\b|Mikrostrom|LED-Maske|Gesichtsreinigungsb[üu]rste|Dermaroller|Gua Sha|'
        r'Jade Roller|Haarentfernungs|Ice[- ]?Roller|Eisroller|'
        r'Kopfhaut[- ]?Massage|Scalp[- ]?Massag|EMS[- ]?(?:Gesicht|Face)|Face[- ]?(?:EMS|Toner)', re.I),
    # «Hautpflege-Serum» ENTFERNT am 30.08.: topische Kosmetik (Creme/Serum aus China) wird
    # nicht mehr prominent beworben — Betreiber-Entscheid. Fuehren im Katalog bleibt.
    # Neu 07.10.2026: Schleckmatten (Lick Mats) — in den Oktober-Listen als «went viral on pet TikTok and
    # maintained strong sales» (eprolo/sellthetrend). Bestand GEMESSEN: 11 Treffer, 5 ab CHF 19.
    # Kanarie: «Hundegurt zur Lick-Prävention» darf NICHT treffen → nur die deutschen Wörter, kein «Lick».
    # 13.10.2026: rotating spice rack (Trendlisten Oktober). Nur DREHBARE Regale/Karussells — das «Drehbarer Gewürztopf» bleibt draussen.
    "Drehbares Gewürzregal": re.compile(
        r'Drehbare?[rs]?\s+Gew[üu]rz(?:regal|karussell|st[äa]nder)|Gew[üu]rzkarussell|Gew[üu]rz(?:regal|st[äa]nder)[^,]{0,25}drehbar', re.I),
    "Schleckmatte Haustier": re.compile(r'Schleckmatte|Leckmatte|Schleckplatte', re.I),
    # 10.10.2026: Sell The Trend Oktober nennt ein Stützkissen («DreamDuo Support Pillow») unter Beauty/Home; Bestand GEMESSEN:
    # Stützkissen 5, Kniekissen 4, Seitenschläferkissen 2, Schwangerschaftskissen 9. Bezüge/Hüllen zählen nicht (nur der Bezug).
    "Schlaf-Stützkissen": re.compile(r'(?:Seitenschl[äa]fer|Knie|Schwangerschafts(?:-Stütz)?|Stütz)kissen(?!bezug|hülle|-?bezug)', re.I),
    "Mini-Beamer": re.compile(r'Mini-?\s?(?:Beamer|Projektor)|Smart Mini Beamer', re.I),
    # Neu 18.09.2026: Hygiene-Gadgets (UV-Sterilisation, berührungslose Spender) stehen in
    # den September-Trendlisten weit oben. Der Bestand trägt sie (gemessen).
    # ⚠️ «UV» ALLEIN IST UNBRAUCHBAR — im Trockentest gegen 120 echte Titel traf es
    # **109 davon**: «Sonnenbrille … UV-Schutz», «Sonnenhut … UV-Schutz», «UV400»,
    # «Regenschirm UV-beschichtet». Dieselbe Falle wie \bIPL\b in «L-IPL-iner», nur
    # noch breiter. Mit dem Anker unten bleiben aus derselben Stichprobe 4 echte übrig
    # (UV-Desinfektionstasche, Zahnbürstenhalter mit UV-Sterilisator, zwei Sterilisatoren).
    # Beim Seifenspender zählt nur die BERÜHRUNGSLOSE Bauart — «Retro Keramik
    # Seifenspender» und «Küchenbürste mit Seifenspender» sind der Trend NICHT.
    "Hygiene-Gadget": re.compile(
        r'^(?!.*(?:Baby|Flasche))(?:.*(?:UV[- ]?(?:Sterilisator|Sterilisier|Desinfekt|Reiniger)|UVC\b|'
        r'Sterilisator|Desinfektionsbox|Desinfektionstasche|'
        r'(?:Ber[üu]hrungslos|Sensor|Automatisch)\w*[- ]?(?:Seifenspender|Spender)))', re.I),
    "Ordnung & Aesthetic": re.compile(
        r'Organizer|Aufbewahrungskorb|Aufbewahrungsbox|Ordnungssystem', re.I),
    "Shapewear": re.compile(r'Shapewear|Body Shaper|Figurformend|Taillenformer', re.I),
    # 10.10.2026: «MagSafe» allein traf eine iPhone-Hülle zum Selbstgestalten → nur mit Lade-/Powerbank-Wort
    "Ladestation 3-in-1": re.compile(r'\d-in-\d[- ]?(?:Wireless )?Ladestation|'
                                     r'MagSafe[®]?[- ]?(?:Lade|Charger|Powerbank|Ständer|Halterung mit Lade)|'
                                     r'(?:Lade\w*|Charger|Powerbank)\b[^,]{0,25}MagSafe|'
                                     r'Magnet-Ladestation|Wireless Powerbank', re.I),
    # Neu 15.08.: Blush-Balms/Cream-Blush sind laut August-Trendberichten die
    # meistgehypte Makeup-Kategorie auf TikTok (günstig, breite Zielgruppe).
    "Blush & Lippen-Balm": re.compile(
        r'Blush[- ]?(?:Balm|Stick)|Cream[- ]?Blush|Rouge[- ]?Stick|Wangenr[öo]te|'
        r'Lip[- ]?(?:Balm|Tint)|Lippenbalsam.*(?:T[öo]nung|Farbe)', re.I),
    # Neu 19.08.: Face-/Lifting-Tapes («Invisible Lifting Tape») und Haarglätter/Multistyler
    # tauchen in mehreren August-Trendlisten auf; Hals-Ventilatoren tragen den Spätsommer.
    # «Tape» allein wäre eine Falle (Klebeband/Washi-Tape) → Lifting/Face als Pflicht-Anker.
    "Lifting-Tape": re.compile(
        r'(?:Lifting|Face|Gesichts?)[- ]?Tape|Gesichtsstraffungs|V-?Face[- ]?(?:Band|Tape)', re.I),
    "Haarglätter & Styler": re.compile(
        r'Haargl[äa]tter|Gl[äa]tteisen|Multi-?styler|Warmluftb[üu]rste|Airstyler|'
        r'Lockenstab|Gl[äa]ttb[üu]rste', re.I),
    # Neu 23.08.: Die August-Listen nennen durchgehend Kerzenwärmer, Aroma-Diffusoren und
    # kleine Küchen-/Ordnungshelfer («home and kitchen gadgets», «aesthetic living»). Für die
    # Schweiz passt das zum Herbstanfang — der Hals-Ventilator läuft dafür aus (er verliert
    # den Tag nach HYPE_TAGE von selbst, es muss ihn niemand entfernen).
    # ⚠️ «Aroma» allein wäre eine Falle (Aroma-Öl in der Küche, «Aroma» in Lebensmitteln) →
    # Diffusor/Wärmer/Duftlampe ist Pflicht-Anker. Dieselbe Regel wie bei «IPL» und «Tape».
    "Kerzenwärmer & Duft": re.compile(
        r'Kerzenw[äa]rmer|Candle[- ]?Warmer|Aroma[- ]?Diffus|Duftdiffus|Duftlampe|'
        r'Aromatherapie[- ]?(?:Diffusor|Lampe)|[ÖO]l[- ]?Diffusor', re.I),
    # ⚠️ «Bürste» allein trifft Haarbürsten, «Trimmer» trifft Bartschneider → Tier-Anker Pflicht.
    "Haustier-Fellpflege": re.compile(
        r'(?:Haustier|Hunde|Katzen|Tierhaar|Fell)[- ]?(?:b[üu]rste|k[äa]mm|Trimmer|'
        r'Schermaschine|Pflegehandschuh)|Fellpflege|Entfilzungs', re.I),
    # ⚠️ «Sealer» allein trifft Fugen-/Lacksiegel → Beutel/Folie als Anker.
    "Beutelverschliesser": re.compile(
        r'Beutelverschlie|Beutelversiegel|Folienschwei[sß]|Bag[- ]?Sealer|'
        r'T[üu]tenverschlie|Vakuumierer', re.I),
    "Hals-Ventilator": re.compile(
        r'(?:Hals|Nacken|Neck)[- ]?(?:Ventilator|Fan|K[üu]hler)|Tragbarer Mini-?Ventilator', re.I),
    # Neu 26.08.: Sunset-Lampen («sunset glow» auf Wand/Decke) nennen zwei August-Listen
    # unabhängig; Heatless-Curls-Sets (Locken ohne Hitze) und Decken-/Oversized-Hoodies
    # tragen den Herbst. ⚠️ «Oversized» allein träfe halbe Damenmode → Hoodie-Anker Pflicht;
    # «Lockenwickler» bleibt mit Heatless/Seide/Set verankert, sonst greift jede Drogerie-Rolle.
    "Sunset-Lampe": re.compile(
        r'Sunset[- ]?(?:Lampe|Lamp|Projekt)|Sonnenuntergangs?[- ]?(?:lampe|projektor|licht)', re.I),
    "Heatless Curls": re.compile(
        r'Heatless[- ]?(?:Curl|Locken)|Locken ohne Hitze|Seiden?[- ]?Lockenwickler|'
        r'Lockenwickler[- ]?(?:Set|Band)|Curling[- ]?(?:Rod|Ribbon)', re.I),
    # Neu 27.08.: CJs eigene «20 Viral TikTok Products 2026» und die September-Liste von
    # sellthetrend nennen uebereinstimmend tragbare Mixer, Mini-/Karaoke-Mikrofone, Ringlichter
    # und Haustier-Helfer (Fusselrolle, Futterautomat). Der Hals-Ventilator laeuft dafuer aus —
    # Ende August ist in der Schweiz Herbstanfang; er verliert seinen Tag von selbst.
    # ⚠️ «Mixer» allein ist eine Falle: Tattoo-Mixer (aus dem Shaker-Fehlgriff vom 21.08.),
    # Handmixer, DJ-Mixer → Smoothie/tragbar/Becher ist Pflicht-Anker.
    "Smoothie-Mixer": re.compile(
        r'Smoothie[- ]?(?:Mixer|Maker|Becher|Blender)|'
        r'Tragbarer?[- ]?(?:Mini-?)?(?:Mixer|Blender)|Standmixer[- ]?to[- ]?go', re.I),
    # Neu 30.08.: Herbstlisten nennen Faszienrollen (Fitness-Reset im September), LED-Strips
    # (aesthetic room makeover) und die 2-in-1-Spruehbuerste; fuer die Schweiz dazu der
    # Herbstanfang: Heiz-/Waermedecken und Fusswaermer. ⚠️ «Roller» allein traefe Ice-Roller
    # und Kopfhaut-Roller (eigene Themen) → Faszien/Foam als Anker. «Strip» allein traefe
    # Wachs-Strips → LED als Pflicht-Anker. «beheizbar» allein traefe Auto-Sitzheizungen →
    # Decke/Weste/Socken/Hausschuhe als Anker.
    "Faszienrolle": re.compile(
        r'Faszienroll|Foam[- ]?Roller|Massageroll(?:e|er)\b', re.I),
    # ⚠️ 03.09.: «WLAN-Controller für LED-Lichtleisten» ist Zubehör, kein Strip → Zubehörwörter aus.
    "LED-Strip": re.compile(
        r'^(?!.*(?:Controller|Netzteil|Verl[äa]ngerung|Verbinder|Adapter)).*LED[- ]?(?:Strip|Streifen|Lichtband|Lichtleiste)', re.I),
    "Spray-Haarbürste": re.compile(
        r'(?:Spray|Spr[üu]h|Wasserspr[üu]h)[- ]?(?:Haar)?b[üu]rste|Spray[- ]?Brush', re.I),
    "Wärme & Kuschel": re.compile(
        r'^(?!.*(?:Auto(?!matisch)|12 ?V\b))(?:.*(?:Heizdecke|W[äa]rmedecke|Heizkissen|Fu[sß]w[äa]rmer|Fussw[äa]rmer|'
        r'beheizbare?[- ]?(?:Decke|Weste|Socken|Hausschuhe)))', re.I),
    # ⚠️ «Mikrofon» allein traefe Studio-, PC- und Konferenzmikrofone → Karaoke/Anstecker
    # als Anker. «Mini» allein sowieso nicht.
    "Karaoke-Mikrofon": re.compile(
        r'Karaoke|Ansteckmikrofon|Ansteck[- ]?Mikro|Funkmikrofon|Lavalier|'
        r'Mini-?Mikrofon(?:[- ]?Set)?', re.I),
    # ⚠️ «Ring» steckt in «MonitoRING» und «ContouRING» (Tag-Fehlgriff vom 27.08.) —
    # deshalb nur die vollstaendigen Woerter, nie «Ring» allein.
    "Ringlicht": re.compile(r'Ringlicht|Ring[- ]?Light|Selfie[- ]?(?:Licht|Ring)|'
                            r'Beauty[- ]?Ringleuchte', re.I),
    # ⚠️ «Roller» allein trifft Ice Roller, Jade Roller, Farbroller und Tretroller →
    # Fussel/Tierhaar als Pflicht-Anker.
    "Tierhaar-Fusselrolle": re.compile(
        r'Fusselrolle|Fusselb[üu]rste|Tierhaarentferner|Tierhaar[- ]?(?:Rolle|B[üu]rste)|'
        r'Pet[- ]?Hair[- ]?Remover', re.I),
    "Futterautomat": re.compile(
        r'Futterautomat|Futterspender|Automatischer?[- ]?(?:Futter|Napf)|'
        r'Wasserspender[- ]?(?:f[üu]r )?(?:Katze|Hund|Haustier)', re.I),
    "Hoodie-Decke": re.compile(
        # 10.10.2026: «Oversize Hoodie» allein = Mode (4 im Bestand, z. B. «Weisser Oversize Hoodie mit Slogan-Stickerei»)
        r'Oversized?[- ]?Hoodie[- ]?Decke|Hoodie[- ]?Decke|Decken[- ]?Hoodie|Wearable Blanket|'
        r'Sherpa[- ]?Hoodie|Doppelseitig(?:er)?[- ]?Hoodie', re.I),
    # Neu 03.09.: Die September-Listen (bebolddigital/eprolo/sellthetrend) nennen smarte
    # Haustier-Spielzeuge (Reaktionsvideos, Impulskauf) und Handy-Umhaengetaschen/-Holster.
    # Halloween-Kostueme stehen ebenfalls dort — bleiben aber draussen (Hausregel 11.08.:
    # kein Kostuem in der Startreihe; Halloween hat seit 31.08. eine eigene Reihe).
    # ⚠️ «Spielzeug» allein ist Kinderware (RAUS-Liste) → Tier-Anker Pflicht; «Snackball»
    # und «Intelligenzspielzeug» sind im Katalog rein tierisch belegt. «Tasche» allein
    # traefe halbe Damenmode → Handy/Phone als Anker.
    "Haustier-Spielzeug smart": re.compile(
        r'(?:Interaktiv\w*|Smart\w*|Elektrisch\w*|Automatisch\w*)[- ]?(?:Katzen|Hunde|Haustier)[- ]?spielzeug|'
        r'(?:Katzen|Hunde|Haustier)[- ]?spielzeug[- ]?(?:interaktiv|elektrisch|smart|automatisch)|'
        r'Snackball|Intelligenzspielzeug|Futterball|Leckerli[- ]?(?:Ball|Spender)', re.I),
    "Handy-Umhängetasche": re.compile(
        r'Handy[- ]?(?:Umh[äa]nge|Cross-?body|Schulter)[- ]?tasche|Phone[- ]?(?:Holster|Bag|Pouch|Sling)|'
        r'Crossbody[- ]?(?:Phone|Handy)|Smartphone[- ]?(?:Tasche|Holster)|'
        r'Handy-?tasche.*Cross-?body|Cross-?body.*Handy-?tasche|Handy-?tasche.*(?:Umh[äa]nge|Schulter)', re.I),
    # Neu 13.09.: Retro-Goggles (OTG/Motorrad/Festival, Vintage-Optik) stehen in den
    # Sept./Okt.-Listen; ⚠️ «Brille» allein träfe Sonnen-/Lesebrillen, «Goggle» auch Ski-
    # und Schwimmbrillen → Retro/Motorrad/Steampunk als Pflicht-Anker.
    # Neu 23.09.2026: drei gemessene Themen aus den September-Trendlisten (siehe QUELLE).
    # «Projektor» allein wuerde die Mini-Beamer doppeln → Sternenhimmel/Galaxy/Nachtlicht als Anker.
    "Sternenhimmel-Projektor": re.compile(
        # ⚠️ Trockenlauf 23.09.: «Sternenhimmel» allein traf «Wasserdichte Quarzuhr mit Sternenhimmel-Ziffer» — Projektor/Lampe/Licht als Pflicht-Anker in Wortnaehe.
        r'Sternenhimmel.{0,25}(?:Projekt|Lampe|Licht|Leuchte)|(?:Projekt|Lampe|Licht|Leuchte)\w*.{0,25}Sternenhimmel|Galaxy[- ]?(?:Projektor|Lampe|Licht)|Sternen[- ]?(?:Projektor|Lampe)|Nordlicht[- ]?Projektor', re.I),
    # «Trinkflasche» allein = Sportflaschen; Hund/Haustier als Pflicht-Anker.
    "Hunde-Trinkflasche": re.compile(
        # ⚠️ Trockenlauf 23.09.: «Hundeleine mit Trinkflasche und Kotbeutelspender» ist eine Leine — Leine/Geschirr ausschliessen.
        r'^(?!.*(?:Leine|Geschirr))(?:.*(?:Hunde[- ]?Trinkflasche|Trinkflasche\b.*\bHund|Hund\w*\b.*\bTrinkflasche|Wasserflasche\b.*\bHund|Haustier[- ]?Trinkflasche))', re.I),
    # «Staubsauger» allein = Haushaltsgeraete; Mini/Tisch/Tastatur als Anker.
    "Mini-Staubsauger": re.compile(
        r'Mini[- ]?Staubsauger|Tisch[- ]?Staubsauger|Tastatur[- ]?(?:Staubsauger|Reiniger)|Desktop[- ]?(?:Vacuum|Staubsauger)', re.I),
    "Retro-Goggles": re.compile(
        r'(?:Retro|Vintage|Steampunk|Motorrad|Aviator)[- ]?(?:Goggle|Schutzbrille|Motorradbrille)|'
        r'Motorradbrille|OTG[- ]?(?:Goggle|Brille)', re.I),
    # 19.10.2026 (Spähtrupp wf_62fc1cba, Muster gegen den Export 18.10. getestet; Kanarien in selbsttest_themen()):
    "Nackenmassagegerät": re.compile(
        r'Nacken[- ]?(?:und[- ]?Schulter[- ]?|Schulter[- ]?)?Massage(?:ger[äa]t|r\b)|Nackenmassager|Schulter[- ]?Massage(?:ger[äa]t|r\b)|Shiatsu[- ]?(?:Nacken|Schulter)', re.I),
    "Kuscheldecke": re.compile(
        r'^(?!.*(?:Hund|Katze|Haustier|Baby|Kinder|Oster)).*(?:Kuscheldecke(?!n?[- ]?(?:bezug|halter))|(?:Fleece|Flausch|Sherpa|Flanell)[- ]?decke(?!n))', re.I),
    "Heizjacke": re.compile(
        r'^(?!.*Powerbank).*(?:Heiz(?:jacke|weste)|beheizbare?[rs]?\s+(?:Jacke|Winterjacke|Weste))', re.I),
    "Waffeleisen": re.compile(
        r'^(?!.*\b1[012]0\s?V\b).*(?:Waffeleisen|Waffelmaschine|Waffelautomat|Waffelmacher)', re.I),
    "Thermo-Lockenbürste": re.compile(
        r'Lockenb[üu]rste|Ionen[- ]?(?:Haar)?b[üu]rste', re.I),
}
# Warengruppen, die schon einmal aus der Startreihe genommen wurden.
RAUS_TYP = {"Spielzeug & Spiele", "Partydeko & Ballone", "Kostüme & Verkleidung"}
# 13.10. Prüfung (Nebenbefund): das 1.-August-Lampion-Set trägt den Typ «Schweizer Editionen» und rutschte am Typ vorbei.
# Partydeko am TITEL (gebunden; «Ballonärmel»/«Ballonkleid» sind Mode — Hausregel Multipack-Titel).
PARTY_TITEL = re.compile(r"lampion|girlande|luftballon|\bballone?\b|konfetti|partydeko|tischdeko|servietten|wimpelkette|pi[nñ]ata", re.I)
# Die Startseite ist die Fläche, die jede Besucherin ungefragt sieht — auch die, die mit einem
# Kind daneben sitzt. Der erste Lauf hätte ein «Intim-Pflegeserum für Frauen» dorthin gestellt.
# Das Produkt ist völlig in Ordnung, der Platz ist es nicht.
# ⚠️ 03.09.2026: Hier stand seit dem 30.08. «Anti-?Pilz||Creme» — ein LEERES Alternativglied.
# Ein leeres Glied matcht die leere Zeichenkette, also JEDEN Titel: vier Tage lang war jedes
# Produkt «nicht startseitentauglich», der Lauf meldete «Neu in die Reihe: 0» und sah dabei
# völlig normal aus. Gefunden nur, weil ein neues Thema mit 49 Treffern im Export 0 Kandidaten
# ergab und jeder Treffer denselben Ausschlussgrund trug. Dazu fehlte am Zeilenende das «|» vor
# «Nagelpilz» — «Balsam\bNagelpilz» konnte nie treffen. Beides behoben.
NICHT_STARTSEITE = re.compile(r'Intim|Erotik|Vaginal|Menstruation|H[äa]morrhoid|Anti-?Pilz|Creme\b|Serum\b|Hautpflege|Lotion\b|Ampulle|Peeling|Balsam\b|'
                              r'Nagelpilz|Warzen|Hemorrhoid|'
                              # 14.09.: topische Kosmetik aus China wird nicht beworben (Betreiber 30.08.) — auch als SPRAY/Öl/Maske
                              r'Haarentfernungs(spray|creme|schaum)|Enthaarungs|Gesichts(öl|spray)|(Massage|Haar|Körper|Kopfhaut)[- ]?öl|Tuchmaske|Hautaufhellung|Whitening', re.I)

# ⚠️ 29.08.2026 — WIRKVERSPRECHEN IM TITEL. In der Reihe standen «Wimpernwachstumsserum» und
# «Tranexamsäure Serum GEGEN PIGMENTFLECKEN». Beide Produkte dürfen im Shop stehen; sie auf der
# Startseite zu BEWERBEN ist etwas anderes — genau diese Unterscheidung steht seit dem 28.08.
# im Gedächtnis, nur hat sie nie jemand in dieses Skript übertragen.
# Getroffen wird ausschliesslich die Verbindung aus WIRKUNG und BEFUND, nicht das Wort allein:
# «gegen» ist zu häufig, «Serum» ist harmlos. Eine Anti-Aging-CREME bleibt zulässig — das ist
# eine kosmetische Aussage; ein WACHSTUMSVERSPRECHEN ist es nicht.
WIRKVERSPRECHEN = re.compile(
    r'(wimpern|haar|bart|n[äa]gel|nagel|brust|penis)(wachstum|wuchs)'
    r'|wachstums(serum|elixier|fluid|booster)'
    r'|gegen\s+(pigmentflecken|falten|akne|cellulite|haarausfall|schuppen|narben|'
    r'dehnungsstreifen|kr[äa]mpfadern|besenreiser|schmerzen|migr[äa]ne)'
    r'|anti[-\s]?falten|faltenfrei|hautaufhellend|aufhellungs|whitening|bleaching'
    r'|abnehm|fettverbrenn|schlankheits|entgiftung|detox[-\s]?kur',
    re.I)

# ⚠️ 29.08.2026 — DREIMAL DASSELBE IST KEINE AUSWAHL. Die Reihe zeigte gleichzeitig
# «Silikon-Gesichtsreinigungsbürste», «Multifunktionale Gesichtsreinigungsbürste» und
# «Gesichtsreinigungsbürste mit Vibration» — dazu zwei «Figurformende» Kleider. Für die Kundin
# sieht eine Startseite mit drei Varianten derselben Ware nicht kuratiert aus, sondern wie ein
# Katalogauszug. Ein Wort mit zehn oder mehr Zeichen ist im Deutschen fast immer das Grundwort
# der Zusammensetzung («Gesichtsreinigungsbürste», «Figurformendes») — teilen sich zwei Titel
# eines, ist es dieselbe Warenart.
# ⚠️ Die Zehn-Zeichen-Regel allein REICHT NICHT — am selben Tag nachgemessen: sie fing die drei
# «Gesichtsreinigungsbürsten», liess aber VIER Aroma-Diffusoren und ZWEI Katzenbrunnen stehen.
# «Diffuser» hat acht Zeichen, und «Trinkbrunnen»/«Katzenbrunnen» sind verschiedene Wörter für
# dieselbe Ware. Deshalb zusätzlich ein kleines Warenart-Lexikon.
# ⚠️ Ein Lexikon ist IMMER unvollständig (Lehre 29.08. über Bausteinlisten) — es ersetzt die
# Längenregel nicht, es ergänzt sie. Aufgenommen wird nur, was in der Reihe schon kollidiert ist.
WARENART = {
    'diffuser':        r'diffusor|diffuser|luftbefeuchter|vernebler',
    'tierbrunnen':     r'(trink|katzen|haustier|wasser)brunnen|pet fountain',
    'reinigungsbuerste': r'reinigungsb[üu]rste|gesichtsb[üu]rste',
    'haarstyler':      r'lockenstab|gl[äa]tteisen|haargl[äa]tter|styling[- ]?b[üu]rste|warmluftb[üu]rste',
    'ladestation':     r'ladestation|ladeger[äa]t|wireless charger|induktionslader',
    'massagegeraet':   r'massageger[äa]t|massagepistole|massager(?!oll)',   # 19.10.: «Massageroller» ist keine Massage-GERÄT-Kollision
    # ⚠️ «Aufbewahrungsbox» NICHT aufnehmen — sie ist bei vielen Produkten Zubehör,
    # nicht die Ware: «8-teiliges Make-up Pinselset mit Aufbewahrungsbox» ist ein
    # Pinselset. Getroffen wird nur, was SELBST ein Organizer ist.
    'organizer':       r'organizer|sortierbox|schubladeneinsatz',
    'rucksack':        r'rucksack|backpack',
    'smartwatch':      r'smartwatch|fitness[- ]?tracker|smart[- ]?armband',
}
_WARENART = {k: re.compile(v, re.I) for k, v in WARENART.items()}

try:  # 03.10.2026: Eimer-Etikette im gemeinsamen gql-Helfer (Regel «helfer-ohne-eimer»)
    from eimer_etikette import nachlauf as _nachlauf
except Exception:  # pragma: no cover
    def _nachlauf(d):
        return 0


def warenart(titel):
    """Grobe Warenart eines Titels, oder None."""
    for name, muster in _WARENART.items():
        if muster.search(titel or ''):
            return name
    return None

# ⚠️ Lange Wörter sind im Deutschen NICHT immer Grundwörter — es gibt auch lange ADJEKTIVE.
# «Elektrischer Kopfhautmassage-Roller» und «Elektrischer Kopfhaut-Massagekamm» wurden über
# «elektrischer» als gleiche Ware erkannt. Das Urteil stimmte, der Grund nicht: an einer anderen
# Stelle hätte dasselbe Wort zwei völlig verschiedene Geräte verschmolzen.
LANGE_ADJEKTIVE = re.compile(
    r'^(elektrisch|multifunktional|automatisch|selbstreinigend|hochwertig|verstellbar|'
    r'wasserdicht|wiederaufladbar|professionell|tragbar|faltbar|kabellos|klappbar|'
    r'aufblasbar|rutschfest|atmungsaktiv|antihaft|dekorativ|praktisch|hochaufl[öo]send)',
    re.I)

def _grundwoerter(titel):
    return {w for w in re.findall(r'[A-Za-zÄÖÜäöüß]{10,}', titel or '')
            if not LANGE_ADJEKTIVE.match(w)}

def gleiche_warenart(titel, schon_gewaehlt):
    """True, wenn der Titel dieselbe Ware bezeichnet wie ein bereits gewählter.

    Zwei Wege, weil keiner allein reicht: das Lexikon fängt bekannte Kollisionen
    unabhängig von der Wortlänge, die Längenregel alles Übrige.
    """
    art = warenart(titel)
    lang = {x.lower() for x in _grundwoerter(titel)}
    for anderer in schon_gewaehlt:
        if art and warenart(anderer) == art:
            return True
        if lang & {x.lower() for x in _grundwoerter(anderer)}:
            return True
    return False

# ⚠️ DIE BILDPRÜFUNG KANN KEIN MUSTER ERSETZEN — sie braucht einen Blick.
# Der erste Lauf wählte zwölf Produkte, die nach Zahlen tadellos waren: genug Bilder, richtiger
# Preis, im Google-Kanal, kein Tag auffällig. Der Kontaktbogen zeigte dann bei VIER, was keine
# Kennzahl verrät:
#   • ein Kleid an der Schaufensterpuppe statt an einem Model,
#   • ein chinesisches Lieferanten-Wasserzeichen mitten im Bild (广州…),
#   • eine englische Infografik mit Wirkversprechen statt eines Produktfotos,
#   • ein eingebrannter Bildtext «Samsung UK three-pin» — der falsche Markt für einen CH-Shop.
# Sie standen auf der prominentesten Fläche des Shops. Aussortierte bekommen deshalb dauerhaft
# `hype-bild-schwach` und werden nie wieder gewählt.
# PFLICHT für jeden Lauf: `KONTAKT=1 python3 automation/hype_kuratieren.py` baut den
# Kontaktbogen der aktuellen Reihe — vor dem Veröffentlichen ansehen (Projektregel 5, Vision-QA).
AUSGEMUSTERT = "hype-bild-schwach"


# 19.10.2026 (Spähtrupp wf_62fc1cba, HYPE-3/4): Netzgeräte kamen ohne Stecker-Beleg in die Reihe (derselbe Fehlertyp wie die Dampfglättbürste am
# 14.09. und Bestellung #1018), und Werbesperr-Tags kannte diese Aufnahme nicht. GEMESSEN: von 910 freien Kandidaten 112 mit unklarem Stecker-Befund, 39 mit
# Sperr-Tag. Neu: NETZGERÄT-Titel (gleiche Wörter wie cj_stecker_pruefen.MAINS) nur mit Status kein-stecker-merkmal / nur-eu-version / cj-… / eu-sku-gesetzt im
# Ledger dropship/_cj_stecker_geprueft.txt; ohne Eintrag oder mit unklar-/mehrere-/draft-Status überspringen (Zähler im Log, nie stumm).
NETZGERAET = re.compile(r"Gl[äa]tt(eisen|b[üu]rste)|Lockenstab|Haartrockner|F[öo]hn\b|Wasserkocher|Kaffeemaschine|Toaster|B[üu]geleisen|Dampfglätt|Dampfreiniger|"
                        r"Heizl[üu]fter|Heizdecke|Heizkissen|Fritteuse|Standmixer|Entsafter|Netzteil|Ladeger[äa]t|Waffeleisen|Waffelmaschine|Sandwichmaker|Reiskocher|"
                        r"Airfryer|Kontaktgrill|Eismaschine|Epilierer|Haarschneider|Warmluftb[üu]rste|Schallzahnb[üu]rste|"
                        r"Beamer|Futterautomat|Futterspender|Wasserspender|Karaoke[- ]?System|"
                        # 19.10. (Prüfung wf_8ad620bc, HYPE-1): die EIGENEN Hype-Themen fehlten im Tor — «Mini-Projektor», «Glätt- & Lockenbürste», «Ladestation
                        # 3-in-1», «Kerzenwärmer-Lampe», «Heizbare Decke» kamen ohne Ledger-Eintrag durch. Ladestation/Charger/Adapter wie cj_stecker_pruefen.MAINS (13.10.);
                        # nicht MAINS komplett (Staubsauger = Akku-Mini-Sauger sind ein Hype-Thema, «IPL» steckt in «Lipliner»).
                        r"Projektor|Locken-?b[üu]rste|Haargl[äa]tter|Ladestation|Lade-?st[äa]nder|Ladedock|Charger|Netz-?adapter|Lade-?adapter|Kerzenw[äa]rmer|"
                        r"Heizbar\w*\s+(?:Decke|Weste|Jacke|Kissen)|Hei[zß]+jacke", re.I)   # 19.10.: Geräte, die cj_stecker_pruefen.MAINS (noch) nicht kennt
NETZ_NICHT = re.compile(r"Auto-?Ladeger|KFZ|Zigarettenanz|Kabel\b|Ladekabel|Solar|f[üu]rs Auto\b|USB", re.I)
STECKER_LEDGER = "dropship/_cj_stecker_geprueft.txt"
STECKER_OK = ("kein-stecker-merkmal", "nur-eu-version", "cj-", "eu-sku-gesetzt")
SPERR_TAGS_HYPE = {"stecker-unklar", "titel-englisch-uebersetzen", "nicht-bewerben", "nicht-live-moebel-sperrig", "medizinprodukt-pruefen", "18plus", "raucher",
                   "waffengesetz-verboten", "waffe-pruefen", "bild-zu-klein", "duplikat-auto-draft",
                   # 19.10. (HYPE-2): CJ führt ≥ 2 Varianten, der Shop nur «Default Title» — die Bilder zeigen eine Wahl, die die Kundin nicht treffen kann,
                   # der Bestell-Automat stoppt «manuell prüfen» (cj_sku_import.mjs). Fällt von selbst weg, sobald auswahl_nachruesten.py die Wahl nachgerüstet hat.
                   "auswahl-offen",
                   # 19.10. (Prüfung HYPE-5): die tatsächlich genutzten Werbesperr-Tags der anderen Poster (bild_reel_auswahl.SPERR, tiktok_karussell.SPERR_TAGS)
                   "nur-onlineshop", "erotik", "kostuem", "kostüm", "refurbished", "marken-pruefen", "lizenz-risiko", "lizenz-nicht-bewerben",
                   "adult-nicht-bewerben", "gmc-adult-pull", "messer-nicht-bewerben", "smoke-zubehoer", "verdeckte-ueberwachung", "google-policy-flag",
                   "arzneimittel-ohne-zulassung", "niedrig-bewertet-nicht-bewerben"}


def stecker_status():
    """{produkt_id: status} aus dem Stecker-Ledger (Spalten: id, status, datum, titel; mehrere Zeilen je id → die letzte gilt)."""
    st = {}
    try:
        for z in open(STECKER_LEDGER, encoding="utf-8"):
            c = z.rstrip("\n").split("\t")
            if len(c) >= 2:
                st[c[0].strip()] = c[1].strip()
    except OSError:
        pass
    return st


# 19.10. (Prüfung wf_659d6d94, HYPE-A): bei BESTANDSmitgliedern entscheidet nicht nur der Titel. «Sonnenuntergang-Projektor» (USB, ≤ 36 V, «Batterie/Akku») und «Karaoke-System»
# (Lithium-Akku 3,7 V) trugen ein Netzgerät-Wort, waren aber keine Netzgeräte. Ein Akku-/USB-Beleg in der Beschreibung genügt, sie in der Reihe zu lassen — ausser bei den
# Lade-Wörtern (Ladegerät/Netzteil/Charger …): deren Beschreibung nennt «Akku» als Ladegut, nicht als Stromquelle.
BESCHR_AKKU = re.compile(r"Akku\b|Akku/|Batterie|mAh\b|wiederaufladbar|Lithium|Li-?Ion|USB[- ]?(?:C\b|Ladung|Aufladung|betrieben|powered)|Stromversorgung\s*:\s*USB|"
                         r"\b[345](?:[.,]\d)?\s?V\b|DC\s?5\s?V|kabellos", re.I)
LADE_TITEL = re.compile(r"Ladeger[äa]t|Ladestation|Lade-?st[äa]nder|Ladedock|Charger|Netz-?adapter|Lade-?adapter|Netzteil", re.I)


def netzgeraet_ohne_beleg(titel, pid, ledger, beschreibung=""):
    """True = überspringen. (1) Das Ledger kennt das Produkt und der Befund ist nicht positiv (unklar-eu-vorhanden, mehrere-varianten, draft-…) → nie aufnehmen,
    gleich welcher Titel (die 92 Haarglätter «unklar» heissen nicht «Glätteisen»). (2) Netzgerät-Titel ohne jeden Ledger-Eintrag → nicht belegt, es sei denn, die
    Beschreibung (nur wenn übergeben, also beim Räumen von Bestandsmitgliedern) belegt Akku/Batterie/USB-Betrieb."""
    status = ledger.get(pid.rsplit("/", 1)[-1], "")
    if status:
        return not status.startswith(STECKER_OK)
    if not (NETZGERAET.search(titel) and not NETZ_NICHT.search(titel)):
        return False
    if beschreibung and not LADE_TITEL.search(titel) and BESCHR_AKKU.search(beschreibung):
        return False
    return True


def gql(q, v=None):
    with open("/tmp/_hy.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hy.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            _nachlauf(d)
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


def tage_her(datum):
    try:
        return (time.mktime(time.strptime(HEUTE, "%Y-%m-%d"))
                - time.mktime(time.strptime(datum, "%Y-%m-%d"))) / 86400
    except Exception:
        return 999


# ⚠️ 03.09.2026: Der Export ist ein Schnappschuss (30.08.) — was seither in die Reihe kam, traegt
# dort den Tag noch nicht und waere ein zweites Mal «neu» aufgenommen worden. Die LIVE-Liste aus
# abgelaufene_raeumen() ist die Wahrheit.
IN_REIHE = set()
IN_REIHE_TITEL = []

# Prüfung 13.10. (Workflow wf_1c367cd7-abd, Befund bestätigt): `next()` nahm das ERSTE hype-seit-Tag — Shopify liefert
# Tags alphabetisch, also das ÄLTESTE Datum; die Neuaufnahme setzte ein neues Datum dazu, ohne alte zu entfernen, und die
# Abräumpfade löschten nur eines. 44 Produkte trugen hype-seit-Reste ohne hype-jetzt. Jetzt: Datum = max(), Abräumen und
# Neuaufnahme nehmen ALLE hype-seit-Tags weg, reste_raeumen() entfernt Reste ohne Reihen-Tag (täglich).
def hype_seit_tags(tags):
    return [t for t in (tags or []) if t.startswith("hype-seit-")]


def hype_datum(tags):
    d = [t.split("hype-seit-", 1)[1] for t in hype_seit_tags(tags)]
    return max(d) if d else None


def reste_raeumen():
    """hype-seit-Tags auf Produkten OHNE hype-jetzt (abgelaufen, aber Rest geblieben) entfernen."""
    cur, reste = None, []
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"tag:hype-seit*")'
                '{pageInfo{hasNextPage endCursor} nodes{id title tags}}}', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ hype-seit-Reste nicht lesbar — übersprungen", flush=True)
            return 0
        reste += ohne_werbetest([p for p in pg["nodes"] if TAG not in p["tags"] and hype_seit_tags(p["tags"])])
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    print(f"hype-seit-Reste ohne Reihen-Tag: {len(reste)}" + (" (DRY)" if DRY else ""), flush=True)
    if not DRY:
        for p in reste:
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                {"id": p["id"], "t": hype_seit_tags(p["tags"])})
            time.sleep(0.25)
    return len(reste)


def abgelaufene_raeumen():
    """Nimmt den Tag von allem, was länger als HYPE_TAGE in der Reihe steht."""
    cur, alle = None, []
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"tag:%s")'
                '{pageInfo{hasNextPage endCursor} nodes{id title tags productType status description(truncateAt:3000)}}}' % TAG, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Bestandsliste unvollständig — nichts geräumt", flush=True)
            return 0
        alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    raus, regelbruch, ohne_datum = [], [], []
    stecker = stecker_status()          # 19.10. (Prüfung HYPE-3): die Aufnahmeregeln von heute gelten auch für Bestandsmitglieder
    for p in alle:
        seit = hype_datum(p["tags"])
        # ⚠️ 13.10.2026: DIE REIHENREGELN GELTEN FÜR JEDES MITGLIED, nicht nur bei der Aufnahme. In der Reihe standen
        # 8 Produkte mit `hype-jetzt` OHNE Datum — Spinnennetz, Knicklichter, Skelett-Handschuhe, Patrick-Star-Plüsch,
        # Bruder-LKW, Plüsch-Dino, Schneeeule, 1.-August-Lampions. Kein Skript im Repo (auch nicht im alten Zweig)
        # setzt den Tag ohne Datum; die Herkunft ist unbekannt. Weil «ohne Datum = von Hand = bleibt» galt, liefen sie
        # nie ab, und Spielzeug/Partydeko/Kostüm verstösst gegen genau die Regeln, die die Aufnahme prüft.
        # Jetzt: (1) Regelbruch (RAUS_TYP, NICHT_STARTSEITE, hype-bild-schwach, nicht aktiv) → sofort raus, egal woher;
        # (2) ohne Datum → bekommt heute ein Datum und läuft nach HYPE_TAGE ab wie alles andere.
        if (AUSGEMUSTERT in p["tags"] or (p.get("productType") or "") in RAUS_TYP or PARTY_TITEL.search(p["title"])
                or NICHT_STARTSEITE.search(p["title"]) or p.get("status") not in (None, "ACTIVE")
                or (SPERR_TAGS_HYPE & {t.lower() for t in p["tags"]})
                or netzgeraet_ohne_beleg(p["title"], p["id"], stecker, p.get("description") or "")):
            regelbruch.append((p, seit))
        elif not seit:
            ohne_datum.append(p)
        elif tage_her(seit) > HYPE_TAGE:
            raus.append((p, seit))
    regelbruch = ohne_werbetest(regelbruch, lambda x: x[0]["id"])
    ohne_datum = ohne_werbetest(ohne_datum)
    raus = ohne_werbetest(raus, lambda x: x[0]["id"])
    print(f"Regelbruch in der Reihe: {len(regelbruch)} | ohne Datum: {len(ohne_datum)}", flush=True)
    for p, _ in regelbruch[:12]:
        print(f"   Regelbruch: {p['title'][:52]} [{p.get('productType')}]", flush=True)
    for p in ohne_datum[:12]:
        print(f"   ohne Datum (noch 7 Tage, dann raus): {p['title'][:52]}", flush=True)
    if not DRY:
        for p, seit in regelbruch:
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                {"id": p["id"], "t": [TAG] + hype_seit_tags(p["tags"])})
            time.sleep(0.25)
        # Datum ZURÜCKDATIERT: noch 7 Tage Frist, und die Reihe sortiert es hinten ein. Mit HEUTE stand das
        # 1.-August-Lampion-Set am 13.10. als «jüngste Aufnahme» auf Platz 12 (gemessen).
        frist = time.strftime("%Y-%m-%d", time.gmtime(time.time() - max(0, HYPE_TAGE - 7) * 86400))
        for p in ohne_datum:
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": p["id"], "t": ["hype-seit-" + frist]})
            time.sleep(0.25)
    weg = {p["id"] for p, _ in regelbruch}
    alle = [p for p in alle if p["id"] not in weg]
    IN_REIHE.update(p["id"] for p in alle)
    IN_REIHE_TITEL[:] = [p["title"] for p in alle]
    print(f"In der Reihe: {len(alle)} | abgelaufen (>{HYPE_TAGE} Tage): {len(raus)}", flush=True)
    for p, seit in raus[:8]:
        print(f"   seit {seit}: {p['title'][:52]}", flush=True)
    if DRY:
        return len(raus)
    for p, seit in raus:
        gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
            {"id": p["id"], "t": [TAG] + hype_seit_tags(p["tags"])})
        time.sleep(0.25)
    return len(raus)


def kollektion_sichern():
    d = gql('query($q:String!){collections(first:1,query:$q){nodes{id handle}}}',
            {"q": f"handle:{HANDLE}"})
    knoten = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
    if knoten:
        return knoten[0]["id"]
    if DRY:
        print("  (DRY) Kollektion würde angelegt", flush=True)
        return None
    r = gql('mutation($i:CollectionInput!){collectionCreate(input:$i)'
            '{collection{id} userErrors{message}}}',
            {"i": {"title": "🔥 Gerade im Trend", "handle": HANDLE,
                   # 14.10.2026 S3: «von uns geprüft» / «geprüfte Auswahl» unbelegt, Gratis nur in der
                   # Schweiz — gleich wie kollektion_versprechen_s3.py (R3/R6) am Live-Text
                   "descriptionHtml": "<p>Was gerade gefragt ist — mit "
                                      "Bildern, echtem Preis und Lieferung in die Schweiz. "
                                      "Die Auswahl wechselt regelmässig.</p>",
                   "seo": {"title": "Trend-Produkte 2026 – aktuell beliebt | LuxeStyle CH",
                           "description": "Aktuell gefragte Produkte im Schweizer Shop: "
                                          "Gratis-Versand in der Schweiz ab CHF 50, "
                                          "30 Tage Rückgabe."},
                   "ruleSet": {"appliedDisjunctively": False,
                               "rules": [{"column": "TAG", "relation": "EQUALS",
                                          "condition": TAG}]}}})
    cid = (((r.get("data") or {}).get("collectionCreate") or {}).get("collection") or {}).get("id")
    e = ((r.get("data") or {}).get("collectionCreate") or {}).get("userErrors")
    if e:
        print(f"  ⚠️ Kollektion: {e[0]['message']}", flush=True)
        return None
    # ⚠️ Per API angelegte Kollektionen sind NICHT automatisch im Onlineshop sichtbar — genau
    # daran sind am 12.06. alle Menü-Links auf 404 gelaufen.
    for pub in ("301970915713", "301971014017", "302032716161", "302566834561",
                "302872297857", "302994456961"):
        gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i)'
            '{userErrors{message}}}',
            {"id": cid, "i": [{"publicationId": f"gid://shopify/Publication/{pub}"}]})
        time.sleep(0.2)
    print(f"  Kollektion «🔥 Gerade im Trend» angelegt und in 6 Kanälen veröffentlicht",
          flush=True)
    return cid


def kontaktbogen():
    """Baut ein Bildraster der aktuellen Reihe — zum Ansehen, bevor sie live geht."""
    import os as _os
    from PIL import Image, ImageDraw
    d = gql('{c:collections(first:1,query:"handle:%s"){nodes{products(first:24)'
            '{nodes{title featuredMedia{... on MediaImage{image{url}}}}}}}}' % HANDLE)
    knoten = ((d.get("data") or {}).get("c") or {}).get("nodes") or []
    if not knoten:
        print("Kollektion nicht gefunden.", flush=True)
        return
    ps = knoten[0]["products"]["nodes"]
    _os.makedirs("/tmp/hype", exist_ok=True)
    bilder = []
    for i, p in enumerate(ps):
        u = ((p.get("featuredMedia") or {}).get("image") or {}).get("url")
        if not u:
            continue
        f = f"/tmp/hype/{i:02d}.jpg"
        subprocess.run(["curl", "-s", "--max-time", "40", "-o", f,
                        u.split("?")[0] + "?width=500"])
        bilder.append((f, p["title"]))
    S, SPALTEN = 340, 4
    zeilen = (len(bilder) + SPALTEN - 1) // SPALTEN
    bl = Image.new("RGB", (SPALTEN * S, max(1, zeilen) * (S + 30)), "white")
    zeichner = ImageDraw.Draw(bl)
    for i, (f, t) in enumerate(bilder):
        try:
            im = Image.open(f).convert("RGB").resize((S, S))
        except Exception:
            continue
        x, y = (i % SPALTEN) * S, (i // SPALTEN) * (S + 30)
        bl.paste(im, (x, y))
        zeichner.text((x + 4, y + S + 8), f"{i + 1}. {t[:44]}", fill="black")
    bl.save("/tmp/hype_kontakt.png")
    print(f"Kontaktbogen mit {len(bilder)} Bildern: /tmp/hype_kontakt.png\n"
          f"→ ansehen! Wasserzeichen, Infografiken, Schaufensterpuppen und fremdsprachige\n"
          f"  Bildtexte fallen nur hier auf. Untaugliche mit «{AUSGEMUSTERT}» markieren.",
          flush=True)


def reihe_ordnen():
    """Neu Aufgenommenes nach vorn (03.09.2026).

    Die Kollektion stand auf CREATED_DESC — also nach dem ANLEGEDATUM des Produkts, nicht nach
    dem Tag der Aufnahme. Die Startseite zeigt die ersten sechs; ein heute kuratiertes Produkt
    vom Mai stand deshalb auf Position 60 und war nie zu sehen. Jetzt: MANUAL, sortiert nach
    hype-seit (juengste Aufnahme zuerst), innerhalb eines Tages mit Tages-Seed gemischt
    (zlib.crc32 — hash() ist je Prozess zufaellig, Lehre 28.08.).
    """
    import zlib, random
    d = gql('query($q:String!){collections(first:1,query:$q){nodes{id sortOrder}}}', {"q": f"handle:{HANDLE}"})
    knoten = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
    if not knoten:
        return
    cid, sort = knoten[0]["id"], knoten[0]["sortOrder"]
    if sort != "MANUAL":
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": cid, "sortOrder": "MANUAL"}})
        e = (((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")) or []
        if e:
            print(f"  ⚠️ Sortierung: {e[0]['message']}", flush=True)
            return
    cur, alle = None, []
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"tag:%s AND status:active")'
                '{pageInfo{hasNextPage endCursor} nodes{id tags}}}' % TAG, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            return
        alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    rnd = random.Random(zlib.crc32(HEUTE.encode()))
    def seit(p):
        return hype_datum(p["tags"]) or "0000-00-00"
    alle.sort(key=lambda p: (seit(p), rnd.random()), reverse=True)
    moves = [{"id": p["id"], "newPosition": str(i)} for i, p in enumerate(alle)]
    r = gql('mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}',
            {"id": cid, "m": moves})
    e = (((r.get("data") or {}).get("collectionReorderProducts") or {}).get("userErrors")) or []
    print(f"  Reihe geordnet: {len(alle)} Produkte, juengste Aufnahme zuerst" if not e else f"  ⚠️ Reihenfolge: {e[0]['message']}", flush=True)


def vorschlag_bogen(gewaehlt):
    """19.10.2026 (VORSCHLAG=1): Kontaktbogen genau der Auswahl, die ein scharfer Lauf aufnehmen würde — NUR LESEN (kein tagsAdd, kein collectionCreate,
    kein reihe_ordnen). Schreibt /tmp/hype_vorschlag.png und dropship/_hype_vorschlag.json. Die Sichtprüfung kommt VOR dem Schreiben (Lehre 15.08.)."""
    from PIL import Image, ImageDraw
    os.makedirs("/tmp/hype", exist_ok=True)
    ids = [g[1] for g in gewaehlt]
    d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title handle featuredMedia{... on MediaImage{image{url}}}}}}', {"ids": ids})
    nodes = {n["id"]: n for n in ((d.get("data") or {}).get("nodes") or []) if n}
    bilder, daten = [], []
    for i, (thema, gid, t, preis, mc) in enumerate(gewaehlt):
        n = nodes.get(gid) or {}
        u = ((n.get("featuredMedia") or {}).get("image") or {}).get("url")
        daten.append({"nr": i + 1, "thema": thema, "id": gid, "handle": n.get("handle"), "titel": t, "preis": preis, "bilder": mc})
        if not u:
            continue
        f = f"/tmp/hype/v{i:02d}.jpg"
        subprocess.run(["curl", "-s", "--max-time", "40", "-o", f, u.split("?")[0] + "?width=500"])
        bilder.append((i + 1, f, t))
    S, SPALTEN = 340, 5
    zeilen = (len(bilder) + SPALTEN - 1) // SPALTEN
    bl = Image.new("RGB", (SPALTEN * S, max(1, zeilen) * (S + 30)), "white")
    zeichner = ImageDraw.Draw(bl)
    for k, (nr, f, t) in enumerate(bilder):
        try:
            im = Image.open(f).convert("RGB").resize((S, S))
        except Exception:
            continue
        x, y = (k % SPALTEN) * S, (k // SPALTEN) * (S + 30)
        bl.paste(im, (x, y))
        zeichner.text((x + 4, y + S + 8), f"{nr}. {t[:42]}", fill="black")
    bl.save("/tmp/hype_vorschlag.png")
    with open("dropship/_hype_vorschlag.json", "w", encoding="utf-8") as fh:
        json.dump({"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "auswahl": daten}, fh, ensure_ascii=False, indent=1)
    print(f"VORSCHLAG: {len(daten)} Produkte → /tmp/hype_vorschlag.png + dropship/_hype_vorschlag.json (nichts geschrieben). "
          f"Untaugliche mit «{AUSGEMUSTERT}» markieren, dann scharf laufen lassen.", flush=True)


def selbsttest_themen():
    """19.10.2026: Kanarien für die neuen/verengten Muster (deutsche Komposita: «Hundekuscheldecke», «Powerbank für Heizwesten», «Auto-Heizkissen»…) und
    für den Stecker-Beleg. Ohne Netz."""
    fehler = []
    faelle = [("Hygiene-Gadget", "Babyflaschen Sterilisator – kompakt & USB-betrieben", False), ("Hygiene-Gadget", "UV Sterilisator Box für Handy", True),
              ("Wärme & Kuschel", "Auto-Heizkissen mit 12V Stromversorgung", False), ("Wärme & Kuschel", "Heizkissen für den Nacken", True),
              ("Wärme & Kuschel", "Automatische Heizdecke", True), ("Smoothie-Mixer", "Elektrischer Stabmixer mit Mixbecher", False),
              ("Smoothie-Mixer", "Smoothie Maker tragbar", True), ("Nackenmassagegerät", "Intelligentes Nacken- und Schultermassagegerät", True),
              ("Nackenmassagegerät", "Nackenstützkissen aus Memory-Schaum", False), ("Kuscheldecke", "Doppelseitige Flanelldecke", True),
              ("Kuscheldecke", "Hundekuscheldecke gross", False), ("Kuscheldecke", "Kuscheldecke Häschenohren für Babys", False),
              ("Heizjacke", "Heizjacke mit USB-Anschluss", True), ("Heizjacke", "Powerbank für Heizwesten", False),
              ("Waffeleisen", "Mini Waffeleisen für Zuhause", True), ("Waffeleisen", "Waffelmaschine Herzform 110 V", False),
              ("Thermo-Lockenbürste", "Glätt- & Lockenbürste 2-in-1", True)]
    for thema, titel, soll in faelle:
        if bool(THEMEN[thema].search(titel)) != soll:
            fehler.append(f"{thema}: «{titel}» → {not soll}, soll {soll}")
    led = {"1": "kein-stecker-merkmal", "2": "unklar-eu-vorhanden", "3": "mehrere-varianten", "4": "nur-eu-version", "5": "cj-1602001", "6": "draft-kein-eu-stecker"}
    stecker_faelle = [("Mini Waffeleisen", "gid://shopify/Product/1", False), ("Mini Waffeleisen", "gid://shopify/Product/2", True),
                      ("Haarglätter Keramik", "gid://shopify/Product/3", True), ("Haarglätter Keramik", "gid://shopify/Product/4", False),
                      ("Haarglätter Keramik", "gid://shopify/Product/5", False), ("Haarglätter Keramik", "gid://shopify/Product/6", True),
                      ("Haarglätter Keramik", "gid://shopify/Product/99", True),            # 19.10. (HYPE-1): Haarglätter IS ein Netzgerät, Ledger kennt ihn nicht = nicht belegt
                      ("Mini-Projektor Home Office", "gid://shopify/Product/99", True), ("Glätt- & Lockenbürste 2-in-1", "gid://shopify/Product/99", True),
                      ("3-in-1 Ladestation für Apple Watch", "gid://shopify/Product/99", True), ("Kerzenwärmer-Lampe mit Timer", "gid://shopify/Product/99", True),
                      ("Heizbare Decke Winter", "gid://shopify/Product/99", True), ("Heizjacke USB Damen", "gid://shopify/Product/99", False),   # USB-Gerät
                      ("Akku Mini-Staubsauger kabellos", "gid://shopify/Product/99", False), ("Lipliner Set", "gid://shopify/Product/99", False),
                      ("Glätteisen Keramik", "gid://shopify/Product/99", True),             # Netzgerät-Wort, kein Ledger-Eintrag = nicht belegt
                      ("USB-Lockenstab kabellos", "gid://shopify/Product/98", False),       # USB = kein Netzgerät, nicht im Ledger
                      ("Herzförmiges Kniekissen", "gid://shopify/Product/98", False), ("Autoladegerät Dual USB", "gid://shopify/Product/98", False),
                      ("Herzförmiges Kniekissen", "gid://shopify/Product/2", True)]     # Ledger sagt «unklar» → nie aufnehmen, gleich welcher Titel
    for titel, pid, soll in stecker_faelle:
        if netzgeraet_ohne_beleg(titel, pid, led) != soll:
            fehler.append(f"Stecker: «{titel}» {pid} → {not soll}, soll {soll}")
    # HYPE-A: Beschreibung belegt Akku/USB → bleibt; Lade-Wörter und echte Netzgeräte nicht
    beschr_faelle = [("Sonnenuntergang-Projektor Sunset", "gid://shopify/Product/99", "Stromversorgung: Batterie/Akku, USB, ≤36V", False),
                     ("Duales Stereo Karaoke-System", "gid://shopify/Product/99", "Integrierter Lithium-Akku 3.7V", False),
                     ("Haargl\u00e4tter Keramik", "gid://shopify/Product/99", "Heizt in 15 Sekunden auf 230 °C, Keramikplatten", True),
                     ("Ladeger\u00e4t f\u00fcr Smartwatch", "gid://shopify/Product/99", "L\u00e4dt den Akku in 2 Stunden, 5V", True),
                     ("Mini-Projektor Home Office", "gid://shopify/Product/99", "", True),                               # keine Beschreibung = nicht belegt
                     ("Kerzenw\u00e4rmer-Lampe mit Holzsockel", "gid://shopify/Product/99", "Netzbetrieb 230V, 50 W", True)]
    for titel, pid, beschr, soll in beschr_faelle:
        if netzgeraet_ohne_beleg(titel, pid, led, beschr) != soll:
            fehler.append(f"Stecker/Beschreibung: «{titel}» → {not soll}, soll {soll}")
    stecker_faelle = stecker_faelle + beschr_faelle
    print(f"hype_kuratieren Selbsttest: {len(faelle) + len(stecker_faelle) - len(fehler)}/{len(faelle) + len(stecker_faelle)}")
    for f in fehler:
        print("  FAIL", f)
    return not fehler


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest_themen() else 1)
    if os.environ.get("KONTAKT") == "1":
        kontaktbogen()
        return
    print(f"Quelle der Themen: {QUELLE}\n", flush=True)
    if os.environ.get("VORSCHLAG") == "1":
        print("VORSCHLAG=1: kein Aufräumen (tagsRemove/tagsAdd) in diesem Lauf — nur lesen.", flush=True)   # 19.10. (Prüfung HYPE-4)
    else:
        abgelaufene_raeumen()
        reste_raeumen()
    # ⚠️ NUR_RAEUMEN=1 (16.08.2026): Der tägliche Aufseher-Lauf räumt NUR Abgelaufenes ab und
    # nimmt NICHTS Neues auf. Grund, teuer gelernt am 15.08.: Die Zahlenprüfung ersetzt keinen
    # Blick — fünf Produkte mit untauglichen Bildern (Lieferanten-Collage, englische Infografik,
    # Negligé-Optik) standen drei Tage auf der Startseite, weil der unbeaufsichtigte Lauf sie
    # aufgenommen hatte. Neuaufnahme passiert nur noch in betreuten Runden (Kontaktbogen ansehen,
    # Ausschuss -> hype-bild-schwach, dann Lauf ohne NUR_RAEUMEN).
    if os.environ.get("NUR_RAEUMEN") == "1":
        print("NUR_RAEUMEN aktiv — keine Neuaufnahme in diesem Lauf.", flush=True)
        if not DRY:
            reihe_ordnen()
        return

    kandidaten = {k: [] for k in THEMEN}
    stecker = stecker_status()
    uebersprungen = {"stecker": 0, "sperr-tag": 0}
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        if (p.get("productType") or "") in RAUS_TYP or NICHT_STARTSEITE.search(p["title"]):
            continue
        if WIRKVERSPRECHEN.search(p["title"]):
            continue                       # Wirkversprechen gehoert nicht auf die Startseite
        if (p.get("mediaCount") or {}).get("count", 0) < 2:
            continue
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        if preis < 19:
            continue
        tags = p.get("tags") or []
        if TAG in tags or p["id"] in IN_REIHE:
            continue                       # steht schon in der Reihe (Export ODER live)
        if AUSGEMUSTERT in tags:
            continue                       # Bild schon einmal als untauglich befunden
        if any(t.startswith("preis-pruefen") for t in tags):
            continue                       # ungeklaerter Einkaufspreis gehoert nicht nach vorn
        if SPERR_TAGS_HYPE & {t.lower() for t in tags}:
            uebersprungen["sperr-tag"] += 1
            continue                       # 19.10.: Werbesperr-Tags gelten auch für die Startseite
        if netzgeraet_ohne_beleg(p["title"], str(p["id"]), stecker):
            uebersprungen["stecker"] += 1
            continue                       # 19.10.: Netzgerät ohne positiven Stecker-Befund
        for thema, muster in THEMEN.items():
            if muster.search(p["title"]):
                if werbetest_gesperrt(p["id"]):
                    print(f"   {WERBETEST_HINWEIS}: {p['title'][:52]}", flush=True)
                    break
                kandidaten[thema].append(
                    (p["id"], p["title"], preis, (p.get("mediaCount") or {}).get("count", 0)))
                break

    gewaehlt = []
    # ⚠️ 03.09.: Die Warenart-Wache verglich nur die Kandidaten untereinander — ein zweites
    # «Figurformendes Kleid» kam neben das erste. Jetzt zaehlt die LIVE-Reihe mit.
    titel_bisher = list(IN_REIHE_TITEL)
    for thema, liste in kandidaten.items():
        # Meiste Bilder zuerst — die Karte lebt vom Karussell.
        liste.sort(key=lambda x: -x[3])
        genommen = 0
        for k in liste:
            if genommen >= PRO_THEMA:
                break
            if gleiche_warenart(k[1], titel_bisher):
                print(f"   ueberspringe (gleiche Warenart): {k[1][:52]}", flush=True)
                continue
            gewaehlt.append((thema,) + k)
            titel_bisher.append(k[1])
            genommen += 1

    print(f"\nübersprungen (19.10.-Regeln): Netzgerät ohne Stecker-Beleg {uebersprungen['stecker']} · Werbesperr-Tag {uebersprungen['sperr-tag']}", flush=True)
    print(f"\nNeu in die Reihe: {len(gewaehlt)}", flush=True)
    for thema, _, t, preis, mc in gewaehlt:
        print(f"   [{thema:<20}] CHF {preis:>6.2f}  {mc:>2} Bilder  {t[:46]}", flush=True)
    if os.environ.get("VORSCHLAG") == "1":
        vorschlag_bogen(gewaehlt)
        return
    if DRY:
        kollektion_sichern()
        return
    if not gewaehlt:
        print("Keine neuen Kandidaten — Reihe bleibt, wie sie ist.", flush=True)
        return

    kollektion_sichern()
    f = open(LEDGER, "a")
    n = 0
    for thema, gid, t, preis, _ in gewaehlt:
        # ⚠️ LIVE GEGENPRÜFEN, nicht dem Export glauben. Der Export ist ein Schnappschuss;
        # `hype-bild-schwach` wird nach einer Bildprüfung gesetzt, also fast immer NACH dem
        # letzten Export. Ohne diese Abfrage holt der nächste Lauf genau die Produkte zurück,
        # die man eben wegen ihres Bildes aussortiert hat.
        d = gql('query($id:ID!){node(id:$id){... on Product{tags status}}}', {"id": gid})
        knoten = (d.get("data") or {}).get("node") or {}
        live_tags = knoten.get("tags") or []
        # ⚠️ DEN GRUND NENNEN (27.08.2026). Beide Fälle druckten dieselbe Zeile
        # «übersprungen (live)» — dabei heisst der eine «wurde nach einer Bildprüfung
        # dauerhaft aussortiert» und der andere «steht nicht mehr aktiv im Shop». Wer das
        # Log liest, kann sonst nicht unterscheiden, ob die Reihe an der Bildqualität oder
        # am Katalog scheitert. Dieselbe Klasse wie «PAUSE (Tagesmenge erreicht)» beim
        # Kosten-Backfill: eine Meldung, die den falschen Grund nennt, ist schlimmer als keine.
        if AUSGEMUSTERT in live_tags:
            print(f"   übersprungen (Bild zu schwach): {t[:48]}", flush=True)
            continue
        if knoten.get("status") != "ACTIVE":
            print(f"   übersprungen (nicht aktiv: {knoten.get('status')}): {t[:48]}", flush=True)
            continue
        # ⚠️ AUCH DEN TAG SELBST LIVE PRÜFEN (teuer gelernt 15.08.): Der Export ist älter als
        # die Reihe, also fehlt `hype-jetzt` dort bei allem, was nach dem Export aufgenommen
        # wurde. Ohne diese Zeile stempelte der Tageslauf dieselben Produkte jeden Tag mit
        # einem frischen hype-seit-Datum — und die 21-Tage-Ablauflogik lief NIE ab (die
        # Ladestation trug nach drei Tagen drei Datums-Tags).
        if TAG in live_tags:
            print(f"   übersprungen (live, schon in der Reihe): {t[:48]}", flush=True)
            continue
        alt_seit = [x for x in hype_seit_tags(live_tags) if x != "hype-seit-" + HEUTE]
        if alt_seit:                       # Rest einer früheren Aufnahme — sonst zählt das alte Datum mit
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": alt_seit})
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": [TAG, "hype-seit-" + HEUTE]})
        if ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{HEUTE}\t{thema}\t{gid}\t{t}\n")
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Produkte in die Hype-Reihe aufgenommen (Ablauf in {HYPE_TAGE} Tagen)")
    reihe_ordnen()


if __name__ == "__main__":
    main()
