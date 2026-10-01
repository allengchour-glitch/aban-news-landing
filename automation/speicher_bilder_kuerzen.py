#!/usr/bin/env python3
"""speicher_bilder_kuerzen.py — Dateispeicher unter 100 GB bringen, ohne dass etwas kaputtgeht (01.10.2026).

Betreiber 01.10.: «a dann b aber nicht das fehler gibt» (dropship/SPEICHER-ENTSCHEID-2026-10-01.md).
  A  KLASSE=aktiv-max10  — aktive Produkte behalten ihre ersten MAX (10) Bilder; ab Bild 11 wird gelöscht.
  B  KLASSE=cj-entwurf   — Entwürfe mit CJ-Quelle verlieren ihre Bilder (Produkt bleibt; Tag `bilder-geloescht-speicher`).

SCHUTZ — eine Datei wird NIE gelöscht, wenn …
  1. sie das Bild einer Variante ist (Farbwahl zeigt sonst kein Bild) — live je Etappe nachgefragt;
  2. das Produkt ein eigenes Design / Printful ist (Handle `pod-`, Tag printful_personalized_product, wunschdesign …);
  3. ihr Dateiname irgendwo im Repo steht (Social-Queues, Karussell-Sets, Pins, Aufträge) — ein geplanter Post fände sie sonst nicht;
  4. ihr Dateiname im LIVE-Theme vorkommt (Titelbilder, Sektionen) oder in einer Produktbeschreibung (/tmp/export.jsonl);
  5. das Produkt live nicht (mehr) den erwarteten Status hat (A: ACTIVE, B: DRAFT);
  6. ihr Name nicht eindeutig wie eine Lieferantendatei aussieht (UUID / CJ-Zahlencode) — eigene Bilder bleiben immer.
B zusätzlich: nur Entwürfe mit CJ-SKU/Tag cj-real (Bilder sind bei CJ wieder holbar), nie medizinprodukt/klinge (dort
bewusst gesperrt), und der Tag `bilder-geloescht-speicher` + Wächter `aktiv_ohne_bild_wache` sorgen dafür, dass ein
Rückholer kein bildloses Produkt aktiv schaltet (der Wächter setzt es zurück auf DRAFT und meldet es).

Ledger dropship/_speicher_kuerzen.tsv (Produkt, Klasse, gelöschte Media-IDs, Bytes, Datum) — idempotent, Neustart-fest.
  python3 automation/speicher_bilder_kuerzen.py                  # Trockenlauf A (zählt nur)
  SCHARF=1 N=500 KLASSE=aktiv-max10 python3 automation/speicher_bilder_kuerzen.py
"""
import collections, glob, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf

TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
KLASSE = os.environ.get("KLASSE", "aktiv-max10")
MAX = int(os.environ.get("MAX", "10"))
SCHARF = os.environ.get("SCHARF") == "1"
N = int(os.environ.get("N", "200"))
LEDGER = os.path.join(REPO, "dropship", "_speicher_kuerzen.tsv")
TAG_B = "bilder-geloescht-speicher"
POD_TAGS = {"printful_personalized_product", "wunschdesign", "personalisierbar", "selbst-gestalten", "editor"}
# auto-entwurf-0926: offener Betreiber-Konflikt (Rückholung dieser ~2'900 Entwürfe steht zur Entscheidung, Journal 22.09.)
#   → ihre Bilder bleiben, sonst wäre die Rückholung bildlos.
SPERR_B = {"medizinprodukt-pruefen", "klinge-ch-verboten", "auto-entwurf-0926"}
# 6. NUR Lieferanten-Dateien: UUID-Namen (CJ, auch «_fine») oder CJ-Zahlencodes. Geprüft am Trockenlauf 01.10.: hinter Bild 10
#    lagen auch «<handle>-edit.jpg» (unsere bearbeiteten Bilder), «cosy.jpg»/«active.jpg» (eigene Uploads) und Printful-Mockups
#    («clear-case-for-iphone-…») — alles, was nicht eindeutig wie eine Lieferantendatei heisst, bleibt.
LIEFERANT = re.compile(r"^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:_[a-z0-9]+)?(?:_\d+)?|\d{15,})"
                       r"\.(?:jpe?g|png|webp|gif)$")
if KLASSE not in ("aktiv-max10", "cj-entwurf"):
    sys.exit(f"⛔ unbekannte Klasse {KLASSE!r}")


def gql(q, v=None):
    letzter = ""
    for versuch in range(10):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=90))
            nachlauf(j)
            if j.get("data") and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * versuch)
    raise RuntimeError("Shopify antwortet nicht — " + letzter)


def bulk(inner, ziel):
    for _ in range(90):
        b = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}',
                {"q": inner})["bulkOperationRunQuery"]
        if not b["userErrors"]:
            break
        if "already in progress" not in b["userErrors"][0]["message"].lower():
            raise RuntimeError("Bulk: " + b["userErrors"][0]["message"])
        time.sleep(20)
    else:
        raise RuntimeError("Bulk-Platz 30 min besetzt")
    bid = b["bulkOperation"]["id"]
    for _ in range(360):
        n = gql('query($i:ID!){node(id:$i){... on BulkOperation{status url errorCode objectCount}}}', {"i": bid})["node"]
        if n["status"] in ("COMPLETED", "FAILED", "CANCELED"):
            break
        time.sleep(10)
    if n["status"] != "COMPLETED" or not n["url"]:
        raise RuntimeError(f"Bulk {n['status']} {n.get('errorCode')}")
    urllib.request.urlretrieve(n["url"], ziel)
    return ziel


def dateiname(url):
    return re.sub(r"\?.*$", "", (url or "").rsplit("/", 1)[-1]).lower()


def geschuetzte_namen():
    """Dateinamen, die irgendwo referenziert sind: Repo-Queues, Live-Theme, Produktbeschreibungen."""
    namen = set()
    muster = re.compile(r"cdn\.shopify\.com/s/files/[^\s\"'<>),]+|shopify://shop_images/[^\s\"'<>),]+")
    for pfad in (glob.glob(os.path.join(REPO, "social", "**", "*.*"), recursive=True)
                 + glob.glob(os.path.join(REPO, "auftraege", "**", "*.*"), recursive=True)
                 + glob.glob(os.path.join(REPO, "automation", "*.csv"))
                 + glob.glob(os.path.join(REPO, "automation", "*.json"))
                 + glob.glob(os.path.join(REPO, "dropship", "*.csv")) + glob.glob(os.path.join(REPO, "dropship", "*.tsv"))):
        if os.path.getsize(pfad) > 50e6 or pfad.endswith((".mp4", ".jpg", ".png", ".webp", ".wav", ".mp3")):
            continue
        try:
            for m in muster.findall(open(pfad, encoding="utf-8", errors="ignore").read()):
                namen.add(dateiname(m))
        except Exception:
            pass
    n_repo = len(namen)
    # Live-Theme: alle JSON-/Liquid-Dateien des veröffentlichten Themes
    th = gql('{themes(first:5, roles:[MAIN]){nodes{id}}}')["themes"]["nodes"][0]["id"]
    cursor = None
    while True:
        d = gql('query($t:ID!,$c:String){theme(id:$t){files(first:250, after:$c){pageInfo{hasNextPage endCursor} '
                'nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}', {"t": th, "c": cursor})
        f = d["theme"]["files"]
        for n in f["nodes"]:
            for m in muster.findall((n.get("body") or {}).get("content") or ""):
                namen.add(dateiname(m))
        if not f["pageInfo"]["hasNextPage"]:
            break
        cursor = f["pageInfo"]["endCursor"]
    n_theme = len(namen) - n_repo
    # Produktbeschreibungen (Voll-Export mit descriptionHtml)
    if os.path.exists("/tmp/export.jsonl"):
        for l in open("/tmp/export.jsonl"):
            for m in muster.findall(json.loads(l).get("descriptionHtml") or ""):
                namen.add(dateiname(m))
    print(f"Geschützte Dateinamen: {len(namen)} (Repo {n_repo}, Theme {n_theme}, Rest Beschreibungen)", flush=True)
    return namen


def export():
    q = "status:active" if KLASSE == "aktiv-max10" else "status:draft"
    ziel = f"/tmp/speicher_kuerzen_{KLASSE}.jsonl"
    if os.environ.get("EXPORT") and os.path.exists(os.environ["EXPORT"]):
        ziel = os.environ["EXPORT"]
    elif os.path.exists(ziel) and time.time() - os.path.getmtime(ziel) < 6 * 3600:
        pass                                   # Neustart mitten im Lauf: Export bis 6 h wiederverwenden (Status/Varianten prüft der Lauf live)
    else:
        bulk('{ products(query:"%s") { edges { node { id handle status tags '
             'variants { edges { node { sku image { url } } } } '
             'media { edges { node { id ... on MediaImage { image { url } originalSource { fileSize } } } } } } } } }' % q, ziel)
    prod, med, vbild, vsku = {}, collections.defaultdict(list), collections.defaultdict(set), collections.defaultdict(list)
    for l in open(ziel):
        o = json.loads(l)
        if "__parentId" not in o:
            prod[o["id"]] = o
        elif "/MediaImage/" in o.get("id", "") or "/Video/" in o.get("id", "") or "/ExternalVideo/" in o.get("id", ""):
            url = ((o.get("image") or {}).get("url")) or ""
            med[o["__parentId"]].append((o["id"], dateiname(url), int((o.get("originalSource") or {}).get("fileSize") or 0)))
        else:                                   # Variante
            if (o.get("image") or {}).get("url"):
                vbild[o["__parentId"]].add(dateiname(o["image"]["url"]))
            vsku[o["__parentId"]].append((o.get("sku") or "").upper())
    return prod, med, vbild, vsku


def kandidaten(prod, med, vbild, vsku, schutz, fertig):
    plan = []
    for pid, p in prod.items():
        if pid in fertig or not med.get(pid):
            continue
        tags = set(p["tags"])
        if p["handle"].startswith("pod-") or tags & POD_TAGS:
            continue
        if KLASSE == "aktiv-max10":
            if p["status"] != "ACTIVE":
                continue
            weg = [m for m in med[pid][MAX:]]
        else:
            if p["status"] != "DRAFT" or tags & SPERR_B:
                continue
            if not ("cj-real" in tags or any(s.startswith("CJ") or re.match(r"^\d{15,}", s) for s in vsku[pid])):
                continue
            weg = list(med[pid])
        weg = [(m, n, b) for m, n, b in weg if n not in schutz and n not in vbild[pid] and LIEFERANT.match(n)]
        if weg:
            plan.append((pid, p["handle"], weg))
    return plan


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split("\t")[0] for l in open(LEDGER) if l.split("\t")[1:2] == [KLASSE]}
    prod, med, vbild, vsku = export()
    schutz = geschuetzte_namen()
    plan = kandidaten(prod, med, vbild, vsku, schutz, fertig)
    bilder = sum(len(w) for _, _, w in plan)
    gb = sum(b for _, _, w in plan for _, _, b in w) / 1e9
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} {KLASSE}: {len(plan)} Produkte · {bilder} Bilder · "
          f"{gb:.2f} GB · {'SCHARF' if SCHARF else 'TROCKEN'} N={N}", flush=True)
    marke = os.path.join(REPO, "dropship", f"_speicher_kuerzen_fertig_{KLASSE}.txt")
    if SCHARF and not plan:
        open(marke, "w").write(time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()) + " nichts mehr zu tun\n")
        print(f"FERTIG {KLASSE}: nichts mehr zu tun → {os.path.basename(marke)}", flush=True)
        return 0
    if not SCHARF:
        for pid, h, w in plan[:5]:
            print(f"  z. B. {h[:60]}: {len(w)} Bilder", flush=True)
        return 0
    led = open(LEDGER, "a", encoding="utf-8")
    frei = gel = fehler = skip = 0
    soll = "ACTIVE" if KLASSE == "aktiv-max10" else "DRAFT"
    for i in range(0, min(N, len(plan)), 10):
        teil = plan[i:min(i + 10, N)]
        # Schutz 1 + 5 live: Status und aktuelle Variantenbilder unmittelbar vor dem Löschen
        live = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status variants(first:250){nodes{image{url}}}}}}',
                   {"ids": [p for p, _, _ in teil]})["nodes"]
        zust = {n["id"]: n for n in live if n}
        for pid, h, w in teil:
            z = zust.get(pid)
            if not z or z["status"] != soll:
                skip += 1; continue
            vlive = {dateiname((v.get("image") or {}).get("url")) for v in z["variants"]["nodes"]}
            ids = [m for m, n, _ in w if n not in vlive]
            if not ids:
                skip += 1; continue
            d = gql('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}',
                    {"p": pid, "m": ids})["productDeleteMedia"]
            if "does not exist" in json.dumps(d.get("mediaUserErrors") or ""):
                # Export älter als das Produkt (01.10.: «stahl-controller», Media inzwischen weg) → nur noch vorhandene IDs, einmal neu
                da = {n["id"] for n in gql('query($p:ID!){product(id:$p){media(first:250){nodes{id}}}}', {"p": pid})["product"]["media"]["nodes"]}
                ids = [m for m in ids if m in da]
                if not ids:
                    skip += 1; continue
                d = gql('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}',
                        {"p": pid, "m": ids})["productDeleteMedia"]
            if d.get("mediaUserErrors") or not d.get("deletedMediaIds"):
                fehler += 1
                print(f"  ⚠️ {h}: {d.get('mediaUserErrors')}", file=sys.stderr, flush=True)
                continue
            weg = set(d["deletedMediaIds"])
            b = sum(bb for m, _, bb in w if m in weg)
            if KLASSE == "cj-entwurf":
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [TAG_B]})
            led.write(f"{pid}\t{KLASSE}\t{h}\t{len(weg)}\t{b}\t{time.strftime('%Y-%m-%d')}\n"); led.flush()
            frei += b; gel += len(weg)
        print(f"  Etappe {i // 10 + 1}: {gel} Bilder · {frei / 1e9:.2f} GB · übersprungen {skip} · Fehler {fehler}", flush=True)
    print(f"FERTIG {KLASSE}: {gel} Bilder gelöscht, {frei / 1e9:.2f} GB frei · übersprungen {skip} · Fehler {fehler}", flush=True)
    return 0 if not fehler else 3


if __name__ == "__main__":
    sys.exit(main())
