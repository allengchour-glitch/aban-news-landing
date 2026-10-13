#!/usr/bin/env python3
"""Pilot 2.0 — Ausführung über Binance Spot UND USDⓈ-M Futures, in einem Konto NUR für Pilot 2.0.

Rechnung: pilot2_plan.py (Richtung long über Spot, short über Perpetual, freier Teil als Funding-Ernte, Pfand 110 %).
Einschalten: KRYPTO_PILOT2=an UND im Code FREIGEGEBEN = True (erst nach einer unabhängigen Prüfung ohne Blocker).

Grundsatz «Konto = Wahrheit»: Pilot 2.0 handelt nur in einem Konto, das ihm allein gehört — mit echtem Geld ein Binance-
UNTERKONTO nur für Pilot 2.0 (Schlüssel PILOT2_API_KEY/SECRET dieses Unterkontos), im Testnetz die Test-Konten (Spielgeld).
Alles, was darin liegt, gehört Pilot 2.0. Darum führt er KEIN eigenes Coin- oder USDT-Buch, das vom Konto abweichen könnte:
jeder Lauf liest den Kontostand, rechnet, handelt und gleicht am Ende die Stops mit dem Kontostand ab.

Sicherungen:
  • Echtes Geld NUR, wenn ALLES gesetzt ist: BINANCE_TESTNET=false, BINANCE_FUTURES_TESTNET=false,
    KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD" und KRYPTO_PILOT2=an.
  • Start mit echtem Geld: Unterkonto bis auf USDT leer (keine BTC/ETH, keine offenen Aufträge, keine Futures-Positionen,
    kein Futures-Guthaben) und höchstens KRYPTO_PILOT2_KAPITAL USDT darin. Mehr als im Unterkonto liegt, kann er nicht verlieren.
    Der Start wird gespeichert, BEVOR ein Auftrag rausgeht — geht das nicht, handelt er nicht.
  • Gebunden an DIESES Konto: die Binance-Konto-ID (UID) wird beim Start gemerkt. Andere oder fehlende UID → kein Auftrag,
    und der Not-Aus fasst ein fremdes Konto nie an. Ein zweiter Modus (Testnetz/echt) startet nie, solange einer gestartet ist.
  • Schlüssel-Rechte (echtes Geld): Auszahlung, Margin-Leihe und Überweisung an Dritte AUS; Spot- und Futures-Handel AN.
    «Universal Transfer» (zwischen Spot und Futures DIESES Kontos) ist erlaubt, aber nicht nötig — ohne ihn füllst du beide selbst.
  • Not-Aus (KI_BOT_STOP=1, Datei STOP, Cockpit, Telegram, stop.bat, Tagesaufgabe) hat Vorrang vor allem. Er schliesst jeden
    gestarteten Modus mit den Schlüsseln dieses Modus: Lage lesen (mit Wiederholungen, sonst nichts anfassen), erst das
    Perpetual (scheitert das, bleibt so viel Spot als Absicherung stehen, wie der Short gross ist), dann alle Aufträge auf
    BTC/ETH weg und alle BTC/ETH verkaufen (mehrere Versuche). Bleibt dabei etwas ungesichert übrig, bekommt es sofort einen
    Schutz-Stop — nie ein Long ohne Absicherung UND ohne Stop. «Alles zu» nur, wenn nachgeprüft.
  • Stops am Ende jedes Laufs nach der TATSÄCHLICHEN Netto-Richtung (Spot-Coins + Perpetual): long → Spot-Stop (STOP_LOSS =
    Markt), short → Perp-Stop mit Menge + reduceOnly (nie closePosition — die Ernte-Absicherung trifft er nie). Ein passender
    eigener Stop bleibt stehen; nur wer ersetzt werden muss, wird gelöscht und sofort neu gesetzt (Kennung p2s/p2a, keine
    Doppel-Stops). Liegt der Kurs schon jenseits des Stops (Binance: «würde sofort auslösen»), schliesst er sofort zum Markt;
    geht auch das nicht, setzt er einen Not-Stop 5 % vom frischen Kurs. Lesen und Stops mit kurzen Wiederholungen (503/429).
  • Unklare Antworten: der Markt ist für den Rest des Laufs gesperrt; die Stops richten sich nach dem Kontostand am Ende, und
    der nächste Lauf liest wieder den Kontostand. Ein Short mit unklarer Antwort bekommt zusätzlich einen reduceOnly-Stop über
    seine Menge (harmlos, falls er nie ausgeführt wurde — schützt, falls er später doch ankommt).
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
import time
import urllib.error
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
LESE_WARTEN = (0.5, 1.5)        # kurze Störungen (503, 429, Netz) beim Lesen, Stornieren und Stop-Setzen überbrücken
VERKAUF_VERSUCHE = 3            # Not-Aus: so oft verkaufen (den Rest jedes Mal neu lesen), danach Schutz-Stop
AUTH_FEHLER = ("-2014", "-2015", "-2008", "-1022")  # Schlüssel passt nicht zu diesem Konto/Netz


class BuchKaputt(ValueError):
    """Buch-Datei vorhanden, aber unlesbar → nie überschreiben, nie «nichts offen» melden."""


def _kennung(anfang):
    return f"{anfang}{int(time.time() * 1000)}{random.randint(0, 999999):06d}"


def _voruebergehend(ex):
    """Lohnt ein zweiter Versuch? Netzfehler, 5xx, 408, 418/429 (Rate-Limit) — nie bei einem unklaren Auftrag."""
    if isinstance(ex, BF.UnklarFehler):
        return False
    if isinstance(ex, urllib.error.HTTPError):  # BinanceFehler (Spot und Futures): code = HTTP-Status
        return ex.code is not None and (ex.code >= 500 or ex.code in (408, 418, 429))
    return isinstance(ex, BF.NETZFEHLER)


def _nochmal(f, warten=None):
    """f() mit kurzen Wiederholungen bei vorübergehenden Fehlern. Nur für Lesen und Stornieren — nie für Marktaufträge."""
    warten = LESE_WARTEN if warten is None else warten
    for i in range(len(warten) + 1):
        try:
            return f()
        except Exception as ex:  # noqa: BLE001
            if i >= len(warten) or not _voruebergehend(ex):
                raise
            time.sleep(warten[i])


def _sofort_ausgeloest(ex):
    """Binance lehnt einen Stop ab, weil der Kurs schon jenseits liegt (Spot −2010 «would trigger immediately», Futures −2021)."""
    t = str(getattr(ex, "msg", "") or ex).lower()
    return "-2021" in t or "immediately" in t


def _auth_fehler(ex):
    return getattr(ex, "code", None) == 401 or any(c in str(getattr(ex, "msg", "") or ex) for c in AUTH_FEHLER)


def _gleich(a, b, schritt):
    try:
        return abs(float(a) - float(b)) <= schritt / 2 + 1e-12
    except (TypeError, ValueError):
        return False


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
    spot_basis = s_url or (SPOT_ECHT if echt else SPOT_TEST)
    return {"echtgeld": echt, "fehler": fehler, "modus": "echt" if echt else "testnetz",
            "spot": {"key": sk, "secret": ss, "basis": spot_basis},
            "futures": {"key": fk, "secret": fs, "basis": f_url or (FUT_ECHT if echt else FUT_TEST), "spot": spot_basis},
            # Anteil des Pilot-Kontos, den Pilot 2.0 einsetzt (das Konto gehört ihm allein → Standard 100 %)
            "anteil": max(0.0, min(1.0, zahl("PILOT2_ANTEIL", 1.0))), "max_auftrag": max(0.0, zahl("KI_BOT_MAX_AUFTRAG", 1000)),
            "stop": env.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists(),
            "pause": PAUSE_DATEI.exists(),
            "deckel": zahl("KRYPTO_PILOT2_KAPITAL", 0.0 if echt else 10000.0),
            "konflikte": konflikte(env, echt)}


def konflikte(env, echt=False):
    """Andere Bots im selben Binance-Konto → Pilot 2.0 würde deren Coins/Positionen mitbewegen. Mit echtem Geld hat Pilot 2.0
    sein eigenes Unterkonto (PILOT2_API_KEY): ein anderer Bot stört dann nur, wenn er denselben Schlüssel benutzt."""
    p2 = (env.get("PILOT2_API_KEY") or "").strip()

    def gleich(name):
        return not echt or bool(p2 and (env.get(name) or "").strip() == p2)
    out = []
    if (env.get("KRYPTO_BROKER") or "").strip().lower() == "binance" and gleich("BINANCE_API_KEY"):
        out.append("Bitcoin-Spot-Bot (KRYPTO_BROKER=binance)")
    if (env.get("ETH_SPARPLAN_BETRAG") or "").strip() and gleich("BINANCE_API_KEY"):
        out.append("ETH-Sparplan (ETH_SPARPLAN_BETRAG)")
    if (env.get("CALLS_MODUS") or "schatten").strip().lower() in ("testnetz", "echtgeld") and gleich("BINANCE_FUTURES_API_KEY"):
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
                if o.get("status") in ("FILLED", "PARTIALLY_FILLED") or float(o.get("executedQty") or 0) > 0:
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

    def eigene_stops(self, symbol):
        """Offene eigene Stops (Kennung p2s…) mit Menge (origQty) und Stop-Kurs (stopPrice)."""
        return [o for o in self.offene(symbol) if str(o.get("clientOrderId") or "").startswith(CID_STOP_SPOT)]

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
        Futures-Konto schützte den Ernte-Short dann nicht vor der Zwangsschliessung."""
        try:
            self._req("POST", "/fapi/v1/marginType", {"symbol": symbol, "marginType": "CROSSED"}, signiert=True)
        except BF.BinanceFehler as ex:
            if "-4046" not in str(ex.msg):  # schon CROSSED; −4048 (offene Position) → Fehler → kein Short
                raise
        self._req("POST", "/fapi/v1/leverage", {"symbol": symbol, "leverage": max(1, int(hebel))}, signiert=True)

    def offene_algos(self, symbol):
        return [o for o in (self._req("GET", "/fapi/v1/openAlgoOrders", {"symbol": symbol}, signiert=True) or []) if isinstance(o, dict)]

    def eigene_stops(self, symbol):
        """Offene eigene Perp-Stops (Kennung p2a…) mit Menge (quantity) und Auslöser (triggerPrice)."""
        return [a for a in self.offene_algos(symbol) if str(a.get("clientAlgoId") or "").startswith(CID_STOP_PERP)]

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
    konto = konto or _nochmal(spot.konto)
    kf = _nochmal(fut.konto)
    wert = sum(bestand(konto, "USDT"))
    for sym, coin in COINS.values():
        menge = sum(bestand(konto, coin))
        if menge:
            wert += menge * _nochmal(lambda sym=sym: spot.kurs(sym))
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
    try:
        buch = buch_lesen(datei, cfg["modus"])
        andere = [m for m in modi_mit_bestand(datei) if m != cfg["modus"]]
    except BuchKaputt as ex:
        warn(f"{ex} — kein Auftrag. Datei prüfen/wiederherstellen; der Not-Aus meldet den Kontostand.")
        return erg
    if andere:  # nie still unverwaltet: ein gestarteter Modus, dessen Schalter gerade nicht gelten
        warn(f"Pilot 2.0 ist im Modus «{', '.join(andere)}» gestartet, die Schalter stehen aber auf «{cfg['modus']}» — dort zieht "
             "niemand die Stops nach. Schalter zurückstellen oder Not-Aus (schliesst jeden gestarteten Modus).")
        if not buch["start"]:
            warn("Solange ein anderer Modus gestartet ist, startet Pilot 2.0 keinen zweiten — kein Auftrag.")
            return erg
    if not (cfg["spot"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["key"] and cfg["futures"]["secret"]):
        if _gestartet(buch):
            warn(f"Pilot 2.0 ({cfg['modus']}) ist gestartet, aber die Schlüssel fehlen "
                 f"({'PILOT2_API_KEY/SECRET' if cfg['echtgeld'] else 'Testnetz-Schlüssel'}) — seine Positionen werden NICHT verwaltet "
                 "(keine Stops nachgezogen). Schlüssel setzen oder Not-Aus.")
        else:
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

    def speichern():
        try:
            buch_schreiben(datei, cfg["modus"], buch)
        except (OSError, BuchKaputt) as ex:  # Aufträge sind trotzdem gültig; verwaiste Stops findet der nächste Lauf an der Kennung
            warn(f"Buch nicht gespeichert ({type(ex).__name__}) — der nächste Lauf liest wieder den Kontostand.")

    transfer_ok = False
    gesperrt = set()
    unklar_short = {}
    ents = [dict(e) for e in ents if e["markt"] in COINS]
    try:
        konto_s = _nochmal(spot.konto)
        if cfg["echtgeld"]:
            ok, verboten, fehlt, transfer_ok = rechte_ok(_nochmal(spot.rechte))
            if not ok:
                warn(f"Schlüssel-Rechte falsch — kein Auftrag. Ausschalten: {', '.join(verboten) or '–'}; einschalten: {', '.join(fehlt) or '–'}.")
                return erg
        if _nochmal(fut.hedge_modus):
            warn("Futures-Konto steht im Hedge-Modus — Pilot 2.0 braucht den Einweg-Modus. Kein Auftrag.")
            return erg
        if cfg["echtgeld"]:
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
        gewaehlt = {e["markt"] for e in ents}
        for m, (sym, coin) in COINS.items():
            if m not in gewaehlt and (sum(bestand(konto_s, coin)) * _nochmal(lambda sym=sym: spot.kurs(sym)) >= STAUB_USDT
                                      or _nochmal(lambda sym=sym: fut.position_info(sym))[0] != 0):
                ents.append({"markt": m, "hebel": 0.0, "abgewaehlt": True})
                erg["zeilen"].append(f"{m} ist abgewählt — Bestand wird abgebaut.")
        if not ents:
            return erg
        daten = {}
        for e in ents:
            sym, coin = COINS[e["markt"]]
            pos, hebel_ist = _nochmal(lambda sym=sym: fut.position_info(sym))
            daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": sum(bestand(konto_s, coin)), "perp": pos, "hebel_ist": hebel_ist,
                                 "kurs": _nochmal(lambda sym=sym: spot.kurs(sym)), "rs": _nochmal(lambda sym=sym: spot.regeln2(sym)),
                                 "rf": _nochmal(lambda sym=sym: fut.regeln(sym))}
        kapital = kontowert(spot, fut, konto_s)
    except Exception as ex:  # noqa: BLE001 — noch nichts gehandelt, keine Stops angefasst
        warn(f"Konto nicht lesbar ({type(ex).__name__} {str(ex)[:100]}) — kein Auftrag, nächster Lauf versucht es wieder.")
        return erg
    erg["kapital"] = round(kapital, 2)
    if not buch["start"]:
        if not trocken:  # ein Probelauf verbraucht die Startprüfung nicht
            buch["start"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            buch["uid"] = konto_s.get("uid") if cfg["echtgeld"] else None
            try:  # der Start MUSS gespeichert sein, bevor ein Auftrag rausgeht — sonst kennt ihn der Not-Aus nicht
                buch_schreiben(datei, cfg["modus"], buch)
            except (OSError, BuchKaputt) as ex:
                warn(f"Start nicht gespeichert ({type(ex).__name__}) — ohne gespeicherten Start kein Auftrag (der Not-Aus fände die "
                     "Positionen sonst nicht). Ordner/Datei prüfen (Virenscanner, OneDrive, offener Editor); der nächste Lauf versucht es wieder.")
                return erg
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
        try:
            if konto == "spot" and seite == "BUY":  # nie mehr kaufen, als freies USDT im Konto liegt
                usdt_frei = bestand(_nochmal(spot.konto), "USDT")[0]
                leistbar = PL.runde(usdt_frei / (d["kurs"] * 1.003), d["rs"]["step"])
                if leistbar < menge:
                    warn(f"{k}: freies USDT reicht nur für {leistbar:g} statt {menge:g} {d['coin']} — weniger gekauft.")
                    menge = leistbar
                if menge * d["kurs"] < d["rs"]["min_notional"]:
                    return 0.0
            if konto == "spot":
                r = spot.markt(d["sym"], seite, menge)
                gemacht = abs(netto_coins(r, d["coin"]))
            else:
                pos_vor = _nochmal(lambda: fut.position_info(d["sym"]))[0]
                if not buch["perp_offen"]:
                    buch["perp_offen"] = True
                    speichern()
                try:
                    fut.auftrag(d["sym"], seite, menge, reduce)
                except BF.UnklarFehler:  # Position nachlesen statt raten
                    try:
                        nach = _nochmal(lambda: fut.position_info(d["sym"]))[0]
                    except Exception:  # noqa: BLE001
                        nach = None
                    erwartet = pos_vor + (menge if seite == "BUY" else -menge)
                    if nach is None or abs(nach - erwartet) > 1e-9:
                        gesperrt.add(k)
                        neuer_short = seite == "SELL" and not reduce
                        if neuer_short:  # kommt er später doch an, hat er einen Stop (reduceOnly: ohne Position harmlos)
                            unklar_short[k] = unklar_short.get(k, 0.0) + menge
                        warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt es (noch) nicht — Markt gesperrt, "
                             "nichts zurückgerechnet; Stops nach dem Kontostand"
                             + (", dazu ein Schutz-Stop über die unklare Menge." if neuer_short else "."))
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
        # 1) eigene Spot-Stops weg — NUR in Märkten, in denen Spot verkauft wird (der Stop sperrt die Coins). Alle anderen
        #    Stops bleiben stehen, bis der Abgleich am Ende sie bestätigt oder ersetzt (nie stundenlang ohne Stop).
        for k, p in plaene.items():
            if not any(s[0] == "spot" and s[1] == "SELL" for s in p["schritte"]):
                continue
            try:
                _spot_stops_weg(spot, buch, k, daten[k]["sym"])
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: alter Spot-Stop nicht (ganz) gelöscht ({type(ex).__name__}) — heute keine Änderung; die Stops werden am Ende"
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
        # 3) Geld zwischen Spot und Futures verschieben (nur echt und nur mit «Universal Transfer»). Das Pfand zählt nach dem
        #    Eigenkapital: offene Verluste des Shorts gehen ab (sonst schmilzt das Pfand bei steigendem Kurs unbemerkt).
        usdt_frei = bestand(_nochmal(spot.konto), "USDT")[0]
        konto_f = _nochmal(fut.konto)
        f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0) + min(0.0, float(konto_f.get("totalUnrealizedProfit", 0) or 0))
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

            def nur_richtung(grund, obergrenze=None):
                """Heute keine neue Ernte und kein Short: nur den Richtungs-Long kaufen (nach dem Kontostand)."""
                richtung_ist = sum(bestand(_nochmal(spot.konto), d["coin"])) + _nochmal(lambda: fut.position_info(d["sym"]))[0]
                rest = max(0.0, p["stop_spot"] - max(0.0, richtung_ist))
                rest = PL.runde(rest if obergrenze is None else min(rest, obergrenze), d["rs"]["step"])
                warn(f"{k}: {grund} — kein Short, keine neue Ernte.")
                return [("spot", "BUY", rest, False)] if rest * d["kurs"] >= d["rs"]["min_notional"] else []
            if shorts:
                try:
                    fut.einrichten(d["sym"], 1)
                    verfuegbar = float(_nochmal(fut.konto).get("availableBalance", 0) or 0)
                except Exception as ex:  # noqa: BLE001
                    warn(f"{k}: Futures-Vorbereitung gescheitert ({type(ex).__name__}) — kein Short, keine neue Ernte.")
                    continue
                noetig = shorts[0][2] * d["kurs"] * (1 + PL.PUFFER_SHORT)
                if verfuegbar < noetig:
                    kaeufe, shorts = nur_richtung(f"Futures-Konto hat {verfuegbar:.2f} USDT frei, Short braucht {noetig:.2f}"), []
            if kaeufe and shorts:  # reicht das Spot-USDT nicht, bliebe der gekürzte Short unter dem Binance-Minimum → nur Richtung
                leistbar = PL.runde(bestand(_nochmal(spot.konto), "USDT")[0] / (d["kurs"] * 1.003), d["rs"]["step"])
                fehlt_vorab = sum(s[2] for s in kaeufe) - leistbar
                if fehlt_vorab > 0 and any(PL.runde(max(0.0, s[2] - fehlt_vorab), d["rf"]["step"]) * d["kurs"] < d["rf"]["min_notional"]
                                           for s in shorts):
                    kaeufe, shorts = nur_richtung("freies Spot-USDT reicht nicht für Ernte und Short (Binance-Minimum)", leistbar), []
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
                if r is None and gekauft > 0:  # Short sicher NICHT ausgeführt → nur die UNGESICHERTEN Ernte-Coins zurück, nie die Richtung
                    frei_ist, gebunden_ist = bestand(_nochmal(spot.konto), d["coin"])
                    ueber = frei_ist + gebunden_ist + _nochmal(lambda: fut.position_info(d["sym"]))[0] - max(0.0, p["stop_spot"])
                    zurueck = PL.runde(max(0.0, min(gekauft, frei_ist, ueber)), d["rs"]["step"])
                    if zurueck * d["kurs"] >= d["rs"]["min_notional"]:
                        gesperrt.discard(k)
                        if isinstance(schritt(k, "spot", "SELL", zurueck, False), float):
                            erg["zeilen"].append(f"{k}: Ernte-Short abgelehnt → {zurueck:g} {d['coin']} zurückverkauft.")
                        gesperrt.add(k)
    except Exception as ex:  # noqa: BLE001 — Lauf unterbrochen: Stops trotzdem nach dem Kontostand, Meldung und Protokoll bleiben
        warn(f"Lauf unterbrochen ({type(ex).__name__} {str(ex)[:100]}) — Stops werden trotzdem nach dem Kontostand gesetzt, bitte prüfen!")
    finally:
        _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn, unklar_short)
    try:
        buch["perp_offen"] = any(_nochmal(lambda m=m: fut.position_info(COINS[m][0]))[0] != 0 for m in COINS)
        speichern()
    except Exception:  # noqa: BLE001
        pass
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


# ───────────────────────── Stops: Abgleich mit dem Kontostand ─────────────────────────
def _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn, unklar_short=None):
    """Am Ende jedes Laufs: Stops nach dem Kontostand und der tatsächlichen Netto-Richtung (Spot-Coins + Perpetual):
    long → ein Spot-Stop über min(Netto, Coins); short → ein Perp-Stop über Short minus (abgerundete) Absicherung, plus die
    Menge eines Shorts mit unklarer Antwort. Nicht prüfbar → laute Warnung, kein Stop."""
    unklar_short = unklar_short or {}
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        try:
            frei, gebunden = bestand(_nochmal(spot.konto), d["coin"])
            mein = frei + gebunden
            pos = _nochmal(lambda: fut.position_info(d["sym"]))[0]
            try:
                kurs = _nochmal(lambda: spot.kurs(d["sym"]))  # frisch: der Kurs kann sich während des Laufs bewegt haben
            except Exception:  # noqa: BLE001
                kurs = d["kurs"]
            netto = mein + pos
            z = e.get("z", 0)
            st = buch["stops"].setdefault(k, {})
            ungesichert = abs(netto) * kurs >= STAUB_USDT
            stop_spot = PL.runde(min(max(0.0, netto), mein), d["rs"]["step"]) if netto > 0 and ungesichert else 0.0  # gewollt
            short = abs(min(pos, 0.0))
            short_teil = short - min(mein, short)
            # Absicherung abrunden, NICHT den Stop: sonst bliebe bis zu ein Futures-Schritt Short ohne Stop.
            # Unter einem halben Futures-Schritt kein Perp-Stop (er würde sonst einen ganzen Schritt der Ernte schliessen).
            stop_perp = (max(0.0, short - PL.runde(min(mein, short), d["rf"]["step"]))
                         if short_teil >= 0.5 * d["rf"]["step"] and short_teil * kurs >= STAUB_USDT else 0.0)
            gesetzt, schutz, gescheitert = [], [], []
            for teil, abgleich in (("Spot", lambda: _spot_abgleich(spot, k, d, st, e, stop_spot, kurs, erg, warn, gesetzt, schutz)),
                                   ("Perp", lambda: _perp_abgleich(fut, k, d, st, e, stop_perp, unklar_short.get(k, 0.0), kurs, erg, warn,
                                                                   gesetzt, schutz))):
                try:  # getrennt: scheitert der Spot-Stop, bekommt der Short trotzdem seinen (und umgekehrt)
                    abgleich()
                except Exception as ex:  # noqa: BLE001
                    gescheitert.append(teil)
                    warn(f"{k}: {teil}-Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")
            speichern()
            richtung = netto * kurs / basis_g if basis_g else 0.0
            erg["zeilen"].append(f"{k}: Spot {mein:g} {d['coin']}, Perp {pos:+g}, Richtung {richtung:+.2f} (Ziel {z:+.2f})"
                                 + "".join(", " + g for g in gesetzt + schutz))
            if ungesichert and not gesetzt and not schutz and not gescheitert and (stop_spot or stop_perp or short_teil * kurs >= 100):
                warn(f"{k}: Richtung {richtung:+.2f} OHNE Stop (zu klein für Binance, abgelehnt oder nicht prüfbar) — bitte prüfen!")
            if basis_g and abs(richtung - z) > 0.25:
                erg["zeilen"].append(f"{k}: Richtung {richtung:+.2f} weicht vom Ziel {z:+.2f} ab — Stop auf die tatsächliche Richtung gesetzt,"
                                     " der nächste Lauf gleicht weiter aus.")
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")


def _platziere(platzieren, eigene_ids, schluessel):
    """Stop setzen. Vorübergehender Fehler (503, 429, Netz): nachsehen, ob er doch steht (neue eigene Kennung) — sonst
    nochmal. So entstehen nie zwei Stops aus einer verlorenen Antwort."""
    try:
        vorher = {str(x) for x in eigene_ids()}
    except Exception:  # noqa: BLE001
        vorher = None
    for i in range(len(LESE_WARTEN) + 1):
        try:
            return platzieren() or {}
        except Exception as ex:  # noqa: BLE001
            if vorher is None or i >= len(LESE_WARTEN) or not _voruebergehend(ex):
                raise
            time.sleep(LESE_WARTEN[i])
            ids = {str(x): x for x in eigene_ids()}
            neu = [v for s, v in ids.items() if s not in vorher]
            if neu:
                return {schluessel: neu[0], "nachgesehen": True}
    return {}


def _alle_weg(alt, abbrechen, k, art, warn, schutz):
    """Eigene alte Stops stornieren (mit Wiederholungen). → None (alle weg) oder der Stop, der noch offen ist — dann KEIN
    zweiter (ein Doppel-Stop könnte die Ernte-Absicherung treffen)."""
    for o in alt:
        try:
            _nochmal(lambda o=o: abbrechen(o))
        except Exception as ex:  # noqa: BLE001
            schutz.append(f"alter {art}-Stop")
            warn(f"{k}: alter {art}-Stop ist noch offen (Löschen gescheitert, {type(ex).__name__}) — kein zweiter gesetzt.")
            return o
    return None


def _spot_abgleich(spot, k, d, st, e, soll, kurs, erg, warn, gesetzt, schutz):
    """Long-Seite: genau ein eigener Spot-Stop über `soll` Coins. Ein passender bleibt; sonst alten weg, neuen sofort.
    Kurs schon unter dem Stop-Kurs (Signal, sonst der letzte) → wie ein ausgelöster Stop sofort verkaufen."""
    sym, regeln = d["sym"], d["rs"]
    try:
        alt = _nochmal(lambda: spot.eigene_stops(sym))
    except Exception as ex:  # noqa: BLE001
        if soll > 0:
            warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — Long läuft OHNE neuen Stop, bitte prüfen!")
        return
    if soll <= 0 or soll * kurs < regeln["min_notional"]:
        if alt:  # verwaiste eigene Stops (z. B. nachdem der Perp-Stop ausgelöst hat) dürfen nie Ernte-Coins verkaufen
            offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
            st["spot"] = offen.get("orderId") if offen else None
        return
    grenze = e.get("stop_long") or st.get("p_long")
    if grenze and kurs <= grenze:
        offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
        if offen:
            st["spot"] = offen.get("orderId")
            return
        st["spot"] = None
        _spot_raus(spot, k, d, st, soll, kurs, erg, warn, gesetzt, f"Kurs {kurs:g} schon unter dem Stop {grenze:g}")
        return
    p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
    p_r = PL.runde(p, regeln["tick"])
    if len(alt) == 1 and _gleich(alt[0].get("origQty"), soll, regeln["step"]) and _gleich(alt[0].get("stopPrice"), p_r, regeln["tick"]):
        st["spot"], st["p_long"] = alt[0].get("orderId"), p
        schutz.append(f"Stop {soll:g} @ {p_r:g} bleibt")
        return
    offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
    if offen:
        st["spot"] = offen.get("orderId")
        return
    st["spot"] = None
    frei = bestand(_nochmal(spot.konto), d["coin"])[0]  # nach dem Storno sind die Coins wieder frei
    menge = PL.runde(min(soll, frei), regeln["step"])  # gesperrte Coins (fremder Auftrag) kann kein zweiter Auftrag verkaufen
    if menge * p < regeln["min_notional"]:
        raise ValueError(f"nur {frei:g} {d['coin']} frei — Coins durch einen anderen Auftrag gesperrt")
    try:
        r = _platziere(lambda: spot.stop_verkauf(sym, menge, p, regeln), lambda: [o.get("orderId") for o in spot.eigene_stops(sym)], "orderId")
        st["spot"], st["p_long"] = r.get("orderId"), p
        gesetzt.append(f"Stop {menge:g} @ {p_r:g}")
    except Exception as ex:  # noqa: BLE001
        if not _sofort_ausgeloest(ex):
            raise
        _spot_raus(spot, k, d, st, menge, kurs, erg, warn, gesetzt, f"Stop {p_r:g} würde sofort auslösen (Kurs gefallen)")
    if (soll - menge) * kurs >= STAUB_USDT:
        warn(f"{k}: nur {menge:g} von {soll:g} {d['coin']} gegen Stop gesichert — der Rest ist durch einen "
             "anderen Auftrag gesperrt. Bitte prüfen!")


def _spot_raus(spot, k, d, st, menge, kurs, erg, warn, gesetzt, grund):
    """Long sofort zum Markt schliessen (statt eines Stops, der sofort auslösen würde). Bleibt etwas übrig (abgelehnt,
    nur teilweise ausgeführt): Not-Stop 5 % unter dem frischen Kurs."""
    sym, regeln, coin = d["sym"], d["rs"], d["coin"]
    m = PL.runde(min(menge, bestand(_nochmal(spot.konto), coin)[0]), regeln["step"])
    verkauft, fehler = 0.0, None
    if m * kurs >= regeln["min_notional"]:
        try:
            r = spot.markt(sym, "SELL", m)
            verkauft = abs(netto_coins(r, coin))
            erg["auftraege"].append((k, "spot", "SELL", verkauft))
            gesetzt.append(f"{grund} → {verkauft:g} {coin} verkauft")
        except Exception as ex:  # noqa: BLE001
            fehler = ex
    rest = PL.runde(min(menge - verkauft, bestand(_nochmal(spot.konto), coin)[0]), regeln["step"])
    if rest * kurs < regeln["min_notional"]:
        return
    p = kurs * (1 - NOT_STOP_ABSTAND)
    try:
        r = _platziere(lambda: spot.stop_verkauf(sym, rest, p, regeln), lambda: [o.get("orderId") for o in spot.eigene_stops(sym)], "orderId")
        st["spot"], st["p_long"] = r.get("orderId"), p
        gesetzt.append(f"Not-Stop {rest:g} @ {PL.runde(p, regeln['tick']):g}")
        warn(f"{k}: {grund}, Verkauf {'abgelehnt (' + type(fehler).__name__ + ')' if fehler else 'unvollständig'} — Not-Stop 5 % unter dem Kurs gesetzt.")
    except Exception as ex:  # noqa: BLE001
        warn(f"{k}: {grund}, Verkauf und Not-Stop abgelehnt ({type(ex).__name__}) — {rest:g} {coin} OHNE Stop, bitte sofort prüfen!")


def _perp_abgleich(fut, k, d, st, e, soll, unklar, kurs, erg, warn, gesetzt, schutz):
    """Short-Seite: genau ein eigener Perp-Stop (Menge + reduceOnly) über soll + unklar. Passender bleibt; sonst alten weg,
    neuen sofort. Kurs schon über dem Stop-Kurs → Richtungs-Short sofort zurückkaufen."""
    sym, regeln = d["sym"], d["rf"]
    gesamt = soll + unklar
    try:
        alt = _nochmal(lambda: fut.eigene_stops(sym))
    except Exception as ex:  # noqa: BLE001
        if gesamt > 0:
            warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) — Short läuft OHNE neuen Stop, bitte prüfen!")
        return
    if gesamt <= 0:
        if alt:  # verwaist (Position zu oder kleiner) — weg, damit er nie die Ernte trifft
            offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
            st["perp"] = offen.get("algoId") if offen else None
        return
    grenze = e.get("stop_short") or st.get("p_short")
    if soll > 0 and grenze and kurs >= grenze:
        offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
        if offen:
            st["perp"] = offen.get("algoId")
            return
        st["perp"] = None
        _perp_raus(fut, k, d, st, soll, kurs, erg, warn, gesetzt, f"Kurs {kurs:g} schon über dem Stop {grenze:g}")
        if unklar:
            _perp_notstop(fut, k, d, st, unklar, kurs, warn, gesetzt, "unklarer Short")
        return
    p = _stop_preis(e.get("stop_short"), st.get("p_short"), kurs, -1)
    p_r = PL.runde(p, regeln["tick"])
    if len(alt) == 1 and _gleich(alt[0].get("quantity"), gesamt, regeln["step"]) and _gleich(alt[0].get("triggerPrice"), p_r, regeln["tick"]):
        st["perp"], st["p_short"] = alt[0].get("algoId"), p
        schutz.append(f"Stop {gesamt:g} @ {p_r:g} bleibt")
        return
    offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
    if offen:
        st["perp"] = offen.get("algoId")
        return
    st["perp"] = None
    try:
        r = _platziere(lambda: fut.stop_menge(sym, "BUY", gesamt, p, regeln["tick"]), lambda: [a.get("algoId") for a in fut.eigene_stops(sym)],
                       "algoId")
        st["perp"], st["p_short"] = r.get("algoId"), p
        gesetzt.append(f"Stop {gesamt:g} @ {p_r:g}" + (f" (davon {unklar:g} für den unklaren Short)" if unklar else ""))
    except Exception as ex:  # noqa: BLE001
        if not _sofort_ausgeloest(ex):
            raise
        if soll > 0:
            _perp_raus(fut, k, d, st, soll, kurs, erg, warn, gesetzt, f"Stop {p_r:g} würde sofort auslösen (Kurs gestiegen)")
        if unklar:
            _perp_notstop(fut, k, d, st, unklar, kurs, warn, gesetzt, "unklarer Short")


def _perp_raus(fut, k, d, st, menge, kurs, erg, warn, gesetzt, grund):
    """Richtungs-Short sofort zurückkaufen (reduceOnly). Geht das nicht (oder unklar): Not-Stop 5 % über dem Kurs."""
    try:
        fut.auftrag(d["sym"], "BUY", menge, True)
        erg["auftraege"].append((k, "perp", "BUY", menge))
        gesetzt.append(f"{grund} → Short {menge:g} zurückgekauft")
    except Exception as ex:  # noqa: BLE001
        _perp_notstop(fut, k, d, st, menge, kurs, warn, gesetzt, f"{grund}, Rückkauf abgelehnt ({type(ex).__name__})")


def _perp_notstop(fut, k, d, st, menge, kurs, warn, gesetzt, grund):
    p = kurs * (1 + NOT_STOP_ABSTAND)
    try:
        r = _platziere(lambda: fut.stop_menge(d["sym"], "BUY", menge, p, d["rf"]["tick"]),
                       lambda: [a.get("algoId") for a in fut.eigene_stops(d["sym"])], "algoId")
        st["perp"], st["p_short"] = r.get("algoId"), p
        gesetzt.append(f"Not-Stop {menge:g} @ {PL.runde(p, d['rf']['tick']):g}")
        warn(f"{k}: {grund} — Not-Stop 5 % über dem Kurs gesetzt.")
    except Exception as ex:  # noqa: BLE001
        warn(f"{k}: {grund}, Not-Stop abgelehnt ({type(ex).__name__}) — Short {menge:g} OHNE Stop, bitte sofort prüfen!")


def _stop_preis(signal, frueher, kurs, seite):
    """Gültiger Stop-Kurs für long (seite +1, unter dem Kurs) bzw. short (−1, über dem Kurs): zuerst der des Signals, sonst
    der zuletzt benutzte, sonst ein Ersatz 5 % vom Kurs — nie eine Position ohne Stop, nur weil der Kurs fehlt."""
    for p in (signal, frueher):
        if p and (p < kurs if seite > 0 else p > kurs):
            return float(p)
    return kurs * (1 - NOT_STOP_ABSTAND * seite)


def _spot_stops_weg(spot, buch, k, sym):
    """EIGENE Spot-Stops stornieren (vor einem Verkauf, sie sperren die Coins): die ID aus dem Buch UND alle offenen mit
    eigener Kennung (p2s) — so verschwinden auch Stops, deren Antwort verloren ging. Andere Aufträge bleiben."""
    st = buch["stops"].setdefault(k, {})
    for o in _nochmal(lambda: spot.eigene_stops(sym)):
        if o.get("orderId") != st.get("spot"):
            _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
    if st.get("spot") is not None:
        _nochmal(lambda: spot.abbrechen(sym, st["spot"]))
        st["spot"] = None


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
            konto, funde = _nochmal(s_.konto), []
            for m_, (sym, coin) in COINS.items():
                pos = _nochmal(lambda sym=sym: f_.position_info(sym))[0]
                menge = sum(bestand(konto, coin))
                if pos:
                    funde.append(f"Futures {sym} {pos:+g}")
                if menge * _nochmal(lambda sym=sym: s_.kurs(sym)) >= STAUB_USDT:
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
        if m == "testnetz" and not trocken and _testnetz_schluessel_falsch(s, f):
            # Spielgeld: passen die Schlüssel nicht mehr zum Testnetz (z. B. echte Schlüssel in BINANCE_*), wäre der Not-Aus
            # für immer blockiert — und der alte Pilot gesperrt. Den Testnetz-Stand verwerfen statt ewig zu scheitern.
            try:
                buch_schreiben(datei, m, leer_buch())
                erg["zeilen"].append("ℹ️ Not-Aus Pilot 2.0 (testnetz): Die Schlüssel passen nicht (mehr) zum Testnetz — der "
                                     "Testnetz-Stand (Spielgeld) ist verworfen, er sperrt nichts mehr.")
            except (OSError, BuchKaputt) as ex:
                erg.update(alles_zu=False, warnung=True)
                erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 (testnetz): Schlüssel passen nicht, Buch nicht änderbar ({type(ex).__name__}).")
            continue
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


def _testnetz_schluessel_falsch(spot, fut):
    """Lehnt das Testnetz die Schlüssel ab (401, −2014, −2015, −2008, −1022)? Netzfehler zählen NICHT (dann normaler Not-Aus)."""
    for lesen in (spot.konto, fut.konto):
        try:
            _nochmal(lesen)
        except Exception as ex:  # noqa: BLE001
            if _auth_fehler(ex):
                return True
    return False


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
            uid = _nochmal(spot.konto).get("uid")
        except Exception:  # noqa: BLE001
            uid = None
        if not uid or not buch.get("uid") or str(uid) != str(buch["uid"]):
            erg["alles_zu"] = False
            warn(f"Not-Aus Pilot 2.0 (echt): Schlüssel zeigt nicht nachweislich auf das Pilot-Konto (UID {uid}, beim Start "
                 f"{buch.get('uid')}) — NICHTS angefasst. Den Schlüssel des Pilot-Unterkontos setzen und Not-Aus wiederholen!")
            erg["zeilen"].insert(0, f"🛑 Not-Aus Pilot 2.0 ({modus}): ⚠️ NICHT ALLES GESCHLOSSEN!")
            return erg
    for k, (sym, coin) in COINS.items():
        st = buch["stops"].setdefault(k, {})
        try:  # 0) die ganze Lage lesen, BEVOR etwas angefasst wird — nicht lesbar: nichts anfassen (Stops + Absicherung bleiben)
            pos = _nochmal(lambda: fut.position_info(sym))[0]
            regeln = _nochmal(lambda: spot.regeln2(sym))
            kurs = _nochmal(lambda: spot.kurs(sym))
            frei, gebunden = bestand(_nochmal(spot.konto), coin)
        except Exception as ex:  # noqa: BLE001
            erg["alles_zu"] = False
            warn(f"Not-Aus {modus} {k}: Lage nicht lesbar ({type(ex).__name__}) — NICHTS angefasst (Stops und Absicherung bleiben). "
                 "Not-Aus wiederholen!")
            continue
        pos_vor = pos
        if pos:  # 1) Perpetual zuerst schliessen (sein Stop bleibt bis dahin stehen)
            seite, r = ("BUY" if pos < 0 else "SELL"), None
            try:
                try:
                    r = fut.auftrag(sym, seite, abs(pos), True)
                except BF.BinanceFehler as ex:
                    if ex.code not in (418, 429):
                        raise
                    time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)  # Rate-Limit: sicher nicht ausgeführt → einmal nochmal
                    r = fut.auftrag(sym, seite, abs(pos), True)
                erg["auftraege"].append((k, "perp", seite, abs(pos)))
            except Exception as ex:  # noqa: BLE001
                warn(f"Not-Aus {modus} {k} Perpetual: {type(ex).__name__} {str(ex)[:120]}")
            try:
                pos = _nochmal(lambda: fut.position_info(sym))[0]
            except Exception as ex:  # noqa: BLE001
                if r and r.get("status") == "FILLED" and abs(float(r.get("executedQty") or 0) - abs(pos)) <= abs(pos) * 1e-9 + 1e-12:
                    pos = 0.0  # Position nicht lesbar, aber die Antwort bestätigt: ganz geschlossen
                else:
                    erg["alles_zu"] = False
                    warn(f"Not-Aus {modus} {k}: Position nach dem Schliessen nicht lesbar ({type(ex).__name__}) — Spot bleibt stehen, "
                         "Schutz-Stops auf beiden Seiten. Not-Aus wiederholen!")
                    _notaus_schutz(spot, fut, st, k, sym, coin, None, pos_vor, frei, gebunden, kurs, regeln, warn, modus)
                    continue
        if pos == 0:  # 2) Futures-Aufträge erst NACH dem Schliessen löschen (vorher schützen sie den Short)
            try:
                _nochmal(lambda: fut.alle_abbrechen(sym))
                st["perp"] = None
            except Exception as ex:  # noqa: BLE001
                warn(f"Not-Aus {modus} {k}: Futures-Aufträge nicht (alle) gelöscht ({type(ex).__name__}).")
        behalten = max(0.0, -pos)  # Short noch offen → so viel Spot bleibt als Absicherung stehen
        # 3) alle Aufträge auf diesem Markt weg (geben gesperrte Coins frei), dann alle Coins ausser «behalten» verkaufen —
        #    mehrere Versuche, den Rest jedes Mal neu lesen (ist das Konto kurz nicht lesbar: zuletzt bekannter Stand)
        if (frei + gebunden - behalten) * kurs >= regeln["min_notional"]:
            storno_ok = True
            try:
                for o in _nochmal(lambda: spot.offene(sym)):
                    _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
                st["spot"] = None
            except Exception as ex:  # noqa: BLE001
                storno_ok = False
                warn(f"Not-Aus {modus} {k}: Spot-Aufträge nicht (alle) gelöscht ({type(ex).__name__}) — verkaufe die freien Coins trotzdem.")
            bekannt = frei + (gebunden if storno_ok else 0.0)
            for versuch in range(VERKAUF_VERSUCHE):
                try:
                    bekannt = bestand(_nochmal(spot.konto), coin)[0]
                except Exception:  # noqa: BLE001
                    pass
                m = PL.runde(max(0.0, bekannt - behalten), regeln["step"])
                if m * kurs < regeln["min_notional"]:
                    break
                try:
                    r = spot.markt(sym, "SELL", m)
                    ausg = float(r.get("executedQty") or 0)
                    bekannt = max(0.0, bekannt - ausg)
                    erg["auftraege"].append((k, "spot", "SELL", ausg or m))
                    if r.get("status", "FILLED") == "FILLED" and ausg >= m - regeln["step"] / 2:
                        break  # sonst nur teilweise ausgeführt (z. B. EXPIRED) → Rest im nächsten Versuch
                except BF.UnklarFehler:
                    continue  # der Kontostand im nächsten Versuch zeigt, was übrig ist
                except Exception as ex:  # noqa: BLE001
                    if not _voruebergehend(ex) or versuch == VERKAUF_VERSUCHE - 1:
                        warn(f"Not-Aus {modus} {k} Spot-Verkauf: {type(ex).__name__} {str(ex)[:120]}")
                        break
                    time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)
            frei, gebunden = bekannt, (0.0 if storno_ok else gebunden)
        if behalten:
            warn(f"Not-Aus {modus} {k}: Short ließ sich nicht schliessen — {behalten:g} {coin} bleiben als Absicherung stehen.")
        try:  # 4) nachprüfen — am Kontostand, nicht an einer Annahme
            pos = _nochmal(lambda: fut.position_info(sym))[0]
            frei, gebunden = bestand(_nochmal(spot.konto), coin)
            pruefbar = True
        except Exception as ex:  # noqa: BLE001
            pruefbar = False
            warn(f"{modus} {k}: Nachprüfung nicht möglich ({type(ex).__name__}) — Schutz nach dem zuletzt bekannten Stand, bitte im "
                 "Binance-Konto prüfen!")
        rest = frei + gebunden
        if pruefbar and pos == 0 and rest * kurs < regeln["min_notional"]:
            erg["zeilen"].append(f"✅ {modus} {k}: geschlossen" + (f" (Rest {rest:g} {coin} unter dem Binance-Minimum)" if rest else ""))
            continue
        erg["alles_zu"] = False
        if pruefbar:
            warn(f"{modus} {k}: NICHT alles zu — Perp {pos:+g}, Spot {rest:g} {coin}. Bitte im Binance-Konto prüfen!")
        # was jetzt ungesichert ist, bekommt sofort einen Schutz-Stop (nie Long ohne Absicherung UND ohne Stop)
        _notaus_schutz(spot, fut, st, k, sym, coin, pos, pos_vor, frei, gebunden, kurs, regeln, warn, modus)
    try:
        buch["perp_offen"] = any(_nochmal(lambda m=m: fut.position_info(COINS[m][0]))[0] != 0 for m in COINS)
    except Exception:  # noqa: BLE001
        buch["perp_offen"] = True
    if erg["alles_zu"] and not buch["perp_offen"] and modus == "echt":
        try:
            zurueck = float(_nochmal(fut.konto).get("maxWithdrawAmount", 0) or 0)
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


def _notaus_schutz(spot, fut, st, k, sym, coin, pos, pos_vor, frei, gebunden, kurs, regeln, warn, modus):
    """Not-Aus unvollständig: was jetzt UNGESICHERT ist, bekommt sofort einen Stop — nie ein Long ohne Absicherung UND ohne
    Stop (bis zum nächsten Not-Aus-Versuch können Stunden vergehen). pos=None: Position unbekannt → beide Seiten schützen
    (ein reduceOnly-Stop ohne Position ist harmlos). Gesperrte Coins hält schon ein Auftrag (Stop) fest."""
    long_offen = frei + gebunden - (max(0.0, -pos) if pos is not None else 0.0)
    menge = PL.runde(max(0.0, min(frei, long_offen)), regeln["step"])
    if menge * kurs >= regeln["min_notional"]:
        p = _stop_preis(None, st.get("p_long"), kurs, +1)
        try:
            r = _platziere(lambda: spot.stop_verkauf(sym, menge, p, regeln), lambda: [o.get("orderId") for o in spot.eigene_stops(sym)], "orderId")
            st["spot"], st["p_long"] = r.get("orderId"), p
            warn(f"Not-Aus {modus} {k}: Schutz-Stop gesetzt — {menge:g} {coin} @ {PL.runde(p, regeln['tick']):g}. Not-Aus wiederholen!")
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k}: {menge:g} {coin} ungesichert UND Schutz-Stop abgelehnt ({type(ex).__name__}) — sofort prüfen!")
    short_offen = max(0.0, -(pos_vor if pos is None else pos)) - (0.0 if pos is None else frei + gebunden)
    if short_offen * kurs >= STAUB_USDT:
        try:
            rf = _nochmal(lambda: fut.regeln(sym))
            try:
                gedeckt = sum(float(a.get("quantity") or 0) for a in _nochmal(lambda: fut.eigene_stops(sym)))
            except Exception:  # noqa: BLE001
                gedeckt = 0.0
            fehlt = PL.runde(short_offen - gedeckt, rf["step"]) if short_offen - gedeckt > rf["step"] / 2 else 0.0
            if fehlt > 0:
                p = _stop_preis(None, st.get("p_short"), kurs, -1)
                r = _platziere(lambda: fut.stop_menge(sym, "BUY", fehlt, p, rf["tick"]), lambda: [a.get("algoId") for a in fut.eigene_stops(sym)],
                               "algoId")
                st["perp"], st["p_short"] = r.get("algoId"), p
                warn(f"Not-Aus {modus} {k}: Schutz-Stop für den Short gesetzt — {fehlt:g} @ {PL.runde(p, rf['tick']):g}. Not-Aus wiederholen!")
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k}: Short {short_offen:g} ungesichert UND Schutz-Stop abgelehnt ({type(ex).__name__}) — sofort prüfen!")


def protokoll_schreiben(eintrag):
    try:
        alt = json.loads(PROTOKOLL.read_text()) if PROTOKOLL.exists() else []
    except (OSError, ValueError):
        alt = []
    PROTOKOLL.parent.mkdir(exist_ok=True)
    tmp = Path(str(PROTOKOLL) + ".neu")
    tmp.write_text(json.dumps((alt + [eintrag])[-2000:], ensure_ascii=False, indent=1))
    tmp.replace(PROTOKOLL)  # nie halb geschrieben
