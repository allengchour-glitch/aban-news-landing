---
tags: [system]
quelle: Journal 2026-09-19 · 🔁 Zwei Pfade, ein Wächter
gelernt: 2026-09-22
---
# Gegen ein Rennen hilft nur eine Sperre, keine Vorabprüfung

Vor dem Handstart von cj_verfuegbarkeit.py geprüft, ob einer läuft (leer) — eine Minute später startete der Aufseher dieselbe Arbeit als /tmp-Kopie: 415 doppelte IDs im Ledger, doppelte CJ-Punkte. Eine Prozessprüfung beantwortet nur, was in dieser Sekunde läuft. Regel: nichts von Hand starten, was der Aufseher startet; Dauerläufer bekommen flock(LOCK_EX|LOCK_NB) auf einem FESTEN Pfad (/tmp/<name>.lock, nicht aus __file__ abgeleitet, weil Repo-Fassung und /tmp-Kopie derselbe Wächter sind); der Kernel gibt die Sperre beim Prozesstod frei. Gegenprobe in beide Richtungen: zweiter Lauf abgewiesen UND nach Tod des Halters kommt der nächste durch.

Verwandt: [[Hypothese-mit-Datum]]
