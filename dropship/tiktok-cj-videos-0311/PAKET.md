# TikTok-Videos aus CJ-Produktvideos (03.11.2026)

Besitzer 03.11.: «tiktok cj videos machen aber mega coole sachen … cj hat sehr viele videos kopiere das und bearbeite», danach «push das auch inst insta und tiktok». Marken: **GEMESSEN** = hier abgefragt · **QUELLE** = gelesen · **unbekannt** = nicht belegt.

## Befund: CJ hat tatsächlich sehr viele Videos (GEMESSEN 03.11.)
- `product/query` liefert `productVideo` nur noch als `null`. Die Videos stehen hinter `POST /api2.0/v1/product/queryVideosByProductId` (QUELLE developers.cjdropshipping.cn, Abschnitt «6 Video»): Felder `videoUrl`, `isFree` (0 bezahlt, 1 gratis), `copyrightPrice`/`notCopyrightPrice`, `width`, `height`, `duration`, `videoState`. Der Download braucht den Header `Referer: https://developers.cjdropshipping.com/`; CJ bittet, Videos selbst zu speichern statt CJ-Adressen zu verlinken.
- Für 6 der 7 CJ-Produkte aus dem Plan: **54 Videos, alle gratis** (Duftbefeuchter 10, Wasser-Speaker 7, Wellenlicht 9, Ewige Rose 11, Gemüsehobel 3, Kaffeebecher 14); Tennisarmband: keines. Das Kristall-Set hat eine eigene SKU (`LX-…`), nicht bei CJ.
- Formate: meist 540×960 (9:16), dazu Quadrate (960×960) und Querformate, 6 bis 54 s. **Auflösung niedrig:** Hochziehen auf 1080×1920 wirkt weich (Grenze der Quelle).
- Die meisten Videos sind für uns unbrauchbar: eingeblendete Fremdschrift («Link in bio», «POV …», chinesische Texte), Gesichter, Marken im Bild (Hershey's, Verpackung «Colour Jet»).

## Gebaut (alles lokal, schreibt nichts in den Shop)
| Datei | Zweck |
|---|---|
| `cj_videos_holen.mjs` | Shop-SKU → CJ-pid → Videoliste → kostenlose Videos laden, Bericht als CSV. Bezahlpflichtige werden nie gekauft. |
| `veredeln.sh` | erste Fassung (ein Ausschnitt, ersetzt durch `schneiden.py`): 9:16-Zuschnitt, Hook, Endkarte, Mixkit-Musik, Originalton weg. |
| `schneiden.py` + `schneiden_test.py` | Profi-Schnitt: mehrere Quellen je Clip, Schnitte auf dem Takt der Musik (Beat-Analyse), Zeitlupe, Zoom mit Anker, Weissabgleich, Weichzeichner-Rahmen für Querformat, Hook ab Bild 0, Kernaussagen, Endkarte, 25 Bilder/s, -16 LUFS; 53 Prüfungen lokal (braucht ffmpeg, numpy, scipy; nicht in der CI) |
| `schnittplaene.json` | die fünf Schnittpläne (Quelle, Sekunde, Dauer in Schlägen, Zoom, Text) |
| `cj_clips.json` | die fünf Clips mit Quell-videoIds, Hook, Texten, Terminen |
| `omni_clip.mjs` + `omni_clip_test.mjs` | KI-Weg (Gemini Omni Flash, Bild zu Video) und Textregeln für beide Wege; 96 Prüfungen ohne Netz, in der CI |
| `produkte.json` | acht KI-Clip-Entwürfe (Foto, Prompt, Texte) für den KI-Weg |

Textregeln (geprüft mit `node dropship/tiktok-cj-videos-0311/omni_clip.mjs --pruefen-cj`): Hook je Zeile ≤ 16 Zeichen, kein Preis, kein ß, keine KI-Aussage bei echtem Material, Lieferzeit «10–20 Werktage» wie auf den Produktseiten, vier Hashtags, Abstand ≥ 3 h je Netzwerk.

## Eingeplant (Metricool, Marke 6227837, Europe/Zurich, `autoPublish`, nichts schon veröffentlicht; Stand 04.11. 07:00, zweite Fassung)
| Produkt | Instagram + Facebook (Reel) | TikTok | uuid IG/FB · TikTok | Länge |
|---|---|---|---|---|
| Duftbefeuchter | Do 05.11. 18:00 | Do 05.11. 13:00 | -650204652815301427 · -7930844836166480510 | 10,7 s |
| LED-Wasser-Speaker | Sa 07.11. 18:00 | Sa 07.11. 18:30 | 8147121371837647826 · -2503182895774282094 | 6,4 s |
| Rose im Glas | Mo 09.11. 19:30 | Mo 09.11. 12:30 | 3863915044291300024 · -7257455683644011058 | 12,0 s |
| Gemüsehobel | Mi 11.11. 20:30 | Di 10.11. 18:00 | 3963843144054620883 · 2172266762404316928 | 10,2 s |
| Wellenlicht | Fr 13.11. 20:30 | Mi 11.11. 12:00 | -2435184774283179178 · -7768329881687535680 | 9,3 s |

Die Videos liegen als `luxe-cj-<produkt>-0411.mp4` in den Shopify-Dateien (als Datei, nicht als Video-Objekt: Shopify rechnet Video-Objekte auf 606×1080 um), Metricool hält byte-gleiche Kopien (Dateigrösse je Beitrag mit der lokalen Datei verglichen). Wegweiser-Zeile in der Instagram/Facebook-Caption: «Shop: luxestyle.ch (Instagram: Link in Bio)», weil derselbe Text auch als Facebook-Reel läuft. `isAigc`/`isAiGenerated` aus (echtes Material). **Rücknahme:** Beitrag im Metricool-Planer löschen (`https://app.metricool.com/planner/calendar?blogId=6227837&openWithPostUuid=<uuid>`).

## Wie die zweite Fassung entstand (04.11.)
1. **Gegenprüfung der ersten Fassung** (Workflow `wf_3ae2a0bd`): Fremdgerät im Hobel- und Duft-Clip, chinesische Schrift, absolute Aussagen («nie welkt»), leises Audio, schwarzes Titelbild.
2. **Vollständige Sichtung aller 54 Quellvideos** (Workflow `wf_2b23058f`, 2 Bilder pro Sekunde, 1,8 Mio. Tokens): saubere Abschnitte je Produkt und Produkttreue. Die Sichtung ist selbst eine Behauptung: die Abnahme fand darin zwei übersehene Quellschnitte (Duft Quelle 8 bei 8,96 s; Welle Quelle 9 bei 22,96 s).
3. **Abnahme Runde 1** (Workflow `wf_6c1005b8`, 10 Prüfer, 2,8 Mio. Tokens): Fehler im Werkzeug (**`zoompan` kennt keine Zeitstempel: bei `tempo` < 1 fehlten bis 21 % der Bilder, der Rest war Standbild**; aufgerundete Schnittzeiten summierten sich bis 56 ms neben den Takt), Produkttreue (Rose zeigte Schillerrosen, die es im Shop nicht gibt; Hobel ohne Kurbel im Bild), unbelegte Texte («im Takt», «Link in Bio» auf Facebook).
4. **Abnahme Runde 2** (Workflow `wf_84a300dc`, 5 Prüfer): Kamerawackler und Quellschnitte in Fenstern, Texte über dem Produkt, Rest der Weiss-/Weiss01-Frage beim Duftbefeuchter. Beim CJ-Datenblatt gemessen: **«White01-USB» ist die Ausführung mit Digitaluhr** (SKU CJJT170517302BY), «White-USB» ist die gerippte Ausführung ohne Uhr; die Caption nennt darum die Option «Weiss01-USB».
5. **Eigene Prüfung der dritten Fassung:** ungeplante Bildwechsel (Szenenerkennung gegen die geplanten Schnitte: keine), Standbilder (`freezedetect`: keine ausser Einzelbild-Wiederholungen), Lautheit −15,8 bis −16,5 LUFS bei −2,9 bis −4,1 dBFS, 25 Bilder/s, eine Tonspur.

## Grenzen, offen gesagt
- **Rechte:** Besitzer 03.11. nach der Frage zur Bearbeitung: «es ist erlaubt». CJ selbst nennt in der Doku nur das «Listing im Shop» (Artikel «How to List CJ's Product Video to Your Store»); die Felder `copyright`, `copyrightPrice` blieben unklar. Es werden weiter nur Gratis-Videos verwendet, bezahlpflichtige nie gekauft. Die Erlaubnis kommt vom Besitzer, nicht von CJ belegt.
- **Sichtprüfung:** alle 54 Quellvideos vollständig gesichtet (2 Bilder/s) und die drei Fassungen der Clips von je zwei bis drei unabhängigen Prüfern abgenommen; **offen:** nie in der echten TikTok-/Instagram-App abgespielt (App-Zonen nur gerechnet), Ton nur gemessen, nicht gehört.
- **Ton:** Originalton ist weg (Sprache der Quellen wäre fremd), Mixkit-Musik rotiert (Duft serene, Speaker majestic, Rose violin, Hobel new-york, Welle dreamy-jazz), −16 LUFS; gehört hat sie niemand von uns.
- **Qualität:** Quellen höchstens 540×960 bis 720×960, 2-faches Hochziehen mit Lanczos und leichtem Nachschärfen, am Handy vertretbar, am grossen Bildschirm weich. **Produkttreue:** Rose: offene Folienrosen im Video, Shop-Fotos zeigen Glitzer-Knospen (Hinweise «Abbildung ähnlich», «Blüte kann abweichen» im Bild und in der Caption); Speaker: nur Schwarz gezeigt (Hinweis in der Caption); Duft: nur die Uhr-Ausführung (Hinweis); Welle: Hook-Einstellung ohne Leuchte (Hinweis zur Lichtwirkung).
- **Tests:** `schneiden_test.py` 53 Prüfungen (lokal), `omni_clip_test.mjs` 102 (CI).
- **Wirkung unbekannt.** Kontrolle: 05.11. ab 13:10 in Metricool lesen, ob der erste TikTok-Beitrag `PUBLISHED` ist (Format, Länge, Dateigrösse sind von TikTok nicht vorab geprüft); danach Reichweite je Beitrag nach 24 h.

## KI-Weg (Gemini Omni Flash): vorbereitet, **blockiert**
Schlüssel der Sitzung liefert auch nach der Aufladung HTTP 402 («prepayment credits depleted», GEMESSEN 03.11. 22:40–23:00 UTC, auch am Omni-Endpunkt). Vermutung (nicht belegt): die Aufladung hängt an einem anderen Rechnungskonto/Projekt als der Schlüssel, oder die Gutschrift ist noch nicht verbucht. Beim Besitzer: AI Studio → API-Schlüssel → Spalte «Plan» des Schlüssels prüfen und dort aufladen, oder neuen Schlüssel aus dem aufgeladenen Projekt als Umgebungsvariable `GEMINI_API_KEY` in der Cloud-Umgebung der Sitzung setzen (Einstellungen der Umgebung, nicht in den Chat). Kosten laut Preisseite ≈ 0,10 USD je Sekunde bei 720p (Annahme, nach der ersten Abrechnung nachrechnen): 8 Clips à 8 s ≈ 6,40 USD. Aufruf: `node dropship/tiktok-cj-videos-0311/omni_clip.mjs duft` (Trockenlauf), `LIVE=1 …` sendet; Obergrenze `GESAMT_USD` (Vorgabe 10) wird aus dem Ledger gerechnet.

## ChatGPT als Hilfe (Besitzer: «lass chat gpt helfen»)
Aus dieser Sitzung ist ChatGPT nicht erreichbar. Weg: den folgenden Auftrag in ChatGPT einfügen, die JSON-Antwort in `dropship/tiktok-cj-videos-0311/chatgpt-antwort.json` legen und mit `node dropship/tiktok-cj-videos-0311/omni_clip.mjs --pruefen <Datei>` prüfen (Texte sind Behauptungen, bis die Regeln sie bestätigt haben).

> Du bist Creative Director für kurze TikTok-Produktvideos eines Schweizer Online-Shops (LuxeStyle, luxestyle.ch). Schreibe für jedes der Produkte in der Liste (Titel, belegte Fakten): (1) einen Hook in zwei Zeilen zu je höchstens 16 Zeichen, ohne Preis, ohne Apostroph, Doppelpunkt, Prozent, Anführungszeichen, ohne Emoji, Schweizer Rechtschreibung (ss statt ß); (2) einen englischen Video-Prompt für Gemini Omni Flash (Bild als erstes Bild, Anfang `<FIRST_FRAME>`, ein einziger durchgehender Schnitt «no scene cuts», 8 Sekunden, ruhige Kamerabewegung, nur Funktionen aus den Fakten, «The product keeps exactly the shape, colour and proportions of the reference image. No text, no logos, no people, no hands.», Ende «No dialogue, no music.»); (3) eine deutsche TikTok-Caption mit genau vier Hashtags, der Zeile «Schweiz: Lieferung 10–20 Werktage, Versand CHF 7, ab CHF 50 gratis nach Rabatt.», dem Wegweiser «Shop: luxestyle.ch/tt» und dem Satz «Video mit KI erstellt.». Erfinde keine Funktionen, keine Preise, keine Garantien, keine Superlative. Antworte nur als JSON im Format der Datei `produkte.json` (Felder id, handle, name, foto, foto_min, fakten, hook1, hook2, prompt_en, caption_de, risiko).

## Flow (im Google-AI-Pro-Abo enthalten)
Der Auftrag an PC-Claude in `dropship/BROWSER-BEFEHL-GOOGLE-AI-PRO-0311.md` bleibt gültig; als Eingabetext und Quellfoto je Produkt die Felder `prompt_en` und `foto` aus `produkte.json` nehmen. Ergebnis erst nach der Sichtprüfung verwenden.
