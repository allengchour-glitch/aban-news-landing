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

CJ_STATUS = {"CREATED": "angelegt, UNBEZAHLT", "IN_CART": "im CJ-Warenkorb, UNBEZAHLT", "UNPAID": "UNBEZAHLT",
             "UNSHIPPED": "bezahlt, wartet auf Versand", "SHIPPED": "versandt", "DELIVERED": "zugestellt",
             "TRASH": "verworfen", "CANCELLED": "storniert"}
ZAHLLISTE = "https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5"   # wartende Zahlungen (ZAHLUNG-LINKS-MERKEN.md)
LEDGER = os.path.join(REPO, "dropship/_cj_orders_done.txt")


def ledger_eintrag(nr, pfad=LEDGER):
    """Bestell-Ledger des Automaten (cj_order_engine): «#1025\tSD…\tLX1025\t$73.29» → {'sd','lx','betrag'}; sonst None.
    «(bereits-bei-cj)» ohne SD-Nummer zählt nicht als frischer Auftrag (Zustand kommt dann aus dem Abgleich)."""
    try:
        for z in open(pfad, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if t and t[0].strip() == f"#{nr}" and len(t) >= 3 and t[1].startswith("SD"):
                return {"sd": t[1], "lx": t[2], "betrag": t[3].strip() if len(t) > 3 else ""}
    except OSError:
        pass
    return None


def selbsttest():
    import tempfile
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt") as f:
        f.write("#1023\t(bereits-bei-cj)\tLX1023\n#1025\tSD2610121602510642100\tLX1025\t$73.29\n")
    faelle = [(ledger_eintrag("1025", f.name), {"sd": "SD2610121602510642100", "lx": "LX1025", "betrag": "$73.29"}),
              (ledger_eintrag("1023", f.name), None),      # schon bei CJ, kein frischer Auftrag
              (ledger_eintrag("1026", f.name), None),      # nicht im Ledger
              (ledger_eintrag("102", f.name), None)]       # kein Präfix-Treffer (#102 ≠ #1025)
    os.unlink(f.name)
    ok = all(a == b for a, b in faelle)
    for i, (a, b) in enumerate(faelle):
        print(f"  {'OK  ' if a == b else 'FEHL'} Fall {i + 1}: {a}")
    print("SELBSTTEST", "OK" if ok else "FEHLER")
    return 0 if ok else 1


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
        from erstattung import zurueck as _zurueck
        zurueck = _zurueck(o)
        erstattet = bool(o.get("refunds")) and zurueck >= summe - 0.005
        teil = bool(o.get("refunds")) and not erstattet
        lx = [k for k in watch if k.startswith((f"LX{nr}", f"#{nr}"))]  # «#1020» = von Hand in der CJ-Konsole (30.09.)
        if erstattet:
            st, warn = "erstattet", ""
        elif teil:
            st, warn = f"TEILERSTATTET CHF {zurueck:.2f}/{summe:.2f}", " ⚠️"
        else:
            # 02.10.2026: «LX1021:UNSHIPPED» wurde als «unbezahlt» gelesen (auch von mir) — bei CJ heisst UNSHIPPED
            # «bezahlt, noch nicht versandt». Status deutsch ausschreiben, Tracking dazu.
            # 05.10.2026: reine Fortura-Bestellung (Schweizer Lager) hat nie einen CJ-Auftrag — Stand aus dem Fortura-Ledger.
            skus = [(li.get("sku") or "") for li in o["lineItems"]["nodes"]]
            if skus and all(x.startswith("fortura-") for x in skus):
                fst = "unbekannt"
                try:
                    for z in open(os.path.join(REPO, "dropship/_fortura_bestellungen.tsv"), encoding="utf-8"):
                        t = z.rstrip("\n").split("\t")
                        if t[0] == nr: fst = t[3]
                except Exception:
                    pass
                st = f"Fortura: {fst}"
                warn = "" if fst == "bestellt" else " ⚠️"
                teile.append(f"#{nr} {alt} CHF {float(o['totalPriceSet']['shopMoney']['amount']):.2f} → {st}{warn}")
                continue
            st = ", ".join(f"{k}: {CJ_STATUS.get(watch[k].get('status'), watch[k].get('status', '?'))}"
                           + (f" ({watch[k]['tracking']})" if watch[k].get("tracking") else "") for k in lx) \
                if lx else "KEIN CJ-Auftrag"
            if any(watch[k].get("status") in ("CREATED", "IN_CART", "UNPAID") for k in lx):
                st += f" → 💳 zahlen: {ZAHLLISTE}"          # 12.10.: die Zeile führt direkt zum Bezahlen (Dauerauftrag 11.10.)
            warn = " ⚠️" if (not lx and h > 2) or any(watch[k].get("status") in ("TRASH", "CANCELLED") for k in lx) else ""
            # 12.10.2026 (#1025): Der Bestell-Automat legt den CJ-Auftrag sofort an und schreibt ihn ins Ledger; der
            # Abgleich (cj_order_watch, Zustand oben) lief nur alle 2 h. Die Ampel zeigte «KEIN CJ-Auftrag», obwohl
            # LX1025 seit Minuten auf ZAHLUNG wartete — genau die Zeile, die der Betreiber zum Bezahlen braucht.
            if not lx:
                le = ledger_eintrag(nr)
                if le:
                    st = (f"{le['lx']} angelegt ({le['sd']}{', ' + le['betrag'] if le['betrag'] else ''}), CJ-Abgleich folgt — "
                          f"falls unbezahlt: 💳 {ZAHLLISTE}")
                    warn = " ⚠️" if h > 6 else ""
        teile.append(f"#{nr} {alt} CHF {float(o['totalPriceSet']['shopMoney']['amount']):.2f} → {st}{warn}")
    print(f"BESTELLUNGEN: {len(nodes)} offen · " + " | ".join(teile))

if __name__ == "__main__":
    sys.exit(selbsttest()) if "--selbsttest" in sys.argv else main()
