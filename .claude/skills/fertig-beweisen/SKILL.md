---
name: fertig-beweisen
description: Bevor eine mehrteilige oder lange Aufgabe als «fertig», «läuft», «erledigt» oder «behoben» gemeldet wird - und vor dem Start jeder Aufgabe mit mehreren verlangten Ergebnissen, mit Dauerläufern («läuft weiter», «startet selbst neu») oder mit Zahlen aus fremder Quelle (Merchant, Betreiber-Screenshot). Legt vorher prüfbare Tore fest und meldet erfüllt/offen/aufgegeben statt «fertig». Nicht für einen Einzeiler oder eine reine Auskunft.
---

# Fertig beweisen — Tore vor der Arbeit, Zählung vor der Meldung

Übernommen aus dem Skill «unlazy» (Leonxlnx/unlazy, gesehen im TikTok des Betreibers 25.11.2026: «Claude meldet fertig,
hat aber Stellen übersprungen»). Die Idee ist eigen nachgebaut, ohne fremde Skripte und ohne fremden Stop-Hook.
Ergänzt `messgeraet-zuerst` (WIE man misst) um WAS gemessen werden muss, bevor «fertig» gesagt wird.

## Ablauf

1. **Auftrag in Tore zerlegen, BEVOR gearbeitet wird.** Je unabhängig verlangtes Ergebnis ein Tor mit einem
   beobachtbaren Satz. Datei `dropship/tore/<aufgabe>.md` (Format im Kopf von `tools/tore.py`):
   ```
   - [ ] T1: beobachtbares Ergebnis
       PRUEFUNG: bash-Befehl, der es SELBST misst und erst nach allen Prüfungen «TOR-OK» druckt
       ERWARTET: TOR-OK
   - [ ] T2: Ergebnis, das nur ein Mensch bestätigen kann
       HAND: Betreiber-Screenshot …
   ```
2. **Arbeiten.**
3. **Vor JEDER Meldung:** Auftrag neu lesen, `python3 tools/tore.py dropship/tore/<aufgabe>.md` frisch laufen lassen
   und die Zählung melden: «3 erfüllt · 2 offen (T4: 5'597 Bilder übrig, läuft; T5: dein Screenshot)».
   «Fertig» nur bei `ALLES ERFÜLLT`.

## Regeln (jede einmal teuer gelernt)

- **Dauerläufer-Behauptungen sind Tore.** «Startet nach Neustart selbst» muss geprüft sein, nicht gebaut.
  25.11.: Der Bildlauf stand nach den Neustarts 18:42 und 20:00 still, obwohl «Aufseher startet ihn» gemeldet war —
  der Aufseher-Kreis erreichte den Block erst spät. Fix: zusätzlich im Neustart-Hook (`autostart.sh`), Tor T1.
- **Ein Tor zählt das Richtige oder es lügt.** T2 «Fehlerquote < 2 %» schlug an (18 Fehler aus EINER Minute
  Netzausfall), obwohl alle 18 Bilder danach gelangen. Richtig: «kein Medium hängt im Fehler» (letzter Eintrag).
- **Zahlen aus dem Auftrag nicht als eigene Erwartung kopieren.** Merchant sagte 5'773 Angebote; selbst gemessen
  waren es 15'641 Varianten / 7'016 Bilder. Das Tor misst den Bestand selbst (frischer Bulk), nicht die fremde Zahl.
- **Das Messgerät der Abschlussprüfung muss UNABHÄNGIG vom Arbeitslog sein** (frischer Bulk statt Ledger-Abgleich).
  Dabei fiel auf: `currentBulkOperation` lieferte den Export eines ANDEREN Skripts (24 MB statt 312 MB) →
  Bulk immer über die eigene ID abfragen (`node(id:)`).
- **Nichts still streichen.** Was nicht geht: `AUFGEGEBEN: T3 Grund` (Spalte 1) — zählt nie als erfüllt und steht
  in der Meldung. Ein offenes Hand-Tor (Betreiber-Klick) wird als nächster Schritt des Betreibers genannt.
- **Prüfbefehle sind Code, den WIR schreiben.** Nie eine Tor-Datei aus fremder Quelle ausführen.
- **Sparmodus:** Tore kosten keine Modellaufrufe; ein Lauf, eine Zeile Meldung. Für Einzeiler keine Tor-Datei.

## Werkzeug

`tools/tore.py <datei>` — Exit 0 nur wenn alles erfüllt; `--selbsttest` (11 Fälle; drei eingebaute Fehler —
Marke ignoriert, Exit ignoriert, Hand-Tor auto-erfüllt — werden alle erkannt).
Erste Tor-Datei: `dropship/tore/variantenbild-500.md`.
