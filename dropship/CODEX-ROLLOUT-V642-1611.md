# Auftrag an Codex: Rollout-Pfad für Editor 6.4.2 (16.11.2026, von Claude)

Rollout-Werkzeug und Prüftor gehören dir (`docs/ARBEITSTEILUNG-1011.md`, Teil 2). Claude führt die Stufen danach aus, jede nur mit dem Ja des Besitzers. Darum hier nur der Auftrag, Claude ändert am Werkzeug nichts.

## Ausgangslage (GEMESSEN 15./16.11.)

- **Besitzer 11.11.: «rollout ja»** für 6.4.2, ausdrücklich samt Magnet. Ein Ja je Stufe holt Claude vor dem Schreiben ein.
- **Live:** alle 16 Editor-Seiten laden `lspod-designer-v6-6.4.0.js` (Admin-API und Storefront, 16.11. 00:3x UTC: Keramik-Tasse und Bio-Jutebeutel nachgemessen). Magnet, Dad-Cap und Bügeltransfer tragen die Sperre.
- **6.4.2 ist fertig und auf `main`** (`pod/v6/lspod-designer-v6-6.4.2.js`, 316 496 Byte, SHA-256 `7d4c3639d310bc2a5592f6a8d21a6e347f1875bd7eeb3b8177aee7af5faf35ff`, gemergt mit #3154 `ae59115056`). `editor-release-6.4.2.json` liegt im Rollout-Ordner; Vorgänger 6.3.0, 6.3.1, 6.4.0, 6.4.1; `editor_release_bauen.mjs --pruefen --version 6.4.2 --vorgaenger 6.3.0,6.3.1,6.4.0,6.4.1` meldet «konsistent».
- **Schlussprüfung 15.11. (fünf unabhängige Linsen):** Touch «ok», Kaufvertrag «ok», Tastatur und Regression «mit Änderungen», aber kein Rückschritt gegenüber 6.4.0 und keine Änderung einer Druckdatei. 7 von 7 weiteren Live-Seiten im echten Theme mit echter SRI sind byte-gleich zu 6.4.0, 36 von 36 Karten gleich, 193 Kauffälle. **Die Editor-Datei braucht keine Änderung.**
- **Lücke L1 (der Grund für diesen Auftrag):** `rolloutKonfig({ editorVersion: '6.4.2' })` in `direct_rollout_lib.mjs` wirft «EDITOR_VERSION muss 6.3.1 oder 6.4.0 sein». `pod-v64-description-rollout.yml` hat `EDITOR_VERSION: '6.4.0'` fest. Es gibt keinen geprüften Weg, 6.4.2 auszurollen.

## Was gebraucht wird

1. **Ein Pfad `EDITOR_VERSION=6.4.2`** im Werkzeug in `dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/`:
   - Ziel und Vorgänger aus `editor-release-6.4.2.json`. `editor-release.json` von 6.4.0 bleibt unverändert, der 6.4.0-Pfad bleibt bytegleich lauffähig (Rückweg).
   - Vor jedem Netzzugriff geprüft wie bei 6.4.0: Eingaben, Bestätigungen, Release gegen die echten Dateibytes (Ziel und alle Vorgänger), beim Rollback das ganze Artefakt.
   - Der Planer akzeptiert als Ausgangsstand 6.4.0 (heute live) sowie 6.3.0 und 6.3.1. Er ändert nur das Editor-Script-Tag (Dateiname, `?v=`, SRI) und, wie bei 6.4.0, `?v=` von `data-karte-url`/`data-vorschau-url` und `card=` im Marker. Sonst bleibt jedes Byte gleich.
   - `data-bearbeiten` wird nicht neu gesetzt (die 16 Seiten tragen es heute nicht, 6.4.0 und 6.4.2 starten beide in «Bearbeiten»).
2. **Stufen wie bei 6.4.0:** `canary-tasse`, `canary-jutebeutel`, `full` (16 Editor-Produkte). Eigene Bestätigungen (z. B. `V642_CANARY_TASSE`, `V642_CANARY_JUTEBEUTEL`, `V642_FULL_16_EDITOR`) und eigene Artefakte (`pod-v642-rollout-<Run-ID>`), damit kein 6.4.0-Artefakt verwechselt wird.
3. **BLOCKLIST bleibt** (Bügeltransfer, Dad-Cap, Magnet). Full prüft die drei Sperrseiten vor dem ersten Schreiben und schreibt sie nie. Der Magnet ist eine eigene, spätere Stufe (unten).
4. **Workflow:** eine Kopie nach dem Muster von `pod-v64-description-rollout.yml` mit festem `EDITOR_VERSION: '6.4.2'` (nur manuell, nur Default-Branch, exakter Commit, Bestätigungen), oder eine Erweiterung, die 6.4.0 und 6.4.2 sauber trennt. Deine Wahl.
5. **Tests:** Erweiterung von `direct_rollout_test.mjs` (heute 167) mit den 16 echten Live-Blöcken auf 6.4.0 als Fixture (Stand frisch aus dem Shop holen), manipulierten Beschreibungen, Rollback-Artefakt, falscher Version, falscher Vorgängerliste. Dazu eine Mutationsprobe der neuen Stellen. CI: Job `selbst-gestalten` um den neuen Workflow-Test ergänzen (Sparse-Pfade nicht vergessen).
6. **Ein Plan-Lauf** in Actions (`mode=plan`, `scope=full`) als Beleg. **Keine Apply-Läufe:** die führt Claude mit dem Ja des Besitzers aus, Stufe für Stufe (Tasse, Jutebeutel, Beobachtung, Full).

## Magnet (spätere eigene Stufe, nach Full; nur zur Abstimmung)

Die Schlussprüfung (L2) nennt fünf Sperren. Reihenfolge, sonst zeigt 6.4.2 «ausverkauft» (GEMESSEN) oder der Sperr-Wächter meldet täglich rot:

1. Freigeschaltete Karte `lspod-15427217195393` (Modell 656) einzeln vom Zweig `claude/luxestyle-magnet-frei-1111` auf `main` holen, **ohne** dessen altes 6.4.2 (`886b0576…`). Den Zweig nicht mergen: Konflikte in der unveränderlichen Editor-Datei und weiteren Dateien. *(Claude)*
2. Magnet aus `HANDLES` von `automation/sperr_verfuegbar.mjs` / Job «sperre» in `kaufweg-waechter.yml` nehmen *(Claude)* und aus der `BLOCKLIST` des Rollout-Werkzeugs *(du, als eigener kleiner PR mit Stufe `magnet`, Bestätigung z. B. `V642_MAGNET`)*.
3. Serverseitige Sperre zurücknehmen (alle 3 Varianten heute tracked, DENY, `availableForSale` false; Rücknahme von `sperr_verfuegbar` nur für den Magnet). *(Claude, mit Ja des Besitzers)*
4. Erst dann den Editor-Baustein schreiben (deine Stufe `magnet`). *(Claude führt aus)*

Im Nachbau ging der Kauf mit der freigeschalteten Karte 12 von 12 (je Variante 16366, 16367, 16465, PC und Handy, 6.4.2 und 6.4.0 byte-gleich), der Parser der Bestellstrecke liest alle 12. Nie durchgespielt: ein echter Printful-Auftrag für Modell 656.

## Was du nicht tun sollst

- Keine Änderung an `pod/v6/**` (Editor und Karten gehören dem Editor-Bauer).
- Den Zweig `claude/luxestyle-magnet-frei-1111` nicht mergen.
- Keine Apply- oder Rollback-Läufe, keine Schreibzugriffe auf Produktbeschreibungen.
- Den Theme-Weg `rollout-v63/` nicht benutzen.

## Übergabe

PR nach `main` mit Tests und dem Plan-Lauf als Beleg (Run-ID im PR-Text). Claude liest ihn, prüft ihn gegen die Live-Blöcke und führt danach die Stufen aus. Fragen und Funde in diese Datei unter «Antwort Codex».

## Antwort Codex

(offen)
