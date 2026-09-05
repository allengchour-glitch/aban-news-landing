"""Räumt das Google-Farbfeld auf: was keine Farbe ist, gehört nicht hinein.

DER BEFUND (12.08.2026): Von 10'829 gesetzten `mm-google-shopping.color`-Werten sind
**1'864 (17,2 %) keine Farbe**, verteilt auf 1'405 verschiedene Zeichenketten:

    'Black-1XL' (25×) · 'S-Black' (57×) · 'Style 1-1 PC' (40×) · '1 Style' (33×)
    'Amber-30X50cm' · 'Black Increased 6CM' · 'Red-21 Yards' · 'Pink-1pair'
    'Picture Color' · 'Mosquito coil type' · '1PC-Sponge brush' · 'ESFY…' (Rohcode)

Die Ursache ist mechanisch und steht im Importer: das Feld übernimmt **wörtlich den ersten
Wert der Options-Liste «Farbe»** — und die trägt bei CJ-Ware oft Grösse plus Farbe, eine
Stilnummer oder einen Lieferantencode. Der Importer prüft nur die LÄNGE des Werts, nicht
seine Bedeutung. «Black-1XL» ist 10 Zeichen lang und rutscht durch.

Google nutzt `color` zum Filtern («Damenkleid schwarz»). Ein Wert wie «Style 1-1 PC» macht
das Produkt in keinem Farbfilter auffindbar und wirkt im Feed wie ein Datenfehler — was er ja
auch ist.

VORGEHEN: Enthält der Wert eine Grössenangabe, eine Masszahl, eine Stück-/Stilnummer oder
einen Rohcode, wird versucht, den FARBTEIL herauszulösen («Black-1XL» → «Schwarz», «S-Black»
→ «Schwarz»). Geht das nicht eindeutig, wird das Feld **geleert**. Ein leeres Farbfeld ist im
Merchant-Feed folgenlos; ein falsches macht die Ware unauffindbar.

⚠️ Nicht jeder ungewöhnliche Wert ist Müll: «Rosé», «Khaki», «Champagner», «Bunt» sind echte
Farben, auch wenn sie in keiner Grundfarbenliste stehen. Geleert wird nur, was ein
NACHWEISBARES Fremdmerkmal trägt (Ziffer, Grössenkürzel, Einheit, «Style», «PC», «pair»).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_farbfeld_gesaeubert.txt"

GROESSE = r'(?:XXS|XS|S|M|L|XL|XXL|[2-6]XL|\d{2,3})'
# Merkmale, die beweisen, dass der Wert keine reine Farbe ist.
FREMD = re.compile(r'\d|\bStyle\b|\bPCS?\b|\bpair\b|\bSet\b|\bYards?\b|\bcm\b|\bmm\b|\bml\b|'
                   r'\bInch\b|\bZoll\b|\btype\b|\bbrush\b|Picture\s*Color|Random|Assorted',
                   re.I)
# «S-Black», «Black-1XL», «M-Wine Red»
VORNE = re.compile(r'^' + GROESSE + r'\s*[-–/]\s*(?P<farbe>.+)$', re.I)
HINTEN = re.compile(r'^(?P<farbe>.+?)\s*[-–/]\s*' + GROESSE + r'$', re.I)

FARBE = {
    "black": "Schwarz", "white": "Weiss", "red": "Rot", "blue": "Blau", "green": "Grün",
    "yellow": "Gelb", "grey": "Grau", "gray": "Grau", "pink": "Pink", "purple": "Lila",
    "brown": "Braun", "beige": "Beige", "gold": "Gold", "silver": "Silber", "orange": "Orange",
    "navy": "Marineblau", "khaki": "Khaki", "violet": "Violett", "ivory": "Elfenbein",
    "coffee": "Kaffeebraun", "cream": "Creme", "nude": "Nude", "camel": "Camel",
    "turquoise": "Türkis", "burgundy": "Bordeaux", "apricot": "Aprikose", "amber": "Bernstein",
    "champagne": "Champagner", "lavender": "Lavendel", "rose": "Rosé", "wine red": "Weinrot",
    "dark gray": "Dunkelgrau", "dark grey": "Dunkelgrau", "light gray": "Hellgrau",
    "light grey": "Hellgrau", "dark blue": "Dunkelblau", "light blue": "Hellblau",
    "sky blue": "Himmelblau", "navy blue": "Marineblau", "army green": "Armeegrün",
    "dark green": "Dunkelgrün", "light green": "Hellgrün", "rose red": "Rosarot",
    "hot pink": "Pink", "light pink": "Rosa", "dark brown": "Dunkelbraun",
    "light brown": "Hellbraun", "multicolor": "Bunt", "multicolour": "Bunt",
    "transparent": "Transparent", "clear": "Transparent",
}
# Bereits deutsche Farbwerte — die sind in Ordnung.
DEUTSCH = {v.lower() for v in FARBE.values()} | {
    "schwarz", "weiss", "weiß", "rot", "blau", "grün", "gelb", "grau", "rosa", "lila",
    "braun", "beige", "gold", "silber", "orange", "türkis", "violett", "creme", "bunt"}


def gql(q, v=None):
    with open("/tmp/_ff.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ff.json"], capture_output=True, text=True)
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


def als_farbe(wert):
    """Gibt eine saubere Farbe zurück, '' zum Leeren, oder None wenn nichts zu tun ist."""
    w = wert.strip()
    if not FREMD.search(w):
        return None                                   # unauffällig → in Ruhe lassen
    kern = w
    for muster in (VORNE, HINTEN):
        m = muster.match(w)
        if m:
            kern = m.group("farbe").strip()
            break
    k = kern.lower().strip(" -–/")
    if k in FARBE:
        return FARBE[k]
    if k in DEUTSCH:
        return kern[:1].upper() + kern[1:]
    # Letzter Versuch: steckt irgendwo im Wert ein echtes Farbwort als eigenes Wort?
    # «P30i Black», «24pcs Black», «Pink 10pcs OPP packaging» tragen die Farbe mit sich, nur
    # eben zwischen Modellnummer und Verpackungsangabe. Das längste Treffer-Wort gewinnt,
    # damit «light blue» nicht als blosses «blue» endet.
    treffer = [n for n in sorted(FARBE, key=len, reverse=True)
               if re.search(r'(?<![a-zäöü])' + re.escape(n) + r'(?![a-zäöü])', k)]
    if treffer:
        return FARBE[treffer[0]]
    treffer = [n for n in sorted(DEUTSCH, key=len, reverse=True)
               if re.search(r'(?<![a-zäöü])' + re.escape(n) + r'(?![a-zäöü])', k)]
    if treffer:
        return treffer[0][:1].upper() + treffer[0][1:]
    return ""                                          # nicht auflösbar → Feld leeren


def main():
    aufgaben, statistik = [], Counter()
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        mf = {m["key"]: m["value"] for m in ((p.get("mf") or {}).get("nodes") or [])}
        wert = mf.get("color")
        if not wert:
            continue
        neu = als_farbe(wert)
        if neu is None or neu == wert:
            continue
        aufgaben.append((p["id"], p["title"], wert, neu))
        statistik["gerettet" if neu else "geleert"] += 1

    print(f"Farbfelder ohne Farbe: {len(aufgaben)}  "
          f"({statistik['gerettet']} in eine echte Farbe übersetzt, "
          f"{statistik['geleert']} geleert)", flush=True)
    for _, t, alt, neu in aufgaben[:16 if DRY else 6]:
        print(f"   {t[:34]:<36} «{alt[:26]:<26}» → «{neu or '(leer)'}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    stapel = []
    for gid, titel, alt, neu in aufgaben:
        if gid in done:
            continue
        stapel.append((gid, alt, neu))
        if len(stapel) == 25:                     # metafieldsSet: harte Grenze
            n += schreiben(stapel, f)
            stapel = []
    if stapel:
        n += schreiben(stapel, f)
    f.flush()
    print(f"FERTIG: {n} Farbfelder bereinigt")


def schreiben(stapel, f):
    # Ein leerer Wert ist bei metafieldsSet nicht erlaubt — leeren heisst löschen.
    setzen = [{"ownerId": gid, "namespace": "mm-google-shopping", "key": "color",
               "type": "single_line_text_field", "value": neu}
              for gid, _, neu in stapel if neu]
    loeschen = [{"ownerId": gid, "namespace": "mm-google-shopping", "key": "color"}
                for gid, _, neu in stapel if not neu]
    ok = 0
    if setzen:
        r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
                '{userErrors{message}}}', {"m": setzen})
        e = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ setzen: {e[0]['message'][:70]}", flush=True)
        else:
            ok += len(setzen)
    if loeschen:
        r = gql('mutation($m:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$m)'
                '{userErrors{message}}}', {"m": loeschen})
        e = ((r.get("data") or {}).get("metafieldsDelete") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ löschen: {e[0]['message'][:70]}", flush=True)
        else:
            ok += len(loeschen)
    for gid, alt, neu in stapel:
        f.write(f"{gid}\t{alt}\t{neu or '(geleert)'}\n")
    f.flush()
    time.sleep(0.4)
    return ok


if __name__ == "__main__":
    main()
