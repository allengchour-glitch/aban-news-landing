#!/usr/bin/env python3
"""Mutationsprobe für den Gesundheits-Abschnitt in tools/trading/schatten/wochenbericht.py: jede Änderung muss test_wochenbericht.py rot machen.
Aufruf: python3 -I mutationsprobe_wb.py <Repo-Ordner>. Schreibt nur in einen Temp-Baum (mit Verweis auf krypto_bot, weil der Bericht das Labor von dort lädt)."""
import os, shutil, subprocess, sys, tempfile

repo = sys.argv[1]
quelle = os.path.join(repo, "tools/trading/schatten/wochenbericht.py")
test = os.path.join(repo, "tools/trading/schatten/test_wochenbericht.py")
orig = open(quelle, encoding="utf-8").read()

# (Name, altes Stück, neues Stück, gleichwertig?)  gleichwertig=True: darf überleben, Grund steht im Namen
M = [
    ("M01 letzter fehlender Tag fehlt (Off-by-one)", "range(1, (b - a).days)", "range(1, (b - a).days - 1)", False),
    ("M02 der Vortag zählt als fehlend", "range(1, (b - a).days)", "range(0, (b - a).days)", False),
    ("M03 Lücken aus unsortierten Tagen gerechnet", "einmal = sorted(set(ds))", "einmal = ds", False),
    ("M04 Reihenfolge wird nie gemeldet", "if ds != sorted(ds):", "if False:", False),
    ("M05 doppelt erst ab drei Einträgen", "ds.count(d) > 1})", "ds.count(d) > 2})", False),
    ("M06 unlesbare Daten werden nie gemeldet", "if len(ds) < len(staende):", "if False:", False),
    ("M07 «1 Eintrag» immer als Mehrzahl", '("1 Eintrag" if n == 1 else f"{n} Einträge")', '(f"{n} Einträge")', False),
    ("M08 «1 Tag fehlt» immer als Mehrzahl", '("1 Tag fehlt" if len(fehlend) == 1 else f"{len(fehlend)} Tage fehlen")', '(f"{len(fehlend)} Tage fehlen")', False),
    ("M09 «…» schon bei genau fünf", '(", …" if len(werte) > MAX_NENNEN else "")', '(", …" if len(werte) >= MAX_NENNEN else "")', False),
    ("M10 alle Tage genannt, nie gekürzt", '", ".join(werte[:MAX_NENNEN])', '", ".join(werte)', False),
    ("M11 sechs statt fünf genannt", "MAX_NENNEN = 5 ", "MAX_NENNEN = 6 ", False),
    ("M12 drei Tage Alter erlaubt", "MAX_ALTER_TAGE = 2 ", "MAX_ALTER_TAGE = 3 ", False),
    ("M13 schon zwei Tage Alter ist ein Befund", "if tage > MAX_ALTER_TAGE:", "if tage >= MAX_ALTER_TAGE:", False),
    ("M14 ältester statt jüngster Tag zählt", "tage = (heute - max(ds)).days", "tage = (heute - min(ds)).days", False),
    ("M15 72 statt 48 Stunden Labor-Frist", "MAX_ALTER_LABOR_STUNDEN = 48 ", "MAX_ALTER_LABOR_STUNDEN = 72 ", False),
    ("M16 genau 48 Stunden ist schon ein Befund", "> MAX_ALTER_LABOR_STUNDEN:", ">= MAX_ALTER_LABOR_STUNDEN:", False),
    ("M17 «Z»-Endung nicht ersetzt (ab Python 3.11 gleichwertig)", '.replace("Z", "+00:00")', "", True),
    ("M18 Labor-Zeit nicht nach UTC umgerechnet (Ausgabe)", ".astimezone(timezone.utc)", "", False),
    ("M19 fehlender Labor-Zeitstempel wird verschwiegen", 'funde.append("Labor: Zeitstempel des letzten Laufs fehlt oder ist unlesbar")', "pass", False),
    ("M20 vier statt drei Labor-Hinweise", "(hinweise[:3] if isinstance(hinweise, list) else [])", "(hinweise[:4] if isinstance(hinweise, list) else [])", False),
    ("M21 Hinweise, die keine Liste sind, werden zerlegt", "(hinweise[:3] if isinstance(hinweise, list) else [])", "(hinweise[:3] if hinweise else [])", False),
    ("M22 fehlende_coins ohne Listenprüfung", "if isinstance(f, list) and f:", "if f:", False),
    ("M23 «1 Coin» immer als Mehrzahl", '("Coin" if len(f) == 1 else "Coins")', '"Coins"', False),
    ("M24 «Jetzt» ohne Zeitzone nicht ergänzt", "jetzt = jetzt if jetzt.tzinfo else jetzt.replace(tzinfo=timezone.utc)", "jetzt = jetzt", False),
    ("M25 leere Reihen werden nicht aussortiert", '_felder(sb, "tage", "tag"))) if r]', '_felder(sb, "tage", "tag")))]', False),
    ("M26 Labor wird nie geprüft", "funde += satellit_pruefen(sb) + labor_pruefen(lab, jetzt)", "funde += satellit_pruefen(sb)", False),
    ("M27 Satellit-Kurse werden nie geprüft", "funde += satellit_pruefen(sb) + labor_pruefen(lab, jetzt)", "funde += labor_pruefen(lab, jetzt)", False),
    ("M28 Frische der Reihen wird nie geprüft", "funde += reihe_pruefen(name, r) + alter_pruefen(name, r, jetzt.date())", "funde += reihe_pruefen(name, r)", False),
    ("M29 Lücken der Reihen werden nie geprüft", "funde += reihe_pruefen(name, r) + alter_pruefen(name, r, jetzt.date())", "funde += alter_pruefen(name, r, jetzt.date())", False),
    ("M30 Abschnitt hängt nicht am Bericht", "md += gesundheit_abschnitt(lb, sb, lab, jetzt)", "md += []", False),
    ("M31 abschnitt() reicht «Jetzt» nicht durch", "md += gesundheit_abschnitt(lb, sb, lab, jetzt)", "md += gesundheit_abschnitt(lb, sb, lab)", False),
    ("M32 schreiben() reicht «Jetzt» nicht durch", "stand, md = abschnitt(lb, sb, lab, jetzt)", "stand, md = abschnitt(lb, sb, lab)", False),
    ("M33 Zeitstempel mit Uhrzeit nicht lesbar", "return date.fromisoformat(str(s)[:10])", "return date.fromisoformat(str(s)[:19])", False),
    ("M34 Einträge ohne Objekt werfen einen Fehler", "x.get(feld) if isinstance(x, dict) else None", "x.get(feld) if True else None", False),
    ("M35 Auffang-Satz kann nie greifen", "except Exception:  # noqa: BLE001 — ein kaputtes Buch darf den Bericht nie verhindern", "except ZeroDivisionError:  # noqa: BLE001", False),
    ("M36 Überschrift umbenannt", '"### Gesundheit der Messreihen"', '"### Gesundheit"', False),
    ("M37 Erfolgssatz verkürzt", '"Alle Messreihen lückenlos und aktuell: "', '"Alle Messreihen lückenlos: "', False),
    ("M38 ohne Reihe trotzdem «alles in Ordnung»", '        if not teile:\n            return kopf + ["Keine Messreihe zum Prüfen."]\n', "", False),
    ("M39 Laborzeit fehlt im Erfolgssatz", 'teile.append(f"Labor zuletzt {z:%Y-%m-%d %H:%M} UTC")', "pass", False),
    ("M40 Satellit liest das falsche Datumsfeld", '_felder(sb, "tage", "tag")', '_felder(sb, "tage", "stand")', False),
    ("M41 Pilot 2.0 liest die Pilot-Reihe", '_felder(lb, "tage_p2", "stand")', '_felder(lb, "tage", "stand")', False),
    ("M42 Aufzählungszeichen fehlt", '[f"- {f}" for f in funde]', "[f'{f}' for f in funde]", False),
    ("M43 Hinweis auf verzerrte Kennzahlen fehlt", "fehlende Tage verzerren Rendite und Einbruch", "x", False),
    ("M44 Hinweis kommt vor dem Labor-Abschnitt", "    md += labor_abschnitt(lab)\n    md += gesundheit_abschnitt(lb, sb, lab, jetzt)\n", "    md += gesundheit_abschnitt(lb, sb, lab, jetzt)\n    md += labor_abschnitt(lab)\n", False),
]


def lauf(text):
    d = tempfile.mkdtemp(prefix="mutwb_")
    try:
        ordner = os.path.join(d, "tools", "trading", "schatten")
        os.makedirs(ordner)
        os.symlink(os.path.join(repo, "tools/trading/krypto_bot"), os.path.join(d, "tools", "trading", "krypto_bot"))
        pfad = os.path.join(ordner, "wochenbericht.py")
        open(pfad, "w", encoding="utf-8").write(text)
        p = subprocess.run([sys.executable, "-I", test, pfad], capture_output=True, text=True, timeout=180)
        return p.returncode, p.stdout + p.stderr
    finally:
        shutil.rmtree(d, ignore_errors=True)


rc, out = lauf(orig)
print("Ausgangslage:", "grün" if rc == 0 else "ROT (Probe ungültig!)", "|", out.strip().splitlines()[-1] if out.strip() else "")
if rc != 0:
    print(out[-1500:]); sys.exit(2)
erkannt = nicht_anwendbar = 0
durchgerutscht, gleichwertig = [], []
for name, alt, neu, gl in M:
    if orig.count(alt) != 1:
        print(f"  ?  {name}: Muster kommt {orig.count(alt)}x vor (nicht anwendbar)"); nicht_anwendbar += 1; continue
    rc, out = lauf(orig.replace(alt, neu, 1))
    if rc != 0:
        erkannt += 1; print(f"  ok {name}")
    elif gl:
        gleichwertig.append(name); print(f"  =  {name}: überlebt (gleichwertig, erwartet)")
    else:
        durchgerutscht.append(name); print(f"  !! {name}: DURCHGERUTSCHT")
print(f"\n{erkannt} von {len(M)} erkannt, {len(gleichwertig)} gleichwertig, {nicht_anwendbar} nicht anwendbar, {len(durchgerutscht)} durchgerutscht")
sys.exit(1 if durchgerutscht or nicht_anwendbar else 0)
