"""Deine eigene Regel — Vorlage für den Strategie-Prüfstand.

So funktioniert es:
  - `kurse` ist die Liste der Schlusskurse BIS EINSCHLIESSLICH heute (kurse[-1] = heute).
    Zukünftige Kurse bekommst du gar nicht erst zu sehen — die Regel kann nicht schummeln.
  - `i` ist die Nummer des heutigen Tages (0 = erster Tag).
  - Gib 1 zurück für „investiert", 0 für „Cash". Gehandelt wird erst am nächsten Tag.

Test:  python3 pruefstand.py --symbol ^GSPC --regel meine_regel.py

Unten stehen drei Beispiele. Aktiv ist nur die Funktion `regel` — ändere sie oder kopiere
ein Beispiel hinein. Tipp: Teste JEDE Idee auch mit --demo. Wenn sie auf reinem Zufall
ähnlich gut aussieht, hast du nichts gefunden.
"""

NAME = "Meine Regel: Kurs über 100-Tage-Schnitt"


def regel(kurse, i):
    if len(kurse) < 100:
        return 0
    schnitt = sum(kurse[-100:]) / 100
    return 1 if kurse[-1] > schnitt else 0


# ───────────── Beispiele zum Kopieren ─────────────

def beispiel_zwei_schnitte(kurse, i):
    """Investiert, wenn der 20-Tage-Schnitt über dem 100-Tage-Schnitt liegt."""
    if len(kurse) < 100:
        return 0
    return 1 if sum(kurse[-20:]) / 20 > sum(kurse[-100:]) / 100 else 0


def beispiel_rueckschlag(kurse, i):
    """Kauft nach einem Minus von mehr als 3 % gegenüber dem 10-Tage-Hoch."""
    if len(kurse) < 10:
        return 0
    return 1 if kurse[-1] < max(kurse[-10:]) * 0.97 else 0


def beispiel_wochentag_ohne_datum(kurse, i):
    """Absichtlich sinnlos: investiert an jedem zweiten Tag. Sollte um 50 % Skill landen —
    wenn nicht, hat der Zufall mitgespielt. Gut, um ein Gefühl für die Streuung zu bekommen."""
    return i % 2
