# Selbst-gestalten-Editor: was er kann, was fehlt (gemessen 12.10.2026)

Messung: Browser-Test im Storefront bei 390 px (`tools/browser.mjs`), Quellcode der Live-Datei `lspod-designer-v2.js`
(identisch bis auf Zeichenschreibweise zum Repo-Stand `pod/designer-cdn-v2.js`).

## Vorhanden (gemessen)
- Text hinzufügen, Textfeld, Schrift (5: Modern Sans, Elegant Serif, Handschrift, Bold Display, Mono)
- Farbe: 8 feste Felder + eigener Farbwähler (nativ `input type=color`)
- Grösse: Schieber 0,15–3 + Presets Klein / Mittel / Gross / Füllend
- Element ziehen, Ecke = skalieren und drehen (Gesten), Duplizieren, Vorne / Hinten (Seite), Löschen (×)
- Bild: Zuschnitt, Spiegeln, Helligkeit/Kontrast/Sättigung/Graustufen
- Sticker-Bibliothek, Bild-Upload (Cloudinary), Druck-Vorschau, Druckdatei für den Druckauftrag

## Neu (12.10.2026): Version 3 und 4 (`pod/lspod-designer-v3.js`, `pod/lspod-designer-v4.js`)
- **v3 Drehregler** (-180°…+180°), neben dem Grössenregler. Wirkt auf die Vorschau UND die Druckdatei (`rotate` im Canvas,
  gemessen: Vorschau 30° = Druckdatei 30°). Ein Ecken-Dreh wird auf dem Regler mitgeführt.
- **v4 Abstand und Kontur (nur Text):** Buchstabenabstand (0–0,4 em) und Umriss (0–0,12 em) mit Farbwähler.
  Gemessen: Vorschau `letter-spacing` 5,87 px = 0,25 × 23,5 px Schrift; Umriss 1,88 px = 0,04 × 23,5 × 2. Druckdatei
  zeigt Abstand und Umriss (Druckvorschau geprüft).

## Fehlt gegenüber einem vollen Druck-Editor (noch nicht gebaut)
1. **Zeilenumbruch** bei mehrzeiligem Text (ein Textfeld = eine Zeile).
2. **Zeilenabstand** (entfällt ohne Zeilenumbruch).
3. **Rückgängig / Wiederholen**: kein Verlauf. Braucht Snapshots der Ebenen bei jeder Änderung.
4. **Ebenen-Reihenfolge** innerhalb einer Seite (nur Vorne/Hinten der ganzen Seite).
5. **Deckkraft** je Element.
6. **Fett/Kursiv** als Schalter (die 5 Schriften haben das nicht einzeln).
7. **Zahleneingabe** für Position und Drehung (nur Regler und Gesten).

## Nicht im Editor, sondern im Theme (nicht änderbar aus dem Assistenten)
- **Cookie-Banner überdeckt den Editor auf dem Handy** (gemessen in v3 und v4: «Nur notwendige / Alle akzeptieren» liegt
  über Drehregler, Abstand/Kontur und Grössen-Presets). Das ist ein Theme-/App-Thema: Betreiber oder CLI-Token.

## Umstellung
- 34 Produkte laden jetzt `lspod-designer-v4.js?v=1791790332` (Log: `dropship/_lspod_v3_switch.tsv`, Stufen v2→v3→v4).
- Rückweg: v3 `…lspod-designer-v3.js?v=1791790037` oder v2 `…lspod-designer-v2.js?v=1785940614` (liegen weiter auf dem CDN).
- Bekannt, nicht änderbar aus dem Assistenten: die Zeilenabstand-Vorschau in alten Safari-Versionen ohne Canvas-
  `letterSpacing` zeigt den Abstand, die Druckdatei nicht.
- QA: `pod_editor_qa.mjs` 29 Editor-Produkte, 0 Befunde.
