#!/usr/bin/env python3
"""Meldet ABSTUERZE der Dauerlaeufer — und sonst NICHTS.

Warum es das gibt (09.09.2026): Eine Zuweisung an ein `const` hat die zwei
Haupt-Importer 6,5 Stunden lang bei jedem Ein-Varianten-Produkt abstuerzen
lassen. Der Traceback stand die ganze Zeit im Runner-Log; gelesen hat ihn
niemand, weil der Grind «laeuft» und die CJ-Zahl eine bequeme Erklaerung
hatte (voller Dateispeicher). Dieselbe Klasse am 03.09. (googleKategorie
is not defined) kostete 18 Tage.

Bauart nach der Hausregel «bei einem Melder liegt die Beweislast beim Alarm»:
  * Gemeldet wird nur, was seit dem LETZTEN Lauf NEU im Log steht (Byte-Cursor
    je Datei). Ein behobener Fehler verschwindet damit nach einer Runde von
    selbst — ein Dauerbefund wird nicht gelesen.
  * Ein geschrumpftes Log (Rotation/Neustart) setzt den Cursor zurueck, statt
    den Rest zu ueberspringen.
  * Fehlt eine Logdatei, ist das KEIN Befund (der Motor lief nur nie).
  * Ausgabe ist EINE Zeile oder gar nichts.
"""
import os, re, sys, json

LOGS = ["/tmp/cj_runner2.log", "/tmp/cj_runner3.log", "/tmp/cj_runner4.log",
        "/tmp/cj_runner5.log", "/tmp/cj_queue_runner.log",
        "/tmp/fixer_keepalive.log", "/tmp/social_autopilot.log"]
CURSOR = os.environ.get("CURSOR", "/tmp/_motor_ampel_cursor.json")

# Nur harte Abstuerze. KEIN generisches "Error" — das steht in jedem zweiten
# Retry-Log und waere ein Fehlalarm-Generator.
FATAL = re.compile(
    r"^(?:\w*(?:TypeError|ReferenceError|SyntaxError|RangeError)"
    r"|Traceback \(most recent call last\)"
    r"|Error: Cannot find module"
    r"|\w*Error: .*is not a function)", re.M)
# Fundstelle. ZWEI Schreibweisen, und die zweite hat mich beim Testen erwischt:
# Node schreibt «datei.mjs:831», Python schreibt «File "foo.py", line 42» — OHNE
# Doppelpunkt. Ein Muster, das nur die eine Form kennt, meldet die andere als «?».
STELLE = re.compile(
    r"([\w./-]+\.(?:mjs|js|py)):(\d+)"
    r'|File "([\w./-]+\.py)", line (\d+)')


def neue_bytes(pfad, stand):
    """Gibt (text, neuer_offset) der seit `stand` angehaengten Bytes."""
    groesse = os.path.getsize(pfad)
    if groesse < stand:          # Log wurde gekuerzt/neu angelegt
        stand = 0
    if groesse == stand:
        return "", stand
    with open(pfad, "r", errors="replace") as f:
        f.seek(stand)
        return f.read(), groesse


def main():
    try:
        cursor = json.load(open(CURSOR))
    except Exception:
        cursor = {}

    befunde = []
    for pfad in LOGS:
        if not os.path.exists(pfad):
            continue                      # nie gelaufen ist kein Befund
        try:
            text, neu = neue_bytes(pfad, cursor.get(pfad, 0))
        except OSError:
            continue
        cursor[pfad] = neu
        if not text:
            continue
        treffer = FATAL.findall(text)
        if not treffer:
            continue
        # Fundstelle: die LETZTE im neuen Text genannte Datei:Zeile — bei einem
        # Node-Absturz steht sie ueber der Ausnahme, bei einem Python-Traceback
        # darunter. Beides deckt ein Suchen von hinten ab.
        stellen = [(a or c, b or d) for a, b, c, d in STELLE.findall(text)]
        wo = f"{os.path.basename(stellen[-1][0])}:{stellen[-1][1]}" if stellen else "?"
        befunde.append(f"{os.path.basename(pfad)} {len(treffer)}× ({wo})")

    try:
        json.dump(cursor, open(CURSOR, "w"))
    except OSError:
        pass

    if befunde:
        print("⛔ MOTOR STUERZT AB: " + " · ".join(befunde))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
