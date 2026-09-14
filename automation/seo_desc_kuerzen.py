#!/usr/bin/env python3
"""seo_desc_kuerzen.py — kürzt SEO-Beschreibungen über 160 Zeichen auf ≤155 an einer Wort-/Satzgrenze.

WARUM: Google schneidet Snippets bei ~150–160 Zeichen; ein abgeschnittener Halbsatz «… Gratis-Versan»
wirkt unfertig. Gemessen 14.09.2026 (Bulk, aktive Produkte): 1'050 Beschreibungen >160, 985 davon 160–179.
Der Schnitt fällt bevorzugt auf ein Satzende («.» «·» «–»), sonst auf ein Wortende; nie mitten im Wort.
Text wird LIVE gelesen (Lehre 15.08.), nur seo.description geschrieben, sofort gegengeprüft.

  python3 automation/seo_desc_kuerzen.py --selbsttest
  DRY=1 python3 automation/seo_desc_kuerzen.py <ids.txt>
  python3 automation/seo_desc_kuerzen.py <ids.txt>
"""
import json, os, re, sys, time, urllib.request, urllib.error
SHOP = "au3j0y-hq.myshopify.com"; ZIEL = 155

def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    for i in range(6):
        r = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(r, timeout=90))
        except (urllib.error.HTTPError, urllib.error.URLError):
            time.sleep(3 + 3 * i); continue
        if any(e.get("extensions", {}).get("code") == "THROTTLED" for e in d.get("errors") or []):
            time.sleep(3 + 3 * i); continue
        return d
    return d

def kuerzen(s):
    s = re.sub(r"\s+", " ", s or "").strip()
    if len(s) <= 160:
        return s
    kopf = s[:ZIEL + 1]
    # 1. Satz-/Gliederungsgrenze so spät wie möglich, aber nicht vor 90 Zeichen
    best = max((m.end() for m in re.finditer(r"[.!?]|\s[·–—|]\s", kopf) if m.end() >= 70), default=0)
    if best:
        return s[:best].rstrip(" ·–—|")
    # 2. Wortgrenze
    cut = kopf.rfind(" ")
    if cut < 70:
        cut = ZIEL
    return s[:cut].rstrip(" ,;:·–—|-") + "…"

def lauf(ids, dry):
    n_ok = n_skip = n_err = 0
    for pid in ids:
        d = gql('query($id:ID!){product(id:$id){title seo{description}}}', {"id": pid})
        p = (d.get("data") or {}).get("product")
        if not p:
            n_err += 1; continue
        alt = (p["seo"] or {}).get("description") or ""
        neu = kuerzen(alt)
        if neu == alt or len(alt) <= 160:
            n_skip += 1; continue
        if dry:
            n_ok += 1
            if n_ok <= 8: print(f"  {len(alt)}→{len(neu)} {neu!r}")
            continue
        u = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{seo{description}} userErrors{message}}}', {"i": {"id": pid, "seo": {"description": neu}}})
        r = u["data"]["productUpdate"]
        if r["userErrors"] or (r["product"] or {}).get("seo", {}).get("description") != neu:
            n_err += 1; print("  FEHLER", pid, r["userErrors"])
        else:
            n_ok += 1
        time.sleep(0.3)
    print(f"{'DRY' if dry else 'GESCHRIEBEN'}: {n_ok} gekürzt · {n_skip} übersprungen · {n_err} Fehler")

def selbsttest():
    t = []
    a = "Maxi-Kleid «Aria» · Langarm, tailliert mit Gürtel – jetzt bei LuxeStyle CH bestellen. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Kauf auf Rechnung mit Klarna und TWINT."
    k = kuerzen(a); t.append(("Satzgrenze: endet mit Punkt, ≤155", k.endswith("bestellen.") and len(k) <= 155))
    b = "Wort " * 40
    k = kuerzen(b); t.append(("Wortgrenze mit Ellipse, ≤156", k.endswith("Wort…") and len(k) <= 156))
    t.append(("kurze bleibt unverändert", kuerzen("Kurz und gut.") == "Kurz und gut."))
    t.append(("genau 160 bleibt", kuerzen("x" * 160) == "x" * 160))
    t.append(("None-sicher", kuerzen(None) == ""))
    t.append(("idempotent", kuerzen(kuerzen(a)) == kuerzen(a)))
    c = "Elegantes langes Abendkleid im Meerjungfrau-Schnitt mit High-Slit & Schleppe – für Gala, Hochzeit & Ball. Jetzt bei LuxeStyle CH: Gratis-Versand ab CHF 50 · 30 Tage Rückgabe."
    k = kuerzen(c); t.append(("Grenze «–» oder «.» spät gewählt (>70)", len(k) >= 70 and len(k) <= 155 and not k.endswith("…")))
    ok = True
    for n, cnd in t:
        print(("✓ " if cnd else "✗ ") + n); ok &= cnd
    print("SELBSTTEST", "BESTANDEN" if ok else "FEHLGESCHLAGEN"); sys.exit(0 if ok else 1)

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "--selbsttest": selbsttest()
    lauf([l.strip() for l in open(a[0]) if l.strip()], os.environ.get("DRY") == "1")
