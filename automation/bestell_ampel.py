#!/usr/bin/env python3
"""Bestell-Ampel: EINE Zeile für die Keepalive-Ausgabe.

Betreiber 03.09.2026: «die bestellungen von kunden müssen sofort erledigt werden und alles
reibungslos». Bis dahin stand ein Fehlschlag des Bestell-Automaten nur in dessen Log — bei #1016
hat es niemand gesehen, bis von Hand nachgeschaut wurde. Diese Zeile steht ab jetzt in JEDER
stündlichen Keepalive-Meldung: bezahlte, unerfüllte Bestellungen mit Alter und dem Stand des
CJ-Auftrags (LX<nr>) aus dropship/_cj_order_watch_state.json.

Meldet nur. Liest Shopify (1 Abfrage) und die lokale Watch-Datei. Bei Fehler: eine Zeile
«BESTELLUNGEN: unklar (…)» — ein Ausfall darf nie wie «alles erledigt» aussehen.
"""
import json, os, sys, time, urllib.request, datetime as dt

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"

def main():
    try:
        tok = open("/tmp/cj_shop_token.txt").read().strip()
    except Exception as e:
        print(f"BESTELLUNGEN: unklar (kein Shop-Token: {e})"); return
    q = ('{orders(first:20,query:"financial_status:paid AND fulfillment_status:unfulfilled AND status:open",'
         'sortKey:CREATED_AT,reverse:true){nodes{name createdAt '
         'totalPriceSet{shopMoney{amount}} '
         'refunds(first:3){id totalRefundedSet{shopMoney{amount}} transactions(first:5){nodes{kind status amountSet{shopMoney{amount}}}}} '
         'lineItems(first:3){nodes{title sku}}}}}')
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
        data=json.dumps({"query": q}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    # ⚠️ Shopifys Drosselung ist KEIN Ausfall. Am 03.09. meldete die Ampel «unklar
    # (Shopify: 'data')», weil vier CJ-Runner und vier Hintergrundlaeufe den Punkte-Eimer
    # leer hielten — einzeln aufgerufen antwortete dieselbe Abfrage sofort. Eine Warnzeile,
    # die bei jedem knappen Eimer «unklar» sagt, wird nach dem dritten Mal nicht mehr
    # gelesen; genau dann steht der echte Ausfall darin. Also warten statt aufgeben.
    nodes, fehler = None, ""
    for versuch in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            fehler = str(e)[:80]; time.sleep(2 + 2 * versuch); continue
        if d.get("data"):
            nodes = d["data"]["orders"]["nodes"]; break
        errs = d.get("errors") or []
        fehler = (errs[0].get("message") if errs else "keine Daten")
        ts = (d.get("extensions") or {}).get("cost", {}).get("throttleStatus") or {}
        if ts:
            fehlt = 20 - ts.get("currentlyAvailable", 0)
            time.sleep(max(2, fehlt / max(ts.get("restoreRate", 50), 1) + 1))
        else:
            time.sleep(2 + 2 * versuch)
    if nodes is None:
        print(f"BESTELLUNGEN: unklar (Shopify: {fehler})"); return
    try:
        watch = json.load(open(os.path.join(REPO, "dropship/_cj_order_watch_state.json")))
    except Exception:
        watch = {}
    if not nodes:
        print("BESTELLUNGEN: 0 offen"); return
    now = dt.datetime.now(dt.timezone.utc)
    teile = []
    for o in nodes:
        nr = o["name"].lstrip("#")
        alter = now - dt.datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00"))
        h = alter.total_seconds() / 3600
        alt = f"{h:.0f}h" if h < 48 else f"{h/24:.0f}d"
        # Eine erstattete Bestellung ist erledigt, auch wenn Shopify sie bis zum Settlement
        # noch als "paid" fuehrt — sonst steht das ⚠️ weiter, nachdem der Fall geloest ist.
        # ⚠️ 30.09.2026 (#1019): «irgendeine Rückerstattung» ≠ erstattet — CHF 16.11 von 23.11 (Versand fehlte) stand als
        # «erstattet». Gezählt werden die Rückerstattungs-Buchungen (auch PENDING: Shopify Payments bucht nach), nicht die Existenz.
        summe = float(o["totalPriceSet"]["shopMoney"]["amount"])
        zurueck = sum(float(t["amountSet"]["shopMoney"]["amount"]) for r in (o.get("refunds") or [])
                      for t in ((r.get("transactions") or {}).get("nodes") or [])
                      if t.get("kind") == "REFUND" and t.get("status") in ("SUCCESS", "PENDING"))
        erstattet = bool(o.get("refunds")) and zurueck >= summe - 0.005
        teil = bool(o.get("refunds")) and not erstattet
        lx = [k for k in watch if k.startswith((f"LX{nr}", f"#{nr}"))]  # «#1020» = von Hand in der CJ-Konsole (30.09.)
        if erstattet:
            st, warn = "erstattet", ""
        elif teil:
            st, warn = f"TEILERSTATTET CHF {zurueck:.2f}/{summe:.2f}", " ⚠️"
        else:
            st = ", ".join(f"{k}:{watch[k].get('status','?')}" for k in lx) if lx else "KEIN CJ-Auftrag"
            warn = " ⚠️" if (not lx and h > 2) or any(watch[k].get("status") in ("TRASH", "CANCELLED") for k in lx) else ""
        teile.append(f"#{nr} {alt} CHF {float(o['totalPriceSet']['shopMoney']['amount']):.2f} → {st}{warn}")
    print(f"BESTELLUNGEN: {len(nodes)} offen · " + " | ".join(teile))

if __name__ == "__main__":
    main()
