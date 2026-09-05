"""Übersetzt ZUSAMMENGESETZTE Farbwerte in der Varianten-Auswahl ins Deutsche.

WAS DER ERSTE LAUF STEHEN LIESS: Am 11.08. wurden 1'316 Produkte mit einfachen Farbwerten
übersetzt («Dark Gray» → «Dunkelgrau»). Die Nachkontrolle zeigt, dass die nackten Grundfarben
seither NULL Mal vorkommen — dieser Teil hält. Übrig sind die mehrwortigen CJ-Farbnamen, und
davon sehr viele: «Sea Blue», «Brick Red», «Grass Green», «Watermelon Red», «Purplish Blue»,
«Caramel Color», «Creamy white». Eine Liste hilft dort nicht weiter; es sind Tausende
verschiedener Werte, und morgen importiert der Grind neue.

DESHALB WIRD HIER GEBAUT STATT NACHGESCHLAGEN. Ein Farbname besteht aus einem Grundwort
(blue, red, green …) und meist einem Bestimmungswort (sea, brick, grass, light, dark …). Im
Deutschen wird daraus ein Kompositum: sea + blue → Seeblau. Übersetzt wird nur, wenn JEDES
Stück bekannt ist — sonst bleibt der Wert unangetastet. Bei «Lotus Root Color» oder «Xingyao
Black» zu raten, brächte Unsinn ins Regal.

⚠️ WAS NICHT ÜBERSETZT WIRD, obwohl es englisch aussieht:
 • «Pink» (1'430×), «Khaki» (1'169×), «Beige» (752×), «Orange» (334×), «Gold» (207×) — im
   Deutschen identisch geschrieben. Das sind keine Fehler, und ein Lauf, der sie «korrigiert»,
   erzeugt nur Arbeit und Risiko.
 • Technische Zusätze: «White-USB», «Black-EU», «Black-Average Size». Dort wird NUR der
   Farbteil übersetzt, der Rest bleibt — «USB» heisst auf Deutsch auch USB.

⚠️ GRÖSSE-FARBE-KOMBINATIONEN («L-Black», «Black-1XL», 1'400 Vorkommen) bleiben in ihrer
STRUKTUR unangetastet — dort steckt Grösse und Farbe fälschlich in EINEM Feld, und das
sauber aufzutrennen ist ein anderer, grösserer Eingriff. Übersetzt wird trotzdem der
Farbteil, damit dort wenigstens «L-Schwarz» statt «L-Black» steht: Das ist für eine Kundin
lesbar, während die Struktur unverändert falsch bleibt. Eine halbe Verbesserung ist hier
besser als keine — aber sie ersetzt die ganze nicht.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_farbwerte_zusammengesetzt.txt"

# Grundwörter: das, was die Farbe IST.
GRUND = {
    "black": "schwarz", "white": "weiss", "red": "rot", "blue": "blau", "green": "grün",
    "yellow": "gelb", "gray": "grau", "grey": "grau", "purple": "lila", "brown": "braun",
    "pink": "pink", "orange": "orange", "beige": "beige", "khaki": "khaki", "gold": "gold",
    "silver": "silber", "violet": "violett", "turquoise": "türkis", "navy": "marineblau",
    "ivory": "elfenbein", "burgundy": "bordeaux", "champagne": "champagner",
    "coffee": "kaffeebraun", "cream": "creme", "apricot": "aprikose", "camel": "camel",
    "lavender": "lavendel", "amber": "bernstein", "wine": "weinrot",
}
# Bestimmungswörter: das, was die Farbe näher beschreibt.
BESTIMMUNG = {
    "light": "hell", "dark": "dunkel", "deep": "dunkel", "bright": "leuchtend",
    "pale": "blass", "medium": "mittel", "sea": "see", "sky": "himmel", "lake": "see",
    "army": "armee", "olive": "oliv", "mint": "mint", "grass": "gras", "brick": "ziegel",
    "lemon": "zitronen", "emerald": "smaragd", "watermelon": "wassermelonen",
    "rose": "rosen", "wine": "wein", "coffee": "kaffee", "chocolate": "schokoladen",
    "sand": "sand", "stone": "stein", "smoke": "rauch", "haze": "dunst", "milky": "milch",
    "creamy": "creme", "peacock": "pfauen", "denim": "jeans", "ink": "tinten",
    "fluorescent": "neon", "neon": "neon", "matte": "matt", "metallic": "metallic",
    "rust": "rost", "cherry": "kirsch", "peach": "pfirsich", "lilac": "flieder",
    "royal": "königs", "midnight": "mitternachts", "forest": "wald", "jade": "jade",
    "coral": "korallen", "mustard": "senf", "caramel": "karamell", "honey": "honig",
    "steel": "stahl", "charcoal": "anthrazit", "off": "creme", "pure": "rein",
    "yellowish": "gelblich", "purplish": "violett", "reddish": "rötlich",
    "greenish": "grünlich", "bluish": "bläulich", "blackish": "schwärzlich",
    "classic": "klassisch", "retro": "retro",
    "vintage": "vintage", "dusty": "staub", "warm": "warm", "cool": "kühl",
}
GROESSE = re.compile(r'^(?:XXS|XS|S|M|L|XL|XXL|[2-6]XL|\d{2,3})$', re.I)
# Einheitsgrösse heisst auf Deutsch Einheitsgrösse — «Black-Average Size» halb zu übersetzen
# wäre schlimmer als gar nicht.
GROESSE_DE = {"one size": "Einheitsgrösse", "average size": "Einheitsgrösse",
              "free size": "Einheitsgrösse", "standard": "Standard"}
# «All Black» ist schlicht Schwarz. «Komplettschwarz» wäre eine Wortschöpfung, die im
# Regal fremder aussieht als das englische Original.
VERSTAERKER = {"all", "pure", "full", "total", "solid"}
# Technische Zusätze, die auf Deutsch gleich heissen.
TECHNISCH = re.compile(r'^(?:USB|EU|US|UK|AU|Type-?C|Plug|Set|PC|PCS|Pack)$', re.I)
ENDET_AUF_COLOR = re.compile(r'\s+colou?r$', re.I)


def gql(q, v=None):
    with open("/tmp/_fz.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_fz.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def phrase_de(text):
    """«Sea Blue» → «Seeblau». Gibt None zurück, wenn ein Stück unbekannt ist."""
    t = ENDET_AUF_COLOR.sub("", text.strip())
    if not t:
        return None
    woerter = [w for w in re.split(r'\s+', t) if w]
    # «White And Blue» → «Weiss-Blau»
    if len(woerter) == 3 and woerter[1].lower() in ("and", "&"):
        a, b = GRUND.get(woerter[0].lower()), GRUND.get(woerter[2].lower())
        if a and b:
            return f"{a.capitalize()}-{b.capitalize()}"
        return None
    if len(woerter) == 1:
        w = woerter[0].lower()
        if w in GRUND:
            return GRUND[w].capitalize()
        # «Caramel» allein ist ein Bestimmungswort ohne Grundwort — «Karamell» ist als
        # Farbname geläufig, also zulässig.
        if w in BESTIMMUNG and ENDET_AUF_COLOR.search(text):
            return BESTIMMUNG[w].capitalize()
        return None
    if len(woerter) == 2:
        b, g = woerter[0].lower(), woerter[1].lower()
        if b in VERSTAERKER and g in GRUND:
            return GRUND[g].capitalize()          # «All Black» → «Schwarz»
        if g in GRUND and b in BESTIMMUNG:
            return (BESTIMMUNG[b] + GRUND[g]).capitalize()
        # «Gray Green» — zwei Grundwörter: «Graugrün»
        if g in GRUND and b in GRUND:
            return (GRUND[b] + GRUND[g]).capitalize()
        return None
    return None


def wert_de(wert):
    """Übersetzt einen kompletten Optionswert, auch mit Bindestrich-Teilen."""
    teile = [t.strip() for t in wert.split("-")]
    if len(teile) == 1:
        return phrase_de(wert)
    neu, geaendert = [], False
    for t in teile:
        if t.lower() in GROESSE_DE:
            neu.append(GROESSE_DE[t.lower()])
            geaendert = True
            continue
        if GROESSE.match(t) or TECHNISCH.match(t):
            neu.append(t)                     # Grössenkürzel und Technik bleiben, wie sie sind
            continue
        d = phrase_de(t)
        if d is None:
            return None                       # ein unbekanntes Stück → gar nichts anfassen
        neu.append(d)
        geaendert = True
    return "-".join(neu) if geaendert else None


def main():
    kandidaten, statistik = [], Counter()
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        for o in (p.get("options") or []):
            if (o.get("name") or "").strip().lower() not in ("farbe", "color", "colour"):
                continue
            treffer = []
            for v in (o.get("values") or []):
                d = wert_de(v.strip())
                if d and d != v.strip():
                    treffer.append((v.strip(), d))
            if treffer:
                kandidaten.append((p["id"], p["title"]))
                for a, b in treffer:
                    statistik[(a, b)] += 1
            break

    print(f"Produkte mit übersetzbaren Farbwerten: {len(kandidaten)} | "
          f"Werte: {sum(statistik.values())}", flush=True)
    for (a, b), n in statistik.most_common(24):
        print(f"   {n:>4}  {a[:30]:<32} → {b}", flush=True)
    if DRY or not kandidaten:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = fehler = 0
    for gid, titel in kandidaten:
        if gid in done:
            continue
        d = gql('query($id:ID!){node(id:$id){... on Product{options{id name '
                'optionValues{id name}}}}}', {"id": gid})
        opts = ((d.get("data") or {}).get("node") or {}).get("options") or []
        opt = next((o for o in opts if (o.get("name") or "").strip().lower()
                    in ("farbe", "color", "colour")), None)
        if not opt:
            continue
        # Innerhalb einer Option darf kein Name doppelt vorkommen — sonst verschmilzt Shopify
        # zwei Varianten. Bereits vergebene Namen deshalb mitzählen.
        belegt = {v["name"].strip().lower() for v in opt["optionValues"]}
        upd = []
        for v in opt["optionValues"]:
            neu = wert_de(v["name"].strip())
            if not neu or neu == v["name"].strip():
                continue
            if neu.lower() in belegt:
                continue                       # Name existiert schon → überspringen
            belegt.discard(v["name"].strip().lower())
            belegt.add(neu.lower())
            upd.append({"id": v["id"], "name": neu})
        if not upd:
            f.write(f"{gid}\tnichts-zu-tun\n")
            continue
        r = gql('mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){'
                'productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u)'
                '{userErrors{message}}}', {"p": gid, "o": {"id": opt["id"]}, "u": upd})
        e = ((r.get("data") or {}).get("productOptionUpdate") or {}).get("userErrors")
        if e:
            fehler += 1
            print(f"  ⚠️ {titel[:34]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\t{len(upd)}\t{titel}\n")
        if n % 100 == 0:
            f.flush()
            print(f"  … {n}/{len(kandidaten)}", flush=True)
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Produkte übersetzt, {fehler} Fehler")


if __name__ == "__main__":
    main()
