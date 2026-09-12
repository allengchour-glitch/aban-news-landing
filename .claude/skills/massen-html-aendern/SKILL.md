---
name: massen-html-aendern
description: Immer wenn dieselbe Änderung viele der 1133 HTML-Seiten von abannews.com treffen soll - CSS-Raster, Eckenradien, Farbverläufe, Textbausteine, Floskeln, eingebundene Skripte, Kopf- oder Fussleisten - oder wenn sed/Python über mehrere Seiten läuft. Enthält die Diff-Pflicht, die Generator-Vorlagenkette und die still verworfene CSS-Angabe.
---

# Massenänderungen über die HTML-Seiten

Rund **1133 HTML-Seiten** im Wurzelverzeichnis plus `maerkte/`, `dossier/`, `en/`. Eine Ersetzung
trifft hier nie eine Datei, sondern hunderte. Drei Regeln haben je einen halben Tag gekostet.

## Regel 1 — Den DIFF lesen, nicht die Zahl

Ein Muster mit einfachem Bindestrich machte aus
`3-5 Minuten, kein Hype.` → `3.` — **auf 264 Seiten**. Trefferzahlen und `html-validate` sahen
dabei völlig unauffällig aus.

→ Nach jeder Massenersetzung: `git diff` **stichprobenweise lesen** (mindestens 5 Seiten, und
zusätzlich die längsten Diff-Blöcke). Ziel ist der Satz: „Der Diff besteht zu 100 % aus Zeilen,
die ich ändern wollte." Erst dann committen.

```bash
git diff --stat | tail -3
git diff | grep '^-' | grep -v '^---' | sort | uniq -c | sort -rn | head -20   # was verschwand
```

## Regel 2 — Die Generator-Vorlagen mitziehen, sonst ist es nach dem nächsten Lauf zurück

Viele Seiten sind **generiert**. Wer nur die Seiten putzt, hat die Änderung beim nächsten
Generatorlauf wieder verloren. Beim Entfernen des Assistenten waren es **drei** Einbau-Orte:
die HTML-Seiten, `automation/inject_assistant.py` und **sieben Generator-Vorlagen**
(`build_markets_detail`, `generate_sichtbarkeit_branchen` ×2, `_compliance_pakete`,
`_schnellstart`, `_ki_audit`, `_angebote`, `_dossiers`).

**Vorlagenkette, die man kennen muss:** `angebote-suche.html` **ist die Vorlage** für alle
`*-angebote.html` — `automation/gen_angebote_pages.mjs` kopiert sie und ersetzt nur Kopf, Hero
und Query. Rasteränderungen also **dort zuerst**.

```bash
grep -rln "<das zu ändernde Muster>" automation/ tools/ --include=*.py --include=*.mjs
```

⚠️ Generatoren arbeiten mit **Ankern** in der Vorlage. `gen_angebote_pages.mjs` war seit dem
Floskel-Aufräumen kaputt, weil die Anker `desc` und `ogtitle` nicht mehr zur Vorlage passten und
er abbrach. Nach Textänderungen an einer Vorlage: **Generator einmal laufen lassen.**

⚠️ Ein Generator-Neubau **zieht Vorlageninhalte nach** (z. B. ein BreadcrumbList-JSON-LD, das die
Kategorieseiten vorher nicht hatten). Wenn der Diff minimal bleiben soll: die Änderung chirurgisch
in den fertigen Seiten ersetzen **und** in der Vorlage — aber nicht neu generieren.

## Regel 3 — `background-image` nimmt keine Farbe an

Dort einen Verlauf durch eine Farbe zu ersetzen erzeugt eine **ungültige** Angabe, die der Browser
**still** verwirft. Die Fläche ist danach durchsichtig, ohne Fehlermeldung irgendwo.
Farben gehören nach `background-color` oder in die `background`-Kurzschrift.

## Was nicht mitgeändert werden darf

Nicht alles, was ein Raster hat, ist ein Produktraster. Bewusst ausgenommen bleiben:
`minispiele/drei-gewinnt.html` (Spielfeld), `pod/designer.js` (Sticker), die POD-Detailseiten.

## Ablauf, der sich bewährt hat

1. Messgerät bauen und Bestand zählen (siehe Skill `messgeraet-zuerst`).
2. Ersetzung **idempotent** schreiben — zweimal laufen lassen darf nichts weiter ändern.
   Vorbilder: `tools/textbausteine.py`, `tools/ecken.py`, `tools/flaechen.py` (je mit `test_`-Datei).
3. Ersetzung laufen lassen, **Diff lesen** (Regel 1).
4. Generatoren und Vorlagen nachziehen (Regel 2), Generator einmal starten.
5. `html-validate <geänderte Seite>` — 0 Fehler erwartet.
6. Nachher messen, beide Zahlen melden.

## Nach dem Commit

Live wird es erst durch `bash build-pages.sh` und den Deploy. ⚠️ Der Live-Deploy steht seit
29.08.2026: der Hetzner-Poller fetcht anonym und bekommt wegen der Spam-Markierung des Kontos
404. Er läuft erst wieder, wenn der User einen PAT in `/etc/abannews/deploy.env` legt. Bis dahin
ist nichts davon auf abannews.com sichtbar — das ist kein Fehler der eigenen Änderung.
