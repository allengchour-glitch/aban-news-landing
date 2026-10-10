#!/usr/bin/env python3
"""Profit-Anzeige für den Krypto-Pilot — echte Zahlen direkt vom Binance-Futures-Konto (nur lesen, kein Auftrag).

  py tools/trading/krypto_bot/profit.py          # Gewinn heute / 7 Tage / 30 Tage / seit Start + offene Positionen

Quelle: /fapi/v1/income (realisierter Gewinn, Funding, Gebühren — Ein- und Auszahlungen zählen NICHT als Gewinn),
/fapi/v2/account (Kontostand) und /fapi/v2/positionRisk (offene Positionen mit Einstieg, Markpreis, Liquidationspreis).
Binance gibt die Einkommens-Geschichte nur für die letzten Monate heraus — darum wird jeder Eintrag in
data/krypto-profit.json gespeichert (ohne Schlüssel) und der Gewinn «seit Start» bleibt auch später vollständig.
Testnetz und Echtgeld haben getrennte Bücher: Spielgeld-Gewinne erscheinen nie als echter Gewinn.

Ehrlich gerechnet:
- Gebühren in BNB werden in USDT umgerechnet (Kurs beim ersten Abholen); Rückvergütungen senken die Gebühren.
- Der offene Gewinn eines Zeitraums braucht einen gemerkten Stand an dessen Beginn (Cockpit offen oder täglicher Lauf).
  Fehlt er, steht «offen unbekannt» und nur der abgeschlossene Teil zählt — statt einer erfundenen Zahl.
- Prozent: Gewinn ÷ eingesetztes Kapital, Ein-/Auszahlungen nach Verweildauer gewichtet (Modified Dietz).
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_futures as BF  # noqa: E402
import sperre  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-profit.json"
MODI = ("testnetz", "echtgeld")
# Was als Gewinn/Verlust zählt. TRANSFER (Ein-/Auszahlung) wird getrennt als Kapitalfluss geführt, Bonus-Gutschriften nie.
GEWINN_ARTEN = {"REALIZED_PNL": "realisiert", "FUNDING_FEE": "funding", "COMMISSION": "gebuehren",
                "INSURANCE_CLEAR": "realisiert", "LIQUIDATION_FEE": "gebuehren",
                "COMMISSION_REBATE": "gebuehren", "API_REBATE": "gebuehren"}  # Rückvergütungen: positiv, senken die Gebühren
STABIL = ("USDT", "USDC", "BUSD", "FDUSD")
WOCHE_MS = 7 * 86400 * 1000
TAG_MS = 86400 * 1000
EINKOMMEN_ALLE_MS = 60 * 1000  # Einkommen höchstens 1× pro Minute nachladen (Binance-Gewicht 30 je Wochenfenster)
# Zeitraum → Toleranz für den Stand des offenen Gewinns an seinem Beginn
TOLERANZ_MS = {"heute": 6 * 3600 * 1000, "7_tage": TAG_MS, "30_tage": TAG_MS}
_SPERRE = threading.Lock()           # Cockpit-Fenster und Telegram im selben Prozess
_BREMSE = {"bis": 0.0, "code": 0}    # nach HTTP 429/418: eine Weile Ruhe, damit Pilot und Not-Aus nicht gesperrt werden


def leeres_buch():
    return {"einkommen": {}, "transfers": {}, "offen_verlauf": [], "abgerufen_bis": 0}


def lies(pfad=None):
    """Logbuch mit getrennten Büchern je Modus. Eine kaputte Datei wird beiseitegelegt (nicht still überschrieben)."""
    pfad = Path(pfad) if pfad else LOGBUCH
    warnung = None
    try:
        lb = json.loads(pfad.read_text(encoding="utf-8")) if pfad.exists() else {}
        if not isinstance(lb, dict):
            raise ValueError("kein Objekt")
    except (ValueError, UnicodeDecodeError):
        kaputt = pfad.with_name(pfad.name + f".kaputt-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}")
        pfad.replace(kaputt)
        warnung = (f"Profit-Logbuch war beschädigt — beiseitegelegt als {kaputt.name}, neu begonnen "
                   "(Binance liefert nur die letzten 90 Tage nach).")
        print("⚠️ " + warnung)
        lb = {}
    if "einkommen" in lb:  # Version 1: ein Topf für alles (damals lief nur das Testnetz)
        lb = {"testnetz": {"einkommen": lb.get("einkommen", {}), "offen_verlauf": lb.get("offen_verlauf", [])}}
    lb["version"] = 2
    for m in MODI:
        b = lb.setdefault(m, {})
        for k, v in leeres_buch().items():
            b.setdefault(k, v)
    if warnung:
        lb["_warnung"] = warnung
    return lb


def schreibe(lb, pfad=None):
    """Atomar: Zwischendatei, dann umbenennen — ein Absturz beim Schreiben lässt das alte Logbuch heil."""
    pfad = Path(pfad) if pfad else LOGBUCH
    pfad.parent.mkdir(parents=True, exist_ok=True)
    tmp = pfad.with_name(pfad.name + f".tmp{os.getpid()}-{threading.get_ident()}")
    tmp.write_text(json.dumps({k: v for k, v in lb.items() if not k.startswith("_")}, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, pfad)


def offen_merken(buch, offen, jetzt_ms=None, erzwingen=False):
    """Offenen Gewinn merken (höchstens alle 15 Min.; erzwingen = Stand des täglichen Laufs vor seinen Aufträgen)."""
    jetzt_ms = int(jetzt_ms or time.time() * 1000)
    v = buch["offen_verlauf"]
    if erzwingen or not v or abs(jetzt_ms - max(x[0] for x in v)) >= 15 * 60 * 1000:
        v.append([jetzt_ms, round(float(offen), 4)])
    buch["offen_verlauf"] = sorted(x for x in v if x[0] >= jetzt_ms - 120 * TAG_MS)


def offen_notieren(modus, offen, jetzt_ms=None, logbuch=None):
    """Für den täglichen Pilot-Lauf: Stand des offenen Gewinns vor den Aufträgen ins Profit-Logbuch."""
    with _SPERRE, sperre.lauf_sperre("krypto-profit", warten=20, ordner=Path(logbuch).parent if logbuch else None):
        lb = lies(logbuch)
        offen_merken(lb[modus], offen, jetzt_ms, erzwingen=True)
        schreibe(lb, logbuch)


def einkommen_holen(c, ab_ms, bis_ms):
    """Alle Einkommens-Einträge ab ab_ms, in Wochen-Fenstern und je 1000 Einträgen (Binance-Grenzen).
    Nach einer vollen Seite geht es bei derselben Millisekunde weiter (Einträge mit gleichem Zeitstempel an der
    Seitengrenze gingen sonst verloren); doppelte werden über tranId/Art/Symbol/Zeit erkannt."""
    out, gesehen, start = [], set(), ab_ms
    while start < bis_ms:
        ende = min(start + WOCHE_MS, bis_ms)
        s = start
        while True:
            seite = c._req("GET", "/fapi/v1/income", {"startTime": s, "endTime": ende, "limit": 1000}, signiert=True) or []
            neu = 0
            for e in seite:
                k = (e.get("tranId"), e.get("incomeType"), e.get("symbol"), e.get("time"))
                if k not in gesehen:
                    gesehen.add(k)
                    out.append(e)
                    neu += 1
            if len(seite) < 1000:
                break
            letzte = int(seite[-1]["time"])
            s = letzte if neu else letzte + 1  # ohne neuen Eintrag: eine Millisekunde weiter (kein Endlos-Lauf)
            if s > ende:
                break
        start = ende + 1
    return out


def wert_usdt(e):
    """Betrag in USDT; None, wenn die Währung nicht umgerechnet werden konnte."""
    if e.get("asset", "USDT") in STABIL:
        return e["betrag"]
    return e["betrag"] * e["kurs_usdt"] if e.get("kurs_usdt") else None


def nachfuehren(buch, c, jetzt_ms=None, max_tage=90):
    """Neue Einkommens-Einträge ins Buch (nach tranId+Art entdoppelt). Ab dem letzten Abruf — auch wenn der nichts fand."""
    jetzt_ms = int(jetzt_ms or time.time() * 1000)
    bis = buch.get("abgerufen_bis") or 0
    letzte = max((e["zeit"] for e in buch["einkommen"].values()), default=0)
    ab = max(jetzt_ms - max_tage * TAG_MS, (max(bis, letzte) - 3600 * 1000) if (bis or letzte) else 0)
    kurse = {}
    for e in einkommen_holen(c, ab, jetzt_ms):
        art, asset = e.get("incomeType"), e.get("asset", "USDT")
        key = f"{e.get('tranId')}-{art}-{e.get('symbol', '')}"
        if art == "TRANSFER":
            buch["transfers"][key] = {"zeit": int(e["time"]), "betrag": float(e["income"]), "asset": asset}
            continue
        if art not in GEWINN_ARTEN or key in buch["einkommen"]:
            continue
        eintrag = {"zeit": int(e["time"]), "art": GEWINN_ARTEN[art], "symbol": e.get("symbol") or "",
                   "betrag": float(e["income"]), "asset": asset}
        if asset not in STABIL:  # z. B. Gebühren in BNB: zum Kurs beim Abholen umrechnen
            if asset not in kurse:
                try:
                    kurse[asset] = c.markpreis(f"{asset}USDT")[0]
                except (BF.BinanceFehler, *BF.NETZFEHLER, KeyError, ValueError):
                    kurse[asset] = None
            eintrag["kurs_usdt"] = kurse[asset]
        buch["einkommen"][key] = eintrag
    buch["abgerufen_bis"] = jetzt_ms
    return buch


def auswerten(buch, konto, positionen, jetzt=None):
    """Reine Rechnung (testbar): Gewinn nach Zeitraum und Art, offene Positionen."""
    jetzt = jetzt or datetime.now().astimezone()
    jetzt_ms = jetzt.timestamp() * 1000
    mitternacht = jetzt.replace(hour=0, minute=0, second=0, microsecond=0)
    grenzen = {"heute": mitternacht, "7_tage": jetzt - timedelta(days=7), "30_tage": jetzt - timedelta(days=30), "gesamt": None}
    wallet = float(konto.get("totalWalletBalance", 0) or 0)
    offen = float(konto.get("totalUnrealizedProfit", 0) or 0)
    alle = list(buch["einkommen"].values())
    werte = [(e, wert_usdt(e)) for e in alle]
    nicht_umgerechnet = sorted({e.get("asset", "?") for e, w in werte if w is None})
    werte = [(e, w) for e, w in werte if w is not None]
    fluesse = sorted((t["zeit"], t["betrag"]) for t in buch.get("transfers", {}).values() if t.get("asset", "USDT") in STABIL)
    verlauf = buch.get("offen_verlauf", [])
    erster = min([e["zeit"] for e, _ in werte] + [t for t, _ in fluesse] + [x[0] for x in verlauf], default=jetzt_ms)
    zeitraeume = {}
    for name, grenze in grenzen.items():
        if grenze is None:  # seit Start: vor dem ersten Eintrag gab es nichts Offenes
            start_ms, offen_start = erster, 0.0
        else:
            ab_ms, tol = grenze.timestamp() * 1000, TOLERANZ_MS[name]
            vor = [x for x in verlauf if ab_ms - tol <= x[0] <= ab_ms]
            nach = [x for x in verlauf if ab_ms < x[0] <= min(ab_ms + tol, jetzt_ms)]
            ref = vor[-1] if vor else nach[0] if nach else None
            # Abgeschlossener UND offener Teil ab demselben Zeitpunkt — sonst zählt ein dazwischen realisierter Gewinn doppelt
            start_ms, offen_start = (ref[0], ref[1]) if ref else (ab_ms, None)
        teil = [(e, w) for e, w in werte if e["zeit"] >= start_ms]
        arten = {a: round(sum(w for e, w in teil if e["art"] == a), 4) for a in ("realisiert", "funding", "gebuehren")}
        offen_delta = None if offen_start is None else round(offen - offen_start, 4)
        netto = round(sum(arten.values()) + (offen_delta or 0.0), 4)
        # Prozent auf das eingesetzte Kapital: Ein-/Auszahlungen im Zeitraum nach Verweildauer gewichtet (Modified Dietz)
        im = [(t, b) for t, b in fluesse if t >= start_ms]
        start_kapital = wallet + offen - netto - sum(b for _, b in im)
        dauer = max(1.0, jetzt_ms - start_ms)
        basis = start_kapital + sum(b * max(0.0, jetzt_ms - t) / dauer for t, b in im)
        zeitraeume[name] = {**arten, "offen": offen_delta, "netto": netto, "prozent": netto / basis if basis > 0 else None,
                            "ab": datetime.fromtimestamp(start_ms / 1000).astimezone().isoformat(timespec="minutes"),
                            "einzahlungen": round(sum(b for _, b in im), 2)}
    pro_markt = {}
    for e, w in werte:
        if e["symbol"]:
            pro_markt[e["symbol"]] = round(pro_markt.get(e["symbol"], 0.0) + w, 4)
    pos = []
    for p in positionen:
        menge = float(p.get("positionAmt", 0) or 0)
        if not menge:
            continue
        einstieg, mark = float(p.get("entryPrice", 0) or 0), float(p.get("markPrice", 0) or 0)
        pnl = float(p.get("unRealizedProfit", 0) or 0)
        marge = float(p.get("isolatedMargin", 0) or 0) or (abs(menge) * einstieg / max(1.0, float(p.get("leverage", 1) or 1)))
        pro_markt[p["symbol"]] = round(pro_markt.get(p["symbol"], 0.0) + pnl, 4)
        pos.append({"symbol": p["symbol"], "seite": "LONG" if menge > 0 else "SHORT", "menge": abs(menge), "einstieg": einstieg,
                    "mark": mark, "gewinn": round(pnl, 4), "gewinn_prozent": pnl / marge if marge else None,
                    "kursbewegung": (mark / einstieg - 1) * (1 if menge > 0 else -1) if einstieg else None,
                    "liquidation": float(p.get("liquidationPrice", 0) or 0) or None, "hebel": float(p.get("leverage", 0) or 0),
                    "wert": round(abs(menge) * mark, 2)})
    tage = {}
    for e, w in werte:
        t = datetime.fromtimestamp(e["zeit"] / 1000).astimezone().date().isoformat()
        tage[t] = round(tage.get(t, 0.0) + w, 4)
    kumuliert, s = [], 0.0
    for t in sorted(tage):
        s += tage[t]
        kumuliert.append([t, round(s, 4)])
    return {"wallet": round(wallet, 2), "offen": round(offen, 4), "gesamt": round(wallet + offen, 2), "zeitraeume": zeitraeume,
            "pro_markt": pro_markt, "positionen": pos, "tage": [[t, tage[t]] for t in sorted(tage)][-60:], "kumuliert": kumuliert[-365:],
            "seit": datetime.fromtimestamp(erster / 1000).date().isoformat(), "nicht_umgerechnet": nicht_umgerechnet}


def abrufen(env=None, client=None, logbuch=None, jetzt=None):
    """Holt den Stand vom Konto (nur lesende Abfragen). Ohne Schlüssel oder bei Fehlern: {'hinweis': …}."""
    cfg = BF.einstellungen(env)
    if not cfg["key"] or not cfg["secret"]:
        return {"hinweis": "Keine Futures-Schlüssel gesetzt (BINANCE_FUTURES_API_KEY/SECRET) — ohne Schlüssel kein Kontostand."}
    if cfg.get("url_fehler"):  # dieselbe Sperre wie beim Handeln: der Schlüssel geht nie an eine unpassende Adresse
        return {"hinweis": cfg["url_fehler"]}
    if time.time() < _BREMSE["bis"]:
        return {"hinweis": f"Binance bremst (HTTP {_BREMSE['code']}) — Profit pausiert noch {(_BREMSE['bis'] - time.time()) / 60:.0f} Min., "
                           "damit Pilot und Not-Aus nicht gesperrt werden."}
    modus = "echtgeld" if cfg["echtgeld"] else "testnetz"
    c = client or BF.Futures(cfg)
    jetzt_ms = int(jetzt.timestamp() * 1000) if jetzt else int(time.time() * 1000)
    try:
        with _SPERRE, sperre.lauf_sperre("krypto-profit", warten=20, ordner=Path(logbuch).parent if logbuch else None):
            lb = lies(logbuch)
            buch = lb[modus]
            konto = c.konto()
            positionen = c._req("GET", "/fapi/v2/positionRisk", signiert=True) or []
            if jetzt_ms - (buch.get("abgerufen_bis") or 0) >= EINKOMMEN_ALLE_MS:
                try:
                    nachfuehren(buch, c, jetzt_ms)
                except urllib.error.HTTPError as ex:
                    if ex.code in (418, 429):
                        raise
                except (*BF.NETZFEHLER, KeyError, ValueError):
                    pass  # Kontostand trotzdem zeigen; Einkommen beim nächsten Abruf
            offen_merken(buch, float(konto.get("totalUnrealizedProfit", 0) or 0), jetzt_ms)
            schreibe(lb, logbuch)
    except sperre.Besetzt:
        return {"hinweis": "Profit wird gerade von einem anderen Fenster abgefragt — gleich nochmals."}
    except urllib.error.HTTPError as ex:
        if ex.code in (418, 429):
            _BREMSE.update(bis=time.time() + (600 if ex.code == 418 else 120), code=ex.code)
            return {"hinweis": f"Binance bremst (HTTP {ex.code}: zu viele Abfragen) — Profit pausiert {10 if ex.code == 418 else 2} Min."}
        return {"hinweis": "Binance sperrt deinen Standort (HTTP 451)." if ex.code == 451 else
                "Schlüssel ungültig (HTTP 401)." if ex.code == 401 else f"Binance lehnt ab (HTTP {ex.code})."}
    except (*BF.NETZFEHLER, KeyError, ValueError) as ex:
        return {"hinweis": f"Binance nicht erreichbar: {type(ex).__name__}"}
    erg = {"modus": "ECHTGELD" if cfg["echtgeld"] else "TESTNETZ", "zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           **auswerten(buch, konto, positionen, jetzt)}
    if lb.get("_warnung"):
        erg["warnung"] = lb["_warnung"]
    return erg


def text(p):
    if p.get("hinweis"):
        return "Profit: " + p["hinweis"]

    def z(x):
        return f"{x:+,.2f}".replace(",", "'")

    def pc(x):
        return f" ({x * 100:+.2f} %)" if x is not None else ""

    def teil(name, w):
        return f"{name} {z(w['netto'])}{pc(w['prozent'])}" + (" (offen ?)" if w["offen"] is None else "")
    zr = p["zeitraeume"]
    g = zr["gesamt"]
    t = (f"💰 Profit ({p['modus']}) · Konto {p['gesamt']:,.2f} USDT".replace(",", "'")
         + f"\n{teil('Heute', zr['heute'])} · {teil('7 Tage', zr['7_tage'])} · {teil('30 Tage', zr['30_tage'])}"
         + f"\nSeit {p['seit']}: {z(g['netto'])}{pc(g['prozent'])} — realisiert {z(g['realisiert'])}, "
         f"offen {z(g['offen'])}, Funding {z(g['funding'])}, Gebühren {z(g['gebuehren'])}")
    if any(zr[n]["offen"] is None for n in ("heute", "7_tage", "30_tage")):
        t += "\n(offen ? = kein gemerkter Stand zu Beginn: nur der abgeschlossene Teil gezählt)"
    if p.get("nicht_umgerechnet"):
        t += f"\n⚠️ Nicht in USDT umrechenbar und darum NICHT enthalten: {', '.join(p['nicht_umgerechnet'])}"
    if p.get("warnung"):
        t += "\n⚠️ " + p["warnung"]
    for x in p["positionen"]:
        t += (f"\n{x['seite']} {x['menge']:g} {x['symbol']} · Einstieg {x['einstieg']:,.2f} · jetzt {x['mark']:,.2f} · "
              f"{z(x['gewinn'])} USDT" + (f" ({x['gewinn_prozent'] * 100:+.1f} % auf das Pfand)" if x["gewinn_prozent"] is not None else "")).replace(",", "'")
    return t


if __name__ == "__main__":
    print(text(abrufen()))
