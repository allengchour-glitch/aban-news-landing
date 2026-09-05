"""Ergänzt zu dünne Titel um Angaben, die AM PRODUKT SCHON STEHEN — nichts wird erfunden.

DER BEFUND: 969 aktive Produkte IM GOOGLE-KANAL tragen einen Titel aus höchstens zwei Wörtern:
«Slim-Fit Jeans», «Herz-Halskette», «Retro Pumps», «Bikini-Set». Sachlich sind sie richtig, nur
sind sie im Wettbewerb stumm. Googles Gratis-Einträge sind der EINZIGE Kanal mit belegten
Verkäufen (52 Klicks, +206 %, praktisch alles organisch) — dort entscheidet der Titel, ob ein
Artikel auf «herren jeans slim fit dunkelblau» überhaupt erscheint. «Slim-Fit Jeans» erscheint
auf «jeans». Mehr nicht.

DIE QUELLE IST DAS PRODUKT SELBST. Angehängt wird nur, was in den Google-Metafeldern steht —
Geschlecht, Farbe, Material. Genau diese Felder wurden heute gesäubert (1'571 Farbwerte, 554
Altersgruppen), sie sind also so verlässlich wie nie. Es wird KEINE Eigenschaft geraten und
keine aus der Beschreibung geschätzt.

⚠️ DIE TEUERSTE FALLE HIER IST DIE FARBE. 300 der 969 Kandidaten haben MEHRERE Farbvarianten.
Wer einem Kleid mit sechs Farben «· Schwarz» in den Titel schreibt, macht aus einer Auswahl eine
Falschangabe — dieselbe Sorte Fehler wie «ab CHF 4.90», wo eine Zubehör-«Farbe» den Preis log.
Deshalb: Farbe NUR, wenn das Produkt genau eine hat.

⚠️ GESCHLECHT GEHÖRT NICHT AN JEDES PRODUKT. Das Metafeld steht bei 882 von 969, aber
«Knie-Massager · Herren» ist Unsinn — bei Massagegeräten sagt es nichts. Google verlangt
`gender` für Bekleidung, Schuhe, Schmuck, Uhren, Taschen; nur dort wird es angehängt.

Reihenfolge im Titel: «<Titel> · <Damen|Herren> · <Farbe> · <Material>», gekappt bei 70 Zeichen —
weiter zeigt Google in den Einträgen ohnehin nicht.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_titel_angereichert.txt"
MAXLEN = 70

# Nur wo Google das Feld überhaupt auswertet — und wo es die Kundin im Titel erwartet.
GESCHLECHT_TYPEN = {"damenmode", "herrenmode", "damenschuhe", "herrenschuhe", "schuhe",
                    "taschen", "uhren", "schmuck", "bekleidung", "mode", "unterwäsche",
                    "sportbekleidung", "bademode", "accessoires"}
GESCHLECHT = {"male": "Herren", "female": "Damen"}
# ⚠️ «unisex» wird bewusst NICHT geschrieben: es grenzt nichts ein und macht den Titel nur länger.

# Ein geschlossener Wortschatz. Alles, was hier nicht steht, ist kein Farbwort — auch wenn es
# im Farbfeld steht. Der Farbfeld-Lauf von heute hat 664 Müllwerte geleert, aber ein
# geschlossener Vergleich ist die einzige Wache, die auch beim NÄCHSTEN Importlauf noch hält.
FARBEN = {"Schwarz", "Weiss", "Weiß", "Grau", "Silber", "Gold", "Rosegold", "Beige", "Braun",
          "Blau", "Dunkelblau", "Hellblau", "Marineblau", "Türkis", "Grün", "Dunkelgrün",
          "Hellgrün", "Oliv", "Rot", "Dunkelrot", "Bordeaux", "Rosa", "Pink", "Lila", "Violett",
          "Gelb", "Orange", "Creme", "Khaki", "Bunt", "Transparent", "Anthrazit"}
# Materialien, die im Titel etwas aussagen. «Polyester» und «Plastik» sagen der Kundin nichts
# Gutes und bleiben draussen — sie machen den Titel länger und das Produkt billiger.
MATERIAL_GUT = {"Leder", "Echtleder", "Edelstahl", "Baumwolle", "Leinen", "Seide", "Wolle",
                "Kaschmir", "Bambus", "Keramik", "Glas", "Silikon", "Titan", "Messing",
                "Marmor", "Holz", "Samt", "Denim", "Jeans", "Kork"}
# Steht das Geschlecht schon irgendwie drin, wird es nicht wiederholt.
# ⚠️ OHNE ABSCHLIESSENDE WORTGRENZE. Der Probelauf schlug «Weites Damenhemd · Damen» vor:
# `\bDamen\b` findet «Damen» in «Damenhemd» nicht, weil nach dem n kein Wortende steht. Im
# Deutschen ist genau das der Normalfall — Damenhemd, Herrenuhr, Kinderjacke, Männerhemd. Es
# ist dieselbe Falle wie armband**uhr** ≠ Armband im Tag-Mapper: vorne die Grenze, hinten nicht.
SCHON_GESCHLECHT = re.compile(r'\b(?:Damen|Herren|Frauen|M[äa]nner|Kinder|Baby|Unisex|Girl|Boy|'
                              r'Women|Mens?)', re.I)
# ⚠️ Diese Warengruppen tragen englische Motivnamen («Sticker «Frog2»», «Tasse «Baern»»). Das
# ist ein anderer Mangel — ein Motivname wird durch ein angehängtes «Damen» nicht besser.
AUSGENOMMEN = {"sticker", "tasse", "poster", "magnet"}


def gql(q, v=None):
    with open("/tmp/_ta.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ta.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
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


def normfarbe(w):
    w = (w or "").strip()
    for f in FARBEN:
        if w.lower() == f.lower():
            return f
    return ""


def normmaterial(w):
    w = (w or "").strip()
    for m in MATERIAL_GUT:
        if w.lower() == m.lower():
            return m
    return ""


def main():
    aufgaben = []
    grund = Counter()
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or not p.get("g"):
            continue
        t = (p.get("title") or "").strip()
        if len(t) > 16 or len(t.split()) > 2:
            continue
        typ = (p.get("productType") or "").strip().lower()
        if typ in AUSGENOMMEN:
            grund["motivname (Sticker/Tasse)"] += 1
            continue

        mf = {m["key"]: m["value"] for m in (p.get("mf") or {}).get("nodes", [])}
        teile = []

        g = GESCHLECHT.get((mf.get("gender") or "").lower())
        if g and typ in GESCHLECHT_TYPEN and not SCHON_GESCHLECHT.search(t):
            teile.append(g)

        # Farbe nur bei EINDEUTIGER Farbe (siehe Kopfkommentar).
        mehrfarbig = any(o["name"].lower() in ("farbe", "color", "couleur")
                         and len(o.get("values") or []) > 1 for o in (p.get("options") or []))
        f = normfarbe(mf.get("color"))
        if f and not mehrfarbig and f.lower() not in t.lower():
            teile.append(f)
        elif f and mehrfarbig:
            grund["farbe verschwiegen (mehrere Varianten)"] += 1

        m = normmaterial(mf.get("material"))
        if m and m.lower() not in t.lower():
            teile.append(m)

        if not teile:
            grund["nichts Belegtes zum Ergänzen"] += 1
            continue
        neu = t
        for stueck in teile:
            kandidat = f"{neu} · {stueck}"
            if len(kandidat) > MAXLEN:
                break
            neu = kandidat
        if neu == t:
            continue
        aufgaben.append((p["id"], t, neu))

    print(f"Titel zu ergänzen: {len(aufgaben)}", flush=True)
    for k, v in grund.most_common():
        print(f"   übersprungen — {k}: {v}", flush=True)
    for _, alt, neu in aufgaben[:16 if DRY else 6]:
        print(f"   {alt[:24]:<26} → {neu}", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, alt, neu in aufgaben:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "title": neu}})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{gid}\t{alt}\t{neu}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Titel angereichert")


if __name__ == "__main__":
    main()
