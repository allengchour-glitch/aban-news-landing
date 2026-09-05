"""Zieht die Versandschwelle in den KOLLEKTIONSTEXTEN nach.

WIE ES AUFFIEL (12.08.2026): Ein Screenshot der Kollektion «Damen-Mode». Oben die Vertrauens-
leiste des Themes: «🚚 Gratis-Versand ab CHF 50». Vier Zeilen darunter, im Beschreibungstext
derselben Seite: «Gratis-Versand ab CHF 65». Dieselbe Seite, zwei Zahlen, sichtbar auf einen
Blick.

Die beiden vorangegangenen Korrekturläufe haben PRODUKTE repariert — erst deren SEO-Felder,
dann deren Beschreibungstext. An Kollektionen hat niemand gedacht, und das sind ausgerechnet
die Seiten, auf denen Google-Besucherinnen landen: 216 von 250 abgefragten Kollektionen
tragen die alte Zahl.

Das ist dieselbe Lehre wie beim dritten «Produktdetails»-Block, nur eine Ebene höher: Wer
einen Fehler in einem Feld behebt, muss fragen, welche ANDEREN Orte denselben Satz tragen.
Ein Textbaustein wandert durch Importer, Produkttexte, SEO-Felder, Kollektionstexte und
Theme-Bausteine — repariert man nur den Ort, an dem er auffiel, bleibt der Widerspruch.

⚠️ Ersetzt wird nur, wo ein Versandwort davorsteht und keine Ziffer folgt: «CHF 653»
(ein Schminktisch) und «112 x 65 x 35 mm» dürfen nicht angefasst werden.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_kollektion_versandschwelle.txt"

SCHWELLE = re.compile(r'((?:Gratis[- ]?[Vv]ersand|[Vv]ersandkostenfrei|gratis)\s*(?:ab|über)\s*'
                      r'CHF\s*)(65|49)(?![0-9.,])')


def gql(q, v=None):
    with open("/tmp/_kv.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_kv.json"], capture_output=True, text=True)
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


def alle_kollektionen():
    cur, alle = None, []
    while True:
        d = gql('query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{id handle title descriptionHtml seo{title description}}}}', {"c": cur})
        pg = (d.get("data") or {}).get("collections")
        if not pg:
            print("  ⚠️ Liste unvollständig — Abbruch", flush=True)
            return []
        alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            return alle
        cur = pg["pageInfo"]["endCursor"]


def main():
    alle = alle_kollektionen()
    aufgaben = []
    for c in alle:
        html = c.get("descriptionHtml") or ""
        seo = (c.get("seo") or {}).get("description") or ""
        n_html = SCHWELLE.sub(lambda m: m.group(1) + "50", html)
        n_seo = SCHWELLE.sub(lambda m: m.group(1) + "50", seo)
        if n_html != html or n_seo != seo:
            aufgaben.append((c["id"], c["title"], html, n_html, seo, n_seo))

    print(f"Kollektionen gesamt: {len(alle)} | mit falscher Schwelle: {len(aufgaben)}", flush=True)
    for _, t, html, _, seo, _ in aufgaben[:8]:
        m = SCHWELLE.search(html) or SCHWELLE.search(seo)
        quelle = html if SCHWELLE.search(html) else seo
        s = max(0, m.start() - 34)
        print(f"   {t[:34]:<36} «{re.sub(r'<[^>]+>', ' ', quelle[s:m.end() + 6]).strip()[:56]}»",
              flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for cid, titel, html, n_html, seo, n_seo in aufgaben:
        if cid in done:
            continue
        eingabe = {"id": cid}
        if n_html != html:
            eingabe["descriptionHtml"] = n_html
        if n_seo != seo:
            eingabe["seo"] = {"description": n_seo}
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i)'
                '{userErrors{message}}}', {"i": eingabe})
        e = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:34]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{cid}\tschwelle-50\t{titel}\n")
        if n % 50 == 0:
            f.flush()
            print(f"  … {n}/{len(aufgaben)}", flush=True)
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Kollektionstexte auf CHF 50 gestellt")


if __name__ == "__main__":
    main()
