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
| `veredeln.sh` | Ausschnitt, 9:16-Zuschnitt, 1080×1920, Hook-Text (0,2–3,0 s), Endkarte, rotierende Mixkit-Musik (−22 LUFS), Originalton weg. |
| `cj_clips.json` | die fünf bearbeiteten Clips mit Quelle (CJ-videoId), Ausschnitt, Hook, Texten, Terminen |
| `omni_clip.mjs` + `omni_clip_test.mjs` | KI-Weg (Gemini Omni Flash, Bild zu Video) und Textregeln für beide Wege; 96 Prüfungen ohne Netz, in der CI |
| `produkte.json` | acht KI-Clip-Entwürfe (Foto, Prompt, Texte) für den KI-Weg |

Textregeln (geprüft mit `node dropship/tiktok-cj-videos-0311/omni_clip.mjs --pruefen-cj`): Hook je Zeile ≤ 16 Zeichen, kein Preis, kein ß, keine KI-Aussage bei echtem Material, Lieferzeit «10–20 Werktage» wie auf den Produktseiten, vier Hashtags, Abstand ≥ 3 h je Netzwerk.

## Eingeplant (Metricool, Marke 6227837, Europe/Zurich, `autoPublish`, nichts schon veröffentlicht)
| Produkt | Instagram + Facebook (Reel) | TikTok | uuid IG/FB · TikTok |
|---|---|---|---|
| Duftbefeuchter | Do 05.11. 18:00 | Do 05.11. 13:00 | -650204652815301427 · -7930844836166480510 |
| LED-Wasser-Speaker | Sa 07.11. 18:00 | Sa 07.11. 18:30 | 8147121371837647826 · -2503182895774282094 |
| Ewige Rose | Mo 09.11. 19:30 | Mo 09.11. 12:30 | 3863915044291300024 · -7257455683644011058 |
| Gemüsehobel (6 s) | Mi 11.11. 20:30 | Di 10.11. 18:00 | 3963843144054620883 · 2172266762404316928 |
| Wellenlicht | Fr 13.11. 20:30 | Mi 11.11. 12:00 | -2435184774283179178 · -7768329881687535680 |

Abstand zu allen 39 bestehenden Beiträgen des Planers geprüft (≥ 3 h je Netzwerk). Alle fünf Produkte stehen in der Wegweiser-Sammlung `aus-tiktok-und-instagram`. Videos liegen als `luxe-cj-<produkt>-0311.mp4` im Shopify-Dateibereich (HTTP 206 geprüft). `isAigc`/`isAiGenerated` sind **aus** (echtes Material, keine KI). **Rücknahme:** Beitrag im Metricool-Planer löschen (Planer-Link: `https://app.metricool.com/planner/calendar?blogId=6227837&openWithPostUuid=<uuid>`).

## Grenzen, offen gesagt
- **Rechte unbekannt:** CJ nennt in seiner Doku nur das «Listing im Shop» (Artikel «How to List CJ's Product Video to Your Store»). Ob Schnitt, Text und Musik für eigene Werbung erlaubt sind, steht dort nicht; die Felder `copyright`, `copyrightPrice` blieben leer/unklar. Es wurden nur Gratis-Videos verwendet. Entscheid und Risiko beim Besitzer.
- **Sichtprüfung:** nur die 5 verwendeten Clips und die 54 Videos als Einzelbild-Raster (6 Bilder je Video); 49 Videos nicht im Einzelnen angesehen. In den Clips: nur Hände, keine Gesichter, im Ausschnitt keine Fremdschrift; bei der Rose zeigen Buchrücken im Hintergrund kleine, kaum lesbare Schrift. Verworfen: Duftbefeuchter Nr. 4 (Neon-Schild «RELAXED» im Bild).
- **Ton:** Originalton ist weg (Sprache der Quellen wäre fremd), Mixkit-Musik rotiert; gehört hat sie niemand von uns.
- **Qualität:** Quelle 540p, Hochziehen mit Lanczos und leichtem Nachschärfen, wirkt weich. Der Gemüsehobel-Clip zeigt nur das Hobeln von Gurke (4–10 s); der Rest der Quelle hat chinesische Schrift auf der Schürze.
- **Tests:** `veredeln.sh` hat keinen eigenen Selbsttest (geprüft: Trockenlauf und sechs echte Renderings mit Einzelbild-Sicht, 1080×1920, Dauer wie verlangt, Tonspur da); Textregeln und `omni_clip.mjs` sind getestet (96).
- **Wirkung unbekannt.** Kontrolle: 05.11. ab 13:10 in Metricool lesen, ob der erste TikTok-Beitrag `PUBLISHED` ist (Format, Länge, Dateigrösse sind von TikTok nicht vorab geprüft); danach Reichweite je Beitrag nach 24 h.

## KI-Weg (Gemini Omni Flash): vorbereitet, **blockiert**
Schlüssel der Sitzung liefert auch nach der Aufladung HTTP 402 («prepayment credits depleted», GEMESSEN 03.11. 22:40–23:00 UTC, auch am Omni-Endpunkt). Vermutung (nicht belegt): die Aufladung hängt an einem anderen Rechnungskonto/Projekt als der Schlüssel, oder die Gutschrift ist noch nicht verbucht. Beim Besitzer: AI Studio → API-Schlüssel → Spalte «Plan» des Schlüssels prüfen und dort aufladen, oder neuen Schlüssel aus dem aufgeladenen Projekt als Umgebungsvariable `GEMINI_API_KEY` in der Cloud-Umgebung der Sitzung setzen (Einstellungen der Umgebung, nicht in den Chat). Kosten laut Preisseite ≈ 0,10 USD je Sekunde bei 720p (Annahme, nach der ersten Abrechnung nachrechnen): 8 Clips à 8 s ≈ 6,40 USD. Aufruf: `node dropship/tiktok-cj-videos-0311/omni_clip.mjs duft` (Trockenlauf), `LIVE=1 …` sendet; Obergrenze `GESAMT_USD` (Vorgabe 10) wird aus dem Ledger gerechnet.

## ChatGPT als Hilfe (Besitzer: «lass chat gpt helfen»)
Aus dieser Sitzung ist ChatGPT nicht erreichbar. Weg: den folgenden Auftrag in ChatGPT einfügen, die JSON-Antwort in `dropship/tiktok-cj-videos-0311/chatgpt-antwort.json` legen und mit `node dropship/tiktok-cj-videos-0311/omni_clip.mjs --pruefen <Datei>` prüfen (Texte sind Behauptungen, bis die Regeln sie bestätigt haben).

> Du bist Creative Director für kurze TikTok-Produktvideos eines Schweizer Online-Shops (LuxeStyle, luxestyle.ch). Schreibe für jedes der Produkte in der Liste (Titel, belegte Fakten): (1) einen Hook in zwei Zeilen zu je höchstens 16 Zeichen, ohne Preis, ohne Apostroph, Doppelpunkt, Prozent, Anführungszeichen, ohne Emoji, Schweizer Rechtschreibung (ss statt ß); (2) einen englischen Video-Prompt für Gemini Omni Flash (Bild als erstes Bild, Anfang `<FIRST_FRAME>`, ein einziger durchgehender Schnitt «no scene cuts», 8 Sekunden, ruhige Kamerabewegung, nur Funktionen aus den Fakten, «The product keeps exactly the shape, colour and proportions of the reference image. No text, no logos, no people, no hands.», Ende «No dialogue, no music.»); (3) eine deutsche TikTok-Caption mit genau vier Hashtags, der Zeile «Schweiz: Lieferung 10–20 Werktage, Versand CHF 7, ab CHF 50 gratis nach Rabatt.», dem Wegweiser «Shop: luxestyle.ch/tt» und dem Satz «Video mit KI erstellt.». Erfinde keine Funktionen, keine Preise, keine Garantien, keine Superlative. Antworte nur als JSON im Format der Datei `produkte.json` (Felder id, handle, name, foto, foto_min, fakten, hook1, hook2, prompt_en, caption_de, risiko).

## Flow (im Google-AI-Pro-Abo enthalten)
Der Auftrag an PC-Claude in `dropship/BROWSER-BEFEHL-GOOGLE-AI-PRO-0311.md` bleibt gültig; als Eingabetext und Quellfoto je Produkt die Felder `prompt_en` und `foto` aus `produkte.json` nehmen. Ergebnis erst nach der Sichtprüfung verwenden.
