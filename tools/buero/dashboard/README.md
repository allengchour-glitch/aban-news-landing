# Privates Dashboard «KI-Büro»: drei Seiten in einem Artefakt

Stand 11.11.2026. Der Besitzer wollte statt dreier Artefakte eines («kannst du bei ki büro, luxstyle artefakte in 1 machen»).
Das Dashboard **KI-Büro** (https://claude.ai/artifact/93LsR7UCQ3gN5mz8KW5MRN) trägt seither drei Seiten, oben umschaltbar:

| Knopf | Quelle im Repo | Daten im Dashboard |
|---|---|---|
| KI-Büro | `tools/buero/seite.html` | `buero` |
| Offene Punkte | `tools/buero/dashboard/offen.html` | `offen` (Berechnungen `uebersicht`, `abdeckung`) |
| Suchanfragen | `dropship/keywordliste-1011/seite.html` | `stand`, `anfragen`, `stichwoerter`, `chancen`, `ideen`, `seiten`, `tage` (Berechnung `klassen`) |

Die früheren Artefakte «LuxeStyle Offene Punkte» und «LuxeStyle Suchanfragen» sind seit 11.11.2026 gelöscht (auf das Ja des
Besitzers), ihre Links sind tot. Alle Daten liegen im KI-Büro.

## Wichtigste Regel

**`files/index.html` des Dashboards wird immer mit `bauen.py` gebaut.** Wer `tools/buero/seite.html` roh als `index.html`
hochlädt (so stand es bis 10.11. in `docs/KI-BUERO-SEITE.md`), löscht die Seiten «Offene Punkte» und «Suchanfragen».

## Bauen

```
python3 -I tools/buero/dashboard/bauen.py <Ordner> --dokumente
```

schreibt `index.html`, `kb-stil.css`, `lx-offen.css`, `lx-offen.js`, `lx-suche.css`, `lx-suche.js` und unter `dok/` je ein Dokument
`{text, edit}` zum Hochladen. Die Büro-Seite steht Zeichen für Zeichen in ihrem Abschnitt. Die Zeichnungen der Seite
«Offene Punkte» heissen im Dashboard `op-zahl`, `op-balken`, `op-tabelle` (in `offen.html` weiter `zahl`, `balken`,
`tabelle`), weil die Suchanfragen-Seite ebenfalls eine Zeichnung `zahl` hat. Der Bau bricht ab, wenn

- eine Zeichnung, eine Berechnung oder eine `id` auf zwei Seiten vorkommt,
- eine Seite einen Namen der Hülle belegt (alles mit `lx-` und die Namen der Abschnitte `buero`, `offen`, `suche`),
- eine der zwei neuen Seiten fremde Klassen trägt oder ihr Stil ein nacktes Element trifft (er würde auf das Büro abfärben),
- ein Dokument grösser als 250 000 Byte würde (die Grenze des Dashboards ist 256 KB je Dokument).

**Grösse (Stand 16.11.2026, Fassung `campus-einheitlich-21`):** Der Büro-Stil wird jetzt vollständig
als `kb-stil.css` ausgegeben. `index.html` bleibt dadurch deutlich unter 250 000 Byte; der Bau prüft weiterhin
jedes gespeicherte Dokument. Gerüst und Skripte aller drei Seiten bleiben erhalten; der Test rekonstruiert
auch den ursprünglichen Büro-Stil bytegenau. Beim Übertragen **kb-stil.css vor index.html** hochladen.
Die eigenständige `seite.html` und die öffentliche Webansicht tragen den Stil weiterhin selbst.

## Kanäle laut Metricool (seit 16.11.2026 im Repo)

Die Social-Sitzung hat am 11.11.2026 eine Tabelle «Kanäle laut Metricool» direkt ins Dashboard geschrieben (`files/index.html`
Version 18), nie ins Repo. Seit 16.11. steht sie in `tools/buero/seite.html`: im Raum «Social Media» des 2D-Büros und in der
Ansicht «Liste», je eine Zeile pro Kanal (Follower, Aufrufe, heute erschienen, fest geplant, nächste Woche fest + Entwurf), darüber
die Zeile mit Auswertungszeitraum und Abfragezeit (am Handy ganz im Bild; nur die Tabelle scrollt seitlich). Datenquelle ist der
Metricool-Kurzbericht **Version 2** in `datasets/buero` (Feld `metricool` der Zeilen `social_meta`, `social_pinterest` und
`yt_wachstum`); `make_buero.py --metricool-status <datei>` nimmt ihn an und prüft ihn streng (`metricool_v2_pruefen`: nur diese
Felder, nur ganze Zähler ab 0, bekannte Kanäle ohne Doppel, kurze Texte, Messzeit mit Zeitzone). Ohne Bericht bleibt die Tabelle
leer und unsichtbar, auch auf der öffentlichen Webseite (`webseite.py` gibt keine Metricool-Daten weiter). Version 1 gilt weiter.
Korrigiert beim Übertragen: die Fassung 18 hatte eine `if`/`else`-Kette zerbrochen (die Knöpfe zu Shop und Metricool verschwanden);
in Fassung 20 zeigen die Zeilen ohnehin keine Kontolinks mehr.

## Links und Ort

Die drei Abschnitte tragen den Namen ihres Links als `id` (`id="offen"` zu `dash.setLink('offen')`). Der Link des Dashboards endet
dann auf `#offen`, und die Seite öffnet diesen Abschnitt beim Laden selbst. Die Unter-Reiter der Suchanfragen (`#anfragen`,
`#chancen` …) führen auf die Seite «Suchanfragen». Der Dashboard-Typ nennt Claude den Ort, an dem jemand gerade ist, nur, wenn der
Name als `id` in den Dateien der Seite steht: darum die schlichten Namen und kein Präfix.

## Hochladen

1. `ArtifactData get` für `files/index.html` (ohne den Text zu drucken: `out_dir`), Version merken. Hat jemand die Seite im
   Dashboard von Hand geändert, weicht der Text von `tools/buero/seite.html` ab: dann zuerst die Quelle nachziehen.
2. EINE `ArtifactData batch`-Anfrage: `files/index.html` (set, `if_version`), `files/kb-stil.css` und `files/lx-*.css|js` (set, mit `if_version`,
   sobald es sie gibt), dazu wie bisher `files/kb3d-code.js`, `files/kb-geldmanager.js` und `datasets/buero`, wenn sie sich
   ändern (`docs/KI-BUERO-SEITE.md`, Abschnitt «Auffrischen»). Als `file_path` dienen die Dateien unter `dok/`.
3. Nachlesen: `ArtifactData get files/index.html` mit `out_dir` und mit dem gebauten Text vergleichen.

## Daten nachführen

- **Offene Punkte:** Zeilen in der JSON-Datei ändern, mit dem Artifact-Werkzeug hochladen (`url` des KI-Büros, `asset: true`),
  dann `ArtifactData update` für `datasets/offen` (`source.url`, `source.name`, `title`, `description`, `updated`, `edit`,
  mit `if_version`). Der Satz «zuletzt aktualisiert am …» steht in `files/index.html`: `ArtifactData str_replace` auf das Feld
  `text` (vorher `edit` nachführen) und denselben Satz in `offen.html` im Repo ändern, sonst macht ihn der nächste Bau rückgängig.
- **Suchanfragen:** Datensätze mit `dropship/keywordliste-1011/bauen.py` neu bauen (README dort), die sieben Dateien hochladen
  und die sieben `datasets/<Name>` nachführen. Messwerte liegen nicht im Git.
- **Büro:** wie bisher (`docs/KI-BUERO-SEITE.md`).

## Prüfen

- `python3 -I tools/buero/dashboard/test_bauen.py`: 43 Prüfungen ohne Browser (Bauergebnis und Schutzprüfungen). Läuft in der CI
  (`.github/workflows/buero-dashboard-test.yml`), sobald sich eine der drei Quellen oder der Bau ändert.
- `node tools/buero/dashboard/test_dashboard.mjs <Bauordner> [Bilderordner]`: 86 Prüfungen (mit einem Metricool-Bericht Version 2
  in `buero.json`: 96) im Browser (Handy und Desktop) gegen
  einen Nachbau der Dashboard-Laufzeit: Start, Wechsel, Zahlen gegen die Daten, Filter, Unter-Reiter, Links in der Adresse,
  seitliches Scrollen, doppelte Namen, Seitenfehler. Der Bauordner braucht zusätzlich `kb3d-*.js`, `kb-geldmanager.js`
  (`node tools/buero/3d/bauen.mjs <Bauordner>`) und `buero.json` (`python3 -I tools/buero/make_buero.py <Bauordner>/buero.json`).
  `DASHBOARD_DATEN=<Ordner>` nimmt echte Daten. Nur von Hand (braucht Playwright); immer nur einen Browserlauf zugleich.
  Bildschirmfotos sind nur eine Sehhilfe: Chromium mit Software-WebGL meldet beim ersten Handy-Bild manchmal «Unable to capture
  screenshot» (gemessen 11.11.: 3 von 5 Läufen mit Bildern, ohne Bilder nie), der Test versucht es darum bis zu dreimal.
- `python3 tools/buero/dashboard/mutationsprobe.py [--browser <Bauordner>]`: eingebaute Fehler im Bau müssen einen Test rot machen.
  Stand 11.11.: 39 von 39 erkannt (34 der Bau-Test, 5 Fehler in der Hülle erst der Browsertest), Ausgangslage vorher grün.
  Kanal-Tabelle (16.11., von Hand): 8 von 8 eingebauten Fehlern der Seite macht `test_dashboard.mjs` rot (Neuzeichnen beim
  Ansichtswechsel, Spalten, Planung/Ergebnisse, Erkennung des Berichts, Abfragezeit, YouTube-Zeile, abgeschnittene Zeitzeile, leere
  Tabelle sichtbar), 7 von 7 Fehlern in `metricool_v2_pruefen` `test_metricool_anzeige.py`.
- Die drei Quellen behalten ihre eigenen Tests (`tools/buero/pruefung/`, `dropship/keywordliste-1011/seite_test.mjs`).

## Grenzen

- Der Browsertest ist ein Nachbau. Dass das echte Dashboard dasselbe zeigt, belegt er nicht; das zeigt erst das Dokument
  `check` in `data/users/me`, und das entsteht nur, wenn der Besitzer die Seite offen hat.
- Unter `hidden` lädt das Dashboard keine Daten: die 4 442 Suchanfragen kommen erst, wenn jemand die Seite öffnet (im Nachbau
  gemessen; im echten Dashboard so vom Typ zugesagt).
