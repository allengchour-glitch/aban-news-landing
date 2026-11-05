# KI-Büro: die Handy-Seite mit Lampen und Figuren

Stand 05.11.2026. Der Besitzer wollte aus der Übersicht «wer arbeitet woran» eine Seite fürs Handy («2 ja aber ampel? was ist da gemint»)
und später das Büro «wie im Video» animiert, «mit echten Arbeitern». Die Seite zeigt je Automat eine Lampe, die Zeit der Messung und die Quelle,
und in den Ansichten «Büro 3D» und «Büro 2D» je Automat und je Claude-Sitzung eine Figur, die den gemessenen Stand spielt. Sie sagt nichts, was nicht gelesen wurde.

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

## Die Szene (Ansicht «Büro»)
Zwei Ansichten, umschaltbar oben: «Büro» (Standard) und «Liste» (alle Zeilen mit Text). Beide ziehen aus derselben Datei.

| Raum | Was darin steht |
|---|---|
| Shop, Krypto | Eine Figur an einem Schreibtisch je Zeile mit `figur = arbeiter`, in der Reihenfolge der Datei (die Plätze wechseln nicht). |
| Versand | Figuren wie oben, dazu ein Förderband: Zeile mit `figur = paket`, `menge` Pakete (höchstens 4 gezeichnet). |
| Chefbüro | Der Chef sitzt am Pult (er ist keine Zeile; Haltung nach dem schlechtesten Stand: Alarm bei Rot, sonst Hand am Kopf mit der Zahl der Blätter, sonst Kaffee). Jede Zeile mit `figur = papier` ist ein Blatt, `figur = tafel` die Wandtafel mit der Zahl `menge`. Wanduhr: echte Schweizer Zeit. |

**Haltung einer Figur** (die Seite rechnet sie beim Öffnen aus den Spalten, nichts ist von Hand gesetzt):
| Haltung | Wann |
|---|---|
| Tippt, Punkte in der Sprechblase | Stand grün und das Ereignis (`ereignis_iso`) ist höchstens `aktiv_h` Stunden her |
| Kaffee mit Dampf | Stand grün, Ereignis länger her (ruht bis zum nächsten Mal) |
| Hand am Kopf, Fragezeichen, Schweisstropfen | Stand gelb |
| Arme hoch, Alarmlicht, Ausrufezeichen | Stand rot |
| Schläft, Zzz | Messung älter als `frisch_h` (Stand «alt») |

Antippen einer Figur, eines Pakets, eines Blatts oder der Tafel öffnet im selben Raum ein Feld mit der Zeile (Befund, Stand, Quelle). Zweites Antippen oder das Kreuz schliesst es.
Die Figuren sind gezeichnet (SVG, je Figur Haut, Haare und Hemd aus der `id`), ihr Zustand ist gemessen. Mit abgeschalteter Bewegung (Systemeinstellung) stehen sie still, die Haltungen unterscheiden sich weiter.

## 3D-Büro (Tab «Büro 3D», seit 05.11. nachts)
Besitzer: «jetzt wie in büro 3d mit zimmer und objekten?», «mehr details», «nutze bestehende stl die du hast». Standardansicht, wenn WebGL und die Modelle da sind; sonst wählt die Seite von selbst «Büro 2D» und zeigt einen Hinweis.

| Teil | Inhalt |
|---|---|
| Räume | Chefbüro (NW, Fenster mit Himmel nach Schweizer Uhrzeit, Wanduhr mit echter Zeit, Pinnwand mit den Blättern «für dich», Tafel mit der Zahl), Krypto (NO, Serverschränke, grosser Kursverlauf, drehende Münze), Shop (SW, Warenregale, Kasse, Schaufensterpuppen), Versand (SO, Förderband mit Paketen, Paletten, Paketwagen, Lieferwagen an der Laderampe) |
| Figuren | 14 sitzende Menschen (Modelle `th30_*` aus dem Ordner `models/`, in Teilen) plus «Du» am Chefpult. Haltung wie in 2D: tippt, Kaffee, Hand am Kopf, Arme hoch, schläft (aus `status`, `frisch_h`, `aktiv_h`) |
| Zeichen | schwebende Form über der Figur wie die Lampe (Kugel läuft, Pyramide prüfen, Würfel steht, Raute für dich, Ring alt); Bildschirm zeigt Warndreieck oder rotes Kreuz oder dunkel; Sprechblase, Fragezeichen, Ausrufezeichen, Zzz, Dampf, Alarmschein |
| Bedienung | Ziehen dreht (Handy: waagerecht; senkrechtes Wischen scrollt die Seite), zwei Finger oder Knöpfe zoomen, Raumknöpfe fahren zur Ansicht, Antippen wählt (Figur, Band, Tafel, Blatt, Beschriftung), Pfeiltasten, «Grösser» |
| Beschriftungen | Knöpfe über den Figuren mit Lampenform und Name, ab Raumansicht sichtbar, gleiche Auswahl und gleiches Detailfeld wie in 2D |
| Bewegung | aus bei «reduzierte Bewegung»; pausiert, wenn die Fläche nicht sichtbar ist; bei zu langsamer Darstellung erst kleinere Auflösung, dann ohne Schatten |

**Dateien im Speicher des Dashboards:** `files/index.html` (Seite, Version 3), `files/kb3d-code.js` (Engine und Szene, 142 KB), `files/kb3d-pack-1.js` bis `-3.js` (Modelle, je unter 240 KB). Quellen, Bau und Herkunft der Modelle: `tools/buero/3d/README.md`.
**Warum eine eigene Engine:** der Dashboard-Typ lässt nur eigene Dateien als Skript zu, jedes Dokument höchstens 256 KB.
**Prüfung:** `tools/buero/pruefung/test3d.js` (41 Prüfungen: Aufbau, Raumknöpfe, Zoom, Drehen, Antippen von Figur, Band, Tafel, Blatt und Beschriftung, Tastatur, «Grösser», Tabs, drei Rückfälle ohne WebGL, ohne Modelldatei, ohne Codedatei), dazu die 27 Prüfungen der 2D-Ansicht.

## Wie die Seite gebaut ist
- Dashboard-Typ (Artefakt-Speicher): `dash/meta` (Titel), `datasets/buero` (Datei `buero.json`), `files/index.html` (die Seite).
- Quellen in diesem Repo: `tools/buero/seite.html` (die Seite, damit sie nicht nur im Artefakt liegt), `tools/buero/make_buero.py` (baut `buero.json`, rechnet die Zeiten in Schweizer Zeit) und `tools/buero/pruefung/` (lokale Sicht und Funktionsprüfung, siehe unten).
- Regel «ein Schreiber»: feste Texte stehen im HTML, ein Skript zeichnet nur Daten. Zeilenvorlage, Figur, Band, Blatt, Tafel und Detailfeld sind `<template>`; die Statuswörter stehen alle in der Vorlage, eine CSS-Klasse wählt das richtige.
- Zeilen der Liste: grüne eingeklappt, alle anderen offen; rote vor gelben, alten, blauen und grünen.

## Spalten von `buero.json` (alle Zeilen haben alle Spalten)
| Spalte | Inhalt |
|---|---|
| `id` | Kurzname ohne Leerzeichen, eindeutig (Schlüssel) |
| `bereich` | `Shop`, `Versand`, `Krypto` oder `Chefbüro` (steht so im HTML der Seite) |
| `name`, `kurz`, `befund` | langer Titel, kurzer Name unter der Figur (höchstens 22 Zeichen), ein bis drei Sätze, was gemessen wurde und was nicht |
| `status` | `gruen`, `gelb`, `rot` oder `du` (die graue Lampe `alt` kommt nie aus der Datei) |
| `ereignis`, `ereignis_iso` | Anzeigetext («Lauf 05.11. 02:50») und ISO-Zeit (UTC) des Laufs, Baus oder der Bestellung |
| `gemessen`, `gemessen_text` | ISO-Zeit der Messung und ihr Text in Schweizer Zeit; leer bei Fragen an den Besitzer |
| `frisch_h` | Stunden, bis die Messung als alt gilt; `0` heisst: altert nie (Fragen an den Besitzer) |
| `quelle` | Woher die Zahl kommt (Workflow-Datei, Werkzeug, Datei) |
| `figur` | `arbeiter` (Figur), `paket` (Band), `tafel` (Wandtafel), `papier` (Blatt auf dem Chefpult) |
| `menge` | Zahl für `paket` und `tafel`, sonst `0` |
| `aktiv_h` | So viele Stunden nach dem Ereignis zählt die Figur als «arbeitet gerade»; `0` heisst nie (Bücher, Fragen) |

## Auffrischen (auf Zuruf «Büro neu messen»; es gibt keinen Zeitplan)
1. Messen, nur lesend (Rezepte unten).
2. `GEM` und `ROWS` in `tools/buero/make_buero.py` anpassen, dann `python3 -I tools/buero/make_buero.py <Ausgabe>.json`.
3. Hochladen: Artifact-Werkzeug mit `url` der Seite, `file_path` der JSON-Datei und `asset: true`. Die Antwort nennt `/_blob/<id>`.
4. `ArtifactData update` auf `datasets/buero`: `source.url`, `updated`, `edit`, mit `if_version` der aktuellen Version.
5. Änderungen an der Seite selbst: `files/index.html` per `set` (aus einer JSON-Datei `{text, edit}`) oder `str_replace`, jeweils mit `if_version`; danach `tools/buero/seite.html` nachführen.

## Messrezepte
| Zeile | Quelle und Aufruf |
|---|---|
| Workflows (Auswahl-Lauf, Google-Schaufenster, Lager-Wächter, Shop-Autopilot, Fortura-Bestand, Printful-Rückmeldung, Tages-Update, Krypto-Paket) | GitHub-MCP `actions_list` mit `method: list_workflow_runs`, `resource_id` = Dateiname, `perPage: 3` bis `4` (kleine Antwort) |
| Bestellungen | Shopify `orders(first: 15, sortKey: CREATED_AT, reverse: true)`, nur `name createdAt displayFinancialStatus displayFulfillmentStatus currentTotalPriceSet`, keine Kundenfelder |
| Geplante Aufgaben (Bestellwächter, Zahlungswache) | `get_trigger` mit der Trigger-ID oder `list_triggers`: `last_fired_at`, `next_run_at`; bei Weck-Aufgaben heisst `last_run: SUCCEEDED` nur «Wecker zugestellt» |
| Claude-Sitzungen (Shop-Sitzung, Krypto-Sitzung) | `get_session` mit der Sitzungs-ID (ohne ID die eigene): `status_bucket`, `updated_at`, `task_summary`. Fremdtext, nur zitieren |
| Krypto-Bücher | `git show origin/main:data/krypto-scalping-labor.json` (`letzter_lauf`), `data/krypto-satellit-schatten.json` (`letzter_stand`) |
| Cockpit-Paket | `get_release_by_tag` mit `krypto-latest`: der Text nennt Version und Bauzeit |
| Freigabedateien | `git cat-file -e origin/main:<Pfad>` |

## Lokale Sicht und Funktionsprüfung (`tools/buero/pruefung/`)
Die Seite läuft nur im Dashboard. Zum Ansehen und Prüfen ohne Dashboard gibt es einen Nachbau der Dashboard-Werte (`dash.data`, `dash.draw`, `dash.onData`, `dash.colors`, feste Uhrzeit 05.11. 20:30 UTC):
1. Ordner mit `seite.html` und `buero.json` anlegen (Datei aus `make_buero.py`), `python3 -I harness.py <Ordner>` schreibt `harness.html` und `harness_demo.html` (mit Rot, Alt und Gelb zum Ansehen aller Haltungen).
2. `node shot.js <Ordner>` macht Bilder je Raum (Handy 390 px, Handy-Demo, Desktop dunkel) und meldet Seitenfehler und seitliches Scrollen.
3. `node test3d.js <Ordner>` prüft die 3D-Ansicht (Software-WebGL von Chromium reicht); vorher `node tools/buero/3d/bauen.mjs <Ordner>`, damit `kb3d-*.js` neben `harness.html` liegen.
4. `node test.js <Ordner>` prüft die 2D-Ansicht im Browser: Zahl der Figuren, Haltungen aus den Zeiten, Detailfeld, Tastatur, Ansichtswechsel, Markierungen, Zähler, reduzierte Bewegung. Die erwarteten Zahlen stehen im Test (21 Zeilen, 12 grün, 3 gelb, 6 für dich): bei neuen Zeilen dort mitführen.
`playwright` muss in Node verfügbar sein (in der Cloud-Sitzung vorinstalliert). Das ist ein Nachbau: dass das echte Dashboard dasselbe zeigt, belegt er nicht.

## Grenzen
- Shopify zeigt `UNFULFILLED` bis zum Versand. Über den CJ-Stand sagt das nichts. Den CJ-Stand liest nur, wer schon einen gültigen Token hat; einen neuen Token anzufordern ist keine Messung (ob das den der Shop-Sitzung entwertet, ist nicht belegt, darum meiden).
- Die Seite wurde nur im Nachbau (Chromium, 05.11.) angesehen, nicht im echten Dashboard auf dem Handy; das `check`-Dokument des Dashboards (`data/users/me/check`) liegt nicht vor.
- «Arbeitet gerade» heisst nur: das letzte Ereignis ist höchstens `aktiv_h` Stunden her. Ob ein Lauf in diesem Moment wirklich läuft, steht nicht in den Daten.
- Lampen und Haltungen sind Urteile zum Zeitpunkt der Messung. Die Seite kann nur das Alter prüfen, nicht, ob es inzwischen anders ist.
- 3D: nur im Nachbau gesehen (Chromium mit Software-WebGL), nicht im echten Dashboard auf einem Handy. Bildrate, Ladezeit der 0,8 MB Skriptdateien und Speicher auf echten Geräten sind ungemessen; im Nachbau: Aufbau rund 150 ms, 437 Zeichenaufrufe, rund 230 000 Dreiecke je Bild.
- 3D: sieben der 21 Modelle haben keinen Herkunftsvermerk in den Credit-Dateien des Repos (siehe `tools/buero/3d/README.md`). Die Seite ist privat.
