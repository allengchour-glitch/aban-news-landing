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
        # scheitert die Anfrage (Schlüssel, Netz, Guthaben), steht der GRUND im Logbuch — das Cockpit zeigt ihn in der Gesundheits-Zeile; ein späterer Erfolg räumt ihn weg
        lbp2 = Path(tmp) / "ki2.json"
        r_aus = KT.lauf(client=FakeClaude(gut, fehler=ConnectionError("Schlüssel ungültig (401)")), logbuch=lbp2, kurse=reihen, lage_text="x", push=False)
        j_aus = json.loads(lbp2.read_text(encoding="utf-8"))
        pruefe("KI-Trader: scheitert die Anfrage, wird der GRUND ins Logbuch geschrieben (fürs Cockpit), ohne einen Entscheid zu erfinden",
               r_aus is None and j_aus["entscheide"] == [] and "Schlüssel ungültig" in j_aus["letzter_fehler"]["hinweis"]
               and j_aus["letzter_fehler"]["stand"] == tag(399) and "zeit" in j_aus["letzter_fehler"], j_aus)
        KT.lauf(client=FakeClaude(gut), logbuch=lbp2, kurse=reihen, lage_text="x", push=False)
        j_gut = json.loads(lbp2.read_text(encoding="utf-8"))
        pruefe("KI-Trader: ein späterer Erfolg räumt den gemerkten Fehler weg", "letzter_fehler" not in j_gut and len(j_gut["entscheide"]) == 1, j_gut)
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
        pruefe("Cockpit-Stand trägt die Programmversion (geladen und auf der Platte) für den Hinweis «neue Version installiert»",
               set(s.get("programm", {})) == {"geladen", "auf_platte"} and s["programm"]["geladen"] == C.VERSION_GELADEN, s.get("programm"))
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
        # (18. Prüfung, Mutationsprobe R17-M39) der Knopf ruft `aufgabe_xml_nk()` OHNE Argument: der Benutzer kommt aus der Umgebung
        try:
            __import__("os").environ["USERDOMAIN"], __import__("os").environ["USERNAME"] = "TESTPC", "Anna"
            xml_env18 = C.aufgabe_xml_nk()
            __import__("os").environ.pop("USERDOMAIN")
            xml_ohne_env18 = C.aufgabe_xml_nk()
        finally:
            for k_, v_ in os_umgebung17.items():
                if v_ is None:
                    __import__("os").environ.pop(k_, None)
                else:
                    __import__("os").environ[k_] = v_
        pruefe("aufgabe_xml_nk() ohne Argument (so legt der Knopf die Aufgabe an) liest den Benutzer aus der Umgebung: Anmelde-Auslöser mit TESTPC\\Anna; fehlt einer von beiden, gibt es keinen Anmelde-Auslöser und das XML bleibt gültig",
               "<LogonTrigger><Enabled>true</Enabled><UserId>TESTPC\\Anna</UserId></LogonTrigger>" in xml_env18 and "<LogonTrigger>" not in xml_ohne_env18
               and __import__("xml.dom.minidom").dom.minidom.parseString(xml_ohne_env18.split("?>", 1)[1].strip()) is not None, (xml_env18[:300], xml_ohne_env18[:300]))
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
        # (19. Prüfung K5) ohne Buch endet die Bat früh — der alte Absturz-Wert (rc=1) in der rc-Datei hielt die Ampel bis zu 30 Minuten zu Unrecht rot: jetzt schreibt auch dieser Zweig «rc=0»
        i_ohne = abschnitt.index("\n:nk_ohne_buch\n") + 1
        zweig19 = abschnitt[i_ohne:]
        pruefe("krypto-auto.bat «nachkontrolle» ohne Buch (19. Prüfung K5): der Zweig :nk_ohne_buch liegt NACH dem normalen exit /b, schreibt rc=0 in die rc-Datei (Umleitung zuerst) und endet mit exit /b 0; der Sprung steht nach dem Lebenszeichen",
               "if not exist \"data\\krypto-pilot2-bestand.json\" goto :nk_ohne_buch" in abschnitt and abschnitt.index("exit /b %NKRC%") < i_ohne
               and f'>"data\\{C.NK_RC}" echo' in zweig19 and "rc=0" in zweig19 and "exit /b 0" in zweig19 and "(" not in zweig19
               and abschnitt.index(C.NK_LEBT) < abschnitt.index("goto :nk_ohne_buch"), zweig19)
        gi_pfad = C.HIER.parents[2] / ".gitignore"
        gi_text = gi_pfad.read_text(encoding="utf-8") if gi_pfad.exists() else None  # in einem Sandkasten nur mit tools/trading (Mutationsprobe) fehlt sie: dann nicht prüfbar
        pruefe("(18. Prüfung) die Laufzeit-Dateien der Nachkontroll-Aufgabe (Lebenszeichen, Rückgabewert, Push-Drosselung, Log) stehen in .gitignore — sonst wären sie auf dem PC des Users «ungetrackt» und störten das Aktualisieren",
               (gi_text is None or "data/krypto-nachkontrolle*" in gi_text.splitlines()) and C.NK_LEBT.startswith("krypto-nachkontrolle") and C.NK_RC.startswith("krypto-nachkontrolle"))
        pruefe("(Code-Review der R20) auch die Temp-Dateien des Buchs und des Protokolls (<Datei>.<Prozess>-<Thread>-<Zähler>.neu, bleiben nach einem harten Abbruch liegen) stehen in .gitignore — `git add data/` darf sie nie einsammeln",
               gi_text is None or "data/*.neu" in gi_text.splitlines())
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
                # 0 = in Ordnung (grün), 3 = Warnung (19. Prüfung K5: GRAU mit Text — «grün» täuschte bei einer Dauerwarnung), alles andere — auch NEGATIVE Werte (NTSTATUS bei Kill/Absturz) — ist ein Absturz → rot;
                # ein veralteter Rückgabewert (älter als NK_LEBT_MAX_MIN) zählt nicht
                rc_datei18 = Path(td17) / C.NK_RC
                for fall18, rc_text18, rc_alter18, erwartet18, wort18 in (("rc=0 frisch", "Tue 20.10.2026 18:30:01,12 rc=0", 60, True, "zuletzt vor"), ("rc=3 frisch (Warnung)", "x rc=3", 60, None, "WARNUNG"),
                                                                          ("rc=1 frisch (Absturz)", "x rc=1", 60, False, "Rückgabewert 1"), ("rc=9009 frisch", "x rc=9009", 60, False, "Rückgabewert 9009"),
                                                                          ("rc=-1073741510 frisch (Windows: Prozess beendet)", "x rc=-1073741510", 60, False, "Rückgabewert -1073741510"),
                                                                          ("rc=-1 frisch", "x rc=-1", 60, False, "Rückgabewert -1"),
                                                                          ("rc=1, aber 45 Minuten alt (veraltet)", "x rc=1", 45 * 60, True, "zuletzt vor"), ("rc=3, aber 45 Minuten alt (veraltet)", "x rc=3", 45 * 60, True, "zuletzt vor"),
                                                                          ("rc-Datei ohne rc=", "kaputt", 60, True, "zuletzt vor")):
                    lebt17.write_text("x")
                    _os17.utime(lebt17, (time.time() - 3 * 60, time.time() - 3 * 60))
                    rc_datei18.write_text(rc_text18)
                    _os17.utime(rc_datei18, (time.time() - rc_alter18, time.time() - rc_alter18))
                    C.os = _NT17()
                    C._AUFGABE_CACHE.update({"zeit": 0.0, "wert": None, "wert_nk": None})
                    C._befehl = lambda cmd, zeit: (True, "")
                    gnk18 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
                    zeile18 = gnk18.get("Nachkontrolle (Aufgabenplanung)")
                    pruefe(f"Ampel «Nachkontrolle (Aufgabenplanung)», Rückgabewert der Bat: {fall18} → {'grün' if erwartet18 else 'grau' if erwartet18 is None else 'rot'}", zeile18 is not None and zeile18["ok"] is erwartet18 and wort18 in zeile18["text"], zeile18)
                # (19. Prüfung K5) jeder Start schreibt NACH seinem Ende einen neuen Rückgabewert: ist der letzte Start älter als NK_ENDE_MAX_MIN und der Rückgabewert älter als er, ging der Durchgang nie zu Ende
                # (hängt / das Zeitlimit der Aufgabe beendet ihn) → rot, auch wenn das Lebenszeichen frisch ist; ein laufender (junger) Durchgang und ein beendeter verspäteter Start bleiben grün
                for fall19, lebt_min19, rc_min19, rc_text19, erwartet19, wort19 in (("Start vor 20 Min., Rückgabewert (rc=0) von VOR dem Start", 20, 25, "x rc=0", False, "nie zu Ende"),
                                                                                    ("Start vor 20 Min., kein Rückgabewert-Datei", 20, None, "", False, "nie zu Ende"),
                                                                                    ("Start vor 20 Min., Rückgabewert (rc=0) von NACH dem Start (beendet)", 20, 18, "x rc=0", True, "zuletzt vor"),
                                                                                    ("Start vor 3 Min. läuft noch, Rückgabewert von vorher", 3, 13, "x rc=0", True, "zuletzt vor"),
                                                                                    ("Start vor 14 Min., Rückgabewert von vorher (unter der Grenze)", 14, 24, "x rc=0", True, "zuletzt vor"),
                                                                                    ("Start vor 16 Min., Rückgabewert von vorher (über der Grenze)", 16, 26, "x rc=0", False, "nie zu Ende")):
                    lebt17.write_text("x")
                    _os17.utime(lebt17, (time.time() - lebt_min19 * 60, time.time() - lebt_min19 * 60))
                    rc_datei18.unlink(missing_ok=True)
                    if rc_min19 is not None:
                        rc_datei18.write_text(rc_text19)
                        _os17.utime(rc_datei18, (time.time() - rc_min19 * 60, time.time() - rc_min19 * 60))
                    C.os = _NT17()
                    C._AUFGABE_CACHE.update({"zeit": 0.0, "wert": None, "wert_nk": None})
                    C._befehl = lambda cmd, zeit: (True, "")
                    gnk19 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
                    zeile19 = gnk19.get("Nachkontrolle (Aufgabenplanung)")
                    pruefe(f"Ampel «Nachkontrolle (Aufgabenplanung)», Durchgang nie zu Ende: {fall19} → {'grün' if erwartet19 else 'rot'}", zeile19 is not None and zeile19["ok"] is erwartet19 and wort19 in zeile19["text"], zeile19)
                # ── 20. Prüfung: veralteter Rückgabewert (klein 1), Dauerwarnung und «besetzt»-Reihe (wichtig 1, klein 8) ──
                serie20 = Path(td17) / C.NK_SERIE

                def ampel20(lebt_min, rc_min, rc_text="x rc=0", serie=None):
                    """serie = (art, anzahl, Beginn vor … Min., letzter Durchgang vor … Min.) oder None."""
                    jetzt20 = time.time()
                    lebt17.write_text("x")
                    _os17.utime(lebt17, (jetzt20 - lebt_min * 60, jetzt20 - lebt_min * 60))
                    rc_datei18.unlink(missing_ok=True)
                    if rc_min is not None:
                        rc_datei18.write_text(rc_text)
                        _os17.utime(rc_datei18, (jetzt20 - rc_min * 60, jetzt20 - rc_min * 60))
                    serie20.unlink(missing_ok=True)
                    if serie:
                        serie20.write_text(json.dumps({"art": serie[0], "anzahl": serie[1], "seit": jetzt20 - serie[2] * 60, "zeit": jetzt20 - serie[3] * 60}))
                    C.os = _NT17()
                    C._AUFGABE_CACHE.update({"zeit": 0.0, "wert": None, "wert_nk": None})
                    C._befehl = lambda cmd, zeit: (True, "")
                    return {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}.get("Nachkontrolle (Aufgabenplanung)")
                # klein 1: das Lebenszeichen ist frisch, der Rückgabewert aber älter als drei Takte → die Durchgänge gehen nicht zu Ende (vorher 0–15 Minuten nach jedem Start grün, bei nie erneuerter Datei dauerhaft)
                for fall20, lebt20, rc20, erwartet20, wort20 in (("Start vor 7 Min., Rückgabewert 45 Min. alt", 7, 45, False, "nicht zu Ende"),
                                                                 ("Start vor 12 Min., Rückgabewert 45 Min. alt (im alten grünen Fenster)", 12, 45, False, "nicht zu Ende"),
                                                                 ("Start vor 14 Min., Rückgabewert 31 Min. alt", 14, 31, False, "nicht zu Ende"),
                                                                 ("Start vor 4 Min., Rückgabewert 45 Min. alt (erster Durchgang nach langer Pause läuft noch)", 4, 45, True, "zuletzt vor"),
                                                                 ("Start vor 7 Min., Rückgabewert 29 Min. alt (unter der Grenze)", 7, 29, True, "zuletzt vor"),
                                                                 ("Start vor 7 Min., Rückgabewert 15 Min. alt (normal)", 7, 15, True, "zuletzt vor"),
                                                                 ("Start vor 7 Min., GAR kein Rückgabewert (Code-Review: vorher grün bis 15 Minuten)", 7, None, False, "gar keinen Rückgabewert"),
                                                                 ("Start vor 14 Min., GAR kein Rückgabewert", 14, None, False, "gar keinen Rückgabewert"),
                                                                 ("Start vor 4 Min., GAR kein Rückgabewert (der erste Durchgang läuft noch)", 4, None, True, "zuletzt vor")):
                    z20 = ampel20(lebt20, rc20)
                    pruefe(f"Ampel «Nachkontrolle (Aufgabenplanung)», veralteter Rückgabewert: {fall20} → {'grün' if erwartet20 else 'rot'}", z20 is not None and z20["ok"] is erwartet20 and wort20 in z20["text"], z20)
                # wichtig 1: eine einzelne Warnung bleibt grau, trägt aber das Kennzeichen «warnung» (die Kopfzeile zählt sie); ab NK_WARN_ROT Durchgängen in Folge ist sie rot
                for fall20, rc_text20, serie_a20, erwartet20, warn20, wort20 in (
                        ("rc=3, Reihe: 1 Warnung", "x rc=3", ("warnung", 1, 3, 2), None, True, "letzte Durchgang meldete eine WARNUNG"),
                        ("rc=3 ohne Reihe-Datei (ältere Bat/Programmstand)", "x rc=3", None, None, True, "letzte Durchgang meldete eine WARNUNG"),
                        ("rc=3, Reihe: 2 Warnungen in Folge", "x rc=3", ("warnung", 2, 13, 2), False, False, "seit 2 Durchgängen in Folge"),
                        ("rc=3, Reihe: 6 Warnungen seit 55 Min.", "x rc=3", ("warnung", 6, 55, 2), False, False, "seit 6 Durchgängen in Folge (rund 55 Min.)"),
                        ("rc=3, die Reihe sagt «ok» (widersprüchlich, z. B. Datei von vorher)", "x rc=3", ("ok", 4, 40, 2), None, True, "WARNUNG"),
                        ("rc=3, die Reihe ist 45 Min. alt (sagt nichts über die Gegenwart)", "x rc=3", ("warnung", 5, 70, 45), None, True, "WARNUNG"),
                        ("rc=0, Reihe: 3× besetzt (normal: Tageslauf/lange Nachkontrolle belegen die Sperre)", "x rc=0", ("besetzt", 3, 25, 2), True, False, "übersprungen (Lauf-Sperre belegt, 3×)"),
                        ("rc=0, Reihe: 4× besetzt (der Halter steht)", "x rc=0", ("besetzt", 4, 35, 2), False, False, "Lauf-Sperre hält ein anderer Lauf"),
                        ("rc=0, Reihe: 4× besetzt, aber 45 Min. alt", "x rc=0", ("besetzt", 4, 95, 45), True, False, "zuletzt vor"),
                        ("rc=0, Reihe: ok", "x rc=0", ("ok", 9, 80, 2), True, False, "zuletzt vor"),
                        ("rc=0, die Reihe sagt «warnung» (widersprüchlich: der Rückgabewert gilt)", "x rc=0", ("warnung", 5, 40, 2), True, False, "zuletzt vor"),
                        ("rc=0, Reihe: 4× besetzt, aber ÜBERHOLT (die Bat beendete danach einen Durchgang ohne pilot.py: kein Buch → rc=0)", "x rc=0", ("besetzt", 4, 35, 8), True, False, "zuletzt vor"),
                        ("rc=3, Reihe: 2 Warnungen, aber ÜBERHOLT (7 Minuten älter als der Rückgabewert)", "x rc=3", ("warnung", 2, 20, 9), None, True, "letzte Durchgang meldete eine WARNUNG")):
                    z20 = ampel20(3, 1, rc_text20, serie_a20)
                    gut20 = z20 is not None and z20["ok"] is erwartet20 and wort20 in z20["text"] and (z20.get("warnung") is True) == warn20 and ("warnung" in z20) == warn20
                    if (fall20.startswith("rc=0, Reihe: ") and erwartet20 is True and "besetzt" not in fall20) or "ÜBERHOLT" in fall20:
                        gut20 = gut20 and "übersprungen" not in z20["text"]
                    if "ÜBERHOLT" in fall20 and "WARNUNG" not in wort20:
                        gut20 = gut20 and "übersprungen" not in z20["text"]
                    pruefe(f"Ampel «Nachkontrolle (Aufgabenplanung)», Reihe der Durchgänge: {fall20} → {'grün' if erwartet20 else 'rot' if erwartet20 is False else 'grau' + (' mit Kennzeichen warnung' if warn20 else '')}", gut20, z20)
                # … eine Reihe, die älter als NK_LEBT_MAX_MIN ist, sagt nichts über die Gegenwart — auch wenn der Rückgabewert daneben (29 Min.) noch gilt und die Reihe ihn nicht um mehr als NK_SERIE_VORSPRUNG_MIN überholt
                # (30,5 statt 31 Minuten: bei genau 2 Minuten Abstand schlägt die Zeit, die der Test selbst braucht, über die Grenze, und die ANDERE Prüfung — «Reihe endet zu lange vor dem Rückgabewert» — verwirft die Reihe schon)
                z20k = ampel20(3, 29, "x rc=3", ("warnung", 5, 60, 30.5))
                pruefe("Ampel «Nachkontrolle (Aufgabenplanung)», Reihe 30,5 Min. alt neben einem 29 Min. alten Rückgabewert (rc=3): die Reihe zählt nicht (älter als 30 Minuten) → grau mit Kennzeichen, nicht rot «seit 5 Durchgängen»",
                       z20k is not None and z20k["ok"] is None and z20k.get("warnung") is True and "WARNUNG" in z20k["text"], z20k)
                # … und die anderen Zeilen tragen das Kennzeichen nie (es steht nur an der Warnung)
                rc_datei18.unlink(missing_ok=True)
                serie20.unlink(missing_ok=True)
                alle20 = C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())
                pruefe("Gesundheit: nur eine WARNUNG trägt das Kennzeichen «warnung» (graue Info-Zeilen und alle übrigen nicht)", [x["name"] for x in alle20 if "warnung" in x] == [], [x for x in alle20 if "warnung" in x])
                rc_datei18.unlink(missing_ok=True)
                serie20.unlink(missing_ok=True)
            finally:
                C.os, C._befehl, C.DATA = alt_os17, alt_bef17, alt_data17
                C._AUFGABE_CACHE.clear()
                C._AUFGABE_CACHE.update(alt_cache17)
        # ── 20. Prüfung wichtig 1: die Kopfzeile der Gesundheits-Karte zählt Warnungen mit (cockpit.html, reine Funktionen — hier mit node ausgeführt) ──
        import re as _re20  # noqa: E402
        import shutil as _sh20  # noqa: E402
        import subprocess as _sp20  # noqa: E402
        _html20 = (Path(C.__file__).parent / "cockpit.html").read_text(encoding="utf-8")
        _m20 = _re20.search(r"// gesund:start[^\n]*\n(.*?)// gesund:ende", _html20, _re20.S)
        _node20 = _sh20.which("node") or ("/opt/node22/bin/node" if Path("/opt/node22/bin/node").exists() else None)
        pruefe("Oberfläche: die Gesundheits-Funktionen (Zeichen, Kopfzeile) stehen als reine Funktionen im Block gesund:start … gesund:ende und die Seite ruft sie auf",
               bool(_m20) and "function gesundKopfzeile(g)" in _m20.group(1) and "function gesundZeichen(x)" in _m20.group(1) and "gesundKopfzeile(g)" in _html20.split("// gesund:ende", 1)[1]
               and ".warn{color:var(--warn-text)}" in _html20 and _html20.count("--warn-text:") == 3, bool(_m20))  # ein Wert für jedes der drei Themen (hell; dunkel per Systemeinstellung; dunkel per Schalter)
        import pilot as _PI21  # noqa: E402
        pruefe("Reihe der Durchgänge: pilot.py (schreibt) und cockpit.py (liest) benennen dieselbe Datei im selben Ordner — jede Seite hat ihre eigene Konstante, nur dieser Test hält sie zusammen",
               _PI21.NK_SERIE.name == C.NK_SERIE and _PI21.NK_SERIE.parent == C.ROOT / "data" and C.NK_SERIE.startswith("krypto-nachkontrolle"), (_PI21.NK_SERIE, C.NK_SERIE))
        pruefe("Übersprungene Durchgänge: die Lampe im Cockpit (NK_BESETZT_ROT) und der Push aufs Handy (pilot.BESETZT_PUSH_AB) springen beim selben Durchgang an — zwei Konstanten, ein Test hält sie zusammen",
               _PI21.BESETZT_PUSH_AB == C.NK_BESETZT_ROT, (_PI21.BESETZT_PUSH_AB, C.NK_BESETZT_ROT))
        # Der Test gehört zum Selbsttest vor dem Handeln (krypto-auto.bat): ein node, das sich nicht starten lässt, darf nie das Handeln blockieren → bei jedem Fehler bleibt es bei der Prüfung der Bauform
        _ok_ = {"name": "a", "ok": True, "text": "x"}
        _grau_ = {"name": "b", "ok": None, "text": "x"}
        _warn_ = {"name": "c", "ok": None, "text": "x", "warnung": True}
        _rot_ = {"name": "d", "ok": False, "text": "x"}
        _faelle20 = {"leer": [], "grau": [_ok_, _grau_], "warn1": [_ok_, _warn_], "warn2": [_warn_, dict(_warn_, name="e")], "rot1": [_rot_, _ok_], "rot2": [_rot_, dict(_rot_, name="f")],
                     "rot_warn": [_rot_, _warn_], "zeichen": [_ok_, _rot_, _warn_, _grau_]}
        k20, _js_kaputt20 = None, None
        _node_ok20 = False
        import tempfile as _tf20  # noqa: E402

        def _node_lauf20(skript_, eingabe_=""):
            """Skript als DATEI starten, Eingabe über stdin (Code-Review der R20: ein Windows-Shim `node.cmd` verstümmelt mehrzeilige `-e`-Skripte und Anführungszeichen in Argumenten)."""
            with _tf20.TemporaryDirectory() as td_:
                f_ = Path(td_) / "kopf.js"
                f_.write_text(skript_, encoding="utf-8")
                return _sp20.run([_node20, str(f_)], input=eingabe_, capture_output=True, text=True, encoding="utf-8", timeout=60)  # node schreibt UTF-8 (⚠, —) — nicht die Zeichentabelle der Konsole
        if _m20 and _node20:
            try:  # erst prüfen, ob node überhaupt läuft (ein nicht startbares node darf den Selbsttest vor dem Handeln nie scheitern lassen); läuft es, ist ein Fehler im Skript ein ECHTER Fehler der Kopfzeile
                _pr20 = _node_lauf20("let e = '';\nprocess.stdin.on('data', d => e += d);\nprocess.stdin.on('end', () => process.stdout.write(JSON.parse(e).wort));\n", json.dumps({"wort": "ok ⚠ \"q\""}))
                _node_ok20 = _pr20.returncode == 0 and _pr20.stdout == 'ok ⚠ "q"'
            except (OSError, _sp20.SubprocessError, ValueError):
                _node_ok20 = False
        if _node_ok20:
            _js20 = _m20.group(1) + ("\nlet eingabe = '';\nprocess.stdin.on('data', d => eingabe += d);\nprocess.stdin.on('end', () => {\n  const faelle = JSON.parse(eingabe);\n  const aus = {};\n"
                                    "  for (const [n, g] of Object.entries(faelle)) aus[n] = {kopf: gesundKopfzeile(g), zeichen: g.map(gesundZeichen)};\n  process.stdout.write(JSON.stringify(aus));\n});\n")
            try:
                r_ = _node_lauf20(_js20, json.dumps(_faelle20))
                k20 = json.loads(r_.stdout) if r_.returncode == 0 and r_.stdout else None
                _js_kaputt20 = None if k20 is not None else (r_.returncode, r_.stderr[-300:])
            except (OSError, _sp20.SubprocessError, ValueError) as ex_:
                k20, _js_kaputt20 = None, repr(ex_)
        if _node_ok20 and k20 is None:
            pruefe("Kopfzeile der Gesundheits-Karte: node läuft, aber die Funktionen gesundKopfzeile/gesundZeichen laufen nicht (Skriptfehler oder ungültige Ausgabe) — ein ECHTER Fehler, kein Grund zum Überspringen", False, _js_kaputt20)
        elif k20 is not None:
            pruefe("Kopfzeile der Gesundheits-Karte: «alles in Ordnung» nur ohne rote Punkte UND ohne Warnung — eine graue Info-Zeile zählt nicht, eine Warnung steht dort (vorher blieb sie grün)",
                   k20["leer"]["kopf"] == "alles in Ordnung" and k20["grau"]["kopf"] == "alles in Ordnung" and k20["warn1"]["kopf"] == "1 Warnung — bitte unten ansehen"
                   and k20["warn2"]["kopf"] == "2 Warnungen — bitte unten ansehen" and k20["rot1"]["kopf"] == "1 Punkt braucht Aufmerksamkeit"
                   and k20["rot2"]["kopf"] == "2 Punkte brauchen Aufmerksamkeit" and k20["rot_warn"]["kopf"] == "1 Punkt braucht Aufmerksamkeit · 1 Warnung", {n_: v_["kopf"] for n_, v_ in k20.items()})
            pruefe("Zeichen der Gesundheits-Zeilen: ✓ grün, ✗ rot, ⚠ für eine Warnung, ○ für grau ohne Warnung",
                   k20["zeichen"]["zeichen"] == ['<span class="plus">✓</span>', '<span class="minus">✗</span>', '<span class="warn">⚠</span>', '<span class="null">○</span>'], k20["zeichen"])
        else:
            pruefe("Kopfzeile der Gesundheits-Karte: node nicht vorhanden oder nicht ausführbar — nur die Bauform geprüft (der Selbsttest vor dem Handeln darf daran nie scheitern)", bool(_m20), _node20)
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

        # ── Ampel «Handy-Nachrichten» (Backlog 5/12): Telegram voll / nur ntfy / Telegram nur halb / nichts / echtes Geld ──
        def hn21(env_):
            return {x["name"]: x for x in C.gesundheit(env_, {"entscheide": []}, {}, heute)}["Handy-Nachrichten"]
        z21 = hn21({"TELEGRAM_BOT_TOKEN": "t", "TELEGRAM_CHAT_ID": "1"})
        pruefe("Handy-Nachrichten: Token UND Chat-Nummer → grün «Telegram»", z21["ok"] is True and z21["text"] == "Telegram" and "warnung" not in z21, z21)
        z21 = hn21({"TELEGRAM_BOT_TOKEN": "t", "TELEGRAM_CHAT_ID": "1", "KI_BOT_NTFY": "n"})
        pruefe("Handy-Nachrichten: Telegram und ntfy → grün, beide genannt", z21["ok"] is True and z21["text"] == "Telegram und ntfy", z21)
        z21 = hn21({"KI_BOT_NTFY": "n"})
        pruefe("Handy-Nachrichten: nur ntfy → grün «ntfy» (wie bisher)", z21["ok"] is True and z21["text"] == "ntfy" and "warnung" not in z21, z21)
        for fall21, env21, fehlt21 in (("nur der Token", {"TELEGRAM_BOT_TOKEN": "t-geheim-123"}, "Chat-Nummer"), ("nur die Chat-Nummer", {"TELEGRAM_CHAT_ID": "1"}, "Token")):
            z21 = hn21(env21)
            pruefe(f"Handy-Nachrichten: Telegram nur halb eingerichtet ({fall21}) → graue WARNUNG, nennt den fehlenden Teil und telegram-einrichten.bat",
                   z21["ok"] is None and z21.get("warnung") is True and "nur halb eingerichtet" in z21["text"] and f"{fehlt21} fehlt" in z21["text"] and "telegram-einrichten.bat" in z21["text"], z21)
            z21n = hn21({**env21, "KI_BOT_NTFY": "n"})
            pruefe(f"Handy-Nachrichten: Telegram halb ({fall21}), aber ntfy da → grün, der Hinweis steht trotzdem dabei", z21n["ok"] is True and "nur halb eingerichtet" in z21n["text"] and "warnung" not in z21n, z21n)
            pruefe(f"Handy-Nachrichten: der Token steht nie in der Zeile ({fall21})", "t-geheim-123" not in json.dumps(z21) + json.dumps(z21n))
        z21 = hn21({})
        pruefe("Handy-Nachrichten: nichts eingerichtet (Testnetz) → grau ohne Warnung, nennt telegram-einrichten.bat und «optional»",
               z21["ok"] is None and "warnung" not in z21 and "telegram-einrichten.bat" in z21["text"] and "optional" in z21["text"], z21)
        echt21 = {"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"}
        z21 = hn21(echt21)
        pruefe("Handy-Nachrichten: mit ECHTEM Geld und ohne jede Handy-Nachricht → rot", z21["ok"] is False and "ECHTEM Geld" in z21["text"] and "telegram-einrichten.bat" in z21["text"], z21)
        pruefe("Handy-Nachrichten: mit ECHTEM Geld und Telegram → grün", hn21({**echt21, "TELEGRAM_BOT_TOKEN": "t", "TELEGRAM_CHAT_ID": "1"})["ok"] is True)
        pruefe("Handy-Nachrichten: mit ECHTEM Geld und nur halbem Telegram → grau mit Warnung (nicht grün)", hn21({**echt21, "TELEGRAM_BOT_TOKEN": "t"})["ok"] is None and hn21({**echt21, "TELEGRAM_BOT_TOKEN": "t"}).get("warnung") is True)

        # ── Ampel «Täglicher Start» / «Nachkontrolle» (Backlog 13): zeigt die Aufgabe auf DIESE Kopie? Nach dem Entpacken in einen NEUEN Ordner liefe der Pilot still mit der alten Kopie weiter ──
        from xml.sax.saxutils import escape as esc21
        WIN_NEU, WIN_ALT = r"C:\Krypto Neu\tools\trading\krypto_bot", r"C:\Krypto Alt\tools\trading\krypto_bot"

        def xml_win21(xml_text, datei, ziel):
            """Die Aufgaben-XML mit einem Windows-Pfad statt dem Pfad dieses Rechners (maskiert wie im echten Aufruf)."""
            return xml_text.replace(esc21(str(C.HIER / datei)), esc21(ziel))

        def schtasks21(xml_tag, xml_nk, da=True, da_nk=True, xml_ok=True, mitschnitt=None):
            def f(cmd, zeit):
                if mitschnitt is not None:
                    mitschnitt.append(list(cmd))
                name21 = cmd[cmd.index("/tn") + 1] if "/tn" in cmd else ""
                if cmd[:2] == ["schtasks", "/query"]:
                    if "/xml" in cmd:
                        return xml_ok, (xml_nk if name21 == C.AUFGABE_NK else xml_tag)
                    return (da_nk if name21 == C.AUFGABE_NK else da), ""
                return True, ""
            return f

        def aufgaben_xml21(tag_ordner, nk_ordner):
            return (xml_win21(C.aufgabe_xml(), "krypto-auto.bat", tag_ordner + r"\krypto-auto.bat"),
                    xml_win21(C.aufgabe_xml_nk(), C.NK_STARTER, nk_ordner + "\\" + C.NK_STARTER))
        xt21, xn21 = aufgaben_xml21(WIN_NEU, WIN_NEU)
        mit21 = []
        pruefe("aufgabe_ziel: liest den Pfad der täglichen Aufgabe aus der XML (nur lesend: /query … /xml)",
               C.aufgabe_ziel(schtasks21(xt21, xn21, mitschnitt=mit21)) == WIN_NEU + r"\krypto-auto.bat" and mit21 == [["schtasks", "/query", "/tn", C.AUFGABE, "/xml"]], (mit21,))
        pruefe("aufgabe_ziel: liest den Pfad des unsichtbaren Starters der Nachkontrolle aus <Arguments> (in Anführungszeichen, mit Leerzeichen im Pfad)",
               C.aufgabe_ziel(schtasks21(xt21, xn21), name=C.AUFGABE_NK, datei=C.NK_STARTER) == WIN_NEU + "\\" + C.NK_STARTER)
        xt_amp21, _ = aufgaben_xml21(r"C:\R&D Krypto\tools\trading\krypto_bot", WIN_NEU)
        pruefe("aufgabe_ziel: ein «&» im Ordnernamen (in der XML als &amp;) kommt richtig zurück", "&amp;" in xt_amp21 and C.aufgabe_ziel(schtasks21(xt_amp21, "")) == r"C:\R&D Krypto\tools\trading\krypto_bot\krypto-auto.bat")
        for fall21, xml21, erwartet21 in (
                ("einfache Variante: Pfad in Anführungszeichen im <Command>", '<Task><Actions><Exec><Command>"C:\\Krypto Neu\\x\\krypto-auto.bat"</Command><Arguments>auto</Arguments></Exec></Actions></Task>', r"C:\Krypto Neu\x\krypto-auto.bat"),
                ("über cmd.exe: Pfad in Anführungszeichen in <Arguments>", '<Exec><Command>cmd.exe</Command><Arguments>/c "C:\\a b\\krypto-auto.bat" auto</Arguments></Exec>', r"C:\a b\krypto-auto.bat"),
                ("Netzpfad", "<Exec><Command>\\\\server\\freigabe\\krypto\\krypto-auto.bat</Command></Exec>", r"\\server\freigabe\krypto\krypto-auto.bat"),
                ("Gross-/Kleinschreibung der Datei", r"<Exec><Command>C:\x\KRYPTO-AUTO.BAT</Command></Exec>", r"C:\x\KRYPTO-AUTO.BAT"),
                ("leere Ausgabe", "", None), ("keine <Command>-Zeile", "<Task><Actions/></Task>", None),
                ("eine ganz andere Datei", r"<Exec><Command>C:\Windows\notepad.exe</Command></Exec>", None),
                ("nur der Dateiname, kein Pfad", "<Exec><Command>krypto-auto.bat</Command></Exec>", None),
                ("Dateiname mit Schalter davor, aber ohne Anführungszeichen (kein sicherer Pfad)", r"<Exec><Command>cmd.exe</Command><Arguments>/c C:\a\krypto-auto.bat</Arguments></Exec>", None)):
            pruefe(f"aufgabe_ziel: {fall21}", C.aufgabe_ziel(schtasks21(xml21, xml21)) == erwartet21, C.aufgabe_ziel(schtasks21(xml21, xml21)))
        pruefe("aufgabe_ziel: scheitert der Befehl, gibt es keinen Pfad (und keinen Absturz)", C.aufgabe_ziel(schtasks21(xt21, xn21, xml_ok=False)) is None)
        class _POSIX21:  # auch auf dem PC des Users (Windows) gilt der Test: dort nie die echte Aufgabenplanung abfragen
            name = "posix"

            def __getattr__(self, a_):
                import os as _os21
                return getattr(_os21, a_)
        aufrufe21 = []
        alt_os21, alt_bef21 = C.os, C._befehl
        C.os, C._befehl = _POSIX21(), (lambda cmd, zeit: (aufrufe21.append(list(cmd)) or True, r"<Exec><Command>C:\x\krypto-auto.bat</Command></Exec>"))
        try:
            pruefe("aufgabe_ziel: ausserhalb von Windows und ohne Befehl: nichts gestartet (kein einziger Aufruf), None", C.aufgabe_ziel() is None and aufrufe21 == [], aufrufe21)
        finally:
            C.os, C._befehl = alt_os21, alt_bef21
        pruefe("aufgabe_ziel: kommt der Dateiname schon im Ordnernamen vor, zählt der letzte Treffer (die Datei selbst)",
               C.aufgabe_ziel(schtasks21(r"<Exec><Command>C:\Sicherung krypto-auto.bat\neu\krypto-auto.bat</Command></Exec>", "")) == r"C:\Sicherung krypto-auto.bat\neu\krypto-auto.bat")
        # aufgabe_lage (reine Entscheidung, Dateiprüfung eingespeist)
        L21, ist_da21 = C.aufgabe_lage, (lambda p_: True)
        pruefe("aufgabe_lage: derselbe Pfad in anderer Schreibweise (Gross/Klein, Schrägstriche) → gleich", L21("c:/krypto neu/TOOLS/trading/krypto_bot/KRYPTO-AUTO.BAT", WIN_NEU + r"\krypto-auto.bat") == "gleich")
        pruefe("aufgabe_lage: mit dem Vorsatz \\\\?\\ → gleich", L21("\\\\?\\" + WIN_NEU + r"\krypto-auto.bat", WIN_NEU + r"\krypto-auto.bat") == "gleich")
        pruefe("aufgabe_lage: andere Kopie, die Datei gibt es dort → anders", L21(WIN_ALT + r"\krypto-auto.bat", WIN_NEU + r"\krypto-auto.bat", existiert=ist_da21, gleich=lambda a, b: False) == "anders")
        pruefe("aufgabe_lage: anderer Name, aber dieselbe Datei (8.3-Name, Verknüpfung) → gleich", L21(r"C:\KRYPTO~1\krypto-auto.bat", WIN_NEU + r"\krypto-auto.bat", existiert=ist_da21, gleich=lambda a, b: True) == "gleich")
        pruefe("aufgabe_lage: die Datei gibt es nicht mehr → weg", L21(WIN_ALT + r"\krypto-auto.bat", WIN_NEU + r"\krypto-auto.bat", existiert=lambda p_: False) == "weg")
        pruefe("aufgabe_lage: mit «ü» im Pfad (Ausgabe vielleicht verstümmelt) und nicht auffindbar → anders, nie weg", L21(r"C:\Müller Alt\krypto-auto.bat", WIN_NEU + r"\krypto-auto.bat", existiert=lambda p_: False) == "anders")
        pruefe("aufgabe_lage: nur das «ü» ist verstümmelt (U+FFFD) → gleich, kein falscher Alarm", L21("C:\\M\ufffdller\\krypto-auto.bat", r"C:\Müller\krypto-auto.bat") == "gleich")
        pruefe("aufgabe_lage: kein Ziel gelesen → None", L21(None, WIN_NEU) is None and L21("", WIN_NEU) is None)
        pruefe("aufgabe_lage: ein Pfad in Anführungszeichen (so steht er manchmal in der Aufgabe) zählt wie ohne", L21('"' + WIN_NEU + r'\krypto-auto.bat"', WIN_NEU + r"\krypto-auto.bat") == "gleich")

        def boese21(a, b):
            raise OSError("Zugriff verweigert")
        pruefe("aufgabe_lage: ein Fehler beim Prüfen → None (nichts behaupten)", L21(WIN_ALT + r"\krypto-auto.bat", WIN_NEU + r"\krypto-auto.bat", existiert=ist_da21, gleich=boese21) is None)

        # … und in der Ampel (Windows-Zweig von gesundheit() mit vorgetäuschtem os.name == "nt", eigenem data/-Ordner, eigenen Zielen und eigener Dateiprüfung)
        class _NT21:
            name = "nt"

            def __getattr__(self, a_):
                import os as _os21
                return getattr(_os21, a_)
        alt21 = (C.os, C._befehl, C.DATA, C._soll_ziele, C._datei_da, C._selbe_datei, dict(C._AUFGABE_CACHE))
        with tempfile.TemporaryDirectory() as td21:
            try:
                C.DATA = Path(td21)
                C.os = _NT21()
                C._soll_ziele = lambda: (WIN_NEU + r"\krypto-auto.bat", WIN_NEU + "\\" + C.NK_STARTER)
                C._selbe_datei = lambda a, b: False

                def ampel21(xml_tag, xml_nk, da=True, da_nk=True, xml_ok=True, mitschnitt=None, da_alt=True):
                    C._AUFGABE_CACHE.update({"zeit": 0.0, "wert": None, "wert_nk": None, "ziel": None, "ziel_nk": None})
                    C._befehl = schtasks21(xml_tag, xml_nk, da, da_nk, xml_ok, mitschnitt)
                    C._datei_da = lambda p_: da_alt if "Alt" in str(p_) else True
                    return {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, heute)}
                for fall21, (xt_, xn_), erw_tag21, erw_nk21 in (("beide zeigen auf diesen Ordner", aufgaben_xml21(WIN_NEU, WIN_NEU), "gleich", "gleich"),
                                                                ("der tägliche Start zeigt auf eine andere Kopie", aufgaben_xml21(WIN_ALT, WIN_NEU), "anders", "gleich"),
                                                                ("die Nachkontrolle zeigt auf eine andere Kopie", aufgaben_xml21(WIN_NEU, WIN_ALT), "gleich", "anders"),
                                                                ("beide zeigen auf eine andere Kopie", aufgaben_xml21(WIN_ALT, WIN_ALT), "anders", "anders")):
                    a21 = ampel21(xt_, xn_)
                    tag21, nk21 = a21["Täglicher Start (Aufgabenplanung)"], a21["Nachkontrolle (Aufgabenplanung)"]
                    for zeile21, erw21, wort21 in ((tag21, erw_tag21, "ANDEREN Ordner"), (nk21, erw_nk21, "ANDEREN Ordner")):
                        if erw21 == "anders":
                            gut21 = (zeile21["ok"] is None and zeile21.get("warnung") is True and wort21 in zeile21["text"] and WIN_ALT in zeile21["text"] and WIN_NEU in zeile21["text"]
                                     and "Täglich automatisch einrichten" in zeile21["text"] and "fehlt" not in zeile21["text"])
                        else:
                            gut21 = "ANDEREN" not in zeile21["text"] and "warnung" not in zeile21
                        pruefe(f"Ampel Aufgabenplanung ({fall21}): {zeile21['text'][:40]}… → {erw21}", gut21, zeile21)
                    pruefe(f"Ampel Aufgabenplanung ({fall21}): die tägliche Aufgabe ist {'grün' if erw_tag21 == 'gleich' else 'eine graue Warnung'}",
                           (tag21["ok"] is True) == (erw_tag21 == "gleich"), tag21)
                # die Kopf-Zählung: nur die Warnung trägt das Kennzeichen, nichts wird rot
                a21 = ampel21(*aufgaben_xml21(WIN_ALT, WIN_ALT))
                pruefe("Ampel: eine andere Kopie ist nur eine WARNUNG (grau), nie rot — der Pilot läuft ja weiter", [n_ for n_, x_ in a21.items() if "Aufgabenplanung" in n_ and x_["ok"] is False] == [])
                # die Zieldatei der Aufgabe gibt es nicht mehr → rot, mit dem Weg zur Reparatur
                a21 = ampel21(*aufgaben_xml21(WIN_ALT, WIN_ALT), da_alt=False)
                for n_ in ("Täglicher Start (Aufgabenplanung)", "Nachkontrolle (Aufgabenplanung)"):
                    z_ = a21[n_]
                    pruefe(f"Ampel {n_}: die Zieldatei gibt es nicht mehr → rot, ohne das Wort «fehlt» (sonst legte die Selbstheilung die Aufgabe ungefragt neu an)",
                           z_["ok"] is False and "nicht mehr" in z_["text"] and WIN_ALT in z_["text"] and "Täglich automatisch einrichten" in z_["text"] and "fehlt" not in z_["text"], z_)
                # kein Befund, wenn die Ausgabe nicht zu lesen ist (kein falscher Alarm)
                for fall21, kw21 in (("schtasks liefert keine XML", {"xml_ok": False}), ("XML ohne Befehl", {})):
                    a21 = ampel21("<Task/>" if not kw21 else "", "<Task/>" if not kw21 else "", **kw21)
                    pruefe(f"Ampel Aufgabenplanung: {fall21} → keine Warnung, die tägliche Aufgabe bleibt grün",
                           a21["Täglicher Start (Aufgabenplanung)"]["ok"] is True and "warnung" not in a21["Täglicher Start (Aufgabenplanung)"] and "ANDEREN" not in a21["Nachkontrolle (Aufgabenplanung)"]["text"], a21["Täglicher Start (Aufgabenplanung)"])
                # nur fragen, wenn es die Aufgabe gibt, und nur einmal je Aufgabe und fünf Minuten
                m21 = []
                ampel21(xt21, xn21, mitschnitt=m21)
                C.gesundheit({}, {"entscheide": []}, {}, heute)
                pruefe("Ampel: je Aufgabe genau EINE XML-Abfrage (Zwischenspeicher von 5 Minuten, kein schtasks bei jedem Abruf)", len([c_ for c_ in m21 if "/xml" in c_]) == 2, m21)
                m21 = []
                ampel21(xt21, xn21, da=False, da_nk=False, mitschnitt=m21)
                pruefe("Ampel: gibt es die Aufgabe gar nicht, wird auch keine XML gelesen (und es bleibt bei «fehlt», damit die Selbstheilung sie anlegt)",
                       not [c_ for c_ in m21 if "/xml" in c_] and "fehlt" in ampel21(xt21, xn21, da=False, da_nk=False)["Täglicher Start (Aufgabenplanung)"]["text"])
                # Selbstheilung: «anders» und «weg» sind ein Hinweis, die Aufgabe wird NICHT von selbst umgebogen
                for fall21, kw21 in (("andere Kopie", {}), ("Zieldatei weg", {"da_alt": False})):
                    erstellt21 = []

                    def bef21(cmd, zeit, erstellt=erstellt21, f=None):
                        if cmd[:2] == ["schtasks", "/create"]:
                            erstellt.append(cmd)
                        return C._befehl(cmd, zeit)
                    ampel21(*aufgaben_xml21(WIN_ALT, WIN_ALT), **kw21)
                    ok21, text21 = C.selbstheilung(starter=lambda a_, z_: (True, "ok"), befehl=bef21,
                                                   punkte_lesen=lambda: list(ampel21(*aufgaben_xml21(WIN_ALT, WIN_ALT), **kw21).values()), mit_probelauf=False)
                    pruefe(f"Selbstheilung ({fall21}): keine Aufgabe neu angelegt oder umgebogen, der Hinweis steht unter «noch offen»",
                           erstellt21 == [] and "Danach noch offen" in text21 and "Täglicher Start (Aufgabenplanung)" in text21 and "Täglich automatisch einrichten" in text21, (erstellt21, text21[:300]))
            finally:
                C.os, C._befehl, C.DATA, C._soll_ziele, C._datei_da, C._selbe_datei = alt21[:6]
                C._AUFGABE_CACHE.clear()
                C._AUFGABE_CACHE.update(alt21[6])

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
        # Gesundheit nennt den Grund des gescheiterten Auftrags (Binance-Antwort aus dem Broker-Protokoll)
        _lb_x = {"entscheide": [{"stand": "2026-01-19"}], "letzter_lauf": {
            "zeit": "2026-01-20T02:31:00+00:00", "ok": False, "hinweise": ["⚠️ Mindestens ein Auftrag scheiterte — bitte im Konto prüfen."]}}
        _bp = Path(tmp) / "ki-bot-broker.json"
        _bp.write_text(json.dumps([
            {"zeit": "2026-01-19T02:31:00+00:00", "broker": "binance-futures", "symbol": "ETHUSDT", "trocken": False,
             "auftraege": [{"seite": "BUY", "menge": 0.4, "fehler": "HTTP -1111: Precision is over the maximum."}]},
            {"zeit": "2026-01-20T02:31:00+00:00", "broker": "binance-futures", "symbol": "BTCUSDT", "trocken": False,
             "auftraege": [{"seite": "BUY", "menge": 0.0128, "status": "FILLED"}, {"seite": "BUY", "menge": 0.0128, "fehler": "HTTP -2019:   Margin is insufficient."}]},
            {"zeit": "2026-01-20T03:00:00+00:00", "broker": "binance-futures", "symbol": "SOLUSDT", "trocken": True,
             "auftraege": [{"seite": "BUY", "menge": 1, "fehler": "nur Probelauf"}]}]), encoding="utf-8")
        try:
            gx = {x["name"]: x for x in C.gesundheit({}, _lb_x, {}, heute2)}["Letzter Lauf mit Aufträgen"]
            pruefe("Gesundheit: gescheiterter Auftrag nennt Symbol und Grund von Binance (jüngster echter, Leerzeichen bereinigt)",
                   gx["ok"] is False and "BTCUSDT BUY 0.0128: HTTP -2019: Margin is insufficient." in gx["text"]
                   and "Mindestens ein Auftrag scheiterte" in gx["text"] and "Probelauf" not in gx["text"], gx)
            _bp.write_text("{kaputt", encoding="utf-8")
            gk = {x["name"]: x for x in C.gesundheit({}, _lb_x, {}, heute2)}["Letzter Lauf mit Aufträgen"]
            pruefe("Gesundheit: kaputtes Broker-Protokoll stört die Anzeige nicht (Text wie bisher, ohne Grund)",
                   gk["ok"] is False and "Grund:" not in gk["text"] and "Mindestens ein Auftrag scheiterte" in gk["text"], gk)
        finally:
            _bp.unlink(missing_ok=True)
        gn = {x["name"]: x for x in C.gesundheit({}, _lb_x, {}, heute2)}["Letzter Lauf mit Aufträgen"]
        pruefe("Gesundheit: ohne Broker-Protokoll bleibt der Text wie bisher", "Grund:" not in gn["text"] and gn["ok"] is False, gn)
        # ── Selbstheilung: «Alles prüfen und reparieren» heilt nur Heilbares und sendet nie Aufträge ──
        def _pkt(name, ok, text, **kw):
            return {"name": name, "ok": ok, "text": text, **kw}
        _vor = [_pkt("Täglicher Start (Aufgabenplanung)", False, "fehlt — Knopf «Täglich automatisch einrichten»"),
                _pkt("Nachkontrolle (Aufgabenplanung)", False, "fehlt — Knopf «Täglich automatisch einrichten» legt sie mit an"),
                _pkt("Markt-Infos", False, "vor 80 Std. geladen — Knopf «Markt-Infos»"),
                _pkt("Claude (KI-Trader)", False, "noch keine Einschätzung"),
                _pkt("Risiko-Stufe", None, "2× bestand den Test nicht", warnung=True)]
        _nach = [_pkt("Täglicher Start (Aufgabenplanung)", True, "eingerichtet (02:30)"), _pkt("Nachkontrolle (Aufgabenplanung)", True, "eingerichtet"),
                 _pkt("Markt-Infos", True, "vor 0 Std. geladen"), _pkt("Claude (KI-Trader)", False, "noch keine Einschätzung"),
                 _pkt("Risiko-Stufe", None, "2× bestand den Test nicht", warnung=True)]

        def _reihe(*listen):
            it = iter(listen)
            return lambda: next(it)
        _starts, _cmds = [], []

        def _starter(args, zeit):
            _starts.append(list(args))
            return True, "Futures: Position liegt im Zielbereich — keine Aufträge."

        def _bef(c, z):
            _cmds.append(list(c))
            return True, "ERFOLGREICH"
        _alt_pause, _alt_stop = C.PAUSE, C.STOP
        C.PAUSE, C.STOP = Path(tmp) / "PAUSE-nicht-da", Path(tmp) / "STOP-nicht-da"
        try:
            ok_h, t_h = C.selbstheilung(starter=_starter, befehl=_bef, punkte_lesen=_reihe(_vor, _nach))
            pruefe("Selbstheilung: fehlende Aufgaben werden angelegt (schtasks /create), Ergebnis ok",
                   ok_h is True and "Aufgabenplanung eingerichtet" in t_h and any(c[:2] == ["schtasks", "/create"] for c in _cmds), (ok_h, t_h, _cmds))
            pruefe("Selbstheilung: veraltete Markt-Infos werden aufgefrischt, der Prüflauf läuft nur als --trocken",
                   ["infos.py"] in _starts and ["pilot.py", "--lauf", "--trocken"] in _starts, _starts)
            pruefe("Selbstheilung sendet NIE Aufträge: kein Lauf ohne --trocken, kein KI-Trader, kein Sparplan",
                   all(a == ["infos.py"] or "--trocken" in a for a in _starts)
                   and not any(a[0] in ("ki_trader.py", "eth_sammler.py", "handeln") for a in _starts), _starts)
            pruefe("Selbstheilung: was bleibt, steht mit Anweisung da (Claude-Schlüssel, Risiko-Stufe als Warnung)",
                   "Danach noch offen:" in t_h and "✗ Claude (KI-Trader)" in t_h and "console.anthropic.com" in t_h
                   and "⚠ Risiko-Stufe" in t_h and "höchstens" not in t_h.split("Danach noch offen:")[0], t_h)
            # Auto-Handel aus (Pause): Aufgaben NICHT anlegen
            _cmds.clear()
            C.PAUSE.write_text("", encoding="utf-8")
            ok_p, t_p = C.selbstheilung(starter=_starter, befehl=_bef, punkte_lesen=_reihe(_vor, _vor))
            pruefe("Selbstheilung bei Auto-Handel AUS: legt keine Aufgaben an und sagt warum",
                   not _cmds and "NICHT angelegt" in t_p and "Auto-Handel ist aus" in t_p, (t_p, _cmds))
            C.PAUSE.unlink()
            # Einrichten scheitert: ❌ und ok False
            ok_f, t_f = C.selbstheilung(starter=_starter, befehl=lambda c, z: (False, "Zugriff verweigert"), punkte_lesen=_reihe(_vor, _vor))
            pruefe("Selbstheilung: scheitert das Einrichten, steht ❌ da und das Ergebnis ist nicht ok",
                   ok_f is False and "❌ Aufgabenplanung" in t_f and "Zugriff verweigert" in t_f, (ok_f, t_f))
            # «läuft nicht» ist nicht «fehlt»: nichts neu anlegen, nur melden
            _cmds.clear()
            _lauft_nicht = [_pkt("Täglicher Start (Aufgabenplanung)", True, "eingerichtet (02:30)"),
                            _pkt("Nachkontrolle (Aufgabenplanung)", False, "eingerichtet, aber seit 45 Min. kein Lauf — läuft der unsichtbare Starter nicht?")]
            _o, _t = C.selbstheilung(starter=_starter, befehl=_bef, punkte_lesen=_reihe(_lauft_nicht, _lauft_nicht))
            pruefe("Selbstheilung legt nichts neu an, wenn die Aufgabe da ist und nur nicht läuft (bleibt als Hinweis stehen)",
                   not _cmds and "Nachkontrolle (Aufgabenplanung): eingerichtet, aber seit 45 Min." in _t, (_cmds, _t))
            # Prüflauf scheitert: ❌ mit letzter Zeile
            ok_l, t_l = C.selbstheilung(starter=lambda a, z: (False, "x\nBinance antwortet HTTP 401"), befehl=_bef,
                                        punkte_lesen=_reihe(_nach, _nach))
            pruefe("Selbstheilung: scheitert der Prüflauf, wird das laut gemeldet (kein stilles «alles gut»)",
                   ok_l is False and "FEHLGESCHLAGEN" in t_l and "HTTP 401" in t_l, (ok_l, t_l))
            # Alles gesund: nichts anfassen ausser dem Prüflauf
            _starts.clear(); _cmds.clear()
            ok_g, t_g = C.selbstheilung(starter=_starter, befehl=_bef, punkte_lesen=_reihe([_nach[0], _nach[1], _nach[2]], [_nach[0], _nach[1], _nach[2]]))
            pruefe("Selbstheilung bei gesundem System: keine Aufgabe, keine Markt-Infos, nur der Prüflauf, «alles in Ordnung»",
                   not _cmds and _starts == [["pilot.py", "--lauf", "--trocken"]] and "alles in Ordnung" in t_g, (_cmds, _starts, t_g))
            # Der Knopf (aktion) liefert das Protokoll mit Titel und Ergebnis
            e_h = C.aktion("heilen", starter=_starter, befehl=_bef)
            pruefe("Aktion «heilen»: Protokolleintrag mit Titel und Text", e_h["titel"] == "Alles prüfen und reparieren" and "Prüfung und Reparatur" in e_h["text"], e_h)
        finally:
            C.PAUSE, C.STOP = _alt_pause, _alt_stop
            (Path(tmp) / "PAUSE-nicht-da").unlink(missing_ok=True)
        # ── Gesundheit: Risiko-Stufe ──
        import pilot_kern as _K
        _alt_einst = _K.EINSTELLUNGEN
        _K.EINSTELLUNGEN = Path(tmp) / "krypto-einstellungen-test.json"
        try:
            def _stufe(wert, env=None):
                _K.EINSTELLUNGEN.write_text(json.dumps({"risiko": wert}), encoding="utf-8")
                return {x["name"]: x for x in C.gesundheit(env or {}, {"entscheide": []}, {}, heute2)}["Risiko-Stufe"]
            _echt = {"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"}
            s1, s175, s2, s2e = _stufe(1.0), _stufe(1.75), _stufe(2.0), _stufe(2.0, _echt)
            pruefe("Risiko-Stufe 1×: grün", s1["ok"] is True and "Standard" in s1["text"], s1)
            pruefe("Risiko-Stufe 1,75×: Info ohne Warnung (grau)", s175["ok"] is None and not s175.get("warnung") and "1,75×" in s175["text"], s175)
            pruefe("Risiko-Stufe 2× im Testnetz: graue WARNUNG (zählt mit), Test nicht bestanden",
                   s2["ok"] is None and s2.get("warnung") is True and "bestand den Test nicht" in s2["text"], s2)
            pruefe("Risiko-Stufe 2× mit ECHTEM GELD: rot", s2e["ok"] is False and "ECHTEM GELD" in s2e["text"], s2e)
        finally:
            _K.EINSTELLUNGEN = _alt_einst
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
            pruefe("Kontoanteil: Testnetz-Turbo 0,8, KRYPTO_TEMPO=normal und Echtgeld 0,5, KI_BOT_ANTEIL=0.3 → 0,3 (die Testzahlen gelten fürs ganze Konto)",
                   C.konto_anteil({}) == 0.8 and C.konto_anteil({"KRYPTO_TEMPO": "normal"}) == 0.5 and C.konto_anteil({"KI_BOT_ANTEIL": "0.3"}) == 0.3
                   and C.konto_anteil({"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"}) == 0.5
                   and C.stand(env={})["risiko"]["anteil"] == 0.8 and C.stand(env={"KI_BOT_ANTEIL": "1"})["risiko"]["anteil"] == 1.0)
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
        # Fund vom 03.11.2026 (Cockpit-Bild des Besitzers): «✗ Claude (KI-Trader) — noch keine Einschätzung» sagte nicht, WARUM — jetzt steht der Grund des letzten Versuchs da
        _ki_fehler = {"entscheide": [], "letzter_fehler": {"zeit": "2026-01-19T02:31:00+00:00", "stand": "2026-01-18",
                                                            "hinweis": "Claude nicht erreichbar: AuthenticationError: 401 invalid x-api-key"}}
        _h20 = datetime(2026, 1, 20, tzinfo=timezone.utc).date()
        gk2 = {x["name"]: x for x in C.gesundheit({"ANTHROPIC_API_KEY": "k"}, {"entscheide": []}, _ki_fehler, _h20)}["Claude (KI-Trader)"]
        pruefe("KI-Ampel: ohne je eine Einschätzung nennt die Zeile den Grund des letzten Versuchs (401) und dessen Zeit",
               gk2["ok"] is False and "noch keine Einschätzung" in gk2["text"] and "AuthenticationError: 401" in gk2["text"] and "2026-01-19 02:31 UTC" in gk2["text"], gk2)
        gk3 = {x["name"]: x for x in C.gesundheit({"ANTHROPIC_API_KEY": "k"}, {"entscheide": []}, {"entscheide": [], "letzter_fehler": "kaputt"}, _h20)}["Claude (KI-Trader)"]
        pruefe("KI-Ampel: ein beschädigter Fehler-Eintrag (kein Objekt) stört nicht", gk3["ok"] is False and gk3["text"] == "noch keine Einschätzung", gk3)
        gk4 = {x["name"]: x for x in C.gesundheit({"ANTHROPIC_API_KEY": "k"}, {"entscheide": []}, {"entscheide": [{"stand": "2026-01-19"}]}, _h20)}["Claude (KI-Trader)"]
        pruefe("KI-Ampel: frische Einschätzung bleibt grün und ohne Fehlertext", gk4["ok"] is True and gk4["text"] == "letzte Einschätzung 2026-01-19", gk4)
        _ki_alt_fehler = {"entscheide": [{"stand": "2026-01-10"}], "letzter_fehler": {"zeit": "2026-01-19T02:31:00+00:00", "stand": "2026-01-18", "hinweis": "Guthaben leer"}}
        gk5 = {x["name"]: x for x in C.gesundheit({"ANTHROPIC_API_KEY": "k"}, {"entscheide": []}, _ki_alt_fehler, _h20)}["Claude (KI-Trader)"]
        pruefe("KI-Ampel: alte Einschätzung PLUS gescheiterter neuer Versuch nennt beides", gk5["ok"] is False and "10 Tage alt" in gk5["text"] and "Guthaben leer" in gk5["text"], gk5)

        # Handelstempo (03.11.2026, Wunsch «schnell und hohes Risiko»): die Gesundheits-Zeile nennt Turbo oder vorsichtig mit den Zahlen
        _h20t = datetime(2026, 1, 20, tzinfo=timezone.utc).date()
        gt0 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, _h20t)}["Handelstempo"]
        gt1 = {x["name"]: x for x in C.gesundheit({"KRYPTO_TEMPO": "normal"}, {"entscheide": []}, {}, _h20t)}["Handelstempo"]
        gt2 = {x["name"]: x for x in C.gesundheit({"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"}, {"entscheide": []}, {}, _h20t)}["Handelstempo"]
        pruefe("Handelstempo-Zeile: Testnetz = Turbo mit 80 % und «in einem Lauf», grau ohne Alarm, nennt den Rückweg",
               gt0["ok"] is None and not gt0.get("warnung") and "Turbo (Testnetz)" in gt0["text"] and "80 %" in gt0["text"] and "KRYPTO_TEMPO normal" in gt0["text"], gt0)
        pruefe("Handelstempo-Zeile: normal = 50 % und höchstens 1'000 USDT je Auftrag, nennt den Weg zurück zum Turbo",
               gt1["ok"] is None and "vorsichtig" in gt1["text"] and "50 %" in gt1["text"] and "1'000 USDT" in gt1["text"] and "Turbo im Testnetz" in gt1["text"], gt1)
        pruefe("Handelstempo-Zeile: echtes Geld ist immer vorsichtig und sagt es", "vorsichtig" in gt2["text"] and "echtes Geld: immer vorsichtig" in gt2["text"] and "Turbo (Testnetz)" not in gt2["text"], gt2)

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

# ── Auto-Update und automatische Pflege im Cockpit (nur Wegwerf-Ordner, nie das echte Update, nie echte Aufgaben) ──
import contextlib as _cl  # noqa: E402
import io as _io  # noqa: E402
import tempfile as _tf  # noqa: E402
import autoupdate as _AU  # noqa: E402
import pflege as _PF  # noqa: E402
pruefe("AKTIONEN: heilen_auto und update vorhanden", "heilen_auto" in C.AKTIONEN and "update" in C.AKTIONEN)
_s_auto = []
with _tf.TemporaryDirectory() as _td_a:
    _alt_a = (C.DATA, C.PAUSE, C.STOP, C.ROOT)
    C.DATA, C.PAUSE, C.STOP = Path(_td_a) / "data", Path(_td_a) / "PAUSE-nein", Path(_td_a) / "STOP-nein"
    try:
        def _st_auto(args, zeit):
            _s_auto.append(list(args))
            return True, "ok"
        ok_m, t_m = C.selbstheilung(starter=_st_auto, befehl=lambda c, z: (True, "ok"), punkte_lesen=lambda: [], mit_probelauf=False)
        pruefe("selbstheilung(mit_probelauf=False): kein Prüflauf des Piloten, kein Prüflauf-Satz im Bericht", ["pilot.py", "--lauf", "--trocken"] not in _s_auto and "Prüflauf" not in t_m and ok_m, (_s_auto, t_m))
        ok_m, t_m = C.selbstheilung(starter=_st_auto, befehl=lambda c, z: (True, "ok"), punkte_lesen=lambda: [])
        pruefe("selbstheilung (Standard): der Prüflauf ohne Aufträge läuft weiterhin", ["pilot.py", "--lauf", "--trocken"] in _s_auto and "Prüflauf ohne Aufträge ok" in t_m)
        _s_auto.clear()
        e_ha = C.aktion("heilen_auto", starter=_st_auto, befehl=lambda c, z: (True, "ok"))
        pruefe("Aktion «heilen_auto»: eigener Titel, und der Prüflauf des Piloten läuft dabei NICHT (der Tageslauf war der Test)",
               e_ha["titel"].startswith("Automatische Prüfung") and ["pilot.py", "--lauf", "--trocken"] not in _s_auto and "Prüflauf" not in e_ha["text"], (e_ha["titel"], _s_auto, e_ha["text"][:200]))
        e_u = C.aktion("update", update=lambda: {"ok": True, "ergebnis": "eingespielt", "text": "✅ Programm aktualisiert: a → b"})
        pruefe("Update-Knopf (Paket): neue Version → Hinweis, das Cockpit-Fenster neu zu starten", e_u["ok"] and "neu starten" in e_u["text"] and "aktualisiert" in e_u["text"], e_u)
        e_u = C.aktion("update", update=lambda: {"ok": True, "ergebnis": "aktuell", "text": "Version a ist die neueste"})
        pruefe("Update-Knopf (Paket): nichts Neues → kein Neustart-Hinweis", e_u["ok"] and "neu starten" not in e_u["text"], e_u)
        e_u = C.aktion("update", update=lambda: {"ok": False, "ergebnis": "fehlgeschlagen", "text": "Probelauf nicht bestanden"})
        pruefe("Update-Knopf (Paket): Fehler → ok=False mit dem Grund", not e_u["ok"] and "Probelauf" in e_u["text"], e_u)
        _alt_holen = _AU._holen
        _AU._holen = lambda url, timeout=20, max_bytes=0: (None, b"")
        C.ROOT = Path(_td_a)            # kein .git darin → der Paket-Weg mit dem echten Updater, hier gegen ein Netz, das nichts liefert
        try:
            e_u = C.aktion("update")
        finally:
            C.ROOT = _alt_a[3]
            _AU._holen = _alt_holen
        pruefe("Update-Knopf ohne Git-Ordner geht den Paket-Weg: ohne Internet eine verständliche Meldung, nichts geändert",
               e_u["ok"] and "kein Internet" in e_u["text"] and not (Path(_td_a) / "tools").exists(), e_u)
        (Path(_td_a) / "data").mkdir(exist_ok=True)
        pk = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
        pruefe("Gesundheit: «Programm-Update (automatisch)» und «Selbstpflege (automatisch)» sind da und grau ohne Alarm, solange nichts gelaufen ist",
               "Programm-Update (automatisch)" in pk and "Selbstpflege (automatisch)" in pk and pk["Selbstpflege (automatisch)"]["ok"] is None
               and not pk["Selbstpflege (automatisch)"].get("warnung"), {k: v for k, v in pk.items() if "automatisch" in k})
        _PF._schreiben(Path(_td_a), {"zeit": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "update": {"ergebnis": "aktuell", "text": "x", "ok": True},
                                     "heilung": {"ok": False, "text": "❌ Prüflauf ohne Aufträge FEHLGESCHLAGEN: HTTP 401"}})
        pk = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
        pruefe("Gesundheit: Selbstpflege ist rot, wenn die Selbstprüfung etwas fand, und nennt es", pk["Selbstpflege (automatisch)"]["ok"] is False and "HTTP 401" in pk["Selbstpflege (automatisch)"]["text"], pk["Selbstpflege (automatisch)"])
        pruefe("programm_version: ohne VERSION.json leer", C.programm_version() == "")
        _AU._bytes_atomar(Path(_td_a) / "tools/trading/VERSION.json", json.dumps({"version": "2026-11-04.abc1234", "commit": "abc1234", "gebaut": "2026-11-04T09:00:00Z"}).encode("utf-8"))
        pruefe("programm_version: liest die Nummer aus tools/trading/VERSION.json", C.programm_version() == "2026-11-04.abc1234")
        _AU.status_schreiben(Path(_td_a), {"geprueft": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "ergebnis": "aktuell", "ok": True, "text": "Version x ist die neueste"})
        pk = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
        pruefe("Gesundheit: frisch geprüftes Update ist grün und nennt die Programmversion", pk["Programm-Update (automatisch)"]["ok"] is True and "2026-11-04.abc1234" in pk["Programm-Update (automatisch)"]["text"], pk["Programm-Update (automatisch)"])
    finally:
        C.DATA, C.PAUSE, C.STOP, C.ROOT = _alt_a
# Robustheit: ein Fehler oder Fehlen der Update-Module legt das Cockpit nie lahm
_alt_au, _alt_pf = C.AU, C.PF
try:
    C.AU = C.PF = None
    _pk_ohne = C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())
    pruefe("Gesundheit ohne Update-Module: kein Absturz, die beiden Punkte fehlen einfach", isinstance(_pk_ohne, list) and not any("automatisch" in x["name"] for x in _pk_ohne))
    pruefe("programm_version ohne Update-Modul: leer statt Absturz", C.programm_version() == "")

    class _KaputtLesen:
        @staticmethod
        def lokale_version(*a, **k):
            raise OSError("Platte weg")
    C.AU = _KaputtLesen
    pruefe("programm_version: wirft das Lesen, kommt leer zurück statt eines Absturzes", C.programm_version() == "")

    class _KaputtAU:
        @staticmethod
        def ampel(*a, **k):
            raise RuntimeError("boom")
    C.AU = _KaputtAU
    _pk_kaputt = C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())
    pruefe("Gesundheit: wirft die Update-Ampel, bleibt der Rest der Liste erhalten", isinstance(_pk_kaputt, list) and any(x["name"] == "Not-Aus" for x in _pk_kaputt))
finally:
    C.AU, C.PF = _alt_au, _alt_pf
_alt_d = C.DATA
try:
    C.DATA = Path(tempfile.gettempdir()) / "krypto-test-xyz" / "data"
    pruefe("_wurzel: liegt DATA in einem Ordner «data», ist die Wurzel dessen Elternordner", C._wurzel() == C.DATA.parent)
    C.DATA = Path(tempfile.gettempdir()) / "krypto-test-xyz-anders"
    pruefe("_wurzel: liegt DATA anderswo (Tests), zeigt die Wurzel in einen Ordner ohne Update-Dateien", C._wurzel().parent == C.DATA and C._wurzel() != C.DATA.parent)
finally:
    C.DATA = _alt_d
_runden, _rufe, _schlaf = [], [], []
C.pflege_beim_start(warte=3.0, stunden=2.0, runden=3, schlafen=_schlaf.append, ausfuehren=lambda: _rufe.append(1))
pruefe("pflege_beim_start: wartet kurz, prüft, schläft dann Stunden — drei Runden", _rufe == [1, 1, 1] and _schlaf == [3.0, 7200.0, 7200.0], (_rufe, _schlaf))
_schlaf.clear()


def _boese_runde():
    raise RuntimeError("boom")


C.pflege_beim_start(warte=0, stunden=1, runden=2, schlafen=_schlaf.append, ausfuehren=_boese_runde)
pruefe("pflege_beim_start: eine Ausnahme in der Prüfung stoppt den Faden nicht", _schlaf == [0, 3600.0], _schlaf)
_alt_sh, _alt_argv = C.selbstheilung, sys.argv
_gedruckt = _io.StringIO()
try:
    _aufrufe = []
    for _erg, _rc in (((True, "alles gut"), 0), ((False, "etwas kaputt"), 1)):
        C.selbstheilung = lambda _e=_erg, **kw: (_aufrufe.append(kw), _e)[1]
        sys.argv = ["cockpit.py", "--heilen"]
        with _cl.redirect_stdout(_gedruckt):
            _r = C.main()
        pruefe(f"cockpit.py --heilen: ohne Fenster, Rückgabewert {_rc} bei {'Erfolg' if _rc == 0 else 'Fehlschlag'}", _r == _rc and ("alles gut" in _gedruckt.getvalue() or _rc == 1), _r)
    pruefe("cockpit.py --heilen: ohne --probelauf KEIN Prüflauf des Piloten", _aufrufe[0] == {"mit_probelauf": False}, _aufrufe)
    sys.argv = ["cockpit.py", "--heilen", "--probelauf"]
    with _cl.redirect_stdout(_gedruckt):
        C.main()
    pruefe("cockpit.py --heilen --probelauf: mit Prüflauf", _aufrufe[-1] == {"mit_probelauf": True}, _aufrufe)
finally:
    C.selbstheilung, sys.argv = _alt_sh, _alt_argv
_html = (HIER / "cockpit.html").read_text(encoding="utf-8")
pruefe("cockpit.html: Hinweis «neue Programmversion installiert» und Knopf «Update holen» ohne Git-Verweis",
       'id="versionHinweis"' in _html and "d.programm" in _html and 'data-a="update"' in _html and "git pull" not in _html)

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

# ── Pflege-Zeile in den Start-Dateien (statisch) ──
_zeilen = txt.split("\r\n")
_i_ende = _zeilen.index(":ende")
_pflege = [i for i, z in enumerate(_zeilen) if "pflege.py" in z and not z.startswith("REM")]
pruefe("krypto-auto.bat: genau eine Pflege-Zeile, NACH :ende und vor dem letzten «goto :eof»", len(_pflege) == 1 and _pflege[0] > _i_ende and _zeilen[_pflege[0] + 1] == "goto :eof", _pflege)
_pz = _zeilen[_pflege[0]]
pruefe("krypto-auto.bat: die Pflege-Zeile endet mit «& exit /b» (cmd liest die Datei danach nicht mehr, auch wenn ein Update sie ersetzt) und nur wenn pflege.py da ist",
       _pz.startswith('if exist "tools\\trading\\krypto_bot\\pflege.py" %PY% ') and _pz.endswith(" --still & exit /b"), _pz)
pruefe("krypto-auto.bat: die Pflege läuft NACH dem Handel (hinter :ende), nicht davor", txt.index("pflege.py") > txt.index(":ende") > txt.index("meldung.py --ok"))
_cb = (HIER / "cockpit.bat").read_bytes().decode("ascii").split("\r\n")
_cz = [z for z in _cb if "cockpit.py" in z and not z.startswith("REM")]
pruefe("cockpit.bat: Update und Cockpit in EINER Zeile, am Ende «& pause & exit /b», und sonst kein weiteres pause",
       len(_cz) == 1 and "pflege.py --nur-update --still" in _cz[0] and _cz[0].endswith("cockpit.py & pause & exit /b") and sum(1 for z in _cb if z.strip().lower() == "pause") == 0, _cz)

# ───────────────────────── Übersicht: neue Angaben in stand() (nur Anzeige, nur lesen) ─────────────────────────
import satellit as _SAT_U  # noqa: E402

_e_mit = {"markt": "BTC", "symbol": "BTCUSDT", "hebel": 2.0, "stop_long": 72000.0, "stop_short": 80000.0, "broker": {"stop": 72851.8, "position": 0.05}}
_m1 = C.markt_mit_stop(_e_mit)
pruefe("markt_mit_stop: der Stop an der Börse (broker.stop) steht als `stop`, die Regel-Stop nur als Hinweis `stop_berechnet`",
       _m1["stop"] == 72851.8 and _m1["stop_berechnet"] == 72000.0 and _m1["hebel"] == 2.0, _m1)
pruefe("markt_mit_stop: der Logbuch-Eintrag selbst bleibt unverändert (Kopie)", "stop" not in _e_mit and "stop_berechnet" not in _e_mit)
_m2 = C.markt_mit_stop({"hebel": -1.0, "stop_long": 1.0, "stop_short": 80000.0})
pruefe("markt_mit_stop: ohne Börsen-Stop kein erfundener Stop (None), Short nimmt stop_short", _m2["stop"] is None and _m2["stop_berechnet"] == 80000.0, _m2)
_m3 = C.markt_mit_stop({"hebel": 0.0, "stop_long": 5.0, "stop_short": 6.0, "broker": {"stop": 0}})
pruefe("markt_mit_stop: flach oder Stop 0 → beides None", _m3["stop"] is None and _m3["stop_berechnet"] is None, _m3)
_m4 = C.markt_mit_stop({"hebel": 1.0, "stop_long": "abc", "broker": {"stop": True}})
pruefe("markt_mit_stop: Unsinn (Text, bool) wird nicht als Stop gelesen", _m4["stop"] is None and _m4["stop_berechnet"] is None, _m4)
pruefe("markt_mit_stop: broker kein Objekt → kein Absturz", C.markt_mit_stop({"hebel": 1.0, "broker": "x"})["stop"] is None)

with tempfile.TemporaryDirectory() as _tu:
    _buch_u, _alt_buch_u, _alt_aus_u = Path(_tu) / "buch.json", _SAT_U.BUCH, _SAT_U.AUS_DATEI
    _SAT_U.BUCH, _SAT_U.AUS_DATEI = _buch_u, Path(_tu) / "aus.txt"
    try:
        s0 = C.satellit_stand({})
        pruefe("satellit_stand: leeres Buch → alle Listen leer, an, 20 %, nächster Entscheidungstag ein Donnerstag, kein letzter Lauf",
               s0 is not None and s0["aus"] is False and s0["anteil"] == 0.2 and s0["ziele"] == [] and s0["positionen"] == [] and s0["ausgestoppt"] == [] and s0["entschieden"] is None
               and s0["letzter_lauf"] is None and s0["hinweis"] == "" and date.fromisoformat(s0["naechster_tag"]).weekday() == 3 and s0["echtgeld"] is False and s0["hat_schluessel"] is False, s0)
        _SAT_U.schreiben({**_SAT_U.neues_buch(), "entschieden": "2026-11-05", "ziele": {"SOLUSDT": 0.1, "ADAUSDT": 0.1},
                          "positionen": {"SOLUSDT": {"spot": "SOLUSDT", "menge": 1.5, "stop": 150.2, "seit": "2026-11-06", "stop_anteil": 0.12},
                                         "1000PEPEUSDT": {"spot": "PEPEUSDT", "menge": 20000.0, "stop": 0.0123, "seit": "2026-11-06", "stop_anteil": 0.2}},
                          "ausgestoppt": {"DOGEUSDT": "2026-11-09"}, "bekannt": ["SOLUSDT"],
                          "letzter_lauf": {"zeit": "2026-11-10T02:40:00+00:00", "ok": True, "auftraege": 0, "positionen": 2, "hinweise": []}}, _buch_u)
        s1 = C.satellit_stand({"BINANCE_FUTURES_API_KEY": "k", "BINANCE_FUTURES_API_SECRET": "s"})
        pruefe("satellit_stand: Ziele, Positionen mit Stop/Menge/seit, ausgestoppte Coins und letzter Lauf aus dem Buch; Schlüssel nur als Ja/Nein",
               s1["entschieden"] == "2026-11-05" and s1["ziele"] == [{"symbol": "SOLUSDT", "gewicht": 0.1}, {"symbol": "ADAUSDT", "gewicht": 0.1}]
               and s1["positionen"][0] == {"symbol": "SOLUSDT", "spot": "SOLUSDT", "menge": 1.5, "stop": 150.2, "seit": "2026-11-06", "stop_anteil": 0.12}
               and len(s1["positionen"]) == 2 and s1["positionen"][1]["symbol"] == "1000PEPEUSDT" and s1["ausgestoppt"] == [{"symbol": "DOGEUSDT", "tag": "2026-11-09"}]
               and s1["letzter_lauf"]["ok"] is True and s1["hat_schluessel"] is True and "k" not in json.dumps({k: v for k, v in s1.items() if k != "hat_schluessel"}).replace("ok", ""), s1)
        s2 = C.satellit_stand({"KRYPTO_SATELLIT": "aus"})
        pruefe("satellit_stand: ausgeschaltet nennt den Grund", s2["aus"] is True and s2["grund"] == "KRYPTO_SATELLIT=aus", s2)
        s3 = C.satellit_stand({"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"})
        pruefe("satellit_stand: mit echtem Geld steht echtgeld=True (die Anzeige sagt «nur Testnetz»)", s3["echtgeld"] is True, s3)
        _buch_u.write_text("kaputt")
        _buch_u.with_name(_buch_u.name + ".bak").write_text("auch kaputt")
        s4 = C.satellit_stand({})
        pruefe("satellit_stand: beide Buch-Dateien kaputt → Hinweis «unlesbar», leere Listen, kein Absturz", s4 is not None and s4["hinweis"].startswith("⚠️ Satelliten-Buch unlesbar") and s4["positionen"] == [] and s4["ziele"] == [], s4)
        _alt_lesen = _SAT_U.lesen
        _SAT_U.lesen = lambda *a, **k: (_ for _ in ()).throw(OSError("Platte weg"))
        try:
            s5 = C.satellit_stand({})
        finally:
            _SAT_U.lesen = _alt_lesen
        pruefe("satellit_stand: ein Fehler beim Lesen → None statt Absturz", s5 is None)
        _alt_mod = C.SAT
        C.SAT = None
        try:
            pruefe("satellit_stand: Modul fehlt → None (die Oberfläche zeigt dann nichts statt zu stören)", C.satellit_stand({}) is None)
        finally:
            C.SAT = _alt_mod
        # stand() trägt die neuen Angaben, bleibt als JSON darstellbar und enthält keine Schlüssel
        _buch_u.unlink()
        _buch_u.with_name(_buch_u.name + ".bak").unlink()
        d_u = C.stand(env={"BINANCE_FUTURES_API_KEY": "GEHEIM-KEY-1", "BINANCE_FUTURES_API_SECRET": "GEHEIM-SEC-2"})
        j_u = json.dumps(d_u)
        pruefe("stand(): enthält satellit, kurse, kurse_schnitt, ist JSON, ohne Schlüssel", "satellit" in d_u and "kurse" in d_u and "kurse_schnitt" in d_u and "GEHEIM" not in j_u, sorted(d_u))
    finally:
        _SAT_U.BUCH, _SAT_U.AUS_DATEI = _alt_buch_u, _alt_aus_u

# ── Scalping-Labor (Papier) im Cockpit: Anzeige-Daten, Gesundheitszeile, Telegram /scalp ──
import scalping_labor as _SL_U  # noqa: E402
import scalping_kern as _SK_U  # noqa: E402

with tempfile.TemporaryDirectory() as _tl:
    _tlp = Path(_tl)
    _alt_sl = (_SL_U.BUCH, _SL_U.AUS_DATEI, _SL_U.STOP, _SL_U.PAUSE)
    _SL_U.BUCH, _SL_U.AUS_DATEI, _SL_U.STOP, _SL_U.PAUSE = _tlp / "labor.json", _tlp / "aus.txt", _tlp / "STOP-nein", _tlp / "PAUSE-nein"
    _T0 = int(datetime(2026, 11, 2, tzinfo=timezone.utc).timestamp() * 1000)
    try:
        _leer = C.scalp_stand({})
        pruefe("scalp_stand: nie gelaufen → gelaufen False, 8 Zeilen ohne Handel, zu wenig Daten, keine Kosten, an",
               _leer is not None and _leer["gelaufen"] is False and len(_leer["zeilen"]) == 8 and all(z["n"] == 0 for z in _leer["zeilen"]) and _leer["urteil"]["urteil"] == "zu wenig Daten"
               and _leer["kosten_bp"] is None and _leer["aus"] is False and _leer["hinweis"] == "" and _leer["letzte_trades"] == [], _leer)
        # ein Buch mit gerechneten Handeln (ohne Kosten, damit die Zahlen von Hand stimmen)
        _b = _SL_U.neues_buch(_T0 + 86_400_000)
        _b["daten_ab"] = _T0
        for _sym, _k, _trades in (("BTCUSDT", 2.0, [(100.0, 100.1)] * 3 + [(100.0, 99.8)]), ("ETHUSDT", 3.5, [(100.0, 100.1)] * 2)):
            _m = {"weiter_ab": _T0 + 86_400_000 + 60_000, "letzte_kerze": _T0 + 86_400_000, "luecken": 0, "buecher": {str(kk): _SL_U.neues_band_buch(kk) for kk in _SL_U.STUFEN}}
            for _i, (_e, _a) in enumerate(_trades):
                _SL_U.buche(_m["buecher"][str(_k)], (_T0 + _i * 60_000, _T0 + _i * 60_000 + 60_000, 1, _e, _a, "M", "M"), {"M": 0.0, "T": 0.0, "slip": 0.0}, 0)
            _b["maerkte"][_sym] = _m
        _b["letzter_lauf"] = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "kerzen": 10, "trades": 6, "hinweise": []}
        _SL_U.schreiben(_b, _SL_U.BUCH)
        _s1 = C.scalp_stand({})
        _zb = {(z["markt"], z["k"]): z for z in _s1["zeilen"]}
        pruefe("scalp_stand: gelaufen, die Zeilen tragen die Zahlen des Buchs (BTC 2,0: 4 Handel, 75 %, netto +2,5 bp) und die Erwartung des Prüfstands",
               _s1["gelaufen"] is True and _zb[("BTC", 2.0)]["n"] == 4 and _zb[("BTC", 2.0)]["treffer"] == 0.75 and abs(_zb[("BTC", 2.0)]["netto_bp"] - 2.5) < 1e-9
               and _zb[("BTC", 2.0)]["erw_netto_bp"] == -9.565 and _zb[("ETH", 3.5)]["n"] == 2 and _zb[("BTC", 2.5)]["n"] == 0, _zb[("BTC", 2.0)])
        pruefe("scalp_stand: Urteil (zu wenig Daten), Kosten 0 bei Handeln ohne Kosten, Ampel grün, letzte Handel neueste zuerst, Datenbeginn",
               _s1["urteil"]["urteil"] == "zu wenig Daten" and _s1["kosten_bp"] == 0.0 and _s1["ampel"]["ok"] is True and len(_s1["letzte_trades"]) == 6
               and all(_s1["letzte_trades"][i]["t_aus"] >= _s1["letzte_trades"][i + 1]["t_aus"] for i in range(5)) and _s1["daten_ab"] == _T0, _s1["ampel"])
        pruefe("scalp_stand: ist JSON und enthält nur Zahlen und Text (kein Schlüssel, kein Pfad)", "C:\\" not in json.dumps(_s1) and "/home/" not in json.dumps(_s1) and json.loads(json.dumps(_s1))["gelaufen"] is True)
        # echte Kosten: «Kosten je Trade» ist das gewichtete Mittel, positiv ausgewiesen
        _b2 = json.loads(json.dumps(_b))
        _bb = _b2["maerkte"]["BTCUSDT"]["buecher"]["2.0"]
        for _f in ("n", "n_nach", "wins", "sum_br", "sum_net", "gew", "verl", "kum", "hoechst", "tiefst", "dauer_ms"):
            _bb[_f] = 0 if not isinstance(_bb[_f], float) else 0.0
        _bb["tage"], _bb["letzte"] = {}, []
        _SL_U.buche(_bb, (_T0, _T0 + 60_000, 1, 100.0, 100.0, "M", "M"), _SL_U.kosten_von("BTCUSDT"), 0)
        _SL_U.schreiben(_b2, _SL_U.BUCH)
        _s2 = C.scalp_stand({})
        # BTC 2,0: ein Handel ohne Kursbewegung kostet Maker-Gebühr hin und zurück = 4 bp; ETH 3,5: zwei Handel ohne Kosten → gewichtetes Mittel (4 × 1 + 0 × 2) / 3 = 1,33 bp
        pruefe("scalp_stand: Kosten je Trade (positiv ausgewiesen) = gewichtetes Mittel über alle Handel (1,33 bp)", _s2["kosten_bp"] == 1.33, _s2["kosten_bp"])
        # Schalter, Hinweis, Fehler
        pruefe("scalp_stand: ausgeschaltet nennt den Grund", C.scalp_stand({"KRYPTO_SCALP_LABOR": "aus"})["aus"] is True and C.scalp_stand({"KRYPTO_SCALP_LABOR": "aus"})["grund"] == "KRYPTO_SCALP_LABOR=aus")
        _SL_U.BUCH.write_text("kaputt")
        _SL_U.BUCH.with_name("labor.json.bak").write_text("auch kaputt")
        _namen = sorted(p.name for p in _tlp.iterdir())
        _s3 = C.scalp_stand({})
        pruefe("scalp_stand: beide Buch-Dateien kaputt → Hinweis «unlesbar», leere Zeilen, kein Absturz und KEINE Datei wird angefasst (nur lesen)",
               _s3 is not None and _s3["hinweis"].startswith("⚠️ Labor-Buch unlesbar") and _s3["gelaufen"] is False and sorted(p.name for p in _tlp.iterdir()) == _namen
               and _SL_U.BUCH.read_text() == "kaputt", (_s3 or {}).get("hinweis"))
        _SL_U.BUCH.unlink()
        _SL_U.BUCH.with_name("labor.json.bak").unlink()
        _alt_lesen = _SL_U.lesen
        _SL_U.lesen = lambda *a, **k: (_ for _ in ()).throw(OSError("Platte weg"))
        try:
            _s4 = C.scalp_stand({})
        finally:
            _SL_U.lesen = _alt_lesen
        pruefe("scalp_stand: ein Fehler beim Lesen → None statt Absturz", _s4 is None)
        _alt_modl = C.SL
        C.SL = None
        try:
            pruefe("scalp_stand: Modul fehlt → None; Telegram /scalp sagt es ehrlich", C.scalp_stand({}) is None and "nicht vorhanden" in C.befehl("/scalp"))
        finally:
            C.SL = _alt_modl
        # Gesundheitszeile
        _h20l = datetime(2026, 1, 20, tzinfo=timezone.utc).date()
        _gz = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, _h20l)}
        pruefe("Gesundheit: «Scalping-Labor (Papier)» grau, solange es nie lief", _gz["Scalping-Labor (Papier)"]["ok"] is None and "noch kein Lauf" in _gz["Scalping-Labor (Papier)"]["text"], _gz.get("Scalping-Labor (Papier)"))
        _SL_U.schreiben(_b, _SL_U.BUCH)
        _gz2 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, _h20l)}
        pruefe("Gesundheit: frischer Lauf = grün mit dem Urteil", _gz2["Scalping-Labor (Papier)"]["ok"] is True and "zu wenig Daten" in _gz2["Scalping-Labor (Papier)"]["text"], _gz2["Scalping-Labor (Papier)"])
        _alt_b = json.loads(json.dumps(_b))
        _alt_b["letzter_lauf"]["zeit"] = (datetime.now(timezone.utc) - timedelta(hours=40)).isoformat(timespec="seconds")
        _SL_U.schreiben(_alt_b, _SL_U.BUCH)
        _gz3 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, _h20l)}
        pruefe("Gesundheit: Lauf älter als 36 Stunden = rot", _gz3["Scalping-Labor (Papier)"]["ok"] is False and "40" in _gz3["Scalping-Labor (Papier)"]["text"], _gz3["Scalping-Labor (Papier)"])
        _gz4 = {x["name"]: x for x in C.gesundheit({"KRYPTO_SCALP_LABOR": "aus"}, {"entscheide": []}, {}, _h20l)}
        pruefe("Gesundheit: ausgeschaltet = grau mit dem Grund", _gz4["Scalping-Labor (Papier)"]["ok"] is None and "KRYPTO_SCALP_LABOR=aus" in _gz4["Scalping-Labor (Papier)"]["text"], _gz4["Scalping-Labor (Papier)"])
        _SL_U.BUCH.write_text("kaputt")
        _SL_U.BUCH.with_name("labor.json.bak").write_text("auch kaputt")
        _gz5 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, _h20l)}["Scalping-Labor (Papier)"]
        pruefe("Gesundheit: beschädigtes Buch = GELB (grau mit Warnung) mit dem Satz «Labor-Buch unlesbar», nicht «noch kein Lauf» und nicht rot",
               _gz5["ok"] is None and _gz5.get("warnung") is True and _gz5["text"].startswith("⚠️ Labor-Buch unlesbar"), _gz5)
        _SL_U.BUCH.unlink()
        _SL_U.BUCH.with_name("labor.json.bak").unlink()
        _bw = json.loads(json.dumps(_b))
        _bw["letzter_lauf"]["hinweise"] = ["BTC: Kerzen nicht erreichbar (OSError) — der nächste Lauf holt den Rest"]
        _SL_U.schreiben(_bw, _SL_U.BUCH)
        _gz6 = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, _h20l)}["Scalping-Labor (Papier)"]
        pruefe("Gesundheit: ein Hinweis im letzten Lauf (Netz weg) = GELB mit dem Hinweis, nicht rot", _gz6["ok"] is None and _gz6.get("warnung") is True and "nicht erreichbar" in _gz6["text"], _gz6)
        pruefe("scalp_stand: die Ampel trägt das Warnung-Flag", C.scalp_stand({})["ampel"]["warnung"] is True and C.scalp_stand({})["ampel"]["ok"] is None)
        # Telegram
        _SL_U.schreiben(_b, _SL_U.BUCH)
        _t = C.befehl("/scalp")
        pruefe("Telegram /scalp: die Zusammenfassung des Labors (Papier, kein Geld im Spiel), in /hilfe aufgeführt", "Scalping-Labor (Papier" in _t and "Kein Geld im Spiel" in _t and "/scalp" in C.HILFE and "/scalp" in C.befehl("/hilfe"), _t)
        _SL_U.BUCH.write_text("kaputt")
        _SL_U.BUCH.with_name("labor.json.bak").write_text("auch kaputt")
        pruefe("Telegram /scalp: bei kaputtem Buch ein ehrlicher Satz statt Absturz", "unlesbar" in C.befehl("/scalp"))
        _SL_U.BUCH.unlink()
        _SL_U.BUCH.with_name("labor.json.bak").unlink()
        # stand() trägt die Angaben und bleibt JSON ohne Schlüssel
        _d_l = C.stand(env={"BINANCE_FUTURES_API_KEY": "GEHEIM-KEY-1", "BINANCE_FUTURES_API_SECRET": "GEHEIM-SEC-2"})
        pruefe("stand(): enthält scalp (ohne Buch: nie gelaufen), ist JSON, ohne Schlüssel", "scalp" in _d_l and _d_l["scalp"] is not None and _d_l["scalp"]["gelaufen"] is False and "GEHEIM" not in json.dumps(_d_l), sorted(_d_l))
    finally:
        _SL_U.BUCH, _SL_U.AUS_DATEI, _SL_U.STOP, _SL_U.PAUSE = _alt_sl

# stand(): die Pilot-Märkte tragen den Stop aus dem Logbuch
with tempfile.TemporaryDirectory() as _tm:
    _alt_m = C.DATA
    C.DATA = Path(_tm)
    try:
        (Path(_tm) / "krypto-pilot.json").write_text(json.dumps({"entscheide": [
            {"markt": "BTC", "symbol": "BTCUSDT", "stand": "2026-11-02", "kurs": 76677.0, "hebel": 2.0, "hebel_roh": 2.0, "stop_long": 72000.0, "stop_short": 80000.0,
             "broker": {"stop": 72851.8, "position": 0.05}},
            {"markt": "ETH", "symbol": "ETHUSDT", "stand": "2026-11-02", "kurs": 2249.0, "hebel": 2.0, "hebel_roh": 2.0, "stop_long": 2100.0, "stop_short": 2400.0}],
            "kontostand": []}), encoding="utf-8")
        d_m = C.stand(env={})
        mk = {m["markt"]: m for m in d_m["maerkte"]}
        pruefe("stand(): BTC trägt den bestätigten Börsen-Stop, ETH ohne Börsen-Angabe nur den berechneten (stop None) — nichts erfunden",
               mk["BTC"]["stop"] == 72851.8 and mk["BTC"]["stop_berechnet"] == 72000.0 and mk["ETH"]["stop"] is None and mk["ETH"]["stop_berechnet"] == 2100.0, mk)
    finally:
        C.DATA = _alt_m

# kurse_stand: Schlusskurse und Schnitt aus dem Zwischenspeicher
_alt_kl = KT.kurse_laden
_tage_k = [(date(2025, 1, 1) + timedelta(days=i)).isoformat() for i in range(300)]
KT.kurse_laden = lambda offline=False, jetzt=None: {"btc": [(t, float(i + 1)) for i, t in enumerate(_tage_k)], "eth": [(t, 2.0 * (i + 1)) for i, t in enumerate(_tage_k)]}
try:
    ku, sk = C.kurse_stand()
    pruefe("kurse_stand: 90 Tage Schlusskurse je Markt, letzter Tag und Kurs stimmen", len(ku["BTC"]) == 90 and ku["BTC"][-1] == [_tage_k[-1], 300.0] and ku["BTC"][0] == [_tage_k[210], 211.0]
           and ku["ETH"][-1] == [_tage_k[-1], 600.0], (ku["BTC"][:1], ku["BTC"][-1]))
    pruefe("kurse_stand: BTC-Schnitt = 150 Tage (Mittel von 151…300 = 225.5), ETH-Schnitt = 200 Tage (Mittel von 2·101…2·300 = 401.0)",
           sk["BTC"][-1] == [_tage_k[-1], 225.5] and sk["ETH"][-1] == [_tage_k[-1], 401.0] and len(sk["BTC"]) == 90, (sk["BTC"][-1], sk["ETH"][-1]))
    ku2, sk2 = C.kurse_stand(tage=500)
    pruefe("kurse_stand: der Schnitt fehlt, solange er noch nicht rechenbar ist (erste 149 Tage von BTC)", len(ku2["BTC"]) == 300 and len(sk2["BTC"]) == 300 - 149 and sk2["BTC"][0][0] == _tage_k[149], (len(ku2["BTC"]), len(sk2["BTC"])))
    KT.kurse_laden = lambda offline=False, jetzt=None: {"btc": [], "eth": [(t, 1.0) for t in _tage_k[:5]]}
    ku3, sk3 = C.kurse_stand()
    pruefe("kurse_stand: ein Markt ohne Kurse fehlt, der andere bleibt (ETH mit 5 Tagen: Kurse ja, Schnitt noch nicht)", "BTC" not in ku3 and len(ku3["ETH"]) == 5 and sk3["ETH"] == [], (ku3.keys(), sk3))
    KT.kurse_laden = lambda offline=False, jetzt=None: (_ for _ in ()).throw(OSError("Platte weg"))
    pruefe("kurse_stand: Fehler → leere Angaben statt Absturz", C.kurse_stand() == ({}, {}))
finally:
    KT.kurse_laden = _alt_kl

# ───────────────────────── Übersicht: reine Funktionen (mit node ausgeführt) und Bauform der Handy-Fassung ─────────────────────────
import re as _re_u  # noqa: E402
import uebersicht_rein as _UR  # noqa: E402

_html_u = (HIER / "cockpit.html").read_text(encoding="utf-8")
for _n_u, _ok_u, _i_u in _UR.pruefen(_html_u):  # Kursleiter, Auslastung, Kurven, Ampel-Gruppen, Sprungleiste, Karten-Tabellen, Blase: Erwartungswerte von Hand gerechnet (uebersicht_rein.py)
    pruefe("Oberfläche: " + _n_u, _ok_u, _i_u)
_anker_u = _re_u.findall(r'<a href="#([a-z-]+)" data-ziel="([a-z-]+)">([^<]+)</a>', _html_u)
pruefe("Handy: Sprungleiste mit den fünf Zielen Übersicht · Positionen · Satellit · Aufträge · Details, jedes Ziel gibt es in der Seite",
       [(a, t) for a, z, t in _anker_u if a == z] == [("oben", "Übersicht"), ("u-positionen", "Positionen"), ("u-satellit", "Satellit"), ("u-auftraege", "Aufträge"), ("details", "Details")]
       and all(f'id="{a}"' in _html_u for a, _z, _t in _anker_u), _anker_u)
pruefe("Handy: viewport-fit=cover, zwei theme-color-Angaben (hell/dunkel) und sichere Ränder über env(safe-area-inset-…) als Variablen (die Sprungleiste weicht dem Home-Balken aus)",
       "viewport-fit=cover" in _html_u and len(_re_u.findall(r'<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: (?:light|dark)\)">', _html_u)) == 2
       and all(f"env(safe-area-inset-{k}" in _html_u for k in ("top", "right", "bottom", "left")) and "padding:0 var(--sa-r) var(--sa-b) var(--sa-l)" in _html_u)
pruefe("Handy: Not-Aus und Auto-Handel sind ≥ 48 px hoch und haben 18 px Abstand; der Design-Schalter liegt nicht mehr im Kopf neben dem Not-Aus",
       ".band button{min-height:56px}" in _html_u and ".band-rechts{display:flex;flex-wrap:nowrap;align-items:stretch;gap:18px" in _html_u
       and 'id="thema"' in _html_u.split('<div class="status-zeile">', 1)[1].split("</div>", 1)[0] and 'id="thema"' not in _html_u.split('<div class="band-rechts">', 1)[1].split("</div>", 1)[0])
pruefe("Handy: Tabellen werden Karten (kein seitliches Scrollen) — jede Zelle bekommt ihren Spaltennamen, die Umwandlung gilt nur bis 700 px",
       "function tabellenBeschriften(" in _html_u and ".tabelle td::before{content:attr(data-label)" in _html_u and ".tabelle tr.kz{display:none}" in _html_u and "@media (max-width:700px){" in _html_u and ".tabelle{overflow:visible}" in _html_u
       and "table.kt" not in _html_u and "@supports selector(:has(> th))" in _html_u)  # reines CSS ab dem ersten Layout: eine Klasse, die erst ein Skript im nächsten Bild setzt, liess am Handy kurz eine breite Tabelle stehen (Herauszoomen)
pruefe("Handy: kein Mauszeiger nötig — Hinweise stehen als Knöpfe (Tippen, Enter, Escape), die Kurve reagiert auf Finger (pointerdown, touch-action: pan-y)",
       "function blaseOeffnen(" in _html_u and ".hinw{" in _html_u and 'svg.addEventListener("pointerdown", zeige)' in _html_u and ".kurve svg{touch-action:pan-y}" in _html_u and 'e.key === "Escape" && blasenAusloeser' in _html_u)
pruefe("Handy: das Neuzeichnen folgt der BREITE, nicht der Höhe (die Adressleiste am Handy klappt ein und aus, ohne dass die Anzeige flackert)",
       "if (innerWidth === gezeichneteBreite)" in _html_u and 'addEventListener("resize", () => letzterStand && zeichne(letzterStand));' not in _html_u and "if (sig === letzteSignatur) return;" in _html_u)
_urls_u = set(_re_u.findall(r"https?://[^\s\"'`)<>]+", _html_u))
pruefe("Seite: kein neuer Netzzugriff — alle Adressen sind der SVG-Namensraum und der öffentliche Binance-Preis des ETH-Sammlers (wie vorher), keine fremden Skripte, Stile, Bilder oder Rahmen",
       _urls_u <= {"http://www.w3.org/2000/svg", "https://data-api.binance.vision/api/v3/ticker/price?symbol=ETHUSDT"} and not _re_u.search(r"<script src|@import|<img |<iframe|url\(http", _html_u)
       and _html_u.count("<link ") == 1 and '<link rel="icon" href="data:,">' in _html_u and _html_u.count("<style>") == 1 and "Content-Security-Policy" not in _html_u, _urls_u)

# ───────────────────────── Handy-Ansicht (nur lesend) und Telegram /uebersicht, /handy ─────────────────────────
import fernsicht as _FS  # noqa: E402
import http.client as _hcf  # noqa: E402

pruefe("Hilfe nennt /uebersicht und /handy", "/uebersicht" in C.HILFE and "/handy" in C.HILFE)
pruefe("Telegram: /handy ist ein Sofort-Befehl (die Notbremse für den Link /handy aus steht nie hinter langsamen Info-Befehlen in der Schlange)", "/handy" in C.SOFORT)
pruefe("Telegram: /uebersicht läuft nebenher in der Schlange (kein Sofort-Befehl, es liest viele Dateien)", "/uebersicht" not in C.SOFORT)

_ue = {"modus": "TESTNETZ", "konto": {"wert": 5122.95, "seit_start": 0.0249, "seit_woche": 0.026, "unter_hoch": -0.012},
       "maerkte": [{"markt": "BTC", "hebel": 2.0, "stop": 72852.0}, {"markt": "ETH", "hebel": -1.0, "stop": None}, {"markt": "SOL", "hebel": 0}, {"markt": "XRP", "hebel": None, "stop": 0}],
       "satellit": {"aus": False, "positionen": [1, 2, 3], "naechster_tag": "2026-11-05"}, "scalp": {"ampel": {"text": "Papier, durchgefallen"}},
       "gesundheit": [{"name": "A", "ok": False, "text": "x"}, {"name": "B", "ok": None, "text": "y", "warnung": True}, {"name": "C", "ok": True, "text": "z"}, {"name": "D", "ok": None, "text": "nur Info"}],
       "notaus": False, "pause": True}
# von Hand: 5122.95 → 5'123; 0.0249·100 = 2.49 → +2.5; 0.026·100 = 2.6; −0.012·100 = −1.2; Stop 72852 → 72'852
_ue_erwartet = "\n".join([
    "🛩️ Krypto-Cockpit · Testnetz (Spielgeld)",
    "💼 Konto 5'123 USDT · seit Start +2.5 % · 7 Tage +2.6 % · unter Hoch −1.2 %",
    "📌 BTC: LONG 2.00× · Stop 72'852",
    "📌 ETH: SHORT 1.00×",
    "📌 SOL: FLACH",
    "📌 XRP: FLACH",
    "🛰️ Satellit: 3 Position(en), nächster Entscheidungstag 2026-11-05",
    "📊 Scalping-Labor: Papier, durchgefallen",
    "🩺 Rot: A. Achtung: B.",
    "⏸️ Auto-Handel ist aus (Pause).",
])
pruefe("/uebersicht: der Text stimmt Zeile für Zeile (von Hand gerechnet)", C.uebersicht_text(_ue) == _ue_erwartet, C.uebersicht_text(_ue))
pruefe("/uebersicht: leere Daten → drei Zeilen, kein Absturz", C.uebersicht_text({}).split("\n") == ["🛩️ Krypto-Cockpit · Testnetz (Spielgeld)", "💼 Noch kein Kontostand.", "🩺 Alles in Ordnung."])
pruefe("/uebersicht: ECHTGELD steht gross in der ersten Zeile", C.uebersicht_text({"modus": "ECHTGELD"}).startswith("🛩️ Krypto-Cockpit · ⚠️ ECHTGELD"))
_t_na = C.uebersicht_text({"notaus": True, "pause": True})
pruefe("/uebersicht: Not-Aus geht vor Pause", "🛑 Not-Aus ist aktiv." in _t_na and "Pause" not in _t_na)
pruefe("/uebersicht: ausgeschalteter Satellit fehlt, graue Info-Punkte ohne Warnung zählen nicht", "🛰️" not in C.uebersicht_text({"satellit": {"aus": True}})
       and "Alles in Ordnung" in C.uebersicht_text({"gesundheit": [{"name": "D", "ok": None, "text": "nur Info"}]}))
pruefe("/uebersicht: fehlende Zahlen im Konto werden «—»", "seit Start — · 7 Tage — · unter Hoch —" in C.uebersicht_text({"konto": {"wert": 100.0}}))
_alt_stand_u = C.stand
C.stand = lambda env=None: _ue
try:
    pruefe("Telegram /uebersicht: gibt denselben Text zurück (über stand())", C.befehl("/uebersicht") == _ue_erwartet and C.befehl("/uebersicht@MeinBot") == _ue_erwartet)
finally:
    C.stand = _alt_stand_u

_alt_fern, _alt_fs, _alt_data = C.FERN, C.FS, C.DATA
with tempfile.TemporaryDirectory() as _tdf:
    _dat = Path(_tdf)
    C.FERN = _FS.FernServer(_dat, stand_fn=lambda: {"konto": {"wert": 1}}, profit_fn=lambda: {}, seite_fn=lambda: b"<html lang='de'><head></head></html>",
                            markt_fn=lambda: b"<html lang='de'><head></head></html>", adresse="127.0.0.1", port=0, meldung_im_faden=False)
    try:
        t0 = C.befehl("/handy")
        pruefe("Telegram /handy: ausgeschaltet → sagt aus und «nur am PC»", "aus" in t0 and "nur am PC" in t0, t0)
        _FS.einschalten(_dat)
        k1 = _FS.lesen(_dat)["schluessel"]
        t1 = C.befehl("/handy")
        pruefe("Telegram /handy: in der Datei an, aber nicht gestartet → «läuft aber nicht», ohne Schlüssel", "läuft aber nicht" in t1 and k1 not in t1, t1)
        C.FERN.starten()
        t2 = C.befehl("/handy")
        pruefe("Telegram /handy: läuft → Port, die Notbremsen-Befehle, KEIN Schlüssel und keine Adresse", f"AN auf Port {C.FERN.port}" in t2 and "/handy aus" in t2 and "/handy erneuern" in t2 and k1 not in t2 and "http" not in t2, t2)
        _P = C.FERN.port
        _c = _hcf.HTTPConnection("127.0.0.1", _P, timeout=10)
        _c.request("GET", "/?k=falsch", headers={"Host": f"127.0.0.1:{_P}"})
        _c.getresponse().read()
        _c.close()
        t3 = C.befehl("/handy")
        pruefe("Telegram /handy: abgewiesene Versuche werden genannt, mit dem Rat «erneuern»", "abgewiesene Versuche" in t3 and "/handy erneuern" in t3 and k1 not in t3, t3)
        for _i in range(2):
            _c = _hcf.HTTPConnection("127.0.0.1", _P, timeout=10)
            _c.request("GET", "/?k=falsch%d" % _i, headers={"Host": f"127.0.0.1:{_P}"})
            _c.getresponse().read()
            _c.close()
        _c = _hcf.HTTPConnection("127.0.0.1", _P, timeout=10)
        _c.request("GET", "/api/stand", headers={"Host": "boese.example:1"})
        _c.getresponse().read()
        _c.close()
        t3b = C.befehl("/handy")
        pruefe("Telegram /handy: die Wiederholungen zählen mit (1 + 2 falsche Schlüssel + 1 falscher Host = 4 abgewiesene Versuche)", "⚠️ 4 abgewiesene Versuche" in t3b and k1 not in t3b, t3b)
        t4 = C.befehl("/handy erneuern")
        k2 = _FS.lesen(_dat)["schluessel"]
        pruefe("Telegram /handy erneuern: neuer Schlüssel, weder der alte noch der neue steht in der Antwort", k2 != k1 and k1 not in t4 and k2 not in t4 and "Neuer Schlüssel" in t4 and C.FERN.laeuft(), t4)
        t5 = C.befehl("/handy aus")
        pruefe("Telegram /handy aus: Server gestoppt, Datei aus, der Schlüssel VERGESSEN (alle Links ungültig, auch bei einem verlorenen Handy), kein Schlüssel in der Antwort",
               not C.FERN.laeuft() and not _FS.lesen(_dat)["an"] and _FS.lesen(_dat)["schluessel"] == "" and k2 not in t5 and "aus" in t5 and "ungültig" in t5, t5)
        t6 = C.befehl("/handy erneuern")
        pruefe("Telegram /handy erneuern bei ausgeschalteter Ansicht: nichts zu erneuern, schaltet NICHT ein, erzeugt keinen Schlüssel", "nichts zu erneuern" in t6 and not _FS.lesen(_dat)["an"] and _FS.lesen(_dat)["schluessel"] == "" and not C.FERN.laeuft(), t6)
        t7 = C.befehl("/handy an")
        pruefe("Telegram /handy an: gibt es nicht (Einschalten nur am PC): nur der Stand, die Ansicht bleibt aus", t7.startswith("📱 Handy-Ansicht: aus") and not C.FERN.laeuft() and not _FS.lesen(_dat)["an"], t7)
        C.FS, C.FERN = None, None
        pruefe("Telegram /handy: ohne das Modul eine ehrliche Antwort statt eines Absturzes", "nicht vorhanden" in C.befehl("/handy"))
        pruefe("Cockpit: ohne das Modul gibt fern_ui() verfuegbar=False und fern_server() None", C.fern_ui() == {"verfuegbar": False} and C.fern_server() is None)
    finally:
        C.FS = _alt_fs
        if C.FERN is not None:
            C.FERN.stoppen()
        C.FERN = _alt_fern

# Lokale Adressen /api/fern: nur über 127.0.0.1, Host-Prüfung, Kopf und Herkunft wie beim Not-Aus
with tempfile.TemporaryDirectory() as _tdf2:
    _dat2 = Path(_tdf2)
    _alt_prot = list(C.PROTOKOLL)
    C.PROTOKOLL.clear()
    C.FERN = _FS.FernServer(_dat2, stand_fn=lambda: {"konto": {"wert": 1}}, profit_fn=lambda: {}, seite_fn=lambda: b"<html lang='de'><head></head></html>",
                            markt_fn=lambda: b"<html lang='de'><head></head></html>", adresse="127.0.0.1", port=0, meldung_im_faden=False)
    _srv_f = ThreadingHTTPServer(("127.0.0.1", 0), C.Cockpit)
    _alt_port = C.Cockpit.port
    C.Cockpit.port = _srv_f.server_port
    threading.Thread(target=_srv_f.serve_forever, daemon=True).start()
    _LP = _srv_f.server_port

    def _lok(methode, pfad, host=None, kopf=None, body=None):
        k_ = _hcf.HTTPConnection("127.0.0.1", _LP, timeout=10)
        try:
            k_.putrequest(methode, pfad, skip_host=True)
            k_.putheader("Host", host or f"127.0.0.1:{_LP}")
            for n_, w_ in (kopf or {}).items():
                k_.putheader(n_, w_)
            k_.putheader("Content-Length", str(len(body or b"")))
            k_.endheaders(body)
            r_ = k_.getresponse()
            roh = r_.read()
            return r_.status, (json.loads(roh) if roh[:1] == b"{" else roh)
        finally:
            k_.close()
    _JS = {"X-Cockpit": "1", "Content-Type": "application/json", "Origin": f"http://127.0.0.1:{_LP}"}
    try:
        st_, j_ = _lok("GET", "/api/fern")
        pruefe("Lokal /api/fern: 200, verfuegbar, aus, keine Adressen", st_ == 200 and j_["verfuegbar"] is True and j_["an"] is False and j_["laeuft"] is False and j_["adressen"] == [], j_)
        pruefe("Lokal /api/fern: ein fremder Host-Kopf bekommt NICHTS (hier stehen Adressen MIT Schlüssel; DNS-Rebinding)", _lok("GET", "/api/fern", host=f"rebind.boese.example:{_LP}")[0] == 403)
        pruefe("Lokal POST /api/fern: ohne X-Cockpit-Kopf verboten", _lok("POST", "/api/fern", kopf={"Content-Type": "application/json"}, body=b'{"an": true}')[0] == 403 and not _FS.lesen(_dat2)["an"])
        pruefe("Lokal POST /api/fern: fremde Herkunft verboten", _lok("POST", "/api/fern", kopf=dict(_JS, Origin="http://boese.example"), body=b'{"an": true}')[0] == 403 and not _FS.lesen(_dat2)["an"])
        pruefe("Lokal POST /api/fern: fremder Host verboten", _lok("POST", "/api/fern", host="boese.example", kopf=_JS, body=b'{"an": true}')[0] == 403 and not _FS.lesen(_dat2)["an"])
        st_, j_ = _lok("POST", "/api/fern", kopf=_JS, body=b'{"an": true}')
        k_a = _FS.lesen(_dat2)["schluessel"]
        pruefe("Lokal POST an: 200, läuft, Datei an, Schlüssel erzeugt, Adressen tragen ihn", st_ == 200 and j_["ok"] is True and j_["an"] is True and j_["laeuft"] is True and len(k_a) == 32
               and all(a["url"].endswith("?k=" + k_a) for a in j_["adressen"]), j_)
        pruefe("Lokal POST an: ein Eintrag im Cockpit-Protokoll «Handy-Ansicht»", any(e["aktion"] == "fern" and e["titel"] == "Handy-Ansicht" and e["ok"] for e in C.PROTOKOLL) and k_a not in json.dumps(list(C.PROTOKOLL)))
        st_, j_ = _lok("POST", "/api/fern", kopf=_JS, body=b'{"an": true}')
        pruefe("Lokal POST an ein zweites Mal: derselbe Schlüssel (nur «erneuern» wechselt ihn)", st_ == 200 and _FS.lesen(_dat2)["schluessel"] == k_a and j_["laeuft"] is True)
        st_, j_ = _lok("POST", "/api/fern", kopf=_JS, body=b'{"an": true, "erneuern": "ja"}')
        pruefe("Lokal POST erneuern mit «ja» als Text: zählt nicht als Ja, Schlüssel bleibt", _FS.lesen(_dat2)["schluessel"] == k_a)
        st_, j_ = _lok("POST", "/api/fern", kopf=_JS, body=b'{"an": true, "erneuern": true}')
        k_b = _FS.lesen(_dat2)["schluessel"]
        pruefe("Lokal POST erneuern: neuer Schlüssel, läuft weiter", st_ == 200 and k_b != k_a and j_["laeuft"] is True and "ungültig" in j_["meldung"])
        st_, j_ = _lok("POST", "/api/fern", kopf=_JS, body=b'{"an": "true"}')
        pruefe("Lokal POST mit «true» als TEXT: zählt nicht als Ja → ausgeschaltet (nur ein echtes true schaltet ein)", st_ == 200 and j_["an"] is False and not C.FERN.laeuft() and not _FS.lesen(_dat2)["an"], j_)
        st_, j_ = _lok("POST", "/api/fern", kopf=_JS, body=b'{"erneuern": true}')
        pruefe("Lokal POST nur mit erneuern (ohne an): bleibt aus, schaltet nichts ein", st_ == 200 and j_["an"] is False and not C.FERN.laeuft())
        pruefe("Lokal POST kaputtes JSON: 400", _lok("POST", "/api/fern", kopf=_JS, body=b"{{{")[0] == 400)
        _alt_fs2 = C.FS
        C.FS, _fern_alt2 = None, C.FERN
        C.FERN = None
        pruefe("Lokal ohne das Modul: GET sagt verfuegbar=False, POST 404", _lok("GET", "/api/fern")[1] == {"verfuegbar": False} and _lok("POST", "/api/fern", kopf=_JS, body=b'{"an": true}')[0] == 404)
        C.FS, C.FERN = _alt_fs2, _fern_alt2
    finally:
        _srv_f.shutdown()
        _srv_f.server_close()
        C.Cockpit.port = _alt_port
        if C.FERN is not None:
            C.FERN.stoppen()
        C.FERN = _alt_fern
        C.PROTOKOLL.clear()
        C.PROTOKOLL.extend(reversed(_alt_prot))

# Die ECHT gebaute Handy-Ansicht: Seite, Kontostand, Lesemodus, kein Schreiben (fern_server() mit den echten Funktionen)
with tempfile.TemporaryDirectory() as _tdf3:
    _alt_data3, _alt_profit3, _alt_stop3, _alt_pause3 = C.DATA, C.profit_stand, C.STOP, C.PAUSE
    C.DATA, C.STOP, C.PAUSE = Path(_tdf3), Path(_tdf3) / "STOP", Path(_tdf3) / "PAUSE"       # ein Durchbruch bis zum Not-Aus träfe nur diese Wegwerf-Dateien
    C.profit_stand = lambda *a, **k: {"modus": "TESTNETZ", "zeitraeume": {}, "positionen": []}
    C.FERN = None
    try:
        _f = C.fern_server()
        pruefe("fern_server(): baut den echten Server und merkt ihn sich (nur einer)", _f is not None and C.fern_server() is _f and _f.daten == C.DATA)
        _f.adresse, _f._port = "127.0.0.1", 0
        _FS.einschalten(Path(_tdf3))
        pruefe("fern_server(): startet nur, weil eingeschaltet wurde", _f.starten() is True)
        _k = _FS.lesen(Path(_tdf3))["schluessel"]
        _ck, _FP = _FS.cookie_wert(_k), _f.port

        def _fern(methode, pfad, cookie=_ck, host=None):
            k_ = _hcf.HTTPConnection("127.0.0.1", _FP, timeout=20)
            try:
                k_.putrequest(methode, pfad, skip_host=True)
                k_.putheader("Host", host or f"127.0.0.1:{_FP}")
                if cookie:
                    k_.putheader("Cookie", f"{_FS.COOKIE}={cookie}")
                k_.putheader("Content-Length", "0")
                k_.endheaders()
                r_ = k_.getresponse()
                return r_.status, r_.read()
            finally:
                k_.close()
        st_, roh = _fern("GET", "/")
        echt_html = (HIER / "cockpit.html").read_text(encoding="utf-8")
        pruefe("Handy-Ansicht echt: die Seite ist die Cockpit-Seite, im Lesemodus", st_ == 200 and b'data-nur-lesen="1"' in roh and "Krypto-Cockpit" in roh.decode() and len(roh) > len(echt_html.encode()), st_)
        st_, roh = _fern("GET", "/api/stand")
        stand_j = json.loads(roh) if st_ == 200 else {}
        pruefe("Handy-Ansicht echt: /api/stand liefert den echten Stand, ohne Schlüssel und ohne Pfade", st_ == 200 and "maerkte" in stand_j and "gesundheit" in stand_j and _k not in roh.decode() and str(_tdf3) not in roh.decode(), (st_, roh[:200]))
        pruefe("Handy-Ansicht echt: /api/profit liefert (Zwischenspeicher des Cockpits)", _fern("GET", "/api/profit")[0] == 200)
        pruefe("Handy-Ansicht echt: /markt geht", _fern("GET", "/markt")[0] == 200)
        for pfad_, meth_ in (("/api/notaus", "POST"), ("/api/aktion", "POST"), ("/api/fern", "POST"), ("/api/fern", "GET"), ("/api/protokoll", "GET"), ("/api/aktion", "GET"), ("/api/notaus", "GET")):
            st_, roh = _fern(meth_, pfad_)
            pruefe(f"Handy-Ansicht echt: {meth_} {pfad_} ist nicht erreichbar (405/404) und liefert keinen Schlüssel", st_ in (404, 405) and _k.encode() not in roh, (st_, roh[:80]))
        pruefe("Handy-Ansicht echt: nichts davon hat einen Not-Aus oder eine Pause ausgelöst und keine Aktion gestartet", not C.STOP.exists() and not C.PAUSE.exists() and not C._LAUFEND)
        pruefe("Handy-Ansicht echt: ohne Cookie kommt nichts heraus", _fern("GET", "/api/stand", cookie=None)[0] == 401)
    finally:
        if C.FERN is not None:
            C.FERN.stoppen()
        C.FERN, C.DATA, C.profit_stand, C.STOP, C.PAUSE = _alt_fern, _alt_data3, _alt_profit3, _alt_stop3, _alt_pause3

# Einbau im Quelltext und in der Seite
_src_c = (HIER / "cockpit.py").read_text(encoding="utf-8")
_html_c = (HIER / "cockpit.html").read_text(encoding="utf-8")
pruefe("Einbau: die Handy-Ansicht startet beim Öffnen des Cockpits NUR, wenn sie eingeschaltet ist (und nicht mit --ohne-fern)", "if f is not None and FS.eingeschaltet(DATA):" in _src_c and '"--ohne-fern"' in _src_c and "f = None if a.ohne_fern else fern_server()" in _src_c)
pruefe("Einbau: das Cockpit selbst bleibt auf 127.0.0.1 (der Bind steht nur einmal im Cockpit)", _src_c.count('ThreadingHTTPServer(("127.0.0.1", a.port), Cockpit)') == 1 and "0.0.0.0" not in _src_c)
pruefe("Einbau: /api/fern gibt es nur im lokalen Handler (GET und POST), das Modul der Handy-Ansicht kennt die Adresse nicht", '"/api/fern"' in _src_c and '"/api/fern"' not in (HIER / "fernsicht.py").read_text(encoding="utf-8"))
pruefe("Seite: Lesemodus-Merkmal, Hinweis «nur lesen», Karte «Handy-Ansicht» sind da", "const NUR_LESEN = document.documentElement.hasAttribute(\"data-nur-lesen\")" in _html_c and 'id="nurLesen"' in _html_c and 'id="fern"' in _html_c and 'id="steuerung"' in _html_c)
pruefe("Seite: jede schreibende Funktion beginnt mit der Lesemodus-Sperre (Not-Aus, Knöpfe, Protokoll, Karte)", all(x in _html_c for x in (
    '$("notaus").addEventListener("click", async () => {\n  if (NUR_LESEN) return;', "async function knopf(name) {\n  if (NUR_LESEN) return;", "async function ladeProtokoll() {\n  if (NUR_LESEN) return [];",
    '$("fernSchalter").addEventListener("click", () => {\n  if (NUR_LESEN || !letzteFern) return;', '$("fern").addEventListener("click", async e => {\n  if (NUR_LESEN) return;', "async function ladeFern() {\n  if (NUR_LESEN) return;")))
pruefe("Seite: genau drei POST-Stellen (Not-Aus, Knopf, Handy-Ansicht), alle mit dem Kopf X-Cockpit", _html_c.count('method: "POST"') == 3 and _html_c.count('"X-Cockpit": "1"') == 3)
pruefe("Seite: im Lesemodus sind Not-Aus, Auto-Schalter, Steuerung, Risiko, Knöpfe, Konsole und die Karte per CSS ausgeblendet, die Gesundheit bleibt",
       all(x in _html_c for x in ("html[data-nur-lesen] #notaus", "html[data-nur-lesen] #autoK", "html[data-nur-lesen] #fern", "#steuerung .steuerkopf", "#steuerung .risiko", "#steuerung .knoepfe", "#steuerung .konsole"))
       and "#steuerung #g-box" not in _html_c.split("html[data-nur-lesen]")[-1].split("</style>")[0])

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
