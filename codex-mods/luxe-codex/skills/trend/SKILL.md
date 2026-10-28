---
name: trend
description: Trockenlauf von «Neu entdeckt» (kostet CJ-Punkte, schreibt nichts). Zeigt, welche Produkte ins Trend-Regal von LuxeStyle kämen und warum andere ausfallen. Verwenden bei «Trend», «was käme in Neu entdeckt» oder «Trend-Kandidaten». Nicht zum Anlegen der Kollektion und nicht für Social-Media-Trends.
---

# Trend

Misst, welche Produkte das Werkzeug «Neu entdeckt» wählen würde: Shop-Katalog lesen, bereits gekaufte Produkte ausschliessen, die Vorauswahl bei CJ auf Lieferbarkeit prüfen, Netto-Marge rechnen. Es ist ein Trockenlauf: kein Tag, keine Kollektion, keine Reihenfolge wird geschrieben.

**Kostet CJ-Tagespunkte**: der Lauf prüft bis zu 40 Kandidaten bei CJ. Das in der Antwort sagen.

## Ablauf

1. Im Hauptordner des Repos (dort liegt `automation/`; `git rev-parse --show-toplevel` nennt den Ordner) ausführen:

   ```
   LIVE=0 node automation/trend_entdecken.mjs
   ```

   `LIVE=0` ist Absicht und gilt auch dann, wenn die Umgebung selbst scharf gestellt ist. Nie `LIVE=1` setzen: damit würde das Werkzeug Tags und die Kollektion im Shop anlegen. Das entscheidet der Besitzer ausserhalb dieses Skills. Fehlt `node` im Pfad, `/opt/node22/bin/node` nehmen. Der Lauf dauert bis zu zehn Minuten: dem Befehl genug Zeit geben.
2. Den Bericht lesen. Er ist ein JSON-Objekt, danach eine Textzeile. Wiedergeben:
   - `live` muss `false` sein. Steht dort `true`, mit «WARNUNG: der Lauf meldet live=true» beginnen.
   - `gelesen`, `gekaufteProdukte` (ausgeschlossen), `vorauswahl`.
   - `gruende`: Ausschlussgründe, die grössten zuerst, höchstens zwölf.
   - `cj`: geprüft, lieferbar, nicht lieferbar, unbekannt, Netto zu dünn, `abbruch` (immer nennen, auch «keiner»).
   - `gewaehlt`: nummeriert Titel, Preis und Netto in CHF mit zwei Nachkommastellen. Bei mehr als 24 die ersten 24 zeigen und die Zahl der übrigen nennen.
3. Mehr nicht tun: die Kollektion anlegen ist nicht Teil dieses Skills.

## Was nicht gemessen wurde, steht neben dem Ergebnis

- `cj.geprueft` ist 0: bei CJ wurde nichts gemessen, die Auswahl ist ungeprüft. Genau so sagen.
- `gewaehlt` leer: «Gewählt: keine». Keine Produkte erfinden oder aus dem Gedächtnis ergänzen.
- `cj.unbekannt` grösser als 0: nicht messbar, das ist nicht «nicht lieferbar».
- Fehlen erwartete Felder im Bericht, an der Stelle «?» schreiben statt zu raten.

## Wenn es nicht klappt

- Exit ungleich 0 oder nicht gelaufen (Start fehlgeschlagen, Zeitlimit): «Exit N» oder «konnte nicht laufen» nennen, dazu stderr (höchstens etwa 1500 Zeichen). Kein Ersatz-Ergebnis aus dem Gedächtnis.
- Nur eine Textzeile statt JSON, etwa «no-op: kein Shopify-Token (Client-Credentials fehlgeschlagen).» (Exit 0): die erste Zeile wörtlich nennen und sagen, dass NICHTS gemessen wurde. Codex entfernt vermutlich Umgebungsvariablen mit KEY, TOKEN oder SECRET im Namen aus Shell-Befehlen (laut Binärdatei die Vorgabe, im Lauf nicht bestätigt); der Besitzer müsste sie in der Codex-Konfiguration (`shell_environment_policy`) freigeben. Zugangsdaten nie selbst suchen oder eintragen.
- Netzfehler («fetch failed», «ENOTFOUND», «Throttled»): meist sperrt die Sandbox das Netz oder CJ drosselt. Freigabe erbitten beziehungsweise warten, nichts umgehen.
