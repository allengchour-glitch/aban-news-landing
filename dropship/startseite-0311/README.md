# Startseite zum Stöbern (Codex R72) live am 03.11.2026

Paket: `dropship/codex-handoff-20261018/STARTSEITE-STOEBERN-20261103-R72.*` auf dem Codex-Zweig (Stand `8036fd6`), Besitzer-Auftrag «push» an Codex, am 03.11. ~22:50 UTC von Claude nach Prüfung auf MAIN gelegt.

**Vor dem Schreiben geprüft (GEMESSEN):** beide MAIN-Dateien (`sections/luxe-edit-home.liquid`, `assets/luxe-edit.css`) hatten genau die Basis-Hashes des Pakets (md5 `d91a9a8c…` und `5d957883…`); der Patch (`patch -p1`) ergab auf frischen Kopien byteweise den Kandidaten (md5 `8bda9bef…`, `1c32bca8…`). Schreiben: CSS zuerst, dann Liquid, ein `themeFilesUpsert`, keine Fehler. Rücklesen: das erste Rücklesen direkt nach dem Schreiben zeigte beim CSS noch den alten Stand (Lag), nach rund einer Minute waren beide Dateien byte-gleich dem Kandidaten (md5 geprüft). **Lehre: Theme-Datei nie gleich nach dem Schreiben als Abweichung werten, erst nach einer Minute noch einmal lesen.**

**Wirkung (Playwright am Live-Shop, vorher/nachher):**

| | vorher 390 px | nachher 390 px | vorher 1440 px | nachher 1440 px |
|---|---|---|---|---|
| erste Produktkarte (y) | 2 764 | 1 651 | 2 705 | 1 468 |
| Seitenhöhe | 11 633 | 10 619 | 10 803 | 8 747 |
| «Selbst gestalten»-Bereich (y) | 1 706 | 3 961 | 1 624 | 3 763 |

16 Kategorien (4 Spalten Desktop, 2 mobil), 25 Produktkarten, 25 Herzen, kein horizontaler Überlauf, keine JS-Fehler bei 320/390/768/1024/1440 px, ebenso auf `/fr`. Reihenfolge jetzt: Kategorien → Trends (12 Produkte, seitlich wischen) → Winter/Weihnachten → Schmuck → Wohnen → Selbst gestalten → Entdecken → Mehr → Budget → Hilfe.

**Entscheid, den ich getroffen habe und der sich leicht umkehren lässt:** der grosse «Selbst gestalten»-Bereich rutscht von Platz 3 auf Platz 7. Die Kachel «Selbst gestalten» ist weiter die erste der 16 Kategorien, der Link steht im Kopf und im Hero. Ob das Verkäufe kostet, ist ungemessen (Selbst gestalten hat höhere Marge als die meisten CJ-Produkte).

**Rücknahme:** `luxe-edit-home.liquid.vor-r72` und `luxe-edit.css.vor-r72` in diesem Ordner zurückschreiben, aber nur wenn beide aktuellen MAIN-Dateien noch den Kandidaten-Hashes entsprechen (sonst gingen neuere Änderungen verloren).

**Offen:** Die Kachel «Küche und Kochen» führt noch auf die alte Sammlung `sub-kueche` (3 966 Produkte, rund 11 % fachfremd); der Wechsel auf die neue saubere `kueche-kochen` braucht Beschriftung und Bild (die neue Sammlung hat keines). Messen, ob sich die Startseite auf Warenkörbe auswirkt: Kontrollen Mi 05.11. und Mo 10.11. (vorher 36 Warenkörbe in 30 Tagen, 1,0 % Kaufquote CH).
