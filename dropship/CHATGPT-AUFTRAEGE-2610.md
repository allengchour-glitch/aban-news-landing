# ChatGPT/Codex: Auftragsliste und Empfehlung (26.10.2026)

Frage des Besitzers: «arbeite regelmässig mit ChatGPT, er soll durcharbeiten – oder soll ich kündigen?»
Marken: **GEMESSEN** = im Repo/Shop selbst nachgeprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = Eigenlob ohne Beleg.

## Empfehlung: behalten – aber nur mit Aufträgen, die Fehler finden

Beleg aus dem Repo (alles GEMESSEN, siehe CLAUDE.md «ChatGPTs Arbeit nachgeprüft» und «drei offene Entwürfe abgearbeitet»):

| Fund von ChatGPT | Wirkung |
|---|---|
| #2708 `params._meta`: der Assist-Server antwortete mit `-32602`, alle zehn Werkzeuge waren vom echten Client aus unbenutzbar | echter Blocker, behoben |
| #2673 Inhaltsprüfung (`social_queue.mjs`): stoppt kaputte Queue, doppelte IDs, Zugangsdaten in URLs **vor** dem ersten Request | übernommen (218 Tests) |
| #2694 `seoOffen`-Befund: ein Lauf hätte handgeschriebene SEO-Titel überschrieben | echter Fehler im Claude-Code, behoben |
| Schwäche: die **Verdrahtung** (Schalter ohne Workflow-Eintrag, Test läuft in keinem Workflow) | zwei stille Blocker, von Claude gefunden |

Urteil: ChatGPT findet Dinge, die der Autor nicht sieht – **ein zweites Paar Augen**, kein zweiter Bauer. Es sieht den Live-Shop nicht und darf nichts veröffentlichen. Kündigen lohnt, wenn **zwei Tagesfenster in Folge nur Dokumentation** liefern (kein gefundener Fehler, kein neuer Test). Was das Abo kostet, steht nirgends im Repo – **unbekannt**, das entscheidet der Besitzer.

## Die drei Tagesfenster (Europe/Zurich)
08–09 Uhr · 14–15 Uhr · 19–20 Uhr. Eigene Aufgabe von ChatGPT, kein Repo-Cron.

## Feste Regeln für jeden Auftrag
1. Branch `codex/<thema>-<JJJJMMTT>`, Draft-PR nach `main`, **nie** direkt auf `main`, nie den Branch eines Claude-PRs anfassen.
2. Nur Repo, Tests, Doku. **Kein** Shopify-, CJ-, Metricool-, Meta- oder Stripe-Zugriff mit Schreibrecht. Live-Posten bleibt doppelt verriegelt (`DRY_RUN=0` **und** `APPROVE_PUBLISH=1`).
3. Jede Zahl im PR mit Befehl und Ausgabe belegen. Unbekanntes heisst «unbekannt». Keine erfundenen Bewertungen, keine Marken im Kundentext.
4. Vor jedem Merge-Vorschlag: `node`-Tests der berührten Module laufen lassen und die Ausgabe in den PR schreiben.
5. Keine Massen-Umformulierung von `CLAUDE.md`; Ergänzungen nur als eigener Abschnitt mit Datum.

## Aufträge (nach Wert geordnet)

**A. Verdrahtungs-Prüfung (wertvollster Auftrag, jedes Fenster wiederholbar)**
- Alle `automation/**/*_test.mjs`, `tools/**/test_*.py`, `tools/**/*_test.mjs` auflisten und prüfen, ob **jeder** in einem Workflow unter `.github/workflows/` läuft. Fehlende Tests in `luxestyle-automation-tests.yml` eintragen (Vorbild: `seo_titel_test.mjs` lief monatelang nirgends).
- Alle `process.env.<SCHALTER>`-Gates in `automation/` gegen die Workflows prüfen (`grep -rn "<SCHALTER>" .github/workflows/`): Schalter, die ein Workflow nie setzt, sind stille Trockenläufe.
- Ergebnis als Tabelle `Datei | Schalter/Test | im Workflow? | Vorschlag`.

**B. «Stiller Skip»-Suche**
Skripte, die bei fehlenden Zugangsdaten, leerer Antwort oder 4xx/5xx mit Exitcode 0 und ohne Grund aufhören (`catch { return [] }`, `if (!x) process.exit(0)` ohne Meldung). Jeder Fund: Datei, Zeile, Szenario, Minimal-Fix + Test. Nicht ändern, was bewusst still ist (dort steht ein Kommentar).

**C. Review der Claude-PRs der letzten 7 Tage**
Gegenlesen mit Fokus: Muster ohne Wortgrenze (`/ring\b/`, `title:*SSD*`), `seo`-Felder (Shopify **ersetzt**, mischt nicht), Schleifen ohne Fortschritts-Ausgabe, Ledger, die nie Fehlschläge vermerken. Befunde als PR-Kommentar mit Datei:Zeile.

**D. Tests schärfen (Mutationsprobe)**
Zu den Modulen `lib/fakten_block.mjs`, `lib/text_prosa.mjs`, `lib/kategorien.mjs`, `lib/bewertung_rang.mjs`, `lib/option_umbenennen.mjs`: je 5 gezielte Mutationen (Wortgrenze entfernen, Vergleich drehen, Schwelle ändern) – fällt ein Test? Wo nicht: Test ergänzen.

**E. Offene Codex-Entwürfe aktuell halten**
#2689 (Doku-Übergabe) auf den neuen `main` heben; Konflikte nie mit «ours/theirs» pauschal lösen, sondern Datei für Datei.

**F. Reine Recherche mit Beleg (kein Schreiben)**
Gesetzeslage Schweiz für Produkttexte: Bezeichnung «Leder»/«Leinen»/«wasserdicht» (UWG, Textilkennzeichnung), Pflichtangaben im Online-Handel. Quellen verlinken (fedlex.admin.ch), Stand datieren.

## Prompt zum Einfügen in die geplante ChatGPT-Aufgabe
> Du arbeitest am Repo aban-news-landing. Lies zuerst `dropship/CHATGPT-AUFTRAEGE-2610.md`. Nimm den nächsten offenen Auftrag A–F, arbeite auf einem Branch `codex/<thema>-<Datum>`, belege jede Zahl mit Befehl und Ausgabe, öffne einen Draft-PR und schreibe im PR, was du gefunden hast – auch wenn es nichts war. Veröffentliche nichts, ändere nichts im Shop.
