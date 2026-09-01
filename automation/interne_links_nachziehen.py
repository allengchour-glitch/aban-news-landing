"""Interne Produkt-Links auf umbenannte Handles nachziehen.

ANLASS (26.08.2026): Der Tote-Links-Wächter meldete «/products/outdoor-solar-powerbank-
20000mah-… [GELÖSCHT]» — das Produkt lebt aber. Am 24.08. wurde sein Handle korrigiert
(Titel sagte 20'000 mAh, der Text 10'000), und dabei entstand pflichtgemäss eine 301.
Für Besucherinnen ist der Link also NICHT tot; er macht nur einen Umweg.

Warum trotzdem reparieren:
  • Der Wächter kann «umbenannt» nicht von «gelöscht» unterscheiden und meldet den Fall
    täglich neu — ein Bericht mit Dauerbefund wird nicht mehr gelesen.
  • Jede Weiterleitung ist ein zusätzlicher Sprung; Shopify lehnt zudem eine Weiterleitung
    auf eine Weiterleitung ab, ein zweiter Handle-Wechsel bräche die Kette also wirklich.

Vorgehen: Für jeden `/products/<handle>`-Link in einer VERÖFFENTLICHTEN Seite oder einem
Artikel, dessen Handle es nicht mehr gibt, wird `urlRedirects(query:"path:…")` gefragt.
Zeigt eine 301 auf ein LEBENDES Produkt, wird der Link direkt auf das Ziel umgeschrieben.
Gibt es keine Weiterleitung, bleibt alles unberührt — das ist ein echter toter Link und
gehört dem Tote-Links-Wächter (der eine Ersatz-ENTSCHEIDUNG braucht, keine Automatik).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
BASE = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/"
BLOG = "119864721793"
LEDGER = "dropship/_interne_links_nachgezogen.txt"


def gql(q, v=None):
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60", BASE + "graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def rest(m, p, b=None):
    c = ["curl", "-s", "--max-time", "60", "-X", m, BASE + p,
         "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json"]
    if b:
        c += ["-d", json.dumps(b)]
    try:
        return json.loads(subprocess.run(c, capture_output=True, text=True).stdout)
    except Exception:
        return {}


def lebt(handle):
    d = gql('{ products(first:1, query:"handle:%s"){ nodes{ status } } }' % handle)
    ns = (d.get("data", {}).get("products") or {}).get("nodes") or []
    return bool(ns) and ns[0]["status"] == "ACTIVE"


def ziel(handle):
    """Handle, auf das eine 301 zeigt — oder None."""
    d = gql('{ urlRedirects(first:3, query:"path:/products/%s"){ nodes{ path target } } }' % handle)
    for n in (d.get("data", {}).get("urlRedirects") or {}).get("nodes", []):
        if n["path"].rstrip("/") == "/products/" + handle:
            m = re.match(r"^/products/([\w-]+)$", n["target"])
            if m:
                return m.group(1)
    return None


def alle(pfad, schluessel):
    """REST-Paginierung ueber since_id (01.09.): limit=250 OHNE Schleife hat 67 von 317
    Artikeln nie gescannt — der Lauf meldete trotzdem FERTIG. Eine volle Seite ist ein
    Weiterblattern-Befehl, kein Ergebnis (dieselbe Falle wie appInstallations am 30.08.)."""
    aus, since = [], 0
    while True:
        teil = rest("GET", f"{pfad}?limit=250&since_id={since}&fields=id,handle,body_html,published_at").get(schluessel, [])
        aus += teil
        if len(teil) < 250:
            return aus
        since = max(x["id"] for x in teil)


def main():
    seiten = alle("pages.json", "pages")
    # 01.09.: ALLE Blogs, nicht nur der Ratgeber — 6 Magazin-Artikel trugen den alten
    # Jade-Roller-Link weiter, waehrend der Lauf «FERTIG» meldete.
    blogs = [b["id"] for b in rest("GET", "blogs.json?fields=id").get("blogs", [])] or [BLOG]
    artikel = []
    for bid in blogs:
        artikel += alle(f"blogs/{bid}/articles.json", "articles")
    doks = [("page", s) for s in seiten if s.get("published_at")] + \
           [("article", a) for a in artikel if a.get("published_at")]
    print(f"{len(doks)} veroeffentlichte Seiten/Artikel", flush=True)

    urteil, geaendert = {}, 0
    led = open(LEDGER, "a")
    for art, it in doks:
        b = it.get("body_html") or ""
        handles = set(re.findall(r'href="/products/([\w-]+)', b))
        neu = b
        ersetzt = []
        for h in handles:
            if h not in urteil:
                urteil[h] = "ok" if lebt(h) else (ziel(h) or "tot")
            z = urteil[h]
            if z in ("ok", "tot"):
                continue
            if not lebt(z):
                urteil[h] = "tot"      # Weiterleitung zeigt auf Totes -> nicht anfassen
                continue
            neu = neu.replace("/products/" + h, "/products/" + z)
            ersetzt.append((h, z))
        if not ersetzt:
            continue
        print(f"{art} {it['handle'][:45]}: " + ", ".join(f"{a} -> {b_}" for a, b_ in ersetzt), flush=True)
        if DRY:
            continue
        key = "page" if art == "page" else "article"
        pfad = f"pages/{it['id']}.json" if art == "page" else f"articles/{it['id']}.json"
        r = rest("PUT", pfad, {key: {"id": it["id"], "body_html": neu}})
        if key in r:
            geaendert += 1
            for a, b_ in ersetzt:
                led.write(f"{art}\t{it['id']}\t{it['handle']}\t{a} -> {b_}\n")
            led.flush()
        time.sleep(0.4)
    led.close()
    print(f"FERTIG: {geaendert} Dokumente aktualisiert" + (" (DRY=1)" if DRY else ""))


if __name__ == "__main__":
    main()
