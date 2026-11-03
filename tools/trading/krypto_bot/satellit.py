#!/usr/bin/env python3
"""Satellit — «mehrere Trades» im TESTNETZ (Spielgeld): ein kleiner Anteil des Kontos folgt der Regel «Top 10 nach Volumen, Trend je Coin,
Bitcoin-Filter» (satellit_kern.py), auf Alt-Coins ohne Bitcoin und Ether.

    python3 tools/trading/krypto_bot/satellit.py --lauf             # entscheiden (jeden 7. Tag) und handeln, einmal pro Tag
    python3 tools/trading/krypto_bot/satellit.py --lauf --trocken   # zeigt nur, was er täte (kein Auftrag, kein Eintrag im Buch)
    python3 tools/trading/krypto_bot/satellit.py --status           # Ziele, Positionen, nächster Entscheidungstag

Warum nur ein Experiment: dieselbe Regel auf mehr Coins bestand ihren vorab festgelegten Test NICHT (alle_coins_pruefung.py, 13.10.2026:
ab 2022 rund +18 % pro Jahr bei −38 % Einbruch, Bitcoin mit Trend 150 allein +28 % bei −28 %). Der Besitzer wollte mehr Trades und hat den
Weg gewählt (03.11.2026: «2 ok»). Darum klein, nur im Testnetz, mit Ausschalter, und der Schatten-Vorwärtstest auf GitHub läuft daneben.

Sicherungen:
  • NUR Testnetz: mit echtem Geld (BINANCE_FUTURES_TESTNET=false und Freigabesatz) läuft der Satellit nie und fasst nichts an.
  • Anteil 20 % des Kontos (KRYPTO_SATELLIT_ANTEIL, höchstens 30 %), zehn Plätze à 10 % davon, Hebel 1× je Platz: höchstens 2 % des Kontos je Coin.
    Jeder Platz hat einen Börsen-Stop (3 Tages-Schwankungen, wie beim Piloten); er wird bei jedem Lauf nachgeführt, aber nie ratschenartig:
    die getestete Regel bleibt der Ausstieg, der Stop fängt nur Absturztage ab.
  • Kein Bitcoin, kein Ether: die gehören dem Piloten (je Symbol gibt es im Einweg-Modus nur EINE Position).
  • Zwischen den Entscheidungstagen wird nichts gekauft oder verkauft (kein Nachkaufen in Verlierer, kein Abschneiden von Gewinnern): nur der Stop
    wird gepflegt. Ausnahmen: ein Einstieg, der am Entscheidungstag nicht klappte, wird wiederholt; ein ausgestoppter Coin kommt erst am nächsten
    Entscheidungstag wieder.
  • Ausschalter: KRYPTO_SATELLIT=aus oder Datei data/krypto-satellit-aus.txt. «Aus» heisst: alle Satelliten-Positionen werden geschlossen.
  • Not-Aus (Datei STOP, KI_BOT_STOP=1, Cockpit-Knopf, stop.bat): schliesst auch den Satelliten (pilot.schliessen_alle fragt offene_symbole()).
  • Pause (Auto-Handel aus): der Satellit tut nichts, die Börsen-Stops bleiben stehen (wie beim Piloten).
  • Vor neuen Käufen prüft er sich mit test_satellit.py und test_satellit_lauf.py; fällt das durch, kauft er nichts Neues (Schliessen und Stops gehen weiter).
  • Eine fremde Position (nicht im Buch, nie vom Satelliten angefasst) wird nie berührt.
  • Alles Wiederverwendete ist der Weg des Piloten: broker_futures.ausfuehren (Marktaufträge, nur verkleinern mit reduceOnly, Stops, Lauf-Sperre).
Buch: data/krypto-satellit.json (mit Sicherungskopie .bak). Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import satellit_kern as S  # noqa: E402
import sperre  # noqa: E402

ROOT = HIER.parents[2]
BUCH = ROOT / "data" / "krypto-satellit.json"
AUS_DATEI = ROOT / "data" / "krypto-satellit-aus.txt"
PAUSE = HIER.parent / "ki_bot" / "PAUSE"
ANTEIL_STANDARD = 0.20
ANTEIL_MAX = 0.30
HEBEL_JE_PLATZ = 1.0
PILOT_SYMBOLE = frozenset({"BTCUSDT", "ETHUSDT"})
BEKANNT_MAX = 80
VERLAUF_MAX = 30
MAX_FEHLT_ANTEIL = 0.25     # fehlen mehr als so viele der geholten Coins, wird nicht neu entschieden (Netz schwach)
MAX_ALTER_TAGE = 3          # ältere Bitcoin-Kurse: keine neue Entscheidung
AUS_WORTE = ("aus", "0", "nein", "no", "off", "false")
UNLESBAR = "⚠️ Satelliten-Buch unlesbar"
TESTS = ("test_satellit.py", "test_satellit_lauf.py")
WOCHENTAGE = ("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So")


def kurz(sym):
    """«SOLUSDT» → «SOL» (für Meldungen)."""
    return sym[:-4] if sym.endswith("USDT") else sym


# ───────────────────────── Einstellungen und Buch ─────────────────────────
def einstellung(env=None, aus_datei=None):
    """→ {aus, grund, anteil}. Ausgeschaltet per KRYPTO_SATELLIT oder Datei; Anteil aus KRYPTO_SATELLIT_ANTEIL (0 bis 0,30, Standard 0,20)."""
    env = os.environ if env is None else env
    aus, grund = False, ""
    if (env.get("KRYPTO_SATELLIT") or "").strip().lower() in AUS_WORTE:
        aus, grund = True, "KRYPTO_SATELLIT=aus"
    elif Path(aus_datei or AUS_DATEI).exists():
        aus, grund = True, "Datei data\\krypto-satellit-aus.txt"
    roh = (env.get("KRYPTO_SATELLIT_ANTEIL") or "").strip().replace(",", ".")
    try:
        anteil = float(roh) if roh else ANTEIL_STANDARD
    except ValueError:
        anteil = ANTEIL_STANDARD
    if not math.isfinite(anteil):
        anteil = ANTEIL_STANDARD
    anteil = max(0.0, min(ANTEIL_MAX, anteil))
    if anteil == 0 and not aus:
        aus, grund = True, "KRYPTO_SATELLIT_ANTEIL=0"
    return {"aus": aus, "grund": grund, "anteil": anteil}


def neues_buch():
    return {"version": 1, "ziele": {}, "entschieden": None, "positionen": {}, "bekannt": [], "ausgestoppt": {}, "letzter_lauf": None, "verlauf": []}


def _pruefe_buch(d):
    """→ Buch mit allen Standardfeldern. ValueError bei falscher Gestalt: lieber die Sicherungskopie nehmen, als mit einer halben Position zu rechnen."""
    if not isinstance(d, dict):
        raise ValueError("kein Objekt")
    b = neues_buch()
    b.update({k: d[k] for k in b if k in d})
    if not (isinstance(b["ziele"], dict) and isinstance(b["positionen"], dict) and isinstance(b["bekannt"], list)
            and isinstance(b["ausgestoppt"], dict) and isinstance(b["verlauf"], list)):
        raise ValueError("Felder haben die falsche Art")
    try:
        if b["entschieden"] is not None:
            date.fromisoformat(b["entschieden"])
        for sym, w in b["ziele"].items():
            if not (isinstance(sym, str) and isinstance(w, (int, float)) and 0 < w <= 1):
                raise ValueError("Ziel")
        for sym, p in b["positionen"].items():
            if not (isinstance(sym, str) and isinstance(p, dict) and isinstance(p.get("menge"), (int, float)) and math.isfinite(p["menge"])):
                raise ValueError("Position")
        if not all(isinstance(x, str) for x in b["bekannt"]) or not all(isinstance(x, str) for x in b["ausgestoppt"]):
            raise ValueError("Namen")
    except TypeError as ex:
        raise ValueError(str(ex)) from None
    return b


def _lesen_datei(pfad):
    return _pruefe_buch(json.loads(Path(pfad).read_text(encoding="utf-8")))


def lesen(datei=None):
    """→ (Buch, Hinweis). Fehlt alles: leeres Buch ohne Hinweis. Ist die Datei kaputt: die Sicherungskopie (Hinweis). Sind beide kaputt: leeres Buch
    und der Hinweis UNLESBAR — der Lauf handelt dann NICHT (er kennt seine Positionen nicht mehr), das Konto bitte von Hand ansehen."""
    pfad = Path(datei) if datei else BUCH
    bak = pfad.with_name(pfad.name + ".bak")
    if not pfad.exists() and not bak.exists():
        return neues_buch(), ""
    try:
        return _lesen_datei(pfad), ""
    except (OSError, ValueError):
        pass
    try:
        return _lesen_datei(bak), "⚠️ Satelliten-Buch fehlte oder war kaputt — Sicherungskopie benutzt."
    except (OSError, ValueError):
        return neues_buch(), UNLESBAR + " und keine brauchbare Sicherungskopie — offene Satelliten-Positionen bitte im Binance-Konto prüfen!"


def schreiben(buch, datei=None):
    """Atomar; nur ein HEILES Buch wird zur Sicherungskopie (ein kaputtes überschreibt nie die gute)."""
    pfad = Path(datei) if datei else BUCH
    pfad.parent.mkdir(parents=True, exist_ok=True)
    if pfad.exists():
        try:
            _lesen_datei(pfad)
            shutil.copyfile(pfad, pfad.with_name(pfad.name + ".bak"))
        except (OSError, ValueError):
            pass
    tmp = pfad.with_name(pfad.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(buch, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, pfad)


def offene_symbole(buch_datei=None, env=None):
    """Für den Not-Aus: Futures-Symbole, in denen der Satellit eine Position haben KÖNNTE (Buch plus «bekannt»: Symbole mit gesendetem oder unklarem
    Auftrag). ValueError, wenn das Buch unlesbar ist — der Aufrufer meldet dann «bitte im Konto prüfen», statt «alles zu» zu sagen.
    Mit echtem Geld: nie etwas (das Buch stammt aus dem Testnetz; ein Not-Aus soll im echten Konto keine fremden Positionen im selben Symbol anfassen)."""
    import broker_futures as BF
    if BF.einstellungen(os.environ if env is None else env)["echtgeld"]:
        return []
    b, hinweis = lesen(buch_datei)
    if hinweis.startswith(UNLESBAR):
        raise ValueError(hinweis)
    return sorted((set(b["positionen"]) | set(b["bekannt"])) - PILOT_SYMBOLE)


# ───────────────────────── Börse ─────────────────────────
def futures_verfuegbar(c):
    """Symbole, die auf dem Futures-Konto handelbar sind (unbefristete USDT-Verträge im Status TRADING)."""
    info = c._req("GET", "/fapi/v1/exchangeInfo")
    return {s["symbol"] for s in (info or {}).get("symbols", [])
            if s.get("status") == "TRADING" and s.get("contractType", "PERPETUAL") == "PERPETUAL" and s.get("quoteAsset", "USDT") == "USDT"}


def abbilden(spot, verfuegbar):
    """Spot-Paar → Futures-Symbol. Manche Coins heissen dort mit Tausender-Vielfachen (PEPE → 1000PEPEUSDT). None, wenn es keinen Vertrag gibt."""
    if not spot.endswith("USDT"):
        return None
    basis = spot[:-4]
    for kandidat in (basis + "USDT", "1000" + basis + "USDT", "1000000" + basis + "USDT"):
        if kandidat in verfuegbar:
            return kandidat
    return None


def gewicht_je_platz(cfg, anteil):
    """Gewicht für broker_futures.ausfuehren: dessen Grundlage ist Kapital × KI_BOT_ANTEIL × Gewicht; gewollt ist Kapital × Satelliten-Anteil ÷ Plätze."""
    return anteil / S.PLAETZE / cfg["anteil"]


def naechster_entscheidungstag(heute):
    """Der nächste Entscheidungstag ab `heute` (JJJJ-MM-TT; heute selbst, wenn er einer ist). Wirksam wird er beim ersten Lauf NACH seinem Tagesschluss (UTC)."""
    return (date.fromisoformat(heute) + timedelta(days=(-S.tage_seit_start(heute)) % 7)).isoformat()


# ───────────────────────── Ein Lauf ─────────────────────────
class _Lauf:
    """Hält Buch, Börsen-Zugang und Meldungen eines Laufs zusammen."""

    def __init__(self, BF, cfg, ein, c, buch, env, trocken, protokolliere, heute=None):
        self.BF, self.cfg, self.ein, self.c, self.buch = BF, cfg, ein, c, buch
        self.env, self.trocken, self.protokolliere = env, trocken, protokolliere
        self.zeilen, self.warnung = [], False
        self.auftraege, self.geaendert, self.neu = 0, False, False
        self.unsicher, self.reihen, self.tag, self.spot_von = set(), {}, None, {}
        self.bekannt_alt = set(buch["bekannt"])      # Stand VOR diesem Lauf: nur was früher schon «bekannt» war, gilt bei einer Position im Konto als unsere
        self.heute = heute or datetime.now(timezone.utc).date().isoformat()
        self.gewicht = gewicht_je_platz(cfg, ein["anteil"])

    @property
    def stand(self):
        return self.tag or self.heute

    def sag(self, text, warn=False):
        if warn and "⚠️" not in text:
            text = "⚠️ " + text
        self.zeilen.append(text)
        self.warnung = self.warnung or warn

    # ── Kurse und Entscheidung ──
    def daten_und_entscheidung(self, holen):
        """Kurse holen und, wenn ein neuer Entscheidungstag gilt, die Ziele neu festlegen. Setzt self.neu."""
        b = self.buch
        try:
            reihen, fehlt = holen(extra=[p["spot"] for p in b["positionen"].values() if p.get("spot")])
        except OSError as ex:
            self.sag(f"Satellit: Kurse nicht erreichbar ({type(ex).__name__}) — keine neue Entscheidung; bestehende Positionen behalten ihren Börsen-Stop.", True)
            return
        self.reihen = reihen
        btc = reihen.get(S.BTC)
        if not btc:
            self.sag("Satellit: keine Bitcoin-Kurse — keine neue Entscheidung.", True)
            return
        self.tag = btc[-1][0]
        alter = (date.fromisoformat(self.heute) - date.fromisoformat(self.tag)).days
        if alter > MAX_ALTER_TAGE:
            self.sag(f"Satellit: die Bitcoin-Kurse sind {alter} Tage alt — keine neue Entscheidung.", True)
            self.tag = None
            return
        gesamt = len(reihen) + len(fehlt)
        if gesamt and len(fehlt) / gesamt > MAX_FEHLT_ANTEIL:
            self.sag(f"Satellit: von {gesamt} Coins kamen nur {len(reihen)} an — keine neue Entscheidung auf unvollständigen Daten.", True)
            return
        letzter = S.letzter_entscheidungstag(self.tag)
        if b["entschieden"] == letzter:
            return
        try:
            neu = S.entscheiden(reihen, letzter, nur_alt=True)
        except KeyError as ex:
            self.sag(f"Satellit: {ex} — keine neue Entscheidung.", True)
            return
        b["ziele"], b["entschieden"], b["ausgestoppt"] = neu, letzter, {}
        self.neu = self.geaendert = True
        self.sag(f"Entscheidung vom {letzter}: " + (", ".join(f"{kurz(s)} {w * 100:.0f} %" for s, w in neu.items()) or "nichts kaufen (Bitcoin-Filter zu oder kein Coin im Trend)"))

    def vertraege(self):
        try:
            return futures_verfuegbar(self.c)
        except Exception as ex:  # noqa: BLE001 — ohne die Liste wird nichts NEU gekauft, Bestehendes wird weiter gepflegt
            self.sag(f"Satellit: Vertragsliste nicht lesbar ({type(ex).__name__}) — heute keine neuen Käufe.", True)
            return None

    def planen(self, verfuegbar, alles_zu):
        """→ (schliessen, aufbauen, halten): Futures-Symbole je Aufgabe."""
        b = self.buch
        gehalten = set(b["positionen"])
        if alles_zu:
            return sorted(gehalten | set(b["bekannt"])), [], []
        buch_spot = {p.get("spot"): f for f, p in b["positionen"].items() if p.get("spot")}
        wollen = {}
        for spot in b["ziele"]:
            f = buch_spot.get(spot) or (abbilden(spot, verfuegbar) if verfuegbar is not None else None)
            if f is None:
                if verfuegbar is not None and self.neu:
                    self.sag(f"Satellit: für {kurz(spot)} gibt es im Testnetz keinen Vertrag — übersprungen.")
                continue
            if f not in PILOT_SYMBOLE:
                wollen[f] = spot
        self.spot_von = dict(wollen)
        schliessen = sorted(gehalten - set(wollen))
        aufbauen, halten = [], []
        for f in sorted(wollen):
            if f in gehalten:
                (aufbauen if self.neu else halten).append(f)
            elif f not in b["ausgestoppt"] and verfuegbar is not None:
                aufbauen.append(f)
        return schliessen, aufbauen, halten

    def stop_anteil(self, spot, vorher):
        """Abstand des Börsen-Stops: aus den Kursen, sonst der gemerkte Wert, sonst der Standard."""
        if spot and spot in self.reihen and self.tag:
            try:
                p, _v = S.raster(self.reihen[spot], self.tag)
                return S.stopp_anteil(p, S.RUECK - 1)
            except Exception:  # noqa: BLE001
                pass
        return (vorher or {}).get("stop_anteil") or S.STOP_STANDARD

    # ── Aufträge über den Weg des Piloten ──
    def _ausfuehren(self, e, f, gewicht):
        try:
            return self.BF.ausfuehren(e, trocken=self.trocken, env=self.env, client=self.c, protokolliere=self.protokolliere, symbol=f, gewicht=gewicht) or []
        except sperre.SperreVerloren:
            raise                                  # die Lauf-Sperre ist weg: gar nichts mehr senden
        except Exception as ex:  # noqa: BLE001 — ein Coin darf die anderen nie aufhalten
            e["broker"] = {"fehler": True, "position": None, "stop": None, "ohne_stop": False,
                           "hinweis": f"⚠️ Lauf abgebrochen ({type(ex).__name__}: {str(ex)[:120]})"}
            return []

    def _verbuchen(self, f, spot, vorher, e, auftr, anteil, wort):
        """Ergebnis von ausfuehren() ins Buch und in die Meldung."""
        b = e.get("broker") or {}
        pos = b.get("position")
        hinweis = (b.get("hinweis") or "").replace("Not-Aus aktiv — keine neuen Positionen, bestehende werden geschlossen.", "").strip()
        self.auftraege += len(auftr)
        text = ", ".join(f"{x['seite']} {x['menge']:g}" + (f" ✗ {' '.join(str(x['fehler']).split())[:140]}" if x.get("fehler") else "") for x in auftr)   # der Grund der Börse gehört in die Meldung
        warn = bool(b.get("fehler") or b.get("ohne_stop") or "⚠️" in hinweis)
        if auftr or hinweis or warn:
            self.sag(f"Satellit {kurz(f)}: {wort}: {text or 'kein Auftrag'}" + (f" · Stop {b['stop']:g}" if b.get("stop") else "") + (f" · {hinweis}" if hinweis else ""), warn)
        elif pos == 0 and wort == "aufbauen":
            self.sag(f"Satellit {kurz(f)}: kein Auftrag (Betrag unter dem Mindestbetrag der Börse).")
        if self.trocken:
            return
        if pos is None:                                # unklar: Buch unverändert, das Symbol bleibt «bekannt» (Not-Aus schliesst es mit)
            self.unsicher.add(f)
            self.warnung = True
        elif pos == 0:
            if f in self.buch["positionen"]:
                self.buch["positionen"].pop(f)
                self.geaendert = True
        else:
            self.buch["positionen"][f] = {"spot": spot or (vorher or {}).get("spot"), "seit": (vorher or {}).get("seit") or self.stand, "menge": pos,
                                          "stop": b.get("stop") or (vorher or {}).get("stop"),
                                          "stop_anteil": round(anteil, 4) if anteil else (vorher or {}).get("stop_anteil", S.STOP_STANDARD)}
            self.geaendert = self.geaendert or vorher is None or vorher.get("menge") != pos

    def schliessen_symbol(self, f, grund):
        vorher = self.buch["positionen"].get(f)
        e = {"hebel": 0.0, "stand": self.stand}
        auftr = self._ausfuehren(e, f, 1 / S.PLAETZE)
        self._verbuchen(f, (vorher or {}).get("spot"), vorher, e, auftr, None, f"schliessen ({grund})")

    def aufbauen_symbol(self, f):
        """Einstieg (oder Angleichen am Entscheidungstag) auf gleiches Gewicht, mit Börsen-Stop."""
        b, c = self.buch, self.c
        vorher = b["positionen"].get(f)
        spot = self.spot_von.get(f) or (vorher or {}).get("spot")
        try:
            ist = c.position(f)
            mark = c.markpreis(f)[0]
        except Exception as ex:  # noqa: BLE001
            self.sag(f"Satellit {kurz(f)}: Position/Kurs nicht lesbar ({type(ex).__name__}) — heute nicht gehandelt.", True)
            return
        if vorher and not ist:                          # der Stop hat die Position seit dem letzten Lauf beendet: wieder ein frischer Einstieg
            b["positionen"].pop(f)
            vorher, self.geaendert = None, True
        if not vorher and ist and f not in self.bekannt_alt:
            self.sag(f"Satellit {kurz(f)}: im Konto steht schon eine fremde Position ({ist:g}) — nicht angefasst.")
            return
        anteil = self.stop_anteil(spot, vorher)
        e = {"hebel": HEBEL_JE_PLATZ, "stand": self.stand, "stop_long": mark * (1 - anteil)}
        auftr = self._ausfuehren(e, f, self.gewicht)
        self._verbuchen(f, spot, vorher, e, auftr, anteil, "aufbauen")

    def halten_symbol(self, f):
        """Zwischen den Entscheidungstagen: KEINE Aufträge, nur der Stop wird zum aktuellen Kurs nachgeführt. Ist die Position weg, war es der Stop."""
        b, c = self.buch, self.c
        vorher = b["positionen"][f]
        try:
            mark = c.markpreis(f)[0]
            regeln = c.regeln(f)
        except Exception as ex:  # noqa: BLE001
            self.sag(f"Satellit {kurz(f)}: Kurs/Regeln nicht lesbar ({type(ex).__name__}) — Stop unverändert gelassen.", True)
            return
        anteil = self.stop_anteil(vorher.get("spot"), vorher)
        preis = mark * (1 - anteil)
        if self.trocken:
            self.sag(f"(trocken) Satellit {kurz(f)}: Stop würde auf {preis:g} nachgeführt.")
            return
        e, erg = {"hinweis": ""}, {"position": None, "stop": None, "ohne_stop": False, "fehler": False}
        try:
            self.BF.stops_nachfuehren(c, f, regeln, {"stop_long": preis}, e, erg)
        except sperre.SperreVerloren:
            raise
        except Exception as ex:  # noqa: BLE001
            erg.update({"position": None, "fehler": True})
            e["hinweis"] = f"⚠️ Stop nicht nachgeführt ({type(ex).__name__})"
        pos = erg["position"]
        warn = bool(erg.get("ohne_stop") or erg.get("fehler") or "⚠️" in e["hinweis"])
        if warn or (pos is None):
            self.sag(f"Satellit {kurz(f)}: {e['hinweis'] or 'Position nicht lesbar — Stop unverändert.'}", True)
        if pos is None:
            self.unsicher.add(f)
        elif pos == 0:
            b["positionen"].pop(f)
            b["ausgestoppt"][f] = self.stand
            self.geaendert = True
            self.sag(f"Satellit {kurz(f)}: Position ist weg (Stop ausgelöst oder von Hand geschlossen) — erst am nächsten Entscheidungstag wieder.")
        else:
            b["positionen"][f] = dict(vorher, menge=pos, stop=erg.get("stop") or vorher.get("stop"), stop_anteil=round(anteil, 4))

    # ── Abschluss ──
    def abschluss(self, buch_pfad, push):
        b = self.buch
        if self.trocken:
            return
        b["bekannt"] = [f for f in b["bekannt"] if f in b["positionen"] or f in self.unsicher][-BEKANNT_MAX:]
        jetzt = datetime.now(timezone.utc).isoformat(timespec="seconds")
        b["letzter_lauf"] = {"zeit": jetzt, "tag": self.tag, "ok": not self.warnung, "auftraege": self.auftraege, "positionen": len(b["positionen"]),
                             "hinweise": [z for z in self.zeilen if "⚠️" in z][:5]}
        b["verlauf"] = (b["verlauf"] + [{"zeit": jetzt, "tag": self.tag, "auftraege": self.auftraege, "positionen": len(b["positionen"]), "ok": not self.warnung}])[-VERLAUF_MAX:]
        try:
            schreiben(b, buch_pfad)
        except OSError as ex:
            self.sag(f"Satellit: Buch nicht gespeichert ({type(ex).__name__}) — bitte data\\krypto-satellit.json prüfen.", True)
        if (self.auftraege or self.geaendert or self.warnung) and self.zeilen:
            try:
                push("📈 Satellit (Testnetz-Zusatz, Spielgeld):\n" + "\n".join(self.zeilen) + "\nKeine Anlageberatung.")
            except Exception:  # noqa: BLE001 — kein Handy-Kanal: Cockpit und Log zeigen es
                pass


def lauf(trocken=False, env=None, holen=None, client=None, protokolliere=None, buch_datei=None, push=None, aus_datei=None, pause_datei=None, gate=None, heute=None):
    """→ (Rückgabewert, Zeilen). 0 = in Ordnung, 3 = Warnung (schon aufs Handy gemeldet). `gate`: Aufruf → (ok, Text), vor neuen Käufen.
    `heute` (JJJJ-MM-TT) nur für Tests."""
    import broker_futures as BF
    env = os.environ if env is None else env
    cfg = BF.einstellungen(env)
    if cfg["echtgeld"]:
        return 0, ["Satellit: läuft nur im Testnetz (Spielgeld) — mit echtem Geld macht er nie etwas."]
    if not cfg["key"] or not cfg["secret"]:
        return 0, ["Satellit: keine Futures-Schlüssel — nichts zu tun."]
    if cfg.get("url_fehler"):
        return 3, ["⚠️ Satellit: " + cfg["url_fehler"]]
    push = push or _push
    ein = einstellung(env, aus_datei)
    not_aus = bool(cfg["stop"])
    alles_zu = ein["aus"] or not_aus
    buch_pfad = Path(buch_datei) if buch_datei else BUCH
    buch, hinweis = lesen(buch_pfad)
    if hinweis.startswith(UNLESBAR):
        if not trocken:
            try:
                push("📈 Satellit: " + hinweis + "\nKeine Anlageberatung.")
            except Exception:  # noqa: BLE001
                pass
        return 3, [hinweis]
    if not not_aus and not trocken and Path(pause_datei or PAUSE).exists():
        return 0, ["Satellit: Auto-Handel ist aus (Pause) — nichts gehandelt, Positionen bleiben mit ihrem Börsen-Stop."]
    if cfg["anteil"] <= 0:
        return (3 if buch["positionen"] else 0), ["Satellit: KI_BOT_ANTEIL ist 0 — nichts gehandelt" + (", die Positionen bleiben mit ihrem Börsen-Stop." if buch["positionen"] else ".")]
    L = _Lauf(BF, cfg, ein, client or BF.Futures(cfg), buch, env, trocken, protokolliere, heute)
    if hinweis:
        L.sag(hinweis, True)
    if alles_zu:
        L.sag("Satellit: " + ("Not-Aus aktiv" if not_aus else f"ausgeschaltet ({ein['grund']})") + " — alle Positionen werden geschlossen.")
    else:
        L.daten_und_entscheidung(holen or holen_standard)
    verfuegbar = L.vertraege() if (not alles_zu and buch["ziele"]) else None
    schliessen, aufbauen, halten = L.planen(verfuegbar, alles_zu)
    if aufbauen and gate is not None and not trocken:        # Selbsttest nur, wenn wirklich gekauft würde
        ok, text = gate()
        if not ok:
            L.sag(f"Satellit: Selbsttest durchgefallen ({text}) — heute keine neuen Käufe; Schliessen und Stops laufen weiter.", True)
            aufbauen = []
    if aufbauen and not trocken:                              # Absicht zuerst: gleich festhalten, in welchen Symbolen Aufträge unterwegs sein können
        for f in aufbauen:
            if f not in buch["bekannt"]:
                buch["bekannt"].append(f)
        try:
            schreiben(buch, buch_pfad)
        except OSError as ex:
            L.sag(f"Satellit: Buch nicht schreibbar ({type(ex).__name__}) — heute keine neuen Käufe.", True)
            aufbauen = []
    grund = "Not-Aus" if not_aus else "ausgeschaltet" if alles_zu else "nicht mehr im Ziel"
    for f in schliessen:
        L.schliessen_symbol(f, grund)
    for f in aufbauen:
        L.aufbauen_symbol(f)
    for f in halten:
        L.halten_symbol(f)
    L.abschluss(buch_pfad, push)
    if not L.zeilen:
        L.zeilen.append(f"Satellit: nichts zu tun ({len(buch['positionen'])} Positionen, Ziele: {', '.join(kurz(s) for s in buch['ziele']) or 'keine'}).")
    return (3 if L.warnung else 0), L.zeilen


def holen_standard(extra=()):
    """Tageskerzen der Kandidaten (öffentliche Binance-Daten, ohne Schlüssel). → (Reihen, fehlende Symbole). OSError, wenn gar nichts ankommt."""
    import satellit_daten as D
    return D.alle_reihen(sorted(set(D.kandidaten()) | set(extra)))


def _push(text):
    import signale as SG
    SG.push(text)


def selbsttest(zeit=240, tests=TESTS):
    """Die Tests des Satelliten in eigenen Prozessen. → (ok, Text). Fällt einer durch, kauft der Satellit an diesem Tag nichts Neues."""
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    for name in tests:
        pfad = HIER / name
        if not pfad.is_file():
            return False, f"{name} fehlt"
        try:
            r = subprocess.run([sys.executable, str(pfad)], cwd=str(ROOT), env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=zeit)
        except subprocess.TimeoutExpired:
            return False, f"{name}: länger als {zeit} Sekunden"
        if r.returncode != 0:
            letzte = next((x.strip() for x in reversed((r.stdout + "\n" + r.stderr).splitlines()) if x.strip()), "keine Ausgabe")
            return False, f"{name}: {letzte[:200]}"
    return True, "ok"


# ───────────────────────── Anzeige ─────────────────────────
def status_text(buch_datei=None, heute=None, env=None):
    b, hinweis = lesen(buch_datei)
    heute = heute or datetime.now(timezone.utc).date().isoformat()
    ein = einstellung(env)
    z = ["Satellit (Testnetz-Zusatz, Spielgeld, ohne Bitcoin und Ether):"]
    if hinweis:
        z.append("  " + hinweis)
    z.append("  Schalter: " + (f"AUS ({ein['grund']})" if ein["aus"] else f"an, Anteil {ein['anteil'] * 100:.0f} % des Kontos, höchstens {S.PLAETZE} Plätze"))
    z.append(f"  Letzte Entscheidung: {b['entschieden'] or 'noch keine'} → Ziele: " + (", ".join(kurz(s) for s in b["ziele"]) or "keine (alles USDT)"))
    z.append("  Positionen: " + ("; ".join(f"{kurz(f)} {p.get('menge'):g} (seit {p.get('seit') or '?'}, Stop {p.get('stop') or '?'})" for f, p in b["positionen"].items()) or "keine"))
    if b["ausgestoppt"]:
        z.append("  Ausgestoppt (bis zum nächsten Entscheidungstag): " + ", ".join(kurz(f) for f in b["ausgestoppt"]))
    nxt = naechster_entscheidungstag(heute)
    z.append(f"  Nächster Entscheidungstag: {WOCHENTAGE[date.fromisoformat(nxt).weekday()]} {nxt} (wirksam beim ersten Lauf nach seinem Tagesschluss)")
    ll = b.get("letzter_lauf")
    if ll:
        z.append(f"  Letzter Lauf: {str(ll.get('zeit', '?'))[:16].replace('T', ' ')} UTC ({'ok' if ll.get('ok') else 'mit Warnung'}, {ll.get('auftraege', 0)} Aufträge)")
    return "\n".join(z)


def ampel(env=None, buch_datei=None, jetzt=None):
    """(ok, Text, warnung) für die Gesundheits-Ampel des Cockpits. ok None = grau (Info)."""
    env = os.environ if env is None else env
    import broker_futures as BF
    if BF.einstellungen(env)["echtgeld"]:
        return None, "nur Testnetz — mit echtem Geld macht der Satellit nichts", False
    ein = einstellung(env)
    b, hinweis = lesen(buch_datei)
    if hinweis.startswith(UNLESBAR):
        return False, hinweis, False
    if ein["aus"]:
        return None, f"aus ({ein['grund']})" + (f" — {len(b['positionen'])} Position(en) noch offen: der nächste Lauf schliesst sie" if b["positionen"] else ""), False
    ll = b.get("letzter_lauf")
    if not ll:
        return None, "an, noch nicht gelaufen (kommt nach dem nächsten Tageslauf)", False
    jetzt = jetzt or datetime.now(timezone.utc)
    try:
        alter = jetzt - datetime.fromisoformat(ll["zeit"])
    except (KeyError, TypeError, ValueError):
        return None, "letzter Lauf nicht lesbar", True
    text = (f"{len(b['positionen'])} Position(en): {', '.join(kurz(f) for f in b['positionen']) or 'keine'} · Ziele: {', '.join(kurz(s) for s in b['ziele']) or 'keine'}"
            f" · letzter Lauf {str(ll['zeit'])[:16].replace('T', ' ')} UTC")
    if not ll.get("ok"):
        return None, text + " — letzter Lauf mit Warnung: " + ("; ".join(ll.get("hinweise") or []) or "siehe Handy-Nachricht")[:200], True
    if alter.total_seconds() > 3 * 86400:
        return None, text + f" — seit {alter.days} Tagen kein Lauf", True
    return True, text, False


# ───────────────────────── Aufruf ─────────────────────────
def kurse_vorab(env=None, buch_datei=None, aus_datei=None, pause_datei=None):
    """Die Kurse VOR der Lauf-Sperre holen (öffentlich, ohne Schlüssel; ein langsames Netz soll die Nachkontrolle des Piloten nie aufhalten).
    → ein Ersatz für holen_standard, der das Ergebnis (oder den Netzfehler) liefert. Braucht der Lauf keine Kurse, bleibt es holen_standard."""
    import broker_futures as BF
    env = os.environ if env is None else env
    cfg = BF.einstellungen(env)
    if (einstellung(env, aus_datei)["aus"] or cfg["stop"] or cfg["echtgeld"] or not cfg["key"] or not cfg["secret"] or cfg["anteil"] <= 0
            or Path(pause_datei or PAUSE).exists()):
        return holen_standard
    buch, hinweis = lesen(buch_datei)
    if hinweis.startswith(UNLESBAR):
        return holen_standard
    try:
        ergebnis = holen_standard(extra=[p["spot"] for p in buch["positionen"].values() if p.get("spot")])
    except OSError as ex:
        def fehler(extra=(), _ex=ex):                 # «ex» wird am Ende des except-Blocks gelöscht: den Fehler hier festhalten
            raise _ex
        return fehler
    return lambda extra=(): ergebnis


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lauf", action="store_true", help="entscheiden und handeln")
    ap.add_argument("--trocken", action="store_true", help="nur zeigen: kein Auftrag, kein Eintrag im Buch")
    ap.add_argument("--status", action="store_true")
    a = ap.parse_args(argv)
    if a.status or not a.lauf:
        print(status_text())
        return 0
    holen = kurse_vorab()
    try:
        with sperre.lauf_sperre(warten=0 if a.trocken else sperre.ALT_NACH_TOT + 40, alt_nach=sperre.ALT_NACH_TOT):
            rc, zeilen = lauf(trocken=a.trocken, holen=holen, gate=None if a.trocken else selbsttest)
    except sperre.Besetzt as ex:
        print(f"{ex} Der Satellit handelt heute nicht — später nochmals starten.")
        if not a.trocken:
            try:
                _push(f"⚠️ Satellit: heute NICHT gehandelt — {ex} Bitte später `satellit.py --lauf` nochmals starten.\nKeine Anlageberatung.")
            except Exception:  # noqa: BLE001
                pass
        return 0 if a.trocken else 3
    print("\n".join(zeilen))
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
