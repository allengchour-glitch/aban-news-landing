#!/usr/bin/env python3
"""kosten_boden15_korrigieren.py — repariert unitCost-Werte, die mit dem widerlegten
Frachtboden von CHF 15 geschrieben wurden.

DER BEFUND (28.08.2026)
`cj_kosten_backfill.mjs` trug eine EIGENE Kostenrechnung mit `Math.max(15, 3.4+16.3*kg)`.
Der Boden 15 ist seit dem 23.08. widerlegt (CJ live: 20 g → CHF 4.34, 270 g → CHF 8.17);
korrigiert wurde damals nur `cj_preis.mjs`, diese Datei nie. Der Boden greift unterhalb
von (15−3.4)/16.3 = 712 g — also genau dort, wo der halbe Modekatalog liegt.

WIE GROSS DER SCHADEN WAR: Von 3'325 aktiven Produkten, die dadurch als «unter Einstand»
galten, sind 2'746 in Wahrheit kostendeckend. Median-Aufblaehung CHF 7.85, maximal CHF 10.
Das ist keine Schoenheitsfrage: Diese Zahl ist die Grundlage jeder Margenentscheidung, und
eine Liste «3'325 Produkte werden mit Verlust verkauft» haette zu Preiserhoehungen auf Ware
gefuehrt, die Gewinn bringt.

WARUM DIE KORREKTUR OHNE CJ-PUNKTE AUSKOMMT
Die alte Formel ist umkehrbar. In Shopify stehen Kosten UND Gewicht:
    Warenkosten = alteKosten − max(15, 3.4+16.3·kg)      (die alte Fracht herausrechnen)
    neueKosten  = Warenkosten + max(5, 3.4+16.3·kg)      (die richtige Fracht einsetzen)
Kein einziger CJ-Aufruf noetig — die Zahl war die ganze Zeit da, nur falsch zusammengesetzt.

⚠️ DREI WACHEN, DAMIT NUR NACHWEISLICH BETROFFENE WARE ANGEFASST WIRD
1. NUR Produkte aus `dropship/_cj_kosten_done.txt`. Nur fuer die ist BELEGT, dass dieser
   Lauf ihre Kosten geschrieben hat. Eine Kostenzahl aus dem Importer (cj_preis, Boden 5)
   ist bereits richtig — wer sie «korrigiert», macht sie kaputt. Der Ledger ist der einzige
   harte Beleg; die Signatur «Gewicht variiert, Kosten konstant» ist nur ein Indiz und
   bei Ein-Varianten-Produkten gar nicht pruefbar.
   ⚠️ NACHTRAG 13.09.2026 — die Quittung kann FEHLEN, obwohl der Backfill geschrieben hat:
   Zwischen dem 25. und 30.08. hat der Container mehrfach einen alten Disk-Snapshot
   hergestellt; der Shopify-Schreibvorgang stand, die Ledger-Zeile war weg. Gemessen am
   Bulk-Export (13.09.): 177 Produkte tragen die BELEGTE Signatur — mehrere Varianten mit
   VERSCHIEDENEN Gewichten unter dem Knick und IDENTISCHEN Kosten (Midikleid 15448587075969:
   40 Varianten, 320–360 g, alle 20.37, Kosten geschrieben 27.08.). Der Importer rechnet je
   Variante mit ihrem eigenen Gewicht (cj_preis, linear ab 70 g) — er KANN diese Signatur
   nicht erzeugen. Bei mehreren Varianten ist sie also ein Beweis, kein Indiz.
   Zweites Tor (`SIGNATUR=1`): Produkt nicht im Ledger, ≥2 Varianten mit Kosten, ≥2
   verschiedene Gewichte, ALLE unter dem Knick, ALLE Kosten identisch, Kosten ≥ 15, und —
   wenn der Export `createdAt` traegt — vor dem 20.08. angelegt (davor schrieb der Importer
   gar keine Kosten). Unmittelbar vor dem Schreiben wird die Signatur LIVE am Produkt
   nachgemessen; haelt sie nicht mehr, wird nichts geschrieben und nichts quittiert.
   Ein-Varianten-Produkte ohne Quittung bleiben unangetastet (172 gemessen, kein Beweis).
2. NUR Varianten mit Gewicht > 0. Ohne Gewicht ist die alte Fracht nicht herausrechenbar —
   geraten wird nichts (dieselbe Regel wie beim Gewichts-Backfill).
3. Warenkosten muessen >= 0 herauskommen. Wird die Differenz negativ, stammt die Zahl NICHT
   aus dieser Formel → Finger weg.
Und: die neue Zahl darf nie GROESSER werden als die alte. Der Boden kann nur nach unten
korrigieren; eine Erhoehung waere ein Rechenfehler und wird uebersprungen.

Preise werden NICHT angefasst — das ist eine Geschaeftsentscheidung des Betreibers.
Geschrieben wird ausschliesslich `inventoryItem.cost`.

    DRY=1 python3 automation/kosten_boden15_korrigieren.py     # nur zeigen
    LIMIT=40 python3 automation/kosten_boden15_korrigieren.py  # schreiben
"""
import json, os, subprocess, sys, time, statistics

SHOP = "au3j0y-hq.myshopify.com"
LEDGER_QUELLE = "dropship/_cj_kosten_done.txt"
LEDGER = "dropship/_kosten_boden15_fix.txt"
EXPORT = os.environ.get("EXPORT", "/tmp/kost28.jsonl")
DRY = os.environ.get("DRY") == "1"
LIMIT = int(os.environ.get("LIMIT", "40"))
KNICK = (15 - 3.4) / 16.3 * 1000     # 711.7 g
SIGNATUR = os.environ.get("SIGNATUR") == "1"   # zweites Tor, siehe Docstring (13.09.)
IMPORTER_SEIT = "2026-08-20"                   # ab hier schreibt der Importer Kosten selbst


def tok():
    return open("/tmp/cj_shop_token.txt").read().strip()


def gql(query, variables=None):
    """Drosselung ist eine Warteanweisung, kein Abbruchgrund (Lehre 21.08.)."""
    body = json.dumps({"query": query, "variables": variables or {}})
    fehler = 0
    while fehler < 8:
        r = subprocess.run(
            ["curl", "-s", f"https://{SHOP}/admin/api/2024-10/graphql.json",
             "-H", f"X-Shopify-Access-Token: {tok()}",
             "-H", "Content-Type: application/json", "-d", body],
            capture_output=True, text=True, timeout=120)
        try:
            j = json.loads(r.stdout)
        except Exception:
            fehler += 1; time.sleep(3); continue
        errs = j.get("errors") or []
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in errs):
            st = ((j.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
            warten = max(2.0, (st.get("maximumAvailable", 2000) * 0.5
                               - st.get("currentlyAvailable", 0)) / max(1.0, st.get("restoreRate", 100)))
            time.sleep(min(warten, 20)); continue      # zaehlt NICHT als Versuch
        if errs and not j.get("data"):
            fehler += 1; time.sleep(2); continue
        return j
    return None


def gramm(m):
    w = (m or {}).get("weight") or {}
    v, u = w.get("value"), (w.get("unit") or "").upper()
    if not v:
        return 0.0
    return v * 1000 if u == "KILOGRAMS" else v if u == "GRAMS" else v * 453.592 if u == "POUNDS" else v * 28.3495


def lin(g):
    return 3.4 + 16.3 * g / 1000


def main():
    if not os.path.exists(EXPORT):
        print(f"Export {EXPORT} fehlt — erst einen Bulk-Export mit unitCost+weight ziehen.")
        return 1
    erlaubt = {l.strip().split("\t")[0] for l in open(LEDGER_QUELLE) if l.strip()}
    fertig = {l.strip().split("\t")[0] for l in open(LEDGER)} if os.path.exists(LEDGER) else set()
    print(f"Ledger des Backfills: {len(erlaubt)} Produkte · schon korrigiert: {len(fertig)}")

    titel, varianten = {}, {}
    for line in open(EXPORT):
        o = json.loads(line)                      # nie Roh-Zeilenfilter: Shopify escaped / als \/
        if "__parentId" not in o:
            titel[o["id"]] = (o.get("title") or "", o.get("createdAt") or "")
        else:
            ii = o.get("inventoryItem") or {}
            uc = ii.get("unitCost") or {}
            varianten.setdefault(o["__parentId"], []).append({
                "id": o["id"], "price": float(o["price"]),
                "cost": float(uc["amount"]) if uc.get("amount") not in (None, "") else None,
                "g": gramm(ii.get("measurement"))})

    def signatur(vs, created):
        """Beweis statt Indiz (13.09.): verschiedene Gewichte unter dem Knick, identische Kosten."""
        mit = [v for v in vs if v["cost"] and v["cost"] > 0]
        if len(mit) < 2:
            return False
        if created and created >= IMPORTER_SEIT:
            return False
        ws = {round(v["g"]) for v in mit}
        if len(ws) < 2 or any(v["g"] <= 0 or v["g"] >= KNICK for v in mit):
            return False
        cs = {round(v["cost"], 2) for v in mit}
        return len(cs) == 1 and next(iter(cs)) >= 15.0

    kandidaten, per_signatur = [], set()
    for pid, vs in varianten.items():
        if pid in fertig:
            continue
        if pid not in erlaubt:
            if not (SIGNATUR and signatur(vs, titel.get(pid, ("", ""))[1])):
                continue
            per_signatur.add(pid)
        neu = []
        for v in vs:
            if not v["cost"] or v["cost"] <= 0 or v["g"] <= 0 or v["g"] >= KNICK:
                continue                                  # ueber dem Knick sind beide Formeln gleich
            ware = v["cost"] - max(15.0, lin(v["g"]))
            if ware < -0.005:
                continue                                  # stammt nicht aus dieser Formel
            nk = round(max(0.0, ware) + max(5.0, lin(v["g"])), 2)
            if nk >= v["cost"] - 0.005:
                continue                                  # keine Senkung => nichts zu tun
            neu.append((v, nk))
        if neu:
            kandidaten.append((pid, neu))
    # VORRANG: zuerst die Produkte, die NUR wegen der aufgeblaehten Zahl wie Verlustware
    # aussehen — dort richtet die falsche Zahl echten Schaden an, weil sie zu einer
    # Preiserhoehung auf Ware fuehren wuerde, die Gewinn bringt. Danach nach Aufblaehung.
    def rang(k):
        pid, neu = k
        alle = varianten[pid]
        hp = max(v["price"] for v in alle)
        neu_k = {v["id"]: nk for v, nk in neu}
        alt_k = [v["cost"] for v in alle if v["cost"]]
        jetzt = [neu_k.get(v["id"], v["cost"]) for v in alle if v["cost"]]
        galt_als_verlust = bool(alt_k) and statistics.median(alt_k) > hp
        ist_dann_ok = bool(jetzt) and statistics.median(jetzt) <= hp
        return (0 if (galt_als_verlust and ist_dann_ok) else 1,
                -statistics.median([v["cost"] - nk for v, nk in neu]))
    kandidaten.sort(key=rang)
    print(f"Zu korrigieren: {len(kandidaten)} Produkte, davon {len(per_signatur)} per Signatur (zeige/schreibe max {LIMIT})\n")

    getan = 0
    for pid, neu in kandidaten[:LIMIT]:
        diff = statistics.median([v["cost"] - nk for v, nk in neu])
        vorher = statistics.median([v["cost"] for v, _ in neu])
        nachher = statistics.median([nk for _, nk in neu])
        hp = max(v["price"] for v in varianten[pid])
        urteil = "war NIE unter Einstand" if nachher <= hp else "bleibt unter Einstand"
        print(f"  {pid.split('/')[-1]}  {(titel.get(pid, ('', ''))[0] or '')[:44]:<44} "
              f"{len(neu):>3} Var  {vorher:6.2f} -> {nachher:6.2f}  (-{diff:5.2f})  VK {hp:6.2f}  {urteil}")
        if DRY:
            continue
        if pid in per_signatur:
            # Die Signatur wird am OBJEKT nachgemessen, nicht am Export: nur wenn Kosten und
            # Gewichte LIVE noch dasselbe Bild zeigen, darf geschrieben werden.
            j = gql("query($id:ID!){product(id:$id){variants(first:100){nodes{id "
                    "inventoryItem{unitCost{amount} measurement{weight{value unit}}}}}}}", {"id": pid})
            live = ((((j or {}).get("data") or {}).get("product") or {}).get("variants") or {}).get("nodes") or []
            lv = [{"cost": float(((n["inventoryItem"] or {}).get("unitCost") or {}).get("amount") or 0),
                   "g": gramm((n["inventoryItem"] or {}).get("measurement"))} for n in live]
            live_k = {n["id"]: float(((n["inventoryItem"] or {}).get("unitCost") or {}).get("amount") or 0) for n in live}
            if not lv or not signatur(lv, "") or any(abs(live_k.get(v["id"], -1) - v["cost"]) > 0.005 for v, _ in neu):
                print("     Signatur LIVE nicht mehr belegt — uebersprungen, nicht quittiert"); continue
        for i in range(0, len(neu), 25):
            teil = [{"id": v["id"], "inventoryItem": {"cost": f"{nk:.2f}"}} for v, nk in neu[i:i + 25]]
            j = gql("mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){"
                    "productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{field message}}}",
                    {"p": pid, "v": teil})
            ue = (((j or {}).get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors") or []
            if ue:
                print("     FEHLER:", ue[:2]); break
            # ⚠️ 05.09.2026: Ohne diese Zeile lief die Schleife bei einer Antwort OHNE `data`
            # (tote Anmeldung) sauber durch, und der else-Zweig quittierte die Korrektur —
            # `userErrors` ist dann leer und damit falsy. Eine falsche Quittung ist hier
            # besonders teuer: das Produkt gilt als kostenkorrigiert und wird nie wieder angesehen.
            if (j or {}).get("errors") or ((j or {}).get("data") or {}).get("productVariantsBulkUpdate") is None:
                print("     FEHLER: keine Bestaetigung — NICHT quittiert"); break
            time.sleep(0.6)
        else:
            quelle = "\tsignatur" if pid in per_signatur else ""
            with open(LEDGER, "a") as f:
                f.write(f"{pid}\t{vorher:.2f}->{nachher:.2f}{quelle}\n")
            getan += 1
    print(f"\n{'DRY — nichts geschrieben' if DRY else f'korrigiert: {getan} Produkte'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
