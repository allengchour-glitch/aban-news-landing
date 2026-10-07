#!/usr/bin/env python3
"""google_kategorie_umzug.py — grobe Google-Kategorie per eindeutigem Warenwort in den RICHTIGEN Zweig (05.10.2026).

ANLASS (Verbesserungsrunde 05.10. 08:25, Plan-Tag 7 «feine Kategorien»): Neuimporte seit 03.10. 86 % grob (777/904); der
Tageslauf `google_kategorie_fein.py` meldet «5'319 bleiben grob» (Fitness 879, Tools 843, Decor 718, Kitchen 578, Pet 456),
die KI-Stufe `google_fein_ki.py` ruht ohne Gemini/OpenAI-Guthaben (792 von 2'890 eingeordnet). Häufigste Wörter der Reste:
Fitness → «velo/rücklicht/fahrradhelm/zelt/leggings» (Fahrrad- und Campingware, Sportkleidung), Decor → «kissen/nackenkissen/
memory foam/decke/bettwäsche/duschvorhang/badetuch» (Bettwaren/Bad), Pet → «spielzeug/kratzbaum/haustierbett/futterball».
Die Fein-Stufe darf nur INNERHALB des bisherigen Zweigs verfeinern (Präfix-Regel) — ein Fahrradhelm unter «Exercise & Fitness»
oder ein Nackenkissen unter «Decor» steht aber im FALSCHEN Zweig. Diese Stufe zieht ihn um.

REGELN (eng, damit nichts falsch wird):
  * Nur wenn der bisherige Wert GENAU einer der Quellzweige unten ist (Kreuz-Umzug nur aus bekannten groben Sammelzweigen).
  * Ein Warenwort, das die Ware EINDEUTIG benennt; Reihenfolge = Vorrang; Kostüme/Klingen nie (google_kategorie_fein.KOSTUEM).
  * Jeder Zielpfad wird gegen Googles Taxonomie geprüft (unbekannt → Abbruch vor dem Schreiben). Kanarienvögel vor jedem Lauf.
  * Schreiben über google_kategorie_fein.schreiben (metafieldsSet 25er, Rücklesen, Eimer-Etikette); Ledger
    dropship/_google_kategorie_umzug.tsv (handle, alt, neu) — Rückweg: alten Wert aus Spalte 2 zurückschreiben.
  EXPORT=/tmp/gkat_fein_export.jsonl python3 automation/google_kategorie_umzug.py            # Trockenlauf
  EXPORT=… SCHARF=1 python3 automation/google_kategorie_umzug.py                             # schreibt
  python3 automation/google_kategorie_umzug.py --kanarienvogel
"""
import collections, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import google_kategorie_fein as gkf  # noqa: E402

REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_google_kategorie_umzug.tsv")
SCHARF = os.environ.get("SCHARF") == "1"

EF, DE, PS = "Sporting Goods > Exercise & Fitness", "Home & Garden > Decor", "Animals & Pet Supplies > Pet Supplies"
KD, TO = "Home & Garden > Kitchen & Dining", "Hardware > Tools"
CY = "Sporting Goods > Outdoor Recreation > Cycling"
CH = "Sporting Goods > Outdoor Recreation > Camping & Hiking"
LB = "Home & Garden > Linens & Bedding"
KLEID = r"leggings|\bshorts\b|\w*hose\b|sport-?bh|\bbra\b|\w*shirt\b|\w*jacke\b|\w*top\b|jumpsuit|overall|trainingsanzug|\w*weste\b"

UMZUG = {
    EF: [
        (r"^(?!.*(?:motorrad|polster|brille\b|-brille|visier\b)).*(?:(?:fahrrad|velo|bike|mtb|rad)\w*[- ]?helm|velohelm|fahrradhelm)", CY + " > Cycling Apparel & Accessories > Bicycle Helmets"),
        (r"^(?!.*(?:visier|polster)).*reithelm", "Sporting Goods > Outdoor Recreation > Equestrian > Riding Apparel & Accessories > Equestrian Helmets"),
        (r"(?:fahrrad|velo|bike|mountainbike|mtb)\w*[- ]?(?:licht|lampe|r[üu]cklicht|frontlicht|scheinwerfer|blinker)|\br[üu]cklicht\b.*(?:fahrrad|velo|bike)|(?:fahrrad|velo|bike).*\b(?:r[üu]cklicht|frontlicht)",
         CY + " > Bicycle Accessories"),
        (r"(?:fahrrad|velo|bike)\w*[- ]?(?:schloss|klingel|glocke|pumpe|spiegel|korb|tasche|st[äa]nder|halterung|computer|tacho)", CY + " > Bicycle Accessories"),
        (r"^(?!.*(?:spielzelt|kinderzelt|zeltlager)).*\w*zelt\b", CH + " > Tents"),
        (r"schlafsack", CH + " > Sleeping Bags"),
        (r"h[äa]ngematte", "Home & Garden > Lawn & Garden > Outdoor Living > Hammocks"),
        (KLEID, "Apparel & Accessories > Clothing > Activewear"),
        (r"bauchtrainer|bauchmuskeltrainer", EF + " > Ab Wheels & Rollers"),
    ],
    DE: [
        (r"stillkissen|schwangerschaftskissen", "Baby & Toddler > Nursing & Feeding > Nursing Pillows"),
        (r"^(?!.*(?:zier|deko|sofa|couch|kissenbez|kissenh[üu]lle|sitzkissen|stuhl|auto|kindersitz|therapie)).*(?:nackenkissen|nackenst[üu]tzkissen|kopfkissen|seitenschl[äa]ferkissen|memory[- ]?(?:foam|schaum)\w*[- ]?kissen|schlafkissen|orthop[äa]dische\w* kissen)",
         LB + " > Bedding > Pillows"),
        (r"bettw[äa]sche|bettbezug|bettdeckenbezug|duvet", LB + " > Bedding > Duvet Covers"),
        (r"spannbettlaken|bettlaken|leintuch", LB + " > Bedding > Bed Sheets"),
        (r"^(?!.*(?:heiz|elektr|picknick|picnic|tisch|spieldecke|kissenbezug|sofa-?decke|stretch)).*(?:kuscheldecke|wohndecke|tagesdecke|fleecedecke|\bdecke\b|\w+decke\b)", LB + " > Bedding > Blankets"),
        (r"duschvorhang|duschvorh[äa]nge", "Home & Garden > Bathroom Accessories > Shower Curtains"),
        (r"^(?!.*(?:yoga|k[üu]hl|k[üu]che|golf|fitness|rucksack|wandmontiert)).*(?:badetuch|badet[üu]cher|handtuch|handt[üu]cher|saunatuch)", LB + " > Towels > Bath Towels & Washcloths"),
    ],
    PS: [
        (r"kratzbaum|kratzs[äa]ule|kratzbrett|katzenbaum|katzenhaus", PS + " > Cat Supplies > Cat Furniture"),
        (r"katzenklo|katzentoilette", PS + " > Cat Supplies > Cat Litter Boxes"),
        (r"^(?=.*(?:katze|k[äa]tzchen|kater)).*(?:spielzeug|spielball|angel|laser|maus\b|tunnel)", PS + " > Cat Supplies > Cat Toys"),
        (r"^(?=.*(?:hund|welpe)).*(?:spielzeug|spielball|kauspielzeug|zugseil|ball\b|frisbee|wurfscheibe)", PS + " > Dog Supplies > Dog Toys"),
        (r"^(?=.*(?:hund|welpe)).*(?:pullover|mantel|jacke|regenmantel|weste|kleidung|hoodie|t-?shirt)", PS + " > Dog Supplies > Dog Apparel"),
        (r"^(?=.*(?:katze|k[äa]tzchen)).*(?:pullover|kleidung|hoodie|kost[üu]m)", PS + " > Cat Supplies > Cat Apparel"),
        (r"^(?=.*(?:hund|welpe)).*(?:\bbett\b|hundebett|\w*korb\b|\w*kissen\b|liegematte|sofa)|hundebett", PS + " > Dog Supplies > Dog Beds"),
        (r"^(?=.*(?:katze|k[äa]tzchen)).*(?:\bbett\b|katzenbett|\w*korb\b|\w*kissen\b|h[öo]hle)|katzenbett", PS + " > Cat Supplies > Cat Beds"),
        (r"futterball|schnüffel|schn[üu]ffelteppich|langsam\w* fress|anti-?schling|slow ?feeder", PS + " > Pet Bowls, Feeders & Waterers"),
    ],
    KD: [
        (r"abtropfgestell|abtropfkorb|abtropfbrett|geschirrabtropf|sp[üu]lbeckenablage", KD + " > Kitchen Tools & Utensils > Dish Racks & Drain Boards"),
        (r"messersch[äa]rfer|wetzstahl|schleifstein f[üu]r messer", KD + " > Kitchen Appliances > Knife Sharpeners"),
    ],
    TO: [
        (r"crimpzange|abisolierzange|presszange|kabelschuhzange", TO + " > Pliers"),
        (r"\blineal\b|winkellineal|anschlagwinkel|schieblehre", TO + " > Measuring Tools & Sensors"),
        # 06.10.2026 (Verbesserungsrunde 08:25): CJ-Gruppe «Werkzeug» füllt Hardware > Tools mit Küchen-/Pflegeware —
        # 315 Neuimporte in 30 h, 65 unter Tools, davon Backformen, Haarschneider, Nagelknipser, Küchentuch. Kreuz-Umzug.
        (r"backform|kuchenform|silikonform(?!.*(?:kerze|harz|epoxid|gips|vase|blumentopf|schale|teller|aufbewahrung|bastel|diy|seife))|muffinform|tortenform|ausstechform|keksform", KD + " > Cookware & Bakeware > Bakeware"),
        (r"haarschneider|haarschneidemaschine|bartschneider|haartrimmer", "Health & Beauty > Personal Care > Shaving & Grooming > Hair Clippers & Trimmers"),
        (r"nagelknipser|nagelschere|nagelfeile|nagelzange", "Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Nail Tools"),
        (r"k[üu]chen(?:reinigungs)?tuch|sp[üu]ltuch|putzschwamm|reinigungsschwamm|schwammtuch", "Home & Garden > Household Supplies > Household Cleaning Supplies"),
    ],
}
_R = {q: [(re.compile(m, re.I), z) for m, z in r] for q, r in UMZUG.items()}
# 07.10.2026 (Verbesserungsrunde 12:25, Plan-Tag 7): die CJ-Gruppe «Werkzeug» stempelt ALLES, was ihre Suche liefert,
# als «Werkzeug & Heimwerken» / Hardware > Tools — gemessen 1'188 aktive, nur 566 mit einem Werkzeugwort im Titel; in 4 h
# 110 Neuimporte, darunter Kalimba, Kerzenhalter, Eierschneider, Wattestäbchen, Regenschirm, Auto-Diagnosegerät.
# Die allgemeinen Titelregeln (kategorie_wache.TITELREGELN) sind für diese Ware zu grob («Crimpzange für Kabelschuhe» →
# Schuhe, «Reifen-Glanzcreme» → Beauty). Deshalb: (1) die Werkzeug-Verfeinerungen oben, (2) WERKZEUGWORT schützt echte
# Werkzeuge (bleiben Tools), (3) nur eindeutige Warenwörter ziehen um. Unklares bleibt, wo es ist.
WERKZEUGWORT = re.compile(
    r"werkzeug\w*|\w*zange\b|zangen\w*|schraubendreher|schraubenzieher|\w*schrauber\b|ratsche\w*|steckschl[üu]ssel|"
    r"stecknuss|\w*bohrer\b|bohrmaschine|\bbits?\b|bit-?(?:satz|set|halter)|\w*s[äa]ge\b|s[äa]geblatt|\w*hammer\b|"
    r"mei[sß]{1,2}el|\w*feile\b|schleif(?:maschine|scheibe|papier|ger[äa]t)|trennscheibe|l[öo]tkolben|l[öo]tstation|"
    r"multimeter|messschieber|schieblehre|wasserwaage|ma[sß]{1,2}band|bandma[sß]{1,2}|zollstock|schwei[sß]{1,2}ger[äa]t|"
    r"nagelpistole|\btacker\b|zwinge\b|inbus|innensechskant|drehmoment|abzieher\b|spachtel|crimp|abisolier|"
    r"klebepistole|hei[sß]{1,2}klebe|werkbank|schraubstock|d[üu]bel|nietzange|drahtb[üu]rste|glasschneider|"
    r"fliesenschneider|gewindeschneider|entgrater|spannfutter|hei[sß]{1,2}luft|silikonpistole|kartuschenpistole|"
    r"kompressor|\bhobel\b|stemmeisen|lochzange|\bahle\b|schl[üu]sselsatz|schraubenschl[üu]ssel|\w*schl[üu]ssel-?set", re.I)
VK = "Vehicles & Parts > Vehicle Parts & Accessories > Vehicle Maintenance, Care & Decor"
MU = "Arts & Entertainment > Hobbies & Creative Arts"
TO_KREUZ = [
    (r"diagnoseger[äa]t|\bobd-?2?\b|elm327", VK + " > Vehicle Repair & Specialty Tools > Vehicle Diagnostic Scanners"),
    (r"starthilfe", VK + " > Vehicle Repair & Specialty Tools > Vehicle Jump Starters"),
    (r"^(?=.*(?:\bauto\w*|kfz|reifen|fahrzeug\w*|motorrad\w*|felge\w*|radnabe\w*|autoscheibe\w*|windschutzscheibe\w*)).*"
     r"(?:pflege|glanz|politur|polier|wachs|reinig|spray|creme|paste|fluid|shampoo|b[üu]rste|schwamm|wasch)", VK + " > Vehicle Cleaning"),
    (r"^(?!.*haken).*(?:(?<!lampen)(?<!bild)regenschirm|sonnenschirm|(?:uv|regen|sonnen)-?schutz-?schirm|\bschirm\b(?!m[üu]tze))", "Home & Garden > Parasols & Rain Umbrellas"),
    (r"\bgolf\w*", "Sporting Goods > Outdoor Recreation > Golf"),
    (r"kalimba|daumenklavier|zungentrommel|ukulele|mundharmonika", MU + " > Musical Instruments"),
    (r"gitarr\w*|kapodaster|plektr\w*|gitarrensaite\w*", MU + " > Musical Instrument & Orchestra Accessories > String Instrument Accessories"),
    (r"kerzenhalter|kerzenst[äa]nder|teelichthalter", "Home & Garden > Decor > Home Fragrance Accessories > Candle Holders"),
    (r"(?:kerzen|seifen)\w*form|silikonform\b.*(?:kerze|seife|harz|epoxid)|gie[sß]form", MU + " > Arts & Crafts > Crafting Patterns & Molds > Craft Molds"),
    (r"uhrenbeweger", "Apparel & Accessories > Jewelry > Watch Accessories > Watch Winders"),
    (r"watte-?st[äa]bchen|wattest[äa]bchen", "Health & Beauty > Personal Care > Cotton Swabs"),
    (r"staubsauger-?(?:adapter|schlauch|aufsatz|d[üu]se|filter|b[üu]rste)|ersatzschlauch.*staubsauger", "Home & Garden > Household Appliance Accessories > Vacuum Accessories"),
    (r"^(?!.*bohr).*\w*staubsauger\b", "Home & Garden > Household Appliances > Vacuums"),
    (r"wischmopp|\bmopp\b|staubwedel|spinnenf[äa]nger", "Home & Garden > Household Supplies > Household Cleaning Supplies"),
    (r"^(?!.*k[äa]ltemittel).*(?:eierschneider|brotschneider|flaschen[öo]ffner|fass[öo]ffner|dosen[öo]ffner|knoblauchpresse)", "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils"),
]
_TK = [(re.compile(m, re.I), z) for m, z in TO_KREUZ]



def ziel(titel, alt):
    if alt not in _R or gkf.KOSTUEM.search(titel or ""):
        return None
    for rx, z in _R[alt]:
        if rx.search(titel or ""):
            return z
    if alt == TO and not WERKZEUGWORT.search(titel or ""):
        for rx, z in _TK:
            if rx.search(titel or ""):
                return z
    return None


KANARIEN = [
    ("Silikon-Backform 8-teilige Weihnachtsbaum-Form", TO, KD + " > Cookware & Bakeware > Bakeware"),
    ("Silikonform: Tulpenblüten-Kerze", TO, MU + " > Arts & Crafts > Crafting Patterns & Molds > Craft Molds"),   # 07.10.: Bastelform statt Backform
    ("DIY Silikonform: Meeresmotive für Epoxidharz", TO, MU + " > Arts & Crafts > Crafting Patterns & Molds > Craft Molds"),   # 07.10.: Bastelform statt Backform
    ("Sushi-Rohrform zum Formen von Sushi", TO, None),
    ("Elektrischer Haarschneider mit Akku", TO, "Health & Beauty > Personal Care > Shaving & Grooming > Hair Clippers & Trimmers"),
    ("Nagelknipser-Set", TO, "Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Nail Tools"),
    ("Küchenreinigungstuch mit Schwammblock", TO, "Home & Garden > Household Supplies > Household Cleaning Supplies"),
    ("Rasentrimmer mit Akku", TO, None),
    ("Elektrischer Lötkolben", TO, None),
    ("Schneidwerkzeug: Rundschaft-Meissel-Set", TO, None),
    ("Velohelm für Erwachsene mit LED-Rücklicht", EF, CY + " > Cycling Apparel & Accessories > Bicycle Helmets"),
    ("Fahrrad-Rücklicht USB aufladbar", EF, CY + " > Bicycle Accessories"),
    ("Mountainbike Frontlicht 800 Lumen", EF, CY + " > Bicycle Accessories"),
    ("Kuppelzelt für 4 Personen", EF, CH + " > Tents"),
    ("Kinder-Spielzelt Prinzessin", EF, None),
    ("High Waist Leggings für Damen", EF, "Apparel & Accessories > Clothing > Activewear"),
    ("Yoga-Matte rutschfest", EF, None),                                   # bleibt für die Fein-Stufe
    ("Memory-Foam Nackenkissen für Seitenschläfer", DE, LB + " > Bedding > Pillows"),
    ("Zierkissen aus Samt für das Sofa", DE, None),                       # Deko-Kissen bleibt Decor
    ("Kissenbezug Nackenkissen-Form", DE, None),
    ("Stillkissen für Babys", DE, "Baby & Toddler > Nursing & Feeding > Nursing Pillows"),
    ("Kuscheldecke aus Fleece", DE, LB + " > Bedding > Blankets"),
    ("Elektrische Heizdecke", DE, None),
    ("Duschvorhang mit Haken", DE, "Home & Garden > Bathroom Accessories > Shower Curtains"),
    ("Kratzbaum mit Sisal für Katzen", PS, PS + " > Cat Supplies > Cat Furniture"),
    ("Interaktives Spielzeug für Hunde", PS, PS + " > Dog Supplies > Dog Toys"),
    ("Spielzeug für kleine Haustiere", PS, None),                         # Tierart unklar → bleibt
    ("Kostüm für Hunde Pirat", PS, None),
    ("Abtropfgestell aus Edelstahl", KD, KD + " > Kitchen Tools & Utensils > Dish Racks & Drain Boards"),
    ("Crimpzange für Kabelschuhe", TO, TO + " > Pliers"),
    ("Velohelm", "Apparel & Accessories > Clothing", None),               # nur aus den Quellzweigen
    ("Motorradhelm mit Doppelscheibe", EF, None),
    ("Integrierte Fahrradhelm-Brille", EF, None),
    ("Reithelm-Visier für Outdoor-Aktivitäten", EF, None),
    ("Vintage Spitzen Tischdecke – Weiss/Schwarz, 140 cm", DE, None),
    ("Küchenhandtuch mit Tier-Stickerei", DE, None),
    ("Rutschfestes, saugfähiges Yoga-Matten-Handtuch", DE, None),
    ("Nackenkissen für Autositz", DE, None),
    ("Baby-Kopfkissen aus Memory-Schaum", DE, LB + " > Bedding > Pillows"),
    # 07.10.2026 Werkzeug-Sammelkorb (echte Titel aus dem Bestand)
    ("Kalimba Daumenklavier 17-Töne", TO, MU + " > Musical Instruments"),
    ("Kapodaster für Folk- und E-Gitarren", TO, MU + " > Musical Instrument & Orchestra Accessories > String Instrument Accessories"),
    ("Weihnachtsdeer-Kerzenhalter aus Eisen", TO, "Home & Garden > Decor > Home Fragrance Accessories > Candle Holders"),
    ("Aromatherapie-Kerzenform «Herz-Säule»", TO, MU + " > Arts & Crafts > Crafting Patterns & Molds > Craft Molds"),
    ("Uhrenbeweger mit Piano-Lack", TO, "Apparel & Accessories > Jewelry > Watch Accessories > Watch Winders"),
    ("100 Stück Wattestäbchen im Karton", TO, "Health & Beauty > Personal Care > Cotton Swabs"),
    ("Eierschneider aus Edelstahl", TO, "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils"),
    ("Faltbarer Sonnen- und Regenschirm", TO, "Home & Garden > Parasols & Rain Umbrellas"),
    ("Profi Golf-Entfernungsmesser & Monokular", TO, "Sporting Goods > Outdoor Recreation > Golf"),
    ("T200 Diagnosegerät für Fahrzeugfehler", TO, VK + " > Vehicle Repair & Specialty Tools > Vehicle Diagnostic Scanners"),
    ("Reifen Glanz- und Pflegecreme", TO, VK + " > Vehicle Cleaning"),
    ("Ersatzschlauch-Set für Staubsauger", TO, "Home & Garden > Household Appliance Accessories > Vacuum Accessories"),
    ("Kabelloser Handstaubsauger mit Lithium-Akku", TO, "Home & Garden > Household Appliances > Vacuums"),
    ("Wischmopp mit rotierbarem Kopf", TO, "Home & Garden > Household Supplies > Household Cleaning Supplies"),
    # Werkzeug bleibt Werkzeug, Unklares bleibt, wo es ist
    ("Gitarrenbund-Feile mit vier Rillen", TO, None),                    # Feile = Werkzeug
    ("Uhren-Reparatur-Schraubendreher-Set (9-teilig)", TO, None),
    ("Auto Handkurbel-Wagenheber", TO, None),
    ("Reifen-Montierhebel mit Schraubenschlüssel-Set", TO, None),
    ("Lampenschirm-Halterung E27", TO, None),
    ("Bildschirm-Reinigungsspray", TO, None),
    ("Stossfestes Manometer aus Edelstahl", TO, None),
    ("Möbelheber", TO, None),
    ("3er-Set Schirm-Haken, selbstklebend", TO, None),                  # Haken, kein Schirm (Trockenlauf 07.10.)
    ("Universal-Flaschenöffner für Kältemittel", TO, None),             # Kältetechnik, nicht Küche
    ("Elektrischer Bohrstaubsauger mit Laser", TO, None),               # Bohr-Absaugung = Werkzeug
    ("Kalimba Daumenklavier 17-Töne", DE, None),                       # nur aus dem Tools-Zweig
]


def kanarienvogel(gueltig=None):
    ok = 0
    for t, alt, soll in KANARIEN:
        ist = ziel(t, alt)
        ok += ist == soll
        if ist != soll:
            print(f"✗ {t!r} [{alt}] → {ist!r} (soll {soll!r})")
    if gueltig is not None:
        for regeln in list(UMZUG.values()) + [TO_KREUZ]:
            for _, z in regeln:
                if z not in gueltig:
                    print(f"✗ Zielpfad nicht in Googles Taxonomie: {z}")
                    return 1
    print(f"Kanarienvögel {ok}/{len(KANARIEN)}")
    return 0 if ok == len(KANARIEN) else 1


def main():
    gueltig = gkf.taxonomie()
    if kanarienvogel(gueltig):
        print("ABBRUCH: Kanarienvögel/Taxonomie — nichts geschrieben"); return 1
    if "--kanarienvogel" in sys.argv:
        return 0
    alle = gkf.export()
    plan = collections.defaultdict(list)
    for r in alle:
        if not r.get("g"):
            continue
        alt = ((r.get("metafield") or {}).get("value") or "")
        z = ziel(r.get("title", ""), alt)
        if z:
            plan[alt].append((r["id"], r.get("handle", ""), r.get("title", ""), z))
    gesamt = sum(len(v) for v in plan.values())
    print(f"UMZUG-PLAN: {gesamt} Produkte · {'SCHARF' if SCHARF else 'TROCKEN'}")
    for alt, teil in plan.items():
        z = collections.Counter(x[3] for x in teil)
        print(f"  {alt} ({len(teil)}): " + " · ".join(f"{k.split(' > ')[-1]} {v}" for k, v in z.most_common()))
        for _, h, t, zz in teil[:int(os.environ.get("ZEIGEN", "4"))]:
            print(f"     {t[:60]!r} → {zz.split(' > ')[-1]}")
    if not SCHARF:
        print("FERTIG (trocken)"); return 0
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for alt, teil in plan.items():
            a, b = gkf.schreiben(teil, alt, f)
            ok += a; fehl += b
    print(f"FERTIG: Umzug {ok} gesetzt, {fehl} Fehler")
    return 0


if __name__ == "__main__":
    sys.exit(main())
