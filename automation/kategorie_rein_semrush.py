#!/usr/bin/env python3
"""kategorie_rein_semrush.py — Landeseiten für Schweizer Suchbegriffe mit Volumen, für die wir Ware hatten, aber keine Seite
(05.10.2026, Betreiber «das geht mehr verbesserung mit semrush»; Vorbild /collections/diamond-painting vom 04.10.).

GEMESSEN 05.10. (Semrush-Ernte 02.10., `ch`, Volumen ≥ 590, KD ≤ 35; 533 Kollektionen nach Titel + SEO-Titel abgeglichen;
48'972 aktive Google-Produkte im Export, dann live mit Variantenverfügbarkeit): Teppich 14'800 Suchen/Mt ohne Seite bei
28 kaufbaren Teppichen, Bettwäsche 14'800 bei 33, Wäschekorb 9'900 bei 15, Wecker 9'900 bei 21, Duschvorhang 8'100 bei 16,
Taschenlampe 6'600 bei 27, Wandregal 6'600 bei 16, Winterjacke 3 × 5'400 (+ Daunenjacke 2'900, Wintermantel 2'400) bei 46.

REGEL je Kollektion wie in kategorie_rein.py: gehört dazu ⇔ Titel trifft ECHT ∧ kein BAN ∧ Produkttyp in TYPEN → Tag «kat-…»,
Smart-Kollektion zeigt nur diesen Tag. kategorie_rein.py liest diese Tabelle (CFG.update) und läuft täglich im Aufseher
(fixer_keepalive.sh «KATEGORIEN REIN») — neue Ware kommt rein, Fremdware geht raus. BAN enthält die Hausregel-Klassen
(Kostüm/Erotik/Tabak/Klingen/Waffen), weil alle acht Kollektionen im Google-Kanal stehen.
Kontaktbogen-Funde 05.10. (je 24 Hauptbilder angesehen): Picknick-/Camping-«Teppich», Teppich-Tufting-Leim, DIY-Knüpfset,
Baumwollstoff «für Bettwäsche», Armbanduhren als «Wecker» (Curren/Sanda), Nachtlicht/Lautsprecher «mit Wecker»,
Hunde-Rollleine «mit Taschenlampe», T6-Taschenlampe mit Waffenschiene → alle im BAN, Kanarienvögel unten.
Anlegen/Prüfen der Kollektionen: dropship/semrush/NEUE-KOLLEKTIONEN-2026-10-05.md + Ledger _neue_kollektionen_2026-10-05.tsv.
  python3 automation/kategorie_rein_semrush.py        → Kanarienvögel (84) prüfen
"""
import re

R = lambda s: re.compile(s, re.I)
SAMMEL = {"Trend-Gadget", "Trend-Produkt", "Accessoires", "Gadget", ""}
HAUS = (r"kost(ü|ue)m|erotik|\bsex|dildo|vibrator|dessous|tabak|zigarett|vape|messer|klinge|schwert|dolch|\baxt\b|waffe|"
        r"pistole|airsoft")
PUBLIKATIONEN = [  # dieselben sechs Kanäle wie /collections/diamond-painting (gemessen 05.10.)
    "gid://shopify/Publication/301970915713",  # Online Store
    "gid://shopify/Publication/301971014017",  # Shop
    "gid://shopify/Publication/302032716161",  # TikTok
    "gid://shopify/Publication/302566834561",  # Facebook & Instagram
    "gid://shopify/Publication/302872297857",  # Google & YouTube
    "gid://shopify/Publication/302994456961",  # Pinterest
]

CFG = {
    "teppiche": dict(
        tag="kat-teppiche", suche=["teppich", "badematte", "läufer"], kw="teppich", volumen=14800, kd=21,
        # 05.10. Nacharbeit: «echt» nannte fussmatte/türmatte, «suche» nicht — Fussmatten sind Türvorleger, kein Teppich
        # (und «Geprägtes PVC-Leder für Fussmatten» = Meterware wäre durchgerutscht). Holz-/Diatomit-«Badematten» sind
        # Roste und Steinplatten, keine Teppiche → BAN. Der Leder-Teppich (PU, 50×80 bis 120×200 cm) bleibt drin.
        echt=R(r"teppich(e|en|s)?\b|\bl(ä|ae)ufer\b|badematte|badvorleger|badteppich"),
        ban=R(HAUS + r"|wandteppich|teppichreiniger|teppichklopfer|teppichband|teppichklebe|teppichgreifer|"
              r"anti.?rutsch.?(pad|band|unterlage)|yoga|spiel(zeug|matte)|puzzle|kratz|haustier|hunde|katzen|auto|kofferraum|"
              r"mauspad|tischset|tischl(ä|ae)ufer|teppich-?muster|im teppich|teppichoptik|wandbehang|tapisserie|picknick|"
              r"camping|\bdiy\b|tufting|leim|kleber|deko-?teppich|kehrroboter|staubsauger|saugroboter|wischroboter|krabbelmatte|wecker|"
              r"fussmatte|fußmatte|t(ü|ue)rmatte|\bpvc\b|kunstleder|meterware|\bstoff\b|f(ü|ue)r (teppiche|fussmatten|badematten)|"
              r"akazie|\bholz|diatomit|diatomeen|kiesel|stein-?matte"),
        typen={"Wohnen & Deko", "Aufbewahrung & Organizer", "Haushalt & Wohnen", "Heimtextilien", "Basteln & DIY",
               "Beauty-Tools", "Auto-Zubehör", "Teppich", "Teppiche"} | SAMMEL,
        ja=["Minimalistischer Teppich, schmutzabweisend", "Flauschige Badematte", "Runder Teppich Wohnzimmer",
            "Leder-Teppich, radierbar & anpassbar", "Hochflor-Teppich grau, 40x60 cm", "Rutschfeste Badematte, schwarz-weiss"],
        nein=["Mandala Wandteppich", "Teppichmesser Profi", "Tischläufer Leinen", "Kratzteppich für Katzen",
              "Multifunktionaler wasserdichter Picknick-Teppich", "Wasserdichter Camping-Teppich", "DIY Teppich-Set Faultier",
              "Weisser Holzleim für Teppich-Tufting", "Deko-Teppich Streifen", "Kehrroboter für Hartböden & Teppiche",
              "Teppich-Wecker mit LED-Anzeige", "Lange Krabbelmatte & Teppich",
              "Geprägtes PVC-Leder für Fussmatten", "Graue Fussmatte mit TPE-Rückseite", "Fussmatte mit Dackel-Motiv",
              "4er-Set PVC-Fussmatten für Auto, SUV & Truck", "2er-Set Badematten aus Akazienholz", "Badematte aus Akazienholz",
              "Diatomit Badematte schnelltrocknend & rutschfest", "Twill-Baumwollstoff für Teppiche"],
        titel="Teppiche", sort="BEST_SELLING",
        seo_titel="Teppich kaufen: Wohnzimmer, Schlafzimmer & Bad | LuxeStyle",
        seo_text="Teppiche für Wohnzimmer, Schlafzimmer und Bad: runde Teppiche, Läufer, Badematten und Plüsch-Teppiche in "
                 "vielen Grössen und Farben. Versand in die Schweiz.",
        text="<p>Ein Teppich macht aus einem Boden einen Raum: Er dämpft Schritte, hält die Füsse warm und gibt dem Zimmer "
             "einen Mittelpunkt. Hier findest du Teppiche für Wohnzimmer, Schlafzimmer, Flur und Bad – von der kleinen "
             "Badematte bis zum grossen Plüsch-Teppich fürs Sofa.</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>"
             "Wohnzimmer:</strong> runde und rechteckige Teppiche, Tierfell-Optik, unregelmässige Formen mit Kaschmir-Haptik."
             "</li>\n<li><strong>Schlafzimmer:</strong> weiche Plüsch-Läufer neben dem Bett, rutschfeste Unterseite.</li>\n"
             "<li><strong>Bad und Küche:</strong> Badematten mit Memory-Schaum, bedruckte Küchenläufer, Fussmatten.</li>\n"
             "<li><strong>Kinderzimmer:</strong> Motiv-Teppiche, leicht zu reinigen.</li>\n</ul>\n<h2>Worauf du achten "
             "kannst</h2>\n<p>Die Masse stehen auf jeder Produktseite – miss den Platz vorher aus, ein Teppich sollte unter "
             "dem Sofa oder Bett etwa 20 bis 30 cm hervorschauen. Rutschfeste Rückseiten sind bei Läufern und Badematten "
             "angegeben; die meisten Modelle sind waschbar oder lassen sich mit dem Staubsauger reinigen.</p>"),
    "bettwaesche": dict(
        tag="kat-bettwaesche", suche=["bettwäsche", "bettwaesche", "bettbezug"], kw="bettwäsche", volumen=14800, kd=23,
        echt=R(r"bettw(ä|ae)sche|bettbez(u|ü|ue)g|bettgarnitur|duvetbezug"),
        ban=R(HAUS + r"|w(ä|ae)schebeutel|w(ä|ae)schesack|aufbewahrung|puppen|hunde|katzen|haustier|beutel f(ü|ue)r|klammer|"
              r"spray|duft|stoff f(ü|ue)r|baumwollstoff|meterware|\bstoff\b|sofa"),
        typen={"Wohnen & Deko", "Aufbewahrung & Organizer", "Basteln & DIY", "Heimtextilien", "Haushalt & Wohnen",
               "Bettwäsche"} | SAMMEL,
        ja=["Blumen-Bettwäsche-Set aus Baumwolle, 4-teilig", "Bettbezug 160x210 Leinen"],
        nein=["Wäschebeutel für Bettwäsche", "Hundebett mit Bettwäsche-Optik", "Twill-Baumwollstoff für Bettwäsche & Vorhänge",
              "Baumwollstoff für Bettwäsche & Vorhänge", "Sofa-Bettbezug gestreift"],
        titel="Bettwäsche", sort="BEST_SELLING",
        seo_titel="Bettwäsche kaufen: Baumwolle, Satin & Sets | LuxeStyle",
        seo_text="Bettwäsche-Sets aus Baumwolle, Tencel und Satin: Bettbezüge mit Kissenbezug, einfarbig, gestreift oder mit "
                 "Blumen- und Vintage-Mustern. Versand in die Schweiz.",
        text="<p>Bettwäsche entscheidet darüber, wie sich das Bett anfühlt – und wie das Schlafzimmer aussieht. Hier findest "
             "du Bettwäsche-Sets aus Baumwolle, Bambusfaser, Tencel und Satin, meist als Set mit Bettbezug und Kissenbezügen."
             "</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Baumwolle:</strong> gewaschene, garngefärbte und "
             "gestreifte Sets, einfarbig oder mit Blumenmustern.</li>\n<li><strong>Satin und Seiden-Optik:</strong> glatte, "
             "kühle Oberflächen für den Sommer.</li>\n<li><strong>Mit Spitze und Rüschen:</strong> Vintage- und "
             "Preppy-Sets, auch für Studenten- und Kinderzimmer.</li>\n</ul>\n<h2>Grössen und Pflege</h2>\n<p>Die Masse "
             "von Bettbezug und Kissenbezug stehen auf jeder Produktseite – in der Schweiz sind 160 × 210 cm für die Decke "
             "und 65 × 100 cm fürs Kissen üblich, prüfe die Angaben vor der Bestellung. Baumwolle und Bambusfaser lassen "
             "sich bei 40 bis 60 Grad waschen; Satin und Tencel gehören in den Schonwaschgang.</p>"),
    "waeschekoerbe": dict(
        tag="kat-waeschekoerbe", suche=["wäschekorb", "waeschekorb", "wäschesammler", "wäschebox"], kw="wäschekorb",
        volumen=9900, kd=15,
        echt=R(r"w(ä|ae)schekorb|w(ä|ae)schek(ö|oe)rbe|w(ä|ae)schesammler|w(ä|ae)schebox|w(ä|ae)schetruhe"),
        ban=R(HAUS + r"|puppen|mini|spielzeug|hunde|katzen|w(ä|ae)schekorb-?(stil|optik)"),
        typen={"Aufbewahrung & Organizer", "Haushalt & Wohnen", "Wohnen & Deko", "Heimtextilien"} | SAMMEL,
        ja=["Faltbarer Oxford Stoff Wäschekorb", "Wäschesammler mit 3 Fächern"],
        nein=["Mini-Wäschekorb Deko für Puppenhaus"],
        titel="Wäschekörbe", sort="BEST_SELLING",
        seo_titel="Wäschekorb kaufen: faltbar, Deckel & Fächer | LuxeStyle",
        seo_text="Wäschekorb und Wäschesammler: faltbar, mit Deckel, mehreren Fächern oder Rollen, aus Oxford-Stoff, "
                 "Leinen-Optik, Bambus und Metall. Versand in die Schweiz.",
        text="<p>Ein Wäschekorb sammelt, was bis zum nächsten Waschtag anfällt – und sieht im besten Fall nicht nach "
             "Wäsche aus. Hier findest du Wäschekörbe und Wäschesammler für Bad, Schlafzimmer und Waschküche.</p>\n"
             "<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Faltbar:</strong> Körbe aus Oxford-Stoff oder Leinen-Optik, "
             "die sich leer flach zusammenlegen lassen.</li>\n<li><strong>Mit Deckel:</strong> Bambus- und Stoffmodelle, "
             "die Wäsche verdecken und Gerüche zurückhalten.</li>\n<li><strong>Mit Fächern:</strong> Wäschesammler mit zwei "
             "oder drei Beuteln, um Hell, Dunkel und Fein gleich zu trennen.</li>\n<li><strong>Mit Rollen oder Regal:</strong>"
             " fahrbare Körbe und Kombinationen mit Ablage.</li>\n</ul>\n<h2>Welche Grösse passt?</h2>\n<p>Für eine Person "
             "reichen rund 40 bis 60 Liter, ein Haushalt mit Kindern kommt mit 90 Litern oder einem Mehrfach-Sammler besser "
             "zurecht. Das Fassungsvermögen und die Masse stehen auf jeder Produktseite.</p>"),
    "wecker": dict(
        tag="kat-wecker", suche=["wecker", "weckuhr"], kw="wecker", volumen=9900, kd=31,
        # 05.10. Nacharbeit: «Wecker-Armband mit Vibrationsalarm» (Platz 26, 170 Suchen/Mt) ist ein Wecker, keine Uhr —
        # der BAN «armband» (gegen Armbanduhren) lässt «Wecker-Armband» jetzt durch; «Armbanduhr mit Wecker» bleibt draussen.
        echt=R(r"\bwecker\b|\bweckuhr|wecker(uhr|-uhr|-?armband)|lichtwecker|digitalwecker|kinderwecker|reisewecker|sonnenaufgangs?wecker"),
        ban=R(HAUS + r"|mit wecker|wecker-?funktion|weckerfunktion|smartwatch|(?<!wecker-)(?<!wecker )armband|\buhr(en)?band|vibrationsarmband|"
              r"kopfh(ö|oe)rer|halbquarz|multifunktionsuhr|\bherren-|\bdamen-|sanda|curren|nachtlicht mit|lautsprecher mit|"
              r"speaker mit|lampe mit|armbanduhr|fitness-?armband|fitnesstracker|tracker"),
        typen={"Gadget", "Elektronik", "Beleuchtung", "Wohnen & Deko", "Aufbewahrung & Organizer", "Auto-Zubehör", "Uhren",
               "Haushalt & Wohnen", "Wecker"} | SAMMEL,
        ja=["LED-Spiegeluhr minimalistisch · Wecker & Temperatur", "Digitaler Wecker mit Ladefunktion", "Lichtwecker Sonnenaufgang",
            "Intelligentes Wecker-Armband mit Vibrationsalarm", "Wecker Armband lautlos"],
        nein=["Smartwatch mit Wecker", "Bluetooth-Lautsprecher mit Weckerfunktion", "Herren-Halbquarz-Wecker mit Kalender",
              "Sanda Grünlicht Wecker Multifunktionsuhr", "Nachtlicht mit Bluetooth Speaker & Wecker",
              "Kabelloser Lade-Bluetooth-Lautsprecher mit LED-Wecker", "Herren-Multifunktions-Armbanduhr wasserdicht mit Wecker",
              "Fitness-Armband mit Wecker und Schrittzähler", "Armbanduhr Wecker Kinder", "Vibrationsarmband Wecker Smartwatch"],
        titel="Wecker", sort="BEST_SELLING",
        seo_titel="Wecker kaufen: digital, LED & Lichtwecker | LuxeStyle",
        seo_text="Wecker für Nachttisch und Reise: digitale LED-Wecker, Lichtwecker mit Sonnenaufgang, Kinderwecker und Modelle "
                 "mit Ladefunktion. Versand in die Schweiz.",
        text="<p>Ein Wecker neben dem Bett heisst: Das Handy darf draussen bleiben. Hier findest du digitale und analoge "
             "Wecker für Nachttisch, Kinderzimmer und Reise.</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>"
             "LED-Wecker:</strong> grosse Ziffern, Spiegel-Front, Temperaturanzeige, oft mit USB-Anschluss oder kabelloser "
             "Ladefläche fürs Handy.</li>\n<li><strong>Lichtwecker:</strong> simulieren den Sonnenaufgang und wecken mit "
             "langsam heller werdendem Licht statt mit Alarmton.</li>\n<li><strong>Kinderwecker:</strong> Hasen- und "
             "Tierformen mit Nachtlicht, Schlaftrainer mit Farbsignal.</li>\n<li><strong>Reisewecker und Klassiker:</strong>"
             " kompakte Digitalwecker, Modelle aus Holz oder Aluminium mit Zeigern.</li>\n</ul>\n<h2>Worauf du achten "
             "kannst</h2>\n<p>Snooze, Dimmbarkeit und Batterie- oder Netzbetrieb stehen auf jeder Produktseite. Wer leicht "
             "aufwacht, nimmt einen Lichtwecker; wer tief schläft, einen Wecker mit lautem Ton oder Vibration.</p>"),
    "duschvorhaenge": dict(
        tag="kat-duschvorhaenge", suche=["duschvorhang", "duschvorhänge", "duschvorhaenge"], kw="duschvorhang",
        volumen=8100, kd=18,
        echt=R(r"duschvorh(a|ä|ae)ng"),
        ban=R(HAUS + r"|stange|ringe?\b|haken|halterung"),
        typen={"Wohnen & Deko", "Basteln & DIY", "Haushalt & Wohnen", "Heimtextilien", "Badezimmer"} | SAMMEL,
        ja=["Duschvorhang Hortensien-Schnittmuster", "Wasserdichter Duschvorhang 180x200"],
        nein=["Duschvorhangstange ohne Bohren", "12 Duschvorhangringe Edelstahl"],
        titel="Duschvorhänge", sort="BEST_SELLING",
        seo_titel="Duschvorhang kaufen: Polyester, Motive & Sets | LuxeStyle",
        seo_text="Duschvorhang aus Polyester, wasserabweisend, mit Blumen-, Marmor- und Fotomotiven, einzeln oder als Set mit "
                 "Badteppich und WC-Vorleger. Versand in die Schweiz.",
        text="<p>Ein Duschvorhang hält das Wasser in der Dusche und ist zugleich die grösste Fläche im Bad – ein Motivwechsel "
             "verändert den ganzen Raum. Hier findest du Duschvorhänge aus Polyester, einzeln oder als Set.</p>\n<h2>Was du "
             "hier findest</h2>\n<ul>\n<li><strong>Muster und Motive:</strong> Blumen, Marmor, Geometrie, Meerblick, "
             "Totenkopf oder schlichtes Weiss mit Tropfen.</li>\n<li><strong>Sets:</strong> Duschvorhang mit passendem "
             "Badteppich, WC-Deckelbezug und Vorleger.</li>\n<li><strong>Praktisch:</strong> Modelle mit Magnetverschluss "
             "oder Gewichten am Saum, damit der Vorhang nicht an den Körper klebt.</li>\n</ul>\n<h2>Masse und Pflege</h2>\n"
             "<p>Üblich sind 180 × 180 cm oder 180 × 200 cm; die genauen Masse und die Anzahl Ösen stehen auf jeder "
             "Produktseite. Polyester-Vorhänge lassen sich bei 30 Grad in der Maschine waschen und trocknen schnell. "
             "Stangen und Ringe findest du beim Zubehör im Badezimmer-Bereich.</p>"),
    "taschenlampen": dict(
        tag="kat-taschenlampen", suche=["taschenlampe", "stirnlampe"], kw="taschenlampe", volumen=6600, kd=20,
        echt=R(r"taschenlampe|stirnlampe|handlampe|handscheinwerfer"),
        ban=R(HAUS + r"|mit (led-?)?taschenlampe|taschenlampen?-?funktion|schl(ü|ue)sselanh(ä|ae)nger mit|powerbank mit|"
              r"kinder|spielzeug|handschuh|halterung f(ü|ue)r|halter f(ü|ue)r|h(ü|ue)lle f(ü|ue)r|tasche f(ü|ue)r|laser|"
              r"pointer|leine|rollleine|^t6 taschenlampe set$|gewehr|picatinny|schienen"),
        typen={"Sport & Outdoor", "Gadget", "Elektronik", "Aufbewahrung & Organizer", "Outdoor & Gadget", "Beleuchtung",
               "Spass-Elektronik", "Werkzeug & Heimwerken", "Taschenlampe"} | SAMMEL,
        ja=["Mini USB-Taschenlampe – Edelstahl, wiederaufladbar", "LED Stirnlampe wiederaufladbar"],
        nein=["Multitool mit Taschenlampe", "Kinder-Spielzeug Taschenlampe Projektor", "Halterung für Taschenlampe Fahrrad",
              "Automatische Rollleine mit integrierter Taschenlampe", "T6 Taschenlampe Set"],
        titel="Taschenlampen & Stirnlampen", sort="BEST_SELLING",
        seo_titel="Taschenlampe kaufen: LED, USB & Stirnlampen | LuxeStyle",
        seo_text="LED-Taschenlampen und Stirnlampen: wiederaufladbar per USB, mit Zoom, UV-Licht oder Bewegungssensor, für "
                 "Outdoor, Velo und Haushalt. Versand in die Schweiz.",
        text="<p>Eine Taschenlampe gehört in jede Schublade, jedes Auto und jeden Rucksack. Hier findest du LED-Taschenlampen "
             "und Stirnlampen vom Schlüsselbund-Format bis zur taktischen Lampe mit Zoom.</p>\n<h2>Was du hier findest</h2>\n"
             "<ul>\n<li><strong>Mini-Taschenlampen:</strong> Aluminium oder Edelstahl, per USB wiederaufladbar, passen an "
             "den Schlüsselbund.</li>\n<li><strong>Taktische LED-Taschenlampen:</strong> hohe Leuchtkraft, Zoom-Fokus, "
             "mehrere Lichtmodi, teils mit Akku und Koffer.</li>\n<li><strong>Stirnlampen:</strong> für Laufen, Wandern und "
             "Velo, mit Bewegungssensor zum Ein- und Ausschalten ohne Hände.</li>\n<li><strong>Spezialisten:</strong> "
             "UV-Taschenlampen zum Prüfen von Flecken und Banknoten, Lampen mit Rotlicht und Notfall-Blinken.</li>\n</ul>\n"
             "<h2>Worauf du achten kannst</h2>\n<p>Lumen, Leuchtdauer und Akku- oder Batteriebetrieb stehen auf jeder "
             "Produktseite. Für den Haushalt reichen 200 bis 500 Lumen; wer draussen weit leuchten will, nimmt mehr und "
             "achtet auf die Wasserschutzklasse.</p>"),
    "wandregale": dict(
        tag="kat-wandregale", suche=["wandregal", "schweberegal", "wandboard"], kw="wandregal", volumen=6600, kd=18,
        echt=R(r"wandregal|wandregale|schweberegal|wandboard|h(ä|ae)ngeregal|wandablage"),
        ban=R(HAUS + r"|puppen|mini|spielzeug|aufkleber|sticker|wandregal-?optik|tapete|f(ü|ue)r katzen|katzen|hunde|kratz"),
        typen={"Aufbewahrung & Organizer", "Küche & Bar", "Werkzeug & Heimwerken", "Wohnen & Deko", "Haushalt & Wohnen",
               "Badezimmer", "Regal"} | SAMMEL,
        ja=["Wandregal aus Paulowniaholz", "Schweberegal 3er Set weiss"],
        nein=["Katzen-Wandregal Kletterwand", "3D-Sticker Wandregal Optik"],
        titel="Wandregale", sort="BEST_SELLING",
        seo_titel="Wandregal kaufen: Holz, Metall & Küche | LuxeStyle",
        seo_text="Wandregale aus Holz und Metall: Schweberegale, Hexagon-Sets, Küchenregale mit Haken und Bad-Ablagen mit "
                 "Saugnäpfen ohne Bohren. Versand in die Schweiz.",
        text="<p>Ein Wandregal schafft Platz, ohne Boden zu brauchen – für Bücher, Gewürze, Kosmetik oder die Schlüssel "
             "beim Eingang. Hier findest du Wandregale aus Holz, Metall und Bambus für Wohnzimmer, Küche, Bad und Flur.</p>\n"
             "<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Wohnen:</strong> Schweberegale, runde und sechseckige "
             "Regal-Sets, Bohemian-Ablagen für Kerzen und Pflanzen.</li>\n<li><strong>Küche:</strong> Gewürzregale mit "
             "Haken, mehrstöckige Regale aus Metall für Flaschen und Dosen.</li>\n<li><strong>Bad:</strong> Ablagen mit "
             "Saugnäpfen oder Klebeband, Wandregale für Kosmetik und Desinfektionsmittel.</li>\n<li><strong>Eingang:</strong>"
             " Schlüsselboards mit Ablage und Haken für Post und Sonnenbrille.</li>\n</ul>\n<h2>Bohren oder kleben?</h2>\n<p>"
             "Wer in Mietwohnungen keine Löcher will, nimmt Modelle mit Saugnäpfen oder Klebemontage – sie tragen leichte "
             "Dinge. Für Bücher und Geschirr brauchst du geschraubte Regale; die Tragkraft steht auf jeder Produktseite.</p>"),
    "winterjacken": dict(
        tag="kat-winterjacken", suche=["winterjacke", "daunenjacke", "wintermantel", "daunenmantel", "parka"],
        kw="winterjacke", volumen=5400, kd=15,
        echt=R(r"winterjacke|winterjacken|daunenjacke|daunenjacken|wintermantel|winterm(ä|ae)ntel|daunenmantel|"
               r"daunenm(ä|ae)ntel|\bparka\b|winterparka|puffer.?jacke|pufferjacke"),
        ban=R(HAUS + r"|hunde|katzen|haustier|puppen|kinder|baby|kleinkind|jungen|m(ä|ae)dchen|weste\b|westen\b|hund\b|"
              r"aufbewahrung|kleiderb(ü|ue)gel|reinigung|spray|lego|figur|playmobil|anh(ä|ae)nger|schl(ü|ue)ssel|ohne (ä|ae)rmel|(ä|ae)rmellos"),
        typen={"Damenmode", "Herrenmode", "Mode", "Jacke", "Jacken", "Mäntel"} | SAMMEL,
        ja=["Kurze Winterjacke mit Kapuze", "Kurze Daunenjacke mit Patchwork-Ärmeln für Damen",
            "Gefütterter Patchwork-Wintermantel mit Kapuze"],
        nein=["Hunde-Winterjacke wasserdicht", "Daunenweste Herren", "Kinder-Winterjacke mit Fell", "Wintermantel ohne Ärmel, mittellang"],
        titel="Winterjacken & Daunenjacken", sort="BEST_SELLING",
        seo_titel="Winterjacke Damen & Herren: Daunenjacken | LuxeStyle",
        seo_text="Winterjacken und Daunenjacken für Damen und Herren: kurze Puffer-Jacken, gefütterte Parkas mit Kapuze und "
                 "Fellkragen, Wintermäntel. Versand in die Schweiz.",
        text="<p>Eine Winterjacke muss zwei Dinge können: warm halten und zum Rest des Kleiderschranks passen. Hier findest "
             "du Winterjacken, Daunenjacken und Wintermäntel für Damen und Herren.</p>\n<h2>Was du hier findest</h2>\n<ul>\n"
             "<li><strong>Daunenjacken Damen:</strong> kurze Puffer-Jacken, leichte Steppjacken für Herbst und Winter, "
             "lange Modelle im Patchwork-Stil.</li>\n<li><strong>Winterjacken Herren:</strong> gefütterte Jacken mit "
             "Kapuze, Fleece-Futter und Fellkragen, Retro-Modelle mit Umlegekragen.</li>\n<li><strong>Wintermäntel:</strong>"
             " gefütterte Mäntel mit Kapuze für kalte Tage.</li>\n</ul>\n<h2>Grösse und Futter</h2>\n<p>Die Grössen laufen "
             "bei vielen Modellen klein aus – die Masstabelle auf jeder Produktseite hilft beim Vergleich mit einer "
             "Jacke, die du schon hast. Ob Daune, Daunen-Mix oder synthetische Füllung verarbeitet ist, steht im "
             "Faktenblock des Produkts. Wer die Jacke über einen Pullover trägt, nimmt eine Nummer grösser.</p>"),
}

# ---------------------------------------------------------------------------------------------------------------------
# Runde 3 (05.10.2026 ~09:00 UTC, Betreiber «fix mal weiter semrush»): acht weitere Landeseiten. GEMESSEN am Export vom
# 04.10. (50'760 aktive, 48'979 im Google-Kanal) mit strenger Regel, dann live (ACTIVE ∧ Variante kaufbar ∧ Google-Kanal):
# Etagere 5'400/Mt bei 15, USB-Stick 4'400 bei 42, Wanduhr 4'400 bei 20, Wok 4'400 (+ wok pfanne 1'300) bei 15,
# Abendkleid 3'600 (+ abendkleider lang 1'900, cocktailkleid 2 × 1'300) bei 102, Lunchbox 3'600 bei 35, Winterschuhe Damen
# 3'600 (+ winterstiefel damen 1'600) bei 65 ohne Kinderschuhe, Bauchtasche 2'900 (+ gürteltasche damen 480) bei 78 (enge Regel:
# Brusttaschen/Sling-Bags sind 128 weitere, eigene Warenart, nicht «Bauchtasche»). Kontaktbogen-Funde (je 24 Hauptbilder
# selbst angesehen): «Drehbarer Tortenständer zum Dekorieren» (Drehteller, keine Etagere), «Gas Wok Kocher» (Brenner),
# «Brotbox aus Bambus/Metall» (Brotkasten, keine Lunchbox), «Taktische Brusttasche für Trail Running» + «Sport-Brusttasche»
# (Laufwesten), «Leder-Gürteltasche für Coiffeur-Werkzeuge» (Holster) → BAN + Kanarienvögel.
# Semrush-Kontrolle phrase_organic ch (6 × 100 Einheiten, abendkleid/lunchbox «NOTHING FOUND» ohne Kosten): Kategorie-Seiten
# in den Top 10 bei etagere 9/10, usb stick 7/10, wanduhr 10/10, winterschuhe damen 10/10, bauchtasche 8/10, wok 4/10 (+ 4 Rezepte).
# Bericht dropship/semrush/NEUE-KOLLEKTIONEN-2-2026-10-05.md, Ledger _neue_kollektionen_2_2026-10-05.tsv.
CFG.update({
    "etageren": dict(
        tag="kat-etageren", suche=["etagere", "etageren", "tortenständer", "servierständer"], kw="etagere", volumen=5400, kd=23,
        echt=R(r"etagere|etageren|etag(è|é)re|servierst(ä|ae)nder|tortenst(ä|ae)nder|cupcake.?st(ä|ae)nder|obstetagere"),
        ban=R(HAUS + r"|puppen|mini(atur)?\b|spielzeug|schmuck|ohrring|\bring|kette|kosmetik|make-?up|dusche|pflanze|blumen|"
              r"deko-?etagere|drehbar|drehteller|zum dekorieren|halter f(ü|ue)r|st(ä|ae)nder f(ü|ue)r (handy|tablet)"),
        typen={"Küche & Bar", "Aufbewahrung & Organizer", "Partydeko & Ballone", "Wohnen & Deko", "Haushalt & Wohnen",
               "Geschirr", "Etagere"} | SAMMEL,
        ja=["Etagere \"Nordic Style\" aus Keramik", "3-stöckiges Etagere für Snacks & Früchte", "Holz-Etagere für Kuchen und Desserts"],
        nein=["Drehbarer Tortenständer zum Dekorieren", "Schmuck-Etagere für Ringe und Ketten", "Mini-Etagere Puppenhaus",
              "Deko-Etagere mit Pflanzen"],
        titel="Etageren", sort="BEST_SELLING",
        seo_titel="Etagere kaufen: Keramik, Metall & Holz | LuxeStyle",
        seo_text="Etageren für Kuchen, Früchte und Snacks: 2- und 3-stöckig aus Keramik, Metall und Holz, Tortenständer mit "
                 "Glashaube, Obst-Etageren. Versand in die Schweiz.",
        text="<p>Eine Etagere bringt Höhe auf den Tisch: Kuchen, Früchte oder Apéro-Häppchen stehen auf zwei oder drei Ebenen "
             "und brauchen trotzdem nur den Platz eines Tellers. Hier findest du Etageren und Servierständer für Brunch, "
             "Geburtstag, Apéro und den Alltag in der Küche.</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Keramik:</strong>"
             " 2- und 3-stöckige Etageren mit Blumen- oder Goldrand, auch mit Metallstange im nordischen Stil.</li>\n<li><strong>"
             "Metall:</strong> Draht-Etageren für Früchte und Gemüse, goldfarbene Modelle mit Fächern.</li>\n<li><strong>Holz und "
             "Glas:</strong> Tortenständer mit Haube, Holz-Etageren für Tee, Gebäck und Snacks.</li>\n</ul>\n<h2>Welche Etagere "
             "passt?</h2>\n<p>Für Kuchen und Torten reicht eine Ebene mit Haube, für Apéro und Früchte sind drei Ebenen praktischer. "
             "Die Masse und das Material stehen auf jeder Produktseite; Keramik und Glas gehören von Hand gespült, Metall-Etageren "
             "lassen sich zum Reinigen meist auseinanderschrauben.</p>"),
    "usb-sticks": dict(
        tag="kat-usb-sticks", suche=["usb-stick", "usb stick", "speicherstick", "flash drive"], kw="usb stick", volumen=4400, kd=24,
        echt=R(r"usb.?stick|usb.?flash|flash.?drive|speicherstick|pen.?drive|usb.?speicher|memory.?stick"),
        ban=R(HAUS + r"|\bhub\b|adapter|kabel|ladeger|ventilator|lampe|licht|leuchte|mikrofon|bluetooth|wifi|wlan|empf(ä|ae)nger|"
              r"receiver|dongle|k(ü|ue)hl|heiz|w(ä|ae)rm|h(ü|ue)lle|halter|kartenleser|card.?reader|aufkleber|sticker|stick-?optik|"
              r"feuerzeug|spion|kamera|recorder|diktier|mp3|player|lautsprecher|tastatur|maus\b|controller|usb-?c.?stick.*(lade|charg)|"
              # 05.10.: «USB-Stick für Host-Systeme» war ein PS4-Jailbreak-Dongle (Text: «Systemversionen FW 9.0 bis 11.00»)
              r"host-?system|firmware|\bfw\b|jailbreak|systemversion|\bcfw\b|konsole|nintendo|\bswitch\b|\bps\s?[2-5]\b|playstation|xbox"),
        typen={"Elektronik", "Gadget", "Spass-Elektronik", "Gaming-Zubehör", "Büro & Schreibwaren", "Computer-Zubehör",
               "USB-Stick"} | SAMMEL,
        ja=["3.0 Metall-USB-Stick 32 GB", "USB-Stick «Wunschflasche» aus Holz", "Pinguin USB-Stick 3.0"],
        nein=["USB-Stick Feuerzeug", "4-Port USB Hub Stick", "USB-Stick Ventilator", "USB-Stick-Optik Spion-Kamera",
              "USB Stick Mikrofon für Konferenz", "USB-Stick für Host-Systeme", "USB-Stick für PS4 Jailbreak FW 9.0",
              "USB-Stick mit Custom Firmware CFW für Switch"],
        titel="USB-Sticks", sort="BEST_SELLING",
        seo_titel="USB-Stick kaufen: Metall, Mini & Motive | LuxeStyle",
        seo_text="USB-Sticks: Mini-Sticks aus Metall, wasserdichte Schlüssel-Modelle, Dual-Sticks mit USB-C, USB 3.0 und "
                 "Motiv-Sticks als Geschenk. Versand in die Schweiz.",
        text="<p>Ein USB-Stick ist der einfachste Weg, Fotos, Arbeiten und Backups mitzunehmen – ohne Cloud und ohne Kabel. "
             "Hier findest du USB-Sticks fürs Büro, die Schule und als kleines Geschenk.</p>\n<h2>Was du hier findest</h2>\n<ul>\n"
             "<li><strong>Metall und Mini:</strong> schlanke Sticks aus Aluminium oder Edelstahl, Schlüssel- und "
             "Flaschenöffner-Formen, wasserdicht und für den Schlüsselbund.</li>\n<li><strong>Dual-Sticks:</strong> USB-A und "
             "USB-C oder Micro-USB in einem Gehäuse, zum Umstecken zwischen Handy und Computer.</li>\n<li><strong>Motiv-Sticks:"
             "</strong> Pinguin, Herz mit Strass, Motorrad, Keks oder Schultasche – beliebt als Geschenk für Studierende und "
             "Kinder.</li>\n<li><strong>Holz und Glas:</strong> Sticks mit Kork- oder Glasgehäuse für den Schreibtisch.</li>\n"
             "</ul>\n<h2>Worauf du achten kannst</h2>\n<p>Die Speichergrösse und der USB-Standard stehen auf jeder Produktseite. "
             "USB 3.0 und 3.2 übertragen grosse Dateien deutlich schneller als USB 2.0; für Dokumente und Musik reicht auch der "
             "ältere Standard. Für Fotos und Videos lohnen sich 64 GB und mehr.</p>"),
    "wanduhren": dict(
        tag="kat-wanduhren", suche=["wanduhr", "wanduhren", "wall clock"], kw="wanduhr", volumen=4400, kd=16,
        echt=R(r"wanduhr|wanduhren|wall.?clock|wand-?uhr"),
        ban=R(HAUS + r"|armbanduhr|wecker|tischuhr|standuhr|sticker|wandaufkleber|aufkleber|tapete|wandtattoo|uhrwerk|zeiger-?set|"
              r"ersatz|puppen|mini|spielzeug|kinderuhr|lernuhr"),
        typen={"Gadget", "Aufbewahrung & Organizer", "Elektronik", "Uhren", "Wohnen & Deko", "Haushalt & Wohnen", "Beleuchtung",
               "Wanduhr"} | SAMMEL,
        ja=["Wanduhr im schlichten, nordischen Design", "3D LED Wanduhr mit Fernbedienung", "Wanduhr aus Massivholz mit Pendel"],
        nein=["Wanduhr-Sticker 3D Spiegel", "Quarz-Uhrwerk für Wanduhren", "Mini-Wanduhr für Puppenhaus", "Wecker im Wanduhr-Stil"],
        titel="Wanduhren", sort="BEST_SELLING",
        seo_titel="Wanduhr kaufen: modern, LED & Holz | LuxeStyle",
        seo_text="Wanduhren für Wohnzimmer, Küche und Büro: geräuscharme Uhren aus Holz und Metall, digitale LED-Wanduhren mit "
                 "Datum, DIY-Acryluhren. Versand in die Schweiz.",
        text="<p>Eine Wanduhr ist ein Möbelstück, das nebenbei die Zeit zeigt. Hier findest du Wanduhren für Wohnzimmer, Küche, "
             "Büro und Kinderzimmer – analog mit Zeigern oder digital mit grossen LED-Ziffern.</p>\n<h2>Was du hier findest</h2>\n"
             "<ul>\n<li><strong>Nordisch und schlicht:</strong> runde Uhren aus Buchenholz oder Metall mit geräuscharmem "
             "Uhrwerk fürs Schlafzimmer.</li>\n<li><strong>Digital:</strong> LED-Wanduhren mit Fernbedienung, Datum, Temperatur "
             "und Farbwechsel, auch als Spiegel- oder 3D-Ziffern.</li>\n<li><strong>Design und DIY:</strong> Sonnen-Uhren mit "
             "Kristallen, Vinyl-Silhouetten, selbstklebende Acryl-Ziffern in verschiedenen Grössen.</li>\n<li><strong>Kinder und "
             "Küche:</strong> Motive mit Einhorn oder Weltraum, wasserdichte Uhren fürs Bad, Spiegelei-Uhr für die Küche.</li>\n"
             "</ul>\n<h2>Worauf du achten kannst</h2>\n<p>Der Durchmesser und die Stromversorgung – Batterie oder Netzteil – stehen "
             "auf jeder Produktseite. Für das Schlafzimmer lohnt sich ein lautloses Sweep-Uhrwerk; LED-Uhren brauchen eine "
             "Steckdose in der Nähe.</p>"),
    "woks": dict(
        tag="kat-woks", suche=["wok", "wokpfanne", "wok-pfanne"], kw="wok", volumen=4400, kd=21,
        echt=R(r"\bwok\b|\bwoks\b|wokpfanne|wok-?pfanne|induktions-?wok|edelstahl-?wok|titan-?wok|keramik-?wok|antihaft-?wok|wok-?set"),
        ban=R(HAUS + r"|wokring|deckel f(ü|ue)r|spatel|wender|l(ö|oe)ffel|puppen|spielzeug|mini|kocher|brenner|gas-?wok|"
              r"wok-?st(ä|ae)nder|b(ü|ue)rste|reiniger|rezept|kochbuch"),
        typen={"Küche & Bar", "Aufbewahrung & Organizer", "Haushalt & Wohnen", "Haushaltsgeräte", "Pfanne", "Wok"} | SAMMEL,
        ja=["Wokpfanne aus reinem Titan", "Antihaft-Wok – Induktion & Gasherd Universal", "Wok aus 316 Edelstahl mit Wabenstruktur"],
        nein=["Gas Wok Kocher aus Gusseisen mit Ständer", "Wokwender aus Bambus", "Wokring für Gasherd", "Mini-Wok Spielküche"],
        titel="Woks & Wokpfannen", sort="BEST_SELLING",
        seo_titel="Wok kaufen: Antihaft, Edelstahl & Titan | LuxeStyle",
        seo_text="Wok und Wokpfanne für Induktion und Gasherd: Antihaft-Woks aus Maifan-Stein, Edelstahl mit Wabenstruktur, "
                 "Titan und Keramik. Versand in die Schweiz.",
        text="<p>Im Wok gart Gemüse in wenigen Minuten bei hoher Hitze – knackig statt weich. Hier findest du Woks und Wokpfannen "
             "für Induktion, Gas und Glaskeramik, mit und ohne Deckel.</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>"
             "Antihaft:</strong> beschichtete Woks aus Maifan-Stein oder Keramik, mit Holzgriff und Glasdeckel, leicht zu reinigen."
             "</li>\n<li><strong>Edelstahl:</strong> Woks mit Wabenstruktur und Dreischichtboden, auch aus 316-Edelstahl, für "
             "scharfes Anbraten ohne Beschichtung.</li>\n<li><strong>Titan und Eisen:</strong> leichte Titan-Woks und gehämmerte "
             "Eisenpfannen im klassischen Stil.</li>\n<li><strong>Sets:</strong> Wok mit Deckel, Dämpfeinsatz und Wender.</li>\n"
             "</ul>\n<h2>Worauf du achten kannst</h2>\n<p>Der Durchmesser – meist 28 bis 32 cm – und die Eignung für Induktion "
             "stehen auf jeder Produktseite. Ein flacher Boden steht auf dem Kochfeld stabil; beschichtete Woks mögen keine "
             "Metallwender, Edelstahl und Eisen vertragen alles.</p>"),
    "abendkleider": dict(
        tag="kat-abendkleider", suche=["abendkleid", "cocktailkleid", "ballkleid", "partykleid"], kw="abendkleid", volumen=3600, kd=29,
        echt=R(r"abendkleid|cocktailkleid|ballkleid|galakleid|abendrobe|partykleid"),
        ban=R(HAUS + r"|kinder|m(ä|ae)dchen|puppen|barbie|baby|kleinkind|braut|hochzeitskleid|hunde|katzen|aufbewahrung|"
              r"kleiderb(ü|ue)gel|kleidersack|kleiderh(ü|ue)lle|schnittmuster"),
        typen={"Damenmode", "Mode", "Kleid", "Kleider", "Abendkleid"} | SAMMEL,
        ja=["Abendkleid «Aurora» · Satin, Spaghettiträger & Schlitz", "Kurzarm-Cocktailkleid mit Puffärmeln", "Rundhals-Glitzer-Partykleid"],
        nein=["Abendkleid für Mädchen mit Tüll", "Kleidersack für Abendkleider", "Barbie-Abendkleid Puppenkleid", "Brautkleid Abendkleid Weiss"],
        titel="Abendkleider & Cocktailkleider", sort="BEST_SELLING",
        seo_titel="Abendkleid kaufen: lang, Satin & Spitze | LuxeStyle",
        seo_text="Abendkleider und Cocktailkleider für Gala, Hochzeit und Weihnachtsfeier: lange Satin-Kleider mit Schlitz, "
                 "Pailletten, Spitze, Etui. Versand in die Schweiz.",
        text="<p>Ein Abendkleid muss zum Anlass passen – und zu dir. Hier findest du Abendkleider und Cocktailkleider für Gala, "
             "Ball, Hochzeit als Gast, Firmenfeier und Weihnachtsessen, vom bodenlangen Satin bis zum kurzen Partykleid.</p>\n"
             "<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Lang:</strong> Meerjungfrau-Kleider mit Schleppe, A-Linien aus Satin "
             "oder Modal, Kleider mit hohem Schlitz und Spaghettiträgern.</li>\n<li><strong>Cocktail und Midi:</strong> Etui-Kleider "
             "mit Rückenschnürung, Spitzenkleider mit halbem Arm, Modelle mit Puffärmeln.</li>\n<li><strong>Glanz:</strong> "
             "Pailletten, Glitzer-Stoffe, Samt mit langen Ärmeln für den Winter.</li>\n<li><strong>Schlicht:</strong> schwarze "
             "Abendkleider, plissierte Maxi-Kleider, Kleider mit U-Boot-Ausschnitt.</li>\n</ul>\n<h2>Grösse und Länge</h2>\n<p>"
             "Die Masstabelle auf jeder Produktseite zeigt Brust-, Taillen- und Hüftumfang – miss ein Kleid aus deinem Schrank "
             "nach, statt nur die Buchstabengrösse zu vergleichen. Bodenlange Kleider sind auf eine bestimmte Körpergrösse "
             "geschnitten; mit Absatz gewinnst du ein paar Zentimeter.</p>"),
    "lunchboxen": dict(
        tag="kat-lunchboxen", suche=["lunchbox", "lunch box", "bento", "brotdose"], kw="lunchbox", volumen=3600, kd=19,
        echt=R(r"lunchbox|lunch.?box|brotdose|brotbox|bento|vesperdose|lunchdose|fr(ü|ue)hst(ü|ue)cksbox|snackbox|salatbox"),
        ban=R(HAUS + r"|lunchtasche|lunch.?bag|k(ü|ue)hltasche|isoliertasche|beutel|puppen|spielzeug|hunde|katzen|haustier|kaffee|"
              r"kapsel|lunchbox-?optik|brotbox aus (bambus|holz|metall)|brotkasten|brotkiste|brotk(ö|oe)rbe?\b"),
        typen={"Küche & Bar", "Aufbewahrung & Organizer", "Wohnen & Deko", "Gadget", "Haushalt & Wohnen", "Elektronik",
               "Haushaltsgeräte", "Lunchbox"} | SAMMEL,
        ja=["Aroma-dichte Bento Box aus Edelstahl", "Elektrische Lunchbox für Auto & Zuhause", "Bento Box Edelstahl 3 Fächer für Kinder"],
        nein=["Brotbox aus Bambus", "Brotbox aus Metall mit Bambusdeckel", "Isolierte Lunchtasche mit Reissverschluss",
              "Lunchbox-Optik Geldbörse", "Puppenhaus Mini-Lunchbox"],
        titel="Lunchboxen & Bento-Boxen", sort="BEST_SELLING",
        seo_titel="Lunchbox kaufen: Edelstahl, Bento & elektrisch | LuxeStyle",
        seo_text="Lunchboxen und Bento-Boxen aus Edelstahl, Silikon und Kunststoff: mit Fächern, Isolierung oder elektrischer "
                 "Heizung fürs Auto. Versand in die Schweiz.",
        text="<p>Eine gute Lunchbox hält dicht, lässt sich gut reinigen und passt in den Rucksack. Hier findest du Lunchboxen und "
             "Bento-Boxen für Büro, Schule, Uni und unterwegs.</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Edelstahl:"
             "</strong> aroma-dichte Boxen mit Schnappverschluss, stapelbare Behälter mit zwei bis drei Fächern, Modelle mit "
             "Thermofunktion.</li>\n<li><strong>Bento:</strong> Sets mit Fächern, Besteck und Thermotasche, auch für Kinder mit "
             "Motiven.</li>\n<li><strong>Elektrisch:</strong> Lunchboxen mit Heizung für Steckdose und Auto-Anschluss – das "
             "Mittagessen wird im Büro oder Lastwagen warm.</li>\n<li><strong>Leicht:</strong> Silikon- und Kunststoffboxen für "
             "Mikrowelle und Geschirrspüler.</li>\n</ul>\n<h2>Worauf du achten kannst</h2>\n<p>Fassungsvermögen, Fächer und "
             "Eignung für Mikrowelle oder Geschirrspüler stehen auf jeder Produktseite. Edelstahl gehört nicht in die Mikrowelle; "
             "wer Suppe oder Saucen mitnimmt, achtet auf einen Deckel mit Dichtung.</p>"),
    "winterschuhe": dict(
        tag="kat-winterschuhe", suche=["winterschuhe", "winterstiefel", "schneestiefel", "snow boots", "winter boots", "gefüttert", "snowboots"],
        kw="winterschuhe damen", volumen=3600, kd=19,
        echt=R(r"winterschuh|winterstiefel|schneestiefel|snow.?boots?|winter.?boots?|gef(ü|ue)tterte? (stiefel|boots|sneaker|stiefelette)|"
               r"warm gef(ü|ue)ttert|pl(ü|ue)sch-?gef(ü|ue)ttert|fellgef(ü|ue)ttert|thermo-?winterschuh"),
        ban=R(HAUS + r"|hunde|katzen|haustier|kinder|baby|kleinkind|jungen|m(ä|ae)dchen|einlage|sohle\b|einlegesohle|spray|impr(ä|ae)gn|"
              r"schuhspanner|schuhregal|aufbewahrung|socken|str(ü|ue)mpfe|schneeschuhe? f(ü|ue)r|schneeketten|spikes|hausschuh|pantoffel|"
              r"schuh(ü|ue)berzieh|(ü|ue)berschuh|gamaschen|schuhbeutel"),
        typen={"Damenschuhe", "Herrenschuhe", "Sportschuhe", "Schuhe", "Stiefel", "Winterschuhe"} | SAMMEL,
        ja=["Warme Winterstiefel für Damen", "Winterstiefel für Herren, gefüttert", "Wasserdichte Schneestiefel",
            "Gefütterte Winterschuhe mit Schnürung"],
        nein=["Kinder-Winterstiefel mit Klett", "Einlegesohle für Winterschuhe", "Schneeketten für Schuhe · Spikes",
              "Hunde-Winterschuhe 4er Set", "Wasserdichte Überschuhe für Winterschuhe"],
        titel="Winterschuhe & Winterstiefel", sort="BEST_SELLING",
        seo_titel="Winterschuhe Damen & Herren: gefüttert | LuxeStyle",
        seo_text="Winterschuhe und Winterstiefel für Damen und Herren: gefütterte Schneestiefel, wasserdichte Snow Boots, "
                 "Thermo-Schuhe, Leder-Boots. Versand in die Schweiz.",
        text="<p>Winterschuhe müssen warm halten, trocken bleiben und auf Schnee greifen – alles andere ist Mode. Hier findest "
             "du Winterschuhe und Winterstiefel für Damen und Herren, von der gefütterten Stiefelette bis zum Snow Boot für den "
             "Winterspaziergang.</p>\n<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Damen:</strong> Mid-Calf-Winterstiefel mit "
             "Plüschrand, gepolsterte Snow Boots mit Schnürung, Overknee-Stiefel mit dickem Absatz.</li>\n<li><strong>Herren:"
             "</strong> gefütterte Leder-Boots, wasserdichte Outdoor-Winterstiefel mit Profilsohle, Thermo-Winterschuhe mit "
             "Klett.</li>\n<li><strong>Schnee und Outdoor:</strong> Schneestiefel mit Fleece- oder Sherpa-Futter, Mid-Cut-Modelle "
             "für Wanderwege im Winter.</li>\n</ul>\n<h2>Grösse und Futter</h2>\n<p>Die Masstabelle in Zentimetern steht auf "
             "jeder Produktseite – mit dicken Socken lohnt sich eine halbe bis ganze Nummer mehr. Ob das Futter aus Fleece, Plüsch "
             "oder Schaffell ist und ob der Schaft wasserdicht ist, steht im Faktenblock des Produkts.</p>"),
    "bauchtaschen": dict(
        tag="kat-bauchtaschen", suche=["bauchtasche", "gürteltasche", "hüfttasche", "belt bag"], kw="bauchtasche", volumen=2900, kd=16,
        echt=R(r"bauchtasche|g(ü|ue)rteltasche|h(ü|ue)fttasche|bum.?bag|belt.?bag|hip.?bag|fanny.?pack|bauch-?g(ü|ue)rtel-?tasche|laufg(ü|ue)rtel"),
        ban=R(HAUS + r"|hunde|katzen|haustier|puppen|hose\b|hosen\b|jacke|shirt|kleid|mantel|weste\b|overall|mit bauchtasche|"
              r"mit g(ü|ue)rteltasche|hoodie|pullover|tragetuch|babytrage|trail|chest rig|coiffeur|werkzeug|holster|kellner"),
        typen={"Taschen", "Accessoires", "Aufbewahrung & Organizer", "Sport & Outdoor", "Herrenmode", "Damenmode", "Tasche"} | SAMMEL,
        ja=["Leder-Bauchtasche für Herren, robust", "Wasserdichte Crossbody-Gürteltasche für Herren", "Retro Hüfttasche aus Rindsleder"],
        nein=["Hoodie mit Bauchtasche", "Taktische Brusttasche für Trail Running", "Leder-Gürteltasche für Coiffeur-Werkzeuge",
              "Hunde-Gürteltasche für Leckerli", "Daunenweste mit Gürteltasche"],
        titel="Bauchtaschen & Gürteltaschen", sort="BEST_SELLING",
        seo_titel="Bauchtasche & Gürteltasche kaufen | LuxeStyle",
        seo_text="Bauchtaschen, Gürteltaschen und Hüfttaschen aus Leder, Canvas und Nylon: wasserdicht für Sport, Retro aus "
                 "Rindsleder, Belt Bags. Versand in die Schweiz.",
        text="<p>Eine Bauchtasche hält Handy, Schlüssel und Portemonnaie am Körper – quer über der Brust getragen oder klassisch "
             "um die Hüfte. Hier findest du Bauchtaschen, Gürteltaschen und Hüfttaschen für Alltag, Sport, Velo und Reise.</p>\n"
             "<h2>Was du hier findest</h2>\n<ul>\n<li><strong>Leder:</strong> Retro-Gürteltaschen aus Rindsleder und Crazy-Horse-"
             "Leder, Bauchtaschen aus Vollnarbenleder für Herren.</li>\n<li><strong>Sport und Velo:</strong> wasserdichte "
             "Hüfttaschen aus Nylon, leichte Laufgürtel mit Flaschenfach, Hard-Shell-Modelle.</li>\n<li><strong>Crossbody:</strong>"
             " Belt Bags mit breitem Gurt zum Tragen über der Brust, in Pastell oder Neon.</li>\n<li><strong>Canvas und Outdoor:"
             "</strong> taktische Gürteltaschen mit mehreren Fächern, Retro-Modelle aus Segeltuch.</li>\n</ul>\n<h2>Worauf du "
             "achten kannst</h2>\n<p>Die Gurtlänge und die Masse stehen auf jeder Produktseite – für ein grosses Handy braucht "
             "es ein Hauptfach von mindestens 17 cm. Leder wird mit der Zeit weicher, Nylon bleibt leicht und regenfest.</p>"),
})


def kanarien():
    f = 0
    for h, c in CFG.items():
        for t in c["ja"]:
            if not (c["echt"].search(t) and not c["ban"].search(t)):
                print("FEHLER ja ", h, t); f += 1
        for t in c["nein"]:
            if c["echt"].search(t) and not c["ban"].search(t):
                print("FEHLER nein", h, t); f += 1
    n = sum(len(c["ja"]) + len(c["nein"]) for c in CFG.values())
    print(f"Kanarienvögel {n}, Fehler {f}")
    return f


if __name__ == "__main__":
    raise SystemExit(1 if kanarien() else 0)
