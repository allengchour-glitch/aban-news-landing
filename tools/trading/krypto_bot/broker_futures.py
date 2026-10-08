#!/usr/bin/env python3
"""Broker-Anbindung Binance USDⓈ-M Futures für den Krypto-Pilot — standardmässig im TESTNETZ (Spielgeld).

Sicherungen:
  • Eigene Schlüssel: BINANCE_FUTURES_API_KEY / BINANCE_FUTURES_API_SECRET (nicht die Spot-Schlüssel).
  • Testnetz ist Standard (testnet.binancefuture.com). Echtes Geld NUR, wenn BEIDES gesetzt ist:
        BINANCE_FUTURES_TESTNET=false   und   KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"
  • Echtgeld: Erlaubt der Schlüssel Auszahlungen, handelt der Pilot NICHT (Rechteprüfung vor jedem Lauf).
  • Hebel: Risiko-Stufe 1 / 1,5 / 2 (Cockpit oder KRYPTO_RISIKO; altes KRYPTO_MAX_HEBEL wirkt als Deckel), hart gedeckelt auf 2. Margin-Art ISOLATED: Verlust höchstens das Pfand der Position.
  • Nur Einweg-Modus (kein Hedge), nur Marktaufträge; Verkleinern immer mit reduceOnly.
  • Stop an der Börse: STOP_MARKET closePosition auf den Markpreis, nach jedem Lauf neu gesetzt.
  • Höchstens KI_BOT_ANTEIL (Standard 0.5) des Kontos, je Auftrag höchstens KI_BOT_MAX_AUFTRAG USDT (Standard 1000).
  • Not-Aus: KI_BOT_STOP=1 oder Datei tools/trading/ki_bot/STOP → keine neuen Positionen; bestehende werden geschlossen.
  • Protokoll ohne Schlüssel in data/ki-bot-broker.json.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
TESTNETZ_URL = "https://testnet.binancefuture.com"
ECHT_URL = "https://fapi.binance.com"
SPOT_URL = "https://api.binance.com"  # Rechteprüfung des Schlüssels (nur Echtgeld)
ECHTGELD_SATZ = "JA, MIT ECHTEM GELD"
HEBEL_HART = 2.0
BAND = 0.25
MIN_AUFTRAG = 20.0


class BinanceFehler(urllib.error.HTTPError):
    """HTTP-Fehler mit Binance-Code und -Meldung (enthält nie Schlüssel)."""


def einstellungen(env=None):
    env = os.environ if env is None else env
    echt = (env.get("BINANCE_FUTURES_TESTNET") or "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ
    import pilot_kern as K
    hebel = K.risiko(None if env is os.environ else env)["max_hebel"]
    return {
        "key": env.get("BINANCE_FUTURES_API_KEY", ""), "secret": env.get("BINANCE_FUTURES_API_SECRET", ""),
        "basis": env.get("BINANCE_FUTURES_URL") or (ECHT_URL if echt else TESTNETZ_URL),
        "spot": env.get("BINANCE_SPOT_URL") or SPOT_URL,
        "echtgeld": echt, "symbol": (env.get("KRYPTO_FUTURES_SYMBOL") or "BTCUSDT").upper(),
        "max_hebel": max(0.0, min(HEBEL_HART, hebel)),
        "anteil": max(0.0, min(1.0, float(env.get("KI_BOT_ANTEIL") or "0.5"))),
        "max_auftrag": max(0.0, float(env.get("KI_BOT_MAX_AUFTRAG") or "1000")),
        "stop": env.get("KI_BOT_STOP", "") == "1" or (HIER.parent / "ki_bot" / "STOP").exists(),
    }


class Futures:
    def __init__(self, cfg):
        self.cfg = cfg
        self.versatz = None

    def _zeit(self):
        if self.versatz is None:
            try:
                self.versatz = int(self._req("GET", "/fapi/v1/time")["serverTime"] - time.time() * 1000)
            except Exception:  # noqa: BLE001
                self.versatz = 0
        return int(time.time() * 1000) + self.versatz

    def _req(self, methode, pfad, params=None, signiert=False, basis=None):
        params = dict(params or {})
        if signiert:
            params["timestamp"] = self._zeit()
            params["recvWindow"] = 10000
        q = urllib.parse.urlencode(params)
        if signiert:
            q += "&signature=" + hmac.new(self.cfg["secret"].encode(), q.encode(), hashlib.sha256).hexdigest()
        url = (basis or self.cfg["basis"]).rstrip("/") + pfad + ("?" + q if q else "")
        req = urllib.request.Request(url, method=methode, headers={"X-MBX-APIKEY": self.cfg["key"]})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode() or "null")
        except urllib.error.HTTPError as ex:
            try:
                d = json.loads(ex.read().decode() or "{}")
            except Exception:  # noqa: BLE001
                d = {}
            raise BinanceFehler(pfad, ex.code, f"{pfad}: Binance-Code {d.get('code')} {d.get('msg', '')}".strip(), ex.headers, None) from None

    def rechte(self):
        return self._req("GET", "/sapi/v1/account/apiRestrictions", signiert=True, basis=self.cfg["spot"])

    def hedge_modus(self):
        return bool(self._req("GET", "/fapi/v1/positionSide/dual", signiert=True).get("dualSidePosition"))

    def konto(self):
        return self._req("GET", "/fapi/v2/account", signiert=True)

    def position(self, symbol):
        for p in self._req("GET", "/fapi/v2/positionRisk", {"symbol": symbol}, signiert=True) or []:
            if p.get("symbol") == symbol:
                return float(p.get("positionAmt", 0) or 0)
        return 0.0

    def markpreis(self, symbol):
        d = self._req("GET", "/fapi/v1/premiumIndex", {"symbol": symbol})
        return float(d["markPrice"]), float(d.get("lastFundingRate") or 0)

    def regeln(self, symbol):
        s = next(x for x in self._req("GET", "/fapi/v1/exchangeInfo")["symbols"] if x["symbol"] == symbol)
        f = {x["filterType"]: x for x in s["filters"]}
        lot = f.get("MARKET_LOT_SIZE") if float((f.get("MARKET_LOT_SIZE") or {}).get("stepSize", 0) or 0) > 0 else f.get("LOT_SIZE", {})
        return {"step": float(lot.get("stepSize", "0.001")), "min_qty": float(lot.get("minQty", "0.001")),
                "tick": float(f.get("PRICE_FILTER", {}).get("tickSize", "0.1")),
                "min_notional": float(f.get("MIN_NOTIONAL", {}).get("notional", "100")), "status": s.get("status")}

    def einrichten(self, symbol, hebel):
        try:
            self._req("POST", "/fapi/v1/marginType", {"symbol": symbol, "marginType": "ISOLATED"}, signiert=True)
        except BinanceFehler as ex:
            if "-4046" not in str(ex.msg):  # «No need to change margin type» ist kein Fehler
                raise
        self._req("POST", "/fapi/v1/leverage", {"symbol": symbol, "leverage": max(1, math.ceil(hebel))}, signiert=True)

    def auftrag(self, symbol, seite, menge, reduce_only):
        p = {"symbol": symbol, "side": seite, "type": "MARKET", "quantity": fmt(menge), "newOrderRespType": "RESULT"}
        if reduce_only:
            p["reduceOnly"] = "true"
        return self._req("POST", "/fapi/v1/order", p, signiert=True)

    def stops_loeschen(self, symbol):
        return self._req("DELETE", "/fapi/v1/allOpenOrders", {"symbol": symbol}, signiert=True)

    def stop(self, symbol, seite, preis):
        return self._req("POST", "/fapi/v1/order", {"symbol": symbol, "side": seite, "type": "STOP_MARKET", "stopPrice": fmt(preis),
                                                    "closePosition": "true", "workingType": "MARK_PRICE", "priceProtect": "TRUE"},
                         signiert=True)


def fmt(x):
    return f"{x:.8f}".rstrip("0").rstrip(".")


def runde(x, schritt):
    return math.floor(abs(x) / schritt + 1e-9) * schritt * (1 if x >= 0 else -1)


def plane(cfg, kapital, menge_ist, mark, regeln, ziel, gewicht=1.0):
    """Reine Rechnung: Ziel-Hebel → Liste von Aufträgen [(seite, menge, reduceOnly)]. Kapital = Kontowert inkl. offener Gewinne."""
    ziel = max(-cfg["max_hebel"], min(cfg["max_hebel"], ziel))
    basis = kapital * cfg["anteil"] * gewicht
    if basis <= 0 or mark <= 0:
        return []
    ist_hebel = menge_ist * mark / basis
    gleiche_richtung = (ist_hebel > 0) == (ziel > 0)
    if ziel != 0 and menge_ist != 0 and gleiche_richtung and abs(ist_hebel - ziel) <= BAND:
        return []  # im Band: nicht handeln (spart Gebühren, wie im Backtest)
    ziel_menge = ziel * basis / mark
    mindest = max(MIN_AUFTRAG, regeln["min_notional"])
    auftraege = []
    # 1) Bestehende Position verkleinern oder schliessen (Richtungswechsel, Ziel 0, Ziel kleiner)
    if menge_ist != 0 and (ziel == 0 or not gleiche_richtung or abs(ziel_menge) < abs(menge_ist)):
        weg = abs(menge_ist) if (ziel == 0 or not gleiche_richtung) else abs(menge_ist) - abs(ziel_menge)
        weg = min(weg, cfg["max_auftrag"] / mark) if weg < abs(menge_ist) else weg  # Schliessen nie kappen
        weg = runde(weg, regeln["step"])
        if weg > 0 and (weg * mark >= mindest or weg == runde(abs(menge_ist), regeln["step"])):
            auftraege.append(("SELL" if menge_ist > 0 else "BUY", weg, True))
        if ziel == 0 or gleiche_richtung:
            return auftraege
        menge_ist = 0.0  # nach dem Schliessen neu eröffnen
    # 2) Aufbauen / vergrössern (höchstens max_auftrag pro Lauf)
    dazu = abs(ziel_menge) - abs(menge_ist)
    dazu = runde(min(dazu, cfg["max_auftrag"] / mark), regeln["step"])
    if dazu >= regeln["min_qty"] and dazu * mark >= mindest:
        auftraege.append(("BUY" if ziel > 0 else "SELL", dazu, False))
    return auftraege


def ausfuehren(entscheid, trocken=False, env=None, client=None, protokolliere=None, symbol=None, gewicht=1.0):
    """entscheid: {'hebel': Ziel-Hebel, 'stop_long': Preis, 'stop_short': Preis, 'stand': Datum}."""
    cfg = einstellungen(env)
    if protokolliere is None:
        import sys
        sys.path.insert(0, str(HIER.parent / "ki_bot"))
        import broker_alpaca as BA
        protokolliere = BA._protokolliere
    e = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "broker": "binance-futures",
         "modus": "ECHTGELD" if cfg["echtgeld"] else "testnetz", "strategie": "krypto-pilot", "trocken": trocken,
         "ziel_hebel": entscheid.get("hebel"), "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"]:
        print("Futures: keine Schlüssel (BINANCE_FUTURES_API_KEY/SECRET) gesetzt — nichts zu tun.")
        return []
    c = client or Futures(cfg)
    ziel = 0.0 if cfg["stop"] else float(entscheid.get("hebel") or 0)
    if cfg["stop"]:
        e["hinweis"] = "Not-Aus aktiv — keine neuen Positionen, bestehende werden geschlossen."
        print("Futures: " + e["hinweis"])
    try:
        if cfg["echtgeld"]:
            print("⚠️  ECHTGELD-MODUS: Aufträge gehen an dein echtes Binance-Futures-Konto.")
            r = c.rechte()
            if r.get("enableWithdrawals"):
                e["hinweis"] = "Schlüssel erlaubt Auszahlungen — aus Sicherheitsgründen keine Aufträge."
                print("Futures: " + e["hinweis"])
                protokolliere(e)
                return []
        if c.hedge_modus():
            e["hinweis"] = "Konto steht im Hedge-Modus. Der Pilot braucht den Einweg-Modus (Binance → Futures → Einstellungen)."
            print("Futures: " + e["hinweis"])
            protokolliere(e)
            return []
        sym = (symbol or cfg["symbol"]).upper()
        e["symbol"], e["gewicht"] = sym, gewicht
        regeln = c.regeln(sym)
        if regeln.get("status") not in (None, "TRADING"):
            e["hinweis"] = f"{sym} ist nicht handelbar."
            protokolliere(e)
            return []
        konto = c.konto()
        kapital = float(konto.get("totalWalletBalance", 0)) + float(konto.get("totalUnrealizedProfit", 0))
        menge = c.position(sym)
        mark, funding = c.markpreis(sym)
        e.update({"kapital": round(kapital, 2), "position": menge, "mark": mark, "funding_8h": funding})
        entscheid["kapital"] = round(kapital, 2)
        plan = plane(cfg, kapital, menge, mark, regeln, ziel, gewicht)
    except (urllib.error.URLError, KeyError, ValueError, StopIteration) as ex:
        code = getattr(ex, "code", None)
        e["hinweis"] = ("Binance sperrt deinen Standort (HTTP 451)." if code == 451 else "Schlüssel ungültig (HTTP 401)." if code == 401
                        else f"Binance lehnt ab (HTTP {code}): {getattr(ex, 'msg', '')}" if code else f"Binance nicht erreichbar: {type(ex).__name__}")
        print("Futures: " + e["hinweis"])
        protokolliere(e)
        return []
    for seite, m, red in plan:
        print(f"{'(trocken) ' if trocken else ''}{seite:4} {m} {sym} {'(nur verkleinern)' if red else ''} ≈ {m * mark:,.0f} USDT".replace(",", "'"))
        a = {"seite": seite, "menge": m, "reduce_only": red}
        if not trocken:
            try:
                if not any(x.get("id") for x in e["auftraege"]) and not red:
                    c.einrichten(sym, cfg["max_hebel"])
                antwort = c.auftrag(sym, seite, m, red)
                a["id"], a["status"] = (antwort or {}).get("orderId"), (antwort or {}).get("status")
            except BinanceFehler as ex:
                a["fehler"] = f"HTTP {ex.code}: {ex.msg}"
        e["auftraege"].append(a)
    if not plan:
        print("Futures: Position liegt im Zielbereich — keine Aufträge.")
    if not trocken:
        try:
            neu = c.position(sym)
            c.stops_loeschen(sym)
            if neu:
                preis = entscheid.get("stop_long") if neu > 0 else entscheid.get("stop_short")
                if preis:
                    preis = round(round(preis / regeln["tick"]) * regeln["tick"], 8)
                    c.stop(sym, "SELL" if neu > 0 else "BUY", preis)
                    e["stop"] = preis
                    print(f"Stop an der Börse: {preis:,.1f}".replace(",", "'"))
        except (urllib.error.URLError, KeyError, ValueError) as ex:
            e["hinweis"] += f" Stop nicht gesetzt: {getattr(ex, 'msg', type(ex).__name__)}"
            print("Futures: Stop nicht gesetzt — bitte im Konto prüfen!")
    protokolliere(e)
    return e["auftraege"]
