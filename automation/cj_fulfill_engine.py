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
    for att in range(4):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            return json.loads(out)
        except Exception:
            time.sleep(4)
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


def shopify_offen():
    """Shopify-Bestellnummer -> (fulfillmentOrderId, schon erledigt?)"""
    q = '''{orders(first:30, query:"financial_status:paid", sortKey:CREATED_AT, reverse:true){nodes{
      name displayFulfillmentStatus
      fulfillmentOrders(first:5){nodes{id status}}
    }}}'''
    res = {}
    for o in ((gql(q).get("data") or {}).get("orders") or {}).get("nodes") or []:
        fo = [n for n in o["fulfillmentOrders"]["nodes"] if n["status"] in ("OPEN", "IN_PROGRESS", "SCHEDULED")]
        res[o["name"]] = (fo[0]["id"] if fo else None, o["displayFulfillmentStatus"])
    return res


def fulfillen(fo_id, track, carrier):
    m = '''mutation($f:FulfillmentV2Input!){ fulfillmentCreateV2(fulfillment:$f){
       fulfillment{ status trackingInfo{number company} } userErrors{message field} }}'''
    v = {"f": {
        "lineItemsByFulfillmentOrder": [{"fulfillmentOrderId": fo_id}],
        "trackingInfo": {"number": track, "company": carrier or "CJPacket",
                         "url": f"https://t.17track.net/en#nums={track}"},
        "notifyCustomer": NOTIFY,
    }}
    r = gql(m, v)
    return (r.get("data") or {}).get("fulfillmentCreateV2") or {}


def main():
    if not os.path.exists(LEDGER):
        print("kein Ledger — erst cj_order_engine.py laufen lassen"); return
    zeilen = [l.strip().split("\t") for l in open(LEDGER) if l.strip()]
    bal = guthaben()
    cjo = cj_bestellungen()
    shop = shopify_offen()
    print(f"CJ-Guthaben {bal:.2f} USD | {len(cjo)} CJ-Bestellungen | DRY={DRY}", flush=True)

    for t in zeilen:
        name = t[0]                      # z.B. #1012
        lx = (t[2] if len(t) > 2 else "").upper() or "LX" + name.lstrip("#")
        det = cjo.get(lx.lstrip("#"))
        if not det:
            print(f"  {name}: {lx} nicht in der CJ-Liste", flush=True); continue
        voll = (cj(f"/api2.0/v1/shopping/order/getOrderDetail?orderId={det.get('orderId')}").get("data")) or det
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
            fo_id, ff_status = shop.get(name, (None, None))
            if not fo_id:
                print(f"  {name} ({lx}): versendet ({track}), Shopify bereits {ff_status}", flush=True)
                continue
            if DRY:
                print(f"  {name} ({lx}): würde Shopify mit {track} fulfillen", flush=True); continue
            r = fulfillen(fo_id, track, voll.get("trackingProvider"))
            errs = r.get("userErrors") or []
            print(f"  {name} ({lx}): {'✅ fulfilled ' + track if not errs else '❌ ' + str(errs[:1])}", flush=True)
            continue

        print(f"  {name} ({lx}): Status {status}, Tracking {track or '—'} — nichts zu tun", flush=True)


if __name__ == "__main__":
    main()
