#!/usr/bin/env python3
"""Prüft die Pinterest-Warteschlange, BEVOR sie an die Öffentlichkeit geht.

Anlass (16.09.2026): 202 fertige Pins lagen seit Wochen bereit, 0 gepostet — es
fehlte nur der Token. Beim Nachmessen VOR dem Posten:
  · 202 von 202 versprachen «weltweiter Versand» — wir liefern NUR in die Schweiz.
  · 85 von 202 (42 %) verlinkten auf Ware, die es nicht mehr gibt oder die
    inzwischen Entwurf ist (Klingen, BigBuy-Abschied, Kostüme).
Wäre der Token gekommen und der Poster gelaufen, wären 202 falsche
Versandzusagen und 85 tote Links rausgegangen.

**Eine fertige Warteschlange ist keine geprüfte Warteschlange.** Zwischen dem
Befüllen und dem Senden verändert sich der Katalog — und zwar genau durch die
Aufräumarbeiten, die wir selbst machen.

Prüft vier Versprechen gegen die Wahrheit im Shop:
  1. Versandzusage  — darf nichts ausserhalb der Schweiz behaupten
  2. Link           — Produkt muss existieren UND ACTIVE sein
  3. Preis          — Text muss dem Live-Preis entsprechen
  4. Rabattcode     — muss im Shop existieren und ACTIVE sein

Aufruf:  python3 automation/pinterest_pins_pruefen.py           # nur melden
         WRITE=1 python3 automation/pinterest_pins_pruefen.py   # CSV reparieren
"""
import csv, io, json, os, re, sys, time, urllib.request, urllib.error

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PFAD = os.path.join(REPO, "dropship", "pinterest_pins.csv")
SHOP = "au3j0y-hq.myshopify.com"
WRITE = os.environ.get("WRITE") == "1"

# Wir liefern nur in die Schweiz. Alles andere ist eine falsche Zusage.
# ⚠️ CHIRURGISCH ersetzen, nicht den Satz drumherum. Ein erster Versuch mit
#    r"[^.·|]*\bweltweit\w*[^.·|]*" frass die halbe Produktbeschreibung mit
#    («Herren-Slides «Porto» · Cross-Strap, Wildleder-Optik 👔 Schweizer
#    Online-Shop, weltweiter Versand.» → «Herren-Slides «Porto» · Schweizer
#    Online-Shop…»). Gefangen hat das nur der Trockenlauf mit Vorher/Nachher.
WELTWEIT = re.compile(r"\bweltweite[rnms]?\s+Versand\b|\bversand\s+weltweit\b|"
                      r"\bworldwide\s+shipping\b|\beuropaweite[rnms]?\s+Versand\b|"
                      r"\binternationale[rnms]?\s+Versand\b", re.I)
ERSATZ = "Lieferung in die ganze Schweiz"
# Alles andere, was nach Ausland klingt, wird nur GEMELDET — nie blind ersetzt.
VERDACHT_REST = re.compile(r"\b(weltweit\w*|worldwide|international\w*|europaweit|"
                           r"EU-weit)\b", re.I)


def gql(q, v=None, tok=None):
    d = json.dumps({"query": q, "variables": v or {}}).encode()
    r = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json", data=d,
                               headers={"X-Shopify-Access-Token": tok,
                                        "Content-Type": "application/json"})
    for _ in range(6):
        try:
            j = json.loads(urllib.request.urlopen(r, timeout=60).read())
            if any("THROTTL" in str(e.get("extensions", {})) for e in j.get("errors") or []):
                time.sleep(3); continue
            return j
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(3); continue
            raise
    raise RuntimeError("dauerhaft gedrosselt")


def handle(link):
    return link.rstrip("/").split("/products/")[-1] if "/products/" in link else None


def main():
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    rows = list(csv.DictReader(io.open(CSV_PFAD, encoding="utf-8")))
    felder = list(rows[0].keys())

    # --- Wahrheit im Shop holen (Status + Preis je Handle) --------------------
    handles = [h for h in (handle(r["Link"]) for r in rows) if h]
    live = {}
    for i in range(0, len(handles), 25):
        blk = handles[i:i + 25]
        q = " OR ".join("handle:%s" % h for h in blk)
        for n in gql('{ products(first:250, query:"%s"){nodes{handle status '
                     'variants(first:1){nodes{price}}}} }' % q, tok=tok
                     )["data"]["products"]["nodes"]:
            p = (n["variants"]["nodes"] or [{}])[0].get("price")
            live[n["handle"]] = (n["status"], p)
        time.sleep(0.4)

    # --- Rabattcodes ---------------------------------------------------------
    codes = set()
    for r in rows:
        codes.update(re.findall(r"Code ([A-Z0-9]{4,})", r["Description"]))
    aktiv_codes = {}
    for n in gql('''{ codeDiscountNodes(first:50){nodes{ codeDiscount{
            ... on DiscountCodeBasic{ title status }
            ... on DiscountCodeBxgy{ title status } } }} }''', tok=tok
                 )["data"]["codeDiscountNodes"]["nodes"]:
        c = n["codeDiscount"] or {}
        if c.get("title"):
            aktiv_codes[c["title"].upper()] = c.get("status")
    tote_codes = {c for c in codes if aktiv_codes.get(c.upper()) != "ACTIVE"}

    behalten, raus, versand_fix, preis_fix = [], [], 0, 0
    rest_verdacht = []
    for r in rows:
        h = handle(r["Link"])
        st, preis = live.get(h, (None, None))
        if st != "ACTIVE":
            raus.append((h, st or "existiert nicht"))
            continue
        if tote_codes and any(c in r["Description"] for c in tote_codes):
            raus.append((h, "toter Rabattcode"))
            continue
        neu = WELTWEIT.sub(ERSATZ, r["Description"])
        if neu != r["Description"]:
            versand_fix += 1
            r["Description"] = re.sub(r"\s{2,}", " ", neu).strip()
        if VERDACHT_REST.search(r["Description"]):
            rest_verdacht.append((h, VERDACHT_REST.search(r["Description"]).group(0)))
        m = re.search(r"CHF ([\d.]+)", r["Description"])
        if m and preis and abs(float(m.group(1)) - float(preis)) >= 0.01:
            r["Description"] = r["Description"].replace("CHF " + m.group(1), "CHF " + preis)
            preis_fix += 1
        behalten.append(r)

    print(f"Pins in der Warteschlange: {len(rows)}")
    print(f"  entfernt (Ware weg / Entwurf / toter Code): {len(raus)}")
    for h, w in raus[:8]:
        print(f"      · {w:18s} {str(h)[:52]}")
    if len(raus) > 8:
        print(f"      … und {len(raus)-8} weitere")
    print(f"  Versandzusage korrigiert: {versand_fix}")
    print(f"  Preis korrigiert:         {preis_fix}")
    print(f"  BLEIBEN GÜLTIG:           {len(behalten)}")
    if tote_codes:
        print(f"  ⚠ tote Rabattcodes im Text: {sorted(tote_codes)}")
    if rest_verdacht:
        print(f"  ⚠ NICHT ersetzt, bitte ansehen ({len(rest_verdacht)}): "
              f"{rest_verdacht[:5]}")

    if not WRITE:
        print("\n(Nur gemeldet — mit WRITE=1 wird die CSV repariert)")
        return 1 if (raus or versand_fix or preis_fix) else 0

    with io.open(CSV_PFAD, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=felder, quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(behalten)
    print(f"\nCSV geschrieben: {len(behalten)} gültige Pins")
    return 0


if __name__ == "__main__":
    sys.exit(main())
