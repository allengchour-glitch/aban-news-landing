#!/usr/bin/env python3
"""kosmetik_fein.py — Kosmetik bei Google UND Shopify per Titelwort in die echte Unterklasse (07.10.2026).

ANLASS (Betreiber «verbessere katalog und fein katalog?» → «das muss perfekt sein»). GEMESSEN 07.10. (Bulk-Export 51'496
aktive, kategorie_fein «anderer Zweig» 8'000): 2'662 Kosmetik-Produkte tragen bei Google nur «Personal Care > Cosmetics»,
Shopify ist feiner — aber die Shopify-Feinklasse ist oft selbst falsch, weil sie aus dem Produkttyp kommt:
«Make-up Pinselset» = Makeup (statt Makeup Brushes), «Badeset OCEAN SPA, Duschgel» = Makeup, «Nährender Nagellack» = Makeup,
«Elektrische Wimpernzange» = Makeup, «Bambus Kosmetik-Organizer» = Skin Care. Google aus Shopify abzuleiten hätte diese
Fehler nur kopiert.

REGEL (nie raten):
  1. Geltungsbereich: Google-Kategorie liegt im Zweig «Health & Beauty > Personal Care > Cosmetics» (auch genau dort).
  2. Das Ziel kommt NUR aus dem TITEL (geordnete Wortregeln, deutsche Komposita: Warenwort am Ende). Werkzeug vor Ware
     («Lidschatten-Pinsel» = Pinsel), Nägel vor Make-up, Bad vor Make-up.
  3. Treffen mehrere Make-up-Unterklassen (Lidschatten + Lippenstift), gilt die gemeinsame Oberklasse (Eye/Lip/Face Makeup,
     sonst Makeup); «Geschenkset»/«Set» mit ≥ 2 Klassen → Cosmetic Sets.
  4. Kein Treffer = bleibt, wie es ist (grob ist besser als falsch). Treffer, die den Zweig Cosmetics VERLASSEN würden, gibt
     es nicht — das ist Sache von google_kategorie_umzug.py.
  5. Google-Ziel wird gegen die Google-Taxonomie geprüft; Shopify-Ziel = Shopifys offizielle Zuordnung der Google-Klasse
     (automation/data/google_zu_shopify_kategorie.json), sonst die nächste zugeordnete Oberklasse; ID vor dem Schreiben gegen
     die Taxonomie DES SHOPS geprüft.
  6. Kanarienvögel (echte Titel aus dem Bestand) müssen alle stimmen, sonst wird nichts geschrieben.
Schreiben: metafieldsSet + productUpdate(category) in 25er-Blöcken, Eimer-Etikette, Rücklesen aus der Antwort;
Ledger dropship/_kosmetik_fein.tsv (handle-unabhängig: Produkt-ID). Täglich im Aufseher (erfasst Neuimporte).

  python3 automation/kosmetik_fein.py                 # Trockenlauf (Export von kategorie_fein, frisch wenn > 6 h)
  ZEIGEN=40 python3 automation/kosmetik_fein.py       # + Stichproben je Ziel
  SCHARF=1 python3 automation/kosmetik_fein.py
  python3 automation/kosmetik_fein.py --kanarien
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_kosmetik_fein.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
ZEIGEN = int(os.environ.get("ZEIGEN", "0"))
CAP = int(os.environ.get("CAP", "20000"))
K = "Health & Beauty > Personal Care > Cosmetics"

# (Muster, Ziel unter Cosmetics). Reihenfolge = Vorrang. Wortgrenzen deutsch: Warenwort darf am Kompositum-Ende stehen.
R = lambda s: re.compile(s, re.I)
NICHT_KOSMETIK = R(r"organi[sz]er|aufbewahrung|ständer|staender|display|kosmetiktasche|make-?up-?tasche|kulturbeutel|"
                   r"schminktisch|koffer|regal|halter(?!ung)|\bbox\b|bordüre|zahnprothese|haftcreme|perianal|hämorrhoid|"
                   r"(?<!tier)haar(?!glitzer)|faser-?puder|bart(?!.*augenbrau)|enthaarung|labret|gelenk|tabletten|kapseln|spielzeug|spielset|"
                   r"[\w-]*tasche\b|[\w-]*beutel\b|ablagematte")
REGELN = [
    # Bad & Körper
    (R(r"(bade|dusch)[\w-]*set|geschenkset.*(dusch|bade)|(dusch|bade).*geschenkset"), "Bath & Body Gift Sets"),
    (R(r"badebombe|badekugel|badesalz|badefizzer|badeperle|badezusatz|badeöl|schaumbad"), "Bath & Body > Bath Additives"),
    (R(r"duschgel|showergel|shower gel|body ?wash|duschschaum"), "Bath & Body > Body Wash"),
    (R(r"\bseife\b|seifenstück|naturseife"), "Bath & Body > Bar Soap"),
    (R(r"duschhaube|duschkappe"), "Bath & Body > Shower Caps"),
    # Nägel (vor Make-up: «Nagelpinsel», «Nagel-Glitzer»)
    (R(r"nagellackentferner|nail polish remover"), "Nail Care > Nail Polish Removers"),
    (R(r"nagelfräser|nagelfräse|nail drill|fräsaufs[aä]tz|fräserbit|poliermaschine|nagelschleifer|nagelbohrer|nagelpolierer|"
       r"nagelpoliergerät|nagelfräsmaschine|fräsgerät|schleifring|nagel[\s-]?sander"), "Cosmetic Tools > Nail Tools > Nail Drills"),
    (R(r"nagel-?kleber|nail glue|tip-?kleber"), "Nail Care > Manicure Glue"),
    (R(r"(uv|led)[\w-]*(nagel)?lampe|nageltrockner|nail dryer|nagellampe|lichthärtung|härtungsgerät|härtungslampe|"
       r"nagellack-?trockner|schnelltrockner|^(?=.*(nagel|nägel|nail)).*(lichttherapie|phototherapie)"), "Cosmetic Tools > Nail Tools > Nail Dryers"),
    (R(r"nagelfeile|sandblattfeile|glasfeile"), "Cosmetic Tools > Nail Tools > Nail Files & Emery Boards"),
    (R(r"polierblock|polierfeile|nail buffer"), "Cosmetic Tools > Nail Tools > Nail Buffers"),
    (R(r"nagelknipser|nagelzange|nagelschere|nagelclip|nagel-?schneider"), "Cosmetic Tools > Nail Tools > Nail Clippers"),
    (R(r"nagelhautschieber|nagelhaut-schieber|cuticle pusher"), "Cosmetic Tools > Nail Tools > Cuticle Pushers"),
    (R(r"manik[üu]re[\w-]*set.*(«|handgemacht|handbemalt|french|almond|schleifen|stern|nägel)|"
       r"(«|handgemacht|handbemalt|3d-).*manik[üu]re[\w-]*set"), "Nail Care > False Nails"),
    (R(r"(manik[üu]re|pedik[üu]re)[\w-]*set|nagelpflege-?set"), "Cosmetic Tools > Nail Tools > Manicure Tool Sets"),
    (R(r"nagelöl|nagelhautöl|cuticle oil"), "Nail Care > Cuticle Cream & Oil"),
    (R(r"press-?on|künstliche nägel|kunstnägel|kunstnaegel|falsche nägel|nageltips|nagel-?tips|fake nails|"
       r"nägel\s+zum\s+aufkleben|aufklebenägel|klebenägel|(fake|french|false|almond|coffin|stiletto)[\s-]?nails?|"
       r"^(?!.*(lack|(?<!nä)gel|pflege|feile|lampe|härt|trockn|kleber|öl|sticker|design|\bart\b|pinsel|bohrer|fräs|maschine|essenz|pflaster|stift|verlängerung)).*(nägel|nails)\b"),
     "Nail Care > False Nails"),
    (R(r"nagelspitzen|nagel-?tipps?\b|nail ?tips|nagel-?patch|nagelpatch|wear armor|(manik[üu]re|nagel(?!-?sticker)[\w-]*)\s+zum\s+aufkleben"),
     "Nail Care > False Nails"),
    (R(r"nagel-?aufkleber|nagelaufkleber|nagel-?schmuck|nagelkunst|nagel-?kunst|nagelart|zirkon|stempelplatte|nagel-?ornament|"
       r"nagel-?applikation|nagel-?verzierung|schmucksteine|nagel-?diamant"), "Nail Care > Nail Art Kits & Accessories"),
    (R(r"nagelsticker|nagel-?sticker|nagelfolie|nageldeko|nagelstrass|nagel-?strass|nagelpinsel|nagel-?pinsel|stamping|"
       r"nagelschablone|nagelglitzer|nagel-?glitzer|nagel-?charms|nagelschmuck"), "Nail Care > Nail Art Kits & Accessories"),
    (R(r"nagellack|gel-?lack|gellack|uv-?gel|nail polish|nagelgel|polygel|base ?coat|top ?coat|farbgel|aufbau-?gel|builder ?gel|verlängerungs-?gel"), "Nail Care > Nail Polishes"),
    (R(r"nail ?art|nageldesign|nagel-?design"), "Nail Care > Nail Art Kits & Accessories"),
    (R(r"n[äa]gel|nagel|\bnails?\b|manik[üu]re|pedik[üu]re"), "Nail Care"),
    (R(r"wimpern-?serum|brauen-?serum|augenbrauenserum|wimpernwachstum|(wimpern|brauen)[\w-]*\s*&\s*\w*serum"), "Makeup > Eye Makeup > Lash & Brow Growth Treatments"),
    # Werkzeug (vor Make-up-Ware)
    (R(r"(pinsel|bürsten?)[\w-]*\s?reinig|reinig[\w-]*\s.*(pinsel|bürsten)|reiniger für .*(pinsel|bürsten)|reinigungstank"), "Cosmetic Tool Cleansers"),
    (R(r"^(?!.*(\bmit|&|\bund)\s+pinsel\b).*(pinsel|\bbrush(es)?\b|kabuki|profi-?bürsten|make-?up-?bürste|kosmetikbürste)"), "Cosmetic Tools > Makeup Tools > Makeup Brushes"),
    (R(r"schwamm|schwämmchen|beauty ?blender|puderquaste|\bpuff\b|make-?up-?ei\b|beauty-?ei\b|make-?up ei\b"), "Cosmetic Tools > Makeup Tools > Makeup Sponges"),
    (R(r"wimpernzange|eyelash curler|wimpernformer"), "Cosmetic Tools > Makeup Tools > Eyelash Curlers"),
    (R(r"wimpernkleber|eyelash glue|lash glue"), "Cosmetic Tools > Makeup Tools > False Eyelash Accessories > False Eyelash Adhesive"),
    (R(r"lidstreifen|augenlid-?tape|doppellid|doppel-?lid|schlupflid"), "Cosmetic Tools > Makeup Tools > Double Eyelid Glue & Tape"),
    (R(r"augenbrauen-?schablone|brauenschablone|brow stencil|augenbrauen-?stempel"), "Cosmetic Tools > Makeup Tools > Eyebrow Stencils"),
    (R(r"^(?!.*(wimpern|lippen|lidschatten|palette|nagel|nägel)).*spiegel(?!glanz|effekt)"), "Cosmetic Tools > Makeup Tools > Face Mirrors"),
    (R(r"blotting|ölabsorbier|mattierungspapier"), "Cosmetic Tools > Makeup Tools > Facial Blotting Paper"),
    (R(r"gua ?sha|jade[\s-]?roller|gesichts[\s-]?roller|eis[\s-]?roller|ice[\s-]?roller|derma[\s-]?roller|quarz[\s-]?roller|stein[\s-]?roller|massage-?roller.*gesicht"),
     "Cosmetic Tools > Skin Care Tools > Skin Care Rollers"),
    (R(r"gesichtsreinigungsbürste|gesichtsbürste|gesichts-?reinigungs-?bürste"), "Cosmetic Tools > Skin Care Tools > Skin Cleansing Brushes & Systems"),
    (R(r"^(?=.*(\bled\b|led-|photon|rotlicht|infrarot|lichtpeeling|\bems\b|instrument|app-?steuerung|leuchtmaske)).*(maske|apparat|gerät)|schönheitsinstrument"), "Cosmetic Tools > Skin Care Tools"),
    (R(r"mitesser|komedonen|blackhead|pickel-?entferner"), "Cosmetic Tools > Skin Care Tools > Skin Care Extractors"),
    (R(r"hornhaut|fussfeile|fußfeile|foot file"), "Cosmetic Tools > Skin Care Tools > Foot Files"),
    (R(r"bimsstein"), "Cosmetic Tools > Skin Care Tools > Pumice Stones"),
    (R(r"gesichtssauna|gesichtsdampfer|gesichts-?dampfer|facial steamer"), "Cosmetic Tools > Skin Care Tools > Facial Saunas"),
    # Parfum
    (R(r"eau de (parfum|toilette|cologne)|parf[uü]m|\bcologne\b|duftstäbchen.*haut|festes parfum"), "Perfume & Cologne"),
    (R(r"fixierspray|setting ?spray|make-?up-?fixier"), "Makeup > Makeup Finishing Sprays"),
    # Haut
    (R(r"selbstbräuner|self tan"), "Skin Care > Tanning Products > Self Tanner"),
    (R(r"bräunungs|tanning"), "Skin Care > Tanning Products > Tanning Oil & Lotion"),
    (R(r"sonnencreme|sonnenschutz|sunscreen|\b(lsf|spf)\s*\d|uv-?schutz|sonnen-?(bb|stift|lotion|spray)|sonnenstift"), "Skin Care > Sunscreen"),
    (R(r"lippenbalsam|lippenpflege|lip ?balm|lippen-?öl|lip ?oil|lip ?plumper|lippen-?maske|lip ?mask"), "Skin Care > Lip Balms & Treatments"),
    (R(r"abschmink|make-?up-?entferner|makeup remover|mizellen"), "Skin Care > Makeup Removers"),
    (R(r"porenstreifen|nasenstreifen|nose strip"), "Skin Care > Facial Pore Strips"),
    (R(r"^(?!.*(staub|schutz|thermo|bike|biking|transparent|vollgesicht|\brand\b|glitzer|\bski|motorrad|halloween|karneval|party|"
       r"venezian|kostüm|bandage|schlaf)).*(tuchmaske|sheet mask|maske\b|peel-?off-?maske|peeling|scrub|augenpads|augen-pads|eye pads)"),
     "Skin Care > Skin Care Masks & Peels"),
    (R(r"reinigungsschaum|waschgel|cleanser|gesichtsreinigung|reinigungsmilch|reinigungscreme|-reiniger\b|feuchtigkeits-?reiniger|gesichtsreiniger"), "Skin Care > Facial Cleansers"),
    (R(r"gesichtswasser|\btoner\b"), "Skin Care > Toners & Astringents"),
    (R(r"akne|\bacne\b|pickel"), "Skin Care > Acne Treatments & Kits"),
    (R(r"körperöl|body ?oil"), "Skin Care > Body Oil"),
    (R(r"^(?!.*(lippenstift|lipgloss|lidschatten|make-?up|mascara|eyeliner|foundation|concealer|rouge|blush|puder)).*"
       r"(serum|essenz|gesichtsöl|öl-?set|pflege[\s-]?set|feuchtigkeits[\s-]?set|skin ?care.*set|geschenkset.*pflege|pflege.*geschenkset)"), "Skin Care"),
    (R(r"^(?!.*(augenbrau|brauen|lippen|\blip|gloss|fixier|\blid|foundation|concealer|abdeck|bb[\s-]?cre|cc[\s-]?cre|cushion|luftkissen|mascara|eyeliner|tattoo-?muster|tätowier|rouge|blush|highlighter|contour)).*(creme|lotion|feuchtigkeit|moisturi[sz]er|bodybutter|body butter)"), "Skin Care > Lotion & Moisturizer"),
]
# Make-up-Klassen: alle Treffer sammeln (mehrere = gemeinsame Oberklasse)
MAKEUP = [
    (R(r"falsche wimpern|kunstwimpern|künstliche wimpern|wimpern-?set|einzelwimpern|wimpernbänder|faux mink|mink-?wimpern|"
       r"magnetwimpern|magnetische wimpern|\blashes\b|^(?!.*(mascara|tusche|serum|lift|zange|kleber|curler)).*\bwimpern\b"), "Makeup > Eye Makeup > False Eyelashes"),
    (R(r"mascara|wimperntusche"), "Makeup > Eye Makeup > Mascara"),
    (R(r"eyeliner|kajal|lidstrich|eye ?liner"), "Makeup > Eye Makeup > Eyeliner"),
    (R(r"lidschatten|augen-?schatten|eye ?shadow|eyeshadow"), "Makeup > Eye Makeup > Eye Shadow"),
    (R(r"augenbraue|\bbrow|brauenstift|brauengel"), "Makeup > Eye Makeup > Eyebrow Enhancers"),
    (R(r"lippenstift|lipstick"), "Makeup > Lip Makeup > Lipstick"),
    (R(r"lipgloss|lip ?gloss|lippenglanz|lippen-?glanz|lip ?glaze|lippenlack"), "Makeup > Lip Makeup > Lip Gloss"),
    (R(r"lipliner|lip ?liner|lippenkonturenstift|lippenkontur"), "Makeup > Lip Makeup > Lip Liner"),
    (R(r"lip ?tint|lippen-?tint|lippentönung|\bstain\b"), "Makeup > Lip Makeup > Lip & Cheek Stains"),
    (R(r"foundation|concealer|abdeckstift|abdeckcreme|bb[\s-]?cre(am|me)|cc[\s-]?cre(am|me)|cushion|luftkissen"), "Makeup > Face Makeup > Foundations & Concealers"),
    (R(r"highlight|luminizer"), "Makeup > Face Makeup > Highlighters & Luminizers"),
    (R(r"\bblush|rouge|bronzer|contour|shading|(?<!lippen)kontur(?!enstift)"), "Makeup > Face Makeup > Blushes & Bronzers"),
    (R(r"^(?!.*(highlight|contour|kontur|shading|bronz|blush|rouge|lidschatten|augen)).*(puder\b|kompaktpuder|loses puder|setting-?puder|\bpowder\b)"), "Makeup > Face Makeup > Face Powder"),
    (R(r"primer"), "Makeup > Face Makeup > Face Primer"),
    (R(r"bein-?make-?up|körper-?make-?up|body ?make-?up"), "Makeup > Body Makeup"),
    (R(r"körperglitzer|body ?glitter|haarglitzer|gesichtsglitzer|glitzergel"), "Makeup > Body Makeup > Body & Hair Glitter"),
    (R(r"kinderschminke|face ?paint|body ?paint|körperfarbe|schminkfarbe|gesichtsfarbe|wasserfarben-?schmink|aquarell"), "Makeup > Body Makeup > Body Paint & Foundation"),
    (R(r"kunstblut|halloween[\w-]*schmink|special ?effect|spezialeffekt|modellierwachs|wunden|narben[\w-]*(kit|set)|theaterschmink"), "Makeup > Costume & Stage Makeup"),
    (R(r"temporäre?s? tattoo|klebe-?tattoo|tattoo-?aufkleber|fake ?tattoo|tätowier[\w-]*.*temporär"), "Makeup > Temporary Tattoos"),
]
SET = R(r"geschenkset|geschenk-?set|kosmetikset|kosmetik-?set|beauty-?set|make-?up-?set|\bset\b|kit\b|box\b")
MAKEUP_ALLG = R(r"make-?up|makeup|schmink|kosmetik-?palette|\bpalette\b")


def ziel(titel):
    """Google-Pfad unter Cosmetics (ohne Präfix) oder None. Reine Logik, ohne Netz."""
    t = titel or ""
    if NICHT_KOSMETIK.search(t):
        return None
    for rx, z in REGELN:
        if rx.search(t):
            return z
    treffer = sorted({z for rx, z in MAKEUP if rx.search(t)})
    if len(treffer) == 1:
        return treffer[0]
    if len(treffer) > 1:
        gruppen = {z.split(" > ")[1] if z.count(" > ") >= 1 else z for z in treffer}
        if len(gruppen) > 1 and SET.search(t):
            return "Cosmetic Sets"
        teile = [z.split(" > ") for z in treffer]
        gemeinsam = []
        for ebene in zip(*teile):
            if len(set(ebene)) != 1:
                break
            gemeinsam.append(ebene[0])
        return " > ".join(gemeinsam) or "Makeup"
    if MAKEUP_ALLG.search(t):
        return "Cosmetic Sets" if SET.search(t) and re.search(r"geschenk|kosmetik|beauty", t, re.I) else "Makeup"
    return None


KANARIEN = [
    ("Make-up Pinselset (16-teilig)", "Cosmetic Tools > Makeup Tools > Makeup Brushes"),
    ("12-teiliges Lidschatten- & Eyeliner-Pinselset", "Cosmetic Tools > Makeup Tools > Makeup Brushes"),
    ("Badeset OCEAN SPA, Duschgel 100 ml, Badefizzer 50 g", "Bath & Body Gift Sets"),
    ("Bade- & Duschgel MEN'S COLLECTION Bierflaschen-Optik 360 ml", "Bath & Body > Body Wash"),
    ("Badebombe mit Badesalz OCEAN SPA in Geschenkbox", "Bath & Body > Bath Additives"),
    ("Nährender Nagellack", "Nail Care > Nail Polishes"),
    ("24er Set Schwarze Schmetterling Press-On Nägel", "Nail Care > False Nails"),
    ("Handgemachte Kirschgold Diamant Nägel", "Nail Care > False Nails"),
    ("Elektrische Wimpernzange", "Cosmetic Tools > Makeup Tools > Eyelash Curlers"),
    ("Falsche Wimpern \"Deep Coffee\"", "Makeup > Eye Makeup > False Eyelashes"),
    ("3D Premium Faux Mink Kunstwimpern MK-16", "Makeup > Eye Makeup > False Eyelashes"),
    ("Fluoreszierende Mascara für lange Wimpern", "Makeup > Eye Makeup > Mascara"),
    ("12er Lidschatten- & Eyeliner-Stift-Set", "Makeup > Eye Makeup"),
    ("Make-up Set Lidschatten, Rouge & Lipgloss", "Cosmetic Sets"),
    ("Lippenstift & Lipliner Set – 12 Farben", "Makeup > Lip Makeup"),
    ("UV/LED Lichthärtungsgerät für Gelnägel", "Cosmetic Tools > Nail Tools > Nail Dryers"),
    ("Peel-off Lip Liner Burgund", "Makeup > Lip Makeup > Lip Liner"),
    ("Haftcreme für Zahnprothesen 28g", None),
    ("Tunmate Batana Haarcreme 118ml", None),
    ("HUNMUI Feuchtigkeitsspendendes Fixierspray", "Makeup > Makeup Finishing Sprays"),
    ("Feuchtigkeitsspendendes Glitter Lipgloss Set · 10-teilig", "Makeup > Lip Makeup > Lip Gloss"),
    ("Maniküre-Set «American Star»", "Nail Care > False Nails"),
    ("Maniküre-Set 5-teilig aus Edelstahl", "Cosmetic Tools > Nail Tools > Manicure Tool Sets"),
    ("Rote und weisse Herz-Kunstnägel, lang, eckig", "Nail Care > False Nails"),
    ("Aufbau-Gel für Nägel (25g)", "Nail Care > Nail Polishes"),
    ("Body mit Spitze und Wimpern-Bordüre", None),
    ("Photon Gesichtsmaske", "Cosmetic Tools > Skin Care Tools"),
    ("2-in-1 Farbwechsel Foundation Stick & Pinsel", "Makeup > Face Makeup > Foundations & Concealers"),
    ("24-teiliges Profi-Bürsten-Set für Grundierung, Rouge & Augen", "Cosmetic Tools > Makeup Tools > Makeup Brushes"),
    ("XINGX Highlighting Puder", "Makeup > Face Makeup > Highlighters & Luminizers"),
    ("Haaransatz Puder wasserfest", None),
    ("Silikonreiniger für Make-up-Bürsten", "Cosmetic Tool Cleansers"),
    ("Make-up-Bürsten-Tasche", None),
    ("Feuchtigkeitsspendende Mascara", "Makeup > Eye Makeup > Mascara"),
    ("Mushroom Luftkissen BB Creme", "Makeup > Face Makeup > Foundations & Concealers"),
    ("Kollagen Feuchtigkeitsmaske", "Skin Care > Skin Care Masks & Peels"),
    ("Staubdichte Gesichtsmaske Schwarz", None),
    ("3D Rotlicht Silikon-Gesichtsmaske", "Cosmetic Tools > Skin Care Tools"),
    ("Sonnenbräunungs-Lotion", "Skin Care > Tanning Products > Tanning Oil & Lotion"),
    ("Feuchtigkeitsspendende Sonnen-BB-Creme", "Skin Care > Sunscreen"),
    ("Haarentfernungscreme Sanfte Reinigung", None),
    ("Ibcccndc Retinol Feuchtigkeitsserum 90 Tabletten", None),
    ("Make-up Spielset für Kinder", None),
    ("Mango Make-up-Ei-Set", "Cosmetic Tools > Makeup Tools > Makeup Sponges"),
    ("LED Faltspiegel für Make-up", "Cosmetic Tools > Makeup Tools > Face Mirrors"),
    ("Handgemachte weinrote lange Nagelspitzen", "Nail Care > False Nails"),
    ("Weinroter Schmetterlings-Nagelaufkleber", "Nail Care > Nail Art Kits & Accessories"),
    ("Tragbares elektrisches Nagelbohrer-Set", "Cosmetic Tools > Nail Tools > Nail Drills"),
    ("Chameleon Smoke Pipe Labret Nagel-Set", None),
    ("Wimpern- & Augenbrauenserum", "Makeup > Eye Makeup > Lash & Brow Growth Treatments"),
    ("Lidschatten-Palette Schimmer Puder Wasserdicht", "Makeup > Eye Makeup > Eye Shadow"),
    ("Pomegranate Amino Acid Feuchtigkeits-Reiniger", "Skin Care > Facial Cleansers"),
    ("Vitamin C Feuchtigkeitspflege Set", "Skin Care"),
    ("Retinol-Feuchtigkeitsserum gegen feine Linien", "Skin Care"),
    ("Kamelien-Nagelsticker zum Aufkleben", "Nail Care > Nail Art Kits & Accessories"),
    ("Crystal Jelly Lippenbalsam – Spiegelglanz & Pflege", "Skin Care > Lip Balms & Treatments"),
    ("Magnetische Wimpern – 3+6 Cluster mit Spiegel", "Makeup > Eye Makeup > False Eyelashes"),
    ("Beauty Instrument Silikonmaske EMS", "Cosmetic Tools > Skin Care Tools"),
    ("Leuchtmaske mit App-Steuerung", "Cosmetic Tools > Skin Care Tools"),
    ("Kabellose Rotlichttherapie-Heizhandschuhe", None),
    ("12-Farben-Nagel-Kleber – Phototherapie-Stil", "Nail Care > Manicure Glue"),
    ("24-Stück Tierhaar-Makeup-Pinsel-Set", "Cosmetic Tools > Makeup Tools > Makeup Brushes"),
    ("DR Reismilch Gesichtsreiniger", "Skin Care > Facial Cleansers"),
    ("Nagel Phototherapie Lampe 90W mit Timer", "Cosmetic Tools > Nail Tools > Nail Dryers"),
    ("Nagelsticker UV-Gel", "Nail Care > Nail Art Kits & Accessories"),
    ("AS Nail Art Eternal Classic Farbgel-Nagellack", "Nail Care > Nail Polishes"),
    ("Monochromer Lidschatten- und Lippenstift", "Makeup"),
    ("Outline 12er-Set matter Lipliner", "Makeup > Lip Makeup > Lip Liner"),
    ("Leichter Concealer & Poren-Primer", "Makeup > Face Makeup"),
    ("Wasserfeste Augenbrauencreme mit Doppelstift", "Makeup > Eye Makeup > Eyebrow Enhancers"),
    ("Rosenquarz Gua Sha Set", "Cosmetic Tools > Skin Care Tools > Skin Care Rollers"),
    ("Jade Roller Premium Doppelseitig", "Cosmetic Tools > Skin Care Tools > Skin Care Rollers"),
    ("Bambus Kosmetik-Organizer Premium", None),
    ("Fruchtig-blumiges Eau de Parfum (100ml)", "Perfume & Cologne"),
    ("Clear Lip Plumper Oil mit Volumen & Pflege", "Skin Care > Lip Balms & Treatments"),
    ("Lippenstift-Geschenkset", "Makeup > Lip Makeup > Lipstick"),
    ("Augenbrauen-Stempel-Kit wasserfest & natürlich", "Cosmetic Tools > Makeup Tools > Eyebrow Stencils"),
    ("Puderpinsel für Foundation & loses Puder", "Cosmetic Tools > Makeup Tools > Makeup Brushes"),
    ("Temperaturregulierende Sonnencreme Foundation", "Skin Care > Sunscreen"),
    ("Elektrisches Make-up Pinsel Reinigungs-Set", "Cosmetic Tool Cleansers"),
    ("Nagellack-Display aus Acryl – Mehrstöckig", None),
    ("Faltbarer Handspiegel für Make-up", "Cosmetic Tools > Makeup Tools > Face Mirrors"),
]


def kanarien(gueltig=None):
    ok = 0
    for t, soll in KANARIEN:
        ist = ziel(t)
        gut = ist == soll and (ist is None or gueltig is None or f"{K} > {ist}" in gueltig)
        ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {ist} (soll {soll})")
    print(f"Kanarienvögel {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


def google_taxonomie():
    p = os.environ.get("TAXO", "/tmp/gtaxo.txt")
    if not os.path.exists(p):
        import urllib.request
        urllib.request.urlretrieve("https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt", p)
    return {m.group(1) for l in open(p, encoding="utf-8") if (m := re.match(r"\d+ - (.+)", l.strip()))}


def shopify_ziel(gname, karte):
    teile = gname.split(" > ")
    while teile:
        s = karte.get(" > ".join(teile))
        if s:
            return s
        teile.pop()
    return None


def ledger():
    try:
        return {(l.split("\t")[0], l.split("\t")[2]) for l in open(LEDGER, encoding="utf-8") if l.count("\t") >= 3}
    except OSError:
        return set()


def schreiben(charge):
    """charge: [(pid, google, shopify_id)] → [(pid, status, google, sid, fehler)]."""
    from kaufwille_zeile import gql
    import kategorie_fein as kf
    m = [{"ownerId": pid, "namespace": "mm-google-shopping", "key": "google_product_category",
          "type": "single_line_text_field", "value": g} for pid, g, _ in charge]
    teile = [f'p{i}: productUpdate(product:{{id:"{pid}", category:"{kf.TC}{sid}"}}){{product{{id category{{id}}}} userErrors{{message}}}}'
             for i, (pid, _, sid) in enumerate(charge)]
    r = gql("mutation($m:[MetafieldsSetInput!]!){mf: metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} value} userErrors{message}} "
            + " ".join(teile) + "}", {"m": m})
    gesetzt = {(x["owner"] or {}).get("id"): x["value"] for x in (r.get("mf") or {}).get("metafields") or []}
    aus = []
    for i, (pid, g, sid) in enumerate(charge):
        x = r.get(f"p{i}") or {}
        cat = ((x.get("product") or {}).get("category") or {}).get("id", "")
        ok = gesetzt.get(pid) == g and cat.endswith("/" + sid)
        fehler = "; ".join(e["message"] for e in (x.get("userErrors") or []) + ((r.get("mf") or {}).get("userErrors") or []))[:120]
        aus.append((pid, "gesetzt" if ok else "fehler", g, sid, fehler))
    return aus


def main():
    import kategorie_fein as kf
    gueltig = google_taxonomie()
    for _, z in REGELN + MAKEUP + [(None, "Cosmetic Sets"), (None, "Makeup")]:
        if f"{K} > {z}" not in gueltig:
            raise SystemExit(f"Google-Pfad unbekannt: {z} — nichts geschrieben")
    if not kanarien(gueltig):
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    karte = json.load(open(kf.KARTE, encoding="utf-8"))["karte"]
    kf.export_holen()
    erledigt = ledger()
    stat = collections.Counter(); plan = []; bsp = collections.defaultdict(list); art = collections.Counter()
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        g = (p.get("metafield") or {}).get("value") or ""
        if not (g == K or g.startswith(K + " > ")):
            continue
        stat["im-zweig"] += 1
        z = ziel(p["title"])
        if not z:
            stat["kein-treffer"] += 1
            if len(bsp["(kein Treffer)"]) < ZEIGEN: bsp["(kein Treffer)"].append(f'{p["title"][:60]}  [G: {g[len(K):] or "—"}]')
            continue
        neu = f"{K} > {z}"
        sid = shopify_ziel(neu, karte)
        cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        if neu == g and sid == cid:
            stat["stimmt"] += 1; continue
        if (p["id"], neu) in erledigt:
            stat["schon-im-ledger"] += 1; continue
        art["verfeinern" if neu.startswith(g + " > ") or neu == g else "seitwärts"] += 1
        plan.append((p["id"], neu, sid))
        if len(bsp[z]) < ZEIGEN: bsp[z].append(f'{p["title"][:60]}  [G alt: {g[len(K):] or "—"}]')
    gueltig_s = kf.ids_pruefen({x[2] for x in plan if x[2]}) if plan else set()
    weg = [x for x in plan if x[2] not in gueltig_s]
    plan = [x for x in plan if x[2] in gueltig_s]
    print("Stand:", dict(stat), "· Art:", dict(art), f"· Shopify-ID unbekannt: {len(weg)}")
    for z, n in collections.Counter(x[1][len(K) + 3:] for x in plan).most_common(60):
        print(f"  {n:5} → {z}")
        for b in bsp.get(z, []):
            print("        ", b)
    for b in bsp.get("(kein Treffer)", []):
        print("   ohne Treffer:", b)
    gesetzt = fehler = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, min(len(plan), CAP), 25):
                for pid, st, g, sid, fe in schreiben(plan[i:i + 25]):
                    f.write(f"{pid}\t{st}\t{g}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{fe}\n")
                    gesetzt += st == "gesetzt"; fehler += st == "fehler"
                f.flush()
                time.sleep(0.4)
    print(f"KOSMETIK-FEIN: {len(plan)} umzuordnen{f' · gesetzt {gesetzt} · fehler {fehler}' if SCHARF else ' (TROCKEN)'} · "
          f"im Zweig {stat['im-zweig']} · ohne Treffer {stat['kein-treffer']}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien(google_taxonomie()) else 1)
    main()
