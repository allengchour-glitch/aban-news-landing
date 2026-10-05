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
        echt=R(r"teppich(e|en|s)?\b|\bl(ä|ae)ufer\b|badematte|badvorleger|badteppich|fussmatte|fußmatte|t(ü|ue)rmatte"),
        ban=R(HAUS + r"|wandteppich|teppichreiniger|teppichklopfer|teppichband|teppichklebe|teppichgreifer|"
              r"anti.?rutsch.?(pad|band|unterlage)|yoga|spiel(zeug|matte)|puzzle|kratz|haustier|hunde|katzen|auto|kofferraum|"
              r"mauspad|tischset|tischl(ä|ae)ufer|teppich-?muster|im teppich|teppichoptik|wandbehang|tapisserie|picknick|"
              r"camping|\bdiy\b|tufting|leim|kleber|deko-?teppich"),
        typen={"Wohnen & Deko", "Aufbewahrung & Organizer", "Haushalt & Wohnen", "Heimtextilien", "Basteln & DIY",
               "Beauty-Tools", "Auto-Zubehör", "Teppich", "Teppiche"} | SAMMEL,
        ja=["Minimalistischer Teppich, schmutzabweisend", "Flauschige Badematte", "Runder Teppich Wohnzimmer"],
        nein=["Mandala Wandteppich", "Teppichmesser Profi", "Tischläufer Leinen", "Kratzteppich für Katzen",
              "Multifunktionaler wasserdichter Picknick-Teppich", "Wasserdichter Camping-Teppich", "DIY Teppich-Set Faultier",
              "Weisser Holzleim für Teppich-Tufting", "Deko-Teppich Streifen"],
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
              r"spray|duft|stoff f(ü|ue)r|baumwollstoff|meterware|\bstoff\b"),
        typen={"Wohnen & Deko", "Aufbewahrung & Organizer", "Basteln & DIY", "Heimtextilien", "Haushalt & Wohnen",
               "Bettwäsche"} | SAMMEL,
        ja=["Blumen-Bettwäsche-Set aus Baumwolle, 4-teilig", "Bettbezug 160x210 Leinen"],
        nein=["Wäschebeutel für Bettwäsche", "Hundebett mit Bettwäsche-Optik", "Twill-Baumwollstoff für Bettwäsche & Vorhänge",
              "Baumwollstoff für Bettwäsche & Vorhänge"],
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
        seo_text="Wäschekörbe und Wäschesammler: faltbar, mit Deckel, mehreren Fächern oder Rollen, aus Oxford-Stoff, "
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
        echt=R(r"\bwecker\b|\bweckuhr|wecker(uhr|-uhr)|lichtwecker|digitalwecker|kinderwecker|reisewecker|sonnenaufgangs?wecker"),
        ban=R(HAUS + r"|mit wecker|wecker-?funktion|weckerfunktion|smartwatch|armband|\buhr(en)?band|vibrationsarmband|"
              r"kopfh(ö|oe)rer|halbquarz|multifunktionsuhr|\bherren-|\bdamen-|sanda|curren|nachtlicht mit|lautsprecher mit|"
              r"speaker mit|lampe mit"),
        typen={"Gadget", "Elektronik", "Beleuchtung", "Wohnen & Deko", "Aufbewahrung & Organizer", "Auto-Zubehör", "Uhren",
               "Haushalt & Wohnen", "Wecker"} | SAMMEL,
        ja=["LED-Spiegeluhr minimalistisch · Wecker & Temperatur", "Digitaler Wecker mit Ladefunktion", "Lichtwecker Sonnenaufgang"],
        nein=["Smartwatch mit Wecker", "Bluetooth-Lautsprecher mit Weckerfunktion", "Herren-Halbquarz-Wecker mit Kalender",
              "Sanda Grünlicht Wecker Multifunktionsuhr", "Nachtlicht mit Bluetooth Speaker & Wecker",
              "Kabelloser Lade-Bluetooth-Lautsprecher mit LED-Wecker"],
        titel="Wecker", sort="BEST_SELLING",
        seo_titel="Wecker kaufen: digital, LED & Lichtwecker | LuxeStyle",
        seo_text="Wecker für Nachttisch und Reise: digitale LED-Wecker, Lichtwecker mit Sonnenaufgang, Kinderwecker und Modelle "
                 "mit Ladefunktion fürs Handy. Versand in die Schweiz.",
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
        seo_text="Duschvorhänge aus Polyester, wasserabweisend, mit Blumen-, Marmor- und Fotomotiven, einzeln oder als Set mit "
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
                 "Outdoor, Velo, Keller und Haushalt. Versand in die Schweiz.",
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
                 "Saugnäpfen oder zum Kleben ohne Bohren. Versand in die Schweiz.",
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
              r"aufbewahrung|kleiderb(ü|ue)gel|reinigung|spray|lego|figur|playmobil|anh(ä|ae)nger|schl(ü|ue)ssel"),
        typen={"Damenmode", "Herrenmode", "Mode", "Jacke", "Jacken", "Mäntel"} | SAMMEL,
        ja=["Kurze Winterjacke mit Kapuze", "Kurze Daunenjacke mit Patchwork-Ärmeln für Damen",
            "Gefütterter Patchwork-Wintermantel mit Kapuze"],
        nein=["Hunde-Winterjacke wasserdicht", "Daunenweste Herren", "Kinder-Winterjacke mit Fell"],
        titel="Winterjacken & Daunenjacken", sort="BEST_SELLING",
        seo_titel="Winterjacke Damen & Herren: Daunenjacken | LuxeStyle",
        seo_text="Winterjacken und Daunenjacken für Damen und Herren: kurze Puffer-Jacken, gefütterte Parkas mit Kapuze und "
                 "Fellkragen, lange Wintermäntel. Versand in die Schweiz.",
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
