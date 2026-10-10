#!/usr/bin/env python3
"""ETH-Sammler — kauft regelmässig Ethereum für einen festen Betrag (Sparplan) und legt ihn auf Binance ins Staking.

  py tools/trading/krypto_bot/eth_sammler.py --status            # Bestand, Durchschnittspreis, nächster Kauf, Staking
  py tools/trading/krypto_bot/eth_sammler.py --lauf --trocken    # zeigen, was er kaufen würde
  py tools/trading/krypto_bot/eth_sammler.py --lauf              # fälligen Kauf ausführen (täglich starten ist ok)
  py tools/trading/krypto_bot/eth_sammler.py --backtest          # ehrlicher Sparplan-Test seit 2018, 2021-Hoch und 2022

Einstellungen (Umgebungsvariablen):
  ETH_SPARPLAN_BETRAG  USDT je Kauf (Standard 50)
  ETH_SPARPLAN_TAGE    Abstand der Käufe in Tagen (Standard 7 = wöchentlich)
  ETH_SPARPLAN_MAX     Obergrenze für den gesamten Einsatz in USDT (Standard 5000) — danach kauft er nicht mehr
  ETH_STAKEN           1 = gekaufte ETH ins Binance-ETH-Staking legen (WBETH). Nur mit echtem Geld: das Testnetz kennt
                       kein Staking, dort bleiben die ETH im Spot-Konto.
Schlüssel: BINANCE_API_KEY / BINANCE_API_SECRET (Spot, wie krypto.py). Testnetz ist Standard; echtes Geld nur mit
BINANCE_TESTNET=false UND KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD". Schlüssel mit Auszahlungs-, Futures- oder Margin-Recht
werden abgelehnt. Not-Aus: stop.bat (Datei tools/trading/ki_bot/STOP) oder KI_BOT_STOP=1.

Er verkauft nie, nutzt keinen Hebel und gibt nie mehr aus als das freie USDT-Guthaben. Ins Staking legt er nur ETH, die er
selbst gekauft hat — andere ETH im Konto fasst er nicht an. Logbuch: data/eth-sammler.json. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import http.client
import json
import math
import os
import sys
import urllib.error
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import broker_binance as BB  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "eth-sammler.json"
PAUSE = HIER.parent / "ki_bot" / "PAUSE"
NETZFEHLER = (OSError, http.client.HTTPException)  # Zeitlimit, abgerissene Verbindung: ob ausgeführt, ist unklar
MIN_STAKE = 0.0001       # Binance nimmt Staking-Beträge mit höchstens 4 Nachkommastellen
GEBUEHR = 0.001          # Spot-Gebühr 0,1 % (Backtest)


def fmt_zahl(x, stellen=0):
    return f"{x:,.{stellen}f}".replace(",", "'")


def einstellungen(env=None):
    env = os.environ if env is None else env
    cfg = BB.einstellungen(env)

    def zahl(name, standard):
        try:
            return float(env.get(name) or standard)
        except ValueError:
            return float(standard)

    cfg.update({"eth_symbol": "ETH" + cfg["quote"],
                "betrag": max(0.0, min(zahl("ETH_SPARPLAN_BETRAG", 50), cfg["max_auftrag"])),
                "tage": max(1, int(zahl("ETH_SPARPLAN_TAGE", 7))),
                "max_gesamt": max(0.0, zahl("ETH_SPARPLAN_MAX", 5000)),
                "staken": (env.get("ETH_STAKEN") or "0").strip() == "1"})
    return cfg


# ───────────────────────── Logbuch (je Modus getrennt) ─────────────────────────
def lies():
    lb = json.loads(LOGBUCH.read_text(encoding="utf-8")) if LOGBUCH.exists() else {}
    lb["version"] = 1
    for modus in ("testnetz", "echtgeld"):
        lb.setdefault(modus, {}).setdefault("kaeufe", [])
        lb[modus].setdefault("gestakt", [])
    return lb


def schreibe(lb):
    """Atomar (Zwischendatei + Umbenennen): ein Absturz beim Schreiben darf die gebuchten Käufe nie zerstören."""
    LOGBUCH.parent.mkdir(exist_ok=True)
    tmp = LOGBUCH.with_name(LOGBUCH.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, LOGBUCH)


# ───────────────────────── reine Rechnung (testbar) ─────────────────────────
def naechster_kauf(buch, tage):
    if not buch["kaeufe"]:
        return None
    return (date.fromisoformat(buch["kaeufe"][-1]["tag"]) + timedelta(days=tage)).isoformat()


def plane_kauf(cfg, buch, frei_quote, heute, min_notional=5.0):
    """→ (Betrag in USDT oder None, Begründung)."""
    faellig = naechster_kauf(buch, cfg["tage"])
    if faellig and heute < faellig:
        return None, f"nächster Kauf am {faellig}"
    eingesetzt = sum(k["usdt"] for k in buch["kaeufe"])
    betrag = min(cfg["betrag"], cfg["max_gesamt"] - eingesetzt)
    if betrag <= 0:
        return None, f"Obergrenze ETH_SPARPLAN_MAX ({fmt_zahl(cfg['max_gesamt'])} {cfg['quote']}) erreicht — kauft nicht mehr"
    if betrag < max(min_notional, 1.0):
        return None, f"Betrag {betrag:.2f} {cfg['quote']} unter dem Börsen-Minimum {min_notional:.2f}"
    if frei_quote < betrag:
        return None, f"zu wenig freies {cfg['quote']} ({frei_quote:.2f} < {betrag:.2f}) — bitte einzahlen"
    return round(betrag, 2), "fällig"


def netto_eth(antwort, basis="ETH"):
    """Gekaufte ETH abzüglich Gebühren, die Binance in ETH abzieht (bei Gebühr in BNB bleibt die Menge voll)."""
    menge = float(antwort.get("executedQty") or 0)
    gebuehr = sum(float(f.get("commission") or 0) for f in antwort.get("fills") or [] if f.get("commissionAsset") == basis)
    return max(0.0, menge - gebuehr)


def offen(buch):
    """Selbst gekaufte ETH, die noch nicht im Staking liegen. Ein «unklarer» Staking-Versuch (Antwort verloren) zählt als
    gestakt — lieber einmal zu wenig staken als ETH des Nutzers, die der Bot nicht gekauft hat."""
    return max(0.0, sum(k["eth"] for k in buch["kaeufe"]) - sum(s["eth"] for s in buch["gestakt"]))


def zu_staken(buch, frei_eth):
    """Höchstens die eigenen, noch offenen ETH — und nie mehr als frei im Konto. Auf 4 Stellen abgerundet."""
    menge = math.floor(min(offen(buch), frei_eth) * 10000 + 1e-9) / 10000
    return menge if menge >= MIN_STAKE else 0.0


def zusammenfassung(buch, kurs=None):
    usdt = sum(k["usdt"] for k in buch["kaeufe"])
    eth = sum(k["eth"] for k in buch["kaeufe"])
    z = {"kaeufe": len(buch["kaeufe"]), "eingesetzt": round(usdt, 2), "eth": round(eth, 8),
         "schnitt": round(usdt / eth, 2) if eth else None, "gestakt": round(sum(s["eth"] for s in buch["gestakt"]), 8)}
    if kurs and eth:
        z["wert"] = round(eth * kurs, 2)
        z["ergebnis"] = round(eth * kurs / usdt - 1, 4) if usdt else None
    return z


def sparplan_test(reihe, start, betrag=50.0, tage=7, gebuehr=GEBUEHR):
    """Sparplan auf Tagesschlusskursen: ab `start` alle `tage` Tage `betrag` kaufen. Ohne Staking-Ertrag."""
    eth = eingesetzt = 0.0
    letzter, tiefst, tiefst_tag, minus_max = None, 0.0, None, 0.0
    for tag, kurs in reihe:
        if tag < start:
            continue
        if letzter is None or (date.fromisoformat(tag) - date.fromisoformat(letzter)).days >= tage:
            eth += betrag * (1 - gebuehr) / kurs
            eingesetzt += betrag
            letzter = tag
        stand = eth * kurs / eingesetzt - 1
        minus_max = max(minus_max, eingesetzt - eth * kurs)
        if stand < tiefst:
            tiefst, tiefst_tag = stand, tag
    ende = reihe[-1][1]
    return {"start": start, "ende": reihe[-1][0], "eingesetzt": round(eingesetzt, 2), "eth": round(eth, 6),
            "schnitt": round(eingesetzt / eth, 2) if eth else None, "wert": round(eth * ende, 2),
            "ergebnis": round(eth * ende / eingesetzt - 1, 4) if eingesetzt else None,
            "tiefster_stand": round(tiefst, 4), "tiefster_tag": tiefst_tag, "groesstes_minus": round(minus_max, 2)}


# ───────────────────────── Börse ─────────────────────────
class Sammler(BB.Binance):
    def kaufen(self, symbol, quote_betrag):
        return self._req("POST", "/api/v3/order", {"symbol": symbol, "side": "BUY", "type": "MARKET",
                                                   "quoteOrderQty": f"{quote_betrag:.2f}", "newOrderRespType": "FULL"}, signiert=True)

    def staken(self, menge):
        return self._req("POST", "/sapi/v2/eth-staking/eth/stake", {"amount": f"{menge:.4f}"}, signiert=True)

    def staking_konto(self):
        return self._req("GET", "/sapi/v2/eth-staking/account", signiert=True)


def lauf(trocken=False, env=None, client=None, jetzt=None, logbuch=None):
    """Ein Lauf: fälligen Kauf ausführen, danach (nur Echtgeld + ETH_STAKEN=1) die eigenen offenen ETH staken."""
    cfg = einstellungen(env)
    heute = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    modus = "echtgeld" if cfg["echtgeld"] else "testnetz"
    erg = {"modus": modus, "kauf": None, "stake": None, "hinweis": "", "warnung": False}

    def ende(hinweis, warnung=False):
        erg["hinweis"], erg["warnung"] = hinweis, warnung
        print("ETH-Sammler: " + hinweis)
        return erg

    if not cfg["key"] or not cfg["secret"]:
        return ende("keine Schlüssel (BINANCE_API_KEY/SECRET) gesetzt — nichts zu tun.")
    if cfg["stop"]:
        return ende("Not-Aus aktiv — kein Kauf, kein Staking.")
    if PAUSE.exists() and not trocken:
        return ende("Auto-Handel ist aus (Pause) — kein Kauf, kein Staking.")
    if cfg.get("url_fehler"):
        return ende(cfg["url_fehler"], True)
    lb = lies() if logbuch is None else logbuch

    def sichern():
        if logbuch is None and not trocken:
            schreibe(lb)
    buch = lb[modus]
    c = client or Sammler(cfg)
    if cfg["echtgeld"]:
        print("⚠️  ECHTGELD-MODUS: Käufe gehen an dein echtes Binance-Konto.")
    try:
        if cfg["echtgeld"]:
            r = c.rechte()
            if r.get("enableWithdrawals") or r.get("enableFutures") or r.get("enableMargin"):
                return ende("Schlüssel erlaubt Auszahlungen, Futures oder Margin — aus Sicherheitsgründen nichts gemacht. "
                            "Neuen Schlüssel nur mit «Spot-Handel» anlegen.", True)
        konto = c.konto()
        regeln = c.regeln(cfg["eth_symbol"])
        if regeln.get("status") not in (None, "TRADING"):
            return ende(f"{cfg['eth_symbol']} ist nicht handelbar ({regeln.get('status')}).", True)
        frei_quote, _ = BB.bestand(konto, cfg["quote"])
        betrag, grund = plane_kauf(cfg, buch, frei_quote, heute, regeln["min_notional"])
        if betrag:
            kurs = c.kurs(cfg["eth_symbol"])
            print(f"{'(trocken) ' if trocken else ''}Kauf {betrag:.2f} {cfg['quote']} → ca. {betrag / kurs:.5f} ETH zu {fmt_zahl(kurs, 2)}")
            if not trocken:
                try:
                    antwort = c.kaufen(cfg["eth_symbol"], betrag)
                except (BB.BinanceFehler, *NETZFEHLER) as ex:
                    # BinanceFehler ist auch ein OSError — darum zuerst unterscheiden: eine klare Ablehnung (4xx) heisst
                    # «nicht gekauft»; nur ein Serverfehler (5xx) oder eine verlorene Antwort lässt offen, ob gekauft wurde.
                    if isinstance(ex, BB.BinanceFehler) and ex.code < 500:
                        return ende(f"Kauf abgelehnt (HTTP {ex.code}): {ex.msg} — nichts gekauft, der nächste Lauf versucht es wieder.", True)
                    # Als «unklar» buchen: so kauft der nächste Lauf nicht doppelt.
                    buch["kaeufe"].append({"tag": heute, "usdt": round(betrag, 2), "eth": 0.0, "kurs": round(kurs, 2), "unklar": True})
                    sichern()
                    return ende(f"Antwort auf den Kauf verloren ({getattr(ex, 'msg', None) or type(ex).__name__}) — bitte im "
                                "Binance-Konto prüfen. Als «unklar» gebucht, damit nicht doppelt gekauft wird.", True)
                menge = netto_eth(antwort)
                bezahlt = float(antwort.get("cummulativeQuoteQty") or betrag)
                k = {"tag": heute, "usdt": round(bezahlt, 2), "eth": round(menge, 8),
                     "kurs": round(bezahlt / float(antwort.get("executedQty") or 1), 2), "id": antwort.get("orderId")}
                buch["kaeufe"].append(k)
                erg["kauf"] = k
                sichern()  # sofort: geht danach etwas schief, ist der Kauf trotzdem gebucht
        else:
            print(f"ETH-Sammler: kein Kauf — {grund}.")
        if cfg["staken"] and not cfg["echtgeld"]:
            print("ETH-Sammler: Staking gibt es nur mit echtem Geld (Testnetz kennt es nicht) — ETH bleiben im Spot-Konto.")
        elif cfg["staken"]:
            frei_eth, _ = BB.bestand(c.konto(), "ETH")
            menge = zu_staken(buch, frei_eth)
            if menge and trocken:
                print(f"(trocken) würde {menge:.4f} ETH staken")
            elif menge:
                try:
                    a = c.staken(menge)
                    if a.get("success", True):
                        s = {"tag": heute, "eth": menge, "wbeth": float(a.get("wbethAmount") or 0)}
                        buch["gestakt"].append(s)
                        erg["stake"] = s
                        print(f"Gestakt: {menge:.4f} ETH → {s['wbeth']:.6f} WBETH")
                except BB.BinanceFehler as ex:
                    erg["hinweis"] = f"Staking abgelehnt (HTTP {ex.code}): {ex.msg} — ETH bleiben im Spot-Konto, nächster Lauf versucht es wieder."
                    erg["warnung"] = True
                    print("ETH-Sammler: " + erg["hinweis"])
                except NETZFEHLER as ex:
                    buch["gestakt"].append({"tag": heute, "eth": menge, "wbeth": 0.0, "unklar": True})
                    erg["hinweis"] = (f"Antwort auf das Staking verloren ({type(ex).__name__}) — als «unklar» gebucht, damit nicht doppelt "
                                      "gestakt wird. Bitte im Binance-Konto (Earn → ETH-Staking) prüfen.")
                    erg["warnung"] = True
                    print("ETH-Sammler: " + erg["hinweis"])
    except BB.BinanceFehler as ex:
        erg["hinweis"] = ("Binance sperrt deinen Standort (HTTP 451)." if ex.code == 451 else
                          "Schlüssel ungültig (HTTP 401)." if ex.code == 401 else f"Binance lehnt ab (HTTP {ex.code}): {ex.msg}")
        erg["warnung"] = True
        print("ETH-Sammler: " + erg["hinweis"])
    except (*NETZFEHLER, KeyError, ValueError, IndexError) as ex:
        erg["hinweis"] = f"Binance nicht erreichbar oder Antwort unerwartet: {type(ex).__name__}"
        erg["warnung"] = True
        print("ETH-Sammler: " + erg["hinweis"])
    sichern()
    return erg


def status(env=None, client=None):
    cfg = einstellungen(env)
    modus = "echtgeld" if cfg["echtgeld"] else "testnetz"
    buch = lies()[modus]
    c = client or Sammler(cfg)
    kurs = None
    try:
        kurs = c.kurs(cfg["eth_symbol"])
    except Exception:  # noqa: BLE001
        pass
    z = zusammenfassung(buch, kurs)
    print(f"ETH-Sammler ({modus}): {fmt_zahl(cfg['betrag'])} {cfg['quote']} alle {cfg['tage']} Tage · "
          f"Obergrenze {fmt_zahl(cfg['max_gesamt'])} · Staking {'an' if cfg['staken'] else 'aus'}")
    if not z["kaeufe"]:
        print("Noch keine Käufe. Der erste kommt beim nächsten --lauf.")
    else:
        print(f"{z['kaeufe']} Käufe · {fmt_zahl(z['eingesetzt'], 2)} {cfg['quote']} eingesetzt · {z['eth']:.5f} ETH · "
              f"Ø-Preis {fmt_zahl(z['schnitt'], 2)}" + (f" · Wert heute {fmt_zahl(z['wert'], 2)} ({z['ergebnis'] * 100:+.1f} %)" if "wert" in z else ""))
        print(f"Gestakt: {z['gestakt']:.4f} ETH · offen: {offen(buch):.5f} ETH · nächster Kauf: {naechster_kauf(buch, cfg['tage'])}")
    if cfg["echtgeld"] and cfg["key"]:
        try:
            s = c.staking_konto()
            halten, ertrag = float(s.get("holdingInETH") or 0), float(s.get("thirtyDaysProfitInETH") or 0)
            zeile = f"Binance-Staking gesamt: {halten:.5f} ETH · Ertrag letzte 30 Tage {ertrag:.6f} ETH"
            if halten:
                zeile += f" (≈ {ertrag / halten * 365 / 30 * 100:.1f} %/Jahr hochgerechnet)"
            print(zeile)
        except Exception as ex:  # noqa: BLE001
            print(f"Staking-Konto nicht lesbar: {getattr(ex, 'msg', type(ex).__name__)}")
    return z


def backtest(betrag=50.0, tage=7):
    import lern_bot as L
    reihe = [tuple(x) for x in L.kurse("ETH-USD", offline=False)]
    heute = datetime.now(timezone.utc).date().isoformat()
    reihe = [x for x in reihe if x[0] < heute]
    print(f"ETH-Sparplan: {betrag:.0f} USD alle {tage} Tage, Gebühr 0,1 %, OHNE Staking-Ertrag (Tagesschlusskurse, Yahoo):")
    for start, name in (("2018-01-01", "ab Jan. 2018 (Hoch 2018)"), ("2021-11-08", "ab Nov. 2021 (Allzeithoch damals)"),
                        ("2022-01-01", "ab Jan. 2022")):
        r = sparplan_test(reihe, start, betrag, tage)
        print(f"  {name:34} eingesetzt {fmt_zahl(r['eingesetzt']):>7} → Wert {fmt_zahl(r['wert']):>7} ({r['ergebnis'] * 100:+6.1f} %) · "
              f"Ø-Preis {fmt_zahl(r['schnitt'])}")
        print(f"  {'':34} schlimmster Moment {r['tiefster_stand'] * 100:+.0f} % ({r['tiefster_tag']}) · grösstes Minus "
              f"{fmt_zahl(r['groesstes_minus'])} USD")
    print("Vergangenheit ist keine Garantie. Ein Sparplan glättet den Einstiegspreis — gegen einen langen Preiszerfall schützt er nicht.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--trocken", action="store_true")
    ap.add_argument("--backtest", action="store_true")
    a = ap.parse_args()
    if a.backtest:
        cfg = einstellungen()
        backtest(cfg["betrag"] or 50.0, cfg["tage"])
        return 0
    if a.status:
        status()
        return 0
    if not a.lauf:
        ap.print_help()
        return 0
    import sperre
    try:
        with sperre.lauf_sperre("eth-sammler", warten=0 if a.trocken else 120):
            erg = lauf(trocken=a.trocken)
    except sperre.Besetzt as ex:
        print(f"ETH-Sammler: {ex} Dieser Lauf kauft nicht — einfach später nochmals starten.")
        return 0
    if erg["warnung"] and not a.trocken:
        import signale as SG
        SG.push(f"⚠️ ETH-Sammler ({erg['modus']}): {erg['hinweis']}\nKeine Anlageberatung.")
    if erg["kauf"] or erg["stake"]:
        import signale as SG
        z = zusammenfassung(lies()[erg["modus"]], erg["kauf"]["kurs"] if erg["kauf"] else None)
        t = "🪙 ETH-Sammler" + (" (Testnetz)" if erg["modus"] == "testnetz" else "")
        if erg["kauf"]:
            k = erg["kauf"]
            t += f": {k['usdt']:.2f} USDT → {k['eth']:.5f} ETH zu {fmt_zahl(k['kurs'], 2)}"
        t += f"\nGesamt {z['eth']:.5f} ETH für {fmt_zahl(z['eingesetzt'], 2)} USDT (Ø {fmt_zahl(z['schnitt'] or 0, 2)}) · gestakt {z['gestakt']:.4f} ETH"
        SG.push(t + "\nKeine Anlageberatung.")
    return 3 if erg["warnung"] else 0  # 3 = Warnung, schon aufs Handy gemeldet (krypto-auto.bat unterscheidet das vom Absturz)


if __name__ == "__main__":
    raise SystemExit(main())
