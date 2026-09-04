"""Führt doppelte «Produktdetails»-Blöcke zusammen und übersetzt die Farbliste.

WAS AUF DEM BILDSCHIRM STAND (Screenshot der Produktseite, 11.08.2026): Unter der Beschreibung
kam die Überschrift «Produktdetails» ZWEIMAL hintereinander — mit teils gleichem, teils
widersprüchlichem Inhalt:

    <div class="ls-feed-details">   Farbe · Grösse · Material: elastischer Stoff · Muster
    <div class="ls-produktdetails"> Farbe · Material: Polyester, Viskose

Zwei Generatoren haben über die Zeit je einen eigenen Block angehängt, jeder mit eigener
CSS-Klasse, keiner wusste vom anderen. Betroffen sind **3'611 aktive Produkte**. Für eine
Kundin sieht das nach einem kaputten Shop aus — und die beiden Materialangaben widersprechen
sich obendrein.

Zusätzlich stand dort die Farbliste weiterhin englisch («Light Grey, Grey C Thin, Deep Navy»),
obwohl die Auswahlliste oben inzwischen «Hellgrau» zeigt. Derselbe Artikel, zwei Sprachen.

VORGEHEN
 • Beide Blöcke einlesen, Einträge nach Etikett (Farbe, Grösse, Material, Muster …) vereinen.
 • Bei Widerspruch gewinnt die konkretere Angabe: «Polyester, Viskose» sagt mehr als
   «elastischer Stoff». Gemessen wird an einer Liste echter Materialwörter, nicht an der Länge.
 • Farbwerte übersetzen, soweit sie eindeutig sind; unbekannte bleiben unangetastet.
 • Grössen sortieren — «46, 48, 50, 52, 38, 40, 42, 44, 32 …» liest sich wie ein Fehler.
 • Ein einziger Block bleibt übrig.

DRY=1 zeigt Vorher/Nachher.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
# ⚠️ EIGENES LEDGER FÜR DEN ZWEITEN DURCHGANG. Im ersten stehen 1'595 Produkte als «erledigt» —
# und genau die sind es, bei denen der dritte Block (`gmc-details`) jetzt noch zusammenzuführen
# ist. Mit dem alten Ledger würde der Lauf ausgerechnet die Betroffenen überspringen und
# «nichts zu tun» melden. Wird die REGEL erweitert, ist das alte Erledigt-Zeichen wertlos.
LEDGER = os.environ.get("LEDGER", "dropship/_produktdetails_vereint2.txt")
# Arbeitsliste aus dem taeglichen Klassen-Vollscan (statt eines alternden Exports).
LISTE = os.environ.get("LISTE", "")
# ⚠️ 20.08.2026 — DRITTER DURCHGANG NÖTIG. `versandaussagen_wahrheit.py` (14.08.) hat bei
# 150 aktiven Produkten den entfernten Zweitblock aus einer STUNDEN ALTEN Textbasis wieder
# zurückgeschrieben. Alle 150 stehen in _produktdetails_vereint.txt UND ...2.txt als
# «vereint» — ein Neustart würde sie überspringen und Vollzug melden. Deshalb LEDGER per
# Env auf _produktdetails_vereint3.txt setzen und EXPORT aus LIVE-Daten speisen.

# ⚠️ NACHTRAG 12.08.2026 — ES WAREN DREI BLÖCKE, NICHT ZWEI.
# Der erste Lauf kannte `ls-feed-details` und `ls-produktdetails` und meldete danach «0 aktive
# Produkte mit doppeltem Block». Die Nachkontrolle zählte anders: sie suchte nach der
# sichtbaren ÜBERSCHRIFT statt nach den bekannten Klassennamen — und fand 1'444 aktive
# Produkte, bei denen «Produktdetails» weiterhin zweimal untereinander steht. Der dritte
# Generator schreibt `<div class="gmc-details">` mit `<h3>` statt `<h4>`.
# Lehre: Beim Aufräumen nach dem suchen, was die Kundin SIEHT (die Überschrift), nicht nach
# dem, was der eigene Code hinterlässt (die Klasse). Sonst prüft man nur die Fehler, die man
# schon kennt, und meldet Vollzug.
# Der Inhalt ist wichtiger als die Doppelung: bei 605 der Produkte widersprechen sich die
# Materialangaben («Polyester, Elastan» gegen «Polyester»). Reines Löschen des zweiten Blocks
# würde die genauere Angabe stillschweigend durch die gröbere ersetzen — deshalb wird
# zusammengeführt, nicht gelöscht.
BLOCK = re.compile(r'<div class="(?:ls-feed-details|ls-produktdetails|gmc-details)"[^>]*>'
                   r'.*?</div>', re.S | re.I)
EINTRAG = re.compile(r'<li>\s*<strong>\s*([^<:]+?)\s*:?\s*</strong>\s*([^<]*)</li>', re.I)

FARBE = {
    "black": "Schwarz", "white": "Weiss", "red": "Rot", "blue": "Blau", "green": "Grün",
    "yellow": "Gelb", "grey": "Grau", "gray": "Grau", "pink": "Pink", "purple": "Lila",
    "brown": "Braun", "beige": "Beige", "gold": "Gold", "silver": "Silber",
    "orange": "Orange", "navy": "Marineblau", "khaki": "Khaki", "ivory": "Elfenbein",
    "coffee": "Kaffeebraun", "apricot": "Aprikose", "burgundy": "Bordeaux",
    "light grey": "Hellgrau", "light gray": "Hellgrau", "dark grey": "Dunkelgrau",
    "dark gray": "Dunkelgrau", "deep navy": "Dunkles Marineblau", "navy blue": "Marineblau",
    "light blue": "Hellblau", "dark blue": "Dunkelblau", "sky blue": "Himmelblau",
    "wine red": "Weinrot", "army green": "Armeegrün", "light green": "Hellgrün",
    "dark green": "Dunkelgrün", "light brown": "Hellbraun", "dark brown": "Dunkelbraun",
    "rose red": "Rosarot", "hot pink": "Pink", "light pink": "Rosa",
}
# ⚠️ 20.08.2026: Die alte Regel «längerer Wert gewinnt» hat bei 10 von 150 Produkten die
# ENGLISCHE Farbliste gewählt, obwohl der andere Block die deutsche trug («Orange Red,
# Emerald Green» statt «Orangerot, Smaragdgrün»). Blockweises Löschen wäre hier die falsche
# Reparatur gewesen: der eine Block trägt das bessere Material, der andere die besseren Farben.
# Deshalb wird die Farbe FELDWEISE gewählt — Wort für Wort gewinnt die nicht-englische Form.
ENGLISCH = re.compile(
    r'\b(black|white|red|blue|green|grey|gray|yellow|purple|brown|navy|khaki|ivory|coffee|'
    r'apricot|burgundy|emerald|sapphire|brick|denim|camel|light|dark|deep|army|wine|sky|rose|'
    r'thin|thick|silver|golden|multi|clear|nude|color|and)\b', re.I)


def farbe_waehlen(a, b):
    """Aus zwei Farblisten die deutschere bauen (Reihenfolge bleibt erhalten)."""
    ta = [t.strip() for t in a.split(",") if t.strip()]
    tb = [t.strip() for t in b.split(",") if t.strip()]
    if len(ta) == len(tb):
        out = []
        for x, y in zip(ta, tb):
            ex, ey = bool(ENGLISCH.search(x)), bool(ENGLISCH.search(y))
            out.append(y if (ex and not ey) else x)
        return ", ".join(out)
    # Ungleich lang: die Liste mit weniger englischen Resten gewinnt.
    return a if len(ENGLISCH.findall(a)) <= len(ENGLISCH.findall(b)) else b


MATERIALWORT = re.compile(
    r'baumwolle|cotton|polyester|viskose|viscose|leder|leather|metall|silber|gold|edelstahl|'
    r'kunststoff|plastic|acryl|nylon|wolle|seide|silk|leinen|linen|keramik|holz|glas|'
    r'legierung|alloy|gummi|silikon|strick|fleece|denim|samt|spitze|bambus|elasthan', re.I)


def gql(q, v=None):
    with open("/tmp/_pd.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_pd.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def farbe_de(wert):
    teile = [t.strip() for t in wert.split(",") if t.strip()]
    return ", ".join(FARBE.get(t.lower(), t) for t in teile)


def groessen_sortiert(wert):
    teile = [t.strip() for t in wert.split(",") if t.strip()]
    ordnung = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL", "6XL"]
    def rang(t):
        u = t.upper()
        if u in ordnung:
            return (0, ordnung.index(u))
        if re.fullmatch(r'\d+', t):
            return (1, int(t))
        return (2, 0)
    # Nur sortieren, wenn ALLE Werte einer Ordnung folgen — sonst lieber unangetastet lassen.
    if any(rang(t)[0] == 2 for t in teile):
        return wert
    return ", ".join(sorted(teile, key=rang))


def vereinen(html):
    bloecke = BLOCK.findall(html)
    if len(bloecke) < 2:
        return html, False
    felder = {}
    for b in bloecke:
        for label, wert in EINTRAG.findall(b):
            label, wert = label.strip(), wert.strip()
            if not wert:
                continue
            vorhanden = felder.get(label)
            if vorhanden is None:
                felder[label] = wert
            elif label.lower().startswith("material"):
                # Konkreteres Material gewinnt: «Polyester, Viskose» schlägt «elastischer Stoff».
                if MATERIALWORT.search(wert) and not MATERIALWORT.search(vorhanden):
                    felder[label] = wert
            elif label.lower().startswith("farbe"):
                felder[label] = farbe_waehlen(vorhanden, wert)
            elif len(wert) > len(vorhanden):
                felder[label] = wert
    if not felder:
        return html, False
    zeilen = []
    for label, wert in felder.items():
        if label.lower().startswith("farbe"):
            wert = farbe_de(wert)
        elif label.lower().startswith(("grösse", "groesse", "größe")):
            wert = groessen_sortiert(wert)
        zeilen.append(f"<li><strong>{label}:</strong> {wert}</li>")
    neu = ('<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>'
           + "".join(zeilen) + "</ul></div>")
    # Ersten Block ersetzen, alle weiteren entfernen.
    erst = [True]
    def ersetze(m):
        if erst[0]:
            erst[0] = False
            return neu
        return ""
    neu_html = BLOCK.sub(ersetze, html)
    # Spur des ersten Laufs: dort wurde die Klasse entfernt statt des Divs, zurück blieb ein
    # leeres «<div class="">». Harmlos, aber es gehört weg.
    neu_html = re.sub(r'<div class="">\s*</div>', '', neu_html)
    return neu_html, True


def kandidaten_live(pfad):
    """Holt die Produkte einer Arbeitsliste LIVE — ein Scan (klassen_kontrolle), viele Listen.

    ⚠️ Der EXPORT-Weg liest /tmp/export.jsonl. Diese Datei altert (gemessen: 30.08. noch als
    Quelle gelesen, waehrend der Katalog taeglich waechst) — ein Werkzeug, dessen Quelle
    veraltet, meldet Vollzug ueber eine Vergangenheit. Die Arbeitsliste von
    klassen_kontrolle.py wird taeglich neu gemessen; daraus wird hier live nachgeladen.
    """
    ids = [z.split("\t")[0].strip() for z in open(pfad) if z.strip()]
    Q = ('query($ids:[ID!]!){nodes(ids:$ids){... on Product'
         '{id title status descriptionHtml}}}')
    for i in range(0, len(ids), 50):
        gids = [f"gid://shopify/Product/{d}" for d in ids[i:i + 50]]
        r = gql(Q, {"ids": gids})
        for p in ((r.get("data") or {}).get("nodes") or []):
            if p:
                yield p
        time.sleep(0.3)


def main():
    aufgaben = []
    quelle = (kandidaten_live(LISTE) if LISTE
              else (json.loads(z) for z in open(EXPORT)))
    for p in quelle:
        # ⚠️ Entwürfe MIT aufräumen. 1'212 DRAFTs tragen die Doppelung ebenfalls; der Autopilot
        # schaltet laufend Entwürfe auf ACTIVE, also käme der bereinigte Fehler von dort
        # automatisch zurück. Ein Reiniger, der nur das Sichtbare putzt, arbeitet gegen eine
        # Quelle, die weiterläuft.
        if p["status"] == "ARCHIVED":
            continue
        d = p.get("descriptionHtml") or ""
        neu, geaendert = vereinen(d)
        if geaendert and neu != d:
            aufgaben.append((p["id"], p["title"], d, neu))

    print(f"Produkte mit doppeltem Produktdetails-Block: {len(aufgaben)}", flush=True)
    if DRY:
        for gid, t, alt, neu in aufgaben[:3]:
            print(f"\n— {t[:56]}", flush=True)
            for b in BLOCK.findall(alt):
                print("   ALT: " + re.sub(r'<[^>]+>', ' ', b)[:150].strip(), flush=True)
            for b in BLOCK.findall(neu):
                print("   NEU: " + re.sub(r'<[^>]+>', ' ', b)[:150].strip(), flush=True)
        return
    if not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, titel, alt, neu in aufgaben:
        if gid in done:
            continue
        # ⚠️ 03.09.2026: NICHT aus dem Export schreiben. Zwischen Export und Schreiben liegen
        # Minuten bis Stunden, und in dieser Zeit arbeiten ANDERE Textläufe an denselben
        # Beschreibungen (heute: der Trust-Baustein-Schreiber). Genau so hat ein Massenlauf am
        # 15.08. bei 149 Produkten den doppelten Block WIEDERBELEBT, den ein früherer entfernt
        # hatte. Deshalb: unmittelbar vor dem Schreiben den LIVE-Text holen und die Vereinigung
        # auf diesem rechnen. Ist der Doppelblock live schon weg, wird nichts geschrieben.
        lr = gql('query($i:ID!){product(id:$i){descriptionHtml}}', {"i": gid})
        live = (((lr.get("data") or {}).get("product") or {}).get("descriptionHtml")) or ""
        if not live:
            print(f"  ⚠️ {titel[:36]}: live nicht lesbar — übersprungen", flush=True)
            continue
        neu_live, geaendert_live = vereinen(live)
        if not geaendert_live or neu_live == live:
            f.write(f"{gid}\tlive-schon-sauber\n")
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "descriptionHtml": neu_live}})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tvereint\n")
        if n % 200 == 0:
            f.flush()
            print(f"  … {n}/{len(aufgaben)}", flush=True)
        time.sleep(0.5)   # max 2 Anfragen/s
    f.flush()
    print(f"FERTIG: {n} Beschreibungen vereint")


if __name__ == "__main__":
    main()
