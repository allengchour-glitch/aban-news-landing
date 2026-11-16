# Scroll-Geschichte für die Startseite («20k-Webseite»): Bericht, Fassung 2 (Korrekturrunde)

Stand: 16.11.2026, 02:29 UTC (`date -u`). Ordner: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/story1511`.
Herkunft der Aussagen: **GEMESSEN**, **QUELLE**, **Hypothese**, **unbekannt**. Fassung 1 liegt in `theme_v1/` und im Abschnitt «Fassung 1» am Ende.

## Kurzfassung

- **Testlink:** https://luxestyle.ch/?view=lxstory. Die normale Startseite `/` ist unverändert. Für Kundinnen ist nichts umgeschaltet.
- Fassung 2 ist seit **15.11.2026 23:45 UTC** live in der Testvorlage (nur eigene Dateien im MAIN-Theme `213991391623`), Nachträge **16.11. 00:52 und 01:25 UTC** (Pause bleibt im letzten Kapitel; Punkt-Sprung lädt keine Zwischenvideos mehr, auch unter Last; siehe unten).
- **Neu: der Hintergrund hängt sichtbar an der Scrollposition.** Je Kapitel fährt das Bild beim Scrollen von 1,24 auf 1,00 heraus und schwenkt seitlich (Richtung wechselt je Kapitel). Das nächste Kapitel schiebt sich als Vorhang von unten über das alte (gebunden an die Scrollposition, mit weichem Schatten an der Kante). Das grosse Wort wächst beim Hereinkommen von 1,25 auf 1,00. Text und Kaufkarte laufen gemeinsam mit Parallaxe (0,68-fach). Dazu laufen die Produktvideos.
- **Kapitel neu besetzt** (Wahrheitsfunde der Prüfer): Küche zeigt jetzt den Schwalben-Becher (statt Teekanne), Geschenke die Ewige Rose «Rosarot» (statt Kristall-Set), das Wort über der Reisetasche heisst «Reisen» (statt «Mode»). Rindsleder ist jetzt belegt (CJ-Datenblatt). Schmuck zeigt keine Zoll-Angabe mehr.
- **Higgsfield: 0 Credits** (auch in dieser Runde nur vorhandenes Material vom 11.11.).
- **Tests:** Nachbau 126 von 126 bestanden; Mutationsprobe auf dem Endstand 33 von 33 erkannt (vorher in dieser Runde 3 Überlebende, dafür 3 neue Prüfungen). Live auf dem echten Shop nachgemessen: Laden, Videos, CLS, letztes Kapitel, Punkt-Sprung, Verfügbarkeit (Desktop und Handy).

## Funde der Prüfer: was ich nachgestellt und gemacht habe

| Fund (Schwere) | nachgestellt? | Massnahme | Beleg danach |
|---|---|---|---|
| Karte überdeckt Wort und Zeile (wichtig) | ja, Ursache: Karte lief gegenläufig (1,1-fach gegen 0,68-fach) | Karte läuft genau wie der Text (`karteY = textY`) | T19: 0 Überdeckungen bei Textdeckkraft ≥ 0,5 auf Desktop, Handy und Tablet (Nachbau) |
| LCP-Vergleich «/» gegen Testvorlage taugt nicht (wichtig) | ja (Testvorlage lädt `luxe-edit.css` an anderer Stelle) | Vergleich jetzt gleiche Vorlage mit und ohne Geschichte (im Prüfbrowser herausgeschnitten) | siehe «Leistung» |
| TBT +1,1 s auf dem Handy (wichtig) | teilweise, siehe «Leistung» | Stil aus dem `<body>` in den `{% stylesheet %}`-Block (Shopify lädt ihn im `<head>`), Platzhalter-Stil ebenso, Höhe als Inline-Wert; erste Messung im Skript erst im Leerlauf | siehe «Leistung» |
| Stilarbeit beim Scrollen durch geerbte Variablen (wichtig) | übernommen aus der Prüfer-Messung | Skript setzt `transform`/`opacity` direkt am Element, schreibt nur bei Änderung | siehe «Leistung» |
| Tablet CLS 0,0725 (wichtig) | ja: Kopfzeile 59 px bei Touch, nicht nach Breite (GEMESSEN: 768×1024 mit Touch 59 px, ohne Touch 87,6 px) | Kapitelabstände hängen nicht mehr an der Kopfzeilen-Messung (feste 88 px bzw. 59 px), die Messung wirkt nur noch auf `transform`/Höhe in der Bühne; Vorgabe 59 px bei `(hover:none) and (pointer:coarse)` | T22: Tablet CLS < 0,01 (Nachbau) |
| Pause-Knopf und Punkte unter den Kapiteln (wichtig) | ja | eigene klebende Steuerleiste über den Kapiteln (`z-index:3`); Pause auf dem Desktop oben rechts (unten rechts liegt der Hilfe-Knopf des Themes, links die Karten) | T21: Pause an jeder Position oberster Treffer (Desktop, Handy, Tablet, Hilfe-Knopf sichtbar) |
| Schnelles Scrollen lädt alle Zwischenvideos (klein) | ja | Video erst nach 300 ms Ruhe im Kapitel; Vorladen des nächsten nur, solange das Kapitel aktiv ist. **Nachtrag 16.11. 01:25 UTC** (eigener Fund unter Last: beim Punkt-Sprung lud der weiche Bildlauf des Themes im Auslaufen noch das Kapitel vor dem Ziel, GEMESSEN `{"k":"5","neu":["lx-story-s09","lx-story-s11"]}`): der Zeitgeber liest beim Ablauf die echte Lage frisch, und während eines Sprungs per Punkt werden Zwischenkapitel übersprungen (höchstens 3 s, eigene Eingabe mit Mausrad, Berührung oder Taste bricht ab) | T23 (Punkt-Sprung 1 → 6 lädt nur das Zielvideo), T23b (langsames Gerät, Bilder 500 ms verspätet), T23c/d/e (Sprung langsam nachgestellt: Zwischenkapitel übersprungen, Frist 3 s, Abbruch per Mausrad) |
| Videos werden nie freigegeben (klein) | ja | Videos weiter als ein Kapitel entfernt werden entladen | T24: nach dem Durchlauf höchstens 2 Videos mit Quelle |
| Fokus-Punkte unter der Fussleiste (klein) | ja | `scroll-margin`; Punkte liegen jetzt in der Steuerleiste oben; Tastaturfokus auf einer Karte holt das Kapitel in die Mitte | T9: alle 6 Karten per Tab erreichbar und ganz im Bild |
| Reduzierte Bewegung zur Laufzeit, `-webkit-backdrop-filter` (klein) | ja (Code gelesen) | `change`-Hörer stoppt alles; Präfix ergänzt | T25 |
| Teekanne «unbeschichtet» gegen rosa (wichtig) | QUELLE CJ (pid 2408310314351609800, 15.11. 23:1x UTC): «Sand Mold Manual Uncoated Iron Teapot», Farbe «Pink». Der Lieferant nennt also beides; ob die Farbe eine Beschichtung ist, bleibt unbekannt | Kapitel Küche mit dem Schwalben-Becher neu besetzt (Produkttitel nicht geändert: keine Produktänderungen in diesem Auftrag) | Befund an den Besitzer (Offen) |
| Teekanne auf Sockel, der nicht geliefert wird (wichtig) | ja | erledigt durch den Wechsel zum Becher | |
| Kristall-Set: Lieferumfang nicht belegt, SKU «…-3-TEILIG» bei 8 Steinen (wichtig) | ja (Admin: SKU `LX-23-KRISTALL-SET-3-TEILIG`) | Kapitel Geschenke mit der Ewigen Rose neu besetzt (CJ-belegt, siehe unten) | Befund an den Besitzer (Offen) |
| «Nicht krass», Hintergrund bewegt sich kaum (wichtig) | ja: alte Zoomspanne 1,08 bis 1,00 | Zoom 1,24 bis 1,00, Schwenk bis 8 %, Vorhang-Übergang an der Scrollposition, Wort wächst ein | siehe «Bewegung» und Bildschirmfotos |
| Handy wie Kartenstapel (klein) | ja | Video rund 62 % der Höhe, Text ohne Kasten direkt auf dem unteren Videorand, kleineres Wort, kompakte Karte (Bild 64 px, Titel einzeilig) | Bildschirmfotos `live2/h_bogen.jpg` |
| Erster Bildschirm unverändert (klein) | ja | nicht geändert: Platz bleibt nach dem Hero (Entscheid des Besitzers, kein Umbau von `luxe-edit-home`) | Offen |
| Leere Bühne mit Punkten am Ende (klein) | ja | letztes Kapitel kürzer (115 svh, Handy 110 svh), Steuerleiste blendet ab 97 % aus, Platzhalterhöhe nachgeführt | T26, T27; Bild `fotos2/d/99_ende.jpg` |
| «Mode» über Reisetasche (klein) | ja (productType Taschen) | Wort «Reisen» / «Voyage», Zeile «Für Wochenenden und lange Wege.» | |
| «Rindsleder» unbelegt (klein) | **QUELLE CJ** (pid 616F5B80-…, 15.11. 23:1x UTC): «Material: Leather, Cortex features: first layer cowhide» | Titel bleibt (belegt) | |
| Armband «Weiss / 7 Zoll» (klein) | ja | Block-Einstellung `variante_zeigen`, beim Armband aus | T16 |
| `/fr`: drei Produkttitel deutsch (klein) | ja (gemessen von den Prüfern) | nicht geändert: Produktübersetzungen sind Produktänderungen | Offen |
| Kartenbild Teekanne (klein) | | entfällt (Becher) | |
| Fremddateien veraltet, `umschalten.mjs` prüft nur `index.json` (klein) | ja: `theme.liquid` 62a77592…, `luxe-edit-home` 8ef12062…, `index.json` aa3d1772… (von anderen Abläufen geändert) | `umschalten.mjs` prüft `index.json` gegen aa3d1772… und warnt bei anderem Stand von `theme.liquid` und `luxe-edit-home`; Testvorlage aus der heutigen `index.json` neu gebaut | |
| Saisonale Kapitel (klein) | ja | Block-Einstellung «Sichtbar bis»; Wohnen (Weihnachtskugeln) bis 06.01.2027, danach fällt es von selbst weg | T16 «abgelaufen» |
| **Eigener Fund beim Ansehen der Live-Fotos:** im letzten Kapitel fehlten Pause und Punkte, obwohl das Video lief (wichtig, Barrierefreiheit: ein laufendes Video braucht einen Halt-Knopf). Ursache: meine Ausblendung «am Ende» griff ab 97 % Fortschritt, das ist schon die Mitte von Kapitel 6 | ja (Bild `live2/d_bogen.jpg`, Feld 6) | Ausblenden erst, wenn die Bühne wegscrollt (100 %), und nur Punkte und Balken; die Pause bleibt, bis sie mit der Bühne aus dem Bild fährt. Live 16.11. 00:52 UTC | T26, T26b, T26c; live 00:53/00:54 UTC Desktop und Handy: im letzten Kapitel Pause sichtbar und oberster Treffer, Punkte da, 1 Video läuft; am Schluss Punkte weg, Pause da (`live3/d_ende_bogen.jpg`, `live3/h_ende_bogen.jpg`) |
| Eigener Fund der Mutationsprobe: drei Schutzschichten ungeprüft (Steuerleiste über den Kapiteln, Kapitel lassen Klicks durch, Kapitelabstand ohne Kopfzeilen-Messung) | ja (Mutanten M14, M26, M24 überlebten den Test) | drei neue Prüfungen T21b, T21c, T22b, je Schicht einzeln (die andere Schicht im Test ausgeschaltet) | siehe «Tests» |
| T9 schwankte unter Last (eigener Fund) | ja: das Theme setzt `html{scroll-behavior:smooth}`, das Zentrieren nach dem Tab läuft weich, der Test wartete fest 450 ms | Test wartet bis 2,5 s auf das Ende der Bewegung und urteilt dann; Code unverändert | M25 (Fokus ohne Zentrieren) wird weiter erkannt |

## Kapitel und Produkte (Wahrheit)

| Kapitel | Clip | Produkt (Handle) | Ausführung | Preis live |
|---|---|---|---|---|
| Licht | S01 | `led-tulpen-planet-nachtlicht-fur-tisch-618400` | Orange `67679802950023` | CHF 28.90 |
| Schmuck | S03 | `dreifachklinken-tennisarmband-mit-zirkon-613400` (Titel heute «Tennisarmband mit dekorativem Besatz») | `67672760975751` (Zeile ausgeblendet) | CHF 16.90 |
| Wohnen (bis 06.01.2027) | S05 | `weihnachtskugeln-beflockt-9-stuck-625300` | Kaffeefarbe `67843689152903` | CHF 18.90 |
| Reisen | S06 | `reisebeutel-aus-rindsleder-44x20x28-cm-01ba7c` | einzige `67726147944839` | CHF 71.90 |
| Küche | S09 | `retro-vogel-keramikbecher-mit-ballgriff-637200` | Schwalbe `67675894710663` | CHF 17.90 |
| Geschenke | S11 | `ewige-rose-mit-led-licht-718080` | Rosarot `55881738092929` | CHF 17.90 |

- **GEMESSEN Admin-API 23:2x UTC:** alle sechs ACTIVE, im Onlineshop veröffentlicht, Ausführung `availableForSale`. **Storefront:** `/products/<handle>.js` im Browser (Seitenkontext von `/fr?view=lxstory`, 16.11. 00:04 UTC): 6 von 6 HTTP 200, `available=true` für Produkt und verlinkte Ausführung (`mess2/fr_js.log`).
- **Becher:** CJ `CJYD3106149` (QUELLE CJ 23:1x UTC): Keramik, Variante «Swallow», Variantenbild `cefcf398…` = Shopify-Hauptbild der Ausführung Schwalbe. Clip S09 (angesehen, `pruef2/bogen_s09_*.jpg` gegen `pruef/bogen_S09.jpg`): drei Schwalben, Kugelhenkel, welliger Rand wie das Shopfoto. Daneben liegt eine Leinenserviette (Requisit, liegt neben dem Becher, nicht darunter; Hypothese: nicht als Lieferumfang lesbar).
- **Ewige Rose:** CJ `CJJT1343158` (QUELLE CJ 23:1x UTC): die Variante «Rose Red» (`CJJT134315803CX` = Shopify «Rosarot») trägt das Bild `713f32a5…`; das ist das Shopify-Hauptbild und die Vorlage des Clips S11 (laut `hero1111b/produzent/szenen_final.json`). Lieferliste CJ: «Glass cover immortal flower × 1»; Batterien laut Text nicht enthalten (der Clip zeigt keine). Clip angesehen (`pruef2/bogen_s11_*.jpg`): Rose unter Glaskuppel, goldene Blätter, Holzsockel wie die Shopfotos.
- **Reisebeutel:** CJ «first layer cowhide», Farbe «Coffee» (QUELLE CJ).
- **Clips der neuen Kapitel neu kodiert und angesehen:** je 6 Einzelbilder quer und hoch (`pruef2/`). Keine Schrift, keine Marken, kein fremdes Produkt.
- **Texte:** keine Preise, Rabatte, Lieferzeiten oder Wirkversprechen (T16). Preis nur in der Karte, live aus Liquid.

## Bewegung (Kernwunsch «Hintergrund bewegt sich beim Scrollen»)

**GEMESSEN live** (`mess2/spur2.cjs`, 16.11. 00:0x UTC, Kapitel 2, 5 Scrollpositionen je 300 px, Abmessungen des Hintergrundbilds):

| | Breite des Bilds | linke Kante | Vorhang der Ebene |
|---|---|---|---|
| Desktop 1440×900 | 1286 → 1249 → 1213 → 1176 → 1139 px | 206 → 254 → 292 → 322 → 343 px | 30,9 % → 0 % |
| Handy 390×844 | 466 → 452 → 437 → 422 → 407 px | −59 → −39 → −23 → −12 → −4 px | 46,1 % → 0 % |

- Desktop: rund 37 px Breitenänderung je 300 px Scroll (Fassung 1 laut Prüfer: rund 12 px), dazu bis rund 48 px Schwenk je 300 px.
- Vorhang (gerechnet): das neue Bild schiebt sich auf dem Desktop über 558 px Scroll ganz herein (812 px Bildhöhe), also schneller als die Seite. Das ist der deutlichste Effekt beim Scrollen.
- Angesehen (Nachbau `fotos2/d_bogen.jpg`, `fotos2/h_bogen.jpg`, live `live2/d_bogen.jpg`, `live2/h_bogen.jpg`): Kapitelmitte und Vorhang je Kapitel. Mein Urteil: deutlich lebendiger als Fassung 1, die Übergänge wirken wie ein Schnitt im Werbefilm, ohne dass ein Produkt verdeckt bleibt. Grenzen: Die Videos selbst sind ruhig (langsame Kamerafahrt, 3,9 s Schleife); «krass» im Sinn von schnellen Schnitten ist es nicht, eher edel mit klarer Bewegung (Hypothese, wie Kundinnen es empfinden: ungemessen).

- Entscheid weiterhin: Video wird abgespielt, nicht an die Scrollposition gebunden (Ruckeln beim Suchen, gemessen in Fassung 1: GOP 1 ruckelt bei 15 % der Schritte, CPU ×4 56 %, und bräuchte 7,6 MB). Gebunden an die Scrollposition sind jetzt Zoom, Schwenk, Vorhang, Wort und Parallaxe. Das sind reine `transform`-Änderungen ohne Videosuche.
- Eine scrollgebundene Bildfolge (Vorschlag der Prüfer) habe ich nicht gebaut: der Vorhang liefert den Scrub-Moment ohne zusätzliche Bytes (Hypothese: wirkt für Kundinnen ähnlich; ungemessen).

## Leistung

**Laden, live** (`test/live_messen.cjs`, ein Seitenaufruf je Lauf, 15.11. 23:46 bis 23:49 UTC):

| Lauf | vor dem Scrollen | Videos | Video-Bytes gesamt | CLS | Seitenfehler |
|---|---|---|---|---|---|
| Desktop 1440×900 | 1 Poster (`s01-quer`, 30 513 B), 0 Video-Bytes | 6 von 6 spielen im eigenen Kapitel | 2 858 505 B (Grenze 4 MB) | 0,0001 | 0 |
| Handy 390×844 | 1 Poster (`s01-hoch`, 27 509 B), 0 Video-Bytes | 6 von 6 | 2 267 349 B (Grenze 3 MB) | 0 | 0 |
| Desktop, Endstand (16.11. 01:28 UTC) | 1 Poster (30 413 B), 0 Video-Bytes | 6 von 6 | 2 858 494 B | 0,0028 (Suchknopf und Menüleiste des Themes, nicht die Geschichte) | 0 |
| Handy, Endstand (16.11. 01:29 UTC) | 1 Poster (27 403 B), 0 Video-Bytes | 6 von 6 | 2 267 400 B | 0 | 0 |
| Punkt-Sprung 1 → 6 live (01:26/01:27 UTC, weicher Bildlauf des Themes) | | nur das Zielvideo `s11` (Desktop und Handy), Ankunft nach 1,3 s bzw. 1,0 s | | | 0 |
| Handy, reduzierte Bewegung | Standbilder (faul geladen) | 0 | 0 B | 0 | 0 |

**Kodierung** wie Fassung 1 (H.264 High, ohne Ton, faststart, GOP 48, vor und zurück 94 Bilder, 3,9 s). Neue Clips S09 und S11: quer 1440×1080 CRF 23 (351 901 B und 457 762 B), hoch 900×1200 CRF 23 (267 072 B und 302 477 B). Hochgeladen als Datei (`contentType FILE`); **GEMESSEN 23:3x UTC:** 4 von 4 mp4 Teilabruf 206, Grösse und md5 gleich lokal. Die 4 WebP-Poster liefert das Bild-CDN mit Browser-Accept als WebP in gleicher Grösse (Pixel) und 62 Byte mehr aus (ohne Accept als anderes Format), wie in Fassung 1.

**LCP, richtiger Vergleich** (Prüfer-Fund): dieselbe Testvorlage mit und ohne Geschichte (im Prüfbrowser herausgeschnitten, `mess2/lcp_ab.cjs`), je 3 Läufe abwechselnd, frischer Browser, LCP-Element immer das Hero-Video:

| Messung (UTC) | ohne Geschichte | mit Geschichte | Median-Differenz |
|---|---|---|---|
| Handy 150 ms, 1,6 Mbit/s, CPU ×4 (23:48 bis 23:52) | 11 352 / 11 460 / 10 700 ms | 10 012 / 10 008 / 9 556 ms | **−1 344 ms** |
| Desktop 40 ms, 10 Mbit/s (23:53 bis 23:55) | 4 912 / 3 604 / 3 976 ms | 4 328 / 3 584 / 4 044 ms | **+68 ms** |

- Hypothese zum Handy-Vorteil: Mit Geschichte liegen die Kategoriebilder weiter unten und laden später, das Hero-Video hat die Leitung länger für sich (übertragene Bytes bis 9 s nach dem Laden: ohne 3,95 MB, mit 3,68 MB). Keine Verschlechterung, aber kein Gewinn, auf den man bauen sollte.
- `/` selbst wurde nicht mit Geschichte gemessen (nichts umgeschaltet). Vor und nach einem Umschalten mit demselben Werkzeug auf `/` messen (siehe «Umschalten»).

**Hauptthread beim Laden, Handy CPU ×4** (`mess2/exp_tbt.cjs`, Chrome-Spur, gleiche Vorlage mit und ohne Geschichte, 23:56 bis 23:59 UTC, je 3 Läufe):

| | ohne | mit |
|---|---|---|
| TBT | 6 939 / 5 554 / 6 986 ms | 6 003 / 5 691 / 6 614 ms |
| Stil-Neuberechnung gesamt | 3 897 / 3 188 / 3 542 ms | 4 154 / 3 997 / 4 382 ms |
| Elemente je grosser Stil-Neuberechnung | rund 1 292 | rund 1 489 |

- TBT: kein Nachteil messbar (Median mit −936 ms, Streuung grösser als der Unterschied). Den Prüferwert +1,1 s habe ich nicht wiedergefunden. **Unbekannt**, ob das am neuen Stil im Kopf liegt oder an der Last des Rechners (Last 5 bis 7 auf 4 Kernen, andere Abläufe liefen).
- Stilarbeit bleibt höher (Median +612 ms). GEMESSEN: Jede der wiederholten grossen Stil-Neuberechnungen beim Laden umfasst mit Geschichte rund 197 Elemente mehr (1 489 statt 1 292). Die Geschichte steckt in `.lx-home`, und dieser Teil der Seite wird beim Laden immer wieder neu berechnet (Ursache unbekannt; keine laufende Animation, `document.getAnimations()` leer, gemessen 00:0x UTC).
- Was ich geändert habe: Stil nicht mehr als `<style>` im body, sondern im `{% stylesheet %}`-Block (Shopify liefert ihn im `<head>`, GEMESSEN: Teil-Stylesheet der Testvorlage enthält `lx-story`, das von `/` nicht); Platzhalter-Stil ebenso; erste Messung des Skripts erst im Leerlauf.
- **Nebenwirkung für alle Seiten (GEMESSEN 23:46 UTC, `mess2/compiled_*.txt`):** Das Teil-Stylesheet von `/` blieb gleich gross (136 893 → 136 894 B) und ohne `lx-story`. Das vollständige `compiled_assets/styles.css`, das Chrome als Kompressions-Wörterbuch im Leerlauf holt, wuchs von 330 772 auf 342 058 B (+11 286 B), und seine Versionsnummer änderte sich (einmal neu laden, das tun auch alle anderen Theme-Änderungen).

**Scrollen, Stilarbeit** (`mess2/spur2.cjs`, Chrome-Spur, gleicher Tab, gleicher Scrollweg 1 px/ms, CPU ×1, 16.11. 00:0x UTC):

| Desktop | Stil-Neuberechnungen | Elemente gesamt | Median je Rechnung | Stilzeit |
|---|---|---|---|---|
| ohne Skript der Geschichte | 222 | 37 321 | 3 | 473 ms |
| Schreibweise Fassung 1 (geerbte Variablen) | 695 | 111 176 | 151 | 1 242 ms |
| Fassung 2 (direkt am Element) | 660 / 619 | 71 250 / 56 982 | 10 | 745 / 630 ms |

- Anteil der Geschichte an der Stilarbeit: Fassung 1 rund 770 ms, Fassung 2 rund 160 bis 270 ms (rund 65 bis 80 % weniger). Die grossen Rechnungen mit rund 2 820 Elementen kommen vom Theme selbst (auch ohne Skript vorhanden).
- Handy (gleiches Verfahren): ohne Skript 62 444 Elemente / 752 ms, mit Fassung 2 63 464 / 941 ms. Die Gegenprobe mit Fassung 1 war auf dem Handy nicht aussagekräftig (weniger Bilder gezeichnet, Werte tiefer als ohne Skript): verworfen.
- Bildrate headless mit Software-Rendering und Fremdlast: p95 16,7 bis 33,3 ms je Bild, mit laufenden Videos teils 50 ms. Echte Geräte: ungemessen.

## Barrierefreiheit

- `prefers-reduced-motion`: keine Bühne, keine Steuerleiste, kein Video, keine Bewegung, Standbilder untereinander. Live GEMESSEN 23:4x UTC: 0 Video-Bytes. Wird die Einstellung während des Besuchs eingeschaltet, stoppt das Skript sofort (T25).
- Pause: liegt über den Kapiteln (T21, T21b), bleibt im letzten Kapitel und bis die Bühne wegscrollt (T26b, T26c, live gemessen 16.11. 00:53/00:54 UTC).
- Tastatur: Tab erreicht alle 6 Karten; die fokussierte Karte wird in die Kapitelmitte geholt und liegt ganz im Bild (T9). Pause und Punkte liegen über den Kapiteln und bleiben bedienbar (T21).
- Kontrast GEMESSEN (`test/kontrast.cjs`, Nachbau, Text ausgeblendet, hellste 2 % des Hintergrunds, 6 Kapitel × 3 Zeitpunkte): Desktop kleinster Wert Nummer 9,95:1, Wort 13,9:1, Zeile 12,7:1; Handy 7,12 / 13,05 / 15,81:1. 0 von 108 Messungen unter 4,5:1. Gemessen in der Kapitelmitte; im Vorhang-Übergang blendet der Text aus (nach oben schneller), dort nicht gemessen.

## Tests

**Nachbau** (`test/buehne_test.cjs`, Playwright mit Chromium headless): gespeicherte Live-Startseite, darin die eigenen Dateien mit LiquidJS gerendert (Stil-Block wie bei Shopify im Kopf), Videos und Poster aus den Shopify-Dateien. Desktop 1440×900, Handy 390×844, Tablet 768×1024 mit Touch, reduzierte Bewegung, Sonderfälle (ausverkauft, Produkt weg, abgelaufenes Kapitel, ein Kapitel, Video-Fehler, Autoplay gesperrt, fremde Adresse, `/fr`).

**Endstand: 126 Prüfungen, 126 bestanden, 0 Fehler** (`test/lauf_v2i.log`, 16.11. 01:20 bis 01:25 UTC, Last 11 auf 4 Kernen; dazu die Ausgangslage der Mutationsprobe 01:25 bis 01:3x UTC: 126 bestanden). Prüfungen:

- T1 Reihenfolge (Worte, Nummern, Punkte, Ebenen); T2 Platz direkt nach dem Hero, Platzhalter vor der Geschichte gesetzt und gleich hoch (T27), Bühne unter der Kopfzeile; T3 vor dem Scrollen 1 Poster und 0 Video-Bytes, Stil im Kopf; T4 sechs Videos im richtigen Format, je Kapitel genau eines aktiv.
- T5 Zoom und Schwenk an der Scrollposition, Richtung wechselt; T6 Text und Karte gemeinsam mit Parallaxe; T19 Karte überdeckt Text nie (Desktop, Handy, Tablet); T20 Vorhang gebunden an die Scrollposition.
- T8, T18 Karten verlinken die eingestellte Ausführung, Klick öffnet sie; T16 Liquid-Fälle (ausverkauft, Produkt weg, abgelaufen, Ausführungszeile, keine Preise/Lieferzeiten im Text, kein `<style>` im body, `data-letztes`); T13 Autoplay gesperrt: Poster.
- T9 Tastatur erreicht alle Karten, Fokus liegt im Bild; T15 Pause hält an und spielt weiter; T21 Pause an jeder Position oberster Treffer; **T21b** Steuerleiste liegt über den Kapiteln (Kapitel im Test zum Treffen gezwungen); **T21c** Kapitel lassen Klicks durch (Steuerleiste im Test tiefer gelegt); T26 Punkte am Ende weg; **T26b** im letzten Kapitel Pause und Punkte da; **T26c** Pause bleibt, bis die Bühne wegscrollt.
- T22 Tablet ohne Layout-Verschiebung; **T22b** Kapitelabstände unabhängig von der Kopfzeilen-Messung, Touch-Vorgabe 59 px trifft ohne Korrektur; T17 CLS; T10 kein seitliches Scrollen; T11 keine Seitenfehler.
- T23 Punkt-Sprung 1 → 6 lädt nur das Zielvideo; **T23b** langsames Gerät (Bilder 500 ms verspätet): Ruhe-Zeitgeber lädt kein Zwischenvideo; **T23c/d/e** Sprung langsam nachgestellt: Zwischenkapitel übersprungen, nach 3 s lädt das aktuelle Kapitel doch, Mausrad bricht den Sprung ab; T24 entfernte Videos freigegeben; T25 reduzierte Bewegung zur Laufzeit; T7 reduzierte Bewegung beim Laden.

**Schwankende Prüfungen unter Fremdlast (gefunden und behoben):** T9 und T23 scheiterten vereinzelt bei Last 10 bis 30 (andere Abläufe auf demselben Rechner). Ursache bei beiden: das Theme setzt `html{scroll-behavior:smooth}`, weiche Bildläufe dauerten länger als die feste Wartezeit. T9 wartet jetzt bis 2,5 s auf das Ende der Bewegung, T23 bis 8 s auf die Ankunft. Bei T23 zeigte die Schwankung zusätzlich einen echten Fehler (Zwischenvideo beim Auslaufen des Sprungs), der im Code behoben ist (siehe Funde).

**Mutationsprobe** (`test/mutationsprobe.mjs`, Mutanten in `test/mutanten.json`, je Mutant ein voller Testlauf auf einer Kopie, Muster muss genau einmal vorkommen): Verlauf in dieser Runde: erster Lauf auf Fassung 2 (00:07 bis 00:41 UTC, 27 Mutanten): 24 erkannt, **3 überlebt** (M14, M24, M26: je eine Schutzschicht, die der Test nicht einzeln prüfte) → T21b, T21c, T22b neu. Danach kamen M28 bis M33 für die beiden Nachträge dazu. **Endlauf auf dem Endstand** (16.11. 01:25 bis 02:28 UTC, 3 Arbeiter, Ausgangslage grün):

**33 von 33 erkannt, 0 überlebt, 0 nicht anwendbar** (Ausgangslage 126 bestanden, 0 Fehler). Je Mutant habe ich geprüft, dass die scheiternde Prüfung zum Mutanten passt (Logs `test/mutationsprobe5_A|B|C.log`, Tabelle `test/mutationsprobe5_tabelle.md`). Folgefehler, die nicht gemeint waren, aber passen: M17 auch T23 (ohne Freigabe liegt das Zielvideo schon geladen vor), M28 auch T23d (Punkte im letzten Kapitel unsichtbar, Klick trifft nicht), M31 auch T23d.

| Mutant | Ergebnis | erkannt von |
|---|---|---|
| M01 Video vor dem ersten Scrollen | erkannt | T3, T4 |
| M02 alle Poster sofort | erkannt | T3 |
| M03 aktives Kapitel falsch | erkannt | T4 |
| M04 Hintergrund ohne Zoom | erkannt | T5 |
| M05 Text ohne Parallaxe | erkannt | T6 |
| M06 reduzierte Bewegung im JS ignoriert | erkannt | T7 |
| M07 reduzierte Bewegung im CSS ignoriert | erkannt | T25, T7 |
| M08 Verfügbarkeit nicht geprüft | erkannt | T16 |
| M09 Karte ohne Ausführung | erkannt | T8, T18 |
| M10 Autoplay-Sperre ignoriert | erkannt | T13 |
| M11 Platzhalter nicht ersetzt | erkannt | T2 |
| M12 Video im falschen Format | erkannt | T4 |
| M13 Karte gegenläufig zum Text (alter Fehler) | erkannt | T6, T19 |
| M14 Pause/Punkte unter den Kapiteln | erkannt | T21b |
| M15 Stil im body statt im Kopf | erkannt | T3, T16 |
| M16 keine Ruhezeit (Zwischenvideos laden) | erkannt | T23, T23b, T23c, T23d |
| M17 entfernte Videos nicht freigegeben | erkannt | T24, T23 |
| M18 kein Vorhang | erkannt | T20, T5 |
| M19 reduzierte Bewegung zur Laufzeit ignoriert | erkannt | T25 |
| M20 Steuerleiste am Ende nicht ausgeblendet | erkannt | T26 |
| M21 Platzhalterhöhe alte Formel | erkannt | T2, T27 |
| M22 Ablaufdatum ignoriert | erkannt | T16 |
| M23 Ausführungszeile immer | erkannt | T16 |
| M24 Kapitelabstand von der Kopfzeilen-Messung abhängig | erkannt | T22b |
| M25 Tastaturfokus ohne Kapitelmitte | erkannt | T9 |
| M26 Kapitel fangen Klicks ab | erkannt | T21c |
| M27 kein Platzhalter beim Laden | erkannt | T2, T17, T22 |
| M28 Punkte und Pause zu früh weg (alter Schwellwert) | erkannt | T26b, T23d |
| M29 Pause am Ende mit ausgeblendet | erkannt | T26c |
| M30 Ruhezeit ohne frischen Blick auf die Lage (alter Stand) | erkannt | T23b |
| M31 Sprung per Punkt lädt Zwischenkapitel | erkannt | T23, T23c, T23d |
| M32 Sprung ohne Frist (bleibt hängen) | erkannt | T23d |
| M33 Mausrad bricht Sprung nicht ab | erkannt | T23e |

**Live-Prüfungen** (echter Shop, Browser-Kopf, höchstens ein Seitenaufruf je Lauf, mit Pausen): `test/live_messen.cjs` (Laden, Videos, CLS, Seitenfehler), `mess2/ende_live.cjs` (letztes Kapitel und Schluss), `mess2/sprung_live.cjs` (Punkt-Sprung mit dem echten weichen Bildlauf), `mess2/fr_js.cjs` (Verfügbarkeit aller Kaufkarten), `mess2/lcp_ab.cjs`, `mess2/exp_tbt.cjs`, `mess2/spur2.cjs` (Leistung). Trockenlauf `node apply_story.mjs` vergleicht alle eigenen Dateien und die Fremddateien mit dem eingespielten Stand.


## Dateien

**Theme (MAIN `213991391623` «LuxeStyle – SEO 14.11.2026»), eingespielt 15.11. 23:45 UTC, Nachträge 16.11. 00:52 UTC (Skript und Abschnitt) und 01:25 UTC (Skript), je mit `LIVE=1 node apply_story.mjs` nach eigenem Trockenlauf, frisch zurückgelesen GLEICH:**

| Datei | md5 |
|---|---|
| `sections/lx-story.liquid` (mit `{% stylesheet %}`) | `de87f27cef5bb532031cd9ee3b23f1db` |
| `sections/lx-story-platz.liquid` | `6b28ddee4c4a829b00149d6228c1d436` |
| `sections/lx-story-testseite.liquid` (nur Testvorlage, unverändert) | `a98b0867e73e09d12ea61e40400abe57` |
| `assets/lx-story.js` | `efa7750adce4336326eaf68f25794d4d` |
| `templates/index.lxstory.json` (aus der heutigen `index.json` neu gebaut) | `5fdb956c5a64cd5424211356304fd895` |

- Gelöscht (eigene Datei der Fassung 1, nur weil sie noch genau unserem Stand entsprach): `snippets/lx-story-stil.liquid`.
- **Fremddateien vor und nach dem Einspielen gleich** (alle drei Läufe, zuletzt 16.11. 01:25 UTC): `templates/index.json` `aa3d1772…`, `layout/theme.liquid` `62a77592…`, `sections/luxe-edit-home.liquid` `8ef12062…`, `assets/luxe-edit.css` `22b0bd13…`, `assets/luxe-edit.js` `4aa19e8f…`, `lx-szene`-Dateien unverändert. Die Werte unterscheiden sich von Fassung 1, weil andere Abläufe heute Abend die Startseite geändert haben (nicht ich).
- **Shopify Files (als FILE):** 32 Dateien, IDs in `dateien_ids.json`, Adressen in `medien.json`. Neu: `lx-story-s09|s11-quer|hoch-v1.mp4|webp` (8). Benutzt werden s01, s03, s05, s06, s09, s11 (24). Nicht mehr benutzt, aber behalten (Rückweg zu Fassung 1): s08, s10 (8).

**Lokal (dieser Ordner):** `theme/` (eingespielter Stand), `theme_src/` (Quellen: `assets/lx-story.css` und `sections/lx-story.liquid` mit Platzhalter für den Stil), `bauen_stil.sh` (baut `theme/sections/lx-story.liquid`), `theme_v1/` (Fassung 1), `kodieren.py`, `kodiert/` (18 Videos, 18 Poster), `kapitel.json`, `medien.json`, `vorlage_bauen.mjs`, `apply_story.mjs`, `umschalten.mjs`, `eingespielt.json`, `cj/` (CJ-Datenblätter Rose, Reisebeutel, Teekanne, Becher), `harness/` (Nachbau, `fotos2.cjs`), `test/` (`buehne_test.cjs`, `mutanten.json`, `mutationsprobe.mjs`, Logs), `mess2/` (LCP, TBT, Stil beim Scrollen, kompilierte Stile, Kopfzeile), `live2/` und `fotos2/` (Bildschirmfotos), `pruef2/` (Einzelbilder der neuen Clips).

## Umschalten (später, nur auf Ja des Besitzers)

Ordner: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/story1511`.

1. **Trockenlauf:** `node umschalten.mjs`. Bricht ab, wenn `templates/index.json` nicht mehr `aa3d177234272df6acedab60272a5396` ist (Stand 15.11. 23:45 UTC; andere Abläufe ändern die Startseite gerade oft). Dann erst lesen und mit `ERWARTET_MD5=<neu>` bewusst bestätigen. Das Skript warnt, wenn `layout/theme.liquid` nicht mehr `62a77592…` oder `sections/luxe-edit-home.liquid` nicht mehr `8ef12062…` ist: dann zuerst die Messungen unten auf dem neuen Stand wiederholen.
2. **Vorher messen:** `node test/live_messen.cjs desktop live/u0_d` und `handy` auf der Testvorlage, dazu `node mess2/lcp_ab.cjs handy 3 mess2/u0_handy.json` (gleiche Vorlage mit und ohne Geschichte).
3. **Umschalten:** `LIVE=1 node umschalten.mjs`. Sichert `index.json` nach `sicherung/index.json.vor-<Zeit>`, setzt `lx_story_platz` vor und `lx_story` nach `luxe_home` (Reihenfolge `lx_story_platz, luxe_home, lx_story, luxe_reviews`) und liest zurück. Ab dann laden die kompilierten Theme-Stile auf `/` den Stil der Geschichte mit (GEMESSEN auf der Testvorlage 15.11. 23:46 UTC: +11 285 B im Teil-Stylesheet; die Nachträge brachten rund 150 B Stil dazu).
4. **Sofort auf `/` messen:** `ADRESSE=https://luxestyle.ch/ node test/live_messen.cjs desktop live/u_d` und `handy`. LCP und TBT mit und ohne Geschichte auf `/`: `ADRESSE=https://luxestyle.ch/ node mess2/lcp_ab.cjs handy 3 mess2/u_handy.json` und dasselbe mit `desktop` (die Geschichte wird im Prüfbrowser herausgeschnitten, Kundinnen sehen nichts davon).
5. **Rücknahme-Kriterium (vorher festgelegt):** Median-LCP Handy mehr als +300 ms oder Desktop mehr als +500 ms gegenüber «ohne», CLS über 0,1, ein Seitenfehler aus `lx-story`, oder ein Kapitel ohne kaufbare Ausführung. Dann `ZURUECK=1 LIVE=1 node umschalten.mjs` (schreibt die Sicherung zurück; die Dateien bleiben unwirksam liegen).
6. **Aufräumen nach dem Umschalten:** `templates/index.lxstory.json` und `sections/lx-story-testseite.liquid` löschen.
- **Ganz entfernen:** `ZURUECK=1 LIVE=1 node apply_story.mjs` löscht nur die eigenen Dateien, und nur solange sie dem eingespielten Stand entsprechen (`eingespielt.json`). Danach die 32 Shopify-Dateien per `fileDelete` mit den IDs aus `dateien_ids.json` (darunter 8 nicht mehr benutzte der Fassung 1: s08 und s10).
- **Theme-Wechsel:** Wird ein anderes Theme veröffentlicht, fehlen dort die Dateien. Dann `LIVE=1 node apply_story.mjs` (sucht das MAIN-Theme selbst).
- **Ohne Code:** Ein Kapitel fällt von selbst weg, wenn sein Produkt oder die Ausführung nicht mehr kaufbar ist oder sein «Sichtbar bis» vorbei ist (Wohnen: 06.01.2027). Unter zwei Kapiteln verschwindet die ganze Geschichte samt Platzhalter.

## Offen und ungemessen

- Safari/iPhone, Firefox, echtes Handy und echte Bildrate ungemessen (alles hier Chromium headless mit Software-Rendering und Fremdlast). Die Autoplay-Sperre ist nur nachgestellt. Speicher auf dem iPhone ungemessen (jetzt höchstens 2 Videos mit Quelle, T24).
- Wirkung auf Käufe unbekannt. Die Geschichte ist auf dem Desktop 7 110 px und auf dem Handy 6 203 px hoch (GEMESSEN 00:0x UTC); die Kategorien kommen entsprechend später (Hypothese: Risiko für Kundinnen, die schnell suchen).
- Stilarbeit beim Laden auf dem Handy bleibt rund +0,6 s (CPU ×4), TBT ohne messbaren Nachteil; Ursache der wiederholten Neuberechnung von `.lx-home` unbekannt.
- Theme-Fenster: Der Hinweis «Automatischer Assistent» legt sich auf dem Handy zeitweise über die Kaufkarte (live angesehen, `live2/h_bogen.jpg`), das Newsletter-Fenster ebenso. Theme-Verhalten, nicht geändert.
- `/fr` (GEMESSEN 00:04 UTC): 6 Kapitel französisch, Links `/fr/products/…?variant=…`; zwei Kartentitel und eine Ausführung noch deutsch («Weihnachtskugeln beflockt – 9 Stück», «Kaffeefarbe», «Reisebeutel aus Rindsleder 44x20x28 cm»). Übersetzen wäre eine Produktänderung: nicht gemacht.
- Produktbefunde für den Besitzer (nicht in der Geschichte, nicht geändert): Teekanne `gusseisen-teekanne-sandguss-unbeschichtet-609800` heisst «unbeschichtet» und ist rosa (CJ nennt beides); Kristall-Set `kristallspitzen-set-8-teilig-holzbox` hat die SKU «LX-23-KRISTALL-SET-3-TEILIG» bei 8 Steinen und keinen belegten Lieferanten.
- Saison: Licht (Zeile «lange Winterabende», Tannenzweig im Bild) und Geschenke (Tannenzweig, Lichterkette im Hintergrund) sind winterlich. Wohnen verschwindet am 07.01.2027 von selbst. Eine Wiedervorlage habe ich nicht gesetzt.
- Erster Bildschirm unverändert (Platz nach dem Hero). Ein Scroll-Hinweis im Hero bräuchte eine Änderung an `luxe-edit-home` (Entscheid des Besitzers).
- Kopfzeile auf Tablets: Das Theme zeigt bei Touch die kompakte Kopfzeile (59 px), nicht nach Breite. Vorgabe im Stil per `(hover:none) and (pointer:coarse)`; Abweichungen misst das Skript nach, ohne Layout-Verschiebung. iPad mit Desktop-Kennung ungemessen.
- Eine scrollgebundene Bildfolge habe ich nicht gebaut (Vorhang statt dessen, siehe «Bewegung»).
- Becher: Neben dem Becher liegt eine Serviette (Requisit, nicht im Lieferumfang; Hypothese: nicht als Lieferumfang lesbar).
- Ohne JavaScript bleibt die Geschichte ausgeblendet, die Seite ist dann wie heute. Die Platzierung hängt an `.lx-home .lx-hero`.
- Abweichung vom Auftrag: MAIN ist `213991391623`, nicht `213013037447` (GEMESSEN 15.11.). Bei einem Theme-Wechsel `LIVE=1 node apply_story.mjs`.
- Ein unabhängiger Prüfer hat Fassung 2 noch nicht gelesen.

## Fassung 1 (15.11. 21:13 bis 23:45 UTC, ersetzt)

Sechs Kapitel mit Teekanne und Kristall-Set, Zoom 1,08 bis 1,00, Karte gegenläufig, Stil als `<style>` im body (`snippets/lx-story-stil.liquid`, jetzt gelöscht). Quellen in `theme_v1/`, alter Test `test/buehne_test_v1.cjs` (83 Prüfungen), alte Mutationsprobe `test/mutationsprobe_v1.mjs` und `test/mutationsprobe.log` (17 von 17).
