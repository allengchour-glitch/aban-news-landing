"""Entfernt Artikelnummern aus Produkttiteln — aber nur, wo sie wirklich nichts aussagen.

DER BEFUND: 135 aktive Titel enden auf eine Zeichenfolge, die wie eine Lieferanten-Artikelnummer
aussieht («Sport-Yoga Jumpsuit 88201», «Casual Bademode KA-P402-01», «Make-up Pinsel 0622»).
Im Regal einer Kundin steht dort eine Zahl ohne Bedeutung.

⚠️ DREI FALLEN, alle im ersten Probelauf aufgetreten und alle teuer, wenn man sie übersieht:

 1. NICHT JEDE ZEICHENFOLGE IST EIN CODE. «UV400» ist der UV-Schutz, «TR90» das Rahmenmaterial,
    «SR626SW» die Batteriegrösse, «ELM327» der OBD2-Standard. Wer die entfernt, löscht die
    Angabe, wegen der das Produkt gekauft wird. Eine Schutzliste ist Pflicht.

 2. MANCHMAL IST DER CODE DAS EINZIGE UNTERSCHEIDUNGSMERKMAL. Sieben Produkte heissen
    «Taillierte Jeansjacke für Herren – Y110S / Y101S / Y102S …». Ohne Code wären es sieben
    identisch benannte Produkte — aus einem kosmetischen Makel würde ein echter Katalogfehler.
    Deshalb wird der gekürzte Titel gegen ALLE aktiven Titel UND gegen die übrigen Kürzungen
    geprüft; kollidiert er, bleibt der Code stehen.

 3. Ein Titel darf nicht zum Rumpf werden. Bleibt weniger als ein sinnvoller Name übrig, wird
    nichts geändert.

DRY=1 zeigt jede Änderung und jede Ablehnung mit Begründung.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_titelcode_entfernt.txt"

SUFFIX = re.compile(r'\s*[·\-–]?\s*(?P<code>[A-Z]{1,4}[-–]?[A-Z]?\d{2,}[A-Z0-9-]*|\d{4,6})\s*$')

# Alles, was wie ein Code aussieht, aber eine Aussage ist.
SCHUTZ = re.compile(
    r'^('
    r'UV\d+|TR\d+|RF\d+|'                 # UV-Schutz, Rahmenmaterial, Funkfrequenz
    r'(19|20)\d{2}|'                      # Jahreszahlen: «Modell 2025», «Sommer 2026»
    r'S?9[02][05]|1[48]K|750|585|'        # Edelmetall-Legierungen
    r'IP[5-6]\d|'                         # Schutzart
    r'4K|8K|\d+P|HD|UHD|'                 # Auflösung
    r'CR\d{4}[A-Z]*|LR\d{2,}[A-Z]*|AG\d+[A-Z]*|SR\d+[A-Z]*|ER\d{5}[A-Z]*|'   # Batterien
    r'18650|21700|16340|26650|'           # Akkuzellen
    r'ELM327|OBD2?|'                      # Fahrzeug-Diagnose
    r'\d+MAH|\d+MHZ|\d+GHZ|\d+ATM|\d+BAR|'
    r'USB\d?|BT\d|5G|4G|3D|RGB|LED|'
    r'\d+W|\d+V|\d+ML|\d+CM|\d+MM|\d+L|\d+G|\d+KG|\d+X|\d+PCS?'
    r')$', re.I)

# Steht vor dem Code ein Wort wie «aus» oder «mit», beschreibt er das Produkt, statt es zu nummerieren.
BESCHREIBEND = re.compile(
    r'\b(aus|mit|nach|in|für|Norm|Standard|Typ|Modell|Serie|Version|Grösse|Groesse|'
    r'Sommer|Winter|Herbst|Frühling|Fruehling|Kollektion)\s*[·\-–,]?\s*$', re.I)


def gql(q, v=None):
    with open("/tmp/_tc.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_tc.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def norm(t):
    s = t.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '', s)


def main():
    alle, kandidaten = [], []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        alle.append(p["title"])
        m = SUFFIX.search(p["title"])
        if not m:
            continue
        code = m.group("code")
        if SCHUTZ.match(code):
            continue
        if BESCHREIBEND.search(p["title"][:m.start("code")]):
            continue
        neu = p["title"][:m.start()].strip(" ·-–")
        if len(neu) < 12:
            continue
        kandidaten.append((p["id"], p["title"], neu, code))

    # Kollisionsprüfung: gegen alle aktiven Titel UND gegen die übrigen Kürzungen.
    bestand = Counter(norm(t) for t in alle)
    geplant = Counter(norm(k[2]) for k in kandidaten)
    ok, blockiert = [], []
    for gid, alt, neu, code in kandidaten:
        n = norm(neu)
        # bestand[n] zählt den eigenen Titel nicht mit (der trägt ja noch den Code).
        if bestand.get(n, 0) > 0 or geplant[n] > 1:
            blockiert.append((alt, neu, code))
            continue
        ok.append((gid, alt, neu, code))

    print(f"Titel mit Artikelnummer: {len(kandidaten)} | kürzbar: {len(ok)} | "
          f"Code bleibt (Titel wäre doppelt): {len(blockiert)}", flush=True)
    for _, alt, neu, code in ok[:14]:
        print(f"   «{alt[:52]}»\n      → «{neu[:52]}»   (Code «{code}» weg)", flush=True)
    if blockiert:
        print("   — Code bleibt stehen, sonst gäbe es Doppelnamen:", flush=True)
        for alt, neu, code in blockiert[:6]:
            print(f"     {alt[:56]}", flush=True)
    if DRY or not ok:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, alt, neu, code in ok:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "title": neu}})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {alt[:36]}: {e[0]['message']}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\t{code}\t{neu}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Titel gekürzt")


if __name__ == "__main__":
    main()
