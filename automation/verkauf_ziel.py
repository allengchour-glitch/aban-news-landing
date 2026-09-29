#!/usr/bin/env python3
"""verkauf_ziel.py — EINE Zeile für die Keepalive-Ausgabe: steht das Ziel «jeden Tag ein Verkauf»?

Betreiber 29.09.2026: «jeden tag ein verkauf machen». Gezählt werden bezahlte Bestellungen FREMDER Kunden
(eigene Kunden-ID aus dropship/_grow_bedingung.txt raus, voll erstattete raus), je Kalendertag Europe/Zurich.

  VERKAUF-ZIEL 1/Tag: heute 0 · gestern 0 · 7 T 1/7 Tage erreicht · 30 T 2 Verkäufe · letzter vor 32 h (#1019)

Bei Fehler «VERKAUF-ZIEL: unklar (…)» — nie eine erfundene Null.
"""
import datetime as dt, json, os, time, urllib.request
from zoneinfo import ZoneInfo

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
TZ = ZoneInfo("Europe/Zurich")


def eigene_id():
    try:
        for l in open(os.path.join(REPO, "dropship/_grow_bedingung.txt"), encoding="utf-8"):
            k, _, v = l.rstrip("\n").partition("\t")
            if k == "eigene_kunden_id":
                return v.strip()
    except Exception:
        pass
    return ""


def main():
    try:
        tok = open("/tmp/cj_shop_token.txt").read().strip()
    except Exception as e:
        print(f"VERKAUF-ZIEL: unklar (kein Shop-Token: {e})"); return
    seit = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=31)).strftime("%Y-%m-%dT%H:%M:%SZ")
    q = ('{orders(first:100,query:"created_at:>=%s AND (financial_status:paid OR financial_status:partially_refunded)",'
         'sortKey:CREATED_AT,reverse:true){nodes{name createdAt test customer{id} '
         'totalPriceSet{shopMoney{amount}} totalRefundedSet{shopMoney{amount}}}}}' % seit)
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    nodes, fehler = None, ""
    for v in range(5):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=30))
            if d.get("data"):
                nodes = d["data"]["orders"]["nodes"]; break
            fehler = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:60]
        except Exception as e:
            fehler = str(e)[:60]
        time.sleep(3 + 3 * v)
    if nodes is None:
        print(f"VERKAUF-ZIEL: unklar (Shopify: {fehler})"); return
    ich = eigene_id()
    jetzt = dt.datetime.now(TZ)
    tage = {}
    letzter = None
    for n in nodes:
        if n.get("test") or ((n.get("customer") or {}).get("id") == ich and ich):
            continue
        brutto = float(n["totalPriceSet"]["shopMoney"]["amount"] or 0)
        erstattet = float(((n.get("totalRefundedSet") or {}).get("shopMoney") or {}).get("amount") or 0)
        if brutto > 0 and erstattet >= brutto - 0.01:
            continue
        t = dt.datetime.fromisoformat(n["createdAt"].replace("Z", "+00:00")).astimezone(TZ)
        tage.setdefault(t.date(), []).append(n["name"])
        if not letzter or t > letzter[0]:
            letzter = (t, n["name"])
    heute = jetzt.date()
    h = len(tage.get(heute, []))
    g = len(tage.get(heute - dt.timedelta(days=1), []))
    tage7 = sum(1 for i in range(7) if tage.get(heute - dt.timedelta(days=i)))
    n30 = sum(len(v) for d_, v in tage.items() if (heute - d_).days < 30)
    lz = f"letzter vor {int((jetzt - letzter[0]).total_seconds() // 3600)} h ({letzter[1]})" if letzter else "kein Verkauf in 30 T"
    print(f"VERKAUF-ZIEL 1/Tag: heute {h} · gestern {g} · 7 T {tage7}/7 Tage erreicht · 30 T {n30} Verkäufe · {lz}")


if __name__ == "__main__":
    main()
