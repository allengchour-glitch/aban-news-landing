"""Findet Titel, die durch eine KÜRZUNG von heute doppelt geworden sind — und trennt sie wieder.

WARUM: Die Selbstprüfung fand 52 doppelte Titel in der Stichprobe, darunter vier Wearables aus
dem Heilversprechen-Lauf. Das ist kein Zufall, sondern die Kehrseite jeder Kürzung: Wenn zwei
Artikel sich NUR im gestrichenen Teil unterschieden —

    «Smart Armband mit EKG, Blutdruck & Herzfrequenz»   ─┐  gestrichen: EKG, Blutdruck
    «Smart Armband mit Blutzucker & Herzfrequenz»       ─┘  gestrichen: Blutzucker
                          ↓ beide werden
    «Smart Armband mit Herzfrequenz»

— dann macht die Bereinigung aus zwei unterscheidbaren Artikeln zwei ununterscheidbare. Genau
deshalb blieben am 11.08. 41 Artikelnummern bewusst in den Titeln stehen: dort war der Code das
EINZIGE Unterscheidungsmerkmal. Dieselbe Regel gilt rückwirkend für die Kürzungen von heute.

DIE MESSUNG MUSS EHRLICH SEIN. Der Katalog hat schon von sich aus 850 titelgleiche Produkte
(CJ listet dieselbe Ware mehrfach). Wer alle Dubletten dem eigenen Lauf zurechnet, repariert
fremde Probleme und meldet sich selbst zu schlecht. Deshalb wird gegen den URSPRUNGSTITEL
geprüft: Der steht unangetastet in der SEO-Beschreibung («<Originaltitel> – … LuxeStyle»), die
kein Kürzungslauf angefasst hat. Nur wo die Originale VERSCHIEDEN waren und die heutigen
Titel GLEICH sind, hat die Kürzung Schaden angerichtet.

DIE REPARATUR fügt kein Heilversprechen zurück. Sie nimmt ein sachliches Unterscheidungsmerkmal,
das ohnehin am Produkt hängt, in dieser Reihenfolge:
  1. ein Modellkürzel aus dem Originaltitel («S5», «P66», «T900») — sachlich und stumm,
  2. die Farbe aus dem Farb-Metafeld,
  3. der Preis-Rang als «· Modell 2», wenn gar nichts anderes greift.
Das dritte ist bewusst das letzte Mittel: Eine erfundene Nummer sagt der Kundin nichts, sie
verhindert aber, dass zwei Karten nebeneinander exakt gleich heissen.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import defaultdict

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_titel_kollision.txt"

# Welche Läufe von heute haben Titel GEKÜRZT? Nur die können Kollisionen erzeugt haben.
KUERZUNGS_LEDGER = [
    "dropship/_heilversprechen.txt",
    "dropship/_heilversprechen_seo.txt",
    "dropship/_titelcode_entfernt.txt",
    "dropship/_google_kanal_gesaeubert.txt",   # Markenname aus dem Titel gestrichen
]

# Der SEO-Anhang, den die Shop-Bausteine hinten anhängen. Davor steht der Originaltitel.
SEO_ANHANG = re.compile(r'\s*[–—-]\s*(?=[^–—]*LuxeStyle)')
# Modellkürzel: 1–2 Buchstaben + Ziffern, oder Ziffern + Buchstabe. «S5», «T900», «P66», «M6».
# ⚠️ NICHT jede Zahl ist ein Modell: «5 Stück», «2026», «650 nm», «1080P» sind Angaben. Die
# Schutzliste ist dieselbe wie beim Titelcode-Lauf — dort kostete ihr Fehlen beinahe die
# UV400-Angabe einer Sonnenbrille.
MODELL = re.compile(r'\b([A-Z]{1,2}\d{1,4}[A-Z]?|\d{1,2}[A-Z]{1,2})\b')
KEIN_MODELL = {"UV400", "TR90", "RF433", "SR626SW", "IP67", "IP68", "USB2", "USB3", "TYPE3",
               "1080P", "4K", "2K", "3D", "5G", "4G", "A4", "A3", "A5", "B1", "B2", "XL", "XXL",
               "S1", "M1", "L1", "CE", "EN71", "PU", "PVC", "TPU", "ABS", "LED", "RGB", "USB"}


def gql(q, v=None):
    with open("/tmp/_tk.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_tk.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def modellkuerzel(text):
    for m in MODELL.finditer(text or ""):
        w = m.group(1)
        if w.upper() in KEIN_MODELL:
            continue
        # Eine nackte kleine Zahl mit einem Buchstaben davor ist zu schwach («A4» ist Papier).
        if len(w) < 2:
            continue
        return w
    return ""


def main():
    ids = []
    for pfad in KUERZUNGS_LEDGER:
        if not os.path.exists(pfad):
            continue
        for zeile in open(pfad):
            t = zeile.split("\t")[0].strip()
            if t.startswith("gid://shopify/Product/"):
                ids.append(t)
    ids = list(dict.fromkeys(ids))
    print(f"Von heute gekürzte Titel: {len(ids)}", flush=True)

    produkte = []
    for i in range(0, len(ids), 100):
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status '
                'seo{title description} metafield(namespace:"mm-google-shopping",key:"color"){value} '
                'priceRangeV2{minVariantPrice{amount}}}}}', {"ids": ids[i:i + 100]})
        produkte += [n for n in ((d.get("data") or {}).get("nodes") or []) if n]
        time.sleep(0.3)
    produkte = [p for p in produkte if p.get("status") == "ACTIVE"]
    print(f"davon aktiv: {len(produkte)}", flush=True)

    # Heutiger Titel → Produkte. Und je Produkt der Originaltitel aus der SEO-Beschreibung.
    nach_titel = defaultdict(list)
    for p in produkte:
        sd = (p.get("seo") or {}).get("description") or ""
        p["_original"] = SEO_ANHANG.split(sd, 1)[0].strip() if sd else ""
        nach_titel[(p.get("title") or "").strip().lower()].append(p)

    aufgaben = []
    fremd = 0
    for titel, gruppe in nach_titel.items():
        if len(gruppe) < 2:
            continue
        originale = {p["_original"].strip().lower() for p in gruppe if p["_original"]}
        # Waren die Originale schon gleich, ist die Dublette ÄLTER als mein Lauf — CJ hat
        # dieselbe Ware zweimal gelistet. Nicht mein Schaden, nicht meine Reparatur.
        if len(originale) < 2:
            fremd += 1
            continue
        # Den ersten lassen wir wie er ist; die übrigen bekommen ihr Merkmal zurück.
        for rang, p in enumerate(sorted(gruppe, key=lambda x: x["id"])):
            if rang == 0:
                continue
            zusatz = modellkuerzel(p["_original"])
            quelle = "Modell"
            if not zusatz:
                farbe = (p.get("metafield") or {}).get("value") or ""
                if farbe and len(farbe) <= 20 and farbe.lower() not in titel:
                    zusatz, quelle = farbe, "Farbe"
            if not zusatz:
                zusatz, quelle = f"Modell {rang + 1}", "Rang"
            neu = f"{p['title']} · {zusatz}"
            if len(neu) > 255:
                continue
            aufgaben.append((p["id"], p["title"], neu, quelle, p))

    print(f"Kollisionen durch MEINE Kürzung: {len(aufgaben)} Titel zu trennen", flush=True)
    print(f"schon vorher titelgleich (fremd, nicht angefasst): {fremd} Gruppen", flush=True)
    for _, alt, neu, q, _p in aufgaben[:14 if DRY else 6]:
        print(f"   [{q:<6}] {alt[:48]:<50} → «… · {neu.rsplit(' · ', 1)[1]}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, alt, neu, q, p in aufgaben:
        if gid in done:
            continue
        eingabe = {"id": gid, "title": neu}
        # Der Titel allein macht das Produkt unterscheidbar, die SEO-Beschreibung NICHT — sie
        # trägt weiter den alten Namen und ist damit wortgleich mit dem Schwesterprodukt.
        # Nur spiegeln, wenn ihr eigener Teil zeichengenau der ALTE Titel ist; einen selbst
        # geschriebenen Text fassen wir nicht an. ⚠️ seo{} ersetzt das ganze Objekt → beide
        # Felder zurücksenden, sonst löscht der Schreibvorgang den SEO-Titel.
        seo_alt = p.get("seo") or {}
        sd = seo_alt.get("description") or ""
        rest = sd[len(alt):] if sd.startswith(alt) else ""
        if rest and re.match(r'\s*[–—-]\s', rest):
            seo_neu = {"description": neu + rest}
            if seo_alt.get("title"):
                seo_neu["title"] = seo_alt["title"]
            eingabe["seo"] = seo_neu
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": eingabe})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{gid}\t{q}\t{neu}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Titel wieder unterscheidbar")


if __name__ == "__main__":
    main()
