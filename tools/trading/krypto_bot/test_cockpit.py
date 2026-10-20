#!/usr/bin/env python3
"""Tests für KI-Trader (Claude), Cockpit und Telegram-Steuerung — ohne Netz, ohne Schlüssel:
python3 tools/trading/krypto_bot/test_cockpit.py"""
from __future__ import annotations

import json
import sys
import tempfile
import threading
import time
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
import testumgebung  # noqa: E402

testumgebung.schalter_umbiegen()  # offene Telegram-Calls des Nutzers dürfen den Not-Aus-Test nicht ändern
NACHKONTROLLE = []  # der Test startet nie die echte Nachkontrolle (auf dem PC liegt vielleicht ein Pilot-2.0-Buch)
_NK_ECHT, C.nachkontrolle_starten = C.nachkontrolle_starten, lambda: (NACHKONTROLLE.append(1), True)[1]

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
pi_btc = [{"markt": "BTC", "stand": tag(0), "hebel": 1.0}]  # KRYPTO_PILOT_MAERKTE=BTC: ganzes Konto in Bitcoin
v_btc = KT.vergleich(ki, pi_btc, {"btc": kurse, "eth": {t: 50.0 for t in kurse}})
pruefe("Pilot nur Bitcoin: volles Gewicht auf BTC (nicht halbiert mit flacher ETH-Hälfte)", abs((v_btc["Pilot"][1][1] - 1) - 2 * (vgl["Claude"][1][1] - 1)) < 1e-9, (v_btc["Pilot"][:2], vgl["Claude"][:2]))
kurse_hz = {tag(0): 100.0, tag(1): 100.0, tag(2): 200.0, tag(3): 100.0}  # BTC verdoppelt sich und fällt zurück, ETH ruhig
pi_hz = [{"markt": "BTC", "stand": tag(0), "hebel": 1.0}, {"markt": "ETH", "stand": tag(0), "hebel": 1.0}]
v_hz = KT.vergleich({"entscheide": [{"stand": tag(0), "btc": {"position": 0.0}, "eth": {"position": 0.0}}]}, pi_hz,
                    {"btc": kurse_hz, "eth": {t: 50.0 for t in kurse_hz}})
pruefe("Vergleich: Pilot jeden Tag 50/50 neu aufgeteilt wie live (+50 %, dann −25 %), Halten bleibt liegen (zurück auf 1)",
       abs(v_hz["Pilot"][3][1] / v_hz["Pilot"][1][1] - 1.5 * 0.75) < 0.002 and abs(v_hz["Halten"][3][1] - v_hz["Halten"][1][1]) < 1e-9, v_hz)

# ── ganzer Lauf: einmal pro Tag, Logbuch ohne Schlüssel ──
with tempfile.TemporaryDirectory() as tmp:
    lbp = Path(tmp) / "ki.json"
    alt_pilot = KT.PILOT_LOGBUCH
    KT.PILOT_LOGBUCH = Path(tmp) / "pilot.json"
    try:
        fc = FakeClaude(gut)
        e = KT.lauf(client=fc, logbuch=lbp, kurse=reihen, lage_text="Angst&Gier 50", push=False)
        pruefe("Lauf: Entscheid gespeichert", e and json.loads(lbp.read_text(encoding="utf-8"))["entscheide"][0]["stand"] == tag(399))
        KT.lauf(client=fc, logbuch=lbp, kurse=reihen, lage_text="x", push=False)
        pruefe("zweiter Lauf am selben Stand fragt Claude nicht nochmal", len(fc.aufrufe) == 1)
        pruefe("Lagebericht enthält das Lagebild", "Angst&Gier 50" in fc.aufrufe[0]["messages"][0]["content"])
    finally:
        KT.PILOT_LOGBUCH = alt_pilot

# ── Cockpit: Daten, Webserver, Not-Aus ──
with tempfile.TemporaryDirectory() as tmp:
    alt = (C.DATA, C.STOP, C.PAUSE)
    C.DATA, C.STOP, C.PAUSE = Path(tmp), Path(tmp) / "STOP", Path(tmp) / "PAUSE"
    import sperre as Sp
    alt_sperre = Sp.ORDNER
    Sp.ORDNER = Path(tmp)
    try:
        (Path(tmp) / "krypto-pilot.json").write_text(json.dumps({"entscheide": [
            {"markt": "BTC", "stand": tag(5), "kurs": 60000, "hebel": 0.8, "trend_tage": 150, "schnitt": 55000},
            {"markt": "ETH", "stand": tag(5), "kurs": 3000, "hebel": 0.0, "hebel_roh": -0.6, "bremse": "MVRV unter 1: kein Short"}],
            "kontostand": [{"tag": tag(0), "kapital": 10000}, {"tag": tag(3), "kapital": 10500}, {"tag": tag(8), "kapital": 9975}]}))
        (Path(tmp) / "ki-bot-broker.json").write_text(json.dumps([
            {"zeit": "2026-01-06T02:30:00+00:00", "broker": "binance-futures", "modus": "testnetz", "symbol": "BTCUSDT", "trocken": False,
             "auftraege": [{"seite": "BUY", "menge": 0.05, "reduce_only": False, "status": "FILLED"},
                           {"seite": "BUY", "menge": 0.05, "reduce_only": False, "fehler": "HTTP 400: Margin is insufficient."}]},
            {"zeit": "2026-01-06T02:30:00+00:00", "broker": "alpaca", "auftraege": [{"seite": "buy"}]}]))
        s = C.stand(env={})
        pruefe("Cockpit: Märkte in fester Reihenfolge", [m["markt"] for m in s["maerkte"]] == ["BTC", "ETH"])
        pruefe("Cockpit: Konto seit Start −0,25 %, unter Hoch −5 %", abs(s["konto"]["seit_start"] + 0.0025) < 1e-12
               and abs(s["konto"]["unter_hoch"] + 0.05) < 1e-12, s["konto"])
        pruefe("Cockpit: nur Futures-Aufträge", len(s["auftraege"]) == 2 and s["auftraege"][0]["symbol"] == "BTCUSDT")
        pruefe("abgelehnter Auftrag ist als Fehler markiert (Live-Chart zeigt dafür keinen «Bot kauft»-Pfeil)",
               [a_["fehler"] for a_ in s["auftraege"]] == [False, True] and "!a.fehler" in (HIER / "markt.html").read_text(encoding="utf-8"))
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
        abrufe = []
        alt_ps = C.profit_stand
        C._PROFIT.update({"zeit": 0.0, "daten": None})
        C.profit_stand = lambda: alt_ps(abrufen=lambda: abrufe.append(1) or {"modus": "TESTNETZ", "zeitraeume": {}, "positionen": []})
        for _ in range(3):
            with urllib.request.urlopen(basis + "/api/profit") as r:
                pj = json.load(r)
        C.profit_stand = alt_ps
        pruefe("Profit-API: drei Aufrufe, nur ein Abruf beim Konto (Zwischenspeicher)", pj["modus"] == "TESTNETZ" and len(abrufe) == 1, abrufe)
        C._PROFIT.update({"zeit": 0.0, "daten": None})
        pruefe("Profit-API: Fehler beim Abruf → Hinweis statt Absturz", "nicht lesbar" in C.profit_stand(abrufen=lambda: 1 / 0)["hinweis"])
        C._PROFIT.update({"zeit": 0.0, "daten": None})
        pruefe("Cockpit-Seite hat die Profit-Anzeige", 'aria-label="Profit"' in html and "/api/profit" in html)

        def post(kopf, an=True):
            req = urllib.request.Request(basis + "/api/notaus", data=json.dumps({"an": an}).encode(), method="POST", headers=kopf)
            try:
                with urllib.request.urlopen(req) as r:
                    return r.status, json.load(r)
            except urllib.error.HTTPError as ex:
                return ex.code, None

        def mit_host(pfad, host, methode="GET", kopf=None):
            import http.client as _hc
            k = _hc.HTTPConnection("127.0.0.1", srv.server_port, timeout=10)
            k.putrequest(methode, pfad, skip_host=True)
            k.putheader("Host", host)
            for n_, w_ in (kopf or {}).items():
                k.putheader(n_, w_)
            k.putheader("Content-Length", "2" if methode == "POST" else "0")
            k.endheaders(b"{}" if methode == "POST" else None)
            r_ = k.getresponse()
            antwort = (r_.status, dict(r_.getheaders()), r_.read())
            k.close()
            return antwort

        st_r, kopf_r, _ = mit_host("/api/profit", f"rebind.boese.example:{srv.server_port}")
        pruefe("DNS-Rebinding: fremder Host-Kopf bekommt keine Kontodaten (403)", st_r == 403, st_r)
        pruefe("DNS-Rebinding: auch POST mit fremdem Host verboten", mit_host("/api/notaus", "boese.example", "POST", {"X-Cockpit": "1"})[0] == 403
               and not C.STOP.exists())
        st_l, kopf_l, _ = mit_host("/", f"localhost:{srv.server_port}")
        pruefe("localhost:Port ist erlaubt", st_l == 200)
        pruefe("Clickjacking: Seite verbietet das Einbetten (X-Frame-Options + CSP + Skript)", kopf_l.get("X-Frame-Options") == "DENY"
               and "frame-ancestors 'none'" in kopf_l.get("Content-Security-Policy", "") and "window.top !== window.self" in html
               and "window.top !== window.self" in markt, kopf_l)
        pruefe("Auto-Handel einschalten fragt nach (kein Ein-Klick-Aufheben des Not-Aus)", "auto_an: d =>" in html)

        alt_an = C.notaus_an
        C.notaus_an = lambda: (C.STOP.write_text("x"), "🛑 Not-Aus aktiv.")[1]
        pruefe("Not-Aus ohne Cockpit-Kopf: verboten", post({"Content-Type": "application/json"})[0] == 403 and not C.STOP.exists())
        pruefe("Not-Aus von fremder Webseite: verboten", post({"X-Cockpit": "1", "Origin": "https://boese.example"})[0] == 403 and not C.STOP.exists())
        code, j = post({"X-Cockpit": "1", "Origin": basis})
        pruefe("Not-Aus aus dem Cockpit: STOP gesetzt", code == 200 and j["notaus"] and C.STOP.exists())
        code, j = post({"X-Cockpit": "1"}, an=False)
        pruefe("Not-Aus aufheben", code == 200 and not j["notaus"] and not C.STOP.exists())
        C.notaus_an = lambda: "🛑 Not-Aus aktiv — ⚠️ NICHT ALLES GESCHLOSSEN!\n❌ BTC: unklar"
        post({"X-Cockpit": "1"})
        pruefe("gescheiterter Not-Aus steht im Protokoll NICHT als Erfolg", C.PROTOKOLL[0]["aktion"] == "notaus" and C.PROTOKOLL[0]["ok"] is False,
               C.PROTOKOLL[0])
        post({"X-Cockpit": "1"}, an=False)
        C.notaus_an = alt_an
        pruefe("Not-Aus-Knopf: Fehler laut statt stumm (Server weg)", "Not-Aus NICHT ausgelöst" in html and "knopf.disabled = true" in html)

        # ── Knöpfe ──
        gestartet = []

        def starter(args, zeit):
            gestartet.append(args)
            return True, f"lief: {' '.join(args)}\n9 bestanden, 0 fehlgeschlagen"

        e = C.aktion("probe", starter)
        pruefe("Knopf Probelauf startet pilot.py --lauf --trocken", gestartet[-1] == ["pilot.py", "--lauf", "--trocken"] and e["ok"]
               and C.PROTOKOLL[0]["aktion"] == "probe", gestartet)
        import broker_futures as BFm
        alt_bf, geschlossen = BFm.ausfuehren, []
        BFm.ausfuehren = lambda *a, **k: geschlossen.append(k) or []
        e = C.aktion("auto_aus", starter)
        BFm.ausfuehren = alt_bf
        pruefe("Auto aus: PAUSE gesetzt (nicht Not-Aus), nichts geschlossen, kein Skript", C.PAUSE.exists() and not C.STOP.exists()
               and "Auto-Handel aus" in e["text"] and len(gestartet) == 1 and geschlossen == [], (e["text"], geschlossen))
        e = C.aktion("handeln", starter)
        pruefe("Jetzt handeln bei Auto aus: verweigert", not e["ok"] and len(gestartet) == 1 and "Pause" in e["text"])
        e = C.aktion("auto_an", starter)
        pruefe("Auto an: PAUSE und STOP weg", not C.STOP.exists() and not C.PAUSE.exists() and "Auto-Handel an" in e["text"])
        import pilot_kern as Km
        alt_einst = Km.EINSTELLUNGEN
        Km.EINSTELLUNGEN = Path(tmp) / "krypto-einstellungen.json"
        try:
            __import__("os").environ.pop("KRYPTO_RISIKO", None)
            e = C.aktion("risiko_2", starter)
            pruefe("Knopf Risiko 2×: Einstellung gespeichert, Pilot liest sie", e["ok"] and json.loads(Km.EINSTELLUNGEN.read_text(encoding="utf-8"))["risiko"] == 2.0
                   and Km.risiko()["max_hebel"] == 2.0 and "Achtung" in e["text"], e["text"])
            pruefe("Cockpit zeigt die Stufe", C.stand(env={})["risiko"]["stufe"] == 2.0)
            C.aktion("risiko_1", starter)
            pruefe("zurück auf 1×, Stufen-Knöpfe starten kein Skript", Km.risiko()["stufe"] == 1.0 and len(gestartet) == 1)
        finally:
            Km.EINSTELLUNGEN = alt_einst
        NACHKONTROLLE.clear()
        C.aktion("handeln", starter)
        pruefe("Jetzt handeln startet pilot.py --lauf", gestartet[-1] == ["pilot.py", "--lauf"])
        # (16. Prüfung) wie krypto-auto.bat: nach dem Lauf folgt die Nachkontrolle von Pilot 2.0 (sonst bleibt ein beim Lauf unklar gebliebener oder ausgefallener Stop bis morgen offen)
        pruefe("Jetzt handeln startet danach die Nachkontrolle von Pilot 2.0", NACHKONTROLLE == [1], NACHKONTROLLE)
        NACHKONTROLLE.clear()
        e = C.aktion("selbsttest", starter)
        n_t = len(C.SELBSTTESTS)
        pruefe("Selbsttest: alle Testdateien, letzte Zeile je Datei", [g[0] for g in gestartet[-n_t:]] == C.SELBSTTESTS
               and e["text"].count("9 bestanden") == n_t and "test_profit.py" in C.SELBSTTESTS)
        C._BACKTEST["k"] = None  # beim Start fehlten die Kursdateien
        C.aktion("backtest", starter)
        pruefe("Backtest-Knopf: Diagramm wird danach neu gerechnet (nicht erst nach Neustart)", "k" not in C._BACKTEST)
        C._LAUFEND["ki"] = 0
        e = C.aktion("ki", starter)
        pruefe("Doppelklick: läuft schon → besetzt, kein zweiter Start", e.get("besetzt") and gestartet[-1][0] != "ki_trader.py")
        C._LAUFEND.pop("ki")

        befehle = []

        def fake_befehl(cmd, zeit):
            befehle.append(cmd)
            return True, "ERFOLG: Die geplante Aufgabe wurde erstellt." if cmd[0] == "schtasks" else "Already up to date."

        xml_inhalt = []

        def fake_befehl(cmd, zeit):
            befehle.append(cmd)
            if "/xml" in cmd:
                xml_inhalt.append(Path(cmd[cmd.index("/xml") + 1]).read_text(encoding="utf-16"))
            return True, "ERFOLG: Die geplante Aufgabe wurde erstellt." if cmd[0] == "schtasks" else "Already up to date."

        C._AUFGABE_CACHE.update({"zeit": time.time(), "wert": False})
        e = C.aktion("aufgabe", befehl=fake_befehl)
        cmd, x = befehle[-1], xml_inhalt[-1] if xml_inhalt else ""
        pruefe("Aufgabe per XML: täglich 02:30, auch auf Akku, verpasste Läufe nachholen, krypto-auto.bat «auto», ersetzt (/f)",
               cmd[:2] == ["schtasks", "/create"] and cmd[cmd.index("/tn") + 1] == "Krypto-Pilot" and "/f" in cmd
               and "T02:30:00" in x and "<DisallowStartIfOnBatteries>false" in x and "<StartWhenAvailable>true" in x
               and "<StopIfGoingOnBatteries>false" in x and "krypto-auto.bat</Command>" in x and "<Arguments>auto</Arguments>" in x
               and e["ok"] and "Akku" in e["text"], (cmd, x[:200]))
        pruefe("Aufgaben-XML ist gültiges XML (Pfad maskiert)", __import__("xml.dom.minidom").dom.minidom.parseString(x.split("?>", 1)[1].strip()) is not None)
        pruefe("Ampel «Täglicher Start» wird nach dem Einrichten sofort neu geprüft", C._AUFGABE_CACHE["zeit"] == 0.0)

        def nur_einfach(cmd, zeit):
            befehle.append(cmd)
            return ("/xml" not in cmd), "FEHLER: XML" if "/xml" in cmd else "ERFOLG"

        e = C.aktion("aufgabe", befehl=nur_einfach)
        cmd = befehle[-1]
        pruefe("XML scheitert → einfache Aufgabe, ehrlich mit Akku-Hinweis", e["ok"] and cmd[cmd.index("/sc") + 1] == "daily"
               and cmd[cmd.index("/st") + 1] == "02:30" and cmd[cmd.index("/tr") + 1] == f'"{C.HIER / "krypto-auto.bat"}" auto'
               and "nicht auf Akku" in e["text"], (cmd, e["text"]))
        e = C.aktion("aufgabe", befehl=lambda c, z: (False, "Zugriff verweigert"))
        pruefe("beides scheitert: Fehler mit Grund", not e["ok"] and "Zugriff verweigert" in e["text"])
        # ── (17. Prüfung W4) zweite Aufgabe: die Nachkontrolle von Pilot 2.0 hat einen eigenen Takt (alle 10 Minuten + Anmeldung) ──
        xml_nk = C.aufgabe_xml_nk(benutzer="MEINPC\\Hans & Co")
        xml_nk_ohne = C.aufgabe_xml_nk(benutzer="")
        pruefe("Nachkontroll-Aufgabe: gültiges XML, alle 10 Minuten (PT10M) UND bei der Anmeldung, über den UNSICHTBAREN Starter (wscript //B), nie zwei Instanzen, auch auf Akku",
               __import__("xml.dom.minidom").dom.minidom.parseString(xml_nk.split("?>", 1)[1].strip()) is not None
               and "<Interval>PT10M</Interval>" in xml_nk and "<LogonTrigger><Enabled>true</Enabled><UserId>MEINPC\\Hans &amp; Co</UserId></LogonTrigger>" in xml_nk
               and "<Command>wscript.exe</Command>" in xml_nk and "//B //Nologo" in xml_nk and "krypto-nachkontrolle-still.vbs" in xml_nk
               and "<MultipleInstancesPolicy>IgnoreNew" in xml_nk and "<DisallowStartIfOnBatteries>false" in xml_nk, xml_nk[:300])
        pruefe("Nachkontroll-Aufgabe: der Anmelde-Auslöser trägt den Benutzer (sonst Administratorrechte nötig: die XML-Variante scheiterte); ohne bekannten Benutzer fehlt er, das XML bleibt gültig und die 10-Minuten-Wiederholung steht",
               "<LogonTrigger>" not in xml_nk_ohne and "<Interval>PT10M</Interval>" in xml_nk_ohne
               and __import__("xml.dom.minidom").dom.minidom.parseString(xml_nk_ohne.split("?>", 1)[1].strip()) is not None, xml_nk_ohne[:400])
        os_umgebung17 = {k_: __import__("os").environ.get(k_) for k_ in ("USERDOMAIN", "USERNAME")}
        try:
            __import__("os").environ["USERDOMAIN"], __import__("os").environ["USERNAME"] = "TESTPC", "Anna"
            benutzer_env17 = C._anmelde_benutzer()
            __import__("os").environ.pop("USERDOMAIN")
            benutzer_ohne17 = C._anmelde_benutzer()
        finally:
            for k_, v_ in os_umgebung17.items():
                if v_ is None:
                    __import__("os").environ.pop(k_, None)
                else:
                    __import__("os").environ[k_] = v_
        pruefe("_anmelde_benutzer: USERDOMAIN\\USERNAME, ohne eines von beiden None", benutzer_env17 == "TESTPC\\Anna" and benutzer_ohne17 is None, (benutzer_env17, benutzer_ohne17))
        befehle.clear()
        e = C.aktion("aufgabe", befehl=fake_befehl)
        namen = [c[c.index("/tn") + 1] for c in befehle if "/tn" in c]
        pruefe("Aufgabe einrichten legt beide an: zuerst die Nachkontrolle, zuletzt die tägliche (deren Befehl bleibt der letzte)",
               namen == ["Krypto-Pilot-Nachkontrolle", "Krypto-Pilot"] and e["ok"] and "alle 10 Minuten" in e["text"], (namen, e["text"]))
        befehle.clear()
        e = C.aktion("aufgabe", befehl=nur_einfach)
        pruefe("XML scheitert: auch die Nachkontrolle bekommt die einfache Variante (alle 10 Minuten, /sc minute)",
               any(c[:2] == ["schtasks", "/create"] and "minute" in c and c[c.index("/mo") + 1] == "10" and c[c.index("/tn") + 1] == "Krypto-Pilot-Nachkontrolle"
                   and c[c.index("/tr") + 1].startswith("wscript.exe //B //Nologo ") and "krypto-nachkontrolle-still.vbs" in c[c.index("/tr") + 1] for c in befehle)
               and e["ok"], (befehle, e["text"]))

        pruefe("(18. Prüfung K5) die einfache Variante der Nachkontroll-Aufgabe sagt, was ihr fehlt: «auch auf Akku» und «verpassten Lauf nachholen»", "Akku" in e["text"] and "nachholen" in e["text"], e["text"])

        def nk_scheitert(cmd, zeit):
            befehle.append(cmd)
            return ("Nachkontrolle" not in " ".join(cmd)), "FEHLER: nicht erlaubt" if "Nachkontrolle" in " ".join(cmd) else "ERFOLG"
        e = C.aktion("aufgabe", befehl=nk_scheitert)
        pruefe("Scheitert nur die Nachkontroll-Aufgabe, geht die tägliche trotzdem — mit lauter Warnung", e["ok"] and "Nachkontroll-Aufgabe ließ sich nicht einrichten" in e["text"] and "täglich 02:30" in e["text"], e["text"])
        bat_text = (C.HIER / "krypto-auto.bat").read_text(encoding="utf-8")
        i_nk = bat_text.index("\n:nachkontrolle_allein\n") + 1  # die Marke selbst (nicht der goto davor)
        abschnitt = bat_text[i_nk:bat_text.index("\n:schritt", i_nk)]
        pruefe("krypto-auto.bat: Modus «nachkontrolle» springt zum Abschnitt (ohne Klammerblock: dort würde %PY% beim Einlesen leer ersetzt) und startet pilot.py --nachkontrolle nur mit Buch",
               'if /i "%~1"=="nachkontrolle" goto :nachkontrolle_allein' in bat_text and "(" not in abschnitt and "krypto-pilot2-bestand.json" in abschnitt
               and "pilot.py --nachkontrolle" in abschnitt and "exit /b" in abschnitt, abschnitt)
        pruefe("krypto-auto.bat «nachkontrolle»: das Lebenszeichen (data\\krypto-nachkontrolle-lebt.txt) steht VOR der Prüfung auf das Buch — es kommt bei jedem Start, auch ohne Pilot 2.0",
               abschnitt.index("krypto-nachkontrolle-lebt.txt") < abschnitt.index("krypto-pilot2-bestand.json") and C.NK_LEBT == "krypto-nachkontrolle-lebt.txt", abschnitt)
        vbs_b = (C.HIER / C.NK_STARTER).read_bytes()
        vbs_t = vbs_b.decode("ascii")
        pruefe("Starter krypto-nachkontrolle-still.vbs: nur ASCII, Windows-Zeilenenden, startet krypto-auto.bat «nachkontrolle» im Ordner des Skripts mit Fensterstil 0 (unsichtbar) und wartet",
               all(c_ < 128 for c_ in vbs_b) and vbs_b.count(b"\n") == vbs_b.count(b"\r\n") > 5 and "Option Explicit" in vbs_t and "WScript.ScriptFullName" in vbs_t
               and '"\\krypto-auto.bat"" nachkontrolle"""' in vbs_t and ", 0, True)" in vbs_t and "WScript.Quit rc" in vbs_t, vbs_t)
        # Die Anführungszeichen des Starters (kein Windows hier zum Ausprobieren): die VBScript-Zeichenketten werden wie VBScript gelesen («""» = ein Anführungszeichen) und zusammengesetzt — mit einem Ordner MIT Leerzeichen
        zeile_run = next(z_ for z_ in vbs_t.splitlines() if "sh.Run(" in z_)
        ausdruck17 = zeile_run[zeile_run.index("sh.Run(") + 7: zeile_run.rindex(", 0, True)")]

        def vb17(teil_):
            if teil_ == "ordner":
                return "C:\\Pfad mit Leerzeichen\\krypto_bot"
            assert teil_.startswith('"') and teil_.endswith('"'), teil_
            return teil_[1:-1].replace('""', '"')
        befehl17 = "".join(vb17(x_.strip()) for x_ in ausdruck17.split(" & "))
        pruefe("Starter: die Befehlszeile lautet cmd /c \"<Ordner>\\krypto-auto.bat\" nachkontrolle mit äusseren Anführungszeichen (sonst scheitern Pfade mit Leerzeichen)",
               befehl17 == 'cmd /c ""C:\\Pfad mit Leerzeichen\\krypto_bot\\krypto-auto.bat" nachkontrolle"', befehl17)
        n_b = len(befehle)
        e = C.aktion("update", befehl=fake_befehl)
        pruefe("Update: erst Kurs-Zwischenspeicher zurücksetzen (sonst blockiert git pull), dann git pull --ff-only",
               befehle[n_b:] == [["git", "checkout", "--", "tools/trading/daten"], ["git", "pull", "--ff-only"]] and e["ok"]
               and "neu starten" not in e["text"], befehle[n_b:])
        e = C.aktion("update", befehl=lambda c, z: (True, "Updating abc..def\nFast-forward"))
        pruefe("Update mit neuer Version: Hinweis Cockpit neu starten", "neu starten" in e["text"])
        pruefe("krypto-auto.bat «nachkontrolle» (18. Prüfung W3′/K5): EIN Durchgang (--einmal, kein 11-Minuten-Warten mit gehaltener Sperre), der Rückgabewert steht in data\\krypto-nachkontrolle-rc.txt, die Umleitung steht VOR dem Befehl (eine Ziffer davor gälte als Handle)",
               "pilot.py --nachkontrolle --einmal" in abschnitt and C.NK_RC == "krypto-nachkontrolle-rc.txt" and f'>"data\\{C.NK_RC}" echo' in abschnitt and "rc=%NKRC%" in abschnitt and "exit /b %NKRC%" in abschnitt
               and abschnitt.index("--einmal") < abschnitt.index(C.NK_RC) and f'>"data\\{C.NK_LEBT}" echo' in abschnitt, abschnitt)
        gi_text = (C.HIER.parents[2] / ".gitignore").read_text(encoding="utf-8")
        pruefe("(18. Prüfung) die Laufzeit-Dateien der Nachkontroll-Aufgabe (Lebenszeichen, Rückgabewert, Push-Drosselung, Log) stehen in .gitignore — sonst wären sie auf dem PC des Users «ungetrackt» und störten das Aktualisieren",
               "data/krypto-nachkontrolle*" in gi_text.splitlines() and C.NK_LEBT.startswith("krypto-nachkontrolle") and C.NK_RC.startswith("krypto-nachkontrolle"))
        e = C.aktion("update", befehl=lambda c, z: (False, "error: Your local changes would be overwritten"))
        pruefe("Update gescheitert: verständlicher Hinweis", not e["ok"] and "eigene Änderungen" in e["text"])
        pruefe("Aufgabe vorhanden? (schtasks /query)", C.aufgabe_da(lambda c, z: (c[:2] == ["schtasks", "/query"], "")) is True)
        abgefragt = []
        pruefe("Nachkontroll-Aufgabe vorhanden? (schtasks /query /tn Krypto-Pilot-Nachkontrolle)",
               C.aufgabe_da(lambda c, z: (abgefragt.append(c) or True, ""), name=C.AUFGABE_NK) is True and abgefragt[-1][abgefragt[-1].index("/tn") + 1] == "Krypto-Pilot-Nachkontrolle", abgefragt)
        # Ampel «Nachkontrolle (Aufgabenplanung)» (Windows-Zweig von gesundheit(), hier mit vorgetäuschtem os.name == "nt", einer Aufgabenplanung, die nur die gewünschten Aufgaben kennt, und einem eigenen data/-Ordner):
        # die Aufgabe läuft UNSICHTBAR — ihr Lebenszeichen (data/krypto-nachkontrolle-lebt.txt) macht einen stillen Ausfall sichtbar
        import os as _os17

        class _NT17:
            name = "nt"

            def __getattr__(self, a_):
                return getattr(_os17, a_)
        alt_os17, alt_bef17, alt_cache17, alt_data17 = C.os, C._befehl, dict(C._AUFGABE_CACHE), C.DATA
        with tempfile.TemporaryDirectory() as td17:
            C.DATA = Path(td17)
            lebt17 = Path(td17) / C.NK_LEBT
            try:
                for fall17, da17, alter17, erwartet17, wort17 in (("frisches Lebenszeichen", True, 3 * 60, True, "zuletzt vor"), ("noch kein Lebenszeichen", True, None, None, "noch kein Lauf"),
                                                                  ("Lebenszeichen seit 45 Minuten alt", True, 45 * 60, False, "kein Lauf"), ("Aufgabe fehlt", False, 3 * 60, False, "fehlt")):
                    lebt17.unlink(missing_ok=True)
                    if alter17 is not None:
                        lebt17.write_text("x")
                        _os17.utime(lebt17, (time.time() - alter17, time.time() - alter17))
                    C.os = _NT17()
                    C._AUFGABE_CACHE.update({"zeit": 0.0, "wert": None, "wert_nk": None})
                    C._befehl = lambda cmd, zeit, da=da17: ((da if "Krypto-Pilot-Nachkontrolle" in cmd else True), "")
                    gnk17 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
                    zeile17 = gnk17.get("Nachkontrolle (Aufgabenplanung)")
                    pruefe(f"Ampel «Nachkontrolle (Aufgabenplanung)», {fall17}: {erwartet17} — und die tägliche Aufgabe bleibt grün",
                           zeile17 is not None and zeile17["ok"] is erwartet17 and wort17 in zeile17["text"] and gnk17["Täglicher Start (Aufgabenplanung)"]["ok"] is True, (zeile17, gnk17.get("Täglicher Start (Aufgabenplanung)")))
                # (18. Prüfung K5) das Lebenszeichen schreibt die Bat VOR Python: ein abstürzendes `pilot.py --nachkontrolle` liess die Ampel grün. Jetzt wertet sie zusätzlich den Rückgabewert (NK_RC):
                # 0 und 3 (Warnung, schon gemeldet) sind in Ordnung, alles andere ist ein Absturz → rot; ein veralteter Rückgabewert (älter als NK_LEBT_MAX_MIN) zählt nicht
                rc_datei18 = Path(td17) / C.NK_RC
                for fall18, rc_text18, rc_alter18, erwartet18, wort18 in (("rc=0 frisch", "Tue 20.10.2026 18:30:01,12 rc=0", 60, True, "zuletzt vor"), ("rc=3 frisch (Warnung, schon gemeldet)", "x rc=3", 60, True, "zuletzt vor"),
                                                                          ("rc=1 frisch (Absturz)", "x rc=1", 60, False, "Rückgabewert 1"), ("rc=9009 frisch", "x rc=9009", 60, False, "Rückgabewert 9009"),
                                                                          ("rc=1, aber 45 Minuten alt (veraltet)", "x rc=1", 45 * 60, True, "zuletzt vor"), ("rc-Datei ohne rc=", "kaputt", 60, True, "zuletzt vor")):
                    lebt17.write_text("x")
                    _os17.utime(lebt17, (time.time() - 3 * 60, time.time() - 3 * 60))
                    rc_datei18.write_text(rc_text18)
                    _os17.utime(rc_datei18, (time.time() - rc_alter18, time.time() - rc_alter18))
                    C.os = _NT17()
                    C._AUFGABE_CACHE.update({"zeit": 0.0, "wert": None, "wert_nk": None})
                    C._befehl = lambda cmd, zeit: (True, "")
                    gnk18 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
                    zeile18 = gnk18.get("Nachkontrolle (Aufgabenplanung)")
                    pruefe(f"Ampel «Nachkontrolle (Aufgabenplanung)», Rückgabewert der Bat: {fall18} → {'grün' if erwartet18 else 'rot'}", zeile18 is not None and zeile18["ok"] is erwartet18 and wort18 in zeile18["text"], zeile18)
                rc_datei18.unlink(missing_ok=True)
            finally:
                C.os, C._befehl, C.DATA = alt_os17, alt_bef17, alt_data17
                C._AUFGABE_CACHE.clear()
                C._AUFGABE_CACHE.update(alt_cache17)
        ok_b, out_b = C._befehl(["programm-das-es-nicht-gibt-xyz"], 5)
        pruefe("unbekanntes Programm: Meldung statt Absturz", not ok_b and "nicht gefunden" in out_b)
        heute = datetime(2026, 1, 20, tzinfo=timezone.utc).date()
        g = C.gesundheit({}, {"entscheide": [{"stand": tag(5)}]}, {}, heute)
        gd = {x["name"]: x for x in g}
        pruefe("Gesundheit: fehlender Futures-Schlüssel = rot, alter Lauf = rot, optionale = grau",
               gd["Futures-Schlüssel (Pilot)"]["ok"] is False and gd["Letzter Pilot-Lauf"]["ok"] is False and "Tage alt" in gd["Letzter Pilot-Lauf"]["text"]
               and gd["Claude (KI-Trader)"]["ok"] is None and gd["Not-Aus"]["ok"] is True, g)
        g2 = {x["name"]: x for x in C.gesundheit({"BINANCE_FUTURES_API_KEY": "k", "BINANCE_FUTURES_API_SECRET": "s", "KI_BOT_NTFY": "t"},
                                                  {"entscheide": [{"stand": "2026-01-19"}]}, {}, heute)}
        pruefe("Gesundheit: Schlüssel da, Lauf frisch, ntfy erkannt", g2["Futures-Schlüssel (Pilot)"]["ok"] and g2["Letzter Pilot-Lauf"]["ok"]
               and g2["Handy-Nachrichten"]["text"] == "ntfy", g2)
        pruefe("Gesundheit: Schlüssel selbst nie in der Anzeige", '"s"' not in json.dumps(g2) and "KEY" not in json.dumps(C.stand(env={"BINANCE_FUTURES_API_KEY": "KEY-XYZ"})["gesundheit"]))

        def http_aktion(kopf, name):
            req = urllib.request.Request(basis + "/api/aktion", data=json.dumps({"aktion": name}).encode(), method="POST", headers=kopf)
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    return r.status, json.load(r)
            except urllib.error.HTTPError as ex:
                return ex.code, None

        pruefe("Aktion ohne Cockpit-Kopf: verboten", http_aktion({}, "probe")[0] == 403)
        pruefe("Unbekannte Aktion (z. B. Befehl einschleusen): abgelehnt", http_aktion({"X-Cockpit": "1"}, "rm -rf /")[0] == 400)
        alt_skript = C._skript
        langsam = threading.Event()

        def langsamer_starter(args, zeit):
            langsam.wait(5)
            return starter(args, zeit)

        C._skript = langsamer_starter
        code, j = http_aktion({"X-Cockpit": "1", "Origin": basis}, "backtest")
        pruefe("Aktion über HTTP: startet im Hintergrund (202)", code == 202 and j["gestartet"] == "backtest", (code, j))
        with urllib.request.urlopen(basis + "/api/protokoll") as r:
            pr = json.load(r)
        pruefe("Protokoll zeigt «läuft» mit Titel", [x["aktion"] for x in pr["laufend"]] == ["backtest"] and pr["laufend"][0]["titel"] == "Backtest rechnen", pr["laufend"])
        pruefe("Doppelklick über HTTP: 409", http_aktion({"X-Cockpit": "1"}, "backtest")[0] == 409)
        langsam.set()
        import time as _time
        for _ in range(50):
            with urllib.request.urlopen(basis + "/api/protokoll") as r:
                pr = json.load(r)
            if not pr["laufend"]:
                break
            _time.sleep(0.1)
        C._skript = alt_skript
        pruefe("danach: Ergebnis im Protokoll, neueste zuerst", pr["protokoll"][0]["aktion"] == "backtest" and pr["protokoll"][0]["ok"]
               and "pilot.py --backtest" in pr["protokoll"][0]["text"] and pr["laufend"] == [], pr["protokoll"][:1])
        # echter Prozessstart: UTF-8-Ausgabe (Windows-Konsole), Rückgabecode
        with tempfile.TemporaryDirectory() as td:
            (Path(td) / "hallo.py").write_text("print('Hallo ✓ 🛩️')\nraise SystemExit(3)\n", encoding="utf-8")
            alt_hier = C.HIER
            C.HIER = Path(td)
            try:
                ok, out = C._skript(["hallo.py"], 30)
            finally:
                C.HIER = alt_hier
        pruefe("Skript als Prozess: Ausgabe in UTF-8, Fehlercode erkannt", not ok and "Hallo ✓ 🛩️" in out, out)
        srv.shutdown()

        # echter Not-Aus-Ablauf mit nachgebautem Broker: schliesst je Markt, Gewicht 1/2
        aufrufe = []
        __import__("os").environ["KRYPTO_PILOT_MAERKTE"] = "BTC,ETH"  # unabhängig von der Einstellung auf dem PC

        def schliesst(e, symbol, gewicht):
            aufrufe.append((e["hebel"], symbol, gewicht))
            e["broker"] = {"position": 0.0, "hinweis": ""}
            return [{"seite": "SELL", "menge": 0.05, "id": 1}]
        meldung = C.notaus_an(ausfuehren=schliesst)
        pruefe("Not-Aus schliesst BTC und ETH (Ziel 0), meldet «geschlossen»", aufrufe == [(0.0, "BTCUSDT", 0.5), (0.0, "ETHUSDT", 0.5)] and C.STOP.exists()
               and meldung.count("✅") == 2 and "NICHT" not in meldung, (aufrufe, meldung))
        pruefe("Not-Aus aus Cockpit/Telegram startet die Nachkontrolle von Pilot 2.0 (wie stop.bat)", NACHKONTROLLE == [1]
               and "Nachkontrolle Pilot 2.0 läuft" in meldung, (NACHKONTROLLE, meldung))
        import pilot2_live as _P2L
        _alt_bestand, _alt_skript, _gestartet = _P2L.BESTAND, C._skript, []
        try:
            _P2L.BESTAND = Path(tmp) / "kein-pilot2-bestand.json"
            _kein = _NK_ECHT()
            _P2L.BESTAND.write_text("{}")
            C._skript = lambda args, zeit: _gestartet.append((args, zeit))
            _ja = _NK_ECHT()
            for _ in range(100):
                if _gestartet:
                    break
                time.sleep(0.01)
        finally:
            _P2L.BESTAND, C._skript = _alt_bestand, _alt_skript
        pruefe("Nachkontrolle startet nur mit Pilot-2.0-Bestand, als eigener Prozess «pilot.py --nachkontrolle» mit genug Zeit",
               _kein is False and _ja is True and _gestartet and _gestartet[0][0] == ["pilot.py", "--nachkontrolle"]
               and _gestartet[0][1] > _P2L.NACHKONTROLLE_MAX_S, (_kein, _ja, _gestartet))

        def scheitert(e, symbol, gewicht):
            e["broker"] = {"position": 0.2 if symbol == "BTCUSDT" else None, "hinweis": "Binance lehnt ab (HTTP 503)"}
            return [{"seite": "SELL", "menge": 0.2, "fehler": "HTTP 503"}]
        meldung = C.notaus_an(ausfuehren=scheitert)
        pruefe("Not-Aus scheitert: sagt «NICHT geschlossen» bzw. «unklar», nie «geschlossen»", "NICHT ALLES GESCHLOSSEN" in meldung
               and "BTC: NICHT geschlossen, Position 0.2" in meldung and "ETH: unklar" in meldung and "✅" not in meldung, meldung)
        meldung = C.notaus_an(ausfuehren=lambda e, symbol, gewicht: (e.update(broker={"hinweis": "keine Futures-Schlüssel"}), [])[1])
        pruefe("Not-Aus ohne Schlüssel: ehrlich «keine Schlüssel»", "keine Futures-Schlüssel" in meldung and "NICHT ALLES" not in meldung, meldung)
        _ll = json.loads((Path(tmp) / "krypto-pilot.json").read_text(encoding="utf-8")).get("letzter_lauf", {})
        pruefe("Not-Aus aus dem Cockpit landet als «letzter Lauf» im Logbuch des Cockpits", "Not-Aus (Cockpit/Telegram)" in _ll.get("hinweise", []), _ll)
        with Sp.lauf_sperre(warten=0):  # ein Pilot-Lauf hält gerade die Sperre
            alt_warten = Sp.lauf_sperre
            Sp.lauf_sperre = lambda name="krypto-lauf", warten=0, **k: alt_warten(name, 0, **k)
            try:
                meldung = C.notaus_an(ausfuehren=schliesst)
            finally:
                Sp.lauf_sperre = alt_warten
        pruefe("Not-Aus bei besetzter Sperre: schliesst trotzdem, meldet aber NICHT «alles zu»", "NICHT ALLES GESCHLOSSEN" in meldung
               and "anderer Lauf" in meldung and meldung.count("✅") == 2, meldung)
        pruefe("Not-Aus bei besetzter Sperre (17. Prüfung K4): die Meldung nennt auch den Absturz (eine tote Sperre gilt erst nach 150 s als tot) und dass die Nachkontrolle dann schliesst",
               "abgestürzt" in meldung and "150 s" in meldung and "Nachkontrolle schliesst Pilot 2.0" in meldung, meldung)
        C.STOP.unlink()
        # (16. Prüfung) eine Sperre ohne Herzschlag (hart beendeter Lauf) hält den Not-Aus nicht auf: nach 150 s gilt der Lauf als tot, der Not-Aus übernimmt und schliesst Pilot 2.0 selbst
        _lock_t = Path(tmp) / "krypto-lauf.lock"
        for _alter, _tot in ((200, True), (100, False)):
            _lock_t.write_text("4242 0\n")
            __import__("os").utime(_lock_t, (time.time() - _alter, time.time() - _alter))
            alt_warten = Sp.lauf_sperre
            Sp.lauf_sperre = lambda name="krypto-lauf", warten=0, **k: alt_warten(name, 0, **k)
            try:
                meldung = C.notaus_an(ausfuehren=schliesst)
            finally:
                Sp.lauf_sperre = alt_warten
            if _tot:
                pruefe("Not-Aus bei toter Sperre (kein Herzschlag seit 200 s): übernimmt, schliesst, kein «anderer Lauf aktiv»",
                       "anderer Lauf" not in meldung and meldung.count("✅") == 2 and not _lock_t.exists(), (meldung, _lock_t.exists()))
            else:
                pruefe("Not-Aus bei noch lebender Sperre (Herzschlag vor 100 s): wartet nicht darauf, meldet «anderer Lauf», nicht «alles zu»",
                       "anderer Lauf" in meldung and "NICHT ALLES GESCHLOSSEN" in meldung, meldung)
            _lock_t.unlink(missing_ok=True)
            C.STOP.unlink(missing_ok=True)

        # ── Gesundheit: letzter echter Lauf und täglicher Start (krypto-auto.bat) ──
        heute2 = datetime(2026, 1, 20, tzinfo=timezone.utc).date()
        gw = {x["name"]: x for x in C.gesundheit({}, {"entscheide": [{"stand": "2026-01-19"}], "letzter_lauf": {
            "zeit": "2026-01-20T02:31:00+00:00", "ok": False, "hinweise": ["BTC long", "⚠️ OHNE Stop: bitte prüfen"]}}, {}, heute2)}
        pruefe("Gesundheit: Warnung im letzten Lauf = rot, mit Grund", gw["Letzter Lauf mit Aufträgen"]["ok"] is False
               and "OHNE Stop" in gw["Letzter Lauf mit Aufträgen"]["text"], gw.get("Letzter Lauf mit Aufträgen"))
        import meldung as M
        alt_datei = M.DATEI
        M.DATEI = Path(tmp) / "krypto-auto-status.json"
        try:
            gesendet_m = []
            M.merken(False, "Selbsttest test_pilot fehlgeschlagen", push=True, sender=gesendet_m.append)
            ga = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
            pruefe("Täglicher Start gescheitert: rot im Cockpit + aufs Handy", ga["Täglicher Lauf (krypto-auto.bat)"]["ok"] is False
                   and "test_pilot" in ga["Täglicher Lauf (krypto-auto.bat)"]["text"] and gesendet_m and "⚠️" in gesendet_m[0], (ga.get("Täglicher Lauf (krypto-auto.bat)"), gesendet_m))
            M.merken(True, "alles gelaufen", sender=gesendet_m.append)
            ga = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
            pruefe("Täglicher Start ok: grün, ohne Push", ga["Täglicher Lauf (krypto-auto.bat)"]["ok"] is True and len(gesendet_m) == 1)
        finally:
            M.DATEI = alt_datei

        # ── Umgebung: aktuelle Benutzer-Variablen (setx) statt der Startumgebung des Cockpits ──
        reg = {"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD", "BINANCE_FUTURES_API_KEY": "NEU",
               "PATH": "C:\\boese", "KI_BOT_STOP": ""}
        u = C.umgebung({"BINANCE_FUTURES_API_KEY": "ALT", "KI_BOT_STOP": "1", "PATH": "/bin"}, lesen=lambda: reg)
        pruefe("Umgebung: Wechsel auf Echtgeld/neue Schlüssel sofort sichtbar, fremde Variablen unberührt, leer = entfernt",
               u["BINANCE_FUTURES_TESTNET"] == "false" and u["BINANCE_FUTURES_API_KEY"] == "NEU" and u["PATH"] == "/bin" and "KI_BOT_STOP" not in u, u)
        pruefe("Umgebung: Registry nicht lesbar → Startumgebung", C.umgebung({"A": "1"}, lesen=lambda: (_ for _ in ()).throw(OSError("x"))) == {"A": "1"})
        import broker_futures as _BF
        alt_umg, alt_ausf = C.umgebung, _BF.ausfuehren
        gesehen = []
        C.umgebung = lambda *a_, **k_: {"BINANCE_FUTURES_API_KEY": "NEU", "BINANCE_FUTURES_TESTNET": "false"}

        def _ausf(e_, env=None, symbol=None, gewicht=1.0, **k_):
            gesehen.append((symbol, (env or {}).get("BINANCE_FUTURES_API_KEY")))
            e_["broker"] = {"position": 0.0, "hinweis": "", "modus": "echtgeld"}
            return []
        _BF.ausfuehren = _ausf
        try:
            meldung = C.notaus_an()
        finally:
            C.umgebung, _BF.ausfuehren = alt_umg, alt_ausf
            C.STOP.unlink()
        pruefe("Not-Aus prüft das Konto der AKTUELLEN Einstellungen und sagt welches", gesehen and all(k == "NEU" for _, k in gesehen)
               and "ECHTGELD" in meldung, (gesehen, meldung))
        gn = {x["name"]: x for x in C.gesundheit({"KI_BOT_STOP": "1"}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
        pruefe("Not-Aus über die Variable KI_BOT_STOP=1 zeigt die Ampel als aktiv", gn["Not-Aus"]["ok"] is False and "KI_BOT_STOP" in gn["Not-Aus"]["text"])

        # ── Risiko-Knopf bei gesetzter Variable: nichts speichern ──
        import pilot_kern as _K
        alt_einst, alt_umg2 = _K.EINSTELLUNGEN, C.umgebung
        _K.EINSTELLUNGEN = Path(tmp) / "einst.json"
        C.umgebung = lambda *a_, **k_: {"KRYPTO_RISIKO": "1"}
        try:
            e_r = C.aktion("risiko_2")
            pruefe("Risiko-Knopf mit KRYPTO_RISIKO gesetzt: abgelehnt UND nichts gespeichert (wirkt nie später still)",
                   not e_r["ok"] and not _K.EINSTELLUNGEN.exists(), e_r)
            C.umgebung = lambda *a_, **k_: {}
            e_r = C.aktion("risiko_1_5")
            pruefe("Risiko-Knopf ohne Variable: gespeichert und richtig gemeldet", e_r["ok"] and "1.5×" in e_r["text"]
                   and json.loads(_K.EINSTELLUNGEN.read_text(encoding="utf-8"))["risiko"] == 1.5, e_r)
            e_r = C.aktion("risiko_1_75")
            pruefe("Risiko-Knopf 1,75×: gespeichert, der Pilot liest 1,75, Warnung dabei", e_r["ok"] and "1.75×" in e_r["text"] and "Achtung" in e_r["text"]
                   and json.loads(_K.EINSTELLUNGEN.read_text(encoding="utf-8"))["risiko"] == 1.75 and _K.risiko({}, _K.EINSTELLUNGEN)["max_hebel"] == 1.75, e_r)
            # Testzahlen je Stufe: der Max-Profit-Prüfstand (ab 2020/2022 + Wahrscheinlichkeit), sonst der ältere Hebel-Prüfstand (ab 2019)
            (Path(tmp) / "krypto-maxprofit-pruefung.json").write_text(json.dumps({"kandidaten": {
                "F-1.75": {"cagr_oos": 0.49, "einbruch_oos": -0.53, "cagr_2022": 0.44, "einbruch_2022": -0.45, "p_einbruch60": 0.036},
                "F-1": {"cagr_oos": 0.33}}}), encoding="utf-8")  # F-1 unvollständig → zählt nicht
            (Path(tmp) / "krypto-hebel-pruefung.json").write_text(json.dumps({"varianten": {"B alles × 1.5×": {
                "2019–heute": {"cagr": 0.5, "einbruch": -0.44}, "2022–heute": {"cagr": 0.35, "einbruch": -0.40}}}}), encoding="utf-8")
            st_t = C.stufen_test()
            pruefe("Stufen-Testzahlen: 1,75 aus dem Max-Profit-Prüfstand (2020/2022 + Wahrscheinlichkeit), 1,5 aus dem älteren (2019), "
                   "unvollständige/fehlende Stufen leer", st_t["1.75"] == {"2020–heute": {"cagr": 0.49, "einbruch": -0.53},
                   "2022–heute": {"cagr": 0.44, "einbruch": -0.45}, "p60": 0.036}
                   and st_t["1.5"] == {"2019–heute": {"cagr": 0.5, "einbruch": -0.44}, "2022–heute": {"cagr": 0.35, "einbruch": -0.40}}
                   and st_t["1"] == {} and st_t["2"] == {}, st_t)
            pruefe("Cockpit-Stand enthält die Stufe 1,75 samt Testzahlen", C.stand(env={})["risiko"]["test"]["1.75"]["p60"] == 0.036)
            _html = (Path(C.__file__).parent / "cockpit.html").read_text(encoding="utf-8")
            pruefe("Oberfläche: Knopf für 1,75× (als Schaltfläche, nicht nur im Stil) und die Zuordnung zur Aktion risiko_1_75",
                   '<button type="button" data-s="1.75" aria-pressed="false">1,75× viel Risiko<small id="st-1.75"></small></button>' in _html
                   and '"1.75": "risiko_1_75"' in _html)
            pruefe("Kontoanteil: Standard 0,5, KI_BOT_ANTEIL=0.3 → 0,3 (die Testzahlen gelten fürs ganze Konto)",
                   C.konto_anteil({}) == 0.5 and C.konto_anteil({"KI_BOT_ANTEIL": "0.3"}) == 0.3 and C.stand(env={})["risiko"]["anteil"] == 0.5
                   and C.stand(env={"KI_BOT_ANTEIL": "1"})["risiko"]["anteil"] == 1.0)
            pruefe("Oberfläche: die Rückfrage nennt den Kontoanteil und dass die Zahlen fürs GANZE Konto gelten",
                   "% des Kontos ein (KI_BOT_ANTEIL)" in _html and "gelten für das GANZE Konto" in _html)
            pruefe("Oberfläche: die Rückfrage vor jeder höheren Stufe warnt vor dem Verlust und nennt die Wahrscheinlichkeit eines Jahres unter −60 %",
                   "nur Geld einsetzen, dessen Verlust du verkraftest" in _html and "tiefer als −60 %" in _html)
        finally:
            _K.EINSTELLUNGEN, C.umgebung = alt_einst, alt_umg2
        # ── ETH-Sammler-Karte: «unklar» nicht im Ø-Preis ──
        (Path(tmp) / "eth-sammler.json").write_text(json.dumps({"testnetz": {"kaeufe": [{"tag": "2026-01-01", "usdt": 50.0, "eth": 0.02},
                                                                                       {"tag": "2026-01-08", "usdt": 50.0, "eth": 0.0, "unklar": True}],
                                                                            "gestakt": []}}), encoding="utf-8")
        sm = C.stand(env={})["sammler"]
        pruefe("Sammler-Karte: unklarer Kauf getrennt, Ø-Preis 2500 statt 5000", sm["schnitt"] == 2500.0 and sm["unklar"] == 1
               and sm["eingesetzt"] == 50.0, sm)
        gk = {x["name"]: x for x in C.gesundheit({"ANTHROPIC_API_KEY": "k"}, {"entscheide": []}, {"entscheide": [{"stand": "2026-01-01"}]},
                                                 datetime(2026, 1, 20, tzinfo=timezone.utc).date())}
        pruefe("KI-Ampel: rot, wenn die letzte Einschätzung alt ist (nicht nur «Schlüssel gesetzt»)", gk["Claude (KI-Trader)"]["ok"] is False
               and "19 Tage" in gk["Claude (KI-Trader)"]["text"], gk["Claude (KI-Trader)"])

        # ── Telegram-Calls im Cockpit ──
        pruefe("Calls: ohne Einrichtung keine Tafel und ehrliche /calls-Antwort", C.calls_stand() is None and "nicht eingerichtet" in C.befehl("/calls"))
        gl = {x["name"]: x for x in C.gesundheit({"TELEGRAM_CALL_GRUPPEN": "-1001"}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
        pruefe("Calls: Leser nie gelaufen = rot", gl["Telegram-Calls mitlesen"]["ok"] is False, gl.get("Telegram-Calls mitlesen"))
        (Path(tmp) / "calls").mkdir(exist_ok=True)
        (Path(tmp) / "calls" / "leser-lebt.json").write_text(json.dumps({"zeit": datetime.now(timezone.utc).isoformat(), "gruppen": ["VIP"]}))
        gl = {x["name"]: x for x in C.gesundheit({"TELEGRAM_CALL_GRUPPEN": "-1001"}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
        pruefe("Calls: Leser lebt = grün", gl["Telegram-Calls mitlesen"]["ok"] is True and "VIP" in gl["Telegram-Calls mitlesen"]["text"])
        import calls_kopierer as CK
        CK.schreiben({"calls": [{"id": "-1001:1", "gruppe": "-1001", "gruppe_name": "VIP", "zeit": "2026-03-02T10:00:00+00:00", "zeit_ms": 1,
                                 "call": {"symbol": "SOLUSDT", "richtung": "LONG", "einstieg": [], "ziele": [110.0], "stop": 95.0, "hebel": None},
                                 "status": "schatten", "schatten": {"status": "geschlossen", "r": 0.05, "r_risiko": 1.0, "abstand_stop": 0.05,
                                                                    "grund": "ziele", "t_ende": 2}}]}, Path(tmp) / "calls-kopierer.json")
        cs = C.calls_stand()
        pruefe("Calls: Tafel mit Schatten-Bilanz, /calls antwortet", cs and cs["gruppen"]["-1001"]["schatten"]["n"] == 1
               and "VIP" in C.befehl("/calls") and "zeigeCalls" in C.SEITE.read_text(encoding="utf-8"), cs)

        # ── Telegram: nur eigener Chat, alte Nachrichten übersprungen ──
        jetzt = int(datetime.now(timezone.utc).timestamp())

        class TG(BaseHTTPRequestHandler):
            """Wie Telegram: Rückstau (vor dem Start) + neue Nachrichten; offset=-1 liefert nur die letzte Nachricht."""
            gesendet, abrufe = [], []
            rueckstau = [{"update_id": 1, "message": {"chat": {"id": 42}, "date": jetzt + 900, "text": "/weiter"}}]  # PC-Uhr falsch: «neu»
            neu = [{"update_id": 2, "message": {"chat": {"id": 999}, "date": jetzt, "text": "/stop"}},
                   {"update_id": 3, "message": {"chat": {"id": 42}, "date": jetzt - 7200, "text": "/hilfe"}},  # PC-Uhr falsch: «alt»
                   {"update_id": 4, "message": {"chat": {"id": 42}, "date": jetzt, "text": "/weiter@MeinBot"}}]

            def _a(self, o):
                b = json.dumps(o).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b)

            def do_GET(self):
                q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
                TG.abrufe.append(q.get("offset"))
                if q.get("offset") == "-1":
                    return self._a({"ok": True, "result": TG.rueckstau[-1:]})
                ab = int(q.get("offset") or 0)
                return self._a({"ok": True, "result": [u for u in TG.rueckstau + TG.neu if u["update_id"] >= ab]})

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
        texte = [x["text"] for x in TG.gesendet]
        pruefe("Telegram: Rückstau beim Start NICHT ausgeführt (unabhängig von der PC-Uhr), aber gemeldet",
               TG.abrufe[:2] == ["-1", "2"] and "NICHT ausgeführt" in texte[0] and "/weiter" in texte[0], (TG.abrufe, texte))
        pruefe("Telegram: fremder Chat ignoriert, /hilfe + /weiter beantwortet (auch bei falscher PC-Uhr)",
               [x["chat_id"] for x in TG.gesendet] == ["42", "42", "42"] and "/status" in texte[1] and "aufgehoben" in texte[2], texte)
        pruefe("Telegram: /weiter hebt Not-Aus auf, fremdes /stop wirkte nicht", not C.STOP.exists())
        pruefe("Telegram: unbekannter Text wird ignoriert", C.befehl("hallo") is None and C.befehl("") is None)

        class TGNetz(TG):
            """Netz beim Start 3× weg: der Rückstau (altes /weiter) darf trotzdem NIE ausgeführt werden."""
            fehler_noch = 3

            def do_GET(self):
                q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
                if q.get("offset") == "-1" and TGNetz.fehler_noch > 0:
                    TGNetz.fehler_noch -= 1
                    self.send_response(502)
                    self.end_headers()
                    return
                return super().do_GET()

        TG.gesendet, TG.abrufe = [], []
        TG.rueckstau = [{"update_id": 7, "message": {"chat": {"id": 42}, "date": jetzt, "text": "/weiter"}}]
        TG.neu = []
        tg2 = HTTPServer(("127.0.0.1", 0), TGNetz)
        threading.Thread(target=tg2.serve_forever, daemon=True).start()
        C.STOP.write_text("x")
        C.telegram_schleife(env={"TELEGRAM_BOT_TOKEN": "T0KEN", "TELEGRAM_CHAT_ID": "42"}, basis=f"http://127.0.0.1:{tg2.server_port}", runden=5, warte=0)
        pruefe("Telegram: Netz beim Start weg → altes /weiter trotzdem NICHT ausgeführt (Not-Aus bleibt)", C.STOP.exists()
               and any("NICHT ausgeführt" in x["text"] for x in TG.gesendet), (TG.abrufe, TG.gesendet))
        C.STOP.unlink()
        tg2.shutdown()
        tg.shutdown()
    finally:
        C.DATA, C.STOP, C.PAUSE = alt
        Sp.ORDNER = alt_sperre

# ── Windows-Startdateien: statisch geprüft (kein cmd.exe im Test) ──
auto = (HIER / "krypto-auto.bat").read_bytes()
txt = auto.decode("ascii")
pruefe("krypto-auto.bat: Windows-Zeilenenden (sonst springt «goto» falsch)", auto.count(b"\n") == auto.count(b"\r\n") > 10)
_notaus_zweig = auto[auto.index(b"if defined NOTAUS ("):auto.index(b"goto bilanz")]
pruefe("krypto-auto.bat: der Not-Aus-Zweig ruft nach dem Not-Aus-Lauf auch die Pilot-2.0-Nachkontrolle (wie stop.bat)",
       b"pilot.py --lauf" in _notaus_zweig and b"--nachkontrolle" in _notaus_zweig
       and _notaus_zweig.index(b"--lauf") < _notaus_zweig.index(b"--nachkontrolle"))
pruefe("krypto-auto.bat: UTF-8 erzwungen (Emoji-Absturz beim Umleiten)", "set PYTHONUTF8=1" in txt and "set PYTHONIOENCODING=utf-8" in txt)
pruefe("krypto-auto.bat: Not-Aus wird VOR der Pause geprüft", txt.index('ki_bot\\STOP"') < txt.index('ki_bot\\PAUSE"'))
pruefe("krypto-auto.bat: Ausgabe nicht mehr nach nul, Fehler gemeldet", ".py >nul" not in txt and "meldung.py --fehler" in txt and "--push" in txt
       and "krypto-auto.log" in txt)
import re as _re  # noqa: E402
ziele = set(_re.findall(r"(?:goto|call) :?(\w+)", txt, flags=_re.I)) - {"eof"}
marken = set(_re.findall(r"^:(\w+)", txt, flags=_re.M))
pruefe("krypto-auto.bat: jedes Sprungziel existiert", ziele <= marken, (ziele, marken))
for _n in ("cockpit.bat", "calls.bat", "../ki_bot/stop.bat", "../ki_bot/start-auto.bat", "../ki_bot/weiter.bat"):
    _b = (HIER / _n).read_bytes()
    pruefe(f"{_n}: Windows-Zeilenenden", _b.count(b"\n") == _b.count(b"\r\n"))
_sa = (HIER / "../ki_bot/start-auto.bat").read_text(encoding="ascii")
pruefe("start-auto.bat: beachtet die Pause", 'PAUSE"' in _sa and "PYTHONUTF8" in _sa)
pruefe("start-auto.bat auto: ohne Pause, Tageswächter mit Ende (sonst blockiert er die Aufgabe am nächsten Tag)",
       '"%~1"=="auto"' in _sa and "--stunden" in _sa and "\npause" not in _sa.replace("\r", "") and "WARTE=rem" not in _sa)
pruefe("krypto-auto.bat: ETH-Sparplan nur mit ausdrücklicher Freigabe (ETH_SPARPLAN_BETRAG), nicht schon wegen des Spot-Schlüssels",
       '"%ETH_SPARPLAN_BETRAG%"==""' in txt and 'if not "%BINANCE_API_KEY%"=="" (\r\n  call :schritt ETH-Sammler' not in txt)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
