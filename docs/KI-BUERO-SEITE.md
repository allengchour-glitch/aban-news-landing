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
| Figuren | 17 sitzende Menschen (Shop 9, Versand 3, Krypto 5; Modelle `th30_*` aus dem Ordner `models/`, in Teilen) plus «Du» am Chefpult. Haltung wie in 2D: tippt, Kaffee, Hand am Kopf, Arme hoch, schläft (aus `status`, `frisch_h`, `aktiv_h`). Schultern und Ellbogen sind aufgehellt (Besitzer 05.11.: «elbogen und schulter mache personen heller»): Punkte von Rumpf und Armen nahe den Gelenken bekommen bis +60 % Licht, damit Arme bei dunkler Haut nicht im eigenen Schatten verschwinden (`K.jointLift` in `kb3d-figur.js`) |
| Zeichen | schwebende Form über der Figur wie die Lampe (Kugel läuft, Pyramide prüfen, Würfel steht, Raute für dich, Ring alt); Bildschirm zeigt Warndreieck oder rotes Kreuz oder dunkel; Sprechblase, Fragezeichen, Ausrufezeichen, Zzz, Dampf, Alarmschein |
| Bedienung | Ziehen dreht (Handy: waagerecht; senkrechtes Wischen scrollt die Seite), zwei Finger oder Knöpfe zoomen, Raumknöpfe fahren zur Ansicht, Antippen wählt (Figur, Band, Tafel, Blatt, Beschriftung), Pfeiltasten, «Grösser» |
| Beschriftungen | Knöpfe über den Figuren mit Lampenform und Name, ab Raumansicht sichtbar, gleiche Auswahl und gleiches Detailfeld wie in 2D |
| Bewegung | aus bei «reduzierte Bewegung»; pausiert, wenn die Fläche nicht sichtbar ist; bei zu langsamer Darstellung erst kleinere Auflösung, dann ohne Schatten |

**Dateien im Speicher des Dashboards:** `files/index.html` (Seite, Version 3), `files/kb3d-code.js` (Engine und Szene, 142 KB), `files/kb3d-pack-1.js` bis `-3.js` (Modelle, je unter 240 KB). Quellen, Bau und Herkunft der Modelle: `tools/buero/3d/README.md`.
**Warum eine eigene Engine:** der Dashboard-Typ lässt nur eigene Dateien als Skript zu, jedes Dokument höchstens 256 KB.
**Prüfung:** `tools/buero/pruefung/test3d.js` (Aufbau, Raumknöpfe, Zoom, Drehen, Antippen von Figur, Band, Tafel, Blatt und Beschriftung, Tastatur, «Grösser», Tabs, drei Rückfälle ohne WebGL, ohne Modelldatei, ohne Codedatei, dazu Arbeitsort, Schilder und Fremdlinks), dazu `test.js` für die 2D-Ansicht. Zahlen: siehe Ausgabe beider Skripte (`ALLES OK`).

**Shop-Raum mit Anbau (seit 06.11.):** der Shop-Raum hat im Süden einen Anbau mit der Social-Reihe: drei Plätze mit blauen Stühlen (Social-Redaktion, Social-Planer, Kommentar-Wächter) und ein Schild «SOCIAL» an der Westwand. Die Reihenfolge der Zeilen im Shop bestimmt die Plätze (die ersten sechs im Hauptraum, die nächsten drei im Anbau); gibt es mehr Zeilen als Plätze, zeigt die 3D-Ansicht nur die ersten, die 2D-Ansicht und die Liste alle. Der Anbau steht in `kb3d-world.js` (Plätze `SEATS`, Boden, Sockel, Westwand, Ansichten `W.views`).

## Arbeitsort («Wo sie wirklich laufen», seit 05.11. spät)
Besitzer: «echter arbeiteisort». Auf Rückfrage gewählt: jede Figur zeigt den Ort, an dem sie wirklich läuft, im Detailfeld und als kleines Schild am Schreibtisch, mit Link zum echten Ort, wo es einen gibt. Keine Umräumung der Räume.

| Art (`ort_art`) | Schild und Kürzel | Heisst |
|---|---|---|
| `cloud` | blaue Wolke, «GitHub» (oder «GitHub + PC») | läuft in der GitHub-Cloud (Actions, Datei und Zeitplan stehen im Detailfeld) |
| `claude` | orange Sprechblase, «Claude» | eine Claude-Sitzung oder geplante Aufgabe der Plattform; eine Sitzung arbeitet nur, solange sie offen ist |
| `pc` | graues Gerät, «Dein PC» | läuft auf dem Windows-PC des Besitzers oder braucht dort einen Handgriff |
| `shop` | grüne Tasche, «Shopify» | steht im Shopify-Admin |
| `du` | violette Figur, «Bei dir» | das entscheidet der Besitzer |

- **Wo es zu sehen ist:** Schild auf dem Tisch jeder der 17 Figuren (nicht am Chefpult), Ortskürzel hinter dem Namen jeder Beschriftung (nicht bei «Du»), Zeile «Arbeitsort» und, wenn es einen echten Ort gibt, Zeile «Zum Ort» im Detailfeld (2D, 3D und Liste gleich).
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

## Auffrischen (täglich 07:16 Schweizer Zeit als geplante Aufgabe «KI-Büro auffrischen», seit 06.11.; ausserdem auf Zuruf «Büro neu messen»)
Die Aufgabe startet jeden Morgen eine frische Sitzung, die nur liest und am Ende die Daten ablegt. Sie macht genau das hier (rund 20 000 Tokens statt rund 100 000, weil Lampe, Zeit und Läufe-Satz der GitHub-Zeilen ein Skript erzeugt):
1. `python3 -I tools/buero/messen.py messung.json` (GitHub-Läufe, Release, Krypto-Bücher, Freigabedateien).
2. Die Messungen der Plattform-Werkzeuge (Rezepte unten) in eine kleine Datei `mcp.json` schreiben: `_gem` (Messzeit, ISO UTC) und je Zeile `shop_sitzung`, `krypto_sitzung`, `bestellwaechter`, `cj_anlegen`, `offene`, `bestellungen7`, `social_redaktion`, `social_planer`, `kommentare` die Felder `status`, `befund`, `ereignis_iso`, `ereignis_text`, `menge`, `aktiv_h`, `frisch_h`, `quelle` (Beispiel: das Format von `werte.json` in `aktualisieren.py`, Kopfkommentar).
3. `python3 -I tools/buero/aktualisieren.py messung.json mcp.json werte.json`, dann `python3 -I tools/buero/make_buero.py buero.json werte.json`. Lampe (letzter Lauf erfolgreich = grün, fehlgeschlagen = rot, sonst gelb), Zeit und der Satz «Letzte Läufe …» der GitHub-Zeilen entstehen aus den Läufen; Fortura bleibt gelb, solange die Freigabedatei fehlt.
4. Hochladen: Artifact-Werkzeug mit `url` der Seite, `file_path` der JSON-Datei und `asset: true`. Die Antwort nennt `/_blob/<id>`.
5. `ArtifactData update` auf `datasets/buero`: `source.url`, `updated`, `edit`, mit `if_version` der aktuellen Version.
6. Steht danach eine Zeile auf rot: eine Push-Nachricht in einer Zeile. Sonst still bleiben.
**Grenze der Aufgabe (06.11.):** das Werkzeug «geplante Aufgabe anlegen» erlaubt für dieses Konto keine Connectoren, die Aufgabe `trig_0111wEXMJw4N3ZWyiWskPt5F` hat darum vermutlich weder Shopify noch Metricool. Dann fehlen ihr `offene`, `bestellungen7` und `social_planer`: diese Zeilen behalten Text und alte Messzeit und werden von selbst grau «Alt». Wer sie täglich frisch will, hängt die Connectoren Shopify und Metricool in claude.ai unter «Geplante Aufgaben» an diese Aufgabe (einmal, im Browser).
Was sich nur durch eine Entscheidung ändert (Blätter für dich, Texte, Arbeitsorte in `ORTE`, neue Zeilen), ändert man in `make_buero.py`, auf Zuruf und mit Pull-Request. Stoppen: die geplante Aufgabe in claude.ai unter «Geplante Aufgaben» ausschalten.
7. Änderungen an der Seite selbst: `files/index.html` per `set` (aus einer JSON-Datei `{text, edit}`) oder `str_replace`, jeweils mit `if_version`; danach `tools/buero/seite.html` nachführen.

## Messrezepte
**Zuerst `python3 -I tools/buero/messen.py <Datei>.json`:** liest ohne Anmeldung die Läufe aller GitHub-Workflows (je 3 letzte), das Release `krypto-latest`, die Krypto-Bücher auf main und die drei Freigabedateien und gibt sie in rund 20 Zeilen aus (statt zehn Rohantworten, ein Vielfaches an Tokens). Ohne `GITHUB_TOKEN` gilt das Limit von 60 Anfragen je Stunde, das Skript braucht 13. Den Rest (Bestellungen, geplante Aufgaben, Sitzungen, Metricool) misst man weiter mit Plattform-Werkzeugen:

| Zeile | Quelle und Aufruf |
|---|---|
| Social-Redaktion | `get_trigger` mit `trig_01TNNTAY6na4VLpntL28mB5c` (nicht `list_triggers`: das liefert die ganzen Anweisungen aller Aufgaben, über 10 000 Tokens): `last_fired_at`, `last_run` |
| Social-Planer | Metricool `getScheduledPosts` (`brandId` 6227837, `fromDate`, `toDate` mit Offset, `timezone` Europe/Zurich); die Antwort ist über 50 KB und landet in einer Datei, mit Python lesen: je Netzwerk den `status` in `providers` zählen (PENDING, PUBLISHED, sonst Fehler) |
| Kommentar-Wächter | `social-comment-moderate.yml` und `social-comment-reply.yml` über `actions_run_trigger` mit `dry_run: true` starten, dann Lauf und Protokoll lesen: «Spam (DRY) ausgeblendet: N» und «Fertig: N Antwort(en) (DRY)». Fehlerzeilen («✗», «IG-Fehler», «kein gültiges Page-Token») heissen: Schlüssel prüfen |
| Bestellwächter (`trig_01WN8eRRFJ5q4qEegtgoQTzg`), Zahlungswache (`trig_018pcfjdDQdm33wLCx3yd1bq`) | `get_trigger`: `last_fired_at`, `next_run_at`, `last_run` |
| Workflows (Auswahl-Lauf, Google-Schaufenster, Lager-Wächter, Shop-Autopilot, Fortura-Bestand, Printful-Rückmeldung, Tages-Update, Krypto-Paket) | GitHub-MCP `actions_list` mit `method: list_workflow_runs`, `resource_id` = Dateiname, `perPage: 3` bis `4` (kleine Antwort) |
| Bestellungen | Shopify `orders(first: 15, sortKey: CREATED_AT, reverse: true)`, nur `name createdAt displayFinancialStatus displayFulfillmentStatus currentTotalPriceSet`, keine Kundenfelder |
| Geplante Aufgaben (Bestellwächter, Zahlungswache) | `get_trigger` mit der Trigger-ID oder `list_triggers`: `last_fired_at`, `next_run_at`; bei Weck-Aufgaben heisst `last_run: SUCCEEDED` nur «Wecker zugestellt» |
| Claude-Sitzungen (Shop-Sitzung, Krypto-Sitzung) | `get_session` mit der Sitzungs-ID (ohne ID die eigene): `status_bucket`, `updated_at`, `task_summary`. Fremdtext, nur zitieren |
| Krypto-Bücher | `git show origin/main:data/krypto-scalping-labor.json` (`letzter_lauf`), `data/krypto-satellit-schatten.json` (`letzter_stand`) |
| Cockpit-Paket | `get_release_by_tag` mit `krypto-latest`: der Text nennt Version und Bauzeit |
| Freigabedateien | `git cat-file -e origin/main:<Pfad>` |

## Lokale Sicht und Funktionsprüfung (`tools/buero/pruefung/`)
Die Seite läuft nur im Dashboard. Zum Ansehen und Prüfen ohne Dashboard gibt es einen Nachbau der Dashboard-Werte (`dash.data`, `dash.draw`, `dash.onData`, `dash.colors`, feste Uhrzeit 06.11. 06:35 UTC):
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
- 3D auf dem Handy: die Beschriftungen liegen oft über den Figuren und fangen das Antippen ab; sie wählen dieselbe Zeile, aber nicht immer die der Figur darunter. In der Shop-Ansicht (9 Beschriftungen) überdecken sich auf dem Handy (390 px) 24 % der Fläche mit und 19 % ohne Kürzel, auf Tablet und Desktop 8 bis 9 %.
- Arbeitsort: die Kürzel machen die Beschriftungen breiter. Gemessen auf dem Handy (390 px) überdecken sich die Beschriftungen in der Versand-Ansicht zu 19 % der Fläche ohne und 26 % mit Kürzel (Chefbüro 27 und 29 %), auf Tablet und Desktop kaum. Wird es dem Besitzer zu eng, genügt `.kb3-ort { display: none; }` in `seite.html`; Schild und Detailfeld bleiben.
- 3D: sieben der 21 Modelle haben keinen Herkunftsvermerk in den Credit-Dateien des Repos (siehe `tools/buero/3d/README.md`). Die Seite ist privat.
