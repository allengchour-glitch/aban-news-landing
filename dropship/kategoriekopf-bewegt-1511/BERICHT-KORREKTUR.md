# Bewegter Kategoriekopf: Bericht der Korrekturrunde

Stand: 16.11.2026 02:39 UTC (Arbeit 00:32 bis 02:39 UTC, Zeiten aus `date -u`). Ordner: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/bewegt1511`.
Herkunft der Aussagen: **GEMESSEN**, **QUELLE**, **Hypothese**, **unbekannt**. Grundlage: Funde der zwei Prüfer (16.11. 00:15 bis 00:29 UTC) zum Bau in `BERICHT.md`.

## Kurzfassung

- Alle vier wichtigen Funde (W1 bis W4) und K1 bis K6 sind behoben. K7 ist gemessen.
- **Live nur in der Testvorlage** (`?view=lxbewegt`), eingespielt 16.11. 02:06 UTC. Geschrieben wurde nur `snippets/lx-kopf-bewegt.liquid`. `templates/collection.lxbewegt.json` war schon gleich und wurde nicht geschrieben. Umgeschaltet wurde nichts.
- **Die sieben fremden Dateien sind vor und nach dem Schreiben gleich** (GEMESSEN, siehe «Prüfsummen»).
- **Neue Dateien in Shopify Files:** 10 (5 Clips 960×720 und 5 Poster). Keine bestehende Datei ersetzt. Higgsfield: 0 Credits.
- Für Kundinnen hat sich nichts geändert.

## Je Fund: was geändert wurde und der Beleg

| Fund | Änderung | Beleg |
|---|---|---|
| **W1** Ausschnitt der Kopffotos | `.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:clip}` statt `overflow:hidden`. `clip-path:inset(0)` nur als Rückfall in `@supports not (overflow:clip)`. | Ursache bestätigt (GEMESSEN, Nachbau damen-mode 1440): mit `overflow:hidden` ist jedes Bild 230 px hoch, heute 428,77 px (Bild oben bündig, Gesichter sichtbar). Neu: Foto- und Bildkästen gleich wie heute, Kopffotos **pixelgleich** (0 von 314 160 Pixeln abweichend). Alte Fassung: 275 995 Pixel abweichend (87,9 %), bis 144 Stufen. Live gleich, siehe «Live». |
| **W2** Teekanne und Kristall-Set | S08 und S10 entfernt. `geschirr-tisch` und `kaffee-tee-trinken` zeigen S09 (Schwalben-Becher). `teekannen-kaffeeservice` und `deko-objekte-accessoires` ohne Clip. | Mitgliedschaft GEMESSEN (Admin-API 16.11. 00:37 UTC, `live/clips_pruefen.json`): Becher Mitglied von `geschirr-tisch` und `kaffee-tee-trinken`, nicht von `teekannen-kaffeeservice` und `deko-objekte-accessoires`. Ausschnitt S09 neu gewählt (`30% 62%`, Zoom 1,35) und angesehen (`k960/y_s09_b_1.6.png`, `fotos/nb_geschirr-tisch_d.jpg`). Live: Clip s09 auf `geschirr-tisch`, Datei `lx-kb-s09-quer-960.mp4`. |
| **W3** Clip ohne Mitgliedschaft | `premium-geschenke` und `sub-taschen` aus der Zuordnung genommen. Liquid prüft fail closed, ob das Clip-Produkt Mitglied der aktuellen Sammlung ist (`for lxkb_c in lxkb_prod.collections`). Weihnachtskugeln mit Enddatum `lxkb_bis = 20270106` (`'now' | date: '%Y%m%d'`). | GEMESSEN: Weihnachtskugeln nicht Mitglied von `premium-geschenke`, Reisebeutel nicht Mitglied von `sub-taschen`. Nachbau: kein Clip auf beiden; `schmuck` ohne Mitgliedschaft ohne Clip; am 06.01.2027 Clip, ab 07.01.2027 keiner. Live: `premium-geschenke` und `sub-taschen` laden weder Video noch Poster. |
| **W4** AbortError | `p.catch(function(e){if(!e||e.name!=='AbortError')aus();})` | Nachbau-Fall: Video-Anfrage 4 s angehalten, beim Start weggescrollt. Neu: Clip bleibt (pausiert), zurück: Video spielt (`op` 1, über 5 Bilder), Knopf sichtbar. Alt: Video entfernt, Knopf versteckt. |
| **K1** Ausführung | Je Clip eine Varianten-ID wie in `story1511/kapitel.json` (s01 Orange, s03 «Weiss / 7 Zoll», s05 Kaffeefarbe, s06 einzige, s09 Schwalbe). Liquid sucht die Variante in `product.variants` und verlangt `available`. | GEMESSEN Admin-API: alle fünf Ausführungen gehören zum Produkt und sind verkaufbar. Nachbau: Ausführung nicht kaufbar, Produkt kaufbar: kein Clip (alt: Clip). |
| **K2** Anhalten und Parallaxe | Eine Linie: bei Halt sind beide Pfade aus, Versatz 0. CSS: `.lx-kk.lx-kb-halt .lx-kk__bilder,.lx-kk.lx-kb-halt .lx-kb__clip{animation:none!important;translate:none!important}`. Skript-Rückfall setzt `--lxkb-y` beim Anhalten auf 0px und rechnet beim Fortsetzen sofort neu (`pr()` in `zeig()`). | Ursache der alten Fassung (Lesart des Codes, im Nachbau bestätigt): die Regel mit `animation-play-state:paused` verlor gegen die spätere Kurzschreibweise `animation:` gleicher Spezifität. Neu: CSS-Pfad halb herausgescrollt `translate: none`; Rückfall Variable 0px und `none`; nach Scrollen im Halt und Fortsetzen sofort 38 px. Alt: 14,97 % bzw. 34,4 px eingefroren. |
| **K3** Ohne JavaScript | Bühne steht in `<template class="lx-kb-vorlage">`; das Skript setzt sie ab 1100 px ein. Der Textabstand hängt an `.lx-kk.lx-kb-clip` (Klasse setzt das Skript beim Einsetzen). Die 1-px-Platzhalter für das Handy sind damit überflüssig und entfernt. | Nachbau schmuck 1440 ohne JavaScript: 0 Poster, 0 Video, Textabstand rechts 24 px wie heute (alt: Poster geladen, 404,8 px). Mit JavaScript: Abstand 404,8 px schon bei DOMContentLoaded gleich wie nach dem Laden; Kopf nur-Kopf-CLS 0 in allen Läufen. |
| **K4** Fenster unter 1100 px | `matchMedia('(min-width: 1100px)')` mit Listener: darunter `pause()`, darüber wieder `play()`. | Nachbau: 1440 spielt, auf 1000 px pausiert (Zeit steht), zurück auf 1440 läuft. Alt: spielte bei 1000 px unsichtbar weiter. |
| **K5** Clip-Grösse | Neue Fassungen 960×720 aus den Quellen von `story1511/kodieren.py` (gleicher Ausschnitt, CRF 23, GOP 48, vor und zurück, 94 Bilder), Poster WebP Qualität 78. Als neue Dateien hochgeladen (`lx-kb-<id>-quer-960.mp4|webp`). | Vergleich bei DPR 2 im Kopfkasten 460×300 mit Ausschnitt und Zoom wie im Snippet (`k960/vergleich.cjs`): PSNR 960 gegen 1440 = 40,7 bis 41,3 dB (s03, Zoom 1,45), 41,7 bis 41,9 (s09), 42,1 bis 42,3 (s01), 41,5 bis 41,7 (s06), 39,0 bis 39,8 (s05). Angesehen (`k960/k5_ausschnitt.png`, `k960/k5_nah.png`): bei s03 1:1 auf DPR 2 minimal weicher an den Steinen, sonst gleich. Mein Urteil: gut. Grösse: s01 498 → 218 KB, s03 471 → 219, s05 702 → 396, s06 368 → 167, s09 352 → 147. Hochgeladene mp4 md5 gleich lokal (3 von 3 geprüft), Shop-Pfad `/cdn/shop/files/…` HTTP 206 (mp4, webp). Live: alle Clips `videoWidth` 960. |
| **K6** Rückfall schreibt bei jedem Bild | Wert nur bei Änderung schreiben (`if(y!==py)`). | Nachbau, 30 Bilder mit Scroll-Ereignis ohne Bewegung: 0 Schreibvorgänge (alt: 30). Echte Bewegung schreibt weiter (1 → 6). |

### Nebenbefund beim Testen (kein Fund der Prüfer)

- W1-Pixelvergleich: Solange die Ken-Burns- oder Parallaxe-Animation als Grafikebene läuft (auch angehalten bei Zeit 0), glättet Chrome die Fotos anders: 82 % der Pixel weichen um höchstens 23 Stufen ab, ohne jeden Versatz (Geometrie gleich, GEMESSEN). Darum vergleicht der Test bei Zeit 0 mit ausgeschalteten Animationsebenen; Lage und Ausschnitt bleiben dabei unverändert. `clip-path:inset(0)` allein verursacht 1 358 abweichende Pixel (bis 34 Stufen): deshalb nur noch als Rückfall.
- Die alte Prüfung «Knopf überdeckt keinen Text» zählte auch Absätze im zugeklappten «Mehr anzeigen» (unsichtbar). Auf `weihnachten-2026` und `wohnen-dekoration` bei 800 und 1099 px gab das 4 Fehlalarme. Prüfung auf sichtbaren Text eingeschränkt; auch mit geöffnetem «Mehr anzeigen» überdeckt der Knopf keinen Text (GEMESSEN, `test/knopf_probe.cjs`).

## Clip-Zuordnung jetzt

| Clip | Produkt (Ausführung) | Kategorien |
|---|---|---|
| s03 | Tennisarmband (Weiss / 7 Zoll) | `schmuck`, `sub-armbaender`, `gliederarmbaender`, `zirkonia-strassarmbaender` |
| s01 | Tulpen-Nachtlicht (Orange) | `sub-beleuchtung`, `nachtlichter-ambiente`, `wohnen-dekoration` |
| s05 | Weihnachtskugeln (Kaffeefarbe), bis 06.01.2027 | `weihnachten-2026` |
| s06 | Reisebeutel Rindsleder (einzige) | `damen-reisetaschen`, `herren-reisetaschen`, `sub-reise` |
| s09 | Retro-Vogel-Becher (Schwalbe) | `geschirr-tisch`, `kaffee-tee-trinken` |

Ohne Clip (Fotostreifen mit Bewegung): alle anderen, darunter `premium-geschenke`, `sub-taschen`, `teekannen-kaffeeservice`, `deko-objekte-accessoires`, `damen-mode`, `kueche-kochen`.

## Tests (Nachbau: gespeichertes echtes HTML vom 16.11. 00:37 UTC, Snippet lokal mit LiquidJS)

| Lauf | Ergebnis |
|---|---|
| `nachbau_test.cjs`, 8 Seiten (schmuck, damen-mode, kueche-kochen, geschirr-tisch, weihnachten-2026, beauty-pflege, wohnen-dekoration, sub-baby-kids) × 1440, 1100, 1099, 800, 390 px | 660 bestanden, 4 Fehlalarme (siehe Nebenbefund); nach Korrektur der Prüfung die 4 Fälle nachgefahren: 72 bestanden, 0 fehlgeschlagen. `geschirr-tisch` mit dem endgültigen S09-Ausschnitt nachgefahren: 83 bestanden, 0 fehlgeschlagen. |
| `faelle_test.cjs`, alle Fälle (alt und neu) | 55 bestanden, 0 fehlgeschlagen (Endstand). |
| **Rot mit altem Snippet** (`theme_alt/`, md5 `d84137f5…`) | Liquid-Fälle W2, W3, K1: 10 von 11 rot. Browser-Fälle W4, K2, K3, K4, K6: 9 von 16 rot (K2 nach Verschärfung 2 von 4 rot). Nachbau damen-mode und schmuck 1440: 4 rot (W1 Geometrie und Pixel, K5). |

Neue Prüfungen: W1 (Geometrie jedes Fotos und Pixelvergleich bei Zeit 0, je Desktop-Profil), K5 (`videoWidth` 960), Fälle `w2`, `w3`, `k1`, `w4`, `k2`, `k3`, `k4`, `k6`. Hilfsdateien: `test/bildgeo.cjs`, `test/w1_probe.cjs`, `test/w1_rauschen.cjs`, `test/w1_bisekt.cjs`, `test/w1_ursache.cjs`, `test/knopf_probe.cjs`, `test/kontrast.cjs`.

## Mutationsprobe (`test/mutationsprobe.mjs`, Lauf 02:01 bis 02:27 UTC, Protokoll `mess/korr_mutation.log`)

- 28 Mutanten (14 alte, angepasst an den neuen Text, 14 neue). Ergebnis des Laufs: 25 erkannt, 2 überlebt (M16, K2b), 1 gleichwertig (M17), 0 ungeklärt. Quelle vorher und nachher gleich (`1dbd90d1…`).
- **K2b** (Rückfall setzt die Variable beim Anhalten nicht zurück) überlebte, weil die CSS-Regel `translate:none!important` den Versatz trotzdem auf 0 zieht. Prüfung verschärft (Variable 0px, Fortsetzen nach Scrollen im Halt): K2b und K2a danach **erkannt** (02:33 UTC, `test/mutationsprobe_korrektur_k2.json`). Stand damit: **26 erkannt, 1 überlebt, 1 gleichwertig**.
- **M16** (Ken Burns vor dem Laden der Kopffotos) überlebt: LCP damen-mode, gedrosselt, 3 Läufe, Mutant 712 ms gegen heute 744 ms, gleiches LCP-Element (GEMESSEN 02:29 UTC). In der ersten Runde kostete derselbe Mutant +1 700 ms. Hypothese: seit W1 (gleich hohe Bildkästen wie heute) wird ein spät geladenes, schon vergrössertes Foto nicht mehr zum grösseren LCP-Kandidaten. Die Schutzlogik bleibt drin.
- Neue Mutanten (alle erkannt): W1a (`overflow:hidden`), W1b (`clip-path` immer), W2 (Geschirr wieder S08), W3a (Mitgliedschaft nicht geprüft), W3b (Enddatum nicht geprüft), W4 (`p.catch(aus)`), K1 (Ausführung nicht geprüft), K2a, K2b, K3a (Abstand ohne Klasse), K3b (versteckter div statt template), K4, K6.

## Live-Messung (16.11. 02:06 bis 02:13 UTC, Testseiten, Analytik blockiert, ein Aufruf je 7 s)

| Lauf | Seiten | Ergebnis |
|---|---|---|
| Desktop 1440×900 | schmuck, geschirr-tisch, weihnachten-2026, sub-taschen, premium-geschenke, deko-objekte-accessoires, damen-mode, kueche-kochen, beauty-pflege | **120 OK, 0 Fehler**: HTTP 200, 0 Liquid-Fehler, 0 Seitenfehler, kein seitliches Scrollen. Clip s03, s09, s05 spielt, Datei `lx-kb-…-960`, `videoWidth` 960. Auf den 6 anderen kein Video und kein Poster, Fotos driften. Kopf beim ersten Zeichnen gleich wie nach dem Laden, nur-Kopf-CLS 0, Parallaxe beim Herausscrollen. |
| W1 live, 1440 | damen-mode, kueche-kochen, beauty-pflege, je gegen heute ohne `?view=` | Kästen gleich, Kopffotos **pixelgleich** (je 0 von 314 160 Pixeln). Heute-Kasten damen-mode 340 × 428,77 px. |
| d1100 (1100×900) | schmuck, damen-mode | **28 OK, 0 Fehler**; damen-mode W1 pixelgleich (0 von 235 620). |
| Handy 390×664 | schmuck, damen-mode, je gegen heute | **20 OK, 0 Fehler**: Kopfhöhe 62 und erstes Produktbild bei 388 px wie heute; kein Clip, kein Poster, kein Knopf. |

- LCP live (ungedrosselt, nur Lesung): Clipseiten 2 352 bis 3 960 ms mit LCP-Element `lx-kb__amb`, andere 1 704 bis 2 820 ms. Kein Vergleich gegen heute in diesem Lauf (unbekannt, ob anders).
- Seitenaufrufe dieser Runde: 27 (8 HTML für den Nachbau, 19 Live-Prüfung), kein HTTP 429.

## K7: CLS bei 1099 und 1100 px (Nachbau, je 5 Läufe abwechselnd heute und Test, `mess/k7_cls_*.log`)

| Seite, Breite | Median heute | Median Test | nur Kopf (Test) |
|---|---|---|---|
| geschirr-tisch, 1099 | 0,1033 | 0,0271 | 0, 0, 0, 0, 0 |
| geschirr-tisch, 1100 | 0,0271 | 0,0766 | 0, 0, 0, 0, 0 |
| weihnachten-2026, 1099 | 0,0539 | 0,0811 | 0, 0, 0, 0, 0 |
| weihnachten-2026, 1100 | 0,0525 | 0,0140 | 0, 0, 0, 0, 0 |

- Einzelwerte streuen in beiden Fassungen von 0 bis 0,41. Die grossen Verschiebungen betreffen den ganzen Abschnitt (Quellen `section--page-width`, Kopf, Produktraster) und treten heute genauso auf (heute 0,4074 und 0,414; Test 0,4077 und 0,3311). Ein Unterschied durch den Testkopf ist nicht belegt. Die nur-Kopf-Verschiebung ist in allen 20 Testläufen 0 (GEMESSEN).

## K7: Kontrast nach W1 (Nachbau 1440, Text ausgeblendet, hellste 2 % des Hintergrunds je Textelement gegen die Textfarbe, ohne Textschatten)

| Seite | Zustand | Titel | Anriss | «Mehr anzeigen» |
|---|---|---|---|---|
| kueche-kochen | heute / Test Zeit 0 / Test Drift-Ende | 5,78 / 5,78 / 5,87 | 3,57 / 3,56 / 3,61 | (kein Knopf) |
| beauty-pflege | heute / Test 0 / Ende | 8,76 / 8,76 / 8,77 | 3,15 / 3,15 / 3,15 | 11,73 / 11,6 / 11,6 |
| sub-baby-kids | heute / Test 0 / Ende | 8,76 / 8,76 / 8,76 | 4,79 / 4,79 / 4,8 | 12,89 / 12,76 / 12,94 |
| damen-mode | heute / Test 0 / Ende | 9,18 / 9,18 / 9,18 | 6,75 / 6,77 / 6,82 | 11,92 / 11,74 / 11,92 |

- Der Testkopf ändert den Kontrast um höchstens 0,13 (alle Werte :1). Die tiefen Anriss-Werte (3,15 und 3,57) bestehen schon heute; mit dieser strengen Methode (ohne Textschatten) liegen sie unter 4,5:1. Das ist der bekannte Befund «Kontrast kueche-kochen heute» (dort 4,22:1 mit anderer Methode), bewusst nicht behoben.

## Prüfsummen (checksumMd5, MAIN `gid://shopify/OnlineStoreTheme/213991391623`)

| Datei | vorher (00:36 UTC) | nach dem Schreiben (02:06) | Schluss (02:39) |
|---|---|---|---|
| `snippets/lx-kopf-bewegt.liquid` (eigene) | `d84137f57851b747228a6afd1125c0ea` | `1dbd90d144ef65d153d829ea39d84dad` (Rücklesen GLEICH, 14 032 Byte) | gleich |
| `templates/collection.lxbewegt.json` (eigene) | `bdb35745ee7d5c0722f9ad5f15cf4793` | nicht geschrieben (schon gleich), Rücklesen GLEICH | gleich |
| `templates/collection.json` | `f7592acb1a336cbcd98552693fd08ff4` | unverändert | gleich |
| `snippets/lx-kopf-kompakt.liquid` | `a27ed6b6248968534648517fd58f8cd0` | unverändert | gleich |
| `snippets/lx-kopf-pfad.liquid` | `69565ad5f8d9fde2fe6825f0afa87b5e` | unverändert | gleich |
| `snippets/lx-kopf-chips.liquid` | `74104de0caa980fb1d751e0261f5d6bd` | unverändert | gleich |
| `sections/main-collection.liquid` | `f928eda786bfa8cb29905a5ecf1ecd0c` | unverändert | gleich |
| `layout/theme.liquid` | `62a77592ae9e0648d2ccec60bdf23979` | unverändert | gleich |
| `AGENTS.md` (Theme) | `11947bfa3323a9f8f0cb9f661769f36a` | unverändert | gleich |

`apply_bewegt.mjs` liest jetzt auch `AGENTS.md` und bricht ab, wenn eine fremde Datei vom erwarteten Stand abweicht (Trockenläufe 01:09, 01:10, 02:06 UTC, je als eigener Aufruf vor `LIVE=1`). `umschalten.mjs` wurde nicht ausgeführt.

## Neue Shopify-Dateien (GenericFile, READY, 16.11. ca. 00:41 UTC)

| Datei | ID | Byte |
|---|---|---|
| `lx-kb-s01-quer-960.mp4` | 78072996397447 | 218 282 |
| `lx-kb-s01-quer-960.webp` | 78073000984967 | 17 150 |
| `lx-kb-s03-quer-960.mp4` | 78073006522759 | 218 693 |
| `lx-kb-s03-quer-960.webp` | 78073011962247 | 14 504 |
| `lx-kb-s05-quer-960.mp4` | 78073014485383 | 396 359 |
| `lx-kb-s05-quer-960.webp` | 78073022546311 | 33 002 |
| `lx-kb-s06-quer-960.mp4` | 78073029001607 | 166 988 |
| `lx-kb-s06-quer-960.webp` | 78073034736007 | 18 986 |
| `lx-kb-s09-quer-960.mp4` | 78073038012807 | 147 291 |
| `lx-kb-s09-quer-960.webp` | 78073049481607 | 17 760 |

Adressen in `k960/urls.txt`, IDs in `k960/files_ids.txt`. Die `lx-story-*`-Dateien (Startseiten-Geschichte) sind unberührt.

## Rücknahme

- Korrektur zurücknehmen: alten Snippet aus `theme_alt/snippets/lx-kopf-bewegt.liquid` nach `theme/snippets/` kopieren, Trockenlauf, dann `LIVE=1 node apply_bewegt.mjs` (das Buch `eingespielt.json` kennt den Stand `1dbd90d1…` als eigenen; Sicherung des alten Buchs `sicherung/eingespielt.vor-korrektur.json`).
- Testvorlage ganz entfernen: `ZURUECK=1 LIVE=1 node apply_bewegt.mjs` (unverändert).
- Neue Dateien löschen: `fileDelete` mit den 10 IDs oben (erst, wenn nichts mehr darauf zeigt).

## Bewusst offen (nur gemeldet, nicht behoben)

- Die zwei sofort geladenen, auf Clipseiten ausgeblendeten Kopffotos laden weiter (kommen aus `lx-kopf-kompakt`).
- Kontrast Anriss auf hellen Kategorien heute unter 4,5:1 (kueche-kochen 3,57, beauty-pflege 3,15 mit obiger Methode); der Testkopf ändert daran nichts.

## Offen und ungemessen

- Safari, iPhone, Firefox, echtes Gerät: nicht gemessen (nur Chromium). `overflow:clip` gibt es in Safari ab 16 (QUELLE: allgemeines Wissen, nicht nachgeprüft); ältere Fassungen nehmen den `clip-path`-Rückfall, dessen Bildglättung im Chrome-Pixelvergleich leicht abweicht.
- Das Enddatum der Weihnachtskugeln wird mit `'now'` beim Rendern geprüft. Wie lange Shopify die gerenderte Seite zwischenspeichert, ist unbekannt (höchstens kurz nach Mitternacht relevant). Shop-Zeitzone nicht nachgelesen.
- `product.collections` in Shopify-Liquid liefert nur auf dem Onlineshop veröffentlichte Sammlungen (QUELLE Shopify-Doku, nicht neu gelesen). Wird eine Clip-Sammlung unveröffentlicht, fällt ihr Clip weg (fail closed).
- M16 überlebt (siehe Mutationsprobe); Ursache nur als Hypothese.
- CLS gesamt schwankt bei 1099 und 1100 px heute und im Test stark; ein Einfluss des Testkopfs ist weder belegt noch ausgeschlossen. Nur-Kopf-CLS 0.
- Seitengrösse: Snippet gibt je Clipseite rund 8,6 KB aus (Stil 4 266 Byte, Bühne und Skript 4 307 Byte; vorher 4 116 und 4 149), auf anderen Seiten rund 8,0 KB. Ob `wohnen-dekoration` unter 2 MiB bleibt, ist live nicht nachgemessen (Rechnung: rund +260 Byte gegenüber 2 000 327 Byte).
- Der Rechner war während der Messungen stark ausgelastet (Last 11 bis 15 auf 4 Kernen durch andere Abläufe): Zeitwerte (LCP, CLS) darum mit Vorsicht.
- Wirkung auf Käufe unbekannt.

## Testlinks

- Clip s03: https://luxestyle.ch/collections/schmuck?view=lxbewegt
- Clip s09: https://luxestyle.ch/collections/geschirr-tisch?view=lxbewegt
- Clip s05: https://luxestyle.ch/collections/weihnachten-2026?view=lxbewegt
- Clip s01: https://luxestyle.ch/collections/sub-beleuchtung?view=lxbewegt
- Clip s06: https://luxestyle.ch/collections/sub-reise?view=lxbewegt
- Ohne Clip (früher Weihnachtskugeln): https://luxestyle.ch/collections/premium-geschenke?view=lxbewegt
- Ohne Clip (früher Reisebeutel): https://luxestyle.ch/collections/sub-taschen?view=lxbewegt
- Fotostreifen (W1): https://luxestyle.ch/collections/damen-mode?view=lxbewegt
- Fotostreifen (W1): https://luxestyle.ch/collections/kueche-kochen?view=lxbewegt
