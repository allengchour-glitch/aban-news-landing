#!/usr/bin/env python3
"""hype_wache.py — eine Ampelzeile «HYPE: …» für den Aufseher (19.10.2026, Spähtrupp wf_62fc1cba, Befund HYPE-1). Nur lesend, kein Netz.

WARUM: Der Dauerauftrag «immer über neue Hype-Produkte informieren, Startseite frisch halten» hing an Handarbeit. Der tägliche Aufseher-Lauf
(fixer_keepalive.sh, NUR_RAEUMEN=1) räumt nach 21 Tagen ab, nimmt aber nie auf — GEMESSEN 19.10.: Aufnahmetage 03.09., 14.09., 18.09., 23.09., 07.10.,
10.10., 13.10. (Lücken von 11 und 14 Tagen); ohne Neuaufnahme wäre die Reihe ab 29.10. leergelaufen (26, dann 12, am 04.11. 0 Produkte), und die Startseiten-
Sektion pl_trends zeigt nur die jüngsten 8. Niemand wurde erinnert (`grep hype betreiber_ampel.py` = 0 Treffer).

WAS: aus dem Aufnahme-Ledger dropship/_hype_verlauf.txt (Spalten: Datum, Thema, Produkt-ID, Titel) und dem Datum «Web-Recherche TT.MM.JJJJ» in QUELLE
(automation/hype_kuratieren.py, erstes Vorkommen):
  Reihe n         = Produkte mit Aufnahme in den letzten HYPE_TAGE (21) Tagen (Schätzung aus dem Ledger; live zählt das Skript selbst)
  jüngste Aufnahme vor x T
  Front-8 läuft in y T aus = Ablauf der jüngsten Charge (die Startseite zeigt die 8 jüngsten)
  QUELLE vor z T = Alter der letzten Web-Recherche
⚠️ bei: Reihe < 24, Front läuft in ≤ 5 T aus, QUELLE älter als 7 T oder jüngste Aufnahme älter als 7 T.
Dann: Recherche aktualisieren (QUELLE + THEMEN), `VORSCHLAG=1 python3 automation/hype_kuratieren.py` (liest nur, schreibt Kontaktbogen), Bogen ansehen,
schwache Bilder mit «hype-bild-schwach» markieren, dann scharf.

  python3 automation/hype_wache.py              # eine Zeile
  python3 automation/hype_wache.py --selbsttest
"""
import datetime as dt
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_hype_verlauf.txt")
SKRIPT = os.path.join(REPO, "automation", "hype_kuratieren.py")
HYPE_TAGE = 21
MIN_REIHE, FRONT_WARN_T, ALTER_WARN_T = 24, 5, 7


def lies_ledger(pfad=LEDGER):
    """→ [(date, id)] — unlesbare Zeilen werden gezählt, nie still verschluckt."""
    out, kaputt = [], 0
    try:
        for z in open(pfad, encoding="utf-8"):
            c = z.rstrip("\n").split("\t")
            if len(c) < 3:
                continue
            try:
                out.append((dt.date.fromisoformat(c[0].strip()), c[2].strip()))
            except ValueError:
                kaputt += 1
    except OSError:
        return None, 0
    return out, kaputt


def quelle_datum(pfad=SKRIPT):
    try:
        m = re.search(r"Web-Recherche (\d\d)\.(\d\d)\.(\d{4})", open(pfad, encoding="utf-8").read())
        return dt.date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None
    except (OSError, ValueError):
        return None


def zeile(heute, eintraege, quelle):
    if not eintraege:
        return "HYPE: unklar (Aufnahme-Ledger nicht lesbar)"
    ids_aktiv = {i for d, i in eintraege if (heute - d).days < HYPE_TAGE}
    juengste = max(d for d, _ in eintraege)
    seit = (heute - juengste).days
    front = (juengste + dt.timedelta(days=HYPE_TAGE) - heute).days
    q_alter = (heute - quelle).days if quelle else None
    teile = [f"Reihe {len(ids_aktiv)}", f"jüngste Aufnahme vor {seit} T", f"Front-8 läuft in {max(front, 0)} T aus",
             f"QUELLE vor {q_alter} T" if q_alter is not None else "QUELLE-Datum unlesbar"]
    warn = len(ids_aktiv) < MIN_REIHE or front <= FRONT_WARN_T or seit > ALTER_WARN_T or q_alter is None or q_alter > ALTER_WARN_T
    hinweis = " → Recherche + VORSCHLAG=1 python3 automation/hype_kuratieren.py, Bogen ansehen, dann scharf" if warn else ""
    return ("⚠️ " if warn else "") + "HYPE: " + " · ".join(teile) + hinweis


def selbsttest():
    h = dt.date(2026, 10, 19)
    led = lambda *tage: [(h - dt.timedelta(days=t), f"p{n}") for n, t in enumerate(tage)]
    fehler = []

    def pr(name, ist, soll_enthaelt, warn):
        if (soll_enthaelt not in ist) or (ist.startswith("⚠️") != warn):
            fehler.append(f"{name}: «{ist}»")
    pr("frisch", zeile(h, led(*([0] * 30)), h), "Reihe 30", False)
    pr("frisch: Front 21 T", zeile(h, led(*([0] * 30)), h), "Front-8 läuft in 21 T", False)
    pr("Front läuft bald aus", zeile(h, led(*([17] * 30)), h), "Front-8 läuft in 4 T", True)
    pr("zu klein", zeile(h, led(*([1] * 10)), h), "Reihe 10", True)
    pr("QUELLE alt", zeile(h, led(*([1] * 30)), h - dt.timedelta(days=9)), "QUELLE vor 9 T", True)
    pr("lange keine Aufnahme", zeile(h, led(*([9] * 30)), h), "jüngste Aufnahme vor 9 T", True)
    pr("abgelaufene zählen nicht", zeile(h, led(*([1] * 30 + [30] * 40)), h), "Reihe 30", False)
    pr("Ledger fehlt", zeile(h, None, h) if False else zeile(h, [], h), "unklar", False)
    pr("QUELLE unlesbar", zeile(h, led(*([0] * 30)), None), "QUELLE-Datum unlesbar", True)
    d = quelle_datum()
    if d is None or d > dt.date.today():
        fehler.append(f"QUELLE-Datum im Skript nicht lesbar/zukünftig: {d}")
    print(f"hype_wache Selbsttest: {10 - len(fehler)}/10")
    for f in fehler:
        print("  FAIL", f)
    return not fehler


def main():
    if "--selbsttest" in sys.argv:
        return 0 if selbsttest() else 1
    eintraege, _ = lies_ledger()
    print(zeile(dt.date.today(), eintraege, quelle_datum()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
