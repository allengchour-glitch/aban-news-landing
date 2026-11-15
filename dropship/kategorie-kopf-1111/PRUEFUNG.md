# Prüfung «handykopf» (kompakter Kategorie-Kopf), unabhängiger Prüfer, 12.11.2026 00:01–00:27 UTC

Urteil: **mit Änderungen.** Kein Blocker. Drei wichtige und sieben kleine Funde.
Die Messwerte des Bauers bestätige ich. Ausnahme: Der aktive Filter am Handy verschwindet (Fund 1). Das hat der Bauer nicht gemessen.

Alle eigenen Dateien liegen in `kopf1111/pruefer/`: Skripte, gespeicherte Seiten `html/`, Rohwerte `erg/`, Bilder `bilder/`, Abruf-Log `abrufe_p.log`.

Seitenabrufe auf luxestyle.ch: 8 von 10, Abstand jeweils mindestens 26 s. Kein 429, keine Cloudflare-Prüfseite.

**Nicht gemessen:** WebKit, Safari und iPhone. Im Container gibt es kein WebKit.

## Was ich nachgeprüft habe (Herkunft je Zeile)

**Keine bestehende Theme-Datei geändert (GEMESSEN, Admin-API 00:03 UTC, MAIN 213013037447).**
- Seit 20:00 UTC geändert sind nur neue Dateien: `lx-kopf-*`, `lx-main-collection-kompakt`, `lx-ankuendigung-stabil`, `collection.lxkopf.json` und die Scroll-Szene-Dateien eines anderen Agenten.
- `templates/collection.json` hat md5 63dd0f31, Stand 09.11.
- `layout/theme.liquid` hat Stand 10.11. `sections/main-collection.liquid` hat md5 84a055d5, Stand 04.11.
- `AGENTS.md` zeigt 23:51:29, also dieselbe Sekunde wie ein Upload. Das ist Plattformverhalten: In allen 17 Themes hat die Datei denselben md5 11947bfa, und ihr `updatedAt` ist immer gleich dem `updatedAt` des Themes.

**Die md5-Werte der neuen Dateien stimmen** mit dem BERICHT überein: cc664c24, 7685f889, a84ad6b2, 380614de, 0ada26e7.

**Die Testvorlage entspricht genau dem Umschalt-Ergebnis.** `collection.lxkopf.json` ist als JSON gleich `collection.json.neu` aus `umschalten.mjs`. Bei `main` wechselt nur `type`; Einstellungen und Blöcke bleiben gleich.

**Live am Handy 390×664 (GEMESSEN 00:07–00:19 UTC, Chromium, echte Ladung):**

| Seite | Unterkante 1. Kartenbild | Kopf | H1 |
|---|---|---|---|
| creolen-ohrclips | 1284 → **621** | 639 → 62 px | 35,2 → 23 px |
| uhren-herren | **625** | | |
| damen-kleider/neu (Tag) | **625** | | |
| haarstyling-geraete (Link im 1. Absatz) | **625** | | |
| moissanit-schmuck (Titel 2-zeilig) | **648** | | |
| herren-poloshirts Seite 2 | **625** | | |

- Seitliches Scrollen: 0 px.
- Liquid-Fehler: keine.
- Konsole: nur abgebrochene Anfragen der Messung und die bekannte Meldung «customer-account-main-menu», wie vorher.

**Kopffotos am Handy werden nicht geladen (GEMESSEN).** Ich habe die Anfragen gegen die exakten `src`- und `srcset`-Adressen im Kopf verglichen: 0 Anfragen am Handy, 6 am Desktop.

**LCP gedrosselt** (CPU ×4, 1,6 Mbit/s, 150 ms, Wiedergabe der frisch geholten Seite, je 3 Läufe): creolen vorher 1928/2112/2728 ms, nachher 1832/2044/2160 ms. Der Median sinkt von 2112 auf 2044 ms. Das LCP-Element ist nachher das erste Kartenbild (eager, high).

**CLS gedrosselt:** nachher 0,0266 in 3 von 3 Läufen, davon 0,0213 aus dem Textblock der ersten Karten. Vorher 0 bis 0,0046. Das liegt unter 0,1.

**Desktop 1440 (glaetteisen-locken-foehn, live):**
- Kopf 230 px, Chips eine Zeile (49 px), erste Karte bei 598 px.
- CLS 0,0324, verursacht von der Ankündigungsleiste wie bisher.
- LCP-Element ist das Kartenbild.

**Kurztext ohne Knopf am Desktop:** Der Anriss bleibt bei 750, 800, 1024 und 1440 px in 2 Zeilen ganz sichtbar. Auch ein künstlicher Text mit 148 breiten Zeichen passt.

**Beschreibung vollständig (GEMESSEN):** Auf 5 von 5 Nachher-Seiten stehen erster Absatz und Rest im HTML, gleich dem `descriptionHtml` aus der Admin-API (00:05 UTC). `ls-verwandt` ist bei haarstyling-geraete vorhanden. Die Kaufhilfen von creolen und uhren-herren sind ganz da.

**Eigene Einteilung aller 1 723 Beschreibungen** (frisch aus der Admin-API): 1 717 mit Anriss und `details` (davon 1 086 mit nur einem Absatz), 5 mit Link im Anriss, 1 kurz ohne Knopf, 0 leer. Das stimmt mit dem Test des Bauers überein.

**Linkziele unverändert:** creolen 7 = 7, damen-kleider 59 = 59 eindeutige Ziele (alt hatte Doppel).

**Tastatur (haarstyling-geraete, Link-Fall):**
- «Mehr anzeigen» ist nach 15 Tabs erreicht.
- Zugeklappt bekommen 0 Elemente den Fokus.
- Enter öffnet, danach sind 3 von 3 Links fokussierbar. Die Leertaste schliesst.

**Ohne JS am Handy:** `details` geht auf, das Kartenbild endet bei 625 px.

**Weiteres:**
- Canonical zeigt auch bei `?view=lxkopf` auf `/collections/<handle>`.
- Genau 1 H1 und 1 BreadcrumbList mit gleichem Inhalt.

**Tests des Bauers selbst gefahren:**
- `test_kopf.mjs --alle`: 44 von 44 bestanden.
- `mutation.py`: 14 von 14 erkannt.
- Nicht abgedeckt sind die Eager-Logik der Section-Kopie und `lx-kopf-pfad`. Diese sind nur live gemessen.

## Funde

### 1. wichtig: Am Handy ist der aktive Tag-Filter nicht mehr zu sehen

**Beleg (GEMESSEN 00:09 UTC, live `/collections/damen-kleider/neu?view=lxkopf`, 390×664):**
- Die eine Chip-Reihe ist 8 473 px breit.
- «✨ Neu ✕» steht bei x = 4 376 px. Sichtbar sind nur die ersten 390 px.
- Vorne ist «Alle» als aktuell markiert (`aria-current`).
- Bild: `pruefer/bilder/kleider_tag_nachher_m664.png`.
- Vorher stand der aktive Filter in einer eigenen Zeile direkt nach «Filtern:» (alter `lux_subchips`, `.lx-chiprow`).
- Wer am Handy auf einen Filter tippt, sieht danach nicht, dass er aktiv ist, und findet das ✕ zum Entfernen nicht.

**Änderung:**
- Am Handy aktive Filter (`lx-kc__f--akt`) und eine aktuelle Unterkategorie, die nicht «Alle» ist, an den Anfang der Reihe stellen. In Liquid heisst das: zuerst ausgeben, später überspringen.
- Alternative: ein Inline-Skript, das `.lx-kc__reihe.scrollLeft` auf den ersten aktiven Chip setzt.
- Abnahme: Auf einer Tag-Seite bei 390 px ist der aktive Chip im ersten Bildschirm sichtbar.

### 2. wichtig: Die Section-Kopie macht eine dokumentierte Rücknahme gefährlich

**Beleg:**
- `lx-main-collection-kompakt.liquid` ruft in Zeile 47 und Zeile 87 `render 'lx-verdichten'` auf.
- Die Rücknahme `ZURUECK=1 LIVE=1 node dropship/seo-kopf-0411/apply2.mjs` steht in CLAUDE.md und in README seo-kopf-0411 (Zeile 41). Sie setzt `main-collection.liquid` zurück und löscht danach `snippets/lx-verdichten.liquid` (apply2.mjs: `loeschen([SNIPPET])`).
- Nach dem Umschalten würde jede Kategorieseite danach ein fehlendes Snippet im Raster rendern. Hypothese, nicht ausgeführt: Statt der Karten erscheint ein Liquid-Fehler.
- Ausserdem wirkt jede künftige Änderung an `main-collection.liquid` nicht mehr auf Kategorieseiten. Die Kopie veraltet still.

**Änderung:**
- Die im BERICHT genannte Alternative nehmen: die 16 Zeilen direkt in `sections/main-collection.liquid` einfügen, mit Sicherung, und `main.type` NICHT wechseln. Dann verweigert apply2 die Rücknahme wegen md5-Abweichung, und das ist sicher.
- Sonst mindestens: apply2.mjs vor dem Löschen prüfen lassen, ob noch eine Theme-Datei `lx-verdichten` rendert, und den Hinweis in README und CLAUDE.md aufnehmen.

### 3. wichtig: Die Rücknahme mit `ANKUENDIGUNG=1` überschreibt `layout/theme.liquid` ganz

**Beleg:**
- `umschalten.mjs` Zeile 53 f.: Steht die render-Zeile in theme.liquid, wird die ganze Sicherung zurückgeschrieben.
- Ob theme.liquid seit dem Umschalten anderweitig geändert wurde, prüft das Skript nicht. Für `collection.json` prüft es das sehr wohl.
- Hero-Video und Scroll-Szene schaltet die Hauptsitzung ebenfalls um. Deren spätere theme.liquid-Änderungen würden still gelöscht.

**Änderung:**
- Rücknahme so bauen, dass sie nur die eine Zeile `{%- render 'lx-ankuendigung-stabil' -%}\n` entfernt.
- Danach prüfen, dass das Ergebnis der Sicherung gleich ist. Sonst abbrechen, mit `FREMD_UEBERSCHREIBEN` als Übersteuerung.

### 4. klein: Das Umschaltskript prüft den Inhalt der neuen Dateien nicht

**Beleg:** Zeile 27 prüft nur, ob die fünf Dateien da sind. Wird ein Snippet nach dieser Prüfung noch geändert, geht ein ungeprüfter Stand live.

**Änderung:** Die md5-Werte aus `hochgeladen.json` (cc664c24…, 7685f889…, a84ad6b2…, 380614de…, 0ada26e7…) im Skript festhalten und vor `LIVE` vergleichen.

### 5. klein: Ohne JavaScript bleiben am Desktop die meisten Chips verborgen

**Beleg (GEMESSEN, Wiedergabe damen-kleider 1440):**
- 58 Chip-Links, davon 9 sichtbar, mit und ohne JS.
- Ohne JS ändern «Alle anzeigen (+25)» und «Alle 28 Kategorien» nichts: Nach dem Klick sind weiterhin 9 sichtbar.
- Vorher ging «Alle N Kategorien» als `<details>` auch ohne JS, und alle Unterfilter waren sichtbar.

**Änderung:** Das Ausblenden an eine Klasse binden, die erst das Skript setzt, zum Beispiel `.lx-kc.js .lx-kc__x{display:none}`. Oder `<details>` statt eines Knopfs verwenden.

### 6. klein: Ohne `:has()` geht «Mehr anzeigen» bei Einzel-Absätzen ins Leere

**Betroffen:** ältere Safari (vor 15.4) und Firefox (vor 121).

**Beleg:**
- Bei 1 086 Sammlungen mit nur einem Absatz ist der Rest leer.
- Ohne `:has()` bleibt der Anriss auch geöffnet auf 1 Zeile gekürzt.
- Im Link-Fall bliebe die Textkopie neben dem echten Absatz stehen.
- Das ist eine Ableitung aus dem CSS, nicht gemessen (kein alter Browser vorhanden).

**Änderung:** `@supports not selector(:has(*)) { .lx-kk__anriss>p, p.lx-kk__anriss { -webkit-line-clamp: unset; display: block } }`. Oder die Kürzung nur innerhalb eines `@supports selector(:has(*))`-Blocks setzen.

### 7. klein: Die Tippfläche «Mehr anzeigen» ist am Handy nur 20 px hoch

**Beleg:**
- GEMESSEN 135 × 20 px auf 5 Live-Seiten.
- Die Abstandsausnahme von WCAG 2.5.8 greift wahrscheinlich: Das nächste Ziel liegt rund 12 px tiefer.
- Für den Daumen ist das trotzdem knapp.

**Änderung:** `min-height: 24px` oder eine grössere Trefferfläche per `::before { inset: -8px -4px }`.

### 8. klein: Nachbar-Kategorien und Versandzeile rutschen am Handy aus dem Bild

**Beleg (GEMESSEN):**
- damen-kleider: Die erste Nachbar-Kategorie steht bei x = 4 642 px, hinter 27 Unterfiltern und 3 Tag-Filtern. Vorher war das die erste Zeile.
- uhren-herren: x = 746 px.
- Die Versandzeile steht rechts neben dem Pfad. Bei creolen ist nur «Gra» zu sehen, bei moissanit-schmuck nichts mehr (Pfad breiter als 390 px).
- Die Gegenprüfung hatte «zusammenlegen oder unter den Kopf» offengelassen.

**Änderung:**
- Entscheid der Hauptsitzung.
- Vorschlag: Nachbar-Kategorien vor die Tag-Filter. Bei langen Pfaden die Versandzeile unter den Kopf.

### 9. klein: «Weniger anzeigen» steht nach dem Öffnen mitten im Text

**Beleg:** `pruefer/bilder/uhren-herren_offen_390.png`. Der Knopf steht zwischen dem ersten Absatz und dem Rest. Nach einem langen Text muss man zum Schliessen zurückscrollen.

**Änderung (optional):** Einen zweiten Schliessen-Knopf am Ende des Rests einfügen. Oder den Summary-Knopf geöffnet ans Ende verschieben, zum Beispiel per `order` mit `details` als Flex-Container.

### 10. klein: Die Kaufhilfen-Nachmessung am 25.11. wird vermischt

**Beleg:** Live bei creolen-ohrclips und uhren-herren ist nur noch die erste Zeile sichtbar. «So wählst du» liegt eingeklappt hinter «Mehr anzeigen». Der Bauer hat das ebenfalls gemeldet.

**Änderung:** Vor dem Umschalten entscheiden: erst nach dem 25.11. umschalten, oder die Messung der 11 Kaufhilfe-Sammlungen neu festlegen.

## Umschalten: Empfehlung des Prüfers

1. Fund 1 beheben und neu messen. Gemessen werden die Tag-Seite bei 390 px und eine normale Seite.
2. Statt `main.type` zu wechseln: die 16 Zeilen in `sections/main-collection.liquid` einfügen (Fund 2), mit Sicherung und md5-Basis 84a055d5.
3. `umschalten.mjs` anpassen:
   - Rücknahme von theme.liquid nur zeilenweise (Fund 3).
   - md5-Pins der neuen Dateien (Fund 4).
4. Termin wegen der Kaufhilfen-Messung festlegen (Fund 10).
5. Danach umschalten wie im BERICHT beschrieben:
   - mindestens 60 s warten,
   - 2 bis 3 Seiten ohne `?view` messen,
   - eine Tag-Seite am Handy messen.
