#!/usr/bin/env python3
"""Pilot 2.0 — Ausführung über Binance Spot UND USDⓈ-M Futures, in einem Konto NUR für Pilot 2.0.

Rechnung: pilot2_plan.py (Richtung long über Spot, short über Perpetual, freier Teil als Funding-Ernte, Pfand 110 %).
Einschalten: KRYPTO_PILOT2=an UND im Code FREIGEGEBEN = True (erst nach einer unabhängigen Prüfung ohne Blocker).

Grundsatz «Konto = Wahrheit»: Pilot 2.0 handelt nur in einem Konto, das ihm allein gehört — mit echtem Geld ein Binance-
UNTERKONTO nur für Pilot 2.0 (Schlüssel PILOT2_API_KEY/SECRET dieses Unterkontos), im Testnetz die Test-Konten (Spielgeld).
Alles, was darin liegt, gehört Pilot 2.0. Darum führt er KEIN eigenes Coin- oder USDT-Buch, das vom Konto abweichen könnte:
jeder Lauf liest den Kontostand, rechnet, handelt und setzt am Ende die Stops nach dem Kontostand.

Sicherungen:
  • Echtes Geld NUR, wenn ALLES gesetzt ist: BINANCE_TESTNET=false, BINANCE_FUTURES_TESTNET=false,
    KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD" und KRYPTO_PILOT2=an.
  • Start mit echtem Geld: Unterkonto bis auf USDT leer (keine BTC/ETH, keine offenen Aufträge, keine Futures-Positionen,
    kein Futures-Guthaben) und höchstens KRYPTO_PILOT2_KAPITAL USDT darin. Mehr als im Unterkonto liegt, kann er nicht verlieren.
  • Gebunden an DIESES Konto: die Binance-Konto-ID (UID) wird beim Start gemerkt. Andere oder fehlende UID → kein Auftrag,
    und der Not-Aus fasst ein fremdes Konto nie an.
  • Schlüssel-Rechte (echtes Geld): Auszahlung, Margin-Leihe und Überweisung an Dritte AUS; Spot- und Futures-Handel AN.
    «Universal Transfer» (zwischen Spot und Futures DIESES Kontos) ist erlaubt, aber nicht nötig — ohne ihn füllst du beide selbst.
  • Not-Aus (KI_BOT_STOP=1, Datei STOP, Cockpit, Telegram, stop.bat, Tagesaufgabe) hat Vorrang vor allem. Er schliesst jeden
    gestarteten Modus mit den Schlüsseln dieses Modus: erst das Perpetual (scheitert das, bleibt so viel Spot als Absicherung
    stehen, wie der Short gross ist), dann alle Aufträge auf BTC/ETH weg, alle BTC/ETH verkaufen, USDT zurück aufs Spot-Konto.
    «Alles zu» nur, wenn nachgeprüft — dann beginnt Pilot 2.0 beim nächsten Einschalten neu (mit Startprüfung).
  • Stops immer am Ende nach der TATSÄCHLICHEN Netto-Richtung (Spot-Coins + Perpetual): long → Spot-Stop (STOP_LOSS = Markt),
    short → Perp-Stop mit Menge + reduceOnly (nie closePosition — die Ernte-Absicherung trifft er nie). Eigene Stops tragen die
    Kennung p2s/p2a: vor einem neuen Stop sieht er nach, ob noch ein eigener offen ist (keine Doppel-Stops); verwaiste Stops
    (verlorene Antwort) löscht der nächste Lauf.
  • Unklare Antworten: der Markt ist für den Rest des Laufs gesperrt; die Stops richten sich nach dem Kontostand am Ende, und
    der nächste Lauf liest wieder den Kontostand — nichts muss nachträglich «verbucht» werden. Einen Ernte-Short mit unklarer
    Antwort rechnet er nie zurück: der Spot bleibt und bekommt als Long einen Stop.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_binance as BB  # noqa: E402
import broker_futures as BF  # noqa: E402
import pilot2_plan as PL  # noqa: E402

# Freigabe für den echten Bot. Bleibt False, bis eine unabhängige Prüfung KEINE Blocker mehr findet. Solange False, ist
# KRYPTO_PILOT2=an wirkungslos und der Pilot handelt wie bisher. Der Not-Aus für einen gestarteten Pilot 2.0 wirkt immer.
FREIGEGEBEN = False

ECHTGELD_SATZ = "JA, MIT ECHTEM GELD"
SPOT_TEST, SPOT_ECHT = "https://testnet.binance.vision", "https://api.binance.com"
FUT_TEST, FUT_ECHT = "https://testnet.binancefuture.com", "https://fapi.binance.com"
HOSTS_SPOT = {False: {"testnet.binance.vision", "127.0.0.1", "localhost"}, True: {"api.binance.com", "127.0.0.1", "localhost"}}
HOSTS_FUT = {False: {"testnet.binancefuture.com", "demo-fapi.binance.com", "127.0.0.1", "localhost"},
             True: {"fapi.binance.com", "127.0.0.1", "localhost"}}
COINS = {"BTC": ("BTCUSDT", "BTC"), "ETH": ("ETHUSDT", "ETH")}
PROTOKOLL = HIER.parents[2] / "data" / "krypto-pilot2-broker.json"
BESTAND = HIER.parents[2] / "data" / "krypto-pilot2-bestand.json"
STOP_LIMIT_ABSTAND = 0.05
PAUSE_DATEI = HIER.parent / "ki_bot" / "PAUSE"
STAUB_USDT = 5.0                # darunter gilt ein Bestand als leer
GEBUEHREN_RESERVE = 0.005       # 0,5 % des verwalteten Geldes bleiben für Gebühren frei
DECKEL_SPIELRAUM = 1.01         # Startprüfung: Kontowert höchstens 1 % über dem Deckel (Rundung beim Einzahlen)
NOT_STOP_ABSTAND = 0.05         # Ersatz-Stop, wenn kein gültiger Stop-Kurs da ist (5 % vom Kurs)
CID_STOP_SPOT, CID_STOP_PERP = "p2s", "p2a"   # Kennungs-Anfang eigener Stops → verwaiste Stops (verlorene Antwort) findet er wieder


class BuchKaputt(ValueError):
    """Buch-Datei vorhanden, aber unlesbar → nie überschreiben, nie «nichts offen» melden."""


def _kennung(anfang):
    return f"{anfang}{int(time.time() * 1000)}{random.randint(0, 999999):06d}"


def aktiv(env=None):
    env = os.environ if env is None else env
    return FREIGEGEBEN and (env.get("KRYPTO_PILOT2") or "").strip().lower() == "an"


def einstellungen(env=None, modus=None):
    """modus=None: aus den Schaltern. modus="echt"/"testnetz": erzwingen (für den Not-Aus eines gestarteten Modus)."""
    env = os.environ if env is None else env
    if modus is None:
        echt = ((env.get("BINANCE_TESTNET") or "true").strip().lower() == "false"
                and (env.get("BINANCE_FUTURES_TESTNET") or "true").strip().lower() == "false"
                and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ and aktiv(env))
    else:
        echt = modus == "echt"
    s_url, f_url = env.get("PILOT2_SPOT_URL"), env.get("PILOT2_FUTURES_URL")
    fehler = ""
    for url, erlaubt, name in ((s_url, HOSTS_SPOT, "Spot"), (f_url, HOSTS_FUT, "Futures")):
        if url and urllib.parse.urlparse(url).hostname not in erlaubt[echt]:
            fehler = f"{name}-Adresse passt nicht zum Modus {'Echtgeld' if echt else 'Testnetz'} — aus Sicherheit keine Aufträge."
    if fehler:  # eine falsche Adresse darf nie auf einen anderen Modus umschalten → offizielle Adresse dieses Modus
        s_url = s_url if s_url and urllib.parse.urlparse(s_url).hostname in HOSTS_SPOT[echt] else None
        f_url = f_url if f_url and urllib.parse.urlparse(f_url).hostname in HOSTS_FUT[echt] else None
    if echt:
        sk, ss = env.get("PILOT2_API_KEY", ""), env.get("PILOT2_API_SECRET", "")
        fk, fs = sk, ss
    else:
        sk, ss = env.get("BINANCE_API_KEY", ""), env.get("BINANCE_API_SECRET", "")
        fk, fs = env.get("BINANCE_FUTURES_API_KEY", ""), env.get("BINANCE_FUTURES_API_SECRET", "")
    zahl = lambda n, d: BF.env_zahl(env, n, d)  # noqa: E731
    return {"echtgeld": echt, "fehler": fehler, "modus": "echt" if echt else "testnetz",
            "spot": {"key": sk, "secret": ss, "basis": s_url or (SPOT_ECHT if echt else SPOT_TEST)},
            "futures": {"key": fk, "secret": fs, "basis": f_url or (FUT_ECHT if echt else FUT_TEST), "spot": s_url or SPOT_ECHT},
            # Anteil des Pilot-Kontos, den Pilot 2.0 einsetzt (das Konto gehört ihm allein → Standard 100 %)
            "anteil": max(0.0, min(1.0, zahl("PILOT2_ANTEIL", 1.0))), "max_auftrag": max(0.0, zahl("KI_BOT_MAX_AUFTRAG", 1000)),
            "stop": env.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists(),
            "pause": PAUSE_DATEI.exists(),
            "deckel": zahl("KRYPTO_PILOT2_KAPITAL", 0.0 if echt else 10000.0),
            "konflikte": konflikte(env)}


def konflikte(env):
    """Andere Bots im selben Binance-Konto → Pilot 2.0 würde deren Coins/Positionen mitbewegen."""
    out = []
    if (env.get("KRYPTO_BROKER") or "").strip().lower() == "binance":
        out.append("Bitcoin-Spot-Bot (KRYPTO_BROKER=binance)")
    if (env.get("ETH_SPARPLAN_BETRAG") or "").strip():
        out.append("ETH-Sparplan (ETH_SPARPLAN_BETRAG)")
    if (env.get("CALLS_MODUS") or "schatten").strip().lower() in ("testnetz", "echtgeld"):
        out.append("kopierte Telegram-Calls (CALLS_MODUS)")
    return out


# ───────────────────────── Buch (nur Start, Konto-ID, Stop-Kennungen — kein Coin- oder USDT-Buch) ─────────────────────────
def leer_buch():
    return {"start": None, "uid": None, "stops": {}, "perp_offen": False}


def _datei(datei):
    """Ganze Buch-Datei. Fehlt sie: {}. Ist sie unlesbar: BuchKaputt (nie still als leer behandeln)."""
    p = Path(datei)
    if not p.exists():
        return {}
    try:
        alles = json.loads(p.read_text())
    except (OSError, ValueError) as ex:
        raise BuchKaputt(f"Pilot-2.0-Buch {p.name} unlesbar ({type(ex).__name__})") from ex
    if not isinstance(alles, dict):
        raise BuchKaputt(f"Pilot-2.0-Buch {p.name} hat ein falsches Format")
    return alles


def buch_lesen(datei, modus):
    b = _datei(datei).get(modus) or {}
    out = leer_buch()
    out.update({k: v for k, v in b.items() if k in out})
    out["stops"] = {k: dict(v or {}) for k, v in (out["stops"] or {}).items()}
    return out


def buch_schreiben(datei, modus, buch):
    alt = _datei(datei)  # unlesbar → Abbruch statt den anderen Modus zu überschreiben
    alt[modus] = buch
    Path(datei).parent.mkdir(exist_ok=True)
    tmp = Path(str(datei) + ".neu")
    tmp.write_text(json.dumps(alt, indent=1))
    tmp.replace(datei)  # nie halb geschrieben


def _gestartet(b):
    return bool(b.get("start")) or bool(b.get("perp_offen"))


def modi_mit_bestand(datei=None):
    """Modi, in denen Pilot 2.0 gestartet ist (sein Konto gehört ihm, bis ein Not-Aus alles geschlossen hat)."""
    alles = _datei(datei or BESTAND)
    return [m for m, b in alles.items() if isinstance(b, dict) and _gestartet(b)]


def hat_bestand(datei=None):
    """Ist Pilot 2.0 (in irgendeinem Modus) gestartet und noch nicht per Not-Aus geschlossen?
    Unlesbares Buch zählt als «ja» (der alte Pilot darf dann nicht handeln)."""
    try:
        return bool(modi_mit_bestand(datei))
    except BuchKaputt:
        return True


def bestand(konto, asset):
    for b in konto.get("balances", []):
        if b["asset"] == asset:
            return float(b.get("free", 0) or 0), float(b.get("locked", 0) or 0)
    return 0.0, 0.0


def netto_coins(r, coin):
    """Spot-Antwort → Coins netto (nach Gebühr in Coins, falls die Antwort fills enthält)."""
    menge = float(r.get("executedQty") or 0)
    geb = sum(float(f.get("commission") or 0) for f in r.get("fills") or [] if f.get("commissionAsset") == coin)
    return -menge - geb if r.get("side") == "SELL" else menge - geb


# ───────────────────────── Anschlüsse ─────────────────────────
class Spot(BB.Binance):
    def markt(self, symbol, seite, menge, cid=None):
        cid = cid or f"p2{int(time.time() * 1000)}{random.randint(0, 999999):06d}"
        p = {"symbol": symbol, "side": seite, "type": "MARKET", "quantity": BB.format_menge(menge),
             "newOrderRespType": "FULL", "newClientOrderId": cid}
        try:
            return {**(self._req("POST", "/api/v3/order", p, signiert=True) or {}), "side": seite}
        except (BB.BinanceFehler, *BF.NETZFEHLER) as ex:
            if isinstance(ex, BB.BinanceFehler) and ex.code < 500 and ex.code != 408:
                raise
            for warte in BF.NACHFRAGE_WARTEN:
                time.sleep(warte)
                try:
                    o = self.auftrag_lesen(symbol, cid=cid)
                except (BB.BinanceFehler, *BF.NETZFEHLER):
                    continue
                if o.get("status") in ("FILLED", "PARTIALLY_FILLED"):
                    return {**o, "side": seite, "nachgefragt": True}
                if o.get("status") in ("CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
                    raise ex
            raise BF.UnklarFehler(f"Spot-Status unklar ({cid})") from ex

    def auftrag_lesen(self, symbol, order_id=None, cid=None):
        p = {"symbol": symbol}
        p.update({"orderId": order_id} if order_id is not None else {"origClientOrderId": cid})
        return self._req("GET", "/api/v3/order", p, signiert=True) or {}

    def offene(self, symbol):
        return self._req("GET", "/api/v3/openOrders", {"symbol": symbol}, signiert=True) or []

    def abbrechen(self, symbol, order_id):
        try:
            self._req("DELETE", "/api/v3/order", {"symbol": symbol, "orderId": order_id}, signiert=True)
        except BB.BinanceFehler as ex:
            if "-2011" not in str(ex.msg):  # «Unknown order» = schon weg (ausgelöst oder storniert)
                raise

    def stop_verkauf(self, symbol, menge, stop, regeln):
        stop_p = PL.runde(stop, regeln["tick"])
        p = {"symbol": symbol, "side": "SELL", "quantity": BB.format_menge(menge), "stopPrice": BB.format_menge(stop_p),
             "newOrderRespType": "ACK", "newClientOrderId": _kennung(CID_STOP_SPOT)}
        if "STOP_LOSS" in regeln.get("typen", ()):
            p["type"] = "STOP_LOSS"  # beim Auslösen ein Marktauftrag (wie im Backtest)
        else:
            p.update({"type": "STOP_LOSS_LIMIT", "timeInForce": "GTC",
                      "price": BB.format_menge(PL.runde(stop * (1 - STOP_LIMIT_ABSTAND), regeln["tick"]))})
        return self._req("POST", "/api/v3/order", p, signiert=True)

    def verschieben(self, richtung, betrag):
        typ = {"SPOT_ZU_FUTURES": "MAIN_UMFUTURE", "FUTURES_ZU_SPOT": "UMFUTURE_MAIN"}[richtung]
        return self._req("POST", "/sapi/v1/asset/transfer", {"type": typ, "asset": "USDT", "amount": f"{betrag:.2f}"}, signiert=True)

    def regeln2(self, symbol):
        info = self._req("GET", "/api/v3/exchangeInfo", {"symbol": symbol})["symbols"][0]
        f = {x["filterType"]: x for x in info["filters"]}
        lot = f.get("LOT_SIZE", {})
        notional = f.get("NOTIONAL") or f.get("MIN_NOTIONAL") or {}
        return {"step": float(lot.get("stepSize", "0.00001")), "tick": float(f.get("PRICE_FILTER", {}).get("tickSize", "0.01")),
                "min_notional": float(notional.get("minNotional", "5")), "typen": tuple(info.get("orderTypes") or ())}


class Fut(BF.Futures):
    def stop_menge(self, symbol, seite, menge, preis, tick):
        """Stop NUR für den Richtungsteil: Menge + reduceOnly (nicht closePosition — sonst fiele die Ernte-Absicherung weg)."""
        return self._req("POST", "/fapi/v1/algoOrder", {"algoType": "CONDITIONAL", "symbol": symbol, "side": seite, "type": "STOP_MARKET",
                                                        "quantity": BF.fmt(menge), "triggerPrice": BF.fmt(PL.runde(preis, tick)),
                                                        "reduceOnly": "true", "workingType": "MARK_PRICE", "priceProtect": "true",
                                                        "clientAlgoId": _kennung(CID_STOP_PERP)},
                         signiert=True)

    def einrichten(self, symbol, hebel):
        """Pilot 2.0: CROSS-Marge (eigenes Konto). Bei ISOLATED wäre das Pfand beim Eröffnen fix — der 10-%-Puffer im
        Futures-Konto schützte den Ernte-Short dann nicht vor der Zwangsschliessung bei rund +100 %."""
        try:
            self._req("POST", "/fapi/v1/marginType", {"symbol": symbol, "marginType": "CROSSED"}, signiert=True)
        except BF.BinanceFehler as ex:
            if "-4046" not in str(ex.msg):  # schon CROSSED; −4048 (offene Position) → Fehler → kein Short
                raise
        self._req("POST", "/fapi/v1/leverage", {"symbol": symbol, "leverage": max(1, int(hebel))}, signiert=True)

    def offene_algos(self, symbol):
        return [o for o in (self._req("GET", "/fapi/v1/openAlgoOrders", {"symbol": symbol}, signiert=True) or []) if isinstance(o, dict)]

    def algo_abbrechen(self, symbol, algo_id):
        """Storno; bei einer Fehlermeldung nachsehen, ob der Auftrag noch offen ist (Fehlercodes sind nicht dokumentiert)."""
        try:
            self._req("DELETE", "/fapi/v1/algoOrder", {"algoId": algo_id}, signiert=True)
        except (BF.BinanceFehler, *BF.NETZFEHLER):
            if any(str(o.get("algoId")) == str(algo_id) for o in self.offene_algos(symbol)):
                raise

    def alle_abbrechen(self, symbol):
        """Not-Aus: ALLE Futures-Aufträge auf dem Symbol weg (normale und bedingte) — das Konto gehört Pilot 2.0."""
        for a in self.offene_algos(symbol):
            self.algo_abbrechen(symbol, a.get("algoId"))
        if self.offene_auftraege(symbol):
            self._req("DELETE", "/fapi/v1/allOpenOrders", {"symbol": symbol}, signiert=True)

    def position_info(self, symbol):
        for p in self._req("GET", "/fapi/v2/positionRisk", {"symbol": symbol}, signiert=True) or []:
            if p.get("symbol") == symbol:
                return float(p.get("positionAmt", 0) or 0), float(p.get("leverage", 1) or 1)
        return 0.0, 1.0

    def offene_auftraege(self, symbol):
        return self._req("GET", "/fapi/v1/openOrders", {"symbol": symbol}, signiert=True) or []


def rechte_ok(r):
    """Echtgeld-Schlüssel: Auszahlung/Margin/Überweisung an Dritte AUS; Spot und Futures AN. → (ok, verboten, fehlt, transfer)"""
    verboten = [k for k in ("enableWithdrawals", "enableMargin", "enableInternalTransfer") if r.get(k)]
    fehlt = [k for k in ("enableSpotAndMarginTrading", "enableFutures") if not r.get(k)]
    return not verboten and not fehlt, verboten, fehlt, bool(r.get("permitsUniversalTransfer"))


def kontowert(spot, fut, konto=None):
    """Wert des ganzen Pilot-Kontos in USDT: Spot-USDT + BTC/ETH + Futures-Saldo + offene Futures-Gewinne."""
    konto = konto or spot.konto()
    kf = fut.konto()
    wert = sum(bestand(konto, "USDT"))
    for sym, coin in COINS.values():
        menge = sum(bestand(konto, coin))
        if menge:
            wert += menge * spot.kurs(sym)
    return wert + float(kf.get("totalWalletBalance", 0) or 0) + float(kf.get("totalUnrealizedProfit", 0) or 0)


def startpruefung(spot, fut, cfg, konto):
    """Vor dem ersten Lauf: Echtgeld → Unterkonto bis auf USDT leer und nicht mehr wert als der Deckel; Testnetz → keine
    alten Positionen/Aufträge. → Liste der Gründe, warum nicht (leer = ok)."""
    gruende = []
    for m, (sym, coin) in COINS.items():
        menge = sum(bestand(konto, coin))
        if cfg["echtgeld"] and menge * spot.kurs(sym) >= STAUB_USDT:
            gruende.append(f"{menge:g} {coin} im Spot-Konto")
        if cfg["echtgeld"] and spot.offene(sym):
            gruende.append(f"offene Spot-Aufträge {sym}")
        if fut.position_info(sym)[0]:
            gruende.append(f"Futures-Position {sym}")
        if fut.offene_algos(sym) or fut.offene_auftraege(sym):
            gruende.append(f"offene Futures-Aufträge {sym}")
    if cfg["echtgeld"]:
        if float(fut.konto().get("totalWalletBalance", 0) or 0) > 1:
            gruende.append("Guthaben im Futures-Konto (Pilot 2.0 verschiebt sein Pfand selbst bzw. du füllst es nach dem Start)")
        usdt = sum(bestand(konto, "USDT"))
        if usdt > cfg["deckel"] * DECKEL_SPIELRAUM:
            gruende.append(f"{usdt:.2f} USDT im Pilot-Konto, mehr als der Deckel KRYPTO_PILOT2_KAPITAL={cfg['deckel']:.0f} — ins "
                           "Unterkonto nur so viel legen, wie Pilot 2.0 höchstens verwalten (und verlieren) darf")
    return gruende


# ───────────────────────── Ausführung ─────────────────────────
def ausfuehren(ents, trocken=False, env=None, spot=None, fut=None, protokolliere=None, bestand_datei=None, notaus=False):
    """ents: Pilot-Entscheide [{markt, hebel, stop_long, stop_short, stand}]. notaus=True erzwingt den Not-Aus.
    → {zeilen, auftraege, warnung, kapital, plan, modus, alles_zu}"""
    env_ = os.environ if env is None else env
    datei = bestand_datei or BESTAND
    cfg = einstellungen(env_)
    if notaus or cfg["stop"]:
        return notaus_alle(env_, datei, trocken=trocken, spot=spot, fut=fut, protokolliere=protokolliere)
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": cfg["modus"], "alles_zu": None}

    def warn(t):
        erg["warnung"] = True
        erg["zeilen"].append("⚠️ " + t)
    if cfg["fehler"]:
        warn(cfg["fehler"])
        return erg
    if not (cfg["spot"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["key"] and cfg["futures"]["secret"]):
        erg["zeilen"].append("Pilot 2.0: keine Schlüssel — nichts gehandelt.")
        return erg
    if cfg["pause"] and not trocken:
        erg["zeilen"].append("Pilot 2.0: Pause (Auto-Handel aus) — nichts gehandelt.")
        return erg
    if cfg["konflikte"]:
        warn("Pilot 2.0 braucht das Binance-Konto für sich allein. Aktiv sind auch: " + ", ".join(cfg["konflikte"]) + " — kein Auftrag.")
        return erg
    if cfg["deckel"] <= 0:
        warn("KRYPTO_PILOT2_KAPITAL fehlt: Für echtes Geld musst du festlegen, wie viele USDT Pilot 2.0 höchstens verwaltet — kein Auftrag.")
        return erg
    spot = spot or Spot(cfg["spot"])
    fut = fut or Fut(cfg["futures"])
    try:
        buch = buch_lesen(datei, cfg["modus"])
    except BuchKaputt as ex:
        warn(f"{ex} — kein Auftrag. Datei prüfen/wiederherstellen; der Not-Aus meldet den Kontostand.")
        return erg

    def speichern():
        try:
            buch_schreiben(datei, cfg["modus"], buch)
        except (OSError, BuchKaputt) as ex:  # Aufträge sind trotzdem gültig; verwaiste Stops findet der nächste Lauf an der Kennung
            warn(f"Buch nicht gespeichert ({type(ex).__name__}) — der nächste Lauf liest wieder den Kontostand.")

    transfer_ok = False
    try:
        konto_s = spot.konto()
        if cfg["echtgeld"]:
            ok, verboten, fehlt, transfer_ok = rechte_ok(spot.rechte())
            if not ok:
                warn(f"Schlüssel-Rechte falsch — kein Auftrag. Ausschalten: {', '.join(verboten) or '–'}; einschalten: {', '.join(fehlt) or '–'}.")
                return erg
            if fut.hedge_modus():
                warn("Futures-Konto steht im Hedge-Modus — Pilot 2.0 braucht den Einweg-Modus. Kein Auftrag.")
                return erg
            uid = konto_s.get("uid")
            if not uid:
                warn("Binance meldet keine Konto-ID (UID) — ohne sie ist nicht sicher, dass Pilot 2.0 im richtigen Konto handelt. Kein Auftrag.")
                return erg
            if buch["start"] and str(uid) != str(buch["uid"]):
                warn(f"PILOT2_API_KEY zeigt auf ein ANDERES Binance-Konto (UID {uid}) als beim Start ({buch['uid']}) — kein Auftrag. "
                     "Den Schlüssel des Pilot-Unterkontos setzen; erst danach greift auch der Not-Aus wieder.")
                return erg
        if not buch["start"]:
            gruende = startpruefung(spot, fut, cfg, konto_s)
            if gruende:
                warn("Pilot 2.0 braucht ein Konto nur für sich — beim Start bis auf USDT leer. Gefunden: " + "; ".join(gruende)
                     + ". Kein Auftrag.")
                return erg
    except Exception as ex:  # noqa: BLE001
        warn(f"Konto nicht lesbar ({type(ex).__name__} {str(ex)[:100]}) — kein Auftrag, nächster Lauf versucht es wieder.")
        return erg

    gesperrt = set()
    ents = [dict(e) for e in ents if e["markt"] in COINS]
    gewaehlt = {e["markt"] for e in ents}
    for m, (sym, coin) in COINS.items():
        if m not in gewaehlt and (sum(bestand(konto_s, coin)) * spot.kurs(sym) >= STAUB_USDT or fut.position_info(sym)[0] != 0):
            ents.append({"markt": m, "hebel": 0.0, "abgewaehlt": True})
            erg["zeilen"].append(f"{m} ist abgewählt — Bestand wird abgebaut.")
    if not ents:
        return erg

    daten = {}
    for e in ents:
        sym, coin = COINS[e["markt"]]
        pos, hebel_ist = fut.position_info(sym)
        daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": sum(bestand(konto_s, coin)), "perp": pos, "hebel_ist": hebel_ist,
                             "kurs": spot.kurs(sym), "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
    kapital = kontowert(spot, fut, konto_s)
    erg["kapital"] = round(kapital, 2)
    if not buch["start"]:
        if not trocken:  # ein Probelauf verbraucht die Startprüfung nicht
            buch["start"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            buch["uid"] = konto_s.get("uid") if cfg["echtgeld"] else None
            speichern()
        erg["zeilen"].append(f"Pilot 2.0 {'würde starten' if trocken else 'gestartet'}: Kontowert {kapital:.2f} USDT "
                             f"(Deckel {cfg['deckel']:.0f}).")
    verwaltet = min(kapital * cfg["anteil"], cfg["deckel"]) * (1 - GEBUEHREN_RESERVE)
    n_aktiv = max(1, len([e for e in ents if not e.get("abgewaehlt")]))
    basis_g = verwaltet / n_aktiv

    plaene = {}
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        z = 0.0 if e.get("abgewaehlt") else max(-1.0, min(1.0, float(e.get("hebel") or 0)))
        if z > 0 and not e.get("stop_long"):
            warn(f"{k}: kein Stop-Kurs für long — Richtung heute 0.")
            z = 0.0
        if z < 0 and not e.get("stop_short"):
            warn(f"{k}: kein Stop-Kurs für short — Richtung heute 0.")
            z = 0.0
        if z > 0 and d["kurs"] <= e["stop_long"]:
            erg["zeilen"].append(f"{k}: Kurs schon unter dem Stop — kein Long heute.")
            z = 0.0
        if z < 0 and d["kurs"] >= e["stop_short"]:
            erg["zeilen"].append(f"{k}: Kurs schon über dem Stop — kein Short heute.")
            z = 0.0
        e["z"] = z
        regeln = {"spot_step": d["rs"]["step"], "perp_step": d["rf"]["step"], "spot_min": d["rs"]["min_notional"], "perp_min": d["rf"]["min_notional"]}
        plaene[k] = PL.plane(k, z, 0.0 if e.get("abgewaehlt") else basis_g, d["kurs"], d["spot"], d["perp"], regeln, cfg["max_auftrag"])
        if e.get("abgewaehlt"):
            plaene[k] = {"schritte": ([("perp", "BUY" if d["perp"] < 0 else "SELL", abs(d["perp"]), True)] if d["perp"] else [])
                         + ([("spot", "SELL", PL.runde(d["spot"], d["rs"]["step"]), False)] if d["spot"] * d["kurs"] >= d["rs"]["min_notional"] else []),
                         "pfand": 0.0, "stop_spot": 0.0, "stop_perp": 0.0}
        if d["perp"] and d["hebel_ist"] > 1 and any(s[0] == "perp" and not s[3] for s in plaene[k]["schritte"]):
            warn(f"{k}: Futures-Hebel steht auf {d['hebel_ist']:g} (offene Position) — kein neuer Short, bis er 1 ist.")
            gesperrt.add(k)
    erg["plan"] = {k: {"schritte": p["schritte"], "stop_spot": p["stop_spot"], "stop_perp": p["stop_perp"]} for k, p in plaene.items()}
    pfand = sum(p["pfand"] for p in plaene.values())
    if trocken:
        erg["zeilen"] += [f"{k}: " + (", ".join(f"{a} {s} {m:g}" for a, s, m, _ in p["schritte"]) or "nichts") for k, p in plaene.items()]
        erg["zeilen"].append(f"Pilot-Konto {kapital:.2f} USDT, verwaltet {verwaltet:.2f}, Pfand-Ziel {pfand:.2f}")
        return erg

    def notaus_neu():
        return env_.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists()

    def schritt(k, konto, seite, menge, reduce):
        """→ ausgeführte Menge (0.0 = nichts), None = sicher NICHT ausgeführt (abgelehnt), "unklar" = Status unbekannt."""
        d = daten[k]
        if konto == "spot" and seite == "BUY":  # nie mehr kaufen, als freies USDT im Konto liegt
            usdt_frei = bestand(spot.konto(), "USDT")[0]
            leistbar = PL.runde(usdt_frei / (d["kurs"] * 1.003), d["rs"]["step"])
            if leistbar < menge:
                warn(f"{k}: freies USDT reicht nur für {leistbar:g} statt {menge:g} {d['coin']} — weniger gekauft.")
                menge = leistbar
            if menge * d["kurs"] < d["rs"]["min_notional"]:
                return 0.0
        try:
            if konto == "spot":
                r = spot.markt(d["sym"], seite, menge)
                gemacht = abs(netto_coins(r, d["coin"]))
            else:
                pos_vor = fut.position_info(d["sym"])[0]
                if not buch["perp_offen"]:
                    buch["perp_offen"] = True
                    speichern()
                try:
                    fut.auftrag(d["sym"], seite, menge, reduce)
                except BF.UnklarFehler:  # Position nachlesen statt raten
                    try:
                        nach = fut.position_info(d["sym"])[0]
                    except Exception:  # noqa: BLE001
                        nach = None
                    erwartet = pos_vor + (menge if seite == "BUY" else -menge)
                    if nach is None or abs(nach - erwartet) > 1e-9:
                        gesperrt.add(k)
                        warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt es (noch) nicht — Markt gesperrt, "
                             "nichts zurückgerechnet; Stops nach dem Kontostand.")
                        return "unklar"
                    warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt AUSGEFÜHRT.")
                gemacht = menge
            erg["auftraege"].append((k, konto, seite, menge))
            return gemacht
        except BF.UnklarFehler:
            gesperrt.add(k)
            warn(f"{k} Spot {seite} {menge:g}: Status unklar — Markt für diesen Lauf gesperrt, Stops nach dem Kontostand.")
            return "unklar"
        except Exception as ex:  # noqa: BLE001
            gesperrt.add(k)
            warn(f"{k} {konto} {seite} {menge:g} abgelehnt: {type(ex).__name__} {str(ex)[:120]}")
        return None

    try:
        # 1) eigene alte Stops weg (gespeicherte IDs + alle mit eigener Kennung). Scheitert das: Markt heute gesperrt
        for k in plaene:
            try:
                _stops_weg(spot, fut, buch, k, daten[k]["sym"])
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: alter Stop nicht (ganz) gelöscht ({type(ex).__name__}) — heute keine Änderung; die Stops werden am Ende"
                     " nach dem Kontostand geprüft.")
                gesperrt.add(k)
        speichern()
        # 2) verkleinern
        for k, p in plaene.items():
            for konto, seite, m, red in p["schritte"]:
                if k in gesperrt or notaus_neu():
                    break
                if red or (konto == "spot" and seite == "SELL"):
                    schritt(k, konto, seite, m, red)
        # 3) Geld zwischen Spot und Futures verschieben (nur echt und nur mit «Universal Transfer»). Danach zählt wieder nur
        #    der Kontostand — auch wenn die Antwort verloren ging.
        usdt_frei = bestand(spot.konto(), "USDT")[0]
        konto_f = fut.konto()
        f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0)
        f_abziehbar = float(konto_f.get("maxWithdrawAmount", f_saldo) or 0)
        bedarf = sum(m * daten[k]["kurs"] * 1.003 for k, p in plaene.items() if k not in gesperrt
                     for konto, seite, m, _ in p["schritte"] if konto == "spot" and seite == "BUY")
        uw = PL.verschieben(pfand, f_saldo, f_abziehbar, usdt_frei, bedarf)
        if uw and cfg["echtgeld"] and transfer_ok and not notaus_neu():
            try:
                spot.verschieben(*uw)
                erg["auftraege"].append(("konto", uw[0], uw[1]))
            except Exception as ex:  # noqa: BLE001
                warn(f"Verschieben {uw[0]} {uw[1]:.2f} USDT: {type(ex).__name__} — weiter mit dem tatsächlichen Kontostand.")
        elif uw and cfg["echtgeld"]:
            erg["zeilen"].append(f"Ohne «Universal Transfer»: bitte {uw[1]:.2f} USDT von Hand "
                                 f"{'ins Futures-Konto' if uw[0] == 'SPOT_ZU_FUTURES' else 'ins Spot-Konto'} des Pilot-Unterkontos verschieben.")
        elif uw:
            erg["zeilen"].append(f"Testnetz: kein Verschieben möglich ({uw[0]} {uw[1]:.2f} USDT wäre nötig) — beide Test-Konten mit USDT füllen.")
        # 4) vergrössern: Spot, dann Short; wird der Short einer neuen Ernte sicher abgelehnt → Ernte-Spot zurückverkaufen
        for k, p in plaene.items():
            if k in gesperrt or notaus_neu():
                continue
            d = daten[k]
            kaeufe = [s for s in p["schritte"] if s[0] == "spot" and s[1] == "BUY"]
            shorts = [s for s in p["schritte"] if s[0] == "perp" and s[1] == "SELL" and not s[3]]
            if shorts:
                try:
                    fut.einrichten(d["sym"], 1)
                    verfuegbar = float(fut.konto().get("availableBalance", 0) or 0)
                except Exception as ex:  # noqa: BLE001
                    warn(f"{k}: Futures-Vorbereitung gescheitert ({type(ex).__name__}) — kein Short, keine neue Ernte.")
                    continue
                noetig = shorts[0][2] * d["kurs"] * (1 + PL.PUFFER_SHORT)
                if verfuegbar < noetig:
                    warn(f"{k}: Futures-Konto hat {verfuegbar:.2f} USDT frei, Short braucht {noetig:.2f} — kein Short, keine neue Ernte.")
                    richtung_ist = sum(bestand(spot.konto(), d["coin"])) + fut.position_info(d["sym"])[0]
                    rest = max(0.0, p["stop_spot"] - max(0.0, richtung_ist))
                    kaeufe = [("spot", "BUY", PL.runde(rest, d["rs"]["step"]), False)] if rest * d["kurs"] >= d["rs"]["min_notional"] else []
                    shorts = []
            gekauft, geplant = 0.0, sum(s[2] for s in kaeufe)
            for konto, seite, m, red in kaeufe:
                if k in gesperrt or notaus_neu():
                    break
                r = schritt(k, konto, seite, m, red)
                gekauft += r if isinstance(r, float) else 0.0
            if k in gesperrt:
                continue  # unklarer oder abgelehnter Kauf: kein Short dazu; die Stops am Ende richten sich nach dem Kontostand
            fehlt = max(0.0, geplant - gekauft)  # gekürzter/ausgelassener Kauf (Gebühr in Coins zählt nicht als Fehlbetrag)
            if fehlt > geplant * 0.002 + d["rs"]["step"]:
                neu = []
                for konto, seite, m, red in shorts:  # Short um denselben Betrag kürzen → Netto-Richtung wie geplant
                    m2 = PL.runde(max(0.0, m - fehlt), d["rf"]["step"])
                    if m2 > 0 and m2 * d["kurs"] >= d["rf"]["min_notional"]:
                        neu.append((konto, seite, m2, red))
                    else:
                        warn(f"{k}: Kauf gekürzt — Short entfällt (unter dem Futures-Minimum).")
                        if gekauft > 0:  # ungesicherte Ernte-Coins zurück
                            neu.append(("rueck", "SELL", 0.0, False))
                shorts = neu
            for konto, seite, m, red in shorts:
                if k in gesperrt or notaus_neu():
                    break
                r = None if konto == "rueck" else schritt(k, konto, seite, m, red)
                if r is None and gekauft > 0:  # sicher NICHT ausgeführt → Ernte-Spot zurück
                    frei_ist = bestand(spot.konto(), d["coin"])[0]
                    zurueck = PL.runde(min(gekauft, m if m else gekauft, frei_ist), d["rs"]["step"])
                    if zurueck * d["kurs"] >= d["rs"]["min_notional"]:
                        gesperrt.discard(k)
                        if isinstance(schritt(k, "spot", "SELL", zurueck, False), float):
                            erg["zeilen"].append(f"{k}: Ernte-Short abgelehnt → {zurueck:g} {d['coin']} zurückverkauft.")
                        gesperrt.add(k)
    finally:
        _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn)
    try:
        buch["perp_offen"] = any(fut.position_info(COINS[m][0])[0] != 0 for m in COINS)
        speichern()
    except Exception:  # noqa: BLE001
        pass
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


def _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn):
    """Stops aus dem Kontostand und der tatsächlichen Netto-Richtung (Spot-Coins + Perpetual): long → Spot-Stop über
    min(Netto, Coins); short → Perp-Stop über Short minus (abgerundete) Absicherung. Je Seite zuerst nachsehen, ob noch ein
    EIGENER Stop offen ist (Löschen gescheitert): dann kein zweiter. Nicht prüfbar → laute Warnung, kein Stop."""
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        try:
            frei, gebunden = bestand(spot.konto(), d["coin"])
            mein = frei + gebunden
            pos, _ = fut.position_info(d["sym"])
            netto = mein + pos
            z = e.get("z", 0)
            st = buch["stops"].setdefault(k, {})
            ungesichert = abs(netto) * d["kurs"] >= STAUB_USDT
            stop_spot = PL.runde(min(max(0.0, netto), mein), d["rs"]["step"]) if netto > 0 and ungesichert else 0.0  # gewollt
            short = abs(min(pos, 0.0))
            short_teil = short - min(mein, short)
            # Absicherung abrunden, NICHT den Stop: sonst bliebe bis zu ein Futures-Schritt Short ohne Stop.
            # Unter einem halben Futures-Schritt kein Perp-Stop (er würde sonst einen ganzen Schritt der Ernte schliessen).
            stop_perp = (max(0.0, short - PL.runde(min(mein, short), d["rf"]["step"]))
                         if short_teil >= 0.5 * d["rf"]["step"] and short_teil * d["kurs"] >= STAUB_USDT else 0.0)
            p_long = _stop_preis(e.get("stop_long"), st.get("p_long"), d["kurs"], +1)
            p_short = _stop_preis(e.get("stop_short"), st.get("p_short"), d["kurs"], -1)
            gesetzt, schutz = [], []
            if stop_spot > 0 and stop_spot * p_long >= d["rs"]["min_notional"]:
                try:
                    alt = [o for o in spot.offene(d["sym"]) if str(o.get("clientOrderId") or "").startswith(CID_STOP_SPOT)]
                except Exception as ex:  # noqa: BLE001
                    alt = None
                    warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — Long läuft OHNE neuen Stop, bitte prüfen!")
                if alt:
                    st["spot"] = alt[0].get("orderId")
                    schutz.append("alter Spot-Stop")
                    warn(f"{k}: alter Spot-Stop ist noch offen (Löschen gescheitert) — kein zweiter gesetzt.")
                elif alt is not None:
                    menge = PL.runde(min(stop_spot, frei), d["rs"]["step"])  # gesperrte Coins kann kein zweiter Auftrag verkaufen
                    if menge * p_long < d["rs"]["min_notional"]:
                        raise ValueError(f"nur {frei:g} {d['coin']} frei — Coins durch einen anderen Auftrag gesperrt")
                    r = spot.stop_verkauf(d["sym"], menge, p_long, d["rs"])
                    st["spot"], st["p_long"] = r.get("orderId"), p_long
                    gesetzt.append(f"Stop {menge:g} @ {p_long:g}")
                    if (stop_spot - menge) * d["kurs"] >= STAUB_USDT:
                        warn(f"{k}: nur {menge:g} von {stop_spot:g} {d['coin']} gegen Stop gesichert — der Rest ist durch einen "
                             "anderen Auftrag gesperrt. Bitte prüfen!")
            if stop_perp > 0:
                try:
                    alt = [a for a in fut.offene_algos(d["sym"]) if str(a.get("clientAlgoId") or "").startswith(CID_STOP_PERP)]
                except Exception as ex:  # noqa: BLE001
                    alt = None
                    warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) — Short läuft OHNE neuen Stop, bitte prüfen!")
                if alt:
                    st["perp"] = alt[0].get("algoId")
                    schutz.append("alter Perp-Stop")
                    warn(f"{k}: alter Perp-Stop ist noch offen (Löschen gescheitert) — kein zweiter gesetzt.")
                elif alt is not None:
                    r = fut.stop_menge(d["sym"], "BUY", stop_perp, p_short, d["rf"]["tick"])
                    st["perp"], st["p_short"] = r.get("algoId"), p_short
                    gesetzt.append(f"Stop {stop_perp:g} @ {p_short:g}")
            speichern()
            richtung = netto * d["kurs"] / basis_g if basis_g else 0.0
            erg["zeilen"].append(f"{k}: Spot {mein:g} {d['coin']}, Perp {pos:+g}, Richtung {richtung:+.2f} (Ziel {z:+.2f})"
                                 + "".join(", " + g for g in gesetzt + schutz))
            if ungesichert and not gesetzt and not schutz and (stop_spot or stop_perp or short_teil * d["kurs"] >= 100):
                warn(f"{k}: Richtung {richtung:+.2f} OHNE Stop (zu klein für Binance, abgelehnt oder nicht prüfbar) — bitte prüfen!")
            if basis_g and abs(richtung - z) > 0.25:
                erg["zeilen"].append(f"{k}: Richtung {richtung:+.2f} weicht vom Ziel {z:+.2f} ab — Stop auf die tatsächliche Richtung gesetzt,"
                                     " der nächste Lauf gleicht weiter aus.")
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")


def _stop_preis(signal, frueher, kurs, seite):
    """Gültiger Stop-Kurs für long (seite +1, unter dem Kurs) bzw. short (−1, über dem Kurs): zuerst der des Signals, sonst
    der zuletzt benutzte, sonst ein Ersatz 5 % vom Kurs — nie eine Position ohne Stop, nur weil der Kurs fehlt."""
    for p in (signal, frueher):
        if p and (p < kurs if seite > 0 else p > kurs):
            return float(p)
    return kurs * (1 - NOT_STOP_ABSTAND * seite)


def _stops_weg(spot, fut, buch, k, sym):
    """EIGENE Stops stornieren: die IDs aus dem Buch UND alle offenen mit eigener Kennung (p2s/p2a) — so verschwinden auch
    Stops, deren Antwort verloren ging. Andere Aufträge bleiben. ID erst nach bestätigtem Storno aus dem Buch nehmen."""
    st = buch["stops"].setdefault(k, {})
    for o in spot.offene(sym):
        if str(o.get("clientOrderId") or "").startswith(CID_STOP_SPOT) and o.get("orderId") != st.get("spot"):
            spot.abbrechen(sym, o["orderId"])
    if st.get("spot") is not None:
        spot.abbrechen(sym, st["spot"])
        st["spot"] = None
    for a in fut.offene_algos(sym):
        if str(a.get("clientAlgoId") or "").startswith(CID_STOP_PERP) and str(a.get("algoId")) != str(st.get("perp")):
            fut.algo_abbrechen(sym, a["algoId"])
    if st.get("perp") is not None:
        fut.algo_abbrechen(sym, st["perp"])
        st["perp"] = None


# ───────────────────────── Not-Aus ─────────────────────────
def notaus_alle(env=None, datei=None, trocken=False, spot=None, fut=None, protokolliere=None):
    """Jeden GESTARTETEN Modus schliessen, mit den Schlüsseln DIESES Modus — egal wie die Freigabe-Schalter gerade stehen.
    «alles_zu» nur, wenn jeder Modus nachgeprüft zu ist."""
    env = os.environ if env is None else env
    datei = datei or BESTAND
    kaputt = None
    try:
        modi = modi_mit_bestand(datei)
    except BuchKaputt as ex:
        kaputt, modi = str(ex), []
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": ",".join(modi) or None, "alles_zu": True}
    if kaputt:
        erg.update(alles_zu=False, warnung=True)
        erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0: {kaputt} — Bestand unbekannt, NICHT «alles zu». Datei prüfen/wiederherstellen!")
    if FREIGEGEBEN and env.get("PILOT2_API_KEY") and "echt" not in modi:
        # Buch weg/kaputt: Pilot-Konto trotzdem ansehen — nie «nichts offen» melden, ohne zu schauen. Nur ansehen, nichts tun.
        try:
            cfg = einstellungen(env, modus="echt")
            s_, f_ = spot or Spot(cfg["spot"]), fut or Fut(cfg["futures"])
            konto, funde = s_.konto(), []
            for m_, (sym, coin) in COINS.items():
                pos = f_.position_info(sym)[0]
                menge = sum(bestand(konto, coin))
                if pos:
                    funde.append(f"Futures {sym} {pos:+g}")
                if menge * s_.kurs(sym) >= STAUB_USDT:
                    funde.append(f"{menge:g} {coin}")
            if funde:
                erg.update(alles_zu=False, warnung=True)
                erg["zeilen"].append("⚠️ Not-Aus Pilot 2.0 (echt): Pilot-Konto zeigt " + ", ".join(funde)
                                     + ", das Buch kennt es nicht — NICHTS automatisch verkauft. Bitte im Binance-Konto prüfen!")
        except Exception as ex:  # noqa: BLE001
            erg.update(alles_zu=False, warnung=True)
            erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 (echt): Konto nicht prüfbar ({type(ex).__name__}) — bitte im Binance-Konto prüfen!")
    if not modi:
        if erg["alles_zu"]:
            erg["zeilen"].append("Not-Aus Pilot 2.0: nichts offen.")
        return erg
    for m in modi:
        cfg = einstellungen(env, modus=m)
        if not (cfg["spot"]["key"] and cfg["futures"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["secret"]):
            erg["alles_zu"] = False
            erg["warnung"] = True
            erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 ({m}): gestartet, aber Schlüssel fehlen — NICHT geschlossen. "
                                 + ("PILOT2_API_KEY/SECRET setzen" if m == "echt" else "Testnetz-Schlüssel setzen") + " und Not-Aus wiederholen!")
            continue
        s = spot if spot is not None else Spot(cfg["spot"])
        f = fut if fut is not None else Fut(cfg["futures"])
        r = _notaus(s, f, buch_lesen(datei, m), lambda b, m=m: buch_schreiben(datei, m, b), m, trocken)
        erg["zeilen"] += r["zeilen"]
        erg["auftraege"] += r["auftraege"]
        erg["warnung"] = erg["warnung"] or r["warnung"]
        erg["alles_zu"] = None if trocken else (erg["alles_zu"] and r["alles_zu"])
    if not trocken and erg["alles_zu"]:
        try:  # kein Modus mehr gestartet → Datei weg (krypto-auto.bat startet den Pilot nur, solange sie existiert)
            if not modi_mit_bestand(datei):
                Path(datei).unlink(missing_ok=True)
        except (OSError, BuchKaputt):
            pass
    if protokolliere and not trocken:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"], "notaus": True,
                       "auftraege": erg["auftraege"], "alles_zu": erg["alles_zu"]})
    return erg


def _notaus(spot, fut, buch, speichern_b, modus, trocken):
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "alles_zu": True}

    def warn(t):
        erg["warnung"] = True
        erg["zeilen"].append("⚠️ " + t)

    def speichern():
        try:
            speichern_b(buch)
        except (OSError, BuchKaputt) as ex:
            warn(f"Buch nicht gespeichert ({type(ex).__name__}).")
    if trocken:
        erg["alles_zu"] = None
        erg["zeilen"].append(f"🛑 Not-Aus Pilot 2.0 ({modus}): Probelauf — nichts geschlossen (würde BTC und ETH schliessen).")
        return erg
    if modus == "echt":  # NIE in einem anderen Konto handeln als dem, in dem Pilot 2.0 gestartet ist
        try:
            uid = spot.konto().get("uid")
        except Exception:  # noqa: BLE001
            uid = None
        if not uid or not buch.get("uid") or str(uid) != str(buch["uid"]):
            erg["alles_zu"] = False
            warn(f"Not-Aus Pilot 2.0 (echt): Schlüssel zeigt nicht nachweislich auf das Pilot-Konto (UID {uid}, beim Start "
                 f"{buch.get('uid')}) — NICHTS angefasst. Den Schlüssel des Pilot-Unterkontos setzen und Not-Aus wiederholen!")
            erg["zeilen"].insert(0, f"🛑 Not-Aus Pilot 2.0 ({modus}): ⚠️ NICHT ALLES GESCHLOSSEN!")
            return erg
    for k, (sym, coin) in COINS.items():
        perp_zu = False
        try:  # 1) Perpetual zuerst schliessen (sein Stop bleibt bis dahin stehen)
            pos = fut.position_info(sym)[0]
            if pos:
                fut.auftrag(sym, "BUY" if pos < 0 else "SELL", abs(pos), True)
                erg["auftraege"].append((k, "perp", "BUY" if pos < 0 else "SELL", abs(pos)))
            perp_zu = fut.position_info(sym)[0] == 0
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k} Perpetual: {type(ex).__name__} {str(ex)[:120]}")
        try:  # 2) Futures-Aufträge erst NACH dem Schliessen löschen (vorher schützen sie den Short)
            if perp_zu:
                fut.alle_abbrechen(sym)
                buch["stops"].setdefault(k, {})["perp"] = None
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k}: Futures-Aufträge nicht (alle) gelöscht ({type(ex).__name__}).")
        try:  # 3a) alle Spot-Aufträge auf diesem Markt weg (geben gesperrte Coins frei) — das Konto gehört Pilot 2.0
            for o in spot.offene(sym):
                spot.abbrechen(sym, o["orderId"])
            buch["stops"].setdefault(k, {})["spot"] = None
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k}: Spot-Aufträge nicht (alle) gelöscht ({type(ex).__name__}) — verkaufe die freien Coins trotzdem.")
        try:  # 3b) alle Coins verkaufen — ausser der Short ist noch offen: dann bleibt so viel als Absicherung stehen
            frei, _ = bestand(spot.konto(), coin)
            behalten = 0.0 if perp_zu else max(0.0, -fut.position_info(sym)[0])
            regeln = spot.regeln2(sym)
            m = PL.runde(max(0.0, frei - behalten), regeln["step"])
            if m > 0 and m * spot.kurs(sym) >= regeln["min_notional"]:
                spot.markt(sym, "SELL", m)
                erg["auftraege"].append((k, "spot", "SELL", m))
            if behalten:
                warn(f"Not-Aus {modus} {k}: Short ließ sich nicht schliessen — {behalten:g} {coin} bleiben als Absicherung stehen.")
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k} Spot: {type(ex).__name__} {str(ex)[:120]}")
        try:  # 4) nachprüfen — am Kontostand, nicht an einer Annahme
            pos = fut.position_info(sym)[0]
            rest = sum(bestand(spot.konto(), coin))
            regeln = spot.regeln2(sym)
            if pos != 0 or rest * spot.kurs(sym) >= regeln["min_notional"]:
                erg["alles_zu"] = False
                warn(f"{modus} {k}: NICHT alles zu — Perp {pos:+g}, Spot {rest:g} {coin}. Bitte im Binance-Konto prüfen!")
            else:
                erg["zeilen"].append(f"✅ {modus} {k}: geschlossen" + (f" (Rest {rest:g} {coin} unter dem Binance-Minimum)" if rest else ""))
        except Exception as ex:  # noqa: BLE001
            erg["alles_zu"] = False
            warn(f"{modus} {k}: Nachprüfung nicht möglich ({type(ex).__name__}) — bitte im Binance-Konto prüfen!")
    try:
        buch["perp_offen"] = any(fut.position_info(COINS[m][0])[0] != 0 for m in COINS)
    except Exception:  # noqa: BLE001
        buch["perp_offen"] = True
    if erg["alles_zu"] and not buch["perp_offen"] and modus == "echt":
        try:
            zurueck = float(fut.konto().get("maxWithdrawAmount", 0) or 0)
            if zurueck >= 1:
                spot.verschieben("FUTURES_ZU_SPOT", math.floor(zurueck * 100) / 100)
                erg["zeilen"].append(f"{zurueck:.2f} USDT vom Futures- aufs Spot-Konto zurück.")
        except Exception as ex:  # noqa: BLE001
            erg["zeilen"].append(f"ℹ️ USDT im Futures-Konto nicht zurückverschoben ({type(ex).__name__}) — vor einem Neustart von Hand verschieben.")
    if erg["alles_zu"] and not buch["perp_offen"]:
        buch.clear()
        buch.update(leer_buch())  # alles zu → Pilot 2.0 beginnt beim nächsten Einschalten neu (mit Startprüfung)
    speichern()
    erg["zeilen"].insert(0, f"🛑 Not-Aus Pilot 2.0 ({modus}): " + ("alles geschlossen." if erg["alles_zu"] else "⚠️ NICHT ALLES GESCHLOSSEN!"))
    return erg


def protokoll_schreiben(eintrag):
    try:
        alt = json.loads(PROTOKOLL.read_text()) if PROTOKOLL.exists() else []
    except ValueError:
        alt = []
    PROTOKOLL.parent.mkdir(exist_ok=True)
    PROTOKOLL.write_text(json.dumps((alt + [eintrag])[-2000:], ensure_ascii=False, indent=1))
