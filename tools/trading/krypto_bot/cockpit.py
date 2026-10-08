#!/usr/bin/env python3
"""Krypto-Cockpit — Live-Dashboard im Browser und Steuerung per Telegram, für Pilot, KI-Trader (Claude) und ETH-Sammler.

  py tools/trading/krypto_bot/cockpit.py            # startet http://127.0.0.1:8765 und öffnet den Browser
  py tools/trading/krypto_bot/cockpit.py --kein-browser --port 8765

Das Cockpit liest nur die Logbücher in data/ und den Zwischenspeicher der Markt-Infos und handelt nicht selbst.
/markt ist die Live-Ansicht im Stil einer Börse (Kerzen, Volumen, MA/BOLL, RSI, MACD, Orderbuch, Markttiefe, Trades, Märkte):
der Browser holt die Kurse direkt bei Binance (öffentliche Marktdaten, ohne Schlüssel). Einzige Aktion: der Not-Aus-Knopf (schliesst die Pilot-Positionen und stoppt alle Bots, wie stop.bat).
Es lauscht nur auf diesem PC (127.0.0.1), nicht im Netzwerk.

Telegram-Steuerung (läuft mit, wenn TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID gesetzt sind). Befehle nur aus deinem Chat:
  /status  Pilot heute · /konto  Wochenbericht · /ki  Claude-Einschätzung · /lage  Markt-Infos
  /stop    Not-Aus: Positionen schliessen, alle Bots stoppen · /weiter  Not-Aus aufheben · /hilfe
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))

ROOT = HIER.parents[2]
DATA = ROOT / "data"
STOP = HIER.parent / "ki_bot" / "STOP"
SEITE = HIER / "cockpit.html"
MARKT = HIER / "markt.html"
HILFE = ("Befehle: /status Pilot heute · /konto Wochenbericht · /ki Claude-Einschätzung · /lage Markt-Infos · "
         "/stop Not-Aus (Positionen schliessen) · /weiter Not-Aus aufheben")


def _json(name, standard):
    p = DATA / name
    try:
        return json.loads(p.read_text(encoding="utf-8")) if p.exists() else standard
    except ValueError:
        return standard


# ───────────────────────── Aktionen (Cockpit-Knopf und Telegram) ─────────────────────────
def notaus_an(schliessen=True, ausfuehren=None):
    """Not-Aus setzen und die Pilot-Positionen sofort schliessen (reduceOnly). Gibt eine Meldung zurück."""
    STOP.parent.mkdir(parents=True, exist_ok=True)
    STOP.write_text(datetime.now(timezone.utc).isoformat(timespec="seconds") + " Not-Aus (Cockpit/Telegram)\n", encoding="utf-8")
    if not schliessen:
        return "🛑 Not-Aus aktiv."
    import pilot as PI
    if ausfuehren is None:
        import broker_futures as BF
        ausfuehren = BF.ausfuehren
    ms = PI.maerkte()
    erledigt = []
    for m in ms:
        try:
            a = ausfuehren({"hebel": 0.0, "stand": datetime.now(timezone.utc).date().isoformat()},
                           symbol=PI.MAERKTE[m][0], gewicht=1 / len(ms))
            erledigt += [f"{m}: {x['seite']} {x['menge']}" for x in a or []]
        except Exception as ex:  # noqa: BLE001
            erledigt.append(f"{m}: Fehler {type(ex).__name__} — bitte im Binance-Konto prüfen!")
    return "🛑 Not-Aus aktiv. " + ("Geschlossen: " + ", ".join(erledigt) if erledigt else "Keine offenen Positionen (oder keine Futures-Schlüssel).")


def notaus_aus():
    if STOP.exists():
        STOP.unlink()
    return "✅ Not-Aus aufgehoben. Der nächste Lauf handelt wieder."


# ───────────────────────── Knöpfe (nur fest eingetragene Aktionen, kein beliebiger Befehl) ─────────────────────────
# Name → (Skript und Argumente, Zeitlimit in Sekunden, Titel)
AKTIONEN = {
    "probe": (["pilot.py", "--lauf", "--trocken"], 300, "Pilot – Probelauf ohne Aufträge"),
    "handeln": (["pilot.py", "--lauf"], 300, "Pilot – jetzt handeln"),
    "ki": (["ki_trader.py", "--lauf"], 300, "Claude fragen"),
    "sparplan": (["eth_sammler.py", "--lauf"], 300, "ETH-Sparplan ausführen"),
    "infos": (["infos.py"], 600, "Markt-Infos aktualisieren"),
    "backtest": (["pilot.py", "--backtest"], 600, "Backtest rechnen"),
    "selbsttest": ([], 900, "Selbsttest"),
    "bericht": ([], 120, "Wochenbericht aufs Handy"),
    "auto_an": ([], 10, "Auto-Handel an"),
    "auto_aus": ([], 10, "Auto-Handel aus"),
}
SELBSTTESTS = ["test_pilot.py", "test_sammler.py", "test_infos.py", "test_binance.py"]
PROTOKOLL = deque(maxlen=40)
_LAUFEND, _SPERRE = {}, threading.Lock()  # Name → Startzeit


def _skript(args, zeit):
    """Ein Bot-Skript als eigenen Prozess starten (wie von Hand), Ausgabe einsammeln."""
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    try:
        r = subprocess.run([sys.executable, str(HIER / args[0]), *args[1:]], capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=zeit, cwd=str(ROOT), env=env)
        return r.returncode == 0, (r.stdout + ("\n" + r.stderr if r.stderr.strip() else "")).strip()
    except subprocess.TimeoutExpired:
        return False, f"Abgebrochen: länger als {zeit} Sekunden."


def aktion(name, starter=None):
    """Führt eine Knopf-Aktion aus → Protokoll-Eintrag {zeit, aktion, titel, ok, text}. starter: für Tests."""
    if name not in AKTIONEN:
        raise KeyError(name)
    args, zeit, titel = AKTIONEN[name]
    with _SPERRE:
        if name in _LAUFEND:
            return {"aktion": name, "titel": titel, "ok": False, "text": "Läuft schon — bitte warten.", "besetzt": True}
        _LAUFEND[name] = time.time()
    try:
        starter = starter or _skript
        if name == "auto_an":
            ok, text = True, notaus_aus().replace("Not-Aus aufgehoben", "Auto-Handel an")
        elif name == "auto_aus":
            ok, text = True, notaus_an(schliessen=False).replace("🛑 Not-Aus aktiv.", "⏸ Auto-Handel aus.") + \
                " Offene Positionen bleiben stehen, ihr Stop an der Börse bleibt aktiv. Sofort schliessen: roter Not-Aus-Knopf."
        elif name == "handeln" and STOP.exists():
            ok, text = False, "Auto-Handel ist aus (Not-Aus aktiv). Erst einschalten — sonst würde dieser Lauf die Positionen schliessen."
        elif name == "selbsttest":
            teile, ok = [], True
            for t in SELBSTTESTS:
                o, out = starter([t], zeit)
                ok = ok and o
                teile.append(f"{t}: {out.strip().splitlines()[-1] if out.strip() else 'keine Ausgabe'}")
            text = "\n".join(teile)
        elif name == "bericht":
            import pilot as PI
            import signale as SG
            t = PI.wochenbericht(PI.lies(), datetime.now(timezone.utc).date().isoformat(), erzwingen=True)
            ok, text = (True, t + "\n\n→ gesendet (Telegram/ntfy, falls eingerichtet)") if t else (False, "Noch kein Kontostand — erst ein Lauf mit Futures-Schlüssel.")
            if t:
                SG.push(t + "\nKeine Anlageberatung.")
        else:
            ok, text = starter(args, zeit)
    finally:
        with _SPERRE:
            _LAUFEND.pop(name, None)
    e = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "aktion": name, "titel": titel, "ok": ok, "text": text[-6000:]}
    PROTOKOLL.appendleft(e)
    return e


# ───────────────────────── Daten fürs Cockpit ─────────────────────────
_BACKTEST = {}


def backtest_kurven():
    """Pilot (BTC 150 + ETH 200 + MVRV-Bremse) gegen Bitcoin halten ab 2019 — nur aus dem Zwischenspeicher, einmal je Start."""
    if "k" in _BACKTEST:
        return _BACKTEST["k"]
    try:
        import info_pruefung as IP
        import pilot_kern as K
        import pilot_pruefung as P
        daten = HIER.parent / "daten"
        if not ((daten / "BTC-USD_hlc.json").exists() and (daten / "ETH-USD_hlc.json").exists()):
            _BACKTEST["k"] = None
            return None
        tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([P.ohlc("BTC-USD"), P.ohlc("ETH-USD")])
        zb = IP.filter_z(K.roh_hebel(cb, n_sma=150), *IP.bremsen("mvrv_tief", IP.flaggen("btc", tage, nur_speicher=True)))
        ze = IP.filter_z(K.roh_hebel(ce, n_sma=200), *IP.bremsen("mvrv_tief", IP.flaggen("eth", tage, nur_speicher=True)))
        a = next(i for i, t in enumerate(tage) if t >= "2019-01-01")
        wb, _ = P.lauf(zb, hb, lb, cb, a, len(cb), K.STOP_SIGMA)
        we, _ = P.lauf(ze, he, le, ce, a, len(ce), K.STOP_SIGMA)
        halten, _ = P.lauf([1.0] * len(cb), hb, lb, cb, a, len(cb))
        t = tage[a:]
        schritt = max(1, len(t) // 400)  # höchstens ~400 Punkte
        _BACKTEST["k"] = {"Pilot": [[t[i], round(0.5 * wb[i] + 0.5 * we[i], 4)] for i in range(0, len(t), schritt)],
                          "BTC halten": [[t[i], round(halten[i], 4)] for i in range(0, len(t), schritt)]}
    except Exception:  # noqa: BLE001
        _BACKTEST["k"] = None
    return _BACKTEST["k"]


def stand(env=None):
    env = os.environ if env is None else env
    import ki_trader as KT
    import pilot as PI
    lb = _json("krypto-pilot.json", {"entscheide": [], "kontostand": []})
    lb.setdefault("entscheide", [])
    lb.setdefault("kontostand", [])
    maerkte = {}
    for e in lb["entscheide"]:
        maerkte[e.get("markt", "BTC")] = e
    ks = lb["kontostand"]
    konto = None
    if ks:
        jetzt, start, spitze = ks[-1]["kapital"], ks[0]["kapital"], max(x["kapital"] for x in ks)
        vor7 = [x for x in ks if (datetime.fromisoformat(ks[-1]["tag"]) - datetime.fromisoformat(x["tag"])).days >= 7]
        konto = {"wert": jetzt, "seit_start": jetzt / start - 1 if start else None,
                 "seit_woche": jetzt / vor7[-1]["kapital"] - 1 if vor7 and vor7[-1]["kapital"] else None,
                 "unter_hoch": jetzt / spitze - 1 if spitze else None, "start_tag": ks[0]["tag"]}
    auftraege = []
    for p in reversed(_json("ki-bot-broker.json", [])):
        if p.get("broker") != "binance-futures":
            continue
        for a in p.get("auftraege", []):
            auftraege.append({"zeit": p["zeit"], "symbol": p.get("symbol"), "modus": p.get("modus"), "trocken": p.get("trocken"),
                              "seite": a.get("seite"), "menge": a.get("menge"), "nur_verkleinern": a.get("reduce_only"),
                              "status": a.get("status") or a.get("fehler") or ("trocken" if p.get("trocken") else "")})
        if p.get("hinweis") and not p.get("auftraege"):
            auftraege.append({"zeit": p["zeit"], "symbol": p.get("symbol"), "modus": p.get("modus"), "hinweis": p["hinweis"]})
        if len(auftraege) >= 25:
            break
    try:
        import infos as I
        lage = I.lagebild(nur_speicher=True)
    except Exception:  # noqa: BLE001
        lage = {}
    ki = _json("ki-trader.json", {"entscheide": []})
    vgl = {}
    if ki.get("entscheide"):
        try:
            reihen = KT.kurse_laden(offline=True)
            vgl = KT.vergleich(ki, lb["entscheide"], {c: dict(reihen[c]) for c in KT.COINS})
        except Exception:  # noqa: BLE001
            vgl = {}
    sam = _json("eth-sammler.json", {})
    echt_futures = (env.get("BINANCE_FUTURES_TESTNET") or "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == "JA, MIT ECHTEM GELD"
    echt_spot = (env.get("BINANCE_TESTNET") or "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == "JA, MIT ECHTEM GELD"
    buch = sam.get("echtgeld" if echt_spot else "testnetz", {"kaeufe": [], "gestakt": []})
    kaeufe = buch.get("kaeufe", [])
    sammler = None
    if kaeufe:
        usdt, eth = sum(k["usdt"] for k in kaeufe), sum(k["eth"] for k in kaeufe)
        sammler = {"kaeufe": len(kaeufe), "eingesetzt": round(usdt, 2), "eth": round(eth, 6), "schnitt": round(usdt / eth, 2) if eth else None,
                   "gestakt": round(sum(s["eth"] for s in buch.get("gestakt", [])), 4), "letzte": kaeufe[-8:]}
    return {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": "ECHTGELD" if echt_futures else "TESTNETZ",
            "notaus": STOP.exists(), "maerkte": [maerkte[m] for m in PI.MAERKTE if m in maerkte], "konto": konto,
            "kontostand": [[x["tag"], x["kapital"]] for x in ks], "auftraege": auftraege, "lage": lage,
            "ki": {"letzter": ki["entscheide"][-1] if ki.get("entscheide") else None, "vergleich": vgl,
                   "kosten": round(sum(x.get("kosten_usd", 0) for x in ki.get("entscheide", [])), 2)},
            "sammler": sammler, "backtest": backtest_kurven(), "telegram": bool(env.get("TELEGRAM_BOT_TOKEN") and env.get("TELEGRAM_CHAT_ID"))}


# ───────────────────────── Webserver (nur 127.0.0.1) ─────────────────────────
class Cockpit(BaseHTTPRequestHandler):
    port = 8765

    def _senden(self, code, daten, typ="application/json; charset=utf-8"):
        b = daten if isinstance(daten, bytes) else json.dumps(daten, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", typ)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        pfad = urllib.parse.urlparse(self.path).path
        if pfad in ("/", "/index.html"):
            return self._senden(200, SEITE.read_bytes(), "text/html; charset=utf-8")
        if pfad in ("/markt", "/markt.html"):
            return self._senden(200, MARKT.read_bytes(), "text/html; charset=utf-8")
        if pfad == "/api/protokoll":
            jetzt = time.time()
            return self._senden(200, {"protokoll": list(PROTOKOLL), "laufend": [
                {"aktion": n, "titel": AKTIONEN[n][2], "sekunden": round(jetzt - t)} for n, t in sorted(_LAUFEND.items())]})
        if pfad == "/api/stand":
            try:
                return self._senden(200, stand())
            except Exception as ex:  # noqa: BLE001
                return self._senden(500, {"fehler": type(ex).__name__})
        return self._senden(404, {"fehler": "nicht gefunden"})

    def do_POST(self):
        # Schutz gegen fremde Webseiten: eigener Kopf (löst im Browser eine Vorabfrage aus, die wir nicht beantworten)
        herkunft = self.headers.get("Origin")
        erlaubt = {f"http://127.0.0.1:{self.port}", f"http://localhost:{self.port}"}
        if self.headers.get("X-Cockpit") != "1" or (herkunft and herkunft not in erlaubt):
            return self._senden(403, {"fehler": "verboten"})
        pfad = urllib.parse.urlparse(self.path).path
        if pfad not in ("/api/notaus", "/api/aktion"):
            return self._senden(404, {"fehler": "nicht gefunden"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            daten = json.loads(self.rfile.read(n).decode() or "{}")
        except ValueError:
            return self._senden(400, {"fehler": "ungültig"})
        if pfad == "/api/aktion":
            name = str(daten.get("aktion", ""))
            if name not in AKTIONEN:
                return self._senden(400, {"fehler": "unbekannte Aktion"})
            if name in _LAUFEND:
                return self._senden(409, {"fehler": "läuft schon"})
            # Im Hintergrund: manche Läufe dauern Minuten (erster Abruf der Markt-Infos), der Browser fragt das Protokoll ab
            threading.Thread(target=aktion, args=(name,), daemon=True).start()
            return self._senden(202, {"gestartet": name})
        an = bool(daten.get("an"))
        meldung = notaus_an() if an else notaus_aus()
        PROTOKOLL.appendleft({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "aktion": "notaus" if an else "auto_an",
                              "titel": "Not-Aus" if an else "Not-Aus aufgehoben", "ok": True, "text": meldung})
        return self._senden(200, {"meldung": meldung, "notaus": STOP.exists()})

    def log_message(self, *a):
        pass


# ───────────────────────── Telegram ─────────────────────────
def befehl(text):
    """Antworttext auf einen Telegram-Befehl (None = ignorieren)."""
    b = (text or "").strip().split()[0].split("@")[0].lower() if (text or "").strip() else ""
    if b in ("/start", "/hilfe", "/help"):
        return HILFE
    if b == "/stop":
        return notaus_an()
    if b == "/weiter":
        return notaus_aus()
    if b == "/status":
        import pilot as PI
        teile = [PI.text(PI.entscheid(m)) for m in PI.maerkte()]
        return "\n".join(teile) + ("\n🛑 Not-Aus ist aktiv." if STOP.exists() else "")
    if b == "/konto":
        import pilot as PI
        return PI.wochenbericht(PI.lies(), datetime.now(timezone.utc).date().isoformat(), erzwingen=True) or "Noch kein Kontostand."
    if b == "/ki":
        import ki_trader as KT
        ki = KT.lies()
        return KT.stand_text(ki, KT.vergleich(ki, KT.pilot_entscheide(), {c: dict(r) for c, r in KT.kurse_laden(offline=True).items()}))
    if b == "/lage":
        import infos as I
        return "Lagebild (nur Info): " + I.text(I.lagebild())
    return None


def telegram_schleife(env=None, basis="https://api.telegram.org", runden=None, warte=50):
    """Liest Befehle per getUpdates. Nur Nachrichten aus TELEGRAM_CHAT_ID; alte Nachrichten (vor dem Start) werden übersprungen."""
    env = os.environ if env is None else env
    token, chat = env.get("TELEGRAM_BOT_TOKEN", ""), str(env.get("TELEGRAM_CHAT_ID", ""))
    if not token or not chat:
        return
    url = f"{basis.rstrip('/')}/bot{token}"
    start, offset, n = time.time(), None, 0
    while runden is None or n < runden:
        n += 1
        try:
            q = {"timeout": warte} | ({"offset": offset} if offset is not None else {})
            with urllib.request.urlopen(f"{url}/getUpdates?{urllib.parse.urlencode(q)}", timeout=warte + 15) as r:
                updates = json.load(r).get("result", [])
        except Exception:  # noqa: BLE001 — Netz weg: kurz warten, weiter
            time.sleep(5 if runden is None else 0)
            continue
        for u in updates:
            offset = u["update_id"] + 1
            m = u.get("message") or {}
            if str((m.get("chat") or {}).get("id")) != chat or m.get("date", 0) < start - 60:
                continue
            try:
                antwort = befehl(m.get("text", ""))
            except Exception as ex:  # noqa: BLE001
                antwort = f"Fehler: {type(ex).__name__}"
            if antwort:
                daten = urllib.parse.urlencode({"chat_id": chat, "text": antwort[:4000]}).encode()
                try:
                    urllib.request.urlopen(urllib.request.Request(f"{url}/sendMessage", data=daten), timeout=15).close()
                except Exception:  # noqa: BLE001
                    pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--kein-browser", action="store_true")
    ap.add_argument("--ohne-telegram", action="store_true")
    a = ap.parse_args()
    Cockpit.port = a.port
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Cockpit)
    adresse = f"http://127.0.0.1:{a.port}"
    print(f"Krypto-Cockpit läuft: {adresse}  (Fenster schliessen = Cockpit aus; die Bots laufen unabhängig davon)")
    if os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID") and not a.ohne_telegram:
        threading.Thread(target=telegram_schleife, daemon=True).start()
        print("Telegram-Steuerung aktiv: /status /konto /ki /lage /stop /weiter")
    if not a.kein_browser:
        import webbrowser
        threading.Timer(1.0, lambda: webbrowser.open(adresse)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
