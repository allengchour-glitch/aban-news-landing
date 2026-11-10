#!/usr/bin/env python3
"""Scalping-Labor — Papierhandel mit Minutenkursen und angesetztem Gebühren-/Schlupfmodell.
PAPIER: kein Auftrag, kein Schlüssel, kein Geld im Spiel.

    python3 tools/trading/krypto_bot/scalping_labor.py --einmal           # neue Minutenkerzen holen, nachrechnen, Buch speichern
    python3 tools/trading/krypto_bot/scalping_labor.py --einmal --push    # dazu die Tageszusammenfassung aufs Handy (Telegram/ntfy, falls eingerichtet)
    python3 tools/trading/krypto_bot/scalping_labor.py --dauer            # Fenster offen lassen: jede Minute nachrechnen
    python3 tools/trading/krypto_bot/scalping_labor.py --status           # Tabelle und Urteil
    python3 tools/trading/krypto_bot/scalping_labor.py --kostencheck      # Offline-Kostenprüfung, keine Schreibzugriffe

Warum es das gibt: Der Prüfstand vom 13.10.2026 (scalping_pruefung.py, vorab festgelegt) hat sieben Scalping-Verfahren auf BTC und ETH mit
Minutenkerzen von 2022 bis 2026 und angesetzten Binance-Gebühren geprüft. Alle verlieren nach Kosten; das am wenigsten schlechte im Schnitt
rund −6,9 bp (−0,07 %) je Trade, keines besteht (`handelbar: []`). Der Besitzer will trotzdem «Trades, die immer scalpen» (03.11.2026). Im
Testnetz-Konto geht das nicht sauber: Pilot und Satellit halten dort dieselben Coins, im Ein-Weg-Modus gäbe es je Symbol nur EINE
Position, und Testnetz-Füllungen beweisen keine Rentabilität. Darum rechnet das Labor auf Papier mit denselben Regeln, Gebühren und
Füllregeln wie der Prüfstand und führt das Buch jeden Tag weiter: ein Vorwärtstest auf Kursen, die beim Festlegen der Regeln noch nicht
existierten. Ehrlich statt versprochen.

Was gerechnet wird: Strategie S1 «Band-Abpraller» (Mean-Reversion, Maker-Einstieg, 1-Minuten-Kerzen) mit den vier vorab festgelegten Stufen
k = 2,0 / 2,5 / 3,0 / 3,5 auf BTCUSDT und ETHUSDT: Limit an Mittelwert ± k·σ (20 Kerzen), Ziel der Mittelwert, Stop gleich weit jenseits, höchstens
30 Minuten. Alles streng wie scalping_kern.band_abpraller (Limit füllt nur beim Durchstossen um 1 Tick, Stop und Ziel in derselben Kerze gilt
Stop, Taker-Schlupf, Gebühren Maker 0,02 % / Taker 0,05 %). Eine Zustandsmaschine rechnet Kerze für Kerze; test_scalping_labor.py belegt, dass sie
Handel für Handel dasselbe ergibt wie der Prüfstand. Weil nur abgeschlossene Kerzen zählen, ist Nachholen identisch mit Live: läuft das Labor eine
Weile nicht, holt der nächste Lauf alles aus den Kerzen-Archiven der Börse nach (nichts geht verloren, nichts wird doppelt gezählt).

Urteil (vorab festgelegt, bevor ein Handel gerechnet wurde): «bestanden» nur, wenn für DASSELBE k auf BTC UND ETH gilt: mindestens 14 Tage Daten,
mindestens 200 Trades, im Schnitt ≥ +1 bp netto je Trade UND Netto-Summe positiv in beiden Hälften der Tage. Vorher steht «zu wenig Daten», danach
«durchgefallen» oder «bestanden». Bestanden hiesse höchstens: Kandidat für mehr Beobachtung; nie Echtgeld, nie automatisch ein Testnetz-Auftrag.

Grenzen (ehrlich): Kerzen vom Binance-Spot-Spiegel (data-api.binance.vision; die Futures-Schnittstelle ist in manchen Ländern gesperrt), der
Prüfstand rechnete mit Perpetual-Kerzen: die Kurse unterscheiden sich um die Basis (meist wenige bp), ob das etwas verschiebt, ist ungemessen.
Funding bleibt weg (Haltedauer im Schnitt rund 10 Minuten). Papier-Füllungen sind streng, aber nie so schlecht wie eine echte Warteschlange.
Keine Anlageberatung.

Ausschalter: KRYPTO_SCALP_LABOR=aus oder Datei data/krypto-scalping-labor-aus.txt. Not-Aus (Datei STOP, KI_BOT_STOP=1) und Pause: das Labor tut dann nichts
und holt später nach. Buch: data/krypto-scalping-labor.json (mit Sicherungskopie .bak).
"""
from __future__ import annotations

import argparse
import json
import hashlib
import math
import os
import shutil
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import scalping_kern as K  # noqa: E402

ROOT = HIER.parents[2]
BUCH = ROOT / "data" / "krypto-scalping-labor.json"
AUS_DATEI = ROOT / "data" / "krypto-scalping-labor-aus.txt"
SPERR_DATEI = ROOT / "data" / "krypto-scalping-labor.lock"
KI_BOT = HIER.parent / "ki_bot"
STOP, PAUSE = KI_BOT / "STOP", KI_BOT / "PAUSE"

MINUTE = K.MINUTE
TAG_MS = 86_400_000
AUS_WORTE = ("aus", "0", "nein", "no", "off", "false")

# ───────── die vorab festgelegten Einstellungen des Prüfstands (13.10.2026) — nichts davon wird hier angepasst ─────────
MAERKTE = {"BTCUSDT": {"tick": 0.1, "slip": 0.00010}, "ETHUSDT": {"tick": 0.01, "slip": 0.00015}}
GEBUEHR = {"M": 0.0002, "T": 0.0005}
STUFEN = (2.0, 2.5, 3.0, 3.5)
N_BAND, HALT = 20, 30
# Was der Prüfstand auf den ungesehenen Daten 01.2024–09.2026 (1 004 Tage) gemessen hat: (Brutto bp, Netto bp, Trades), aus data/krypto-scalping-pruefung.json
ERWARTUNG = {
    ("BTCUSDT", 2.0): (-3.039, -9.565, 120143), ("BTCUSDT", 2.5): (-1.600, -8.037, 77016),
    ("BTCUSDT", 3.0): (-0.763, -7.192, 49259), ("BTCUSDT", 3.5): (-0.457, -6.927, 30618),
    ("ETHUSDT", 2.0): (-4.502, -11.338, 127223), ("ETHUSDT", 2.5): (-2.517, -9.244, 82202),
    ("ETHUSDT", 3.0): (-1.286, -8.008, 53326), ("ETHUSDT", 3.5): (-0.719, -7.485, 34093),
}
PRUEF_TAGE = 1004
# Das vorab festgelegte Urteil über den Vorwärtstest
URTEIL_TAGE_MIN, URTEIL_TRADES_MIN, URTEIL_NETTO_BP_MIN = 14, 200, 1.0

# ───────── Betrieb ─────────
RUECKRECHNUNG_MIN = 24 * 60          # beim ersten Lauf: so weit zurück nachrechnen (damit es sofort etwas zu sehen gibt; im Buch gezählt)
SEITE = 1000                         # Kerzen je Abfrage (Maximum der Börse)
MAX_SEITEN = 15                      # höchstens so viele Seiten je Markt und Lauf (15 000 Kerzen ≈ 10 Tage), der nächste Lauf macht weiter
MAX_LUECKE_MIN = 30 * 24 * 60        # nach so langem Stillstand wird neu angesetzt (und gezählt), statt Wochen nachzurechnen
SICHER_MS = 5000                     # eine Kerze zählt erst, wenn ihr Schluss so lange her ist (gegen noch laufende Kerzen)
LETZTE_MAX = 200                     # so viele einzelne Trades je Buch bleiben im Buch, Summen und Tageswerte für immer (Tage: TAGE_MAX)
TAGE_MAX = 120
LOCK_ALT_S = 900
BUCH_FELDER = ("k", "i", "s1", "s2", "fenster", "stat", "pos", "n", "n_nach", "wins", "sum_br", "sum_net", "gew", "verl", "kum", "hoechst",
               "tiefst", "dauer_ms", "tage", "letzte")


def _de(x, nd=1, vorz=False):
    """Zahl mit Komma und echtem Minuszeichen: −9,6 (vorz=True: immer mit Vorzeichen)."""
    s = f"{abs(x):.{nd}f}"
    if float(s) == 0:                                  # rundet auf null: kein Vorzeichen («−0,0 bp» läse sich falsch)
        return s.replace(".", ",")
    return ("−" if x < 0 else ("+" if vorz else "")) + s.replace(".", ",")


def _iso(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).isoformat(timespec="seconds")


def _tag(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).date().isoformat()


def _kurz_zeit(ms):
    d = datetime.fromtimestamp(ms / 1000, timezone.utc)
    return f"{d.day:02d}.{d.month:02d}. {d.hour:02d}:{d.minute:02d} UTC"


def rund_minute(ms):
    return int(ms) - int(ms) % MINUTE


def kurz(sym):
    return sym[:-4] if sym.endswith("USDT") else sym


def kosten_von(sym):
    return {**GEBUEHR, "slip": MAERKTE[sym]["slip"]}


# ───────────────────────── Einstellungen ─────────────────────────
def einstellung(env=None, aus_datei=None, stop=None, pause=None):
    """→ {aus, grund}. Aus per KRYPTO_SCALP_LABOR, Datei, Not-Aus (STOP, KI_BOT_STOP=1) oder Pause (Auto-Handel aus). «Aus» heisst nur: dieser Lauf rechnet nichts;
    der nächste Lauf holt alles nach, es geht nichts verloren."""
    env = os.environ if env is None else env
    if (env.get("KRYPTO_SCALP_LABOR") or "").strip().lower() in AUS_WORTE:
        return {"aus": True, "grund": "KRYPTO_SCALP_LABOR=aus"}
    if Path(aus_datei or AUS_DATEI).exists():
        return {"aus": True, "grund": "Datei data\\krypto-scalping-labor-aus.txt"}
    if (env.get("KI_BOT_STOP") or "").strip() == "1" or Path(stop or STOP).exists():
        return {"aus": True, "grund": "Not-Aus ist aktiv"}
    if Path(pause or PAUSE).exists():
        return {"aus": True, "grund": "Auto-Handel ist aus (Pause)"}
    return {"aus": False, "grund": ""}


# ───────────────────────── die Maschine: Band-Abpraller, Kerze für Kerze ─────────────────────────
def neues_band_buch(k):
    """Leeres Buch einer Stufe: Zustand der Maschine (i, s1, s2, fenster, stat, pos) und alle Summen (n bis letzte). Alles JSON-fähig."""
    return {"k": k, "i": 0, "s1": 0.0, "s2": 0.0, "fenster": [], "stat": None, "pos": None,
            "n": 0, "n_nach": 0, "wins": 0, "sum_br": 0.0, "sum_net": 0.0, "gew": 0.0, "verl": 0.0, "kum": 0.0, "hoechst": 0.0, "tiefst": 0.0,
            "dauer_ms": 0, "tage": {}, "letzte": []}


def _stat(b, c, n=N_BAND):
    """Gleitender Mittelwert und σ der letzten n Schlusskurse: dieselben laufenden Summen und dieselbe Auffrischung alle 4096 Kerzen wie
    scalping_kern.mittel_sd, damit jede Schwelle bis auf das letzte Bit gleich ist."""
    i = b["i"]
    b["s1"] += c
    b["s2"] += c * c
    f = b["fenster"]
    if i >= n:
        w = f[0]
        b["s1"] -= w
        b["s2"] -= w * w
    f.append(c)
    if len(f) > n:
        del f[0]
    if i >= n - 1:
        if i % 4096 == 0:
            b["s1"], b["s2"] = sum(f), sum(q * q for q in f)
        mu = b["s1"] / n
        b["stat"] = [mu, math.sqrt(max(0.0, b["s2"] / n - mu * mu))]
    else:
        b["stat"] = None
    b["i"] = i + 1


def kerze(b, tick, t, o, h, l, c, n=N_BAND, halt=HALT, p=MINUTE):  # noqa: E741 — l = Tief, wie im Prüfstand
    """Eine abgeschlossene Kerze (Zeit t in ms, Eröffnung o, Hoch h, Tief l, Schluss c) in die Maschine geben. → fertige Handel als Tupel
    (t_ein, t_aus, richtung, preis_ein, preis_aus, "M", art_aus) — genau die Tupel von scalping_kern.band_abpraller. Ein offener Handel bleibt in b["pos"]."""
    k = b["k"]
    fertig = []
    pos = b["pos"]
    if pos is None:
        st = b["stat"]                                         # Mittelwert und σ bis zur VORHERIGEN Kerze: das Signal ist von gestern, gefüllt wird heute
        if st is not None and st[1] > 0:
            m, s_ = st
            unten, oben = m - k * s_, m + k * s_
            kauf, verk = l < unten - tick, h > oben + tick
            if kauf and verk:                                  # beide in derselben Kerze: der näher an der Eröffnung zuerst
                if o - unten <= oben - o:
                    verk = False
                else:
                    kauf = False
            if kauf or verk:
                s = 1 if kauf else -1
                ein = unten if kauf else oben
                stop = ein - s * abs(ein - m)
                if (s == 1 and l <= stop) or (s == -1 and h >= stop):   # in der Einstiegskerze zählt nur der Stop, nie das Ziel
                    fertig.append((t, t, s, ein, min(o, stop) if s == 1 else max(o, stop), "M", "T"))
                else:
                    b["pos"] = {"s": s, "ein": ein, "stop": stop, "m": m, "t": t, "anz": 0}
    else:
        pos["anz"] += 1
        s, stop, m = pos["s"], pos["stop"], pos["m"]
        aus = None
        if s == 1 and l <= stop:
            aus = (t, min(o, stop), "T")
        elif s == -1 and h >= stop:
            aus = (t, max(o, stop), "T")
        elif s == 1 and h > m + tick:
            aus = (t, m, "M")
        elif s == -1 and l < m - tick:
            aus = (t, m, "M")
        elif pos["anz"] >= halt:
            aus = (t + p, c, "T")
        if aus:
            fertig.append((pos["t"], aus[0], s, pos["ein"], aus[1], "M", aus[2]))
            b["pos"] = None
    _stat(b, c, n)
    return fertig


def buche(b, tr, kosten, live_ab_ms):
    """Einen fertigen Handel ins Buch: Summen wie scalping_kern.kennzahlen (Rechenreihenfolge gleich → Ergebnis gleich bis auf das letzte Bit)."""
    br, net = K.brutto(tr), K.netto(tr, kosten)
    b["n"] += 1
    if tr[0] < live_ab_ms:
        b["n_nach"] += 1
    if net > 0:
        b["wins"] += 1
        b["gew"] += net
    elif net < 0:
        b["verl"] -= net
    b["sum_br"] += br
    b["sum_net"] += net
    b["kum"] += net
    b["hoechst"] = max(b["hoechst"], b["kum"])
    b["tiefst"] = min(b["tiefst"], b["kum"] - b["hoechst"])
    b["dauer_ms"] += tr[1] - tr[0]
    tag = _tag(tr[1])
    z = b["tage"].setdefault(tag, [0, 0.0, 0.0, 0])
    z[0] += 1
    z[1] += net
    z[2] += br
    z[3] += 1 if net > 0 else 0
    while len(b["tage"]) > TAGE_MAX:
        del b["tage"][min(b["tage"])]
    b["letzte"].append([tr[0], tr[1], tr[2], tr[3], tr[4], tr[6], round(net * 1e4, 3)])
    if len(b["letzte"]) > LETZTE_MAX:
        del b["letzte"][:len(b["letzte"]) - LETZTE_MAX]


def kennzahlen(b):
    """Dieselben Kennzahlen wie scalping_kern.kennzahlen (Test: gleich), aus den Summen des Buchs."""
    n = b["n"]
    if not n:
        return {"n": 0}
    return {"n": n, "treffer": round(b["wins"] / n, 4), "brutto_bp": round(1e4 * b["sum_br"] / n, 3), "netto_bp": round(1e4 * b["sum_net"] / n, 3),
            "summe_pct": round(100 * b["sum_net"], 2), "pf": round(b["gew"] / b["verl"], 3) if b["verl"] > 0 else None,
            "einbruch_pct": round(100 * b["tiefst"], 2), "dauer_min": round(b["dauer_ms"] / n / MINUTE, 1)}


def kosten_diagnose(b):
    """Vergangene Papierergebnisse erklären, ohne Parameterwahl oder Handelsfreigabe.

    Das Kostenbudget ist nur der beobachtete durchschnittliche Bruttoertrag bis
    zur schwarzen Null. Es ist keine Prognose einer künftig tragbaren Gebühr.
    """
    if not b or not b["n"]:
        return {"ursache": "keine_trades", "modellkosten_bp": None, "kostenbudget_null_bp": None,
                "abstand_mindestkante_bp": None, "handelsfreigabe": False}
    br, net = 1e4 * b["sum_br"] / b["n"], 1e4 * b["sum_net"] / b["n"]
    ursache = ("kein_bruttovorteil" if br <= 0 else "kosten_verbrauchen_vorteil" if net <= 0
               else "unter_mindestkante" if net < URTEIL_NETTO_BP_MIN else "mindestkante_erreicht")
    return {"ursache": ursache, "modellkosten_bp": round(br - net, 3),
            "kostenbudget_null_bp": round(br, 3) if br > 0 else None,
            "abstand_mindestkante_bp": round(max(0.0, URTEIL_NETTO_BP_MIN - net), 3), "handelsfreigabe": False}


# ───────────────────────── Kerzen holen ─────────────────────────
def standard_hole():
    import binance_daten as BD     # öffentliche Marktdaten ohne Schlüssel (Spiegel data-api.binance.vision, Rückfall api.binance.com)
    return BD._hole


def server_zeit(hole, lokal=None):
    """Börsenzeit in ms (eine Anfrage); fällt sie aus, die Uhr des Rechners."""
    try:
        return int(hole("/api/v3/time")["serverTime"])
    except Exception:  # noqa: BLE001 — Netz, Antwortform, Zahl: in jedem Fall die lokale Uhr
        return int(time.time() * 1000) if lokal is None else int(lokal)


def holen_kerzen(sym, ab_ms, jetzt_ms, hole, max_seiten=MAX_SEITEN):
    """Abgeschlossene 1-Minuten-Kerzen ab ab_ms in Zeitfolge → ([(t, o, h, l, c)], hinweis). Bricht bei einem Netzfehler mit dem bis dahin
    Geholten ab (der Aufrufer macht beim nächsten Lauf genau dort weiter). Unplausible Kerzen werden übersprungen und gemeldet."""
    out, hinweis, defekt, naechste = [], "", 0, int(ab_ms)
    for _ in range(max_seiten):
        try:
            roh = hole(f"/api/v3/klines?symbol={sym}&interval=1m&startTime={naechste}&limit={SEITE}")
        except Exception as ex:  # noqa: BLE001 — jeder Fehler beim Holen: mit dem Vorhandenen weiter, später mehr
            hinweis = f"{kurz(sym)}: Kerzen nicht erreichbar ({type(ex).__name__}) — nach {len(out)} Kerzen abgebrochen, der nächste Lauf holt den Rest"
            break
        if not isinstance(roh, list) or not roh:
            break
        offen, letzte_t = False, None
        for r in roh:
            try:
                t, schluss = r[0], r[6]
                if (type(t) is not int or type(schluss) is not int or t < 0
                        or t % MINUTE != 0 or schluss != t + MINUTE - 1
                        or any(isinstance(r[i], bool) for i in (1, 2, 3, 4))):
                    raise ValueError("Kein gültiges Binance-Minutenintervall")
                o, h, l, c = (float(r[i]) for i in (1, 2, 3, 4))  # noqa: E741
            except (IndexError, KeyError, TypeError, ValueError, OverflowError):
                defekt += 1
                continue
            letzte_t = t if letzte_t is None or t > letzte_t else letzte_t
            if schluss >= jetzt_ms - SICHER_MS:                # diese und alle späteren Kerzen laufen noch
                offen = True
                break
            if t < naechste or (out and t <= out[-1][0]):      # doppelt oder aus der Reihe
                continue
            if not all(math.isfinite(x) and x > 0 for x in (o, h, l, c)) or h < l or not (l <= o <= h) or not (l <= c <= h):
                defekt += 1
                continue
            out.append((t, o, h, l, c))
        if offen or len(roh) < SEITE or letzte_t is None:
            break
        naechste = letzte_t + MINUTE
    if defekt:
        hinweis = (hinweis + " · " if hinweis else "") + f"{kurz(sym)}: {defekt} unplausible Kerze(n) übersprungen"
    return out, hinweis


# ───────────────────────── Buch lesen und schreiben ─────────────────────────
def neues_buch(jetzt_ms):
    return {"version": 1, "start": _iso(jetzt_ms), "live_ab": int(jetzt_ms), "daten_ab": None, "maerkte": {}, "letzter_lauf": None, "push_tag": None}


def _zahl(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _buch_pruefen(d):
    """Gestalt prüfen: ValueError bei Unsinn (lieber die Sicherungskopie nehmen, als mit einem halben Buch weiterzurechnen)."""
    if not isinstance(d, dict) or d.get("version") != 1 or not _zahl(d.get("live_ab")) or not isinstance(d.get("maerkte"), dict):
        raise ValueError("kein Labor-Buch")
    for sym, m in d["maerkte"].items():
        if sym not in MAERKTE or not isinstance(m, dict) or not isinstance(m.get("buecher"), dict):
            raise ValueError(f"Markt {sym}")
        if m.get("weiter_ab") is not None and not _zahl(m["weiter_ab"]):
            raise ValueError("weiter_ab")
        for kk, b in m["buecher"].items():
            if not isinstance(b, dict) or any(f not in b for f in BUCH_FELDER) or kk != str(b["k"]) or b["k"] not in STUFEN:
                raise ValueError(f"Buch {sym} {kk}")
            if not all(_zahl(b[f]) for f in ("i", "s1", "s2", "n", "n_nach", "wins", "sum_br", "sum_net", "gew", "verl", "kum", "hoechst", "tiefst", "dauer_ms")):
                raise ValueError(f"Zahl in {sym} {kk}")
            if not isinstance(b["fenster"], list) or not isinstance(b["tage"], dict) or not isinstance(b["letzte"], list):
                raise ValueError(f"Gestalt in {sym} {kk}")
    return d


def _lesen_datei(pfad):
    return _buch_pruefen(json.loads(Path(pfad).read_text(encoding="utf-8")))


def lesen(datei=None, jetzt_ms=None, beiseite=True):
    """→ (Buch, Hinweis). Fehlt alles: neues Buch ohne Hinweis. Kaputt: Sicherungskopie (Hinweis). Beide kaputt: das kaputte Buch wird beiseitegelegt
    (nie überschrieben), ein neues angefangen, Hinweis. beiseite=False (Anzeige, Cockpit): nur lesen, nie eine Datei anfassen."""
    pfad = Path(datei) if datei else BUCH
    jetzt = int(time.time() * 1000) if jetzt_ms is None else int(jetzt_ms)
    bak = pfad.with_name(pfad.name + ".bak")
    if not pfad.exists() and not bak.exists():
        return neues_buch(jetzt), ""
    try:
        return _lesen_datei(pfad), ""
    except (OSError, ValueError):
        pass
    try:
        return _lesen_datei(bak), "⚠️ Labor-Buch fehlte oder war kaputt — Sicherungskopie benutzt."
    except (OSError, ValueError):
        pass
    if not beiseite:
        return neues_buch(jetzt), "⚠️ Labor-Buch unlesbar und keine brauchbare Sicherungskopie — beim nächsten Lauf wird es beiseitegelegt und ein neues beginnt."
    for kaputt in (pfad, bak):
        if kaputt.exists():
            try:
                os.replace(kaputt, kaputt.with_name(kaputt.name + f".kaputt-{jetzt // 1000}"))
            except OSError:
                pass
    return neues_buch(jetzt), "⚠️ Labor-Buch unlesbar und keine brauchbare Sicherungskopie — das alte liegt als .kaputt-… daneben, ein neues beginnt."


def schreiben(buch, datei=None):
    """Atomar; nur ein HEILES Buch wird zur Sicherungskopie."""
    pfad = Path(datei) if datei else BUCH
    pfad.parent.mkdir(parents=True, exist_ok=True)
    if pfad.exists():
        try:
            _lesen_datei(pfad)
            shutil.copyfile(pfad, pfad.with_name(pfad.name + ".bak"))
        except (OSError, ValueError):
            pass
    tmp = pfad.with_name(pfad.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(buch, ensure_ascii=False, indent=None, separators=(",", ":")) + "\n", encoding="utf-8")
    os.replace(tmp, pfad)


class Besetzt(Exception):
    pass


@contextmanager
def sperre(datei=None, alt_s=LOCK_ALT_S, jetzt=None):
    """Ein Lauf zur Zeit (Tagesbatch und Cockpit könnten gleichzeitig kommen). Eine Sperre, die älter als alt_s ist, gilt als verwaist."""
    pfad = Path(datei) if datei else SPERR_DATEI
    pfad.parent.mkdir(parents=True, exist_ok=True)
    for versuch in range(2):
        try:
            fd = os.open(pfad, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            try:
                alter = (time.time() if jetzt is None else jetzt) - pfad.stat().st_mtime
            except OSError:
                continue                                       # gerade freigegeben: nochmals versuchen
            if alter > alt_s and versuch == 0:
                try:
                    pfad.unlink()
                except OSError:
                    pass
                continue
            raise Besetzt("Ein anderer Lauf des Scalping-Labors ist gerade aktiv.") from None
        try:
            os.write(fd, f"{os.getpid()}\n".encode())
        finally:
            os.close(fd)
        break
    else:
        raise Besetzt("Sperre nicht zu bekommen.")
    try:
        yield
    finally:
        try:
            pfad.unlink()
        except OSError:
            pass


# ───────────────────────── Lauf ─────────────────────────
def _neuer_markt():
    return {"weiter_ab": None, "letzte_kerze": None, "luecken": 0, "buecher": {}}


def lauf(buch, hole, jetzt_ms=None, rueckrechnung_min=RUECKRECHNUNG_MIN, max_seiten=MAX_SEITEN):
    """Neue abgeschlossene Kerzen holen und durch alle Bücher rechnen (verändert `buch`, schreibt nichts). → {"kerzen": {sym: n}, "trades": {"BTC 3,5": n}, "hinweise": [..]}.
    Wirft ein Fehler mitten im Rechnen, bleibt die Datei unverändert (der Aufrufer schreibt erst danach): der nächste Lauf rechnet dieselben Kerzen nochmals."""
    jetzt = server_zeit(hole) if jetzt_ms is None else int(jetzt_ms)
    ergebnis = {"kerzen": {}, "trades": {}, "hinweise": []}
    for sym, par in MAERKTE.items():
        m = buch["maerkte"].setdefault(sym, _neuer_markt())
        for k in STUFEN:
            m["buecher"].setdefault(str(k), neues_band_buch(k))
        ab = m["weiter_ab"]
        neu_angesetzt = False
        if ab is None or jetzt - ab > MAX_LUECKE_MIN * MINUTE:
            neu_angesetzt = True
            if ab is not None:                                   # zu lange Pause: Maschine neu ansetzen (offene Papier-Position verfällt), Summen bleiben
                m["luecken"] += 1
                for k in STUFEN:
                    b = m["buecher"][str(k)]
                    b.update({"i": 0, "s1": 0.0, "s2": 0.0, "fenster": [], "stat": None, "pos": None})
                ergebnis["hinweise"].append(f"{kurz(sym)}: Pause über {MAX_LUECKE_MIN // 1440} Tage — neu angesetzt")
            ab = rund_minute(jetzt - rueckrechnung_min * MINUTE)
            if buch.get("daten_ab") is None:
                buch["daten_ab"] = ab
        kerzen, hinweis = holen_kerzen(sym, ab, jetzt, hole, max_seiten)
        if hinweis:
            ergebnis["hinweise"].append(hinweis)
        kosten = kosten_von(sym)
        for (t, o, h, l, c) in kerzen:  # noqa: E741
            for k in STUFEN:
                b = m["buecher"][str(k)]
                for tr in kerze(b, par["tick"], t, o, h, l, c):
                    buche(b, tr, kosten, buch["live_ab"])
                    schl = f"{kurz(sym)} {_de(k)}"
                    ergebnis["trades"][schl] = ergebnis["trades"].get(schl, 0) + 1
        if kerzen:
            m["weiter_ab"] = kerzen[-1][0] + MINUTE
            m["letzte_kerze"] = kerzen[-1][0]
        elif neu_angesetzt:
            m["weiter_ab"] = ab                                  # nichts bekommen (z. B. offline): beim nächsten Mal wieder ab hier, die Pause zählt nur einmal
        ergebnis["kerzen"][sym] = len(kerzen)
    buch["letzter_lauf"] = {"zeit": _iso(jetzt), "kerzen": sum(ergebnis["kerzen"].values()), "trades": sum(ergebnis["trades"].values()),
                            "hinweise": ergebnis["hinweise"][:5]}
    return ergebnis


# ───────────────────────── Urteil und Anzeige ─────────────────────────
def tage_daten(buch):
    """Kalendertage zwischen dem ersten verarbeiteten Kerzenstand und der letzten Kerze (0, solange nichts gerechnet wurde)."""
    ab = buch.get("daten_ab")
    letzte = [m["letzte_kerze"] for m in buch["maerkte"].values() if m.get("letzte_kerze")]
    if ab is None or not letzte:
        return 0.0
    return max(0.0, (min(letzte) - ab) / TAG_MS)


def _haelften(b):
    """(Summe der ersten Hälfte der Tage, Summe der zweiten) — ein Tag mit Handel zählt als ein Tag; bei weniger als 2 Tagen (None, None)."""
    tage = sorted(b["tage"])
    if len(tage) < 2:
        return None, None
    mitte = len(tage) // 2
    return sum(b["tage"][t][1] for t in tage[:mitte]), sum(b["tage"][t][1] for t in tage[mitte:])


def urteil(buch):
    """Das vorab festgelegte Urteil. → {"urteil": "zu wenig Daten"|"durchgefallen"|"bestanden", "tage": float, "je_stufe": {k: {...}}, "text": str}."""
    tage = tage_daten(buch)
    je, reif, bestanden = {}, [], []
    for k in STUFEN:
        zeile = {}
        for sym in MAERKTE:
            b = (buch["maerkte"].get(sym) or {}).get("buecher", {}).get(str(k))
            kz = kennzahlen(b) if b else {"n": 0}
            h1, h2 = _haelften(b) if b else (None, None)
            zeile[kurz(sym)] = {"n": kz["n"], "netto_bp": kz.get("netto_bp"), "haelften": [h1, h2],
                                "genug": kz["n"] >= URTEIL_TRADES_MIN and tage >= URTEIL_TAGE_MIN,
                                "besteht": bool(kz["n"] >= URTEIL_TRADES_MIN and tage >= URTEIL_TAGE_MIN and kz.get("netto_bp") is not None
                                                and kz["netto_bp"] >= URTEIL_NETTO_BP_MIN and h1 is not None and h1 > 0 and h2 > 0)}
        zeile["reif"] = all(v["genug"] for v in zeile.values() if isinstance(v, dict))
        zeile["besteht"] = all(v["besteht"] for v in zeile.values() if isinstance(v, dict))
        je[k] = zeile
        if zeile["reif"]:
            reif.append(k)
        if zeile["besteht"]:
            bestanden.append(k)
    if bestanden:
        u = "bestanden"
        text = ("bestanden für k = " + ", ".join(_de(k) for k in bestanden) + ": höchstens Kandidat für mehr Beobachtung — Zufall bei 4 Stufen × 2 Märkten bleibt möglich; "
                "nie Echtgeld, nie automatisch ein Testnetz-Auftrag")
    elif reif:
        u = "durchgefallen"
        text = "durchgefallen — wie der Prüfstand es erwarten liess"
    else:
        u = "zu wenig Daten"
        text = (f"zu wenig Daten (nötig: {URTEIL_TAGE_MIN} Tage und {URTEIL_TRADES_MIN} Trades je Markt; bisher {_de(tage)} Tage). "
                "Der Prüfstand sagt: durchfallen")
    return {"urteil": u, "tage": round(tage, 2), "je_stufe": {str(k): v for k, v in je.items()}, "text": text}


def _buch(buch, sym, k):
    return ((buch["maerkte"].get(sym) or {}).get("buecher") or {}).get(str(k))


def tabelle(buch):
    """Zeilen für die Anzeige: [{markt, k, n, treffer, brutto_bp, netto_bp, kosten_bp, summe_pct, erw_brutto, erw_netto, je_tag, offen}]."""
    zeilen = []
    for sym in MAERKTE:
        for k in STUFEN:
            b = _buch(buch, sym, k)
            kz = kennzahlen(b) if b else {"n": 0}
            erw = ERWARTUNG[(sym, k)]
            z = {"markt": kurz(sym), "k": k, "n": kz["n"], "erw_brutto_bp": erw[0], "erw_netto_bp": erw[1], "erw_je_tag": round(erw[2] / PRUEF_TAGE, 1),
                 "offen": bool(b and b["pos"]), "kostendiagnose": kosten_diagnose(b)}
            if kz["n"]:
                z.update({"treffer": kz["treffer"], "brutto_bp": kz["brutto_bp"], "netto_bp": kz["netto_bp"],
                          "kosten_bp": round(kz["netto_bp"] - kz["brutto_bp"], 3), "summe_pct": kz["summe_pct"], "einbruch_pct": kz["einbruch_pct"],
                          "dauer_min": kz["dauer_min"], "nachgerechnet": b["n_nach"]})
            zeilen.append(z)
    return zeilen


def kostenbericht(buch, hinweis=""):
    """Reiner Offline-Bericht über alle acht festgelegten Varianten, kein Gewinner-Ranking."""
    payload = json.dumps(buch, ensure_ascii=False, sort_keys=True, allow_nan=False).encode("utf-8")
    return {"status": "PAPIER, KEINE HANDELSFREIGABE", "handelsfreigabe": False,
            "buchinhalt_sha256": hashlib.sha256(payload).hexdigest(),
            "code_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "letzter_lauf": buch.get("letzter_lauf"), "hinweis": hinweis,
            "kostenmodell": {"gebuehren": dict(GEBUEHR), "maerkte": {sym: dict(par) for sym, par in MAERKTE.items()},
                              "quelle": "Vorab festgelegte Modellannahmen, keine aktuell gemessenen Kontogebühren",
                              "nicht_erfasst": ["Funding", "Orderbuch-Warteschlange und Teilfüllungen", "Unterschied zwischen Spot- und Futures-Kursen"]},
            "urteil": urteil(buch), "varianten": tabelle(buch),
            "grenze": "Beobachtete Papierergebnisse, keine zukünftige Renditeprognose. Günstigere Gebühren ändern weder Treffer noch Füllwahrscheinlichkeit automatisch."}


def status_text(buch, jetzt_ms=None):
    zeilen = tabelle(buch)
    u = urteil(buch)
    kopf = "Scalping-Labor — Papier, Minutenkurse, Gebühren und Schlupf (kein Geld im Spiel)"
    daten = buch.get("daten_ab")
    if daten is None or not any(z["n"] for z in zeilen) and not any(m.get("letzte_kerze") for m in buch["maerkte"].values()):
        return kopf + "\nNoch kein Lauf. Start: python3 tools/trading/krypto_bot/scalping_labor.py --einmal"
    letzte = [m["letzte_kerze"] for m in buch["maerkte"].values() if m.get("letzte_kerze")]
    zeit = f"Daten seit {_kurz_zeit(daten)} ({_de(u['tage'])} Tage; die ersten {RUECKRECHNUNG_MIN // 60} Std. nachgerechnet), letzte Kerze {_kurz_zeit(min(letzte))}" if letzte else ""
    out = [kopf, zeit, "", "Markt   k     Trades  Treffer  Brutto    Netto    Summe      | Prüfstand netto"]
    for z in zeilen:
        if z["n"]:
            out.append(f"{z['markt']:<6} {_de(z['k']):>4}  {z['n']:>7}  {_de(100 * z['treffer'], 0):>5} %  {_de(z['brutto_bp'], 1, True):>6} bp {_de(z['netto_bp'], 1, True):>6} bp "
                       f"{_de(z['summe_pct'], 1, True):>7} %   | {_de(z['erw_netto_bp'], 1, True)} bp")
        else:
            out.append(f"{z['markt']:<6} {_de(z['k']):>4}  {0:>7}  noch nichts{'':<24}| {_de(z['erw_netto_bp'], 1, True)} bp")
    mit = [z for z in zeilen if z["n"]]
    if mit:
        kosten = sum(z["kosten_bp"] * z["n"] for z in mit) / sum(z["n"] for z in mit)
        out += ["", f"Kosten je Trade (Gebühren + Schlupf): im Mittel {_de(abs(kosten))} bp. Brutto = Kursbewegung allein, Netto = was bleibt.",
                "Summe = Summe aller Trade-Renditen ohne Hebel (kein Zinseszins), NICHT der Verlust des Kontos."]
        z0 = max(mit, key=lambda z: z["n"])
        br, ko = round(z0["brutto_bp"] * z0["n"] / 10), round(z0["kosten_bp"] * z0["n"] / 10)    # bp × Trades / 10 = USDT bei 1000 USDT je Trade
        out.append(f"Zum Greifen ({z0['markt']} k={_de(z0['k'])}, {z0['n']} Trades, 1000 USDT je Trade): Kursbewegung {_de(br, 0, True)} USDT, Gebühren und Schlupf "
                   f"{_de(ko, 0, True)} USDT, bleibt {_de(br + ko, 0, True)} USDT. Der Prüfstand sah rund {_de(z0['erw_je_tag'], 0)} Trades je Tag.")
    out += ["", "Urteil (vorab festgelegt): " + u["text"],
            "Bestanden nur bei ≥ +1 bp netto je Trade in beiden Hälften, ≥ 200 Trades, ≥ 14 Tage, auf BTC UND ETH mit demselben k.",
            "Papier-Handel, Kerzen vom Binance-Spot-Spiegel (Prüfstand: Futures-Kerzen), kein Funding. Keine Anlageberatung."]
    lauf_ = buch.get("letzter_lauf") or {}
    if lauf_.get("hinweise"):
        out += ["", "Hinweise: " + " · ".join(lauf_["hinweise"])]
    return "\n".join(x for x in out if x is not None)


def zusammenfassung(buch):
    """Kurztext fürs Handy: die geschäftigste und die am wenigsten schlechte Stufe je Markt, das Urteil."""
    zeilen = tabelle(buch)
    u = urteil(buch)
    kopf = "📊 Scalping-Labor (Papier, echte Kurse, mit Gebühren)"
    mit = [z for z in zeilen if z["n"]]
    if not mit:
        return kopf + "\nNoch keine Trades gerechnet.\nKein Geld im Spiel. Keine Anlageberatung."
    out = [kopf, f"Seit {_de(u['tage'])} Tagen ({max(z['n'] for z in mit)} Trades im geschäftigsten Buch):"]
    for markt in ("BTC", "ETH"):
        je = [z for z in mit if z["markt"] == markt]
        if not je:
            continue
        viel, wenig = max(je, key=lambda z: z["n"]), max(je, key=lambda z: z["netto_bp"])
        out.append(f"{markt} k{_de(viel['k'])}: {viel['n']} Trades, netto {_de(viel['netto_bp'], 1, True)} bp je Trade ({_de(viel['summe_pct'], 1, True)} % gesamt)")
        if wenig is not viel:
            out.append(f"{markt} k{_de(wenig['k'])}: {wenig['n']} Trades, netto {_de(wenig['netto_bp'], 1, True)} bp (Prüfstand {_de(wenig['erw_netto_bp'], 1, True)})")
    out += ["Urteil: " + u["urteil"] + " — der Prüfstand erwartet «durchgefallen».", "Kein Geld im Spiel. Keine Anlageberatung."]
    return "\n".join(out)


def ampel(buch, jetzt_ms=None, env=None, aus_datei=None):
    """Für die Gesundheits-Ampel des Cockpits: (ok, text, warnung) wie satellit.ampel. ok None = grau (aus, noch nie gelaufen), False = rot (steht still),
    True = grün; ok None mit warnung True = gelb (Hinweis im letzten Lauf, z. B. Netz weg: der nächste Lauf holt es nach)."""
    e = einstellung(env, aus_datei)
    if e["aus"]:
        return None, f"aus ({e['grund']})", False
    lauf_ = (buch or {}).get("letzter_lauf")
    if not lauf_:
        return None, "noch kein Lauf (Papier)", False
    jetzt = int(time.time() * 1000) if jetzt_ms is None else int(jetzt_ms)
    try:
        alter_h = (jetzt - int(datetime.fromisoformat(lauf_["zeit"]).timestamp() * 1000)) / 3_600_000
    except (KeyError, TypeError, ValueError):
        return None, "Zeit des letzten Laufs unlesbar", True
    if alter_h > 36:
        return False, f"letzter Lauf vor {alter_h:.0f} Stunden", False
    if lauf_.get("hinweise"):
        return None, lauf_["hinweise"][0][:80], True
    return True, f"Papier, {urteil(buch)['urteil']}", False


def cockpit_daten(buch):
    """Alles, was eine Anzeige braucht (Tabelle, Urteil, letzte Trades der geschäftigsten Bücher)."""
    letzte = []
    for sym in MAERKTE:
        for k in STUFEN:
            b = _buch(buch, sym, k)
            for z in (b["letzte"][-10:] if b else []):
                letzte.append({"markt": kurz(sym), "k": k, "t_ein": z[0], "t_aus": z[1], "richtung": z[2], "ein": z[3], "aus": z[4], "art": z[5], "netto_bp": z[6]})
    letzte.sort(key=lambda z: z["t_aus"], reverse=True)
    return {"zeilen": tabelle(buch), "urteil": urteil(buch), "letzter_lauf": buch.get("letzter_lauf"), "letzte_trades": letzte[:20],
            "daten_ab": buch.get("daten_ab"), "start": buch.get("start")}


# ───────────────────────── Aufruf ─────────────────────────
def einmal(hole=None, datei=None, jetzt_ms=None, push=False, sender=None, env=None, aus_datei=None, stop=None, pause=None, sperr_datei=None):
    """Ein Durchgang: prüfen, sperren, lesen, nachrechnen, schreiben, (Handy). → (rc, Text). rc 0 ok (auch «keine Verbindung»: es wird nachgeholt); ein Absturz
    kommt als Ausnahme heraus (main macht daraus rc 1)."""
    e = einstellung(env, aus_datei, stop, pause)
    if e["aus"]:
        return 0, f"Scalping-Labor rechnet nicht: {e['grund']}. Es holt später alles nach."
    try:
        with sperre(sperr_datei):
            buch, hinweis = lesen(datei, jetzt_ms)
            hole = hole or standard_hole()
            erg = lauf(buch, hole, jetzt_ms)
            if hinweis:                                           # ein Buch-Problem steht auch im Lauf-Eintrag (Cockpit-Ampel), nicht nur in der Ausgabe
                buch["letzter_lauf"]["hinweise"] = [hinweis] + buch["letzter_lauf"]["hinweise"]
            tag = _tag(int(jetzt_ms) if jetzt_ms is not None else int(time.time() * 1000))
            gepusht = ""
            if push and buch.get("push_tag") != tag:
                try:
                    if sender is None:
                        sys.path.insert(0, str(KI_BOT))
                        import signale as SG
                        sender = SG.push
                    if sender(zusammenfassung(buch)):
                        buch["push_tag"] = tag
                        gepusht = " · Zusammenfassung aufs Handy gesendet"
                except Exception as ex:  # noqa: BLE001 — eine Meldung, die nicht rausgeht, bricht den Lauf nie ab
                    gepusht = f" · Handy-Meldung nicht gesendet ({type(ex).__name__})"
            schreiben(buch, datei)
    except Besetzt as ex:
        return 0, str(ex) + " Dieser Lauf wurde übersprungen."
    n_k, n_t = sum(erg["kerzen"].values()), sum(erg["trades"].values())
    text = f"Scalping-Labor: {n_k} neue Kerzen, {n_t} neue Trades{gepusht}"
    if hinweis:
        text += "\n" + hinweis
    if erg["hinweise"]:
        text += "\n" + " · ".join(erg["hinweise"])
    return 0, text


def dauer(sekunden=60, hole=None, schlafen=time.sleep, max_runden=None, **kw):
    """Fenster offen lassen: jede Minute einmal(); Ende mit Strg+C, Not-Aus oder Pause."""
    runde = 0
    while True:
        rc, text = einmal(hole=hole, **kw)
        print(f"[{_kurz_zeit(int(time.time() * 1000))}] {text}", flush=True)
        runde += 1
        if (max_runden is not None and runde >= max_runden) or einstellung(kw.get("env"), kw.get("aus_datei"), kw.get("stop"), kw.get("pause"))["aus"]:
            return rc
        try:
            schlafen(max(30, sekunden))
        except KeyboardInterrupt:
            return rc


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--einmal", action="store_true", help="neue Kerzen holen und nachrechnen")
    ap.add_argument("--dauer", action="store_true", help="jede Minute nachrechnen, bis Strg+C")
    ap.add_argument("--push", action="store_true", help="die Tageszusammenfassung aufs Handy (einmal pro Tag)")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--kostencheck", action="store_true", help="gespeicherte Papierergebnisse ohne Netz und Schreibzugriffe als JSON prüfen")
    ap.add_argument("--sekunden", type=int, default=60)
    a = ap.parse_args(argv)
    if a.kostencheck and (a.einmal or a.dauer or a.push):
        ap.error("--kostencheck ist nur lesend; nicht mit --einmal, --dauer oder --push kombinieren")
    for strom in (sys.stdout, sys.stderr):                      # die Windows-Konsole (cp1252/cp850) kennt «−» und Emojis nicht: ersetzen statt abstürzen
        try:
            strom.reconfigure(errors="replace")
        except Exception:  # noqa: BLE001 — kein echter Textstrom (z. B. Umleitung in einen Test)
            pass
    if a.kostencheck:
        buch, hinweis = lesen(beiseite=False)
        print(json.dumps(kostenbericht(buch, hinweis), ensure_ascii=False, indent=2, allow_nan=False))
        return 1 if hinweis else 0
    if a.dauer:
        try:
            return dauer(a.sekunden, push=a.push)
        except KeyboardInterrupt:
            return 0
    if a.einmal:
        try:
            rc, text = einmal(push=a.push)
        except Exception as ex:  # noqa: BLE001 — ein Fehler im Papier-Labor darf nie etwas anderes aufhalten
            print(f"Scalping-Labor abgestürzt: {type(ex).__name__}: {ex}")
            return 1
        print(text)
        return rc
    buch, hinweis = lesen()
    print(status_text(buch) + (("\n" + hinweis) if hinweis else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
