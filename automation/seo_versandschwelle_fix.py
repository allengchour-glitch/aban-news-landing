"""Korrigiert die Versand-Schwelle in den SEO-Beschreibungen (Google-Suchtreffer).

GEFUNDEN (2026-08-10): Nachdem die falsche Angabe «Gratis-Versand ab CHF 65» aus dem Theme und
aus den Produktbeschreibungen entfernt war, tauchte sie an einer dritten, unsichtbareren Stelle
wieder auf — in der **SEO-Beschreibung** (`global.description_tag`). Das ist der Text, den Google
im Suchergebnis anzeigt. Er steht auf praktisch jedem Produkt und war damit die grösste Reichweite
der falschen Zahl.

Richtig ist laut Lieferprofil: **CHF 7.00 Versand, gratis ab CHF 50.**

Es wird ausschliesslich die Zahl ersetzt — kein Textbaustein entfernt, keine Formulierung
umgeschrieben. Damit bleibt der Snippet-Text unverändert lesbar und nur die Aussage stimmt wieder.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_seo_versand_fix.txt"
# «CHF»/«Fr.» muss direkt davor stehen, damit keine Zahl 65 in anderem Zusammenhang getroffen
# wird («65 cm», «65 g»).
# ⚠️ Der Nachkommateil darf NUR Betragsschreibweisen schlucken («65.-», «65.--», «65.00»).
# Eine frühere Fassung erlaubte dort auch ein einzelnes Komma — und verschluckte damit das
# Satzkomma: aus «ab CHF 65, 30 Tage Rückgabe» wurde «ab CHF 50 30 Tage Rückgabe».
RX = re.compile(r'(ab\s+)(?:CHF|Fr\.?)\s*65(?:\.-{1,2}|\.00)?', re.I)


def gql(q, v=None):
    with open("/tmp/_sv.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sv.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def main():
    st = os.environ.get("CURSOR", "dropship/_seo_versand_cursor.txt")
    cur = (open(st).read().strip() or None) if os.path.exists(st) else None
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = geaendert = 0
    while True:
        d = gql('query($c:String){products(first:100,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title seo{title description}}}}',
                {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            # ⚠️ KEIN break-nach-unten (21.08.2026). Der Abbruch fiel bis hierher durch zu
            # `os.remove(st)` UND zur FERTIG-Zeile: Eine ausgefallene Abfrage — der
            # Ausgangs-Proxy antwortet sporadisch mit HTTP 502 «policy context unavailable»
            # — loeschte also den Cursor und meldete Vollzug. Im Log stehen 201 FERTIG-Zeilen
            # bei 5 solchen Abbruechen, darunter «FERTIG: 2039 geprueft» und
            # «FERTIG: 10694 geprueft» statt der vollen 44'769. Jedes Mal begann der
            # Folgelauf wieder bei Produkt 1 und verbrannte einen ganzen Katalog-Durchgang
            # an Shopify-Kontingent, das sich alle Engines teilen.
            # Cursor BLEIBT stehen, damit der naechste Lauf dort weitermacht.
            print(f"PAUSE (Shopify antwortet nicht — bei {n} Produkten, Cursor bleibt)",
                  flush=True)
            return
        for p in pg["nodes"]:
            n += 1
            if p["id"] in done:
                continue
            alt = ((p.get("seo") or {}).get("description")) or ""
            neu = RX.sub(r'\1CHF 50', alt)
            if neu == alt:
                continue
            geaendert += 1
            if geaendert <= 5:
                print(f"  {p['title'][:44]:<44} …{neu[-70:]}", flush=True)
            if DRY:
                continue
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": p["id"], "seo": {"description": neu}}})
            f.write(f"{p['id']}\t65->50\n"); f.flush()
            time.sleep(0.16)
        if n % 2000 < 100:
            print(f"  … {n} geprüft | korrigiert {geaendert}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        if not DRY:
            open(st, "w").write(cur)
    if not DRY and os.path.exists(st):
        os.remove(st)          # Cursor räumen, damit ein Folgelauf Neuzugänge erfasst
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {n} geprüft, {geaendert} SEO-Beschreibungen korrigiert")


if __name__ == "__main__":
    main()
