#!/usr/bin/env python3
"""kategorie_fein.py — grobe Shopify-Produktkategorie über die feine Google-Kategorie verfeinern (06.10.2026).

ANLASS (Betreiber «feinkategorie und filter verbessern»). GEMESSEN 06.10. (Bulk-Export 50'914 aktive): Tiefe der
Shopify-Kategorie 1: 9'728 · 2: 28'705 · 3: 8'237 · 4+: 4'244 — 38'433 Produkte stehen auf Oberklassen wie
«Apparel & Accessories > Clothing» (10'612), «… > Shoes» (5'555), «Electronics» (4'631), «Luggage & Bags» (3'022).
`kategorie_wache.py` setzt die Kategorie aus dem PRODUKTTYP (der ist grob: «Damenmode» → Clothing). Die GOOGLE-Kategorie
(`mm-google-shopping.google_product_category`, gepflegt von google_kategorie_fein/umzug) ist bei 38'344 davon schon feiner.
Die Shopify-Kategorie treibt den Filter «Kategorie», die Kategorie-Metafelder (shopify.color-pattern → Filter «Farbe»
nimmt nur bestimmte Kategorien an, siehe farbmuster_filter.py) und den Shop-Kanal.

REGEL (zwei unabhängige Signale müssen zusammenpassen, nie raten):
  1. Google-Name → Google-ID (Google-Taxonomie 2021-09-21) → Shopify-ID über Shopifys OFFIZIELLE Zuordnung
     (product-taxonomy from_shopify.yml, umgekehrt; flachster EINDEUTIGER Shopify-Knoten je Google-ID; mehrdeutig = nichts).
     Vorberechnet in automation/data/google_zu_shopify_kategorie.json (5'367 Google-Namen).
  2. NUR VERFEINERN: das Ziel muss ein NACHFAHRE der heutigen Kategorie sein (Typ-Signal und Google-Signal einig über die
     Oberklasse). Anderer Zweig = Google- oder Typ-Fehler → nicht anfassen (Zähler im Bericht; google_kategorie_umzug.py
     ist für falsche Google-Zweige zuständig).
  3. TITELPROBE für Ziele, bei denen die Google-Kategorie nachweislich danebenlag (Stichprobe 06.10., 4 je Ziel):
     «Blauer A-Linien-Rock» → Dresses, «Rad-Sicherheitslampe»/«Moskitonetz»/«Sicherheitshelm» → Fitness-Geräte.
     Diese Ziele verlangen ein passendes Wort im Titel; sonst bleibt die Oberklasse (grob ist besser als falsch).
  4. Ziel-IDs werden vor dem Schreiben per nodes(ids:) gegen die Taxonomie DES SHOPS geprüft (die Karte stammt aus
     2026-11-unstable) — unbekannte IDs werden übersprungen.
DRY (Standard) misst und zeigt Stichproben; SCHARF=1 schreibt (25 aliasierte productUpdate je Anfrage, Eimer-Etikette,
Rücklesen aus der Antwort), Ledger dropship/_kategorie_fein.tsv, Bericht dropship/KATEGORIE-FEIN.md. Täglich im Aufseher
(CAP je Lauf) — erfasst auch Neuimporte, sobald deren Google-Kategorie fein ist.

  python3 automation/kategorie_fein.py              # Trockenlauf (frischer Export, wenn > 6 h alt)
  SCHARF=1 CAP=30000 python3 automation/kategorie_fein.py
  python3 automation/kategorie_fein.py --selbsttest
"""
import collections, datetime, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
KARTE = os.path.join(HIER, "data", "google_zu_shopify_kategorie.json")
EXPORT = "/tmp/kategorie_fein_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_kategorie_fein.tsv")
BERICHT = os.path.join(REPO, "dropship", "KATEGORIE-FEIN.md")
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "3000"))
TC = "gid://shopify/TaxonomyCategory/"

# Ziel-Endung (letzter Teil des Shopify-Namens) → Pflichtwort im Titel. Wortfallen deutsch denken (Lehre 9b).
TITELPROBE = {
    "Dresses": r"kleid(?!er-?(?:organizer|bügel|sack|schrank|ständer|stange))|dress\b|(?<!nacht)(?<!garde)(?<!bade)robe\b|abaya|kaftan|cheongsam|qipao",
    "Skirts": r"\brock\b|röck|\w+rock\b|jupe|\bskirt|skort",
    "Pants": r"hose|jeans|leggings|chino|jogger|pants\b|culotte|palazzo|capri|trouser|pantalon",
    "Shorts": r"shorts|kurze hose|bermuda|hotpants",
    "Clothing Tops": r"shirt|top\b|bluse|hemd|pullover|pulli|hoodie|sweat|strick|cardigan|tunika|polo|tanktop|oberteil|body\b|crop|kapuze|rollkragen",
    "Coats & Jackets": r"jacke|mantel|parka|blazer|sakko|jackett|anorak|windbreaker|trenchcoat|daunen|steppjacke|coat\b|cape\b|poncho|blouson",
    "Vests": r"weste|gilet|\bvest\b",
    "Jumpsuits & Rompers": r"jumpsuit|overall|romper|einteiler|latzhose|playsuit",
    "Activewear": r"sport|yoga|fitness|lauf|training|gym|radler|radhose|leggings",
    "Swimwear": r"bikini|badeanzug|badehose|bade|swim|tankini|monokini|burkini|cover-?up|facekini|strand",
    "Fitness & General Exercise Equipment": r"fitness|hantel|yoga|widerstand|expander|springseil|trainings|gymnastik|bauchtrainer|klimmzug|reck\b|liegestütz|balance|massage-?ball|faszien|stepper|kettlebell|gewicht|sprossenwand|sit-?up|ab-?roller|pilates",
    "Throw Pillows": r"kissen|polster|pillow",
    "Backpacks": r"rucksack|backpack|daypack|ranzen",
    "Rings": r"\bring\b|ringe\b|\w+ring\b(?<!ohrring)(?<!schlüsselring)",
    "Necklaces": r"halskette|kette|kettchen|collier|anhänger|pendant|necklace|choker|halsband(?!.*(?:hund|katze))",
    "Bracelets": r"armband(?!uhr)|armbänd|armreif|armkette|bracelet|fusskettchen|armspange",
    "Earrings": r"ohrring|ohrstecker|creolen|ohrh[äa]nger|ohrhaken|ohrclip|ear\s?cuff|ohrklemme|hoops?\b|huggie",
}
# Grundsätzlich nie verfeinern (Google-Kategorie auf Sammelbegriffen unzuverlässig, gemessen 06.10.)
NIE = set()


def norm(s):
    return (s or "").lower().replace("ß", "ss")


def titel_ok(ziel_name, titel):
    letzte = ziel_name.split(" > ")[-1]
    m = TITELPROBE.get(letzte)
    return True if m is None else bool(re.search(m, norm(titel)))


# 07.10.2026 23:30: Shopifys offizielle Zuordnung ist für diese Google-Klassen MEHRDEUTIG (darum fehlen sie in der Karte) —
# gemessen 3'810 «keine Zuordnung», davon 2'761 Uhren. Geprüfte Ergänzung (Shopify-IDs per taxonomy-Suche bestätigt).
ZUSATZ = {
    # 08.10.2026 («ordne alles sauber ein»): 13 Produkte zählten «keine-zuordnung» — Shopifys Tabelle kennt diese Google-Blätter
    # nicht, die Shop-Taxonomie hat die Klasse aber (IDs per cats.txt geprüft). Paintball & Airsoft bleibt bewusst offen.
    "Sporting Goods > Outdoor Recreation > Boating & Water Sports > Boating & Water Sport Apparel > Water Sport Helmets": "sg-4-1-12-2",
    "Sporting Goods > Outdoor Recreation > Camping & Hiking > Navigational Compasses": "sg-4-2-10",
    "Sporting Goods > Athletics > Baseball & Softball > Pitching Machines": "sg-1-2-12",
    "Sporting Goods > Athletics > Boxing & Martial Arts > Boxing & Martial Arts Training Equipment > Boxing & MMA Punch Mitts": "sg-1-4-2-1",
    "Arts & Entertainment > Party & Celebration > Party Supplies > Drinking Games > Beer Pong": "ae-3-2-10",
    "Sporting Goods > Athletics > General Purpose Athletic Equipment > Athletic Cups": "sg-1-13-2",
    "Electronics > Electronics Accessories > Computer Components > Storage Devices > Floppy Drives": "el-7-9-14",
    "Home & Garden > Lawn & Garden > Outdoor Living > Hammock Parts & Accessories": "hg-12-2-3",
    "Sporting Goods > Outdoor Recreation > Golf > Golf Clubs": "sg-4-7-9",
    "Vehicles & Parts > Vehicle Parts & Accessories > Vehicle Safety & Security > Vehicle Safety Equipment": "vp-1-6-4",
    "Apparel & Accessories > Clothing > Activewear > Hunting Clothing > Hunting & Fishing Vests": "aa-1-1-8-1",
    "Apparel & Accessories > Clothing > Activewear > Motorcycle Protective Clothing > Motorcycle Jackets": "vp-1-6-1",
    "Apparel & Accessories > Jewelry > Watches": "aa-6-11",
    "Apparel & Accessories > Clothing > One-Pieces > Jumpsuits & Rompers": "aa-1-9",
    "Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Apparel": "ap-2-6",
    "Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Apparel": "ap-2-6",
    "Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Beds": "ap-2-9",
    "Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Beds": "ap-2-9",
    "Apparel & Accessories > Clothing Accessories > Hats": "aa-2-17",
    "Home & Garden > Decor > Chair & Sofa Cushions": "hg-3-15",
    "Health & Beauty > Personal Care > Cosmetics > Skin Care > Lotion & Moisturizer": "hb-3-2-9-10",
    "Apparel & Accessories > Clothing Accessories > Scarves & Shawls > Scarves": "aa-2-26",
    "Apparel & Accessories > Clothing Accessories > Scarves & Shawls > Shawls": "aa-2-26",
    "Apparel & Accessories > Clothing > Skirts > Mini Skirts": "aa-1-15",
    "Apparel & Accessories > Clothing > Skirts > Long Skirts": "aa-1-15",
    "Apparel & Accessories > Clothing > Skirts > Knee-Length Skirts": "aa-1-15",
    "Sporting Goods > Outdoor Recreation > Cycling > Bicycle Accessories > Bicycle Bags & Panniers": "sg-4-4-1",
    "Home & Garden > Lawn & Garden > Outdoor Living > Hammocks": "hg-12-2-4",
    "Apparel & Accessories > Clothing > Underwear & Socks > Bras": "aa-1-8",
    "Apparel & Accessories > Clothing > Underwear & Socks > Underwear": "aa-1-8",
    "Sporting Goods > Outdoor Recreation > Equestrian > Riding Apparel & Accessories > Equestrian Helmets": "sg-4-5-5-2",
    "Sporting Goods > Exercise & Fitness > Weight Lifting > Weight Lifting Belts": "sg-2-24-3",
    "Sporting Goods > Exercise & Fitness > Weight Lifting > Weight Lifting Machine & Exercise Bench Accessories": "sg-2-24",
    "Apparel & Accessories > Clothing > Activewear > Bicycle Activewear": "aa-1-1",
    "Sporting Goods > Outdoor Recreation > Camping & Hiking > Tent Accessories > Tent Poles & Stakes": "sg-4-2-16",
    "Electronics > Audio > Audio Players & Recorders > MP3 Players": "el-2-3",
    "Electronics > Audio > Audio Players & Recorders > CD Players & Recorders": "el-2-3",
    "Baby & Toddler > Potty Training > Potty Seats": "bt-11",
    "Apparel & Accessories > Clothing Accessories > Hair Accessories > Hair Pins, Claws & Clips > Hair Claws & Clips": "aa-2-14-6",
    "Apparel & Accessories > Clothing Accessories > Hair Accessories > Hair Pins, Claws & Clips > Barrettes": "aa-2-14-6",
    "Toys & Games > Toys > Musical Toys > Toy Instruments": "tg-5-13",
}
# Gleichwertige Shopify-Klassen je Google-Klasse (Google kennt keine Smartwatch-/Armband-Unterklasse; uhren_fein.py setzt sie).
GLEICHWERTIG = {"Apparel & Accessories > Jewelry > Watches": ("aa-6-12", "aa-6-10"),
                # Drohnen: Google hat keine Klasse, Shopify «Flying Toys > Drones» (rc_fein.py setzt es)
                "Toys & Games > Toys > Remote Control Toys": ("tg-5-12-2",),
                # Kinderkleidung: Google regelt das Alter über age_group, Shopify hat eigene Kinder-Klassen (aa-1-25-*)
                "Apparel & Accessories > Clothing > Outfit Sets": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Shirts & Tops": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Dresses": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Swimwear": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Pants": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Shorts": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets": ("aa-1-25",),
                "Apparel & Accessories > Clothing > Sleepwear & Loungewear": ("aa-1-25",)}


def ziel_fuer(cat_id, google_name, karte):
    """(ziel_id | None, grund) — reine Logik ohne Netz, für Selbsttest und Lauf."""
    if not google_name:
        return None, "kein-google"
    if any(cat_id == x or cat_id.startswith(x + "-") for x in GLEICHWERTIG.get(google_name, ())):
        return None, "gleich"
    sid = karte.get(google_name) or ZUSATZ.get(google_name)
    if not sid:
        return None, "keine-zuordnung"
    if sid == cat_id:
        return None, "gleich"
    if cat_id.startswith(sid + "-"):
        return None, "shopify-feiner"   # 07.10.: Shopify ist eine Unterklasse der Google-Zuordnung = einig (Drohnen, Diffuser)
    if not sid.startswith(cat_id + "-"):
        return None, "anderer-zweig"
    return sid, "verfeinern"


# 07.10.2026 (Betreiber «verbessere katalog und fein katalog»): KREUZ = erlaubte Zweigwechsel, wenn GOOGLE und ein
# eindeutiges TITELWORT übereinstimmen und die Shopify-Kategorie nachweislich zu grob/falsch ist. GEMESSEN: 504 Umhänge-/
# Schulter-/Crossbody-Taschen und 115 Geldbörsen standen in Shopify unter «Luggage & Bags» (lb), Google sagt Handbags/Wallets.
# (heutige Shopify-ID, Ziel-ID) → Pflichtwort im Titel. Alles andere bleibt «anderer-zweig» (nie raten).
KREUZ = {
    ("lb", "aa-5-4"): re.compile(r"^(?!.*(?:motorrad|fahrrad|velo|bike|roller|pferd|sattel))"   # 07.10.: «Motorrad-Satteltasche»
                                 r".*(?:handtasche|umh[äa]nge|schultertasche|crossbody|clutch|abendtasche|\btote\b|shopper|"
                                 r"henkeltasche|beuteltasche|baguette|hobo|bucket|sling|brusttasche|brustbeutel|kreuzbody|einzeltrage|one-shoulder|schulterbeutel)", re.I),
    ("lb", "aa-5-5"): re.compile(r"geldb[öo]rse|portemonnaie|portmonee|brieftasche|\bwallet\b|kartenetui|kartenhalter|geldklammer", re.I),
    # 07.10.2026 22:45 («super mache mehr»): 225 Bettwaren/Handtücher standen in Shopify unter «Decor» (hg-3), Google sagt Bedding/Towels.
    ("hg-3", "hg-15-1-9"): re.compile(r"^(?!.*(kissen-?hülle|kissenhülle|kissen-?bezug|kissenbezug|bezug für|sofa|deko|zier|auto|sitz))"
                                      r".*(kopfkissen|nackenkissen|nackenstütz|schlafkissen|beinkissen|reisekissen|memory|latex|kissen\b)", re.I),
    ("hg-3", "hg-15-1-4"): re.compile(r"^(?!.*(tisch|wand|teppich)).*(decke\b|kuscheldecke|wolldecke|fleecedecke|plaid|überwurf|\bdecke)", re.I),
    ("hg-3", "hg-15-1-5"): re.compile(r"bettwäsche|bettbezug|bett-?set|duvet|bettdeckenbezug", re.I),
    ("hg-3", "hg-15-4-1"): re.compile(r"handt[uü]ch|badet[uü]ch|duscht[uü]ch|strandt[uü]ch|waschlappen", re.I),
}
# 07.10.2026 23:00 («super mache mehr»): Shopify «Electronics» (el) ist das grobe Typ-Signal für alles mit Akku/USB; Google kennt
# die Ware (Ventilator, Wecker, Staubsauger, Massagegerät …). Zweigwechsel nur mit Pflichtwort; vage Ziele (Toys, Baby,
# Fahrzeugteile) bleiben bewusst draussen.
_EL = {
    "hg-9-1-6": r"^(?!.*(ps5|ps4|xbox|raspberry|gehäuse|reinigungsspray|\bpc\b|cpu|laptop|notebook|kühler)).*(ventilator|lüfter|\bfan\b)",
    "hg-9-1-9": r"luftbefeucht|befeuchter|humidifier",
    "hg-9-1-2": r"luftreiniger|air purifier",
    "hg-9-1-12": r"^(?!.*radiator-?thermostat).*(heizgerät|heizlüfter|heizer\b|radiator|heater)",
    "hg-3-17": r"^(?!.*(ladestation|lautsprecher|speaker)).*(uhr\b|wecker|wanduhr|uhren\b|tischuhr)",
    "hg-9-10": r"^(?!.*(akku|aufsatz|filter|ersatz|zubehör)).*(staubsauger|saugroboter|handsauger|nass-?trocken-?sauger)",
    "hb-3-11": r"^(?!.*powerbank).*(massage|massager|massierer)",
    "hb-3-12": r"zahnbürste|munddusche|flosser|zahnreinig",
    "hb-3-14-7": r"haarentfern|epilier|nasenhaar|rasierer",
    "hb-3-14-6": r"haarschneider|clipper|trimmer",
    "hg-13": r"^(?!.*(mit\s+(\w+\s+)?licht|&\s*licht|und\s+licht|licht\s*(&|und)|roboter|dinosaurier|eisenbahn|auto\b|modell|kabel|pumpe|sterilisator|alarmanlage|selfie|stativ|ps5|nivellier|karussell|selbstauslöser|beauty-licht)).*(licht\b|lampe|leuchte|lichtleiste|projektionslicht)",
    "hg-13-10": r"projektor|nachtlicht|sternen|galaxy",
    "hg-2": r"türklingel|überwachung|alarm|sicherheitskamera",
    "hg-2-3": r"sensor",
    "hg-3-39": r"^(?!.*(locken|haar|well)).*(diffuser|diffusor|aroma)",
    "hg-11-7": r"blender|mixer|entsafter|saftpresse|smoothie",
    "co-1-4-17": r"stativ|gimbal|selfie",
    "co": r"^(?!.*(detektor|detector)).*(kamera|camera|objektiv|fernglas|teleskop|mikroskop|lupe|nachtsicht)",
    "tg-5-21": r"roboter|robot",
    "tg-5-7": r"bauklotz|bausatz|\bmoc\b|bausteine|bauklötze",
    "ha-15-30": r"feuerzeug",
    "ae-2-8": r"gitarre|trommel|verstärker|klavier|keyboard|ukulele|kalimba",
    "tg-5-15": r"modellauto|spielzeugauto|rennwagen",
}
KREUZ.update({("el", z): re.compile(m, re.I) for z, m in _EL.items()})
# Google ist hier schon die feine Tier-Klasse (Dog Apparel/Beds …); Shopify führt Tierkleidung/-betten tierübergreifend.
KREUZ.update({(von, nach): re.compile(r".", re.I) for von in ("ap-2", "ap-2-2", "ap-2-3", "ap") for nach in ("ap-2-6", "ap-2-9")})
KREUZ[("sg", "hg-12-2-4")] = re.compile(r"hängematte|hammock", re.I)
# 08.10.2026 («ordne alles sauber ein»): Wassersport-Helme stehen in Shopify unter «Apparel», Shopify führt sie unter «Protective
# Gear»; Motorrad-Protektorenjacken unter «Activewear», Shopify hat «Motorcycle Protective Gear».
KREUZ[("sg-4-1-2", "sg-4-1-12-2")] = re.compile(r"helm", re.I)
KREUZ[("aa-1-1", "vp-1-6-1")] = re.compile(r"motorrad|motorcycle", re.I)
KREUZ[("hb-3-2-9", "hb-3-2-5-3")] = re.compile(r"gerät|apparat|instrument|lift|roller|maske|bürste|stein", re.I)
KREUZ[("hb-3-2-9", "hb-3-2-5-3-6")] = re.compile(r"roller|stein", re.I)
for _von in ("aa-1", "tg-5", "ap", "aa-2"):
    KREUZ[(_von, "aa-2-17")] = re.compile(r"hut\b|hüte|mütze|\bcap\b|kappe|beanie|fischerhut|sonnenhut", re.I)


def kreuz_ziel(cat_id, google_name, karte, titel):
    sid = karte.get(google_name or "") or ZUSATZ.get(google_name or "")
    rx = KREUZ.get((cat_id, sid))
    return sid if rx and rx.search(titel or "") else None


def export_holen():
    from kaufwille_zeile import gql
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 6 * 3600:
        return
    q = ('{ products(query:"status:active") { edges { node { id title category { id fullName } '
         'metafield(namespace:"mm-google-shopping", key:"google_product_category") { value } } } } }')
    b = gql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}", {"q": q})["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise SystemExit(f"Bulk: {b['userErrors']}")
    bid = b["bulkOperation"]["id"]
    for _ in range(240):
        time.sleep(15)
        s = gql("query($i:ID!){node(id:$i){... on BulkOperation{status url objectCount errorCode}}}", {"i": bid})["node"]
        if s["status"] == "COMPLETED":
            if not s["url"]:
                open(EXPORT, "w").close(); return
            urllib.request.urlretrieve(s["url"], EXPORT + ".teil"); os.replace(EXPORT + ".teil", EXPORT)
            print(f"  Export {s['objectCount']} Produkte"); return
        if s["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {s['status']} {s['errorCode']}")
    raise SystemExit("Bulk: Zeitüberschreitung")


def ledger():
    erledigt = set()
    if os.path.exists(LEDGER):
        for l in open(LEDGER, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 3 and t[1] in ("gesetzt", "fehler"):
                erledigt.add((t[0], t[2]))
    return erledigt


def ids_pruefen(ids):
    from kaufwille_zeile import gql
    ok = set(); ids = sorted(ids)
    for i in range(0, len(ids), 200):
        r = gql("query($i:[ID!]!){nodes(ids:$i){... on TaxonomyCategory{id}}}", {"i": [TC + x for x in ids[i:i + 200]]})
        ok |= {n["id"].split("/")[-1] for n in r["nodes"] if n}
    return ok


def schreiben(charge):
    from kaufwille_zeile import gql
    teile, var = [], {}
    for i, (pid, sid) in enumerate(charge):
        teile.append(f'p{i}: productUpdate(product:{{id:"{pid}", category:"{TC}{sid}"}}){{product{{id category{{id}}}} userErrors{{message}}}}')
    r = gql("mutation{" + " ".join(teile) + "}")
    aus = []
    for i, (pid, sid) in enumerate(charge):
        x = r.get(f"p{i}") or {}
        cat = ((x.get("product") or {}).get("category") or {}).get("id", "")
        aus.append((pid, sid, "gesetzt" if cat.endswith("/" + sid) else "fehler", "; ".join(e["message"] for e in x.get("userErrors") or [])[:120]))
    return aus


def main():
    karte = json.load(open(KARTE, encoding="utf-8"))["karte"]
    export_holen()
    erledigt = ledger()
    stat = collections.Counter(); plan = []; probe_weg = collections.Counter(); bsp = collections.defaultdict(list)
    for l in open(EXPORT, encoding="utf-8"):
        p = json.loads(l)
        cat = p.get("category")
        if not cat:
            stat["ohne-kategorie"] += 1; continue
        cid = cat["id"].split("/")[-1]
        g = (p.get("metafield") or {}).get("value")
        sid, grund = ziel_fuer(cid, g, karte)
        if not sid and grund == "anderer-zweig":
            sid = kreuz_ziel(cid, g, karte, p["title"])
            if sid:
                stat["kreuz"] += 1
        if not sid:
            stat[grund] += 1; continue
        if (p["id"], sid) in erledigt:
            # 08.10.2026: geschrieben UND wieder grob = jemand setzt zurück. GEMESSEN 363/432 Printful-Produkte (SKU «9000…_…»)
            # + 6 LX, aber nur 53/23'053 CJ — keines unserer Werkzeuge schreibt diese Werte (Ledger/Logs geprüft), Verdacht:
            # Printful-Sync setzt seine Grobklasse. Nicht erneut schreiben (Hin und Her), sondern sichtbar zählen.
            stat["rueckfall-grob" if sid.startswith(cid + "-") else "schon-im-ledger"] += 1; continue
        if not titel_ok(g, p["title"]):
            stat["titelprobe-nein"] += 1; probe_weg[g.split(" > ")[-1]] += 1
            if len(bsp["nein"]) < 10: bsp["nein"].append((p["title"][:60], g.split(" > ")[-1]))
            continue
        plan.append((p["id"], sid, p["title"], cat["fullName"], g))
    gueltig = ids_pruefen({x[1] for x in plan}) if plan else set()
    unbekannt = collections.Counter(x[1] for x in plan if x[1] not in gueltig)
    plan = [x for x in plan if x[1] in gueltig]
    stat["verfeinern"] = len(plan)
    ziele = collections.Counter(x[4].split(" > ", 1)[-1] for x in plan)
    print("Stand:", dict(stat))
    if unbekannt:
        print("Ziel-IDs nicht in der Shop-Taxonomie (übersprungen):", dict(unbekannt))
    for k, n in ziele.most_common(12):
        print(f"  {n:6} → {k}")
    gesetzt = fehler = 0
    if SCHARF and plan:
        # 3 parallele Chargen wie kategorie_wache.py (gemessen 23.09.: 25 aliasierte productUpdate laufen bei Shopify seriell,
        # ein Worker ~100/min; 3 Worker ~75 Punkte/s, die Eimer-Etikette in gql() bremst jeden selbst).
        import threading
        from concurrent.futures import ThreadPoolExecutor
        os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
        sperre = threading.Lock(); chargen = [plan[i:i + 25] for i in range(0, min(len(plan), CAP), 25)]
        led = open(LEDGER, "a", encoding="utf-8")
        def eine(ch):
            nonlocal gesetzt, fehler
            try:
                aus = schreiben([(x[0], x[1]) for x in ch])
            except Exception as e:
                print(f"  Charge abgebrochen: {type(e).__name__} {str(e)[:100]}", flush=True); return
            with sperre:
                for pid, sid, st, err in aus:
                    led.write(f"{pid}\t{st}\t{sid}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{err}\n")
                    gesetzt += st == "gesetzt"; fehler += st == "fehler"
                led.flush()
                if (gesetzt + fehler) % 1000 < 25:
                    print(f"  … {gesetzt + fehler}/{min(len(plan), CAP)} · gesetzt {gesetzt} · fehler {fehler}", flush=True)
        with ThreadPoolExecutor(max(1, int(os.environ.get("WORKER", "3")))) as ex:
            list(ex.map(eine, chargen))
        led.close()
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Feinkategorie (automatisch, {datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC)\n\n"
                f"Werkzeug `automation/kategorie_fein.py` — Regel im Kopf der Datei. {'SCHARF' if SCHARF else 'TROCKEN'}.\n\n"
                f"| Zustand | Produkte |\n|---|---:|\n" + "".join(f"| {k} | {v} |\n" for k, v in sorted(stat.items(), key=lambda kv: -kv[1])) +
                (f"| **geschrieben** | {gesetzt} (Fehler {fehler}) |\n" if SCHARF else "") +
                "\n## Ziele (dieser Lauf)\n\n" + "".join(f"- {n} → {k}\n" for k, n in ziele.most_common(30)) +
                "\n## Titelprobe hat abgelehnt (bleibt grob)\n\n" + "".join(f"- {n} × {k}\n" for k, n in probe_weg.most_common(15)) +
                "".join(f"  - «{t}» → {z}\n" for t, z in bsp["nein"]))
    print(f"KATEGORIE-FEIN: {len(plan)} verfeinerbar{f' · gesetzt {gesetzt} · fehler {fehler}' if SCHARF else ' (TROCKEN)'} · "
          f"anderer Zweig {stat['anderer-zweig']} · Titelprobe nein {stat['titelprobe-nein']}")
    return 0


def kreuz_test():
    k = {"Apparel & Accessories > Handbags, Wallets & Cases > Handbags": "aa-5-4",
         "Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips": "aa-5-5"}
    H, W = list(k)
    karte = dict(k, **{"Home & Garden > Linens & Bedding > Bedding > Pillows": "hg-15-1-9",
                       "Home & Garden > Linens & Bedding > Bedding > Blankets": "hg-15-1-4",
                       "Home & Garden > Linens & Bedding > Towels > Bath Towels & Washcloths": "hg-15-4-1"})
    t = [
        (kreuz_ziel("hg-3", "Home & Garden > Linens & Bedding > Bedding > Pillows", karte, "Memory Foam Nackenkissen U-Form") == "hg-15-1-9", "Nackenkissen Decor→Pillows"),
        (kreuz_ziel("hg-3", "Home & Garden > Linens & Bedding > Bedding > Pillows", karte, "Sofakissenhülle mit Quasten") is None, "Kissenhülle bleibt Decor"),
        (kreuz_ziel("hg-3", "Home & Garden > Linens & Bedding > Bedding > Blankets", karte, "Retro-Strickdecke mit Tigermotiv") == "hg-15-1-4", "Strickdecke→Blankets"),
        (kreuz_ziel("hg-3", "Home & Garden > Linens & Bedding > Towels > Bath Towels & Washcloths", karte, "Drei-Pack reine Baumwollhandtücher") == "hg-15-4-1", "Handtücher→Towels"),(kreuz_ziel("lb", H, k, "Cord Canvas Schulter- und Umhängetasche") == "aa-5-4", "Umhängetasche lb→Handbags"),
         (kreuz_ziel("lb", W, k, "Herren-Geldbörse aus Rindsleder") == "aa-5-5", "Geldbörse lb→Wallets"),
         (kreuz_ziel("lb", H, k, "Marco Laiden Business Bag") is None, "ohne Pflichtwort bleibt"),
         (kreuz_ziel("el", H, k, "Umhängetasche") is None, "nur aus lb"),
         (kreuz_ziel("lb", H, k, "Motorrad-Satteltasche 20L") is None, "Fahrzeugtasche bleibt"),
         (kreuz_ziel("lb", H, k, "Anti-Diebstahl Brusttasche für Herren") == "aa-5-4", "Brusttasche lb→Handbags"),
         (kreuz_ziel("lb", H, k, "Isolierte Outdoor-Tasche · 28×22×40cm") is None, "Kühltasche bleibt")]
    for ok, n in t: print(("✓ " if ok else "✗ ") + n)
    return all(o for o, _ in t)


def selbsttest():
    k = {"Apparel & Accessories > Clothing > Dresses": "aa-1-4", "Apparel & Accessories > Clothing": "aa-1",
         "Home & Garden > Decor": "hg-3", "Animals & Pet Supplies > Pet Supplies > Pet Leashes": "ap-2-1-9"}
    t = [
        (ziel_fuer("aa-1", "Apparel & Accessories > Clothing > Dresses", k) == ("aa-1-4", "verfeinern"), "verfeinert Nachfahre"),
        (ziel_fuer("aa-1", "Apparel & Accessories > Clothing", k)[1] == "gleich", "gleich bleibt"),
        (ziel_fuer("el", "Home & Garden > Decor", k)[1] == "anderer-zweig", "anderer Zweig nie"),
        (ziel_fuer("aa-1-4", "Apparel & Accessories > Clothing", k) == (None, "shopify-feiner"), "nie gröber"),
        (ziel_fuer("aa-1", None, k)[1] == "kein-google", "ohne Google"),
        (ziel_fuer("aa-1", "Unbekannt > X", k)[1] == "keine-zuordnung", "unbekannter Name"),
        (ziel_fuer("ap-2", "Animals & Pet Supplies > Pet Supplies > Pet Leashes", k)[0] == "ap-2-1-9", "Präfix mit Bindestrich"),
        (ziel_fuer("ap-2-1", "Animals & Pet Supplies > Pet Supplies > Pet Leashes", {"Animals & Pet Supplies > Pet Supplies > Pet Leashes": "ap-2-10"})[1] == "anderer-zweig", "ap-2-1 ≠ Präfix von ap-2-10"),
        (not titel_ok("A > Clothing > Dresses", "Blauer A-Linien-Rock"), "Kanarie: Rock ≠ Kleid"),
        (titel_ok("A > Clothing > Dresses", "Elegantes V-Ausschnitt-Kleid"), "Kleid ok"),
        (not titel_ok("A > Clothing > Dresses", "Kleider-Organizer für den Schrank"), "Kanarie: Kleider-Organizer"),
        (titel_ok("A > Clothing > Skirts", "Leopardenmuster Meerjungfrauen-Rock mit hoher Taille"), "Rock ok"),
        (not titel_ok("S > Fitness & General Exercise Equipment", "Rad-Sicherheitslampe"), "Kanarie: Velolampe ≠ Fitness"),
        (not titel_ok("S > Fitness & General Exercise Equipment", "Moskitonetz mit UV-Schutz"), "Kanarie: Moskitonetz"),
        (titel_ok("S > Fitness & General Exercise Equipment", "Multifunktionaler Türreck für Fitness zuhause"), "Fitness ok"),
        (not titel_ok("A > Jewelry > Rings", "Ohrring Set Gold"), "Kanarie: Ohrring ≠ Ring"),
        (titel_ok("A > Jewelry > Rings", "Herzring aus Titanstahl"), "Herzring ok"),
        (not titel_ok("A > Jewelry > Bracelets", "Damen Armbanduhr Quarz"), "Kanarie: Armbanduhr ≠ Armband"),
        (titel_ok("H > Decor > Throw Pillows", "Samt Kugel Kissen"), "Kissen ok"),
        (titel_ok("A > Clothing > Dresses", "Figurbetonter Tubedress mit Schlitz"), "Tubedress ok"),
        (titel_ok("A > Jewelry > Earrings", "Elegante S925 Silber Ohrclips"), "Ohrclips ok"),
        (titel_ok("A > Clothing > Pants", "Freizeit-Sweatpants für Herren"), "Sweatpants ok"),
        (not titel_ok("A > Jewelry > Necklaces", "Goldener Armband · Damen"), "Kanarie: Armband ≠ Halskette"),
        # 08.10.2026: Wortlücken aus der Titelprobe-Ablehnung (233) — Röckchen, Partnerarmbänder, Blouson, Trouser, Vest, Pillow
        (titel_ok("A > Clothing > Skirts", "Pink-Lace-Röckchen"), "Röckchen ok"),
        (titel_ok("A > Jewelry > Earrings", "Fächerförmige Doppelstreifen Huggie Hoops"), "Hoops ok"),
        (titel_ok("A > Jewelry > Necklaces", "Elegantes Kreuzkettchen"), "Kettchen ok"),
        (titel_ok("A > Jewelry > Bracelets", "Tiger Eye Partnerarmbänder aus mattem Achat"), "Armbänder ok"),
        (titel_ok("A > Clothing > Pants", "Retro-Herren-Trouser"), "Trouser ok"),
        (titel_ok("A > Clothing > Outerwear > Vests", "Strapless-Vest · Damen"), "Vest ok"),
        (not titel_ok("A > Clothing > Outerwear > Vests", "Investment-Buch"), "Kanarie: Investment ≠ Vest"),
        (not titel_ok("A > Clothing > Dresses", "Durchsichtige Nachtrobe"), "Kanarie: Nachtrobe ≠ Kleid"),
        (not titel_ok("A > Clothing > Dresses", "Garderobe mit Spiegel"), "Kanarie: Garderobe ≠ Kleid"),
        (titel_ok("A > Clothing > Dresses", "Elegante Damenrobe mit Taillenweite"), "Damenrobe ok"),
        (titel_ok("X > Unbekannt", "irgendwas"), "ohne Probe frei"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}"); return 0 if ok == len(t) else 1


if __name__ == "__main__":
    if "--kreuz-test" in sys.argv:
        sys.exit(0 if kreuz_test() else 1)
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(main())
