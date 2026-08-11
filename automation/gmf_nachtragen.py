"""Trägt die Google-Merchant-Felder nach, die im Bestand fehlen oder falsch sind.

BEFUND (20-Agenten-Audit, 11.08.2026): Von 25'662 aktiven Produkten im Google-Kanal fehlt bei
fast allen mindestens eines der Felder, die Google liest:

    color                  24'764 fehlen (96,5 %) — aber 10'245 davon haben eine Farb-Option
    material               20'738 fehlen (80,8 %)
    condition               4'136 fehlen (16,1 %)

Der Importer setzt diese Felder seit heute selbst mit; das hier räumt den Altbestand auf.
Beides zusammen ist nötig — ein Nachfüll-Lauf allein hätte morgen wieder dieselbe Lücke, und
eine Importer-Korrektur allein lässt 25'000 Altprodukte unberührt.

DREI EINGRIFFE, alle ohne Rateheuristik:

 1. condition = «new». Stimmt hier ausnahmslos: Gebrauchtes und Generalüberholtes ist im Shop
    durchweg DRAFT (nachgeprüft: 0 aktive Refurb-Titel).

 2. color aus der Varianten-Option «Farbe». Die Werte stehen dort bereits übersetzt bereit
    («Dunkelblau», «Rosarot») — es wird nichts geraten, nur übernommen. Ohne Farb-Option
    bleibt das Feld leer; eine erfundene Farbe wäre schlimmer als keine.

 3. material kürzen. Der Extraktor griff über das Materialwort hinaus in die nächste
    Tabellenüberschrift: «Polyester Style» (174×), «Plastic Packing list» (73×), «Alloy
    Packing list» (27×) — 4'566 von 4'924 Werten waren so unbrauchbar. Google liest das als
    Materialangabe. Gekürzt wird auf das erste erkannte Materialwort.

⚠️ VORHANDENE KORREKTE WERTE WERDEN NIE ÜBERSCHRIEBEN — dieselbe Lehre wie bei
`google_kategorie.py`, wo ein Überschreib-Entwurf 1'208 Verschlechterungen erzeugt hätte.

Grundlage ist der lokale Export, nicht die API: 29'000 Produkte live zu scannen, während ein
Dutzend Reiniger dasselbe tut, erschöpft Shopifys Abfragebudget.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_gmf_nachtragen.txt"
NS = "mm-google-shopping"

MATERIALWORT = re.compile(
    r'baumwolle|cotton|polyester|leder|leather|metall|metal|silber|silver|gold|edelstahl|'
    r'stainless|kunststoff|plastic|acryl|nylon|wolle|wool|seide|silk|leinen|linen|keramik|'
    r'ceramic|holz|wood|glas|glass|zink|legierung|alloy|gummi|silikon|silicone|strick|fleece|'
    r'denim|jeans|samt|velvet|spitze|lace|bambus|bamboo|viskose|viscose|elasthan|spandex', re.I)


def gql(q, v=None):
    with open("/tmp/_gmf.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gmf.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def farbe_aus_optionen(p):
    for o in p.get("options") or []:
        if (o.get("name") or "").strip().lower() in ("farbe", "color", "colour"):
            for w in o.get("values") or []:
                w = (w or "").strip()
                # Codes und Monsterwerte taugen nicht als Farbangabe.
                if 2 <= len(w) <= 30 and not re.search(r'\d{3,}|[;:#]', w):
                    return w
    return None


def main():
    aufgaben, statistik = [], Counter()
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        vorhanden = {m["key"]: (m.get("value") or "").strip()
                     for m in ((p.get("mf") or {}).get("nodes") or [])}
        neu = []
        if not vorhanden.get("condition"):
            neu.append(("condition", "new"))
            statistik["condition gesetzt"] += 1
        if not vorhanden.get("color"):
            f = farbe_aus_optionen(p)
            if f:
                neu.append(("color", f))
                statistik["color aus Varianten"] += 1
            else:
                statistik["color bleibt leer (keine Farb-Option)"] += 1
        mat = vorhanden.get("material")
        if mat and len(mat.split()) > 1:
            t = MATERIALWORT.search(mat)
            if t:
                gekuerzt = t.group(0).capitalize()
                if gekuerzt.lower() != mat.lower():
                    neu.append(("material", gekuerzt))
                    statistik["material gekürzt"] += 1
            else:
                statistik["material unbrauchbar (kein Materialwort)"] += 1
        if neu:
            aufgaben.append((p["id"], p["title"], neu))

    print(f"Produkte mit Nachtrag: {len(aufgaben)}", flush=True)
    for k, v in statistik.most_common():
        print(f"   {v:>6}  {k}", flush=True)
    if DRY:
        print("   Beispiele:", flush=True)
        for gid, t, neu in aufgaben[:8]:
            print(f"     {t[:44]:<46} {', '.join(f'{k}={w}' for k, w in neu)}", flush=True)
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [a for a in aufgaben if a[0] not in done]
    print(f"noch offen: {len(offen)}", flush=True)

    f = open(LEDGER, "a")
    stapel, n = [], 0
    for gid, titel, neu in offen:
        for key, wert in neu:
            stapel.append({"ownerId": gid, "namespace": NS, "key": key,
                           "type": "single_line_text_field", "value": wert})
        if len(stapel) >= 25:
            n += schreiben(stapel, f)
            stapel = []
            if n % 500 < 25:
                print(f"  … {n} Felder gesetzt", flush=True)
    if stapel:
        n += schreiben(stapel, f)
    print(f"FERTIG: {n} Metafelder gesetzt")


def schreiben(stapel, f):
    r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
            '{userErrors{message}}}', {"m": stapel})
    errs = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if errs:
        print(f"  ⚠️ {errs[0]['message']}", flush=True)
        return 0
    for m in stapel:
        f.write(f"{m['ownerId']}\t{m['key']}\t{m['value']}\n")
    f.flush()
    time.sleep(0.25)
    return len(stapel)


if __name__ == "__main__":
    main()
