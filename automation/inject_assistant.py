#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""automation/inject_assistant.py — STILLGELEGT (2026-09-02).

Der „Frag aban"-Assistent (/js/assistant.js) wurde auf Wunsch des Users von allen
Seiten entfernt: „mach die Webseite besser, ohne die Chatfenster und so, alles
eleganter". Gemessen auf der Startseite (mobil, nach dem Scrollen): vier fixierte
Schichten uebereinander — Sprach-Banner 98 px, Mobile-CTA 79 px, Abo-Leiste 52 px und
die Assistenten-Blase — zusammen rund 270 px eines 844-px-Schirms.

Dieses Skript hatte die Einbindung in 53 Seiten eingehaengt; ausserdem stand die
Zeile in sechs Generator-Vorlagen (build_markets_detail, generate_sichtbarkeit_
branchen, generate_compliance_pakete, generate_schnellstart, generate_ki_audit).
Alle drei Orte sind bereinigt. Damit ein Aufruf aus alter Gewohnheit den Assistenten
nicht zurueckbringt, tut dieses Skript jetzt NICHTS mehr — es sagt nur, warum.

    python3 automation/inject_assistant.py   -> Hinweis, kein Eingriff
"""
import sys
print("inject_assistant.py ist stillgelegt: der Assistent wurde 2026-09-02 auf Wunsch "
      "entfernt (siehe Dateikopf). Nichts geaendert.")
sys.exit(0)
