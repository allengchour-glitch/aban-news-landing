#!/usr/bin/env python3
"""Tests für den KI-Bot (ohne Netz, ohne pytest): python3 tools/trading/ki_bot/test_ki_bot.py"""
from __future__ import annotations

import json
import math
import random
import sys
import tempfile
import threading
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
import bot  # noqa: E402
import broker_alpaca as B  # noqa: E402
sys.path.insert(0, str(HIER.parent / 'krypto_bot'))
import testumgebung  # noqa: E402

testumgebung.schalter_umbiegen(B)
import kern as K  # noqa: E402
import signale as SG  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bedingung, info=""):
    global OK
    if bedingung:
        OK += 1
    else:
        FEHLER.append(f"{name} {info}")
        print(f"FAIL {name} {info}")


def markt(n=1500, vol=0.18, seed=3, crash_ab=None):
    rnd = random.Random(seed)
    p, d, t = [100.0], [], datetime(2018, 1, 1)
    for i in range(n - 1):
        r = rnd.gauss(0.0003, vol / math.sqrt(252))
        if crash_ab is not None and crash_ab <= i < crash_ab + 60:
            r = -0.012
        p.append(p[-1] * (1 + r))
    while len(d) < n:
        if t.weekday() < 5:
            d.append(t.date().isoformat())
        t += timedelta(days=1)
    return d, p


# ───────────── Kern ─────────────
d, p = markt()
r = bot.renditen(p)
s1 = K.simuliere(p, d, r)
p2 = p[:900] + [p[899] ** 2 / x for x in p[900:]]  # ab Tag 900 alle Renditen gespiegelt (Gewinn ↔ Verlust)
s2 = K.simuliere(p2, d, bot.renditen(p2))
pruefe("kein Blick in die Zukunft", s1["quote"][:900] == s2["quote"][:900])
pruefe("Quote zwischen 0 und 1", all(0 <= q <= 1 for q in s1["quote"]))
pruefe("Gegenproben (Wahrsager ~100 %, Zufall nicht extrem)", bot.pruefen())

d3, p3 = markt(vol=0.60, seed=5)
q3 = K.simuliere(p3, d3, bot.renditen(p3), mit_logit=False, nur_experten=["Halten"], par={"bremse_ab": -1.0})["quote"]  # Bremse aus: nur das Volatilitäts-Ziel prüfen
mittel = sum(q3[300:]) / len(q3[300:])
pruefe("Volatilitäts-Ziel: 60 % Schwankung → ca. 25 % investiert", 0.15 < mittel < 0.4, f"({mittel:.2f})")

d4, p4 = markt(vol=0.10, seed=8, crash_ab=700)
s4 = K.simuliere(p4, d4, bot.renditen(p4), mit_logit=False, nur_experten=["Halten"], par={"vol_ziel": 10.0})
pruefe("Verlust-Bremse greift nach einem Absturz", any(e and e[3] for e in s4["erklaerung"]))

x = [0.01, -0.02, 0.015, 0.0]
k = K.kennzahlen(x)
pruefe("Kennzahlen Endwert", abs(k["endwert"] - 1.01 * 0.98 * 1.015) < 1e-12)
pruefe("Kosten am ersten Tag mit neuer Position", abs(K.tagesrenditen([0.0, 1.0, 1.0], [0.0, 0.0, 0.01], 0, 3)[1] - (0.01 - K.KOSTEN)) < 1e-12)

# ───────────── Logbuch (Strategie-Depots) ─────────────
tmp = Path(tempfile.mkdtemp())
bot.LOGBUCH = tmp / "ki-bot.json"


def sig(stand, kurs_a, kurs_b):
    return {"A": {"datum": stand, "kurs": kurs_a, "ki": 1.0, "trend200": 1.0, "halten": 1.0, "vol_jahr": 0.2, "warum": {}},
            "B": {"datum": stand, "kurs": kurs_b, "ki": 0.0, "trend200": 0.0, "halten": 1.0, "vol_jahr": 0.2, "warum": {}}}


bot.signale_heute = lambda offline: sig("2026-10-01", 100.0, 50.0)
bot.lauf(True, "2026-10-01")
eins = bot.LOGBUCH.read_text()
bot.lauf(True, "2026-10-02")
pruefe("Logbuch idempotent ohne neuen Kurs", bot.LOGBUCH.read_text() == eins)
bot.signale_heute = lambda offline: sig("2026-10-02", 110.0, 50.0)
lb = bot.lauf(True, "2026-10-02")
aus = lb["strategien"]["Ausgleich"]["eintraege"]
start_kosten = 10000 * K.KOSTEN  # 100 % investiert ab Bargeld
erwartet = (10000 - start_kosten) * (1 + 0.5 * 0.10)
pruefe("Ausgleich: Depot nach +10 % in Markt A", abs(aus[-1]["depot"] - erwartet) < 0.5, f"({aus[-1]['depot']} vs {erwartet:.2f})")
pruefe("Logbuch: nur angehängt", len(aus) == 2 and aus[0]["stand"] == "2026-10-01")
ki = lb["strategien"]["KI-Bot"]["eintraege"][-1]["positionen"]
pruefe("KI-Bot: Quote 0 → kein Geld in Markt B", ki["B"]["wert"] == 0)

# ───────────── Broker: Einstellungen und Rechnung ─────────────
c = B.einstellungen({"ALPACA_KEY_ID": "k", "ALPACA_SECRET_KEY": "s"})
pruefe("Papier ist Standard", c["basis"] == B.PAPIER_URL and not c["echtgeld"])
c = B.einstellungen({"ALPACA_PAPER": "false"})
pruefe("Echtgeld nicht ohne Freigabesatz", c["basis"] == B.PAPIER_URL and not c["echtgeld"])
c = B.einstellungen({"ALPACA_PAPER": "false", "KI_BOT_ECHTGELD": "ja"})
pruefe("Echtgeld nicht mit falschem Satz", not c["echtgeld"])
c = B.einstellungen({"ALPACA_PAPER": "false", "KI_BOT_ECHTGELD": B.ECHTGELD_SATZ})
pruefe("Echtgeld nur mit beidem", c["echtgeld"] and c["basis"] == B.ECHT_URL)
pruefe("Not-Aus per Variable", B.einstellungen({"KI_BOT_STOP": "1"})["stop"])

cfg = B.einstellungen({"KI_BOT_ANTEIL": "0.5", "KI_BOT_MAX_AUFTRAG": "1000"})
konto = {"equity": "10000", "cash": "10000"}
plan = B.plane(cfg, konto, {}, {"SPY": 0.5, "GLD": 0.5})
pruefe("Höchstbetrag je Auftrag", all(a["notional"] <= 1000 for a in plan) and len(plan) == 2)
plan = B.plane(cfg, konto, {"SPY": {"market_value": "300"}}, {"SPY": 0.0})
pruefe("Verkauf höchstens den Bestand (kein Leerverkauf)", plan and plan[0]["seite"] == "sell" and plan[0]["notional"] <= 300)
plan = B.plane(cfg, konto, {"SPY": {"market_value": "2480"}}, {"SPY": 0.5})
pruefe("Kleine Abweichung (< 50 USD) → kein Auftrag", plan == [])
plan = B.plane(cfg, {"equity": "10000", "cash": "100"}, {}, {"SPY": 1.0})
pruefe("Kauf nie über Bargeld (kein Margin)", plan == [] or sum(a["notional"] for a in plan if a["seite"] == "buy") <= 100)


# ───────────── Broker: gegen einen nachgebauten Alpaca-Server ─────────────
class Fake(BaseHTTPRequestHandler):
    log = []

    def _antwort(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        Fake.log.append(("GET", self.path, dict(self.headers)))
        if self.path == "/v2/account":
            self._antwort({"equity": "10000", "cash": "10000"})
        elif self.path == "/v2/positions":
            self._antwort([])
        elif self.path == "/v2/clock":
            self._antwort({"is_open": True, "next_close": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()})
        else:
            self._antwort({})

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        roh = self.rfile.read(n)
        try:
            Fake.log.append(("POST", self.path, json.loads(roh)))
        except ValueError:
            Fake.log.append(("POST", self.path, roh.decode("utf-8")))
        self._antwort({"id": "auftrag-1", "status": "accepted"})

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
basis = f"http://127.0.0.1:{srv.server_port}"
B.PROTOKOLL = tmp / "broker.json"
env = {"ALPACA_KEY_ID": "SCHLUESSEL-ID", "ALPACA_SECRET_KEY": "GEHEIM-123", "ALPACA_BASIS_URL": basis, "KI_BOT_MAX_AUFTRAG": "1000"}
lb_test = {"strategien": {"Ausgleich": {"eintraege": [{"positionen": {"S&P 500": {"gewicht": 0.5, "quote": 1.0}, "Gold": {"gewicht": 0.5, "quote": 1.0}, "Öl (WTI)": {"gewicht": 0.0, "quote": 1.0}}}]}}}
B.ausfuehren(lb_test, trocken=True, env=env)
pruefe("Trockenlauf sendet keinen Auftrag", not [x for x in Fake.log if x[0] == "POST"])
B.ausfuehren(lb_test, trocken=False, env=env)
posts = [x for x in Fake.log if x[0] == "POST"]
pruefe("Aufträge an /v2/orders mit Betrag", posts and all(x[1] == "/v2/orders" and float(x[2]["notional"]) <= 1000 for x in posts))
gets = [x for x in Fake.log if x[0] == "GET"]
pruefe("Schlüssel im Header", gets and {k.lower(): v for k, v in gets[0][2].items()}.get("apca-api-key-id") == "SCHLUESSEL-ID")
pruefe("Keine Schlüssel im Protokoll", "GEHEIM-123" not in B.PROTOKOLL.read_text() and "SCHLUESSEL-ID" not in B.PROTOKOLL.read_text())
vorher = len([x for x in Fake.log if x[0] == "POST"])
B.ausfuehren(lb_test, trocken=False, env=dict(env, KI_BOT_STOP="1"))
pruefe("Not-Aus: keine Aufträge", len([x for x in Fake.log if x[0] == "POST"]) == vorher)

# Daytrade
cfgd = B.einstellungen(env)
plan, grund = B.plane_daytrade(cfgd, {"equity": "10000", "cash": "10000"}, {"richtung": -1, "symbol": "ES=F", "einstieg": 100, "stop_abstand": 1}, 500, 1)
pruefe("Daytrade: kein Leerverkauf", plan is None and "Leerverkauf" in grund)
plan, grund = B.plane_daytrade(cfgd, {"equity": "10000", "cash": "10000"}, {"richtung": 1, "symbol": "ES=F", "einstieg": 5000, "stop_abstand": 25}, 500, 1)
pruefe("Daytrade: ganze Stücke, Höchstbetrag", plan and isinstance(plan["menge"], int) and plan["menge"] * 500 <= 1000, str(plan))
pruefe("Daytrade: Stop 0.5 % unter Kurs", plan and abs(plan["stop"] - 497.5) < 0.01)


class FakeDaten(B.AlpacaDaten):
    def letzter_kurs(self, symbol):
        return 500.0


fd = FakeDaten(B.einstellungen(env))
B.daytrade([{"id": "x", "richtung": 1, "symbol": "ES=F", "einstieg": 5000, "stop_abstand": 25}], trocken=False, env=env, client=fd)
br = [x for x in Fake.log if x[0] == "POST" and x[2].get("order_class") == "bracket"]
pruefe("Daytrade: Bracket mit Stop und Ziel", br and "stop_loss" in br[-1][2] and "take_profit" in br[-1][2])
pruefe("Kurz vor Schluss erkannt", B.kurz_vor_schluss(env=env, client=fd))

# ───────────── Signale ─────────────
tag = [(100, 101, 0), (101, 102, 0), (102, 101.5, 0)]
pruefe("Live-Regel folgen (2 Std.)", SG.regel_live("Erste 2 Std. folgen", tag)[:3] == (1, 102, 1))
pruefe("Live-Regel umkehren", SG.regel_live("Erste 2 Std. umkehren", tag)[0] == -1)
tag2 = [(100, 101, 0), (101, 100.5, 0), (100.5, 101.2, 0), (101.2, 102, 0)]
pruefe("Live-Ausbruch: erster Schluss über der Spanne", SG.regel_live("Ausbruch aus 1-Std.-Spanne", tag2)[:3] == (1, 101.2, 2))
pruefe("Gütesiegel: Minus → nein", not SG.guetesiegel([-0.002] * 200 + [0.001] * 40)["ok"])
pruefe("Gütesiegel: klares Plus → ja", SG.guetesiegel([0.004, -0.001] * 120)["ok"])
g = SG.groesse(2000.0, 10.0, 1000.0, 1.0, 0.8, 20)
pruefe("Grösse: Verlust am Stop = Risiko", abs(g["einheiten"] * 10.0 * 0.8 - 10.0) < 0.01)
lbs = {"signale": [{"id": "a", "symbol": "GC=F", "tag": "2026-09-01", "kerze": 1, "einstieg": 100.0, "richtung": 1, "stop_abstand": 1.0, "ergebnis": None}]}
tg = {datetime(2026, 9, 1).date(): [(99, 99.5, 0), (99.5, 100, 0), (100, 98.5, 0), (98.5, 103, 0)], datetime(2026, 9, 2).date(): [(1, 1, 0)]}
SG.abrechnen(lbs, {"GC=F": tg})
e = lbs["signale"][0]["ergebnis"]
pruefe("Abrechnung: Stop vor Erholung", e and e["grund"] == "Stop" and e["ausstieg"] == 99.0)

# ntfy (Gratis-Push ohne Konto)
pruefe("ntfy: ohne Thema nichts senden", SG.push_ntfy("x", env={}) is False)
pruefe("ntfy: sendet Text an das Thema", SG.push_ntfy("Gold kaufen 2'650", env={"KI_BOT_NTFY": "mein-geheimes-thema", "KI_BOT_NTFY_SERVER": basis})
       and Fake.log[-1][1] == "/mein-geheimes-thema" and "Gold kaufen" in Fake.log[-1][2])

# Wochenbericht
lbw = {"strategien": {"Ausgleich": {"positionen": {"Gold": {"wert": 5000}}, "eintraege": [
    {"stand": "2026-09-01", "depot": 10000}, {"stand": "2026-09-25", "depot": 10200}, {"stand": "2026-10-02", "depot": 10404}]}}}
txt = bot.wochenbericht(lbw, "2026-10-03", {"pruefungen": {"Gold": {"siegel": {"ok": False}}}, "signale": []},
                        [{"zeit": "2026-10-02T15:00:00+00:00", "modus": "papier", "auftraege": [1, 2]}])
pruefe("Bericht: Stand seit Start", "+4.0 % seit Start" in txt, txt)
pruefe("Bericht: Woche gegen Stand vor 7 Tagen", "+2.0 % Woche" in txt, txt)
pruefe("Bericht: ehrlich ohne Siegel", "kein Markt" in txt and "papier" in txt and "2 Aufträge" in txt, txt)

srv.shutdown()
B.PAUSE_DATEI.write_text("x")  # Cockpit «Auto-Handel aus»
pruefe("Pause (Cockpit «Auto-Handel aus») stoppt auch diesen Bot", B.einstellungen({})["stop"] is True)
B.PAUSE_DATEI.unlink()
pruefe("ohne Pause und Not-Aus: läuft", B.einstellungen({})["stop"] is False)
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
