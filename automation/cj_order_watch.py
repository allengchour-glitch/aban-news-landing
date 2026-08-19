#!/usr/bin/env python3
"""cj_order_watch.py — meldet Status-/Tracking-Änderungen offener CJ-Bestellungen.
Vergleicht die CJ-Order-Liste mit dem letzten Stand (dropship/_cj_order_watch_state.json)
und druckt nur ÄNDERUNG-Zeilen. Auftrag User 17.08.2026: «sage mir bescheid wen was änderet»
(LX1013/LX1014 standen auf Ausstehend/UNSHIPPED)."""
import json, urllib.request, os

STATE = "dropship/_cj_order_watch_state.json"
FERTIG = {"DELIVERED", "CLOSED", "CANCELLED"}

tok = json.load(open("/tmp/cj_token.json"))["accessToken"]
req = urllib.request.Request(
    "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=50",
    headers={"CJ-Access-Token": tok})
d = json.loads(urllib.request.urlopen(req, timeout=45).read())
alt = json.load(open(STATE)) if os.path.exists(STATE) else {}
neu, aenderungen = {}, []
for o in d.get("data", {}).get("list", []):
    n = (o.get("orderNum") or "").upper()
    if not n.startswith("LX"):
        continue  # Schatten-Einträge (#-Form) nie anfassen/melden
    jetzt = {"status": o.get("orderStatus"), "tracking": o.get("trackNumber") or ""}
    # 19.08.: CJ kann Aufträge SPLITTEN (LX1013 → 2 Pakete mit eigenem Tracking) —
    # darum je Auftrag+Tracking ein Eintrag, sonst überschreibt das Dict die Pakete.
    if n in neu and neu[n]["tracking"] != jetzt["tracking"]:
        n = f"{n}#{jetzt['tracking'][-4:]}"
    neu[n] = jetzt
    vorher = alt.get(n)
    if vorher and vorher != jetzt:
        aenderungen.append(f"ÄNDERUNG {n}: {vorher['status']} → {jetzt['status']}"
                           + (f" · Tracking {vorher['tracking'] or '–'} → {jetzt['tracking']}"
                              if vorher["tracking"] != jetzt["tracking"] else ""))
    elif not vorher and jetzt["status"] not in FERTIG:
        aenderungen.append(f"NEU {n}: {jetzt['status']} · Tracking {jetzt['tracking'] or '–'}")
json.dump(neu, open(STATE, "w"), indent=1)
print("\n".join(aenderungen) if aenderungen else "KEINE ÄNDERUNG")
