#!/usr/bin/env python3
"""google_kategorie_fein.py — «Kleidung (allgemein)» bei Google in die echte Unterkategorie einordnen (29.09.2026).

GEMESSEN (Bulk-Export 49'237 aktive): 7'254 Produkte tragen `mm-google-shopping.google_product_category` =
«Apparel & Accessories > Clothing» — Mäntel, Röcke, Hemden, Leggings, Bademode alle unter demselben groben Pfad. Google
ordnet Gratis-Einträge nach Suchanfrage und Kategorie zu; wer «Abendkleid» sucht, soll ein Kleid finden, nicht «Kleidung».
Anlass: Maxi-Kleid «Aria» (Nachfrage-Liebling) stand wegen «mit Gürtel» auf «Belts» (Betreiber «google push?» / «noch mehr?»).

REGEL: NUR Produkte, deren Wert GENAU «Apparel & Accessories > Clothing» ist, bekommen per Titelregel (Reihenfolge = Vorrang,
deutsche Komposita: Warenwort am Ende → `\\w*wort\\b`) die Unterkategorie; jeder Zielpfad wird gegen Googles Taxonomie geprüft
(unbekannter Pfad → Abbruch, nichts geschrieben). Kein Treffer = bleibt grob (nicht raten). Kinder-/Baby-/Kostüm-Titel bleiben
aussen vor (eigene Google-Zweige). Schreiben: metafieldsSet in 25er-Blöcken, Eimer-Etikette, Rücklesen aus der Antwort,
Ledger dropship/_google_kategorie_fein.tsv. EXPORT=/pfad.jsonl (Bulk-Export mit metafield) sonst eigener Bulk-Export.
DRY=1 zeigt nur. Täglich im Aufseher → neue Importe werden mit eingeordnet.
"""
import collections, json, os, re, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
GROB = "Apparel & Accessories > Clothing"
ELEK = "Electronics"
LEDGER = os.path.join(REPO, "dropship/_google_kategorie_fein.tsv")
TAXO = os.environ.get("TAXO", "/tmp/gtaxo.txt")
GROB_ERLAUBT = ("Apparel & Accessories", "Cameras & Optics", "Health & Beauty > Personal Care > Vision Care",
                "Health & Beauty > Health Care > Supports", "Sporting Goods > Outdoor Recreation")
ELEK_ERLAUBT = ("Electronics >", "Toys & Games", "Cameras & Optics", "Home & Garden > Lighting", "Home & Garden > Decor > Clocks",
                "Home & Garden > Household Appliances", "Home & Garden > Decor > Home Fragrance Accessories",
                "Home & Garden > Business & Home Security", "Health & Beauty > Personal Care > Oral Care",
                "Health & Beauty > Personal Care > Shaving & Grooming", "Health & Beauty > Personal Care > Massage & Relaxation",
                "Health & Beauty > Personal Care > Hair Care > Hair Styling Tools", "Apparel & Accessories > Jewelry > Watch",
                "Vehicles & Parts", "Baby & Toddler", "Animals & Pet Supplies", "Hardware > Tools > Lighters",
                "Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments",
                "Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools")
GOOGLE_KANAL = "gid://shopify/Publication/302872297857"   # App «Google & YouTube»
SCHARF = os.environ.get("DRY") != "1"
C = "Apparel & Accessories > Clothing > "

AUSSEN = re.compile(r"^jungen\b|kinder|kids|baby|mädchen|\bfür jungen\b|\bjungen-|kleinkind|kostüm|verkleidung|puppe(?!nkragen)|cosplay|b[üu]hnenuniform", re.I)
REGELN = [
    (r"\w*schal\b|\bschals\b|halstuch|stola|\w*tuch\b(?!.*(strand|bade|hand))|halsw[äa]rmer", "Apparel & Accessories > Clothing Accessories > Scarves & Shawls"),
    (r"strand-?kimono|strand[üu]berzug|swimwear|badebekleidung|facekini", C + "Swimwear"),
    (r"kimono\w* nachtgewand|nachtgewand|\brobe\b.*herren|pajama", C + "Sleepwear & Loungewear"),
    (r"tights|f[üu]sslinge|beinw[äa]rmer|\w*stulpen\b|bloomers|bauchformer|taillentrainer|corsage|bustier", C + "Underwear & Socks"),
    (r"partnerlook|familien-?(outfit|look)|zweiteiler|\boutfit\b", C + "Outfit Sets"),
    (r"trainingsanzug|jogginganzug|sportanzug", C + "Activewear"),
    (r"pyjama|schlafanzug|nachthemd|bademantel|morgenmantel|loungewear|homewear|nachtwäsche", C + "Sleepwear & Loungewear"),
    (r"bikini|badeanzug|badehose|bademode|tankini|swimsuit|monokini|badeshorts|cover-?up", C + "Swimwear"),
    (r"unterwäsche|boxershorts|unterhose|\bslips?\b|\bbh\b|\bbra\b|bralette|\bbriefs\b|socken|strumpfhose|strümpfe|dessous|\bbody\b|shapewear|mieder|korsett|taillenformer", C + "Underwear & Socks"),
    (r"\bset\b|\bsets\b|[23]-teilig|zwei-?teilig|drei-?teilig|\bkombi\b", C + "Outfit Sets"),
    (r"jumpsuit|overall|romper|playsuit|einteiler", C + "One-Pieces > Jumpsuits & Rompers"),
    (r"leggings|yoga|sport-?bh|fitness|laufshirt|radhose", C + "Activewear"),
    (r"\w*kleid\b|\bdress\b|sommerkleid|sundress|slipdress|damenrobe|\bmaxi\b", C + "Dresses"),
    (r"\w*rock\b|\bskirt\b|\w*jupes?\b|r[öo]ckchen|\w*r[öo]cke\b|\w*r[öo]ck\b|skort", C + "Skirts"),
    (r"strickjacke|strickj[äa]ckchen|cardigan|kardigan", C + "Shirts & Tops"),
    (r"\w*westen?\b|\bgilet\b|\bvest\b", C + "Outerwear > Vests"),
    (r"\w*jacke\b|\w*mantel\b|trenchcoat|\bparka\b|blazer|bomber|windbreaker|daunen|\bcoat\b|\bjacket\b|anorak|sakko|blouson|\bcape\b|\w*-cape\b|poncho", C + "Outerwear > Coats & Jackets"),
    (r"\w*shorts\b|bermuda|kurze hose", C + "Shorts"),
    (r"\w*hosen?\b|\w*jeans\b|\w*pants\b|jogger|chino|culotte|trousers?\b|capris|pantalons?\b|kurzbeine|denim f[üu]r herren", C + "Pants"),
    (r"shirt|\w*hemd\b|bluse|\w*tops?\b|\bcami\b|pullunder|pullover|\bpulli\b|sweatshirt|hoodie|tunika|\bpolo\b|camisole|tanktop|oberteil|sweater|longsleeve|\bcrop\b|\w*hemden\b|henley|turtleneck|\w*pulli\b|kurz[äa]rml\w*|achsellos|polo\b|\btee\b|tunic|bodysuit|trikot|kutte|gewand|kaftan|kimono|fleece\b", C + "Shirts & Tops"),
    (r"\w*anzug\b|\bsuit\b|smoking", C + "Suits"),
]
_R = [(re.compile(m, re.I), z) for m, z in REGELN]

# ─────────────────────────────────────────────────────────────────────────────
# ZWEITER TEIL (29.09.2026, «bis alles fix ist und sauber»): LEERE Werte im Google-Kanal.
# GEMESSEN (Bulk-Export mit publishedOnPublication): 1'466 von 47'474 Kanal-Produkten ohne Kategorie —
# 783 «Trend-Gadget», 147 «Trend-Produkt», 120 Kostüm-Warengruppe (Fortura-Sammelkorb: WC-Papier, Luftmatratze,
# Bruder-Modelle), 117 Aufbewahrung … `google_kategorie.py` lässt Sammelkörbe bewusst leer («leer schlägt falsch»).
# Hier entscheidet das NOMEN im Titel (Reihenfolge = Vorrang: Tier/Baby vor Kleidung, Kleidung vor Gerät —
# «Heizjacke» ist eine Jacke, «Katzen-Slipper für Damen» ein Schuh, «Badehandtuch für Haustiere» Tierbedarf).
# Kein Treffer → danach die gepflegte Tag-/Warengruppen-Logik aus google_kategorie.kategorie(); sonst bleibt leer.
# Kleidung landet zuerst grob und wird sofort mit REGELN oben verfeinert. Die 1'654 Leeren AUSSERHALB des Kanals
# (1'561 Kostüme, 41 Raucherzubehör — bewusst nicht bei Google) werden nicht angefasst.
# ─────────────────────────────────────────────────────────────────────────────
PC = "Health & Beauty > Personal Care > "
KOS = PC + "Cosmetics > "
KH = "Home & Garden > Kitchen & Dining > "
MENSCH = re.compile(r"\b(damen|herren|frauen|männer|unisex|mädchen|jungen)\b|katzenohren", re.I)
LEER_REGELN = [
    # 01.10.2026 Nachprüfung «Feinkategorien überall» (Stichproben je Zielpfad): Fehlgriffe innerhalb des richtigen Hauptzweigs —
    # «Kerzenhalter» als Kerze, «Duschvorhang mit Totenkopf» als Saison-Deko, «Messerhalter mit Abtropfschale» als Geschirr,
    # «Teekessel» als Trinkgefäss, «Leselupe mit LED» als Leuchte, «Fritteuse/Zitruspresse» als Küchenhelfer, «Fingerkette» als Halskette.
    (r"kerzenhalter|kerzenst[äa]nder|kerzenw[äa]rmer|teelichthalter|windlicht", "Home & Garden > Decor > Home Fragrance Accessories > Candle Holders", ""),
    (r"duschvorhang|duschvorh[äa]nge", "Home & Garden > Bathroom Accessories > Shower Curtains", ""),
    (r"messerhalter|messerblock|messerleiste", "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils > Kitchen Organizers > Knife Blocks & Holders", ""),
    (r"^(?!.*(?:elektrisch|thermostat|warmhalte|f[üu]rs auto|12 ?v|usb)).*(?:tee|wasser)kessel|fl[öo]tenkessel", "Home & Garden > Kitchen & Dining > Cookware & Bakeware > Cookware > Stovetop Kettles", ""),
    (r"elektrische\w* (?:tee|wasser)kocher|wasserkocher|(?:thermostat|warmhalte|f[üu]rs auto|12 ?v|usb).{0,30}(?:tee|wasser)kessel|(?:tee|wasser)kessel.{0,30}(?:thermostat|warmhalte|f[üu]rs auto|12 ?v|usb)", "Home & Garden > Kitchen & Dining > Kitchen Appliances > Electric Kettles", ""),
    (r"leselupe|lupe mit|vergr[öo]sserungsglas", "Office Supplies > Office Instruments > Magnifiers", ""),
    (r"f[üu]r (?:die )?(?:heissluft)?fri?tteuse", "Home & Garden > Kitchen & Dining > Kitchen Appliance Accessories > Deep Fryer Accessories", ""),
    (r"fritteuse|friteuse", "Home & Garden > Kitchen & Dining > Kitchen Appliances > Deep Fryers", ""),
    (r"elektrische\w* zitruspresse|entsafter", "Home & Garden > Kitchen & Dining > Kitchen Appliances > Juicers", ""),
    (r"fingerkette|k[öo]rperkette|bauchkette", "Apparel & Accessories > Jewelry > Body Jewelry", ""),
    # 01.10.2026 (Google-Fokus): «Acryl Adventskalender Blind Box» landete über «kalender» bei Büro-Kalendern → Vorrang-Regel.
    # ⛔ Eine Kostüm-Regel wurde am selben Tag wieder ENTFERNT: Kostüme bleiben bei Google bewusst ohne Kategorie (Bericht
    # GOOGLE-KATEGORIE-FEIN-2026-09-29, AUSSEN), und die Gegenprobe traf ein HUNDE-Kostüm als Menschen-Kostüm.
    (r"adventskalender|advent calendar", "Home & Garden > Decor > Seasonal & Holiday Decorations > Advent Calendars", ""),
    # Fortura-Fanartikel: «Radsocken für Auto Holland» sind Radkappen-Überzüge, keine Socken
    (r"radsocken|spiegelsocken|autofahne|auto-?flagge|auto[- ]?waschhandschuh|autowasch\w*", "Vehicles & Parts > Vehicle Parts & Accessories", ""),
    (r"\bgps\b.*(tracker|halsband|ortung|anti-verlust)|gps-\w*tracker", "Electronics > GPS Tracking Devices", ""),
    (r"usb-?stick\w*|speicherstick\w*|usb-?flash", "Electronics > Electronics Accessories > Computer Components > Storage Devices > USB Flash Drives", ""),
    (r"^(?!.*(ladeger|lader)).*(batterien? f[üu]r|carbon-?batterien|lithium-?batterie)", "Electronics > Electronics Accessories > Power > Batteries", ""),
    (r"holzpuzzle|metallpuzzle|3d-?puzzle", "Toys & Games > Puzzles", ""),
    (r"klemmbaustein\w*|\bbaustein\w*|\w*bausteine\b|\bbausatz\b|\w+-?bausatz\b|baukasten\w*|\bmoc\b", "Toys & Games > Toys > Building Toys", ""),
    (r"vr-?brille|3d-vr|smarte? (audio-)?brille|bluetooth-?brille|ai brille|smart-?brille", "Electronics > Computers > Smart Glasses", ""),
    # Masken: Schutz-/Sportmaske ≠ Hautpflege-Tuchmaske ≠ LED-Gerät ≠ Kostüm (43 standen über Tag «beauty» als Kosmetik)
    (r"tauch\w*maske|tauch- und schwimmmaske|schnorchel\w*", "Sporting Goods > Outdoor Recreation > Boating & Water Sports > Diving & Snorkeling > Diving & Snorkeling Masks", ""),
    (r"atemschutz\w*|staubmaske|staubschutzmaske|\bffp\d|aktivkohlefilter", "Business & Industrial > Work Safety Protective Gear > Protective Masks > Dust Masks", ""),
    (r"^(?!.*(hoodie|pullover|shirt|jacke)).*(augenmaske|schlafmaske)", PC + "Sleeping Aids > Eye Masks", ""),
    (r"^(?=.*maske).*(\bled\b|led-|photon\w*|rotlicht|lichttherapie|\bems\b|beauty instrument)|leuchtmaske|lichtmaske", "Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Skin Care Tools", ""),
    (r"tuchmaske|feuchtigkeitsmaske|kollagen\w* \w*maske|jelly\b.*maske|fussmaske|maske mit (kurkuma|hyaluron|kollagen|kojis)|kojis[äa]ure|sheet mask", "Health & Beauty > Personal Care > Cosmetics > Skin Care", ""),
    (r"^(?=.*(maske|sturmhaube|balaclava)).*(schutzfilter|baumwollmaske|saubere luft|filtersystem|winddicht\w*|thermo-?gesichtsmaske|uv-?schutz|sturmhaube|balaclava|halbgesichtsmaske|outdoor-?\w*maske|maske f[üu]r (sport|den winter|herbst)|atmungsaktiv\w* (\w+ )?maske|3d gesichtsmaske|gesichtsmaske f[üu]r (herbst|winter)|vollgesichtsmaske|sonnenschutz gesichtsmaske|winter-gesichtsmaske|schutz vor sonne)",
     "Apparel & Accessories > Clothing Accessories > Balaclavas", ""),
    # Tierbedarf (vor Kleidung/Handtuch/Rucksack), aber nie «Katzen-Slipper für Damen»
    (r"^(?!.*(h[üu]lle f[üu]rs? (iphone|handy)|tastenkappe|ohrh[öo]rer|speicherstick|usb)).*(f[üu]r\s+(hunde|katzen|haustiere|welpen)\b|\bhunde\w*|\bkatzen\w*|\bhaustier\w*|\bwelpen\w*|trinkbrunnen|kratzbaum|zugleine|pet-flasche|futter- und trinkflasche|tiertasche|fellpflege|futterautomat|f[üu]r tiere\b|\bhalsband\b)",
     "Animals & Pet Supplies > Pet Supplies", "tier"),
    (r"babytrage|tragetuch", "Baby & Toddler > Baby Transport > Baby Carriers", ""),
    (r"strampler|babyanzug|s[äa]uglingsanzug|\bbabybody|baby[- ]?body|tutu-?kleid f[üu]r baby", "Apparel & Accessories > Clothing > Baby & Toddler Clothing", ""),
    (r"\bbaby\w*|neugeboren\w*|s[äa]ugling\w*|kleinkind\w*|kinderwagen\w*", "Baby & Toddler", ""),
    # Spielzeug
    (r"\bbworld\b|\bbruder\b|^zubeh[öo]r:", "Toys & Games > Toys", ""),
    (r"pl[üu]schtier\w*|kuscheltier\w*|stofftier\w*", "Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals", ""),
    (r"\bpuzzle\w*|schraubpuzzle", "Toys & Games > Puzzles", ""),
    (r"drohne\w*|\bdrone\b|quadcopter|quadrocopter|ferngesteuert\w*|\brc[- ]", "Toys & Games > Toys > Remote Control Toys", ""),
    # Kostüm/Party/Halloween
    (r"latex-?maske|halbmaske|rhinestone maske|d[äa]monenmaske|pl[üu]sch[- ]?maske|horror\w*[- ]\w*maske|totenkopf\w*[- ]?maske|performance maske|\w*maske aus pl[üu]sch", "Apparel & Accessories > Costumes & Accessories > Masks", ""),
    (r"echthaar\w*|echtem haar|haarper[üu]cke|human hair|lace[- ]front", "Apparel & Accessories > Clothing Accessories > Hair Accessories > Wigs", ""),
    (r"per[üu]cken-?spray|spray f[üu]r per[üu]cken", PC + "Hair Care", ""),
    (r"\bper[üu]cke\w*|\w+-per[üu]cke\b", "Apparel & Accessories > Clothing Accessories > Hair Accessories > Wigs", ""),
    (r"partybrille|skibrille", "Apparel & Accessories > Costumes & Accessories > Costume Accessories", ""),
    (r"fahnenkette|\bfahne\b|\bflagge\b|wimpelkette", "Home & Garden > Decor > Flags & Windsocks", ""),
    (r"knicklicht\w*|jetons|wertmarken|lottokarte\w*|ballon\w*|konfetti|girlande|luftschlange\w*|tischtuchrolle|pappteller|partybecher|servietten|\bkan[üu]le\b|aufklebenummern|happy party|\blotto\w*|bingo\w*|losbox|lostrommel",
     "Arts & Entertainment > Party & Celebration > Party Supplies", ""),
    # Schmuck/Uhren vor Elektronik («Silikonarmband für Apple Watch», «Lederarmband mit USB-C-Ladekabel» → Kabel unten zuerst)
    (r"(arm)?band\w* f[üu]r (apple|smart|galaxy)[- ]?watch|watch[- ]?(arm)?band", "Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands", ""),
    (r"ladekabel|usb-?c?-?kabel|\bkabel\b|lightning", "Electronics > Electronics Accessories > Cables", ""),
    (r"wanduhr|\w*wecker\b|tischuhr|kuckucksuhr|kalenderuhr|spiegel ?uhr|uhr f[üu]r zuhause", "Home & Garden > Decor > Clocks", ""),
    (r"sanduhr", "Home & Garden > Decor > Hourglasses", ""),
    (r"uhrenarmband|f[üu]r fitbit|schnellverschluss-?armband|nylon-?armband|armband\w* f[üu]r .*(ultra|generation|watch)", "Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands", ""),
    (r"bew[äa]sserungs-?timer", "Hardware > Plumbing > Water Timers", ""),
    (r"eieruhr|k[üu]chen-?timer", "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils > Cooking Timers", ""),
    (r"smart\s*-?watch|smartuhr|smart\w*[- ](sport-?|bluetooth-?|gesundheits-?|business-?)?armband|sportarmband|sport-armband|bluetooth-armband|armband mit herzfrequenz|herzfrequenz-?armband|pedometer\b.*armband|fitness-?tracker|^(?!.*(licht|lampe|leuchte|zeitschalt|ladestation|lautsprecher|wecker|reise-uhr|stopuhr|zifferblatt|wand|tisch|charger|ladeger)).*\w*uhr\b|chronograph", "Apparel & Accessories > Jewelry > Watches", ""),
    (r"schmuckset|halskette.*ohrring|ohrring.*halskette", "Apparel & Accessories > Jewelry > Jewelry Sets", ""),
    (r"ohrring\w*|ohrstecker|creolen", "Apparel & Accessories > Jewelry > Earrings", ""),
    (r"\w*fotoanh[äa]nger|medaillon", "Apparel & Accessories > Jewelry > Charms & Pendants", ""),
    (r"halskette\w*|perlenkette|\w*kette mit\b.*anh[äa]nger|anh[äa]nger-?kette", "Apparel & Accessories > Jewelry > Necklaces", ""),
    (r"\w*-ring\b|\bring\b|(finger|zirkon|silber|gold|diamant|verlobungs|stapel|siegel|damen|herren)ring\b", "Apparel & Accessories > Jewelry > Rings", ""),
    (r"^(?!.*(ladestation|lader|kabel|smart|herzfrequenz|bluetooth|pedometer|antistatik|m[üu]cken|fitbit|kamera)).*(\barmreif\w*|\barmband\b|\w*armband\b)", "Apparel & Accessories > Jewelry > Bracelets", ""),
    # Schönheit
    (r"make-?up[- ]?pinsel\w*|kosmetikpinsel|puderpinsel|augenbrauen-?pinsel|eyebrow pinsel|pinselset.*make|make.*pinselset", KOS + "Cosmetic Tools > Makeup Tools > Makeup Brushes", ""),
    (r"schminkspiegel|kosmetikspiegel|make-?up[- ]?spiegel|schminkbox|lichtspiegel", KOS + "Cosmetic Tools > Makeup Tools > Face Mirrors", ""),
    (r"fusselentferner|fusselrasierer|tierhaar\w*|\blint\b", "Home & Garden > Household Supplies > Laundry Supplies > Lint Rollers", ""),
    (r"waxing|wachsstreifen|epilierer|epilator|haarentfern\w*|augenbrauen\w*entferner|trimmer\w*|\w*rasierer\b", PC + "Shaving & Grooming > Hair Removal", ""),
    (r"blackhead|mitesser\w*|porenreinig\w*|microcurrent|gesichtsger[äa]t|gesichtsreinigungs?b[üu]rste|ems\b.*gesicht", KOS + "Cosmetic Tools > Skin Care Tools", ""),
    (r"magnetisch\w* wimpern|k[üu]nstlich\w* wimpern|falsche wimpern|wimpern-?cluster|wimpernverl[äa]ngerung", KOS + "Makeup > Eye Makeup > False Eyelashes", ""),
    (r"lidschatten|eyeliner|mascara|augenbrauen\w*|wimpern\w*|eyebrow", KOS + "Makeup > Eye Makeup", ""),
    (r"lipgloss|lippenstift\w*|lipstick|lip ?tint|lipliner|lippenkonturenstift", KOS + "Makeup > Lip Makeup", ""),
    (r"lippenpflege|lippenbalsam|lip ?balm", KOS + "Skin Care > Lip Balms & Treatments", ""),
    (r"\bn[äa]gel\w*|\w*n[äa]gel\b|\bnail\b|nagellack|mani[kc][üu]re|gel-?lack|verl[äa]ngerungsgel", KOS + "Nail Care", ""),
    (r"haargl[äa]tter|gl[äa]tteisen|lockenstab|\bf[öo]hn\b|haartrockner", PC + "Hair Care > Hair Styling Tools", ""),
    (r"\w*kamm\b|haarb[üu]rste", PC + "Hair Care > Hair Styling Tools > Combs & Brushes", ""),
    (r"haarspray|shampoo|haarmaske|haar[öo]l|conditioner|haarkur", PC + "Hair Care", ""),
    (r"massage\w*|massager|gua ?sha|akupressur\w*|nadeln.*r[üu]cken|r[üu]cken\w*.*magnet", PC + "Massage & Relaxation", ""),
    (r"seifenspender|seifen-spender|lotionspender|desinfektionsspender", "Home & Garden > Bathroom Accessories > Soap & Lotion Dispensers", ""),
    (r"\w*seife\b", KOS + "Bath & Body > Bar Soap", ""),
    (r"eau de (parfum|toilette)|\bparf[üu]m\w*|\bparfum\w*", KOS + "Perfume & Cologne", ""),
    (r"serum|gesichtscreme|feuchtigkeitspflege|augenpartie|hautpflege|peeling|augenpads|gesichtsmaske \d|tuchmaske", KOS + "Skin Care", ""),
    (r"make-?up|foundation|concealer|highlighter|\brouge\b|\bblush\b", KOS + "Makeup", ""),
    # Kleidung & Mode (vor Geräten: «Heizjacke», «Heizweste»)
    (r"reinigungshandschuh\w*|putzhandschuh\w*|sp[üu]lhandschuh\w*", "Home & Garden > Household Supplies > Household Cleaning Supplies > Cleaning Gloves", ""),
    (r"\w*schal\b|\bschals\b|halstuch|stola\b", "Apparel & Accessories > Clothing Accessories > Scarves & Shawls", ""),
    (r"haarspange|haarklammer|haarreif|scrunchie|kopfschmuck|haarschmuck", "Apparel & Accessories > Clothing Accessories > Hair Accessories", ""),
    (r"\bf[äa]cher\b|\w*-f[äa]cher\b", "Apparel & Accessories > Clothing Accessories > Decorative Fans", ""),
    (r"\w*handschuh\w*|f[äa]ustling\w*", "Apparel & Accessories > Clothing Accessories > Gloves & Mittens", ""),
    (r"\w*sneaker\w*|\w*slipper\b|\w*schuhe?\b|\w*stiefel\w*|\w*sandale\w*|pantoffel\w*|\bpumps\b|loafer", "Apparel & Accessories > Shoes", ""),
    (r"\bg[üu]rtel\b|ledeg[üu]rtel|\w*g[üu]rtel\b(?!tasche)", "Apparel & Accessories > Clothing Accessories > Belts", ""),
    (r"^(?!.*(schale|teller|tasse|becher|vase)).*(\bm[üu]tze\w*|\w*m[üu]tze\b|beanie|\bhut\b|\w*hut\b|\bcap\b|baseballcap|schirmm[üu]tze|\bkappe\b)", "Apparel & Accessories > Clothing Accessories > Hats", ""),
    (r"ski-? und bergbrille|skibrille(?!.*party)|snowboardbrille", "Sporting Goods > Outdoor Recreation > Winter Sports & Activities > Skiing & Snowboarding > Ski & Snowboard Goggles", ""),
    (r"taucherbrille|schwimmbrille", "Sporting Goods > Outdoor Recreation > Boating & Water Sports > Swimming > Swim Goggles & Masks", ""),
    (r"brillen-?reinigung\w*|reinigungst[üu]cher f[üu]r brillen", "Health & Beauty > Personal Care > Vision Care > Eyewear Accessories > Eyewear Lens Cleaning Solutions", ""),
    (r"sonnenbrille\w*|sportbrille(?!.*kamera)", "Apparel & Accessories > Clothing Accessories > Sunglasses", ""),
    (r"lesebrille|blaulicht\w*-?brille|blaulichtfilter|anti-?reflex brille|\w*-brille\b(?!.*party)|\bbrille f[üu]r damen", "Health & Beauty > Personal Care > Vision Care > Eyeglasses", ""),
    (r"portemonnaie|geldb[öo]rse|m[üu]nzb[öo]rse|brieftasche|\bwallet\b|kartenetui", "Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips", ""),
    (r"rucksack\w*|backpack", "Luggage & Bags > Backpacks", ""),
    (r"umh[äa]ngetasche|schultertasche|handtasche|g[üu]rteltasche|bauchtasche|h[üu]fttasche|\bclutch\b|crossbody|\w*bag-stil|tragetasche|\btote\b", "Apparel & Accessories > Handbags, Wallets & Cases > Handbags", ""),
    (r"\w*kleid(er)?\b|\w*hosen?\b|\w*jacke\b|\w*mantel\b|\w*shirt\b|\w*shirts\b|pullover|\bpulli\b|hoodie|sweatshirt|\bbluse\w*|\w*hemd\b|\w*rock\b|jumpsuit|\w*shorts\b|leggings|\w*weste\b|cardigan|strickjacke|(?<!lap)(?<!desk)\btops?\b|tunika|mieder|korsett|\w*socken\b|pyjama|bikini|badeanzug|pareo\w*|\w*kleidung\b|\bbody\b|\w*anzug\b|poloshirt|polo-shirt",
     GROB, "mensch"),
    # Elektronik
    (r"zahn\w*b[üu]rste|zahnreinig\w*|zahnseide|munddusche", "Health & Beauty > Personal Care > Oral Care", ""),
    (r"reinigungs(pen|set|stift|kit)|reinigungsb[üu]rste", "Home & Garden > Household Supplies > Household Cleaning Supplies", ""),
    (r"mauspad|mousepad", "Electronics > Electronics Accessories > Computer Accessories > Mouse Pads", ""),
    (r"gaming-?maus|\bmaus\b|\bmouse\b", "Electronics > Electronics Accessories > Computer Components > Input Devices > Mice & Trackballs", ""),
    (r"tastatur\w*|keyboard", "Electronics > Electronics Accessories > Computer Components > Input Devices > Keyboards", ""),
    (r"(kopfh[öo]rer|headset)\w*[- ]?(st[äa]nder|halter\w*|h[üu]lle|etui)|(st[äa]nder|halterung|h[üu]lle|etui) f[üu]r .*(kopfh|headset|earbuds)", "Electronics > Audio > Audio Accessories > Headphone & Headset Accessories", ""),
    (r"^(?!.*(kabelrollen|kabelhalter|st[äa]nder|halter|lader|ladeger|charger|adapter|h[üu]lle)).*(kopfh[öo]rer\w*|kopfhoerer\w*|earbuds|headset|\bin-?ear\b)", "Electronics > Audio > Audio Components > Headphones & Headsets", ""),
    (r"lautsprecher\w*|\bspeaker\b|soundbar|subwoofer", "Electronics > Audio > Audio Components > Speakers", ""),
    (r"telefonh[üu]lle|handyh[üu]lle\w*|handy-?h[üu]lle|phone ?case|h[üu]lle f[üu]r (iphone|samsung|galaxy|handy)|handyschale", "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases", ""),
    (r"panzerglas|schutzfolie|displayschutz", "Electronics > Electronics Accessories > Electronics Films & Shields > Screen Protectors", ""),
    (r"ladeger[äa]t|ladestation|netzteil|powerbank|ladesteckdose|kabellos\w* lade\w*|wireless charger|magnethalter", "Electronics > Electronics Accessories > Power > Power Adapters & Chargers", ""),
    (r"handyhalter\w*|handy-?halterung|halter\w* f[üu]r (iphone|handy|smartphone)", "Electronics > Communications > Telephony > Mobile Phone Accessories", ""),
    (r"projektor\w*|beamer", "Electronics > Video > Projectors", ""),
    (r"^(?!.*(webcam|kamera|subwoofer|intercom)).*(mikrofon\w*|microphone)", "Electronics > Audio > Audio Components > Microphones", ""),
    (r"spielkonsole|game[- ]?konsole|\bkonsole\b|handheld[- ](konsole|spiel|game)", "Electronics > Video Game Consoles", ""),
    (r"^(?!.*(t[üu]rklingel|ohrenreiniger|blackhead|mitesser)).*(\w*kamera\b|dashcam|webcam)", "Cameras & Optics", ""),
    # Fahrzeug (nicht «Automatisch»)
    (r"^(?!.*(auto-?clicker|auto-?leveling)).*(\bauto-|\bautos\b|f[üu]r (das |ihr )?auto\b|\bkfz\b|lenkrad\w*|tagfahrlicht|autositz\w*|kofferraum|motorrad\w*)", "Vehicles & Parts > Vehicle Parts & Accessories", ""),
    # Haushalt & Wohnen
    (r"duft[öo]l\w*|[äa]therische\w* [öo]le?\b", "Home & Garden > Decor > Home Fragrances > Fragrance Oil", ""),
    (r"luftbefeuchter\w*", "Home & Garden > Household Appliances > Climate Control Appliances > Humidifiers", ""),
    (r"diffuser|diffusor|aroma[- ]?lampe", "Home & Garden > Decor > Home Fragrance Accessories", ""),
    (r"heizl[üu]fter|\w*heizer\b|heizger[äa]t|radiator", "Home & Garden > Household Appliances > Climate Control Appliances > Space Heaters", ""),
    (r"ventilator\w*|\bl[üu]fter\b", "Home & Garden > Household Appliances > Climate Control Appliances > Fans", ""),
    (r"\w*lampe\b|\w*leuchte\b|lichterkette\w*|nachtlicht\w*|led-?streifen|led-?leiste|\bstrahler\b", "Home & Garden > Lighting", ""),
    (r"feuerzeug\w*", "Hardware > Tools > Lighters & Matches", ""),
    (r"k[üu]chenarmatur|wasserhahn|\barmatur\b", "Hardware > Plumbing > Plumbing Fixtures > Faucets", ""),
    (r"\w*handt[üu]ch\w*|badetuch|strandtuch", "Home & Garden > Linens & Bedding > Towels", ""),
    (r"wc[- ]?papier|toilettenpapier", "Home & Garden > Household Supplies > Household Paper Products > Toilet Paper", ""),
    (r"luftmatratze\w*|schwimmring|poolfloat|luftmatte", "Home & Garden > Pool & Spa > Pool & Spa Accessories > Pool Floats & Loungers", ""),
    (r"schlafmatte|isomatte|campingmatte|camping-?matte", "Sporting Goods > Outdoor Recreation > Camping & Hiking > Sleeping Pads", ""),
    (r"sport-trinkflasche", "Home & Garden > Kitchen & Dining > Tableware > Drinkware", ""),
    (r"dehnungsband|trainingsgurt|widerstandsband\w*|fitness-?band|yoga-?matte|hantel\w*|springseil|trainingsband", "Sporting Goods > Exercise & Fitness", ""),
    (r"^(?!.*(spr[üu]h|sauce|[öo]l-|f[üu]r hunde|latex|blender|mixer|warmhalte))(.*(\w*tasse\b|\w*becher\b(?!-?mixer)|\w*flasche\b|karaffe))", "Home & Garden > Kitchen & Dining > Tableware > Drinkware", ""),
    (r"\w*mixer\b|\w*blender\b|sojamilch\w*|entsafter|standmixer|zerkleinerer|k[üu]chenmaschine|fleischwolf", "Home & Garden > Kitchen & Dining > Kitchen Appliances", ""),
    (r"kochl[öo]ffel\w*|\w*reibe\b|gem[üu]seschneider|gem[üu]sehacker|\w*hacker\b|gefl[üu]gelschere|k[üu]chenschere|\bshaker\b|schneebesen|sch[äa]ler|dosen[öo]ffner|gasherd-?z[üu]nder|pfannenwender|\bsieb\b|fischschuppen\w*|spr[üu]hflasche|[öo]lspr[üu]her",
     "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils", ""),
    (r"\w*schale(n)?\b|\w*sch[üu]ssel\b|\w*teller\b|keramikplatte", "Home & Garden > Kitchen & Dining > Tableware > Dinnerware", ""),
    (r"stiftehalter|dokumentenhalter|schreibtisch-?organizer|briefablage", "Office Supplies > Filing & Organization > Desk Organizers", ""),
    (r"notizblock|notizbuch|kalender", "Office Supplies > Filing & Organization > Calendars, Organizers & Planners", ""),
    (r"\bdecke\b|\w+-decke\b|kuscheldecke|wolldecke|fleecedecke|kn[üu]pfdecke", "Home & Garden > Linens & Bedding > Bedding > Blankets", ""),
    (r"pflanzenh[äa]nger|h[äa]nger f[üu]r pflanzen|blumentopf|pflanztopf|\w*[üu]bertopf", "Home & Garden > Lawn & Garden > Gardening > Pots & Planters", ""),
    # dritte Welle (Trockenlauf 29.09.: 315 offen) — spät eingereiht, fängt nur bisher Ungetroffenes
    (r"kunstblut|narben\w*|theaterschminke|latex fl[üu]ssig|fl[üu]ssiglatex", KOS + "Makeup > Costume & Stage Makeup", ""),
    (r"fliegerbrille|brille f[üu]r pilot|schutzbrille s\.?w\.?a\.?t|hosentr[äa]ger|zimmerm[äa]dchenset|gesichtsvisier", "Apparel & Accessories > Costumes & Accessories > Costume Accessories", ""),
    (r"tischbombe|glitter mix|discokugel|gl[üu]cksrad|g[äa]stebuch|g[äa]ste holzrahmen", "Arts & Entertainment > Party & Celebration > Party Supplies", ""),
    (r"horrorhand|kletternder weihnachtsmann|fledermaus", "Home & Garden > Decor > Seasonal & Holiday Decorations", ""),
    (r"center shock|fr[öo]schli|lolly|hochzeitsmandeln|\w*mandeln\b", "Food, Beverages & Tobacco > Food Items > Candy & Chocolate", ""),
    (r"shapewear|\w*-?shaper\b|formschneider|arm-shaping|bodysuit|yoga-?set|jogger\b|sakko|blazer|kardigan|oberteile?\b|sommeroben|trenchcoat|jeans\b|pajama|outfit\b|\w*hemden\b|rockedress|\bdress\b", GROB, "mensch"),
    (r"\w*boots\b|pantinen|clogs|winterschl[üu]pfer", "Apparel & Accessories > Shoes", ""),
    (r"st[üu]tzgurt|w[äa]rmegurt|haltungs-?korrekt\w*|r[üu]ckenstabilisator|\w*bandagen?\b|kn[öo]chelst[üu]tze|handgelenkst[üu]tze|wrist wraps|zehenspreizer|halsst[üu]tz\w*|r[üu]ckenstrecker", "Health & Beauty > Health Care > Supports & Braces", ""),
    (r"schn[üu]rsenkel", "Apparel & Accessories > Shoe Accessories > Shoelaces", ""),
    (r"ohrenreiniger|(?<!r)ohrreiniger", PC + "Ear Care", ""),
    (r"nasenreiniger|nasensauger", "Health & Beauty > Health Care", ""),
    (r"zahnaufhell\w*|zahnpasta(?!-dispenser)", PC + "Oral Care", ""),
    (r"bartpflege\w*|bart[öo]l", PC + "Shaving & Grooming", ""),
    (r"\bshaver\b", PC + "Shaving & Grooming > Electric Razors", ""),
    (r"lippen[öo]l|lip plumper|lippenglanz\w*", KOS + "Skin Care > Lip Balms & Treatments", ""),
    (r"augencreme|augenpflege|k[öo]rper[öo]l|vein cream|klebepflege|hautrejuvenation|blaues licht f[üu]r|sch[öo]nheitspflaster|sch[öo]nheitsmaske|gesichtsstraffer|halsheber|eye beauty", KOS + "Skin Care", ""),
    (r"gl[äa]ttb[üu]rste|knotenl[öo]ser|haarfluid|haarband", PC + "Hair Care", ""),
    (r"uhrenschrank|uhrenbox|schmuckbox|schmuckdisplay|ringschatulle|schmuckk[äa]stchen|anstecknadel-halter", "Health & Beauty > Jewelry Cleaning & Care > Jewelry Holders", ""),
    (r"\buhren\b", "Apparel & Accessories > Jewelry > Watches", ""),
    (r"^(?!.*maske).*(ohrclip|ohrhaken)", "Apparel & Accessories > Jewelry > Earrings", ""),
    (r"\w*armb[äa]nder\b", "Apparel & Accessories > Jewelry > Bracelets", ""),
    (r"(?=.*(zirkon|verstellbar|legierung|silber|gold|925|edelstahl))\w+ring\b", "Apparel & Accessories > Jewelry > Rings", ""),
    (r"taillenkette|bauchkette|k[öo]rperkette", "Apparel & Accessories > Jewelry", ""),
    (r"^(?!.*(schl[üu]sselanh|hawaiikette|fahnenkette)).*(\w*anh[äa]nger\b|\w*anhanger\b|collier|liebeskette|\w*kette\b)", "Apparel & Accessories > Jewelry > Necklaces", ""),
    (r"(ohrh[öo]rer|airpods)[- ]?(etui|h[üu]lle)|schutzh[üu]lle f[üu]r airpods", "Electronics > Audio > Audio Accessories > Headphone & Headset Accessories", ""),
    (r"ohrh[öo]rer|earphone", "Electronics > Audio > Audio Components > Headphones & Headsets", ""),
    (r"schutzglas|glas-schutz|anti-schiel", "Electronics > Electronics Accessories > Electronics Films & Shields > Screen Protectors", ""),
    (r"(magsafe|smartphone|handy|telefon)\w*[- ]?h[üu]lle|^(?=.*(handy|iphone|smartphone|telefon|samsung|xiaomi|galaxy)).*(schutzh[üu]lle|\bcase\b)", "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases", ""),
    (r"(tablet|handy|smartphone|r[üu]ckspiegel-handy)[- ]?halt\w*|hud-halterung|halterung f[üu]r .*handy|luftventil-halter|faltbarer halter", "Electronics > Communications > Telephony > Mobile Phone Accessories", ""),
    (r"^(?=.*(game|gaming|ps\d|xbox|switch|nintendo|konsole)).*controller|gamepad", "Electronics > Video Game Console Accessories", ""),
    (r"mausarmlehne|\w*maus\b", "Electronics > Electronics Accessories > Computer Accessories", ""),
    (r"t[üu]rklingel", "Home & Garden > Business & Home Security", ""),
    (r"\w*drucker\b", "Electronics > Print, Copy, Scan & Fax > Printers, Copiers & Fax Machines", ""),
    (r"ringlicht", "Cameras & Optics > Photography > Lighting & Studio", ""),
    (r"objektfinder|verlustobjekt", "Electronics", ""),
    (r"neck-?fan", "Home & Garden > Household Appliances > Climate Control Appliances > Fans", ""),
    (r"\w*befeuchter\b|nebel-?feuchter", "Home & Garden > Household Appliances > Climate Control Appliances > Humidifiers", ""),
    (r"luftreiniger", "Home & Garden > Household Appliances > Climate Control Appliances > Air Purifiers", ""),
    (r"staubsauger", "Home & Garden > Household Appliances > Vacuums", ""),
    (r"dampfb[üu]gel\w*", "Home & Garden > Household Appliances > Laundry Appliances > Garment Steamers", ""),
    (r"waschmaschine", "Home & Garden > Household Appliances > Laundry Appliances > Washing Machines", ""),
    (r"\bmopp?\b|mini-mopp?|bodenreiniger|saugglas-?b\w*|ultraschall-reinigung\w*|schaumreiniger", "Home & Garden > Household Supplies > Household Cleaning Supplies", ""),
    (r"fusselroller", "Home & Garden > Household Supplies > Laundry Supplies > Lint Rollers", ""),
    (r"duschkopf", "Hardware > Plumbing > Plumbing Fixture Hardware & Parts > Shower Parts > Shower Heads", ""),
    (r"k[üu]chenhahn|ablaufventil", "Hardware > Plumbing", ""),
    (r"seifengrinder|zahnpasta-dispenser|badewannenauflage", "Home & Garden > Bathroom Accessories", ""),
    (r"wasserspender|wasserdispenser", "Hardware > Plumbing > Water Dispensing & Filtration > Water Dispensers", ""),
    (r"kinder-?moskitonetz|t[üu]rschloss f[üu]r kinder|kindersitz", "Baby & Toddler > Baby Safety", ""),
    (r"t[üu]rschliesser|t[üu]rstopper|ratchet\w*|schraub\w*satz", "Hardware", ""),
    (r"messschieber", "Hardware > Tools > Measuring Tools & Sensors", ""),
    (r"luftpolsterfolie", "Office Supplies > Shipping Supplies > Packing Materials", ""),
    (r"bleistiftspitzer", "Office Supplies > Office Instruments > Pencil Sharpeners", ""),
    (r"schreibhilfe|nachrichtentafel", "Office Supplies", ""),
    (r"h[äa]ngematte", "Home & Garden > Lawn & Garden > Outdoor Living > Hammocks", ""),
    (r"regentonne", "Home & Garden > Lawn & Garden > Gardening > Rain Barrels", ""),
    (r"schlauchd[üu]se", "Home & Garden > Lawn & Garden > Watering & Irrigation > Garden Hose Spray Nozzles", ""),
    (r"insektenschutz|moskitonetz", "Home & Garden > Household Supplies > Pest Control", ""),
    (r"fussmatte|t[üu]rmatte", "Home & Garden > Decor > Door Mats", ""),
    (r"tapestry|wandteppich", "Home & Garden > Decor > Artwork > Decorative Tapestries", ""),
    (r"(strick|woll|fleece|kuschel|bett|tages|sofa|pl[üu]sch)decke\b", "Home & Garden > Linens & Bedding > Bedding > Blankets", ""),
    (r"ewige rose|kunstblume\w*|getrocknete blumen", "Home & Garden > Decor > Artificial Flora", ""),
    (r"\w*kerzen\w*|kerzenleuchte\w*", "Home & Garden > Decor > Home Fragrances > Candles", ""),
    (r"\w*figur\b|statue|skulptur|deko-set|kunstharz|bronze drache|weltkarte|levitation|\badler\b", "Home & Garden > Decor", ""),
    (r"ukulele|gitarre|trommel\b", "Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments", ""),
    (r"seifenblasen", "Toys & Games > Toys > Activity Toys", ""),
    (r"\w*spielzeug\w*|spielauto|rennwagen|fidget|\w*spiel\b", "Toys & Games > Toys", ""),
    (r"schürze|sch[üu]rze\b", KH + "Kitchen Tools & Utensils > Aprons", ""),
    (r"m[öo]rser", KH + "Kitchen Tools & Utensils > Mortars & Pestles", ""),
    (r"nudelholz|teigroller", KH + "Kitchen Tools & Utensils > Rolling Pins", ""),
    (r"kaffeem[üu]hle", KH + "Kitchen Appliance Accessories > Coffee Maker & Espresso Machine Accessories > Coffee Grinders", ""),
    (r"k[üu]hlschrank\b|popcorn|waffel\w*|sandwich|air fryer|heissluftfritteuse|milchshaker|k[üu]chenmix|backautomat|gaskocher|grill\b|mixer|blender\w*|saftzerst[äa]uber|flaschenw[äa]rmer|becherw[äa]rmer|dampfgarer|pfefferm[üu]hle|allesschneider", KH + "Kitchen Appliances", ""),
    (r"frischhaltebox|gew[üu]rzgl[äa]s\w*|reisetank|vorratsdose", KH + "Food Storage", ""),
    (r"dinnerplatte|\bbowl\b", KH + "Tableware > Dinnerware", ""),
    (r"\bcup\b|thermobe[ck]+er|champagnerglas\w*|gl[äa]ser-?set|kaffeekanne|teekessel|tee-set|wasserkessel|weindekanter|dekanter|strohhalm", KH + "Tableware > Drinkware", ""),
    (r"teefilter|tee-ei|messl[öo]ffel|k[üu]chenrollenhalter|messerhalter|trichter|burgerform|backform|kerzenform|teigmatte|brot-?schneid\w*|\w*brecher\b|abtropfmatte|k[üu]chenmatte|k[üu]chenutensil\w*|gem[üu]sehobel|gem[üu]sekutter|gemuese|ananas-?schneider|knoblauchpresse|k[üu]chenwaage|wein[öo]ffner|salatdrainer|w[äa]rmeleitplatte|kaffeekapsel\w*|champagner-pong", KH + "Kitchen Tools & Utensils", ""),
    (r"\w*licht\b|\w*leuchten\b|lichter\b", "Home & Garden > Lighting", ""),
    # vierte Welle (Rest «Electronics», 29.09.: 1'373) — häufigste Warenwörter im Rest
    (r"power ?bank", "Electronics > Electronics Accessories > Power > Power Adapters & Chargers", ""),
    (r"^(?!.*(ladeger|lader|staubsauger|drohne|quadrocopter|controller|\bmit\b.*akku|akku-\w*(schneider|schrauber|s[äa]ge|h[üu]lle)|megaphon|pumpe|router|kopfband|marktstand|klatsche|toy gun|reifenf)).*(\bakkus?\b|\w+-akkus?\b|ersatzakku\w*|li-?ion)", "Electronics > Electronics Accessories > Power > Batteries", ""),
    (r"saugroboter|kehrroboter|reinigungsroboter|wischroboter|fensterputzroboter", "Home & Garden > Household Appliances > Vacuums", ""),
    (r"roboterhund|roboter-?spielzeug|malroboter|programmierbar\w* roboter", "Toys & Games > Toys > Robotic Toys", ""),
    (r"festplatten-?geh[äa]use|ssd-?geh[äa]use|m\.?2 ssd geh[äa]use|festplattenbox", "Electronics > Electronics Accessories > Computer Components > Storage Devices > Hard Drive Accessories > Hard Drive Enclosures & Mounts", ""),
    (r"kartenleser", "Electronics > Electronics Accessories > Computer Components > Input Devices > Memory Card Readers", ""),
    (r"tv[- ]?box|android[- ]?box|set-top[- ]?box|streaming-?stick", "Electronics > Video > Video Players & Recorders > Streaming & Home Media Players", ""),
    (r"^(?!.*\bmit\b.*fernbedienung)(?!.*(drohne|roboter|jalousie|vorhang|stativ|strobe)).*\w*fernbedienung\w*", "Electronics > Electronics Accessories > Remote Controls", ""),
    (r"bewegungssensor|magnetsensor|t[üu]r- und fenster", "Home & Garden > Business & Home Security > Motion Sensors", ""),
    (r"haarschneider|haartrimmer|bartschneider", PC + "Shaving & Grooming > Hair Clippers & Trimmers", ""),
    (r"mi band|f[üu]r (xiaomi|huawei|amazfit) .*band|universal armband", "Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands", ""),
    (r"\w*fackeln?\b", "Home & Garden > Lighting > Tiki Torches & Oil Lamps", ""),
    (r"duffel\w*", "Luggage & Bags > Duffel Bags", ""),
    (r"handgep[äa]ck|\w*koffer\b|trolley", "Luggage & Bags", ""),
    (r"\bstuhl\b|\w*stuhl\b", "Furniture > Chairs", ""),
    (r"\w*tasche\b|\w*taschen\b|\w*bag\b|\w*beutel\b", "Luggage & Bags", ""),
    (r"badespielzeug", "Toys & Games > Toys > Bath Toys", ""),
    (r"\w*bausteine\b|baukl[öo]tze", "Toys & Games > Toys > Building Toys", ""),
    (r"springbrunnen|tischbrunnen|zimmerbrunnen", "Home & Garden > Decor > Fountains & Ponds", ""),
    (r"leinwand", "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Textiles > Crafting Canvas > Painting Canvas", ""),
    (r"wandkunst|wandbild|led-bild\b|\bbild\b|poster|kunstdruck", "Home & Garden > Decor > Artwork", ""),
    (r"dekokissen|zierkissen|kissenbezug|sofakissen|knoten kissen", "Home & Garden > Decor > Throw Pillows", ""),
    (r"haribo|trolli|bonbon\w*|gummib[äa]r\w*|schokolade\w*|lutscher|kaugummi", "Food, Beverages & Tobacco > Food Items > Candy & Chocolate", ""),
    (r"zitruspresse|pizza-?schaufel|grillkorb|grill-?thermometer|thermometer f[üu]r grill|k[üu]chenhelfer\w*|weinbel[üu]fter|eisw[üu]rfel\w*|getreidespender|fingerschutz|abflusskorb", "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils", ""),
    (r"tumbler", "Home & Garden > Kitchen & Dining > Tableware > Drinkware", ""),
    (r"kuchenplatte|\bdish\b", "Home & Garden > Kitchen & Dining > Tableware > Dinnerware", ""),
    (r"abflussreiniger|mattenreiniger|staubbl[äa]ser|bildschirmreiniger|b[üu]rsten-set", "Home & Garden > Household Supplies > Household Cleaning Supplies", ""),
    (r"reiseadapter|\badapter\b", "Electronics > Electronics Accessories > Power > Power Adapters & Chargers", ""),
    (r"funkger[äa]t|walkie", "Electronics > Communications > Communication Radios > Two-Way Radios", ""),
    (r"gimbal|stativ\b|selfie-?stick", "Cameras & Optics > Camera & Optic Accessories > Camera Parts & Accessories > Camera Stabilizers & Supports", ""),
    (r"f[üu]ller\b|kugelschreiber|\bstifte?\b", "Office Supplies > Office Instruments > Writing & Drawing Instruments > Pens & Pencils", ""),
    (r"fotohintergrund", "Cameras & Optics > Photography > Lighting & Studio > Studio Backgrounds", ""),
    (r"lampion\w*|hawaiikette|kugeln im netz", "Arts & Entertainment > Party & Celebration > Party Supplies", ""),
    (r"w[äa]schesack|w[äa]schekorb|w[äa]schebeutel", "Home & Garden > Household Supplies > Laundry Supplies > Laundry Baskets", ""),
    (r"\bgolf\w*", "Sporting Goods > Outdoor Recreation > Golf", ""),
    (r"\w*trainer\b|trainingsger[äa]t|gewichthebergurt|boxsack|bauchmuskel\w*|yoga[- ]?gurt|\w*stretch\w*|wandkletter\w*|fitness\w*", "Sporting Goods > Exercise & Fitness", ""),
    (r"m[öo]belheber", "Hardware > Tools", ""),
    (r"\w*schmuck\b", "Apparel & Accessories > Jewelry", ""),
    (r"animatronic|spinnennetz|halloween|\bskelett\w*|\w*skelett\b|totenkopf|grabstein|dekostoff horror|\bgeist\b|\bhexe\b", "Home & Garden > Decor > Seasonal & Holiday Decorations", ""),
    (r"^(?!.*(tv|android|musik|sound|lautsprecher|bluetooth|halloween|totenkopf|geschenkset)).*(aufbewahrung\w*|organizer|\w*truhen?\b|\w*box\b|\w*k[öo]rbe?\b|\w*kiste\b|beh[äa]lter|\w*eimer\b)", "Home & Garden > Household Supplies > Storage & Organization", ""),
    (r"mp3-?player|musikplayer", "Electronics > Audio > Audio Players & Recorders", ""),
]
_L = [(re.compile(m, re.I), z, b) for m, z, b in LEER_REGELN]


def ziel_leer(titel, tags=(), typ=""):
    """Google-Pfad für ein Kanal-Produkt ohne Wert — (pfad, quelle) oder (None, None)."""
    t = titel or ""
    if "bruder" in {x.lower() for x in tags}:
        return "Toys & Games > Toys", "tags"              # Bruder-Modelle (Traktor, Kettendozer, bworld-Figuren)
    for rx, z, b in _L:
        if not rx.search(t):
            continue
        if b == "tier" and MENSCH.search(t):
            continue                                   # «Katzen-Slipper für Damen» = Schuh
        if z == GROB:
            if AUSSEN.search(t):
                return None, None                      # Kinder-/Kostümkleidung: eigene Zweige, nicht raten
            return (ziel(t) or GROB), "titel"
        return z, "titel"
    try:
        from google_kategorie import kategorie        # gepflegte Tag-/Warengruppen-Logik (leer schlägt falsch)
        z = kategorie(t, tags, typ)
    except Exception as e:
        print(f"  google_kategorie.kategorie nicht nutzbar: {type(e).__name__}: {e}", file=sys.stderr)
        z = None
    if z == GROB:
        z = ziel(t) or GROB
    return (z, "tags") if z else (None, None)


def ziel(titel):
    if AUSSEN.search(titel or ""):
        return None
    for rx, z in _R:
        if rx.search(titel or ""):
            return z
    return None


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    grund = ""
    for a in range(8):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=90))
            if d.get("data") is not None and not d.get("errors"):
                # Eimer-Etikette (01.10.2026): 3 s bei < 400 reichten nicht — der Lauf über 3'000 Feinkategorien hielt den Eimer
                # bei 23/2'000 und bremste alle anderen Wächter. Jetzt die gemeinsame Regel: unter BODEN warten bis ZIEL.
                from eimer_etikette import nachlauf
                nachlauf(d)
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:160]
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:160]
        time.sleep(3 + 3 * a)
    print(f"gql: letzter Grund: {grund}", file=sys.stderr)
    raise RuntimeError(f"Shopify antwortet nicht ({grund}) — Lauf abgebrochen, nichts quittiert")


def taxonomie():
    if not os.path.exists(TAXO) or os.path.getsize(TAXO) < 100000:
        urllib.request.urlretrieve("https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt", TAXO)
    return {l.split(" - ", 1)[1].strip() for l in open(TAXO, encoding="utf-8") if " - " in l}


def export():
    pfad = os.environ.get("EXPORT")
    if pfad and os.path.exists(pfad):
        return [json.loads(l) for l in open(pfad)]
    inner = ('{ products(query:"status:active") { edges { node { id handle title productType tags '
             'g:publishedOnPublication(publicationId:"%s") '
             'metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } } } } }' % GOOGLE_KANAL)
    b = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}', {"q": inner})["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise RuntimeError("Bulk-Export: " + b["userErrors"][0]["message"])
    bid = b["bulkOperation"]["id"]
    for _ in range(120):
        n = gql('query($i:ID!){node(id:$i){... on BulkOperation{status url errorCode}}}', {"i": bid})["node"]
        if n["status"] in ("COMPLETED", "FAILED", "CANCELED"):
            break
        time.sleep(10)
    if n["status"] != "COMPLETED" or not n["url"]:
        raise RuntimeError(f"Bulk-Export {n['status']} {n.get('errorCode')}")
    ziel_ = "/tmp/gkat_fein_export.jsonl"
    urllib.request.urlretrieve(n["url"], ziel_)
    return [json.loads(l) for l in open(ziel_)]


def schreiben(plan, alt, f):
    """metafieldsSet in 25er-Blöcken, Rücklesen aus der Antwort; Ledger-Zeile nur bei bestätigtem Wert."""
    ok = fehl = 0
    for i in range(0, len(plan), 25):
        teil = plan[i:i + 25]
        m = [{"ownerId": pid, "namespace": "mm-google-shopping", "key": "google_product_category",
              "type": "single_line_text_field", "value": z} for pid, _, _, z in teil]
        r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} value} userErrors{message}}}',
                {"m": m})["metafieldsSet"]
        if r["userErrors"]:
            fehl += len(teil)
            print("  Fehler:", r["userErrors"][0]["message"])
            continue
        gesetzt = {(x["owner"] or {}).get("id"): x["value"] for x in r["metafields"]}
        for pid, h, _, z in teil:
            if gesetzt.get(pid) == z:
                ok += 1
                f.write(f"{h}\t{alt}\t{z}\n")
            else:
                fehl += 1
    return ok, fehl


def main():
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: Google-Kategorie fein + leer · {'SCHARF' if SCHARF else 'TROCKEN'}")
    gueltig = taxonomie()
    for z in [z for _, z in REGELN] + [z for _, z, _ in LEER_REGELN]:
        if z not in gueltig:
            raise RuntimeError(f"Google-Pfad unbekannt: {z} — nichts geschrieben")
    alle = export()
    # (1) grob «Clothing» → Unterkategorie
    rows = [r for r in alle if ((r.get("metafield") or {}).get("value") or "") == GROB]
    plan, offen = [], []
    for r in rows:
        # Handschuh, Mütze, Gürtel, Schuh, Brille zuerst: eigener Zweig ausserhalb «Clothing» — sonst machte
        # «Fleece-gefütterte Handschuhe» die Oberteil-Regel (fleece) zum Oberteil. Tier/Baby/Spielzeug-Treffer
        # zählen hier nicht (GROB_ERLAUBT): wer schon «Clothing» trägt, ist Mode.
        z2, q = ziel_leer(r.get("title", ""), (), "")
        z = z2 if (q == "titel" and z2 and z2 != GROB and z2.startswith(GROB_ERLAUBT)) else ziel(r.get("title", ""))
        (plan if z else offen).append((r["id"], r.get("handle", ""), r.get("title", ""), z))
    zaehl = collections.Counter(z.replace(C, "") for *_, z in plan)
    print(f"grob «Clothing»: {len(rows)} · einordenbar {len(plan)} · bleibt grob {len(offen)}")
    for k, v in zaehl.most_common():
        print(f"  {v:5d}  {k}")
    # (2) leer im Google-Kanal → Pfad aus dem Titel (sonst gepflegte Tag-Logik, sonst leer lassen)
    leer = [r for r in alle if r.get("g") and not ((r.get("metafield") or {}).get("value") or "").strip()]
    lplan, loffen = [], []
    quelle = collections.Counter()
    for r in leer:
        z, q = ziel_leer(r.get("title", ""), r.get("tags") or [], r.get("productType") or "")
        if z and z in gueltig:
            lplan.append((r["id"], r.get("handle", ""), r.get("title", ""), z))
            quelle[q] += 1
        else:
            loffen.append(r.get("title", ""))
    lzaehl = collections.Counter(z for *_, z in lplan)
    print(f"leer im Google-Kanal: {len(leer)} · einordenbar {len(lplan)} ({dict(quelle)}) · bleibt leer {len(loffen)}")
    for k, v in lzaehl.most_common(25):
        print(f"  {v:5d}  {k}")
    # (3) grob «Electronics» (29.09.: 4'132) → Unterzweig, nur in geprüfte Zielzweige (ELEK_ERLAUBT). Vieles unter
    #     «Electronics» ist gar keine Elektronik: Klemmbausteine, Drohnen, Kameras, Wecker, Aroma-Diffusoren.
    erows = [r for r in alle if ((r.get("metafield") or {}).get("value") or "") == ELEK]
    eplan, eoffen = [], 0
    for r in erows:
        z, q = ziel_leer(r.get("title", ""), (), "")
        if z and q == "titel" and z != ELEK and z.startswith(ELEK_ERLAUBT) and z in gueltig:
            eplan.append((r["id"], r.get("handle", ""), r.get("title", ""), z))
        else:
            eoffen += 1
    ezaehl = collections.Counter(z for *_, z in eplan)
    print(f"grob «Electronics»: {len(erows)} · einordenbar {len(eplan)} · bleibt grob {eoffen}")
    for k, v in ezaehl.most_common(15):
        print(f"  {v:5d}  {k}")
    # (4) 01.10.2026 Betreiber «Feinkategorien überall»: JEDE grobe Kategorie (≤ 2 Ebenen, hat Unterzweige) → feiner, aber NUR in
    #     einen UNTERZWEIG des bisherigen Werts (Präfix-Regel). Damit kann die Titelregel nie über Kreuz einordnen
    #     («Pet Supplies» → «Pet Supplies > Dog Supplies > Dog Toys» ja, → «Toys & Games» nie). Gemessen 01.10.: 20'141 Kanal-
    #     Produkte mit ≤ 2 Ebenen; Endknoten (Shoes, Backpacks) haben keine Unterzweige und bleiben.
    hat_kinder = {z.rsplit(" > ", 1)[0] for z in gueltig if " > " in z}
    # Zweig-Tabellen (01.10.): gelten NUR, wenn der bisherige Wert genau dieser Oberzweig ist — ein «Hunde-Motiv-Shirt» unter
    # «Clothing» wird so nie Hundebedarf. Reihenfolge = Vorrang: erst die Funktion (Leine, Napf), dann die Tierart.
    PS, EF, TO = "Animals & Pet Supplies > Pet Supplies", "Sporting Goods > Exercise & Fitness", "Hardware > Tools"
    ZWEIG = {
        # ⚠️ Trockenlauf 01.10.: «leine» steckt in «k-LEINE» (105 Fehltreffer: «Spielzeug für kleine Hunde» als Leine) → (?<!k);
        #    Yoga-KLEIDUNG («Sport-Yoga-Set mit Shorts», «Jumpsuit für Yoga») ist kein Yoga-Gerät → ausgenommen.
        PS: [(r"(?<!k)leine\b|(?<!k)leinen\b", PS + " > Pet Leashes"), (r"halsband|geschirr\b|brustgeschirr", PS + " > Pet Collars & Harnesses"),
             (r"napf|n[äa]pfe|futterspender|futterautomat|trinkbrunnen|wasserspender|futterstation|futterschale", PS + " > Pet Bowls, Feeders & Waterers"),
             (r"transportbox|transporttasche|tragetasche|rucksack|hundebox|katzenbox", PS + " > Pet Carriers & Crates"),
             (r"b[üu]rste|kamm\b|krallen|fellpflege|schermaschine|trimmer|pflegehandschuh", PS + " > Pet Grooming Supplies"),
             (r"\b(?:hund\w*|welpe\w*)", PS + " > Dog Supplies"), (r"\b(?:katze\w*|kater\w*|k[äa]tzchen)", PS + " > Cat Supplies"),
             (r"\bv[öo]gel\w*|vogel\w*|papagei|wellensittich", PS + " > Bird Supplies"), (r"aquarium|\bfisch\w*", PS + " > Fish Supplies")],
        EF: [(r"^(?!.*(?:shorts|\bbra\b|\bbh\b|jumpsuit|leggings|\bhose|shirt|\btop\b|set mit|anzug|kleid|zweiteiler|shrug|outfit|bekleidung|crop|weste|jacke|socken)).*(?:yoga|pilates)", EF + " > Yoga & Pilates"), (r"hantel|kettlebell|gewichtsscheibe|langhantel", EF + " > Weight Lifting"),
             (r"widerstandsb[äa]nd\w*|fitnessb[äa]nd\w*|gymnastikb[äa]nd\w*|resistance band|expander", EF + " > Exercise Bands"),
             (r"faszienrolle|schaumstoffrolle|foam ?roller", EF + " > Foam Rollers"), (r"gymnastikball|fitnessball|sitzball|pezziball", EF + " > Exercise Balls"),
             (r"bauchroller|ab[- ]?roller|bauchtrainer rad", EF + " > Ab Wheels & Rollers"), (r"klimmzug|liegest[üu]tz|push[- ]?up", EF + " > Push Up & Pull Up Bars"),
             (r"handtrainer|fingertrainer|griffkraft|unterarmtrainer", EF + " > Hand Exercisers"), (r"springseil|sprungseil|seilspring", EF + " > Cardio")],
        TO: [(r"taschenlampe|stirnlampe|arbeitsleuchte|kopflampe", TO + " > Flashlights & Headlamps"), (r"bohrmaschine|akkubohrer|bohrschrauber", TO + " > Drills"),
             (r"\bhammer\b", TO + " > Hammers"), (r"massband|maßband|wasserwaage|messschieber|zollstock|laser-?entfernung|entfernungsmesser", TO + " > Measuring Tools & Sensors"),
             (r"feuerzeug|stabfeuerzeug", TO + " > Lighters & Matches"), (r"\bleiter\b|trittleiter|klappleiter", TO + " > Ladders & Scaffolding"),
             (r"hei(?:ss|ß)luftf[öo]hn|hei(?:ss|ß)luftpistole", TO + " > Heat Guns"), (r"schraubendreher|schraubenzieher", TO + " > Screwdrivers"),
             (r"\bzange\b|kombizange|spitzzange|seitenschneider", TO + " > Pliers"), (r"winkelschleifer|schleifmaschine", TO + " > Grinders"),
             (r"ringschl[üu]ssel|gabelschl[üu]ssel|steckschl[üu]ssel|drehmomentschl[üu]ssel|ratschenschl[üu]ssel|rohrzange", TO + " > Wrenches"),
             (r"werkzeugset|werkzeug-set|werkzeugkoffer|werkzeugkasten", TO + " > Tool Sets"), (r"l[öo]tkolben|l[öo]tstation", TO + " > Soldering Irons"),
             (r"fugenpistole|kartuschenpistole|silikonpistole", TO + " > Caulking Tools"), (r"^(?!.*(?:sch[äa]rf|s[äa]gekette|sechskant)).*(?:\bs[äa]ge\b|hands[äa]ge|stichs[äa]ge|ketten?s[äa]ge|b[üu]gels[äa]ge)", TO + " > Saws")],
    }
    # 01.10.2026 (zweite Welle, Betreiber «anpassen und alles verbessern»): die nächstgrössten groben Zweige nach Shoes/Backpacks
    # (Endknoten): Decor 1'571, Kitchen & Dining 981, Vehicle Parts 449, Jewelry 227, Lighting 209, Toys 368, Arts 252.
    # Deutsche Komposita: Warenwort am Ende → «\w*wort» statt «\bwort\b»; Vorrang = spezifisch vor allgemein.
    D, K, V, J, L, T = ("Home & Garden > Decor", "Home & Garden > Kitchen & Dining", "Vehicles & Parts > Vehicle Parts & Accessories",
                        "Apparel & Accessories > Jewelry", "Home & Garden > Lighting", "Toys & Games > Toys")
    VD, KT, KA = V + " > Vehicle Maintenance, Care & Decor", K + " > Kitchen Tools & Utensils", K + " > Kitchen Appliances"
    ZWEIG[D] = [(r"sitzkissen|stuhlkissen|sitzauflage|sitzpolster|stuhlpolster|bankauflage|tatami|bodenkissen", D + " > Chair & Sofa Cushions"),
                (r"(?:sofa|couch|stuhl|sessel|armlehnen|r[üu]ckenlehnen)\w*[- ]?(?:bezug|bez[üu]ge|[üu]berzug|[üu]berwurf|husse)|\bhusse|sofa-?schutz", D + " > Slipcovers"),
                (r"^(?!.*(?:nacken|schlaf|still|reise|seitenschl|bauchschl|lagerung|knie|orthop|lenden|kopfkissen))(?:.*(?:zier|deko|sofa|couch|plüsch|pl[üu]sch)[- ]?kissen|.*kissenbez|.*kissenh[üu]lle)", D + " > Throw Pillows"),
                (r"fu(?:ss|ß)matte|t[üu]rmatte|schmutzfangmatte|fu(?:ss|ß)abtreter", D + " > Door Mats"),
                (r"wandteppich|tapisserie", D + " > Artwork > Decorative Tapestries"), (r"^(?!.*(?:reinig|kehr|klebeband|shampoo|kn[üu]pf|set f[üu]r anf)).*teppich|\bl[äa]ufer\b", D + " > Rugs"),
                (r"insektenschutz|fliegengitter|m[üu]ckenschutz|m[üu]ckennetz", D + " > Window Treatments > Window Screens"), (r"raffhalter|gardinenstange|vorhangstange|vorhangschiene", D + " > Window Treatment Accessories"), (r"^(?!.*dusch).*(?:vorhang|vorh[äa]nge|gardine|verdunklungsvorhang)", D + " > Window Treatments > Curtains & Drapes"),
                (r"^(?!.*kissen).*(?:\brollo\b|jalousie|plissee)", D + " > Window Treatments > Window Blinds & Shades"), (r"fensterfolie|sichtschutzfolie", D + " > Window Treatments > Window Films"),
                (r"\bvase\b|\bvasen\b|\w+vase\b", D + " > Vases"),
                (r"kunstblume|kunstpflanze|k[üu]nstliche\w* (?:blume|pflanze|rose|orchidee|eukalyptus|baum|sukkulente|olivenbaum)", D + " > Artificial Flora"),
                (r"trockenblume|getrocknete\w* blume|pampasgras", D + " > Dried Flowers"),
                (r"kerzenhalter|kerzenst[äa]nder|teelichthalter|windlicht", D + " > Home Fragrance Accessories > Candle Holders"),
                (r"led[- ]?kerze|flammenlose\w* kerze", D + " > Flameless Candles"),
                (r"duftkerze|\bkerzen?\b|\w+kerzen?\b", D + " > Home Fragrances > Candles"),
                (r"r[äa]ucherst[äa]bchen|weihrauch", D + " > Home Fragrances > Incense"), (r"duft[öo]l|aroma[öo]l", D + " > Home Fragrances > Fragrance Oil"),
                (r"raumduft|lufterfrischer|duftst[äa]bchen|diffusor-?st[äa]bchen", D + " > Home Fragrances > Air Fresheners"),
                (r"bilderrahmen|fotorahmen|\w*rahmen f[üu]r (?:fotos|bilder)", D + " > Picture Frames"),
                (r"wanduhr", D + " > Clocks > Wall Clocks"), (r"wecker", D + " > Clocks > Alarm Clocks"), (r"tischuhr|kaminuhr", D + " > Clocks > Desk & Shelf Clocks"),
                (r"standuhr", D + " > Clocks > Floor & Grandfather Clocks"), (r"sanduhr", D + " > Hourglasses"),
                (r"wandteppich|tapisserie", D + " > Artwork > Decorative Tapestries"),
                (r"poster|leinwand|wandbild|wandkunst|gem[äa]lde|kunstdruck", D + " > Artwork > Posters, Prints, & Visual Artwork"),
                (r"wandtattoo|wandaufkleber|wandsticker", D + " > Home Decor Decals"),
                (r"(?:garten|rasen)\w*[- ]?(?:figur|statue|skulptur|deko)|gartenstecker", D + " > Lawn Ornaments & Garden Sculptures"),
                (r"adventskranz|t[üu]rkranz|\bkranz\b|girlande", D + " > Wreaths & Garlands"),
                (r"^(?!.*(?:kissen|box|aufbewahrung|pl[üu]sch)).*(?:\w*figur\b|\w*figuren\b|statue|skulptur|b[üu]ste\b)", D + " > Figurines"),
                (r"weihnacht|halloween|ostern|oster\w+|advent|christbaum|tannenbaum", D + " > Seasonal & Holiday Decorations"),
                (r"windspiel|klangspiel", D + " > Wind Chimes"), (r"traumf[äa]nger", D + " > Dreamcatchers"), (r"schneekugel", D + " > Snow Globes"),
                (r"spieluhr|musikdose", D + " > Music Boxes"), (r"spardose|sparschwein", D + " > Piggy Banks & Money Jars"),
                (r"sonnenf[äa]nger|suncatcher", D + " > Suncatchers"), (r"buchst[üu]tze", D + " > Bookends"),
                (r"garderobe|kleiderhaken|hutablage|wandhaken", D + " > Coat & Hat Racks"), (r"k[üu]hlschrankmagnet", D + " > Refrigerator Magnets"),
                (r"tapete", D + " > Wallpaper"), (r"flagge|\bfahne\b", D + " > Flags & Windsocks"), (r"springbrunnen|zimmerbrunnen|gartenbrunnen", D + " > Fountains & Ponds"),
                (r"vogelhaus|nistkasten", D + " > Bird & Wildlife Houses"), (r"vogelfutter\w*", D + " > Bird & Wildlife Feeders"),
                (r"\bspiegel\b|\w+spiegel\b", D + " > Mirrors"), (r"\w*korb\b|\w*k[öo]rbe\b", D + " > Baskets"), (r"deko-?tablett|\btablett\b", D + " > Decorative Trays")]
    ZWEIG[K] = [(r"schneidebrett|schneidbrett|hackbrett|servierbrett", KT + " > Cutting Boards"), (r"korkenzieher|weinöffner|wein[öo]ffner", K + " > Barware > Corkscrews"),
                (r"flaschen[öo]ffner", K + " > Barware > Cocktail Shakers & Tools > Bottle Openers"),
                (r"trinkflasche|wasserflasche|thermosflasche|isolierflasche", K + " > Food & Beverage Carriers > Water Bottles"),
                (r"lunchbox|brotdose|bento", K + " > Food & Beverage Carriers > Lunch Boxes & Totes"), (r"brotkasten|brotbeutel", K + " > Food Storage > Bread Boxes & Bags"),
                (r"vorratsdose|vorratsglas|frischhaltedose|aufbewahrungsdose|vorratsbeh[äa]lter", K + " > Food Storage > Food Storage Containers"),
                (r"^(?!.*(?:reiniger|halter|w[äa]rmer|warmhalte|organizer)).*(?:tasse|\bbecher\b|\w+becher\b|kaffeebecher)", K + " > Tableware > Drinkware > Mugs"),
                (r"^(?!.*(?:koch|einweg)).*(?:geschirr-?set|tafelservice|geschirrservice)", K + " > Tableware > Dinnerware > Dinnerware Sets"),
                (r"\bteller\b|\w+teller\b", K + " > Tableware > Dinnerware > Plates"), (r"sch[üu]ssel|\w*schale\b|\w*schalen\b|schälchen|sch[äa]lchen", K + " > Tableware > Dinnerware > Bowls"),
                (r"^(?!.*(?:gestell|halter|organizer|abtropf|kasten|einsatz)).*(?:besteck|essst[äa]bchen|st[äa]bchen-?set)", K + " > Tableware > Flatware"), (r"teekanne|kaffeekanne", K + " > Tableware > Coffee Servers & Tea Pots"),
                (r"^(?!.*(?:wender|halter|reinig|st[äa]nder)).*(?:(?:topf|kochtopf|pfannen|kochgeschirr)[- ]?set|kochgeschirr)", K + " > Cookware & Bakeware > Cookware > Cookware Sets"), (r"pfanne", K + " > Cookware & Bakeware > Cookware > Skillets & Frying Pans"), (r"\bwok\b", K + " > Cookware & Bakeware > Cookware > Woks"),
                (r"^(?!.*elektr).*(?:kochtopf|suppentopf|\btopf\b)", K + " > Cookware & Bakeware > Cookware > Stock Pots"),
                (r"backform|kuchenform|muffinform|springform|silikonform", K + " > Cookware & Bakeware > Bakeware > Cake Pans & Molds"),
                (r"^(?!.*kocher).*backblech", K + " > Cookware & Bakeware > Bakeware > Baking & Cookie Sheets"), (r"backmatte|backpapier|dauerbackfolie", K + " > Cookware & Bakeware > Bakeware Accessories > Baking Mats & Liners"),
                (r"teesieb|tee-?ei\b", KT + " > Tea Strainers"), (r"^(?!.*(?:gestell|organizer|regal|halter)).*(?:\bsieb\b|\w+sieb\b|abtropfsieb)", KT + " > Colanders & Strainers"),
                (r"\breibe\b|\w+reibe\b|zestenreibe", KT + " > Food Graters & Zesters"), (r"gew[üu]rzm[üu]hle|pfefferm[üu]hle|salzm[üu]hle", KT + " > Spice Grinders"),
                (r"sch[üu]rze", KT + " > Aprons"), (r"ofenhandschuh|topflappen", KT + " > Oven Mitts & Pot Holders"), (r"dosen[öo]ffner", KT + " > Can Openers"),
                (r"(?:grill|bbq|braten|fleisch|k[üu]chen)\w*[- ]?thermometer|temperaturmessger[äa]t", KT + " > Cooking Thermometers"), (r"^(?!.*(?:halter|thermometer)).*(?:pfannenwender|\bspatel\b|\w+spatel\b)", KT + " > Spatulas"), (r"schneebesen", KT + " > Whisks"), (r"sch[öo]pfkelle|suppenkelle|\bkelle\b", KT + " > Ladles"),
                (r"grillzange|k[üu]chenzange|servierzange", KT + " > Tongs"), (r"eisw[üu]rfel", KT + " > Ice Cube Trays"),
                
                (r"milchaufsch[äa]umer", KA + " > Milk Frothers & Steamers"), (r"standmixer|stabmixer|\bmixer\b", KA + " > Food Mixers & Blenders"),
                (r"^(?!.*f[üu]r (?:die |eine )?kaffeemaschine).*(?:kaffeemaschine|espressomaschine|french press|espressokocher)", KA + " > Coffee Makers & Espresso Machines"),
                (r"kaffeefilter", K + " > Kitchen Appliance Accessories > Coffee Maker & Espresso Machine Accessories > Coffee Filters"),
                (r"^(?!.*(?:b[üu]rste|reinig)).*kaffeem[üu]hle", K + " > Kitchen Appliance Accessories > Coffee Maker & Espresso Machine Accessories > Coffee Grinders")]
    ZWEIG[V] = [(r"lenkrad\w*[- ]?(?:bezug|h[üu]lle|abdeckung)|lenkradbezug", VD + " > Vehicle Decor > Vehicle Steering Wheel Covers"),
                (r"lufterfrischer|autoduft|auto-?duft|duft\w* f[üu]r (?:das |den |s )?auto|l[üu]ftungsclip", VD + " > Vehicle Decor > Vehicle Air Fresheners"),
                (r"starthilfe|jump ?starter|notstarter", VD + " > Vehicle Repair & Specialty Tools > Vehicle Jump Starters"),
                (r"armaturenbrett|dashboard", VD + " > Vehicle Decor > Vehicle Dashboard Accessories"),
                (r"organizer|aufbewahrung|r[üu]cksitztasche|kofferraum\w*(?:tasche|box)", V + " > Vehicle Storage & Cargo > Vehicle Organizers"),
                (r"waschb[üu]rste|autow[äa]sche|polier", VD + " > Vehicle Cleaning")]
    ZWEIG[J] = [(r"uhrenarmband|uhrarmband|armband f[üu]r (?:die )?(?:apple )?watch|watch[- ]?armband", J + " > Watch Accessories > Watch Bands"),
                (r"ohrring|ohrstecker|ohrh[äa]nger|creole|ear ?cuff|ohrklemme", J + " > Earrings"), (r"fu(?:ss|ß)kett", J + " > Anklets"),
                (r"piercing|bauchnabel|nasenring|fingerkette|taillenkette|bauchkette|k[öo]rperkette", J + " > Body Jewelry"),
                (r"schmuckset|schmuck-set|parure", J + " > Jewelry Sets"), (r"brosche|anstecknadel|\bpin\b", J + " > Brooches & Lapel Pins"),
                (r"^(?!.*halskette).*anh[äa]nger|\bcharm", J + " > Charms & Pendants"),
                (r"armbanduhr|\w+uhr\b|\buhr\b", J + " > Watches"),
                (r"^(?!.*(?:armbandperlen|perlen f[üu]r|diy)).*(?:armband|armb[äa]nder|armreif|armkett|armspange)", J + " > Bracelets"),
                (r"halskette|\bkette\b|\w+kette\b|collier|choker|halsband", J + " > Necklaces"),
                (r"\w*ring\b|\w*ringe\b", J + " > Rings")]
    ZWEIG[L] = [(r"w[äa]rmelampe|heizlampe|rotlicht|taschenlampe|stirnlampe|kopflampe|uv-?lampe|nagellampe|m[üu]cken|moskito|insekt|fahrrad|velo|brillenlampe", None),
                (r"lichterkette|led-?streifen|led-?band|lichtschlauch|lichtervorhang", L + " > Light Ropes & Strings"),
                (r"kronleuchter|l[üu]ster", L + " > Lighting Fixtures > Chandeliers"),
                (r"deckenleuchte|deckenlampe|pendelleuchte|pendellampe|h[äa]ngeleuchte|h[äa]ngelampe", L + " > Lighting Fixtures > Ceiling Light Fixtures"),
                (r"wandleuchte|wandlampe", L + " > Lighting Fixtures > Wall Light Fixtures"), (r"unterbauleuchte|schrankleuchte|schranklicht|schranklampe", L + " > Lighting Fixtures > Cabinet Light Fixtures"),
                (r"gl[üu]hbirne|leuchtmittel|led-?birne|\be27\b|\bgu10\b", L + " > Light Bulbs"),
                (r"strahler|scheinwerfer|flutlicht|fluter", L + " > Flood & Spot Lights"),
                (r"(?:weg|garten|treppen|boden|pfad)\w*leucht|(?:weg|garten|treppen)\w*licht|solar-?(?:weg|garten|treppe)", L + " > Landscape Pathway Lighting"),
                (r"notlicht|notleuchte", L + " > Emergency Lighting"),
                (r"nachtlicht|stimmungslicht|projektor|sternenhimmel|galaxy|ambiente?licht|led-?w[üu]rfel", L + " > Night Lights & Ambient Lighting"),
                (r"tischlampe|nachttischlampe|stehlampe|leselampe|schreibtischlampe|tischleuchte|\blampe\b|\w+lampe\b", L + " > Lamps")]
    ZWEIG[T] = [(r"pl[üu]sch|kuscheltier|stofftier", T + " > Dolls, Playsets & Toy Figures > Stuffed Animals"),
                (r"ferngesteuert|\brc[- ]|\brc\b|fernsteuer", T + " > Remote Control Toys"),
                (r"bausteine|klemmbaustein|bauset|baukl[öo]tze|magnetbausteine", T + " > Building Toys"),
                (r"badespielzeug|badewannen\w*spielzeug|badeente", T + " > Bath Toys"), (r"sandspielzeug|strandspielzeug|sandkasten", T + " > Beach & Sand Toys"),
                (r"seifenblase", T + " > Activity Toys > Bubble Blowing Toys"), (r"kaleidoskop", T + " > Visual Toys > Kaleidoscopes"),
                (r"roboter", T + " > Robotic Toys"), (r"aufzieh", T + " > Wind-Up Toys"),
                (r"spielk[üu]che|kaufladen|arztkoffer|werkzeugkoffer f[üu]r kinder|rollenspiel", T + " > Pretend Play"),
                (r"xylophon|spielzeugtrommel|musikspielzeug|kinderklavier", T + " > Musical Toys"),
                (r"lernspielzeug|montessori|lernspiel", T + " > Educational Toys"),
                (r"\bpuppe\b|\w+puppe\b", T + " > Dolls, Playsets & Toy Figures"), (r"actionfigur|spielfigur", T + " > Dolls, Playsets & Toy Figures > Action & Toy Figures"),
                (r"rennwagen|spielzeugauto|\bauto\b|eisenbahn|\bzug\b|lkw|bagger|traktor|feuerwehrauto|modellauto", T + " > Play Vehicles")]
    ZWEIG["Arts & Entertainment"] = [(r"\bsticker\b|\w+sticker\b|aufkleber",
                                      "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers"),
                                     (r"luftballon|\bballon", "Arts & Entertainment > Party & Celebration > Party Supplies > Balloons"),
                                     (r"konfetti", "Arts & Entertainment > Party & Celebration > Party Supplies > Confetti")]
    ZWEIG[PS] += [(r"sch[üu]ssel|\bbowl\b|futterbowl", PS + " > Pet Bowls, Feeders & Waterers")]
    falsch = [z for v in ZWEIG.values() for _, z in v if z and z not in gueltig]
    if falsch:
        raise RuntimeError("Zweig-Pfad unbekannt (nichts geschrieben): " + "; ".join(falsch[:5]))
    # Eintrag mit Ziel None = Sperre: Titel bleibt grob (z. B. Wärmelampe ≠ Wohnlampe).
    ZWEIG = {k: [(re.compile(m, re.I), z) for m, z in v] for k, v in ZWEIG.items()}
    fplan, foffen = [], collections.Counter()
    for r in alle:
        v = ((r.get("metafield") or {}).get("value") or "").strip()
        if not r.get("g") or not v or v in (GROB, ELEK) or v.count(">") > 1 or v not in hat_kinder:
            continue
        treffer = next(((rx, zz) for rx, zz in ZWEIG.get(v, []) if rx.search(r.get("title", ""))), None)
        if treffer and treffer[1] is None:          # Sperre
            foffen[v] += 1; continue
        z = treffer[1] if treffer else None
        if z:
            fplan.append((r["id"], r.get("handle", ""), r.get("title", ""), z)); continue
        z, q = ziel_leer(r.get("title", ""), (), "")
        if not (z and q == "titel" and z.startswith(v + " > ") and z in gueltig):
            z2 = ziel(r.get("title", ""))
            z = z2 if (z2 and z2.startswith(v + " > ") and z2 in gueltig) else None
        if z:
            fplan.append((r["id"], r.get("handle", ""), r.get("title", ""), z))
        else:
            foffen[v] += 1
    fzaehl = collections.Counter(z for *_, z in fplan)
    print(f"grob (alle Zweige, Präfix-Regel): einordenbar {len(fplan)} · bleibt grob {sum(foffen.values())}")
    for k, v in fzaehl.most_common(25):
        print(f"  {v:5d}  {k}")
    print("  bleibt grob (häufigste):", ", ".join(f"{k} {n}" for k, n in foffen.most_common(8)))
    if os.environ.get("PLAN_OUT"):                 # Prüfliste für die Stichproben-Durchsicht (alle Klassen, jede Zeile)
        with open(os.environ["PLAN_OUT"], "w", encoding="utf-8") as po:
            for pid, _, t, z in fplan:
                po.write(f"{z}\t{t}\t{pid}\n")
    if not SCHARF:
        import random
        random.seed(7)
        for k in list(fzaehl)[:25]:
            bsp = [t for _, _, t, z in fplan if z == k]
            print(f"\n[fein {k}] Stichprobe:", " | ".join(t[:45] for t in random.sample(bsp, min(4, len(bsp)))))
        for k in list(lzaehl)[:40]:
            bsp = [t for _, _, t, z in lplan if z == k]
            print(f"\n[{k}] Stichprobe:", " | ".join(t[:45] for t in random.sample(bsp, min(5, len(bsp)))))
        print("\n[bleibt leer] Stichprobe:", " | ".join(t[:40] for t in random.sample(loffen, min(12, len(loffen)))))
        return
    with open(LEDGER, "a", encoding="utf-8") as f:
        ok1, fehl1 = schreiben(plan, GROB, f)
        ok2, fehl2 = schreiben(lplan, "(leer)", f)
        ok3, fehl3 = schreiben(eplan, ELEK, f)
        ok4, fehl4 = schreiben(fplan, "grob-zweig", f)
    print(f"FEIN (alle Zweige): {ok4} verfeinert, {fehl4} Fehler, {sum(foffen.values())} bleiben grob")
    print(f"FERTIG: fein {ok1} eingeordnet ({fehl1} Fehler, {len(offen)} bleiben grob) · leer {ok2} gefüllt "
          f"({fehl2} Fehler, {len(loffen)} bleiben leer) · Electronics {ok3} verfeinert ({fehl3} Fehler, {eoffen} bleiben grob)")

if __name__ == "__main__":
    main()
