#!/usr/bin/env python3
"""Versand-Ampel: meldet Sendungen, die eine Nummer haben, aber nie losgefahren sind.

Warum es das braucht (09.09.2026): #1017 und #1018 wurden am 07.09. bezahlt, bekamen binnen
Minuten eine Sendungsnummer, und Shopify hat beide Kunden benachrichtigt. Zwei Tage spaeter
zeigte CJs Sendungsverfolgung fuer beide genau EINE leere Station — die Pakete waren nie beim
Carrier. Gesehen hat es nur der Betreiber, weil er zufaellig in die CJ-App schaute.

Die Bestell-Ampel konnte das NICHT sehen: sie meldet bezahlte, UNERFUELLTE Bestellungen.
Diese hier sind in Shopify FULFILLED — fuer sie sah alles erledigt aus.
**Eine Sendungsnummer ist ein Label, keine Uebergabe.**

Die Gegenprobe, die den Befund hart macht, ist gemessen: die zugestellte Sendung LX1014
(EQKPT8612454928YQ) hat 21 Stationen, die beiden haengenden je 1. Ein leeres Feld ist erst
ein Befund, wenn es bei einem bekannt-gelungenen Fall gefuellt waere.

MELDET NUR — schreibt nichts, storniert nichts. Eine Zeile in der Keepalive-Ausgabe, und nur
wenn es etwas zu melden gibt. Ein Ausfall meldet «unklar», nie Schweigen.
"""
import json, os, sys, time, urllib.request, datetime as dt

SHOP = "au3j0y-hq.myshopify.com"
STILL_H = int(os.environ.get("STILL_H", "48"))   # so lange darf eine Nummer ohne Scan bleiben
MAX_NR  = int(os.environ.get("MAX_NR", "15"))    # Deckel gegen CJs 1-Anfrage/Sekunde-Limit

def shop(q):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": q}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    fehler = "keine Daten"
    for versuch in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            fehler = str(e)[:80]; time.sleep(2 + 2 * versuch); continue
        if d.get("data"):
            return d["data"], ""
        errs = d.get("errors") or []
        fehler = (errs[0].get("message") if errs else "keine Daten")
        # Eine Drosselung ist kein Abbruchgrund — sie sagt nur, wie lange zu warten ist.
        ts = (d.get("extensions") or {}).get("cost", {}).get("throttleStatus") or {}
        if ts:
            fehlt = 20 - ts.get("currentlyAvailable", 0)
            time.sleep(max(2, fehlt / max(ts.get("restoreRate", 50), 1) + 1))
        else:
            time.sleep(2 + 2 * versuch)
    return None, fehler

def cj_token():
    return json.load(open("/tmp/cj_token.json"))["accessToken"]

def cj(url, tok, tries=6):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, headers={"CJ-Access-Token": tok})
            return json.load(urllib.request.urlopen(r, timeout=30)), ""
        except Exception as e:
            # 429 ist der geteilte Eimer (vier Grind-Runner), kein Ausfall.
            if "429" in str(e):
                time.sleep(2 + i); continue
            return None, str(e)[:60]
    return None, "gedrosselt"

def stationen(tok, nummer):
    """(Zahl der Stationen, Status, Fehler). data ist bei getTrackInfo eine LISTE."""
    j, err = cj("https://developers.cjdropshipping.com/api2.0/v1/logistic/"
                f"getTrackInfo?trackNumber={nummer}", tok)
    if j is None:
        return None, None, err
    d = j.get("data")
    if isinstance(d, list):
        d = d[0] if d else {}
    d = d or {}
    return len(d.get("routes") or []), (d.get("trackingStatus") or "?"), ""

def main():
    seit = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)).strftime("%Y-%m-%d")
    q = ('{orders(first:25,query:"fulfillment_status:shipped AND created_at:>' + seit + '",'
         'sortKey:CREATED_AT,reverse:true){nodes{name '
         'fulfillments{createdAt trackingInfo{number}}}}}')
    data, fehler = shop(q)
    if data is None:
        print(f"VERSAND: unklar (Shopify: {fehler})"); return 0
    try:
        tok = cj_token()
    except Exception as e:
        print(f"VERSAND: unklar (kein CJ-Token: {e})"); return 0

    now = dt.datetime.now(dt.timezone.utc)
    kandidaten = []
    for o in data["orders"]["nodes"]:
        for f in (o.get("fulfillments") or []):
            ts = f.get("createdAt")
            if not ts:
                continue
            alter = (now - dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds() / 3600
            if alter < STILL_H:
                continue
            for t in (f.get("trackingInfo") or []):
                if t.get("number"):
                    kandidaten.append((o["name"], t["number"], alter))

    befunde, unklar = [], 0
    for name, nr, alter in kandidaten[:MAX_NR]:
        n, status, err = stationen(tok, nr)
        time.sleep(1.2)
        if n is None:
            unklar += 1; continue
        # Kennt CJ die Nummer gar nicht (0 Stationen, kein Status), ist das eine ANDERE
        # Klasse — etwa eine Printful-Sendung. Kein Befund, sonst meldet die Ampel Fremdes.
        if n == 0 and status in ("?", None):
            continue
        if (status or "").lower().startswith("deliver"):
            continue
        if n <= 1:
            befunde.append(f"{name} {nr} seit {alter:.0f}h ohne Scan")

    if befunde:
        print("⛔ VERSAND STEHT STILL: " + " · ".join(befunde))
        return 1
    if unklar:
        print(f"VERSAND: unklar ({unklar} Sendung(en) bei CJ nicht abfragbar)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
