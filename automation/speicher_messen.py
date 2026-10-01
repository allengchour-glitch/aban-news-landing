#!/usr/bin/env python3
"""speicher_messen.py — wie voll ist der Shopify-Dateispeicher, und wer belegt ihn? (01.10.2026)

ANLASS: Betreiber 01.10. «fix mal speicherplatz und sag wieviel noch — grow plan nur wegen speicherplatz und für
cj produkten wieder pushen». Bisher gab es nur Einzelzahlen aus Ad-hoc-Exporten (30.09.: «~105 von 100 GB»,
Entwürfe 22,31 GB). Dieses Werkzeug misst zwei Dinge in EINEM Lauf (zwei Bulk-Exporte nacheinander):

  1. ALLE Dateien der Bibliothek (`files`) mit Grösse — das ist, was Shopify gegen die 100 GB (Basic) zählt.
     Produktbilder SIND Dateien; Theme-Assets zählen nicht (Lehre 30.09.).
  2. ALLE Produkte mit Status, Tags und ihren Medien-IDs — damit jede Datei einem Produkt und einer Klasse
     zugeordnet werden kann (aktiv / Entwurf je Grund / archiviert / ohne Produkt).

Ausgabe: Zusammenfassung auf stdout + dropship/SPEICHER-STAND.md. Schreibt NICHTS im Shop.
  python3 automation/speicher_messen.py            # frischer Export (dauert einige Minuten)
  FILES=… PRODUKTE=… python3 automation/speicher_messen.py   # vorhandene Exporte wiederverwenden
"""
import collections, json, os, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
LIMIT_GB = float(os.environ.get("LIMIT_GB", "100"))
BERICHT = os.path.join(REPO, "dropship", "SPEICHER-STAND.md")

# Entwurfs-Gründe in Reihenfolge der Zuordnung (erster Treffer zählt). «tot» = kommt nach Betreiber-Entscheid
# oder Lieferantenlage nicht zurück; «kann zurück» = Lieferant kann wieder liefern → Bilder NICHT löschen.
KLASSEN = [
    ("duplikat-auto-draft", "tot", "Dublette eines aktiven Produkts"),
    ("bigbuy", "tot", "BigBuy (Abo beendet 15.09.)"),
    ("bb-versand-unrentabel", "tot", "BigBuy, CH-Versand unrentabel"),
    ("nicht-lieferbar-ch", "tot", "BigBuy, nie in die CH versendbar"),
    ("klinge-ch-verboten", "tot", "Klinge, CN→CH verboten"),
    ("medizinprodukt-pruefen", "kann zurück", "Medizinprodukt (mit Unterlagen freischaltbar)"),
    ("ausverkauft-lieferant", "kann zurück", "beim Lieferanten ausverkauft"),
    ("cj-nicht-versendbar-ch", "kann zurück", "CJ: derzeit keine CH-Linie"),
    ("cj-ausgelistet", "tot", "CJ: Produkt ausgelistet"),
]


def gql(q, v=None):
    letzter = ""
    for versuch in range(8):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=90))
            if j.get("data") and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 4 * versuch)
    raise RuntimeError("Shopify antwortet nicht — " + letzter)


def bulk(inner, ziel):
    # Eine Bulk-Abfrage je App gleichzeitig: läuft schon eine (anderer Wächter), warten statt abbrechen.
    for _ in range(90):
        b = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}',
                {"q": inner})["bulkOperationRunQuery"]
        if not b["userErrors"]:
            break
        msg = b["userErrors"][0]["message"]
        if "already in progress" not in msg.lower():
            raise RuntimeError("Bulk-Export: " + msg)
        print("  … andere Bulk-Abfrage läuft, warte 20 s", flush=True)
        time.sleep(20)
    else:
        raise RuntimeError("Bulk-Export: Platz 30 min lang besetzt")
    bid = b["bulkOperation"]["id"]
    for _ in range(360):
        n = gql('query($i:ID!){node(id:$i){... on BulkOperation{status url errorCode objectCount}}}', {"i": bid})["node"]
        if n["status"] in ("COMPLETED", "FAILED", "CANCELED"):
            break
        time.sleep(10)
    if n["status"] != "COMPLETED":
        raise RuntimeError(f"Bulk-Export {n['status']} {n.get('errorCode')}")
    if not n["url"]:                      # leeres Ergebnis
        open(ziel, "w").close()
        return ziel
    urllib.request.urlretrieve(n["url"], ziel)
    print(f"  Export fertig: {n.get('objectCount')} Objekte → {ziel}", flush=True)
    return ziel


def groesse(o):
    for k in ("originalSource", "image"):
        v = o.get(k) or {}
        if v.get("fileSize") or v.get("filesize"):
            return int(v.get("fileSize") or v.get("filesize"))
    return int(o.get("originalFileSize") or 0)


def main():
    files = os.environ.get("FILES") or bulk(
        '{ files { edges { node { id fileStatus createdAt '
        '... on MediaImage { originalSource { fileSize } } '
        '... on Video { originalSource { fileSize } } '
        '... on GenericFile { originalFileSize } '
        '... on Model3d { originalSource { filesize } } } } } }', "/tmp/speicher_files.jsonl")
    produkte = os.environ.get("PRODUKTE") or bulk(
        '{ products { edges { node { id handle status tags '
        'media { edges { node { id } } } } } } }', "/tmp/speicher_produkte.jsonl")

    datei = {}                                        # Datei-ID → Bytes
    for l in open(files):
        o = json.loads(l)
        if str(o.get("id", "")).startswith("gid://"):
            datei[o["id"]] = groesse(o)
    prod, besitzer = {}, {}
    for l in open(produkte):
        o = json.loads(l)
        if "__parentId" in o:
            besitzer.setdefault(o["id"], o["__parentId"])
        elif str(o.get("id", "")).startswith("gid://shopify/Product/"):
            prod[o["id"]] = o
    # Produktmedien-IDs (MediaImage/Video) sind dieselben IDs wie in `files` — gemessen, nicht angenommen:
    treffer = sum(1 for m in besitzer if m in datei)
    gesamt = sum(datei.values())

    def klasse(p):
        if p["status"] == "ACTIVE":
            return "aktiv", "—"
        if p["status"] == "ARCHIVED":
            return "archiviert", "—"
        for tag, art, _ in KLASSEN:
            if tag in p["tags"]:
                return "Entwurf: " + tag, art
        return "Entwurf: ohne bekannten Grund", "unklar"

    summe = collections.defaultdict(lambda: [0, 0, set(), ""])     # Klasse → Bytes, Dateien, Produkte, Art
    for m, pid in besitzer.items():
        if m not in datei:
            continue
        p = prod.get(pid)
        k, art = klasse(p) if p else ("Produkt fehlt im Export", "unklar")
        s = summe[k]; s[0] += datei[m]; s[1] += 1; s[2].add(pid); s[3] = art
    ohne = sum(b for m, b in datei.items() if m not in besitzer)
    summe["Dateien ohne Produkt (Bibliothek: Reels, Werbebilder, Theme-Uploads)"] = [ohne, sum(1 for m in datei if m not in besitzer), set(), "prüfen"]

    zeilen = sorted(summe.items(), key=lambda kv: -kv[1][0])
    tot = sum(v[0] for k, v in summe.items() if v[3] == "tot")
    stand = time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())
    out = [f"# Shopify-Dateispeicher — Stand {stand}", "",
           f"**Belegt: {gesamt / 1e9:.2f} GB von {LIMIT_GB:.0f} GB ({gesamt / 1e9 / LIMIT_GB * 100:.0f} %)** · "
           f"{len(datei):,} Dateien · Produktmedien zugeordnet: {treffer:,} von {len(besitzer):,}".replace(",", "'"), "",
           f"Davon bei Entwürfen, die nicht zurückkommen («tot»): **{tot / 1e9:.2f} GB** — löschbar ohne Verkaufsverlust.", "",
           "| Klasse | GB | Dateien | Produkte | Art |", "|---|---:|---:|---:|---|"]
    for k, (b, n, ps, art) in zeilen:
        out.append(f"| {k} | {b / 1e9:.2f} | {n:,} | {len(ps):,} | {art} |".replace(",", "'"))
    out += ["", "«kann zurück» = Lieferant kann wieder liefern → Bilder bleiben. «unklar» = erst ansehen, nie blind löschen.",
            "Gemessen mit `python3 automation/speicher_messen.py` (zwei Bulk-Exporte: files + products/media)."]
    open(BERICHT, "w").write("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
