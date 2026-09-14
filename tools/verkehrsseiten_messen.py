#!/usr/bin/env python3
"""verkehrsseiten_messen.py — misst die Produktseiten, auf denen der Verkehr WIRKLICH landet.

Warum: 957 von 1'357 Sitzungen (30 T., gemessen 14.09.2026) landen auf Produktseiten (Google-
Gratis-Einträge), 92 auf Kollektionen, 208 auf der Startseite. «Katalog verbessern» heisst
deshalb zuerst: die Landeseiten-Produkte, gewichtet nach Sitzungen — nicht 52'000 Produkte gleich.

  python3 tools/verkehrsseiten_messen.py dump   <landing.tsv> <dump.json>   # Admin-API → Datei
  python3 tools/verkehrsseiten_messen.py messen <landing.tsv> <dump.json>   # Klassen, sitzungsgewichtet
  python3 tools/verkehrsseiten_messen.py --selbsttest

landing.tsv: handle<TAB>sessions<TAB>carts<TAB>checkout<TAB>completed (aus ShopifyQL
  FROM sessions … GROUP BY landing_page_path WHERE landing_page_type='Product'; Pfad ohne /products/).

Gezählt wird nur, was der Kundin auf der Seite schadet oder den Klick verschenkt. BEWUSST KEIN
Befund: «Default Title» bei einer Variante, fehlendes Gewicht bei Eigenware/POD, 1 Bild bei POD
(Editor rendert die Vorschau), keine Bewertung (Information, kein Defekt).
"""
import json, os, re, sys, urllib.parse, urllib.request

TOKEN_DATEI = "/tmp/cj_shop_token.txt"
SHOP = "au3j0y-hq.myshopify.com"

ROH = [re.compile(p, re.I) for p in (
    r"\b(Violent|Robber|Random|Colour|Size|Pieces?|Set of|As Picture|As shown|Wooden Handle|Stainless|Plastic|Alloy)\b",
    r"-\d{2,4}\s?mm-", r"^(.{4,}?)\s*-\s*\1$")]
FLOSKEL = re.compile(r"\b(hochwertig(e[rsn]?)?|sorgt für|Dieses? (Produkt|Artikel)|perfekt für jeden Anlass)\b")
SIE = re.compile(r"\b(Sie|Ihre[rmns]?|Ihnen)\b(?! (Damen|Herren))")
JENACHLAND = re.compile(r"je nach Land", re.I)
ENGLISCH = re.compile(r"\b(the|and|with|for your|high quality|free shipping)\b", re.I)
CJK = re.compile(r"[぀-ヿ㐀-鿿]")
POD_TAGS = {"pod", "selbst-gestalten", "printful", "printful_personalized_product"}

def gql(q, v=None):
    """Mit Wartezeit bei THROTTLED — 25 Produkte je Aufruf kosten ~1'000 Punkte, der Eimer ist 2'000."""
    import time
    tok = open(TOKEN_DATEI).read().strip()
    for versuch in range(8):
        r = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
                                   data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        d = json.load(urllib.request.urlopen(r, timeout=120))
        if any(e.get("extensions", {}).get("code") == "THROTTLED" for e in d.get("errors") or []):
            time.sleep(4 + 4 * versuch); continue
        return d
    return d

FELDER = """id handle title status tags productType vendor onlineStoreUrl totalInventory
  mediaCount{count} media(first:12){nodes{alt status}}
  descriptionHtml seo{title description}
  options{name values}
  variants(first:60){nodes{sku title price compareAtPrice inventoryPolicy inventoryQuantity
    inventoryItem{tracked measurement{weight{value unit}}}}}
  rv:metafield(namespace:"judgeme",key:"review_widget_data"){value}
  lz:metafield(namespace:"custom",key:"lieferzeit"){value}"""

def lade_landing(pfad):
    rows = []
    for l in open(pfad, encoding="utf-8"):
        t = l.rstrip("\n").split("\t")
        if len(t) < 2 or not t[0].strip():
            continue
        rows.append({"handle": urllib.parse.unquote(t[0]).strip("/").replace("products/", ""),
                     "sessions": int(t[1]), "carts": int(t[2]) if len(t) > 2 else 0,
                     "checkout": int(t[3]) if len(t) > 3 else 0, "completed": int(t[4]) if len(t) > 4 else 0})
    return rows

def dump(landing, out):
    import time
    rows = lade_landing(landing)
    prods = {}
    for i in range(0, len(rows), 20):
        chunk = rows[i:i + 20]
        q = "{" + " ".join(f'p{j}:productByHandle(handle:{json.dumps(r["handle"])}){{{FELDER}}}' for j, r in enumerate(chunk)) + "}"
        d = gql(q)
        if "errors" in d and not d.get("data"):
            raise SystemExit("GraphQL-Fehler: " + json.dumps(d["errors"])[:400])
        for j, r in enumerate(chunk):
            prods[r["handle"]] = d["data"].get(f"p{j}")
        print(f"  {min(i+20,len(rows))}/{len(rows)}", file=sys.stderr); time.sleep(2)
    json.dump(prods, open(out, "w"), ensure_ascii=False)
    print(f"dump: {sum(1 for v in prods.values() if v)} gefunden, {sum(1 for v in prods.values() if not v)} nicht gefunden → {out}")

def text_aus_html(h):
    h = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", h or "", flags=re.S | re.I)
    h = re.sub(r"<!--.*?-->", " ", h, flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)).strip()

def gewicht_g(v):
    m = ((v.get("inventoryItem") or {}).get("measurement") or {}).get("weight") or {}
    w, u = m.get("value") or 0, (m.get("unit") or "GRAMS")
    return w * {"GRAMS": 1, "KILOGRAMS": 1000, "POUNDS": 453.6, "OUNCES": 28.35}.get(u, 1)

def befunde(p):
    """Liefert die Liste der Klassen, die auf diesem Produkt zutreffen (Kundensicht)."""
    if not p:
        return ["nicht_gefunden"]
    b = []
    tags = set(t.lower() for t in p.get("tags") or [])
    pod = bool(tags & POD_TAGS) or (p.get("vendor") or "").lower() == "printful"
    if p.get("status") != "ACTIVE":
        b.append("nicht_aktiv")
    elif not p.get("onlineStoreUrl"):
        b.append("nicht_im_onlineshop")
    vs = (p.get("variants") or {}).get("nodes") or []
    mc = ((p.get("mediaCount") or {}).get("count") or 0)
    if mc == 0:
        b.append("kein_bild")
    elif mc == 1 and not pod:
        b.append("ein_bild")
    if any((m.get("status") or "READY") != "READY" for m in ((p.get("media") or {}).get("nodes") or [])):
        b.append("bild_nicht_ready")
    if vs and all(v.get("inventoryPolicy") == "DENY" and (v.get("inventoryItem") or {}).get("tracked") and (v.get("inventoryQuantity") or 0) <= 0 for v in vs):
        b.append("ausverkauft")
    if vs and not any((v.get("sku") or "").strip() for v in vs):
        b.append("kein_sku")
    if len(vs) > 1 and any(any(r.search(v.get("title") or "") for r in ROH) for v in vs):
        b.append("rohe_variante")
    if any((v.get("compareAtPrice") and float(v["compareAtPrice"]) <= float(v["price"])) for v in vs):
        b.append("streichpreis_kaputt")
    if any(float(v.get("price") or 0) <= 0 for v in vs):
        b.append("preis_null")
    if not pod and vs and max(gewicht_g(v) for v in vs) > 712:
        b.append("gewicht_ueber_712g")
    txt = text_aus_html(p.get("descriptionHtml"))
    if len(txt) < 300:
        b.append("text_kurz")
    if FLOSKEL.search(txt):
        b.append("floskel")
    if SIE.search(txt):
        b.append("sie_anrede")
    if JENACHLAND.search(txt) and not pod:   # POD (Printful) liefert wirklich je nach Land; CJ/Fortura nicht
        b.append("je_nach_land")
    if CJK.search(txt) or CJK.search(p.get("title") or ""):
        b.append("cjk")
    if len(ENGLISCH.findall(txt)) >= 3:
        b.append("englisch")
    seo = p.get("seo") or {}
    # Leerer SEO-Titel ist KEIN Befund: Shopify nimmt dann den Produkttitel (Absicht, kein Fehler).
    if not (seo.get("description") or "").strip():
        b.append("seo_desc_fehlt")
    elif len(seo["description"]) > 160 or len(seo.get("title") or "") > 70:
        b.append("seo_zu_lang")
    if len(p.get("title") or "") > 80:
        b.append("titel_zu_lang")
    rv = (p.get("rv") or {}).get("value")
    try:
        n = json.loads(rv or "{}").get("number_of_reviews", 0)
    except Exception:
        n = 0
    if not n:
        b.append("info_keine_bewertung")
    return b

def messen(landing, dumpf, drucken=True):
    rows = lade_landing(landing)
    prods = json.load(open(dumpf))
    klassen, sess = {}, {}
    total_s = sum(r["sessions"] for r in rows)
    for r in rows:
        for k in befunde(prods.get(r["handle"])):
            klassen.setdefault(k, []).append((r["handle"], r["sessions"]))
            sess[k] = sess.get(k, 0) + r["sessions"]
    if drucken:
        print(f"{len(rows)} Landeseiten-Produkte, {total_s} Sitzungen")
        print(f"{'Klasse':24} {'Produkte':>8} {'Sitzungen':>9} {'%Sitz':>6}  Beispiele (Sitzungen)")
        for k in sorted(klassen, key=lambda k: -sess[k]):
            bsp = ", ".join(f"{h}({s})" for h, s in sorted(klassen[k], key=lambda x: -x[1])[:3])
            print(f"{k:24} {len(klassen[k]):>8} {sess[k]:>9} {100*sess[k]/max(total_s,1):>5.1f}%  {bsp}")
    return klassen

def selbsttest():
    import tempfile, copy
    ok = lambda c, m: print(("✓ " if c else "✗ ") + m) or c
    sauber = {"handle": "gut", "title": "Gutes Produkt", "status": "ACTIVE", "tags": [], "productType": "x", "vendor": "CJ",
              "onlineStoreUrl": "https://luxestyle.ch/products/gut", "mediaCount": {"count": 4},
              "media": {"nodes": [{"alt": "a", "status": "READY"}]},
              "descriptionHtml": "<p>" + "Du bekommst ein Set aus Bambus, das im Alltag hält. " * 8 + "</p>",
              "seo": {"title": "Gutes Produkt | LuxeStyle", "description": "Kurz und gut."}, "options": [],
              "variants": {"nodes": [{"sku": "CJ-1", "title": "Default Title", "price": "19.90", "compareAtPrice": None,
                                      "inventoryPolicy": "CONTINUE", "inventoryQuantity": 5,
                                      "inventoryItem": {"tracked": True, "measurement": {"weight": {"value": 200, "unit": "GRAMS"}}}}]},
              "rv": {"value": json.dumps({"number_of_reviews": 3})}, "lz": {"value": "10–20 Werktage"}}
    schlecht = copy.deepcopy(sauber)
    schlecht.update({"handle": "schlecht", "status": "DRAFT", "mediaCount": {"count": 1},
                     "media": {"nodes": [{"alt": "", "status": "FAILED"}]},
                     "descriptionHtml": "<p>Dieses Produkt ist hochwertig. Sie erhalten es je nach Land. the best for your home and the world</p>",
                     "tags": [],
                     "seo": {"title": "", "description": ""}, "lz": None, "rv": None,
                     "title": "X" * 81})
    schlecht["variants"] = {"nodes": [
        {"sku": "", "title": "Random Color-213mm-", "price": "0", "compareAtPrice": "0",
         "inventoryPolicy": "DENY", "inventoryQuantity": 0,
         "inventoryItem": {"tracked": True, "measurement": {"weight": {"value": 1.2, "unit": "KILOGRAMS"}}}},
        {"sku": "", "title": "Blue", "price": "0", "compareAtPrice": None, "inventoryPolicy": "DENY", "inventoryQuantity": 0,
         "inventoryItem": {"tracked": True, "measurement": {"weight": {"value": 900, "unit": "GRAMS"}}}}]}
    d = tempfile.mkdtemp(prefix="vsm_")  # Kopie an anderem Pfad
    lp, dp = os.path.join(d, "l.tsv"), os.path.join(d, "d.json")
    open(lp, "w").write("gut\t10\t1\t0\t0\n/products/schlecht\t5\t0\t0\t0\nfehlt\t1\n")
    json.dump({"gut": sauber, "schlecht": schlecht, "fehlt": None}, open(dp, "w"))
    k = messen(lp, dp, drucken=False)
    erw = {"nicht_aktiv", "ein_bild", "bild_nicht_ready", "ausverkauft", "kein_sku", "rohe_variante", "streichpreis_kaputt",
           "preis_null", "gewicht_ueber_712g", "text_kurz", "floskel", "sie_anrede", "je_nach_land", "englisch",
           "seo_desc_fehlt", "titel_zu_lang", "info_keine_bewertung"}
    alle = True
    alle &= ok(befunde(sauber) == [], "sauberes Produkt: 0 Befunde (" + ",".join(befunde(sauber)) + ")")
    b = set(befunde(schlecht))
    alle &= ok(erw <= b, "verschlechtertes Produkt schlägt in jeder Klasse aus; fehlt: " + ",".join(sorted(erw - b)))
    alle &= ok(k.get("nicht_gefunden") == [("fehlt", 1)], "nicht gefundenes Produkt wird gezählt")
    alle &= ok(all(h == "schlecht" for h, _ in k["floskel"]) and k["floskel"][0][1] == 5, "Sitzungen hängen am richtigen Produkt")
    alle &= ok(gewicht_g({"inventoryItem": {"measurement": {"weight": {"value": 1.2, "unit": "KILOGRAMS"}}}}) == 1200, "kg → g")
    alle &= ok("Sie" not in text_aus_html("<script>Sie</script><p>du</p>") , "script-Inhalt wird vor der Textprüfung entfernt")
    pod = copy.deepcopy(sauber); pod["tags"] = ["pod"]; pod["mediaCount"] = {"count": 1}
    alle &= ok("ein_bild" not in befunde(pod), "POD mit 1 Bild ist kein Befund (Absicht, kein Fehler)")
    pod2 = copy.deepcopy(sauber); pod2["tags"] = ["printful_personalized_product"]; pod2["descriptionHtml"] = "<p>" + "Lieferzeit je nach Land: CH 7–14 Tage. " * 10 + "</p>"
    alle &= ok("je_nach_land" not in befunde(pod2), "POD mit «je nach Land» ist kein Befund")
    alle &= ok("seo_desc_fehlt" not in befunde(dict(sauber, seo={"title": "", "description": "ok"})), "leerer SEO-Titel ist kein Befund")
    alle &= ok("sie_anrede" not in befunde(dict(sauber, descriptionHtml="<p>" + "Für Sie Damen ist das Kleid ein Klassiker im Schrank. " * 8 + "</p>")), "«Sie Damen» ist keine Anrede")
    print("SELBSTTEST " + ("BESTANDEN" if alle else "FEHLGESCHLAGEN")); sys.exit(0 if alle else 1)

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "--selbsttest":
        selbsttest()
    elif a[0] == "dump":
        dump(a[1], a[2])
    elif a[0] == "messen":
        messen(a[1], a[2])
    else:
        print(__doc__)
