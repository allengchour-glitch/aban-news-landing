"""Übersetzt drei Klassen unverständlicher Varianten-Auswahlwerte ins Deutsche.

DER BEFUND (dropship/FEHLERSUCHE-14-08.md, drei Einträge [lieferanten-leak]):
 A) 254 aktive Produkte bieten im Feld «Grösse» nur «FREE SIZE» bzw. «ONE SIZE» an — die
    Lieferantenformulierung, unübersetzt. Im Schweizer Handel heisst das «Einheitsgrösse»;
    «Free Size» liest sich im deutschsprachigen Kaufbereich sogar wie «Grösse gratis».
 B) 86 aktive Produkte geben die Grösse in «Yards» an. Das chinesische 码 (= Grösse) wurde vom
    Lieferanten-Feed wörtlich als «yards» übersetzt. «17 Yards» ist eine Kinderschuhgrösse 17,
    «160 Yards» die Körpergrösse 160 cm. Beides steht in der Auswahl neben bereits eingedeutschten
    Einzelwerten («Gold», «Grau») — die Liste zeigt heute deutsch und englisch gemischt.
 C) Aktive Produkte, deren Feld «Farbe» ausschliesslich Artikelnummern des chinesischen
    Lieferanten enthält («JM721», «MK1578», «T3071»). Keine dieser Varianten hat ein eigenes
    Bild — die Kundin wählt blind, und der fremde Lieferantencode steht im Kaufbereich.

WAS DIESES SKRIPT TUT
 A) Wert «FREE SIZE»/«ONE SIZE» → «Einheitsgrösse».
 B) «… -17 Yards» → «… · Gr. 17», «…-24or25Yards» → «… · Gr. 24/25»; im selben Zug wird das
    ebenfalls englische «-Size 23» derselben Auswahllisten zu «· Gr. 23» und ein Farbpräfix,
    das EXAKT einem bekannten Farbwort entspricht, eingedeutscht («Black» → «Schwarz»).
    Ein Präfix, das nicht sicher eine Farbe ist («Rice Noodles», «921 Sand Color»), bleibt
    unangetastet — raten wäre schlimmer als stehen lassen.
 C) Optionsname «Farbe» → «Ausführung» (es ist keine Farbe) und die Codes → «Modell 1 … N»
    in der bestehenden Reihenfolge. Die Reihenfolge entspricht der Bildergalerie des Produkts.

PROBELAUF UND FEHLTREFFER (DRY=1, gegen /tmp/export.jsonl vom 12.08.):
 • Klasse A: 254 Produkte, alle mit genau EINEM Wert. Kein Fehltreffer.
   NICHT angefasst: 13 Kombiwerte wie «Free Size-Mocha», «Black-S One Size» — dort steckt nicht
   die Sprache, sondern die STRUKTUR falsch (Grösse und Farbe in einem Feld). Das ist ein
   anderer, grösserer Eingriff.
 • Klasse B: erster Entwurf suchte /yard/i und traf «Black2.0mm thick50cm **lanyard**» sowie
   «**Vineyard** Children-80cm» — beides keine Grössen. Muster verlangt jetzt Ziffern unmittelbar
   vor dem Wort. Geprüft: unter den Treffern ist KEINE Meterware (Band, Schnur, Stoff), bei der
   «10 Yards» eine echte Längenangabe wäre — es sind ausschliesslich Schuhe und Bekleidung.
 • Klasse C: der erste Entwurf («Wert enthält Ziffern») meldete 925 Produkte und bestand zu
   grossen Teilen aus Fehltreffern: «9651 Black» und «38-Black» enthalten eine LESBARE Farbe,
   «A-300x600x2MM», «100x180cm», «50x12x2» sind MASSE, «Y029S/Y029M/Y029L» und «H310XXL» sind
   Modell + GRÖSSE, «16GB», «10000 MA», «2S 2M 2L» sind Mengen/Kapazitäten, «RC1147S-No 7» ist
   die Ringgrösse. Alle diese Werte tragen Information, die eine Umbenennung VERNICHTEN würde.
   Das Muster verlangt darum: ein Wort ohne Leerzeichen/Trennzeichen, Buchstaben am Anfang,
   mindestens zwei Ziffern, keine Grössenendung, keine Einheit, kein Farbwort im Wert — und
   ALLE Werte der Option müssen so aussehen. Damit bleiben 133 Produkte statt 216.
   Zusätzlich von Hand ausgenommen (AUSNAHMEN unten), weil der Code dort eine echte Angabe ist:
     15447877583233 TV-Fernbedienung «BN5901015A» = Samsung-Modellnummer, die zum TV passen muss
     15459741335937 Fischereirolle «AR2000…AR7000» = Rollengrösse
     15447634477441 Katzenmatte «C10M5/C10L5» = Grösse M und L
     15478696739201 Notfall-Luftpumpe «ST9901A…» = Gerätemodell mit eigener Leistung
     15449435603329 Hoodie «DZ248177YJWhite» = enthält die Farbe im Code

WER SCHREIBT DAS FELD BEIM NÄCHSTEN PRODUKT?
 Der CJ-Importer `automation/cj_category_fill.mjs` (buildFashion/parseVar). Er ist im selben
 Zug mitrepariert: `isSize` kennt FREE/ONE SIZE und `deSize` macht «Einheitsgrösse» daraus,
 `deColor` rechnet Yards in «Gr. N» um, und eine Farb-Option aus lauter Lieferantencodes wird
 schon beim Anlegen zu «Ausführung» + «Modell N». Ohne diesen Teil wäre die Reparatur beim
 nächsten Import-Lauf wieder aufgefressen.

⚠️ «Option value already exists» → Wert wird ÜBERSPRUNGEN, nie erzwungen. Sonst verschmilzt
   Shopify zwei Varianten zu einer und der Bestand der zweiten ist weg.
⚠️ Die Bestellautomatik ist NICHT betroffen: alle geprüften Varianten tragen die CJ-Varianten-SKU
   (`CJ-CJYD…`), und `cj_order_engine.vid_fuer` löst darüber exakt auf — nicht über den
   Variantentitel. Der Titel-Abgleich greift nur bei SKUs der Form `CJ-<pid>`.

DRY=1 meldet nur. NUR=A|B|C beschränkt auf eine Klasse.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
API = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
NUR = os.environ.get("NUR", "ABC").upper()
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_variantenwerte_de.txt"

# Von Hand ausgenommen — Begründung im Kopfkommentar.
AUSNAHMEN = {"15447877583233", "15459741335937", "15447634477441",
             "15478696739201", "15449435603329"}

FARBE = {
    "black": "Schwarz", "white": "Weiss", "red": "Rot", "blue": "Blau", "green": "Grün",
    "yellow": "Gelb", "grey": "Grau", "gray": "Grau", "pink": "Pink", "purple": "Lila",
    "brown": "Braun", "beige": "Beige", "gold": "Gold", "silver": "Silber", "orange": "Orange",
    "navy": "Marineblau", "khaki": "Khaki", "violet": "Violett", "ivory": "Elfenbein",
    "coffee": "Kaffeebraun", "cream": "Creme", "camel": "Camel", "apricot": "Aprikose",
    "champagne": "Champagner", "lavender": "Lavendel", "rose": "Rosé", "burgundy": "Bordeaux",
    "turquoise": "Türkis", "multicolor": "Bunt", "clear": "Transparent",
    "dark gray": "Dunkelgrau", "dark grey": "Dunkelgrau", "light gray": "Hellgrau",
    "light grey": "Hellgrau", "dark blue": "Dunkelblau", "light blue": "Hellblau",
    "sky blue": "Himmelblau", "navy blue": "Marineblau", "dark green": "Dunkelgrün",
    "light green": "Hellgrün", "army green": "Armeegrün", "olive green": "Olivgrün",
    "wine red": "Weinrot", "rose red": "Rosarot", "dark pink": "Dunkelrosa",
    "light pink": "Rosa", "hot pink": "Pink", "dark brown": "Dunkelbraun",
    "light brown": "Hellbraun", "dark purple": "Dunkellila", "rose gold": "Roségold",
    "milky white": "Milchweiss", "off white": "Cremeweiss", "creamy white": "Cremeweiss",
    "black and white": "Schwarz-Weiss", "purplish blue": "Blauviolett",
    "purplish red": "Purpurrot", "avocado green": "Avocadogrün", "deep red": "Dunkelrot",
}

EINHEIT = re.compile(r"^\s*(free|one)\s*[-_ ]?\s*size\s*$", re.I)
FARBOPT = ("farbe", "color", "colour")
GROESSEOPT = ("grösse", "groesse", "größe", "size")

# ── Klasse B ────────────────────────────────────────────────────────────────────
# Ziffern MÜSSEN unmittelbar vor «yard» stehen — sonst greift das Muster in «lanyard»
# und «Vineyard», beides keine Grössenangabe.
Y_BEREICH = re.compile(r"(\d+)\s*(?:to|or)\s*(\d+)\s*yards?\b", re.I)
Y_EINZEL = re.compile(r"(\d+)\s*yards?\b", re.I)
S_BEREICH = re.compile(r"\bsize\s*(\d+)\s*(?:to|or)\s*(\d+)\b", re.I)
S_EINZEL = re.compile(r"\bsize\s*(\d+)\b", re.I)


def de_yards(v):
    """«Gold-17 Yards» → «Gold · Gr. 17», «Green-Size 23» → «Grün · Gr. 23».
    Gibt None zurück, wenn nichts zu tun ist.
    Das «Size»-Muster wird NUR innerhalb der Auswahllisten angewandt, die ohnehin schon
    Yards-Werte enthalten — sonst bliebe genau die halb englische Mischliste stehen, die der
    Befund beschreibt («Green-Size 23» neben «Green-25 Yards»)."""
    s = Y_BEREICH.sub(lambda m: "\x00%s/%s" % (m.group(1), m.group(2)), v)
    s = Y_EINZEL.sub(lambda m: "\x00" + m.group(1), s)
    s = S_BEREICH.sub(lambda m: "\x00%s/%s" % (m.group(1), m.group(2)), s)
    s = S_EINZEL.sub(lambda m: "\x00" + m.group(1), s)
    if "\x00" not in s:
        return None
    s = re.sub(r"\s*[-–]\s*\x00", " · \x00", s)
    s = re.sub(r"\s*\x00", " · Gr. ", s) if s.startswith("\x00") else s.replace("\x00", "Gr. ")
    s = s.replace("\x00", "Gr. ")
    s = re.sub(r"\s{2,}", " ", s).strip(" ·-").strip()
    # Farbpräfix nur übersetzen, wenn es EXAKT ein bekanntes Farbwort ist
    teile = s.split(" · ", 1)
    if len(teile) == 2 and teile[0].strip().lower() in FARBE:
        s = FARBE[teile[0].strip().lower()] + " · " + teile[1]
    return s if s != v else None


# ── Klasse C ────────────────────────────────────────────────────────────────────
C_FORM = re.compile(r"^[A-Za-z][A-Za-z0-9]{2,17}$")
C_GROESSENENDE = re.compile(r"(xs|s|m|l|xl|xxl|xxxl)$", re.I)
C_EINHEIT = re.compile(r"(gb|tb|mb|mah|ma|mm|cm|ml|kg|pcs|pc|pack|ports|inch|yards?|"
                       r"frequency|style|model|color|size|no)", re.I)
C_FARBWORT = re.compile(r"(black|white|red|blue|green|yellow|grey|gray|pink|purple|brown|"
                        r"beige|gold|silver|orange|navy|khaki)", re.I)


def ist_lieferantencode(v):
    v = v.strip()
    if not C_FORM.match(v):
        return False
    if len(re.findall(r"\d", v)) < 2:
        return False
    return not (C_GROESSENENDE.search(v) or C_EINHEIT.search(v) or C_FARBWORT.search(v))


# ── Shopify ─────────────────────────────────────────────────────────────────────
def gql(q, v=None):
    """Gibt None zurück, wenn KEINE echte Antwort kam. Regel: eine gescheiterte Anfrage
    ist kein Ergebnis — der Fall bleibt offen und wird beim nächsten Lauf erneut versucht."""
    with open("/tmp/_vw.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60", API,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_vw.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return None


Q_PROD = ('query($id:ID!){node(id:$id){... on Product{status title '
          'options{id name optionValues{id name}}}}}')
M_OPT = ('mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){'
         'productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u)'
         '{userErrors{field message}}}')


def sammeln():
    """Kandidaten aus dem Export vorsortieren. Entschieden wird später gegen die LIVE-Daten."""
    a, b, c = [], [], []
    for zeile in open(EXPORT):
        try:
            p = json.loads(zeile)
        except Exception:
            continue
        if p.get("status") != "ACTIVE":
            continue
        pid = p["id"].split("/")[-1]
        for o in (p.get("options") or []):
            name = (o.get("name") or "").strip().lower()
            vals = [v.strip() for v in (o.get("values") or [])]
            if not vals:
                continue
            if name in GROESSEOPT and all(EINHEIT.match(v) for v in vals):
                a.append((p["id"], p["title"]))
            if any(Y_EINZEL.search(v) for v in vals):
                b.append((p["id"], p["title"]))
            if (name in FARBOPT and len(vals) >= 2 and pid not in AUSNAHMEN
                    and all(ist_lieferantencode(v) for v in vals)):
                c.append((p["id"], p["title"]))
    return a, b, c


def plan_fuer(klasse, opt):
    """Aus den LIVE-Werten einer Option den Umbenennungsplan bauen.
    Rückgabe: (neuer_optionsname_oder_None, [(valueId, alt, neu)], [übersprungene Kollisionen])"""
    name = (opt.get("name") or "").strip().lower()
    werte = opt["optionValues"]
    alt = [v["name"].strip() for v in werte]
    neuer_optname = None
    paare = []

    if klasse == "A":
        if name not in GROESSEOPT or not all(EINHEIT.match(v) for v in alt):
            return None, [], []
        paare = [(werte[i]["id"], alt[i], "Einheitsgrösse") for i in range(len(alt))]
    elif klasse == "B":
        if not any(Y_EINZEL.search(v) for v in alt):
            return None, [], []
        for i, v in enumerate(alt):
            n = de_yards(v)
            if n:
                paare.append((werte[i]["id"], v, n))
        if not paare:
            return None, [], []
    else:
        if name not in FARBOPT or len(alt) < 2 or not all(ist_lieferantencode(v) for v in alt):
            return None, [], []
        neuer_optname = "Ausführung"
        paare = [(werte[i]["id"], alt[i], "Modell %d" % (i + 1)) for i in range(len(alt))]

    # Kollisionen: ein Wert, den es in derselben Option schon gibt, würde zwei Varianten
    # verschmelzen. Solche Werte werden ausgelassen, nicht erzwungen.
    belegt = set(v.lower() for v in alt) - set(p[1].lower() for p in paare)
    ok, kollisionen = [], []
    for vid, a_, n_ in paare:
        if a_ == n_:
            continue
        if n_.lower() in belegt:
            kollisionen.append((a_, n_))
            continue
        belegt.add(n_.lower())
        ok.append((vid, a_, n_))
    return neuer_optname, ok, kollisionen


def main():
    a, b, c = sammeln()
    aufgabe = []
    if "A" in NUR:
        aufgabe += [("A", *x) for x in a]
    if "B" in NUR:
        aufgabe += [("B", *x) for x in b]
    if "C" in NUR:
        aufgabe += [("C", *x) for x in c]
    print("Kandidaten aus dem Export — A (FREE/ONE SIZE): %d | B (Yards): %d | "
          "C (Lieferantencode als Farbe): %d" % (len(a), len(b), len(c)), flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER) if l.strip()}

    if DRY:
        gezeigt = 0
        for klasse, gid, titel in aufgabe:
            d = gql(Q_PROD, {"id": gid})
            if d is None:
                print("  ⚠️ keine Antwort für %s — bleibt offen" % gid, flush=True)
                continue
            node = (d.get("data") or {}).get("node")
            if not node or node.get("status") != "ACTIVE":
                continue
            for opt in node["options"]:
                nn, paare, koll = plan_fuer(klasse, opt)
                if not paare:
                    continue
                gezeigt += 1
                if gezeigt <= 25:
                    print("[%s] %s%s" % (klasse, titel[:52],
                                         "  Option «%s» → «%s»" % (opt["name"], nn) if nn else ""),
                          flush=True)
                    for _, x, y in paare[:5]:
                        print("      %-34s → %s" % (x, y), flush=True)
                    for x, y in koll:
                        print("      ÜBERSPRUNGEN (Kollision) %s → %s" % (x, y), flush=True)
        print("Probelauf: %d Optionen würden geändert." % gezeigt, flush=True)
        return

    f = open(LEDGER, "a")
    n = fehler = koll_ges = 0
    for klasse, gid, titel in aufgabe:
        schluessel = "%s:%s" % (klasse, gid)
        if schluessel in done:
            continue
        d = gql(Q_PROD, {"id": gid})
        if d is None:
            print("  ⚠️ keine Antwort — %s bleibt offen" % titel[:40], flush=True)
            continue
        node = (d.get("data") or {}).get("node")
        if not node:
            f.write("%s\tnicht-gefunden\n" % schluessel); f.flush(); continue
        if node.get("status") != "ACTIVE":
            f.write("%s\tnicht-aktiv\n" % schluessel); f.flush(); continue

        geaendert = 0
        abbruch = False
        for opt in node["options"]:
            nn, paare, koll = plan_fuer(klasse, opt)
            koll_ges += len(koll)
            if not paare:
                continue
            o = {"id": opt["id"]}
            if nn and nn != opt["name"]:
                if any((x.get("name") or "") == nn for x in node["options"]):
                    continue  # Optionsname schon vergeben — nicht anfassen
                o["name"] = nn
            r = gql(M_OPT, {"p": gid, "o": o,
                            "u": [{"id": vid, "name": neu} for vid, _, neu in paare]})
            if r is None:
                abbruch = True
                break
            e = ((r.get("data") or {}).get("productOptionUpdate") or {}).get("userErrors") or []
            if e:
                fehler += 1
                print("  ⚠️ %s: %s" % (titel[:36], e[0]["message"][:70]), flush=True)
                continue
            geaendert += len(paare)
        if abbruch:
            print("  ⚠️ keine Antwort auf die Mutation — %s bleibt offen" % titel[:40], flush=True)
            continue
        n += 1
        f.write("%s\t%d\t%s\n" % (schluessel, geaendert, titel))
        f.flush()
        if n % 50 == 0:
            print("  … %d/%d" % (n, len(aufgabe)), flush=True)
        time.sleep(0.25)
    f.close()
    print("FERTIG: %d Produkte bearbeitet, %d Fehler, %d Werte wegen Kollision übersprungen"
          % (n, fehler, koll_ges), flush=True)


if __name__ == "__main__":
    main()
