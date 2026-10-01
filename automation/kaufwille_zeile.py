#!/usr/bin/env python3
"""kaufwille_zeile.py — eine Zeile für die stündliche Keepalive-Meldung: wo Leute kaufen WOLLTEN und es nicht taten (01.10.2026).

ANLASS: Betreiber «wie kann man sonst grow plan nutzen» → «ja starte alle bis fertig». Grow liefert Verhaltensberichte; die
Einstiegsseiten-Auswertung (ShopifyQL) lief bisher nur, wenn jemand sie von Hand aufrief. Gemessen 01.10. (30 T): Rizinusöl-Set
20 Sitzungen · 2 Warenkörbe · 0 Käufe; Kristall-Set 7 · 2 · 1. Solche Seiten sind der kürzeste Weg zum nächsten Verkauf
(Preis, Bilder, Versandtext, Lieferbarkeit) — aber nur, wenn sie jemand sieht.

Ausgabe (immer genau eine Zeile, Präfix «KAUFWILLE»): Produkt-Landeseiten der letzten TAGE (7) mit ≥1 Warenkorb-Sitzung und
0 abgeschlossenen Käufen, nur Menschen; die drei stärksten mit Status. ⚠️ wenn eine davon NICHT kaufbar ist (Entwurf/fehlt) —
dann landet Kaufwille auf einer toten Seite (Klasse Rizinusöl-Set 18.09.). Schreibt NICHTS im Shop.
Bei Fehler «KAUFWILLE: unklar (Grund)», nie «0».
"""
import json, os, sys, time, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
TAGE = int(os.environ.get("TAGE", "7"))


def gql(q, v=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    grund = ""
    for a in range(3):
        try:
            r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                       data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=60))
            if d.get("data") is not None and not d.get("errors"):
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:120]
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:120]
        time.sleep(3 + 3 * a)
    raise RuntimeError(grund)


def main():
    q = (f"FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_completed_checkout GROUP BY landing_page_path "
         f"WHERE human_or_bot_session = 'human' AND landing_page_type = 'Product' SINCE -{TAGE}d UNTIL today "
         f"ORDER BY sessions_with_cart_additions DESC LIMIT 200")
    t = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})["shopifyqlQuery"]
    if t.get("parseErrors"):
        raise RuntimeError("ShopifyQL " + str(t["parseErrors"])[:100])
    offen = []
    for r in (t.get("tableData") or {}).get("rows") or []:
        p = (r.get("landing_page_path") or "")
        wk, kauf = int(r.get("sessions_with_cart_additions") or 0), int(r.get("sessions_that_completed_checkout") or 0)
        if p.startswith("/products/") and wk >= 1 and kauf == 0:
            offen.append((p.split("/products/")[1].split("?")[0], int(r.get("sessions") or 0), wk))
    if not offen:
        print(f"KAUFWILLE {TAGE} T: keine Produktseite mit Warenkorb ohne Kauf")
        return
    teile, tot = [], 0
    for h, s, wk in offen[:3]:
        p = gql('query($h:String!){productByHandle(handle:$h){status onlineStoreUrl}}', {"h": h})["productByHandle"]
        kaufbar = bool(p and p["status"] == "ACTIVE" and p["onlineStoreUrl"])
        tot += not kaufbar
        teile.append(f"{h[:38]} {s}/{wk}" + ("" if kaufbar else f" ⚠️ {(p or {}).get('status', 'FEHLT')}"))
    warn = " · ⚠️ Kaufwille auf nicht kaufbarer Seite" if tot else ""
    print(f"KAUFWILLE {TAGE} T: {len(offen)} Seiten mit Warenkorb ohne Kauf (Sitz./Warenkorb) · " + " · ".join(teile) + warn)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"KAUFWILLE: unklar ({str(e)[:100]})")
