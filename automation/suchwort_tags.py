"""Macht deutsche Zusammensetzungen auffindbar — über Tags, ohne einen Titel anzufassen.

DER BEFUND (Live-Test mit 25 Kundenbegriffen, 12.08.2026): Die Shop-Suche findet ein Wort nur,
wenn es als EIGENES Wort dasteht. Steht das Grundwort am Ende einer Zusammensetzung, ist das
Produkt über keine Ergebnisseite erreichbar:

    «koffer»  → 25 Treffer, im Sortiment sind 64. Alle Reise-, Roll-, Hartschalen- und
                Kabinenkoffer fehlen.
    «mantel»  → 53 Treffer, es fehlen 117 Woll-, Daunen- und Kunstpelzmäntel.
    «mütze»   → 29 Treffer statt 57.

In sieben durchgeblätterten Kategorien waren 286 von 318 Produkten (89 %) unauffindbar. Die
Ursache ist gemessen: Handkuratierte Ware schreibt «Trolley-Koffer» MIT Bindestrich und wird
gefunden; der CJ-Importer schreibt «Reisekoffer» ohne Trennzeichen und wird es nicht.

WARUM TAGS UND NICHT TITEL: Shopify durchsucht Titel, Warengruppe, Anbieter UND Tags. Ein Tag
ist unsichtbar für die Kundin, ändert weder den Feed noch die SEO noch die Kollektionsregeln,
und lässt sich jederzeit wieder entfernen. Den Titel «Reisekoffer» zu «Reise-Koffer» zu
zerlegen wäre der Eingriff mit der grösseren Wirkung — und dem grösseren Schaden, wenn er
danebengeht.

DAZU DIE UMLAUT-LÜCKE: Wer «guertel», «buegel», «handyhuelle» oder «schluesselanhaenger»
eintippt — also ohne Umlaut, wie auf vielen Tastaturen üblich — bekommt NULL Treffer, während
«muetze» zufällig funktioniert. Für jedes Grundwort mit Umlaut wird deshalb auch die
umlautfreie Schreibweise als Tag gesetzt.

⚠️ DIE FALLE, DIE HIER TEUER WÄRE, IST BEKANNT: «Handschuh» endet auf «schuh», ist aber kein
Schuh. «Armbanduhr» endet auf «uhr» und ist eine Uhr — aber sie enthält auch «armband» und ist
kein Armband. «Hundegeschirr» ist kein Geschirr. Solche Paare stehen als Ausnahmen unten; ohne
sie füllt dieser Lauf die Schuhsuche mit Handschuhen. Genau daran ist im Juli schon einmal
eine Tag-Chirurgie gescheitert («schleif» traf «Schleife», «rock» traf «GT Line ROCK»).

DRY=1 zeigt je Grundwort die Treffer und die abgewiesenen Ausnahmen.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_suchwort_tags.txt"
NUR = os.environ.get("NUR")   # «synonyme» = nur die Synonym-Tabelle (05.10.2026)

# Grundwort → Wörter, die davorstehen dürfen NICHT gelten (die Zusammensetzung meint etwas
# anderes). Leere Liste = keine bekannte Falle.
GRUNDWOERTER = {
    "koffer":      ["kuehl"],                       # Kühlkoffer ist eine Box, kein Reisekoffer
    "mantel":      ["reifen", "schutz"],            # Reifenmantel, Schutzmantel
    "muetze":      [],
    "jacke":       [],
    "hose":        ["schlauch"],
    "kleid":       [],
    "rock":        ["barock", "line"],              # «GT Line ROCK» ist ein Werkzeugkoffer
    "schuh":       ["hand", "pferde", "brems"],     # Handschuh, Hufeisen-Zubehör, Bremsschuh
    "stiefel":     [],
    "tasche":      ["hosen", "brust", "seiten"],    # Hosentasche ist ein Teil, kein Produkt
    "rucksack":    [],
    "guertel":     ["sicherheits", "keil"],         # Keilriemen-nah, Sicherheitsgurt
    "brille":      [],
    "uhr":         ["fuehr", "spur", "natur", "kultur", "geschirr"],   # nur Wortende-Zufall
    # ⚠️ «Lichterkette» ist keine Halskette. Ohne diese Ausnahme füllt eine LED-Solar-
    # Lichterkette die Schmucksuche — der Probelauf hatte 383 «kette»-Treffer, viele davon
    # Beleuchtung.
    "kette":       ["fahrrad", "saege", "schnee", "foerder", "lichter", "licht", "schluessel"],
    "ring":        ["feder", "dicht", "schlauch", "schleif", "lenk", "spring", "hering", "contouring",
                    "monitoring", "layering", "mirroring", "wearing", "string", "mountaineering", "augenring"],  # englische -ing-Wörter, Augenringe (05.10.)
    "armband":     [],
    "ohrring":     [],
    "lampe":       [],
    "leuchte":     [],
    "spiegel":     ["rueck"],                       # Rückspiegel ist Autoteil
    "kissen":      [],
    "decke":       ["zimmer", "raum"],              # Zimmerdecke
    # ⚠️ 05.10.2026 (Suche-Messung «teppich», 14'800 Suchen/Mt): 43 der 67 «teppich»-Tags saßen auf
    # WANDteppichen (Tapisserien) — wer einen Teppich sucht, will Boden, nicht Wand. Dazu Schnüffel-
    # teppiche (Hundespielzeug), ein Shirt «mit Webteppich» und ein Knüpfteppich-Bastelset.
    # Die Ausnahme wird im ganzen Titel-Anfang gesucht — «web» allein hätte «Gewebter Wollteppich»
    # abgewiesen (Kanarienvogel). Darum stets die ganze Zusammensetzung nennen.
    "teppich":     ["wandteppich", "schnüffelteppich", "schnueffelteppich", "webteppich", "knüpfteppich", "knuepfteppich"],
    "vorhang":     [],
    "pfanne":      [],
    "topf":        ["blumen"],
    "messer":      [],
    "flasche":     [],
    "becher":      ["aschen"],                      # Aschenbecher = Raucherzubehör, kein Trinkbecher (05.10.)
    "buerste":     [],
    "kamm":        [],
    "schere":      [],
    "rasierer":    [],
    "parfum":      [],
    "creme":       [],
    "maske":       [],
    "seife":       [],
    "shampoo":     [],
    "handtuch":    [],
    "bademantel":  [],
    "badeanzug":   [],
    "bikini":      [],
    "socken":      [],
    "pullover":    [],
    "hemd":        [],
    "bluse":       [],
    "shirt":       [],
    "weste":       [],
    "anzug":       ["bade"],                        # Badeanzug hat ein eigenes Grundwort
    "guertelt":    [],
    "handyhuelle": [],
    "huelle":      [],
    "ladegeraet":  [],
    "kabel":       [],
    "kopfhoerer":  [],
    "lautsprecher": [],
    "tastatur":    [],
    "maus":        ["fleder"],                      # Fledermaus
    "kamera":      [],
    "drohne":      [],
    "ventilator":  [],
    "heizung":     [],
    "staubsauger": ["nagelstaubsauger"],            # Nagelstaubsauger = Nagelstudio-Gerät, kein Haushaltsgerät (05.10.)
    "waage":       [],
    "koffergriff": [],
    "schluesselanhaenger": [],
    "geldboerse":  [],
    "portemonnaie": [],
    "werkzeug":    [],
    "bohrer":      [],
    "schraubenzieher": [],
    "zange":       [],
    "hammer":      [],
    "leiter":      [],
    "matte":       ["auto"],                        # Automatte ist Fussmatte, nicht Yogamatte
    "hantel":      [],
    "fahrrad":     [],
    "helm":        [],
    "zelt":        [],
    "schlafsack":  [],
    "grill":       [],
    "korb":        [],
    "regal":       [],
    "stuhl":       [],
    # ⚠️ «tisch» ganz herausgenommen. Es ist die Endung Dutzender Adjektive (minimalistisch,
    # praktisch, romantisch, hektisch) — die Ausnahmen liessen sich pflegen. Aber selbst die
    # ECHTEN Treffer taugen nicht: «Schreibtisch-Ständer» ist ein Handyhalter und
    # «Nachttischlampe» eine Lampe. Wer «tisch» sucht, will einen Tisch. Ein Suchwort, dessen
    # richtige Treffer schon falsch sind, gehört nicht auf die Liste.
    "sessel":      [],
    "halskette":   [],
    "anhaenger":   ["wohnwagen"],
}
# Umlaut-Schreibweise für die Suche im Titel (die Tags selbst bleiben umlautfrei, damit sie
# auch bei umlautfreier Eingabe treffen).
MIT_UMLAUT = {"muetze": "mütze", "guertel": "gürtel", "huelle": "hülle",
              "handyhuelle": "handyhülle", "buerste": "bürste", "kopfhoerer": "kopfhörer",
              "ladegeraet": "ladegerät", "geldboerse": "geldbörse", "saege": "säge",
              "schluesselanhaenger": "schlüsselanhänger", "anhaenger": "anhänger",
              "fuehr": "führ", "foerder": "förder", "rueck": "rück", "kuehl": "kühl"}

# ── SYNONYME (05.10.2026, «keyword mehr machen», Storefront-Messung 60 Google-CH-Begriffe) ──────────────────────
# Kundinnen tippen ein anderes Wort als der Titel trägt: «blusenkleid» (Titel «Hemdblusenkleid»), «jeanskleid»
# («Denim-Kleid»), «hosenrock» («Culotte»), «gummistiefel» («Regenstiefel»), «deckenlampe» («Deckenleuchte»),
# «hanteln» («Kurzhantel»), «akkuschrauber» («Akku-Schrauber»), «bodys» («Baby-Body»). Gemessen: Top-3 der
# Vorschlagsliste 0/3 oder 1/3 passend, obwohl 6–52 passende Produkte aktiv sind. Das Grundwort-Muster oben
# hilft hier nicht — es fängt nur das Ende einer Zusammensetzung, kein anderes Wort.
# Tag → (Titel trifft, Titel-Ausschluss, Produkttyp muss treffen). Ausschlüsse sind die Kanarienvögel aus dem
# Trockenlauf: «Hantel-Armband» ist Schmuck, «Deko-Set Glitzer-Kronleuchter» Partydeko, «Jeans-Look Top mit
# Tupfenkleid» ein Top, «Nachttisch-Pendelleuchte» eine Tischlampe, «Strampler für Haustiere» kein Baby-Body.
# Kein Tag hier wird von einer Kollektionsregel benutzt (549 Regeln geprüft 05.10.).
SYNONYME = {
    "blusenkleid":   (r"hemdblusenkleid|hemdkleid", None, None),
    "jeanskleid":    (r"denim-?kleid|jeans-\w*kleid", r"jeans-look", None),
    "hosenrock":     (r"culotte|rockhose", None, None),
    "gummistiefel":  (r"regenstiefel", None, None),
    "deckenlampe":   (r"deckenleuchte|pendelleuchte|kronleuchter|h(?:ä|ae)ngelampe", r"deko-set|nachttisch|glitzer", None),
    "hanteln":       (r"hantel", r"armband|catnip|halterung|schutzpolster|hantelgriff|hantelstange|atem-hantel", r"sport"),
    "akkuschrauber": (r"akku-\w*schrauber", None, None),
    "gartendeko":    (r"gartenstecker|gartenfigur|gartenfee", None, None),
    "katzenbett":    (r"katzen-?h(?:ä|ae)ngematte|katzenplattform", None, r"haustier|spielzeug"),
    "bodys":         (r"baby-?body|baby\b.*\bbody\b", r"strampler|haustier", r"baby"),
}
# Nie: POD/Editor-Ware und Kostüme (Hausregel) — auch wenn ein Titel passt.
SYNONYM_NIE_TYP = re.compile(r"kost(?:ü|ue)m|verkleid", re.I)
SYNONYM_NIE_TAG = {"pod", "selbst-gestalten", "editor", "printful"}
SYNONYM_LEDGER = "dropship/_suchwort_synonyme.tsv"


def synonym_tags(titel, typ, tags):
    """Synonym-Tags, die ein aktives Produkt bekommen soll (ohne die schon vorhandenen)."""
    vorhanden = {x.lower() for x in (tags or [])}
    if SYNONYM_NIE_TYP.search(typ or "") or (vorhanden & SYNONYM_NIE_TAG):
        return []
    neu = []
    for tag, (trifft, ohne, typ_muss) in SYNONYME.items():
        if tag in vorhanden or not re.search(trifft, titel, re.I):
            continue
        if ohne and re.search(ohne, titel, re.I):
            continue
        if typ_muss and not re.search(typ_muss, typ or "", re.I):
            continue
        neu.append(tag)
    return neu


try:  # 03.10.2026: Eimer-Etikette im gemeinsamen gql-Helfer (Regel «helfer-ohne-eimer»)
    from eimer_etikette import nachlauf as _nachlauf
except Exception:  # pragma: no cover
    def _nachlauf(d):
        return 0


def gql(q, v=None):
    with open("/tmp/_st.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_st.json"], capture_output=True, text=True)
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


def muster(grund):
    """Trifft das Grundwort NUR am Ende einer Zusammensetzung, nicht als eigenes Wort."""
    wort = MIT_UMLAUT.get(grund, grund)
    # Mindestens zwei Buchstaben davor, damit «Koffer» allein nicht trifft — das Produkt wäre
    # ohnehin auffindbar. Danach optional die Mehrzahl-Endung.
    return re.compile(r'[a-zäöüß]{2,}' + wort + r'(?:e|en|n|s)?\b', re.I)


# ── SPERRLISTE (05.10.2026, Prüferbefund) ─────────────────────────────────────────────────────────────────────────
# Seiten, an denen ein anderer Lauf gerade arbeitet oder deren Text einzeln geprüft wurde, fasst dieser Lauf nicht an —
# auch keinen unsichtbaren Tag. Bis heute steckte diese Prüfung nur in einem Einmal-Skript (scratchpad/scharf.py); der
# tägliche Keepalive-Lauf hätte «gummistiefel» auf «Wasserdichte Regenstiefel für Kinder» geschrieben, deren Handle in
# seo_titel_geprueft_2026-10-02.tsv steht. Jetzt: Handle und Status LIVE lesen, Sperrliste direkt VOR jedem Bündel neu
# lesen, Treffer mit Wortgrenze am Handle (und an der numerischen ID) prüfen.
SPERR_MUSTER = [
    "dropship/semrush/_neue_kollektionen_*.tsv", "dropship/semrush/_platz41_heben_*.tsv",
    "dropship/semrush/_draft_ersatz_*.tsv", "dropship/semrush/_seite2_heben_*.tsv",
    "dropship/semrush/_seo_kollektion_ledger.tsv", "dropship/semrush/_seo_seite2_ledger.tsv",
    "dropship/semrush/seo_titel_geprueft_*.tsv", "dropship/semrush/_kannibalisierung_*.tsv",
    "dropship/semrush/_nacharbeit_*.tsv", "dropship/semrush/*NACHARBEIT*",
]


def sperr_text():
    import glob
    txt = []
    for m in SPERR_MUSTER:
        for f in sorted(glob.glob(m)):
            try:
                txt.append(open(f, encoding="utf-8", errors="ignore").read())
            except OSError:
                pass
    return "\n".join(txt)


def in_sperre(handle, gid, txt):
    if handle and re.search(r"(?<![a-z0-9-])" + re.escape(handle) + r"(?![a-z0-9-])", txt):
        return True
    num = (gid or "").rsplit("/", 1)[-1]
    return bool(num) and re.search(r"(?<!\d)" + re.escape(num) + r"(?!\d)", txt) is not None


try:
    from kaufwille_zeile import gql as _gql_daten   # gemeinsamer Helfer: Eimer-Etikette + Drossel-Geduld
except Exception:  # pragma: no cover
    def _gql_daten(q, v=None):
        return gql(q, v)["data"]


def live_lesen(ids):
    """id → {id handle title status productType tags}, frisch aus dem Admin (Export kann Stunden alt sein)."""
    live = {}
    for i in range(0, len(ids), 50):
        d = _gql_daten('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle title status productType tags}}}',
                       {"ids": ids[i:i + 50]})
        for n in d.get("nodes") or []:
            if n:
                live[n["id"]] = n
    return live


def gesperrt_schreiben(auftraege, ledger_zeile, art):
    """auftraege: [(live_node, [tags])]. Bündel ≤ 10 tagsAdd; Sperrliste direkt vor jedem Bündel neu gelesen.
    DRY: nichts schreiben, nur zeigen, was geschrieben und was gesperrt würde. Rückgabe: Anzahl geschriebener Produkte."""
    n = gesperrt = 0
    for i in range(0, len(auftraege), 10):
        txt = sperr_text()
        teil = []
        for node, tags in auftraege[i:i + 10]:
            if in_sperre(node["handle"], node["id"], txt):
                gesperrt += 1
                print(f"     SPERRE {art}: {node['handle']} ({','.join(tags)}) — Handle steht in einem Sperr-Ledger", flush=True)
            else:
                teil.append((node, tags))
        if DRY:
            for node, tags in teil:
                print(f"     WÜRDE {art} {','.join(tags):<14} {node['handle'][:60]}", flush=True)
            n += len(teil)
            continue
        if not teil:
            continue
        q = "mutation{" + " ".join(f'm{j}:tagsAdd(id:{json.dumps(node["id"])},tags:{json.dumps(tags)}){{userErrors{{message}}}}'
                                   for j, (node, tags) in enumerate(teil)) + "}"
        d = _gql_daten(q)
        for j, (node, tags) in enumerate(teil):
            fehler = ((d.get(f"m{j}") or {}).get("userErrors")) if d.get(f"m{j}") is not None else ["keine Antwort"]
            if fehler:
                print(f"     FEHLER {node['handle']}: {fehler}", flush=True)
                continue
            ledger_zeile(node, tags)
            n += 1
        time.sleep(0.5)
    print(f"{art}: {n} Produkte {'würden geschrieben' if DRY else 'geschrieben'}, {gesperrt} wegen Sperr-Ledger übersprungen", flush=True)
    return n


def synonyme_schreiben(syn_aufgaben):
    """tagsAdd je Produkt; Ledger mit Datum (Altwert = Tag fehlte → Rückweg tagsRemove).
    Kandidaten aus dem Export, Entscheidung aus dem LIVE-Stand (Status, Titel, Tags, Handle)."""
    if not syn_aufgaben:
        return
    erledigt = set()
    if os.path.exists(SYNONYM_LEDGER):
        erledigt = {tuple(l.split("\t")[1:3]) for l in open(SYNONYM_LEDGER)}
    live = live_lesen([gid for gid, _, _ in syn_aufgaben])
    auftraege = []
    for gid, _, _ in syn_aufgaben:
        node = live.get(gid)
        if not node or node.get("status") != "ACTIVE":
            continue
        tags = [g for g in synonym_tags(node["title"], node.get("productType"), node.get("tags")) if (gid, g) not in erledigt]
        if tags:
            auftraege.append((node, tags))
    neu_datei = not os.path.exists(SYNONYM_LEDGER)
    f = None if DRY else open(SYNONYM_LEDGER, "a")
    if f and neu_datei:
        f.write("datum\tproduct_id\ttag_neu\ttitel\n")

    def zeile(node, tags):
        for g in tags:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{node['id']}\t{g}\t{node['title']}\n")
        f.flush()
    gesperrt_schreiben(auftraege, zeile, "Synonym-Tags")
    if f:
        f.close()


def main():
    aufgaben, statistik, abgewiesen = [], Counter(), Counter()
    syn_aufgaben = []
    muster_je = {g: muster(g) for g in GRUNDWOERTER}
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        # 24.09.2026: Bulk-Exporte tragen auch Kindzeilen (Varianten/Medien mit __parentId, ohne status/title) —
        # der Lauf starb daran mit KeyError: 'status' und begann in jeder Aufseher-Runde von vorn.
        if p.get("__parentId") or p.get("status") != "ACTIVE" or not p.get("title"):
            continue
        t = p["title"]
        tl = t.lower()
        vorhanden = {x.lower() for x in (p.get("tags") or [])}
        neu = []
        for grund, verboten in GRUNDWOERTER.items():
            if grund in vorhanden:
                continue
            m = muster_je[grund].search(t)
            if not m:
                continue
            # Steht eines der verbotenen Wörter direkt davor, meint die Zusammensetzung
            # etwas anderes.
            vorher = tl[:m.start()] + m.group(0).lower()
            if any(v in vorher for v in verboten):
                abgewiesen[(grund, m.group(0))] += 1
                continue
            neu.append(grund)
        if NUR == "synonyme":
            neu = []
        syn = synonym_tags(t, p.get("productType"), p.get("tags"))
        if syn:
            syn_aufgaben.append((p["id"], t, syn))
        if neu:
            aufgaben.append((p["id"], t, neu))
            for g in neu:
                statistik[g] += 1

    print(f"Produkte, die ein Suchwort bekommen: {len(aufgaben)}", flush=True)
    for g, n in statistik.most_common(22):
        beispiel = next((t for _, t, ns in aufgaben if g in ns), "")
        print(f"   {n:>5}  {g:<20} z.B. «{beispiel[:44]}»", flush=True)
    if abgewiesen:
        print("   — als Ausnahme abgewiesen (Zusammensetzung meint etwas anderes):", flush=True)
        for (g, wort), n in abgewiesen.most_common(8):
            print(f"     {n:>4}  {wort} → NICHT «{g}»", flush=True)
    syn_stat = Counter(g for _, _, ns in syn_aufgaben for g in ns)
    print(f"Synonym-Tags: {len(syn_aufgaben)} Produkte · " + ", ".join(f"{g} {n}" for g, n in syn_stat.most_common()), flush=True)
    if DRY:
        for gid, t, ns in syn_aufgaben:
            print(f"     SYN {','.join(ns):<14} {t[:70]}", flush=True)
    synonyme_schreiben(syn_aufgaben)      # DRY: nur Anzeige inkl. SPERRE-Zeilen, nichts geschrieben
    if not aufgaben:
        if not DRY:
            print("FERTIG: 0 Produkte mit Suchwort-Tags versehen (keine Grundwort-Kandidaten)")
        return

    # 05.10.2026: Das Ledger sperrte bisher die ganze Produkt-ID («gid in done») — ein Produkt, das einmal
    # «uhr» bekam, hätte ein später ergänztes Grundwort NIE bekommen. Gesperrt wird jetzt das Paar (ID, Tag).
    done = set()
    if os.path.exists(LEDGER):
        for l in open(LEDGER):
            teile = l.split("\t")
            if len(teile) >= 2:
                done |= {(teile[0], g) for g in teile[1].split(",")}
    # 05.10.2026: auch die Grundwort-Tags gehen über den Live-Stand und die Sperrliste (Bündel ≤ 10, Sperre vor jedem Bündel).
    offen = [(gid, [g for g in neu if (gid, g) not in done]) for gid, _, neu in aufgaben]
    offen = [(gid, neu) for gid, neu in offen if neu]
    live = live_lesen([gid for gid, _ in offen]) if offen else {}
    auftraege = []
    for gid, neu in offen:
        node = live.get(gid)
        if not node or node.get("status") != "ACTIVE":
            continue
        vorhanden = {x.lower() for x in node.get("tags") or []}
        neu = [g for g in neu if g not in vorhanden]
        if neu:
            auftraege.append((node, neu))
    f = None if DRY else open(LEDGER, "a")

    def zeile(node, neu):
        # ⚠️ NACH JEDEM EINTRAG AUF DIE PLATTE (Lehre: ein Ledger, das einen Absturz nicht überlebt, ist keins).
        f.write(f"{node['id']}\t{','.join(neu)}\t{node['title']}\n")
        f.flush()
    n = gesperrt_schreiben(auftraege, zeile, "Grundwort-Tags")
    if DRY:
        return
    f.close()
    print(f"FERTIG: {n} Produkte mit Suchwort-Tags versehen")


if __name__ == "__main__":
    main()
