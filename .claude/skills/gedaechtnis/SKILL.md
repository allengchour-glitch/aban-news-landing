---
name: gedaechtnis
description: Beim Session-Start und immer wenn etwas über den Stand dieses Repos, frühere Entscheidungen, bekannte Sackgassen oder offene User-Aufgaben gesucht wird ("wo war ich", "was ist der Stand", "haben wir X schon versucht", "warum ist Y so"), und immer bevor am Ende der Session CLAUDE.md oder SHARED-MEMORY.md fortgeschrieben wird. Sagt, welche Datei die Wahrheit ist, wie man sie durchsucht statt liest, und wie man korrekt nachträgt.
---

# Zweites Gehirn — das Gedächtnis dieses Repos

Das Gedächtnis ist gewachsen: `CLAUDE.md` (Kern, ~60 KB) + `GEDAECHTNIS-JOURNAL.md` (Tagebuch, ~375 Abschnitte, ~960 KB — seit 14.09. ausgelagert, weil der Prompt zu lang wurde) und `SHARED-MEMORY.md` (~1140 Zeilen),
zusammen rund **158 KB Prosa**. Das linear zu lesen kostet jede Session Kontext, ohne die eine
Tatsache zu liefern, die gerade gebraucht wird.

## Zuerst durchsuchen, nicht lesen

```bash
python3 tools/gedaechtnis.py "review"        # Fakten zu einem Stichwort, mit Datum und Quelle
python3 tools/gedaechtnis.py --sackgassen    # was nachweislich NICHT funktioniert
python3 tools/gedaechtnis.py --offen         # was nur der User klicken kann
python3 tools/gedaechtnis.py --stand         # die neuesten Stand-Blöcke, kurz
python3 tools/gedaechtnis.py --selbsttest    # Gegenprobe des Werkzeugs
```

Das Werkzeug indexiert `CLAUDE.md`, `GEDAECHTNIS-JOURNAL.md`, `SHARED-MEMORY.md`, `dropship/AUTONOMER-MODUS.md`,
`dropship/USER-CHECKLISTE.md`, `automation/BRAIN.md` und die Runbooks und gibt Treffer
**mit Datum und Herkunftsdatei** zurück.

## Welche Datei die Wahrheit ist

| Frage | Datei |
|---|---|
| Wer besitzt gerade was, Live-Stand über alle Sessions | `SHARED-MEMORY.md` (**zuerst**) |
| Projekt-Gedächtnis KERN (Regeln, Stand, Kernfakten) | `CLAUDE.md` |
| Tagebuch aller Lehren (Volltext, neueste oben) | `GEDAECHTNIS-JOURNAL.md` |
| Dropship-Runbook, §9 Master-Lessons, §10 Kunden gewinnen | `dropship/AUTONOMER-MODUS.md` |
| Produktliste und Import-Historie | `dropship/CJ-IMPORT-LOG.md` |
| Offene Aufgaben, die nur der User klicken kann | `dropship/USER-CHECKLISTE.md` |
| Spiele-Sessions | `spiele-dev/RUNBOOK-SPIELE.md`, `RUNBOOK-TRAUMHAUS.md` |
| Selbst-Verbesserungs-Hirn der Webseite | `automation/BRAIN.md` |

⚠️ **`dropship/SESSION-HANDOFF.md` ist veraltet** (Stand 30.05.2026) und darf nicht als Wahrheit
genommen werden.

## Jede Aussage im Gedächtnis ist eine Hypothese mit Datum

Der teuerste Fehler der Projektgeschichte war eine als Tatsache notierte Decke: „CJ hat keine
Reviews, `listLen=0` ist eine echte 0, kein Bug." Sie stimmte nicht — der eigene Importer schickte
`apiKey` statt `password`. Monate lang blieb dadurch der billigste Conversion-Hebel ungenutzt.

→ Bevor du auf einem „das geht nicht" aufbaust: **einmal messen** (Skill `messgeraet-zuerst`).
→ Wenn eine Messung dem Gedächtnis widerspricht: **das Gedächtnis korrigieren**, und zwar
   ausdrücklich als Widerlegung mit Datum, damit die falsche Aussage nicht wieder auftaucht.

## Richtig nachtragen (am Ende jeder Session)

1. **Neue Lehre als Abschnitt OBEN in `GEDAECHTNIS-JOURNAL.md`** + Einzeile im Index «📚 Jüngste Lehren» von `CLAUDE.md`; Stand-Block `## 📌 Aktueller Stand` in `CLAUDE.md` nachziehen, Form
   `**📌 JJJJ-MM-TT (Kurztitel):**`. Alte Blöcke stehen lassen — sie sind die Historie.
2. **Gemessene Zahlen hineinschreiben**, nicht Eindrücke. „Mobil 1 Spalte / Bild 356 px /
   24 Produkte = 11 298 px → 2 Spalten / 128 px / 2887 px (−74 %)" ist ein Eintrag.
   „Raster verbessert" ist keiner.
3. **Sackgassen ausdrücklich als Sackgasse markieren**, mit dem Grund und einem
   „nicht erneut versuchen". Das spart der nächsten Session Stunden.
4. **Nur-User-Aufgaben klar benennen** — Logins, Zahlungen, Klicks in fremden Web-UIs.
5. Bei sessionübergreifend relevanten Änderungen zusätzlich den Abschnitt „Live-Stand" in
   `SHARED-MEMORY.md` anfassen, weil mehrere Sessions parallel auf Repo und Shop arbeiten.

## Der Wach-Haken

`.claude/settings.json` startet bei jedem Session-Start `automation/brain-wake.sh` — es zeigt
Health-Score und offene Befunde und **schreibt nichts**. Wer dort etwas ergänzt, hält es
schreibfrei, sonst erzeugt jeder Start Tree-Noise.
