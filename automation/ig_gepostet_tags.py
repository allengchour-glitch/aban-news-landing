#!/usr/bin/env python3
"""ig_gepostet_tags.py — hält die Kollektion «📸 Gerade auf Instagram» (Handle gerade-auf-instagram) aktuell.

Social-Messung 23.09.2026, Massnahme 12: Jede IG-Caption sagt «Link im Profil» — der Profil-Link führte aber
auf die Startseite, wo das gezeigte Produkt nicht steht (4 Website-Klicks in 28 Tagen). Die Kollektion ist eine
Smart-Kollektion auf den Tag `ig-gepostet`; dieses Skript setzt und entfernt ihn.

Quelle ist NICHT der Poster (die Poster bleiben unangetastet), sondern was sie quittiert haben:
  · social/posts_image.csv   — Status «posted» mit IG-Post-ID, Zeilen-ID endet auf die Shopify-Produkt-ID
  · automation/reels_seed.csv — «posted-ig-fb»/«posted», Zeilen-ID cjreel-<Shopify-ID> oder cjreel-<CJ-pid> (SKU CJ-<pid>)
  · social/ig_karussell.csv   — «posted-ig*», Spalte produkte = Handles
Fenster TAGE (30). Tags: `ig-gepostet` + `ig-seit-JJJJ-MM-TT` (Datum des jüngsten Posts). Nach dem Fenster nimmt der
nächste Lauf beide Tags wieder weg (Muster hype_kuratieren.py). Nur ACTIVE mit Onlineshop-URL. DRY=1 zeigt nur.
Schreibt mit tagsAdd/tagsRemove (nie productUpdate(tags)), liest zurück, Ledger dropship/_ig_gepostet_tags.txt.
"""
import csv, datetime as dt, json, os, re, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(d):
        return None

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
TAGE = int(os.environ.get("TAGE", "30"))
TAG = "ig-gepostet"
LEDGER = os.path.join(REPO, "dropship", "_ig_gepostet_tags.txt")
HEUTE = dt.datetime.now(dt.timezone.utc).date()
GRENZE = HEUTE - dt.timedelta(days=TAGE)


def gql(q, v=None):
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "-m", "60", "-X", "POST",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5); continue
        if any("THROTTLED" in json.dumps(e) for e in d.get("errors") or []):
            time.sleep(10); continue
        nachlauf(d)
        return d
    raise SystemExit("ABBRUCH: Shopify antwortet nicht")


def datum(s):
    try:
        return dt.date.fromisoformat((s or "")[:10])
    except Exception:
        return None


def zeilen(pfad):
    p = os.path.join(REPO, pfad)
    return list(csv.DictReader(open(p, encoding="utf-8", newline=""))) if os.path.exists(p) else []


FELDER = "id handle title status onlineStoreUrl tags"


def per_id(pid):
    return ((gql(f'{{ product(id:"gid://shopify/Product/{pid}"){{ {FELDER} }} }}').get("data") or {}).get("product"))


def per_handle(h):
    return ((gql(f'query($h:String!){{ productByHandle(handle:$h){{ {FELDER} }} }}', {"h": h}).get("data") or {}).get("productByHandle"))


def per_cj(pid):
    n = (((gql(f'{{ products(first:2, query:"sku:CJ-{pid}*"){{ nodes{{ {FELDER} variants(first:1){{nodes{{sku}}}} }} }} }}')
           .get("data") or {}).get("products") or {}).get("nodes") or [])
    n = [p for p in n if ((p.get("variants") or {}).get("nodes") or [{}])[0].get("sku", "").upper().startswith(f"CJ-{pid}".upper())]
    return n[0] if len(n) == 1 else None      # mehrdeutig → lieber nichts als falsch


def gepostet():
    """[(quelle, schluessel, datum)] aller IG-Posts im Fenster."""
    out = []
    for r in zeilen("social/posts_image.csv"):
        d = datum(r.get("posted_at"))
        if r.get("status") == "posted" and d and d >= GRENZE and (r.get("post_url") or "").strip() \
                and "ig-fehler" not in (r.get("post_url") or "") and "instagram" in (r.get("platforms") or ""):
            m = re.search(r"-(\d{12,15})$", r.get("id") or "")
            if m:
                out.append(("bild", ("id", m.group(1)), d))
    for r in zeilen("automation/reels_seed.csv"):
        d = datum(r.get("posted_at"))
        if r.get("status") in ("posted-ig-fb", "posted") and d and d >= GRENZE:
            m = re.match(r"cjreel-(.+)$", r.get("id") or "")
            if m:
                x = m.group(1)
                out.append(("reel", ("id", x) if re.fullmatch(r"\d{12,15}", x) else ("cj", x), d))
    for r in zeilen("social/ig_karussell.csv"):
        d = datum(r.get("posted_at"))
        if (r.get("status") or "").startswith("posted-ig") and d and d >= GRENZE:
            for h in (r.get("produkte") or "").split():
                out.append(("karussell", ("handle", h), d))
    return out


def ledger(zeile):
    if not DRY:
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%MZ}\t{zeile}\n")


def main():
    posts = gepostet()
    print(f"{len(posts)} IG-Posts mit Produkt in {TAGE} Tagen (bis {GRENZE})")
    soll = {}                                    # gid → (produkt, jüngstes Datum)
    for quelle, (art, wert), d in posts:
        p = per_id(wert) if art == "id" else per_handle(wert) if art == "handle" else per_cj(wert)
        if not p:
            print(f"   ? {quelle} {art}:{wert} — kein eindeutiges Produkt"); continue
        if p["status"] != "ACTIVE" or not p.get("onlineStoreUrl"):
            print(f"   ⛔ {quelle}: {p['title'][:50]} nicht kaufbar ({p['status']})"); continue
        alt = soll.get(p["id"])
        if not alt or d > alt[1]:
            soll[p["id"]] = (p, d)
    gesetzt = entfernt = 0
    for gid, (p, d) in soll.items():
        seit = f"ig-seit-{d:%Y-%m-%d}"
        alte = [t for t in p["tags"] if t.startswith("ig-seit-") and t != seit]
        if TAG in p["tags"] and seit in p["tags"] and not alte:
            continue
        print(f"   {'[DRY] ' if DRY else ''}+ {p['title'][:60]} ({seit})")
        if DRY:
            gesetzt += 1; continue
        if alte:
            gql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}", {"id": gid, "t": alte})
        r = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": gid, "t": [TAG, seit]})
        tags = ((gql(f'{{ product(id:"{gid}"){{ tags }} }}').get("data") or {}).get("product") or {}).get("tags") or []
        if TAG in tags and seit in tags:
            gesetzt += 1; ledger(f"{gid}\t+\t{seit}\t{p['handle']}")
        else:
            print(f"   ⚠️ nicht gesetzt: {p['handle']} {r}")
    # Abräumen: Tag vorhanden, aber kein Post im Fenster
    nach = None
    while True:
        d = gql("""query($n:String){products(first:100,after:$n,query:"tag:ig-gepostet"){
                  pageInfo{hasNextPage endCursor} nodes{id handle title tags}}}""", {"n": nach})
        pr = d["data"]["products"]
        for p in pr["nodes"]:
            if TAG not in p["tags"] or p["id"] in soll:     # Shopify-Tagsuche ist präfixartig → exakt prüfen
                continue
            weg = [TAG] + [t for t in p["tags"] if t.startswith("ig-seit-")]
            print(f"   {'[DRY] ' if DRY else ''}− {p['title'][:60]} (kein IG-Post mehr in {TAGE} T)")
            if not DRY:
                gql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}", {"id": p["id"], "t": weg})
                ledger(f"{p['id']}\t-\t{','.join(weg)}\t{p['handle']}")
            entfernt += 1
        if not pr["pageInfo"]["hasNextPage"]:
            break
        nach = pr["pageInfo"]["endCursor"]
    print(f"IG-GEPOSTET: {len(soll)} Produkte im Fenster · {gesetzt} getaggt · {entfernt} abgeräumt{' (DRY)' if DRY else ''}")


if __name__ == "__main__":
    main()
