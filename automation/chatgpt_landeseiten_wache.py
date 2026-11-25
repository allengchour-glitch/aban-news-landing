#!/usr/bin/env python3
"""chatgpt_landeseiten_wache.py — prüft täglich die Seiten, auf denen ChatGPT-Besucher landen (25.11.2026).

ANLASS (gemessen 25.11.): ChatGPT ist der stärkste Verkaufskanal — 9 der letzten 25 Bestellungen kamen mit erstem Besuch über
utm_source=chatgpt.com (Google 7). ChatGPT verlinkt feste Adressen aus seinem Suchindex. Wird ein Produkt gedraftet, zeigt
ChatGPT den alten Link weiter: Die Landeseite der ChatGPT-Bestellung #1029 («Heizbare Kuscheldecke mit Ärmeln», 9 Sitzungen,
1 Kauf in 60 T) wurde am 24.11. gedraftet und leitete auf «Kissen & Wohntextilien» (1'649 Produkte) — niemand hat es bemerkt.

ABLAUF: ShopifyQL (Admin-API shopifyqlQuery) → Landeseiten der letzten 30 Tage mit utm_source='chatgpt.com' → je Seite
Admin-Zustand: Produkt ACTIVE und im Onlineshop? Kollektion vorhanden und nicht leer? Sonst Weiterleitung (urlRedirects) und
Grösse des Ziels. Befunde: TOT (keine Weiterleitung), BREIT (Weiterleitung auf eine Kollektion mit > BREIT_MAX Produkten oder
auf die Startseite), LEER (Kollektion ohne Produkte). Schreibt NUR am Ende: dropship/_chatgpt_landeseiten.json +
dropship/CHATGPT-LANDESEITEN.md; die Ampel (betreiber_ampel.chatgpt_landeseiten) liest den Stand. Ändert nichts im Shop.

  python3 automation/chatgpt_landeseiten_wache.py              # messen, Stand + Bericht schreiben
  python3 automation/chatgpt_landeseiten_wache.py --selbsttest  # Urteilslogik ohne Netz (mit Gegenproben)
"""
import datetime, json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.environ.get("CLW_STAND") or os.path.join(ROOT, "dropship", "_chatgpt_landeseiten.json")
BERICHT = os.environ.get("CLW_BERICHT") or os.path.join(ROOT, "dropship", "CHATGPT-LANDESEITEN.md")
SHOP = "au3j0y-hq.myshopify.com"
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


def urteil(s):
    """s = {typ, aktiv, im_shop, anzahl, weiter_ziel, ziel_anzahl} → (zustand, befund|None). Rein, ohne Netz.
    zustand: ok | weiter | tot | leer | nicht_geprueft. befund: TOT | BREIT | LEER | None."""
    if s["typ"] not in ("products", "collections"):
        return "nicht_geprueft", None
    if s["typ"] == "products" and s.get("aktiv") and s.get("im_shop"):
        return "ok", None
    if s["typ"] == "collections" and s.get("aktiv"):
        return ("leer", "LEER") if not s.get("anzahl") else ("ok", None)
    ziel = s.get("weiter_ziel")
    if not ziel:
        return "tot", "TOT"
    ziel_p, _ = normalisiere(ziel)
    if ziel_p == "/":
        return "weiter", "BREIT"
    if typ_von(ziel_p) == "collections" and (s.get("ziel_anzahl") or 0) > BREIT_MAX:
        return "weiter", "BREIT"
    if typ_von(ziel_p) == "collections" and s.get("ziel_anzahl") == 0:
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


def zustand_holen(e, pub):
    t = typ_von(e["pfad"]); h = e["pfad"].split("/")[-1]
    s = {"typ": t}
    if t == "products":
        p = gql('query($h:String!,$p:ID!){productByHandle(handle:$h){status publishedOnPublication(publicationId:$p)}}', {"h": h, "p": pub})["productByHandle"]
        s["aktiv"] = bool(p and p["status"] == "ACTIVE"); s["im_shop"] = bool(p and p["publishedOnPublication"])
    elif t == "collections":
        c = gql('query($h:String!,$p:ID!){collectionByHandle(handle:$h){productsCount{count} publishedOnPublication(publicationId:$p)}}', {"h": h, "p": pub})["collectionByHandle"]
        s["aktiv"] = bool(c and c["publishedOnPublication"]); s["anzahl"] = (c or {}).get("productsCount", {}).get("count", 0)
    else:
        return s
    if not (s.get("aktiv") and (t == "collections" or s.get("im_shop"))):
        w = gql('query($q:String!){urlRedirects(first:5,query:$q){nodes{path target}}}', {"q": "path:" + e["pfad"]})["urlRedirects"]["nodes"]
        w = [x for x in w if x["path"].rstrip("/") == e["pfad"]]
        if w:
            s["weiter_ziel"] = w[0]["target"]
            zp, _ = normalisiere(w[0]["target"])
            if typ_von(zp) == "collections":
                c = gql('query($h:String!){collectionByHandle(handle:$h){productsCount{count}}}', {"h": zp.split("/")[-1]})["collectionByHandle"]
                s["ziel_anzahl"] = (c or {}).get("productsCount", {}).get("count", 0) if c else 0
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
         f"Befunde: {len(befunde)} (TOT = keine Weiterleitung, BREIT = Weiterleitung auf > {BREIT_MAX} Produkte oder Startseite, LEER = leere Kollektion).", "",
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
    pr("#1029-Fall: Draft → Kollektion 1'649 = BREIT", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/collections/kissen-wohntextilien", "ziel_anzahl": 1649}) == ("weiter", "BREIT"))
    pr("Gegenprobe: Draft → Kollektion 36 = ok-Weiterleitung", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/collections/kuschel-heizdecken", "ziel_anzahl": 36}) == ("weiter", None))
    pr("Draft → Startseite = BREIT", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/"}) == ("weiter", "BREIT"))
    pr("Draft → Produkt = ok-Weiterleitung", urteil({"typ": "products", "aktiv": False, "weiter_ziel": "/products/ersatz"}) == ("weiter", None))
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
