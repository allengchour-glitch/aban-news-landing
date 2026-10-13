#!/usr/bin/env python3
"""Pilot 2.0 — Ausführung über Binance Spot UND USDⓈ-M Futures.

Rechnung: pilot2_plan.py (Richtung long über Spot, short über Perpetual, freier Teil als Funding-Ernte, Pfand 100 %).
Einschalten: KRYPTO_PILOT2=an (sonst handelt der Pilot wie bisher alles über Futures).

Sicherungen:
  • TESTNETZ ist Standard: Spot über testnet.binance.vision (BINANCE_API_KEY/SECRET), Futures über testnet.binancefuture.com
    (BINANCE_FUTURES_API_KEY/SECRET). Im Testnetz gibt es kein Verschieben zwischen den Konten → beide Test-Konten brauchen USDT.
  • Echtes Geld NUR, wenn ALLES gesetzt ist: BINANCE_TESTNET=false, BINANCE_FUTURES_TESTNET=false,
    KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD" und KRYPTO_PILOT2=an. Dann EIN Schlüssel PILOT2_API_KEY/PILOT2_API_SECRET.
  • Rechteprüfung vor jedem Echtgeld-Aufbau: Auszahlungen, Margin-Leihe und Überweisung an andere Nutzer AUS; Spot-Handel,
    Futures und «Universal Transfer» (Verschieben zwischen DEINEN Konten) AN. Sonst: kein Auftrag.
  • Eigenes Buch (data/krypto-pilot2-bestand.json): eigene Coins, eigene USDT, eigene Stop-Aufträge, unklare Aufträge.
    Pilot 2.0 verkauft nie mehr Coins als er selbst gekauft hat, storniert nur seine eigenen Aufträge, zieht ausgelöste Stops
    und Gebühren vom Buch ab und klärt unklare Aufträge vor dem nächsten Handel.
  • Deckel = Verlustgrenze: KRYPTO_PILOT2_KAPITAL (USDT, für echtes Geld Pflicht). Beim ersten Lauf bekommt Pilot 2.0 so viel
    zugeteilt; danach handelt er nur mit SEINEM Geld (Gewinne bleiben bis zum Deckel drin, Verluste werden NICHT aus deinem
    übrigen Geld nachgefüllt).
  • Anderer Bot im selben Konto (Spot-Bot KRYPTO_BROKER=binance, ETH-Sparplan, kopierte Calls) → kein Aufbau.
  • Hebel 1, ISOLATED, nur Marktaufträge, Verkleinern mit reduceOnly; höchstens KI_BOT_MAX_AUFTRAG USDT je Auftrag.
  • Not-Aus (KI_BOT_STOP=1, Datei STOP, Cockpit, stop.bat) hat Vorrang vor allem (auch vor Pause und fehlenden Einstellungen):
    eigene Stops weg, Perpetual zurückkaufen, eigene Spot-Coins verkaufen — je Konto einzeln, danach nachgeprüft.
  • Stops nur auf den TATSÄCHLICHEN Richtungsteil (nach den Aufträgen neu gelesen), Spot als STOP_LOSS (Markt) wenn erlaubt,
    sonst STOP_LOSS_LIMIT 5 % unter dem Stop; Perpetual STOP_MARKET mit Menge + reduceOnly. Stops werden immer am Ende gesetzt
    (auch wenn mitten im Lauf etwas scheitert). Kein Aufbau in eine Richtung, deren Stop schon überschritten ist.
  • Scheitert der Short-Teil einer neuen Ernte, wird der eben dafür gekaufte Spot sofort zurückverkauft.
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


def aktiv(env=None):
    env = os.environ if env is None else env
    return (env.get("KRYPTO_PILOT2") or "").strip().lower() == "an"


def einstellungen(env=None):
    env = os.environ if env is None else env
    echt = ((env.get("BINANCE_TESTNET") or "true").strip().lower() == "false"
            and (env.get("BINANCE_FUTURES_TESTNET") or "true").strip().lower() == "false"
            and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ and aktiv(env))
    s_url, f_url = env.get("PILOT2_SPOT_URL"), env.get("PILOT2_FUTURES_URL")
    fehler = ""
    for url, erlaubt, name in ((s_url, HOSTS_SPOT, "Spot"), (f_url, HOSTS_FUT, "Futures")):
        if url and urllib.parse.urlparse(url).hostname not in erlaubt[echt]:
            fehler = f"{name}-Adresse passt nicht zum Modus {'Echtgeld' if echt else 'Testnetz'} — aus Sicherheit keine Aufträge."
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


# ───────────────────────── eigenes Buch ─────────────────────────
def leer_buch():
    return {"coins": {}, "usdt": None, "stops": {}, "unklar": []}


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


def hat_bestand(datei=None):
    """Gibt es (in irgendeinem Modus) noch Pilot-2.0-Coins, -Stops oder unklare Aufträge? Dann darf der alte Pilot nicht ran."""
    try:
        alles = json.loads(Path(datei or BESTAND).read_text())
    except (OSError, ValueError):
        return False
    for b in alles.values():
        if any(float(v) > 0 for v in (b.get("coins") or {}).values()) or b.get("unklar") or any((b.get("stops") or {}).values()) \
                or b.get("perp_offen"):
            return True
    return False


def bestand(konto, asset):
    for b in konto.get("balances", []):
        if b["asset"] == asset:
            return float(b.get("free", 0) or 0), float(b.get("locked", 0) or 0)
    return 0.0, 0.0


def fuellung(r, coin):
    """Spot-Antwort (FULL) → (Coins netto, USDT netto) aus Sicht des Kontos; Gebühren berücksichtigt."""
    menge = float(r.get("executedQty") or 0)
    quote = float(r.get("cummulativeQuoteQty") or 0)
    geb_coin = sum(float(f.get("commission") or 0) for f in r.get("fills") or [] if f.get("commissionAsset") == coin)
    geb_usdt = sum(float(f.get("commission") or 0) for f in r.get("fills") or [] if f.get("commissionAsset") == "USDT")
    if r.get("side") == "SELL":
        return -menge - geb_coin, quote - geb_usdt
    return menge - geb_coin, -quote - geb_usdt


# ───────────────────────── Anschlüsse ─────────────────────────
class Spot(BB.Binance):
    """Spot mit eigener Kennung + Nachfrage, Stops mit eigener ID, Abbrechen NUR eigener Aufträge, Verschieben."""

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
            p["type"] = "STOP_LOSS"  # wird beim Auslösen ein Marktauftrag (wie im Backtest)
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
        """Stop NUR für den Richtungsteil: Menge + reduceOnly (nicht closePosition — sonst fiele auch die Ernte-Absicherung weg)."""
        return self._req("POST", "/fapi/v1/algoOrder", {"algoType": "CONDITIONAL", "symbol": symbol, "side": seite, "type": "STOP_MARKET",
                                                        "quantity": BF.fmt(menge), "triggerPrice": BF.fmt(PL.runde(preis, tick)),
                                                        "reduceOnly": "true", "workingType": "MARK_PRICE", "priceProtect": "true"},
                         signiert=True)

    def algo_abbrechen(self, algo_id):
        try:
            self._req("DELETE", "/fapi/v1/algoOrder", {"algoId": algo_id}, signiert=True)
        except BF.BinanceFehler as ex:
            if not any(c in str(ex.msg) for c in ("-2011", "-2013", "-4130")):  # schon weg
                raise

    def position_info(self, symbol):
        for p in self._req("GET", "/fapi/v2/positionRisk", {"symbol": symbol}, signiert=True) or []:
            if p.get("symbol") == symbol:
                return float(p.get("positionAmt", 0) or 0), float(p.get("leverage", 1) or 1)
        return 0.0, 1.0


def rechte_ok(r):
    """Echtgeld-Schlüssel: Auszahlung/Margin/Überweisung an Dritte AUS; Spot, Futures, Universal Transfer AN."""
    verboten = [k for k in ("enableWithdrawals", "enableMargin", "enableInternalTransfer") if r.get(k)]
    fehlt = [k for k in ("enableSpotAndMarginTrading", "enableFutures", "permitsUniversalTransfer") if not r.get(k)]
    return not verboten and not fehlt, verboten, fehlt


# ───────────────────────── Ausführung ─────────────────────────
def ausfuehren(ents, trocken=False, env=None, spot=None, fut=None, protokolliere=None, bestand_datei=None, notaus=False):
    """ents: Pilot-Entscheide [{markt, hebel, stop_long, stop_short, stand}]. notaus=True erzwingt den Not-Aus.
    → {zeilen, auftraege, warnung, kapital, plan, modus, alles_zu}"""
    env_ = os.environ if env is None else env
    cfg = einstellungen(env_)
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
    spot = spot or Spot(cfg["spot"])
    fut = fut or Fut(cfg["futures"])
    datei = bestand_datei or BESTAND
    buch = buch_lesen(datei, cfg["modus"])

    def speichern():
        buch_schreiben(datei, cfg["modus"], buch)

    if notaus or cfg["stop"]:
        return _notaus(spot, fut, buch, speichern, erg, warn, trocken)
    if cfg["pause"] and not trocken:
        erg["zeilen"].append("Pilot 2.0: Pause (Auto-Handel aus) — nichts gehandelt.")
        return erg
    if cfg["konflikte"]:
        warn("Pilot 2.0 braucht das Binance-Konto für sich allein. Aktiv sind auch: " + ", ".join(cfg["konflikte"]) + " — kein Auftrag.")
        return erg
    if cfg["deckel"] <= 0:
        warn("KRYPTO_PILOT2_KAPITAL fehlt: Für echtes Geld musst du festlegen, wie viele USDT Pilot 2.0 höchstens verwaltet — kein Auftrag.")
        return erg
    if cfg["echtgeld"]:
        ok, verboten, fehlt = rechte_ok(spot.rechte())
        if not ok:
            warn(f"Schlüssel-Rechte falsch — kein Auftrag. Ausschalten: {', '.join(verboten) or '–'}; einschalten: {', '.join(fehlt) or '–'}.")
            return erg
        if fut.hedge_modus():
            warn("Futures-Konto steht im Hedge-Modus — Pilot 2.0 braucht den Einweg-Modus. Kein Auftrag.")
            return erg

    gesperrt = set()
    _abgleich(spot, fut, buch, speichern, warn, gesperrt)

    # Märkte: gewählte + abgewählte mit Bestand (werden auf 0 gebracht)
    ents = [dict(e) for e in ents if e["markt"] in COINS]
    gewaehlt = {e["markt"] for e in ents}
    for m in COINS:
        if m not in gewaehlt:
            sym = COINS[m][0]
            if buch["coins"].get(m, 0) > 0 or fut.position_info(sym)[0] != 0:
                ents.append({"markt": m, "hebel": 0.0, "abgewaehlt": True})
                erg["zeilen"].append(f"{m} ist abgewählt — Bestand wird abgebaut.")
    if not ents:
        return erg

    # Lesen
    konto_s = spot.konto()
    usdt_frei = bestand(konto_s, "USDT")[0]
    konto_f = fut.konto()
    f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0)
    f_offen = float(konto_f.get("totalUnrealizedProfit", 0) or 0)
    daten = {}
    coin_wert = 0.0
    for e in ents:
        sym, coin = COINS[e["markt"]]
        frei, gebunden = bestand(konto_s, coin)
        if buch["coins"].get(e["markt"], 0) > frei + gebunden + 1e-12:  # weniger da als im Buch (z. B. manuell verkauft)
            warn(f"{e['markt']}: im Konto weniger {coin} als im Buch — Buch angepasst.")
            buch["coins"][e["markt"]] = frei + gebunden
        mein = buch["coins"].get(e["markt"], 0.0)
        pos, hebel_ist = fut.position_info(sym)
        daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": mein, "perp": pos, "hebel_ist": hebel_ist, "kurs": spot.kurs(sym),
                             "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
        coin_wert += mein * daten[e["markt"]]["kurs"]
    if buch["usdt"] is None:  # erster Lauf: Zuteilung bis zum Deckel (Futures-Saldo zählt als Pilot-Geld)
        buch["usdt"] = max(0.0, min(usdt_frei, cfg["deckel"] - coin_wert - f_saldo - f_offen))
    buch["usdt"] = max(0.0, min(buch["usdt"], usdt_frei))
    kapital = buch["usdt"] + coin_wert + f_saldo + f_offen
    erg["kapital"] = round(kapital, 2)
    verwaltet = min(kapital * cfg["anteil"], cfg["deckel"])
    basis_g = verwaltet / max(1, len([e for e in ents if not e.get("abgewaehlt")]) or 1)

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
        if e.get("abgewaehlt"):  # Ziel 0: alles abbauen
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
        d = daten[k]
        try:
            if konto == "spot":
                r = spot.markt(d["sym"], seite, menge)
                dc, du = fuellung(r, d["coin"])
                buch["coins"][k] = max(0.0, buch["coins"].get(k, 0.0) + dc)
                buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + du)
                speichern()
                gemacht = abs(dc) if seite == "SELL" else max(0.0, dc)
            else:
                fut.auftrag(d["sym"], seite, menge, reduce)
                buch["perp_offen"] = True
                speichern()
                gemacht = menge
            erg["auftraege"].append((k, konto, seite, menge))
            return gemacht
        except BF.UnklarFehler as ex:
            if konto == "spot":
                buch["unklar"].append({"markt": k, "sym": d["sym"], "cid": getattr(ex, "cid", ""), "seite": seite})
                speichern()
            gesperrt.add(k)
            warn(f"{k} {konto} {seite} {menge:g}: Status unklar — dieser Markt wird erst nach Klärung wieder verändert.")
        except Exception as ex:  # noqa: BLE001
            gesperrt.add(k)
            warn(f"{k} {konto} {seite} {menge:g} abgelehnt: {type(ex).__name__} {str(ex)[:120]}")
        return None

    try:
        # 1) eigene alte Stops weg (Spot-Stops sperren Coins)
        for k in plaene:
            try:
                _stops_weg(spot, fut, buch, k, daten[k]["sym"])
                speichern()
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: alte Stops nicht gelöscht ({type(ex).__name__}) — heute keine Änderung an diesem Markt.")
                gesperrt.add(k)
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
        # 4) vergrössern: je Markt Spot, dann Short; scheitert der Short einer neuen Ernte → Ernte-Spot zurückverkaufen
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
                noetig = shorts[0][2] * d["kurs"] * 1.02
                if verfuegbar < noetig:
                    warn(f"{k}: Futures-Konto hat {verfuegbar:.2f} USDT frei, Short braucht {noetig:.2f} — kein Short, keine neue Ernte.")
                    # nur den Richtungsteil kaufen, keine Ernte ohne Absicherung
                    richtung_ist = buch["coins"].get(k, 0.0) + fut.position_info(d["sym"])[0]  # Spot minus Ernte-Short = Richtung
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
                if schritt(k, konto, seite, m, red) is None and gekauft > 0:
                    zurueck = PL.runde(min(gekauft, m, buch["coins"].get(k, 0.0)), d["rs"]["step"])
                    if zurueck * d["kurs"] >= d["rs"]["min_notional"]:
                        gesperrt.discard(k)
                        if schritt(k, "spot", "SELL", zurueck, False):
                            erg["zeilen"].append(f"{k}: Ernte-Short gescheitert → {zurueck:g} {d['coin']} zurückverkauft (keine ungesicherte Ernte).")
                        gesperrt.add(k)
    finally:
        # 5) Stops IMMER neu setzen — aus dem TATSÄCHLICHEN Bestand
        for e in ents:
            k, d, p = e["markt"], daten[e["markt"]], plaene[e["markt"]]
            try:
                konto_s = spot.konto()
                frei = bestand(konto_s, d["coin"])[0]
                mein = min(buch["coins"].get(k, 0.0), frei + bestand(konto_s, d["coin"])[1])
                if buch["coins"].get(k, 0.0) != mein:
                    buch["coins"][k] = mein
                pos, _ = fut.position_info(d["sym"])
                netto = mein + pos
                stop_spot = PL.runde(min(p["stop_spot"], max(0.0, netto), mein, frei), d["rs"]["step"]) if e.get("z", 0) > 0 else 0.0
                stop_perp = PL.runde(min(p["stop_perp"], max(0.0, -netto), abs(min(pos, 0.0))), d["rf"]["step"]) if e.get("z", 0) < 0 else 0.0
                stops = buch["stops"].setdefault(k, {})
                if stop_spot > 0 and stop_spot * d["kurs"] >= d["rs"]["min_notional"]:
                    r = spot.stop_verkauf(d["sym"], stop_spot, e["stop_long"], d["rs"])
                    stops["spot"] = r.get("orderId")
                if stop_perp > 0:
                    r = fut.stop_menge(d["sym"], "BUY", stop_perp, e["stop_short"], d["rf"]["tick"])
                    stops["perp"] = r.get("algoId")
                speichern()
                richtung = netto * d["kurs"] / basis_g if basis_g else 0.0
                erg["zeilen"].append(f"{k}: Spot {mein:g} {d['coin']}, Perp {pos:+g}, Richtung {richtung:+.2f} (Ziel {e.get('z', 0):+.2f})"
                                     + (f", Stop {stop_spot:g} @ {e['stop_long']:g}" if stop_spot else "")
                                     + (f", Stop {stop_perp:g} @ {e['stop_short']:g}" if stop_perp else ""))
                if e.get("z", 0) and not (stop_spot or stop_perp) and abs(netto) * d["kurs"] >= d["rs"]["min_notional"]:
                    warn(f"{k}: Richtungs-Position ohne Stop — bitte prüfen!")
                if not e.get("z", 0) and basis_g and abs(netto) * d["kurs"] > 0.25 * basis_g:
                    warn(f"{k}: ungewollte Richtung {richtung:+.2f} ohne Stop (Ziel 0) — nächster Lauf gleicht aus, bitte prüfen.")
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")
    try:
        buch["perp_offen"] = any(fut.position_info(COINS[m][0])[0] != 0 for m in COINS)
        speichern()
    except Exception:  # noqa: BLE001
        pass
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


def _stops_weg(spot, fut, buch, k, sym):
    """Nur EIGENE Stops stornieren (IDs aus dem Buch). Wurde der Spot-Stop ausgelöst, ist das schon in _abgleich verbucht."""
    st = buch["stops"].setdefault(k, {})
    if st.get("spot") is not None:
        spot.abbrechen(sym, st["spot"])
        st["spot"], st["spot_menge"], st["spot_quote"] = None, 0.0, 0.0
    if st.get("perp") is not None:
        fut.algo_abbrechen(st["perp"])
        st["perp"] = None


def _abgleich(spot, fut, buch, speichern, warn, gesperrt):
    """Vor dem Handel: unklare Aufträge klären, ausgelöste eigene Spot-Stops vom Buch abziehen."""
    offen = []
    for u in buch["unklar"]:
        try:
            o = spot.auftrag_lesen(u["sym"], cid=u["cid"])
        except Exception:  # noqa: BLE001
            o = None
        if o and o.get("status") in ("FILLED", "PARTIALLY_FILLED", "CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
            dc, du = fuellung({**o, "side": u["seite"]}, COINS[u["markt"]][1])
            buch["coins"][u["markt"]] = max(0.0, buch["coins"].get(u["markt"], 0.0) + dc)
            buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + du)
        elif o is None or not o.get("status"):
            offen.append(u)
            gesperrt.add(u["markt"])
            warn(f"{u['markt']}: früherer Auftrag {u['cid']} noch unklar — Markt gesperrt, bitte im Binance-Konto prüfen.")
        else:
            offen.append(u)
            gesperrt.add(u["markt"])
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
            buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + neu_q)
            st["spot_menge"], st["spot_quote"] = menge, quote
            warn(f"{k}: Spot-Stop wurde ausgelöst ({neu_m:g} {COINS[k][1]} verkauft) — Buch angepasst.")
        if o.get("status") in ("FILLED", "CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
            st["spot"], st["spot_menge"], st["spot_quote"] = None, 0.0, 0.0
    speichern()


def _notaus(spot, fut, buch, speichern, erg, warn, trocken):
    """Alles schliessen, was Pilot 2.0 gehört — je Konto einzeln, danach nachgeprüft."""
    _abgleich(spot, fut, buch, speichern, lambda t: erg["zeilen"].append("ℹ️ " + t), set())
    alles_zu = True
    for k, (sym, coin) in COINS.items():
        if trocken:
            erg["zeilen"].append(f"Not-Aus (trocken): {k} würde schliessen")
            continue
        for name, f in (("Stops", lambda: _stops_weg(spot, fut, buch, k, sym)),
                        ("Perpetual", lambda: _perp_zu(fut, sym, erg, k)),
                        ("Spot", lambda: _spot_weg(spot, buch, k, sym, coin, erg))):
            try:
                f()
                speichern()
            except Exception as ex:  # noqa: BLE001
                warn(f"Not-Aus {k} {name}: {type(ex).__name__} {str(ex)[:120]}")
        try:  # nachprüfen
            pos = fut.position_info(sym)[0]
            frei, gebunden = bestand(spot.konto(), coin)
            rest = min(buch["coins"].get(k, 0.0), frei + gebunden)
            buch["coins"][k] = rest
            regeln = spot.regeln2(sym)
            rest_wert = rest * spot.kurs(sym)
            if pos != 0 or rest_wert >= regeln["min_notional"]:
                alles_zu = False
                warn(f"{k}: NICHT alles zu — Perp {pos:+g}, eigene Spot-Coins {rest:g}. Bitte im Binance-Konto prüfen!")
            else:
                erg["zeilen"].append(f"✅ {k}: geschlossen" + (f" (Rest {rest:g} {coin} unter dem Binance-Minimum)" if rest else ""))
        except Exception as ex:  # noqa: BLE001
            alles_zu = False
            warn(f"{k}: Nachprüfung nicht möglich ({type(ex).__name__}) — bitte im Binance-Konto prüfen!")
    if not trocken and all(fut.position_info(COINS[m][0])[0] == 0 for m in COINS):
        buch["perp_offen"] = False
    speichern()
    erg["alles_zu"] = alles_zu
    erg["zeilen"].insert(0, "🛑 Not-Aus Pilot 2.0: " + ("alles geschlossen." if alles_zu else "⚠️ NICHT ALLES GESCHLOSSEN!"))
    return erg


def _perp_zu(fut, sym, erg, k):
    pos = fut.position_info(sym)[0]
    if pos:
        fut.auftrag(sym, "BUY" if pos < 0 else "SELL", abs(pos), True)
        erg["auftraege"].append((k, "perp", "BUY" if pos < 0 else "SELL", abs(pos)))


def _spot_weg(spot, buch, k, sym, coin, erg):
    frei, gebunden = bestand(spot.konto(), coin)
    mein = min(buch["coins"].get(k, 0.0), frei)
    regeln = spot.regeln2(sym)
    m = PL.runde(mein, regeln["step"])
    if m > 0 and m * spot.kurs(sym) >= regeln["min_notional"]:
        r = spot.markt(sym, "SELL", m)
        dc, du = fuellung(r, coin)
        buch["coins"][k] = max(0.0, buch["coins"].get(k, 0.0) + dc)
        buch["usdt"] = max(0.0, (buch["usdt"] or 0.0) + du)
        erg["auftraege"].append((k, "spot", "SELL", m))


def protokoll_schreiben(eintrag):
    try:
        alt = json.loads(PROTOKOLL.read_text()) if PROTOKOLL.exists() else []
    except ValueError:
        alt = []
    PROTOKOLL.parent.mkdir(exist_ok=True)
    PROTOKOLL.write_text(json.dumps((alt + [eintrag])[-2000:], ensure_ascii=False, indent=1))
