#!/usr/bin/env python3
"""Pilot 2.0 — Ausführung über Binance Spot UND USDⓈ-M Futures.

Rechnung: pilot2_plan.py (Richtung long über Spot, short über Perpetual, freier Teil als Funding-Ernte, Pfand 110 %).
Einschalten: KRYPTO_PILOT2=an UND im Code FREIGEGEBEN = True (erst nach einer unabhängigen Prüfung ohne Blocker).

Sicherungen:
  • TESTNETZ ist Standard: Spot über testnet.binance.vision (BINANCE_API_KEY/SECRET), Futures über testnet.binancefuture.com
    (BINANCE_FUTURES_API_KEY/SECRET). Im Testnetz gibt es kein Verschieben zwischen den Konten → beide Test-Konten brauchen USDT.
  • Echtes Geld NUR, wenn ALLES gesetzt ist: BINANCE_TESTNET=false, BINANCE_FUTURES_TESTNET=false,
    KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD" und KRYPTO_PILOT2=an. Dann EIN Schlüssel PILOT2_API_KEY/PILOT2_API_SECRET.
  • EIGENES KONTO (Echtgeld): Beim ersten Lauf muss das Binance-Konto bis auf USDT LEER sein — keine BTC/ETH, keine offenen
    Aufträge, keine Futures-Positionen, kein Futures-Guthaben. Sonst handelt Pilot 2.0 nicht. Danach gehört ihm alles darin.
  • Rechteprüfung vor jedem Echtgeld-Aufbau: Auszahlungen, Margin-Leihe und Überweisung an andere Nutzer AUS; Spot-Handel,
    Futures und «Universal Transfer» (Verschieben zwischen DEINEN Konten) AN. Sonst: kein Auftrag.
  • Buch (data/krypto-pilot2-bestand.json, je Modus): USDT (Deckel = Verlustgrenze), Coins, eigene Stop-IDs, unklare Aufträge.
    Spot-Käufe nie über das eigene USDT-Buch hinaus; Verluste werden nicht nachgefüllt.
  • Not-Aus (KI_BOT_STOP=1, Datei STOP, Cockpit, Telegram, stop.bat, Tagesaufgabe) hat Vorrang vor allem. Er schliesst JEDEN
    Modus, in dem das Buch etwas zeigt, mit den Schlüsseln dieses Modus — unabhängig von den Freigabe-Schaltern. Erst Perpetual
    schliessen; scheitert das, bleibt der Ernte-Spot als Absicherung stehen. «Alles zu» nur, wenn nachgeprüft.
  • Stops nur auf den TATSÄCHLICHEN Richtungsteil, immer am Ende gesetzt; Spot STOP_LOSS (Markt) wenn erlaubt.
    Scheitert das Löschen eines alten Stops, wird für diesen Markt KEIN neuer gesetzt (keine Doppel-Stops).
  • Scheitert der Short einer neuen Ernte, wird der Ernte-Spot zurückverkauft; ist sein Status unklar, wird zuerst die
    Position nachgelesen (kein Rückverkauf, wenn der Short in Wahrheit ausgeführt wurde).
"""
from __future__ import annotations

import json
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
# KRYPTO_PILOT2=an wirkungslos und der Pilot handelt wie bisher. Der Not-Aus für vorhandenen Bestand wirkt immer.
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
UNKLAR_AUFGEBEN_S = 86400       # «Auftrag existiert nicht» (−2013) erst nach 1 Tag als «nie ausgeführt» werten
STAUB_USDT = 5.0                # darunter gilt ein Bestand als leer
GEBUEHREN_RESERVE = 0.005       # 0,5 % des verwalteten Geldes bleiben für Gebühren frei


def aktiv(env=None):
    env = os.environ if env is None else env
    return FREIGEGEBEN and (env.get("KRYPTO_PILOT2") or "").strip().lower() == "an"


def einstellungen(env=None, modus=None):
    """modus=None: aus den Schaltern. modus="echt"/"testnetz": erzwingen (für den Not-Aus eines vorhandenen Bestands)."""
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
            "anteil": max(0.0, min(1.0, zahl("KI_BOT_ANTEIL", 0.5))), "max_auftrag": max(0.0, zahl("KI_BOT_MAX_AUFTRAG", 1000)),
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


# ───────────────────────── Buch ─────────────────────────
def leer_buch():
    return {"coins": {}, "usdt": None, "stops": {}, "unklar": [], "perp_offen": False, "start": None}


def buch_lesen(datei, modus):
    try:
        b = (json.loads(Path(datei).read_text()).get(modus)) or {}
    except (OSError, ValueError, AttributeError):
        b = {}
    out = leer_buch()
    out.update({k: v for k, v in b.items() if k in out})
    out["coins"] = {k: float(v) for k, v in (out["coins"] or {}).items()}
    return out


def buch_schreiben(datei, modus, buch):
    try:
        alt = json.loads(Path(datei).read_text()) if Path(datei).exists() else {}
    except ValueError:
        alt = {}
    alt[modus] = buch
    Path(datei).parent.mkdir(exist_ok=True)
    tmp = Path(str(datei) + ".neu")
    tmp.write_text(json.dumps(alt, indent=1))
    tmp.replace(datei)  # nie halb geschrieben


def _offen(b):
    return (any(float(v) > 0 for v in (b.get("coins") or {}).values()) or bool(b.get("unklar")) or bool(b.get("perp_offen"))
            or any(v for st in (b.get("stops") or {}).values() for k, v in (st or {}).items() if k in ("spot", "perp")))


def modi_mit_bestand(datei=None):
    try:
        alles = json.loads(Path(datei or BESTAND).read_text())
    except (OSError, ValueError):
        return []
    return [m for m, b in alles.items() if isinstance(b, dict) and _offen(b)]


def hat_bestand(datei=None):
    """Gibt es (in irgendeinem Modus) noch Pilot-2.0-Coins, -Positionen, -Stops oder unklare Aufträge?"""
    return bool(modi_mit_bestand(datei))


def bestand(konto, asset):
    for b in konto.get("balances", []):
        if b["asset"] == asset:
            return float(b.get("free", 0) or 0), float(b.get("locked", 0) or 0)
    return 0.0, 0.0


def fuellung(r, coin):
    """Spot-Antwort → (Coins netto, USDT netto) aus Sicht des Kontos; Gebühren aus fills, falls vorhanden."""
    menge = float(r.get("executedQty") or 0)
    quote = float(r.get("cummulativeQuoteQty") or 0)
    geb_coin = sum(float(f.get("commission") or 0) for f in r.get("fills") or [] if f.get("commissionAsset") == coin)
    geb_usdt = sum(float(f.get("commission") or 0) for f in r.get("fills") or [] if f.get("commissionAsset") == "USDT")
    if r.get("side") == "SELL":
        return -menge - geb_coin, quote - geb_usdt
    return menge - geb_coin, -quote - geb_usdt


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
            fehler = BF.UnklarFehler(f"Spot-Status unklar ({cid})")
            fehler.cid = cid
            raise fehler from ex

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
             "newOrderRespType": "ACK"}
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
                                                        "reduceOnly": "true", "workingType": "MARK_PRICE", "priceProtect": "true"},
                         signiert=True)

    def offene_algos(self, symbol):
        return [o for o in (self._req("GET", "/fapi/v1/openAlgoOrders", {"symbol": symbol}, signiert=True) or []) if isinstance(o, dict)]

    def algo_abbrechen(self, symbol, algo_id):
        """Storno; bei einer Fehlermeldung nachsehen, ob der Auftrag noch offen ist (Fehlercodes sind nicht dokumentiert)."""
        try:
            self._req("DELETE", "/fapi/v1/algoOrder", {"algoId": algo_id}, signiert=True)
        except (BF.BinanceFehler, *BF.NETZFEHLER):
            if any(str(o.get("algoId")) == str(algo_id) for o in self.offene_algos(symbol)):
                raise

    def position_info(self, symbol):
        for p in self._req("GET", "/fapi/v2/positionRisk", {"symbol": symbol}, signiert=True) or []:
            if p.get("symbol") == symbol:
                return float(p.get("positionAmt", 0) or 0), float(p.get("leverage", 1) or 1)
        return 0.0, 1.0

    def offene_auftraege(self, symbol):
        return self._req("GET", "/fapi/v1/openOrders", {"symbol": symbol}, signiert=True) or []


def rechte_ok(r):
    """Echtgeld-Schlüssel: Auszahlung/Margin/Überweisung an Dritte AUS; Spot, Futures, Universal Transfer AN."""
    verboten = [k for k in ("enableWithdrawals", "enableMargin", "enableInternalTransfer") if r.get(k)]
    fehlt = [k for k in ("enableSpotAndMarginTrading", "enableFutures", "permitsUniversalTransfer") if not r.get(k)]
    return not verboten and not fehlt, verboten, fehlt


def startpruefung(spot, fut, cfg):
    """Echtgeld, erster Lauf: Konto bis auf USDT leer? → Liste der Gründe, warum nicht (leer = ok)."""
    gruende = []
    konto = spot.konto()
    for m, (sym, coin) in COINS.items():
        menge = sum(bestand(konto, coin))
        if menge * spot.kurs(sym) >= STAUB_USDT:
            gruende.append(f"{menge:g} {coin} im Spot-Konto")
        if spot.offene(sym):
            gruende.append(f"offene Spot-Aufträge {sym}")
        if fut.position_info(sym)[0]:
            gruende.append(f"Futures-Position {sym}")
        if fut.offene_algos(sym) or fut.offene_auftraege(sym):
            gruende.append(f"offene Futures-Aufträge {sym}")
    if cfg["echtgeld"] and float(fut.konto().get("totalWalletBalance", 0) or 0) > 1:
        gruende.append("Guthaben im Futures-Konto (Pilot 2.0 verschiebt sein Pfand selbst)")
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
    buch = buch_lesen(datei, cfg["modus"])

    def speichern():
        buch_schreiben(datei, cfg["modus"], buch)
    if cfg["echtgeld"]:
        ok, verboten, fehlt = rechte_ok(spot.rechte())
        if not ok:
            warn(f"Schlüssel-Rechte falsch — kein Auftrag. Ausschalten: {', '.join(verboten) or '–'}; einschalten: {', '.join(fehlt) or '–'}.")
            return erg
        if fut.hedge_modus():
            warn("Futures-Konto steht im Hedge-Modus — Pilot 2.0 braucht den Einweg-Modus. Kein Auftrag.")
            return erg
    if not buch["start"]:
        gruende = startpruefung(spot, fut, cfg) if cfg["echtgeld"] else [g for g in startpruefung(spot, fut, cfg)
                                                                          if "Position" in g or "Aufträge" in g]
        if gruende:
            warn("Pilot 2.0 braucht ein Konto nur für sich — beim Start bis auf USDT leer. Gefunden: " + "; ".join(gruende)
                 + ". Alter Pilot? Zuerst Not-Aus (stop.bat), Rest von Hand aufräumen. Kein Auftrag.")
            return erg

    gesperrt, ohne_stop_neu = set(), set()
    _abgleich(spot, fut, buch, speichern, warn, gesperrt)

    ents = [dict(e) for e in ents if e["markt"] in COINS]
    gewaehlt = {e["markt"] for e in ents}
    for m in COINS:
        if m not in gewaehlt and (buch["coins"].get(m, 0) > 0 or fut.position_info(COINS[m][0])[0] != 0):
            ents.append({"markt": m, "hebel": 0.0, "abgewaehlt": True})
            erg["zeilen"].append(f"{m} ist abgewählt — Bestand wird abgebaut.")
    if not ents:
        return erg

    konto_s = spot.konto()
    usdt_frei = bestand(konto_s, "USDT")[0]
    konto_f = fut.konto()
    f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0)
    f_offen = float(konto_f.get("totalUnrealizedProfit", 0) or 0)
    daten, coin_wert = {}, 0.0
    for e in ents:
        sym, coin = COINS[e["markt"]]
        frei, gebunden = bestand(konto_s, coin)
        ist = frei + gebunden
        if cfg["echtgeld"] and buch["start"]:
            buch["coins"][e["markt"]] = ist  # eigenes Konto: alles darin gehört Pilot 2.0 (Gebühren, Stops, Rundung erledigt)
        elif buch["coins"].get(e["markt"], 0) > ist + 1e-12:
            buch["coins"][e["markt"]] = ist
        mein = buch["coins"].get(e["markt"], 0.0)
        pos, hebel_ist = fut.position_info(sym)
        daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": mein, "perp": pos, "hebel_ist": hebel_ist, "kurs": spot.kurs(sym),
                             "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
        coin_wert += mein * daten[e["markt"]]["kurs"]
    if not buch["start"]:  # erster Lauf: Zuteilung bis zum Deckel
        buch["usdt"] = max(0.0, min(usdt_frei, cfg["deckel"] - coin_wert - f_saldo - f_offen))
        buch["start"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        erg["zeilen"].append(f"Pilot 2.0 gestartet: {buch['usdt']:.2f} USDT zugeteilt (Deckel {cfg['deckel']:.0f}).")
    buch["usdt"] = max(0.0, min(buch["usdt"] or 0.0, usdt_frei))
    speichern()
    kapital = buch["usdt"] + coin_wert + f_saldo + f_offen
    erg["kapital"] = round(kapital, 2)
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
        erg["zeilen"].append(f"Pilot-Kapital {kapital:.2f} USDT, verwaltet {verwaltet:.2f}, Pfand-Ziel {pfand:.2f}")
        return erg

    def notaus_neu():
        return env_.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists()

    def schritt(k, konto, seite, menge, reduce):
        """→ ausgeführte Menge (0 = nichts, None = gescheitert/unklar)."""
        d = daten[k]
        if konto == "spot" and seite == "BUY":  # nie über das eigene USDT-Buch hinaus
            leistbar = PL.runde((buch["usdt"] or 0.0) / (d["kurs"] * 1.003), d["rs"]["step"])
            if leistbar < menge:
                warn(f"{k}: Pilot-Geld reicht nur für {leistbar:g} statt {menge:g} {d['coin']} — weniger gekauft.")
                menge = leistbar
            if menge * d["kurs"] < d["rs"]["min_notional"]:
                return 0.0
        pos_vor = None
        try:
            if konto == "spot":
                r = spot.markt(d["sym"], seite, menge)
                dc, du = fuellung(r, d["coin"])
                buch["coins"][k] = max(0.0, buch["coins"].get(k, 0.0) + dc)
                buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + du)
                speichern()
                gemacht = abs(dc) if seite == "SELL" else max(0.0, dc)
            else:
                pos_vor = fut.position_info(d["sym"])[0]
                buch["perp_offen"] = True
                speichern()
                fut.auftrag(d["sym"], seite, menge, reduce)
                gemacht = menge
            erg["auftraege"].append((k, konto, seite, menge))
            return gemacht
        except BF.UnklarFehler as ex:
            gesperrt.add(k)
            if konto == "spot":
                buch["unklar"].append({"markt": k, "sym": d["sym"], "cid": getattr(ex, "cid", ""), "seite": seite,
                                       "zeit": int(time.time())})
                speichern()
                warn(f"{k} Spot {seite} {menge:g}: Status unklar — Markt gesperrt, bis geklärt.")
                return None
            try:  # Perp: Position nachlesen statt raten
                nach = fut.position_info(d["sym"])[0]
            except Exception:  # noqa: BLE001
                nach = None
            erwartet = (pos_vor or 0.0) + (menge if seite == "BUY" else -menge)
            if nach is not None and abs(nach - erwartet) < 1e-9:
                erg["auftraege"].append((k, konto, seite, menge))
                warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt AUSGEFÜHRT.")
                return menge
            if nach is not None and pos_vor is not None and abs(nach - pos_vor) < 1e-9:
                warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt NICHT ausgeführt.")
                return None
            warn(f"{k} Perp {seite} {menge:g}: Status UNKLAR (Position {nach}) — Markt gesperrt, kein Rückverkauf. Bitte prüfen!")
            return "unklar"
        except Exception as ex:  # noqa: BLE001
            gesperrt.add(k)
            warn(f"{k} {konto} {seite} {menge:g} abgelehnt: {type(ex).__name__} {str(ex)[:120]}")
        return None

    try:
        # 1) eigene alte Stops weg. Scheitert das, KEINE Änderung und KEIN neuer Stop für diesen Markt (keine Doppel-Stops)
        for k in plaene:
            try:
                _stops_weg(spot, fut, buch, k, daten[k]["sym"])
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: alter Stop nicht gelöscht ({type(ex).__name__}) — heute keine Änderung, alter Stop bleibt.")
                gesperrt.add(k)
                ohne_stop_neu.add(k)
            speichern()
        # 2) verkleinern
        for k, p in plaene.items():
            for konto, seite, m, red in p["schritte"]:
                if k in gesperrt or notaus_neu():
                    break
                if red or (konto == "spot" and seite == "SELL"):
                    schritt(k, konto, seite, m, red)
        # 3) Geld verschieben (nur echt; im Testnetz sind die Konten getrennt)
        usdt_frei = bestand(spot.konto(), "USDT")[0]
        konto_f = fut.konto()
        f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0)
        f_abziehbar = float(konto_f.get("maxWithdrawAmount", f_saldo) or 0)
        mein_usdt = min(buch["usdt"] or 0.0, usdt_frei)
        bedarf = sum(m * daten[k]["kurs"] * 1.003 for k, p in plaene.items() if k not in gesperrt
                     for konto, seite, m, _ in p["schritte"] if konto == "spot" and seite == "BUY")
        uw = PL.verschieben(pfand, f_saldo, f_abziehbar, mein_usdt, bedarf)
        if uw and cfg["echtgeld"] and not notaus_neu():
            try:
                spot.verschieben(*uw)
                buch["usdt"] = (buch["usdt"] or 0.0) + (-uw[1] if uw[0] == "SPOT_ZU_FUTURES" else uw[1])
                speichern()
                erg["auftraege"].append(("konto", uw[0], uw[1]))
            except Exception as ex:  # noqa: BLE001
                warn(f"Verschieben {uw[0]} {uw[1]:.2f} USDT gescheitert: {type(ex).__name__} — Vergrössern heute ausgesetzt.")
                gesperrt.update(plaene)
        elif uw and not cfg["echtgeld"]:
            erg["zeilen"].append(f"Testnetz: kein Verschieben möglich ({uw[0]} {uw[1]:.2f} USDT wäre nötig) — beide Test-Konten mit USDT füllen.")
        # 4) vergrössern: Spot, dann Short; scheitert der Short einer neuen Ernte → Ernte-Spot zurückverkaufen
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
                    richtung_ist = buch["coins"].get(k, 0.0) + fut.position_info(d["sym"])[0]
                    rest = max(0.0, p["stop_spot"] - max(0.0, richtung_ist))
                    kaeufe = [("spot", "BUY", PL.runde(rest, d["rs"]["step"]), False)] if rest * d["kurs"] >= d["rs"]["min_notional"] else []
                    shorts = []
            gekauft = 0.0
            for konto, seite, m, red in kaeufe:
                if notaus_neu():
                    break
                gekauft += schritt(k, konto, seite, m, red) or 0.0
            for konto, seite, m, red in shorts:
                if k in gesperrt or notaus_neu():
                    break
                r = schritt(k, konto, seite, m, red)
                if r is None and gekauft > 0:  # sicher NICHT ausgeführt → Ernte-Spot zurück
                    zurueck = PL.runde(min(gekauft, m, buch["coins"].get(k, 0.0)), d["rs"]["step"])
                    if zurueck * d["kurs"] >= d["rs"]["min_notional"]:
                        gesperrt.discard(k)
                        if schritt(k, "spot", "SELL", zurueck, False):
                            erg["zeilen"].append(f"{k}: Ernte-Short gescheitert → {zurueck:g} {d['coin']} zurückverkauft.")
                        gesperrt.add(k)
    finally:
        _stops_setzen(spot, fut, buch, speichern, ents, daten, plaene, ohne_stop_neu, basis_g, erg, warn)
    try:
        buch["perp_offen"] = any(fut.position_info(COINS[m][0])[0] != 0 for m in COINS)
        speichern()
    except Exception:  # noqa: BLE001
        pass
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


def _stops_setzen(spot, fut, buch, speichern, ents, daten, plaene, ohne_stop_neu, basis_g, erg, warn):
    """Stops aus dem TATSÄCHLICHEN Bestand: long → Spot-Stop über min(Netto, eigene freie Coins); short → Perp-Stop über
    min(−Netto, Short). Märkte, deren alter Stop nicht gelöscht werden konnte, bekommen keinen zweiten."""
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        try:
            konto_s = spot.konto()
            frei, gebunden = bestand(konto_s, d["coin"])
            mein = min(buch["coins"].get(k, 0.0), frei + gebunden)
            buch["coins"][k] = mein
            pos, _ = fut.position_info(d["sym"])
            netto = mein + pos
            z = e.get("z", 0)
            stop_spot = PL.runde(min(max(0.0, netto), mein, frei), d["rs"]["step"]) if z > 0 else 0.0
            stop_perp = PL.runde(min(max(0.0, -netto), abs(min(pos, 0.0))), d["rf"]["step"]) if z < 0 else 0.0
            st = buch["stops"].setdefault(k, {})
            if k in ohne_stop_neu:
                if z:
                    warn(f"{k}: alter Stop bleibt aktiv (Löschen gescheitert) — kein neuer gesetzt.")
            else:
                if stop_spot > 0 and stop_spot * d["kurs"] >= d["rs"]["min_notional"]:
                    r = spot.stop_verkauf(d["sym"], stop_spot, e["stop_long"], d["rs"])
                    st["spot"], st["spot_menge"], st["spot_quote"] = r.get("orderId"), 0.0, 0.0
                if stop_perp > 0:
                    r = fut.stop_menge(d["sym"], "BUY", stop_perp, e["stop_short"], d["rf"]["tick"])
                    st["perp"] = r.get("algoId")
            speichern()
            richtung = netto * d["kurs"] / basis_g if basis_g else 0.0
            erg["zeilen"].append(f"{k}: Spot {mein:g} {d['coin']}, Perp {pos:+g}, Richtung {richtung:+.2f} (Ziel {z:+.2f})"
                                 + (f", Stop {stop_spot:g} @ {e['stop_long']:g}" if stop_spot else "")
                                 + (f", Stop {stop_perp:g} @ {e['stop_short']:g}" if stop_perp else ""))
            if z and k not in ohne_stop_neu and not (stop_spot or stop_perp) and abs(netto) * d["kurs"] >= d["rs"]["min_notional"]:
                warn(f"{k}: Richtungs-Position ohne Stop — bitte prüfen!")
            if not z and basis_g and abs(netto) * d["kurs"] > 0.25 * basis_g:
                warn(f"{k}: ungewollte Richtung {richtung:+.2f} ohne Stop (Ziel 0) — nächster Lauf gleicht aus, bitte prüfen.")
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")


def _stops_weg(spot, fut, buch, k, sym):
    """Nur EIGENE Stops stornieren (IDs aus dem Buch). ID erst nach bestätigtem Storno aus dem Buch nehmen."""
    st = buch["stops"].setdefault(k, {})
    if st.get("spot") is not None:
        spot.abbrechen(sym, st["spot"])
        st["spot"], st["spot_menge"], st["spot_quote"] = None, 0.0, 0.0
    if st.get("perp") is not None:
        fut.algo_abbrechen(sym, st["perp"])
        st["perp"] = None


def _abgleich(spot, fut, buch, speichern, warn, gesperrt):
    """Vor dem Handel: unklare Aufträge klären, ausgelöste eigene Spot-Stops vom Buch abziehen."""
    offen = []
    for u in buch["unklar"]:
        try:
            o = spot.auftrag_lesen(u["sym"], cid=u["cid"])
        except BB.BinanceFehler as ex:
            if "-2013" in str(ex.msg) and time.time() - u.get("zeit", time.time()) > UNKLAR_AUFGEBEN_S:
                warn(f"{u['markt']}: früherer Auftrag {u['cid']} existiert bei Binance nicht — als «nie ausgeführt» abgeschlossen.")
                continue
            o = None
        except Exception:  # noqa: BLE001
            o = None
        if o and o.get("status") in ("FILLED", "PARTIALLY_FILLED", "CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
            dc, du = fuellung({**o, "side": u["seite"]}, COINS[u["markt"]][1])
            buch["coins"][u["markt"]] = max(0.0, buch["coins"].get(u["markt"], 0.0) + dc)
            buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + du)
        else:
            offen.append(u)
            gesperrt.add(u["markt"])
            warn(f"{u['markt']}: früherer Auftrag {u['cid']} noch unklar — Markt gesperrt, bitte im Binance-Konto prüfen.")
    buch["unklar"] = offen
    for k, st in buch["stops"].items():
        if st.get("spot") is None:
            continue
        try:
            o = spot.auftrag_lesen(COINS[k][0], order_id=st["spot"])
        except Exception:  # noqa: BLE001
            continue
        menge = float(o.get("executedQty") or 0)
        quote = float(o.get("cummulativeQuoteQty") or 0)
        neu_m, neu_q = menge - st.get("spot_menge", 0.0), quote - st.get("spot_quote", 0.0)  # Teilausführung nur einmal zählen
        if neu_m > 0:
            buch["coins"][k] = max(0.0, buch["coins"].get(k, 0.0) - neu_m)
            buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + neu_q * 0.999)
            st["spot_menge"], st["spot_quote"] = menge, quote
            warn(f"{k}: Spot-Stop wurde ausgelöst ({neu_m:g} {COINS[k][1]} verkauft) — Buch angepasst.")
        if o.get("status") in ("FILLED", "CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
            st["spot"], st["spot_menge"], st["spot_quote"] = None, 0.0, 0.0
    speichern()


# ───────────────────────── Not-Aus ─────────────────────────
def notaus_alle(env=None, datei=None, trocken=False, spot=None, fut=None, protokolliere=None):
    """Jeden Modus schliessen, in dem das Buch etwas zeigt (dazu den aktuell eingestellten), mit den Schlüsseln DIESES Modus —
    egal wie die Freigabe-Schalter gerade stehen. «alles_zu» nur, wenn jeder Modus nachgeprüft zu ist."""
    env = os.environ if env is None else env
    datei = datei or BESTAND
    modi = list(dict.fromkeys(modi_mit_bestand(datei) + ([einstellungen(env)["modus"]] if aktiv(env) else [])))
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": ",".join(modi) or None, "alles_zu": True}
    if not modi:
        erg["zeilen"].append("Not-Aus Pilot 2.0: nichts offen.")
        return erg
    for m in modi:
        cfg = einstellungen(env, modus=m)
        if not (cfg["spot"]["key"] and cfg["futures"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["secret"]):
            erg["alles_zu"] = False
            erg["warnung"] = True
            erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 ({m}): Bestand vorhanden, aber Schlüssel fehlen — NICHT geschlossen. "
                                 + ("PILOT2_API_KEY/SECRET setzen" if m == "echt" else "Testnetz-Schlüssel setzen") + " und Not-Aus wiederholen!")
            continue
        s = spot if spot is not None and len(modi) == 1 else Spot(cfg["spot"]) if spot is None else spot
        f = fut if fut is not None and len(modi) == 1 else Fut(cfg["futures"]) if fut is None else fut
        r = _notaus(s, f, buch_lesen(datei, m), lambda b, m=m: buch_schreiben(datei, m, b), m, trocken)
        erg["zeilen"] += r["zeilen"]
        erg["auftraege"] += r["auftraege"]
        erg["warnung"] = erg["warnung"] or r["warnung"]
        erg["alles_zu"] = None if trocken else (erg["alles_zu"] and r["alles_zu"])
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
        speichern_b(buch)
    try:
        _abgleich(spot, fut, buch, speichern, lambda t: erg["zeilen"].append("ℹ️ " + t), set())
    except Exception as ex:  # noqa: BLE001
        warn(f"Abgleich vor dem Not-Aus nicht möglich ({type(ex).__name__}).")
    for k, (sym, coin) in COINS.items():
        if trocken:
            erg["zeilen"].append(f"Not-Aus (trocken, {modus}): {k} würde schliessen")
            continue
        perp_zu = False
        try:  # 1) Perpetual zuerst schliessen (sein Stop bleibt bis dahin stehen)
            pos = fut.position_info(sym)[0]
            if pos:
                fut.auftrag(sym, "BUY" if pos < 0 else "SELL", abs(pos), True)
                erg["auftraege"].append((k, "perp", "BUY" if pos < 0 else "SELL", abs(pos)))
            perp_zu = fut.position_info(sym)[0] == 0
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k} Perpetual: {type(ex).__name__} {str(ex)[:120]}")
        try:  # 2) Perp-Stop erst NACH dem Schliessen löschen
            if perp_zu and buch["stops"].get(k, {}).get("perp") is not None:
                fut.algo_abbrechen(sym, buch["stops"][k]["perp"])
                buch["stops"][k]["perp"] = None
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k}: Perp-Stop nicht gelöscht ({type(ex).__name__}).")
        try:  # 3) Spot: alles Eigene verkaufen — ausser der Short ist noch offen: dann nur den ungesicherten Überschuss
            st = buch["stops"].setdefault(k, {})
            if st.get("spot") is not None:
                spot.abbrechen(sym, st["spot"])
                st["spot"], st["spot_menge"], st["spot_quote"] = None, 0.0, 0.0
            frei, gebunden = bestand(spot.konto(), coin)
            mein = min(buch["coins"].get(k, 0.0), frei)
            behalten = 0.0 if perp_zu else max(0.0, -fut.position_info(sym)[0])
            regeln = spot.regeln2(sym)
            m = PL.runde(max(0.0, mein - behalten), regeln["step"])
            if m > 0 and m * spot.kurs(sym) >= regeln["min_notional"]:
                r = spot.markt(sym, "SELL", m)
                dc, du = fuellung(r, coin)
                buch["coins"][k] = max(0.0, buch["coins"].get(k, 0.0) + dc)
                buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + du)
                erg["auftraege"].append((k, "spot", "SELL", m))
            if behalten:
                warn(f"Not-Aus {modus} {k}: Short ließ sich nicht schliessen — {behalten:g} {coin} bleiben als Absicherung stehen.")
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k} Spot: {type(ex).__name__} {str(ex)[:120]}")
        speichern()
        try:  # 4) nachprüfen
            pos = fut.position_info(sym)[0]
            frei, gebunden = bestand(spot.konto(), coin)
            rest = min(buch["coins"].get(k, 0.0), frei + gebunden)
            buch["coins"][k] = rest
            rest_wert = rest * spot.kurs(sym)
            regeln = spot.regeln2(sym)
            if pos != 0 or rest_wert >= regeln["min_notional"]:
                erg["alles_zu"] = False
                warn(f"{modus} {k}: NICHT alles zu — Perp {pos:+g}, eigene Spot-Coins {rest:g}. Bitte im Binance-Konto prüfen!")
            else:
                erg["zeilen"].append(f"✅ {modus} {k}: geschlossen" + (f" (Rest {rest:g} {coin} unter dem Binance-Minimum)" if rest else ""))
        except Exception as ex:  # noqa: BLE001
            erg["alles_zu"] = False
            warn(f"{modus} {k}: Nachprüfung nicht möglich ({type(ex).__name__}) — bitte im Binance-Konto prüfen!")
    if buch["unklar"]:
        erg["alles_zu"] = False
        warn(f"{modus}: {len(buch['unklar'])} unklare(r) Spot-Auftrag/Aufträge — es können noch Coins da sein. Bitte im Binance-Konto prüfen!")
    if trocken:
        erg["alles_zu"] = None
        erg["zeilen"].insert(0, f"🛑 Not-Aus Pilot 2.0 ({modus}): Probelauf — nichts geschlossen.")
        return erg
    try:
        buch["perp_offen"] = any(fut.position_info(COINS[m][0])[0] != 0 for m in COINS)
    except Exception:  # noqa: BLE001
        buch["perp_offen"] = True
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
