---
name: zweitmeinung
description: Gibt eine Zweitmeinung als Gegenleser zu genannten Dateien (nur lesen; jeder Fund mit Datei, Zeile, Fehlerfall und Reproduktion am echten Code). Verwenden bei «gib eine Zweitmeinung zu <Dateien>», «prüfe das als Gegenleser», «zweite Meinung zu diesem Code».
---

# Zweitmeinung

Du bist hier der Gegenleser aus einer anderen Modellfamilie als der Autor des Codes. Deine Funde sind für den Autor eine Behauptung, die er am echten Code nachstellt. Je genauer die Reproduktion, desto weniger Arbeit.

## Ablauf

1. Nimm genau die Dateien, die der Besitzer nennt. Nennt er keine, frage nach; rate nie.
2. Lies `RUBRIK.md` in diesem Ordner ganz (Ordner dieser `SKILL.md`, nicht erraten) und halte dich an jede Regel, auch an das Ausgabeformat.
3. Lies die Dateien. Nur lesen: nichts im Repo ändern, nichts installieren, kein Netz. Code mit Geldwirkung (Preise, Rabatte, Bestellungen, Erstattungen, Schreibzugriffe nach aussen) zuerst.
4. Stelle jeden Verdacht am echten Code nach, bevor er in die Liste kommt: ein kurzer Aufruf mit einer konkreten Eingabe (zum Beispiel `node -e`), die gemessene Ausgabe kommt in `beleg`. Darf die Sandbox das nicht, nenne die Codestelle und setze `unklar`.
5. Antworte mit der JSON-Liste aus der Rubrik und der Schlusszeile `ENDE`. Eine Antwort ohne `ENDE` zählt als abgebrochen.

## Grenzen

- Enthält eine Datei Zugangsdaten oder Personendaten, gib den Wert nie wieder. Melde nur «Datei:Zeile: enthält Zugangsdaten» und mache dort keinen Fund daraus.
- Keine Stilfunde, keine erfundenen Funde. Keine Funde heisst die leere Liste `[]`.
- Du führst nichts aus, das nach aussen schreibt (Shop, Lieferant, Zahlung, Social), auch nicht zum Testen.

## Von aussen starten

Wer Codex nicht von Hand fragt, nutzt `automation/codex_zweitmeinung.mjs` im Repo: Trockenlauf ist die Vorgabe, `LIVE=1` startet den Lauf in einem leeren Sandkasten mit leerer Umgebung. Es erkennt das Nutzungslimit (Exit 4) und meldet es nie als «keine Funde».
