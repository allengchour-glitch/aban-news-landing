#!/usr/bin/env python3
"""Rankende Seiten, die ins Leere führen — täglich statt einmalig.

ANLASS (28.08.2026): Von 60 Produkt-URLs, für die der Shop bei Google rankt, waren **17
gedraftet** — für Besucherinnen ein 404. Zusammen 12'320 Suchen im Monat, angeführt von einem
Produkt mit 3'600. Alle 17 waren ZU RECHT gedraftet (keine Lieferanten-SKU, nicht in die CH
lieferbar, ausverkauft, verdeckte Überwachung); veröffentlichen wäre falsch. Richtig sind
Weiterleitungen auf kaufbare Ware.

WARUM ES WIEDERKOMMT: Die täglichen Wächter draften laufend Ware (Viability, Dubletten,
Medizinprodukte, Merchant-Sperre). Jeder dieser Läufe kann eine Seite erwischen, die Besucher
hat — und keiner von ihnen weiss davon.

WAS DIESER LAUF TUT
 1. Holt aus Shopifys eigenen Sitzungsdaten (ShopifyQL) die Produkt-Landeseiten der letzten
    60 Tage — also die Seiten, auf denen tatsächlich Menschen ankamen.
 2. Prüft jede gegen den LIVE-Status.
 3. Ist sie nicht mehr kaufbar und hat noch keine Weiterleitung: legt eine an, WENN ein
    eindeutig gleichartiges aktives Produkt existiert. Sonst nur melden.

⚠️ NIE veröffentlichen. Ein Draft hat einen Grund im Tag; ein 404 ist ärgerlich, eine
unlieferbare Bestellung teuer (Lehre 20.08.).
⚠️ NIE auf eine fremde Marke umleiten. Wer «cerave» sucht und auf einer No-Name-Creme landet,
erlebt einen Köderwechsel. Markenanfragen bleiben dem Menschen überlassen.

  DRY=1  nur zeigen (Standard)   FIX=1  Weiterleitungen anlegen
"""
import json, os, re, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "TOTE-LANDESEITEN.md")
LEDGER = os.path.join(REPO, "dropship", "_tote_landeseiten.txt")
FIX = os.environ.get("FIX") == "1"
TAGE = os.environ.get("TAGE", "60")

# Tags, die ein Ziel disqualifizieren — ein Ersatz darf nicht dasselbe Problem haben.
RISIKO = {"verdeckte-ueberwachung", "abhoergeraet-pruefen", "nicht-bewerben",
          "medizinprodukt-pruefen", "waffengesetz-verboten", "nur-onlineshop", "18plus",
          "raucher", "duplikat-auto-draft", "keine-lieferanten-ref"}
# Wörter, die für die Ähnlichkeit nichts aussagen.
STOPP = {"der", "die", "das", "und", "mit", "fuer", "für", "aus", "im", "in", "von", "zum",
         "zur", "premium", "set", "neu", "cm", "ml", "stk", "stück", "damen", "herren"}


def token():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


TOK = token()


def gql(q, v=None):
    b = {"query": q}
    if v:
        b["variables"] = v
    for _ in range(10):
        r = subprocess.run(["curl", "-s", "--max-time", "45",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps(b)], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(3); continue
        # Eine Drosselung ist kein Abbruchgrund — sie sagt nur, wie lange zu warten ist.
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in (d.get("errors") or [])):
            k = (d.get("extensions") or {}).get("cost") or {}
            ts = k.get("throttleStatus") or {}
            time.sleep(min(20, max(2, (k.get("requestedQueryCost", 100) - ts.get("currentlyAvailable", 0))
                                   / (ts.get("restoreRate") or 100) + 1)))
            continue
        return d
    return {"errors": [{"message": "aufgegeben"}]}


def worte(t):
    return {w for w in re.findall(r"[a-zäöüß0-9]{4,}", (t or "").lower()) if w not in STOPP}


def landeseiten():
    q = (f"FROM sessions SHOW sessions GROUP BY landing_page_path "
         f"SINCE -{TAGE}d UNTIL today ORDER BY sessions DESC LIMIT 250")
    d = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})
    t = (d.get("data") or {}).get("shopifyqlQuery") or {}
    if t.get("parseErrors"):
        print("ShopifyQL:", str(t["parseErrors"])[:180]); return None
    rows = (t.get("tableData") or {}).get("rows") or []
    aus = []
    for r in rows:
        p = r.get("landing_page_path") or ""
        if p.startswith("/products/"):
            aus.append((p.split("/")[-1].split("?")[0], int(r.get("sessions") or 0)))
    return aus


def produkt(handle):
    d = gql('query($q:String!){products(first:1,query:$q){nodes{id title status productType tags}}}',
            {"q": "handle:" + handle})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    return n[0] if n else None


def hat_weiterleitung(pfad):
    d = gql('query($q:String!){urlRedirects(first:2,query:$q){nodes{target}}}', {"q": "path:" + pfad})
    return bool(((d.get("data") or {}).get("urlRedirects") or {}).get("nodes"))


def ersatz(titel, typ):
    """Eindeutig gleichartiges aktives Produkt — oder None. Lieber nichts als das Falsche."""
    kern = sorted(worte(titel), key=len, reverse=True)[:3]
    if not kern:
        return None
    d = gql('query($q:String!){products(first:8,query:$q){nodes{handle title status productType tags '
            'variants(first:1){nodes{availableForSale}}}}}',
            {"q": "status:active AND title:" + " ".join(kern)})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    beste, bester_wert = None, 0.0
    for p in n:
        if set(p["tags"]) & RISIKO:
            continue
        v = (p["variants"]["nodes"] or [{}])[0]
        if not v.get("availableForSale"):
            continue
        a, b = worte(titel), worte(p["title"])
        if not a or not b:
            continue
        wert = len(a & b) / len(a | b)
        if typ and p.get("productType") == typ:
            wert += 0.15
        if wert > bester_wert:
            beste, bester_wert = p, wert
    # ⚠️ Schwelle bewusst SEHR hoch (Probelauf 28.08.). Bei 0.45 schlug der Lauf vor:
    #   «Smaragd-Anhänger Halskette» → «LEOPARD-Anhänger Halskette mit Smaragd» (0.50)
    #   «Herren Piqué-Poloshirt» → «KURZARM-Poloshirt» (0.48)
    # Beides sind andere Produkte; ein Wort im Ziel verschiebt die Ware. Bei 0.70 bleiben nur
    # Fälle wie «Tennis-Armband Zirkonia» → «Tennis-Armband aus Edelstahl mit Zirkonia» (0.80).
    # Alles darunter geht in den Bericht: ein halbwegs passender Ersatz ist ein Köderwechsel,
    # und der ist schlimmer als der 404, den er ersetzt.
    return (beste, bester_wert) if beste and bester_wert >= 0.70 else None


def main():
    seiten = landeseiten()
    if seiten is None:
        print("PAUSE (Sitzungsdaten nicht lesbar)"); return 1
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.strip() for z in open(LEDGER) if z.strip()}

    tot, gesetzt, offen = [], 0, []
    for handle, sitzungen in seiten:
        if handle in erledigt:
            continue
        p = produkt(handle)
        if p and p["status"] == "ACTIVE":
            continue
        pfad = "/products/" + handle
        if hat_weiterleitung(pfad):
            with open(LEDGER, "a") as f:
                f.write(handle + "\n")
            continue
        grund = ",".join(t for t in (p["tags"] if p else []) if t in RISIKO or t.startswith("google-kanal")) or "kein Grund-Tag"
        tot.append((handle, sitzungen, (p or {}).get("title", "(gelöscht)"), (p or {}).get("status", "WEG"), grund))
        z = ersatz((p or {}).get("title", ""), (p or {}).get("productType")) if p else None
        if z and FIX:
            ziel = "/products/" + z[0]["handle"]
            r = gql('mutation($in:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$in){userErrors{message}}}',
                    {"in": {"path": pfad, "target": ziel}})
            ue = ((r.get("data") or {}).get("urlRedirectCreate") or {}).get("userErrors") or []
            if ue or "errors" in r:
                print("  FEHLER", handle, str(ue or r["errors"])[:100])
            else:
                gesetzt += 1
                with open(LEDGER, "a") as f:
                    f.write(handle + "\n")
                print(f"  → {handle[:44]:46s} → {ziel[:44]} (Ähnlichkeit {z[1]:.2f})")
        elif z:
            print(f"  [DRY] {handle[:42]:44s} → /products/{z[0]['handle'][:38]} (Ähnlichkeit {z[1]:.2f})")
        else:
            offen.append((handle, sitzungen, (p or {}).get("title", "(gelöscht)")))

    print(f"Landeseiten mit Verkehr: {len(seiten)} | nicht mehr kaufbar und ohne Weiterleitung: {len(tot)}")
    print(f"  {'gesetzt' if FIX else 'setzbar'}: {gesetzt if FIX else len(tot) - len(offen)} | "
          f"ohne eindeutigen Ersatz (Mensch entscheidet): {len(offen)}")

    if offen:
        with open(BERICHT, "w") as f:
            f.write("# Rankende Seiten ohne kaufbares Ziel\n\n")
            f.write("Diese Seiten hatten in den letzten Tagen Besucher, sind aber nicht mehr kaufbar\n")
            f.write("und haben keine Weiterleitung. Ein eindeutig gleichartiges aktives Produkt gibt es\n")
            f.write("nicht — hier entscheidet ein Mensch, ob eine Kategorie das richtige Ziel ist.\n")
            f.write("⚠️ NICHT einfach veröffentlichen: jedes Draft hat einen Grund im Tag.\n")
            f.write("⚠️ Markenanfragen NIE auf eine fremde Marke umleiten — das ist ein Köderwechsel.\n\n")
            f.write("| Sitzungen | Titel | Handle |\n|---:|---|---|\n")
            for h, s, t in sorted(offen, key=lambda x: -x[1]):
                f.write(f"| {s} | {t[:60]} | `{h}` |\n")
        print(f"  Bericht: {BERICHT}")
    elif os.path.exists(BERICHT):
        # Ein Bericht ohne Befund wird nicht gelesen — er wird gelöscht (Lehre 21.08.).
        os.remove(BERICHT)

    # FERTIG hängt an den ÄNDERUNGEN, nicht an den Meldungen (Lehre 21.08.).
    if not tot or (FIX and gesetzt == 0):
        print("FERTIG")
    return 0


if __name__ == "__main__":
    sys.exit(main())
