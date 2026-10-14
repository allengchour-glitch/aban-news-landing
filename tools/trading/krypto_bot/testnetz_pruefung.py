#!/usr/bin/env python3
"""Testnetz-Prüfung für Pilot 2.0: Binance-Verhalten, auf das sich Pilot 2.0 verlässt und das die Doku offen lässt, im
Binance-TESTNETZ (Spielgeld) nachprüfen — bevor echtes Geld fliesst. Benutzt genau die Anschlüsse von Pilot 2.0
(pilot2_live.Spot / Fut) und prüft damit auch, ob Pilot 2.0 die Antworten richtig versteht.

  A  Futures: reduceOnly-Stop (bedingter Algo-Auftrag, STOP_MARKET) über MEHR als den offenen Short — nimmt Binance ihn an,
     bleibt er stehen? Ohne Position (verspätet ankommender Short), zwei Stops gleichzeitig (Phase «zuerst neu setzen, dann
     alten löschen»), nach dem Schliessen der Position, reduceOnly-Marktauftrag über mehr als die Position (nie long drehen).
  B  Spot: Stop ersetzen per cancelReplace (STOP_ON_FAILURE). Lehnt Binance den neuen Auftrag ab — steht der alte noch, und
     liest Pilot 2.0 die Antwort richtig (ok / nichts = alter steht / nur_storno = alter weg)? Fälle: würde sofort auslösen,
     Filter, zu wenig Coins, alter Auftrag schon weg, Erfolg, Not-Aus-Verkauf.

Sicherheit: NUR Testnetz-Adressen (Spot testnet.binance.vision, Futures testnet.binancefuture.com oder demo-fapi.binance.com);
jede andere Adresse lehnt das Skript ab, bevor es etwas sendet. Es handelt nur auf einem Futures-Symbol ohne Position und ohne
offene Aufträge, setzt nur eigene Aufträge (Kennung p2t…) und räumt am Ende auf (eigene Aufträge weg, eigene Position zu).

Aufruf auf dem PC — in EINEM neuen Fenster, mit «set» nur für dieses Fenster (nicht «setx», die echten Schlüssel bleiben):
  set BINANCE_API_KEY=<Spot-Testnetz-Schlüssel>               (testnet.binance.vision)
  set BINANCE_API_SECRET=<…>
  set BINANCE_FUTURES_API_KEY=<Futures-Testnetz-Schlüssel>    (testnet.binancefuture.com)
  set BINANCE_FUTURES_API_SECRET=<…>
  python tools\\trading\\krypto_bot\\testnetz_pruefung.py         liest nur (Schlüssel, Regeln, Symbol leer?) — sendet nichts
  python tools\\trading\\krypto_bot\\testnetz_pruefung.py --los   prüft im Testnetz (rund 1 Minute) und räumt auf
Nicht laufen lassen, während ein anderer Bot im selben Testnetz-Konto handelt. Bericht: Bildschirm und
data/krypto-pilot2-testnetz-pruefung.json. Rückgabe 0 = alles wie erwartet, 1 = Abweichung, 2 = nicht geprüft. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_binance as BB  # noqa: E402
import broker_futures as BF  # noqa: E402
import pilot2_live as P2  # noqa: E402

SPOT_TESTNETZ = "https://testnet.binance.vision"
FUT_TESTNETZ = "https://testnet.binancefuture.com"
SPOT_HOSTS = {"testnet.binance.vision"}
FUT_HOSTS = {"testnet.binancefuture.com", "demo-fapi.binance.com"}
LOKAL = {"127.0.0.1", "localhost"}   # nur für die Tests gegen die nachgebaute Börse (pruef_boerse.py)
KENNUNG = "p2t"        # eigene Aufträge dieses Skripts (Pilot 2.0 selbst: p2s…, p2a…, p2<Ziffern>)
STEHEN_S = 5.0         # so lange warten, ob ein angenommener Stop stehen bleibt
BERICHT = HIER.parents[2] / "data" / "krypto-pilot2-testnetz-pruefung.json"
OFFEN = ("NEW", "PARTIALLY_FILLED")


class Abbruch(Exception):
    """Vorbedingung fehlt (falsche Adresse, Schlüssel, Symbol nicht leer) → nichts senden."""


def adresse(url, erlaubt, name):
    teile = urllib.parse.urlparse(url)
    host = teile.hostname or ""
    if host in LOKAL:
        return url
    if host not in erlaubt or teile.scheme != "https":
        raise Abbruch(f"{name}-Adresse {url!r} ist kein Binance-Testnetz — aus Sicherheit abgebrochen, nichts gesendet.")
    return url


def auf(x, schritt):
    """x auf ein Vielfaches von schritt AUFrunden (Mindestmengen)."""
    return round(math.ceil(x / schritt - 1e-9) * schritt, 12)


def code_von(ex):
    """Binance-Code aus einem Fehler (Spot: ganze Antwort in ex.daten, Futures: im Text «Binance-Code …»)."""
    d = getattr(ex, "daten", None) or {}
    if isinstance(d.get("code"), int):
        return d["code"]
    m = re.search(r"Binance-Code (-?\d+)", str(getattr(ex, "msg", "") or ex))
    return int(m.group(1)) if m else None


def kurz(ex):
    return f"HTTP {getattr(ex, 'code', '?')}, Binance {code_von(ex)}: {str(getattr(ex, 'msg', '') or ex)[:120]}"


def _ablehnung(ex, folge):
    """Abgelehnter Stop → (urteil, hinweis): nur eine reduceOnly-Ablehnung (−2022) betrifft Pilot 2.0; jeder andere Fehler
    (z. B. Kurs-Filter im Testnetz) heisst «nicht geprüft» — Fehlermeldung bitte weitergeben."""
    if P2._reduce_abgelehnt(ex):
        return "abweichung", folge
    return "nicht_geprueft", "Anderer Fehler als «reduceOnly abgelehnt» — die Frage bleibt offen; Meldung bitte weitergeben."


class Bericht:
    def __init__(self):
        self.punkte = []

    def punkt(self, nr, name, ergebnis, urteil, hinweis="", roh=None):
        assert urteil in ("ok", "abweichung", "info", "nicht_geprueft")
        self.punkte.append({"nr": nr, "name": name, "ergebnis": ergebnis, "urteil": urteil, "hinweis": hinweis, "roh": roh or {}})
        zeichen = {"ok": "[OK]        ", "abweichung": "[ABWEICHUNG]", "info": "[INFO]      ", "nicht_geprueft": "[NICHT GEPR]"}[urteil]
        print(f"{zeichen} {nr} {name}: {ergebnis}")
        if hinweis:
            print(f"               {hinweis}")

    def zahl(self, urteil):
        return sum(1 for p in self.punkte if p["urteil"] == urteil)


# ───────────────────────── A: Futures, reduceOnly-Stops ─────────────────────────
def futures_lage(fut, sym):
    """Nur lesen. → (regeln, markpreis, hinweise auf Hindernisse)"""
    hindernisse = []
    if fut.hedge_modus():
        hindernisse.append("Futures-Konto im Hedge-Modus (Pilot 2.0 braucht den Einweg-Modus)")
    pos = fut.position_info(sym)[0]
    if abs(pos) > 0:
        hindernisse.append(f"auf {sym} ist schon eine Position offen ({pos:+g})")
    if fut.offene_algos(sym):
        hindernisse.append(f"auf {sym} sind schon bedingte Aufträge (Stops) offen")
    if fut.offene_auftraege(sym):
        hindernisse.append(f"auf {sym} sind schon Aufträge offen")
    return fut.regeln(sym), fut.markpreis(sym)[0], hindernisse


def pruefe_futures(fut, sym, b, warte=time.sleep):
    r, mark, hindernisse = futures_lage(fut, sym)
    if hindernisse:
        raise Abbruch("Futures: " + "; ".join(hindernisse) + " — anderes Symbol wählen (--futures-symbol) oder erst leeren.")
    step, tick = r["step"], r["tick"]
    q = auf(max(r["min_qty"], r["min_notional"] * 1.2 / mark), step)
    hoch = mark * 1.3  # Stop-Kurs weit über dem Markt: löst während der Prüfung nie aus
    eigene = []
    print(f"Futures {sym}: Markpreis {mark:g}, Prüfmenge {BF.fmt(q)} (Short), Stops bei {hoch:g}")

    def stop(menge, preis):
        cid = P2._kennung(KENNUNG)
        eigene.append(cid)
        return cid, fut.stop_menge(sym, "BUY", menge, preis, tick, cid=cid)

    def steht(cid):
        return any(str(a.get("clientAlgoId")) == cid for a in fut.offene_algos(sym))

    def menge(cid):
        return next((float(a.get("quantity") or 0) for a in fut.offene_algos(sym) if str(a.get("clientAlgoId")) == cid), None)

    def pos():
        return fut.position_info(sym)[0]

    try:
        # A1: ohne Position — so sichert Pilot 2.0 einen Short, der noch unklar ist (verspätet ankommen kann)
        try:
            cid, _ = stop(q, hoch)
            warte(STEHEN_S)
            s = steht(cid)
            b.punkt("A1", "reduceOnly-Stop ohne offene Position", f"angenommen, steht nach {STEHEN_S:.0f} s: {'ja' if s else 'NEIN'}",
                    "ok" if s else "abweichung",
                    "" if s else "Binance räumt ihn weg: ein verspätet ankommender Short bekäme erst in der nächsten Runde der "
                                 "Nachkontrolle (alle 30 s) einen Stop.")
            fut.algo_abbrechen_kennung(sym, cid)
        except BF.BinanceFehler as ex:
            b.punkt("A1", "reduceOnly-Stop ohne offene Position", f"abgelehnt ({kurz(ex)})", *_ablehnung(ex,
                    "Ein verspätet ankommender Short bekäme erst in der nächsten Runde der Nachkontrolle (alle 30 s) einen Stop — "
                    "die README-Aussage «ein verspäteter Short ist nie nackt» stimmt dann nicht."), {"code": code_von(ex)})

        # Short öffnen (Spielgeld)
        try:
            fut.auftrag(sym, "SELL", q, reduce_only=False)
        except (BF.BinanceFehler, BF.UnklarFehler) as ex:
            for nr in ("A2", "A3", "A4", "A5"):
                b.punkt(nr, "Futures-Prüfung", f"nicht prüfbar: Short {BF.fmt(q)} nicht eröffnet ({kurz(ex)})", "nicht_geprueft")
            return
        p0 = pos()

        # A2: Stop über das Doppelte der Position (beidseitig: ganzer Short + unklare Shorts)
        cid2 = None
        try:
            cid2, _ = stop(2 * q, hoch)
            warte(STEHEN_S)
            m2 = menge(cid2)
            gekuerzt = m2 is not None and m2 < 2 * q - step / 2
            b.punkt("A2", f"reduceOnly-Stop {BF.fmt(2 * q)} bei Short {BF.fmt(-p0)}",
                    f"angenommen, steht nach {STEHEN_S:.0f} s: {'ja' if m2 is not None else 'NEIN'}"
                    + (f", Binance zeigt nur {BF.fmt(m2)}" if gekuerzt else ""),
                    "ok" if m2 is not None and not gekuerzt else "abweichung",
                    "Binance kürzt die Stop-Menge auf die Position: Pilot 2.0 hielte den Stop für zu klein und setzte ihn bei jedem "
                    "Lauf neu." if gekuerzt else "", {"menge_gesehen": m2})
        except BF.BinanceFehler as ex:
            cid2 = None
            b.punkt("A2", f"reduceOnly-Stop {BF.fmt(2 * q)} bei Short {BF.fmt(-p0)}", f"abgelehnt ({kurz(ex)})", *_ablehnung(ex,
                    "Beidseitige Sicherung über den ganzen Short plus unklare Shorts geht so nicht; Pilot 2.0 sichert dann nur den "
                    "offenen Short."), {"code": code_von(ex)})

        # A3: zweiter Stop gleichzeitig (zuerst neu setzen, dann alten löschen) — Summe beider Stops > Position
        cid3 = None
        try:
            cid3, _ = stop(q, mark * 1.35)
            warte(1.0)
            s = steht(cid3)
            b.punkt("A3", "zweiter reduceOnly-Stop gleichzeitig (Summe > Position)", f"angenommen, steht: {'ja' if s else 'NEIN'}",
                    "ok" if s else "abweichung")
        except BF.BinanceFehler as ex:
            b.punkt("A3", "zweiter reduceOnly-Stop gleichzeitig (Summe > Position)", f"abgelehnt ({kurz(ex)})", *_ablehnung(ex,
                    "«Zuerst neu setzen, dann alten löschen» klappt so nicht; Pilot 2.0 behält dann den alten Stop (alter Stop-Kurs)."),
                    {"code": code_von(ex)})

        # A4: Position schliessen — bleiben die reduceOnly-Stops stehen?
        try:
            fut.auftrag(sym, "BUY", q, reduce_only=True)
            warte(STEHEN_S)
            stehen = {c: steht(c) for c in (cid2, cid3) if c}
            b.punkt("A4", "Stops nach dem Schliessen der Position",
                    ("stehen noch: " + ", ".join("ja" if v else "nein" for v in stehen.values())) if stehen else "kein Stop zu prüfen",
                    "info", "Nur zur Kenntnis: Pilot 2.0 gleicht die Stops bei jedem Lauf mit dem Konto ab.",
                    {"stehen": list(stehen.values())})
        except (BF.BinanceFehler, BF.UnklarFehler) as ex:
            b.punkt("A4", "Stops nach dem Schliessen der Position", f"nicht prüfbar ({kurz(ex)})", "nicht_geprueft")

        # A5: reduceOnly-Marktauftrag über MEHR als die Position — darf nie long drehen
        for cid in list(eigene):
            try:
                fut.algo_abbrechen_kennung(sym, cid)
            except (BF.BinanceFehler, *BF.NETZFEHLER):
                pass
        try:
            if abs(pos()) < step / 2:
                fut.auftrag(sym, "SELL", q, reduce_only=False)
            vorher = pos()
            try:
                fut.auftrag(sym, "BUY", 2 * q, reduce_only=True)
                antwort = "angenommen"
            except BF.BinanceFehler as ex:
                antwort = f"abgelehnt ({kurz(ex)})"
            nachher = pos()
            if nachher > step / 2:
                b.punkt("A5", f"reduceOnly-Kauf {BF.fmt(2 * q)} bei Short {BF.fmt(-vorher)}",
                        f"{antwort}, Position danach {nachher:+g} (LONG!)", "abweichung",
                        "reduceOnly drehte die Position auf long — Pilot 2.0 kauft zwar nie mehr als die offene Position, "
                        "das gehört trotzdem in die nächste Prüfung.", {"vorher": vorher, "nachher": nachher})
            else:
                b.punkt("A5", f"reduceOnly-Kauf {BF.fmt(2 * q)} bei Short {BF.fmt(-vorher)}", f"{antwort}, Position danach {nachher:+g}",
                        "info", "Nur zur Kenntnis (Pilot 2.0 kauft nie mehr als die offene Position; die Prüf-Börse lehnt so einen "
                        "Auftrag mit −2022 ab).", {"vorher": vorher, "nachher": nachher})
        except (BF.BinanceFehler, BF.UnklarFehler) as ex:
            b.punkt("A5", "reduceOnly-Kauf über mehr als die Position", f"nicht prüfbar ({kurz(ex)})", "nicht_geprueft")
    except (BF.BinanceFehler, BF.UnklarFehler, *BF.NETZFEHLER) as ex:
        b.punkt("A?", "Futures-Prüfung", f"abgebrochen ({kurz(ex)})", "nicht_geprueft")
    finally:
        futures_aufraeumen(fut, sym, eigene, step)


def futures_aufraeumen(fut, sym, eigene, step):
    """Eigene Stops weg, eigene Position zu (das Symbol war beim Start leer — alles darauf stammt von dieser Prüfung)."""
    for cid in eigene:
        try:
            fut.algo_abbrechen_kennung(sym, cid)
        except Exception as ex:  # noqa: BLE001
            print(f"  Aufräumen: Stop {cid} nicht gelöscht ({type(ex).__name__}) — bitte im Testnetz von Hand löschen.")
    try:
        for a in fut.offene_algos(sym):
            if str(a.get("clientAlgoId") or "").startswith(KENNUNG):
                fut.algo_abbrechen(sym, a.get("algoId"))
        p = fut.position_info(sym)[0]
        if abs(p) >= step / 2:
            fut.auftrag(sym, "BUY" if p < 0 else "SELL", abs(p), reduce_only=True)
        p = fut.position_info(sym)[0]
        print(f"  Aufräumen Futures {sym}: Position {p:+g}, eigene Stops offen: "
              f"{sum(1 for a in fut.offene_algos(sym) if str(a.get('clientAlgoId') or '').startswith(KENNUNG))}")
    except Exception as ex:  # noqa: BLE001
        print(f"  Aufräumen Futures {sym} unvollständig ({type(ex).__name__}: {str(ex)[:100]}) — bitte im Testnetz nachsehen.")


# ───────────────────────── B: Spot, Stop ersetzen per cancelReplace ─────────────────────────
def stimmt(res, alt, neu, alt_schon_weg=False):
    """Liest Pilot 2.0 die cancelReplace-Antwort richtig? alt/neu = Status danach (None = gibt es nicht).
    → True / False / None (nicht beurteilbar: Antwort verloren)"""
    if res == "ok":
        return alt == "CANCELED" and neu is not None
    if res == "nichts":    # Pilot 2.0 nimmt an: der alte steht noch (oder war schon vorher weg), der neue nicht
        return neu is None and (alt in OFFEN or alt_schon_weg)
    if res == "nur_storno":
        return alt == "CANCELED" and neu is None
    if res == "fehlt":     # Binance kennt den Weg nicht → nichts passiert
        return neu is None and (alt in OFFEN or alt_schon_weg)
    return None


def pruefe_spot(spot, sym, b):
    rg = spot.regeln2(sym)
    kurs = spot.kurs(sym)
    coin = sym[:-4]
    step = rg["step"]
    m = auf(3 * rg["min_notional"] / kurs, step)  # 3× Mindestbetrag: gilt auch bei einem Stop-Kurs von 75 %
    frei, _ = P2.bestand(spot.konto(), coin)
    print(f"Spot {sym}: Kurs {kurs:g}, Prüfmenge {BB.format_menge(m)} {coin}, frei {frei:g} {coin}, Stop-Typ "
          f"{'STOP_LOSS' if 'STOP_LOSS' in rg['typen'] else 'STOP_LOSS_LIMIT'}")
    if frei < m:
        kauf = auf(max((m - frei) / 0.998 + step, 1.2 * rg["min_notional"] / kurs), step)
        spot.markt(sym, "BUY", kauf)
        print(f"  {BB.format_menge(kauf)} {coin} gekauft (Spielgeld), damit ein Stop gesetzt werden kann")
    eigene = []

    def neuer_stop(faktor):
        cid = P2._kennung(KENNUNG)
        eigene.append(cid)
        return int(spot.stop_verkauf(sym, m, kurs * faktor, rg, cid=cid)["orderId"])

    def status(oid):
        return spot.auftrag_lesen(sym, order_id=oid).get("status")

    def status_kennung(cid):
        try:
            return spot.auftrag_lesen(sym, cid=cid).get("status")
        except BB.BinanceFehler as ex:
            if code_von(ex) == -2013:  # «Order does not exist»
                return None
            raise

    def ersetzen(nr, name, oid, neu, alt_schon_weg=False, hinweis_ok=""):
        cid = neu["newClientOrderId"]
        eigene.append(cid)
        res, info = spot.ersetzen(sym, oid, neu)
        alt, neu_st = status(oid), status_kennung(cid)
        d = (getattr(info, "daten", None) or {}) if res != "ok" else {}
        roh = {"klasse": res, "http": getattr(info, "code", 200) if res != "ok" else 200, "code": d.get("code"),
               "msg": str(d.get("msg") or "")[:160], "cancelResult": (d.get("data") or {}).get("cancelResult"),
               "newOrderResult": (d.get("data") or {}).get("newOrderResult"), "alt": alt, "neu": neu_st}
        urteil = stimmt(res, alt, neu_st, alt_schon_weg)
        text = (f"Pilot 2.0 liest «{res}», Binance {roh['code'] if res != 'ok' else 'ok'}"
                f"{' ' + str(roh['cancelResult']) + '/' + str(roh['newOrderResult']) if roh['cancelResult'] else ''}; "
                f"alter Stop danach {alt}, neuer {neu_st or 'gibt es nicht'}")
        if urteil is None:
            b.punkt(nr, name, text, "info", "Antwort verloren (Netz) — nicht beurteilbar, bitte wiederholen.", roh)
        elif not urteil:
            b.punkt(nr, name, text, "abweichung", "Pilot 2.0 versteht diese Antwort FALSCH — vor dem Echtgeld-Start beheben.", roh)
        elif res == "fehlt":
            b.punkt(nr, name, text, "info", "Binance kennt cancelReplace hier nicht → Pilot 2.0 arbeitet wie früher "
                                            "(stornieren, dann neu).", roh)
        else:
            b.punkt(nr, name, text, "ok", hinweis_ok, roh)
        return res, alt, neu_st

    try:
        alt_weg = None
        a = neuer_stop(0.8)
        # B1: neuer Stop würde sofort auslösen (Stop-Kurs über dem Markt)
        res, alt, _ = ersetzen("B1", "cancelReplace, neuer Stop würde sofort auslösen", a,
                               spot.stop_params(sym, m, kurs * 1.2, rg, cid=P2._kennung(KENNUNG)))
        if alt not in OFFEN:
            alt_weg, a = a, neuer_stop(0.8)
        # B2: neuer Stop verletzt einen Filter (zu kleiner Betrag) — laut Doku VOR dem Storno geprüft
        res, alt, _ = ersetzen("B2", "cancelReplace, neuer Stop unter dem Mindestbetrag (Filter)", a,
                               spot.stop_params(sym, step, kurs * 0.8, rg, cid=P2._kennung(KENNUNG)))
        if res == "nur_storno":
            b.punkte[-1]["hinweis"] = ("Binance storniert hier VOR der Filterprüfung (Doku sagt anders) — Pilot 2.0 fängt "
                                       "«nur_storno» ab und setzt den Stop neu.")
        if alt not in OFFEN:
            alt_weg, a = a, neuer_stop(0.8)
        # B3: zu wenig Coins für den neuen Stop
        frei, gesperrt = P2.bestand(spot.konto(), coin)
        zu_viel = auf((frei + gesperrt + m) * 2, step)
        res, alt, _ = ersetzen("B3", "cancelReplace, zu wenig Coins für den neuen Stop", a,
                               spot.stop_params(sym, zu_viel, kurs * 0.8, rg, cid=P2._kennung(KENNUNG)))
        if alt not in OFFEN:
            alt_weg, a = a, neuer_stop(0.8)
        # B4: alter Auftrag schon weg (ausgelöst oder storniert) — es darf KEIN neuer Auftrag entstehen
        if alt_weg is None:  # noch kein «weg»-Auftrag (z. B. kein cancelReplace): den aktuellen Stop selbst stornieren
            spot.abbrechen(sym, a)
            alt_weg, a = a, neuer_stop(0.8)
        ersetzen("B4", "cancelReplace, alter Stop schon weg", alt_weg,
                 spot.stop_params(sym, m, kurs * 0.8, rg, cid=P2._kennung(KENNUNG)), alt_schon_weg=True,
                 hinweis_ok="Kein neuer Auftrag entstanden; Pilot 2.0 sichert freie Coins danach mit einem Zusatz-Stop.")
        # B5: Erfolg — Stop auf einen neuen Kurs ziehen
        res, alt, neu_st = ersetzen("B5", "cancelReplace, Stop nachziehen (Erfolg)", a,
                                    spot.stop_params(sym, m, kurs * 0.75, rg, cid=P2._kennung(KENNUNG)))
        if res == "ok":
            a = int(spot.auftrag_lesen(sym, cid=eigene[-1]).get("orderId"))
        # B6: Not-Aus — Stop und Verkauf in EINER Anfrage
        cid = P2._kennung(KENNUNG)
        res, alt, neu_st = ersetzen("B6", "cancelReplace, Not-Aus-Verkauf (Stop → Marktverkauf)", a,
                                    {"side": "SELL", "type": "MARKET", "quantity": BB.format_menge(m), "newOrderRespType": "FULL",
                                     "newClientOrderId": cid})
        if res == "ok" and neu_st != "FILLED":
            b.punkte[-1]["urteil"] = "abweichung"
            b.punkte[-1]["hinweis"] = f"Marktverkauf nicht ausgeführt (Status {neu_st})."
    except (BB.BinanceFehler, BF.UnklarFehler, *BF.NETZFEHLER) as ex:
        b.punkt("B?", "Spot-Prüfung", f"abgebrochen ({kurz(ex)})", "nicht_geprueft")
    finally:
        spot_aufraeumen(spot, sym, eigene)


def spot_aufraeumen(spot, sym, eigene):
    try:
        for o in spot.offene(sym):
            if str(o.get("clientOrderId") or "").startswith(KENNUNG):
                spot.abbrechen(sym, o["orderId"])
        rest = sum(1 for o in spot.offene(sym) if str(o.get("clientOrderId") or "").startswith(KENNUNG))
        print(f"  Aufräumen Spot {sym}: eigene Aufträge offen: {rest}")
    except Exception as ex:  # noqa: BLE001
        print(f"  Aufräumen Spot {sym} unvollständig ({type(ex).__name__}) — bitte im Testnetz nachsehen.")


# ───────────────────────── Ablauf ─────────────────────────
def main(argv=None, env=None, warte=time.sleep):
    try:
        sys.stdout.reconfigure(errors="replace")  # Windows-Konsole: nie an einem Zeichen scheitern
    except (AttributeError, ValueError):
        pass
    env = os.environ if env is None else env
    ap = argparse.ArgumentParser(description="Pilot 2.0: Binance-Verhalten im Testnetz prüfen (Spielgeld).")
    ap.add_argument("--los", action="store_true", help="wirklich prüfen (sendet Testnetz-Aufträge); ohne: nur lesen")
    ap.add_argument("--nur", choices=("spot", "futures"), help="nur einen Teil prüfen")
    ap.add_argument("--spot-symbol", default="BTCUSDT")
    ap.add_argument("--futures-symbol", default="BTCUSDT")
    ap.add_argument("--spot-url", default=SPOT_TESTNETZ)
    ap.add_argument("--futures-url", default=FUT_TESTNETZ)
    ap.add_argument("--bericht", default=str(BERICHT))
    a = ap.parse_args(argv)
    b = Bericht()
    try:
        s_url = adresse(a.spot_url, SPOT_HOSTS, "Spot")
        f_url = adresse(a.futures_url, FUT_HOSTS, "Futures")
        spot_noetig, fut_noetig = a.nur != "futures", a.nur != "spot"
        sk, ss = env.get("BINANCE_API_KEY", ""), env.get("BINANCE_API_SECRET", "")
        fk, fs = env.get("BINANCE_FUTURES_API_KEY", ""), env.get("BINANCE_FUTURES_API_SECRET", "")
        if (spot_noetig and not (sk and ss)) or (fut_noetig and not (fk and fs)):
            raise Abbruch("Testnetz-Schlüssel fehlen (BINANCE_API_KEY/SECRET für Spot, BINANCE_FUTURES_API_KEY/SECRET für Futures).")
        spot = P2.Spot({"key": sk, "secret": ss, "basis": s_url})
        fut = P2.Fut({"key": fk, "secret": fs, "basis": f_url, "spot": s_url})
        print(f"Testnetz-Prüfung Pilot 2.0 — Spot {s_url}, Futures {f_url} (Spielgeld, keine Anlageberatung)")
        try:  # Lesen zuerst: Schlüssel gültig? Symbol leer?
            if spot_noetig:
                spot.konto()
                spot.regeln2(a.spot_symbol)
            if fut_noetig:
                _, _, hindernisse = futures_lage(fut, a.futures_symbol)
                if hindernisse:
                    raise Abbruch("Futures: " + "; ".join(hindernisse) + " — anderes Symbol (--futures-symbol) oder erst leeren.")
        except (BB.BinanceFehler, BF.BinanceFehler) as ex:
            if P2._auth_fehler(ex):
                raise Abbruch(f"Schlüssel passt nicht zum Testnetz ({kurz(ex)}) — Testnetz-Schlüssel mit «set» setzen.") from None
            raise Abbruch(f"Lesen fehlgeschlagen ({kurz(ex)}).") from None
        except BF.NETZFEHLER as ex:
            raise Abbruch(f"Testnetz nicht erreichbar ({type(ex).__name__}: {str(ex)[:100]}).") from None
        if not a.los:
            print("Bereit. Ohne --los wurde nichts gesendet. Mit --los prüft das Skript (rund 1 Minute) und räumt danach auf.")
            return 0
        if fut_noetig:
            pruefe_futures(fut, a.futures_symbol, b, warte=warte)
        if spot_noetig:
            pruefe_spot(spot, a.spot_symbol, b)
    except Abbruch as ex:
        print(f"NICHT GEPRÜFT: {ex}")
        return 2
    abw, offen = b.zahl("abweichung"), b.zahl("nicht_geprueft")
    if abw:
        fazit = f"{abw} ABWEICHUNG(EN) — Pilot 2.0 erst nach einer weiteren Prüfung mit echtem Geld starten."
    elif offen:
        fazit = f"unvollständig ({offen} Punkt(e) nicht geprüft) — bitte später nochmals laufen lassen."
    else:
        fazit = "alles wie von Pilot 2.0 erwartet."
    print(f"ERGEBNIS: {fazit}")
    try:
        Path(a.bericht).parent.mkdir(parents=True, exist_ok=True)
        Path(a.bericht).write_text(json.dumps({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                               "spot": a.spot_url, "futures": a.futures_url, "fazit": fazit,
                                               "punkte": b.punkte}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"Bericht: {a.bericht}")
    except OSError as ex:
        print(f"Bericht nicht gespeichert ({ex})")
    return 1 if abw else (2 if offen else 0)


if __name__ == "__main__":
    sys.exit(main())
