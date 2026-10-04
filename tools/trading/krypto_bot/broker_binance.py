#!/usr/bin/env python3
"""Broker-Anbindung Binance Spot — standardmässig im TESTNETZ (Spielgeld, testnet.binance.vision).

Sicherungen:
  • Ohne BINANCE_API_KEY + BINANCE_API_SECRET passiert nichts.
  • Testnetz ist Standard. Echtes Geld NUR, wenn BEIDES gesetzt ist:
        BINANCE_TESTNET=false   und   KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"
  • Echtgeld: Der Bot prüft vorher die Rechte des Schlüssels (/sapi/v1/account/apiRestrictions). Erlaubt der Schlüssel
    Auszahlungen (enableWithdrawals) oder Futures/Margin, handelt er NICHT. Einen Handels-Schlüssel braucht nie Auszahlungsrechte.
  • Nur Spot, nur Marktaufträge, kein Hebel, kein Leerverkauf. Höchstens KI_BOT_ANTEIL (Standard 0.5) des Kontowerts,
    je Auftrag höchstens KI_BOT_MAX_AUFTRAG (Standard 1000, in der Quote-Währung, z. B. USDT).
  • Not-Aus: KI_BOT_STOP=1 oder Datei tools/trading/ki_bot/STOP. Protokoll ohne Schlüssel in data/ki-bot-broker.json.
Handelspaar: BTC + KRYPTO_QUOTE (Standard USDT → BTCUSDT).
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
TESTNETZ_URL = "https://testnet.binance.vision"
ECHT_URL = "https://api.binance.com"
ECHTGELD_SATZ = "JA, MIT ECHTEM GELD"
MIN_AUFTRAG = 20.0


def einstellungen(env=None):
    env = os.environ if env is None else env
    echt = (env.get("BINANCE_TESTNET") or "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ
    quote = (env.get("KRYPTO_QUOTE") or "USDT").strip().upper()
    return {
        "key": env.get("BINANCE_API_KEY", ""), "secret": env.get("BINANCE_API_SECRET", ""),
        "basis": env.get("BINANCE_BASIS_URL") or (ECHT_URL if echt else TESTNETZ_URL),  # BINANCE_BASIS_URL nur für Tests
        "echtgeld": echt, "quote": quote, "symbol": "BTC" + quote,
        "anteil": max(0.0, min(1.0, float(env.get("KI_BOT_ANTEIL") or "0.5"))),
        "max_auftrag": max(0.0, float(env.get("KI_BOT_MAX_AUFTRAG") or "1000")),
        "stop": env.get("KI_BOT_STOP", "") == "1" or (HIER.parent / "ki_bot" / "STOP").exists(),
    }


class Binance:
    def __init__(self, cfg):
        self.cfg = cfg

    def _req(self, methode, pfad, params=None, signiert=False):
        params = dict(params or {})
        if signiert:
            params["timestamp"] = int(time.time() * 1000)
            params["recvWindow"] = 5000
        q = urllib.parse.urlencode(params)
        if signiert:
            q += "&signature=" + hmac.new(self.cfg["secret"].encode(), q.encode(), hashlib.sha256).hexdigest()
        url = self.cfg["basis"].rstrip("/") + pfad + ("?" + q if q else "")
        req = urllib.request.Request(url, method=methode, headers={"X-MBX-APIKEY": self.cfg["key"]})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode() or "null")

    def konto(self):
        return self._req("GET", "/api/v3/account", signiert=True)

    def rechte(self):
        return self._req("GET", "/sapi/v1/account/apiRestrictions", signiert=True)

    def kurs(self, symbol):
        return float(self._req("GET", "/api/v3/ticker/price", {"symbol": symbol})["price"])

    def regeln(self, symbol):
        info = self._req("GET", "/api/v3/exchangeInfo", {"symbol": symbol})["symbols"][0]
        f = {x["filterType"]: x for x in info["filters"]}
        lot = f.get("MARKET_LOT_SIZE") if float((f.get("MARKET_LOT_SIZE") or {}).get("stepSize", 0) or 0) > 0 else f.get("LOT_SIZE", {})
        notional = f.get("NOTIONAL") or f.get("MIN_NOTIONAL") or {}
        return {"step": float(lot.get("stepSize", "0.00001")), "min_qty": float(lot.get("minQty", "0")),
                "min_notional": float(notional.get("minNotional", "5")), "status": info.get("status")}

    def auftrag(self, symbol, seite, quote_betrag=None, menge=None):
        p = {"symbol": symbol, "side": seite.upper(), "type": "MARKET", "newOrderRespType": "RESULT"}
        if quote_betrag is not None:
            p["quoteOrderQty"] = f"{quote_betrag:.2f}"
        else:
            p["quantity"] = format_menge(menge)
        return self._req("POST", "/api/v3/order", p, signiert=True)


def format_menge(x):
    return f"{x:.8f}".rstrip("0").rstrip(".")


def bestand(konto, asset):
    for b in konto.get("balances", []):
        if b["asset"] == asset:
            return float(b["free"]), float(b["locked"])
    return 0.0, 0.0


def plane(cfg, konto, kurs, regeln, quote_ziel):
    """Reine Rechnung (ohne Netz, testbar): Ziel-Anteil BTC → höchstens ein Auftrag."""
    q_frei, q_gesperrt = bestand(konto, cfg["quote"])
    b_frei, b_gesperrt = bestand(konto, "BTC")
    ist = (b_frei + b_gesperrt) * kurs
    wert = q_frei + q_gesperrt + ist
    soll = wert * cfg["anteil"] * max(0.0, min(1.0, quote_ziel))
    diff = soll - ist
    mindest = max(MIN_AUFTRAG, regeln["min_notional"])
    if abs(diff) < mindest:
        return None
    if diff > 0:
        betrag = min(diff, cfg["max_auftrag"], q_frei)  # nie mehr als freies Geld: kein Hebel
        if betrag < mindest:
            return None
        return {"symbol": cfg["symbol"], "seite": "buy", "quote_betrag": round(betrag, 2), "ist": round(ist, 2), "soll": round(soll, 2)}
    menge = min(-diff, cfg["max_auftrag"]) / kurs
    menge = min(menge, b_frei)  # nie mehr verkaufen als frei vorhanden: kein Leerverkauf
    menge = math.floor(menge / regeln["step"] + 1e-9) * regeln["step"]
    if menge < regeln["min_qty"] or menge * kurs < mindest:
        return None
    return {"symbol": cfg["symbol"], "seite": "sell", "menge": round(menge, 8), "ca_betrag": round(menge * kurs, 2), "ist": round(ist, 2), "soll": round(soll, 2)}


def ausfuehren(entscheid, trocken=False, env=None, client=None, protokolliere=None):
    cfg = einstellungen(env)
    if protokolliere is None:
        import broker_alpaca as BA  # gemeinsames Protokoll data/ki-bot-broker.json
        protokolliere = BA._protokolliere
    e = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "broker": "binance",
         "modus": "ECHTGELD" if cfg["echtgeld"] else "testnetz", "strategie": "krypto:" + entscheid["strategie"],
         "trocken": trocken, "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"]:
        print("Binance: keine Schlüssel gesetzt — nichts zu tun.")
        return []
    if cfg["stop"]:
        e["hinweis"] = "Not-Aus aktiv — keine Aufträge."
        print("Binance: " + e["hinweis"])
        protokolliere(e)
        return []
    if cfg["echtgeld"]:
        print("⚠️  ECHTGELD-MODUS: Aufträge gehen an dein echtes Binance-Konto.")
    c = client or Binance(cfg)
    try:
        if cfg["echtgeld"]:
            r = c.rechte()
            if r.get("enableWithdrawals") or r.get("enableFutures") or r.get("enableMargin"):
                e["hinweis"] = "Schlüssel erlaubt Auszahlungen, Futures oder Margin — aus Sicherheitsgründen keine Aufträge. Neuen Schlüssel nur mit «Spot-Handel» anlegen."
                print("Binance: " + e["hinweis"])
                protokolliere(e)
                return []
        konto = c.konto()
        if not konto.get("canTrade", True):
            e["hinweis"] = "Konto darf nicht handeln — keine Aufträge."
            print("Binance: " + e["hinweis"])
            protokolliere(e)
            return []
        kurs, regeln = c.kurs(cfg["symbol"]), c.regeln(cfg["symbol"])
        if regeln.get("status") not in (None, "TRADING"):
            e["hinweis"] = f"{cfg['symbol']} ist nicht handelbar ({regeln.get('status')})."
            print("Binance: " + e["hinweis"])
            protokolliere(e)
            return []
        a = plane(cfg, konto, kurs, regeln, entscheid["quote"])
    except (urllib.error.URLError, KeyError, ValueError, IndexError) as ex:
        code = getattr(ex, "code", None)
        e["hinweis"] = ("Binance sperrt deinen Standort (HTTP 451) — in diesem Land/Netz ist Binance nicht nutzbar." if code == 451
                        else "Schlüssel ungültig oder falsch kopiert (HTTP 401)." if code == 401
                        else f"Binance nicht erreichbar oder Antwort unerwartet: {type(ex).__name__}" + (f" (HTTP {code})" if code else ""))
        print("Binance: " + e["hinweis"])
        protokolliere(e)
        return []
    if not a:
        print("Binance: Bitcoin-Anteil liegt im Zielbereich — keine Aufträge.")
        protokolliere(e)
        return []
    betrag = a.get("quote_betrag", a.get("ca_betrag"))
    print(f"{'(trocken) ' if trocken else ''}{a['seite']:4} {a['symbol']} ca. {betrag:.2f} {cfg['quote']} (ist {a['ist']:.2f} → soll {a['soll']:.2f})")
    if not trocken:
        try:
            antwort = c.auftrag(a["symbol"], a["seite"], quote_betrag=a.get("quote_betrag"), menge=a.get("menge"))
            a["id"], a["status"] = (antwort or {}).get("orderId"), (antwort or {}).get("status")
        except urllib.error.HTTPError as ex:
            a["fehler"] = f"HTTP {ex.code}"
    e["auftraege"].append(a)
    protokolliere(e)
    return [a]
