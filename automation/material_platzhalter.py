#!/usr/bin/env python3
"""material_platzhalter.py — entfernt die Faktenzeile «Material: hochwertiges Material».

WARUM: Die Zeile steht in der Faktenliste (<li><strong>Material:</strong> hochwertiges Material</li>)
und landet so als Tabellenzeile «Material | hochwertiges Material» in «Spezifikationen & Details» —
eine Floskel an der Stelle, wo die Kundin einen Stoff erwartet. Gemessen 14.09.2026: 49 von 221
Landeseiten-Produkten (41 % der Sitzungen) tragen sie; Katalog-Export 03.09.: 105.
Regel (Lehre 15.08.): Text LIVE lesen, genau dieses eine <li> entfernen, sofort gegenprüfen.

  python3 automation/material_platzhalter.py --selbsttest
  DRY=1 python3 automation/material_platzhalter.py <ids.txt>     # zeigt nur
  python3 automation/material_platzhalter.py <ids.txt>           # schreibt (ids: gid je Zeile)
"""
import json, os, re, sys, time, urllib.request, urllib.error
SHOP = "au3j0y-hq.myshopify.com"
MUSTER = re.compile(r"\s*<li>\s*<strong>\s*Material:?\s*</strong>\s*:?\s*hochwertiges Material\s*\.?\s*</li>", re.I)

def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    for i in range(6):
        r = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(r, timeout=90))
        except (urllib.error.HTTPError, urllib.error.URLError) as e:   # 500/502 von Shopify: kurz warten, nochmal
            time.sleep(3 + 3 * i); continue
        if any(e.get("extensions", {}).get("code") == "THROTTLED" for e in d.get("errors") or []):
            time.sleep(3 + 3 * i); continue
        return d
    return d

def bereinigt(html):
    return MUSTER.sub("", html or "")

def lauf(ids, dry):
    n_ok = n_skip = n_err = 0
    for pid in ids:
        d = gql('query($id:ID!){product(id:$id){id title descriptionHtml}}', {"id": pid})
        p = (d.get("data") or {}).get("product")
        if not p:
            n_err += 1; print("  nicht gefunden:", pid); continue
        neu = bereinigt(p["descriptionHtml"])
        if neu == p["descriptionHtml"]:
            n_skip += 1; continue
        if dry:
            print(f"  DRY {p['title'][:60]}: -{len(p['descriptionHtml']) - len(neu)} Zeichen"); n_ok += 1; continue
        u = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}', {"i": {"id": pid, "descriptionHtml": neu}})
        r = u["data"]["productUpdate"]
        if r["userErrors"] or "hochwertiges Material</li>" in (r["product"] or {}).get("descriptionHtml", ""):
            n_err += 1; print("  FEHLER", pid, r["userErrors"])
        else:
            n_ok += 1
        time.sleep(0.4)
    print(f"{'DRY' if dry else 'GESCHRIEBEN'}: {n_ok} bereinigt · {n_skip} ohne Zeile · {n_err} Fehler")

def selbsttest():
    h = '<ul><li><strong>Farbe:</strong> Rot</li>\n<li><strong>Material:</strong> hochwertiges Material</li><li><strong>Muster:</strong> Uni</li></ul><p>hochwertiges Material im Fliesstext bleibt.</p>'
    n = bereinigt(h)
    t = [("Platzhalter-Zeile weg", "hochwertiges Material</li>" not in n),
         ("Nachbarzeilen bleiben", "<li><strong>Farbe:</strong> Rot</li>" in n and "Muster" in n),
         ("Fliesstext bleibt", "im Fliesstext bleibt" in n),
         ("echtes Material bleibt", bereinigt('<li><strong>Material:</strong> Baumwolle</li>') == '<li><strong>Material:</strong> Baumwolle</li>'),
         ("idempotent", bereinigt(n) == n), ("None-sicher", bereinigt(None) == "")]
    ok = True
    for name, c in t:
        print(("✓ " if c else "✗ ") + name); ok &= c
    print("SELBSTTEST", "BESTANDEN" if ok else "FEHLGESCHLAGEN"); sys.exit(0 if ok else 1)

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "--selbsttest": selbsttest()
    ids = [l.strip() for l in open(a[0]) if l.strip()]
    lauf(ids, os.environ.get("DRY") == "1")
