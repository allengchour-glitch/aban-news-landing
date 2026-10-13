#!/usr/bin/env python3
"""Pilot 2.0 — Ausführung über Binance Spot UND USDⓈ-M Futures (Stufe 2 der Live-Umstellung).

Rechnung: pilot2_plan.py (Richtung long über Spot, short über Perpetual, freier Teil als Funding-Ernte, Pfand 100 %).
Einschalten: KRYPTO_PILOT2=an (sonst handelt der Pilot wie bisher alles über Futures).

Sicherungen:
  • TESTNETZ ist Standard: Spot über testnet.binance.vision (BINANCE_API_KEY/SECRET), Futures über testnet.binancefuture.com
    (BINANCE_FUTURES_API_KEY/SECRET). Im Testnetz gibt es kein Verschieben zwischen den Konten → beide Test-Konten brauchen USDT.
  • Echtes Geld NUR, wenn ALLES gesetzt ist: BINANCE_TESTNET=false, BINANCE_FUTURES_TESTNET=false,
    KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD" und KRYPTO_PILOT2=an. Dann EIN Schlüssel PILOT2_API_KEY/PILOT2_API_SECRET.
  • Rechteprüfung vor jedem Echtgeld-Lauf: Auszahlungen, Margin-Leihe und Überweisung an andere Nutzer müssen AUS sein,
    Spot-Handel, Futures und «Universal Transfer» (Verschieben zwischen DEINEN Konten) AN. Sonst: kein Auftrag.
  • Hebel 1, Margin ISOLATED, nur Marktaufträge, Verkleinern mit reduceOnly. Höchstens KI_BOT_ANTEIL (0.5) des Kontowerts,
    je Auftrag höchstens KI_BOT_MAX_AUFTRAG USDT (1000). Pause (Datei PAUSE) = nichts tun; Not-Aus (KI_BOT_STOP=1 oder Datei
    STOP) = alle Pilot-Positionen schliessen (Spot verkaufen, Perpetual zurückkaufen).
  • Stops nur auf den Richtungsteil: Spot STOP_LOSS_LIMIT (Limit 2 % unter Stop), Perpetual STOP_MARKET mit Menge + reduceOnly.
  • Eigenes Konto: Läuft im selben Binance-Konto ein anderer Bot (Spot-Bot KRYPTO_BROKER=binance, ETH-Sparplan, kopierte
    Telegram-Calls), handelt Pilot 2.0 NICHT. Er führt Buch über SEINE Coins (data/krypto-pilot2-bestand.json) und verkauft nie
    mehr als diese — eigene Coins von dir im Konto bleiben unberührt.
  • Deckel: KRYPTO_PILOT2_KAPITAL (USDT) = höchstens so viel verwaltet Pilot 2.0. Für echtes Geld PFLICHT.
  • Unklarer Auftragsstatus (Netz weg, 5xx): Nachfrage per eigener Kennung; bleibt es unklar → für diesen Markt nichts mehr
    vergrössern, Warnung aufs Handy.
"""
from __future__ import annotations

import json
import os
import random
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
import sys  # noqa: E402
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
STOP_LIMIT_ABSTAND = 0.02


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
    return {"echtgeld": echt, "fehler": fehler,
            "spot": {"key": sk, "secret": ss, "basis": s_url or (SPOT_ECHT if echt else SPOT_TEST)},
            "futures": {"key": fk, "secret": fs, "basis": f_url or (FUT_ECHT if echt else FUT_TEST), "spot": s_url or SPOT_ECHT},
            "anteil": max(0.0, min(1.0, zahl("KI_BOT_ANTEIL", 0.5))), "max_auftrag": max(0.0, zahl("KI_BOT_MAX_AUFTRAG", 1000)),
            "stop": env.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists(),
            "deckel": zahl("KRYPTO_PILOT2_KAPITAL", 0.0 if echt else 10000.0),
            "konflikte": konflikte(env),
            "pause": (HIER.parent / "ki_bot" / "PAUSE").exists()}


class Spot(BB.Binance):
    """Spot-Anschluss mit eigener Auftragskennung + Nachfrage (wie Futures), Stop-Limit, Abbrechen und Verschieben."""

    def markt(self, symbol, seite, menge):
        cid = f"p2{int(time.time() * 1000)}{random.randint(0, 999999):06d}"
        p = {"symbol": symbol, "side": seite, "type": "MARKET", "quantity": BB.format_menge(menge),
             "newOrderRespType": "RESULT", "newClientOrderId": cid}
        try:
            return self._req("POST", "/api/v3/order", p, signiert=True)
        except (BB.BinanceFehler, *BF.NETZFEHLER) as ex:
            if isinstance(ex, BB.BinanceFehler) and ex.code < 500 and ex.code != 408:
                raise
            for warte in BF.NACHFRAGE_WARTEN:
                time.sleep(warte)
                try:
                    o = self._req("GET", "/api/v3/order", {"symbol": symbol, "origClientOrderId": cid}, signiert=True) or {}
                except (BB.BinanceFehler, *BF.NETZFEHLER):
                    continue
                if o.get("status") in ("FILLED", "PARTIALLY_FILLED"):
                    return {**o, "nachgefragt": True}
                if o.get("status") in ("CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
                    raise ex
            raise BF.UnklarFehler(f"Spot-Status unklar nach {type(ex).__name__}") from ex

    def offene(self, symbol):
        return self._req("GET", "/api/v3/openOrders", {"symbol": symbol}, signiert=True) or []

    def abbrechen(self, symbol):
        try:
            self._req("DELETE", "/api/v3/openOrders", {"symbol": symbol}, signiert=True)
        except BB.BinanceFehler as ex:
            if "-2011" not in str(ex.msg):  # «Unknown order» = es gab keine
                raise

    def stop_verkauf(self, symbol, menge, stop, tick):
        limit = PL.runde(stop * (1 - STOP_LIMIT_ABSTAND), tick)
        return self._req("POST", "/api/v3/order", {"symbol": symbol, "side": "SELL", "type": "STOP_LOSS_LIMIT", "timeInForce": "GTC",
                                                   "quantity": BB.format_menge(menge), "stopPrice": BB.format_menge(PL.runde(stop, tick)),
                                                   "price": BB.format_menge(limit)}, signiert=True)

    def verschieben(self, richtung, betrag):
        typ = {"SPOT_ZU_FUTURES": "MAIN_UMFUTURE", "FUTURES_ZU_SPOT": "UMFUTURE_MAIN"}[richtung]
        return self._req("POST", "/sapi/v1/asset/transfer", {"type": typ, "asset": "USDT", "amount": f"{betrag:.2f}"}, signiert=True)

    def regeln2(self, symbol):
        info = self._req("GET", "/api/v3/exchangeInfo", {"symbol": symbol})["symbols"][0]
        f = {x["filterType"]: x for x in info["filters"]}
        lot = f.get("LOT_SIZE", {})
        notional = f.get("NOTIONAL") or f.get("MIN_NOTIONAL") or {}
        return {"step": float(lot.get("stepSize", "0.00001")), "tick": float(f.get("PRICE_FILTER", {}).get("tickSize", "0.01")),
                "min_notional": float(notional.get("minNotional", "5"))}


class Fut(BF.Futures):
    def stop_menge(self, symbol, seite, menge, preis, tick):
        """Stop NUR für den Richtungsteil: Menge + reduceOnly (nicht closePosition — sonst fiele auch die Ernte-Absicherung weg)."""
        return self._req("POST", "/fapi/v1/algoOrder", {"algoType": "CONDITIONAL", "symbol": symbol, "side": seite, "type": "STOP_MARKET",
                                                        "quantity": BF.fmt(menge), "triggerPrice": BF.fmt(PL.runde(preis, tick)),
                                                        "reduceOnly": "true", "workingType": "MARK_PRICE", "priceProtect": "true"},
                         signiert=True)


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


def bestand_lesen(datei, modus):
    try:
        return {k: float(v) for k, v in (json.loads(Path(datei).read_text()).get(modus) or {}).items()}
    except (OSError, ValueError, AttributeError):
        return {}


def bestand_schreiben(datei, modus, werte):
    try:
        alt = json.loads(Path(datei).read_text()) if Path(datei).exists() else {}
    except ValueError:
        alt = {}
    alt[modus] = {k: round(v, 10) for k, v in werte.items()}
    Path(datei).parent.mkdir(exist_ok=True)
    Path(datei).write_text(json.dumps(alt, indent=1))


def rechte_ok(r):
    """Echtgeld-Schlüssel: Auszahlung/Margin/Überweisung an Dritte AUS; Spot, Futures, Universal Transfer AN."""
    verboten = [k for k in ("enableWithdrawals", "enableMargin", "enableInternalTransfer") if r.get(k)]
    fehlt = [k for k in ("enableSpotAndMarginTrading", "enableFutures", "permitsUniversalTransfer") if not r.get(k)]
    return not verboten and not fehlt, verboten, fehlt


def bestand(konto, asset):
    for b in konto.get("balances", []):
        if b["asset"] == asset:
            return float(b.get("free", 0) or 0), float(b.get("locked", 0) or 0)
    return 0.0, 0.0


def ausfuehren(ents, trocken=False, env=None, spot=None, fut=None, protokolliere=None, bestand_datei=None):
    """ents: Pilot-Entscheide [{markt, hebel, stop_long, stop_short, stand}]. → Ergebnis {zeilen, auftraege, warnung, kapital, plan}."""
    cfg = einstellungen(env)
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": "echt" if cfg["echtgeld"] else "testnetz"}

    def warn(t):
        erg["warnung"] = True
        erg["zeilen"].append("⚠️ " + t)
    if cfg["fehler"]:
        warn(cfg["fehler"])
        return erg
    if cfg["konflikte"]:
        warn("Pilot 2.0 braucht das Binance-Konto für sich allein. Aktiv sind auch: " + ", ".join(cfg["konflikte"])
             + ". Erst ausschalten (setx … \"\") — kein Auftrag.")
        return erg
    if cfg["deckel"] <= 0:
        warn("KRYPTO_PILOT2_KAPITAL fehlt: Für echtes Geld musst du festlegen, wie viele USDT Pilot 2.0 höchstens verwaltet — kein Auftrag.")
        return erg
    if not (cfg["spot"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["key"] and cfg["futures"]["secret"]):
        erg["zeilen"].append("Pilot 2.0: keine Schlüssel — nichts gehandelt.")
        return erg
    if cfg["pause"] and not trocken:
        erg["zeilen"].append("Pilot 2.0: Pause (Auto-Handel aus) — nichts gehandelt.")
        return erg
    spot = spot or Spot(cfg["spot"])
    fut = fut or Fut(cfg["futures"])
    if cfg["echtgeld"]:
        ok, verboten, fehlt = rechte_ok(spot.rechte())
        if not ok:
            warn(f"Schlüssel-Rechte falsch — kein Auftrag. Ausschalten: {', '.join(verboten) or '–'}; einschalten: {', '.join(fehlt) or '–'}.")
            return erg
        if fut.hedge_modus():
            warn("Futures-Konto steht im Hedge-Modus — Pilot 2.0 braucht den Einweg-Modus. Kein Auftrag.")
            return erg

    maerkte = [e for e in ents if e["markt"] in COINS]
    b_datei = bestand_datei or BESTAND
    eigen = bestand_lesen(b_datei, erg["modus"])
    konto_s = spot.konto()
    usdt_s = bestand(konto_s, "USDT")[0]
    konto_f = fut.konto()
    f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0)
    f_offen = float(konto_f.get("totalUnrealizedProfit", 0) or 0)
    f_abziehbar = float(konto_f.get("maxWithdrawAmount", f_saldo) or 0)
    daten = {}
    kapital = usdt_s + f_saldo + f_offen
    for e in maerkte:
        sym, coin = COINS[e["markt"]]
        frei, gesperrt = bestand(konto_s, coin)
        kurs = spot.kurs(sym)
        rs, rf = spot.regeln2(sym), fut.regeln(sym)
        mein = min(eigen.get(coin, 0.0), frei + gesperrt)  # nie mehr als vorhanden, nie fremde Coins
        daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": mein, "perp": fut.position(sym), "kurs": kurs, "rs": rs, "rf": rf}
        kapital += mein * kurs
    erg["kapital"] = round(kapital, 2)
    verwaltet = min(kapital * cfg["anteil"], cfg["deckel"])

    # Not-Aus: alles schliessen, was der Pilot hält (beide Konten), keine neuen Positionen
    if cfg["stop"]:
        for e in maerkte:
            d = daten[e["markt"]]
            if trocken:
                erg["zeilen"].append(f"Not-Aus (trocken): würde {d['spot']:g} {d['coin']} verkaufen und {d['perp']:g} Perp schliessen")
                continue
            try:
                spot.abbrechen(d["sym"])
                fut.stops_loeschen(d["sym"])
                if d["perp"]:
                    fut.auftrag(d["sym"], "BUY" if d["perp"] < 0 else "SELL", abs(d["perp"]), True)
                    erg["auftraege"].append(("perp", "BUY" if d["perp"] < 0 else "SELL", abs(d["perp"])))
                m = PL.runde(d["spot"], d["rs"]["step"])
                if m * d["kurs"] >= d["rs"]["min_notional"]:
                    spot.markt(d["sym"], "SELL", m)
                    erg["auftraege"].append(("spot", "SELL", m))
                    eigen[d["coin"]] = max(0.0, eigen.get(d["coin"], 0.0) - m)
                    bestand_schreiben(b_datei, erg["modus"], eigen)
            except Exception as ex:  # noqa: BLE001
                warn(f"Not-Aus {e['markt']}: {type(ex).__name__} {str(ex)[:120]} — bitte im Binance-Konto prüfen!")
        erg["zeilen"].append("🛑 Not-Aus: Pilot-2.0-Positionen geschlossen.")
        return erg

    basis_g = verwaltet / max(1, len(maerkte))
    plaene = {}
    for e in maerkte:
        d = daten[e["markt"]]
        z = max(-1.0, min(1.0, float(e["hebel"])))
        regeln = {"spot_step": d["rs"]["step"], "perp_step": d["rf"]["step"], "spot_min": d["rs"]["min_notional"], "perp_min": d["rf"]["min_notional"]}
        plaene[e["markt"]] = PL.plane(e["markt"], z, basis_g, d["kurs"], d["spot"], d["perp"], regeln, cfg["max_auftrag"])
    pfand = sum(p["pfand"] for p in plaene.values())
    bedarf = sum(m * daten[k]["kurs"] * 1.003 for k, p in plaene.items() for konto, seite, m, _ in p["schritte"] if konto == "spot" and seite == "BUY")
    erloes = sum(m * daten[k]["kurs"] * 0.997 for k, p in plaene.items() for konto, seite, m, _ in p["schritte"] if konto == "spot" and seite == "SELL")
    erg["plan"] = {k: {"schritte": p["schritte"], "stop_spot": p["stop_spot"], "stop_perp": p["stop_perp"]} for k, p in plaene.items()}
    if trocken:
        uw = PL.verschieben(pfand, f_saldo, f_abziehbar, usdt_s + erloes, bedarf)
        erg["zeilen"] += [f"{k}: " + (", ".join(f"{a} {s} {m:g}" for a, s, m, _ in p["schritte"]) or "nichts") for k, p in plaene.items()]
        erg["zeilen"].append(f"Verschieben: {uw[0]} {uw[1]:.2f} USDT" if uw else "Verschieben: nichts")
        return erg

    gesperrt_markt = set()

    def schritt(markt, konto, seite, menge, reduce):
        d = daten[markt]
        try:
            if konto == "spot":
                r = spot.markt(d["sym"], seite, menge) or {}
                gefuellt = float(r.get("executedQty") or menge)
                eigen[d["coin"]] = max(0.0, eigen.get(d["coin"], 0.0) + (gefuellt if seite == "BUY" else -gefuellt))
                bestand_schreiben(b_datei, erg["modus"], eigen)
            else:
                fut.auftrag(d["sym"], seite, menge, reduce)
            erg["auftraege"].append((markt, konto, seite, menge))
            return True
        except BF.UnklarFehler as ex:
            gesperrt_markt.add(markt)
            warn(f"{markt} {konto} {seite} {menge:g}: Status unklar ({ex}) — dieser Markt wird heute nicht weiter verändert.")
        except Exception as ex:  # noqa: BLE001
            gesperrt_markt.add(markt)
            warn(f"{markt} {konto} {seite} {menge:g} abgelehnt: {type(ex).__name__} {str(ex)[:120]}")
        return False

    # 1) alte Stops weg (Spot-Stops sperren Coins), dann verkleinern
    for k in plaene:
        try:
            spot.abbrechen(daten[k]["sym"])
            fut.stops_loeschen(daten[k]["sym"])
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: alte Stops nicht gelöscht ({type(ex).__name__}) — heute keine Änderung an diesem Markt.")
            gesperrt_markt.add(k)
    for k, p in plaene.items():
        for konto, seite, m, red in p["schritte"]:
            if k not in gesperrt_markt and (red or (konto == "spot" and seite == "SELL")):
                schritt(k, konto, seite, m, red)
    # 2) Geld verschieben (nur echt; im Testnetz sind die Konten getrennt)
    konto_s = spot.konto()
    usdt_s = bestand(konto_s, "USDT")[0]
    konto_f = fut.konto()
    f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0)
    f_abziehbar = float(konto_f.get("maxWithdrawAmount", f_saldo) or 0)
    uw = PL.verschieben(pfand, f_saldo, f_abziehbar, usdt_s, bedarf)
    if uw and cfg["echtgeld"]:
        try:
            spot.verschieben(*uw)
            erg["auftraege"].append(("konto", uw[0], uw[1]))
        except Exception as ex:  # noqa: BLE001
            warn(f"Verschieben {uw[0]} {uw[1]:.2f} USDT gescheitert: {type(ex).__name__} — Vergrössern heute ausgesetzt.")
            gesperrt_markt.update(plaene)
    elif uw:
        erg["zeilen"].append(f"Testnetz: kein Verschieben möglich ({uw[0]} {uw[1]:.2f} USDT wäre nötig) — beide Test-Konten mit USDT füllen.")
    # 3) vergrössern: zuerst Spot (Ernte-Coins), dann Short — so ist ein offener Ernte-Teil höchstens kurz long, nie kurz short
    for k, p in plaene.items():
        if k in gesperrt_markt:
            continue
        try:
            if any(konto == "perp" and not red for konto, _, _, red in p["schritte"]):
                fut.einrichten(daten[k]["sym"], 1)
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: Futures-Einstellung gescheitert ({type(ex).__name__}) — kein Short.")
            gesperrt_markt.add(k)
            continue
        for konto, seite, m, red in sorted([s for s in p["schritte"] if not (s[3] or (s[0] == "spot" and s[1] == "SELL"))], key=lambda s: s[0] != "spot"):
            if k in gesperrt_markt or not schritt(k, konto, seite, m, red):
                break
    # 4) Stops nur auf den Richtungsteil, nach den Aufträgen
    for e in maerkte:
        k, d, p = e["markt"], daten[e["markt"]], plaene[e["markt"]]
        try:
            if p["stop_spot"] > 0 and e.get("stop_long"):
                spot.stop_verkauf(d["sym"], p["stop_spot"], e["stop_long"], d["rs"]["tick"])
            if p["stop_perp"] > 0 and e.get("stop_short"):
                fut.stop_menge(d["sym"], "BUY", p["stop_perp"], e["stop_short"], d["rf"]["tick"])
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")
    # 5) Kontrolle: Netto-Richtung nah am Ziel?
    for e in maerkte:
        k, d = e["markt"], daten[e["markt"]]
        try:
            s_ist = sum(bestand(spot.konto(), d["coin"]))
            s_neu = min(eigen.get(d["coin"], 0.0), s_ist)  # Gebühren in Coins / ausgelöster Stop → Buch an die Wirklichkeit anpassen
            if s_neu != eigen.get(d["coin"], 0.0):
                eigen[d["coin"]] = s_neu
                bestand_schreiben(b_datei, erg["modus"], eigen)
            p_neu = fut.position(d["sym"])
            netto = (s_neu + p_neu) * d["kurs"] / basis_g if basis_g else 0
            ziel = max(-1.0, min(1.0, float(e["hebel"])))
            if abs(netto - ziel) > 0.35 and k not in gesperrt_markt and cfg["max_auftrag"] >= basis_g:
                warn(f"{k}: Richtung {netto:+.2f} statt Ziel {ziel:+.2f} — bitte prüfen.")
            erg["zeilen"].append(f"{k}: Spot {s_neu:g} {d['coin']}, Perp {p_neu:+g}, Richtung {netto:+.2f} (Ziel {ziel:+.2f})")
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: Kontrolle nicht möglich ({type(ex).__name__}).")
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


def protokoll_schreiben(eintrag):
    try:
        alt = json.loads(PROTOKOLL.read_text()) if PROTOKOLL.exists() else []
    except ValueError:
        alt = []
    PROTOKOLL.parent.mkdir(exist_ok=True)
    PROTOKOLL.write_text(json.dumps((alt + [eintrag])[-2000:], ensure_ascii=False, indent=1))
