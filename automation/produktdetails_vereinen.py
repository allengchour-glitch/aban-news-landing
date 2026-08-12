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
LEDGER = "dropship/_produktdetails_vereint.txt"

BLOCK = re.compile(r'<div class="(?:ls-feed-details|ls-produktdetails)">.*?</div>', re.S | re.I)
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
    return BLOCK.sub(ersetze, html), True


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
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
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "descriptionHtml": neu}})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tvereint\n")
        if n % 200 == 0:
            f.flush()
            print(f"  … {n}/{len(aufgaben)}", flush=True)
        time.sleep(0.25)
    f.flush()
    print(f"FERTIG: {n} Beschreibungen vereint")


if __name__ == "__main__":
    main()
