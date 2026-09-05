#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prüft tools/buero.py — mit Gegenproben, nicht nur „läuft durch".

    python3 tools/test_buero.py

Jede Prüfung sichert etwas, das echtes Geld oder Recht berührt: fortlaufende
Nummern, keine MWST auf der Rechnung, keine Rechnung ohne Konto, Übernahme aus
der Offerte, Schweizer Zahlenschreibweise.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
gut = schlecht = 0


def pruef(name, bedingung, detail=""):
    global gut, schlecht
    print(("  ✓ " if bedingung else "  ✗ ") + name + (f" — {detail}" if detail and not bedingung else ""))
    if bedingung:
        gut += 1
    else:
        schlecht += 1


def lauf(*args, cwd):
    """⚠️ Die KOPIE im Testordner aufrufen, nicht das Original: buero.py leitet seinen
       Ablageort aus __file__ ab, nicht aus dem Arbeitsverzeichnis. Der erste Anlauf rief
       das Original auf — der Test schrieb damit in das echte buero/ und prüfte Dateien,
       die im Testordner nie entstanden."""
    return subprocess.run([sys.executable, os.path.join(cwd, "tools", "buero.py"), *args],
                          capture_output=True, text=True, cwd=cwd)


def main():
    # Eigene Arbeitskopie: das echte buero/ mit Kundendaten bleibt unberührt.
    tmp = tempfile.mkdtemp(prefix="buero-test-")
    os.makedirs(os.path.join(tmp, "tools"), exist_ok=True)
    shutil.copy(os.path.join(ROOT, "tools", "buero.py"), os.path.join(tmp, "tools", "buero.py"))
    os.makedirs(os.path.join(tmp, "js"), exist_ok=True)
    shutil.copy(os.path.join(ROOT, "js", "qr-rechnung.js"), os.path.join(tmp, "js", "qr-rechnung.js"))

    print("Test 1 — Offerte anlegen:")
    r = lauf("offerte", "--kunde", "Muster GmbH\\nBern", "--pos", "Audit:490", cwd=tmp)
    pruef("läuft ohne Fehler", r.returncode == 0, r.stderr[:200])
    seite = os.path.join(tmp, "buero", "2026-001-offerte.html")
    pruef("Seite entsteht", os.path.exists(seite))
    html = open(seite, encoding="utf-8").read() if os.path.exists(seite) else ""
    pruef("Betrag steht drauf", "490.00" in html)
    pruef("Offerte nennt keine Zahlungsfrist", "Zahlbar bis" not in html)

    print("\nTest 2 — Nummern laufen fortlaufend:")
    lauf("offerte", "--kunde", "Zwei AG", "--pos", "Audit:490", cwd=tmp)
    pruef("zweite Offerte bekommt 002", os.path.exists(os.path.join(tmp, "buero", "2026-002-offerte.html")))
    pruef("erste bleibt bestehen", os.path.exists(os.path.join(tmp, "buero", "2026-001-offerte.html")))

    print("\nTest 3 — Rechnung aus Offerte:")
    r = lauf("rechnung", "--aus", "2026-001", cwd=tmp)
    rech = os.path.join(tmp, "buero", "2026-001-rechnung.html")
    pruef("Rechnung entsteht", os.path.exists(rech), r.stderr[:200])
    rh = open(rech, encoding="utf-8").read() if os.path.exists(rech) else ""
    pruef("Kunde aus der Offerte übernommen", "Muster GmbH" in rh)
    pruef("Rechnungsnummer zählt eigenständig (2026-001)", "Rechnung 2026-001" in rh)
    pruef("Zahlungsfrist steht drauf", "Zahlbar bis" in rh)

    print("\nTest 4 — Recht und Geld (die teuren Fehler):")
    # ⚠️ Nicht platt nach "MWST" suchen — der Gesetzesverweis "MWSTG" im Fuss enthält das
    #    Wort und liess die Prüfung zu Unrecht rot werden. Geprüft wird, was zählt: in der
    #    Positionstabelle darf keine Steuerzeile stehen, und das Total ist die reine Summe.
    tabelle = re.search(r"<tbody>(.*?)</tbody>", rh, re.S)
    tab = tabelle.group(1) if tabelle else ""
    pruef("keine Steuerzeile in der Tabelle",
          not re.search(r"(?i)mwst|mehrwertsteuer|vat", tab),
          "Rechnung darf keine MWST zeigen, solange keine Pflicht besteht")
    pruef("Total = Summe der Posten, nichts aufgeschlagen", "490.00" in tab and tab.count("490.00") >= 2)
    pruef("MWST-Hinweis nach MWSTG steht im Fuss", "Art. 10 Abs. 2 lit. a MWSTG" in rh)
    pruef("ohne konfig.json warnt sie sichtbar", "Keine Zahlungsdaten hinterlegt" in rh)
    r2 = lauf("rechnung", "--aus", "2026-001", cwd=tmp)
    pruef("Warnung auch auf der Konsole", "Keine IBAN" in r2.stdout)

    print("\nTest 5 — mit IBAN:")
    os.makedirs(os.path.join(tmp, "buero"), exist_ok=True)
    json.dump({"kontoinhaber": "A. Muster", "iban": "CH93 0076 2011 6238 5295 7"},
              open(os.path.join(tmp, "buero", "konfig.json"), "w", encoding="utf-8"))
    lauf("rechnung", "--kunde", "Dritte AG", "--pos", "Beratung:2:290", cwd=tmp)
    r3 = open(os.path.join(tmp, "buero", "2026-003-rechnung.html"), encoding="utf-8").read()
    pruef("IBAN steht auf der Rechnung", "CH93 0076 2011 6238 5295 7" in r3)
    pruef("Menge × Preis gerechnet (2 × 290 = 580)", "580.00" in r3)
    pruef("Mitteilung = Rechnungsnummer", "2026-003" in r3)
    m3 = open(os.path.join(tmp, "buero", "2026-003-rechnung-mail.txt"), encoding="utf-8").read()
    pruef("Mailtext nennt IBAN statt Warnung", "CH93" in m3 and "IBAN fehlt" not in m3)
    pruef("Rechnung trägt einen QR-Zahlteil (Swiss QR Code + Empfangsschein)",
          "Empfangsschein" in r3 and "<svg" in r3 and "Zahlteil" in r3, "braucht node + segno")
    pruef("QR-Referenz aus der Rechnungsnummer (RF…)", re.search(r"RF\d{2} ", r3) is not None)
    pruef("Offerte hat KEINEN Zahlteil", "Empfangsschein" not in open(os.path.join(tmp, "buero", "2026-001-offerte.html"), encoding="utf-8").read())

    print("\nTest 6 — Schweizer Schreibweise und Journal:")
    lauf("rechnung", "--kunde", "Gross AG", "--pos", "Projekt:12345.5", cwd=tmp)
    r4 = open(os.path.join(tmp, "buero", "2026-004-rechnung.html"), encoding="utf-8").read()
    pruef("12'345.50 mit Hochkomma", "12'345.50" in r4, "Schweizer Tausendertrennung")
    j = json.load(open(os.path.join(tmp, "buero", "journal.json"), encoding="utf-8"))
    pruef("Journal hat alle Vorgänge", len(j["eintraege"]) == 6, str(len(j["eintraege"])))
    offen = [x for x in j["eintraege"] if x["art"] == "rechnung" and x["status"] == "offen"]
    pruef("Rechnungen starten als offen", len(offen) == 4, str(len(offen)))
    lauf("bezahlt", "--nr", "2026-003", cwd=tmp)
    j2 = json.load(open(os.path.join(tmp, "buero", "journal.json"), encoding="utf-8"))
    pruef("bezahlt-Vermerk kommt an",
          any(x["nr"] == "2026-003" and x["art"] == "rechnung" and x["status"] == "bezahlt" for x in j2["eintraege"]))

    print("\nTest 7 — Gegenproben (falsche Eingabe muss scheitern):")
    r5 = lauf("rechnung", "--aus", "2099-999", cwd=tmp)
    pruef("unbekannte Offerte → Abbruch", r5.returncode != 0 and "Keine Offerte" in (r5.stderr + r5.stdout))
    r6 = lauf("offerte", "--kunde", "X AG", "--pos", "Kaputt:abc", cwd=tmp)
    pruef("unlesbarer Preis → Abbruch", r6.returncode != 0)
    r7 = lauf("offerte", "--kunde", "X AG", cwd=tmp)
    pruef("Offerte ohne Posten → Abbruch", r7.returncode != 0)

    shutil.rmtree(tmp, ignore_errors=True)
    print("\n" + "=" * 46)
    print(f"{gut} bestanden, {schlecht} fehlgeschlagen.")
    sys.exit(1 if schlecht else 0)


if __name__ == "__main__":
    main()
