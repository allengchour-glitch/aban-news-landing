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


# Absichtlich weit weg von der echten Uhr: der Test darf nie von «heute» abhängen (früher Zeitbombe ab 28.12.2026)
JETZT = datetime(2031, 3, 9, 15, 0, tzinfo=timezone.utc).astimezone()
MS = lambda d: int(d.timestamp() * 1000)  # noqa: E731
HEUTE_MORGEN = JETZT.replace(hour=1)
MITTERNACHT = JETZT.replace(hour=0, minute=0, second=0, microsecond=0)
VOR_3_TAGEN, VOR_20_TAGEN, VOR_50_TAGEN = JETZT - timedelta(days=3), JETZT - timedelta(days=20), JETZT - timedelta(days=50)

# ── reine Rechnung ──
lb = {"einkommen": {
    "1-REALIZED_PNL-BTCUSDT": {"zeit": MS(HEUTE_MORGEN), "art": "realisiert", "symbol": "BTCUSDT", "betrag": 40.0, "asset": "USDT"},
    "2-COMMISSION-BTCUSDT": {"zeit": MS(HEUTE_MORGEN), "art": "gebuehren", "symbol": "BTCUSDT", "betrag": -2.0, "asset": "USDT"},
    "3-FUNDING_FEE-ETHUSDT": {"zeit": MS(VOR_3_TAGEN), "art": "funding", "symbol": "ETHUSDT", "betrag": -1.5, "asset": "USDT"},
    "4-REALIZED_PNL-ETHUSDT": {"zeit": MS(VOR_20_TAGEN), "art": "realisiert", "symbol": "ETHUSDT", "betrag": -30.0, "asset": "USDT"},
    "5-REALIZED_PNL-BTCUSDT": {"zeit": MS(VOR_50_TAGEN), "art": "realisiert", "symbol": "BTCUSDT", "betrag": 100.0, "asset": "USDT"},
}, "offen_verlauf": [[MS(JETZT - timedelta(days=2)), 10.0], [MS(MITTERNACHT - timedelta(hours=1)), 15.0]]}
konto = {"totalWalletBalance": "10106.5", "totalUnrealizedProfit": "25"}
pos = [{"symbol": "BTCUSDT", "positionAmt": "0.05", "entryPrice": "80000", "markPrice": "81000", "unRealizedProfit": "50",
        "isolatedMargin": "4000", "leverage": "1", "liquidationPrice": "0"},
       {"symbol": "ETHUSDT", "positionAmt": "-1", "entryPrice": "2500", "markPrice": "2525", "unRealizedProfit": "-25",
        "isolatedMargin": "2500", "leverage": "1", "liquidationPrice": "4900"},
       {"symbol": "SOLUSDT", "positionAmt": "0", "entryPrice": "0", "markPrice": "100", "unRealizedProfit": "0"}]
a = PR.auswerten(lb, konto, pos, JETZT)
z = a["zeitraeume"]
pruefe("heute: realisiert 40 − Gebühr 2 + offene Veränderung (25 − 15 vom Vortag)", z["heute"]["netto"] == 48.0 and z["heute"]["offen"] == 10.0, z["heute"])
pruefe("7 Tage: kein gemerkter Stand vor 7 Tagen → offen UNBEKANNT, nur der abgeschlossene Teil (keine erfundene Zahl)",
       z["7_tage"]["netto"] == 40 - 2 - 1.5 and z["7_tage"]["offen"] is None, z["7_tage"])
pruefe("30 Tage: + Verlust −30, offen unbekannt", z["30_tage"]["netto"] == 40 - 2 - 1.5 - 30 and z["30_tage"]["offen"] is None, z["30_tage"])
pruefe("Text kennzeichnet «offen ?»", "7 Tage +36.50" in PR.text({"modus": "TESTNETZ", **a}) and "(offen ?)" in PR.text({"modus": "TESTNETZ", **a}))
# Befund: alter Stand von vor 3 Tagen (+500), gestern realisiert → heute ist der Gewinn 0, nicht −500
b_alt = {"einkommen": {"1-R-B": {"zeit": MS(MITTERNACHT - timedelta(hours=10)), "art": "realisiert", "symbol": "BTCUSDT", "betrag": 500.0, "asset": "USDT"}},
         "offen_verlauf": [[MS(JETZT - timedelta(days=3)), 500.0]]}
h = PR.auswerten(b_alt, {"totalWalletBalance": "10500", "totalUnrealizedProfit": "0"}, [], JETZT)["zeitraeume"]["heute"]
pruefe("alter Stand (3 Tage) wird für «heute» NICHT genommen: kein falscher −500-Tag", h["netto"] == 0.0 and h["offen"] is None, h)
b_ok = {"einkommen": dict(b_alt["einkommen"]), "offen_verlauf": [[MS(MITTERNACHT - timedelta(hours=12)), 500.0]]}
h = PR.auswerten(b_ok, {"totalWalletBalance": "10500", "totalUnrealizedProfit": "0"}, [], JETZT)
pruefe("Stand 12 h vor Mitternacht: zu alt für «heute» (Toleranz 6 h) → offen unbekannt", h["zeitraeume"]["heute"]["offen"] is None,
       h["zeitraeume"]["heute"])
b_frisch = {"einkommen": dict(b_alt["einkommen"]), "offen_verlauf": [[MS(JETZT - timedelta(days=7, hours=2)), 500.0]]}
h = PR.auswerten(b_frisch, {"totalWalletBalance": "10500", "totalUnrealizedProfit": "0"}, [], JETZT)["zeitraeume"]["7_tage"]
pruefe("7 Tage mit Stand +500 kurz vor Beginn, danach realisiert: +500 − 500 = 0 (nicht −500 und nicht +500)",
       h["netto"] == 0.0 and h["offen"] == -500.0 and h["realisiert"] == 500.0, h)
b_lauf = {"einkommen": {"1-R-B": {"zeit": MS(MITTERNACHT + timedelta(hours=2, minutes=31)), "art": "realisiert", "symbol": "BTCUSDT",
                                  "betrag": 80.0, "asset": "USDT"}}, "offen_verlauf": [[MS(MITTERNACHT + timedelta(hours=2, minutes=30)), 80.0]]}
h = PR.auswerten(b_lauf, {"totalWalletBalance": "10080", "totalUnrealizedProfit": "0"}, [], JETZT)["zeitraeume"]["heute"]
pruefe("täglicher Lauf 02:30 (Stand VOR den Aufträgen): heute = realisiert 80 − offen 80 = 0, ab 02:30", h["netto"] == 0.0
       and h["offen"] == -80.0 and h["realisiert"] == 80.0 and "T02:30" in h["ab"], h)
pruefe("seit Start: alles inkl. +100 vor 50 Tagen", z["gesamt"]["netto"] == 40 - 2 - 1.5 - 30 + 100 + 25 and z["gesamt"]["realisiert"] == 110.0, z["gesamt"])
pruefe("Prozent auf das Kapital vor dem Zeitraum", abs(z["gesamt"]["prozent"] - 131.5 / (10106.5 + 25 - 131.5)) < 1e-12, z["gesamt"]["prozent"])
# Befund: Einzahlung 1000, Gewinn +500, Gewinn ausgezahlt → Rendite auf das Eingesetzte ≈ +50 %, nicht +100 %
t_ein, t_aus = MS(JETZT - timedelta(days=60)), MS(JETZT - timedelta(minutes=1))
b_d = {"einkommen": {"1-R-B": {"zeit": MS(JETZT - timedelta(days=30)), "art": "realisiert", "symbol": "BTCUSDT", "betrag": 500.0, "asset": "USDT"}},
       "transfers": {"a": {"zeit": t_ein, "betrag": 1000.0, "asset": "USDT"}, "b": {"zeit": t_aus, "betrag": -500.0, "asset": "USDT"}},
       "offen_verlauf": []}
g_d = PR.auswerten(b_d, {"totalWalletBalance": "1000", "totalUnrealizedProfit": "0"}, [], JETZT)["zeitraeume"]["gesamt"]
pruefe("Prozent mit Ein-/Auszahlungen: ≈ +50 % (Modified Dietz), nicht +100 %", g_d["netto"] == 500.0 and abs(g_d["prozent"] - 0.5) < 0.01
       and g_d["einzahlungen"] == 500.0, g_d)
# Gebühren in BNB und Rückvergütung
b_bnb = {"einkommen": {"1": {"zeit": MS(VOR_3_TAGEN), "art": "gebuehren", "symbol": "BTCUSDT", "betrag": -0.01, "asset": "BNB", "kurs_usdt": 600.0},
                       "2": {"zeit": MS(VOR_3_TAGEN), "art": "gebuehren", "symbol": "BTCUSDT", "betrag": 1.0, "asset": "USDT"},
                       "3": {"zeit": MS(VOR_3_TAGEN), "art": "gebuehren", "symbol": "BTCUSDT", "betrag": -5.0, "asset": "XYZ"}}, "offen_verlauf": []}
g_b = PR.auswerten(b_bnb, {"totalWalletBalance": "100", "totalUnrealizedProfit": "0"}, [], JETZT)
pruefe("BNB-Gebühr in USDT umgerechnet (−6), Rückvergütung +1, Unumrechenbares laut gemeldet", g_b["zeitraeume"]["gesamt"]["gebuehren"] == -5.0
       and g_b["nicht_umgerechnet"] == ["XYZ"] and "NICHT enthalten: XYZ" in PR.text({"modus": "TESTNETZ", **g_b}), g_b["zeitraeume"]["gesamt"])
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
# Seitengrenze: 30 Einträge mit derselben Millisekunde um den 1000. Eintrag herum (Teil-Ausführungen eines Auftrags)
GLEICH = EINKOMMEN[985]["time"]
EINKOMMEN += [{"symbol": "BTCUSDT", "incomeType": "COMMISSION", "income": "-0.01", "asset": "USDT", "time": GLEICH, "tranId": 50000 + i}
              for i in range(30)]
EINKOMMEN += [{"symbol": "BTCUSDT", "incomeType": "COMMISSION", "income": "-0.001", "asset": "BNB", "time": T0 + 20, "tranId": 77777},
              {"symbol": "", "incomeType": "COMMISSION_REBATE", "income": "0.25", "asset": "USDT", "time": T0 + 30, "tranId": 66666}]


class Fake(BaseHTTPRequestHandler):
    log, bremse, extra = [], False, []

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
        if Fake.bremse:
            return self._a({"code": -1003, "msg": "Too many requests"}, 429)
        if pfad == "/fapi/v2/account":
            return self._a(konto)
        if pfad == "/fapi/v1/premiumIndex" and p.get("symbol") == "BNBUSDT":
            return self._a({"markPrice": "600", "lastFundingRate": "0"})
        if pfad == "/fapi/v2/positionRisk":
            return self._a(pos)
        if pfad == "/fapi/v1/income":
            von, bis, n = int(p["startTime"]), int(p["endTime"]), int(p["limit"])
            if bis - von > 7 * 86400 * 1000 + 1:
                return self._a({"code": -4166, "msg": "Fenster zu gross"}, 400)
            treffer = sorted([e for e in EINKOMMEN + Fake.extra if von <= e["time"] <= bis], key=lambda e: e["time"])
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
    gespeichert = gespeichert["testnetz"]
    pruefe("alle 2500 Einträge über mehrere Seiten geholt", sum(1 for k in gespeichert["einkommen"] if k.endswith("REALIZED_PNL-BTCUSDT")) == 2500)
    pruefe("Seitengrenze: alle 30 Einträge mit gleicher Millisekunde da (keiner verloren)",
           sum(1 for k in gespeichert["einkommen"] if k.startswith("500") and "COMMISSION" in k) == 30)
    pruefe("BNB-Gebühr mit Kurs gespeichert, Rückvergütung als Gebühr (+)", gespeichert["einkommen"]["77777-COMMISSION-BTCUSDT"]["kurs_usdt"] == 600.0
           and r["zeitraeume"]["gesamt"]["gebuehren"] == round(-0.3 - 0.6 + 0.25, 4), r["zeitraeume"]["gesamt"])
    pruefe("Einzahlung als Kapitalfluss gemerkt (nicht als Gewinn)", list(gespeichert["transfers"].values())[0]["betrag"] == 5000.0)
    pruefe("Einzahlung (TRANSFER) zählt NICHT als Gewinn", not any("TRANSFER" in k for k in gespeichert["einkommen"])
           and r["zeitraeume"]["gesamt"]["realisiert"] == 2500.0, r["zeitraeume"]["gesamt"])
    pruefe("Funding gezählt", r["zeitraeume"]["gesamt"]["funding"] == -0.5)
    pruefe("Abfragen signiert, Fenster ≤ 7 Tage", all(g for pf, _, g in Fake.log if pf not in ("/fapi/v1/time", "/fapi/v1/premiumIndex"))
           and all(int(p["endTime"]) - int(p["startTime"]) <= 7 * 86400 * 1000 for pf, p, _ in Fake.log if pf == "/fapi/v1/income"))
    n1 = len(gespeichert["einkommen"])
    n_inc = sum(1 for pf, _, _ in Fake.log if pf == "/fapi/v1/income")
    PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT + timedelta(seconds=15))
    pruefe("Abruf 15 s später: Einkommen NICHT erneut geholt (Binance-Gewicht schonen)",
           sum(1 for pf, _, _ in Fake.log if pf == "/fapi/v1/income") == n_inc)
    PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT + timedelta(minutes=2))
    inc_neu = [p for pf, p, _ in Fake.log if pf == "/fapi/v1/income"][n_inc:]
    pruefe("nach 2 Min.: nur EIN Fenster ab dem letzten Abruf, nicht wieder 90 Tage", len(inc_neu) == 1
           and int(inc_neu[0]["startTime"]) >= MS(JETZT) - 3600 * 1000, inc_neu)
    pruefe("zweiter Abruf: keine Doppelzählung", len(json.loads(pfad.read_text())["testnetz"]["einkommen"]) == n1)
    pruefe("nur lesende Abfragen (kein Auftrag)", all(pf in ("/fapi/v1/time", "/fapi/v2/account", "/fapi/v2/positionRisk", "/fapi/v1/income",
                                                             "/fapi/v1/premiumIndex")
                                                       for pf, _, _ in Fake.log))
    pruefe("keine Schlüssel im Logbuch oder in der Antwort", GEHEIM not in pfad.read_text() and "KEY-P" not in json.dumps(r))
    t = PR.text(r)
    pruefe("Text: Heute/7 Tage/30 Tage/seit Start + Positionen", all(x in t for x in ("Heute", "7 Tage", "30 Tage", "Seit", "LONG", "SHORT")), t)
    # Echtgeld hat ein EIGENES Buch: Spielgeld-Gewinne erscheinen nie als echter Gewinn
    echt = dict(env, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=PR.BF.ECHTGELD_SATZ)
    alt_e, EINKOMMEN[:] = list(EINKOMMEN), []
    Fake.extra = [{"symbol": "BTCUSDT", "incomeType": "REALIZED_PNL", "income": "7.0", "asset": "USDT", "time": MS(JETZT) - 5000, "tranId": 1}]
    n_e = len(Fake.log)
    re_ = PR.abrufen(env=echt, logbuch=pfad, jetzt=JETZT + timedelta(minutes=3))
    EINKOMMEN[:], Fake.extra = alt_e, []
    lb_e = json.loads(pfad.read_text())
    pruefe("Echtgeld: eigenes Buch, nur echte Einträge, Testnetz unverändert", re_["modus"] == "ECHTGELD"
           and re_["zeitraeume"]["gesamt"]["realisiert"] == 7.0 and len(lb_e["echtgeld"]["einkommen"]) == 1
           and len(lb_e["testnetz"]["einkommen"]) == n1, re_["zeitraeume"]["gesamt"])
    pruefe("…und Echtgeld holt seine eigenen 90 Tage (nicht ab dem letzten Testnetz-Eintrag)",
           int([p for pf, p, _ in Fake.log[n_e:] if pf == "/fapi/v1/income"][0]["startTime"]) <= MS(JETZT) - 89 * 86400 * 1000)
    # Drosselung: HTTP 429 → Pause, keine weiteren Abfragen
    Fake.bremse = True
    rb = PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT + timedelta(minutes=5))
    Fake.bremse = False
    n_b = len(Fake.log)
    rb2 = PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT + timedelta(minutes=6))
    pruefe("HTTP 429: Profit pausiert und fragt Binance NICHT weiter (Pilot/Not-Aus nicht gefährden)", "429" in rb["hinweis"]
           and "pausiert" in rb2["hinweis"] and len(Fake.log) == n_b, (rb, rb2))
    PR._BREMSE.update(bis=0.0)
    # kaputte Datei: beiseitelegen statt still leeren
    pfad.write_text('{"version": 2, "testnetz": {"einkommen": {"1-')
    rk = PR.abrufen(env=env, logbuch=pfad, jetzt=JETZT + timedelta(minutes=7))
    pruefe("kaputtes Logbuch: gesichert (.kaputt-…), Warnung im Ergebnis, kein stilles Leeren", "beschädigt" in rk.get("warnung", "")
           and len(list(Path(td).glob("profit.json.kaputt-*"))) == 1 and "⚠️" in PR.text(rk), rk.get("warnung"))
    pruefe("atomar geschrieben: keine Zwischendateien übrig", not list(Path(td).glob("*.tmp*")))
    # altes Logbuch (Version 1, ein Topf) → Testnetz-Buch
    pfad.write_text(json.dumps({"version": 1, "einkommen": {"x": {"zeit": T0, "art": "realisiert", "symbol": "BTCUSDT", "betrag": 3.0}},
                                "offen_verlauf": [[T0, 1.0]]}))
    lb_v1 = PR.lies(pfad)
    pruefe("Version 1 wird ins Testnetz-Buch übernommen, Echtgeld bleibt leer", "x" in lb_v1["testnetz"]["einkommen"]
           and not lb_v1["echtgeld"]["einkommen"] and lb_v1["version"] == 2)
    # Pilot-Lauf merkt den offenen Stand vor seinen Aufträgen
    PR.offen_notieren("testnetz", 12.5, MS(JETZT) - 1000, logbuch=pfad)
    pruefe("Stand des täglichen Laufs gemerkt (auch innerhalb von 15 Min.)", [MS(JETZT) - 1000, 12.5] in PR.lies(pfad)["testnetz"]["offen_verlauf"])
pruefe("falsche Adresse (echte Binance im Testnetz-Modus): kein Abruf, der Schlüssel geht nirgends hin",
       "BINANCE_FUTURES_URL" in PR.abrufen(env=dict(env, BINANCE_FUTURES_URL="https://fapi.binance.com"))["hinweis"])
pruefe("ohne Schlüssel: Hinweis statt Absturz", "Keine Futures-Schlüssel" in PR.abrufen(env={})["hinweis"])
pruefe("Hinweis-Text", PR.text({"hinweis": "x"}) == "Profit: x")
srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
