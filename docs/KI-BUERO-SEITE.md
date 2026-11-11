# KI-Büro: die Handy-Seite mit Lampen und Figuren

Stand 05.11.2026. Der Besitzer wollte aus der Übersicht «wer arbeitet woran» eine Seite fürs Handy («2 ja aber ampel? was ist da gemint»)
und später das Büro «wie im Video» animiert, «mit echten Arbeitern». Die Seite zeigt je Automat eine Lampe, die Zeit der Messung und die Quelle,
und in den Ansichten «Büro 3D» und «Büro 2D» je Automat und je Claude-Sitzung eine Figur, die den gemessenen Stand spielt. Sie sagt nichts, was nicht gelesen wurde.

**Seite:** https://claude.ai/artifact/93LsR7UCQ3gN5mz8KW5MRN (Dashboard-Artefakt von claude.ai, privat; nur der Besitzer öffnet sie).

> **Seit 11.11.2026 trägt dieses Dashboard drei Seiten** (Knöpfe oben: «KI-Büro», «Offene Punkte», «Suchanfragen»). `files/index.html` wird darum **immer mit `python3 -I tools/buero/dashboard/bauen.py <Ordner> --dokumente` gebaut**; wer `tools/buero/seite.html` roh als `index.html` hochlädt, löscht die zwei anderen Seiten. Anleitung: `tools/buero/dashboard/README.md`, Abschnitt unten «Drei Seiten in einem Dashboard».
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
> **Stand 10.11.2026:** Räume, Kamera und Zentralmonitor sind seit Design 14 neu angelegt (sieben grosse Pavillons mit je einem Liveboard): siehe den Abschnitt «Liveboards und grössere Räume» weiter unten. Die Tabelle beschreibt den Aufbau vom 05.11.
Besitzer: «jetzt wie in büro 3d mit zimmer und objekten?», «mehr details», «nutze bestehende stl die du hast». Standardansicht, wenn WebGL und die Modelle da sind; sonst wählt die Seite von selbst «Büro 2D» und zeigt einen Hinweis.

| Teil | Inhalt |
|---|---|
| Räume | Chefbüro (NW, Fenster mit Himmel nach Schweizer Uhrzeit, Wanduhr mit echter Zeit, Pinnwand mit den Blättern «für dich», Tafel mit der Zahl), Krypto (NO, Serverschränke, grosser Kursverlauf, drehende Münze), Shop (SW, Warenregale, Kasse, Schaufensterpuppen), Versand (SO, Förderband mit Paketen, Paletten, Paketwagen, Lieferwagen an der Laderampe) |
| Figuren | 14 sitzende Menschen (Modelle `th30_*` aus dem Ordner `models/`, in Teilen) plus «Du» am Chefpult. Haltung wie in 2D: tippt, Kaffee, Hand am Kopf, Arme hoch, schläft (aus `status`, `frisch_h`, `aktiv_h`). Schultern und Ellbogen sind aufgehellt (Besitzer 05.11.: «elbogen und schulter mache personen heller»): Punkte von Rumpf und Armen nahe den Gelenken bekommen bis +60 % Licht, damit Arme bei dunkler Haut nicht im eigenen Schatten verschwinden (`K.jointLift` in `kb3d-figur.js`) |
| Zeichen | schwebende Form über der Figur wie die Lampe (Kugel läuft, Pyramide prüfen, Würfel steht, Raute für dich, Ring alt); Bildschirm zeigt Warndreieck oder rotes Kreuz oder dunkel; Sprechblase, Fragezeichen, Ausrufezeichen, Zzz, Dampf, Alarmschein |
| Bedienung | Ziehen dreht (Handy: waagerecht; senkrechtes Wischen scrollt die Seite), zwei Finger oder Knöpfe zoomen, Raumknöpfe fahren zur Ansicht, Antippen wählt (Figur, Band, Tafel, Blatt, Beschriftung), Pfeiltasten, «Grösser» |
| Beschriftungen | Knöpfe über den Figuren mit Lampenform und Name, ab Raumansicht sichtbar, gleiche Auswahl und gleiches Detailfeld wie in 2D |
| Bewegung | aus bei «reduzierte Bewegung»; pausiert, wenn die Fläche nicht sichtbar ist; bei zu langsamer Darstellung erst kleinere Auflösung, dann ohne Schatten |

**Dateien im Speicher des Dashboards:** `files/index.html` (Seite, Version 3), `files/kb3d-code.js` (Engine und Szene, 142 KB), `files/kb3d-pack-1.js` bis `-3.js` (Modelle, je unter 240 KB). Quellen, Bau und Herkunft der Modelle: `tools/buero/3d/README.md`.
**Warum eine eigene Engine:** der Dashboard-Typ lässt nur eigene Dateien als Skript zu, jedes Dokument höchstens 256 KB.
**Prüfung:** `tools/buero/pruefung/test3d.js` (Aufbau, Raumknöpfe, Zoom, Drehen, Antippen von Figur, Band, Tafel, Blatt und Beschriftung, Tastatur, «Grösser», Tabs, drei Rückfälle ohne WebGL, ohne Modelldatei, ohne Codedatei, dazu Arbeitsort, Schilder und Fremdlinks), dazu `test.js` für die 2D-Ansicht. Zahlen: siehe Ausgabe beider Skripte (`ALLES OK`).

## Arbeitsort («Wo sie wirklich laufen», seit 05.11. spät)
Besitzer: «echter arbeiteisort». Auf Rückfrage gewählt: jede Figur zeigt den Ort, an dem sie wirklich läuft, im Detailfeld und als kleines Schild am Schreibtisch, mit Link zum echten Ort, wo es einen gibt. Keine Umräumung der Räume.

| Art (`ort_art`) | Schild und Kürzel | Heisst |
|---|---|---|
| `cloud` | blaue Wolke, «GitHub» (oder «GitHub + PC») | läuft in der GitHub-Cloud (Actions, Datei und Zeitplan stehen im Detailfeld) |
| `claude` | orange Sprechblase, «Claude» | eine Claude-Sitzung oder geplante Aufgabe der Plattform; eine Sitzung arbeitet nur, solange sie offen ist |
| `pc` | graues Gerät, «Dein PC» | läuft auf dem Windows-PC des Besitzers oder braucht dort einen Handgriff |
| `shop` | grüne Tasche, «Shopify» | steht im Shopify-Admin |
| `du` | violette Figur, «Bei dir» | das entscheidet der Besitzer |

- **Wo es zu sehen ist:** Schild auf dem Tisch jeder der 14 Figuren (nicht am Chefpult), Ortskürzel hinter dem Namen jeder Beschriftung (nicht bei «Du»), Zeile «Arbeitsort» und, wenn es einen echten Ort gibt, Zeile «Zum Ort» im Detailfeld (2D, 3D und Liste gleich).
- **Quelle der Orte:** `.github/workflows/*.yml` (Zeitpläne in UTC), die geplanten Aufgaben der Plattform (`list_triggers`), `CLAUDE.md` und `docs/KRYPTO-AUTONOMIE.md`; in `make_buero.py` (Tabelle `ORTE`) mit `pruefen()` abgesichert (Art, Länge, nur https).
- **Links (`link`):** Seiten der Workflows (`…/actions/workflows/<Datei>.yml`, also die Lauf-Liste, nicht ein einzelner Lauf), die Sitzungen (`claude.ai/code/session_…`, öffnen nur beim Besitzer), `admin.shopify.com/store/au3j0y-hq/orders` und `/themes`, die Secrets-Seite des Repos. **Kein Link** bei `bestellwaechter` (geplante Aufgabe ohne eigene Seite), `zip`, `cockpitstart`, `geld`.
- **Link-Regeln der Seite (Fremdtext aus den Daten):** nur `https`, nur die Hosts `github.com`, `claude.ai` und `admin.shopify.com`, keine Anmeldedaten und kein Port in der Adresse; sonst keine Link-Zeile. Öffnet in neuem Fenster (`noopener noreferrer`). Das sichtbare Wort steht fest im HTML («In GitHub öffnen», «In Claude öffnen», «Im Shopify-Admin öffnen»), eine CSS-Klasse wählt es.
- **Schild-Textur:** `T.ortSchild(art, kürzel)` zeichnet Symbol und Kürzel zur Laufzeit (256×128), je Art und Kürzel einmal; Plätze, die zur Kamera schauen (Versand, vordere Reihe in Shop und Krypto), tragen es vorn in der Mitte vor dem Bildschirm, Plätze mit dem Rücken zur Kamera (hintere Reihe in Shop und Krypto) seitlich am Tischrand.
- **Geprüft (nur im Nachbau):** `test3d.js` und `test.js` prüfen Kürzel an 21 Beschriftungen, Schilder an 14 Plätzen mit drei verschiedenen Tafeln, Schild im Bild (Pixelvergleich mit und ohne), Detailfeld mit Ort, Link und Wort für GitHub, Claude und Shopify, die Fälle ohne Link und 14 Fremdlinks (`javascript:`, `http:`, fremder Host, Host als Unterseite, Anmeldedaten, Port, leer, Zahl, …). Mutationsprobe der neuen Prüfungen: 11 absichtliche Fehler, 10 erkannt (der überlebende betrifft nur die Lage der Schilder an den Plätzen mit dem Rücken zur Kamera).
- **Ungemessen:** wie die Schilder auf einem echten Handy aussehen. Im Nachbau sind sie in der Raumansicht und beim Hineinzoomen lesbar, in der Gesamtansicht zu klein (die Beschriftungen mit dem Kürzel erscheinen erst ab Raumansicht). Ob die Links im echten Dashboard aufgehen (der Rahmen der Seite kann neue Fenster sperren) und ob der Link der Sitzung im Handy-Browser mit dem Konto des Besitzers sofort öffnet, ist nicht geprüft.

## Wie die Seite gebaut ist
- Dashboard-Typ (Artefakt-Speicher): `dash/meta` (Titel), `datasets/buero` (Datei `buero.json`), `files/index.html` (die Seite). Seit 11.11.: dazu `datasets/offen` und sieben Datensätze der Suchanfragen sowie `files/lx-offen.css|js` und `files/lx-suche.css|js`; `files/index.html` enthält die Büro-Seite unverändert als ersten von drei Abschnitten.
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
| `ort_art` | `cloud`, `claude`, `pc`, `shop` oder `du` (bestimmt Symbol und Farbe des Schilds) |
| `ort`, `ort_kurz` | der echte Arbeitsort als kurzer Satzteil; Kürzel für Schild und Beschriftung (höchstens 11 Zeichen) |
| `ort_text` | wo und wann es wirklich läuft (Datei, Zeitplan in UTC, Einschränkung), höchstens 260 Zeichen |
| `link` | `https`-Adresse des echten Ortes (GitHub, Claude oder Shopify-Admin) oder leer |

## Auffrischen (auf Zuruf «Büro neu messen»; seit 08.11. mit Messhelfern)
1. `python3 -I tools/buero/messen.py messung.json` liest ohne Anmeldung die GitHub-Läufe (zwölf Abläufe, darunter Tagespflege und Bewertungsimporter), das Release des Cockpit-Pakets, die Krypto-Bücher und die Freigabedateien (rund 15 Anfragen; anonym sind 60 je Stunde erlaubt).
2. Was nur Plattform-Werkzeuge messen, schreibt die Sitzung in `mcp.json` (Format im Kopf von `aktualisieren.py`): Bestellungen (Shopify), geplante Aufgaben (`get_trigger`), Sitzungen (`get_session`). Metricool: `getScheduledPosts` für die nächsten sieben Tage zählt die Planungseinträge, `getAnalyticsDataByMetrics` mit `IGEV01` gibt die Instagram-Follower (letzter Tageswert). Beides geht in `metricool.json` im festen Kurzformat (`version, gemessen, zeitraum, geplante_eintraege, instagram_follower, instagram_stand, kanaele`; `make_buero.py` lehnt jede andere Form ab, Rohdaten kommen nie in die Datei).
3. `python3 -I tools/buero/aktualisieren.py messung.json mcp.json werte.json` macht Lampen, Zeiten und die Sätze «Letzte Läufe …»: Lauf erfolgreich = grün, fehlgeschlagen = rot, sonst gelb. Fortura bleibt gelb, solange `dropship/FORTURA-BESTAND-FREI.txt` fehlt. Der Bewertungsimporter bleibt gelb, weil ein erfolgreicher Lauf nichts über veröffentlichte Bewertungen sagt (Vorgabe der Codex-Übergabe). Die Seitenpflege bleibt ein Blatt «für dich», ausser sie schlägt fehl.
4. `python3 -I tools/buero/web_zeilen.py web_zeilen.json` holt die Zeilen des Entwickler- und des YouTube-Studios aus der öffentlichen Webansicht (https://abannews.com/ki-buero): ihre Berichte entstehen nur in der Cloud und sind ohne Anmeldung nicht herunterladbar. Bricht der Aufruf ab (Seitenaufbau geändert), bleiben diese Zeilen auf dem Stand von `make_buero.py`.
5. `python3 -I tools/buero/make_buero.py buero.json --metricool-status metricool.json --web-zeilen web_zeilen.json --werte werte.json`. Zeilen, die `werte.json` nicht nennt, behalten Text und alte Messzeit; die Seite setzt sie von selbst auf «Alt».
6. Hochladen: Artifact-Werkzeug mit `url` der Seite, `file_path` der JSON-Datei und `asset: true` (Antwort: `/_blob/<id>`). Dann EINE `ArtifactData batch`-Anfrage (atomar, höchstens 1 MiB): `files/kb3d-code.js` (set), `datasets/buero` (update von `source.url`, `updated`, `edit`), `files/kb-geldmanager.js` und `files/index.html` (set), jeweils mit `if_version` der aktuellen Version (ein falscher Wert nennt die richtige). Die Dokumente `{text, edit}` baut ein kleines Skript aus dem Bauordner (`node tools/buero/3d/bauen.mjs <Ordner>` liefert `kb3d-*.js`; `geldmanager.js` kopieren). **`files/index.html` ist seit 11.11. nicht mehr `seite.html`, sondern das Ergebnis von `python3 -I tools/buero/dashboard/bauen.py <Ordner> --dokumente`** (Datei `dok/index.html.json`, dazu `dok/lx-*.json`, wenn sich die Seiten «Offene Punkte» oder «Suchanfragen» geändert haben); vorher `python3 -I tools/buero/dashboard/test_bauen.py`. Die drei Modell-Pakete `kb3d-pack-1..3.js` sind zusammen rund 670 KB und gehen in eine eigene Anfrage, nur wenn sie sich ändern.

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
| Metricool (Social Media) | `getScheduledPosts` (`brandId` 6227837, `timezone` Europe/Zurich, nächste sieben Tage; Entwürfe tragen `draft: true`) und `getAnalyticsDataByMetrics` mit `IGEV01` (Instagram-Follower, `LAST`); Antworten sind gross, nur die Zahlen übernehmen |

## Lokale Sicht und Funktionsprüfung (`tools/buero/pruefung/`)
Die Seite läuft nur im Dashboard. Zum Ansehen und Prüfen ohne Dashboard gibt es einen Nachbau der Dashboard-Werte (`dash.data`, `dash.draw`, `dash.onData`, `dash.colors`, Uhrzeit: zwei Minuten nach der jüngsten Messung der Daten, so ändert sich der Prüfstand nicht mit jeder Auffrischung):
1. Ordner mit `seite.html` und `buero.json` anlegen (Datei aus `make_buero.py`), `python3 -I harness.py <Ordner>` schreibt `harness.html` und `harness_demo.html` (mit Rot, Alt und Gelb zum Ansehen aller Haltungen).
2. `node shot.js <Ordner>` macht Bilder je Raum (Handy 390 px, Handy-Demo, Desktop dunkel) und meldet Seitenfehler und seitliches Scrollen.
3. `node test3d.js <Ordner>` prüft die 3D-Ansicht (Software-WebGL von Chromium reicht); vorher `node tools/buero/3d/bauen.mjs <Ordner>`, damit `kb3d-*.js` neben `harness.html` liegen.
4. `node test.js <Ordner>` prüft die 2D-Ansicht im Browser: Zahl der Figuren, Haltungen aus den Zeiten, Detailfeld, Tastatur, Ansichtswechsel, Markierungen, Zähler, reduzierte Bewegung. Die erwarteten Zahlen rechnet der Test aus den Daten der Seite (`window.__ROWS`: Zeilen, Farben, Blätter), sie stehen nicht mehr fest im Test.
5. `node rauchprobe.js <Ordner> <Bilderordner>` (Stand 08.11., für die Fassung `campus-einheitlich-7`): Seitenfehler, Figuren je Bereich gegen die Zeilen der Daten, Liste, 3D-Fläche, seitliches Scrollen; schreibt je ein Bild der 2D- und der 3D-Ansicht für Handy und Desktop. **`test.js` und `test3d.js` stammen aus der Fassung vom 05.11. und passen nicht mehr zu der Seite vom 08.11.:** sie erwarten feste Zahlen (Shop mit 6 Figuren, Band mit 3 Paketen) und den alten Aufbau des Detailfeldes und schlagen schon auf den Standarddaten von `make_buero.py` fehl (geprüft 08.11.). Bis sie nachgezogen sind, gilt die Rauchprobe.
6. `node test_liveboard.js <Ordner>` (Stand 10.11., Design 14): 39 Prüfungen zu Raumgrösse, Gassen, Abständen der Schreibtische, Liveboards (Lage an der Nordwand, Grösse, Zeilen, Zähler, Sonderzahlen, Uhr, Bildinhalt), Aktualisierung (kein Neuzeichnen bei gleichen Daten), Klick auf jedes Brett, Kamera hin und zurück, Raumwechsel, Escape, Knopf «Liveboard», Textfassung und Aufwand. Alle Erwartungen rechnet der Test aus den Daten der Seite. Er läuft mit «reduzierte Bewegung», damit die Software-Grafik nicht dauernd belegt ist.
7. `python3 -I mutation_liveboard.py <buero.json>`: Mutationsprobe zu Nr. 6 (23 absichtliche Fehler in Kopien der Quellen; die Ausgangslage muss grün sein). Ergebnis: 23 von 23 erkannt, 0 überlebt (Lauf 10.11., rund 40 Sekunden je Mutant).
`playwright` muss in Node verfügbar sein (in der Cloud-Sitzung vorinstalliert). Das ist ein Nachbau: dass das echte Dashboard dasselbe zeigt, belegt er nicht.

## Grenzen
- Shopify zeigt `UNFULFILLED` bis zum Versand. Über den CJ-Stand sagt das nichts. Den CJ-Stand liest nur, wer schon einen gültigen Token hat; einen neuen Token anzufordern ist keine Messung (ob das den der Shop-Sitzung entwertet, ist nicht belegt, darum meiden).
- Die Seite wurde nur im Nachbau (Chromium, 05.11.) angesehen, nicht im echten Dashboard auf dem Handy; das `check`-Dokument des Dashboards (`data/users/me/check`) liegt nicht vor.
- «Arbeitet gerade» heisst nur: das letzte Ereignis ist höchstens `aktiv_h` Stunden her. Ob ein Lauf in diesem Moment wirklich läuft, steht nicht in den Daten.
- Lampen und Haltungen sind Urteile zum Zeitpunkt der Messung. Die Seite kann nur das Alter prüfen, nicht, ob es inzwischen anders ist.
- 3D: nur im Nachbau gesehen (Chromium mit Software-WebGL), nicht im echten Dashboard auf einem Handy. Bildrate, Ladezeit der 0,8 MB Skriptdateien und Speicher auf echten Geräten sind ungemessen; im Nachbau: Aufbau rund 150 ms, 437 Zeichenaufrufe, rund 230 000 Dreiecke je Bild.
- Arbeitsort: Zeitpläne (UTC) stammen aus den Workflow-Dateien und den geplanten Aufgaben zum Messzeitpunkt 05.11.; wer sie ändert, ändert die Zeile in `ORTE` mit. GitHub-Zeitpläne starten hier oft Stunden später als eingetragen (gemessen: `tages-update.yml` rund 7 bis 8 Stunden Verzug), der Ort stimmt, die Uhrzeit nicht auf die Minute.
- Arbeitsort: der Link zeigt auf die Lauf-Liste des Workflows, nicht auf den einzelnen Lauf, und auf die Sitzung, nicht auf deren Stand.
- Arbeitsort: die Kürzel machen die Beschriftungen breiter. Gemessen auf dem Handy (390 px) überdecken sich die Beschriftungen in der Versand-Ansicht zu 19 % der Fläche ohne und 26 % mit Kürzel (Chefbüro 27 und 29 %), auf Tablet und Desktop kaum. Wird es dem Besitzer zu eng, genügt `.kb3-ort { display: none; }` in `seite.html`; Schild und Detailfeld bleiben.
- 3D: sieben der 21 Modelle haben keinen Herkunftsvermerk in den Credit-Dateien des Repos (siehe `tools/buero/3d/README.md`). Die Seite ist privat.

## Gestaltung und Steuerung vom 07.11.2026 (GitHub-Entwurf)

Die Quellen enthalten wärmere Materialien, feinere Gesichter und einen offenen Social-Media-Anbau vor dem Shop mit drei Arbeitsplätzen, Ringlicht und Sitzecke. Der Raum ist über «Social Media» erreichbar und auch in 2D und Liste enthalten. Für die private Claude-Seite ist eine gesonderte Übertragung erforderlich; diese Änderungen sind dort noch nicht veröffentlicht.

- «Verschieben» + Ziehen bewegt den Bildausschnitt in der Bildebene; «Drehen» + Ziehen dreht wie bisher. Richtungsknöpfe verschieben ebenfalls. Umschalt + Ziehen, rechte/mittlere Maustaste und Umschalt + Pfeiltasten verschieben unabhängig vom Modus.
- Zwei Finger verschieben über ihren Mittelpunkt und zoomen über ihren Abstand. Innerhalb der Zeichenfläche übernimmt die Seite die Gesten; zum Scrollen außerhalb der Fläche wischen. «Zurück» und Raumknöpfe setzen den Ausschnitt zurück.
- QUELLE: `.github/workflows/social-meta-autopost.yml`, `pinterest-publish.yml` und `linkedin-autopost.yml`, gelesen am 07.11.2026. Die Zeitpläne sind auskommentiert; Handstart ist vorgesehen. Neue Zeilen stehen gelb auf «Prüfen», mit «Keine Laufmessung». Kontoverbindung, letzter Lauf und Beiträge wurden nicht gemessen. Das ist keine Auffrischung der bisherigen Messungen vom 05.11.
- Dashboard-Übertragung: zuerst das gebaute `files/kb3d-code.js`, dann die neue `buero.json` als Quelle von `datasets/buero`, zuletzt `seite.html` als `files/index.html`, jeweils mit aktuellen Versionswächtern. [Seit 11.11. überholt: `files/index.html` baut `tools/buero/dashboard/bauen.py`, nie `seite.html` roh hochladen.] Modellpakete bleiben unverändert. Die Datenquelle wird benötigt, damit die drei neuen Figuren zu sehen sind.

## Entwicklerbüro und erstes Produkt vom 07.11.2026 (Entwurf)

Ein zweiter offener Anbau vor dem Versand enthält die Stationen «Produktbau», «Prüfstand» und «Verkaufsunterlagen». Der Raum ist in 3D, 2D und Liste enthalten. Erstes Produkt: der lokale Anfragen-Assistent für Schweizer Handwerks- und Dienstleistungsbetriebe, unter `tools/entwicklerbuero/`.

`werkstatt.py <neuer Ausgabeordner>` führt die Produkttests aus, erzeugt eine Demo aus erfundenen Anfragen und paketiert ausgewählte Produktdateien. Ein fehlgeschlagener Test gibt kein ZIP frei. Der Bericht `status.json` lässt sich mit `make_buero.py <Ausgabe>.json --werkstatt-status <Bericht>` übernehmen. Ohne Bericht sind alle drei Stationen ungeprüft gelb. Mit Bericht werden nur tatsächlich abgeschlossene Schritte grün; das Angebot bleibt ein Entscheid für den Besitzer. Nach 24 Stunden altert dieser Stand. `aktiv_h=0`: Die Figuren behaupten zu keinem Zeitpunkt, im Hintergrund zu arbeiten.

Der Assistent nutzt feste Wortregeln und Antwortvorlagen, kein Sprachmodell. Die erste Version verarbeitet CSV und sendet nichts. E-Mail-/CRM-Anbindung, Pilotkunde, Preis und Verkaufskanal sind offen. Der Ablauf startet auf Befehl; selbständige Produktentwicklung, laufender Agent und automatische Verkäufe sind nicht eingerichtet. Projekt und Pilotvorgehen: `tools/entwicklerbuero/PROJEKT.md`.


### E-Mail-Beantworter Version 0.2.0

Das erste Produkt ist zum E-Mail-Beantworter konkretisiert: `email_antworter.py` liest lokal gespeicherte EML-Dateien und erzeugt ungesendete Antwortdateien. Die Werkstatt führt Produkttests sowie eine EML-Demo aus und nimmt die E-Mail-Dateien ins Lieferpaket auf. Der Bürobericht beschreibt weiter nur diesen lokalen Durchlauf. Ein Postfachanbieter, eine Kontoverbindung und automatischer Versand sind noch nicht eingerichtet.


## Neue Charaktermodelle vom 07.11.2026 (GitHub-Entwurf)

Die bisherigen `th30_*`-Menschen werden durch eigene runde Figuren mit grösseren Köpfen, Augen mit Iris und Lichtpunkten, Nase, Ohren, Frisuren, weicheren Armen und Händen ersetzt. Die neuen Modelle verwenden weiterhin die bestehenden Gelenke und alle fünf Statushaltungen. Die Abbildung ist stilisiert, kein Abbild realer Beschäftigter. Quellen und Grenzen: `tools/buero/3d/README.md`, Abschnitt «Neue Figuren». In Claude noch nicht veröffentlicht; die Übertragung braucht das neu gebaute `files/kb3d-code.js`.


### Arme mit weicheren Übergängen

Auf Wunsch des Besitzers sind die kugelartigen Schulter- und Ellbogenteile durch durchgehende Ärmelprofile ersetzt. Die Handfläche ist schmaler und trägt Daumen und angedeutete Finger. Oberkörper und Schulteranschluss sind durchgehend geformt; die Aufhellung der Gelenke beträgt höchstens 21 Prozent. Die fünf Haltungen wurden in der lokalen Modellgalerie angesehen. Aktualisierung wiederum über `files/kb3d-code.js`; keine neue Messung und keine Übertragung nach Claude erfolgt.

## Arbeitsübersicht und tägliche Pflege

Über den Ansichten stehen Arbeitskarten für Tagespflege, Google/Bing und den bestehenden Verbesserungsablauf. Jede Datenzeile hat zusätzlich «Nächster Schritt», einen Arbeitslink und eine Erklärung zur Wirkung. Ein Link öffnet das Werkzeug; er löst keinen Workflow aus. In GitHub muss zum Handstart zusätzlich «Run workflow» geklickt werden. Der bestehende Verbesserungsablauf kann HTML ändern und einen Telegram-Bericht senden; sein alter Zeitplan bleibt pausiert.

### Täglicher Ablauf

`buero-tagespflege.yml` wird nach Übernahme über den bestehenden Tageslauf `tages-update.yml` (04:15 UTC; tatsächlicher Start kann später sein) aufgerufen. Es wird kein zusätzlicher Cron angelegt. Die Pflege prüft lokale, in der Sitemap genannte HTML-Dateien auf Titel, Beschreibung, Canonical und noindex. Fehlende Dateien gelten als nicht prüfbar, insbesondere in einem unvollständigen Checkout. Live-HTTP und der Suchindex werden damit nicht geprüft. Der Bericht nennt konkrete nächste Schritte. Inhalte werden nicht automatisch umgeschrieben oder veröffentlicht.

GitHub-Laufstände werden nur für die ausdrücklich zugeordneten Workflows auf `main` gelesen. Ein Workflow-Ergebnis bestätigt keine Bestelldaten, Lagerzahlen oder privaten Krypto-Bücher. Auskommentierte Zeitpläne bleiben auch nach einem erfolgreichen Handlauf gelb. Fehlgeschlagene Abrufe machen alte Angaben nicht frisch. Bei 403 oder 429 stoppen weitere GitHub-Abfragen dieses Durchgangs.

Die Artefakte des Laufs enthalten `bericht.md`, `pflege.json` und `github-buero.json`. Der letzte Export enthält nur GitHub-Zeilen und die Seitenpflege, keine Bestellungen, Beträge oder privaten Sitzungen. Für das vollständige private Büro kann der Besitzer den Bericht lokal in die vorhandene Datei übernehmen:

```bash
python3 -I tools/buero/make_buero.py /tmp/buero-neu.json --pflege-status /pfad/pflege.json
```

Die Datenquelle des privaten Claude-Artefakts ist weiterhin gesondert zu aktualisieren. Ohne authentifizierte Verbindung zu diesem Speicher ist eine vollständige Ein-Klick-Aktualisierung direkt aus Claude noch nicht möglich. GitHub-Artefakte allein aktualisieren die private Seite nicht.

### Suchmaschinen einmalig einrichten

Google wird über die vorhandene Sitemap und Search Console bedient. In `robots.txt` wird die Sitemap bereits genannt. Die allgemeine Google Indexing API ist für JobPosting bzw. bestimmte Livestream-Seiten vorgesehen und wird hier nicht für normale Webseiten eingesetzt.

Für IndexNow braucht der Besitzer `INDEXNOW_KEY` als GitHub-Secret und eine UTF-8-Datei `https://abannews.com/<Schlüssel>.txt` mit demselben Inhalt auf der veröffentlichten Website. Die Pflege prüft diese Datei vor einer Meldung. Ohne Einrichtung wird nichts gesendet. Nur neue oder tatsächlich geänderte, lokale Canonical-Seiten ohne noindex werden gemeldet, höchstens 100 je Lauf. Ein Cache merkt bestätigte Dateihashes; tägliche Cache-Löschung kann eine erneute Meldung auslösen. Unveränderte Seiten werden nicht absichtlich täglich erneut gemeldet. Gelöschte Seiten werden in dieser Fassung nicht gemeldet.

HTTP 200 bedeutet «gemeldet», nicht «indexiert». Bei 202 bleibt die Schlüsselprüfung offen, bei Fehlern oder Drosselung wird nichts als bestätigt gespeichert und in diesem Durchgang nicht erneut gesendet. Ohne `--melden` bleibt das Werkzeug ein lokaler Trockenlauf. Meldungen aus dem GitHub-Workflow sind auf `main` beschränkt. Laufstände, IndexNow-Meldung und tatsächliche Indexaufnahme werden getrennt dargestellt.

Quellen: [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart), [Google Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [IndexNow-Protokoll](https://www.indexnow.org/documentation).


### Automatische Google-Sitemap-Meldung

Optional meldet die Pflege die veröffentlichte Sitemap über die Search Console API. Dazu braucht `GOOGLE_SEARCH_CONSOLE_CREDENTIALS` in GitHub den JSON-Zugang eines Dienstkontos mit Zugriff auf die bestätigte Domain-Property `sc-domain:abannews.com`; die Search Console API muss für dessen Projekt aktiviert sein. Der Zugang wird nicht im Quelltext, Frontend oder Bericht gespeichert. Der Workflow installiert bei eingerichtetem Google-Zugang `google-auth[requests]` (Version 2) und erzeugt ein kurzlebiges Token ausschließlich mit dem Webmasters-Scope.

Vor einer Meldung muss die live geladene Sitemap exakt der geprüften Sitemap entsprechen. Bei abweichender Veröffentlichung wird ausgesetzt. Ein Hash aus Sitemap und geprüften HTML-Dateien verhindert absichtliche Wiederholungen ohne Änderung. Ein erfolgreicher PUT an `sitemaps.submit` bestätigt nur die Übermittlung; eine Indexaufnahme wird nicht behauptet. Ohne Zugang, im Trockenlauf oder bei API-Fehlern wird keine erfolgreiche Meldung gespeichert. Die erste Nutzung mit einem echten Dienstkonto ist noch nicht erfolgt.

Referenzen: [Search Console sitemaps.submit](https://developers.google.com/webmaster-tools/v1/sitemaps/submit), [Google Service-Account-Bibliothek](https://google-auth.readthedocs.io/en/latest/reference/google.oauth2.service_account.html).


### Aktivierung und erster Prüflauf

Die Arbeitszentrale und die Tagespflege sind mit PR #2913 nach `main` übernommen. Nach Änderungen am Pflegewerkzeug oder Büro-Generator erzeugt der Workflow zusätzlich einen ersten Bericht auf `main`; dieser Push-Lauf ist immer ein Trockenlauf für Suchmaschinen. Er prüft die echte GitHub-Anbindung, veröffentlicht keine Antworten und startet den bestehenden Tageslauf nicht von Hand. Tägliche Suchmaschinen-Meldungen bleiben an die einmalig eingerichteten Zugänge gebunden. Ohne geladenen Bericht sagt die Seitenpflege ausdrücklich «Kein Durchlauf geladen» und behauptet keinen Betriebsstand.

### Öffentliche Statusverbindung des Entwicklerbüros

Der Seitenbau startet `tools/buero/projektstatus.py`: Werkstatt und Selbsttests laufen neu, erfolgreiche Lieferpakete werden geprüft. Nur die drei Entwicklerstationen Produktbau, Prüfstand und Verkaufsunterlagen werden in die öffentliche Webansicht übernommen. Projektfortschritt wird aus den vorhandenen Paketen neu abgeleitet; beliebige Zusatzfelder und Projekttexte aus Berichten werden verworfen. Konto-, Kunden- und Sitzungsdaten werden nicht exportiert. Bei fehlenden oder ungültigen Belegen bleiben Schritte offen; ein fehlgeschlagener Test darf keinen abgeschlossenen Bau bestätigen.

`/buero-projektstatus.json` liefert denselben begrenzten Stand. Die geöffnete Webansicht fragt bei Sichtbarkeit alle fünf Minuten nach und übernimmt nur neuere Berichte für diese drei Stationen. Nach 24 Stunden wird ein Stand als alt angezeigt. Ein Netzfehler löscht keinen vorherigen Messbeleg und macht ihn nicht frischer. Der Hauptseiten-Deploy wird nach abgeschlossenen Hauptzweig-Läufen der Büro-Zentrale ausgelöst, die alle sechs Stunden geplant sind; zusätzlich bleibt der tägliche Veröffentlichungslauf bestehen. Zeitpläne können verzögert werden.

Diese Verbindung liefert Projektbau- und Teststatus. Sie verbindet keine Kundenpostfächer, Kommentar-APIs oder Kontosteuerung mit der öffentlichen Seite. Übrige Stationen ohne Statusquelle bleiben ungemessen. Das private Claude-Artefakt braucht weiterhin seinen eigenen Datenimport; das reine Designpaket aktiviert dort keine fremde Datenquelle.

### Fachteam und automatische Aufgabenverteilung

Die Projektstatusquelle enthält am Produktbau außerdem einen aus dem geprüften Bericht neu ermittelten `expertenplan`. Fremde Freitexte aus Eingangsberichten werden dafür nicht übernommen. Die öffentliche Seite verteilt die Fachrollen auf die bestehenden Arbeitsplätze und zeigt Aufgaben, offene Voraussetzungen und Priorität in aufklappbaren Team-Karten. Ohne Plan bleibt eine Rolle als vorbereitet sichtbar; ein alter Plan wird als alt gekennzeichnet. Die private Claude-Ansicht kann denselben Plan aus ihrem Zentrale-Bericht verwenden, bleibt beim Datenimport aber getrennt. Der lokale Kommentar-Prototyp erzeugt zur Wissenspflege nun auch wiederkehrende offene FAQ-Fragen. Diese Kundentexte werden nicht in den öffentlichen Projektstatus exportiert.

### Privater Geldmanager und modernes Chefbüro

Designversion `campus-einheitlich-4` ergänzt einen privaten Geldplan, eine Angebotskalkulation und eine antippbare Geldmanager-Wand im Chefbüro. Helle Möbel, ruhige Oberflächen und Lichtleisten gehören zum gemeinsamen Design. Ein direkter Geldmanager-Knopf öffnet den Rechner; ohne WebGL wird die Listenansicht verwendet. Im Claude-Paket gehört jetzt auch `kb-geldmanager.js` zu den Darstellungsdateien. Alle sechs Darstellungsdateien gemeinsam übernehmen.

Der Rechner nutzt explizit eingegebene Beträge derselben Währung und desselben Zeitraums ohne Umsatzsteuer. Cent-Arithmetik verhindert typische Rundungsfehler. Unbekannte Beträge bleiben offen, statt als null zu gelten. Ausgaben, Ergebnis aus erfassten Angaben und geplanter Rest nach Rücklage werden getrennt dargestellt. Das Ergebnis ist kein bestätigter Kontostand oder Jahresgewinn. Die Angebotskalkulation berechnet den Beitrag pro Auftrag und die rechnerisch zur Deckung angegebener Fixkosten nötige Auftragszahl. Das sind Szenarien, keine Umsatzprognosen; Verkaufspreise oder Kontobudgets werden nicht verändert.

Eingaben bleiben im Arbeitsspeicher dieses Tabs. Sie werden weder an den Server gesendet noch in Browserablagen, öffentlichen Statusdateien oder Quelltext gespeichert. Nur der ausdrücklich ausgelöste Download legt eine JSON-Datei auf dem Gerät an. Der lokale JSON-Import ersetzt vorherige Angaben, erhält fehlende Werte als offen und prüft Währung, Felder und Betragsformat. Ein Währungswechsel rechnet keine Beträge um. Die öffentliche Projektstatusquelle enthält nur die neue Geldmanager-Fachrolle, keine Finanzwerte. Die vorhandenen Kontozugänge im Chat sind keine automatische Live-Finanzverbindung dieser Seite.


## Desktop-Steuerung und direkte Aufgaben vom 08.11.2026

Die Desktopansicht mit Maus startet im Modus «Verschieben». Linkes Ziehen verschiebt, Rechtsziehen oder Alt + Ziehen dreht. Das Mausrad zoomt über der Zeichenfläche ohne zusätzliche Taste; ausserhalb scrollt es die Seite. Pfeiltasten verschieben das fokussierte Bild, Umschalt + Pfeiltasten drehen. Die Modusknöpfe bleiben bedienbar. Die bisherigen Handygesten und der mobile 2D-Start bleiben erhalten.

Die 3D-Ansicht nutzt am grossen Bildschirm bis zu 92 rem Breite und mehr Höhe. Aufträge sind direkt am 3D-Büro erreichbar. Zehn Kurzaufträge öffnen vorbereitete Aufträge; acht Karten im Chefbüro öffnen passende Arbeitsbereiche mit einem kurzen nächsten Schritt. Ein vorbereiteter Auftrag ist noch kein ausgeführter Lauf. E-Mail-Entwürfe beziehen sich auf die Geschäftsadresse info@luxestyle.ch; die Postfachzuordnung ist bei Ausführung erneut zu prüfen. Private Postfachadressen gehören nicht in die öffentliche Oberfläche.

HTML und 3D-Code gehören gemeinsam zur Designversion `campus-einheitlich-7`. Für die private Claude-Seite das gesamte Designpaket übertragen und vorhandene private Daten erhalten.

## Metricool und Video-Automation: geprüfte Grundlage vom 08.11.2026

Recherche, noch keine eingerichtete Generator-Verbindung:

- Der geprüfte KI-Assistent erzeugt Texte, Ideen, Bildunterschriften und Handlungsaufforderungen. Eine eigenständige MP4-Erzeugung ist in diesem Funktionsumfang nicht dokumentiert: https://metricool.com/ai-social-media-post-generator/
- Der Import aus Canva im Metricool-Planer unterstützt MP4 und kombiniert bei Videoexport alle Designseiten. Er setzt einen kostenpflichtigen Metricool-Plan und eine Canva-Verbindung voraus. Der andere Exportweg aus Canvas Teilen-Menü unterstützt derzeit nur einzelne Bilder, keine Videos oder Karussells: https://help.metricool.com/import-content-from-canva-to-your-posts-w5xbq
- Metricool kann lokale Dateien oder eine direkt erreichbare öffentliche Medien-URL importieren. Eine YouTube-Seitenadresse ist keine zulässige Video-Datei-URL. Private lokale Dateien oder private GitHub-Artefakte sind keine solche Online-Medienquelle: https://help.metricool.com/how-to-add-images-and-videos-to-your-posts-in-metricool-b26gi
- Der Planer-Editor kann unter anderem schneiden, skalieren und Audio beim Speichern abschalten. Das ersetzt keine Prüfung der vorgeschriebenen Musik und der kommerziellen Rechte: https://help.metricool.com/edit-images-and-videos-while-scheduling-your-content-wputz
- Die dokumentierte Make/API-Anbindung benötigt öffentlich erreichbare Medien und API-Zugang im Advanced- oder Custom-Plan. Aktuellen Kontoplan und Zugangsrechte vor einer Umsetzung prüfen; nichts neu abonnieren oder automatisch hochstufen: https://help.metricool.com/make-integration-with-metricool-84rbq
- Für Videoübergaben MP4 bevorzugen und die aktuellen Vorgaben des jeweiligen Kanals prüfen: https://help.metricool.com/publishing-requirements-for-images-and-videos-from-metricool-vfc8n

Zielablauf mit den vorhandenen Mitteln: Generator oder Renderer → Marken-, Produkt-, Rechte-, Bild- und Tonprüfung → freigegebene Online-MP4 → bestehende Metricool-Planung ohne Duplikate ergänzen → Zustand je Zielkanal frisch kontrollieren → gemessene Ergebnisse auswerten. LuxeStyle und oio getrennt halten. Die aktuelle ChatGPT-Verbindung bietet Termin- und Beitragsfunktionen, aber keinen Aufruf zum Hochladen einer lokalen Videodatei. Das ist eine Grenze des vorhandenen Connectors; Metricool selbst unterstützt den Dateiupload. Die Medienübergabe ist vor einer behaupteten Vollautomation nachzuweisen.

## Bewertungsimporter im Shop-Büro · 08.11.2026

Der sechste Shop-Arbeitsplatz zeigt den vorhandenen CJ→Judge.me-Importer. Die Laufquelle liest `cj-reviews.yml` über den bestehenden Büroabruf; kein zusätzlicher Importzeitplan und kein neuer Importdienst. Ein erfolgreicher Lauf bleibt gelb: Er unterscheidet weder Testlauf noch No-op oder bestätigte Veröffentlichung. Fehler bleiben rot, fehlende Messungen unbekannt; alte Laufzeiten werden nicht aufgefrischt.

Die Figur öffnet Judge.me und einen vorbereiteten Prüfauftrag mit Produktzuordnung, Quellenherkunft, Dublettenschutz und Gegenprüfung. Der Auftrag veröffentlicht keine Bewertungen, kontaktiert keine Kunden und startet keinen Import. Importierte Quellbewertungen dürfen nicht als verifizierte Käufe im eigenen Shop ausgegeben werden. Keine Kunden- oder Bewertungstexte werden im öffentlichen Büro angezeigt.

## Regelbetrieb des Bewertungsimporters · 08.11.2026

Auf ausdrücklichen Folgeauftrag arbeitet der vorhandene `cj-reviews.yml` alle sechs Stunden (Minute 47 UTC). Es bleibt ein einziger Importdienst mit gemeinsamer Laufsperre, 30-Minuten-Grenze und bisherigen Fehler-/Drosselungsregeln. Pro Lauf höchstens fünf aktive CJ-Produkte, 50 durchsuchte Produkte und zwei Quellbewertungen je Produkt. Alle gültigen Sterne 1–5 sind zugelassen; keine Beschränkung auf positive Bewertungen. Neue Importe enthalten einen sichtbaren CJ-Quellenhinweis und behaupten keinen verifizierten Kauf im eigenen Shop.

`dropship/cj_review_scan.json` speichert nur Abfragekontext und Shopify-Fortsetzungscursor. Nach begrenztem Leerlauf wird auf der nächsten Seite fortgesetzt; am Katalogende beginnt die Suche neu. Bei Importfehlern bleibt der Cursor unverändert, damit keine ungeprüfte Seite übersprungen wird. Trockenläufe verändern weder Suchfortschritt noch Import-Ledger. Checkpoint und Wiederherstellungsartefakt enthalten auch den Suchstand. Der Handstart bleibt standardmäßig ein Trockenlauf; `regular_run` nutzt dieselben festen Grenzen. Ein erfolgreicher Lauf ist weiterhin kein Beleg für eine bestimmte Importmenge oder mehr Verkäufe.

## Erledigen-Knopf und ausführbare Chat-Aufträge · 08.11.2026

„Offene Aufgabe erledigen“ öffnet den vollständigen Tagesrunden-Auftrag direkt in ChatGPT. Bei zugeordneten Arbeitern führt „Erledigen – im Chat“ ohne vorgeschaltete Auswahl zum passenden Auftrag; „Auftrag ansehen“ erhält Vorschau und Kopierweg. Alle Aufträge fordern tatsächliche Umsetzung und Gegenprüfung im vorhandenen erlaubten Umfang. Die Tagesrunde priorisiert genau eine bestehende Verkaufs- oder Kostenaufgabe, keine neuen Dekoprojekte.

Die öffentliche Seite hat keinen authentifizierten Ausführungszugang zu diesem Chat oder zur Entwicklungsumgebung. Die Links übergeben nur den festen Auftrag und öffentliche Projektlinks; kein Dashboard-Datensatz oder Chatverlauf wird in die URL geschrieben. Je nach ChatGPT-Oberfläche muss der vorausgefüllte Text dort noch gesendet werden. Ein Linkklick oder kopierter Text wird ausdrücklich nicht als ausgeführte Arbeit angezeigt. Keine neuen Hintergrunddienste, Kundennachrichten oder Veröffentlichungsfreigaben werden damit eingerichtet.

## Google- und Shop-Monitor · 08.11.2026

„Google & Shop-Zahlen“ öffnet einen privaten Quellenmonitor. Er trennt Shopify-Umsatz, Bestellungen, Besucher und Sitzungen eines Berichtstags von GA4-Nutzern im 30-Minuten-Fenster, Search-Console-Berichtszeiträumen und Merchant-Produktstatus. Vorläufige Suchdaten und begrenzte Merchant-Auszüge bleiben gekennzeichnet; Status- und Problemzahlen werden nicht addiert. Fehlende Werte sind unbekannt, belegte Nullen bleiben Null. Ältere Berichte behalten ihren tatsächlichen Berichtstag und ihre Abfragezeit.

Die öffentliche Webseite enthält keine privaten Zahlen oder Konto-IDs. Ein privater JSON-Bericht wird nur im Browser gelesen, nicht hochgeladen oder dauerhaft gespeichert. „Private Zahlen ausblenden“ leert die Anzeige. `tools/buero/quellenbericht.py` baut denselben Monitor als eigenständige private HTML-Datei ausserhalb von Repositories; die Datei blockiert Netzwerkabrufe über CSP. Der Kopier-/Chat-Auftrag übergibt nur feste Arbeitsanweisungen, keine Messwerte.

Ein gespeicherter Bericht ist kein Kontosync. Authentifizierte laufende Ansichten öffnen bei Google und Shopify. Shopify Live View ist offiziell unter https://admin.shopify.com/analytics/live erreichbar, dokumentiert auf https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/live-view. Die korrekte Property und der korrekte Shop müssen beim Anbieter ausgewählt sein.

Im Website-Code gibt es keinen geschützten Inhaberzugang für diese Kennzahlen und keine Übernahme der Chat-Connector-Zugänge. Eine automatische private Live-Übertragung ins Büro ist deshalb mit diesem Stand nicht eingerichtet. Es wurden keine Secrets, Konten, Budgets oder Zeitpläne geändert. Für neue private Datenstände kann der bestehende Zahlen-Auftrag im verbundenen Chat verwendet werden.

## Liveboards und grössere Räume vom 10.11.2026 (Design campus-einheitlich-14)

**Auftrag (Besitzer 10.11. abends, wörtlich):** «ki büro altuöisieren und livboard erdtellen bei jede büro eine grosse monitor mit sachen drin wie dashboard oder so, mache büro dafür viel grösser und nicht so eng». **Meine Auslegung (nicht bestätigt):** das private KI-Büro frisch messen, in jedem Raum einen grossen Wandmonitor («Liveboard») mit Zahlen aus den Zeilen dieses Raums aufhängen und die Räume deutlich grösser und luftiger machen.

**Räume (GEMESSEN im Nachbau, Quellen `tools/buero/3d/kb3d-world.js`):**
- Sieben eigene Pavillons zu je 10,4 × 8,0 m (vorher Hauptgebäude 4 × 7 × 6 m, Studios 8 × 5,5 m; also rund doppelte Fläche): Chefbüro und Krypto, Shop und Versand, danach der Campusplatz, dann Social Media und Entwicklerbüro, das YouTube-Studio darunter. Dazwischen liegen Gassen (2,8 m zwischen den Spalten, 3,4 m zwischen den Reihen), die Raumböden sind 0,15 m höher als die Gassen. Neben dem YouTube-Studio liegt ein kleiner Pausengarten.
- **Warum Pavillons und nicht ein Block:** die Kamera steht im Südosten, sichtbar sind nur Nord- und Westwände. Im alten 2 × 2-Block hatten Shop und Versand keine sichtbare Rückwand, und eine hohe Wand zwischen den Reihen hätte die nördlichen Räume verdeckt. Jetzt hat jeder Raum seine eigene hohe Nordwand (3,8 m) für das Liveboard; die Gasse davor (3,4 m) ist so breit, dass die Wand den Raum dahinter nicht verdeckt (Schattenwurf nachgerechnet und im Bild geprüft).
- Schreibtische stehen mindestens 2,2 m auseinander (Shop vorher 1,7 m); der **siebte Shop-Platz** (Bewertungsimporter) ist neu: vorher hatte der Shop sechs Plätze für sieben Zeilen.
- Der **Zentralmonitor** ist jetzt ein breites, niedriges Brett (6,4 × 3,2 m) mitten auf dem Campusplatz und steht weit genug von den Räumen, damit er sie nicht mehr verdeckt (das alte Brett von 8 m Höhe verdeckte in Raumansichten den Shop).
- Das Geldmanager-Brett (Antippen öffnet den Rechner) hängt weiter im Chefbüro, jetzt neben dem Liveboard.

**Liveboard (je Raum, 4,8 × 2,4 m, Bild 1024 × 512 Pixel, gezeichnet in `T.liveboard` in `kb3d-tex.js`):** Titel und Schweizer Uhrzeit, fünf Zähler (Läuft, Prüfen, Steht, Für dich, Alt) mit den gleichen Formen wie die Lampen (Kreis, Dreieck, Quadrat, Raute, Ring), bis zu sieben Zeilen mit Lampe, Name, letztem Ereignis und einem **Frischebalken** (voll = eben gemessen, leer = die Messung ist so alt wie die Frist `frisch_h`; Zeilen ohne Frist zeigen «kein Alter»), dazu eine Sonderzahl als Plakette (Versand: Pakete unterwegs, Chefbüro: Bestellungen der letzten sieben Tage) und die Fusszeile «Messstand …». **Alles stammt aus denselben Zeilen wie die Figuren; es wird nichts erfunden und nichts geschätzt** (kein Kurs, kein Umsatz, keine Besucherzahl). Lampen und Balken sind Messwerte, kein Livesignal; die Fusszeile sagt das. Der **Zentralmonitor** (`T.liveboardUebersicht`) zeigt alle sieben Räume nebeneinander mit Anteilsbalken und Zahlen sowie die Summe.
- Das Bild wird nur neu gezeichnet, wenn sich sein Inhalt ändert (Daten oder Minute der Uhr); gleiche Daten kosten kein Neuzeichnen (geprüft).
- **Bedienung:** Antippen oder Klicken auf ein Brett fährt die Kamera davor (Monitoransicht, Titel «Liveboard · Raum»). **‹ Raum / Raum ›** wechselt der Reihe nach durch die sieben Räume und den Zentralmonitor, **← Zurück zum Büro** und Escape fahren zurück, der neue Knopf **«Liveboard»** in der Kamera-Leiste öffnet das Brett des gewählten Raums (ohne Raum den Zentralmonitor). In der Monitoransicht sind Beschriftungen, Marken und Sprechblasen ausgeblendet. Die Links des Zentralmonitors (Metricool-Monitor, Ranking & SEO, SEO verbessern) erscheinen nur dort.
- **Textfassung:** unter dem Brett steht am Handy dieselbe Auswahl als Text (Titel, Zähler, Zeilen mit Ereignis, Messstand), damit man sie auch ohne Vollbild lesen kann; am grossen Bildschirm ist sie nur für Screenreader da (`[data-live-text]`, gefüllt mit `textContent`, kein `innerHTML`).
- **Politur nach den Bildern (10.11. abends, Folge-PR): beim Shop-Brett mit sieben Zeilen überlappte die Fusszeile das letzte Zeilenband (Zeilenabstand jetzt 36 statt 39 px); der Hinweis «+ N weitere Zeilen im Raum» (nur bei mehr als sieben Zeilen) stand bisher an der Unterkante des Bildes und steht jetzt rechts auf der Fusszeile; am Zentralmonitor verdecken die Wände der Nachbarräume je nach Kamera bis zu rund 55 px des Bildrandes (GEMESSEN im Monitorbild: ein Teil von «Schweizer Zeit» fehlte), darum liegt dort aller Inhalt mindestens 76 px vom Rand (Kacheln 209 statt 221 px breit, Kachelname 21 statt 23 px, damit «YouTube-Studio» ausgeschrieben bleibt). Der Test prüft das jetzt (Abstand der Fusszeile, Platz des Überlauf-Hinweises, Texte und Pixel im Randstreifen, ausgeschriebene Kachelnamen).

**Daten (frisch gemessen 10.11. 20:31 Schweizer Zeit, `buero.json` mit 30 Zeilen):** GitHub-Läufe (`messen.py`), Shopify-Bestellungen (nur Nummer, Betrag, Status), geplante Aufgaben (`get_trigger`), Claude-Sitzungen (`get_session`), Metricool (Planer 10. bis 17.11.: 52 Einträge, Instagram 168 Follower, Stand 09.11.) und die Webansicht von Codex für Entwickler- und YouTube-Studio. Der **Bestellwächter** ist wieder grün (letzter Lauf 10.11. 19:20 erfolgreich); vorher stand er auf Rot («Nutzungslimit erreicht»).

**Übertragen ins private Dashboard** (Reihenfolge wie unten, EINE atomare `ArtifactData batch`-Anfrage, jeweils mit `if_version`): `files/kb3d-code.js` (Design 14), `files/kb-geldmanager.js`, `datasets/buero` (neue Datei), `files/index.html` (Design 14). Die drei Modellpakete bleiben unverändert (Inhalt gegen die live liegenden Pakete verglichen: gleich). Der Versionsschutz der Seite lehnt eine Mischung aus Design 13 und 14 ab, darum alles in einer Anfrage.

**Geprüft (nur im Nachbau: Chromium mit Software-WebGL, Handy 390 px und Desktop 1280 px; Bilder angesehen):** `rauchprobe.js` ohne Fehler, `test_liveboard.js` 45 von 45, Python-Tests von `tools/buero` 67 von 67, Bau der öffentlichen Seite und des Designpakets (`webseite.py`) läuft durch (Versionsgleichheit, Grössengrenze 256 KB je Datei). **Mutationsprobe** (`mutation_liveboard.py`, 23 absichtliche Fehler in Kopien der Quellen, Ausgangslage vorher grün): **23 von 23 erkannt, 0 überlebt, 0 unklar** (10.11. bis 20:40 UTC; die ersten 18 liefen schon gegen den Stand vor der Politur und wurden mit der Politur nochmals gefahren). Der Messstand wird im Test gegen den echten Text aus den Daten geprüft (im Bild und in der Textfassung), nicht nur auf «irgendein Text».
**Ungemessen / Grenzen:** das echte Dashboard auf einem Handy (Bildrate, Speicher; gerechnet, nicht gemessen: die acht Brett-Bilder zu je 1024 × 512 Pixel belegen ohne Mip-Stufen rund 17 MB Grafikspeicher), Lesbarkeit der kleinen Schrift im Hochformat (die Textfassung und das Vollbild im Querformat sind der Ausweg), Wirkung auf Entscheidungen (keine Aussage). `test3d.js` und `test.js` stammen aus der Fassung vom 05.11., schlagen schon auf Design 13 fehl (vor dieser Änderung gemessen) und wurden nicht nachgezogen; die Rauchprobe und `test_liveboard.js` sind die gültigen Prüfungen. **Die öffentliche Webansicht `ki-buero.html` wurde nicht neu gebaut** (Codex' Bereich): sie steht auf Design 13; wer sie nachziehen will, startet `python3 tools/buero/webseite.py ki-buero.html`.

## Drei Seiten in einem Dashboard vom 11.11.2026

**Auftrag (Besitzer, mit Bild seiner Artefakt-Liste):** «kannst du bei ki büro, luxstyle artefakte in 1 machen». **Auslegung (meine, nicht bestätigt):** «KI-Büro», «LuxeStyle Offene Punkte» und «LuxeStyle Suchanfragen» zu einem Artefakt zusammenlegen; «Pilot 2.0 Prüfstand» bleibt getrennt, weil er es nicht genannt hat.

**Was jetzt gilt:** Das Dashboard KI-Büro trägt oben drei Knöpfe. «KI-Büro» ist die bisherige Seite, Zeichen für Zeichen unverändert. «Offene Punkte» (Quelle `tools/buero/dashboard/offen.html`, Daten `datasets/offen`) und «Suchanfragen» (Quelle `dropship/keywordliste-1011/seite.html`, sieben Datensätze) sind die zwei früheren Artefakte. Beim Öffnen steht das Büro da; die Daten der zwei anderen Seiten lädt das Dashboard nach der Zusage des Typs erst, wenn ihr Abschnitt aufgeht (`hidden` fällt weg). Der Link des Dashboards endet auf `#offen` oder `#suche` (auch `#anfragen`, `#chancen` … für die Unter-Reiter der Suchanfragen) und öffnet die Seite wieder. Die Abschnitte tragen den Namen ihres Links als `id`: nur so nennt das Dashboard Claude die Seite, die jemand gerade offen hat.

**Übertragen (11.11. 10:26 UTC, EINE atomare `ArtifactData batch`-Anfrage, 13 Schreibvorgänge):** `datasets/offen` und sieben Datensätze der Suchanfragen (neu, je Version 1; ihre Dateien vorher mit dem Artifact-Werkzeug serverseitig in dieses Artefakt kopiert, `from_url` und `asset_ids`), `files/lx-offen.css|js` und `files/lx-suche.css|js` (neu), `files/index.html` (Version 6 → 7). Zurückgelesen: alle zehn Dateien gleich dem Bau, die acht kopierten Dateien nach sha256 gleich den Quellen. **Rücknahme:** `files/index.html` wieder aus `tools/buero/seite.html` setzen (die übrigen neuen Dokumente stören nicht).

**Geprüft (nur im Nachbau, Chromium mit Software-WebGL, Handy 390 px und Desktop 1280 px; Bilder mit den echten Daten angesehen):** `test_bauen.py` 43 Prüfungen, `test_dashboard.mjs` 80 Prüfungen mit synthetischen und mit den echten Daten (37 offene Punkte, 4 442 Suchanfragen), Mutationsprobe 39 von 39 erkannt (34 der Bau-Test, 5 erst der Browsertest), Ausgangslage vorher grün.

**Ungemessen:** die zusammengelegte Seite im echten Dashboard (das Dokument `check` entsteht erst, wenn der Besitzer die Seite offen hat; bis 10:30 UTC lag keines vor) und auf einem echten Handy. **Vorbestehend, nicht von dieser Änderung:** das Dokument `runs` des Dashboards (Stand 10:09 UTC, also vor dem Zusammenlegen) meldet für die Büro-Seite zwei Schreibzugriffe ausserhalb einer Zeichnung (`stray_write`, Zähler 2); Ursache nicht gesucht.

**Die zwei früheren Artefakte** («LuxeStyle Offene Punkte» `U3qys6JKULg7e5oC6CUt9x`, «LuxeStyle Suchanfragen» `THZ7753CCACv5xWE1TqF5H`) bestehen noch, werden aber nicht mehr nachgeführt; gelöscht wird nur auf das ausdrückliche Ja des Besitzers.
