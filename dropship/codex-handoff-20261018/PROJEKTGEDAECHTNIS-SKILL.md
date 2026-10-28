---
name: projektgedaechtnis
description: Setzt erlaubte LuxeStyle-Arbeit anhand der aktuellen GitHub-Übergabe, stabiler Aufgaben-IDs und belegter offener Schritte fort. Bei Arbeitsbeginn, weiter, selbstständig, Gedächtnis oder Projektstand verwenden.
---

# LuxeStyle: Arbeit fortsetzen

Lies zuerst die aktuelle ausdrückliche Inhabervorgabe. Verwende die bereits verbundene GitHub-App für Repository `allengchour-glitch/aban-news-landing`, Branch `codex/luxestyle-claude-handoff-20261018`, Ordner `dropship/codex-handoff-20261018/`.

Lies dort frisch `PROJEKTGEDAECHTNIS.md`, `README.md`, den heutigen Block von `TAGESPROTOKOLL.md` und `ARBEITSSTAND.json`. Die projektlokalen Dateien unter `memory/` sind nur datierte Kopien; sie beweisen keine aktuelle Remote-Fassung. Bei fehlendem Zugriff Unbekanntes benennen und nur unabhängige erlaubte Vorbereitung fortführen. Kein Zurücksetzen oder Überschreiben unbekannter Historie.

Wähle den ersten nach Priorität und Voraussetzungen ausführbaren Arbeitsschritt. Behalte taskId, Produkt-/Variantenbezug und Quellen bei. Beachte die einmal tägliche Kennzahlgrenze. Erledige den konkreten erlaubten Schritt, prüfe den Diff und dokumentiere Ergebnis, Beleg, Blocker und nächsten Schritt. Keine unnötige erneute Freigabe bereits erlaubter Vorbereitung.

Für ein Reviewpaket den bestehenden Übergabehelfer nach Prüfung seiner Version verwenden, wenn Paket und referenzierte Dateien lokal verfügbar sind:

```bash
node automation/codex_uebergabe.mjs stand --repo /absoluter/pfad/zur/geprueften/ablage --packet dropship/codex-handoff-20261018/aufgaben/<taskId>.r<revision>.packet.json
```

Fehlende Quittung bedeutet unbekannte Kenntnisnahme. Claude bleibt Koordinator. Keine fingierte Quittung, direkte Sitzungsverbindung oder erfolgreiche Umsetzung behaupten.

Keine Shop-/CJ-/Trend-Skripte automatisch starten, keine neuen Zeitpläne oder Hintergrunddienste anlegen, keine Credentials suchen oder kopieren. Produktive Befugnisse stammen ausschliesslich aus den aktuellen Inhaberanweisungen. Social-/DNS-Sonderfreigaben behalten ihre einzelnen Voraussetzungen. Den einen professionellen Master weiterentwickeln.

Der bestehende `regeln`-Skill zeigt Quellcodebeispiele. Die Hookquellen sind in dieser lokalen Installation nicht registriert; ihre tatsächliche Ausführung ist nicht belegt. Eine Auswegvariable setzt die Inhabervorgaben nicht ausser Kraft.

Vor Fortschreibung der Repo-Dokumentation frisch lesen, Ergänzungs-Diff prüfen, aktuellen Datei-SHA verwenden und danach zurücklesen. Ein unklarer Schreibvorgang wird nicht blind wiederholt. Im Bericht konkret sagen, was gemacht, vorbereitet oder blockiert ist.
