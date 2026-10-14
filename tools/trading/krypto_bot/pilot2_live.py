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
    Perpetual (scheitert das, bleibt so viel Spot als Absicherung stehen, wie der Short gross ist), dann zuerst die FREIEN
    Coins verkaufen und erst wenn das geht die Stops löschen und den Rest verkaufen (geht Verkaufen gerade nicht, bleibt der
    Stop stehen), mehrere Versuche. Bleibt dabei etwas ungesichert übrig, bekommt es sofort einen Schutz-Stop — bestehende
    eigene Stops bleiben (gesperrte Coins gelten als gesichert), nur zu grosse werden ersetzt; würde er sofort auslösen: 5 %
    vom frischen Kurs. Nie ein Long ohne Absicherung UND ohne Stop. «Alles zu» nur, wenn nachgeprüft, kein Futures-Auftrag
    mehr offen und kein Auftrag mehr unklar ist.
  • Stops nach der TATSÄCHLICHEN Netto-Richtung (Spot-Coins + Perpetual): long → Spot-Stop (STOP_LOSS = Markt), short →
    Perp-Stop mit Menge + reduceOnly (nie closePosition — die Ernte-Absicherung trifft er nie). Vor dem Handeln werden zu grosse
    eigene Stops auf das verkleinert, was während des ganzen Laufs sicher ungesichert ist; am Ende gleicht er ab, bis der
    Kontostand während des Abgleichs gleich bleibt (ein Börsen-Stop kann dazwischen auslösen). Ein passender eigener Stop
    bleibt stehen; sonst: alten weg, frisch nachlesen, neuen setzen — scheitert das, der alte Kurs, dann ein Not-Stop 5 % vom
    Kurs. Liegt der Kurs schon jenseits des Stops, schliesst er sofort zum Markt (Rest: Not-Stop). Jeder Stop hat EINE
    Kennung für alle Versuche: kam ein Versuch doch an, lehnt Binance die Wiederholung als Doppel ab — nie zwei Stops.
  • Unklare Antworten: der Markt ist für den Rest des Laufs gesperrt; am Laufende fragt er mehrmals per Kennung nach (offen →
    storniert). Was dann noch unklar ist, steht im Buch und sperrt den Markt, bis Binance es bestätigt (nach 10 Minuten
    unbekannt = nie ausgeführt) — und der Markt wird BEIDSEITIG gesichert: Spot-Stop über alle Coins, reduceOnly-Perp-Stop
    über den ganzen Short plus die unklaren Shorts. Kommt ein unklarer Short verspätet doch an, ist er nie nackt.
  • Kann er eine Liste oder den Kontostand nicht lesen, sichert er trotzdem: länger warten, sonst mit dem Stand von vorhin;
    gesperrte Coins gelten (im Pilot-Konto) als von einem eigenen Stop gehalten — ein neuer Stop deckt nur den Rest.
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
SCHUTZ_WARTEN = (0.5, 1.5, 3.0, 6.0)  # länger, wo ohne Erfolg eine Position OHNE Stop bliebe (Lesen nach dem Storno, Schutz-Stops)
UNKLAR_WARTEN = (2.0, 5.0, 10.0)      # am Laufende: unklare Aufträge so lange nachfragen, bevor beide Seiten gesichert werden
BUCH_WARTEN = (0.3, 1.0)        # Buch-Datei kurz gesperrt (Windows: Virenscanner, OneDrive, offener Editor) → nochmal
VERKAUF_VERSUCHE = 3            # Not-Aus: so oft verkaufen (den Rest jedes Mal neu lesen), danach Schutz-Stop
ABGLEICH_RUNDEN = 3             # Stop-Abgleich wiederholen, bis der Kontostand während des Abgleichs gleich bleibt
UNKLAR_MAX_ALTER_MS = 10 * 60 * 1000   # kennt Binance einen unklaren Auftrag nach 10 Minuten nicht, wurde er nie ausgeführt
AUTH_FEHLER = ("-2014", "-2015", "-2008", "-1022")  # Schlüssel passt nicht zu diesem Konto/Netz


class BuchKaputt(ValueError):
    """Buch-Datei vorhanden, aber unlesbar → nie überschreiben, nie «nichts offen» melden."""


class _Ausgeloest(Exception):
    """Der erste Stop-Kurs würde sofort auslösen (Kurs schon jenseits) → wie ein ausgelöster Stop zum Markt schliessen."""


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


def _text(ex):
    return str(getattr(ex, "msg", "") or ex)


def _sofort_ausgeloest(ex):
    """Binance lehnt einen Stop ab, weil der Kurs schon jenseits liegt (Spot −2010 «would trigger immediately», Futures −2021)."""
    t = _text(ex).lower()
    return "-2021" in t or "immediately" in t


def _doppelt(ex):
    """Binance lehnt einen Auftrag ab, weil die Kennung schon vergeben ist (Spot −2010 «Duplicate order», Futures −4116)."""
    t = _text(ex).lower()
    return "duplicate" in t or "-4116" in t


def _reduce_abgelehnt(ex):
    """Binance lehnt einen reduceOnly-Auftrag ab (−2022), z. B. einen Stop über mehr als die offene Position."""
    t = _text(ex).lower()
    return "-2022" in t or "reduceonly" in t


def _auth_fehler(ex):
    return getattr(ex, "code", None) == 401 or any(c in _text(ex) for c in AUTH_FEHLER)


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


# ───────────────────────── Buch (Start, Konto-ID, Stop-Kennungen, unklare Aufträge — kein Coin- oder USDT-Buch) ─────────────────────────
def leer_buch():
    return {"start": None, "uid": None, "stops": {}, "perp_offen": False, "unklar": []}


def _datei(datei):
    """Ganze Buch-Datei. Fehlt sie: {}. Ist sie unlesbar: BuchKaputt (nie still als leer behandeln). Kurz gesperrt
    (Windows: Virenscanner, OneDrive): nochmal versuchen."""
    p = Path(datei)
    for i in range(len(BUCH_WARTEN) + 1):
        if not p.exists():
            return {}
        try:
            alles = json.loads(p.read_text())
            break
        except ValueError as ex:
            raise BuchKaputt(f"Pilot-2.0-Buch {p.name} unlesbar ({type(ex).__name__})") from ex
        except OSError as ex:
            if i >= len(BUCH_WARTEN):
                raise BuchKaputt(f"Pilot-2.0-Buch {p.name} unlesbar ({type(ex).__name__})") from ex
            time.sleep(BUCH_WARTEN[i])
    if not isinstance(alles, dict):
        raise BuchKaputt(f"Pilot-2.0-Buch {p.name} hat ein falsches Format")
    return alles


def buch_lesen(datei, modus):
    b = _datei(datei).get(modus) or {}
    out = leer_buch()
    out.update({k: v for k, v in b.items() if k in out})
    out["stops"] = {k: dict(v or {}) for k, v in (out["stops"] or {}).items()}
    out["unklar"] = [dict(u) for u in (out["unklar"] or []) if isinstance(u, dict)]
    return out


def buch_schreiben(datei, modus, buch):
    alt = _datei(datei)  # unlesbar → Abbruch statt den anderen Modus zu überschreiben
    alt[modus] = buch
    Path(datei).parent.mkdir(exist_ok=True)
    tmp = Path(str(datei) + ".neu")
    for i in range(len(BUCH_WARTEN) + 1):
        try:
            tmp.write_text(json.dumps(alt, indent=1))
            tmp.replace(datei)  # nie halb geschrieben
            return
        except OSError:
            if i >= len(BUCH_WARTEN):
                raise
            time.sleep(BUCH_WARTEN[i])


def _gestartet(b):
    return bool(b.get("start")) or bool(b.get("perp_offen")) or bool(b.get("unklar"))


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

    def stop_verkauf(self, symbol, menge, stop, regeln, cid=None):
        stop_p = PL.runde(stop, regeln["tick"])
        p = {"symbol": symbol, "side": "SELL", "quantity": BB.format_menge(menge), "stopPrice": BB.format_menge(stop_p),
             "newOrderRespType": "ACK", "newClientOrderId": cid or _kennung(CID_STOP_SPOT)}
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
    def stop_menge(self, symbol, seite, menge, preis, tick, cid=None):
        """Stop NUR für den Richtungsteil: Menge + reduceOnly (nicht closePosition — sonst fiele die Ernte-Absicherung weg)."""
        return self._req("POST", "/fapi/v1/algoOrder", {"algoType": "CONDITIONAL", "symbol": symbol, "side": seite, "type": "STOP_MARKET",
                                                        "quantity": BF.fmt(menge), "triggerPrice": BF.fmt(PL.runde(preis, tick)),
                                                        "reduceOnly": "true", "workingType": "MARK_PRICE", "priceProtect": "true",
                                                        "clientAlgoId": cid or _kennung(CID_STOP_PERP)},
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

    def auftrag_per_kennung(self, symbol, cid):
        return self._req("GET", "/fapi/v1/order", {"symbol": symbol, "origClientOrderId": cid}, signiert=True) or {}

    def storno_per_kennung(self, symbol, cid):
        return self._req("DELETE", "/fapi/v1/order", {"symbol": symbol, "origClientOrderId": cid}, signiert=True)


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


# ───────────────────────── unklare Aufträge (Antwort verloren, Position zeigt nichts) ─────────────────────────
def _klaeren(fut, u, jetzt_ms=None):
    """Per Kennung nachfragen: → "ausgefuehrt" | "nicht" | "offen". Noch offen (NEW) → stornieren versuchen.
    Nach UNKLAR_MAX_ALTER_MS unbekannt (−2013) = nie bei Binance angekommen."""
    jetzt_ms = int(time.time() * 1000) if jetzt_ms is None else jetzt_ms
    if not u.get("cid"):
        return "nicht" if jetzt_ms - int(u.get("zeit") or 0) > UNKLAR_MAX_ALTER_MS else "offen"
    for versuch in range(2):
        try:
            o = _nochmal(lambda: fut.auftrag_per_kennung(u["sym"], u["cid"]))
        except Exception as ex:  # noqa: BLE001
            if "-2013" in _text(ex):  # Binance kennt den Auftrag (noch) nicht
                return "nicht" if jetzt_ms - int(u.get("zeit") or 0) > UNKLAR_MAX_ALTER_MS else "offen"
            return "offen"
        status = o.get("status")
        if float(o.get("executedQty") or 0) > 0 or status in ("FILLED", "PARTIALLY_FILLED"):
            return "ausgefuehrt"
        if status in ("CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
            return "nicht"
        if versuch == 0:  # NEW: noch nicht ausgeführt → stornieren, dann nochmal nachsehen
            try:
                fut.storno_per_kennung(u["sym"], u["cid"])
            except Exception:  # noqa: BLE001
                pass
    return "offen"


def unklare_klaeren(fut, buch, warn, zeilen, gesperrt=None, warten=()):
    """Unklare Aufträge aus dem Buch klären (warten: so oft nochmal nachfragen). Geklärte fallen weg; offene sperren ihren
    Markt, bleiben im Buch, und ihr Markt wird beidseitig gesichert (siehe _soll). → True, wenn sich das Buch geändert hat."""
    noch, geaendert = list(buch.get("unklar") or []), False
    for i in range(len(warten) + 1):
        offen = []
        for u in noch:
            res = _klaeren(fut, u)
            if res == "offen":
                offen.append(u)
            else:
                geaendert = True
                zeilen.append(f"{u.get('markt')} Perp {u.get('seite')} {u.get('menge')}: unklarer Auftrag geklärt — "
                              + ("ausgeführt (steht im Kontostand)." if res == "ausgefuehrt" else "nie ausgeführt."))
        noch = offen
        if not noch or i >= len(warten):
            break
        time.sleep(warten[i])
    for u in noch:
        if gesperrt is not None:
            gesperrt.add(u.get("markt"))
        warn(f"{u.get('markt')} Perp {u.get('seite')} {u.get('menge')}: Auftrag noch immer unklar (Kennung {u.get('cid')}) — Markt "
             "gesperrt und beidseitig gesichert, bis Binance ihn bestätigt; bitte im Binance-Konto prüfen.")
    buch["unklar"] = noch
    return geaendert


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
        if trocken:
            return
        try:
            buch_schreiben(datei, cfg["modus"], buch)
        except (OSError, BuchKaputt) as ex:  # Aufträge sind trotzdem gültig; verwaiste Stops findet der nächste Lauf an der Kennung
            warn(f"Buch nicht gespeichert ({type(ex).__name__}) — der nächste Lauf liest wieder den Kontostand.")

    transfer_ok = False
    gesperrt, gehandelt = set(), set()
    unklar_neu = []
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
        if buch["unklar"] and unklare_klaeren(fut, buch, warn, erg["zeilen"], gesperrt):  # alte unklare Aufträge zuerst
            speichern()
        gewaehlt = {e["markt"] for e in ents}
        for m, (sym, coin) in COINS.items():
            if m not in gewaehlt and (sum(bestand(konto_s, coin)) * _nochmal(lambda sym=sym: spot.kurs(sym)) >= STAUB_USDT
                                      or _nochmal(lambda sym=sym: fut.position_info(sym))[0] != 0
                                      or unklar_sell(buch, m) is not None):  # unklarer Auftrag: der Markt braucht seine Stops
                ents.append({"markt": m, "hebel": 0.0, "abgewaehlt": True})
                erg["zeilen"].append(f"{m} ist abgewählt — Bestand wird abgebaut.")
        if not ents:
            return erg
        daten = {}
        for e in ents:
            sym, coin = COINS[e["markt"]]
            pos, hebel_ist = _nochmal(lambda sym=sym: fut.position_info(sym))
            frei_c, gebunden_c = bestand(konto_s, coin)
            daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": frei_c + gebunden_c, "frei": frei_c, "perp": pos, "hebel_ist": hebel_ist,
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
                         "pfand": 0.0, "stop_spot": 0.0, "stop_perp": 0.0, "info": {"spot_ziel": 0.0, "perp_ziel": 0.0}}
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
            gehandelt.add(k)
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
                except BF.UnklarFehler as ex:  # Position nachlesen statt raten
                    try:
                        nach = _nochmal(lambda: fut.position_info(d["sym"]))[0]
                    except Exception:  # noqa: BLE001
                        nach = None
                    erwartet = pos_vor + (menge if seite == "BUY" else -menge)
                    if nach is None or abs(nach - erwartet) > 1e-9:
                        gesperrt.add(k)
                        unklar_neu.append({"markt": k, "sym": d["sym"], "cid": getattr(ex, "cid", None), "seite": seite, "menge": menge,
                                           "reduce": bool(reduce), "zeit": int(time.time() * 1000)})
                        warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt es (noch) nicht — Markt gesperrt, nichts "
                             "zurückgerechnet; am Laufende wird per Kennung nachgefragt, Stops nach dem Kontostand.")
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
        # 1) Vor dem Handeln: eigene Stops, die grösser sind als das, was während des GANZEN Laufs sicher ungesichert ist
        #    (Minimum aus jetzt und Plan-Ende), auf diese Grösse verkleinern — sonst könnte ein alter Stop mitten im Lauf die
        #    neue Ernte-Absicherung treffen. Spot-Stops, die zu verkaufende Coins sperren, ebenso. Märkte ohne Plan: unberührt.
        for k, p in plaene.items():
            if p["schritte"] and k not in gesperrt:
                try:
                    if _stops_vorab(spot, fut, buch, k, daten[k], p):
                        gehandelt.add(k)
                except Exception as ex:  # noqa: BLE001
                    warn(f"{k}: alte Stops nicht prüfbar/anpassbar ({type(ex).__name__}) — heute keine Änderung in diesem Markt; die Stops "
                         "werden am Ende nach dem Kontostand geprüft.")
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
        if unklar_neu:  # unklare Aufträge per Kennung klären (mehrmals) — was offen bleibt, kommt ins Buch, sperrt den Markt beim
            #             nächsten Lauf, und sein Markt wird beidseitig gesichert (kommt der Auftrag verspätet doch an: geschützt)
            buch["unklar"] = (buch.get("unklar") or []) + unklar_neu
            unklare_klaeren(fut, buch, warn, erg["zeilen"], warten=UNKLAR_WARTEN)
            speichern()
        for k in daten:
            daten[k]["unklar_sell"] = unklar_sell(buch, k)
        _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn, gehandelt)
    try:
        buch["perp_offen"] = any(_nochmal(lambda m=m: fut.position_info(COINS[m][0]))[0] != 0 for m in COINS)
        speichern()
    except Exception:  # noqa: BLE001
        pass
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


# ───────────────────────── Stops ─────────────────────────
def _soll(mein, pos, kurs, d):
    """Stop-Grössen aus Coins (mein) und Perpetual (pos): long → Spot-Stop über min(Netto, Coins); short → Perp-Stop über
    Short minus (abgerundete) Absicherung. Unter einem halben Futures-Schritt kein Perp-Stop (er träfe sonst die Ernte).
    d["unklar_sell"] gesetzt (ein Perp-Auftrag auf diesem Markt ist noch unklar, die Position kann sich also noch ändern):
    BEIDE Seiten ganz sichern — Spot-Stop über alle Coins, Perp-Stop (reduceOnly) über den ganzen Short plus die unklaren
    Short-Aufträge. Löst einer aus, schützt der andere den Rest (die Ernte endet dann) — in jedem Fall, ob der unklare Auftrag
    ausgeführt wird oder nicht. Nie ein nackter Short, falls er verspätet doch ankommt."""
    netto = mein + pos
    ungesichert = abs(netto) * kurs >= STAUB_USDT
    short = abs(min(pos, 0.0))
    short_teil = short - min(mein, short)
    if d.get("unklar_sell") is not None:
        stop_spot = PL.runde(mein, d["rs"]["step"]) if mein * kurs >= STAUB_USDT else 0.0
        beide = short + d["unklar_sell"]
        stop_perp = PL.runde(beide, d["rf"]["step"]) if beide * kurs >= STAUB_USDT else 0.0
        return {"netto": netto, "mein": mein, "pos": pos, "kurs": kurs, "ungesichert": True, "stop_spot": stop_spot,
                "stop_perp": stop_perp, "short_teil": short_teil, "beidseitig": True}
    stop_spot = PL.runde(min(max(0.0, netto), mein), d["rs"]["step"]) if netto > 0 and ungesichert else 0.0
    # Absicherung abrunden, NICHT den Stop: sonst bliebe bis zu ein Futures-Schritt Short ohne Stop.
    stop_perp = (max(0.0, short - PL.runde(min(mein, short), d["rf"]["step"]))
                 if short_teil >= 0.5 * d["rf"]["step"] and short_teil * kurs >= STAUB_USDT else 0.0)
    return {"netto": netto, "mein": mein, "pos": pos, "kurs": kurs, "ungesichert": ungesichert, "stop_spot": stop_spot,
            "stop_perp": stop_perp, "short_teil": short_teil}


def unklar_sell(buch, markt):
    """None = kein unklarer Perp-Auftrag auf diesem Markt; sonst die Summe der unklaren Short-Aufträge (SELL ohne reduceOnly)."""
    offen = [u for u in buch.get("unklar") or [] if u.get("markt") == markt]
    if not offen:
        return None
    return sum(float(u.get("menge") or 0) for u in offen if u.get("seite") == "SELL" and not u.get("reduce"))


def _lage(spot, fut, d, warten=None):
    """Frisch gelesen: (frei, gebunden, Perp-Position, Kurs). Kurs nicht lesbar → der vom Laufanfang."""
    frei, gebunden = bestand(_nochmal(spot.konto, warten), d["coin"])
    pos = _nochmal(lambda: fut.position_info(d["sym"]), warten)[0]
    try:
        kurs = _nochmal(lambda: spot.kurs(d["sym"]))
    except Exception:  # noqa: BLE001
        kurs = d["kurs"]
    return frei, gebunden, pos, kurs


def _platziere(platzieren, cid, warten=None):
    """Stop mit EINER Kennung für alle Versuche: kam ein Versuch doch an (Antwort verloren, in den Listen noch nicht sichtbar),
    lehnt Binance die Wiederholung als Doppel ab — dann steht er. Nie zwei Stops aus einer verlorenen Antwort."""
    warten = LESE_WARTEN if warten is None else warten
    for i in range(len(warten) + 1):
        try:
            return {**(platzieren(cid) or {}), "cid": cid}
        except Exception as ex:  # noqa: BLE001
            if _doppelt(ex):
                return {"cid": cid, "nachgesehen": True}
            if i >= len(warten) or not _voruebergehend(ex):
                raise
            time.sleep(warten[i])
    return {"cid": cid}


def _setze_stop(platz, preise, cid, sofort_raus=False, warten=None):
    """Stop zum ersten Preis setzen, scheitert das: zum nächsten (alter Kurs, Not-Stop). Alle Versuche mit DERSELBEN Kennung.
    sofort_raus: würde schon der erste Preis sofort auslösen → _Ausgeloest (der Aufrufer schliesst zum Markt).
    → (Antwort, Preis); scheitern alle → der letzte Fehler."""
    letzter = None
    for i, preis in enumerate(p for p in preise if p):
        try:
            return _platziere(lambda c, preis=preis: platz(preis, c), cid, warten), preis
        except Exception as ex:  # noqa: BLE001
            if i == 0 and sofort_raus and _sofort_ausgeloest(ex):
                raise _Ausgeloest() from ex
            letzter = ex
    if letzter is None:
        raise ValueError("kein gültiger Stop-Kurs")
    raise letzter


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


def _stops_vorab(spot, fut, buch, k, d, plan):
    """Vor dem Handeln: eigene Stops auf das verkleinern, was jetzt UND nach dem Plan ungesichert ist (Minimum) — so trifft ein
    alter Stop mitten im Lauf nie die (neue) Ernte. Spot-Stops über Coins, die verkauft werden sollen, ebenso. → True, wenn
    Stops geändert wurden. Fehler → Ausnahme (Aufrufer sperrt den Markt)."""
    info = plan.get("info") or {}
    if not isinstance(info, dict) or "spot_ziel" not in info:
        return False
    st = buch["stops"].setdefault(k, {})
    jetzt = _soll(d["spot"], d["perp"], d["kurs"], d)
    ende = _soll(max(0.0, info["spot_ziel"]), info["perp_ziel"], d["kurs"], d)
    sicher_s, sicher_p = min(jetzt["stop_spot"], ende["stop_spot"]), min(jetzt["stop_perp"], ende["stop_perp"])
    verkauf = sum(m for konto, seite, m, _ in plan["schritte"] if konto == "spot" and seite == "SELL")
    geaendert = False
    alt_s = _nochmal(lambda: spot.eigene_stops(d["sym"]))
    q_s = sum(float(o.get("origQty") or 0) for o in alt_s)
    if alt_s and (q_s > sicher_s + d["rs"]["step"] / 2 or verkauf > d["frei"] + 1e-12):
        p_alt = float(alt_s[0].get("stopPrice") or 0) or st.get("p_long")
        if _alle_weg(alt_s, lambda o: spot.abbrechen(d["sym"], o["orderId"]), k, "Spot", lambda t: None, []):
            raise RuntimeError("alter Spot-Stop nicht löschbar")
        st["spot"] = None
        geaendert = True
        if sicher_s * d["kurs"] >= d["rs"]["min_notional"] and p_alt and p_alt < d["kurs"]:
            r = _platziere(lambda c: spot.stop_verkauf(d["sym"], sicher_s, p_alt, d["rs"], cid=c), _kennung(CID_STOP_SPOT))
            st["spot"], st["p_long"] = r.get("orderId"), p_alt
    alt_p = _nochmal(lambda: fut.eigene_stops(d["sym"]))
    q_p = sum(float(a.get("quantity") or 0) for a in alt_p)
    if alt_p and q_p > sicher_p + d["rf"]["step"] / 2:
        p_alt = float(alt_p[0].get("triggerPrice") or 0) or st.get("p_short")
        if _alle_weg(alt_p, lambda a: fut.algo_abbrechen(d["sym"], a.get("algoId")), k, "Perp", lambda t: None, []):
            raise RuntimeError("alter Perp-Stop nicht löschbar")
        st["perp"] = None
        geaendert = True
        if sicher_p >= d["rf"]["step"] and p_alt and p_alt > d["kurs"]:
            r = _platziere(lambda c: fut.stop_menge(d["sym"], "BUY", sicher_p, p_alt, d["rf"]["tick"], cid=c), _kennung(CID_STOP_PERP))
            st["perp"], st["p_short"] = r.get("algoId"), p_alt
    return geaendert


def _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn, gehandelt=frozenset()):
    """Am Ende jedes Laufs: Stops nach dem Kontostand und der tatsächlichen Netto-Richtung. Wiederholt, bis der Kontostand
    während des Abgleichs gleich bleibt (ein Börsen-Stop kann dazwischen auslösen). Nicht prüfbar → laute Warnung."""
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        st = buch["stops"].setdefault(k, {})
        gesetzt, schutz, gescheitert = [], [], []
        vorher, s, stabil = None, None, False

        def lesen(warten=None, d=d):
            return _lage(spot, fut, d, warten)
        for _ in range(ABGLEICH_RUNDEN):
            try:
                frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)  # länger warten: ohne Kontostand kein neuer Stop
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: Kontostand nicht lesbar ({type(ex).__name__}) — Stops nicht geprüft, Position läuft evtl. OHNE Stop, bitte prüfen!")
                gescheitert.append("Kontostand")
                break
            jetzt = (round(frei + gebunden, 9), round(pos, 9))
            if vorher is not None and abs(jetzt[0] - vorher[0]) <= d["rs"]["step"] / 2 and abs(jetzt[1] - vorher[1]) <= d["rf"]["step"] / 2:
                stabil = True
                break
            vorher = jetzt
            s = _soll(frei + gebunden, pos, kurs, d)
            s.update(frei=frei, gebunden=gebunden)
            for teil, abgleich in (("Spot", lambda: _spot_abgleich(spot, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, k in gehandelt)),
                                   ("Perp", lambda: _perp_abgleich(fut, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, k in gehandelt))):
                try:  # getrennt: scheitert der Spot-Stop, bekommt der Short trotzdem seinen (und umgekehrt)
                    abgleich()
                except Exception as ex:  # noqa: BLE001
                    gescheitert.append(teil)
                    warn(f"{k}: {teil}-Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")
            if gescheitert:
                break
        if s is None:
            continue
        if not stabil and not gescheitert:
            warn(f"{k}: Kontostand hat sich während des Stop-Abgleichs mehrmals geändert (Stop ausgelöst?) — bitte prüfen!")
        speichern()
        richtung = s["netto"] * s["kurs"] / basis_g if basis_g else 0.0
        z = e.get("z", 0)
        erg["zeilen"].append(f"{k}: Spot {s['mein']:g} {d['coin']}, Perp {s['pos']:+g}, Richtung {richtung:+.2f} (Ziel {z:+.2f})"
                             + "".join(", " + g for g in gesetzt + schutz)
                             + (" — beidseitig gesichert (unklarer Auftrag)" if s.get("beidseitig") else ""))
        if s["ungesichert"] and not gesetzt and not schutz and not gescheitert and (s["stop_spot"] or s["stop_perp"] or s["short_teil"] * s["kurs"] >= 100):
            warn(f"{k}: Richtung {richtung:+.2f} OHNE Stop (zu klein für Binance, abgelehnt oder nicht prüfbar) — bitte prüfen!")
        if basis_g and abs(richtung - z) > 0.25:
            erg["zeilen"].append(f"{k}: Richtung {richtung:+.2f} weicht vom Ziel {z:+.2f} ab — Stop auf die tatsächliche Richtung gesetzt,"
                                 " der nächste Lauf gleicht weiter aus.")


def _spot_abgleich(spot, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, gehandelt):
    """Long-Seite: genau ein eigener Spot-Stop über die Netto-Richtung. Passender bleibt; sonst alten weg, FRISCH nachlesen
    (der alte kann inzwischen ausgelöst haben), neuen setzen — scheitert das: alter Kurs, dann Not-Stop. Kurs schon unter dem
    Stop-Kurs (Signal, sonst der letzte) → wie ein ausgelöster Stop sofort verkaufen. Gesperrte Coins hält im Pilot-Konto
    ein eigener Auftrag (ein Stop, der evtl. noch nicht in der Liste steht) — ein neuer Stop deckt nur den Rest (nie doppelt)."""
    sym, regeln = d["sym"], d["rs"]
    soll, kurs = s["stop_spot"], s["kurs"]
    try:
        alt = _nochmal(lambda: spot.eigene_stops(sym), SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001
        _spot_ohne_liste(spot, k, d, st, e, s, warn, gesetzt, gehandelt, ex)
        return
    if soll <= 0 or soll * kurs < regeln["min_notional"]:
        if alt:  # verwaiste eigene Stops (z. B. nachdem der Perp-Stop ausgelöst hat) dürfen nie Ernte-Coins verkaufen
            offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
            st["spot"] = offen.get("orderId") if offen else None
        return
    grenze = e.get("stop_long") or st.get("p_long")
    p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
    p_r = PL.runde(p, regeln["tick"])
    jenseits = bool(grenze and kurs <= grenze)
    if (not jenseits and len(alt) == 1 and _gleich(alt[0].get("origQty"), soll, regeln["step"])
            and _gleich(alt[0].get("stopPrice"), p_r, regeln["tick"])):
        st["spot"], st["p_long"] = alt[0].get("orderId"), p
        schutz.append(f"Stop {soll:g} @ {p_r:g} bleibt")
        return
    p_alt = (float(alt[0].get("stopPrice") or 0) if alt else 0.0) or st.get("p_long")
    offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
    if offen:
        st["spot"] = offen.get("orderId")
        return
    st["spot"] = None
    try:  # frisch: ein alter Stop kann zwischen Lesen und Storno ausgelöst haben
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001 — der alte Stop ist weg: lieber nach dem Stand von vorhin sichern als gar nicht
        warn(f"{k}: Kontostand nach dem Storno nicht lesbar ({type(ex).__name__}) — Stop nach dem Stand von vorhin gesetzt.")
        frei, gebunden, pos, kurs = s["frei"] + s["gebunden"], 0.0, s["pos"], s["kurs"]
    soll = _soll(frei + gebunden, pos, kurs, d)["stop_spot"]
    if soll <= 0 or soll * kurs < regeln["min_notional"]:
        return
    if grenze and kurs <= grenze:
        _spot_raus(spot, k, d, st, soll, kurs, erg, warn, gesetzt, f"Kurs {kurs:g} schon unter dem Stop {grenze:g}", lesen)
        return
    menge = PL.runde(max(0.0, min(soll - gebunden, frei)), regeln["step"])
    if menge * p < regeln["min_notional"]:
        if gebunden * kurs >= STAUB_USDT:
            schutz.append(f"{gebunden:g} {d['coin']} in einem Auftrag ausserhalb der Liste")
            warn(f"{k}: {gebunden:g} {d['coin']} sind durch einen Auftrag gesperrt, der (noch) nicht in der Auftragsliste steht — gilt "
                 "als Stop, kein zweiter gesetzt. Bitte im Binance-Konto prüfen!")
            return
        raise ValueError(f"nur {frei:g} {d['coin']} frei")
    preise = [p] + ([p_alt] if p_alt and p_alt < kurs and not _gleich(p_alt, p, regeln["tick"]) else []) + [kurs * (1 - NOT_STOP_ABSTAND)]
    try:
        r, p_ok = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), preise, _kennung(CID_STOP_SPOT),
                              sofort_raus=True)
    except _Ausgeloest:
        _spot_raus(spot, k, d, st, menge, kurs, erg, warn, gesetzt, f"Stop {p_r:g} würde sofort auslösen (Kurs gefallen)", lesen)
        return
    st["spot"], st["p_long"] = r.get("orderId"), p_ok
    gesetzt.append(f"Stop {menge:g} @ {PL.runde(p_ok, regeln['tick']):g}")
    if p_ok != p:
        warn(f"{k}: neuer Spot-Stop {p_r:g} abgelehnt — " + ("der bisherige Stop-Kurs" if p_ok == p_alt else "ein Not-Stop 5 % unter dem Kurs")
             + " ist gesetzt.")
    if gebunden * kurs >= STAUB_USDT:
        warn(f"{k}: {gebunden:g} {d['coin']} sind durch einen Auftrag gesperrt, der (noch) nicht in der Auftragsliste steht — gilt als "
             f"Stop, der neue deckt nur den Rest ({menge:g}). Bitte im Binance-Konto prüfen!")
    elif (soll - gebunden - menge) * kurs >= STAUB_USDT:
        warn(f"{k}: nur {menge:g} von {soll:g} {d['coin']} gegen Stop gesichert — Rest nicht frei. Bitte prüfen!")


def _spot_ohne_liste(spot, k, d, st, e, s, warn, gesetzt, gehandelt, ex):
    """Eigene Spot-Stops nicht lesbar: nichts stornieren (blind), aber den ungesicherten Rest trotzdem sichern — gesperrte Coins
    hält im Pilot-Konto ein eigener Stop, also nur min(Soll − gesperrt, frei) dazu. Nie ein Long ohne Stop, nur weil die
    Liste gerade nicht antwortet."""
    sym, regeln, kurs = d["sym"], d["rs"], s["kurs"]
    menge = PL.runde(max(0.0, min(s["stop_spot"] - s["gebunden"], s["frei"])), regeln["step"])
    if menge * kurs < regeln["min_notional"]:
        if s["stop_spot"] > 0 or st.get("spot") is not None or gehandelt:
            warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — die gesperrten {s['gebunden']:g} {d['coin']} gelten als "
                 "gesichert; ob ein alter Stop noch über der Ernte steht, ist offen. Bitte prüfen!")
        return
    p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
    try:
        r, p_ok = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), [p, kurs * (1 - NOT_STOP_ABSTAND)],
                              _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
        st["spot"], st["p_long"] = r.get("orderId"), p_ok
        gesetzt.append(f"Stop {menge:g} @ {PL.runde(p_ok, regeln['tick']):g}")
        warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — {menge:g} {d['coin']} zusätzlich gesichert (gesperrte "
             f"{s['gebunden']:g} gelten als gesichert). Bitte prüfen!")
    except Exception as ex2:  # noqa: BLE001
        warn(f"{k}: offene Spot-Stops nicht lesbar und Stop abgelehnt ({type(ex2).__name__}) — {menge:g} {d['coin']} OHNE Stop, "
             "bitte sofort prüfen!")


def _spot_raus(spot, k, d, st, menge, kurs, erg, warn, gesetzt, grund, lesen):
    """Long sofort zum Markt schliessen (statt eines Stops, der sofort auslösen würde). Was danach noch ungesichert ist
    (abgelehnt, nur teilweise ausgeführt): Not-Stop 5 % unter dem frischen Kurs."""
    sym, regeln, coin = d["sym"], d["rs"], d["coin"]
    try:
        frei = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)[0]
    except Exception:  # noqa: BLE001
        frei = menge
    m = PL.runde(min(menge, frei), regeln["step"])
    fehler, verkauft = None, 0.0
    if m * kurs >= regeln["min_notional"]:
        try:
            r = spot.markt(sym, "SELL", m)
            verkauft = abs(netto_coins(r, coin))
            erg["auftraege"].append((k, "spot", "SELL", verkauft))
            gesetzt.append(f"{grund} → {verkauft:g} {coin} verkauft")
        except Exception as ex:  # noqa: BLE001
            fehler = ex
    try:
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
        rest = PL.runde(min(max(0.0, _soll(frei + gebunden, pos, kurs, d)["stop_spot"] - gebunden), frei), regeln["step"])
    except Exception:  # noqa: BLE001 — nicht lesbar: der unverkaufte Teil (Binance lehnt ab, falls er doch weg ist)
        rest = PL.runde(max(0.0, m - verkauft), regeln["step"])
    if rest * kurs < regeln["min_notional"]:
        return
    try:
        r, p = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, rest, preis, regeln, cid=c), [kurs * (1 - NOT_STOP_ABSTAND)],
                           _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
        st["spot"], st["p_long"] = r.get("orderId"), p
        gesetzt.append(f"Not-Stop {rest:g} @ {PL.runde(p, regeln['tick']):g}")
        warn(f"{k}: {grund}, Verkauf {'abgelehnt (' + type(fehler).__name__ + ')' if fehler else 'unvollständig'} — Not-Stop 5 % unter dem Kurs gesetzt.")
    except Exception as ex:  # noqa: BLE001
        warn(f"{k}: {grund}, Verkauf und Not-Stop abgelehnt ({type(ex).__name__}) — {rest:g} {coin} OHNE Stop, bitte sofort prüfen!")


def _perp_abgleich(fut, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, gehandelt):
    """Short-Seite: genau ein eigener Perp-Stop (Menge + reduceOnly) über den ungesicherten Short. Passender bleibt; sonst alten
    weg, FRISCH nachlesen, neuen setzen — scheitert das: alter Kurs, dann Not-Stop. Kurs schon über dem Stop-Kurs →
    Richtungs-Short sofort zurückkaufen."""
    sym, regeln = d["sym"], d["rf"]
    soll, kurs = s["stop_perp"], s["kurs"]
    try:
        alt = _nochmal(lambda: fut.eigene_stops(sym), SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001
        _perp_ohne_liste(fut, k, d, st, e, s, warn, gesetzt, gehandelt, ex)
        return
    if soll <= 0:
        if alt:  # verwaist (Position zu oder kleiner) — weg, damit er nie die Ernte trifft
            offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
            st["perp"] = offen.get("algoId") if offen else None
        return
    grenze = e.get("stop_short") or st.get("p_short")
    p = _stop_preis(e.get("stop_short"), st.get("p_short"), kurs, -1)
    p_r = PL.runde(p, regeln["tick"])
    jenseits = bool(grenze and kurs >= grenze)
    if (not jenseits and len(alt) == 1 and _gleich(alt[0].get("quantity"), soll, regeln["step"])
            and _gleich(alt[0].get("triggerPrice"), p_r, regeln["tick"])):
        st["perp"], st["p_short"] = alt[0].get("algoId"), p
        schutz.append(f"Stop {soll:g} @ {p_r:g} bleibt")
        return
    p_alt = (float(alt[0].get("triggerPrice") or 0) if alt else 0.0) or st.get("p_short")
    offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
    if offen:
        st["perp"] = offen.get("algoId")
        return
    st["perp"] = None
    try:  # frisch: ein alter Stop kann zwischen Lesen und Storno ausgelöst haben
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001 — der alte Stop ist weg: lieber nach dem Stand von vorhin sichern (reduceOnly) als gar nicht
        warn(f"{k}: Kontostand nach dem Storno nicht lesbar ({type(ex).__name__}) — Stop nach dem Stand von vorhin gesetzt.")
        frei, gebunden, pos, kurs = s["frei"], s["gebunden"], s["pos"], s["kurs"]
    soll = _soll(frei + gebunden, pos, kurs, d)["stop_perp"]
    if soll <= 0:
        return
    if grenze and kurs >= grenze:
        _perp_raus(fut, k, d, st, soll, kurs, erg, warn, gesetzt, f"Kurs {kurs:g} schon über dem Stop {grenze:g}", lesen, pos)
        return
    preise = [p] + ([p_alt] if p_alt and p_alt > kurs and not _gleich(p_alt, p, regeln["tick"]) else []) + [kurs * (1 + NOT_STOP_ABSTAND)]
    try:
        r, p_ok = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", soll, preis, regeln["tick"], cid=c), preise,
                              _kennung(CID_STOP_PERP), sofort_raus=True)
    except _Ausgeloest:
        _perp_raus(fut, k, d, st, soll, kurs, erg, warn, gesetzt, f"Stop {p_r:g} würde sofort auslösen (Kurs gestiegen)", lesen, pos)
        return
    except Exception as ex:  # noqa: BLE001
        offen = PL.runde(abs(min(pos, 0.0)), regeln["step"])
        if not (_reduce_abgelehnt(ex) and regeln["step"] / 2 <= offen < soll - regeln["step"] / 2):
            raise
        # beidseitig: nimmt Binance keinen reduceOnly-Stop über mehr als den offenen Short, dann wenigstens den sichern
        r, p_ok = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", offen, preis, regeln["tick"], cid=c), preise,
                              _kennung(CID_STOP_PERP))
        warn(f"{k}: Binance nimmt keinen reduceOnly-Stop über mehr als den offenen Short — Stop nur über {offen:g}; ein unklarer "
             "Short hätte keinen Stop, bis er geklärt ist. Bitte im Binance-Konto prüfen!")
        soll = offen
    st["perp"], st["p_short"] = r.get("algoId"), p_ok
    gesetzt.append(f"Stop {soll:g} @ {PL.runde(p_ok, regeln['tick']):g}")
    if p_ok != p:
        warn(f"{k}: neuer Perp-Stop {p_r:g} abgelehnt — " + ("der bisherige Stop-Kurs" if p_ok == p_alt else "ein Not-Stop 5 % über dem Kurs")
             + " ist gesetzt.")


def _perp_ohne_liste(fut, k, d, st, e, s, warn, gesetzt, gehandelt, ex):
    """Eigene Perp-Stops nicht lesbar: den bekannten alten (Buch) per ID löschen versuchen und den Stop trotzdem setzen — lieber
    zwei reduceOnly-Stops (schlimmstenfalls zu viel zurückgekauft) als ein Short ohne Stop."""
    sym, regeln, soll, kurs = d["sym"], d["rf"], s["stop_perp"], s["kurs"]
    if soll <= 0:
        if st.get("perp") is not None or gehandelt:
            warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) — ob ein alter Stop noch über der Ernte-Absicherung "
                 "steht, ist offen. Bitte prüfen!")
        return
    weg = st.get("perp") is None
    if not weg:
        try:
            fut.algo_abbrechen(sym, st["perp"])
            weg, st["perp"] = True, None
        except Exception:  # noqa: BLE001
            pass
    p = _stop_preis(e.get("stop_short"), st.get("p_short"), kurs, -1)
    try:
        r, p_ok = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", soll, preis, regeln["tick"], cid=c),
                              [p, kurs * (1 + NOT_STOP_ABSTAND)], _kennung(CID_STOP_PERP), warten=SCHUTZ_WARTEN)
        st["perp"], st["p_short"] = r.get("algoId"), p_ok
        gesetzt.append(f"Stop {soll:g} @ {PL.runde(p_ok, regeln['tick']):g}")
        warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) — Stop {soll:g} trotzdem gesetzt"
             + ("" if weg else "; ein alter könnte noch daneben stehen") + ". Bitte prüfen!")
    except Exception as ex2:  # noqa: BLE001
        warn(f"{k}: offene Perp-Stops nicht lesbar und Stop abgelehnt ({type(ex2).__name__}) — Short {soll:g} evtl. OHNE Stop, "
             "bitte sofort prüfen!")


def _perp_raus(fut, k, d, st, menge, kurs, erg, warn, gesetzt, grund, lesen, pos=None):
    """Richtungs-Short sofort zurückkaufen (reduceOnly, höchstens die offene Position). Danach nachlesen: was noch ungesichert
    ist (abgelehnt, nur teilweise ausgeführt, unklar), bekommt einen Not-Stop 5 % über dem Kurs."""
    fehler = None
    kauf = PL.runde(min(menge, abs(min(pos, 0.0))) if pos is not None else menge, d["rf"]["step"])
    if kauf >= d["rf"]["step"] / 2:
        try:
            r = fut.auftrag(d["sym"], "BUY", kauf, True) or {}
            erg["auftraege"].append((k, "perp", "BUY", float(r.get("executedQty") or kauf)))
            gesetzt.append(f"{grund} → Short {float(r.get('executedQty') or kauf):g} zurückgekauft")
        except Exception as ex:  # noqa: BLE001
            fehler = ex
    try:
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
        rest = _soll(frei + gebunden, pos, kurs, d)["stop_perp"]
    except Exception:  # noqa: BLE001
        rest = menge  # nicht prüfbar → vorsichtshalber schützen (reduceOnly: ohne Position harmlos)
    if rest < d["rf"]["step"] / 2:
        return
    grund2 = f"{grund}, Rückkauf {'abgelehnt (' + type(fehler).__name__ + ')' if fehler else 'unvollständig'}"
    _perp_notstop(fut, k, d, st, rest, kurs, warn, gesetzt, grund2)


def _perp_notstop(fut, k, d, st, menge, kurs, warn, gesetzt, grund):
    try:
        r, p = _setze_stop(lambda preis, c: fut.stop_menge(d["sym"], "BUY", menge, preis, d["rf"]["tick"], cid=c),
                           [kurs * (1 + NOT_STOP_ABSTAND)], _kennung(CID_STOP_PERP), warten=SCHUTZ_WARTEN)
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
    if buch.get("unklar"):  # unklare Aufträge zuerst klären (offen → stornieren); was dann noch unklar ist, verhindert «alles zu»
        unklare_klaeren(fut, buch, warn, erg["zeilen"])
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
                    _notaus_schutz(spot, fut, st, k, sym, coin, None, pos_vor, frei, gebunden, kurs, regeln, warn, modus,
                                   unklar_sell(buch, k))
                    continue
        fut_offen = False
        if pos == 0:  # 2) Futures-Aufträge erst NACH dem Schliessen löschen (vorher schützen sie den Short)
            try:
                _nochmal(lambda: fut.alle_abbrechen(sym), SCHUTZ_WARTEN)
                st["perp"] = None
            except Exception as ex:  # noqa: BLE001
                fut_offen = True
                warn(f"Not-Aus {modus} {k}: Futures-Aufträge nicht (alle) gelöscht ({type(ex).__name__}).")
        behalten = max(0.0, -pos)  # Short noch offen → so viel Spot bleibt als Absicherung stehen
        # 3) verkaufen: zuerst die FREIEN Coins (die gesperrten hält ihr Stop weiter fest). Erst wenn das klappt (oder nichts frei
        #    ist), die Spot-Aufträge löschen (geben die gesperrten Coins frei) und den Rest verkaufen — geht Verkaufen gerade
        #    nicht, bleibt der Stop stehen (nie Schutz wegnehmen, ohne verkaufen zu können). Mehrere Versuche, Rest neu lesen.
        if (frei + gebunden - behalten) * kurs >= regeln["min_notional"]:
            ok = True
            if (frei - behalten) * kurs >= regeln["min_notional"]:
                frei, ok = _notaus_verkaufen(spot, k, sym, coin, frei, behalten, kurs, regeln, erg, warn, modus)
            if ok and gebunden > 0:
                storno_ok = True
                try:
                    for o in _nochmal(lambda: spot.offene(sym)):
                        _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
                    st["spot"] = None
                except Exception as ex:  # noqa: BLE001
                    storno_ok = False
                    warn(f"Not-Aus {modus} {k}: Spot-Aufträge nicht (alle) gelöscht ({type(ex).__name__}) — verkaufe, was frei ist.")
                frei, ok = _notaus_verkaufen(spot, k, sym, coin, frei + (gebunden if storno_ok else 0.0), behalten, kurs, regeln, erg,
                                             warn, modus)
            elif gebunden > 0:
                warn(f"Not-Aus {modus} {k}: Verkaufen geht gerade nicht — der Spot-Stop bleibt stehen ({gebunden:g} {coin}).")
        if behalten:
            warn(f"Not-Aus {modus} {k}: Short ließ sich nicht schliessen — {behalten:g} {coin} bleiben als Absicherung stehen.")
        try:  # 4) nachprüfen — am Kontostand, nicht an einer Annahme
            pos = _nochmal(lambda: fut.position_info(sym), SCHUTZ_WARTEN)[0]
            frei, gebunden = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
            pruefbar = True
        except Exception as ex:  # noqa: BLE001
            pruefbar = False
            warn(f"{modus} {k}: Nachprüfung nicht möglich ({type(ex).__name__}) — Schutz nach dem zuletzt bekannten Stand, bitte im "
                 "Binance-Konto prüfen!")
        rest = frei + gebunden
        q_unklar = unklar_sell(buch, k)
        if pruefbar and pos == 0 and rest * kurs < regeln["min_notional"] and q_unklar is None:
            if not fut_offen:
                erg["zeilen"].append(f"✅ {modus} {k}: geschlossen" + (f" (Rest {rest:g} {coin} unter dem Binance-Minimum)" if rest else ""))
            else:  # Position und Coins weg, aber ein Futures-Auftrag steht noch: nie «alles zu» melden
                erg["alles_zu"] = False
                warn(f"{modus} {k}: Position zu, aber Futures-Aufträge noch offen (reduceOnly — ohne Position wirkungslos). "
                     "Not-Aus wiederholen!")
            continue
        erg["alles_zu"] = False
        if pruefbar and (pos or rest * kurs >= regeln["min_notional"]):
            warn(f"{modus} {k}: NICHT alles zu — Perp {pos:+g}, Spot {rest:g} {coin}. Bitte im Binance-Konto prüfen!")
        # was jetzt ungesichert ist, bekommt sofort einen Schutz-Stop (nie Long ohne Absicherung UND ohne Stop); ein unklarer
        # Auftrag auf diesem Markt → beide Seiten ganz
        _notaus_schutz(spot, fut, st, k, sym, coin, pos, pos_vor, frei, gebunden, kurs, regeln, warn, modus, q_unklar)
    if buch.get("unklar"):
        erg["alles_zu"] = False
        warn(f"Not-Aus {modus}: {len(buch['unklar'])} Auftrag/Aufträge noch unklar — NICHT «alles zu» (der Markt ist beidseitig "
             "gesichert: kommt ein unklarer Short verspätet an, hat er einen Stop). Not-Aus in einigen Minuten wiederholen (er fragt "
             "erneut nach; nach 10 Minuten gilt ein unbekannter Auftrag als nie ausgeführt).")
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


def _notaus_verkaufen(spot, k, sym, coin, bekannt, behalten, kurs, regeln, erg, warn, modus):
    """Not-Aus: alle FREIEN Coins ausser «behalten» verkaufen — mehrere Versuche, den Rest jedes Mal neu lesen (ist das Konto
    kurz nicht lesbar: zuletzt bekannter Stand). → (frei, ok); ok = verkauft bzw. der Rest liegt unter dem Binance-Minimum."""
    for versuch in range(VERKAUF_VERSUCHE + 1):
        try:
            bekannt = bestand(_nochmal(spot.konto), coin)[0]
        except Exception:  # noqa: BLE001
            pass
        m = PL.runde(max(0.0, bekannt - behalten), regeln["step"])
        if m * kurs < regeln["min_notional"]:
            return bekannt, True
        if versuch == VERKAUF_VERSUCHE:
            break
        try:
            r = spot.markt(sym, "SELL", m)
            ausg = float(r.get("executedQty") or 0)
            bekannt = max(0.0, bekannt - ausg)
            erg["auftraege"].append((k, "spot", "SELL", ausg or m))
        except BF.UnklarFehler:
            continue  # der Kontostand im nächsten Versuch zeigt, was übrig ist
        except Exception as ex:  # noqa: BLE001
            if not _voruebergehend(ex) or versuch == VERKAUF_VERSUCHE - 1:
                warn(f"Not-Aus {modus} {k} Spot-Verkauf: {type(ex).__name__} {str(ex)[:120]}")
                return bekannt, False
            time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)
    return bekannt, False


def _notaus_schutz(spot, fut, st, k, sym, coin, pos, pos_vor, frei, gebunden, kurs, regeln, warn, modus, unklar=None):
    """Not-Aus unvollständig: was jetzt UNGESICHERT ist, bekommt sofort einen Stop — nie ein Long ohne Absicherung UND ohne
    Stop (bis zum nächsten Not-Aus-Versuch können Stunden vergehen). Bestehende eigene Stops bleiben stehen (gesperrte Coins
    hält im Pilot-Konto ein eigener Stop) und es kommt nur ein Stop über den Rest dazu — ausser ein Stop ist zu gross (er träfe
    beim Auslösen die Absicherung): der wird ersetzt. Position unbekannt (pos=None) oder ein unklarer Auftrag auf dem Markt
    (unklar = Menge unklarer Short-Aufträge): beide Seiten ganz — Spot-Stop über alle Coins, reduceOnly-Perp-Stop über den
    ganzen Short (+ unklare); löst einer aus, schützt der andere den Rest. Würde ein Stop sofort auslösen: 5 % vom FRISCHEN Kurs."""
    def frisch():
        try:
            return _nochmal(lambda: spot.kurs(sym))
        except Exception:  # noqa: BLE001
            return kurs

    def setzen(platz, erst, seite, cid):
        """Zum ersten gültigen Stop-Kurs, sonst 5 % vom Kurs (dieselbe Kennung); würde er sofort auslösen: 5 % vom frischen Kurs."""
        try:
            return _setze_stop(platz, [erst, kurs * (1 - NOT_STOP_ABSTAND * seite)], cid, warten=SCHUTZ_WARTEN)
        except Exception as ex:  # noqa: BLE001
            if not _sofort_ausgeloest(ex):
                raise
            return _setze_stop(platz, [frisch() * (1 - NOT_STOP_ABSTAND * seite)], cid, warten=SCHUTZ_WARTEN)
    beidseitig = pos is None or unklar is not None
    coins = frei + gebunden
    short = max(0.0, -(pos_vor if pos is None else pos))
    soll_s = coins if beidseitig else max(0.0, coins - short)
    # ── Spot: gesperrte Coins gelten als gesichert; zu grosse eigene Stops (über die Absicherung hinaus) werden ersetzt
    try:
        eigene = _nochmal(lambda: spot.eigene_stops(sym), SCHUTZ_WARTEN)
    except Exception:  # noqa: BLE001
        eigene = None
    if eigene and gebunden > soll_s + regeln["step"] / 2:
        if not _alle_weg(eigene, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, []):
            st["spot"] = None
            try:
                frei, gebunden = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
            except Exception:  # noqa: BLE001
                frei, gebunden = coins, 0.0
    menge = PL.runde(max(0.0, min(frei, soll_s - gebunden)), regeln["step"])
    if menge * kurs >= regeln["min_notional"]:
        try:
            r, p = setzen(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), _stop_preis(None, st.get("p_long"), kurs, +1),
                          +1, _kennung(CID_STOP_SPOT))
            st["spot"], st["p_long"] = r.get("orderId"), p
            warn(f"Not-Aus {modus} {k}: Schutz-Stop gesetzt — {menge:g} {coin} @ {PL.runde(p, regeln['tick']):g}. Not-Aus wiederholen!")
        except Exception as ex:  # noqa: BLE001
            warn(f"Not-Aus {modus} {k}: {menge:g} {coin} ungesichert UND Schutz-Stop abgelehnt ({type(ex).__name__}) — sofort prüfen!")
    # ── Perp: Stop über den ungesicherten Short (beidseitig: den ganzen Short + unklare Short-Aufträge)
    if (short + (unklar or 0.0)) * kurs < STAUB_USDT:
        return
    try:
        rf = _nochmal(lambda: fut.regeln(sym), SCHUTZ_WARTEN)
        if beidseitig:
            soll_p = PL.runde(short + (unklar or 0.0), rf["step"])
        else:
            teil = short - min(coins, short)
            soll_p = (short - PL.runde(min(coins, short), rf["step"])) if teil >= 0.5 * rf["step"] and teil * kurs >= STAUB_USDT else 0.0
        try:
            eigene_p = _nochmal(lambda: fut.eigene_stops(sym), SCHUTZ_WARTEN)
            gedeckt = sum(float(a.get("quantity") or 0) for a in eigene_p)
        except Exception:  # noqa: BLE001 — nicht lesbar: lieber zwei reduceOnly-Stops als ein Short ohne Stop
            eigene_p, gedeckt = None, 0.0
        if eigene_p and not beidseitig and gedeckt > soll_p + rf["step"] / 2 and coins * kurs >= STAUB_USDT:
            # zu gross: löst er aus, kauft er mehr zurück als ungesichert ist → Coins ohne Short UND ohne Stop → ersetzen
            if not _alle_weg(eigene_p, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, []):
                st["perp"], gedeckt = None, 0.0
        fehlt = PL.runde(soll_p - gedeckt, rf["step"]) if soll_p - gedeckt > rf["step"] / 2 else 0.0
        if fehlt > 0 and fehlt * kurs >= STAUB_USDT:
            try:
                r, p = setzen(lambda preis, c: fut.stop_menge(sym, "BUY", fehlt, preis, rf["tick"], cid=c),
                              _stop_preis(None, st.get("p_short"), kurs, -1), -1, _kennung(CID_STOP_PERP))
            except Exception as ex:  # noqa: BLE001
                kleiner = PL.runde(max(0.0, short - gedeckt), rf["step"])
                if not (beidseitig and _reduce_abgelehnt(ex) and rf["step"] / 2 <= kleiner < fehlt - rf["step"] / 2):
                    raise
                # nimmt Binance keinen reduceOnly-Stop über mehr als den offenen Short: wenigstens den sichern
                r, p = setzen(lambda preis, c: fut.stop_menge(sym, "BUY", kleiner, preis, rf["tick"], cid=c),
                              _stop_preis(None, st.get("p_short"), kurs, -1), -1, _kennung(CID_STOP_PERP))
                warn(f"Not-Aus {modus} {k}: Binance nimmt keinen reduceOnly-Stop über mehr als den offenen Short — Stop nur über "
                     f"{kleiner:g}. Bitte prüfen!")
                fehlt = kleiner
            st["perp"], st["p_short"] = r.get("algoId"), p
            warn(f"Not-Aus {modus} {k}: Schutz-Stop für den Short gesetzt — {fehlt:g} @ {PL.runde(p, rf['tick']):g}. Not-Aus wiederholen!")
    except Exception as ex:  # noqa: BLE001
        warn(f"Not-Aus {modus} {k}: Short {short:g} ungesichert UND Schutz-Stop abgelehnt ({type(ex).__name__}) — sofort prüfen!")


def protokoll_schreiben(eintrag):
    try:
        alt = json.loads(PROTOKOLL.read_text()) if PROTOKOLL.exists() else []
    except (OSError, ValueError):
        alt = []
    PROTOKOLL.parent.mkdir(exist_ok=True)
    tmp = Path(str(PROTOKOLL) + ".neu")
    tmp.write_text(json.dumps((alt + [eintrag])[-2000:], ensure_ascii=False, indent=1))
    tmp.replace(PROTOKOLL)  # nie halb geschrieben
