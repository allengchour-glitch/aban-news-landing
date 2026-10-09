#!/usr/bin/env python3
"""Tests für die Profit-Anzeige (ohne Netz, mit nachgebautem Binance-Futures-Server): python3 tools/trading/krypto_bot/test_profit.py"""
from __future__ import annotations

import hashlib
import hmac
import json
import sys
import tempfile
import threading
import urllib.parse
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import profit as PR  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


JETZT = datetime(2026, 10, 9, 15, 0, tzinfo=timezone.utc).astimezone()
MS = lambda d: int(d.timestamp() * 1000)  # noqa: E731
HEUTE_MORGEN = JETZT.replace(hour=1)
VOR_3_TAGEN, VOR_20_TAGEN, VOR_50_TAGEN = JETZT - timedelta(days=3), JETZT - timedelta(days=20), JETZT - timedelta(days=50)

# ── reine Rechnung ──
lb = {"einkommen": {
    "1-REALIZED_PNL-BTCUSDT": {"zeit": MS(HEUTE_MORGEN), "art": "realisiert", "symbol": "BTCUSDT", "betrag": 40.0, "asset": "USDT"},
    "2-COMMISSION-BTCUSDT": {"zeit": MS(HEUTE_MORGEN), "art": "gebuehren", "symbol": "BTCUSDT", "betrag": -2.0, "asset": "USDT"},
    "3-FUNDING_FEE-ETHUSDT": {"zeit": MS(VOR_3_TAGEN), "art": "funding", "symbol": "ETHUSDT", "betrag": -1.5, "asset": "USDT"},
    "4-REALIZED_PNL-ETHUSDT": {"zeit": MS(VOR_20_TAGEN), "art": "realisiert", "symbol": "ETHUSDT", "betrag": -30.0, "asset": "USDT"},
    "5-REALIZED_PNL-BTCUSDT": {"zeit": MS(VOR_50_TAGEN), "art": "realisiert", "symbol": "BTCUSDT", "betrag": 100.0, "asset": "USDT"},
}, "offen_verlauf": [[MS(JETZT - timedelta(days=2)), 10.0], [MS(JETZT - timedelta(hours=20)), 15.0]]}
konto = {"totalWalletBalance": "10106.5", "totalUnrealizedProfit": "25"}
pos = [{"symbol": "BTCUSDT", "positionAmt": "0.05", "entryPrice": "80000", "markPrice": "81000", "unRealizedProfit": "50",
        "isolatedMargin": "4000", "leverage": "1", "liquidationPrice": "0"},
       {"symbol": "ETHUSDT", "positionAmt": "-1", "entryPrice": "2500", "markPrice": "2525", "unRealizedProfit": "-25",
        "isolatedMargin": "2500", "leverage": "1", "liquidationPrice": "4900"},
       {"symbol": "SOLUSDT", "positionAmt": "0", "entryPrice": "0", "markPrice": "100", "unRealizedProfit": "0"}]
a = PR.auswerten(lb, konto, pos, JETZT)
z = a["zeitraeume"]
pruefe("heute: realisiert 40 − Gebühr 2 + offene Veränderung (25 − 15 vom Vortag)", z["heute"]["netto"] == 48.0 and z["heute"]["offen"] == 10.0, z["heute"])
pruefe("7 Tage: + Funding −1,5, offen ab 0 (kein Stand vor 7 Tagen)", z["7_tage"]["netto"] == 40 - 2 - 1.5 + 25, z["7_tage"])
pruefe("30 Tage: + Verlust −30", z["30_tage"]["netto"] == 40 - 2 - 1.5 - 30 + 25, z["30_tage"])
pruefe("seit Start: alles inkl. +100 vor 50 Tagen", z["gesamt"]["netto"] == 40 - 2 - 1.5 - 30 + 100 + 25 and z["gesamt"]["realisiert"] == 110.0, z["gesamt"])
pruefe("Prozent auf das Kapital vor dem Zeitraum", abs(z["gesamt"]["prozent"] - 131.5 / (10106.5 + 25 - 131.5)) < 1e-12, z["gesamt"]["prozent"])
pruefe("nur offene Positionen, Long/Short richtig", [(p["symbol"], p["seite"]) for p in a["positionen"]] == [("BTCUSDT", "LONG"), ("ETHUSDT", "SHORT")])
eth = a["positionen"][1]
pruefe("Short: Kurs steigt → Kursbewegung negativ, Gewinn auf das Pfand", abs(eth["kursbewegung"] + 0.01) < 1e-12 and abs(eth["gewinn_prozent"] + 0.01) < 1e-12
       and eth["liquidation"] == 4900.0, eth)
pruefe("pro Markt: realisiert + offen", a["pro_markt"] == {"BTCUSDT": 40 - 2 + 100 + 50, "ETHUSDT": -1.5 - 30 - 25}, a["pro_markt"])
pruefe("Verlauf kumuliert, nach Tagen", a["kumuliert"][-1][1] == 106.5 and len(a["tage"]) == 4, a["kumuliert"])
leer = PR.auswerten({"einkommen": {}, "offen_verlauf": []}, {"totalWalletBalance": "0", "totalUnrealizedProfit": "0"}, [], JETZT)
pruefe("leeres Konto: kein Absturz, Prozent leer", leer["zeitraeume"]["gesamt"]["netto"] == 0 and leer["zeitraeume"]["gesamt"]["prozent"] is None)

# ── nachgebauter Binance-Server: Einkommen in Seiten, Einzahlung zählt nicht ──
GEHEIM = "profit-geheim"
T0 = MS(JETZT - timedelta(days=10))
EINKOMMEN = [{"symbol": "BTCUSDT", "incomeType": "REALIZED_PNL", "income": "1.0", "asset": "USDT", "time": T0 + i * 60000, "tranId": i}
             for i in range(2500)]
EINKOMMEN += [{"symbol": "", "incomeType": "TRANSFER", "income": "5000", "asset": "USDT", "time": T0 + 5, "tranId": 99999},
              {"symbol": "ETHUSDT", "incomeType": "FUNDING_FEE", "income": "-0.5", "asset": "USDT", "time": T0 + 10, "tranId": 88888}]


class Fake(BaseHTTPRequestHandler):
    log = []

    def _a(self, o, code=200):
        b = json.dumps(o).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        roh, _, sig = q.rpartition("&signature=") if "&signature=" in q else (q, "", "")
        gueltig = sig == hmac.new(GEHEIM.encode(), roh.encode(), hashlib.sha256).hexdigest() if sig else None
        Fake.log.append((pfad, p, gueltig))
        if sig and not gueltig:
            return self._a({"code": -1022}, 400)
        if pfad == "/fapi/v1/time":
            return self._a({"serverTime": int(datetime.now(timezone.utc).timestamp() * 1000)})
        if pfad == "/fapi/v2/account":
            return self._a(konto)
        if pfad == "/fapi/v2/positionRisk":
            return self._a(pos)
        if pfad == "/fapi/v1/income":
            von, bis, n = int(p["startTime"]), int(p["endTime"]), int(p["limit"])
            if bis - von > 7 * 86400 * 1000 + 1:
                return self._a({"code": -4166, "msg": "Fenster zu gross"}, 400)
            treffer = sorted([e for e in EINKOMMEN if von <= e["time"] <= bis], key=lambda e: e["time"])
            return self._a(treffer[:n])
        return self._a({"code": -1, "msg": "?"}, 404)

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
env = {"BINANCE_FUTURES_API_KEY": "KEY-P", "BINANCE_FUTURES_API_SECRET": GEHEIM, "BINANCE_FUTURES_URL": f"http://127.0.0.1:{srv.server_port}"}
with tempfile.TemporaryDirectory() as td:
    pfad = Path(td) / "profit.json"
    r = PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT)
    gespeichert = json.loads(pfad.read_text())
    pruefe("alle 2500 Einträge über mehrere Seiten geholt", sum(1 for k in gespeichert["einkommen"] if k.endswith("REALIZED_PNL-BTCUSDT")) == 2500)
    pruefe("Einzahlung (TRANSFER) zählt NICHT als Gewinn", not any("TRANSFER" in k for k in gespeichert["einkommen"])
           and r["zeitraeume"]["gesamt"]["realisiert"] == 2500.0, r["zeitraeume"]["gesamt"])
    pruefe("Funding gezählt", r["zeitraeume"]["gesamt"]["funding"] == -0.5)
    pruefe("Abfragen signiert, Fenster ≤ 7 Tage", all(g for pf, _, g in Fake.log if pf != "/fapi/v1/time")
           and all(int(p["endTime"]) - int(p["startTime"]) <= 7 * 86400 * 1000 for pf, p, _ in Fake.log if pf == "/fapi/v1/income"))
    n1 = len(gespeichert["einkommen"])
    PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT)
    pruefe("zweiter Abruf: keine Doppelzählung", len(json.loads(pfad.read_text())["einkommen"]) == n1)
    pruefe("nur lesende Abfragen (kein Auftrag)", all(pf in ("/fapi/v1/time", "/fapi/v2/account", "/fapi/v2/positionRisk", "/fapi/v1/income")
                                                       for pf, _, _ in Fake.log))
    pruefe("keine Schlüssel im Logbuch oder in der Antwort", GEHEIM not in pfad.read_text() and "KEY-P" not in json.dumps(r))
    t = PR.text(r)
    pruefe("Text: Heute/7 Tage/30 Tage/seit Start + Positionen", all(x in t for x in ("Heute", "7 Tage", "30 Tage", "Seit", "LONG", "SHORT")), t)
pruefe("ohne Schlüssel: Hinweis statt Absturz", "Keine Futures-Schlüssel" in PR.abrufen(env={})["hinweis"])
pruefe("Hinweis-Text", PR.text({"hinweis": "x"}) == "Profit: x")
srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
