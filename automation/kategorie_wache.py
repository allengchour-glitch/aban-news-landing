#!/usr/bin/env python3
"""kategorie_wache.py — setzt die Shopify-Produktkategorie (Standard-Taxonomie) für aktive Produkte, die keine haben.

GEMESSEN 23.09.2026 (Task #101): die App «Shop» (Shop-Kanal) meldete 33'863 aktive Produkte «Dieses Produkt ist in
Shop nicht auffindbar. Prüfe den Angebotsstatus im Shop-Kanal». Vergleich 250 Produkte mit/ohne Meldung: EINZIGES
Unterscheidungsmerkmal `category` — 222/222 mit Meldung OHNE Kategorie, 0/28 ohne Meldung. Neueste 3'000 aktive:
2'923 ohne Kategorie, alle `cj-real` (die Importer setzen `productType`, aber keine Taxonomie-Kategorie). Der alte
Zuweiser (google_category_assign.py, 30.08.) kannte die neuen Typen nicht (Haustierbedarf, Make-up, Küche & Bar,
Aufbewahrung & Organizer, Kinderschuhe, Nageldesign, Spass-Elektronik, Basteln & DIY …) und lief nur von Hand.

REGEL: productType → Taxonomie-ID (Tabelle unten, IDs am 23.09. per `taxonomy.categories(search:)` gemessen und beim
Start per `nodes(ids:)` verifiziert — eine unbekannte ID bricht den Lauf ab, bevor etwas geschrieben wird). Unbekannte
Typen werden NICHT geraten, sondern im Bericht gezählt. Schreiben in 25er-Mutationen (aliasiert), Eimer-Etikette nach
jeder Antwort, Rücklesen aus der Mutationsantwort (category.id == Ziel), Ledger je Handle. CAP begrenzt je Lauf
(Standard 3000); täglich im Aufseher, bis 0 offen. DRY (Standard) misst nur; SCHARF=1 schreibt.
Stand: dropship/_kategorie_stand.json (Ampel «KATEGORIE: N aktive ohne Kategorie»), Bericht dropship/KATEGORIE-WACHE.md.
"""
import datetime, json, os, sys, time, subprocess, collections, threading, fcntl
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf, bilanz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(ROOT, "dropship", "_kategorie_stand.json")
BERICHT = os.path.join(ROOT, "dropship", "KATEGORIE-WACHE.md")
LEDGER = os.path.join(ROOT, "dropship", "_kategorie_gesetzt.txt")
SHOP = "au3j0y-hq.myshopify.com"
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read() if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "3000"))
# 23.09. GEMESSEN: 25 aliasierte productUpdate je Anfrage laufen bei Shopify SERIELL (~0,5 s je Produkt, 15 s je
# Batch) — der Eimer (100 Punkte/s, 10 je productUpdate) war dabei zu 90 % leer. Ein Lauf schaffte 100/min, die
# 42'000 offenen haetten 7 h gebraucht — bei stuendlichen Container-Neustarts nie. WORKER parallele Batches
# (Standard 3 = ~75 Punkte/s, laesst dem Rest des Shops Luft; die Eimer-Etikette bremst jeden Worker selbst).
WORKER = max(1, int(os.environ.get("WORKER", "3")))
SPERRE = "/tmp/kategorie_wache.lock"   # zwei Laeufe (Aufseher taeglich + Nachlauf) schrieben sonst dieselben Produkte doppelt
TC = "gid://shopify/TaxonomyCategory/"

# productType → Taxonomie-ID. Oberklassen reichen dem Shop-Kanal; feiner ist besser, aber nie geraten.
TABELLE = {
    # Tiere
    "Haustierbedarf": "ap-2", "Haustier": "ap-2", "Haustier & Sommer": "ap-2",
    # Taschen
    "Taschen": "lb", "Tasche": "lb", "Rucksack": "lb", "Taschen & Reise": "lb", "Taschen & Accessoires": "lb",
    # Bekleidung
    "Damenmode": "aa-1", "Herrenmode": "aa-1", "Mode": "aa-1", "Damen-Mode": "aa-1", "Herren-Mode": "aa-1",
    "Kleid": "aa-1-4", "Damen-Kleid": "aa-1-4", "Shirt": "aa-1", "Damen-Top": "aa-1", "Damen-Set": "aa-1",
    "Blazer": "aa-1", "Cardigan": "aa-1", "Jacke": "aa-1", "Bluse": "aa-1", "Rock": "aa-1", "Shorts": "aa-1",
    "Damen-Hose": "aa-1", "Weste": "aa-1", "Jumpsuit": "aa-1", "Jeans": "aa-1", "Set": "aa-1", "Sport-Set": "aa-1",
    "Herren-Set": "aa-1", "Kindermode": "aa-1", "Unterwäsche": "aa-1", "Bademode": "aa-1",
    # Schuhe
    "Kinderschuhe": "aa-8", "Herrenschuhe": "aa-8", "Damenschuhe": "aa-8", "Sportschuhe": "aa-8", "Schuhe": "aa-8",
    "Sneaker": "aa-8", "Sandalen": "aa-8", "Sandalette": "aa-8", "Pumps": "aa-8", "Ballerina": "aa-8", "Slip-on": "aa-8",
    "Slides": "aa-8", "Herren-Schuhe": "aa-8", "Damen-Schuhe": "aa-8", "Damen-Sandalen": "aa-8", "Stiefel": "aa-8",
    # Schmuck & Uhren & Accessoires
    "Schmuck": "aa-6", "Damen-Schmuck": "aa-6", "Halskette": "aa-6-8", "Ohrringe": "aa-6", "Armband": "aa-6", "Ring": "aa-6",
    "Uhren": "aa-6-11", "Uhr": "aa-6-11", "Smartwatch": "aa-6-12",
    "Sonnenbrille": "aa-2-27", "Hut": "aa-2-17", "Sonnenhut": "aa-2-17", "Mütze": "aa-2-17", "Accessoires": "aa-2",
    "Kostüm": "aa-3-3", "Kostüme": "aa-3-3",
    # Beauty
    "Make-up": "hb-3-2-6", "Beauty": "hb-3-2-6", "Beauty & Pflege": "hb-3-2-6", "Nageldesign": "hb-3-2-7",
    "Beauty-Tools": "hb-3-2-5", "Beauty-Tool": "hb-3-2-5", "Hautpflege": "hb-3-2-9", "Haarpflege": "hb-3-10",
    "Wellness & Spa": "hb-3-11-9", "Wellness": "hb-3-11-9", "Aroma-Diffuser": "hb-3-11-9",
    # Wohnen
    "Wohnen & Deko": "hg-3", "Wohnen": "hg-3", "Deko": "hg-3", "Wohnaccessoire": "hg-3", "Schlafen & Wohnen": "hg-3",
    "Deko & Wohnaccessoires": "hg-3", "Vase": "hg-3-67", "Heimtextilien": "hg-15",
    "Aufbewahrung & Organizer": "hg-10-16", "Aufbewahrung": "hg-10-16", "Haushalt": "hg-10", "Haushalt & Hobby": "hg-10",
    "Wellness & Haushalt": "hg-10", "Beleuchtung": "hg-13", "Garten & Beleuchtung": "hg-13",
    "Küche & Bar": "hg-11", "Küche": "hg-11", "Küche & Haushalt": "hg-11", "Küchenhelfer": "hg-11-8",
    "Trinkflasche": "hg-11", "Trinkflaschen": "hg-11", "Bad": "hg-1", "Bad & Wellness": "hg-1",
    "Sommer & Kühlung": "hg-9", "Ventilator": "hg-9", "Gartenwerkzeug": "hg-12-1", "Garten & Pflanzen": "hg-12-1",
    "Outdoor": "sg", "Outdoor & Sommer": "sg", "Sport & Outdoor": "sg", "Reise & Outdoor": "lb", "Reise-Zubehör": "lb",
    "Grill-Zubehör": "hg-11", "Fitness": "sg",
    # Elektronik
    "Elektronik": "el", "Spass-Elektronik": "el", "Gadget": "el", "Gadgets": "el", "Tech": "el", "Tech-Gadget": "el",
    "Sommer-Gadget": "el", "Outdoor & Gadget": "el", "Handy-Zubehör": "el", "Audio": "el-2",
    # Sonstiges
    "Basteln & DIY": "ae-2-1", "Musikinstrumente": "ae-2-8", "Spielzeug & Spiele": "tg-5", "Spielzeug": "tg-5",
    "Auto-Zubehör": "vp-1", "Büro": "os", "Baby": "bt", "Partydeko": "ae-3-2",
    # Nachtrag 23.09. nach dem ersten Vollscan (4'181 unbekannt): IDs per taxonomy.categories(search:) gemessen.
    "Kostüme & Verkleidung": "aa-3-3", "Werkzeug & Heimwerken": "ha-15", "Gaming-Zubehör": "el-18",
    "Partydeko & Ballone": "ae-3-2", "Raucherzubehör": "hg-19", "3D-Druck": "el-13-2", "Süsswaren & Esswaren": "fb-2-3-1",
    "Haushalt & Wohnen": "hg-10", "Home & Living": "hg-3", "Wohnen & Dekoration": "hg-3", "Aufbewahrung & Ordnung": "hg-10-16",
    "Bügeltransfer": "ae-2-1", "Geschenkset": "hg-3",
    # bewusst NICHT geraten: "Trend-Produkt", "Kinder", "Schweizer Editionen", "Selbst gestalten", "Anime" → Bericht.
}

# 23.09. Verbesserungs-Audit (Gegenpruefung bestaetigt): SAMMEL-Typen sind kein Warenbegriff. «Trend-Gadget» stand
# pauschal auf Electronics (818 Stueck, darunter Pluesch-Elefant, Yogamatte, Kinderkleid, Hundeleine), «Spass-Elektronik»
# auf Electronics (554 davon Klemmbausteine/3D-Holzpuzzles), «Aufbewahrung & Organizer» auf Storage (1'271 ohne
# Ordnungswort: Wasserkocher, Saugroboter, Barhocker). Fuer diese Typen entscheidet jetzt der TITEL; passt keine
# Regel, wird NICHT geraten (Produkt bleibt ohne Kategorie und steht im Bericht).
SAMMELTYPEN = {"Trend-Gadget", "Spass-Elektronik", "Gadget", "Gadgets", "Aufbewahrung & Organizer", "Aufbewahrung",
               "Aufbewahrung & Ordnung", "Geschenkset", "Haushalt & Wohnen", "Home & Living", "Wohnen & Dekoration",
               "Sommer-Gadget", "Outdoor & Gadget", "Tech-Gadget", "Haushalt", "Haushalt & Hobby"}
import re as _re
TITELREGELN = [   # Reihenfolge = Vorrang; Wortfallen (Lehre 9b): Handschuh ≠ Schuh, Armbanduhr ≠ Armband, Schale ≠ Schal
    (r"\b(rc|ferngesteuert\w*|drohne\w*|quadcopter)\b", "el"),
    (r"baustein|bausatz|baukasten|bauklötz|klemmbaustein|modellbau", "tg-5-7"),
    (r"puzzle", "tg-4"),
    (r"plüsch|kuscheltier|stofftier", "tg-5-8-11"),
    (r"aufbewahrung|organizer|\bboxen?\b|box\b|kästchen|(?<!bau)(?<!werkzeug)kasten\b|bügel\b|\bkorb|körbe|schublade|behälter|kiste|\bdosen?\b|staufach|\btray\b|beutel", "hg-10-16"),
    (r"(?<![a-zäöü])(?:armband|damen|herren|quarz|smart|taschen|kinder)?uhr\b|armbanduhr", "aa-6-11"),
    (r"perücke", "aa-2-14-12"),
    (r"kostüm|verkleidung", "aa-3-3"),
    (r"(?<!hand)(schuh|sandale|stiefel|sneaker|slipper|pantoffel)", "aa-8"),
    (r"\b(kleid|shirt|t-shirt|hose|pullover|hoodie|jacke|bluse|rock|bikini|badeanzug|socken|leggings|jumpsuit|strickjacke|mantel|weste|pyjama)\b|kleid\b|hemd\b", "aa-1"),
    (r"halskette|ohrring|ohrstecker|(?<!uhr)armband(?!uhr)|\bring\b|schmuck|anhänger\b|brosche", "aa-6"),
    (r"rucksack", "lb-1"),
    (r"(hand|umhänge|reise|sport|kosmetik|kultur)tasche", "lb"),
    (r"\b(hund|katze|haustier|welpe)\w*|hundeleine|katzen|futternapf|kratzbaum", "ap-2"),
    (r"yoga|fitness|hantel|widerstandsband|springseil|trainingsgerät|gymnastik", "sg-2"),
    (r"lippenstift|lidschatten|mascara|blush|make-?up|puder|eyeliner|nagellack", "hb-3-2-6"),
    (r"vase\b|vasen\b", "hg-3-67"),
    (r"handtuch|badetuch", "hg-15-4-1"),
    (r"wasserkocher|pfanne|kochtopf|\btopf\b|messbecher|schneidebrett|küchen\w*", "hg-11"),
    (r"lampe|leuchte|nachtlicht|lichterkette|led-licht|\bled\b", "hg-13"),
    (r"\b(usb|akku|bluetooth|kopfhörer|lautsprecher|powerbank|ladegerät|ladekabel|kabel|smart\w*|kamera|projektor|beamer|mikrofon|adapter)\b", "el"),
    (r"aufbewahrung|organizer|\bbox\b|korb|regal|halter\b|ablage|behälter|kiste|schublade|dose\b|haken\b|ordnung", "hg-10-16"),
]
_TR = [(_re.compile(m, _re.I), z) for m, z in TITELREGELN]


# Ohne passende Titelregel: bisheriger Typ-Wert, AUSSER bei «Trend-Gadget» — dort gibt es keinen Warenbegriff (None =
# nicht raten). Gemessen 23.09.: Spass-Elektronik ohne Bau-/Puzzlewort ist tatsaechlich Elektronik-Spielkram,
# Aufbewahrung ohne Regeltreffer ist meist doch Ordnung (Kabel-Tray, Kompressionsbeutel, Auto-Staufach).
SAMMEL_FALLBACK = {t: TABELLE.get(t) for t in SAMMELTYPEN}
SAMMEL_FALLBACK["Trend-Gadget"] = None


def ziel_fuer(typ, titel):
    """Taxonomie-ID fuer ein Produkt: Sammeltyp → Titelregel, sonst Fallback; fester Typ → TABELLE."""
    if typ in SAMMELTYPEN:
        for rx, z in _TR:
            if rx.search(titel or ""):
                return z
        return SAMMEL_FALLBACK.get(typ)
    return TABELLE.get(typ)


def gql(q, v=None):
    grund = "kein Versuch"; drossel = 0
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "90", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON"; time.sleep(5); continue
        if d.get("data") is not None:
            nachlauf(d); return d
        grund = str(d.get("errors") or d)[:300]
        if "THROTTLED" in grund.upper():
            drossel += 1; time.sleep(min(30, 6 * drossel)); continue
        time.sleep(5)
    raise RuntimeError("Shopify hat auf keinen Versuch mit Daten geantwortet — Lauf abgebrochen. Letzter Grund: " + grund)


def ids_pruefen():
    """Kanarienvogel: jede Tabellen-ID muss als TaxonomyCategory existieren, sonst kein einziger Schreibvorgang."""
    ids = sorted(set(TABELLE.values()) | {z for _, z in TITELREGELN})
    d = gql("query($ids:[ID!]!){ nodes(ids:$ids){ ... on TaxonomyCategory { id fullName } } }", {"ids": [TC + i for i in ids]})
    namen = {}
    for i, n in zip(ids, d["data"]["nodes"]):
        if not n:
            raise RuntimeError(f"Taxonomie-ID unbekannt: {i} — Tabelle korrigieren, nichts geschrieben.")
        namen[i] = n["fullName"]
    return namen


def main():
    if not TOK:
        print("kein Shop-Token → No-op"); return
    sperrdatei = open(SPERRE, "w")
    try:
        fcntl.flock(sperrdatei, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("kategorie_wache laeuft bereits (Sperre /tmp/kategorie_wache.lock) → No-op"); return
    namen = ids_pruefen()
    print(f"Taxonomie-IDs verifiziert: {len(namen)}")
    ledger = set()
    if os.path.exists(LEDGER):
        ledger = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    # 23.09. GEMESSEN: `category_id:*` wirkt (22'397 mit + 27'619 ohne = 50'016 aktive; der Kanarienvogel `foo:bar`
    # und `product_category_id:*` werden still ignoriert). Vorher scannte jeder Neustart alle 50'000 (5 Min von 60);
    # jetzt nur die Offenen — der Scan schrumpft mit jedem Lauf. `gescannt` zaehlt damit die Offenen.
    cursor, gescannt, ohne = None, 0, 0
    offen = []                      # (id, handle, typ, ziel)
    unbekannt = collections.Counter()
    while True:
        d = gql("query($c:String){ products(first:250, after:$c, query:\"status:active AND -category_id:*\"){ pageInfo{hasNextPage endCursor} nodes{ id handle title productType category{id} } } }", {"c": cursor})
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            gescannt += 1
            if p.get("category"):
                continue
            ohne += 1
            typ = (p.get("productType") or "").strip()
            ziel = ziel_fuer(typ, p.get("title"))
            if not ziel:
                unbekannt[typ or "-"] += 1; continue
            offen.append((p["id"], p["handle"], typ, ziel))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cursor = pg["pageInfo"]["endCursor"]
    print(f"gescannt {gescannt} · ohne Kategorie {ohne} · zuweisbar {len(offen)} · unbekannte Typen {sum(unbekannt.values())}")
    gesetzt, fehler, beispiele = 0, [], []
    if SCHARF:
        arbeit = offen[:CAP]
        sperre = threading.Lock()

        def schreibe(chunk):
            teile = []
            for j, (pid, handle, typ, ziel) in enumerate(chunk):
                teile.append(f'm{j}: productUpdate(product:{{id:"{pid}", category:"{TC}{ziel}"}}){{ product{{ id category{{id}} }} userErrors{{ field message }} }}')
            d = gql("mutation { " + " ".join(teile) + " }")
            ok, fe, bs = [], [], []
            for j, (pid, handle, typ, ziel) in enumerate(chunk):
                r = (d.get("data") or {}).get(f"m{j}") or {}
                ue = r.get("userErrors") or []
                ist = ((r.get("product") or {}).get("category") or {}).get("id", "")
                if ue or ist != TC + ziel:
                    fe.append((handle, ue[0]["message"] if ue else f"rueckgelesen {ist!r}"))
                    continue
                ok.append(f"{handle}\t{ziel}\t{typ}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
                bs.append((handle, typ, namen[ziel]))
            with sperre:
                with open(LEDGER, "a", encoding="utf-8") as lf:
                    lf.write("".join(ok)); lf.flush()
            time.sleep(0.3)
            return len(ok), fe, bs

        chunks = [arbeit[i:i + 25] for i in range(0, len(arbeit), 25)]
        with ThreadPoolExecutor(max_workers=WORKER) as pool:
            for n_ok, fe, bs in pool.map(schreibe, chunks):
                gesetzt += n_ok; fehler.extend(fe)
                for b in bs:
                    if len(beispiele) < 5:
                        beispiele.append(b)
    rest = ohne - gesetzt
    stand = {"stand": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "gescannt": gescannt, "ohne_kategorie_vorher": ohne,
             "gesetzt": gesetzt, "ohne_kategorie_nachher": rest, "fehler": len(fehler), "unbekannte_typen": dict(unbekannt.most_common()),
             "scharf": SCHARF}
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Produktkategorie (Taxonomie) — Stand {stand['stand']}\n\n")
        f.write(f"Aktive gescannt: {gescannt} · ohne Kategorie: {ohne} · heute gesetzt: {gesetzt} ({'SCHARF' if SCHARF else 'DRY'}, CAP {CAP}) · "
                f"danach offen: {rest} · Fehler: {len(fehler)}\n\n")
        f.write("Grund: Der Shop-Kanal (App «Shop») zeigt nur Produkte mit Kategorie — 33'863 «nicht auffindbar» am 23.09. Die Importer setzen\n"
                "productType, keine Taxonomie. Regel: productType → Taxonomie-ID (Tabelle im Skript, IDs beim Start verifiziert).\n\n")
        if unbekannt:
            f.write("## Unbekannte Typen (nicht geraten — Tabelle ergänzen)\n\n" + "\n".join(f"- {k}: {v}" for k, v in unbekannt.most_common()) + "\n\n")
        if beispiele:
            f.write("## Beispiele (heute gesetzt)\n\n" + "\n".join(f"- {h} · {t} → {n}" for h, t, n in beispiele) + "\n\n")
        if fehler:
            f.write("## Fehler\n\n" + "\n".join(f"- {h}: {m}" for h, m in fehler[:30]) + "\n")
    print(f"FERTIG: gesetzt {gesetzt} · offen {rest} · Fehler {len(fehler)} · unbekannte Typen {dict(unbekannt.most_common(6))} · {bilanz()}")





def korrektur():
    """KORREKTUR=1 (23.09.): alle aktiven Produkte der SAMMELTYPEN neu nach Titel einordnen. Weicht die gesetzte
    Kategorie vom Titel-Ziel ab → Ziel setzen; gibt es kein Ziel, aber eine Kategorie aus dem alten Pauschal-Mapping
    (el / hg-10-16 / hg-10 / hg-3) → leeren (falsch ist schlimmer als leer: Google liest die Kategorie).
    DRY (ohne SCHARF=1) zeigt nur Zählung und Beispiele. Ledger: dropship/_kategorie_korrektur.txt."""
    namen = ids_pruefen()
    PAUSCHAL = {"el", "hg-10-16", "hg-10", "hg-3"}
    zu_tun = []
    for typ in sorted(SAMMELTYPEN):
        cur = None
        while True:
            d = gql("query($c:String,$q:String){ products(first:250, after:$c, query:$q){ pageInfo{hasNextPage endCursor} "
                    "nodes{ id handle title category{id} } } }", {"c": cur, "q": f'status:active AND product_type:"{typ}"'})
            pg = d["data"]["products"]
            for p in pg["nodes"]:
                ist = ((p.get("category") or {}).get("id") or "").replace(TC, "")
                if ist and ist not in PAUSCHAL:
                    continue          # eine spezifische Kategorie stammt nicht aus dem Pauschal-Mapping → nie anfassen
                neu = ziel_fuer(typ, p["title"])
                if (neu or "") != ist and (neu or ist):
                    zu_tun.append((p["id"], p["handle"], typ, ist, neu, p["title"]))
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
    zc = collections.Counter((z[3] or "-") + "→" + (z[4] or "LEER") for z in zu_tun)
    print(f"KORREKTUR: {len(zu_tun)} Produkte · {dict(zc.most_common(12))}")
    for z in zu_tun[:25]:
        print(f"   {z[2][:18]:18s} {z[3] or '-':>9s} → {z[4] or 'LEER':9s} | {z[5][:60]}")
    if not SCHARF:
        return
    ok = 0
    with open(os.path.join(ROOT, "dropship", "_kategorie_korrektur.txt"), "a", encoding="utf-8") as lf:
        for i in range(0, len(zu_tun), 25):
            chunk = zu_tun[i:i + 25]
            teile = [f'm{j}: productUpdate(product:{{id:"{z[0]}", category:' + (f'"{TC}{z[4]}"' if z[4] else "null") +
                     '}){ product{ category{id} } userErrors{ message } }' for j, z in enumerate(chunk)]
            d = gql("mutation { " + " ".join(teile) + " }")
            for j, z in enumerate(chunk):
                r = (d.get("data") or {}).get(f"m{j}") or {}
                ist = ((r.get("product") or {}).get("category") or {}).get("id") or ""
                if not r.get("userErrors") and ist == (TC + z[4] if z[4] else ""):
                    ok += 1
                    lf.write(f"{z[1]}\t{z[3]}\t{z[4] or 'LEER'}\t{z[2]}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
    print(f"KORREKTUR FERTIG: {ok} von {len(zu_tun)} rückgelesen · {bilanz()}")


if __name__ == "__main__":
    korrektur() if os.environ.get("KORREKTUR") == "1" else main()
