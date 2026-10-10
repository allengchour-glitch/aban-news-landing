#!/usr/bin/env python3
"""Broker-Anbindung Alpaca (Trading API v2) — standardmässig im PAPIERKONTO.

Sicherungen (alle aktiv, nicht abschaltbar ausser durch die genannten Schalter):
  • Ohne ALPACA_KEY_ID + ALPACA_SECRET_KEY passiert nichts.
  • Papier ist Standard. Echtes Geld NUR, wenn BEIDES gesetzt ist:
        ALPACA_PAPER=false   und   KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"
    Fehlt eines davon, geht jeder Auftrag ins Papierkonto.
  • Not-Aus: Umgebungsvariable KI_BOT_STOP=1 oder Datei tools/trading/ki_bot/STOP → keine Aufträge.
  • Nur kaufen und verkaufen, was da ist: kein Leerverkauf, kein Hebel, kein Margin.
  • Höchstens KI_BOT_ANTEIL (Standard 0.5) des Kontowerts wird überhaupt investiert.
  • Jeder einzelne Auftrag höchstens KI_BOT_MAX_AUFTRAG USD (Standard 1000). Grössere Umschichtungen
    werden über mehrere Tage verteilt.
  • Aufträge unter 50 USD werden ausgelassen (Kosten/Rauschen).
  • --trocken zeigt die Aufträge nur an.
  • Keine Schlüssel im Protokoll. Jeder Lauf wird in data/ki-bot-broker.json angehängt.

Strategie für echte Aufträge: KI_BOT_STRATEGIE (Standard "Ausgleich" — im Backtest die beste).
Handelbar über Alpaca sind nur US-Wertpapiere und Krypto. Abbildung (Ersatz, nicht identisch!):
  S&P 500 → SPY · SMI → EWL (iShares MSCI Switzerland ETF) · Gold → GLD · Silber → SLV · Bitcoin → BTC/USD
  Nestlé, EUR/CHF und Öl werden NICHT gehandelt (kein sauberer Ersatz bzw. Rollkosten bei Öl-ETFs).
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
STOP_DATEI = HIER / "STOP"    # Not-Aus
PAUSE_DATEI = HIER / "PAUSE"  # Cockpit «Auto-Handel aus»
ROOT = HIER.parents[2]
PROTOKOLL = ROOT / "data" / "ki-bot-broker.json"
PAPIER_URL = "https://paper-api.alpaca.markets"
ECHT_URL = "https://api.alpaca.markets"
ECHTGELD_SATZ = "JA, MIT ECHTEM GELD"
SYMBOLE = {"S&P 500": "SPY", "SMI": "EWL", "Gold": "GLD", "Silber": "SLV", "Bitcoin": "BTC/USD"}
MIN_AUFTRAG = 50.0


def einstellungen(env=None):
    env = os.environ if env is None else env
    echt = env.get("ALPACA_PAPER", "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ
    return {
        "key": env.get("ALPACA_KEY_ID", ""), "secret": env.get("ALPACA_SECRET_KEY", ""),
        "basis": env.get("ALPACA_BASIS_URL") or (ECHT_URL if echt else PAPIER_URL),  # ALPACA_BASIS_URL nur für Tests
        "echtgeld": echt,
        "strategie": env.get("KI_BOT_STRATEGIE") or "Ausgleich",
        "anteil": max(0.0, min(1.0, float(env.get("KI_BOT_ANTEIL") or "0.5"))),
        "max_auftrag": max(0.0, float(env.get("KI_BOT_MAX_AUFTRAG") or "1000")),
        "stop": env.get("KI_BOT_STOP", "") == "1" or STOP_DATEI.exists() or PAUSE_DATEI.exists(),
    }


class Alpaca:
    def __init__(self, cfg):
        self.cfg = cfg

    def _req(self, methode, pfad, daten=None):
        url = self.cfg["basis"].rstrip("/") + pfad
        body = json.dumps(daten).encode() if daten is not None else None
        req = urllib.request.Request(url, data=body, method=methode, headers={
            "APCA-API-KEY-ID": self.cfg["key"], "APCA-API-SECRET-KEY": self.cfg["secret"],
            "Content-Type": "application/json", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None

    def konto(self):
        return self._req("GET", "/v2/account")

    def positionen(self):
        return {p["symbol"]: p for p in self._req("GET", "/v2/positions")}

    def auftrag(self, symbol, seite, notional):
        krypto = "/" in symbol
        return self._req("POST", "/v2/orders", {
            "symbol": symbol, "side": seite, "type": "market", "notional": f"{notional:.2f}",
            "time_in_force": "gtc" if krypto else "day"})


def plane(cfg, konto, positionen, ziele):
    """Reine Rechnung (ohne Netz, testbar): Ziel-Beträge je Symbol → Liste von Aufträgen."""
    wert = float(konto["equity"])
    investierbar = wert * cfg["anteil"]
    plan = []
    for sym, anteil_ziel in ziele.items():
        ist = float(positionen.get(sym.replace("/", ""), positionen.get(sym, {})).get("market_value", 0.0) or 0.0)
        soll = investierbar * anteil_ziel
        diff = soll - ist
        if abs(diff) < MIN_AUFTRAG:
            continue
        betrag = min(abs(diff), cfg["max_auftrag"])
        if diff < 0:
            betrag = min(betrag, ist)  # nie mehr verkaufen als vorhanden → kein Leerverkauf
            if betrag < MIN_AUFTRAG:
                continue
        plan.append({"symbol": sym, "seite": "buy" if diff > 0 else "sell", "notional": round(betrag, 2),
                     "ist": round(ist, 2), "soll": round(soll, 2)})
    # Käufe dürfen das freie Geld nicht übersteigen (kein Margin)
    frei = float(konto.get("cash", wert))
    verkauf = sum(a["notional"] for a in plan if a["seite"] == "sell")
    budget = frei + verkauf
    for a in plan:
        if a["seite"] == "buy":
            a["notional"] = round(max(0.0, min(a["notional"], budget)), 2)
            budget -= a["notional"]
    return [a for a in plan if a["notional"] >= MIN_AUFTRAG]


def ziele_aus_logbuch(lb, strategie):
    """Zielanteile je Alpaca-Symbol aus der letzten Entscheidung der gewählten Strategie (auf handelbare Märkte normiert)."""
    st = lb["strategien"].get(strategie)
    if not st or not st.get("eintraege"):
        raise SystemExit(f"Strategie {strategie!r} hat noch keine Entscheidung im Logbuch.")
    pos = st["eintraege"][-1]["positionen"]
    roh = {SYMBOLE[m]: v["gewicht"] * v["quote"] for m, v in pos.items() if m in SYMBOLE}
    gew = {SYMBOLE[m]: v["gewicht"] for m, v in pos.items() if m in SYMBOLE}
    s = sum(gew.values())
    return {sym: (x / s if s else 0.0) for sym, x in roh.items()}


def ausfuehren(lb, trocken=False, env=None, client=None):
    cfg = einstellungen(env)
    eintrag = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": "ECHTGELD" if cfg["echtgeld"] else "papier",
               "strategie": cfg["strategie"], "trocken": trocken, "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"]:
        print("Broker: keine Alpaca-Schlüssel gesetzt — nichts zu tun.")
        return 0
    if cfg["stop"]:
        eintrag["hinweis"] = "Not-Aus oder Pause aktiv (KI_BOT_STOP, Datei STOP oder PAUSE) — keine Aufträge."
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 0
    if cfg["echtgeld"]:
        print("⚠️  ECHTGELD-MODUS: Aufträge gehen an ein echtes Konto.")
    c = client or Alpaca(cfg)
    try:
        konto = c.konto()
        if konto.get("trading_blocked") or konto.get("account_blocked"):
            eintrag["hinweis"] = "Konto gesperrt — keine Aufträge."
            print("Broker: " + eintrag["hinweis"])
            _protokolliere(eintrag)
            return 1
        plan = plane(cfg, konto, c.positionen(), ziele_aus_logbuch(lb, cfg["strategie"]))
    except (urllib.error.URLError, KeyError, ValueError) as e:
        eintrag["hinweis"] = f"Broker nicht erreichbar oder Antwort unerwartet: {type(e).__name__}"
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 1
    for a in plan:
        print(f"{'(trocken) ' if trocken else ''}{a['seite']:4} {a['symbol']:8} {a['notional']:>9.2f} USD (ist {a['ist']:.2f} → soll {a['soll']:.2f})")
        if not trocken:
            try:
                antwort = c.auftrag(a["symbol"], a["seite"], a["notional"])
                a["id"] = (antwort or {}).get("id")
                a["status"] = (antwort or {}).get("status")
            except urllib.error.HTTPError as e:
                a["fehler"] = f"HTTP {e.code}"
        eintrag["auftraege"].append(a)
    if not plan:
        print("Broker: Depot liegt im Zielbereich — keine Aufträge.")
    _protokolliere(eintrag)
    return 0


def _protokolliere(eintrag):
    alt = json.loads(PROTOKOLL.read_text(encoding="utf-8")) if PROTOKOLL.exists() else []
    alt.append(eintrag)
    PROTOKOLL.parent.mkdir(exist_ok=True)
    PROTOKOLL.write_text(json.dumps(alt[-500:], ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


# ───────────── Daytrading: Bracket-Aufträge aus Signalen mit Gütesiegel ─────────────
# Futures-Signal → US-ETF als Ersatz (Prozent-Abstände werden übertragen, nicht absolute Kurse)
DAYTRADE_SYMBOLE = {"ES=F": "SPY", "NQ=F": "QQQ", "GC=F": "GLD", "SI=F": "SLV"}
DATEN_URL = "https://data.alpaca.markets"


class AlpacaDaten(Alpaca):
    def letzter_kurs(self, symbol):
        url = (self.cfg.get("daten_basis") or DATEN_URL).rstrip("/") + f"/v2/stocks/{symbol}/trades/latest"
        req = urllib.request.Request(url, headers={"APCA-API-KEY-ID": self.cfg["key"], "APCA-API-SECRET-KEY": self.cfg["secret"]})
        with urllib.request.urlopen(req, timeout=20) as r:
            return float(json.load(r)["trade"]["p"])

    def uhr(self):
        return self._req("GET", "/v2/clock")

    def bracket(self, symbol, menge, stop, ziel):
        return self._req("POST", "/v2/orders", {
            "symbol": symbol, "qty": str(menge), "side": "buy", "type": "market", "time_in_force": "day",
            "order_class": "bracket", "take_profit": {"limit_price": f"{ziel:.2f}"}, "stop_loss": {"stop_price": f"{stop:.2f}"}})

    def schliessen(self, symbol):
        return self._req("DELETE", f"/v2/positions/{symbol}")


def plane_daytrade(cfg, konto, signal, kurs, risiko_pct):
    """Reine Rechnung: Signal → Bracket (nur Kauf, ganze Stücke, Risiko = Stop-Verlust)."""
    if signal["richtung"] != 1:
        return None, "nur Kauf-Signale werden automatisch gehandelt (kein Leerverkauf)"
    sym = DAYTRADE_SYMBOLE.get(signal["symbol"])
    if not sym:
        return None, "kein handelbarer Ersatz bei Alpaca"
    stop_pct = signal["stop_abstand"] / signal["einstieg"]
    if not 0 < stop_pct < 0.2:
        return None, "Stop-Abstand unplausibel"
    risiko = float(konto["equity"]) * risiko_pct / 100
    menge = int(risiko / (kurs * stop_pct))
    menge = min(menge, int(cfg["max_auftrag"] // kurs), int(float(konto.get("cash", 0)) // kurs))
    if menge < 1:
        return None, "Position wäre kleiner als 1 Stück (Konto/Risiko/Höchstbetrag zu klein)"
    return {"symbol": sym, "menge": menge, "stop": round(kurs * (1 - stop_pct), 2), "ziel": round(kurs * (1 + 3 * stop_pct), 2),
            "kurs": kurs, "risiko": round(menge * kurs * stop_pct, 2)}, ""


def daytrade(signale, trocken=False, env=None, client=None):
    cfg = einstellungen(env)
    env = os.environ if env is None else env
    risiko_pct = float(env.get("KI_BOT_RISIKO") or "1")
    eintrag = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "art": "daytrade",
               "modus": "ECHTGELD" if cfg["echtgeld"] else "papier", "trocken": trocken, "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"] or not signale:
        return 0
    if cfg["stop"]:
        eintrag["hinweis"] = "Not-Aus oder Pause aktiv — keine Aufträge."
        print("Broker: " + eintrag["hinweis"])
        _protokolliere(eintrag)
        return 0
    c = client or AlpacaDaten(cfg)
    try:
        if not c.uhr().get("is_open"):
            eintrag["hinweis"] = "US-Börse geschlossen — Signale nur gepusht, kein Auftrag."
            print("Broker: " + eintrag["hinweis"])
            _protokolliere(eintrag)
            return 0
        konto = c.konto()
        for s in signale:
            sym = DAYTRADE_SYMBOLE.get(s["symbol"])
            plan, grund = plane_daytrade(cfg, konto, s, c.letzter_kurs(sym) if sym else 0.0, risiko_pct)
            if not plan:
                eintrag["auftraege"].append({"signal": s["id"], "ausgelassen": grund})
                continue
            print(f"{'(trocken) ' if trocken else ''}Bracket {plan['symbol']} {plan['menge']} Stk. · Stop {plan['stop']} · Ziel {plan['ziel']} · Risiko {plan['risiko']} USD")
            if not trocken:
                antwort = c.bracket(plan["symbol"], plan["menge"], plan["stop"], plan["ziel"])
                plan["id"] = (antwort or {}).get("id")
            plan["signal"] = s["id"]
            eintrag["auftraege"].append(plan)
    except (urllib.error.URLError, KeyError, ValueError) as e:
        eintrag["hinweis"] = f"Broker-Fehler: {type(e).__name__}"
        print("Broker: " + eintrag["hinweis"])
    _protokolliere(eintrag)
    return 0


def schliesse_daytrades(heute, trocken=False, env=None, client=None):
    """Zum Tagesschluss: alle heute per Daytrade eröffneten Positionen glattstellen (nie über Nacht)."""
    cfg = einstellungen(env)
    if not cfg["key"] or not cfg["secret"] or not PROTOKOLL.exists():
        return []
    offen = {a["symbol"] for e in json.loads(PROTOKOLL.read_text(encoding="utf-8"))
             if e.get("art") == "daytrade" and e["zeit"].startswith(heute) and not e.get("trocken")
             for a in e["auftraege"] if a.get("id")}
    c = client or AlpacaDaten(cfg)
    geschlossen = []
    for sym in sorted(offen):
        if sym in c.positionen():
            if not trocken:
                c.schliessen(sym)
            geschlossen.append(sym)
    if geschlossen:
        _protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "art": "daytrade-schluss",
                        "trocken": trocken, "auftraege": [{"symbol": s, "glattgestellt": True} for s in geschlossen], "hinweis": ""})
    return geschlossen


def kurz_vor_schluss(minuten=20, env=None, client=None, jetzt=None):
    """True, wenn die US-Börse offen ist und laut Alpaca-Uhr in höchstens `minuten` schliesst."""
    cfg = einstellungen(env)
    if not cfg["key"] or not cfg["secret"]:
        return False
    try:
        u = (client or AlpacaDaten(cfg)).uhr()
    except (urllib.error.URLError, ValueError):
        return False
    if not u.get("is_open"):
        return False
    schluss = datetime.fromisoformat(u["next_close"].replace("Z", "+00:00"))
    jetzt = jetzt or datetime.now(timezone.utc)
    return 0 <= (schluss - jetzt).total_seconds() <= minuten * 60
