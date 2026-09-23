#!/usr/bin/env python3
"""Findet Produkt- und Kollektionslinks in VERÖFFENTLICHTEN Seiten/Blogartikeln, die ins Leere führen.

Warum das ein eigener Wächter ist (20.08.2026): In 25 veröffentlichten SEO-Ratgebern zeigten
**61 Links** auf Produkte, die es nicht mehr gibt oder die auf DRAFT stehen. Genau diese Ratgeber
(«Echtleder vs. Kunstleder», «RFID-Schutz erklärt», «Wanderziele Schweiz») holen über Google
dauerhaft Besucher — die lasen den Text, klickten auf die Empfehlung und landeten auf 404.
Ein verlorener Klick, den keine Statistik als Kaufabbruch ausweist.

Die Ursache ist struktureller Natur und wiederholt sich: Der Viability-Guard draftet Produkte ohne
Lieferanten-SKU (`keine-lieferanten-ref`), der Dubletten-Fix draftet Doppelgänger, Altbestand wird
gelöscht — die TEXTE, die darauf verlinken, weiss davon niemand. Jeder Draft-Lauf kann neue tote
Links erzeugen.

Meldet nur. Das Umhängen braucht eine Entscheidung: passender Ersatzartikel oder Kategorie?
"""
import json, os, re, subprocess, sys, collections, time, urllib.parse

SHOP = "au3j0y-hq.myshopify.com"
TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None):
    with open("/tmp/_tl.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    drossel = 0; versuche = 0   # 21.09.: Drosseln zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_tl.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            # ⚠️ 21.09.2026: hier wurde weder gewartet noch die Drossel erkannt — vier Anfragen
            # in zwei Sekunden, dann Traceback. Shopify sagt in throttleStatus, wie lange.
            if "THROTTLED" in str(d.get("errors") or "").upper():
                drossel += 1
                _k = (d.get("extensions") or {}).get("cost") or {}; _t = _k.get("throttleStatus") or {}
                _f = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                _r = float(_t.get("restoreRate") or 0)
                time.sleep(min(30.0, _f / _r + 0.5) if (_f > 0 and _r > 0) else 12.0)
                if drossel < 12:
                    continue
        except Exception:
            pass
        versuche += 1
        time.sleep(3)
    # ⚠️ 17.09.2026: Hier stand `return {}`. Gemessen an zwei Aufrufern in dieser
    # Klasse, was das anrichtet: `kollektion_leer.py` macht
    # `gql(...).get("collections")` → None → `if not d: break`, und
    # `tote_rabattcodes.py` bricht bei `hasNextPage` ab. Beide melden dann ein
    # ordentliches Ergebnis über NULL Datensätze, obwohl Shopify nur gedrosselt hat.
    # Eine Null, die wie eine Messung aussieht, ist der teuerste Befund dieses
    # Projekts (95 Klingen blieben im Verkauf, weil ein Wächter «0» meldete).
    # Darum: laut scheitern. Ein Traceback im Log ist ein Befund, eine falsche Null nicht.
    raise RuntimeError(
        "Shopify hat auf keinen Versuch mit Daten geantwortet. FRÜHER gab diese"
        " Funktion hier ein leeres Ergebnis zurück und der Aufrufer meldete «0» —"
        " das ist keine Messung, sondern ein Ausfall.")


# 23.09.2026 (Audit): Der Wächter las pages/articles(first:100) ohne Weiterblättern, erkannte nur
# relative Links ohne Kodierung und meldete 5 statt 27 tote Produktlinks. Jetzt: alle Seiten,
# absolute + relative + /en/-Links, %-kodierte Handles, Kollektionen dazu, und ein Ziel mit
# 301-Weiterleitung gilt nicht als tot.
LINK = re.compile(r'href="(?:https?://(?:www\.)?luxestyle\.ch)?(?:/en)?/(products|collections)/([^"?#/]+)', re.I)


def alle(typ):
    nach = None
    while True:
        d = gql("query($n:String){ %s(first:100, after:$n){ pageInfo{hasNextPage endCursor}"
                " nodes{ handle isPublished body } } }" % typ, {"n": nach})
        c = d["data"][typ]
        yield from c["nodes"]
        if not c["pageInfo"]["hasNextPage"]:
            return
        nach = c["pageInfo"]["endCursor"]


def weitergeleitet(pfad):
    d = gql("query($q:String){ urlRedirects(first:5, query:$q){ nodes{ path target } } }",
            {"q": f"path:{pfad}"})
    return any(n["path"].lower() == pfad.lower() for n in d["data"]["urlRedirects"]["nodes"])


def main():
    ziel = collections.defaultdict(list)
    seiten = 0
    for typ in ("pages", "articles"):
        for n in alle(typ):
            if not n.get("isPublished"):
                continue
            seiten += 1
            for m in LINK.finditer(n.get("body") or ""):
                h = urllib.parse.unquote(m.group(2)).strip().lower()
                if h and h != "all":
                    ziel[(m.group(1).lower(), h)].append(f"{typ[:-1]}/{n['handle']}")
    tot = []
    for (art, h), wo in ziel.items():
        if art == "products":
            d = gql("query($h:String!){ productByHandle(handle:$h){ status } }", {"h": h})
            p = (d.get("data") or {}).get("productByHandle")
            # Ein DRAFT ist für Besucherinnen dasselbe wie gelöscht: 404.
            status = None if (p and p.get("status") == "ACTIVE") else (p["status"] if p else "GELÖSCHT")
        else:
            d = gql("query($h:String!){ collectionByHandle(handle:$h){ id } }", {"h": h})
            status = None if (d.get("data") or {}).get("collectionByHandle") else "GELÖSCHT"
        if status and weitergeleitet(f"/{art}/{h}"):
            continue
        if status:
            tot.append((art, h, status, sorted(set(wo))))
    for art, h, s_, wo in tot:
        print(f"  ⚠️ /{art}/{h} [{s_}] ← {', '.join(wo)}")
    print(f"FERTIG: {seiten} veröffentlichte Seiten/Artikel, {len(ziel)} verlinkte Ziele geprüft, {len(tot)} tot.")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
