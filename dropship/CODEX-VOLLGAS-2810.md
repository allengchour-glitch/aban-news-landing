# Codex voll Gas (28.10.2026): Aufträge, die im Repo ohne Shop-Zugang gehen

Anlass: Der Besitzer hat ChatGPT **Pro** (Wochenlimit am 28.10. abends 100 %, Rücksetzung 4. November) und die Claude-Nutzung liegt bei etwa 90 % bis Sonntag. Darum übernimmt Codex jetzt die Arbeit im Repo, Claude liest nach und führt nur aus, was Shop- oder Konto-Zugang braucht.

Marken: **GEMESSEN** = selbst nachgestellt (Befehl und Ausgabe im PR) · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft · **unbekannt**.

## Feste Regeln (gelten für jeden Auftrag, wie `dropship/CHATGPT-AUFTRAEGE-2610.md`)

1. Branch `codex/<thema>-<JJJJMMTT>`, **Draft-PR** nach `main`, nie direkt auf `main`, nie den Branch eines Claude-PRs anfassen.
2. Nur Repo, Tests, Doku. **Kein** Schreibzugriff auf Shopify, CJ, Printful, Fortura, Metricool, Meta, Stripe. `LIVE=1` nie ausführen. Neue Schreibwege nur mit Trockenlauf als Vorgabe.
3. Jede Zahl mit Befehl und Ausgabe. Ein Fund ist erst ein Fund, wenn er am echten Code **nachgestellt** ist (Testfall, der vorher rot war).
4. Vor jedem Merge-Vorschlag die Tests der berührten Module laufen lassen (`node automation/<datei>_test.mjs`), Ausgabe in den PR. **Mutationsprobe**: einen Fehler absichtlich einbauen, der Test muss rot werden.
5. **Platte und Geheimnisse:** nie das ganze Repo klonen oder kopieren (es ist über 10 GB gross), Sparse-Checkout nutzen; keine Zugangsdaten in Dateien. Test-Zeilen gehören nie in `dropship/*.jsonl`, `dropship/*.txt` oder `dropship/*ledger*`.
6. Keine Massen-Umformulierung von `CLAUDE.md`; Ergänzungen nur als eigener Abschnitt mit Datum. Schweizer Rechtschreibung («ss» statt «ß»).
7. Modell: nach Möglichkeit das stärkste, das das Wochenlimit hergibt (Besitzer: «voll Gas»); Aufwand «high» für A, B und D.

## Aufträge (nach Wert geordnet)

**A. Workflow `gmc-schaufenster.yml` härten** (erst nach Merge von PR #2791, dann Branch von `main`).
Eine unabhängige Prüfung (28.10.2026, 25 Agenten, jeder Fund einzeln gegengeprüft) bestätigte 16 Funde; der Blocker (Manifest-Commit ohne Fehlerliste) und «Freigabe auch mitten im Lauf» sind in #2791 behoben. Offen (alle klein, je mit Testfall in `automation/gmc_schaufenster_workflow_test.mjs`):
1. Schreibende Modi nur auf dem Standardzweig (`github.ref` gegen `default_branch`); Manifest-Push immer auf den Standardzweig.
2. `::error` gibt die rohe Eingabe zurück (Log-Einschleusung per Zeilenumbruch): bereinigen, Test «keine Zeile beginnt mit `::`».
3. Exit 4 im Lesemodus (Bulk besetzt) macht den Job grün, obwohl nichts geprüft wurde: Warnung oder rot.
4. Nachprüfung nur sinnvoll: nach `aufnehmen`, `zuruecksetzen`, Teillauf (`max` ≠ alle) und Exit 4 ist «Google trägt noch Produkte ausserhalb» kein Fehler (`::notice`); nur Defekt (Exit 3) und Plan-Fehler (Exit 2) bleiben rot; Nachprüfung auch nach Exit 3 im Schreiblauf.
5. Zusammenfassung: Grep-Muster um `PLAN NICHT ERLAUBT`, `WARNUNG`, `ABWAEHLEN:`, `AUFNEHMEN:`, `Google trägt` erweitern.
6. Eigenes Zeitlimit für den Lauf-Schritt (`timeout 325m`, Exit 124 wie 4 behandeln), damit das Manifest vor dem Job-Timeout committet wird.
7. `defaults.run.shell: bash`, damit Test (`-eo pipefail`) und Praxis übereinstimmen.
8. Hinweis bei fehlender Freigabe nach Datei trennen (`TAEGLICH-FREI.txt` fehlt / `FREI.txt` fehlt).
9. Doku und Workflow-Kopf: «Stopp = laufenden Lauf abbrechen UND Datei löschen»; vor einer Rücknahme prüfen, dass kein anderer Lauf wartet.

**B. Autonomie-Audit** (`dropship/AUTONOMIE-AUDIT-2810.md`): 23 Pflichtkriterien, 6 erfüllt, 14 offen, 3 unbekannt. Die drei grössten Lücken (kein dauerhafter Betreiber für Bestand/Lieferbarkeit/Preis-Wächter; «grün» heisst nicht «gearbeitet»; CJ-Lieferbarkeit nicht flächendeckend) als **Entwurf-PRs mit Tests und Trockenlauf-Vorgabe**; kein Zeitplan scharf schalten.

**C. Bewertungs-Import** (`automation/cj_reviews_import.mjs`): drei offene Fragen aus dem Stand (`uncertain` ins Ledger?, leere Zeichenketten bei der Übersetzung, 503 beim POST). Je ein Testfall, Vorschlag und Umsetzung.

**D. Bestätigte Funde abarbeiten** (`dropship/CODEX-FUNDE-2810.md`, 80 Funde, alle offen): **ein PR je Bereich**, je Fund Testfall zuerst rot, dann grün. Reihenfolge: `pod-preise` und Printful-Sync (doppelter Auftrag bei Tag-Fehler, Seitenblättern, stille Überspringung), Material (Rückgängig-Plan wird überschrieben, «Seide (Imitat)» → «Seide»), CJ-Varianten (Preisbasis, SKU-Doppelvergabe), Fortura-Sperre nur pro Rechner, Google-Feed (nur erste Variante, Handle über 50 Zeichen, GTIN-Prüfziffer).

**E. Zweitmeinung zu jedem Claude-PR** der letzten 7 Tage (Fokus: Muster ohne Wortgrenze, `seo`-Felder ersetzen statt mischen, Schleifen ohne Fortschrittsausgabe, Ledger, die Fehlschläge nie vermerken, Verdrahtung: läuft jeder Test in einem Workflow?). Befunde als PR-Kommentar mit Datei:Zeile.

## Zurück an Claude

Pro PR: eine Zeile «Fund | nachgestellt (Befehl) | Test vorher rot, nachher grün». Offene Entscheide des Besitzers (Preise, Rechtliches, Veröffentlichung, Kundenkontakt) nicht entscheiden, sondern in der PR-Beschreibung unter «Entscheid nötig» nennen.
