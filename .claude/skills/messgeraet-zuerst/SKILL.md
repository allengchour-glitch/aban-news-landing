---
name: messgeraet-zuerst
description: Vor jeder Aufgabe, die "besser", "schöner", "eleganter", "cooler", "nicht so KI-generiert", "aufräumen" oder "optimieren" verlangt - und vor jeder Änderung, deren Erfolg man nur nach Gefühl beurteilen könnte. Baut zuerst ein Messgerät mit Gegenprobe, misst vorher, ändert, misst nachher. Auch bei Behauptungen aus dem Gedächtnis ("X ist kaputt", "es gibt keine Y"), die man messen statt glauben kann.
---

# Messgerät zuerst — nie nach Gefühl ändern

Dieses Repo hat drei Mal teuer gelernt: **wer ohne Messgerät ändert, meldet Erfolg, den es
nicht gibt.** Die Reihenfolge ist nicht verhandelbar.

## Die fünf Schritte

1. **Messgerät bauen.** Ein kleines Skript in `tools/`, das die Sache in einer Zahl ausdrückt.
   Beispiele im Repo: `tools/ki_look.py` (Bestandszählung), `tools/kopfleiste.mjs`
   (Durchschlag), `tools/produktdichte.mjs` (Spalten/Bildgrösse/Seitenhöhe),
   `spiele-dev/tools/th-handschrift.py` (Verläufe, Emoji, HUD).
2. **Gegenprobe in das Messgerät einbauen.** Das Gerät muss an einem künstlich verschlechterten
   Fall **ausschlagen**. Ohne diesen Selbsttest ist eine 0 kein Befund, sondern ein Verdacht.
3. **Vorher messen** und die Zahl aufschreiben.
4. **Ändern** — so chirurgisch wie möglich.
5. **Nachher messen** und beide Zahlen nennen. Ohne Vorher/Nachher gibt es keine Meldung.

## Warum die Gegenprobe (Schritt 2) Pflicht ist

`tools/kopfleiste.mjs` meldete auf 54 Seiten überall **0,00** Durchschlag — Ergebnis sah perfekt
aus. Die eingebaute Gegenprobe (eine künstlich halbtransparente Leiste MUSS ausschlagen) entlarvte
das Gerät: `page.screenshot({clip})` rechnet in **Dokument**-, nicht in Bildschirmkoordinaten, der
Ausschnitt lag also weit unterhalb der Leiste. Ohne Selbsttest wäre "alles sauber" gemeldet worden,
während der Fehler unverändert live stand.

## Ein Messgerät, das Bauteile als Fehler zählt, treibt in die falsche Richtung

Nach der Radien-Leiter stieg die Kennzahl "Kästen ≥ 14 px" von 4119 auf 9591 — weil 14 px die
**gewählte** Sprosse ist. "Auf einen Blick" (433 Treffer) ist das **Label** des Antwort-Kastens,
keine Floskel. Beide Kennzahlen waren falsch definiert und mussten korrigiert werden.

→ **Prüfe vor dem Messen: zählt das Gerät Fehler, oder zählt es Absicht?** Wenn eine Kennzahl
durch eine gewollte Entscheidung steigt, ist die Kennzahl kaputt, nicht die Entscheidung.

## Behauptungen messen statt glauben

Im Gedächtnis stand als Tatsache: "CJ hat keine Reviews, listLen=0 ist eine echte 0, kein Bug."
Eine Messung mit gültigen Zugangsdaten widerlegte das: 13 von 60 Produkten hatten Kommentare,
198 davon ≥ 4★. Ursache war ein Feldname im eigenen Importer (`apiKey` statt `password`). Eine
falsche "Decke" im Gedächtnis hat monatelang den billigsten Conversion-Hebel blockiert.

→ **Jede "das geht nicht"-Aussage im Gedächtnis ist eine Hypothese mit Datum, kein Naturgesetz.**
Bevor du darauf aufbaust: einmal messen.

## Werkzeug-Hinweise für dieses Repo

- Node ist `/opt/node22/bin/node` (v22).
- Playwright ist **nicht** vorinstalliert: `npm i playwright --no-save`, und der Browser braucht
  `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. **Nie**
  `playwright install` aufrufen.
- Seiten in **Bildschirmhöhen** ansehen (`tools/seiten_blick.mjs`), nicht als 21 000-px-Bild.
- Messgeräte gehören nach `tools/`, Berichte nach `reports/`.
