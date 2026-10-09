#!/usr/bin/env python3
"""Tests für den ETH-Sammler (ohne Netz, mit nachgebautem Binance-Server): python3 tools/trading/krypto_bot/test_sammler.py"""
from __future__ import annotations

import hashlib
import hmac
import json
import sys
import tempfile
import threading
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import eth_sammler as S  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def leeres_buch():
    return {"kaeufe": [], "gestakt": []}


# ── reine Rechnung ──
cfg = S.einstellungen({"ETH_SPARPLAN_BETRAG": "50", "ETH_SPARPLAN_TAGE": "7", "ETH_SPARPLAN_MAX": "120"})
b = leeres_buch()
pruefe("erster Kauf sofort", S.plane_kauf(cfg, b, 1000, "2026-10-08") == (50.0, "fällig"))
b["kaeufe"].append({"tag": "2026-10-08", "usdt": 50.0, "eth": 0.02})
pruefe("vor Ablauf der Tage: kein Kauf", S.plane_kauf(cfg, b, 1000, "2026-10-14")[0] is None)
pruefe("nach 7 Tagen: Kauf", S.plane_kauf(cfg, b, 1000, "2026-10-15")[0] == 50.0)
b["kaeufe"].append({"tag": "2026-10-15", "usdt": 50.0, "eth": 0.02})
pruefe("Obergrenze: Rest 20 statt 50", S.plane_kauf(cfg, b, 1000, "2026-10-22")[0] == 20.0, S.plane_kauf(cfg, b, 1000, "2026-10-22"))
b["kaeufe"].append({"tag": "2026-10-22", "usdt": 20.0, "eth": 0.008})
pruefe("Obergrenze erreicht: nie mehr", S.plane_kauf(cfg, b, 1000, "2027-01-01")[0] is None)
pruefe("zu wenig USDT: kein Kauf", S.plane_kauf(cfg, leeres_buch(), 49.99, "2026-10-08")[0] is None)
pruefe("unter Börsen-Minimum: kein Kauf", S.plane_kauf(S.einstellungen({"ETH_SPARPLAN_BETRAG": "3"}), leeres_buch(), 1000, "2026-10-08", 5.0)[0] is None)
pruefe("Betrag nie über KI_BOT_MAX_AUFTRAG", S.einstellungen({"ETH_SPARPLAN_BETRAG": "5000", "KI_BOT_MAX_AUFTRAG": "200"})["betrag"] == 200.0)
pruefe("Unsinn in Einstellungen → Standard", S.einstellungen({"ETH_SPARPLAN_BETRAG": "viel"})["betrag"] == 50.0)
pruefe("Staking ist aus, wenn nicht gesetzt", not S.einstellungen({})["staken"])
pruefe("Gebühr in ETH wird abgezogen", abs(S.netto_eth({"executedQty": "0.02", "fills": [{"commission": "0.00002", "commissionAsset": "ETH"}]}) - 0.01998) < 1e-12)
pruefe("Gebühr in BNB: Menge voll", S.netto_eth({"executedQty": "0.02", "fills": [{"commission": "0.0001", "commissionAsset": "BNB"}]}) == 0.02)
b2 = {"kaeufe": [{"tag": "x", "usdt": 50, "eth": 0.03}], "gestakt": [{"tag": "x", "eth": 0.01}]}
pruefe("staken: nur eigene offene ETH", S.zu_staken(b2, 5.0) == 0.02, S.zu_staken(b2, 5.0))
pruefe("staken: nie mehr als frei", S.zu_staken(b2, 0.01519) == 0.0151)
pruefe("staken: unter Minimum nichts", S.zu_staken(b2, 0.00004) == 0.0)
z = S.zusammenfassung({"kaeufe": [{"usdt": 100, "eth": 0.05}, {"usdt": 100, "eth": 0.1}], "gestakt": []}, 2000)
pruefe("Durchschnittspreis = Einsatz / Menge", z["schnitt"] == round(200 / 0.15, 2) and z["wert"] == 300.0 and z["ergebnis"] == 0.5, z)
reihe = [("2020-01-%02d" % (i + 1), 100.0 if i < 7 else 50.0) for i in range(14)]
r = S.sparplan_test(reihe, "2020-01-01", 70, 7, 0.0)
pruefe("Sparplan-Test: Kauf an Tag 1 und 8, Ø-Preis harmonisch", r["eingesetzt"] == 140 and abs(r["schnitt"] - 140 / (0.7 + 1.4)) < 0.01, r)
pruefe("Sparplan-Test: tiefster Stand gemessen", r["tiefster_stand"] == round((2.1 * 50) / 140 - 1, 4) and r["tiefster_tag"] == "2020-01-08", r)

# ── nachgebauter Binance-Spot-Server ──
GEHEIM = "spot-geheim"


class Fake(BaseHTTPRequestHandler):
    log, usdt, eth, rechte, stake_fehler = [], 1000.0, 0.5, {"enableWithdrawals": False}, False
    abbrechen = None  # "kauf" oder "stake": ausführen, dann Verbindung ohne Antwort schliessen

    def _a(self, o, code=200):
        bb = json.dumps(o).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(bb)

    def _route(self, methode):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        roh, _, sig = q.rpartition("&signature=") if "&signature=" in q else (q, "", "")
        gueltig = sig == hmac.new(GEHEIM.encode(), roh.encode(), hashlib.sha256).hexdigest() if sig else None
        Fake.log.append((methode, pfad, p, gueltig))
        if sig and not gueltig:
            return self._a({"code": -1022, "msg": "Signature"}, 400)
        if pfad == "/api/v3/time":
            return self._a({"serverTime": int(datetime.now(timezone.utc).timestamp() * 1000)})
        if pfad == "/sapi/v1/account/apiRestrictions":
            return self._a(Fake.rechte)
        if pfad == "/api/v3/account":
            return self._a({"canTrade": True, "balances": [{"asset": "USDT", "free": str(Fake.usdt), "locked": "0"},
                                                            {"asset": "ETH", "free": str(Fake.eth), "locked": "0"}]})
        if pfad == "/api/v3/ticker/price":
            return self._a({"symbol": p["symbol"], "price": "2500.00"})
        if pfad == "/api/v3/exchangeInfo":
            return self._a({"symbols": [{"symbol": "ETHUSDT", "status": "TRADING", "filters": [
                {"filterType": "LOT_SIZE", "stepSize": "0.0001", "minQty": "0.0001"}, {"filterType": "NOTIONAL", "minNotional": "5"}]}]})
        if pfad == "/api/v3/order":
            menge = float(p["quoteOrderQty"]) / 2500
            if Fake.abbrechen == "kauf":
                Fake.usdt -= float(p["quoteOrderQty"])
                Fake.eth += menge * 0.999
                self.close_connection = True
                return
            Fake.usdt -= float(p["quoteOrderQty"])
            Fake.eth += menge * 0.999
            return self._a({"orderId": 7, "status": "FILLED", "executedQty": f"{menge:.8f}", "cummulativeQuoteQty": p["quoteOrderQty"],
                            "fills": [{"commission": f"{menge * 0.001:.8f}", "commissionAsset": "ETH"}]})
        if pfad == "/sapi/v2/eth-staking/eth/stake":
            if Fake.stake_fehler:
                return self._a({"code": -6011, "msg": "Quota exceeded"}, 400)
            Fake.eth -= float(p["amount"])
            if Fake.abbrechen == "stake":
                self.close_connection = True
                return
            return self._a({"success": True, "wbethAmount": str(float(p["amount"]) * 0.95), "conversionRatio": "1.05"})
        return self._a({"code": -1, "msg": "unbekannt"}, 404)

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_port}"
env = {"BINANCE_API_KEY": "KEY-S", "BINANCE_API_SECRET": GEHEIM, "BINANCE_BASIS_URL": url, "ETH_SPARPLAN_BETRAG": "50"}
jetzt = datetime(2026, 10, 8, 3, tzinfo=timezone.utc)


def auftraege(ab=0):
    return [x for x in Fake.log[ab:] if x[1] == "/api/v3/order"]


lb = {"testnetz": leeres_buch(), "echtgeld": leeres_buch()}
pruefe("ohne Schlüssel: nichts", S.lauf(env={}, logbuch=lb)["hinweis"].startswith("keine Schlüssel"))
S.lauf(trocken=True, env=env, jetzt=jetzt, logbuch=lb)
pruefe("trocken: kein Auftrag, nichts gebucht", not auftraege() and not lb["testnetz"]["kaeufe"])
e = S.lauf(env=env, jetzt=jetzt, logbuch=lb)
o = auftraege()
pruefe("Kauf: Markt, 50 USDT, gültige Signatur, FULL", o and o[0][2]["quoteOrderQty"] == "50.00" and o[0][2]["type"] == "MARKET"
       and o[0][2]["newOrderRespType"] == "FULL" and o[0][3], o)
pruefe("gebucht: netto nach ETH-Gebühr", lb["testnetz"]["kaeufe"] and abs(lb["testnetz"]["kaeufe"][0]["eth"] - 0.02 * 0.999) < 1e-9, lb["testnetz"])
n = len(Fake.log)
S.lauf(env=env, jetzt=jetzt, logbuch=lb)
pruefe("zweiter Lauf am selben Tag: kein Kauf", not auftraege(n))
env_st = dict(env, ETH_STAKEN="1")
n = len(Fake.log)
S.lauf(env=env_st, jetzt=datetime(2026, 10, 15, 3, tzinfo=timezone.utc), logbuch=lb)
pruefe("Testnetz + Staking an: kauft, stakt aber nicht", len(auftraege(n)) == 1 and not [x for x in Fake.log[n:] if "eth-staking" in x[1]])
pruefe("Testnetz-Buch und Echtgeld-Buch getrennt", len(lb["testnetz"]["kaeufe"]) == 2 and not lb["echtgeld"]["kaeufe"])
pruefe("Not-Aus: nichts", S.lauf(env=dict(env, KI_BOT_STOP="1"), logbuch=lb)["hinweis"].startswith("Not-Aus"))

echt = dict(env_st, BINANCE_TESTNET="false", KI_BOT_ECHTGELD=S.BB.ECHTGELD_SATZ)
Fake.rechte = {"enableWithdrawals": True}
n = len(Fake.log)
e = S.lauf(env=echt, jetzt=jetzt, logbuch=lb)
pruefe("Echtgeld + Auszahlungsrecht: verweigert", "Auszahlungen" in e["hinweis"] and not auftraege(n) and not lb["echtgeld"]["kaeufe"])
Fake.rechte = {"enableWithdrawals": False, "enableSpotAndMarginTrading": True}
pruefe("Echtgeld nur doppelt", not S.einstellungen(dict(env, BINANCE_TESTNET="false"))["echtgeld"] and S.einstellungen(echt)["echtgeld"])
eth_vorher = Fake.eth
n = len(Fake.log)
e = S.lauf(env=echt, jetzt=jetzt, logbuch=lb)
st = [x for x in Fake.log[n:] if x[1] == "/sapi/v2/eth-staking/eth/stake"]
pruefe("Echtgeld: kauft und stakt NUR die eigenen ETH (4 Stellen)", st and st[0][2]["amount"] == "0.0199" and st[0][3], st)
pruefe("fremde ETH im Konto bleiben unberührt", abs(Fake.eth - (eth_vorher + 0.02 * 0.999 - 0.0199)) < 1e-9 and Fake.eth > 0.5, Fake.eth)
pruefe("Staking gebucht mit WBETH", lb["echtgeld"]["gestakt"] and lb["echtgeld"]["gestakt"][0]["wbeth"] > 0)
Fake.stake_fehler = True
n = len(Fake.log)
e = S.lauf(env=echt, jetzt=datetime(2026, 10, 15, 3, tzinfo=timezone.utc), logbuch=lb)
pruefe("Staking abgelehnt: Kauf bleibt, Hinweis, offen für später", len(lb["echtgeld"]["kaeufe"]) == 2 and "Staking abgelehnt" in e["hinweis"]
       and S.offen(lb["echtgeld"]) > 0.019, e)
Fake.stake_fehler = False
S.lauf(env=echt, jetzt=datetime(2026, 10, 16, 3, tzinfo=timezone.utc), logbuch=lb)
pruefe("nächster Lauf holt das Staking nach (ohne neuen Kauf)", len(lb["echtgeld"]["kaeufe"]) == 2 and len(lb["echtgeld"]["gestakt"]) == 2
       and S.offen(lb["echtgeld"]) < 0.0001, lb["echtgeld"])
# ── Funde der Code-Prüfung: verlorene Antworten, Adresse, Pause ──
lb2 = {"testnetz": leeres_buch(), "echtgeld": leeres_buch()}
Fake.abbrechen = "kauf"
n = len(Fake.log)
e = S.lauf(env=env, jetzt=jetzt, logbuch=lb2)
Fake.abbrechen = None
pruefe("Kauf-Antwort verloren: kein Absturz, als «unklar» gebucht", "verloren" in e["hinweis"] and lb2["testnetz"]["kaeufe"][-1].get("unklar")
       and lb2["testnetz"]["kaeufe"][-1]["eth"] == 0.0, (e, lb2["testnetz"]))
n = len(Fake.log)
S.lauf(env=env, jetzt=datetime(2026, 10, 9, 3, tzinfo=timezone.utc), logbuch=lb2)
pruefe("…und am nächsten Tag wird NICHT nochmals gekauft", not auftraege(n), auftraege(n))
lb3 = {"testnetz": leeres_buch(), "echtgeld": {"kaeufe": [{"tag": "2026-10-01", "usdt": 50.0, "eth": 0.02}], "gestakt": []}}
Fake.abbrechen = "stake"
eth_vorher = Fake.eth
e = S.lauf(env=echt, jetzt=datetime(2026, 10, 3, 3, tzinfo=timezone.utc), logbuch=lb3)
Fake.abbrechen = None
pruefe("Staking-Antwort verloren: als «unklar» gestakt gebucht", lb3["echtgeld"]["gestakt"] and lb3["echtgeld"]["gestakt"][-1].get("unklar")
       and "verloren" in e["hinweis"], (e, lb3["echtgeld"]))
n = len(Fake.log)
S.lauf(env=echt, jetzt=datetime(2026, 10, 4, 3, tzinfo=timezone.utc), logbuch=lb3)
pruefe("…und es werden keine fremden ETH des Nutzers nachgestakt", not [x for x in Fake.log[n:] if x[1] == "/sapi/v2/eth-staking/eth/stake"])
n = len(Fake.log)
e = S.lauf(env=dict(env, BINANCE_BASIS_URL="https://api.binance.com"), jetzt=jetzt, logbuch=lb2)
pruefe("echte Binance-Adresse ohne Doppel-Freigabe: nichts gemacht", "BINANCE_BASIS_URL" in e["hinweis"] and len(Fake.log) == n)
_pause_alt = S.PAUSE
with tempfile.TemporaryDirectory() as _pd:
    S.PAUSE = Path(_pd) / "PAUSE"
    S.PAUSE.write_text("x")
    n = len(Fake.log)
    e = S.lauf(env=env, jetzt=datetime(2026, 11, 1, 3, tzinfo=timezone.utc), logbuch=lb2)
    S.PAUSE = _pause_alt
pruefe("Pause: kein Kauf", "Pause" in e["hinweis"] and len(Fake.log) == n)
pruefe("keine Schlüssel im Logbuch", GEHEIM not in json.dumps(lb) and "KEY-S" not in json.dumps(lb))
srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
