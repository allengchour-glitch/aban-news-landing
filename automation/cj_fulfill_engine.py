"""CJ-Nachlauf-Automatik: bezahlen (sobald Guthaben da ist) und Tracking nach Shopify zurueckschreiben.

Ergaenzt cj_order_engine.py (das die Bestellung bei CJ anlegt). Zusammen decken die beiden alles
ab ausser dem Aufladen der CJ-Geldboerse — das kann nur der Kontoinhaber.

Je Bestellung aus dropship/_cj_orders_done.txt:
  IN_CART  + Guthaben reicht  -> bezahlen (mehrere ID-Varianten, CJ ist hier inkonsistent)
  SHIPPED  + Shopify offen    -> Fulfillment mit echter Tracking-Nummer anlegen

⚠️ Tracking wird NUR uebernommen, wenn CJ es selbst liefert. Bei #1011 stand eine Nummer in
Shopify, die in KEINER CJ-Bestellung existierte — der Kunde hatte einen Link, der sich nie
bewegt. Nie eine Nummer raten oder aus einer stornierten Bestellung uebernehmen.

DRY=1 meldet nur, was passieren wuerde.
"""
import json, subprocess, time, os, sys

CJTOK = open("/tmp/_cjtok").read().strip()
STOK  = open("/tmp/cj_shop_token.txt").read().strip()
SHOP  = "au3j0y-hq.myshopify.com"
DRY   = os.environ.get("DRY") == "1"
LEDGER = "dropship/_cj_orders_done.txt"
# Kunden benachrichtigen, wenn die Sendung wirklich unterwegs ist (Standard: ja)
NOTIFY = os.environ.get("NOTIFY", "1") == "1"


def cj(path, body=None):
    a = ["curl", "-s", "--max-time", "45", "-H", "CJ-Access-Token: " + CJTOK]
    if body is not None:
        a += ["-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(body)]
    a.append("https://developers.cjdropshipping.com" + path)
    # ⚠️ CJs Drosselung ist GUELTIGES JSON (22.08.2026, teuer gelernt). Die alte Schleife
    # wiederholte nur, wenn die Antwort kein JSON war — {"code":1600200,"message":"Too Many
    # Requests, QPS limit is 1 time/1second"} parst aber sauber, wurde also sofort
    # zurueckgegeben, hatte kein "data" und galt als «Detailabruf fehlgeschlagen».
    # CJ zaehlt 1 Anfrage/Sekunde ueber ALLE Prozesse gemeinsam; mit vier laufenden
    # Grind-Runnern verliert diese Engine dieses Rennen fast immer. Folge: Die
    # Sendungsnummer erreichte Shopify NIE, und keine Kundin bekam eine
    # Versandbenachrichtigung. Eine Drosselung ist kein Fehler, sie sagt nur, wie lange
    # zu warten ist (dieselbe Lehre wie bei cj_category_fill und variant_value_clean).
    for att in range(8):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            j = json.loads(out)
        except Exception:
            time.sleep(min(20, 2 ** att)); continue
        if "1600200" in str(j.get("code")) or "Too Many Requests" in str(j.get("message") or ""):
            time.sleep(1.5 + att); continue
        return j
    return {}


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "50",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + STOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def guthaben():
    return float(((cj("/api2.0/v1/shopping/pay/getBalance").get("data")) or {}).get("amount") or 0)


def cj_bestellungen():
    """orderNum -> Detaildatensatz, ueber alle Seiten."""
    out, seite = {}, 1
    while seite <= 10:
        d = cj(f"/api2.0/v1/shopping/order/list?pageNum={seite}&pageSize=100")
        lst = (d.get("data") or {}).get("list") or []
        if not lst:
            break
        for o in lst:
            n = (o.get("orderNum") or "").strip().lstrip("#").upper()
            if n:
                out[n] = o
        if len(lst) < 100:
            break
        seite += 1
        time.sleep(0.5)
    return out


def bezahlen(det):
    """CJ ist bei der Order-ID inkonsistent: payBalance lehnte sowohl cjOrderCode als auch die
    interne orderId mit 'Order not found' ab. Darum alle bekannten Varianten durchprobieren und
    das Ergebnis protokollieren, statt eine zu raten."""
    kandidaten = [det.get("orderId"), det.get("cjOrderId"), det.get("cjOrderCode")]
    fehler = []
    for k in [x for x in kandidaten if x]:
        r = cj("/api2.0/v1/shopping/pay/payBalance", {"orderId": str(k)})
        if r.get("code") == 200 and r.get("result"):
            return True, f"bezahlt über orderId={k}"
        fehler.append(f"{k}: {r.get('message')}")
        time.sleep(1)
    return False, " | ".join(fehler)


def shopify_bestellung(name):
    """Eine bestimmte Bestellung gezielt holen.
    ⚠️ Vorher wurden pauschal die 30 neuesten bezahlten Bestellungen geladen — sobald der Shop
    mehr als 30 hat, wäre eine ältere versandte Bestellung stillschweigend nie gefunden worden
    und die Meldung hätte fälschlich «Shopify bereits None» gesagt."""
    q = '''query($q:String!){orders(first:5, query:$q){nodes{
      name displayFulfillmentStatus
      fulfillmentOrders(first:5){nodes{id status}}
    }}}'''
    nodes = ((gql(q, {"q": f"name:{name.lstrip('#')}"}).get("data") or {}).get("orders") or {}).get("nodes") or []
    for o in nodes:
        if o["name"].lstrip("#") != name.lstrip("#"):
            continue
        fo = [n for n in o["fulfillmentOrders"]["nodes"]
              if n["status"] in ("OPEN", "IN_PROGRESS", "SCHEDULED")]
        return (fo[0]["id"] if fo else None), o["displayFulfillmentStatus"]
    return None, None


# CJs trackingProvider ist ein interner Code (z.B. 'Yun_Standard_Electric'). Der landet
# ungefiltert in der Versandmail an den Kunden -> auf lesbare Namen abbilden.
CARRIER = {
    "yun": "YunExpress", "cjpacket": "CJPacket", "postnl": "PostNL",
    "4px": "4PX", "sunyou": "SunYou", "china": "China Post", "ems": "EMS",
    "dhl": "DHL", "ups": "UPS", "fedex": "FedEx", "usps": "USPS",
}


def carrier_name(provider, logistic):
    for quelle in (provider, logistic):
        s = (quelle or "").lower()
        for k, v in CARRIER.items():
            if k in s:
                return v
    return "CJPacket"


def fulfillen(fo_id, track, provider, logistic):
    m = '''mutation($f:FulfillmentV2Input!){ fulfillmentCreateV2(fulfillment:$f){
       fulfillment{ status trackingInfo{number company} } userErrors{message field} }}'''
    v = {"f": {
        "lineItemsByFulfillmentOrder": [{"fulfillmentOrderId": fo_id}],
        "trackingInfo": {"number": track, "company": carrier_name(provider, logistic),
                         "url": f"https://t.17track.net/en#nums={track}"},
        "notifyCustomer": NOTIFY,
    }}
    r = gql(m, v)
    return (r.get("data") or {}).get("fulfillmentCreateV2") or {}


def schatten_warnen(cjo):
    """Meldet Doppelgänger-Bestellungen, die nicht von diesem Automaten stammen.

    GEFUNDEN AM 11.08.2026: Bei CJ liegen zu JEDER Shopify-Bestellung seit #1001 zwei Aufträge —
    einmal unter der Shopify-Nummer («#1012») und einmal unter der Nummer dieses Automaten
    («LX1012»). Die «#»-Aufträge legt die CJ-eigene Shopify-Anbindung an, nicht dieses Skript.

        #1012    CREATED    39.82 USD   ohne Tracking      ← Schatten, zahlbar
        LX1012   UNSHIPPED  39.82 USD   YT2622100705040170 ← der echte, bezahlte Auftrag

    Bezahlt werden sie hier nicht: `cj_bestellungen()` legt sie unter der Nummer OHNE «#» ab
    («1012»), gesucht wird aber «LX1012». Der Automat greift also am Schatten vorbei. Gefährlich
    wird es, wenn jemand in der CJ-Konsole den zahlbaren Schatten begleicht: dann geht dieselbe
    Ware zweimal an dieselbe Kundin, und der Shop zahlt zweimal.

    Gelöscht wird hier nichts — das sind Aufträge beim Lieferanten, und ein Skript, das
    Bestellungen still entfernt, ist gefährlicher als eine Warnung. Gemeldet wird nur, was
    tatsächlich Geld kosten könnte: ein Schatten MIT Preis.
    """
    riskant = []
    for num, o in cjo.items():
        if num.startswith("LX") or not str(o.get("orderAmount") or "").strip():
            continue
        if float(o.get("orderAmount") or 0) <= 0:
            continue
        if f"LX{num}" in cjo:
            riskant.append((num, float(o["orderAmount"])))
    if riskant:
        print("  ⚠️ SCHATTEN-BESTELLUNGEN bei CJ (von der CJ-Shopify-App, zahlbar!):", flush=True)
        for num, betrag in riskant:
            print(f"     #{num}: {betrag:.2f} USD — NICHT bezahlen, LX{num} ist der echte "
                  f"Auftrag. In der CJ-Konsole löschen.", flush=True)


def main():
    if not os.path.exists(LEDGER):
        print("kein Ledger — erst cj_order_engine.py laufen lassen"); return
    zeilen = [l.strip().split("\t") for l in open(LEDGER) if l.strip()]
    bal = guthaben()
    cjo = cj_bestellungen()
    print(f"CJ-Guthaben {bal:.2f} USD | {len(cjo)} CJ-Bestellungen | DRY={DRY}", flush=True)
    schatten_warnen(cjo)

    for t in zeilen:
        name = t[0]                      # z.B. #1012
        lx = (t[2] if len(t) > 2 else "").upper() or "LX" + name.lstrip("#")
        det = cjo.get(lx.lstrip("#"))
        if not det:
            print(f"  {name}: {lx} nicht in der CJ-Liste", flush=True); continue
        voll = (cj(f"/api2.0/v1/shopping/order/getOrderDetail?orderId={det.get('orderId')}").get("data"))
        if not voll:
            # Nicht auf den Listeneintrag ausweichen: der hat keine Tracking-Nummer, und
            # «nichts zu tun» wäre dann eine Falschmeldung für eine womöglich versandte Bestellung.
            print(f"  {name} ({lx}): ⚠️ Detailabruf bei CJ fehlgeschlagen — nächster Lauf", flush=True)
            continue
        status = voll.get("orderStatus")
        betrag = float(voll.get("orderAmount") or 0)

        if status == "IN_CART":
            if bal < betrag:
                print(f"  {name} ({lx}): unbezahlt, {betrag:.2f} USD nötig, Guthaben {bal:.2f} "
                      f"→ Geldbörse aufladen", flush=True)
                continue
            if DRY:
                print(f"  {name} ({lx}): würde {betrag:.2f} USD bezahlen", flush=True); continue
            ok, msg = bezahlen(voll)
            print(f"  {name} ({lx}): {'✅ ' if ok else '❌ '}{msg}", flush=True)
            if ok:
                bal -= betrag
            continue

        track = voll.get("trackNumber")
        if status in ("SHIPPED", "DELIVERED") and track:
            fo_id, ff_status = shopify_bestellung(name)
            if not fo_id:
                print(f"  {name} ({lx}): versendet ({track}), Shopify bereits "
                      f"{ff_status or 'nicht gefunden'}", flush=True)
                continue
            if DRY:
                print(f"  {name} ({lx}): würde Shopify mit {track} fulfillen "
                      f"(Versand: {carrier_name(voll.get('trackingProvider'), voll.get('logisticName'))})",
                      flush=True); continue
            r = fulfillen(fo_id, track, voll.get("trackingProvider"), voll.get("logisticName"))
            errs = r.get("userErrors") or []
            print(f"  {name} ({lx}): {'✅ fulfilled ' + track if not errs else '❌ ' + str(errs[:1])}", flush=True)
            continue

        print(f"  {name} ({lx}): Status {status}, Tracking {track or '—'} — nichts zu tun", flush=True)


if __name__ == "__main__":
    main()
