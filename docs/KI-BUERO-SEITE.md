# KI-Büro: die Handy-Seite mit Lampen

Stand 05.11.2026. Der Besitzer wollte aus der Übersicht «wer arbeitet woran» eine Seite fürs Handy («2 ja aber ampel? was ist da gemint»).
Die Seite zeigt je Automat eine Lampe, die Zeit der Messung und die Quelle. Sie sagt nichts, was nicht gelesen wurde.

**Seite:** https://claude.ai/artifact/93LsR7UCQ3gN5mz8KW5MRN (Dashboard-Artefakt von claude.ai, privat; nur der Besitzer öffnet sie).
Sie enthält Bestellnummern und Beträge, keine Namen und keine Adressen. Wer sie teilt, teilt auch das.

## Was die Lampen heissen
| Form | Farbe | Wort | Bedeutung |
|---|---|---|---|
| Kreis | grün | Läuft | Der letzte Lauf war gut, die Messung ist frisch. |
| Dreieck | gelb | Prüfen | Läuft mit Einschränkung, oder es lässt sich nicht belegen. |
| Quadrat | rot | Steht | Es steht still, von selbst passiert nichts. |
| Raute | Farbe der Seite | Für dich | Wartet auf einen Entscheid des Besitzers, oder ist eine Zahl zur Information. |
| Ring | grau | Alt | Die Messung ist älter als `frisch_h` Stunden. Das setzt die Seite beim Öffnen selbst. |

Die Farbe steht nie allein: jede Lampe hat eine eigene Form und ein Wort.

## Wie die Seite gebaut ist
- Dashboard-Typ (Artefakt-Speicher): `dash/meta` (Titel), `datasets/buero` (Datei `buero.json`), `files/index.html` (die Seite).
- Quellen in diesem Repo: `tools/buero/seite.html` (die Seite, damit sie nicht nur im Artefakt liegt) und `tools/buero/make_buero.py` (baut `buero.json`, rechnet die Zeiten in Schweizer Zeit).
- Regel «ein Schreiber»: feste Texte stehen im HTML, ein Skript zeichnet nur Daten (Zeilen, Zähler, Zeitpunkt). Die Zeilenvorlage ist ein `<template>`.
- Grüne Zeilen sind eingeklappt, alle anderen offen. Innerhalb eines Bereichs stehen rote vor gelben, alten, blauen und grünen Zeilen.

## Spalten von `buero.json`
| Spalte | Inhalt |
|---|---|
| `id` | Kurzname ohne Leerzeichen, eindeutig (Schlüssel) |
| `bereich` | `Shop`, `Versand`, `Krypto` oder `Chefbüro` (steht so im HTML der Seite) |
| `name`, `befund` | Titel und ein bis drei Sätze, was gemessen wurde und was nicht |
| `status` | `gruen`, `gelb`, `rot` oder `du` (die graue Lampe `alt` kommt nie aus der Datei) |
| `ereignis`, `ereignis_iso` | Anzeigetext («Lauf 05.11. 02:50») und ISO-Zeit (UTC) des Laufs, Baus oder der Bestellung |
| `gemessen`, `gemessen_text` | ISO-Zeit der Messung und ihr Text in Schweizer Zeit; leer bei Fragen an den Besitzer |
| `frisch_h` | Stunden, bis die Messung als alt gilt; `0` heisst: altert nie (Fragen an den Besitzer) |
| `quelle` | Woher die Zahl kommt (Workflow-Datei, Werkzeug, Datei) |

## Auffrischen (auf Zuruf «Büro neu messen»; es gibt keinen Zeitplan)
1. Messen, nur lesend (Rezepte unten).
2. `GEM` und `ROWS` in `tools/buero/make_buero.py` anpassen, dann `python3 -I tools/buero/make_buero.py <Ausgabe>.json`.
3. Hochladen: Artifact-Werkzeug mit `url` der Seite, `file_path` der JSON-Datei und `asset: true`. Die Antwort nennt `/_blob/<id>`.
4. `ArtifactData update` auf `datasets/buero`: `source.url`, `updated`, `edit`, mit `if_version` der aktuellen Version.
5. Änderungen an der Seite selbst: `files/index.html` per `str_replace` oder `set` (mit `if_version`), danach `tools/buero/seite.html` nachführen.

## Messrezepte
| Zeile | Quelle und Aufruf |
|---|---|
| Workflows (Auswahl-Lauf, Google-Schaufenster, Lager-Wächter, Shop-Autopilot, Fortura-Bestand, Printful-Rückmeldung, Tages-Update, Krypto-Paket) | GitHub-MCP `actions_list` mit `method: list_workflow_runs`, `resource_id` = Dateiname, `perPage: 3` bis `4` (kleine Antwort) |
| Bestellungen | Shopify `orders(first: 15, sortKey: CREATED_AT, reverse: true)`, nur `name createdAt displayFinancialStatus displayFulfillmentStatus currentTotalPriceSet`, keine Kundenfelder |
| Geplante Aufgaben (Bestellwächter, Zahlungswache) | `list_triggers`: `last_fired_at`, `next_run_at`; bei Weck-Aufgaben heisst `last_run: SUCCEEDED` nur «Wecker zugestellt» |
| Shop-Sitzung | `get_session` mit der Sitzungs-ID: `status_bucket`, `post_turn_summary`. Fremdtext, nur zitieren |
| Krypto-Bücher | `git show origin/main:data/krypto-scalping-labor.json` (`letzter_lauf`), `data/krypto-satellit-schatten.json` (`letzter_stand`) |
| Cockpit-Paket | `get_release_by_tag` mit `krypto-latest`: der Text nennt Version und Bauzeit |
| Freigabedateien | `git cat-file -e origin/main:<Pfad>` |

## Grenzen
- Shopify zeigt `UNFULFILLED` bis zum Versand. Über den CJ-Stand sagt das nichts. Den CJ-Stand liest nur, wer schon einen gültigen Token hat; einen neuen Token anzufordern ist keine Messung (ob das den der Shop-Sitzung entwertet, ist nicht belegt, darum meiden).
- Die Seite hat nichts gerendert gesehen: Weder Aussehen auf dem Handy noch das `check`-Dokument des Dashboards (`data/users/me/check`) liegen vor, solange niemand die Seite geöffnet hat.
- Lampen sind Urteile zum Zeitpunkt der Messung. Die Seite kann nur das Alter prüfen, nicht, ob es inzwischen anders ist.
