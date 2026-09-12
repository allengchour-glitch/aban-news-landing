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

## Die Gegenprobe läuft gegen eine Kopie an einem anderen Pfad

Beim Bau der vier Gedächtnis-Werkzeuge fanden die Selbsttests **zwei echte Fehler im eigenen
Code** — beide in Werkzeugen, die am Gutfall fehlerfrei liefen:

- `tools/skills_pruefen.py` hatte den Repo-Pfad fest verdrahtet und stürzte ab, sobald der
  Selbsttest es auf eine Kopie in `/tmp` anwandte. Dasselbe Muster wie bei
  `spiele-dev/tools/th-pruef.mjs` mit seiner festen `REPO`-Konstante.
- `tools/lehre.py` ersetzte Umlaute **nach** `unicodedata.normalize("NFKD", …)`. NFKD zerlegt „ä"
  in „a" plus kombinierendes Trema, die Ersetzung traf deshalb nie etwas. Aus „öäü" wurde „oau"
  statt „oeaeue" — still, ohne Fehlermeldung.

**Regel:** Das Messgerät bekommt seine Gegenprobe **im selben Arbeitsgang**, und die Gegenprobe
arbeitet auf einer **Kopie an einem anderen Pfad**. Fest verdrahtete Pfade und
Reihenfolge-Fallen (normalisieren vor ersetzen) sind die zwei Fehler, die sie zuverlässig fängt.

Vorbilder mit `--selbsttest`: `tools/vault.py`, `tools/gedaechtnis.py`,
`tools/skills_pruefen.py`, `tools/lehre.py`.

## Werkzeug-Hinweise für dieses Repo

- Node ist `/opt/node22/bin/node` (v22).
- Playwright ist **nicht** vorinstalliert: `npm i playwright --no-save`, und der Browser braucht
  `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. **Nie**
  `playwright install` aufrufen.
- Seiten in **Bildschirmhöhen** ansehen (`tools/seiten_blick.mjs`), nicht als 21 000-px-Bild.
- Messgeräte gehören nach `tools/`, Berichte nach `reports/`.
