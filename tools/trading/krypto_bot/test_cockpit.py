#!/usr/bin/env python3
"""Tests für KI-Trader (Claude), Cockpit und Telegram-Steuerung — ohne Netz, ohne Schlüssel:
python3 tools/trading/krypto_bot/test_cockpit.py"""
from __future__ import annotations

import json
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import cockpit as C  # noqa: E402
import ki_trader as KT  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def tag(i, start=date(2026, 1, 1)):
    return (start + timedelta(days=i)).isoformat()


# ── Lagebericht: nichts nach dem Stand-Tag ──
reihen = {"btc": [(tag(i), 50000 + 100 * i) for i in range(400)], "eth": [(tag(i), 3000 + 2 * i) for i in range(401)]}
text = KT.lagebericht(reihen, "Angst&Gier 50", [])
pruefe("Stand = letzter gemeinsamer Tag", f"Tagesschluss {tag(399)}" in text, text[:80])
pruefe("kein Kurs nach dem Stand-Tag im Text", "3800" not in text and str(3000 + 2 * 400) not in text)
pruefe("Kennzahlen: 1 Tag +0,1 % (89900 ÷ 89800)", "1 T. +0.1 %" in text, text[:300])


# ── Claude-Antwort verarbeiten (nachgebauter Client, kein Netz) ──
class FakeClaude:
    def __init__(self, antwort, stop="end_turn", fehler=None, modell="claude-opus-5-5"):
        self.antwort, self.stop, self.fehler, self.modell, self.aufrufe = antwort, stop, fehler, modell, []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def _create(self, **kw):
        self.aufrufe.append(kw)
        if self.fehler:
            raise self.fehler
        return SimpleNamespace(model=self.modell, stop_reason=self.stop, usage=SimpleNamespace(input_tokens=2000, output_tokens=1500),
                               content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=json.dumps(self.antwort))])


gut = {"btc": {"position": 1.7, "begruendung": "Trend intakt", "sicherheit": 1.4},
       "eth": {"position": -0.4, "begruendung": "schwach", "sicherheit": 0.3}, "kommentar": "Gemischt."}
fc = FakeClaude(gut)
d, info = KT.frage_claude("x", fc)
kw = fc.aufrufe[0]
pruefe("Modell Opus 5.5, Ersatzmodell bei Ablehnung an", kw["model"] == "claude-opus-5-5" and kw["fallbacks"] == "default"
       and kw["betas"] == ["server-side-fallback-2026-07-01"], kw.get("betas"))
pruefe("strukturierte Ausgabe + Effort high, kein thinking-Parameter", kw["output_config"]["format"]["type"] == "json_schema"
       and kw["output_config"]["effort"] == "high" and "thinking" not in kw)
pruefe("Position und Sicherheit gedeckelt", d["btc"]["position"] == 1.0 and d["btc"]["sicherheit"] == 1.0 and d["eth"]["position"] == -0.4)
pruefe("Kosten aus den Tokens: 2000×4 + 1500×20 je Mio.", info["kosten_usd"] == round(2000 / 1e6 * 4 + 1500 / 1e6 * 20, 4), info)
d2, i2 = KT.frage_claude("x", FakeClaude(gut, stop="refusal"))
pruefe("Ablehnung: kein Entscheid, Hinweis", d2 is None and "abgelehnt" in i2["hinweis"])
d3, i3 = KT.frage_claude("x", FakeClaude(gut, fehler=ConnectionError("weg")))
pruefe("Netzfehler: kein Absturz", d3 is None and "nicht erreichbar" in i3["hinweis"])
d4, i4 = KT.frage_claude("x", FakeClaude(gut), modell="claude-haiku-5-5")
pruefe("Haiku: ohne fallbacks (dort nicht erlaubt)", d4 is not None)
alt_env = dict(__import__("os").environ)
for k in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_PROFILE"):
    __import__("os").environ.pop(k, None)
d5, i5 = KT.frage_claude("x")
pruefe("ohne Schlüssel: freundlicher Hinweis", d5 is None and "ANTHROPIC_API_KEY" in i5["hinweis"])
__import__("os").environ.update(alt_env)

# ── Schattenkonto ──
kurse = {tag(0): 100.0, tag(1): 110.0, tag(2): 99.0, tag(3): 99.0}
k = KT.kurve({tag(0): 1.0, tag(2): 0.0}, kurse, tag(0))
erwartet1 = (1 - 0.0005) * (1 + 0.10 - 0.0003)
erwartet2 = erwartet1 * (1 - 0.1 - 0.0003)
pruefe("Kurve: Long gilt ab dem Folgetag, Gebühr + Funding", abs(k[1][1] - erwartet1) < 1e-12 and abs(k[2][1] - erwartet2) < 1e-12, k)
pruefe("Kurve: Wechsel auf flach kostet Gebühr, dann ruhig", abs(k[3][1] - erwartet2 * (1 - 0.0005)) < 1e-12, k)
ks = KT.kurve({tag(0): -1.0}, kurse, tag(0))
pruefe("Short verdient an fallendem Kurs und erhält Funding", ks[2][1] > ks[1][1] and abs(ks[1][1] - (1 - 0.0005) * (1 - 0.10 + 0.0003)) < 1e-12)
ki = {"entscheide": [{"stand": tag(0), "btc": {"position": 1.0}, "eth": {"position": 0.0}}]}
pi = [{"markt": "BTC", "stand": tag(0), "hebel": 0.5}, {"markt": "ETH", "stand": tag(0), "hebel": 0.0}]
vgl = KT.vergleich(ki, pi, {"btc": kurse, "eth": {t: 50.0 for t in kurse}})
pruefe("Vergleich: drei Kurven ab Claudes Start", set(vgl) == {"Claude", "Pilot", "Halten"} and vgl["Claude"][0] == (tag(0), 1.0)
       and vgl["Claude"][1][1] > vgl["Pilot"][1][1] > 1.0, vgl)

# ── ganzer Lauf: einmal pro Tag, Logbuch ohne Schlüssel ──
with tempfile.TemporaryDirectory() as tmp:
    lbp = Path(tmp) / "ki.json"
    alt_pilot = KT.PILOT_LOGBUCH
    KT.PILOT_LOGBUCH = Path(tmp) / "pilot.json"
    try:
        fc = FakeClaude(gut)
        e = KT.lauf(client=fc, logbuch=lbp, kurse=reihen, lage_text="Angst&Gier 50", push=False)
        pruefe("Lauf: Entscheid gespeichert", e and json.loads(lbp.read_text())["entscheide"][0]["stand"] == tag(399))
        KT.lauf(client=fc, logbuch=lbp, kurse=reihen, lage_text="x", push=False)
        pruefe("zweiter Lauf am selben Stand fragt Claude nicht nochmal", len(fc.aufrufe) == 1)
        pruefe("Lagebericht enthält das Lagebild", "Angst&Gier 50" in fc.aufrufe[0]["messages"][0]["content"])
    finally:
        KT.PILOT_LOGBUCH = alt_pilot

# ── Cockpit: Daten, Webserver, Not-Aus ──
with tempfile.TemporaryDirectory() as tmp:
    alt = (C.DATA, C.STOP)
    C.DATA, C.STOP = Path(tmp), Path(tmp) / "STOP"
    try:
        (Path(tmp) / "krypto-pilot.json").write_text(json.dumps({"entscheide": [
            {"markt": "BTC", "stand": tag(5), "kurs": 60000, "hebel": 0.8, "trend_tage": 150, "schnitt": 55000},
            {"markt": "ETH", "stand": tag(5), "kurs": 3000, "hebel": 0.0, "hebel_roh": -0.6, "bremse": "MVRV unter 1: kein Short"}],
            "kontostand": [{"tag": tag(0), "kapital": 10000}, {"tag": tag(3), "kapital": 10500}, {"tag": tag(8), "kapital": 9975}]}))
        (Path(tmp) / "ki-bot-broker.json").write_text(json.dumps([
            {"zeit": "2026-01-06T02:30:00+00:00", "broker": "binance-futures", "modus": "testnetz", "symbol": "BTCUSDT", "trocken": False,
             "auftraege": [{"seite": "BUY", "menge": 0.05, "reduce_only": False, "status": "FILLED"}]},
            {"zeit": "2026-01-06T02:30:00+00:00", "broker": "alpaca", "auftraege": [{"seite": "buy"}]}]))
        s = C.stand(env={})
        pruefe("Cockpit: Märkte in fester Reihenfolge", [m["markt"] for m in s["maerkte"]] == ["BTC", "ETH"])
        pruefe("Cockpit: Konto seit Start −0,25 %, unter Hoch −5 %", abs(s["konto"]["seit_start"] + 0.0025) < 1e-12
               and abs(s["konto"]["unter_hoch"] + 0.05) < 1e-12, s["konto"])
        pruefe("Cockpit: nur Futures-Aufträge", len(s["auftraege"]) == 1 and s["auftraege"][0]["symbol"] == "BTCUSDT")
        pruefe("Cockpit: Testnetz-Anzeige ohne doppelte Freigabe", s["modus"] == "TESTNETZ"
               and C.stand(env={"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"})["modus"] == "ECHTGELD")
        pruefe("Cockpit: JSON ohne Schlüssel", "KEY" not in json.dumps(s))

        C.Cockpit.port = 0
        srv = ThreadingHTTPServer(("127.0.0.1", 0), C.Cockpit)
        C.Cockpit.port = srv.server_port
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        basis = f"http://127.0.0.1:{srv.server_port}"
        with urllib.request.urlopen(basis + "/") as r:
            html = r.read().decode()
        pruefe("Seite wird ausgeliefert", "Krypto-Cockpit" in html and "/api/stand" in html and 'href="/markt"' in html)
        with urllib.request.urlopen(basis + "/markt") as r:
            markt = r.read().decode()
        import re as _re
        hosts = set(_re.findall(r"(?:https|wss)://([a-z0-9.-]+)", markt))
        pruefe("Markt-Seite: nur Binance-Marktdaten + Chart-Bibliothek mit Prüfsumme", "integrity=\"sha384-" in markt
               and hosts <= {"data-api.binance.vision", "api.binance.com", "data-stream.binance.vision", "stream.binance.com", "cdn.jsdelivr.net"}, hosts)
        pruefe("Markt-Seite: Kerzen, Volumen, RSI, MACD, Orderbuch, Markttiefe, Trades", all(x in markt for x in
               ("addCandlestickSeries", "addHistogramSeries", "function rsi", "function macd", "@depth20", "/api/v3/depth", "@aggTrade")))
        with urllib.request.urlopen(basis + "/api/stand") as r:
            pruefe("API liefert Stand", json.load(r)["maerkte"][0]["markt"] == "BTC")

        def post(kopf, an=True):
            req = urllib.request.Request(basis + "/api/notaus", data=json.dumps({"an": an}).encode(), method="POST", headers=kopf)
            try:
                with urllib.request.urlopen(req) as r:
                    return r.status, json.load(r)
            except urllib.error.HTTPError as ex:
                return ex.code, None

        alt_an = C.notaus_an
        C.notaus_an = lambda: (C.STOP.write_text("x"), "🛑 Not-Aus aktiv.")[1]
        pruefe("Not-Aus ohne Cockpit-Kopf: verboten", post({"Content-Type": "application/json"})[0] == 403 and not C.STOP.exists())
        pruefe("Not-Aus von fremder Webseite: verboten", post({"X-Cockpit": "1", "Origin": "https://boese.example"})[0] == 403 and not C.STOP.exists())
        code, j = post({"X-Cockpit": "1", "Origin": basis})
        pruefe("Not-Aus aus dem Cockpit: STOP gesetzt", code == 200 and j["notaus"] and C.STOP.exists())
        code, j = post({"X-Cockpit": "1"}, an=False)
        pruefe("Not-Aus aufheben", code == 200 and not j["notaus"] and not C.STOP.exists())
        C.notaus_an = alt_an
        srv.shutdown()

        # echter Not-Aus-Ablauf mit nachgebautem Broker: schliesst je Markt, Gewicht 1/2
        aufrufe = []
        __import__("os").environ["KRYPTO_PILOT_MAERKTE"] = "BTC,ETH"  # unabhängig von der Einstellung auf dem PC
        meldung = C.notaus_an(ausfuehren=lambda e, symbol, gewicht: aufrufe.append((e["hebel"], symbol, gewicht)) or [{"seite": "SELL", "menge": 0.05}])
        pruefe("Not-Aus schliesst BTC und ETH (Ziel 0)", aufrufe == [(0.0, "BTCUSDT", 0.5), (0.0, "ETHUSDT", 0.5)] and C.STOP.exists()
               and "Geschlossen" in meldung, aufrufe)
        C.STOP.unlink()

        # ── Telegram: nur eigener Chat, alte Nachrichten übersprungen ──
        jetzt = int(datetime.now(timezone.utc).timestamp())

        class TG(BaseHTTPRequestHandler):
            gesendet, abrufe = [], 0

            def _a(self, o):
                b = json.dumps(o).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b)

            def do_GET(self):
                TG.abrufe += 1
                if TG.abrufe > 1:
                    return self._a({"ok": True, "result": []})
                return self._a({"ok": True, "result": [
                    {"update_id": 1, "message": {"chat": {"id": 999}, "date": jetzt, "text": "/stop"}},
                    {"update_id": 2, "message": {"chat": {"id": 42}, "date": jetzt - 3600, "text": "/stop"}},
                    {"update_id": 3, "message": {"chat": {"id": 42}, "date": jetzt, "text": "/hilfe"}},
                    {"update_id": 4, "message": {"chat": {"id": 42}, "date": jetzt, "text": "/weiter@MeinBot"}}]})

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                TG.gesendet.append(dict(urllib.parse.parse_qsl(self.rfile.read(n).decode())))
                self._a({"ok": True})

            def log_message(self, *a):
                pass

        tg = HTTPServer(("127.0.0.1", 0), TG)
        threading.Thread(target=tg.serve_forever, daemon=True).start()
        C.STOP.write_text("x")
        C.telegram_schleife(env={"TELEGRAM_BOT_TOKEN": "T0KEN", "TELEGRAM_CHAT_ID": "42"}, basis=f"http://127.0.0.1:{tg.server_port}", runden=1, warte=0)
        pruefe("Telegram: fremder Chat und alte Nachricht ignoriert, /hilfe + /weiter beantwortet",
               [x["chat_id"] for x in TG.gesendet] == ["42", "42"] and "/status" in TG.gesendet[0]["text"] and "aufgehoben" in TG.gesendet[1]["text"],
               TG.gesendet)
        pruefe("Telegram: /weiter hebt Not-Aus auf, fremdes /stop wirkte nicht", not C.STOP.exists())
        pruefe("Telegram: unbekannter Text wird ignoriert", C.befehl("hallo") is None and C.befehl("") is None)
        tg.shutdown()
    finally:
        C.DATA, C.STOP = alt

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
