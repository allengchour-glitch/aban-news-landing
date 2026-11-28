#!/usr/bin/env python3
"""chatgpt_landeseiten_wache.py — prüft täglich die Seiten, auf denen ChatGPT-Besucher landen (25.11.2026).

ANLASS (gemessen 25.11.): ChatGPT ist der stärkste Verkaufskanal — 9 der letzten 25 Bestellungen kamen mit erstem Besuch über
utm_source=chatgpt.com (Google 7). ChatGPT verlinkt feste Adressen aus seinem Suchindex. Wird ein Produkt gedraftet, zeigt
ChatGPT den alten Link weiter: Die Landeseite der ChatGPT-Bestellung #1029 («Heizbare Kuscheldecke mit Ärmeln», 9 Sitzungen,
1 Kauf in 60 T) wurde am 24.11. gedraftet und leitete auf «Kissen & Wohntextilien» (1'649 Produkte) — niemand hat es bemerkt.

ABLAUF: ShopifyQL (Admin-API shopifyqlQuery) → Landeseiten der letzten 30 Tage mit utm_source='chatgpt.com' → je Seite
Admin-Zustand: Produkt ACTIVE und im Onlineshop? Kollektion veröffentlicht und nicht leer? Sonst die erste Weiterleitung
und ihr Shopify-Ziel prüfen. Befunde: TOT (keine Weiterleitung), ZIEL-NICHT-LIVE (Produkt oder Kollektion am ersten Ziel
nicht veröffentlicht), BREIT (zu grosse Kollektion oder Startseite), LEER (leere Kollektion). Schreibt NUR am Ende: dropship/_chatgpt_landeseiten.json +
dropship/CHATGPT-LANDESEITEN.md; die Ampel (betreiber_ampel.chatgpt_landeseiten) liest den Stand. Ändert nichts im Shop.

  python3 automation/chatgpt_landeseiten_wache.py              # messen, Stand + Bericht schreiben
  python3 automation/chatgpt_landeseiten_wache.py --selbsttest  # Urteilslogik ohne Netz (mit Gegenproben)
"""
import datetime, json, os, re, subprocess, sys, time
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.environ.get("CLW_STAND") or os.path.join(ROOT, "dropship", "_chatgpt_landeseiten.json")
BERICHT = os.environ.get("CLW_BERICHT") or os.path.join(ROOT, "dropship", "CHATGPT-LANDESEITEN.md")
SHOP = "au3j0y-hq.myshopify.com"
SHOP_HOSTS = {"luxestyle.ch", "www.luxestyle.ch", SHOP}
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read() if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
TAGE = int(os.environ.get("TAGE", "30"))
BREIT_MAX = int(os.environ.get("BREIT_MAX", "1000"))
LOCALE = re.compile(r"^/(fr|en|it)(?=/|$)")


def gql(q, v=None):
    grund = "kein Versuch"
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "90", f"https://{SHOP}/admin/api/2025-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON"; time.sleep(5); continue
        if d.get("data") is not None and not d.get("errors"):
            return d["data"]
        grund = str(d.get("errors") or d)[:300]
        time.sleep(min(30, 6 * (versuch + 1)))
    raise RuntimeError("Shopify antwortet nicht — kein Stand geschrieben. Letzter Grund: " + grund)


def normalisiere(pfad):
    """'/fr/products/x?y' → ('/products/x', 'fr'). Locale-Präfix und Query weg, Schrägstrich am Ende weg (ausser '/')."""
    p = (pfad or "").split("?")[0].split("#")[0]
    m = LOCALE.match(p)
    sprache = m.group(1) if m else ""
    p = LOCALE.sub("", p) or "/"
    if len(p) > 1:
        p = p.rstrip("/")
    return p, sprache


def typ_von(p):
    for t in ("products", "collections", "pages", "blogs"):
        if p.startswith(f"/{t}/") and len(p) > len(t) + 2:
            return t
    return "start" if p == "/" else "andere"


def zielpfad(ziel):
    """Relatives oder eigenes Shop-Ziel. Fremde oder ungültige Ziele bleiben ungeprüft."""
    try:
        url = urlsplit(ziel)
        if url.netloc and (url.hostname not in SHOP_HOSTS or url.username is not None):
            return None
    except ValueError:
        return None
    if url.scheme not in ("", "http", "https") or not url.path.startswith("/"):
        return None
    return normalisiere(url.path)[0]


def urteil(s):
    """Gibt (zustand, befund|None) für den Shop-Zustand und ein geprüftes erstes Redirect-Ziel zurück."""
    if s["typ"] not in ("products", "collections"):
        return "nicht_geprueft", None
    if s["typ"] == "products" and s.get("aktiv") and s.get("im_shop"):
        return "ok", None
    if s["typ"] == "collections" and s.get("aktiv"):
        anzahl = s.get("anzahl")
        if anzahl is None:
            return "nicht_geprueft", None
        return ("leer", "LEER") if anzahl == 0 else ("ok", None)
    ziel = s.get("weiter_ziel")
    if not ziel:
        return "tot", "TOT"
    ziel_p = zielpfad(ziel)
    if ziel_p == "/":
        return "weiter", "BREIT"
    if not ziel_p or s.get("ziel_live") is None:
        return "nicht_geprueft", None
    if not s["ziel_live"]:
        return "weiter", "ZIEL-NICHT-LIVE"
    if typ_von(ziel_p) == "collections":
        anzahl = s.get("ziel_anzahl")
        if anzahl is None:
            return "nicht_geprueft", None
        if anzahl > BREIT_MAX:
            return "weiter", "BREIT"
        if anzahl == 0:
            return "weiter", "LEER"
    return "weiter", None


def landeseiten():
    q = (f"FROM sessions SHOW sessions, sessions_with_cart_additions GROUP BY landing_page_path "
         f"WHERE utm_source = 'chatgpt.com' SINCE -{TAGE}d UNTIL today ORDER BY sessions DESC LIMIT 200")
    d = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})["shopifyqlQuery"]
    if d.get("parseErrors"):
        raise RuntimeError(f"ShopifyQL: {d['parseErrors']}")
    seiten = {}
    for r in d["tableData"]["rows"]:
        p, spr = normalisiere(r.get("landing_page_path"))
        e = seiten.setdefault(p, {"pfad": p, "sitzungen": 0, "warenkorb": 0, "sprachen": set()})
        e["sitzungen"] += int(r.get("sessions") or 0)
        e["warenkorb"] += int(r.get("sessions_with_cart_additions") or 0)
        if spr:
            e["sprachen"].add(spr)
    return sorted(seiten.values(), key=lambda e: -e["sitzungen"])


def online_store_id():
    for p in gql("{publications(first:30){nodes{id name}}}")["publications"]["nodes"]:
        if p["name"] == "Online Store":
            return p["id"]
    raise RuntimeError("Publication «Online Store» nicht gefunden")


def shop_zustand(pfad, pub):
    t = typ_von(pfad)
    h = pfad.split("/")[-1]
    s = {"typ": t}
    if t == "products":
        p = gql('query($h:String!,$p:ID!){productByHandle(handle:$h){status publishedOnPublication(publicationId:$p)}}', {"h": h, "p": pub})["productByHandle"]
        s["aktiv"] = bool(p and p["status"] == "ACTIVE"); s["im_shop"] = bool(p and p["publishedOnPublication"])
    elif t == "collections":
        c = gql('query($h:String!,$p:ID!){collectionByHandle(handle:$h){productsCount{count} publishedOnPublication(publicationId:$p)}}', {"h": h, "p": pub})["collectionByHandle"]
        s["aktiv"] = bool(c and c["publishedOnPublication"]); s["anzahl"] = ((c or {}).get("productsCount") or {}).get("count")
    return s


def zustand_holen(e, pub):
    pfad = e["pfad"]
    s = shop_zustand(pfad, pub)
    if s["typ"] not in ("products", "collections"):
        return s
    if s.get("aktiv") and (s["typ"] == "collections" or s.get("im_shop")):
        return s

    redirects = gql('query($q:String!){urlRedirects(first:5,query:$q){nodes{path target}}}', {"q": "path:" + pfad})["urlRedirects"]["nodes"]
    redirect = next((x for x in redirects if x["path"].rstrip("/") == pfad), None)
    if not redirect:
        return s
    s["weiter_ziel"] = redirect["target"]
    ziel = zielpfad(redirect["target"])
    if ziel and typ_von(ziel) in ("products", "collections"):
        z = shop_zustand(ziel, pub)
        s["ziel_live"] = bool(z.get("aktiv") and (z["typ"] == "collections" or z.get("im_shop")))
        s["ziel_anzahl"] = z.get("anzahl")
    return s


def main():
    if not TOK:
        raise SystemExit("kein Shopify-Token (/tmp/cj_shop_token.txt oder SHOPIFY_ADMIN_TOKEN) — kein Stand geschrieben")
    seiten = landeseiten()
    pub = online_store_id()
    for e in seiten:
        e.update(zustand_holen(e, pub))
        e["zustand"], e["befund"] = urteil(e)
        e["sprachen"] = sorted(e["sprachen"])
    befunde = [e for e in seiten if e["befund"]]
    jetzt = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")
    stand = {"stand": jetzt, "tage": TAGE, "sitzungen": sum(e["sitzungen"] for e in seiten),
             "warenkorb": sum(e["warenkorb"] for e in seiten), "seiten": len(seiten),
             "befunde": [{k: e.get(k) for k in ("pfad", "sitzungen", "warenkorb", "befund", "weiter_ziel", "ziel_anzahl", "anzahl")} for e in befunde],
             "liste": [{k: e.get(k) for k in ("pfad", "sitzungen", "warenkorb", "zustand", "weiter_ziel", "sprachen")} for e in seiten]}
    json.dump(stand, open(STAND, "w"), ensure_ascii=False, indent=1)
    z = [f"# ChatGPT-Landeseiten (Stand {jetzt}, letzte {TAGE} Tage)", "",
         f"{stand['sitzungen']} Sitzungen mit utm_source=chatgpt.com auf {len(seiten)} Seiten, {stand['warenkorb']} mit Warenkorb.",
         f"Befunde: {len(befunde)} (TOT = keine Weiterleitung, ZIEL-NICHT-LIVE = erstes Shopify-Ziel nicht veröffentlicht, BREIT = Weiterleitung auf > {BREIT_MAX} Produkte oder Startseite, LEER = leere Kollektion).", "",
         "| Seite | Sitzungen | Warenkorb | Zustand | Ziel |", "|---|---|---|---|---|"]
    for e in seiten[:80]:
        z.append(f"| `{e['pfad']}` | {e['sitzungen']} | {e['warenkorb']} | {e['zustand']}{' ⚠️ ' + e['befund'] if e['befund'] else ''} | {e.get('weiter_ziel') or ''} |")
    open(BERICHT, "w").write("\n".join(z) + "\n")
    print(f"CHATGPT-LANDESEITEN: {len(seiten)} Seiten, {stand['sitzungen']} Sitzungen, {len(befunde)} Befunde "
          + "; ".join(f"{b['befund']} {b['pfad']} ({b['sitzungen']})" for b in stand["befunde"][:5]))
    print(f"FERTIG {jetzt}")


def selbsttest():
    fehler = 0
    def pr(name, ok):
        nonlocal fehler
        print(("OK   " if ok else "FEHL ") + name); fehler += 0 if ok else 1
    pr("normalisiere fr + Query", normalisiere("/fr/products/x?a=1") == ("/products/x", "fr"))
    pr("normalisiere Startseite /fr → /", normalisiere("/fr") == ("/", "fr"))
    pr("Gegenprobe: /fragen bleibt (kein Locale-Präfix)", normalisiere("/fragen") == ("/fragen", ""))
    pr("aktives Produkt im Shop = ok", urteil({"typ": "products", "aktiv": True, "im_shop": True}) == ("ok", None))
    pr("aktives Produkt NICHT im Onlineshop, ohne Weiterleitung = TOT", urteil({"typ": "products", "aktiv": True, "im_shop": False}) == ("tot", "TOT"))
    pr("Draft ohne Weiterleitung = TOT", urteil({"typ": "products", "aktiv": False}) == ("tot", "TOT"))
    pr("#1029-Fall: Draft → Kollektion 1'649 = BREIT", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/collections/kissen-wohntextilien", "ziel_live": True, "ziel_anzahl": 1649}) == ("weiter", "BREIT"))
    pr("Gegenprobe: Draft → Kollektion 36 = ok-Weiterleitung", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/collections/kuschel-heizdecken", "ziel_live": True, "ziel_anzahl": 36}) == ("weiter", None))
    pr("Draft → Startseite = BREIT", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/"}) == ("weiter", "BREIT"))
    pr("Draft → veröffentlichtes Produkt = ok-Weiterleitung",
       urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/products/ersatz", "ziel_live": True}) == ("weiter", None))
    pr("Draft → Draft-Produkt = ZIEL-NICHT-LIVE",
       urteil({"typ": "products", "weiter_ziel": "/products/ersatz", "ziel_live": False}) == ("weiter", "ZIEL-NICHT-LIVE"))
    pr("Draft → unveröffentlichte gefüllte Kollektion = ZIEL-NICHT-LIVE",
       urteil({"typ": "products", "weiter_ziel": "/collections/ersatz", "ziel_live": False, "ziel_anzahl": 36}) == ("weiter", "ZIEL-NICHT-LIVE"))
    pr("Draft → veröffentlicht, aber leere Kollektion = LEER",
       urteil({"typ": "products", "weiter_ziel": "/collections/ersatz", "ziel_live": True, "ziel_anzahl": 0}) == ("weiter", "LEER"))
    pr("Unbestätigtes Ziel bleibt ungeprüft",
       urteil({"typ": "products", "weiter_ziel": "/products/ersatz"}) == ("nicht_geprueft", None))
    pr("Eigener absoluter Link wird als interner Pfad gelesen",
       zielpfad("https://luxestyle.ch/fr/products/x?variant=5") == "/products/x")
    pr("Fremder absoluter Link bleibt ungeprüft",
       zielpfad("https://example.org/products/x") is None)
    pr("Kollektion leer = LEER", urteil({"typ": "collections", "aktiv": True, "anzahl": 0}) == ("leer", "LEER"))
    pr("Kollektion gefüllt = ok", urteil({"typ": "collections", "aktiv": True, "anzahl": 12}) == ("ok", None))
    pr("Kollektion weg, ohne Weiterleitung = TOT", urteil({"typ": "collections", "aktiv": False}) == ("tot", "TOT"))
    pr("Startseite wird nicht geprüft", urteil({"typ": "start"}) == ("nicht_geprueft", None))
    print(f"SELBSTTEST {'OK' if not fehler else 'FEHLER'} ({fehler} Fehler)")
    return 1 if fehler else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    main()
