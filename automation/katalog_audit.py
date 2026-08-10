"""Voll-Export des aktiven Katalogs + Fehler- und Dublettensuche in einem Durchgang.

WARUM EIN EXPORT STATT VIELER EINZELABFRAGEN: Dublettenerkennung ist von Natur aus eine
Frage über den GESAMTEN Bestand — «gibt es das schon?» lässt sich nicht auf einer Seite
beantworten. Genau daran ist die frühere Titel-Wache gescheitert (CLAUDE.md 16c: Shopifys
`title:"…"`-Suche findet modell-codierte Titel nicht zuverlässig). Und die 505-Kollektionen-
Falle vom 10.08. hat dasselbe noch einmal gezeigt: gegen eine unvollständige Liste zu prüfen
erzeugt Phantom-Befunde. Deshalb: einmal alles holen, dann lokal rechnen.

GESUCHT WIRD:
  Dubletten   – gleicher normalisierter Titel (Umlaut-normalisiert, vgl. Regel 9c)
              – gleiches Hauptbild (Pfadname, nicht die CDN-URL: CJ lädt dasselbe Bild pro
                Listing neu hoch, die URL unterscheidet sich also auch bei echten Dubletten)
              – gleiche Lieferanten-SKU
  Fehler      – kein Bild, kein Preis / Preis 0, Titel mit Lieferantencode oder Roh-HTML,
                leere Beschreibung, Titel zu kurz, doppelte Handles, Preis unter Einkauf
                (soweit aus dem Ledger ableitbar)

Das Skript ÄNDERT NICHTS. Es schreibt einen Bericht; das Aufräumen entscheidet ein Mensch
oder ein spezialisiertes Skript — Massenänderungen ohne vorherige Sichtprüfung sind in
diesem Projekt schon zweimal teuer schiefgegangen (Regel 9b).
"""
import json, os, re, subprocess, sys, time, unicodedata
from collections import defaultdict

TOK = open("/tmp/cj_shop_token.txt").read().strip()
EXPORT = os.environ.get("EXPORT", "/tmp/katalog_export.jsonl")
BERICHT = os.environ.get("BERICHT", "dropship/KATALOG-AUDIT.md")
NUR_ANALYSE = os.environ.get("NUR_ANALYSE") == "1"


def gql(q, v=None):
    with open("/tmp/_ka.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "90",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ka.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(4)
    return {}


Q = '''query($c:String){products(first:100,after:$c,query:"status:ACTIVE"){
 pageInfo{hasNextPage endCursor}
 nodes{ id title handle createdAt productType vendor tags
   descriptionHtml
   featuredMedia{ ... on MediaImage{ image{url} } }
   mediaCount{count}
   priceRangeV2{minVariantPrice{amount}}
   variants(first:1){nodes{sku}} }}}'''


def exportieren():
    cur, n = None, 0
    with open(EXPORT, "w") as out:
        while True:
            d = gql(Q, {"c": cur})
            pg = (d.get("data") or {}).get("products")
            if not pg:
                print("Abbruch: keine Daten mehr", flush=True)
                break
            for p in pg["nodes"]:
                bild = ((p.get("featuredMedia") or {}).get("image") or {}).get("url") or ""
                out.write(json.dumps({
                    "id": p["id"], "titel": p["title"], "handle": p["handle"],
                    "erstellt": p["createdAt"], "typ": p["productType"] or "",
                    "vendor": p["vendor"] or "", "tags": p["tags"],
                    "beschreibung": p["descriptionHtml"] or "",
                    "bild": bild, "bilder": p["mediaCount"]["count"],
                    "preis": p["priceRangeV2"]["minVariantPrice"]["amount"],
                    "sku": (p["variants"]["nodes"][0]["sku"] if p["variants"]["nodes"] else "") or "",
                }, ensure_ascii=False) + "\n")
                n += 1
            if n % 2000 < 100:
                print(f"  exportiert {n}", flush=True)
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
    print(f"Export fertig: {n} aktive Produkte → {EXPORT}", flush=True)


def norm(s):
    """Umlaut- und schreibweisenunabhängig — sonst gelten «Reinigungsgerät» und
    «Reinigungsgeraet» als zwei verschiedene Produkte (Regel 9c)."""
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("é", "e"), ("è", "e")):
        s = s.replace(a, b)
    s = unicodedata.normalize("NFKD", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def bildschluessel(url):
    """Dateiname ohne Shopify-Suffixe und ohne Query — dieselbe Datei bekommt bei jedem
    Upload eine neue URL, der Basename bleibt aber meist erhalten."""
    if not url:
        return ""
    name = url.split("?")[0].rsplit("/", 1)[-1].lower()
    name = re.sub(r"_\d+x\d*(?=\.)", "", name)
    name = re.sub(r"[_-](copy|kopie)?\d{0,3}(?=\.[a-z]+$)", "", name)
    return name


CODE_IM_TITEL = re.compile(r'\b[A-Z]{2,}[-_]?\d{4,}\b|\bSKU\b|\bRef\.?\s*[A-Z0-9-]{6,}',
                           re.I)
LIEFERANT = re.compile(r'\bCJ(?:dropshipping)?\b|\bBigBuy\b|\bAliExpress\b|\bFortura\b', re.I)
ROH_HTML = re.compile(r'&(?:amp|lt|gt|quot|#\d+);|<[a-z]+>')


def analysieren():
    zeilen = [json.loads(l) for l in open(EXPORT)]
    print(f"analysiere {len(zeilen)} Produkte", flush=True)

    nach_titel, nach_bild, nach_sku, nach_handle = (defaultdict(list) for _ in range(4))
    fehler = defaultdict(list)

    for p in zeilen:
        t = norm(p["titel"])
        if t:
            nach_titel[t].append(p)
        bk = bildschluessel(p["bild"])
        if bk:
            nach_bild[bk].append(p)
        if p["sku"]:
            nach_sku[p["sku"].strip().upper()].append(p)
        nach_handle[p["handle"]].append(p)

        # --- Fehlerprüfungen ---
        if p["bilder"] == 0 or not p["bild"]:
            fehler["ohne Bild"].append(p)
        try:
            preis = float(p["preis"])
        except Exception:
            preis = 0.0
        if preis <= 0:
            fehler["Preis 0 oder fehlend"].append(p)
        if CODE_IM_TITEL.search(p["titel"]):
            fehler["Lieferantencode im Titel"].append(p)
        if LIEFERANT.search(p["titel"]) or LIEFERANT.search(p["beschreibung"][:4000]):
            fehler["Lieferantenname sichtbar"].append(p)
        if ROH_HTML.search(p["titel"]):
            fehler["Roh-HTML im Titel"].append(p)
        if len(p["titel"].strip()) < 12:
            fehler["Titel zu kurz"].append(p)
        klartext = re.sub(r"<[^>]+>", " ", p["beschreibung"])
        if len(klartext.strip()) < 40:
            fehler["Beschreibung fast leer"].append(p)
        if not p["sku"]:
            fehler["ohne Lieferanten-SKU"].append(p)

    dub_titel = {k: v for k, v in nach_titel.items() if len(v) > 1}
    dub_bild = {k: v for k, v in nach_bild.items() if len(v) > 1}
    dub_sku = {k: v for k, v in nach_sku.items() if len(v) > 1}
    dub_handle = {k: v for k, v in nach_handle.items() if len(v) > 1}

    # Der harte Fall: gleicher Titel UND gleiches Hauptbild = mit hoher Sicherheit dieselbe Ware.
    sicher = []
    for k, v in dub_titel.items():
        nach_bk = defaultdict(list)
        for p in v:
            nach_bk[bildschluessel(p["bild"])].append(p)
        for bk, grp in nach_bk.items():
            if bk and len(grp) > 1:
                sicher.append(grp)

    zeile = []
    A = zeile.append
    A("# Katalog-Audit — aktive Produkte\n")
    A(f"Stand: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())} · "
      f"**{len(zeilen)} aktive Produkte** geprüft.\n")
    A("## Dubletten\n")
    A(f"- **{len(sicher)} Gruppen** mit gleichem Titel **und** gleichem Hauptbild "
      f"({sum(len(g) for g in sicher)} Produkte) — das ist der belastbare Fall.")
    A(f"- {len(dub_titel)} Gruppen mit gleichem Titel ({sum(len(v) for v in dub_titel.values())} "
      f"Produkte) — Vorsicht: darunter sind echte Grössen-/Farbvarianten.")
    A(f"- {len(dub_bild)} Gruppen mit gleichem Hauptbild "
      f"({sum(len(v) for v in dub_bild.values())} Produkte).")
    A(f"- {len(dub_sku)} doppelt vergebene Lieferanten-SKUs.")
    A(f"- {len(dub_handle)} doppelte Handles (dürfte 0 sein — Shopify erzwingt Eindeutigkeit).\n")
    if sicher:
        A("### Beispiele (Titel + Bild identisch)\n")
        for grp in sicher[:25]:
            A(f"- **{grp[0]['titel'][:70]}** — {len(grp)}×, "
              f"älteste {min(p['erstellt'] for p in grp)[:10]}")
        A("")
    A("## Fehler\n")
    for k in sorted(fehler, key=lambda k: -len(fehler[k])):
        A(f"- **{k}: {len(fehler[k])}**")
        for p in fehler[k][:4]:
            A(f"    - {p['titel'][:64]}  ·  `{p['handle']}`")
    A("")
    os.makedirs(os.path.dirname(BERICHT), exist_ok=True)
    open(BERICHT, "w").write("\n".join(zeile))
    json.dump({"sicher": [[p["id"] for p in g] for g in sicher],
               "titel": {k: [p["id"] for p in v] for k, v in dub_titel.items()},
               "sku": {k: [p["id"] for p in v] for k, v in dub_sku.items()}},
              open("/tmp/katalog_dubletten.json", "w"))
    print("\n".join(zeile[:60]))
    print(f"\nBericht: {BERICHT}")


if __name__ == "__main__":
    if not NUR_ANALYSE:
        exportieren()
    analysieren()
