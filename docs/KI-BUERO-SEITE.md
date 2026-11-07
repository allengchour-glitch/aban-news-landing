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
| `ort_art` | `cloud`, `claude`, `pc`, `shop` oder `du` (bestimmt Symbol und Farbe des Schilds) |
| `ort`, `ort_kurz` | der echte Arbeitsort als kurzer Satzteil; Kürzel für Schild und Beschriftung (höchstens 11 Zeichen) |
| `ort_text` | wo und wann es wirklich läuft (Datei, Zeitplan in UTC, Einschränkung), höchstens 260 Zeichen |
| `link` | `https`-Adresse des echten Ortes (GitHub, Claude oder Shopify-Admin) oder leer |

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
4. `node test.js <Ordner>` prüft die 2D-Ansicht im Browser: Zahl der Figuren, Haltungen aus den Zeiten, Detailfeld, Tastatur, Ansichtswechsel, Markierungen, Zähler, reduzierte Bewegung. Die erwarteten Zahlen rechnet der Test aus den Daten der Seite (`window.__ROWS`: Zeilen, Farben, Blätter), sie stehen nicht mehr fest im Test.
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
- Dashboard-Übertragung: zuerst das gebaute `files/kb3d-code.js`, dann die neue `buero.json` als Quelle von `datasets/buero`, zuletzt `seite.html` als `files/index.html`, jeweils mit aktuellen Versionswächtern. Modellpakete bleiben unverändert. Die Datenquelle wird benötigt, damit die drei neuen Figuren zu sehen sind.

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

## Arbeitsübersicht und tägliche Pflege (vorbereitet)

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
