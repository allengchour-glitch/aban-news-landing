---
tags: [falle, teuer-gelernt]
quelle: Metricool 7-Tage-Vorlauf 18.10.2026 (dropship/METRICOOL-VORLAUF-2026-10-18.md)
gelernt: 2026-10-18
---
# Vorausplanung: Hand-Poster neben Treiber = Doppelpost; Prüfer mit Löschrecht braucht Massen-Schwelle

Ein manuell gestarteter Poster lief neben dem Treiber-Slot und wählte dasselbe Reel (Kandidat vor dem Lock gewählt, Queue nach dem Lock nicht neu gelesen) → Doppelpost. Regel: Poster nie von Hand starten, solange der Autopilot läuft; nach postLock() Queue+Ledger frisch prüfen. Ein Prüfer, der Posts löschen darf, darf Netzfehler (curl 000, 429, 5xx) nie als 'kaputt' werten und braucht eine Massen-Schwelle (max(3,10 %) → nichts löschen). Notbremse/STOPP muss auch auf beim Anbieter liegende Vorausplanung wirken. Zustandsdatei bei JSON-Fehler nie still als leer behandeln. Ledger-Schlüssel (slug:) sind keine Shop-Handles.

Verwandt: [[Hypothese-mit-Datum]]
