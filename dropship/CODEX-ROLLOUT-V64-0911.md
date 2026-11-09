# Rollout-Werkzeug für Editor 6.4.0: Übergabe an Codex (09.11.2026)

Der Besitzer hat «mach alles fix fertig und live» gesagt: Editor 6.4.0 («Auf dem Produkt bearbeiten») soll nach Prüfung auf die Produktseiten. Der Weg dorthin ist das Beschreibungs-Rollout aus `dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/` (von Codex für 6.3.1 gebaut). Es ist jetzt für 6.4.0 angepasst. **Gebaut und getestet, nichts ausgeführt** (kein Plan-Lauf, kein Shop-Zugriff, kein Push). Ausführliche Anleitung: README im selben Ordner, Abschnitt «Editor 6.4.0».

## Was geändert wurde

- **Neu:** `editor_release_bauen.mjs` und `editor-release.json` (Ziel 6.4.0, Vorgänger 6.3.0 und 6.3.1, erzeugt aus den echten Dateien); `fixtures/live-editor-bloecke-0811.json` (nur Editor-Blöcke der 16 Live-Beschreibungen, keine Kundentexte); `direct_rollout_mutationsprobe.mjs`; `.github/workflows/pod-v64-description-rollout.yml`.
- **Geändert:** `direct_rollout_lib.mjs`, `direct_rollout.mjs`, `direct_rollout_test.mjs`, README. **Nicht angefasst:** `pod/v6/**` (auch nicht 6.3.0/6.3.1), `rollout-v63/**` (Theme-Weg bleibt eingefroren), `pod-v63-description-rollout.yml`, `luxestyle-automation-tests.yml`.
- **Ein Skript, zwei Pfade.** `EDITOR_VERSION=6.4.0` schaltet den neuen Pfad (Ziel und Vorgänger aus `editor-release.json`, Scopes `canary-tasse` | `canary-jutebeutel` | `full`, Bestätigungen `V64_CANARY_TASSE`, `V64_CANARY_JUTEBEUTEL`, `V64_FULL_16_EDITOR`, `V64_ROLLBACK_TASSE`, `V64_ROLLBACK_JUTEBEUTEL`, `V64_ROLLBACK_16_EDITOR`). Ohne die Variable läuft alles wie bisher (6.3.1, V63-Zeichenketten). Gewählt statt eines zweiten Skripts, weil Plan, Ledger, Rollback und Schreibschutz dann ein Code sind. Die V63-Zeichenketten bestätigen keinen 6.4.0-Lauf und umgekehrt (als Kreuzprodukt getestet). Die Canary-Produkte (Tasse, Bio-Jutebeutel) sind fest einprogrammiert, keine Eingabe wählt sie.
- **Vor jedem Netzzugriff geprüft:** Eingaben und Bestätigungen, `editor-release.json` gegen die echten Dateibytes (Ziel und Vorgänger), beim Rollback das ganze Artefakt (Plan, Release, Sicherungen, Ledger, Scope, Canary-Produkt, Editor-Version). Vorher kam die lokale Prüfung erst nach dem Shopify-Token. Der Plan prüft zusätzlich live, dass die Rückweg-Dateien 6.3.0/6.3.1 unverändert ausgeliefert werden.
- **Full (6.4.0)** prüft die drei Sperrprodukte vor dem ersten Schreiben (sie werden nie geschrieben).

## Der Planer ist gelockert (warum und wie)

**Befund:** der 6.3.1-Planer bricht schon heute bei `shirt-zum-selbstgestalten` und `unisex-t-shirt-selbst-gestalten` ab («… weitere Beschreibungsbytes ändern»). Ursache: Commit `1835d4361d` hat Karte und Vorschau dieser zwei Produkte neu gebaut, die Live-Beschreibung trägt noch die alten `?v=` und das alte `card=`. Der Plan prüft immer alle 19 Produkte, ein 6.3.1- oder 6.4.0-Plan wäre also komplett gescheitert.

**Neue Regel (`editorReleasePlanen`, Vergleich auf normalisierten Texten):** nur diese Felder dürfen sich ändern: das Editor-Script-Tag (Dateiname, `?v=`, SRI), das `?v=` von `data-karte-url` und `data-vorschau-url`, das `card=` im Marker. Alles andere bleibt bytegleich; der **Pfad** der Karte/Vorschau, `data-produkttitel`, `data-variant`, `data-karte-pflicht`, Klasse und Marker-Produkt-ID müssen gleich bleiben. Zulässige Ausgangslagen: genau ein Vorgänger-Script (6.3.0 oder 6.3.1, exakt mit `?v=`, SRI, `crossorigin`, `defer`) und kein Ziel-Script, oder das Ziel steht schon da und die Beschreibung bleibt bytegleich (`geaendert=false`). Alles andere wirft: zwei Vorgänger, Vorgänger und Ziel zugleich, unbekannte Version, falsche SRI, zweiter Marker, fremdes Skript, fremder Titel, fremde Karten-URL, «Ziel da, aber Karte neu» (kein stilles Nachziehen). Die Sperrprodukte müssen weiter bytegleich bleiben.

**Seiteneffekt:** die Lockerung gilt auch für den alten 6.3.1-Pfad (er akzeptiert nur mehr Eingaben, für bisher akzeptierte ändert sich nichts). Der alte Workflow wäre damit wieder lauffähig; empfohlen bleibt trotzdem 6.4.0 direkt von 6.3.0 aus. **6.3.1-Vollausrollung und 6.4.0 schliessen sich nach dem ersten 6.4.0-Canary aus.**

## Was Codex nicht doppelt tun soll

- Den Planer nicht noch einmal lockern oder einen zweiten Planer bauen: die Regel steht, getestet mit den 16 echten Live-Blöcken (Fixtures) und 32 manipulierten Beschreibungen.
- Keine neue Rollout-Logik für 6.4.0 und keinen Workflow-Entwurf: `pod-v64-description-rollout.yml` ist fertig (nur manuell, nur Default-Branch, exakter Commit, feste `EDITOR_VERSION`, sechs Bestätigungen, eigene Artefakte `pod-v64-rollout-<Run-ID>`; teilt die Concurrency-Gruppe mit dem v63-Workflow, damit nie beide gleichzeitig auf denselben Beschreibungen laufen).
- Den Theme-Weg (`rollout-v63/`) nicht benutzen: er bleibt eingefroren und für 6.4.0 nicht nötig. `_headers` braucht keine Änderung (`/pod/v6/lspod-designer-v6-*.js` trifft den Namen 6.4.0, getestet). `allowlist.json` bleibt auf 6.3.1 (sie baut die Karten).
- Keine Editor-Änderung hier: `pod/v6/lspod-designer-v6-6.4.0.js` gehört dem Editor-Bauer.

## Was nach dem Einfrieren von 6.4.0 zu tun ist (Auftraggeber)

1. `node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/editor_release_bauen.mjs` ausführen und `editor-release.json` mit der Datei committen. **Die heutige JSON ist vorläufig:** erzeugt mit dem Dateistand von 6.4.0 vom 09.11. (`37702e97…`, 253 952 Byte); ändert sich die Datei, schlägt der Konsistenztest in `direct_rollout_test.mjs` fehl und `direct_rollout.mjs` bricht vor jedem Netzzugriff ab.
2. Datei und JSON auf `main`, Cloudflare-Pages-Deploy abwarten; erst dann Plan, Artefakt lesen, Stufe A (Tasse), Gates, Stufe B (Jutebeutel), Beobachtung, Full. Rückweg in umgekehrter Reihenfolge, je mit dem Artefakt des zugehörigen Apply-Laufs. Gates und Grenzen: README, Abschnitt «Editor 6.4.0».
3. Ausführung nur über Actions («Run workflow»); aus der Sitzung kann `actions_run_trigger` mit HTTP 500 scheitern (nicht wiederholen, dem Besitzer «Run workflow» nennen).

## Offene Punkte und Ungemessenes

- **CI:** der Job `selbst-gestalten` holt nur ausgewählte Pfade und enthält `pod-v64-description-rollout.yml` heute nicht; der Workflow-Test überspringt sich dann sauber (nachgestellt mit einem Checkout der Sparse-Pfade ohne die Datei: 51 Tests, Exit 0). Wer ihn in der CI mitlaufen lassen will, trägt die Datei in `luxestyle-automation-tests.yml` an zwei Stellen ein (`paths:` und `sparse-checkout`); neun offene Entwürfe ändern diese Datei, darum nicht von hier.
- **Ungetestet (braucht Netz):** `planen`, `anwenden`, `planSchreiben` und die neuen Rückweg-Asset-Prüfungen im Plan laufen nur gegen den echten Shop; es gibt keine Attrappe für `https://…myshopify.com`. Der erste echte Plan-Lauf ist damit der erste Beleg (Soll: 16 Editorprodukte `geaendert=true`, drei Sperren `geaendert=false`).
- **Live-Stand der Tasse:** `updatedAt` 09.11. 06:13 UTC, Ursprung ungeklärt; die Fixture-Blöcke stammen vom 08.11. 18:13 UTC. Ein Plan mit frischem Shop-Stand ist massgebend, nicht die Fixture.
- **Rückweg der Tasse:** ein Rollback mit dem alten Artefakt von Lauf 42508762409 kann an «fremder Hash» scheitern; immer das frische Artefakt der jeweiligen Stufe benutzen.
- Safari/iOS, echtes Handy und Kaufen mit echtem Warenkorb sind weiter ungemessen; Wirkung auf Käufe unbekannt (0 von 34 Bestellungen kamen je über den Editor).
